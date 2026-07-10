// record.mjs — append structured self-healing/learning records.
//   node scripts/record.mjs failure --id X --step S --rule R --symptom "..." --fix "..." --outcome "..."
//   node scripts/record.mjs metric  --id X --enforce N --regens N --best 73 --delta 9 --published false --render-min 4.2
// failures → logs/failures.jsonl, metrics → logs/metrics.jsonl (one JSON object per line).
import { appendFileSync, mkdirSync } from "node:fs";

const [kind, ...rest] = process.argv.slice(2);
const a = Object.fromEntries(rest.reduce((acc, cur, i, arr) => {
  if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]); return acc;
}, []));
mkdirSync("logs", { recursive: true });
const ts = new Date().toISOString();
const num = (v) => (v === undefined ? null : Number(v));
const bool = (v) => v === "true" ? true : v === "false" ? false : null;

if (kind === "failure") {
  const rec = { ts, id: a.id ?? null, step: a.step ?? null, rule: a.rule ?? null,
    symptom: a.symptom ?? null, fix: a.fix ?? null, outcome: a.outcome ?? null };
  appendFileSync("logs/failures.jsonl", JSON.stringify(rec) + "\n");
  console.log("record: failure logged");
} else if (kind === "metric") {
  const rec = { ts, id: a.id ?? null, enforce_iterations: num(a.enforce),
    regenerations: num(a.regens), best_score: num(a.best), score_delta: num(a.delta),
    render_minutes: num(a["render-min"]), published: bool(a.published) };
  appendFileSync("logs/metrics.jsonl", JSON.stringify(rec) + "\n");
  console.log("record: metric logged");
} else {
  console.error("usage: record.mjs <failure|metric> --id X ...");
  process.exit(1);
}
