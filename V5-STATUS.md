# v5 Upgrade — Build Status

Tracks what's verified vs. pending across the v5 phases. "Placeholder" = built and
wired, but needs a human-supplied credential or a Claude restart to verify live.

## Phase 1 — Wiring ✅ (with deferred smoke tests)
- `.mcp.json` now has **remotion + descript + opusclip** (`pnpm dlx` launchers). Optional
  pexels/replicate documented in `.mcp.optional.md` (not wired — unverified package names).
- **HyperFrames** installed and proven: `hyperframes/hello/` hello-world rendered to a real
  1920×1080 h264 10s MP4 (headless Chrome via puppeteer, ffmpeg encode). ✅
- Folders created: `inbox/` (Mode A), `assets/broll/`, `topics/active/`.
- **Deferred (need restart + creds):** `/mcp` listing all three servers; Descript `check_status`;
  an OpusClip test call. OpusClip uses OAuth (browser sign-in on first call), not an API key.

## Phase 2 — Governing docs → v5 ✅
- CLAUDE.md (3 modes, caps 4/2, verify-APIs, audio-first, R15 gate, no self-edits to policy).
- RULES.md (R1–R15, per-format table, R7=Descript transcript, R15 publish gate). Brand = placeholder.
- WORKFLOW.md (18 steps + RETRO step 19, gates block, Descript/OpusClip placeholders for Phases 4–5).

## Phase 3 — Multi-format compositions + HyperFrames hybrid ✅
- `src/schema.ts`: `format` prop + `FORMATS` map. `VideoTemplate` now reads dims from
  `useVideoConfig` and scales safe-areas/fonts per format (R8/R9 by construction).
- 3 compositions registered: `Video-Landscape` (1920×1080), `Video-Vertical` (1080×1920),
  `Video-Square` (1080×1080). 10s dummies render in all three ✅.
- HyperFrames hybrid proven: `hyperframes/scene/` HTML → `public/broll/hf_scene.mp4`, embedded
  as a scene via Remotion `<OffthreadVideo>`. Verified in-frame.
- Fixed a landscape hook/label collision (scene labels now hidden during the hook window).
- Note: `node_modules` under OneDrive got dehydrated mid-build (missing `_tsc.js`, `@babel/parser`);
  fixed by a clean `pnpm install`. If it recurs, reinstall — or move the project off OneDrive sync.
## Phase 4 — Descript integration ✅ (adapter; live path deferred to token)
- `scripts/descript_adapter.mjs`: audio+transcript (R7) with edge-tts fallback; auto-writes
  `qa/<id>/descript.md`. Smoke-tested (112 words). Real Descript MCP path documented in WORKFLOW
  §Descript details (agentic). Placeholders: AI-voice availability + transcript field (need token).

## Phase 5 — OpusClip integration + gates ✅ (adapter/simulation; live path deferred to account)
- `scripts/opusclip_adapter.mjs`: SIMULATION scoring (deterministic, rises per attempt), writes
  `qa/<id>/opusclip.md`, NEVER publishes. Smoke-tested 55→64→73 across attempts → HUMAN-REVIEW at cap.
- Gates set in WORKFLOW.md: PUBLISH_THRESHOLD=75, REGEN_CAP=2. Real OpusClip MCP path documented (agentic).
## Phase 6 — Mode A (inbox/) path ✅
- `scripts/mode_a_ingest.mjs`: source + sidecar transcript → brief (original audio kept, footage
  as scene bg, captions from transcript). Missing transcript → DEFERRED (exit 3), never crashed.

## Phase 7 — Supervised runs + forced regeneration ✅
- Mode B (demo-003): natural improve loop 66→75 (1 regen) → would-auto-publish (simulation).
- Mode A (inbox-talk): forced threshold 999 → 66→75→84, cap reached → HUMAN REVIEW, published=false.

## Phase 8 — Scout (Mode C) ✅
- `scripts/scout.sh` (headless `claude -p`, ≤5 drafts, always needs_approval) +
  `scripts/promote.mjs` (human gate). Gate proven: unpromoted draft invisible to production.
## Phase 9 — Self-healing & self-learning ✅ (infra built; demonstrated in Phase 7/10)
- `scripts/preflight.sh` (toolchain+service health, degrades to fallback, never crashes) — tested.
- `logs/failures.jsonl` + `logs/metrics.jsonl` via `scripts/record.mjs`; retro.md per run.
- `PLAYBOOK.md` (symptom→fix, seeded from PDF §13 + this build's fixes P11–P15).
- `HEURISTICS.md` (read before scripting; binding, never above RULES).
- `scripts/consolidate.sh` → `proposals/*.md` flagged needs_approval (loop proposes, human applies) — tested.
- `scripts/make_video.sh` rewritten as the v5 orchestrator (preflight→mode→adapters→render→QA→
  improve loop→gate→metrics/retro). Descript/OpusClip use fallback/simulation in this path.
## Phase 10 — Headless + final checklist ✅
- `run_loop.sh` v5: preflight first, mcp__opusclip in allowlist, --max-turns 150, cron notes.
- One fully headless deterministic run (demo-001): 64→73→82, published=true (simulation);
  queue/report/descript/opusclip/retro/metrics/production.log all written.
- Stop-hook re-verified: blocks FAIL (exit 2), allows clean (exit 0).
- Consolidation over 3 runs: avg best 80.3, publish rate 67% → proposal in proposals/ (needs_approval).

## Human inputs still needed
1. **DESCRIPT_API_TOKEN** (dev portal, scoped to a dedicated Drive) — also confirm API **and AI-voice** availability on the plan.
2. **OpusClip account** with API/MCP access; connect target platforms inside OpusClip.
3. **Real Brand section** (palette, typography, tone) — currently a placeholder in RULES.md.
4. Optional: Pexels API key, Replicate token + spend cap.
