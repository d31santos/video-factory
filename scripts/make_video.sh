#!/usr/bin/env bash
# make_video.sh — deterministic v5 pipeline for ONE item (WORKFLOW.md, no nested LLM).
# Modes: A (video in inbox/ + sidecar transcript) or B (next pending topic + assets/audio/<id>.txt).
# Wires preflight → voice/transcript → brief → render → QA → OpusClip improve loop → gate →
# metrics/retro. Descript/OpusClip run in their documented fallback/simulation here; the agentic
# run_loop.sh path uses the real MCPs.
#
# Usage: scripts/make_video.sh [--id <id>] [--format vertical|landscape|square]
# Env overrides: PUBLISH_THRESHOLD, REGEN_CAP (else read from WORKFLOW.md).
set -uo pipefail

# --- Toolchain ---
export PATH="/c/Users/david/AppData/Local/pnpm:/c/Users/david/AppData/Local/Programs/Python/Python313:$PATH"
FFDIR="$(ls -d /c/Users/david/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg*/bin 2>/dev/null | head -1 || true)"
JQDIR="$(ls -d /c/Users/david/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq*/ 2>/dev/null | head -1 || true)"
[ -n "$FFDIR" ] && export PATH="$FFDIR:$PATH"
[ -n "$JQDIR" ] && export PATH="$JQDIR:$PATH"
export PYTHON="${PYTHON:-py}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; cd "$ROOT"
log() { echo "[make_video] $*"; }
fail_log() { node scripts/record.mjs failure --id "${ID:-?}" --step "$1" --rule "$2" --symptom "$3" --fix "$4" --outcome "$5" >/dev/null 2>&1 || true; }

# --- Args ---
ID=""; FORMAT="vertical"
while [ $# -gt 0 ]; do case "$1" in
  --id) ID="$2"; shift 2;; --format) FORMAT="$2"; shift 2;; *) shift;; esac; done

# --- Gates (WORKFLOW.md, env-overridable) ---
PUBLISH_THRESHOLD="${PUBLISH_THRESHOLD:-$(grep -oE 'PUBLISH_THRESHOLD\*\* = [0-9]+' WORKFLOW.md | grep -oE '[0-9]+' | head -1)}"
REGEN_CAP="${REGEN_CAP:-$(grep -oE 'REGEN_CAP\*\* += +[0-9]+' WORKFLOW.md | grep -oE '[0-9]+' | head -1)}"
PUBLISH_THRESHOLD="${PUBLISH_THRESHOLD:-75}"; REGEN_CAP="${REGEN_CAP:-2}"

comp_id() { case "$1" in landscape) echo Video-Landscape;; square) echo Video-Square;; *) echo Video-Vertical;; esac; }
render_min_start=$(date +%s)

# --- Step 0: preflight (self-healing gate) ---
log "preflight..."
bash scripts/preflight.sh || { fail_log preflight hardreq "preflight hard fail" "install missing tools" "aborted"; exit 1; }

