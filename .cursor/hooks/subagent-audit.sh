#!/usr/bin/env bash
# subagentStart: log subagent launches for local audit/debugging. Never blocks.

set -o pipefail

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$HOOK_DIR/subagent-audit.ndjson"

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' '{"permission":"allow"}'
  exit 0
fi

INPUT="$(cat)" || {
  printf '%s\n' '{"permission":"allow"}'
  exit 0
}

line="$(printf '%s' "$INPUT" | jq -c --arg event "subagentStart" '. + {hook_event:$event, recorded_at:(now|todate)}' 2>/dev/null)" || line=""
if [[ -n "$line" ]]; then
  printf '%s\n' "$line" >>"$LOG_FILE" 2>/dev/null || true
fi

printf '%s\n' '{"permission":"allow"}'
exit 0
