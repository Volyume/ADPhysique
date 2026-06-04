# Deep Feature Audit — Item 25: Training Blocks screen

**Document:** deep-audit-26-mesocycle-builder.md
**Item:** 25 of master inventory (screen #22 — `MesocycleBuilderScreen`; nav title "Training Blocks", reached from the Plans tab)
**File:** `src/screens/MesocycleBuilderScreen.js` (513 → 503 lines), components `ActiveMesoDashboard` (inline), `SvgBarSparkline`, `InfoTooltip`, `SkeletonCard`, libs `database`, `algorithms` (`calculateTonnage`), `recoveryEMA`, `mesocycle` (`predictDeloadWeek`, `evaluateAutoReg`)
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve as is"). Removed 3 dead styles (`createBtn`, `createBtnText`, `barAxisLabel`); added role + label to the "View block summary" button; reworded both empty-state branches (and the `activePlan` title) so they stop promising a non-existent "create block" action and instead state that blocks start on plan activation; trimmed the long block-explainer tooltip's tutorial tail. No behaviour or layout change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
Despite the file name, this is a **read-only dashboard + archive, not a
builder**. It shows an "Your active plan" card (name, split, workout count,
week-of-N dots, an `InfoTooltip` explaining blocks vs plans), an active-block
dashboard (week X of N, a progress track, a weekly-load tonnage sparkline graded
by current/deload week, recovery EMAs for soreness/fatigue/joints, and a
plain-language deload-advice banner), and a "Past blocks" archive list with
per-block week dots and a "View block summary" button (→ `BlockReflection`).

**How blocks are actually created:** automatically by `activatePlanWithBlock`
(`database.js:2367`) when a plan is activated. There is **no manual block create
or edit anywhere in the app** — `createMesocycle` (`database.js:2890`) has zero
callers.

### Findings
1. **Solid, on-brand tracking dashboard.** The weekly-load + recovery-EMA +
   deload-advice surface mirrors the *tracking* half of what RP/Setgraph/Jefit
   do for periodisation. Theme tokens throughout, **0 em dashes**.
2. **3 dead styles:** `createBtn`, `createBtnText` (the orphaned manual-create
   button) and `barAxisLabel` (0 `styles.X` refs each, verified across the file).
3. **Empty-state dead end (the real issue).** Both empty branches told the user
   to "Add a training block" / "Create a block to track…", but the screen renders
   **no create affordance**, and blocks cannot be created manually at all (they
   come from activating a plan). The copy promised an action that does not exist.
   Empty-state guidance is explicit that the state must offer a real next step
   and not dead-end. [Eleken; Justinmind; Userpilot]
4. **A11y: one interactive control.** "View block summary" (icon + text) had no
   role or label. Everything else is `View`/text; the week dots are decorative
   with adjacent "Week X of N" text, so they need no label. Small surface.
5. **Voice (minor).** Two `InfoTooltip`s on one screen brushes the "one footnote
   per surface" rule, and the longer one leaned tutorial-voice ("Most people run
   2 to 4 blocks per year…"). Both answer a genuinely confusing question (block
   vs plan), so they were kept; the tutorial tail was trimmed.

### Design assessment (values cited)
- On-system: `surface` cards, amber `primary` for the active border / progress
  fill / active badge / current-week bars, semantic `warning`/`error` for the
  deload banner and deload week, `surface2` tracks. The sparkline colours come
  from theme tokens (current = `primary`, deload = `warning`, else `primaryDim`),
  so they recolour with the colour-blind palette. No fingerprints.

### Flow / integration assessment
- `useFocusEffect` loads mesocycles + active stats + active plan on focus.
  Active-block stats are derived (per-week tonnage windows, recovery EMAs,
  autoreg + deload prediction). The archive list filters out the active block
  (shown in the header dashboard) and links each past block to its reflection.
  Sound; the one gap is the empty-state copy promising a missing action.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- Empty states must pair a specific message with a **real call to action** and
  avoid product dead ends; a generic "create X" with no path is the named
  anti-pattern. This is the basis for the finding-3 copy fix. [Eleken;
  Justinmind; Userpilot]
