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

## Phase 2 — Governing docs → v5 ⏳
## Phase 3 — Multi-format compositions + HyperFrames hybrid ⏳
## Phase 4 — Descript integration (empirical) ⏳ — needs DESCRIPT_API_TOKEN
## Phase 5 — OpusClip integration + gates (empirical) ⏳ — needs OpusClip account (OAuth)
## Phase 6 — Mode A (inbox/) path ⏳
## Phase 7 — Supervised runs + forced regeneration ⏳
## Phase 8 — Scout (Mode C) ⏳
## Phase 9 — Self-healing & self-learning ⏳
## Phase 10 — Headless + final checklist ⏳

## Human inputs still needed
1. **DESCRIPT_API_TOKEN** (dev portal, scoped to a dedicated Drive) — also confirm API **and AI-voice** availability on the plan.
2. **OpusClip account** with API/MCP access; connect target platforms inside OpusClip.
3. **Real Brand section** (palette, typography, tone) — currently a placeholder in RULES.md.
4. Optional: Pexels API key, Replicate token + spend cap.
