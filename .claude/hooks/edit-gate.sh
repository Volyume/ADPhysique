#!/usr/bin/env bash
# Edit-gate (founder rule 2026-06-13): code edits require a REAL spec file + a
# VERBATIM quote from it in .claude/edit-gate, grep-verified — so an edit can
# never come from memory, a made-up path, or a paraphrase.
input=$(cat)
fp=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
case "$fp" in
  */src/*|*/supabase/*) : ;;          # gated: app code
  *) exit 0 ;;                        # free: docs, .md, .claude, config
esac
root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
gate="$root/.claude/edit-gate"
if [ ! -s "$gate" ]; then
  echo "EDIT BLOCKED (founder rule): no spec gate. Write .claude/edit-gate -> line 1 = spec file path, lines 2+ = a VERBATIM quote from it that justifies this change. Read the source first." >&2
  exit 2
fi
spec="$(head -1 "$gate" | awk '{print $1}')"
specabs="$spec"; [ -f "$specabs" ] || specabs="$root/$spec"
if [ ! -f "$specabs" ]; then
  echo "EDIT BLOCKED: edit-gate line 1 cites '$spec' which is not a real file." >&2; exit 2
fi
qfound=0
while IFS= read -r line; do
  t=$(printf '%s' "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [ -z "$t" ] && continue
  if ! grep -Fq -- "$t" "$specabs"; then
    echo "EDIT BLOCKED: quote not in $spec verbatim -> '$t'. Paste REAL text from the actual file." >&2; exit 2
  fi
  qfound=1
done < <(tail -n +2 "$gate")
[ "$qfound" -eq 1 ] || { echo "EDIT BLOCKED: edit-gate needs a VERBATIM quote from $spec on line 2+." >&2; exit 2; }
exit 0
