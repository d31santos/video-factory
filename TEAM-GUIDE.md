# Video Factory — Team Guide

*How it works, how to run it, and how to work with it. For new team members.*

---

## 1. What this is

An autonomous pipeline that turns **a topic brief or an existing video** into a finished,
quality-checked short video (vertical, square, or landscape), with captions, voiceover,
branded visuals, and a virality-score gate before anything is published. One run = one video,
produced end-to-end with QA evidence attached.

Tech: **Remotion** (React-based video rendering) + **edge-tts** (voice + word-timed captions)
+ **ffmpeg/ffprobe** (validation) + optional **Descript** (audio polish) and **OpusClip**
(virality scoring & publishing). A live dashboard shows what the factory is doing at any moment.

---

## 2. How it works

### The three ways work enters (modes)

| Mode | Input | What happens |
|---|---|---|
| **A — Repurpose** | A video file dropped in `inbox/` + a word-timing transcript sidecar | Original footage/audio kept, recaptioned and reframed per format |
| **B — Generate** | A topic in `topics/queue.json` with `"status": "pending"` + a narration script | Full generation: TTS voice → captions → branded scenes → render |
| **C — Scout** | `scripts/scout.sh` searches the web and drafts topic briefs | Drafts land as `needs_approval` — **a human must promote them** before production |

All three normalize to the same brief JSON (`topics/active/<id>.json`); everything downstream
is identical.

### The pipeline (per video)

```
entry → voice + transcript → build brief → render → QA (R1–R12) → score (R15)
                                              ↑                        |
                                              └── improve loop (max 2 regenerations)
                                                                       ↓
                                    ≥ threshold: publish · < threshold: HUMAN REVIEW → close
```

- **QA / enforce loop** — every render is validated with ffprobe (resolution, fps, codec,
  duration, audio, silence gaps) and frame extraction. Fails are fixed and re-rendered,
  max 4 iterations, then the run is BLOCKED with a report (never silently shipped).
- **Score / improve loop** — the finished cut gets a virality score. Below the publish
  threshold (75), the hook is revised and the video regenerated, max 2 times. Still below?
  It goes to the **human review queue — the factory never auto-posts a low-scoring video.**

### The quality contract — RULES.md (R1–R15)

Fifteen checkable rules govern every video: format specs (R1–R3), hook within 2 s (R4),
visual change every ≤3 s (R5), CTA end card (R6), word-level captions in safe areas with
minimum size/contrast (R7–R9), zero invented facts (R10), licensed assets only (R11),
brand palette/tone (R12), audio polish accountability (R13–R14), and the publish gate (R15).
Every run writes `qa/<id>/report.md` grading each rule with evidence.

**Tuning the factory = editing files, never re-prompting:** quality bar in `RULES.md`,
threshold/caps in `WORKFLOW.md`, writing-style guidance in `HEURISTICS.md`.

### Self-healing and self-learning

- `scripts/preflight.sh` runs before every job: checks the toolchain, degrades gracefully
  (e.g. Descript unavailable → documented fallback), never lets a broken dependency crash a run.
- Every run writes a retro (`qa/<id>/retro.md`) and metrics (`logs/metrics.jsonl`).
- `scripts/consolidate.sh` mines those into improvement **proposals** (`proposals/*.md`).
  Proposals are `needs_approval` — the factory suggests, **humans decide**. It never edits
  its own rules or thresholds.

### Human approval gates (by design, not accident)

1. Scout drafts → `node scripts/promote.mjs <id>` (a person promotes to `pending`).
2. Videos scoring below threshold → human review queue, never posted.
3. Learning proposals → a person applies them to RULES/WORKFLOW/HEURISTICS.

---

## 3. Setup on a fresh machine

**Prerequisites:** Node ≥ 20 + [pnpm](https://pnpm.io), [ffmpeg](https://ffmpeg.org) (includes
ffprobe), [jq](https://jqlang.org), Python 3 with `pip install edge-tts`. On Windows use
Git Bash for all commands; ffmpeg/jq install cleanly via `winget`.

```bash
git clone https://github.com/d31santos/video-factory.git
cd video-factory
pnpm install
bash scripts/preflight.sh     # tells you exactly what's missing, if anything
```

---

## 4. Running it — all the options

### Produce one video from a topic (Mode B — the common case)

```bash
# 1. Add a topic to topics/queue.json (copy an existing entry):
#    { "id": "my-topic", "status": "pending", "title": "...", "angle": "...",
#      "keyPoints": ["...","...","..."], "cta": "...", "tone": "..." }
# 2. Write the narration (100–140 words, hook first, CTA last):
#    assets/audio/my-topic.txt
# 3. Run:
bash scripts/make_video.sh                            # first pending topic, vertical
```

**Options:**
```bash
bash scripts/make_video.sh --id my-topic              # a specific topic
bash scripts/make_video.sh --format landscape        # vertical | landscape | square
PUBLISH_THRESHOLD=80 bash scripts/make_video.sh      # stricter gate for this run
REGEN_CAP=1 bash scripts/make_video.sh               # fewer improve-loop retries
```

### Repurpose an existing video (Mode A)

```bash
cp talk.mp4 inbox/
cp talk.transcript.json inbox/     # word timings: [{"word","startMs","endMs"}, ...]
bash scripts/make_video.sh
```
No transcript sidecar? The item is politely deferred (left in `inbox/`), never crashed.
Processed sources move to `inbox/processed/`.

### The dashboard (watch AND control the factory)

```bash
node scripts/dashboard_server.mjs      # → http://localhost:4599 (localhost-only)
```
**Watch:** how many agents are running, **which pipeline section each is in**, what
item/format they're working on, a live activity feed (started / section moves / finished /
stopped / failed), virality scores vs threshold, the queue, and recent runs. Chips move
across the architecture map in real time.

