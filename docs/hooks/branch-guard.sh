#!/bin/bash
# VOLYUME BRANCH GUARD
# Blocks dangerous git operations on main.
# Wire as a PreToolUse hook on Bash in Claude Code settings.

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
[ -z "$CURRENT_BRANCH" ] && exit 0

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)
[ -z "$COMMAND" ] && exit 0

if [ "$CURRENT_BRANCH" = "main" ]; then
  if echo "$COMMAND" | grep -qE "git (commit|push|merge|rebase|reset|cherry-pick)"; then
    echo "BLOCKED: Currently on main branch. main is production." >&2
    echo "Switch to a feature branch or phase2/development first." >&2
    exit 1
  fi
fi

if echo "$COMMAND" | grep -qE "git push.*(--force|-f)"; then
  echo "BLOCKED: Force push is not permitted." >&2
  exit 1
fi

if echo "$COMMAND" | grep -qE "supabase db (push|reset|restore)"; then
  echo "WARNING: Supabase database command detected." >&2
  echo "Confirm this is NOT the production project before continuing." >&2
fi

exit 0
