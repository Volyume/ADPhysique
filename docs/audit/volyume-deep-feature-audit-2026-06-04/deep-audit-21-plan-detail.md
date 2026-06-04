# Deep Feature Audit — Item 20: Plan Detail screen

**Document:** deep-audit-21-plan-detail.md
**Item:** 20 of master inventory (screen #17 — `PlanDetailScreen`; Plans stack + onboarding stacks)
**File:** `src/screens/PlanDetailScreen.js` (431 lines), shared `Button`, `Skeleton`, `AnimatedEntrance`, libs `planSwitch`, `planAutoGen`
**Status:** IMPLEMENTED (approved 2026-06-04, "Approved"). Labelled the icon-only per-workout Edit/Start buttons (role + "Edit/Start {name}") and added button roles + labels to the Duplicate/Archive Manage rows. Attribute-only.
**Timestamp:** 2026-06-04

---

## STEP A — CURRENT STATE AUDIT

### What it is and what it does
The plan overview, reached from the Plans tab (My plans / Library) and onboarding.
A header with badges (Library / Active / Featured), the plan name + description,
and a stat row (workouts, est. sets/week, level); a primary action that adapts to
context (library → "Add to my plans"; owned & inactive → "Set active"; active →
none); a numbered workouts list (each non-library row has icon-only Edit + Start
buttons); a "Why this plan, for you" rationale card (only on the active auto-
generated plan, mirroring the enrolment reveal); and a free-tier Manage card
(Duplicate / Archive). Loading shows a layout-matched skeleton. Pull-to-refresh.

### Findings
1. **Clean and well-built.** Single StyleSheet, no dead styles (verified), eslint
   clean, 0 em dashes. Context-aware primary action, mid-block switch guard
   (`confirmPlanSwitchMidBlock`) on activate, layout-matched skeleton, and the
   rationale surfaced any time (not just post-setup). Copy is plain and on-voice.
2. **A11y: icon-only buttons have no labels (the priority gap).** The per-workout
   Edit (`:293`, a `create-outline` icon) and Start (`:300`, a `play` icon)
   buttons are icon-only `TouchableOpacity`s with no `accessibilityRole` /
   `accessibilityLabel` — a screen reader announces nothing for them. The Manage
   rows (Duplicate `:337`, Archive `:343`) have text labels but no button role.
   (The primary action uses the shared `Button`, which handles its own a11y.)
   The screen has 0 `accessibilityRole` overall.
3. **Copy is on-voice.** Badges, stats, the "Why this plan, for you" rationale,
   and the confirmations ("The plan will be hidden. Session history remains
   intact.") are plain and clear. No em dashes, no AI tells. Nothing to rewrite.

### Design assessment (values cited)
- On-system: `surface` cards, amber `primaryBg`/`primary` for the active badge +
  Start button + why-bullets, `error` for Archive, scale tokens. The badge row,
  numbered workout cards, and rationale card are clean and scannable.
  `AnimatedEntrance` on the header. No fingerprints.

### Flow / integration assessment
- Loads plan + routines + counts + active plan on focus; the rationale cache is
  read per-user and gated to the active plan in render. Activate / add-from-
  library / duplicate / archive all go through the DB layer with toast-guarded
  errors and the mid-block switch confirmation. Start builds `initialExercises`
  (with superset hydration) and cross-navigates to ActiveWorkout. Solid.

---

## STEP B — RESEARCH (live web, 2026-06-04)

- **Clear plan overview, minimal taps to key actions.** A well-structured plan
  view with quick access to start/activate is named best practice; Volyume's
  context-aware primary action + per-workout Start fit this. [Stormotion;
  Easternpeak]
- **Icon buttons need accessible affordance + screen-reader support.** "Large
  buttons, readable fonts, voice commands, and screen reader support" are named
  explicitly, "particularly important for icon buttons and action controls" —
  directly the Edit/Start gap (finding 2). [Dataconomy; Easternpeak]

---

## STEP C — COMPARISON

### Where Volyume leads
- A context-aware plan overview with a mid-block switch guard, a layout-matched
  skeleton, and an on-demand "why this plan, for you" rationale that most plan
  screens don't offer. Clean, scannable, on the locked system. [Stormotion]

### Where Volyume lags
- The icon-only Edit/Start buttons (and the Manage rows) lack a11y roles/labels
  (finding 2). That's the only gap.

### Critical gaps
- None. Clean screen; a11y polish only, with the icon buttons the priority.

---

## STEP D — PROPOSAL

### Summary
A11y-only polish: label the icon-only Edit/Start buttons (the priority, since
they have no text fallback) and add button roles to the Manage rows. No
behaviour, copy, or layout change.

### Specific changes — one by one

**1. Label the icon-only workout buttons + role the Manage rows. [A11y — Low]**
- What: `accessibilityRole="button"` + `accessibilityLabel` on the per-workout
  Edit (`Edit {routine.name}`) and Start (`Start {routine.name}`) buttons; and
  `accessibilityRole="button"` + label on the Duplicate and Archive Manage rows.

### COPY CHANGES
None.

### What to keep (with evidence)
- The context-aware primary action, the mid-block switch guard, the layout-
  matched skeleton, the "why this plan, for you" rationale, and the numbered
  workout cards. [Stormotion; Easternpeak]

### IMPACT / EFFORT
- **Impact: Low** (a11y polish; the icon buttons are the meaningful part — no
  text fallback today).
- **Effort: Low.** Attribute-only; no behaviour, copy, or layout change.

### SOURCES
- Stormotion — Fitness app UX principles:
  https://stormotion.io/blog/fitness-app-ux/
- Easternpeak — Fitness app design best practices:
  https://easternpeak.com/blog/fitness-app-design-best-practices/
- Dataconomy — Best UX/UI practices for fitness apps:
  https://dataconomy.com/2025/11/11/best-ux-ui-practices-for-fitness-apps-retaining-and-re-engaging-users/
