// dashboard_server.mjs — serves the factory dashboard, live /status.json, and the
// CONTROL PLANE: start/stop pipeline jobs and submit prompts from the browser.
//   node scripts/dashboard_server.mjs   → http://localhost:4599 (localhost only)
//
// POST /api/start  {type:"pending"|"prompt"|"scout", prompt?, id?, format?}
//   pending → bash scripts/make_video.sh [--id --format]        (no AI)
//   prompt  → claude -p seeded with the user's request           (needs `claude` CLI)
//   scout   → bash scripts/scout.sh                              (needs `claude` CLI)
// POST /api/stop   {jobId}   → kills the job's process tree (taskkill /T on Windows)
import { createServer } from "node:http";
import { spawn, execFile } from "node:child_process";
import {
  readFileSync, readdirSync, existsSync, writeFileSync, rmSync,
  appendFileSync, mkdirSync, createWriteStream,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.DASH_PORT ?? 4599);
// Sections beat once each; a final render can go ~6 min between beats.
const FRESH_MS = 480_000;   // beat within 8 min → active
const GONE_MS = 1_800_000;  // beyond 30 min → drop from the board

const BASH =
  [join(process.env.ProgramFiles ?? "C:\\Program Files", "Git", "bin", "bash.exe"), "bash"]
    .find((p) => p === "bash" || existsSync(p));

// Jobs inherit the server's env, which (under a service/scheduler) can be minimal.
// Prepend everything the pipeline needs: node (pnpm\bin), pnpm, claude CLI, python, ffmpeg, jq.
function jobEnv() {
  const LA = process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? "", "AppData", "Local");
  const wingetDir = join(LA, "Microsoft", "WinGet", "Packages");
  const wingetGlob = (prefix, sub = "") => {
    try {
      for (const d of readdirSync(wingetDir)) {
        if (!d.startsWith(prefix)) continue;
        const base = join(wingetDir, d);
        if (!sub) return base;
        for (const inner of readdirSync(base)) {
          const p = join(base, inner, sub);
          if (existsSync(p)) return p;
        }
      }
    } catch {}
    return null;
  };
  const PF = process.env.ProgramFiles ?? "C:\\Program Files";
  const extra = [
    join(PF, "Git", "bin"),      // bash for nested `bash script.sh` calls
    join(PF, "Git", "usr", "bin"),
    join(PF, "Git", "cmd"),
    join(LA, "pnpm", "bin"), // node.EXE lives here, not in pnpm\ itself
    join(LA, "pnpm"),
    join(process.env.USERPROFILE ?? "", ".local", "bin"), // claude CLI
    join(LA, "Programs", "Python", "Python313"),
    join(LA, "Programs", "Python", "Python313", "Scripts"),
    wingetGlob("Gyan.FFmpeg", "bin"),
    wingetGlob("jqlang.jq"),
  ].filter((p) => p && existsSync(p));
  return { ...process.env, PATH: extra.join(";") + ";" + (process.env.PATH ?? "") };
}

const readJson = (p, fb) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fb; } };
const readLines = (p) => { try { return readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean); } catch { return []; } };
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === "EPERM"; } };

