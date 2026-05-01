#!/usr/bin/env bash
# preToolUse: allow file mutation tools inside the project or sibling pipeline
# worktrees. Ask when a tool targets paths outside that scope.

set -o pipefail

ALLOW_JSON='{"permission":"allow"}'

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

INPUT="$(cat)" || {
  printf '%s\n' "$ALLOW_JSON"
  exit 0
}

PATHS="$(printf '%s' "$INPUT" | jq -r '
  ( .tool_input // {} ) as $i
  | [ $i.path, $i.file_path, $i.target_notebook, $i.notebook_path, $i.target_file ]
  | map(select(type == "string" and length > 0))
  | .[]
' 2>/dev/null)"

if [[ -z "$PATHS" ]]; then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
PROJECT_PARENT="$(cd "$PROJECT_ROOT/.." && pwd)"
PROJECT_BASENAME="$(basename "$PROJECT_ROOT")"
SIBLING_PREFIX="${AGENT_HARNESS_WORKTREE_PREFIX:-$PROJECT_BASENAME-}"

declare -a OUT_OF_SCOPE=()
while IFS= read -r p || [[ -n "$p" ]]; do
  [[ -z "$p" ]] && continue
  case "$p" in
    "~"|"~/"*) expanded="${HOME}${p:1}" ;;
    /*) expanded="$p" ;;
    *) expanded="$PROJECT_ROOT/$p" ;;
  esac
  expanded="${expanded%/}"
  [[ -z "$expanded" ]] && expanded="/"
  case "$expanded" in
    "$PROJECT_ROOT"|"$PROJECT_ROOT"/*) continue ;;
    "$PROJECT_PARENT"/${SIBLING_PREFIX}*) continue ;;
    /tmp|/tmp/*|/var/tmp|/var/tmp/*|/private/tmp|/private/tmp/*|/private/var/tmp|/private/var/tmp/*|/var/folders/*) continue ;;
  esac
  OUT_OF_SCOPE+=("$expanded")
done <<< "$PATHS"

if (( ${#OUT_OF_SCOPE[@]} == 0 )); then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

joined="$(printf '%s\n' "${OUT_OF_SCOPE[@]}" | awk '!seen[$0]++' | head -n 6 | paste -sd ', ' -)"
jq -nc \
  --arg msg "Out-of-project file mutation. Targets: $joined. Approve?" \
  --arg note "agent-harness flagged a file mutation outside $PROJECT_ROOT and sibling ${SIBLING_PREFIX}* worktrees." \
  '{permission:"ask", user_message:$msg, agent_message:$note}'
exit 0
