#!/usr/bin/env bash
# run_loop.sh — headless production loop (agentic).
# For N pending topics, invoke Claude Code to execute WORKFLOW.md end-to-end,
# one video per invocation. Logs each run under logs/.
#
# Usage:  ./run_loop.sh [N]        (default N=1)
#
# Requires the `claude` CLI on PATH. For a nested/unattended run you may add
# --dangerously-skip-permissions, but ONLY inside a sandbox/container.
#
# Prefer this for the creative SCRIPT step (Claude writes the VO per topic).
# For a purely mechanical run when the VO already exists as assets/audio/<id>.txt,
# use scripts/make_video.sh instead (no LLM needed).
set -euo pipefail

N="${1:-1}"
mkdir -p logs

for i in $(seq 1 "$N"); do
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  LOG="logs/run_${TS}.log"
  echo "=== run $i/$N → $LOG ==="
  claude -p "Execute WORKFLOW.md end-to-end for the next pending topic. Obey CLAUDE.md and RULES.md. One video, then stop." \
    --allowedTools "Bash,Read,Write,Edit,Glob,Grep,mcp__remotion,mcp__descript,mcp__elevenlabs" \
    --max-turns 120 2>&1 | tee "$LOG"
done
