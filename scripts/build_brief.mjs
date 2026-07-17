// build_brief.mjs — assemble a render-ready brief (VideoProps) for one topic.
// Merges Whisper/edge-tts captions, sizes storyboard scenes to fill the
// narration, and writes topics/active/<id>.json (consumed via `remotion render --props`).
//
// Usage:
//   node scripts/build_brief.mjs --id <id> --captions <captions.json> \
//        --audio <audioPathUnderPublic> --out <brief.json>
import { readFileSync, writeFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const id = args.id;
const captionsPath = args.captions;
const audioSrc = args.audio; // e.g. "audio/demo-001.mp3" (relative to public/)
const outPath = args.out;
const format = args.format ?? "vertical"; // landscape | vertical | square
const hookOverride = args.hook ?? null;   // improve-loop revisions pass a new hook here
if (!id || !captionsPath || !audioSrc || !outPath) {
  console.error(
    "usage: build_brief.mjs --id <id> --captions <json> --audio <path> --out <json> [--format] [--hook]"
  );
  process.exit(1);
}

const queue = JSON.parse(readFileSync("topics/queue.json", "utf8"));
const topic = queue.topics.find((t) => t.id === id);
if (!topic) {
  console.error(`build_brief: topic ${id} not found in queue`);
  process.exit(1);
}

const captions = JSON.parse(readFileSync(captionsPath, "utf8"));
if (captions.length === 0) {
  console.error("build_brief: captions are empty — cannot size the video");
  process.exit(1);
}

const lastMs = Math.max(...captions.map((c) => c.endMs));
// Small tail (0.6s) so the last word isn't clipped, while keeping trailing
// silence under the R3 limit of 1.5s (the mp3 has its own ~0.9s tail silence).
const totalSec = Number((lastMs / 1000 + 0.6).toFixed(2));

// Clinic of AI brand — MUST mirror src/schema.ts defaultBrand (RULES.md ## Brand).
const brand = {
  bg: "#fff8f3",
  text: "#000000",
  accent1: "#a14000",
  accent2: "#000000",
  captionBackdrop: "rgba(255,255,255,0.88)",
  fontFamily:
    '"Helvetica Neue", Helvetica, "Neue Haas Grotesk Text", Arial, sans-serif',
};

// Storyboard: an intro card (title) + one card per key point. Sized to fill
// the narration evenly so there is no bare tail (keeps R5 holding).
const sceneTexts = [topic.title, ...(topic.keyPoints ?? [])];
// Scene surfaces = the site's accent surfaces (mint/peach/sky/lilac/blush).
const palette = ["#dde8dc", "#fde4d0", "#dce8ee", "#e3dceb", "#fcd6cf"];
const per = totalSec / sceneTexts.length;
const scenes = sceneTexts.map((text, i) => ({
  text,
  visual: palette[i % palette.length],
  durationSec: Number(per.toFixed(2)),
}));

const brief = {
  mode: "B",
  hook: hookOverride ?? topic.title,
  scenes,
  cta: topic.cta ?? "Follow for more",
  captions,
  audioSrc,
  brand,
  format,
  assetLog: [{ file: audioSrc, provenance: "edge-tts (fallback voice+transcript)" }],
};

writeFileSync(outPath, JSON.stringify(brief, null, 2));
console.log(
  `build_brief: wrote ${outPath} — ${scenes.length} scenes, ${captions.length} words, ~${totalSec}s, format=${format}`
);