**Control (top panel):**
- **Prompt box + "Run prompt (AI)"** — type what you want ("Make a vertical video about X",
  "Go find fresh topics about Y") and the loop starts an AI run based on it: it writes the
  topic + narration itself, then produces the video end-to-end (or routes topic-research
  requests to scout behavior, drafts landing as `needs_approval`). Needs the `claude` CLI.
- **Attach a video** (🎞, optional 📝 transcript sidecar) — uploads into `inbox/` and the run
  becomes **Mode A**: your footage is repurposed instead of generating from scratch. Works
  with both buttons: with *Run prompt (AI)* the AI is told to repurpose that exact file per
  your instructions; with *Run next pending (no AI)* the deterministic pipeline picks it up
  (it needs the transcript sidecar — without one the item is deferred, never crashed).
- **"Scout topics (AI)"** — one-click topic discovery run.
- **"Run next pending (no AI)"** — kick the deterministic pipeline; format selector applies.
- **⏹ Stop** — every running job shows a row with a stop button; it kills the whole process
  tree. One job per type at a time (renders don't trample each other).

Note: a hard stop kills mid-step, so the run's last agent card can linger as *stale* for a
few minutes and a partially-written render may need re-rendering — the activity feed records
the stop either way.

### Topic discovery & approvals (Mode C)

```bash
bash scripts/scout.sh                  # drafts ≤5 briefs from web research (needs `claude` CLI)
node scripts/promote.mjs --list        # see drafts awaiting approval
node scripts/promote.mjs scout-...-1   # approve one into production
```

### Learning loop

```bash
bash scripts/consolidate.sh            # mines retros/metrics → proposals/consolidation_*.md
# read the proposal; if you agree, apply its suggestions to RULES/WORKFLOW/HEURISTICS by hand
```

### Fully unattended (scheduling)

Windows Task Scheduler action (nightly video):
```
Program:  C:\Program Files\Git\bin\bash.exe
Args:     -lc "cd '<path-to-repo>' && bash scripts/make_video.sh"
```
Linux/macOS cron: `0 3 * * * cd <repo> && bash scripts/make_video.sh`.
Schedule `scout.sh` weekly and `consolidate.sh` weekly/monthly the same way.

### Agentic mode (optional, needs Claude Code CLI)

`./run_loop.sh [N]` lets an AI agent execute the workflow end-to-end (it also writes the
narration scripts itself, and can call the Descript/OpusClip MCPs live). Everything else in
this guide is plain Node/Bash/Python — no AI required.

### Utilities

```bash
pnpm run dev                                    # Remotion Studio — preview compositions live
bash scripts/validate_output.sh out/x.mp4       # grade any mp4 against R1–R3
bash scripts/extract_frames.sh out/x.mp4 x      # QA frames → qa/x/
```

---

## 5. Where the outputs land

| Path | Contents |
|---|---|
| `out/<id>.mp4` | the finished video (never deleted; gitignored) |
| `qa/<id>/` | report.md (R1–R12 evidence), frames, opusclip.md (scores per attempt), descript.md, retro.md |
| `logs/production.log` | one line per completed video (score, regens, publish decision) |
| `logs/metrics.jsonl` / `failures.jsonl` | machine-readable history for the learning loop |
| `proposals/` | pending improvement proposals (need human approval) |

---

## 6. Current integration status (read before trusting "publish")

| Integration | Status | Meaning |
|---|---|---|
| **OpusClip (scores/publish)** | **Simulation** | Scores are synthetic; "would auto-publish" is advisory — nothing is ever posted. The real path is OpusClip's hosted MCP (beta): `claude mcp add --transport http opusclip https://mcp.opus.pro`, sign in with OAuth. Calling its tools requires the **OpusClip Pro plan** (or their free trial to test); connect your social accounts inside OpusClip itself. |
| **Descript (voice/polish)** | **Fallback** | edge-tts does voice + word captions (works well for TTS content). Live Descript needs a token; note its API cannot render AI voices headlessly (tested), so edge-tts remains the TTS either way. |
| **Brand** | **Placeholder** | `RULES.md ## Brand` has a neutral palette — replace with the real brand before production. |

Everything else — rendering, QA, captions, gates, dashboard, scheduling, learning loop — is
fully live.

## 7. Troubleshooting

1. Run `bash scripts/preflight.sh` first — it names the missing/broken piece.
2. Check `PLAYBOOK.md` — symptom → fix recipes for every failure this factory has seen
   (module errors after OneDrive sync, pixel-format fails, silence-gap fails, MSYS quirks…).
3. A run that stopped early always leaves evidence: `qa/<id>/BLOCKED.md`, the activity feed
   on the dashboard, and `logs/failures.jsonl`.

*Deeper reading: [CLAUDE.md](CLAUDE.md) (agent contract) · [WORKFLOW.md](WORKFLOW.md) (the 18
steps + gates) · [RULES.md](RULES.md) (quality contract) · [RUNBOOK.md](RUNBOOK.md) (operator
quick reference for the original machine).*
