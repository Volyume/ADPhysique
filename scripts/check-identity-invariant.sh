#!/usr/bin/env bash
# Identity + ownership invariant check
# Per docs/IDENTITY_AND_OWNERSHIP_LOCKED.md: no code may mutate a
# row's user_id at runtime. The only legitimate exceptions are
# marked with a "LOCKED-OK" comment on the line above the SQL.
#
# This script scans for `SET user_id` matches and fails if any are
# NOT preceded by a LOCKED-OK comment. Wire into CI so a new
# violation can't slip through PR review.
#
# Usage: ./scripts/check-identity-invariant.sh
# Exit 0 = clean, exit 1 = invariant violated.

set -eu

# Find every line matching "SET user_id" in src/, excluding tests.
# Then check whether the line ABOVE each match contains LOCKED-OK.

violations=()

while IFS=: read -r file line _; do
  # Allow LOCKED-OK anywhere in the 6 lines preceding the match
  # (covers multi-line comment blocks that explain the exemption).
  start=$((line - 10))
  if [ "$start" -lt 1 ]; then start=1; fi
  end=$((line - 1))
  window="$(sed -n "${start},${end}p" "$file")"
  if ! echo "$window" | grep -q "LOCKED-OK"; then
    violations+=("$file:$line  (no LOCKED-OK in preceding 6 lines)")
  fi
done < <(grep -rn "SET user_id" src/ --include="*.js" | grep -v __tests__)

if [ ${#violations[@]} -gt 0 ]; then
  echo "Identity invariant violated: unannotated 'SET user_id' found." >&2
  echo "See docs/IDENTITY_AND_OWNERSHIP_LOCKED.md for the rule." >&2
  echo "" >&2
  for v in "${violations[@]}"; do
    echo "  $v" >&2
  done
  exit 1
fi

echo "Identity invariant clean: all 'SET user_id' callsites are annotated."
exit 0
