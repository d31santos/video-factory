# QA Report — inbox-talk (mode A, vertical)

Video: `out/inbox-talk.mp4` — validated by scripts/validate_output.sh (qa/inbox-talk/validate.json).

| Rule | Verdict | Evidence |
|------|---------|----------|
| R1 resolution/fps/codec per format | PASS | validate.json rules.R1 (vertical) |
| R2 duration in range | PASS | validate.json duration_s=28.928000 |
| R3 audio present, no silence >1.5s | PASS | audio present; silencedetect 0 gaps >1.5s |
| R4 hook in first 2s | PASS | HookOverlay in accent1, first 2s (by construction) |
| R5 visual change <=3s | PASS | per-scene bg + motion + per-word captions (by construction) |
| R6 CTA end card last 2.5s | PASS | CtaCard final 2.5s (by construction) |
| R7 captions from transcript, <=150ms | PASS | edge-tts WordBoundary timings (0ms model drift) |
| R8 captions in safe areas | PASS | edge-derived padding; above bottom reserve (by construction) |
| R9 caption >=60px, contrast | PASS | size = max(60, width*0.07) on rgba backdrop (by construction) |
| R10 facts constrained to brief | PASS | narration from source of truth; scenes from brief |
| R11 licensed assets, provenance | PASS | assetLog in brief; generated gradients + self TTS |
| R12 brand palette + tone | PASS | defaultBrand from RULES.md ## Brand |

Frames: qa/inbox-talk/frame_*.png. Descript: qa/inbox-talk/descript.md. Scores: qa/inbox-talk/opusclip.md.
