#!/usr/bin/env bash
# beforeShellExecution: allow routine project/worktree operations and ask when
# commands target paths outside the project, sibling pipeline worktrees, or mutate
# dependencies/system state.

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

CMD="$(printf '%s' "$INPUT" | jq -r '.command // empty')"
if [[ -z "$CMD" ]]; then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
PROJECT_PARENT="$(cd "$PROJECT_ROOT/.." && pwd)"
PROJECT_BASENAME="$(basename "$PROJECT_ROOT")"
SIBLING_PREFIX="${AGENT_HARNESS_WORKTREE_PREFIX:-$PROJECT_BASENAME-}"
WORKING_DIR="$(printf '%s' "$INPUT" | jq -r '.working_directory // empty')"

IN_SAFE_CONTEXT=0
if [[ -z "$WORKING_DIR" ]]; then
  IN_SAFE_CONTEXT=1
else
  case "$WORKING_DIR" in
    "$PROJECT_ROOT"|"$PROJECT_ROOT"/*) IN_SAFE_CONTEXT=1 ;;
    "$PROJECT_PARENT"/${SIBLING_PREFIX}*) IN_SAFE_CONTEXT=1 ;;
  esac
fi

DESTRUCTIVE_RE='(^|[[:space:]&;|`(])(rm|rmdir|unlink|mv|cp|dd|mkfs|chmod|chown|chgrp|ln|shred|truncate|tee|sudo|pkill|kill|launchctl)([[:space:]]|$)'
REDIRECT_WRITE_RE='(>|>>)[[:space:]]*(/|~)'
SYSTEM_PM_RE='(^|[[:space:]&;|`(])(brew|apt|apt-get|dnf|yum|port|pipx|gem)[[:space:]]+(install|add|remove|uninstall|upgrade|update|link|unlink)([[:space:]]|$)'
SUDO_RE='(^|[[:space:]&;|`(])sudo([[:space:]]|$)'
JS_PKG_MUTATE_RE='(^|[[:space:]&;|`(])(npm|pnpm|yarn|bun)[[:space:]]+(add|remove|uninstall|upgrade|update|link|unlink)([[:space:]]|$)'
JS_INSTALL_PKG_RE='(^|[[:space:]&;|`(])(npm|pnpm|yarn|bun)[[:space:]]+(install|i)[[:space:]]+[^[:space:]-][^[:space:]]*'
PY_RUST_INSTALL_RE='(^|[[:space:]&;|`(])(pip|pip3|cargo)[[:space:]]+(install|add|uninstall|remove|upgrade)([[:space:]]|$)'
GIT_CMD_RE='(^|[[:space:]&;|`(])git([[:space:]]|$)'
TASK_CMD_RE='(^|[[:space:]&;|`(])((bun|npm|pnpm|yarn)[[:space:]]+(run[[:space:]]|(test|lint|build|typecheck|tsc|format|check)([[:space:]]|$))|(vitest|jest|playwright|tsc|eslint|prettier|biome|python3?|node|go|cargo)([[:space:]]|$))'

ask() {
  jq -nc --arg msg "$1" --arg note "$2" '{permission:"ask", user_message:$msg, agent_message:$note}'
}

if printf '%s' " $CMD " | grep -E -q "$SYSTEM_PM_RE"; then
  ask "System package-manager command: $(printf '%s' "$CMD" | head -c 200). Approve?" "agent-harness flagged a system-level package-manager mutation."
  exit 0
fi

if printf '%s' " $CMD " | grep -E -q "$SUDO_RE"; then
  ask "Privileged command: $(printf '%s' "$CMD" | head -c 200). Approve?" "agent-harness flagged sudo, which escapes project scope."
  exit 0
fi

if printf '%s' " $CMD " | grep -E -q "$JS_PKG_MUTATE_RE" \
  || printf '%s' " $CMD " | grep -E -q "$JS_INSTALL_PKG_RE" \
  || printf '%s' " $CMD " | grep -E -q "$PY_RUST_INSTALL_RE"; then
  ask "Dependency mutation: $(printf '%s' "$CMD" | head -c 200). Approve?" "agent-harness flagged a dependency add/remove/update. Lockfile bootstrap installs without package args are allowed."
  exit 0
fi

GIT_FAST_PATH=0
TASK_FAST_PATH=0
if printf '%s' " $CMD " | grep -E -q "$GIT_CMD_RE"; then GIT_FAST_PATH=1; fi
if printf '%s' " $CMD " | grep -E -q "$TASK_CMD_RE"; then TASK_FAST_PATH=1; fi

if (( TASK_FAST_PATH == 1 )) && ! printf '%s' "$CMD" | grep -E -q "$REDIRECT_WRITE_RE"; then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

if (( GIT_FAST_PATH == 1 && IN_SAFE_CONTEXT == 1 )) && ! printf '%s' "$CMD" | grep -E -q "$REDIRECT_WRITE_RE"; then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

NEEDS_CHECK=0
if (( GIT_FAST_PATH == 0 && TASK_FAST_PATH == 0 )); then
  if printf '%s' " $CMD " | grep -E -q "$DESTRUCTIVE_RE"; then NEEDS_CHECK=1; fi
fi
if printf '%s' "$CMD" | grep -E -q "$REDIRECT_WRITE_RE"; then NEEDS_CHECK=1; fi
if (( GIT_FAST_PATH == 1 && IN_SAFE_CONTEXT == 0 )); then NEEDS_CHECK=1; fi

if (( NEEDS_CHECK == 0 )); then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

declare -a OUT_OF_SCOPE=()
while IFS= read -r raw || [[ -n "$raw" ]]; do
  [[ -z "$raw" ]] && continue
  token="${raw%\"}"; token="${token#\"}"
  token="${token%\'}"; token="${token#\'}"
  case "$token" in --*=*) token="${token#*=}" ;; esac
  case "$token" in
    "~"|"~/"*) expanded="${HOME}${token:1}" ;;
    /*) expanded="$token" ;;
    *) continue ;;
  esac
  expanded="${expanded%/}"
  [[ -z "$expanded" ]] && expanded="/"
  case "$expanded" in
    /tmp|/tmp/*|/var/tmp|/var/tmp/*|/private/tmp|/private/tmp/*|/private/var/tmp|/private/var/tmp/*|/var/folders/*|/dev/null|/dev/stdout|/dev/stderr|/dev/fd/*) continue ;;
    "$PROJECT_ROOT"|"$PROJECT_ROOT"/*) continue ;;
    "$PROJECT_PARENT"/${SIBLING_PREFIX}*) continue ;;
  esac
  OUT_OF_SCOPE+=("$expanded")
done < <(printf '%s' "$CMD" | tr '\n\t' '  ' | tr ' ' '\n')

if (( ${#OUT_OF_SCOPE[@]} == 0 )); then
  printf '%s\n' "$ALLOW_JSON"
  exit 0
fi

joined="$(printf '%s\n' "${OUT_OF_SCOPE[@]}" | awk '!seen[$0]++' | head -n 6 | paste -sd ', ' -)"
ask "Out-of-project filesystem operation. Targets: $joined. Approve?" "agent-harness flagged paths outside $PROJECT_ROOT and sibling ${SIBLING_PREFIX}* worktrees."
exit 0
