#!/usr/bin/env bash
# validate_output.sh — probe a rendered video and grade the machine-checkable rules.
# Usage: scripts/validate_output.sh <video.mp4>
# Prints a JSON object with the probed values and PASS/FAIL for R1, R2, R3.
# Exit code: 0 if all checked rules pass, 1 otherwise.
set -euo pipefail

VIDEO="${1:?usage: validate_output.sh <video.mp4>}"

if [ ! -f "$VIDEO" ]; then
  echo "{\"error\":\"video not found: $VIDEO\"}" >&2
  exit 1
fi

PROBE="$(ffprobe -v error -show_format -show_streams -of json "$VIDEO")"

# --- Video stream facts ---
WIDTH="$(echo "$PROBE"  | jq -r '[.streams[]|select(.codec_type=="video")][0].width // empty')"
HEIGHT="$(echo "$PROBE" | jq -r '[.streams[]|select(.codec_type=="video")][0].height // empty')"
VCODEC="$(echo "$PROBE" | jq -r '[.streams[]|select(.codec_type=="video")][0].codec_name // empty')"
PIXFMT="$(echo "$PROBE" | jq -r '[.streams[]|select(.codec_type=="video")][0].pix_fmt // empty')"
RFR="$(echo "$PROBE"    | jq -r '[.streams[]|select(.codec_type=="video")][0].r_frame_rate // "0/1"')"
DURATION="$(echo "$PROBE" | jq -r '.format.duration // empty')"

# fps = numerator/denominator of r_frame_rate
FPS="$(awk -v r="$RFR" 'BEGIN{ n=split(r,a,"/"); if(n==2 && a[2]+0>0) printf "%.3f", a[1]/a[2]; else print "0" }')"

# --- Audio stream presence ---
HAS_AUDIO="$(echo "$PROBE" | jq -r 'if ([.streams[]|select(.codec_type=="audio")]|length) > 0 then "true" else "false" end')"
ACODEC="$(echo "$PROBE" | jq -r '[.streams[]|select(.codec_type=="audio")][0].codec_name // "none"')"

# --- Rule checks ---
FAILS=0
r1="FAIL"; r2="FAIL"; r3="FAIL"

# R1: 1080x1920, 30fps, H.264, yuv420p
IS30="$(awk -v f="$FPS" 'BEGIN{ print (f>=29.5 && f<=30.5)?"1":"0" }')"
if [ "$WIDTH" = "1080" ] && [ "$HEIGHT" = "1920" ] && [ "$IS30" = "1" ] \
   && { [ "$VCODEC" = "h264" ] || [ "$VCODEC" = "libx264" ]; } && [ "$PIXFMT" = "yuv420p" ]; then
  r1="PASS"; else FAILS=$((FAILS+1)); fi

# R2: duration 25–58s
IN_RANGE="$(awk -v d="${DURATION:-0}" 'BEGIN{ print (d>=25 && d<=58)?"1":"0" }')"
if [ "$IN_RANGE" = "1" ]; then r2="PASS"; else FAILS=$((FAILS+1)); fi

# R3: audio stream present (silence-gap check is done separately in the QA read step)
if [ "$HAS_AUDIO" = "true" ]; then r3="PASS"; else FAILS=$((FAILS+1)); fi

jq -n \
  --arg video "$VIDEO" \
  --arg width "$WIDTH" --arg height "$HEIGHT" --arg vcodec "$VCODEC" \
  --arg pixfmt "$PIXFMT" --arg fps "$FPS" --arg duration "${DURATION:-}" \
  --arg has_audio "$HAS_AUDIO" --arg acodec "$ACODEC" \
  --arg r1 "$r1" --arg r2 "$r2" --arg r3 "$r3" \
  '{
     video: $video,
     probed: {
       width: ($width|tonumber?), height: ($height|tonumber?),
       vcodec: $vcodec, pix_fmt: $pixfmt, fps: ($fps|tonumber?),
       duration_s: ($duration|tonumber?),
       has_audio: ($has_audio=="true"), acodec: $acodec
     },
     rules: { R1: $r1, R2: $r2, R3: $r3 }
   }'

if [ "$FAILS" -gt 0 ]; then
  exit 1
fi
