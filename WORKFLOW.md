# WORKFLOW.md — the per-item pipeline (v5, 18 steps)

One item per run. Steps are literal instructions; obey CLAUDE.md and RULES.md.

## Gates (set here, not in prompts)
- **PUBLISH_THRESHOLD** = 75  (virality score 0–100; start strict — top-scoring clip only)
- **REGEN_CAP** = 2          (improve-loop regenerations before human review)
- **ENFORCE_CAP** = 4        (enforce-loop iterations before BLOCKED.md)

## The 18 steps
1. **Entry.** Mode A: a video is in `inbox/`; Mode B: a `pending` brief in `topics/queue.json`;
   Mode C: scout drafts are `needs_approval` → a human promotes to `pending`. Never act on
   `needs_approval` items.
2. **Pick** the next pending item; normalize to the brief JSON (one item per run); mark it
   `in_progress`; create `topics/active/<id>.json`.
3. **Mode A only:** import the source into Descript → transcript + segments; mark keep/cut
   candidates in the brief. (Mode B/C skip.)
4. **Script.** Write or derive the script — hook ≤ 2 s, CTA at the end; facts constrained to
   the brief/source (R10). Read HEURISTICS.md first.
5. **Assets.** Collect Pexels B-roll / Replicate visuals into `assets/broll/`; log provenance
   for each (R11) in the brief's `assetLog`.
6. **Voiceover.** Descript AI voice from the script (plan/API-dependent — see
   §Descript details). Mode A keeps original audio; caption-led videos need none.
7. **Clean + transcript.** Descript cleans the audio and returns the transcript; caption word
   timings come from THIS transcript (audio-first, Figure 4). Merge timings into the brief (R7).
8. **Build scenes.** Remotion composition for the chosen format (precision/brand) and/or
   HyperFrames HTML pages (fast scenes). Captions satisfy R8/R9 by construction.
9. **Preview render** at half resolution (`pnpm run render:preview`).
10. **Extract frames** (`scripts/extract_frames.sh`, 1 per 2 s + last); inspect them as images.
11. **Grade** R1–R12 in `qa/<id>/report.md`, one line of evidence each.
12. **Any FAIL:** edit the scene code, re-render the preview. Enforce loop, **max 4x**, then
    write `qa/<id>/BLOCKED.md` and stop.
13. **All PASS:** final render (`pnpm run render:final`); revalidate with `scripts/validate_output.sh`.
14. **Descript polish** of the final cut when audio wasn't pre-polished; verify R13–R14; log to
    `qa/<id>/descript.md`.
15. **OpusClip.** Create a project from the final video; generate clips with captions and
    virality scores; log scores to `qa/<id>/opusclip.md`. (See §OpusClip details.)
16. **Improve loop.** If the best clip scores < PUBLISH_THRESHOLD, diagnose (weak hook? slow
    opening? flat pacing?), revise the script/scenes, and return to step 8 — the revision goes
    through the full enforce loop and polish again. **Max REGEN_CAP (2)** regenerations; log the
    score delta per attempt in `qa/<id>/opusclip.md`.
17. **Publish gate (R15).** Clips scoring ≥ PUBLISH_THRESHOLD auto-post to the platforms
    connected in OpusClip. After the regeneration cap, below-threshold videos go to the human
    review queue — NEVER auto-posted. Missing/unavailable scores → human review queue.
18. **Close.** Log everything (scores + regeneration history) to `logs/production.log`; write
    `logs/metrics.jsonl`; mark the item `done`; STOP.

19. **RETRO (self-learning).** Write `qa/<id>/retro.md`: which rules failed and root cause, the
    fix that worked, enforce iterations used, virality score per attempt, and which hook/pacing/
    caption choices correlated with the score. (Added by Phase 9.)

The Stop-hook refuses to let the session end while any rule FAILs in the active report.

---

## §Descript details  <!-- Phase 4: adapter built; live MCP path is an integration checkpoint -->
Two execution paths share the caption contract (R7 = word timings from the transcript):

**Agentic path (run_loop.sh → claude -p)** — the agent calls the Descript MCP directly:
- Tools (verified list): `import_media`, `run_agent`, `get_job`, `list_jobs`, `cancel_job`,
  `check_status`, `create_import_url`, `get_published_project`.
- Order (audio-first, Figure 4): generate/ingest voice → `run_agent` cleanup →
  `get_job` transcript with word timings → merge timings into the brief (R7) → THEN render.
- Cleanup instruction (conservative): "Remove filler words and awkward silences. Improve audio
  quality. Do not cut any sentence content." Then verify R14.

**Deterministic path (make_video.sh → `scripts/descript_adapter.mjs`)** — no MCP available to a
shell, so it uses the documented FALLBACK: edge-tts voice + edge-tts `WordBoundary` as the
transcript/timings; writes `qa/<id>/descript.md` (R13 satisfied via documented reason; R14 N/A).

**PLACEHOLDERS still to confirm live in Phase 4 (need DESCRIPT_API_TOKEN):**
- Whether AI voice is exposed on the plan's API. If not → fallback is recorded VO or caption-led.
- Which `get_job` output field carries the word timings on this account (the real R7 source).

## §OpusClip details  <!-- Phase 5: adapter built; live MCP path is an integration checkpoint -->
Two execution paths share the gate contract (R15).

**Agentic path (run_loop.sh → claude -p)** — the agent calls the OpusClip MCP:
- Auth: OAuth (browser sign-in on first MCP call), NOT an API key. Hosted MCP `mcp.opus.pro`.
- Sequence: create a project from the final video → generate clips (captions + reframing) →
  read the per-clip virality scores → log to `qa/<id>/opusclip.md` → apply the gate below.
- Publishing is via accounts connected INSIDE OpusClip; the pipeline never handles platform creds.

**Deterministic path (make_video.sh → `scripts/opusclip_adapter.mjs`)** — SIMULATION mode:
emits deterministic pseudo-scores (rising per regeneration attempt so deltas are visible),
writes `qa/<id>/opusclip.md`, and NEVER publishes. Simulation is never a real publish decision.

**The gate (both paths):**
- best clip score ≥ PUBLISH_THRESHOLD (75) → auto-publish (real path only); simulation logs "would-publish".
- below threshold → improve loop (revise, regenerate), max REGEN_CAP (2); log score delta per attempt.
- after the cap, or if scores are missing/unavailable → HUMAN REVIEW queue. Never auto-post on a
  low or missing score.

**PLACEHOLDER to confirm live in Phase 5 (needs an OpusClip account):** the exact field carrying
the per-clip virality score, how captions attach, and which platforms are connected.

## §Mode A details (inbox/)
- Agentic path: `import_media` the source into Descript → transcript + segments → mark keep/cut
  candidates in the brief → downstream identical to Mode B.
- Deterministic path (`scripts/mode_a_ingest.mjs`): needs a sidecar transcript
  `inbox/<name>.transcript.json` (same `{word,startMs,endMs}` shape). It extracts the original
  audio (kept as `audioSrc`), uses the source footage as the scene background (its own motion
  satisfies R5), and takes captions (R7) from the sidecar. If the sidecar is missing and no
  Descript token is present, the item is **DEFERRED** (exit 3), never crashed.
