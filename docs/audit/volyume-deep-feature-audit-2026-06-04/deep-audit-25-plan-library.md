# Deep Feature Audit — Item 24: Plan Library screen

**Document:** deep-audit-25-plan-library.md
**Item:** 24 of master inventory (screen #21 — `PlanLibraryScreen`; Plans sub-stack, also the onboarding stacks via `fromFirstRun`)
**File:** `src/screens/PlanLibraryScreen.js` (793 lines), components `SearchBar`, `SkeletonCard`, libs `database` (`getLibraryPlans`, `getPlanWorkoutCounts`, `copyPlanFromLibrary`, `activatePlanWithBlock`), `planSwitch` (`confirmPlanSwitchMidBlock`), `seedRoutines`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approve"). Added roles/labels/state across the screen's controls: collection chips and division chips (selected), the plan-card main touchable (label + "Opens plan preview" hint), Preview / Add to my plans, the quiz banner, the quiz option rows, the quiz result buttons (Add this plan / Preview first / Browse all) and the skip rows; hid the decorative quiz progress dots from the reader. One copy line reworded. Attribute-only + one copy line; no behaviour, layout, or structure change.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The browse-and-copy seeded plan library. A search bar, a horizontal row of 8
collection chips (All plans / Featured / For women / For men / Beginner /
Dumbbells only / Short sessions / Bodybuilding Divisions), a division grid
(3 men's + 5 women's judged divisions, each a toggle chip with a description),
and a 2-question quiz (goal + equipment) that scores the library and recommends
one plan. Plan cards carry badges (Featured / division / gender / difficulty),
a workout count, a description, and two actions: Preview plan (→ PlanDetail in
library mode) and Add to my plans. The add flow copies the plan, then offers
Set active, routed through `confirmPlanSwitchMidBlock` (skipped during
first-run, since there is no prior block). Skeleton cards while loading, real
empty states per filter.

### Findings
1. **Strong, well-built browse screen.** Search + 8 collections + a scored
   recommendation quiz + division-specific collections + balanced plan cards is
   richer than a plain filtered list. Theme tokens throughout, `FlatList` for
   both the chip row and the plans, on-brand amber for the active chip / featured
   badge / add affordance. Verified clean: **no dead styles** (every `styles.X`
   key is referenced), **0 em dashes**, **no raw hex** (all colour via tokens).
2. **A11y: 0 `accessibilityRole` / `accessibilityState` / label across ~29
   controls (priority).** Both filter rows (collection chips and division chips)
   are toggles whose selected state is colour-only and never announced — the
   substantive gap, since a screen-reader user can't tell which filter is active.
   Beyond that: the plan-card main touchable, Preview, Add to my plans, the quiz
   banner, the quiz option rows, and the quiz result/skip buttons have no role;
   the 2 quiz progress dots are decorative but exposed to the reader.
3. **One borderline copy line.** The division empty state read "No plans yet for
   this division. Check back soon." — the "Check back soon" tail leans on the
   coming-soon flavour CLAUDE.md bans. Everything else (quiz banner, results,
   add-flow Alerts, toasts) is plain, specific, and non-judgemental.
4. **Minor design note, no change.** The quiz modal uses 2 paginating dots.
   CLAUDE.md flags paginating dots as a fingerprint, but this is a genuine
   2-step quiz, not a carousel, so it stays within bounds. Flag only.

### Design assessment (values cited)
- On-system: `surface` plan cards with `border`, amber `primary` for the active
  chip / featured badge / add affordance / quiz primary button, `surface2` for
  the division description and quiz option rows, scale tokens throughout. The
  search → collections → (division grid) → cards layout earns each element; the
  quiz lives behind a single dismissable banner, not forced. No fingerprints.

### Flow / integration assessment
- `useFocusEffect` + a `user?.id` effect re-seed and re-load so a first-run user
  who lands here before `initLocalUser` finishes still gets the seeded library.
  Filtering is pure local state (query > division selection > collection match).
  Add copies via `copyPlanFromLibrary`, then `activatePlanWithBlock` behind the
  mid-block confirm (skipped on first-run). Solid; the only gap is control a11y.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Difficulty / focus / length filters and clear categorisation** let users find
  a plan in under five minutes and cut cognitive load; **screen-reader
  compatibility and larger tap targets** are listed accessibility musts for a
  fitness library. Volyume implements goal/gender/equipment/length collections +
  a difficulty badge + a recommendation quiz. [Easternpeak; Dataconomy]
- **Filter chips are the toggle case:** pair `accessibilityRole="button"` with
  `accessibilityState={{ selected }}` (or the `togglebutton` role) so selection
  is heard, not only seen; always give interactive elements a label + role. This
  is the direct rule behind finding 2. [React Native a11y docs; Appt]

---

## STEP C — COMPARISON

### Where Volyume leads
- A recommendation quiz + division-specific collections + live workout counts +
  balanced plan cards is more guidance than the plain filtered lists the sources
  describe. [Easternpeak; Dataconomy]

### Where Volyume lags
- Control a11y, with the two filter rows' unannounced selected state the real one
  (finding 2), plus one borderline empty-state line (finding 3).

### Critical gaps
- None functional. A11y completion + one copy reword.

---

## STEP D — PROPOSAL (as implemented)

### Summary
Complete the control a11y (attribute-only) and reword one borderline empty-state
line. No behaviour, layout, or structure change.

### Specific changes — one by one

**1. Complete the control a11y. [A11y — Low]**
- Collection chips: `accessibilityRole="button"` +
  `accessibilityState={{ selected: activeCollection === item.key }}` + label.
- Division chips: `accessibilityRole="button"` +
  `accessibilityState={{ selected }}` + label.
- Plan-card main touchable: `accessibilityRole="button"`, a composed label
  (name, difficulty, workout count) and `accessibilityHint="Opens plan preview"`.
- Preview plan / Add to my plans: `accessibilityRole="button"` (+ labels
  "Preview {name}" / "Add {name} to my plans").
- Quiz banner, quiz option rows, quiz result buttons (Add this plan / Preview
  first / Browse all) and the skip rows: `accessibilityRole="button"`.
- Quiz progress dots: hidden from the reader (`accessibilityElementsHidden` +
  `importantForAccessibility="no-hide-descendants"`).

**2. Copy. [Low]**
- Division empty state: "No plans yet for this division. Check back soon." →
  "No plans for this division yet."

### COPY CHANGES
The one line above. The rest of the screen's copy is plain and stays.

### What to keep (with evidence)
- The search, the 8 collections, the division grid, the 2-question quiz, the
  plan cards, and the activate / mid-block-confirm flow. [Easternpeak; Dataconomy]

### IMPACT / EFFORT
- **Impact: Low–Medium.** The two filter rows previously announced nothing about
  what was selected; that is the substantive win. The rest is polish.
- **Effort: Low.** Attribute-only plus one copy line; no behaviour, layout, or
  structure change. eslint 0 problems; the 455-test screen-mount sweep
  (incl. the PlanLibraryScreen fuzz) stays green.

### SOURCES
- Easternpeak — Fitness app design best practices:
  https://easternpeak.com/blog/fitness-app-design-best-practices/
- Dataconomy — Best UX/UI practices for fitness apps 2025:
  https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/
- React Native — Accessibility (accessibilityState, roles):
  https://reactnative.dev/docs/accessibility
- Appt — Accessibility state on React Native:
  https://appt.org/en/docs/react-native/samples/accessibility-state
