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

## Brand — Clinic of AI
<!-- Source of truth: the company site (WebSite-CoAI tailwind.config.ts), confirmed 2026-07-17.
     Light/cream theme, swiss grotesque type. Contrast verified for R9:
     #000 on #fff8f3 = 20:1 · #a14000 on #fff8f3 = 6.15:1 · cream on #000 pill = 20:1.
     #ff7a32 is 2.47:1 on cream → DECORATION ONLY, never text. -->

### Palette
- Background / surface: **#fff8f3** (warm cream); pure white #ffffff for cards
- Primary text & captions: **#000000** (black)
- Accent 1 (hook, active caption word): **#a14000** (deep orange)
- Accent 2 (CTA): **#000000** pill with cream **#fff8f3** text (matches site buttons)
- Caption card backdrop: rgba(255,255,255,0.88)
- Scene surfaces (rotate per scene): mint #dde8dc · peach #fde4d0 · sky #dce8ee ·
  lilac #e3dceb · blush #fcd6cf
- Vivid orange #ff7a32: decorative touches only (shapes, underlines) — never text

### Typography
- Swiss grotesque: "Helvetica Neue", Helvetica, "Neue Haas Grotesk Text", Arial
- Heavy weight (800–900) for hook & CTA; 700 for captions; tight letter-spacing
  (-0.01 to -0.02 em) on display sizes; flat type — no glows or heavy shadows

### Tone & content (checkable in the QA read, R12)
- Outcome-first: talk about time saved, calmer workflows, better patient care —
  **not the technology**. The viewer's day is the subject, the tool is a detail.
- **Don't overtalk AI:** say "AI" at most twice per script, and never in the hook
  unless the topic is literally about an AI product decision. Prefer concrete verbs:
  "drafts your notes", "sorts your inbox", "flags what's urgent".
- Warm, plain-spoken, professional; short sentences. No hype words (revolutionary,
  game-changer, insane), no jargon, no invented statistics, no clickbait.