// ---------- agent cards / events (same contract as scripts/heartbeat.mjs) ----------
const AGENT_DIR = join(ROOT, "logs", "agents");
mkdirSync(AGENT_DIR, { recursive: true });
const emitEvent = (obj) =>
  appendFileSync(join(AGENT_DIR, "events.jsonl"), JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n");
const writeCard = (agent, fields) =>
  writeFileSync(join(AGENT_DIR, `${agent}.json`), JSON.stringify({ agent, ts: new Date().toISOString(), ...fields }, null, 2));
const clearCard = (agent) => rmSync(join(AGENT_DIR, `${agent}.json`), { force: true });

// ---------- job registry (dashboard-launched processes) ----------
const jobs = new Map(); // jobId → {jobId,type,pid,child,startedAt,detail,log,stopping}
let jobSeq = 0;

function launch(type, { prompt, id, format, video } = {}) {
  // One heavy job at a time per type keeps renders from trampling each other.
  for (const j of jobs.values())
    if (j.type === type) return { error: `a '${type}' job is already running (${j.jobId}) — stop it first` };

  const ts = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15);
  const jobId = `${type}-${++jobSeq}-${ts}`;
  const logPath = join(ROOT, "logs", `dash_${jobId}.log`);
  // Pipe output through this process rather than handing the child a raw fd:
  // under a detached/service parent, inherited file fds can be unwritable for
  // MSYS children (child echoes fail silently and poison exit codes).
  const logStream = createWriteStream(logPath, { flags: "a" });
  let child, detail;

  try {
    if (type === "pending") {
      const args = [join(ROOT, "scripts", "make_video.sh")];
      if (id) args.push("--id", id);
      if (format) args.push("--format", format);
      detail = `make_video ${id ?? "(next pending)"}${format ? " · " + format : ""}`;
      child = spawn(BASH, args, { cwd: ROOT, env: jobEnv(), stdio: ["ignore", "pipe", "pipe"] });
    } else if (type === "scout") {
      detail = "scout: web search → draft briefs (needs_approval)";
      child = spawn(BASH, ["-lc", "bash scripts/scout.sh"], { cwd: ROOT, env: jobEnv(), stdio: ["ignore", "pipe", "pipe"] });
    } else if (type === "prompt") {
      if (!prompt?.trim()) return { error: "prompt is empty" };
      // The user's text goes through a file, never through a shell command line.
      const promptFile = join(ROOT, "logs", `dash_${jobId}.prompt.txt`);
      const videoNote = video
        ? `\n\nA source video was uploaded with this request: ${video} — this is a MODE A run. ` +
          `Repurpose THAT footage (WORKFLOW §Mode A) instead of generating from scratch: get its ` +
          `transcript (Descript MCP, or the sidecar ${video.replace(/\.[^.]+$/, "")}.transcript.json ` +
          `if present), mark keep/cut, recaption per RULES, and follow the request above for angle/format.`
        : "";
      const instructions =
        `A human submitted this request from the factory dashboard:\n\n"${prompt.trim()}"\n\n` +
        `If it asks to produce a video: create a topic entry in topics/queue.json ` +
        `(id "dash-${ts}", status "pending"), write the 100-140 word narration to ` +
        `assets/audio/dash-${ts}.txt, then execute WORKFLOW.md end-to-end for that item` +
        `${format ? ` with format ${format}` : ""}. If it asks to research/find topics, run the ` +
        `scout behavior instead: draft briefs into topics/queue.json as needs_approval, never pending. ` +
        `Obey CLAUDE.md and RULES.md. One item, then stop.` + videoNote;
      writeFileSync(promptFile, instructions);
      detail = `prompt: ${prompt.trim().slice(0, 80)}`;
      child = spawn(
        BASH,
        ["-lc",
         `claude -p "$(cat '${promptFile.replace(/\\/g, "/")}')" ` +
         `--allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,mcp__remotion,mcp__descript,mcp__opusclip" ` +
         `--max-turns 150`],
        { cwd: ROOT, env: jobEnv(), stdio: ["ignore", "pipe", "pipe"] }
      );
    } else {
      return { error: `unknown job type '${type}'` };
    }
  } catch (e) {
    return { error: `failed to spawn: ${e.message}` };
  }

  child.stdout?.pipe(logStream, { end: false });
  child.stderr?.pipe(logStream, { end: false });

  const agent = `dash_${jobId}`;
  const job = { jobId, type, pid: child.pid, child, startedAt: new Date().toISOString(), detail, log: logPath, stopping: false };
  jobs.set(jobId, job);

  // Deterministic runs & scout write their own heartbeats; the raw claude job needs a card.
  if (type === "prompt") {
    writeCard(agent, { pid: child.pid, section: "agentic", step: detail, item: null, mode: null, format: format ?? null });
    emitEvent({ agent, type: "started", item: null, section: "agentic" });
  }

  child.on("exit", (code, signal) => {
    logStream.end();
    jobs.delete(jobId);
    if (type === "prompt") {
      clearCard(agent);
      const status = job.stopping || signal ? "stopped" : code === 0 ? "finished" : "failed";
      emitEvent({ agent, type: status, item: null, section: "agentic", note: `exit ${code ?? signal}` });
    }
  });

  return { jobId, pid: child.pid, detail, log: `logs/${logPath.split(/[\\/]/).pop()}` };
}

function stopJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return { error: `no running job '${jobId}'` };
  job.stopping = true;
  emitEvent({ agent: `dash_${jobId}`, type: "stopped", note: "stop requested from dashboard" });
  if (process.platform === "win32") {
    // /T kills the whole tree (bash → node/remotion/claude children).
    execFile("taskkill", ["/PID", String(job.pid), "/T", "/F"], () => {});
  } else {
    try { process.kill(-job.pid, "SIGTERM"); } catch { try { job.child.kill("SIGTERM"); } catch {} }
  }
  return { ok: true, jobId };
}

// ---------- status aggregation ----------
function agents() {
  if (!existsSync(AGENT_DIR)) return [];
  return readdirSync(AGENT_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson(join(AGENT_DIR, f), null))
    .filter(Boolean)
    .map((a) => {
      const age = Date.now() - Date.parse(a.ts);
      // Freshness first: MSYS/Git-Bash PIDs are not Windows PIDs, so
      // process.kill(pid,0) cannot be trusted to say "dead".
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

  const events = readLines(join(AGENT_DIR, "events.jsonl"))
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean).slice(-20).reverse();

  return {
    now: new Date().toISOString(),
    agents: agents(),
    events,
    jobs: [...jobs.values()].map(({ jobId, type, pid, startedAt, detail }) => ({ jobId, type, pid, startedAt, detail })),
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

// ---------- http ----------
const json = (res, code, obj) => {
  res.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(obj));
};
const body = (req) =>
  new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 65536) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(b || "{}")); } catch { resolve({}); } });
  });

const server = createServer(async (req, res) => {
  if (req.url === "/status.json") return json(res, 200, status());

  if (req.method === "POST" && req.url === "/api/start") {
    const { type, prompt, id, format, video } = await body(req);
    const r = launch(type, { prompt, id, format, video });
    return json(res, r.error ? 409 : 200, r);
  }

  // Upload a source video (or its .transcript.json sidecar) into inbox/ for Mode A.
  // Raw body; the filename travels in the x-filename header (URI-encoded).
  if (req.method === "POST" && req.url === "/api/upload") {
    const name = decodeURIComponent(req.headers["x-filename"] ?? "")
      .replace(/[\\/]/g, "").replace(/[^\w. ()-]/g, "_").replace(/^\.+/, "");
    if (!name || !/\.(mp4|mov|m4v|webm|json)$/i.test(name))
      return json(res, 400, { error: "x-filename must end in .mp4/.mov/.m4v/.webm or .json" });
    mkdirSync(join(ROOT, "inbox"), { recursive: true });
    const dest = join(ROOT, "inbox", name);
    const ws = createWriteStream(dest);
    let size = 0;
    const MAX = 2 * 1024 ** 3; // 2 GB cap
    let aborted = false;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX && !aborted) { aborted = true; ws.destroy(); rmSync(dest, { force: true }); req.destroy(); }
    });
    req.pipe(ws);
    ws.on("finish", () => { if (!aborted) json(res, 200, { ok: true, path: `inbox/${name}`, bytes: size }); });
    ws.on("error", () => { if (!aborted) json(res, 500, { error: "write failed" }); });
    return;
  }
  if (req.method === "POST" && req.url === "/api/stop") {
    const { jobId } = await body(req);
    const r = stopJob(jobId);
    return json(res, r.error ? 404 : 200, r);
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

// Control plane stays local: bind loopback only.
server.listen(PORT, "127.0.0.1", () =>
  console.log(`factory dashboard + controls → http://localhost:${PORT} (bash: ${BASH})`));
