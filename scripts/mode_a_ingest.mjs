// mode_a_ingest.mjs — Mode A (WORKFLOW step 3): repurpose a video from inbox/.
//
// Real path: the agent imports the source into Descript → transcript + segments (keep/cut) →
// brief. This deterministic fallback needs a sidecar transcript because a shell has no
// transcription engine: `inbox/<name>.transcript.json` = [{word,startMs,endMs}, ...]
// (the same shape edge-tts/Descript produce). It extracts the original audio, keeps the source
// footage as the scene background, and emits a brief identical in shape to Mode B.
//
// Usage:
//   node scripts/mode_a_ingest.mjs --video inbox/<file>.mp4 --id <id> \
//        --out topics/active/<id>.json [--format vertical] [--hook "..."] [--cta "..."]
// Requires ffmpeg/ffprobe on PATH. If the sidecar transcript is missing, exits 3 (DEFERRED),
// never crashes the loop.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { basename } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);
const video = args.video;
const id = args.id;
const out = args.out;
const format = args.format ?? "vertical";
if (!video || !id || !out) {
  console.error("usage: mode_a_ingest.mjs --video <inbox/file> --id <id> --out <brief.json> [--format] [--hook] [--cta]");
  process.exit(1);
}
if (!existsSync(video)) { console.error(`mode_a_ingest: video not found: ${video}`); process.exit(1); }

const sidecar = video.replace(/\.[^.]+$/, ".transcript.json");
if (!existsSync(sidecar)) {
  console.error(`mode_a_ingest: DEFERRED — no sidecar transcript ${sidecar}.\n` +
    "Provide a Descript token (agentic path transcribes automatically) or a sidecar transcript.");
  process.exit(3); // DEFERRED, not a crash
}

function ff(bin, argv) {
  const r = spawnSync(bin, argv, { encoding: "utf8" });
  if (r.status !== 0) { console.error(`${bin} failed: ${r.stderr || r.stdout}`); process.exit(1); }
  return r.stdout.trim();
}

// Probe duration.
const dur = Number(ff("ffprobe", ["-v", "error", "-show_entries", "format=duration",
  "-of", "default=nw=1:nk=1", video]));

// Keep original audio: extract to public/audio/<id>.mp3. Copy footage to public/broll.
mkdirSync("public/audio", { recursive: true });
mkdirSync("public/broll", { recursive: true });
ff("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", video,
  "-vn", "-c:a", "libmp3lame", "-q:a", "4", `public/audio/${id}.mp3`]);
const srcName = `${id}_src.mp4`;
copyFileSync(video, `public/broll/${srcName}`);

const captions = JSON.parse(readFileSync(sidecar, "utf8"));
const lastMs = captions.length ? Math.max(...captions.map((c) => c.endMs)) : dur * 1000;
const totalSec = Math.min(dur, lastMs / 1000 + 0.6);

const brand = {
  bg: "#0B0B0F", text: "#FFFFFF", accent1: "#FFD400", accent2: "#00E0B8",
  captionBackdrop: "rgba(0,0,0,0.55)",
  fontFamily: 'Inter, "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif',
};

// Repurpose brief: source footage IS the scene background (its own motion satisfies R5);
// captions from the transcript (R7); original audio kept (audioSrc).
const brief = {
  mode: "A",
  source: video,
  hook: args.hook ?? "Watch this",
  scenes: [{ text: "", visual: `broll/${srcName}`, durationSec: Number(totalSec.toFixed(2)) }],
  cta: args.cta ?? "Follow for more",
  captions,
  audioSrc: `audio/${id}.mp3`,
  brand,
  format,
  assetLog: [{ file: `broll/${srcName}`, provenance: `Mode A source: ${basename(video)}` }],
};

mkdirSync("topics/active", { recursive: true });
writeFileSync(out, JSON.stringify(brief, null, 2));
console.log(`mode_a_ingest: wrote ${out} — source=${basename(video)}, ${captions.length} words, ~${totalSec.toFixed(1)}s`);
