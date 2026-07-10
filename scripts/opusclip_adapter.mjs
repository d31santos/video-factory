// opusclip_adapter.mjs — evaluation + publish gate (WORKFLOW steps 15–17), with a fallback.
//
// v5 intent: OpusClip clips the final video, scores each clip for virality, and (via the
// accounts connected INSIDE OpusClip) auto-publishes clips scoring >= threshold. OpusClip is
// an OAuth MCP that only the AGENT can call — so this deterministic adapter runs in SIMULATION
// mode: it emits clearly-marked deterministic pseudo-scores so the improve loop and publish gate
// are exercisable end-to-end, and it NEVER publishes. Real scoring/publishing is agentic
// (run_loop.sh → claude -p), per WORKFLOW.md §OpusClip details.
//
// Usage:
//   node scripts/opusclip_adapter.mjs --id <id> --video <out/<id>.mp4> \
//        --threshold 75 --attempt 0 --opusclip-md qa/<id>/opusclip.md
// Prints one JSON line to stdout: {"bestScore":N,"threshold":T,"decision":"...","simulated":true}
import { writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const id = args.id;
const video = args.video;
const threshold = Number(args.threshold ?? 75);
const attempt = Number(args.attempt ?? 0);
const mdPath = args["opusclip-md"] ?? `qa/${id}/opusclip.md`;
if (!id || !video) {
  console.error("usage: opusclip_adapter.mjs --id <id> --video <mp4> --threshold N --attempt N --opusclip-md <md>");
  process.exit(1);
}
if (!existsSync(video)) {
  console.error(`opusclip_adapter: video not found: ${video}`);
  process.exit(1);
}

// Deterministic pseudo-score: stable per id, rising with each regeneration attempt so the
// improve loop shows real deltas. NOT a real virality score — simulation only.
function hash(s) { let h = 2166136261 >>> 0; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
const base = 52 + (hash(id) % 22);            // 52–73 baseline
const best = Math.min(98, base + attempt * 9); // each regeneration ~+9
const clips = [
  { name: `${id}_clip_1`, score: best },
  { name: `${id}_clip_2`, score: Math.max(0, best - 6) },
  { name: `${id}_clip_3`, score: Math.max(0, best - 12) },
];

const meets = best >= threshold;
// SIMULATION never auto-publishes. A real run would AUTO-PUBLISH clips >= threshold.
const decision = meets
  ? "WOULD-AUTO-PUBLISH (simulation: not posted)"
  : (attempt >= 2 ? "HUMAN-REVIEW (regen cap reached)" : "REGENERATE (below threshold)");

mkdirSync(dirname(mdPath), { recursive: true });
const attemptBlock =
  `### Attempt ${attempt}\n` +
  `- best score: **${best}** (threshold ${threshold}) → ${meets ? "≥ threshold" : "below threshold"}\n` +
  clips.map((c) => `  - ${c.name}: ${c.score}`).join("\n") + "\n" +
  `- decision: ${decision}\n`;

if (attempt === 0 || !existsSync(mdPath)) {
  writeFileSync(
    mdPath,
    `# OpusClip — ${id}\n\n` +
    `> **SIMULATION MODE.** These are deterministic pseudo-scores, not real OpusClip virality\n` +
    `> scores, and NOTHING is published. Real scoring/publishing runs via the OpusClip MCP in the\n` +
    `> agentic path (OAuth; platforms connected inside OpusClip). Threshold = ${threshold}, regen cap = 2.\n\n` +
    attemptBlock
  );
} else {
  appendFileSync(mdPath, "\n" + attemptBlock);
}

console.log(JSON.stringify({ bestScore: best, threshold, decision, simulated: true, attempt }));
