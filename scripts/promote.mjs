// promote.mjs — the HUMAN promotion gate for scout drafts (Mode C) and consolidation
// proposals. Flips one topic from `needs_approval` to `pending`. Run by a person, not the loop.
//   node scripts/promote.mjs <topic-id>          # promote one draft
//   node scripts/promote.mjs --list              # show drafts awaiting approval
import { readFileSync, writeFileSync } from "node:fs";

const arg = process.argv[2];
const queue = JSON.parse(readFileSync("topics/queue.json", "utf8"));

if (!arg || arg === "--list") {
  const drafts = queue.topics.filter((t) => t.status === "needs_approval");
  if (drafts.length === 0) { console.log("promote: no drafts awaiting approval"); process.exit(0); }
  for (const d of drafts) console.log(`- ${d.id}: ${d.title}${d.rationale ? `  [${d.rationale}]` : ""}`);
  process.exit(0);
}

const t = queue.topics.find((x) => x.id === arg);
if (!t) { console.error(`promote: topic ${arg} not found`); process.exit(1); }
if (t.status !== "needs_approval") {
  console.error(`promote: ${arg} is '${t.status}', not 'needs_approval' — nothing to do`);
  process.exit(1);
}
t.status = "pending";
writeFileSync("topics/queue.json", JSON.stringify(queue, null, 2));
console.log(`promote: ${arg} → pending (human-approved)`);
