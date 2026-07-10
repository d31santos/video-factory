#!/usr/bin/env bash
# extract_frames.sh — pull QA frames from a rendered video.
# Usage: scripts/extract_frames.sh <video.mp4> <id>
# Output: qa/<id>/frame_XXX.png (one every 2s) + qa/<id>/frame_last.png
# Frames are 540px wide (half of 1080) to keep them light for reading.
set -euo pipefail

VIDEO="${1:?usage: extract_frames.sh <video.mp4> <id>}"
ID="${2:?usage: extract_frames.sh <video.mp4> <id>}"

if [ ! -f "$VIDEO" ]; then
  echo "extract_frames: video not found: $VIDEO" >&2
  exit 1
fi

OUTDIR="qa/${ID}"
mkdir -p "$OUTDIR"

# Clear any stale frames from a previous iteration.
rm -f "$OUTDIR"/frame_*.png

# One frame every 2 seconds (fps=1/2), scaled to 540px wide, numbered from 1.
ffmpeg -hide_banner -loglevel error -y \
  -i "$VIDEO" \
  -vf "fps=1/2,scale=540:-1" \
  -start_number 1 \
  "$OUTDIR/frame_%03d.png"

# Grab the very last frame explicitly (CTA end card lives here — R6).
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$VIDEO")"
# seek a hair before the end so we land on a real frame
LAST_TS="$(awk -v d="$DUR" 'BEGIN{ t=d-0.1; if (t<0) t=0; printf "%.3f", t }')"
ffmpeg -hide_banner -loglevel error -y \
  -ss "$LAST_TS" -i "$VIDEO" \
  -frames:v 1 -vf "scale=540:-1" \
  "$OUTDIR/frame_last.png"

COUNT="$(ls -1 "$OUTDIR"/frame_*.png 2>/dev/null | wc -l | tr -d ' ')"
echo "extract_frames: wrote $COUNT frame(s) to $OUTDIR/ (duration ${DUR}s)"
