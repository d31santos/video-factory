// heartbeat.mjs — agent presence + lifecycle events for the dashboard.
// `set` updates the agent's live card (logs/agents/<agent>.json) and appends a
// section event; `clear` removes the card and appends a terminal event.
// The dashboard server reads the cards for "now" and events.jsonl for history.
//
//   node scripts/heartbeat.mjs set   --agent make_video-123 --section render \
//        [--step "…"] [--item demo-004] [--mode B] [--format vertical] [--pid 123]
//   node scripts/heartbeat.mjs clear --agent make_video-123 \
//        [--status finished|stopped|failed] [--note "exit 1 at render"]
import { mkdirSync, writeFileSync, rmSync, appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [action, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, "")] = rest[i + 1];

if (!action || !args.agent) {
  console.error("usage: heartbeat.mjs set|clear --agent <name> [--section --step --item --mode --format --pid --status --note]");
  process.exit(1);
}

const dir = join(process.cwd(), "logs", "agents");
mkdirSync(dir, { recursive: true });
const safe = args.agent.replace(/[^\w.-]/g, "_");
const card = join(dir, `${safe}.json`);
const eventsFile = join(dir, "events.jsonl");

const emit = (type, extra = {}) =>
  appendFileSync(eventsFile, JSON.stringify({ ts: new Date().toISOString(), agent: args.agent, type, ...extra }) + "\n");

if (action === "clear") {
  // Enrich the terminal event with the card's last known location.
  let last = {};
  try { last = JSON.parse(readFileSync(card, "utf8")); } catch {}
  rmSync(card, { force: true });
  emit(args.status ?? "finished", {
    item: last.item ?? null, section: last.section ?? null,
    note: args.note ?? null,
  });
  process.exit(0);
}

const isNewAgent = !existsSync(card);
writeFileSync(
  card,
  JSON.stringify(
    {
      agent: args.agent,
      pid: Number(args.pid ?? process.ppid),
      section: args.section ?? "unknown",
      step: args.step ?? "",
      item: args.item ?? null,
      mode: args.mode ?? null,
      format: args.format ?? null,
      ts: new Date().toISOString(),
    },
    null,
    2
  )
);
if (isNewAgent) emit("started", { item: args.item ?? null, section: args.section ?? null });
emit("section", { section: args.section ?? "unknown", step: args.step ?? "", item: args.item ?? null });
