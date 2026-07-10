# PLAYBOOK.md — known symptom → proven fix

On any error, match against this table BEFORE improvising. When a new fix works, append it
here (a BLOCKED.md entry MUST include a proposed playbook addition). Seeded from the v5 guide
Section 13 plus fixes proven during this build.

| # | Symptom | Cause | Proven fix |
|---|---------|-------|------------|
| P1 | Agent invents Remotion/Descript/OpusClip APIs | Stale training data | Connect the MCP; CLAUDE.md "verify APIs via MCPs before coding". |
| P2 | QA passes suspiciously fast | Self-grading leniency | Require frame-filename evidence per rule; weekly human spot-checks. |
| P3 | Captions drift after polish | Descript cut a captioned video | Audio-first ordering (Figure 4): clean + transcript BEFORE render. |
| P4 | No AI voice on the Descript plan | Plan/API limit | Caught at the Phase 4 checkpoint; fallback = recorded VO or caption-led (edge-tts). |
| P5 | Descript/OpusClip job hangs | v0.1 API / plan limits | Timeout + logged fallback; low/missing scores never auto-publish. |
| P6 | Regeneration ping-pong (scores never improve) | Revisions miss the real weakness | Hard cap of 2; log score deltas; flat deltas twice → human reviews threshold/heuristics. |
| P7 | Scout floods the queue with weak topics | Unsupervised discovery | `needs_approval` flag mandatory; cap scout output ≤5/run. |
| P8 | Everything auto-publishes | Threshold too low | Start strict (top clip only); tune monthly vs real performance. |
| P9 | Loop never terminates | Impossible rule | Iteration caps + BLOCKED.md; fix the rule, not the agent. |
| P10 | Costs creep | Full-res renders in the loop | Preview-first QA; each regeneration ≈ one extra full pass — the cap is also a budget. |
| P11 | Output is yuvj420p, fails R1 | JPEG frames = full-range | `Config.setVideoImageFormat("png")` + `setPixelFormat("yuv420p")`. |
| P12 | Trailing silence > 1.5s, fails R3 | Video tail longer than narration | build_brief tail = lastCaptionMs/1000 + 0.6s (not a full ceil+1). |
| P13 | `remotion`/`tsc` crash: "Cannot find module _tsc.js / @babel/parser" | OneDrive dehydrated node_modules files | Clean reinstall: `rm -rf node_modules && pnpm install`. Consider moving the project off OneDrive sync. |
| P14 | edge-tts returns 0 word timings | Default `boundary=SentenceBoundary` | Pass `boundary="WordBoundary"` to `Communicate` (scripts/tts.py). |
| P15 | Hook and scene label overlap on landscape | Short canvas, both top-anchored | Center scene labels; hide the label during the hook window (VideoTemplate). |
