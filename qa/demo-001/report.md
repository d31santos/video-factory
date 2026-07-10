# QA Report — demo-001

Video: `out/demo-001.mp4` (1080x1920, 30fps, H.264, yuv420p, 50.05s, 5.7 MB)
QA iterations: 3 (initial → fixed caption/CTA bleed → fixed pixel format + trailing silence)

| Rule | Verdict | Evidence |
|------|---------|----------|
| R1 Format 1080x1920/30fps/H.264/yuv420p | PASS | validate_output.sh: width=1080, height=1920, fps=30, vcodec=h264, pix_fmt=yuv420p |
| R2 Duration 25–58s | PASS | validate_output.sh: duration_s=50.05 |
| R3 Audio present, no silence >1.5s | PASS | audio stream aac present; silencedetect(-40dB,1.5s) → no gaps >1.5s after tail trim |
| R4 Readable hook in first 2s | PASS | frame_001: yellow hook "AI saves clinicians hours" visible top-third |
| R5 Visual change ≤ every 3s | PASS | scene bg changes color across frames (teal→yellow→blue→pink), ken-burns motion + per-word caption change every frame |
| R6 CTA end card in last 2–3s | PASS | frame_last: teal CTA card "Follow for one practical AI workflow a day" (final 2.5s) |
| R7 Word-level captions, drift ≤150ms | PASS | captions from edge-tts WordBoundary (exact TTS timings, 0ms model drift); active word highlighted, syncs across frames |
| R8 Caption safe area ≥120px edges; clear of bottom 300px / right 120px | PASS | caption band padded 120px horizontally, baseline at y=1560 (above the 1620 bottom-reserve line) |
| R9 Caption font ≥60px; contrast ≥4.5:1 | PASS | caption font 76px; white/#FFD400 text on rgba(0,0,0,0.55) backdrop over dark bg (>4.5:1) |
| R10 Script matches brief; zero invented facts | PASS | narration = assets/audio/demo-001.txt, built from queue keyPoints (documentation/inbox/decisions); no stats invented |
| R11 Only licensed assets from assets/ | PASS | no external media; backgrounds are generated gradients; audio is self-generated TTS |
| R12 Brand palette + tone respected | PASS | bg #0B0B0F, text #FFFFFF, accent1 #FFD400, accent2 #00E0B8 per RULES.md ## Brand; tone direct/plain |

## Notes
- Caption source: edge-tts `WordBoundary` events (substitutes for the omitted Whisper step; valid because audio is TTS, not human VO — see "Known constraints" route (b)).
- Cosmetic (not a rule): decorative scene labels are distributed evenly across the
  runtime and don't tightly track the narration topic-by-topic. Captions carry the
  actual spoken words, so R7/R10 hold. Future refinement: align scene cut points to
  sentence boundaries from the caption timings.
- No FAIL remaining. Ready for human approval (Phase 5 checkpoint) and Descript polish (Phase 6).
