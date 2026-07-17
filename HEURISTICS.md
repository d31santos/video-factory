# HEURISTICS.md — what scores well (read before scripting)

Binding guidance for the SCRIPT and scene steps. Treated like RULES.md, but **never above it**:
on any conflict, RULES.md wins. This file is distilled from `qa/*/retro.md` by the consolidation
run; the loop may only *propose* edits (to `proposals/`) — a human promotes them.

## Hook (first 2 s) — the single highest-leverage choice
- Lead with the payoff or a sharp tension: "The mistake that costs clinics hours every week."
- ≤ 7 words on screen; concrete noun + stakes. No throat-clearing ("In this video…").
- Number-led hooks ("3 ways…") set expectations and pace well.
- Per Brand (RULES.md): no "AI" in the hook unless the topic is literally an AI decision.

## Language — outcome-first, tech-light (Brand rule, binding via R12)
- The subject is the viewer's day, not the tool: "your notes draft themselves while you
  see the next patient" beats "AI-powered documentation automation".
- "AI" appears ≤ 2× per script. Swap in concrete verbs: drafts, sorts, flags, surfaces.
- Cut tech nouns (model, LLM, algorithm, automation) unless the point depends on them.

## Opening pace
- First scene ≤ 3 s; first visual change within 2 s. Don't linger on a title card.
- Get to the first concrete point before the 5 s mark.

## Captions
- Word-level, active word highlighted; 4–6 words visible at once (our sliding window).
- Keep them out of the bottom 300 px on vertical (platform UI) — R8.

## Scene length & pacing
- 2.5–3.5 s per beat; one idea per scene. Motion (ken-burns / HyperFrames) every scene → R5 holds.
- Match scene count to narration length so there's no black tail.

## Iteration-wasters to avoid
- Don't hand-tune per-format pixel offsets — derive layout from dimensions (see VideoTemplate).
- Don't chase R1 with render flags — set PNG frames + yuv420p once in remotion.config.ts.
- Don't regenerate for a <5-point score gap on the first attempt; fix the hook first.

## Seeded, unproven (replace with real retro data)
> These are priors, not measured. After ~10 videos the consolidation run should confirm or
> replace them with what actually correlated with virality score.
