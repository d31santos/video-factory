# 🎬 Video Factory

An autonomous pipeline that turns **a topic, a prompt, or an existing video** into a
finished, quality-checked short video — captions, voiceover, branded visuals, multi-format
(vertical / square / landscape) — with a virality-score gate before anything is published,
and a live dashboard to watch and control it all.

**New here? Read [TEAM-GUIDE.md](TEAM-GUIDE.md)** — how it works, setup, and every run
option. Operators: [RUNBOOK.md](RUNBOOK.md) is the quick reference.

---

## What it does

- **Three ways in:** generate from a topic brief (Mode B), repurpose an uploaded video
  (Mode A), or let the AI scout draft topics from web research (Mode C — drafts always
  need human approval).
- **Quality by contract:** every render is graded against 15 checkable rules
  ([RULES.md](RULES.md)) — format, hook timing, caption safe-areas/contrast, zero invented
  facts, brand palette — with per-run evidence in `qa/<id>/report.md`.
- **Publish gate:** clips get a virality score; below threshold the video is revised and
  regenerated (max 2×), then queued for **human review — never auto-posted on a low score**.
- **Self-healing & self-learning:** a preflight gate degrades gracefully instead of
  crashing; every run writes a retro + metrics; a consolidation pass proposes rule/threshold
  improvements that only a human can apply.
- **Live dashboard with controls:** see every agent and which pipeline section it's in,
  an activity feed (started/section/finished/stopped/failed), scores vs threshold — and
  start, stop, or **prompt** the loop, including uploading a source video, from the browser.

## Quickstart

```bash
git clone https://github.com/d31santos/video-factory.git
cd video-factory
pnpm install
bash scripts/preflight.sh          # names anything missing (needs node≥20, ffmpeg, jq, python+edge-tts)

# produce one video from the queue (no AI needed):
bash scripts/make_video.sh

# watch + control everything:
node scripts/dashboard_server.mjs  # → http://localhost:4599
```

From the dashboard you can type a request ("Make a vertical video about X"), attach a
source video for repurposing, run the topic scout, and stop any running job.

## The pipeline, in one line

```
entry → voice + transcript → build → render → QA (R1–R12) → score (R15) → publish gate → close
                                        ↑            improve loop (max 2 regenerations) ↓
```

## Repository map

| Path | What it is |
|---|---|
| `TEAM-GUIDE.md` / `RUNBOOK.md` | how to use it / operator quick-reference |
| `CLAUDE.md` · `WORKFLOW.md` · `RULES.md` | the agent contract, the 18-step pipeline + gates, the quality rules |
| `HEURISTICS.md` · `PLAYBOOK.md` | writing guidance · symptom→fix recipes |
| `src/` | Remotion compositions (one per format) + caption/scene template |
| `scripts/` | the pipeline: `make_video.sh`, adapters, QA tools, dashboard server |
| `dashboard/` | the live dashboard page |
| `topics/` · `inbox/` · `assets/` | topic queue · Mode A drops · narration scripts & b-roll |
| `out/` · `qa/` · `logs/` · `proposals/` | renders (gitignored) · per-run evidence · history · learning proposals |

## Integration status

| Piece | Status | To go live |
|---|---|---|
| Rendering, QA, captions, gates, dashboard, scheduling | ✅ live | — |
| Voice (edge-tts) | ✅ live (fallback by design) | optional: Descript/ElevenLabs |
| **OpusClip** (real scores + publishing) | 🔶 simulation | OpusClip **Pro** plan + `claude mcp add --transport http opusclip https://mcp.opus.pro` (OAuth) |
| **Descript** (audio polish/transcripts) | 🔶 edge-tts fallback | `DESCRIPT_API_TOKEN`, or the official hosted MCP |
| Brand palette/tone | ✅ live | Clinic of AI palette (cream/black/deep-orange, swiss type) from the company site; tone rules incl. "don't overtalk AI" in `RULES.md ## Brand` |

Until OpusClip is connected, scores are **simulated and nothing is ever posted** —
"would auto-publish" in the logs is advisory only.

## Remotion licensing note

Remotion is free for individuals and teams of up to 3 people; larger companies need a
[company license](https://remotion.pro/license).