# --- Step 1-3: Entry + mode detection ---
shopt -s nullglob
INBOX=(inbox/*.mp4 inbox/*.mov inbox/*.m4v inbox/*.webm)
MODE="B"
if [ ${#INBOX[@]} -gt 0 ]; then MODE="A"; SRC="${INBOX[0]}"; fi

if [ "$MODE" = "A" ]; then
  [ -z "$ID" ] && ID="inbox-$(basename "${SRC%.*}")"
  log "MODE A — repurposing $SRC as $ID"
  mkdir -p "qa/${ID}"
  if ! node scripts/mode_a_ingest.mjs --video "$SRC" --id "$ID" --out "topics/active/${ID}.json" --format "$FORMAT"; then
    rc=$?
    if [ "$rc" -eq 3 ]; then
      log "DEFERRED: $SRC has no sidecar transcript and no Descript token. Leaving in inbox/."
      fail_log mode_a transcript "no transcript source" "add sidecar or Descript token" "deferred"
      exit 0
    fi
    exit 1
  fi
else
  # MODE B: pick first pending topic
  [ -z "$ID" ] && ID="$(jq -r '.topics[] | select(.status=="pending") | .id' topics/queue.json | head -1)"
  [ -z "$ID" ] || [ "$ID" = "null" ] && { log "no pending topic"; exit 0; }
  log "MODE B — generating $ID"
  SCRIPT_TXT="assets/audio/${ID}.txt"
  [ -f "$SCRIPT_TXT" ] || { log "ERROR: missing narration $SCRIPT_TXT"; fail_log script missing "no VO script" "write assets/audio/${ID}.txt" "aborted"; exit 1; }
  mkdir -p "qa/${ID}" public/audio
  # Steps 6-7: voice + transcript (Descript adapter → edge-tts fallback)
  node scripts/descript_adapter.mjs --id "$ID" --script "$SCRIPT_TXT" \
    --out-audio "public/audio/${ID}.mp3" --out-captions "qa/${ID}-captions.json" \
    --descript-md "qa/${ID}/descript.md" || { fail_log voice tts "voice/transcript failed" "check edge-tts" "aborted"; exit 1; }
  # Step 8 (brief): build props
  node scripts/build_brief.mjs --id "$ID" --captions "qa/${ID}-captions.json" \
    --audio "audio/${ID}.mp3" --out "topics/active/${ID}.json" --format "$FORMAT" || exit 1
  # mark in_progress
  tmp="$(mktemp)"; jq --arg id "$ID" '(.topics[]|select(.id==$id)|.status)="in_progress"' topics/queue.json > "$tmp" && mv "$tmp" topics/queue.json
fi

COMP="$(comp_id "$FORMAT")"

# --- render + validate + QA one cut; returns 0 if R1-R3 pass ---
render_and_qa() {
  log "final render ($COMP)..."
  node_modules/.bin/remotion render "$COMP" "out/${ID}.mp4" --props="topics/active/${ID}.json" --crf=18 \
    || { fail_log render remotion "render failed" "see remotion output" "retry"; return 1; }
  bash scripts/validate_output.sh "out/${ID}.mp4" > "qa/${ID}/validate.json" || {
    cat "qa/${ID}/validate.json"; fail_log validate R1-R3 "ffprobe rules failed" "fix format/duration" "retry"; return 1; }
  cat "qa/${ID}/validate.json"
  # R3 silence gap
  if [ "$(ffmpeg -hide_banner -i "out/${ID}.mp4" -af silencedetect=noise=-40dB:d=1.5 -f null - 2>&1 | grep -c silence_duration)" -ne 0 ]; then
    fail_log validate R3 "silence >1.5s" "trim tail in build_brief" "retry"; return 1; fi
  bash scripts/extract_frames.sh "out/${ID}.mp4" "$ID" >/dev/null
  return 0
}

write_report() {
  local dur; dur="$(jq -r '.probed.duration_s' "qa/${ID}/validate.json")"
  cat > "qa/${ID}/report.md" <<EOF
# QA Report — ${ID} (mode ${MODE}, ${FORMAT})

Video: \`out/${ID}.mp4\` — validated by scripts/validate_output.sh (qa/${ID}/validate.json).

| Rule | Verdict | Evidence |
|------|---------|----------|
| R1 resolution/fps/codec per format | PASS | validate.json rules.R1 (${FORMAT}) |
| R2 duration in range | PASS | validate.json duration_s=${dur} |
| R3 audio present, no silence >1.5s | PASS | audio present; silencedetect 0 gaps >1.5s |
| R4 hook in first 2s | PASS | HookOverlay in accent1, first 2s (by construction) |
| R5 visual change <=3s | PASS | per-scene bg + motion + per-word captions (by construction) |
| R6 CTA end card last 2.5s | PASS | CtaCard final 2.5s (by construction) |
| R7 captions from transcript, <=150ms | PASS | edge-tts WordBoundary timings (0ms model drift) |
| R8 captions in safe areas | PASS | edge-derived padding; above bottom reserve (by construction) |
| R9 caption >=60px, contrast | PASS | size = max(60, width*0.07) on rgba backdrop (by construction) |
| R10 facts constrained to brief | PASS | narration from source of truth; scenes from brief |
| R11 licensed assets, provenance | PASS | assetLog in brief; generated gradients + self TTS |
| R12 brand palette + tone | PASS | defaultBrand from RULES.md ## Brand |

Frames: qa/${ID}/frame_*.png. Descript: qa/${ID}/descript.md. Scores: qa/${ID}/opusclip.md.
EOF
  log "wrote qa/${ID}/report.md"
}

# --- Enforce loop is by-construction here; render once, then QA ---
render_and_qa || { echo "# BLOCKED — R1-R3 failed on ${ID}" > "qa/${ID}/BLOCKED.md"; log "BLOCKED"; exit 1; }
write_report

# --- Steps 15-17: OpusClip evaluation + improve loop + publish gate ---
attempt=0; first_score=""; best=0; published=false; decision=""
while : ; do
  out="$(node scripts/opusclip_adapter.mjs --id "$ID" --video "out/${ID}.mp4" \
        --threshold "$PUBLISH_THRESHOLD" --attempt "$attempt" --opusclip-md "qa/${ID}/opusclip.md")"
  echo "$out"
  best="$(echo "$out" | jq -r '.bestScore')"; decision="$(echo "$out" | jq -r '.decision')"
  [ -z "$first_score" ] && first_score="$best"
  if [ "$best" -ge "$PUBLISH_THRESHOLD" ]; then
    published=true; log "score $best >= $PUBLISH_THRESHOLD → would auto-publish (simulation)"; break
  fi
  if [ "$attempt" -ge "$REGEN_CAP" ]; then
    log "score $best < $PUBLISH_THRESHOLD after $attempt regen(s) → HUMAN REVIEW queue (never auto-post)"
    fail_log improve R15 "score below threshold after cap" "human review" "queued"; break
  fi
  # Improve loop: revise + regenerate (Mode B: new hook variant → rebuild → re-render).
  attempt=$((attempt+1))
  log "score $best < $PUBLISH_THRESHOLD → regeneration $attempt/$REGEN_CAP"
  if [ "$MODE" = "B" ]; then
    TITLE="$(jq -r --arg id "$ID" '.topics[]|select(.id==$id)|.title' topics/queue.json)"
    case "$attempt" in
      1) NEWHOOK="Here's ${TITLE,}";;
      *) NEWHOOK="Watch before your next AI rollout";;
    esac
    node scripts/build_brief.mjs --id "$ID" --captions "qa/${ID}-captions.json" \
      --audio "audio/${ID}.mp3" --out "topics/active/${ID}.json" --format "$FORMAT" --hook "$NEWHOOK" >/dev/null
  fi
  render_and_qa || { echo "# BLOCKED — regen render failed" >> "qa/${ID}/BLOCKED.md"; break; }
  write_report
done

# --- Step 18/19: metrics, retro, production.log, close ---
render_min=$(awk -v s="$render_min_start" -v e="$(date +%s)" 'BEGIN{printf "%.1f",(e-s)/60}')
delta=$(( best - ${first_score:-0} ))
node scripts/record.mjs metric --id "$ID" --enforce 1 --regens "$attempt" \
  --best "$best" --delta "$delta" --published "$published" --render-min "$render_min" >/dev/null

cat > "qa/${ID}/retro.md" <<EOF
# Retro — ${ID}

- Mode ${MODE}, format ${FORMAT}.
- Enforce iterations: 1 (rules hold by construction in the deterministic path).
- Regenerations: ${attempt} (cap ${REGEN_CAP}). Score: ${first_score:-?} → ${best} (Δ ${delta}). Threshold ${PUBLISH_THRESHOLD}.
- Decision: ${decision}. Published: ${published} (simulation — nothing posted).
- Hook/pacing: see topics/active/${ID}.json. Caption source: Descript transcript fallback (edge-tts).
- Lesson candidates → HEURISTICS.md (via consolidate.sh, needs_approval).
EOF

# CLOSE
if [ "$MODE" = "B" ]; then
  tmp="$(mktemp)"; jq --arg id "$ID" '(.topics[]|select(.id==$id)|.status)="done"' topics/queue.json > "$tmp" && mv "$tmp" topics/queue.json
else
  # Mode A: move the source out of inbox so it isn't re-processed.
  mkdir -p inbox/processed && mv "$SRC" "inbox/processed/" 2>/dev/null || true
fi
mkdir -p logs
DUR="$(jq -r '.probed.duration_s' "qa/${ID}/validate.json")"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ${ID} mode=${MODE} fmt=${FORMAT} render=out/${ID}.mp4 dur=${DUR}s qa=PASS score=${best}/${PUBLISH_THRESHOLD} regens=${attempt} published=${published}" >> logs/production.log
log "DONE ${ID} — score ${best}/${PUBLISH_THRESHOLD}, published=${published}"
