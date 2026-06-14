# PASS 1 — VERIFICATION ARTIFACT (for founder certification — producer does NOT self-certify)

I am not stamping PASS. These are the numbers and the reproduction commands so YOU can run the gate.
Authoritative located data = the pure mechanical extracts in `docs/ultimate-audit-2026-06-13/extract/`
(each file is ONLY grep output; row count = `wc -l` = source grep count, by construction; line numbers
are real grep line numbers and therefore cannot be approximate).

NOTE: the earlier in-doc appends (in pass1-section3-datamodel.md / pass1-sections-5to8.md) were layered
on top of partial content and double-counted under verification (CHECK lines also appear inside column
lines). They are SUPERSEDED by the extract/*.txt files below, which are clean and unambiguous.

## PER-SECTION VERIFICATION (source grep count == extract row count)

| Section | item | reproduce (source grep) | source count | extract file | extract wc -l | match |
|---|---|---|---|---|---|---|
| 3 | columns | `grep -rnE '^\s+[a-z_]+ +(UUID\|TEXT\|INTEGER\|INT\|NUMERIC\|BOOLEAN\|BOOL\|TIMESTAMP\|TIMESTAMPTZ\|DATE\|JSONB\|JSON\|SERIAL\|BIGINT\|REAL\|FLOAT\|SMALLINT)' supabase/` | 553 | extract/s3-columns.txt | 553 | ✓ equal |
| 3 | RLS policies | `grep -rniE 'create policy' supabase/` | 114 | extract/s3-rls.txt | 114 | ✓ equal |
| 3 | CHECK constraints | `grep -rnE 'CHECK ?\(' supabase/` | 135 | extract/s3-check.txt | 135 | ✓ equal |
| 6 | settings (SettingRow labels) | `grep -rnE 'label="' src/screens/Settings*.js src/screens/NotificationSettingsScreen.js` | 39 | extract/s6-settings.txt | 39 | ✓ equal |
| 7 | route registrations | `grep -nE '<(Stack\|Tab)\.Screen' src/navigation/RootNavigator.js` | 108 | extract/s7-routes.txt | 108 | ✓ equal |
| 8 | touch-targets | `grep -rnE 'hitSlop\|minHeight: ?4[48]\|minWidth: ?4[48]' src/components src/screens` | 189 | extract/s8-touch.txt | 189 | ✓ equal |

(The theme tokens in Section 8 — colours/spacing/radius/fontSize/fontWeight/lineHeight/letterSpacing —
are hand-located WITH values in pass1-sections-5to8.md at exact lines; they are short and individually
checkable. If you want those mechanically extracted too, say so and I'll add extract/s8-theme.txt.)

## ~ (BANNED APPROXIMATE LINE) CHECK
- Line citations with `~` (e.g. `:~38`): **0** across all pass1 docs and all extracts.
- The only `~` characters present are 4 lines INSIDE verbatim extracted code text (2 in s3-columns.txt,
  2 in s3-check.txt) — i.e. a `~` that genuinely appears in the SQL/comment content. Those are real file
  content at exact real line numbers, not approximate citations. (Reproduce: `grep -n '~' extract/*.txt`.)

## ROUTE COUNT RECONCILIATION (was flagged as 97 vs 108)
- `<Stack/Tab.Screen` registration tags = **108** (authoritative).
- `name="` total = 108. `.Screen name="` same-line = 97 — the 11 gap is registrations where `name="`
  wraps to the next line; the same-line pattern under-counts them. 108 is correct; the hand-typed
  Section-7 list (108) matches the mechanical extract.

## OPEN QUESTION CARRIED (do not guess)
- Q1 [schema authority]: setup_complete.sql (252 col lines) vs schema.sql (187) vs migrate_*.sql (114) —
  three column-defining sources; which is live is unresolved, logged in pass1-coverage-manifest.md
  Section-9 addendum with locations. Resolve by targeted check before any Pass-4 data-model blueprint.

## WHAT THIS ARTIFACT DOES AND DOESN'T CLAIM
- It claims: for sections 3 (columns/RLS/CHECK), 6, 7, 8 (touch-targets), every item is located at an
  exact, real, grep-sourced file:line; source count equals extract count; no approximate citations.
- It does NOT claim PASS. You certify. If any row above fails your check, it fails.
- The superseded false claim is on record: the prior "GATE Pass 1: PASS" + manifest self-audit were
  wrong (deferred locations, a `~`); this artifact replaces self-certification with your-certification.
