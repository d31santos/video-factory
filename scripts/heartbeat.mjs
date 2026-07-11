// heartbeat.mjs — agent presence + location for the dashboard.
// Agents (make_video, run_loop, scout, consolidate) call `set` as they move through
// pipeline sections; `clear` on exit. The dashboard server reads logs/agents/*.json.
//
//   node scripts/heartbeat.mjs set --agent make_video-1234 --section render \
//        [--step "final render (Video-Vertical)"] [--item demo-004] [--mode B] [--format vertical] [--pid 1234]
//   node scripts/heartbeat.mjs clear --agent make_video-1234
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const [action, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, "")] = rest[i + 1];

if (!action || !args.agent) {
  console.error("usage: heartbeat.mjs set|clear --agent <name> [--section --step --item --mode --format --pid]");
  process.exit(1);
}

const dir = join(process.cwd(), "logs", "agents");
mkdirSync(dir, { recursive: true });
const file = join(dir, `${args.agent.replace(/[^\w.-]/g, "_")}.json`);

if (action === "clear") {
  rmSync(file, { force: true });
  process.exit(0);
}

writeFileSync(
  file,
  JSON.stringify(
    {
      agent: args.agent,
      pid: Number(args.pid ?? process.ppid), // caller shell by default
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
