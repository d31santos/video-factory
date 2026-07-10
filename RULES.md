# Format
R1  1080x1920, 30fps, H.264 MP4, yuv420p        (check: ffprobe)
R2  duration 25–58 s                             (check: ffprobe)
R3  audio stream present, no silence > 1.5 s     (check: ffprobe/ffmpeg)
# Hook & pacing
R4  readable hook inside first 2 s               (check: frame_001)
R5  visual change at least every 3 s             (check: frame sequence)
R6  CTA end card in last 2–3 s                   (check: frame_last)
# Captions
R7  word-level captions, drift ≤ 150 ms          (check: spot-check frames vs timestamps)
R8  caption safe area ≥ 120 px from edges; nothing in bottom 300 px / right 120 px   (check: frames)
R9  caption font ≥ 60 px @1080 w; contrast ≥ 4.5:1                                    (check: frames)
# Content
R10 script matches brief; zero invented facts    (check: compare to brief)
R11 only licensed assets from assets/            (check: file provenance)
R12 brand palette + tone respected               (check: frames)
# Descript stage
R13 polished version exists OR a documented fallback reason in qa/<id>/descript.md
R14 polished duration within ±10% of the approved render (Descript must not butcher it)

## Brand
<!-- PLACEHOLDER — pending confirmation from the human (david).
     Replace the values below with the real brand palette and tone.
     These defaults are neutral, high-contrast, and satisfy R9 (contrast ≥ 4.5:1). -->
- Primary background: #0B0B0F (near-black)
- Primary text / captions: #FFFFFF (white)
- Accent 1 (hook, highlights, active caption word): #FFD400 (yellow)
- Accent 2 (CTA button / secondary): #00E0B8 (teal)
- Caption highlight backdrop: rgba(0,0,0,0.55)
- Font family: Inter / system sans-serif, heavy weight for hook & captions
- Tone: energetic, direct, plain-spoken; short punchy sentences; no jargon,
  no hype-y filler, no invented statistics. Confident but not clickbait.
