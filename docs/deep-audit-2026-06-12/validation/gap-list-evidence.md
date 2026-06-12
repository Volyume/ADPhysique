# Gap-list evidence — deep audit 2026-06-12

Evidence extraction for the GAP LIST. Branch `claude/admiring-bohr-2kb7pd`
(~275 commits above `origin/main`). For each feature: **SPEC** (in-repo doc ref),
**BUILT** (file:line evidence on the branch), **DISCREPANCIES** (missing, extra,
or different). No keep/strip verdicts — that adjudication happens elsewhere.

All file paths absolute. British English throughout.

## Red-flag pre-checks (run first)

- **Safety dir untouched.** `git diff origin/main..HEAD --stat -- src/coaching/safety/`
  is **EMPTY**. The ED safety directory is not modified on this branch. PASS.
- **Billing diff is bounded.** `git diff origin/main..HEAD --stat -- src/lib/payments/`
  touches 7 files (cascade.js, lapseDetect.js, playBilling.js, winbackState.js +
  three test files). Detail in the BILLING section at the bottom. Product IDs and
  prices unchanged.

---

## 1. Wave 1 — five-part coach response + free weekly one-liner

**SPEC** (founder decision #4c; `_SYNTHESIS-AND-ROADMAP.md` Theme A / Wave 1 A1).
Elite five-part coach response: (1) data-referenced acknowledgement → (2) plain
trend interpretation → (3) decision + reason → (4) one tactical cue → (5)
forward-pull "see you next check-in" anchor. Five-part stays Pro; FREE users get a
single-sentence weekly **one-liner** ("Trend on target. Calories held.").

**BUILT**
- Pure builder: `src/lib/coachResponse.js`. `buildCoachResponse` (lines 327–383)
  returns exactly the five parts:
  `{ acknowledgement, interpretation, decision, cue, forward, suppressed }`
  (lines 375–381). Sub-builders: `buildAcknowledgement` (75–117),
  `buildInterpretation` (143–179), `buildDecision` (185–205), `buildCue` (227–274),
  `buildForward` (280–305).
- Free one-liner: `buildFreeCoachLine` (lines 406–444) returns `?string` — a single
  sentence from sessions trained + optional weight-trend direction; no targets,
  macros or decision (lines 391–393). Returns `null` rather than fabricate.
- Tier gate (Home): `src/screens/HomeScreen.js:286–287` loads `loadLatestCoachOutput()`
  only when `tier === 'pro'` and `loadFreeCoachLine()` only when `tier === 'free'`.
  Render gates: free one-liner `HomeScreen.js:943` (`tier === 'free' && !!freeCoachLine`),
  Pro coach banner `HomeScreen.js:929` (`tier === 'pro' && !!latestCoachOutput`).
- Five-part wired in UI: `src/screens/CoachOutputScreen.js:1517–1529` calls
  `buildRegisteredCoachResponse({...})`; the five parts render at lines 1571–1755
  (lead card 1571–1584, decision via WhyBlock 1722, focus/cue 1727–1736, forward
  line 1753–1755). CoachOutputScreen is itself Pro-gated (see Feature 12).
- Food-level edit receipt + deep link in the same screen:
  `CoachOutputScreen.js:1668–1684`, navigation `navigation.navigate('DiaryTab', { screen: 'MealPlan' })`
  at line 1675.

**DISCREPANCIES** — none material. Spec matched: free one-liner free, five-part Pro,
correct tier branching in both Home and CoachOutput.

---

## 2. Quiz-first onboarding flipped ON

**SPEC** (founder decision #3; `_FOUNDER-DECISIONS-2026-06-12.md:17–19`).
`ONBOARDING_QUIZ_FIRST = true` incl. pre-account phase question
(`PHASE_PRE_ACCOUNT` stays true). Flow order: quiz → plan preview → "Save your
plan" wall → Article 9 at first health input.

**BUILT**
- Flags: `src/lib/onboarding/quizFlow.js:22` `ONBOARDING_QUIZ_FIRST = true`;
  `:46` `PHASE_PRE_ACCOUNT = true`. Quiz steps `quizFlow.js:27–41` — step 2 (`goal`)
  carries the training-phase question gated on `PHASE_PRE_ACCOUNT`.
- Pre-account phase question rendered: `src/screens/QuizScreen.js:104` (`{PHASE_PRE_ACCOUNT && (...)}`).
- Flow order:
  - Trigger: `src/screens/WelcomeScreen.js:59–61` — `ONBOARDING_QUIZ_FIRST && tier === 'pro'`
    routes to `QuizTraining`.
  - Quiz → preview: `QuizScreen.js:58` `navigation.navigate('PlanPreview')`.
  - Preview → save wall: `src/screens/PlanPreviewScreen.js:22`
    `navigation.navigate('Login', { intent: 'pro_signup', fromQuiz: true })`. CTA copy
    is "Create an account to keep it" / "Save your plan" (endowment-effect, not
    "sign up to continue"). No calories/macros shown pre-consent (`PlanPreviewScreen.js:7,35`).
  - Article 9 at first health input: routing gate `src/navigation/RootNavigator.js:1131–1135`
    routes new users to the Article 9 consent stack when `healthConsentChecked &&
    healthConsent === false`. Consent check at `RootNavigator.js:954–1000`; screen
    `src/screens/Article9ConsentScreen.js`. The pre-account quiz carries **no** health
    input (`quizFlow.js:15–16`); first real health input is body weight in
    `ProOnboardingScreen.js:143–167` (Pro) / the free-path screens.

**DISCREPANCIES**
- Flow/flags exactly as specified. One nuance worth recording for adjudication:
  Article 9 consent is gated *before first-run setup begins* for new users
  (`RootNavigator.js:1131–1135`), i.e. immediately ahead of the first health-input
  screen rather than at the literal keystroke of entering weight. Spec intent
  ("at first health input") is met in sequence; the trigger point is the gate in
  front of the first health-input screen, not an inline prompt.

---

## 3. Free beginner on-ramp (B2)

**SPEC** (founder decision #4a; `_SYNTHESIS-AND-ROADMAP.md` Theme B / Wave 1 B2).
Guided on-ramp FREE: Home "what do I do today" answer, a starter micro-quiz that
installs a beginner plan, a Plans-tab on-ramp card. No Pro gates.

**BUILT**
- Home no-plan card: `src/screens/HomeScreen.js:1336–1414`, shown when
  `tier !== 'pro' && !activePlan && lastSession == null`. Title "Not sure where to
  start?" (1340); CTA `navigation.navigate('FreeStarter')` (1350); "Browse plans"
  secondary (1356). No Pro gate.
- Starter micro-quiz that installs a plan: `src/screens/FreeStarterScreen.js` —
  three questions (158–164: experience/equipment/days), installs via
  `copyPlanFromLibrary()` → `activatePlanWithBlock()` (111–113), recommendation from
  `src/lib/onboarding/freeStarter.js` (`getFreeStarterRecommendation`). Registered in
  `RootNavigator.js:306` (HomeStack), `:329` (PlansStack), `:475` (FirstRunStack).
  **No `withProGuard` wrapper, no `tier === 'pro'` check, no `useEntitlement`/`requirePro`.**
- Plans-tab on-ramp card: `src/screens/PlansScreen.js:556–584`, shown when
  `tier !== 'pro'` and no active plan; primary CTA `navigation.navigate('FreeStarter')`
  (574). No Pro gate.

**DISCREPANCIES** — none. All three surfaces are free with zero Pro gates.

---

## 4. "Today's plate" teaser

**SPEC** (founder decision #6; `_FOUNDER-DECISIONS-2026-06-12.md:30–32`,
`bp-monetisation-mealplan-update.md`). Read-only generated example day for FREE
users **on the quiz result AND the empty Diary**; nothing loggable; swaps/log
Pro-locked; permanently free.

**BUILT**
- Component `src/components/food/TodaysPlateTeaser.js`. Read-only example day built
  from a fixed sample target via `assembleDayPlan()` (lines 27–32, `seed:7`,
  `SAMPLE_TARGET` a:2200/p:165/c:230/f:65) — explicitly NOT the user's data
  (header comment lines 1–13). Non-interactive: `pointerEvents="none"` on plates
  (line 45); "no swap, no log, no generate" (comment).
- Free gating + mount: `src/components/ProGate.js:96,100` — `showPlateTeaser =
  feature === 'Food diary'`; rendered inside `ProLocked` (the free-tier locked
  state). Diary route is `withProGuard(DiaryScreen, 'Food diary')`
  (`RootNavigator.js:160`), so a free user hitting the Diary tab gets the teaser.
- Tier resolution: `src/lib/proGate.js:62–64` `isPaidTier()` → free path renders
  ProLocked (`ProGate.js:137`).

**DISCREPANCIES**
- **Quiz-result mount is MISSING.** Spec #6 requires the teaser on the quiz result
  too. `src/screens/PlanPreviewScreen.js` (the post-quiz reveal) does **not** mount
  `TodaysPlateTeaser` — its only render path is `ProGate.js` (the empty/locked
  Diary). `rg TodaysPlateTeaser` over `src/` returns only `ProGate.js:9,100` and the
  component file. The build-status doc itself describes it as the teaser "on the
  Pro-locked diary" (`_BUILD-STATUS-AND-RESUME.md:53`) — i.e. the diary mount was
  built, the quiz-result mount was not.
- Read-only / nothing-loggable / swaps+log Pro-locked: all correct.

---

## 5. Notification budget + ghost prevention

**SPEC** (founder decision #5; `_FOUNDER-DECISIONS-2026-06-12.md:26–29`). Full push
inventory, hard daily/weekly cap across categories, collision priority; new pushes
ship only within it. Budget enforcement must be wired into every scheduler path.

**BUILT**
- Budget module `src/lib/notifications/budget.js`. Caps: `EVENT_DAILY_CAP = 2`
  (line 35), `EVENT_WEEKLY_CAP = 8` (line 36). Collision priority `EVENT_PRIORITY`
  (lines 43–52, highest-first): CASCADE_GATE > WEEKLY_COACH_READY > CHECKIN_MISSED >
  TRIAL_DAY3 > WINBACK > YEAR_OF_LIFTS_UNLOCK > MONTHLY_RECAP > PARTNER_CHEER.
  Decision fn `decideBudget` (176–214): one-per-topic-per-day dedupe, day-cap then
  week-cap with priority-ranked eviction. Gate fn `requestEventPushSlot`
  (230–280): reads scheduled notifications, applies `decideBudget`, cancels evicted
  losers, telemetry on cap/evict; fails OPEN if the schedule is unreadable
  (`schedule_unreadable`).
- Every EVENT-category scheduler path routes through `requestEventPushSlot` before
  `Notifications.scheduleNotificationAsync` (all in `src/lib/notifications/scheduler.js`):
  CASCADE_GATE 326→328, TRIAL_DAY3 422→424, WINBACK 514→516, CHECKIN_MISSED 630→633,
  WEEKLY_COACH_READY 699→701, YEAR_OF_LIFTS_UNLOCK 860→862, MONTHLY_RECAP 903→905,
  PARTNER_CHEER 987→990 and 1018→1021. Each guards with `if (!slot.allowed) return/continue`.
- Ghost prevention (missed check-in): `scheduleMissedCheckinFollowups`
  (`scheduler.js:565–658`) — evening + 48h follow-ups both go through
  `requestEventPushSlot` (line 630) before scheduling (633); dropped = not re-queued.
- Exempt (by design — not in `EVENT_PRIORITY`, habit/transactional categories):
  MORNING_WEIGHT (`scheduler.js:113`), WEEKLY_CHECKIN_REMINDER (`:195`),
  TRAINING_REMINDER (`trainingReminders.js:138`), ACTIVE_WORKOUT
  (`activeWorkout.js:157`, currently disabled).

**DISCREPANCIES**
- All 8 event-category pushes are budget-gated; no event path bypasses the gate.
- The four exempt paths are recurring habit/transactional/status pushes deliberately
  outside the event budget; the daily/weekly cap is therefore a cap on the **event**
  categories, not literally "across all categories" in the broadest reading of #5.
  Recording for adjudication — appears intentional (the inventory carves habit
  reminders out), but the cap is event-scoped, not global.

---

## 6. Meal plan engine + screen (Theme G)

**SPEC** (`_SYNTHESIS-AND-ROADMAP.md` Theme G; `bp-meal-plan-generator.md`;
`_REQ-*`). Deterministic assembler, TD/NTD variants (protein constant, carbs the
lever), macro-preserving swaps (role-macro ±2–5g, exact-gram rescale), exclusions
("never show me this"), preference controls, coach integration speaking food-level
changes + deep link, ED-safety floors routed through. **Hard check: safety dir must
be unmodified.**

**BUILT**
- **Safety dir unmodified** — `git diff origin/main..HEAD --stat -- src/coaching/safety/`
  EMPTY. PASS (loud confirmation per brief).
- Deterministic assembler: `src/lib/food/mealPlanAssembler.js` — `assembleDayPlan`
  (237), `assembleWeekPlan` (495). Seeded PRNG `mulberry32` (42–50); the only random
  use is a seeded tie-break `score += (rng()-0.5)*0.08` (342). No `Math.random` /
  `Date.now` in the assembly path. Greedy protein-first fill (283–368) + tolerance
  close-out `rescaleOne` (388–456).
- TD/NTD variants: `dayVariantTargets` (78–124) — protein inherited from base on
  both variants; carbs the lever (`rest.carbsG = base - down/KCAL_C`,
  `training.carbsG = base + up/KCAL_C`, 110–121). Test: `mealPlanAssembler.test.js:30–37`
  "protein is identical on both variants; carbs are the lever".
- Macro-preserving swaps: `src/lib/food/mealSwap.js` — `swapFoodInMeal` (101–141),
  `solveSwapGrams` (75–91) computes exact grams to hold the role macro, clamps to
  the food's sane range, rounds to 5g; tolerance `ROLE_TOLERANCE_G = 5`
  (`foodRoles.js:36`). Tests `mealSwap.test.js:41–55`.
- Exclusions: `src/lib/food/planPreferences.js` — `excludeFoodKeys` + `excludeTags`
  (hard); `foodAllowed` (69–74), `mealAllowed` (92–103), `withExcludedFood` (114–118).
  Tests `planPreferences.test.js:43–52`.
- Preference controls: `DEFAULT_PLAN_PREFERENCES` (`planPreferences.js:23–33`) —
  diet, exclusions, mealsPerDay, periWorkoutSlots, **variety dial** (0–1, line 29),
  **rotationPool** (3-3-3, line 30), fatConvention, pinnedMealIds.
- Coach integration: inverse plan-edit `applyMacroDeltaToPlan`
  (`src/lib/food/planEdit.js:95–188`); gram-level narration `buildPlanEditNarration`
  (`src/lib/food/planExplain.js:49–124`, e.g. "I have taken 50 g of carbs off your
  plan: 65 g less white rice at dinner. Protein held."); deep link
  `{ label: 'See your meal plan', target: 'MealPlan' }` (`planExplain.js:121`).
  Tests `planEdit.test.js:183–243`.
- ED-safety floors routed through by construction: the calorie floor (1,200/1,500)
  originates upstream in the nutrition pipeline; the meal layer reconstructs and
  preserves `floorApplied` so a floored target's ±10% band can never reach below the
  floor (`mealPlanService.js:56–62, 172–186`), and `planEdit.js` FLOOR DOUBLE-CLAMP
  (100–122) refuses any cut without a positive floor and never drives a day below
  `floorKcal`; protein is never an editable role (`planEdit.js:49–62, 162–165`).
  The food module imports NO code from `src/coaching/safety/` — the floor is a
  passed-in input, not recomputed. Tests `planEdit.test.js:99–148`
  (FLOOR DOUBLE-CLAMP invariant).
- Screen: `src/screens/MealPlanScreen.js` (day view, swaps, prefs panel,
  log-this-day); registered `RootNavigator.js:227–228`.

**DISCREPANCIES**
- All required pieces exist and are tested. ED floor is routed by construction
  (passed-in, double-clamped) rather than by importing the safety module — the
  safety directory is correctly untouched.
- Minor: two preference controls named in the RETHINK blueprint §3.3 are absent —
  **sweet/savoury breakfast preference** and **skip-breakfast / eating-window (IF)**
  are not in `DEFAULT_PLAN_PREFERENCES` or the preference functions. (These were
  RETHINK additions, not Theme-G-original; see Feature 7.)
- Known carry-forward (`_BUILD-STATUS-AND-RESUME.md:124–131`): `mealPlanRotationPool`
  is omitted from the `setMealPlanPrefs` allow-list, and the plan is local-only (no
  cross-device sync serialiser yet). Not regressions; scheduled work.

---

## 7. Meal-plan RETHINK fixes

**SPEC** (`bp-meal-plan-RETHINK-2026-06-12.md`; `_DEVICE-WALK-FINDINGS:59`). Slot
character: Meal 1 places a breakfast food, final meal is a cooked main, middle
meals draw mains + snacks, breakfast-only meals never appear mid-day; swaps respect
slot. Protein-anchor policy: animal-anchored omnivore (high-quality only), legume
NEVER anchors for omnivores, vegan ~20–30% per-meal uplift.

**BUILT**
- Slot character: `slotCharacterFor` (`mealPlanAssembler.js:215–224`) — Meal 1 →
  `['breakfast']` (line 221), final meal → `['lunch','dinner']`, middle →
  `['lunch','dinner','snack']`, peri-workout → null. Enforced in pin placement
  (289), greedy fill with safe relaxation when the pool empties (306, 318–326).
  Per-slot repetition: Meal 1 variety penalty discounted (307–309).
- Swaps respect slot: `mealSwap.js:152–203` recomputes `matchKind =
  slotCharacterFor(...)` (160–169) and filters the candidate pool by it.
- Protein-anchor policy: `PROTEIN_QUALITY` map (`foodRoles.js:81–110`) classes
  every protein as `high` (whey/dairy/egg/meat/fish), `moderate` (soy/pea isolate,
  tofu, tempeh, seitan, quorn) or `carb_protein` (legumes/grains). Anchor detector
  `mealProteinAnchorQuality` (124–136). Policy enforced in `mealAllowed`
  (`planPreferences.js:92–103`): omnivore requires `anchor === 'high'`; vegetarian
  rejects `carb_protein`. Vegan uplift gate verified in tests (per-meal protein bar
  28g mains / 24g breakfast / 12g snack).
- Tests: `mealPlanAssembler.test.js:328–443` (slotCharacterFor + real-library
  invariants: "Meal 1 always places a breakfast-tagged meal" 352, "final meal is
  always a cooked main" 365, "breakfast-ONLY meals never appear mid/final" 378,
  "untagged saved meal never greedily placed at Meal 1" 412);
  `mealSwap.test.js:183–224` ("a Meal 1 swap offers ONLY breakfast meals (the curry
  fix)" 193, etc.); `proteinQuality.test.js:21–124` (omnivore anchor invariant,
  vegetarian bare-legume rejection, vegan uplift library gate).

**DISCREPANCIES**
- Slot character and protein-anchor policy are fully implemented and test-backed.
- The RETHINK blueprint also specified a **per-day "training today?" input**
  (§3.2, replacing the invented weekly spread) and a **generous style-diverse swap
  pool / British-palate library expansion** (§3.5/§3.6) and **sweet-savoury / IF**
  preferences (§3.3). Device-walk notes only "increment 1 shipped: Meal 1 places a
  breakfast meal; swaps respect slot character" (`_DEVICE-WALK-FINDINGS:59–62`), and
  the build-status NEXT list still carries the RETHINK as priority-insert work
  (`_BUILD-STATUS-AND-RESUME:70–82`). So slot character + protein-anchor are BUILT;
  the per-day training input, the generous swap-pool/library expansion, and the
  sweet-savoury/IF preferences appear NOT yet built on this branch (flag for
  adjudication — these are blueprint items beyond increment 1).

---

## 8. D1 milestone ladder + D2 programme arc / streak-repair / phase-completion

**SPEC** (`_SYNTHESIS-AND-ROADMAP.md` Theme D / Wave 2 D1+D2;
`_BUILD-STATUS-AND-RESUME:59–103`). Surfaces exist, ED suppression respected.

**BUILT — D1**
- `src/lib/milestones.js` — rungs `first_week` (3-in-7), `sessions_5/10/25/50/100`,
  `first_pr` (50–93). Seen-set key `@volyume_milestones_v1_${userId}` (43); claim
  `claimMilestones` (190–202); selection `selectMilestone` (148–152),
  `nextSessionRung` (158–162).
- Surface: gold milestone card on `src/screens/WorkoutSummaryScreen.js:708–729`.
  ED/calm suppression: wellbeing read `getWellbeingMode()` + `getOpenEdPatternFlag()`
  (374–387); when `suppressed`, `claimMilestones` is skipped entirely so the rung is
  caught later, not consumed (399–414). No double-celebration: first session owned
  by COMP-013 (skip on `totalCompleted === 1`, 399); PRs owned by PRCelebration
  (`everHitPR: false`, 407). Free share `handleShareMilestone` (618–630), button
  718–726, "No Pro gate" (comment 617).

**BUILT — D2**
- "Week N of M" strip: `WorkoutSummaryScreen.js:827–846`, gated
  `!readOnly && !calmSuppressed && mesoWeek?.plannedWeeks >= 2` (831); reuses
  `src/components/BlockShapeCard.js` (line format "Week N of M · <phase>", 38/40).
- Phase-completion card: detection `wk.weekIndex >= wk.plannedWeeks` (270–292);
  card `WorkoutSummaryScreen.js:984–1026` (header "Block complete", recap line,
  "What's next" next-phase reveal 999–1001); suppressed via `!calmSuppressed`
  with neutral fallback link (964–978). Free share `handleShareBlock` (633–646),
  button 1013–1023, no Pro gate.
- Silent streak repair surfaced: `src/components/StreakWeeksSection.js:63–115` —
  detects `finishedWeeks[length-2]?.state === 'repaired'` (69) and shows
  "A lighter week, and you came back. Your run carried on." (110–115); engine
  `src/lib/streak.js:48–61` (`applyRepair`, capped at one).

**DISCREPANCIES** — none. D1 and D2 surfaces all exist; ED/calm suppression on
every surface; share artefacts free (decision 4b). The "milestones strip" on
Analytics is an explicit future carry-forward (`_BUILD-STATUS-AND-RESUME:94–96`),
not claimed as built.

---

## 9. C1/C2 coaching register + science layer

**SPEC** (founder decision #2; `_SYNTHESIS-AND-ROADMAP.md` Theme C / Wave 2 C1+C2;
`_BUILD-STATUS-AND-RESUME:104–111`). Persona-adaptive register engine (Supportive
vs Precise), settings toggles (tone + "Show the science" off by default), and the
science-OFF `checkJargon` path must NOT weaken.

**BUILT**
- Register engine: `src/lib/coachRegister.js` — `resolveRegister` (80–88) returns
  `'supportive'|'precise'`, honouring an explicit `coachTone` override then keying
  off `experienceLevel`/`trainingAgeYears` (advanced/competitive → precise;
  beginner/intermediate → supportive; default supportive). `buildRegisteredCoachResponse`
  (254–293) renders the same five-part facts in the chosen register; precise
  sub-renderers `preciseAcknowledgement/Interpretation/Cue/Forward` (100–235).
- Settings toggles: `src/screens/SettingsCoachingScreen.js` — tone chips
  Automatic/Supportive/Precise (state `coachTone`, default 'automatic', 38, UI
  183–213); "Show the science" switch (state `showScience`, default `false`,
  39, UI 217–232). Both persisted as local-only profile fields.
- Science-OFF `checkJargon` not weakened: blocklist `JARGON_PATTERNS`
  (`src/lib/whyThisTemplates.js:40–62`), `checkJargon` (587–590). Default
  path uses `clean()` (`coachResponse.js:40–51`) which throws in `__DEV__` on any
  jargon. Science layer: `withScience(plain, technical, showScience)`
  (`coachRegister.js:308–316`) returns the plain term untouched when OFF, and only
  appends "(technical)" when ON. The opt-in allowance `checkJargonScienceOn`
  (327–336) strips bracketed segments then runs the FULL `checkJargon` over the
  remaining copy — so text OUTSIDE brackets must still pass the full blocklist and
  the science-OFF path is unchanged.

**DISCREPANCIES** — none. Register engine, toggles, and the non-weakening of the
science-OFF jargon guard are all present and correct.

---

## 10. Partner system rebuild

**SPEC** (`bp-partner-system-rebuild.md`; `_DEVICE-WALK-FINDINGS:17–29`).
First-class PartnerScreen, Progress "Partner" tile, slim Consistency row,
WorkoutSummary beat, cheer + shared-streak pushes inside the notification budget,
derived-signals-only privacy, NO new You-tab row / no Home chip.

**BUILT**
- `src/screens/PartnerScreen.js` — both sides of week (you/them "3 of 4" ticks
  105–122), shared-streak chip (100–102), cheer button + "cheered you" receipt
  (124–139), privacy receipt (SEES/NEVER_SEES 33–45, 177–196), pairing
  (create-invite 219, enter-code 223–234), end-partnership (142–145).
- Progress "Partner" NavTile: `src/screens/AnalyticsScreen.js:344`
  (`navigation.navigate('Partner')`).
- Slim Consistency row: `src/components/PartnerRow.js`, mounted
  `src/screens/ConsistencyScreen.js:51`. Old `PartnerSection` retired — only
  test references remain (`PartnerSurfaces.test.js`, `themeTokens.guard.test.js`).
- WorkoutSummary beat with cheer inline: `WorkoutSummaryScreen.js:794–825`.
- Pushes through the budget: cheer received `scheduler.js:987→990`, shared-streak
  kept `scheduler.js:1018→1021`, both `requestEventPushSlot({ category:
  CATEGORY.PARTNER_CHEER })`; category in `budget.js:51`.
- Derived-signals-only: `src/lib/partners/signals.js:1–8` (binary
  adherence-to-own-plan signal only; "No weights lifted, sets, reps, body metrics,
  food, or location"); invariant in `src/lib/sync/__tests__/sync.partners.test.js`
  (rows expose only `done_count`/`planned_count`/`week_met`/`state`).
- Placement: NO Partner row on `YouScreen.js`; no Home chip (searches empty).

**DISCREPANCIES** — none. Placement and budget-respect both correct.

---

## 11. Founder device-walk fixes

**SPEC** (`_DEVICE-WALK-FINDINGS-2026-06-12.md`). Black-on-black fix +
phantom-token guard test; supplements screen fully removed; methodology row
free-only; bogus day-level warnings removed; workout delete + cloud tombstone.

**BUILT**
- (a) Phantom-token guard: `src/__tests__/themeTokens.guard.test.js` scans all JS
  for `<family>.<token>` references against the real theme and `expect(offences).toEqual([])`
  (35–54), failing CI on any non-existent token. `colors.text` / `colors.surfaceAlt`
  / `radius.pill` confirmed absent from `src/styles/theme.js`; call sites migrated to
  real tokens.
- (b) Supplements REMOVED: `rg -i supplement` over `src/` returns zero non-test
  results; no `SupplementGuideScreen` import or navigator entry
  (`RootNavigator.js`); no You-tab row. (The G2 blueprint doc remains as history,
  as the device-walk note permits.)
- (c) Methodology row free-only: `src/screens/YouScreen.js:157` gates "How
  Precision Coaching works" on `!isPro` (`isPro = tier === 'pro'`, line 69) — shown
  to FREE users only.
- (d) Bogus day-level warnings removed: `src/screens/RoutineDetailScreen.js:35–41`
  comment documents removal of the day-level balance heuristic; `MuscleTagRow`
  (42–80) now renders factual coverage counts only — no "No hamstring work" /
  "No pulling work" strings remain.
- (e) Workout delete + cloud tombstone: trash affordance
  `src/screens/WorkoutHistoryScreen.js:451–456`; `handleDeleteWorkout` (149–180)
  local `deleteWorkoutAndSets` (160) + cloud `deleteWorkoutFromCloud` (166);
  `src/lib/sync.js:315–330` performs the cloud delete with `enqueueSyncOp('workout_delete', ...)`
  retry fallback (167) so a restore pull cannot resurrect it.

**DISCREPANCIES**
- All five fixes present. Note for adjudication: the cloud delete in `sync.js:315–330`
  is a **hard delete** of the cloud rows (plus a queued retry op), not a soft-delete
  "tombstone" row — the device-walk note (`#9`) also flags an outstanding founder
  action to confirm Supabase RLS permits owner DELETE, else cloud delete fails
  silently and a future restore could resurrect the session. Behaviour matches the
  doc; the "tombstone" is the queued retry op, not a soft-delete record.

---

## 12. Free/Pro gating sweep

**SPEC** (`CLAUDE.md` FREE vs PRO; founder decision #4's three new free items).
FREE: Plan Library, training builder, workout logging, exercise library, personal
bests, progress stats — plus (4a) guided on-ramp, (4b) ALL share artefacts,
(4c) weekly coach one-liner. PRO: food diary, barcode, smart meal suggestions,
nutrition targets, macros, cardio, steps, check-ins, coaching adjustments,
division plans, safety, wearables — plus the five-part coach response.

**BUILT**
- Canonical gate: `src/lib/proGate.js` — `isPaidTier()` (62–64), `_resolveTier()`
  (39–53); `withProGuard`/`ProLocked` in `src/components/ProGate.js`.
- Pro features correctly gated via `withProGuard` (`RootNavigator.js`): Food diary
  (160), Cardio (161–162), Nutrition targets (150), Body metrics (151), Weekly
  check-in (149), Coach output (152). Barcode reachable only from the gated Diary
  (`DiaryScreen.js:648–656`).
- New-free items correct: weekly one-liner free / five-part Pro (Feature 1);
  share artefacts NOT Pro-gated (`ShareCardScreen` registered without `withProGuard`,
  `RootNavigator.js` ~234/245/251; milestone + block share have "No Pro gate"
  comments, `WorkoutSummaryScreen.js:617,632`); guided on-ramp free (Feature 3).

**DISCREPANCIES**
- No instance found of a Pro feature exposed to free users, nor a free feature
  gated behind Pro. Gating matches `CLAUDE.md` + decision #4.
- One structural observation (not a violation): `MealPlanScreen` carries no direct
  `withProGuard` (`RootNavigator.js:227–228`); it is Pro-gated **by call-site only**
  — reachable from the gated Diary (`DiaryScreen.js:582`) and the gated CoachOutput
  (`CoachOutputScreen.js:1675`). Currently safe; would leak the full swap/log
  surface to free users if a non-gated entry point were ever added. Flag for
  adjudication as a gating-robustness note.
- The "Today's plate" teaser missing its quiz-result mount (Feature 4) is the only
  place the §4 free-funnel surface is incompletely placed; the diary mount is
  correctly free and read-only.

---

## BILLING — `git diff origin/main..HEAD -- src/lib/payments/` (sensitive)

**Files changed:** `cascade.js` (+7/-2), `lapseDetect.js` (new, 80 lines),
`playBilling.js` (+48/-8), `winbackState.js` (new, 178 lines), plus three new test
files (`lapseDetect.test.js`, `playBilling.offer.test.js`, `winbackState.test.js`).
This is the COMP-007 / COMP-025-B paywall + win-back work flagged in the brief.

**What changed, exactly:**
- `playBilling.js` (COMP-025-B — win-back store-offer surfacing): adds
  `WINBACK_OFFER_ID = 'winback'` (a Play Console offer tag) and a `preferOfferId`
  branch in `selectOfferToken` (now `selectOfferToken(product, { preferOfferId })`).
  `purchasePackage(skuId, { preferWinback })` selects a win-back offer token **only
  if Play actually returns a distinct offer tagged `winback` for this user**;
  otherwise it falls straight through to the existing offer-selection order.
  **INERT BY FALLBACK:** with no such offer configured in Play Console (the current
  state), every path is byte-identical to a normal purchase — the comments and the
  guard `if (id && winbackToken && winbackToken !== token)` (490–497) make this
  explicit. Eligibility is server-enforced.
- `cascade.js` (COMP-023): on trial start, also schedules the day-3 trial push
  (`scheduleTrialDay3Notification`) alongside the existing cascade-gate
  notifications — same fire-and-forget contract; no billing-state change.
- `lapseDetect.js` (new): pure post-lapse detection wiring (no purchase calls).
- `winbackState.js` (new): pure win-back episode state machine (no purchase calls).

**Sensitive-surface checks:**
- Product IDs unchanged. Source uses internal keys `pro_monthly` / `pro_annual`
  (`catalogue.js:35,42`) mapped to the Play SKUs server-side; the canonical
  `volyume_pro_monthly` / `volyume_pro_annual` strings are not in source and are not
  touched by this diff.
- Prices unchanged: £4.99/mo, £29.99/yr (`catalogue.js:38–46`). No £39.99 annual
  introduced in payment code (`rg 39.99|3999 src/lib/payments --glob '!*.test.js'`
  → none). Display price still read live from the store (`usePlayPrices.js`).
- No change to the purchase result handling, entitlement resolution, or the
  product catalogue beyond the additive, inert-by-fallback win-back offer path.

**Assessment for the brief:** the billing changes are the expected
COMP-007/COMP-025-B paywall/win-back work, additive, gated behind a Play Console
offer that does not yet exist (inert), with product IDs and prices unchanged.
No surprises.
