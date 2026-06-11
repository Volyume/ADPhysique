# Founder decisions — questionnaire of 2026-06-11

Answers to the decision groups queued in `_SESSION-HANDOFF.md`. These are
binding for the build phase. Anything not listed here keeps its blueprint
default.

## 1. Billing — HOLD ALL BILLING WORK
COMP-007 (annual-first flip + paywall social proof) stays research-only.
Nothing in `src/lib/payments/` or the paywall/upgrade/tier-strip screens is
to be touched. This also holds every billing-adjacent line queued by other
blueprints: COMP-012's paywall footer line, COMP-025 Phase B (store win-back
offers). COMP-025 Phase A (cancel-reason capture, no billing files) is NOT
held.

## 2. SKU-id mismatch — DOCS WERE WRONG, NOW FIXED
Founder confirmed the live Play product ids are `pro_monthly` / `pro_annual`
(what `catalogue.js` ships). `CLAUDE.md` and `docs/rules/billing.md`
corrected this session. No code change.

## 3. Dependencies — ALL FOUR APPROVED
- `@bacons/expo-apple-targets` (COMP-020 watch, COMP-019 widgets/Live
  Activity) — still subject to the issue-#175 go/no-go spike.
- `react-native-android-widget` (COMP-019 stage 2).
- `expo-system-ui` (COMP-029 light theme; native rebuild).
- `expo-video` (NEW-001 demo loops).
Approval covers installation when the owning feature starts, not before.

## 4. Spend — NOTHING APPROVED YET
Founder: "No extra costs yet unless needed gym animations is a bad choice
perhaps." Read as: no money moves now. NEW-001's $599 purchase NOT approved;
its £0 Phase 0 (licensing questions in writing + 30 free-clip validation)
may still run since it costs nothing, and the spend question returns after
Phase 0 results. COMP-016 contracted data-ops (~£4–6k) parked — the
engineering-only parts wait with it. Supabase Pro backup ($25/mo) parked;
the backup/DR brief stays open as a known risk.

## 5. Trial-notification bug — FOLD INTO COMP-023
The restoreNotifications() cascade-wipe bug (day-12/14 trial pushes
destroyed on every launch) is fixed inside the COMP-023 build, not as a
standalone PR. Until COMP-023 lands, trial users may reach day 14 unwarned —
accepted by the founder. Raises COMP-023's build priority.

## 6. Colour — WARNING RETUNE APPROVED
warning `#FFC107` → Okabe-Ito yellow `#F0E442` per COMP-027. One token
change, propagates via stateColors aliases.

## 7. NEW-002 free/Pro split — FULLY FREE
Training partners: up to three partners for ALL users. Overrides the
blueprint's one-free/three-Pro proposal. No Pro gate anywhere in NEW-002.

## 8. Copy + locked docs — APPROVE IN PRINCIPLE
Build with blueprint copy as written (COMP-006 methodology, COMP-015
adjustment lines, COMP-011 cardio explainer, COMP-010 effort vocabulary,
COMP-008 survey strings); founder reviews at PR time only if something
jumps out. Locked-doc amendments (COMP-030 quiz-first, COMP-016
foods.source CHECK, NEW-002 RLS/DPO, backup vs BUDGET_POSTURE_LOCKED) still
come to the founder individually before any amendment is made.

## Resulting build queue (dependency order, billing/spend items removed)
1. **Quick wins:** COMP-003 quick add (~90 min) → COMP-011 cardio explainer
   (copy) → COMP-002 meal-slot memory (~4–6 h).
2. **Mandate:** COMP-001 workout screen redesign (~6 days; unblocks
   COMP-013, COMP-015 slot, COMP-020).
3. **COMP-008 survey diet** (must precede COMP-015) → **COMP-015**.
4. **COMP-023 day-3 trial moment** + the cascade-wipe bug fix (decision 5).
5. **COMP-027 colour grammar/Home** (token migration precedes COMP-029) →
   **COMP-004 daily trend** (precedes COMP-026) → COMP-029 light theme.
6. **COMP-018 streak** (precedes NEW-002) → NEW-002 (fully free).
7. Remainder per the integration map: COMP-006, 012, 013, 022, 024, 025-A,
   026, 010, 005, 009, 019, 020, 030.
Parked pending money/billing: COMP-007, COMP-016, NEW-001 purchase,
COMP-025-B, Supabase Pro backup.

## Build log — session of 2026-06-11 (same day as the questionnaire)
SHIPPED on this branch, each commit lint-clean with the full suite green:
- **COMP-003** quick add (8103261): Quick add row in every meal card,
  QuickAddSheet wired into DiaryScreen, quick_add telemetry source.
  Optional name field deferred per blueprint's builder decision.
