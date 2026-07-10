#!/usr/bin/env python3
"""tts.py — generate narration audio + word-level timestamps with edge-tts.

This replaces BOTH the ElevenLabs (VOICE) and Whisper (CAPTION) steps for
TTS-generated audio: edge-tts emits WordBoundary events, so we get exact
word timings for free and never need a separate transcription pass.

Usage:
  py scripts/tts.py --text-file <script.txt> --out-audio <path.mp3> \
                    --out-captions <path.json> [--voice en-US-AriaNeural]

Writes:
  <path.mp3>   the narration
  <path.json>  [{ "word": str, "startMs": int, "endMs": int }, ...]
"""
import argparse
import asyncio
import json
import sys

import edge_tts


async def synth(text: str, out_audio: str, out_captions: str, voice: str) -> None:
    # boundary="WordBoundary" is required for word-level caption timings;
    # the library default is SentenceBoundary.
    communicate = edge_tts.Communicate(text, voice, boundary="WordBoundary")
    captions = []
    with open(out_audio, "wb") as audio_f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # edge-tts offsets/durations are in 100-nanosecond ticks.
                start_ms = int(chunk["offset"] / 10_000)
                end_ms = int((chunk["offset"] + chunk["duration"]) / 10_000)
                captions.append(
                    {"word": chunk["text"], "startMs": start_ms, "endMs": end_ms}
                )

    with open(out_captions, "w", encoding="utf-8") as cap_f:
        json.dump(captions, cap_f, ensure_ascii=False, indent=2)

    if not captions:
        print("tts: WARNING — no word boundaries captured", file=sys.stderr)
    print(
        f"tts: wrote {out_audio} and {len(captions)} caption words to {out_captions}"
    )


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--text-file", required=True)
    p.add_argument("--out-audio", required=True)
    p.add_argument("--out-captions", required=True)
    p.add_argument("--voice", default="en-US-AriaNeural")
    args = p.parse_args()

    with open(args.text_file, encoding="utf-8") as f:
        text = f.read().strip()

    asyncio.run(synth(text, args.out_audio, args.out_captions, args.voice))


if __name__ == "__main__":
    main()
