#!/usr/bin/env bash
# consolidate.sh — self-learning consolidation (weekly or every N videos).
# Mines qa/*/retro.md, logs/failures.jsonl, logs/metrics.jsonl and production.log, then writes
# a PROPOSAL to proposals/ flagged needs_approval. It NEVER edits RULES.md / WORKFLOW.md /
# CLAUDE.md / HEURISTICS.md / thresholds directly — a human promotes proposals.
#
# In the agentic path this is a headless `claude -p` prompt that reads the same inputs and
# proposes concrete diffs. This deterministic version produces a data summary + a proposal stub
# so the gate and file plumbing are demonstrable without an LLM.
set -uo pipefail
export PATH="/c/Users/david/AppData/Local/pnpm:$(ls -d /c/Users/david/AppData/Local/Microsoft/WinGet/Packages/jqlang.jq*/ 2>/dev/null | head -1):$PATH"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; cd "$ROOT"
mkdir -p proposals

HB_AGENT="consolidate-$$"
node scripts/heartbeat.mjs set --agent "$HB_AGENT" --pid "$$" --section consolidate --step "mining retros/metrics → proposal" >/dev/null 2>&1 || true
trap 'rc=$?; s=finished; [ $rc -ne 0 ] && s=failed; node scripts/heartbeat.mjs clear --agent "$HB_AGENT" --status "$s" --note "exit $rc" >/dev/null 2>&1 || true' EXIT

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="proposals/consolidation_${STAMP}.md"

METRIC_LINES=0; [ -f logs/metrics.jsonl ] && METRIC_LINES="$(wc -l < logs/metrics.jsonl | tr -d ' ')"
FAIL_LINES=0;   [ -f logs/failures.jsonl ] && FAIL_LINES="$(wc -l < logs/failures.jsonl | tr -d ' ')"
RETRO_COUNT="$(ls qa/*/retro.md 2>/dev/null | wc -l | tr -d ' ')"

# Aggregate metrics (avg best score, avg enforce iterations, publish rate).
AVG_BEST="n/a"; AVG_ITERS="n/a"; PUB_RATE="n/a"
if [ "$METRIC_LINES" -gt 0 ] && command -v jq >/dev/null 2>&1; then
  AVG_BEST="$(jq -s 'map(.best_score//empty) | if length>0 then (add/length|.*10|round/10) else "n/a" end' logs/metrics.jsonl)"
  AVG_ITERS="$(jq -s 'map(.enforce_iterations//empty) | if length>0 then (add/length|.*10|round/10) else "n/a" end' logs/metrics.jsonl)"
  PUB_RATE="$(jq -s 'map(select(.published!=null)) | if length>0 then ((map(select(.published==true))|length)/length*100|round) else "n/a" end' logs/metrics.jsonl)"
fi

# Top recurring failure symptoms.
TOP_FAILS="(none)"
if [ "$FAIL_LINES" -gt 0 ] && command -v jq >/dev/null 2>&1; then
  TOP_FAILS="$(jq -r '.rule // .symptom // "unknown"' logs/failures.jsonl | sort | uniq -c | sort -rn | head -5 | sed 's/^/    /')"
fi

cat > "$OUT" <<EOF
# Consolidation proposal — ${STAMP}   [needs_approval]

> Auto-generated. The loop PROPOSES; a human promotes. Applying is manual: review, then edit
> HEURISTICS.md / PLAYBOOK.md / the WORKFLOW threshold yourself. Never auto-applied.

## Inputs mined
- retros: ${RETRO_COUNT}   metrics rows: ${METRIC_LINES}   failure rows: ${FAIL_LINES}

## Aggregate signal
- avg best virality score: ${AVG_BEST}
- avg enforce iterations to pass: ${AVG_ITERS}
- publish rate: ${PUB_RATE}%

## Recurring failures (rule/symptom × count)
${TOP_FAILS}

## Proposed actions (review before applying)
- If avg best score is comfortably above the threshold across recent videos → consider RAISING
  PUBLISH_THRESHOLD in WORKFLOW.md (start strict, tighten with evidence).
- If a failure rule recurs → add/confirm a PLAYBOOK.md entry and a by-construction guard.
- If specific hook/pacing styles correlate with higher scores in retros → promote them into
  HEURISTICS.md.

_No files were modified by this script._
EOF

echo "consolidate: wrote $OUT (needs_approval)"
