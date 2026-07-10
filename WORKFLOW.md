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

## §Descript details  <!-- filled empirically in Phase 4 -->
- Tools (verified list): `import_media`, `run_agent`, `get_job`, `list_jobs`, `cancel_job`,
  `check_status`, `create_import_url`, `get_published_project`.
- Cleanup instruction (conservative): "Remove filler words and awkward silences. Improve audio
  quality. Do not cut any sentence content." Then verify R14.
- **AI voice availability is plan-dependent — PLACEHOLDER, confirm in Phase 4.** If the plan does
  not expose AI voice via API, the fallback is recorded VO or caption-led videos. Until confirmed,
  the adapter (`scripts/descript_adapter.mjs`) falls back to edge-tts for voice and edge-tts
  `WordBoundary` for transcript/timings, and logs the fallback to `qa/<id>/descript.md`.
- **Transcript retrieval path — PLACEHOLDER, confirm in Phase 4** (which get_job/output field
  carries word timings on this account).

## §OpusClip details  <!-- filled empirically in Phase 5 -->
- Auth: OAuth (browser sign-in on first MCP call), NOT an API key. Hosted MCP `mcp.opus.pro`.
- **Clip/score retrieval path — PLACEHOLDER, confirm in Phase 5** (how clips + virality scores
  come back on this plan; which field is the per-clip score; how captions attach).
- Until confirmed, the adapter (`scripts/opusclip_adapter.mjs`) runs in SIMULATION mode: it emits
  a clearly-marked deterministic pseudo-score so the loop is exercisable end-to-end, and it NEVER
  publishes. Simulation scores never count as a real publish decision.
- Publishing is via accounts connected inside OpusClip; the pipeline never handles platform creds.