- **COMP-001 steps 1–5 + telemetry** (dc56186, 3a0cbb6, d8425a4, 49e67e6,
  bd646ef): three-line card header with tappable beat line; 5-button row →
  2 + overflow sheet; logged sets above the fold; one-row 3-control rest
  timer with long-press repeat; ghost nav / muscle line / time-crunch bar
  deleted (glyph in header, revert in overflow); M2–M4 audit events;
  countProgressSets extracted to src/lib/workoutHelpers.js; compact timer
  on <700pt screens. Blueprint deviations (deliberate): 'Add exercise'
  label kept truthful (blueprint's 'Add set' named the exercise-picker
  handler); first-set hint copy points at ⋯.
- **COMP-011** cardio explainer (9ca4917): three surfaces, locked
  vocabulary, blueprint copy as written.
- **COMP-002** meal-slot memory (2f3c314): food_slot_recents client-only
  table, 'Add again' tab, last-used portion pre-fill, unit tests.
- **COMP-027 Part A** colour grammar (87f99ac): stateColors aliases,
  warning #FFC107 → #F0E442 Okabe-Ito retune (founder-approved), the 3
  Class B/C migrations (CoachOutput trend chip, BodyMetrics delta, Home
  deload banner), tests. Implementation note appended to the blueprint.
- **COMP-004** 'Your trend' card (2cd74f4): pure deriveWeightTrend +
  useWeightTrend hook + WeightTrendCard on Progress, states 0-3, Class B
  rules, 8 unit tests.

(Container reset once mid-session at ~commit a2cc7f3; recovered by
fast-forward to origin per the handoff note. Nothing lost.)

PARKED (founder eyes wanted, not blockers):
- COMP-001 step 6 remainder: logged-set cap + 'All sets (N)' expander
  contradicts the blueprint's own above-the-fold screenshot thesis; nav
  maxHeight 40 clamp conflicts with the new 40pt pill sizing; nav-pill
  middle-out truncation helper under-specified. Decide at COMP-001 visual
  review.
- COMP-027 **Part B** (Home TodayStrip reorder): 3-4 day visual rebuild
  with the weigh-in-completion guardrail; needs the founder's eyes on the
  live layout. Part A stands alone and unblocks COMP-029.
- COMP-004 follow-ups: Home TodayStrip tap-through door (waits on Part B);
  dashed goal-band chart overlay (visual polish); State 4 high-confidence
  maintenance (firms up with COMP-026's 90-day window).
- COMP-012/COMP-006: each wants a Welcome/paywall trust line — paywall
  lines are HELD with billing anyway.

DEFERRED (need founder/attended session, not done unattended):
- COMP-008 survey diet: blueprint file is present again, but it changes
  the createWorkout call path and the TIMING of coaching-engine inputs
  (soreness/sleep/energy) - engine-sensitive, do with founder available.
  COMP-015 hard-depends on it.
- COMP-023 + trial-push cascade fix: revenue-relevant (decision 5) but a
  2-2.5 day notification/scheduler/banner build; do attended.
- COMP-029 light theme: needs expo-system-ui install + native rebuild +
  the 122-site zero-visual-diff Phase 0 migration; heavily visual.

COMP-018 streak — BLOCKED on a data source (found while scoping it
2026-06-11). The run-length rule requires knowing whether each PAST
calendar week was an engine-prescribed deload (those count as 'resting',
never 'missed'). `mesocycle_weeks` is keyed by week-index within a
mesocycle, not by calendar week, and only `getCurrentMesocycleWeek`
exists. Without a `getDeloadWeeksInRange(userId, fromMonday, toMonday)`
(or equivalent calendar-week→is_deload mapping), a correctly-deloaded
user would see their run wrongly lapse — the exact delayed-punishment bug
the blueprint is built to avoid. Prereq: add that query (maps mesocycle
start date + week_index → calendar Monday), THEN build the pure
`src/lib/streak.js` + the read-only Progress strip. Pause/goal editor,
ConsistencyScreen 'Your weeks' section, and milestones are a second pass
(need a synced pause/goal table per the blueprint, + founder copy review).

NEXT IN QUEUE (clean, unattended-safe): none remaining that are both
unblocked and non-visual. Everything left needs founder eyes (COMP-027
Part B, COMP-029, COMP-018 UI), a missing data source (COMP-018 deload
history), engine-timing review (COMP-008→COMP-015), billing (COMP-007,
COMP-025-B), or spend (COMP-016, NEW-001). Recommend the next session be
attended for the visual/engine items, or start with the COMP-018 deload
query (pure, testable) as the one remaining non-visual prerequisite.
