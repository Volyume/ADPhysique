#!/bin/bash
# VOLYUME BILLING GUARD
# Blocks edits to billing files without prior confirmation.
# Wire as a PreToolUse hook on Write/Edit in Claude Code settings.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('path', d.get('file_path', '')))" 2>/dev/null)
[ -z "$FILE_PATH" ] && exit 0

BILLING_PATTERNS=("src/billing" "src/services/billing" "src/hooks/usePurchases" "src/hooks/useEntitlements" "src/screens/Paywall" "src/screens/paywall" "iap" "IAP" "purchase" "Purchase")

for PATTERN in "${BILLING_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -q "$PATTERN"; then
    echo "BILLING FILE DETECTED: $FILE_PATH" >&2
    echo "Before editing this file you must have already:" >&2
    echo "  1. Stated what change you are making and why" >&2
    echo "  2. Received explicit 'proceed' from the user" >&2
    echo "If you have done this, the user needs to confirm 'proceed' to continue." >&2
    exit 1
  fi
done

exit 0
