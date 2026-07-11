#!/usr/bin/env bash
# scout.sh — Mode C: automated topic discovery (headless, for cron).
# Drafts <=5 briefs per run into topics/queue.json flagged `needs_approval`.
# Promotion to `pending` is MANUAL (scripts/promote.mjs) — unpromoted drafts can never
# enter production (make_video.sh and WORKFLOW step 1 only act on `pending`).
#
# Requires the `claude` CLI. Sources to search are configured below — edit SOURCES.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"; cd "$ROOT"
mkdir -p logs

HB_AGENT="scout-$$"
node scripts/heartbeat.mjs set --agent "$HB_AGENT" --pid "$$" --section scout --step "web search → draft briefs (needs_approval)" >/dev/null 2>&1 || true
trap 'node scripts/heartbeat.mjs clear --agent "$HB_AGENT" >/dev/null 2>&1 || true' EXIT

# Configure the beats the scout covers (v5: AI/LLM, bioscience, IT + adjacent).
SOURCES="AI/LLM research and vendor news; bioscience and clinical AI; IT and developer tooling"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
claude -p "You are the topic scout for this video factory (Mode C). Search the web for fresh, \
concrete developments in: ${SOURCES}. Draft AT MOST 5 topic briefs. For each: id 'scout-${TS}-N', \
status 'needs_approval', title (a hook-worthy angle, <=10 words), angle, 3 keyPoints (facts only, \
no invention — R10), cta, tone matching RULES.md ## Brand, and a one-line 'rationale' naming the \
source. Append them to the topics array in topics/queue.json (Edit the file; keep valid JSON). \
NEVER set any status other than 'needs_approval'. NEVER start production. Obey CLAUDE.md." \
  --allowedTools "WebSearch,WebFetch,Read,Edit,Grep,Glob" \
  --max-turns 40 2>&1 | tee "logs/scout_${TS}.log"
echo "scout: drafts appended (needs_approval). Promote with: node scripts/promote.mjs <id>"
