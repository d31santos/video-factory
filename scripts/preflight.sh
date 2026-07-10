#!/usr/bin/env bash
# preflight.sh — self-healing gate run BEFORE every run. Checks the toolchain and
# dependency health, writes logs/preflight.json, and returns 0 even when optional
# services are down (the run degrades to a documented fallback rather than crashing).
# Exit non-zero ONLY when a hard requirement (node/ffmpeg/ffprobe/jq) is missing.
set -uo pipefail

export PATH="/c/Users/david/AppData/Local/pnpm:$PATH"
FFDIR="$(ls -d /c/Users/david/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg*/ffmpeg*/bin 2>/dev/null | head -1 || true)"
JQDIR="$(ls -d /c/Users/david/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq*/ 2>/dev/null | head -1 || true)"
[ -n "$FFDIR" ] && export PATH="$FFDIR:$PATH"
[ -n "$JQDIR" ] && export PATH="$JQDIR:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; cd "$ROOT"
mkdir -p logs

hard_fail=0
have() { command -v "$1" >/dev/null 2>&1; }

check() { # name  ok(0/1)  detail
  printf '  %-16s %s  %s\n' "$1" "$([ "$2" -eq 0 ] && echo OK || echo MISSING)" "$3"
}

echo "preflight:"
# --- Hard requirements ---
NODE_V="$(node -v 2>/dev/null || echo none)"
NODE_MAJ="$(echo "$NODE_V" | sed 's/^v\([0-9]*\).*/\1/')"
if have node && [ "${NODE_MAJ:-0}" -ge 20 ] 2>/dev/null; then check node 0 "$NODE_V"; else check node 1 "need >=20 (got $NODE_V)"; hard_fail=1; fi
if have ffmpeg;  then check ffmpeg 0 "";  else check ffmpeg 1 "install ffmpeg";  hard_fail=1; fi
if have ffprobe; then check ffprobe 0 ""; else check ffprobe 1 "install ffmpeg"; hard_fail=1; fi
if have jq;      then check jq 0 "";      else check jq 1 "install jq";          hard_fail=1; fi

# --- Voice fallback (edge-tts via py) ---
PYOK=1; (have py || have python) && PYOK=0
check python "$PYOK" "$([ "$PYOK" -eq 0 ] && echo 'edge-tts fallback available' || echo 'no py — voice fallback down')"

# --- Optional services (never hard-fail) ---
DESCRIPT="fallback"; [ -n "${DESCRIPT_API_TOKEN:-}" ] && DESCRIPT="token-present"
printf '  %-16s %s  %s\n' "descript" "$([ "$DESCRIPT" = token-present ] && echo LIVE || echo FALLBACK)" "edge-tts if no token; MCP verified at agent runtime"
printf '  %-16s %s  %s\n' "opusclip" "SIMULATION" "OAuth MCP (agentic only); deterministic path simulates + never publishes"

# --- Disk space on the working drive ---
DISK_KB="$(df -Pk . 2>/dev/null | awk 'NR==2{print $4}')"
DISK_GB="$(awk -v k="${DISK_KB:-0}" 'BEGIN{printf "%.1f", k/1048576}')"
DISK_OK=0; awk -v k="${DISK_KB:-0}" 'BEGIN{exit !(k>1048576)}' || DISK_OK=1  # need >1GB
check disk "$DISK_OK" "${DISK_GB}GB free"
[ "$DISK_OK" -ne 0 ] && hard_fail=1

# --- Write machine-readable summary ---
jq -n --arg node "$NODE_V" --arg descript "$DESCRIPT" --arg disk "$DISK_GB" \
  --argjson pyok "$([ "$PYOK" -eq 0 ] && echo true || echo false)" \
  --argjson hardfail "$([ "$hard_fail" -eq 0 ] && echo false || echo true)" \
  '{ts:(now|todate), node:$node, python_ok:$pyok, descript:$descript,
    opusclip:"simulation", disk_gb:($disk|tonumber), hard_fail:$hardfail}' \
  > logs/preflight.json 2>/dev/null || true

if [ "$hard_fail" -ne 0 ]; then
  echo "preflight: HARD FAIL — fix the MISSING items above before running." >&2
  exit 1
fi
echo "preflight: OK (degraded services use documented fallbacks)"
