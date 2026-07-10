#!/usr/bin/env bash
# stop_hook.sh — Claude Code Stop hook.
# Blocks finishing a run unless every active topic has a QA report with no FAIL.
# Exit 2 = block (stderr is shown to the agent). Exit 0 = allow stop.
#
# "Active" = any topics/active/<id>.json present. For each we require
# qa/<id>/report.md to exist and contain zero "FAIL" tokens.
# If a run was deliberately blocked, qa/<id>/BLOCKED.md is treated as a
# terminal state and does not keep the agent stuck.
set -uo pipefail

# Resolve repo root as the parent of this script's dir, so the hook works
# regardless of the cwd Claude invokes it from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

shopt -s nullglob
ACTIVE=(topics/active/*.json)

# No active topic → nothing to gate; allow stop.
if [ ${#ACTIVE[@]} -eq 0 ]; then
  exit 0
fi

PROBLEMS=""
for f in "${ACTIVE[@]}"; do
  id="$(basename "$f" .json)"
  report="qa/${id}/report.md"
  blocked="qa/${id}/BLOCKED.md"

  if [ -f "$blocked" ]; then
    # Terminal blocked state — allow stop for this id.
    continue
  fi
  if [ ! -f "$report" ]; then
    PROBLEMS="${PROBLEMS}\n - [$id] missing $report"
    continue
  fi
  if grep -q "FAIL" "$report"; then
    PROBLEMS="${PROBLEMS}\n - [$id] $report still contains FAIL"
  fi
done

if [ -n "$PROBLEMS" ]; then
  printf 'Stop blocked by QA gate. Finish WORKFLOW.md step 6 before stopping:%b\n' "$PROBLEMS" >&2
  exit 2
fi

exit 0
