# Descript polish — demo-001

## Status: FALLBACK (polish deferred) — R13 satisfied via documented fallback

### Why no polished file yet
1. **Descript MCP not connected.** `.mcp.json` is wired with the `descript` server,
   but `DESCRIPT_API_TOKEN` is not yet available (pending from the human). Until the
   token is exported and Claude Code is restarted, `check_status` / `import_media` /
   `run_agent` cannot be called.
2. **This audio is TTS, not human VO.** Per RULES.md R13/R14 and the guide's
   "Known constraints", TTS narration has no filler words or dead air to remove, so
   polish route (b) applies: TTS runs may skip Descript polish without quality loss.

Per WORKFLOW.md step 8.5, a Descript-unavailable condition is logged here and the run
continues to CLOSE. The run is NOT blocked.

- **R13** — SATISFIED via documented fallback (this file).
- **R14** — N/A (no polished derivative was produced; original approved render stands).

### To run the polish later (once DESCRIPT_API_TOKEN is set + Claude restarted)
Route the source through the descript MCP and record findings back into WORKFLOW.md
step 8.3/8.4 (which retrieval path actually works for this account/plan):

1. `check_status` — confirm token valid, note Drive scope here.
2. `import_media` — upload `out/demo-001.mp4` (or, for best caption sync on human VO,
   the audio-only `public/audio/demo-001.mp3` BEFORE the Remotion render — route (a)).
   Record project/composition ids here.
3. `run_agent` — instruction: "Remove filler words and awkward silences. Improve audio
   quality. Do not cut any sentence content." (auto-polls)
4. `get_job` — retrieve output. Then attempt, in order, whichever the plan exposes:
   direct export → `get_published_project` → `create_import_url` (write the
   "Edit in Descript" URL here for the human).
5. If a polished file is retrieved → save `out/demo-001_polished.mp4`, run
   `scripts/validate_output.sh` on it, and verify R14 (duration within ±10% of 50.05s,
   i.e. 45.0s–55.1s).

### Empirical retrieval-path finding
PENDING — cannot be determined until the token/connection exist. WORKFLOW.md step
8.3/8.4 remains conditional until this is run once against the real account.
