# RUNBOOK — operating the video factory without Claude

Everything below runs in a plain **Git Bash** terminal (ships with Git for Windows) from the
repo root. No AI session needed for the deterministic path.

## Prerequisites (already installed on this machine)
- Node via pnpm (`C:\Users\david\AppData\Local\pnpm`), ffmpeg/ffprobe + jq (winget),
  Python via the `py` launcher with `edge-tts` (`py -m pip install --user edge-tts`).
- One-time on a new machine: `pnpm install` in the repo root, then `bash scripts/preflight.sh`
  — it tells you exactly what's missing.

## Produce one video (Mode B — from a topic)
1. Add a topic to `topics/queue.json` with `"status": "pending"` (copy an existing entry;
   id, title, angle, 3 keyPoints, cta).
2. Write the narration: `assets/audio/<id>.txt` (100–140 words, hook first, CTA last).
3. Run:
   ```bash
   bash scripts/make_video.sh                      # picks the first pending topic, vertical
   bash scripts/make_video.sh --id my-topic --format square   # explicit id/format
   ```
   Formats: `vertical` (default) | `landscape` | `square`.
4. Result: `out/<id>.mp4`, QA evidence in `qa/<id>/` (report.md, frames, scores, retro),
   a line in `logs/production.log`. Score < 75 → it lands in the human-review queue,
   never auto-posted.

## Repurpose an existing video (Mode A)
Drop the source in `inbox/` **plus** a word-timing sidecar `inbox/<name>.transcript.json`
(`[{"word","startMs","endMs"}]`), then `bash scripts/make_video.sh`. Without a sidecar the
item is deferred, never crashed. Processed sources move to `inbox/processed/`.

## Watch it live — the dashboard
```bash
node scripts/dashboard_server.mjs        # → http://localhost:4599
```
Shows agents working, which pipeline section each is in, item/format/step, an activity
feed (started / section / finished / stopped / failed), scores vs threshold, queue, and
recent runs. Data comes from `logs/agents/` + `logs/` — refresh-free (polls every 2 s).

## The other levers
| Task | Command |
|---|---|
| Approve scout drafts | `node scripts/promote.mjs --list` then `node scripts/promote.mjs <id>` |
| Mine lessons → proposal | `bash scripts/consolidate.sh` (writes `proposals/*.md`, needs your approval) |
| Health check | `bash scripts/preflight.sh` |
| Validate any mp4 | `bash scripts/validate_output.sh out/<id>.mp4` |
| Preview in Remotion Studio | `pnpm run dev` |

## Scheduling (fully unattended)
Windows Task Scheduler → Create Task → Action:
`"C:\Program Files\Git\bin\bash.exe" -lc "cd '<repo path>' && bash scripts/make_video.sh"`
(nightly). Same pattern for `scripts/scout.sh` (weekly) and `scripts/consolidate.sh`.

## Tuning — edit files, never prompts
- Quality bar: `RULES.md` (R1–R15, Brand section — **replace the placeholder palette**).
- Gates: `WORKFLOW.md` (`PUBLISH_THRESHOLD` = 75, `REGEN_CAP` = 2); env overrides work too:
  `PUBLISH_THRESHOLD=80 bash scripts/make_video.sh`.
- Writing style hints: `HEURISTICS.md`. Fix recipes: `PLAYBOOK.md`.

## What still runs in simulation / fallback (until you finish the integrations)
1. **OpusClip (R15)** — scores are simulated; nothing ever really posts. Needs your OpusClip
   account + MCP; until then treat "would auto-publish" as advisory.
2. **Descript** — voice/cleanup uses the edge-tts fallback. Live path needs either
   `DESCRIPT_API_TOKEN` (community MCP in `.mcp.json`) or the official hosted MCP; note the
   API cannot render AI voices headlessly (tested 2026-07-11), so edge-tts stays the TTS.
3. **Agentic mode** (`./run_loop.sh`, `scripts/scout.sh`) — the only pieces that DO need the
   `claude` CLI; they write scripts/briefs with an LLM. The deterministic path above never does.
