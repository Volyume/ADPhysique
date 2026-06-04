# Deep Feature Audit — Item 31: Cardio History screen

**Document:** deep-audit-32-cardio-history.md
**Item:** 31 of master inventory (screen #29 — `CardioHistoryScreen`; cardio sessions by day, reached from the Progress tab)
**File:** `src/screens/CardioHistoryScreen.js` (131 lines), components `EmptyState`, libs `database` (`getRecentCardioLog`, `deleteCardioLog`), `dayKey` (`parseLocalDay`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added `accessibilityRole="button"` to the header back and the per-row delete, made the delete label row-specific (`Remove {activityName} session`), and corrected the stale docstring ("Plans" → "Progress"). Attribute + comment only; no behaviour, layout, or user-copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A reverse-chronological cardio log grouped by day (`SectionList`). Each row shows
the activity and "duration · intensity · ~kcal" (the estimate as feedback, not a
target), with a per-row soft-delete behind a confirm Alert. Empty state via the
shared `EmptyState`. Reached from the Progress tab's cardio card
(`AnalyticsScreen.js:131`).

### Findings
1. **Clean and correct.** Dates use `parseLocalDay` + `toLocaleDateString('en-GB',
   …)`, so sessions group and display by **UK local calendar day** — compliant
   with the locked timezone rule. Delete is a soft-delete that syncs, behind a
   confirm. Clean: **no dead styles, no em dashes, tokens throughout**, terse
   on-voice copy ("No cardio yet", "Sessions you log show up here.").
2. **A11y: labels present, roles missing, one ambiguous label.** The header back
   and the per-row delete each had an `accessibilityLabel` but no
   `accessibilityRole="button"`. The delete label was a generic "Remove session"
   on every row, so a screen-reader user could not tell which session they were
   about to delete.
3. **Stale docstring.** The header comment said "Reached from the Plans cardio
   card", but it is launched from the **Progress** tab, not Plans.

### Design assessment (values cited)
- On-system: uppercase `textSecondary` day headers with a `background` backing
  (sticky-header legibility), `textMuted` meta + trash glyph, tabular-nums on the
  numeric meta, scale tokens. The only row icon is the delete action (not
  decoration). No fingerprints.

### Flow / integration assessment
- `getRecentCardioLog(userId, 200)` returns newest-first; grouping into a `Map`
  preserves that order, so sections render reverse-chronological. Delete confirms,
  soft-deletes, and reloads. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- A per-row action button needs item context with the **verb first** ("Remove
  {activity} session", not a bare "Remove"); in a list of identical delete
  buttons an identifying name must be associated, or the user may act on the wrong
  row. This is the basis for the finding-2 label fix. [W3C APG; Harvard HUIT]

---

## STEP C — COMPARISON

### Where Volyume leads
- Local-day grouping, a soft-delete that syncs, and a clean one-line empty state.

### Where Volyume lags
- Control roles and the ambiguous per-row delete label (both fixed).

### Critical gaps
- None functional.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Header back.** `accessibilityRole="button"` (label "Back" already present).
   [A11y — Low]
2. **Per-row delete.** `accessibilityRole="button"` and a row-specific label
   `Remove ${item.activityName} session`, so each row's delete is distinguishable.
   [A11y — Low]
3. **Docstring.** Corrected "Plans" → "Progress". [Accuracy — trivial]

### COPY CHANGES
None to user-facing copy. The accessibility label and the comment are not shown
on screen.

### What to keep (with evidence)
- The day-grouped list, the soft-delete confirm, the empty state, and all user
  copy. [W3C APG]

### IMPACT / EFFORT
- **Impact: Low.** A11y polish; the row-specific delete label is the meaningful
  bit (it stops a screen-reader user deleting the wrong session).
- **Effort: Trivial.** Attribute-only plus a comment. eslint 0 problems; all
  CardioHistory screen-mount variants pass (incl. the a11y and rapid-tap fuzz).

### SOURCES
- W3C APG — Providing accessible names and descriptions:
  https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/
- Harvard HUIT — Accessible names for buttons:
  https://accessibility.huit.harvard.edu/technique-accessible-names-for-buttons
