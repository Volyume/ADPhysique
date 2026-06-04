# Deep Feature Audit — Item 45: Coaching History (held decisions) screen

**Document:** deep-audit-46-coach-held-history.md
**Item:** 45 of master inventory (screen #45 — `CoachHeldHistoryScreen`; coaching history, held decisions)
**File:** `src/screens/CoachHeldHistoryScreen.js` (260 → 257 lines), components `BackHeader`, `EngineLog`, `SkeletonCard`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Marked the per-week labels as headers, made each decision row a single accessible element with a composed label that announces its type (so "held" is not icon/colour-only), and removed the dead `emptyText` style. No behaviour or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
A read-only history of the coach's weekly decisions: per-week blocks of "changed"
rows (calorie / volume / steps / deload, success icon) and "held" rows (a muted
pause icon + the reason), plus the `EngineLog`, an empty state, and a
decision-count footer.

### Findings
1. **Transparent and clean.** "Here's what the coach did, and why" is a good trust
   surface. Dates use local components, copy is plain ("Some things change, some
   things stay the same."), **no em dashes**. The only control is the
   already-accessible `BackHeader`.
2. **1 dead style** (`emptyText`, verified — the empty state uses
   `emptyCard`/`emptyTitle`/`emptyBody`; `styles.emptyText` has 0 refs).
3. **A11y.** The week labels were not headings, and the **"held" rows conveyed
   their status by icon + colour only** (their `label` is `null`), so a screen
   reader heard only the reason, not that it was held (WCAG 1.4.1).

### Design assessment (values cited)
- On-system: `surface` week blocks, `success` icon for changes, `textMuted` pause
  icon for holds, scale tokens. The changed rows pair the colour with a text
  label; the held rows did not (fixed via the accessible label). No fingerprints.

### Flow / integration assessment
- Loads `getCoachOutputHistory`, filters to weeks with a change or a hold, builds
  decision rows, renders week blocks + the EngineLog. Read-only. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- WCAG 1.4.1: don't convey status by **colour alone**; pair status icons with a
  text alternative. This is the basis for announcing "Held" on those rows. [W3C SC
  1.4.1; Section508]

---

## STEP C — COMPARISON

### Where Volyume leads
- A transparent decisions-and-holds history with the reason for each.

### Where Volyume lags
- One dead style, no heading nav, held-status icon/colour-only (all fixed).

### Critical gaps
- None.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Remove the dead `emptyText` style.** [Cleanup — Low]
2. **Week labels** → `accessibilityRole="header"`. [A11y — Low]
3. **Decision rows** → `accessible` + a composed label that names the type (held
   rows announce "Held", changed rows lead with their label), so the held/changed
   status is not icon/colour-only. [A11y — Low, WCAG 1.4.1]

### COPY CHANGES
None.

### What to keep (with evidence)
- The week blocks, the EngineLog, the empty state, and all copy. [W3C SC 1.4.1]

### IMPACT / EFFORT
- **Impact: Low.** Cleanup + a WCAG 1.4.1 fix on held rows + heading navigation.
- **Effort: Low.** eslint 0 problems; all CoachHeldHistory screen-mount variants
  pass (incl. a11y and random-tap fuzz).

### SOURCES
- W3C — Understanding SC 1.4.1 Use of Color:
  https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html
- Section508.gov — making colour usage accessible:
  https://www.section508.gov/create/making-color-usage-accessible/
