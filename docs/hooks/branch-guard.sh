#!/bin/bash

# VOLYUME BRANCH GUARD
# Blocks dangerous git operations on the main branch.
# Install: copy to docs/hooks/branch-guard.sh
# Make executable: chmod +x docs/hooks/branch-guard.sh
# Wire into Claude Code settings.json as a PreToolUse hook on Bash.

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ -z "$CURRENT_BRANCH" ]; then
  exit 0
fi

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('command',''))" 2>/dev/null)

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Block dangerous git operations on main
if [ "$CURRENT_BRANCH" = "main" ]; then
  if echo "$COMMAND" | grep -qE "git (commit|push|merge|rebase|reset|cherry-pick)"; then
    echo "BLOCKED: You are on the main branch. main is production and must not be modified directly." >&2
    echo "Switch to a feature branch or phase2/development before continuing." >&2
    echo "Current branch: $CURRENT_BRANCH" >&2
    exit 1
  fi
fi

# Block force push to any branch
if echo "$COMMAND" | grep -qE "git push.*--force|git push.*-f "; then
  echo "BLOCKED: Force push is not permitted." >&2
  echo "If you need to fix a pushed commit, ask the user first." >&2
  exit 1
fi

# Warn on production database commands
if echo "$COMMAND" | grep -qE "supabase db (push|reset|restore)"; then
  echo "WARNING: Supabase database command detected." >&2
  echo "Confirm this is NOT running against the production project." >&2
  echo "Production changes require explicit instruction containing 'run against production'." >&2
fi

exit 0
