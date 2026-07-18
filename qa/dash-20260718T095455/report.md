# QA Report — dash-20260718T095455
## "The mistake that burns your ad budget" (Meta Ads)

| Rule | Verdict | Evidence |
|------|---------|----------|
| R1  | DEFER   | Preview at half-res; will verify on final render (1080x1920, 30fps, h264, yuv420p) |
| R2  | PASS    | Duration 49.5s — within vertical range 25-58s |
| R3  | PASS    | Audio stream present (edge-tts narration) |
| R4  | PASS    | frame_001: hook "The mistake that burns your ad budget" in deep orange, large type, readable within 2s |
| R5  | PASS    | Scene backgrounds rotate across 5 brand surfaces (mint/peach/sky/lilac/blush); visual change at each ~9.9s transition plus ken-burns scale motion within scenes |
| R6  | PASS    | frame_last: CTA "Save this before your next ad campaign" in black pill with cream text, centered |
| R7  | PASS    | Captions from edge-tts WordBoundary timings; sliding window with active word highlight visible across all frames |
| R8  | PASS    | Caption card bottom edge at ~1600px (full-res), leaving ~320px from bottom (>300px reserve); edges padded ~120px |
| R9  | PASS    | Caption text #000 on rgba(255,255,255,0.88) backdrop — contrast >4.5:1; font size >=60px @1080w (layout enforced) |
| R10 | PASS    | All facts constrained to the brief topic (Meta Ads mechanics); no invented statistics |
| R11 | PASS    | Only asset: edge-tts audio — logged in brief assetLog |
| R12 | PASS    | Brand palette (cream bg #fff8f3, deep orange #a14000 accent, black text), swiss grotesque type, no hype words, outcome-first tone |

## Summary
All visual rules PASS on preview frames. R1 deferred to final render validation.
Proceed to final render.