- Competitor mesocycle tools (RP, Setgraph, Jefit) centre on **build/select a
  block + week-by-week volume + deload flags + soreness/fatigue/pump
  autoregulation**. Volyume matches the tracking + autoregulation half (weekly
  load, recovery EMAs, deload advice) but, unlike RP/Jefit, has no in-app block
  build/edit — which is exactly what made the empty-state copy misleading.
  [RP Strength; Setgraph; Jefit]

---

## STEP C — COMPARISON

### Where Volyume leads
- The recovery-EMA + plain-language deload-advice banner is friendlier than the
  raw volume tables the competitors show. [RP Strength; Setgraph]

### Where Volyume lags
- The empty-state dead end (finding 3), 3 dead styles, one un-labelled control.

### Critical gaps
- None crash-level. The empty-state copy promising a non-existent action was the
  one real bug; the deeper product gap (no manual block create/edit) is a founder
  decision, flagged below.

---

## STEP D — PROPOSAL (as implemented)

### Specific changes — one by one

**1. Remove the 3 dead styles** (`createBtn`, `createBtnText`, `barAxisLabel`).
[Cleanup — Low]

**2. A11y.** "View block summary" → `accessibilityRole="button"` +
`accessibilityLabel={`View summary of ${meso.name}`}`. [A11y — Low]

**3. Copy — fix the empty-state dead end.** [Copy — Low]
- No active plan: "Training blocks start when you activate a plan. Activate one
  to track week-by-week progress across a training phase."
- Active plan, no block: "Your plan is active and ready to train. A training
  block adds week-by-week tracking on top, and one starts when you activate a
  plan." Title changed from "Add a training block" to "No active block".
- Trimmed the long block-explainer tooltip's tutorial tail (kept the block-vs-plan
  explanation and the "after the block ends" bullets).

### COPY CHANGES
The three strings above. The deload advice, recovery labels, and week copy stay.

### What to keep (with evidence)
- The active-block dashboard (weekly load, recovery EMAs, deload advice), the
  per-block week dots, and the archive + reflection link. [RP Strength; Setgraph;
  Jefit]

### Flagged for the founder (not coded — product / cross-file)
- **No manual block create/edit exists.** Blocks only start via plan activation;
  there is no "start a new block on my current plan" control. If intended, the
  copy fix is sufficient; a real "Start block" action would be a feature.
- `createMesocycle` (`database.js:2890`) is dead code, the vestige of the removed
  builder. Candidate for deletion in a cleanup pass.
- `activatePlanWithBlock` sets a block `startDate` from
  `new Date().toISOString().slice(0,10)` — a **UTC** date, which under BST late
  evening can land a day early (the locked UK-timezone class of bug). Cross-file,
  low/latent; fold into a TZ sweep, not this screen.

### IMPACT / EFFORT
- **Impact: Medium.** The empty-state copy previously told users to do something
  impossible; that is now accurate. Plus dead-style cleanup and one a11y label.
- **Effort: Low.** Three style deletions, one attribute-only a11y addition, three
  copy strings. eslint 0 problems; the screen-mount sweep (incl. the
  MesocycleBuilder fuzz) stays green.

### SOURCES
- Eleken — Empty state UX:
  https://www.eleken.co/blog-posts/empty-state-ux
- Justinmind — Empty state best practices:
  https://www.justinmind.com/blog/everything-you-need-to-know-about-empty-state-design-1/
- Userpilot — Empty state (SaaS):
  https://userpilot.com/blog/empty-state-saas/
- RP Strength — Hypertrophy app:
  https://rpstrength.com/pages/hypertrophy-app
- Setgraph — Progressive overload / week-by-week:
  https://setgraph.app/ai-blog/progressive-overload-calculator
- Jefit — Periodised training (meso/micro cycles):
  https://www.jefit.com/wp/general-fitness/designing-a-periodized-strength-training-plan/
