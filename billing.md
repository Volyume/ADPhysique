#!/bin/bash

# VOLYUME BILLING GUARD
# Blocks edits to billing-related files without explicit confirmation.
# This hook runs before every Write, Edit, or MultiEdit tool call.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('path', d.get('file_path', '')))" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Define billing-sensitive file patterns
BILLING_PATTERNS=(
  "src/billing"
  "src/services/billing"
  "src/hooks/usePurchases"
  "src/hooks/useEntitlements"
  "src/screens/Paywall"
  "src/screens/paywall"
  "revenuecat"
  "RevenueCat"
  "playBilling"
  "play-billing"
)

for PATTERN in "${BILLING_PATTERNS[@]}"; do
  if echo "$FILE_PATH" | grep -qi "$PATTERN"; then
    echo "BILLING FILE DETECTED: $FILE_PATH" >&2
    echo "" >&2
    echo "Billing files affect live payments for real users." >&2
    echo "Before editing this file you must:" >&2
    echo "  1. State exactly what change you are making" >&2
    echo "  2. State why it is necessary" >&2
    echo "  3. Confirm it will be tested in sandbox before production" >&2
    echo "  4. Wait for explicit 'proceed' from the user" >&2
    echo "" >&2
    echo "If you have already done this, the user should confirm 'proceed' to continue." >&2
    exit 1
  fi
done

exit 0
