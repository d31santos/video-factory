# Video Factory — Agent Memory (v5)

One run = ONE item, start to finish, then STOP. An item enters one of three ways:
- **Mode A** — a video dropped in `inbox/` → import into Descript, transcribe, repurpose.
- **Mode B** — a topic brief in `topics/queue.json` (status `pending`) → full generation.
- **Mode C** — a scout draft (`needs_approval`) → a human promotes it to `pending` first.

All modes normalize to the same brief JSON; everything downstream is identical.

## Non-negotiables
- Follow **WORKFLOW.md** steps in order. Enforce every rule in **RULES.md** (R1–R15).
- **Verify APIs via the MCPs before coding** against them (remotion / descript / opusclip).
  Never guess Remotion, Descript, or OpusClip API shapes.
- **Audio-first** (Figure 4): clean the voice and get the Descript transcript BEFORE the
  render, so captions describe exactly what the final video contains.
- **Read HEURISTICS.md before scripting** and treat it as binding guidance (never above RULES.md).
- Caps are hard: **enforce loop max 4**, then `qa/<id>/BLOCKED.md` and stop; **improve loop
  max 2 regenerations**, then the human review queue.
- **Never publish without the R15 gate.** Scores below threshold or missing → human queue,
  never auto-post. Platform credentials live only inside OpusClip.
- Every step touching Descript or OpusClip (both v0.1) gets a timeout and a logged fallback.
  A v0.1 dependency must never stop the factory.
- **Never edit RULES.md, WORKFLOW.md, CLAUDE.md, thresholds, or caps on your own.** The
  learning layer may only *propose* changes to `proposals/` flagged `needs_approval`.
- Secrets come from the human via environment variables only; never hardcode them.

## Layout
- `topics/queue.json` (+ `active/<id>.json`) — the queue and per-run brief.
- `inbox/` — Mode A source drops. `assets/broll/` — licensed B-roll (log provenance, R11).
- `src/` — Remotion compositions (one per format). `hyperframes/` — fast HTML scenes.
- `out/` — renders (never delete). `qa/<id>/` — frames, report.md, descript.md, opusclip.md, retro.md.
- `logs/` — production.log, failures.jsonl, metrics.jsonl. `proposals/` — learning proposals (gated).

## Commands
- Preview render: `pnpm run render:preview` (half-res, crf 30). Final: `pnpm run render:final` (crf 18).
- Frames: `scripts/extract_frames.sh <video> <id>`. Validate: `scripts/validate_output.sh <video>`.
- Preflight: `scripts/preflight.sh` (run before every headless run).

Environment note: this machine uses **pnpm** (no npm/npx) and the `py` launcher for Python.
