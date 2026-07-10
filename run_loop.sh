#!/usr/bin/env bash
# run_loop.sh — headless production loop (agentic, v5).
# For N pending items, invoke Claude Code to execute WORKFLOW.md end-to-end (one item per
# invocation). The agent calls the real MCPs (remotion/descript/opusclip); the R15 gate and
# both caps live in WORKFLOW.md.
#
# Usage:  ./run_loop.sh [N]        (default N=1)
#
# Scheduling (pick one):
#   - Windows Task Scheduler:  bash "<repo>/run_loop.sh" 1   (nightly)
#   - cron (WSL/mac/linux):    0 3 * * *  cd <repo> && ./run_loop.sh 1
#   - scout (Mode C):          ./scripts/scout.sh on its own schedule
#   - consolidation:           ./scripts/consolidate.sh weekly or every ~10 videos
# --dangerously-skip-permissions belongs ONLY inside a sandbox/container.
#
# Deterministic alternative (no LLM, fallback/simulation adapters):
#   scripts/make_video.sh [--id <id>] [--format <fmt>]
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$SCRIPT_DIR"

N="${1:-1}"
mkdir -p logs

# Self-healing gate: never start a run on a broken toolchain.
bash scripts/preflight.sh || { echo "run_loop: preflight hard-failed — aborting"; exit 1; }

for i in $(seq 1 "$N"); do
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  LOG="logs/run_${TS}.log"
  echo "=== run $i/$N → $LOG ==="
  claude -p "Execute WORKFLOW.md for the next pending item. Obey CLAUDE.md and RULES.md. One item, then stop." \
    --allowedTools "Bash,Read,Write,Edit,Glob,Grep,mcp__remotion,mcp__descript,mcp__opusclip" \
    --max-turns 150 2>&1 | tee "$LOG"
done
