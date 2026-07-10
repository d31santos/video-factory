// descript_adapter.mjs — the audio/text layer (WORKFLOW steps 6–7), with a fallback.
//
// v5 intent: Descript carries voice + transcript + cleanup, and captions (R7) come from
// the Descript transcript of the cleaned audio (audio-first, Figure 4). Descript is an MCP,
// which only the AGENT can call — so this deterministic adapter always uses the documented
// FALLBACK (edge-tts voice + edge-tts WordBoundary as the transcript/timings) and records
// that clearly in qa/<id>/descript.md. The agentic path (run_loop.sh → claude -p) performs
// the real Descript MCP calls per WORKFLOW.md §Descript details.
//
// Usage:
//   node scripts/descript_adapter.mjs --id <id> --script <txt> \
//        --out-audio <public/audio/<id>.mp3> --out-captions <qa/<id>-captions.json> \
//        --descript-md <qa/<id>/descript.md> [--mode voice|caption-led] [--voice en-US-AriaNeural]
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const id = args.id;
const mode = args.mode ?? "voice";
const voice = args.voice ?? "en-US-AriaNeural";
const outAudio = args["out-audio"];
const outCaptions = args["out-captions"];
const descriptMd = args["descript-md"];
if (!id || !outCaptions || !descriptMd) {
  console.error("usage: descript_adapter.mjs --id <id> --script <txt> --out-audio <mp3> --out-captions <json> --descript-md <md> [--mode] [--voice]");
  process.exit(1);
}

const PYTHON = process.env.PYTHON || "py";
const hasToken = Boolean(process.env.DESCRIPT_API_TOKEN);
mkdirSync(dirname(descriptMd), { recursive: true });

function writeDescriptMd({ status, body }) {
  writeFileSync(
    descriptMd,
    `# Descript — ${id}\n\n## Status: ${status}\n\n${body}\n`
  );
}

if (mode === "caption-led") {
  // No voiceover; captions must be authored/timed elsewhere. Nothing to synth.
  writeDescriptMd({
    status: "CAPTION-LED (no voiceover)",
    body:
      "- No narration for this item (caption-led + music).\n" +
      "- R13: satisfied via documented reason (no audio to polish).\n" +
      "- R7 captions must be supplied with explicit timings in the brief.",
  });
  console.log("descript_adapter: caption-led — no audio generated");
  process.exit(0);
}

if (!args.script || !existsSync(args.script)) {
  console.error(`descript_adapter: missing --script file: ${args.script}`);
  process.exit(1);
}

// FALLBACK path: edge-tts voice + WordBoundary transcript (via scripts/tts.py).
const r = spawnSync(
  PYTHON,
  ["scripts/tts.py", "--text-file", args.script, "--out-audio", outAudio,
   "--out-captions", outCaptions, "--voice", voice],
  { stdio: "inherit" }
);
if (r.status !== 0) {
  writeDescriptMd({
    status: "FALLBACK FAILED",
    body: "- edge-tts voice/transcript generation failed. Item should be deferred (see preflight/failures.jsonl).",
  });
  process.exit(1);
}

writeDescriptMd({
  status: "FALLBACK (edge-tts) — R13 satisfied via documented reason",
  body:
    `- Voice: edge-tts (${voice}) — Descript AI voice not used in the deterministic path.\n` +
    "- Transcript/caption timings (R7): edge-tts `WordBoundary` events — the fallback caption source.\n" +
    (hasToken
      ? "- DESCRIPT_API_TOKEN is present: the agentic path (run_loop.sh) should instead call the Descript MCP\n" +
        "  (import_media → run_agent cleanup → get_job transcript) and record the real transcript path here.\n"
      : "- DESCRIPT_API_TOKEN not set: real Descript voice/cleanup deferred until the token is provided.\n") +
    "- R14: N/A in fallback (no separate polished cut; original render stands).\n" +
    "- Cleanup instruction for the real path: \"Remove filler words and awkward silences. " +
    "Improve audio quality. Do not cut any sentence content.\"",
});
console.log(`descript_adapter: fallback voice+transcript done for ${id}`);
