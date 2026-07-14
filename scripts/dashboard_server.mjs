// dashboard_server.mjs — serves the factory dashboard + live /status.json.
// Aggregates: agent heartbeats (logs/agents/*.json + pid liveness), queue state,
// gates from WORKFLOW.md, production.log tail, metrics.jsonl, blocked items.
//   node scripts/dashboard_server.mjs   → http://localhost:4599
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.DASH_PORT ?? 4599);
// Sections beat once each; a final render can go ~6 min between beats.
const FRESH_MS = 480_000;   // beat within 8 min → active
const GONE_MS = 1_800_000;  // beyond 30 min → drop from the board

const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fb; } };
const readLines = (p) => { try { return readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean); } catch { return []; } };
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

function agents() {
  const dir = join(ROOT, "logs", "agents");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(join(dir, f), null))
    .filter(Boolean)
    .map((a) => {
      const age = Date.now() - Date.parse(a.ts);
      // Freshness is the primary liveness signal: MSYS/Git-Bash PIDs are not
      // Windows PIDs, so process.kill(pid,0) cannot be trusted to say "dead".
      // Exited agents remove their file via trap; leftovers only mean a crash.
      const state = age <= FRESH_MS ? "active" : a.pid && pidAlive(a.pid) ? "stale" : "offline";
      return { ...a, ageSec: Math.round(age / 1000), state };
    })
    .filter((a) => Date.now() - Date.parse(a.ts) < GONE_MS);
}

function status() {
  const queue = readJson(join(ROOT, "topics", "queue.json"), { topics: [] });
  const counts = {};
  for (const t of queue.topics) counts[t.status] = (counts[t.status] ?? 0) + 1;

  const wf = (() => { try { return readFileSync(join(ROOT, "WORKFLOW.md"), "utf8"); } catch { return ""; } })();
  const threshold = Number(wf.match(/PUBLISH_THRESHOLD\*\* = (\d+)/)?.[1] ?? 75);
  const regenCap = Number(wf.match(/REGEN_CAP\*\* += +(\d+)/)?.[1] ?? 2);

  const metrics = readLines(join(ROOT, "logs", "metrics.jsonl"))
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean).slice(-12);

  const blocked = existsSync(join(ROOT, "qa"))
    ? readdirSync(join(ROOT, "qa"), { withFileTypes: true })
        .filter((d) => d.isDirectory() && existsSync(join(ROOT, "qa", d.name, "BLOCKED.md")))
        .map((d) => d.name)
    : [];

  const proposals = existsSync(join(ROOT, "proposals"))
    ? readdirSync(join(ROOT, "proposals")).filter((f) => f.endsWith(".md")).length
    : 0;

  const events = readLines(join(ROOT, "logs", "agents", "events.jsonl"))
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean).slice(-20).reverse();

  return {
    now: new Date().toISOString(),
    agents: agents(),
    events,
    queue: {
      counts,
      items: queue.topics.map(({ id, status, title }) => ({ id, status, title })),
    },
    gates: { threshold, regenCap },
    production: readLines(join(ROOT, "logs", "production.log")).slice(-8).reverse(),
    metrics,
    blocked,
    proposals,
    humanReview: metrics.filter((m) => m.published === false).map((m) => m.id),
  };
}

const server = createServer((req, res) => {
  if (req.url === "/status.json") {
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(status()));
    return;
  }
  if (req.url === "/" || req.url === "/index.html") {
    try {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(readFileSync(join(ROOT, "dashboard", "index.html")));
    } catch {
      res.writeHead(500); res.end("dashboard/index.html missing");
    }
    return;
  }
  res.writeHead(404); res.end("not found");
});

server.listen(PORT, () => console.log(`factory dashboard → http://localhost:${PORT}`));
