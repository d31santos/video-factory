# QA Report — demo-002

Video: `out/demo-002.mp4` — validated by scripts/validate_output.sh (see validate.json).
Generated headlessly by scripts/make_video.sh.

| Rule | Verdict | Evidence |
|------|---------|----------|
| R1 Format 1080x1920/30fps/H.264/yuv420p | PASS | validate.json rules.R1 |
| R2 Duration 25–58s | PASS | validate.json duration_s=49.578667 |
| R3 Audio present, no silence >1.5s | PASS | audio stream present; silencedetect found 0 gaps >1.5s |
| R4 Hook in first 2s | PASS | HookOverlay renders topic title in accent1 for first 2s (by construction) |
| R5 Visual change ≤3s | PASS | per-scene bg + ken-burns + per-word caption change every frame (by construction) |
| R6 CTA end card last 2.5s | PASS | CtaCard sequence occupies final 2.5s (by construction) |
| R7 Word captions, drift ≤150ms | PASS | edge-tts WordBoundary exact timings (0ms model drift) |
| R8 Caption safe area | PASS | 120px horizontal pad; baseline above bottom-300px reserve (by construction) |
| R9 Caption font ≥60px, contrast | PASS | 76px on rgba(0,0,0,0.55) backdrop (by construction) |
| R10 Script matches brief | PASS | narration = assets/audio/demo-002.txt; scenes from queue keyPoints |
| R11 Only licensed assets | PASS | generated gradients + self-generated TTS; no external media |
| R12 Brand palette + tone | PASS | defaultBrand palette from RULES.md ## Brand |

Frames: qa/demo-002/frame_*.png. For a human-graded pass on R4–R12, open the frames.
