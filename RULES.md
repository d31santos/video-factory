# RULES.md — the quality contract (R1–R15)

Every rule is checkable. The enforce loop grades R1–R12 from frames + ffprobe; R13–R14
are checked after Descript polish; R15 is the OpusClip publish gate. Tune the factory by
editing this file — never by re-prompting. HEURISTICS.md may guide choices but may never
contradict RULES.md; on conflict, RULES.md wins.

## Formats (R1/R2 are per-format)
| Format key | Resolution | Orientation | Duration range (R2) | Primary platforms |
|---|---|---|---|---|
| `landscape` | 1920×1080 | 16:9 | 30–180 s | YouTube, LinkedIn |
| `vertical`  | 1080×1920 | 9:16 | 25–58 s  | Shorts, Reels, TikTok |
| `square`    | 1080×1080 | 1:1  | 25–58 s  | Feed (IG/LinkedIn/X) |

All formats: 30 fps, H.264 MP4, yuv420p.

## Rules
```
R1  correct resolution/fps/codec per format          (check: ffprobe — see Formats table; 30fps, h264, yuv420p)
R2  duration in range per format                      (check: ffprobe — see Formats table)
R3  audio present, no silence > 1.5 s                 (check: ffprobe/ffmpeg silencedetect)
R4  hook readable inside 2 s                          (check: frame_001)
R5  visual change every <= 3 s                        (check: frame sequence)
R6  CTA end card, last 2-3 s                          (check: frame_last)
R7  captions from the Descript transcript, <=150 ms   (check: frames vs transcript word timings)
R8  captions inside safe areas                        (check: frames — >=120px from edges; clear of bottom 300px / right 120px on vertical)
R9  caption size >= 60 px @1080w, contrast >= 4.5:1   (check: frames)
R10 facts constrained to brief/source material        (check: brief diff — zero invented facts)
R11 licensed assets only, provenance logged           (check: asset log in brief)
R12 brand palette and tone respected                  (check: frames vs ## Brand)
R13 Descript polish exists OR documented reason       (check: qa/<id>/descript.md)
R14 polished duration within +/-10% of approved cut   (check: ffprobe)
R15 only clips with virality score >= threshold        (check: qa/<id>/opusclip.md)
    auto-publish; below threshold: regenerate (max 2x),
    then human review — never auto-post on a low score
```

### R7 caption source (v5 change)
Captions come from the **Descript transcript** of the cleaned audio (audio-first ordering,
Figure 4), not from Whisper. Word timings are read from that transcript. Drift ≤ 150 ms.
When the Descript token is unavailable, the documented fallback caption source is the
edge-tts `WordBoundary` timings (TTS runs only) — recorded in qa/<id>/descript.md.

### R15 publish gate
The publish threshold and regeneration cap (2) live in WORKFLOW.md. A clip auto-posts only
if its virality score ≥ threshold. Below threshold → improve loop (max 2 regenerations),
then the human review queue. Missing/unavailable scores → human review queue. Never
auto-post on a low or missing score.

## Brand
<!-- PLACEHOLDER — pending confirmation from the human (david).
     Replace with the real brand palette, typography, and tone before production.
     Defaults are neutral, high-contrast, and satisfy R9 (contrast >= 4.5:1). -->
- Primary background: #0B0B0F (near-black)
- Primary text / captions: #FFFFFF (white)
- Accent 1 (hook, highlights, active caption word): #FFD400 (yellow)
- Accent 2 (CTA button / secondary): #00E0B8 (teal)
- Caption highlight backdrop: rgba(0,0,0,0.55)
- Typography: Inter / system sans-serif; heavy weight (800–900) for hook & captions
- Tone: energetic, direct, plain-spoken; short punchy sentences; no jargon, no hype,
  no invented statistics. Confident, not clickbait.
