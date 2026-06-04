# Deep Feature Audit — Item 46: Block Reflection screen

**Document:** deep-audit-47-block-reflection.md
**Item:** 46 of master inventory (screen #46 — `BlockReflectionScreen`; end-of-block reflection)
**File:** `src/screens/BlockReflectionScreen.js` (306 → 304 lines), `StatBlock` local, `BackHeader`, `SkeletonCard`
**Status:** IMPLEMENTED (approved 2026-06-04, "Ok"). Added roles to the "Start a new block" and "Done" buttons, header roles to the block name and the section titles, and removed the dead `loadingText` style. No behaviour or copy change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The end-of-block recap: block title + dates, a 4-stat row (sessions / sets /
volume / avg session), a generated narrative (volume delta, top exercise),
records set this block, the best session, and a "what's next" recovery transition
with a Start-a-new-block CTA, then Done.

### Findings
1. **Excellent recap, on the established pattern.** Stats + narrative + PRs + a
   recovery transition before the next block is the periodisation norm. The
   narrative copy is factual and on-voice ("Steady work adds up.") — observations
   about the data, not banned cheerleading. Dates use local components; **no em
   dashes** (the date-range "–" is a correct en-dash).
2. **1 dead style** (`loadingText`, verified — loading uses `SkeletonCard`s;
   `styles.loadingText` has 0 refs).
3. **A11y.** The two buttons ("Start a new block", "Done") had no role, and the
   block name + section titles were not headings. `BackHeader` is already
   accessible.

### Design assessment (values cited)
- On-system: `surface` cards, a `primaryBg` best-session callout, `primary` stat
  icons + PR values, scale tokens. The 4-stat row drops "avg session" when zero
  (no forced symmetry). No fingerprints.

### Flow / integration assessment
- Loads `getBlockReflectionData`, builds the narrative, renders stats / PRs / best
  session / what's next. The CTA returns then navigates to `MesocycleBuilder`.
  Read-only otherwise. Sound.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- An end-of-block review with performance metrics + PRs + a recovery transition is
  the periodisation norm; Volyume matches it. [TrainerRoad; StrengthLog]

---

## STEP C — COMPARISON

### Where Volyume leads
- A genuine block recap with a generated narrative and recovery guidance.

### Where Volyume lags
- One dead style, button roles, heading nav (all fixed).

### Critical gaps
- None.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one
1. **Remove the dead `loadingText` style.** [Cleanup — Low]
2. **A11y.** `accessibilityRole="button"` on "Start a new block" and "Done";
   `accessibilityRole="header"` on the block name and the section titles ("Records
   set this block", "What's next"). [A11y — Low]

### COPY CHANGES
None.

### What to keep (with evidence)
- The stat row, narrative, PRs, best session, recovery guidance, and all copy.
  [TrainerRoad; StrengthLog]

### IMPACT / EFFORT
- **Impact: Low.** Cleanup + button roles + heading navigation.
- **Effort: Low.** eslint 0 problems; all BlockReflection screen-mount variants
  pass (incl. a11y and rapid-tap fuzz).

### SOURCES
- TrainerRoad — training periodization (macro/meso/microcycles):
  https://www.trainerroad.com/blog/training-periodization-macro-meso-microcycles-of-training/
- StrengthLog — workout tracker (mesocycle progress, yearly PRs):
  https://www.strengthlog.com/
