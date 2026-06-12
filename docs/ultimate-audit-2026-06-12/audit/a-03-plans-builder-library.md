# a-03 — Training plans, builder & plan library (internal, code-verified)

> ULTIMATE-APP MANDATE, Phase 1, Area 03. Branch `claude/admiring-bohr-2kb7pd`.
> Method: read the live screens, lib modules and navigation. Every claim
> carries file:line evidence. No competitor speculation here (that is Phase 2).
> Prior art verified against: `docs/deep-audit-2026-06-12/internal/int-03-training-logging-plans.md`
> §1.3 + finding F1/F4 (five peer entry points, no funnel). **That finding has
> materially moved**: a free guided on-ramp (B2 / FreeStarter) now exists. See §2.

---

## 1. WHAT — every screen/flow and its states

### 1.1 The Plans tab root — `PlansScreen.js` (1,052 ln)
The hub. State branches on `tier` (free/pro) and on whether an active plan exists.

- **Header + first-load skeleton** (`PlansScreen.js:384–396`): a `SkeletonCard`
  hero + two cards while `loaded` is false.
- **Block advisor card** (`:401–505`) — shown only when an active plan exists,
  `blockAdvice.action !== 'continue'`, and not snoozed (`:362–364`). Five action
  states drive copy/colour: `heads_up`, `early_deload`, `in_recovery`,
  `post_recovery`, plus the silent `continue` (`BLOCK_ICON` `:79–84`). Carries
  signal chips (`:423–433`), a next-block recommendation (`:436–463`), restart /
  snooze CTAs, and a 7-day AsyncStorage snooze (`BLOCK_SNOOZE_KEY` `:29`,
  `handleSnoozeBlock` `:218–222`). This is the only **mid-meso** surface on the
  Plans root.
- **Active-plan hero** (`:508–554`): ACTIVE badge, name, workout count, "Week X
  of Y" only when `blockAdvice.action === 'continue'` (`:525–529`), a Pro-only
  Precision Coaching™ note (`:530–534`), and **Start Next Workout** +
  **View Plan** (`:535–553`). Next-workout index is `nextWorkoutIndex % routines.length`
  (`handleStartNextWorkout` `:224–245`).
- **No-plan states — three different ones:**
  - **Free, no plan → the B2 on-ramp card** (`:556–584`): icon, "No active plan
    yet", body promising "three quick questions", **Find my plan** →
    `FreeStarter` and **Browse the library** → `PlanLibrary`. This is the B2 free
    on-ramp card the brief asks about.
  - **Pro, no plan → a recovery row** (`:585–591`): muted one-liner "No active
    plan · Build one, browse the library, or create your own from scratch."
    (Pro users almost never hit this; it is a just-after-signup fallback.)
- **My plans** (`:595–647`): non-active plans, each a `PressableCard` → PlanDetail,
  long-press → options peek (`handlePlanOptions` `:259–303`: View / Set active /
  Duplicate [free only] / Archive [inactive only]), footer View plan + Set as active.
- **Archived plans** (`:650–716`): collapsible, restore action.
- **Workout templates** (`:719–754`): saved single routines, Start + options.
- **Training blocks row** (`:757–770`) → `MesocycleBuilder`. NEW vs prior art:
  periodisation now has a dedicated, always-visible entry on the Plans root.
- **Decision Hub** (`:774–810`): section title adapts —
  `isProWithPlan ? 'Switch your plan' : 'Start or build a plan'`. Renders
  `actionCards`, which is `ACTION_CARDS_PRO_SWITCH` for Pro (Update training and
  rebuild → PlanUpdate / Pick from Library / Build your own; `:55–77`) or
  `ACTION_CARDS_DEFAULT` for free (Plan Library [badge "Recommended"] / Manual
  Builder; `:32–48`).

### 1.2 Plan Library — `PlanLibraryScreen.js` (851 ln)
- **8 collection chips** (`COLLECTIONS` `:19–28`): All plans, Featured, For women,
  For men, Beginner, Dumbbells only, Short sessions, Bodybuilding Divisions.
  Confirmed still 8 per prior art. Matching logic `matchesCollection` `:110–120`
  (tag- and difficulty-based).
- **2-question quiz** (`QUIZ_STEPS` `:82–102`): **goal** (build muscle / get
  stronger / improve conditioning / get on stage) + **equipment** (full gym /
  dumbbells / home). Still **no experience, no days** question. Scoring
  `getQuizRecommendation` `:122–142` → single recommendation, modal result with
  Add this plan / Preview first / Browse all (`:625–668`).
- **Difficulty levels**: `DIFFICULTY_LABELS = ['Beginner','Intermediate','Advanced']`
  (`:151`), shown as a badge on each card (`:535–537`) and in quiz result.
- **Division grid** (`DivisionGrid` `:164–216`): shown when the Division chip is
  active. 3 men's + 5 women's divisions, each with a description
  (`DIVISIONS_MEN` `:32–48`, `DIVISIONS_WOMEN` `:50–76`). Selecting a division
  filters plans by `division:<key>` tag (`:384–387`). This is the
  **division-specific plans** surface.
- **Add flow** (`handleAddToMyPlans` `:288–338`): copy → "Set active now?" →
  `activatePlanWithBlock`. `fromFirstRun` param changes copy/destinations
  (→ ProSetupComplete) and skips the mid-block confirm.
- **Load-error vs empty distinction** (FF-004): `loadError` flag renders a
  retryable failure surface separate from "No plans found" (`:477–505`).
- Seed: ~31 library plans, 5 at difficulty 0, 8 division tags
  (`seedRoutines.js`, verified by grep).

### 1.3 Free starter on-ramp (B2) — `FreeStarterScreen.js` (317 ln) + `lib/onboarding/freeStarter.js` (153 ln)
**NEW since prior art.** The guided free funnel the prior audit's F4 called for.
- 3 plain questions, jargon-free (`FREE_STARTER_STEPS` `freeStarter.js:24–52`):
  **goal** (build muscle / get stronger / general fitness), **equipment**
  (gym / dumbbells / home), **days** (2 / 3 / 4).
- Deterministic scoring (`getFreeStarterRecommendation` `:137–152`): equipment is
  a **hard filter** (`isStarterCandidate` `:73–80`), difficulty-0 only, stable
  name tiebreak. Maps to ONE library starter plan, copies + activates it
  (`handleStartPlan` `FreeStarterScreen.js:103–126`).
- Reached from: FirstRunStack after the name screen (`fromFirstRun:true`), Home
  no-plan card, Plans no-plan card (header comment `FreeStarterScreen.js:20–27`).
- Result screen is warm and beginner-framed: "The first couple of weeks are for
  learning the movements. That counts as progress." (`:217–219`).
- "Skip, I'll choose myself" is always present (autonomy-first; `:248–256`).

### 1.4 Manual Builder — `ManualBuilderScreen.js` (901 ln)
- **Page 1**: plan name + goal (5 options `GOALS` `:22–28`: Build Muscle /
  Balanced Bodybuilding / Aesthetic Focus / Strength-Biased / Lose Fat, Keep
  Muscle — **unexplained**). `daysPerWeek = 4` is **still hardcoded** (`:154`),
  exactly as prior art F4 flagged. NOT changed on this branch.
- **Page 2**: editable name, per-day exercise add via `ExercisePickerModal`,
  long-press-to-remove with Undo toast (`:228–258`), Add Day, `PlanBalanceCard`.
- **PlanBalanceCard** (`:74–142`): MEV/MAV/MRV status dots per priority muscle
  (`VOLUME_LANDMARKS`), warnings for none/low/over volume. **Non-blocking** —
  `validate()` (`:273–290`) only checks name + ≥1 day + (on activate) no empty
  day; it does NOT block an imbalanced plan.
- Save Draft (`:326–337`) or Save & Activate (`:311–324`, success modal `:518–548`).

### 1.5 Coach engine generation door — `ProOnboardingScreen.js` (1,781 ln) + `PlanUpdateScreen.js` (325 ln)
The deterministic generator. Two doors into `generateAndSavePlan` (`planAutoGen`):
- **ProOnboarding** (first-run Pro setup): full question set —
  `EXPERIENCE_OPTIONS` (`:71`), `SESSION_LENGTH_OPTIONS` (`:78`),
  `EQUIPMENT_OPTIONS` (`:87`), `RECOVERY_OPTIONS` (`:96`), weak points
  (`GOALS_WITH_WEAK_POINTS` `:1218`), days. Honest 4-stage "Building your plan"
  sequence mapped to real generator phases (`:451–487`), min 800ms dwell,
  Reduce-Motion skips it (`:129`). Calls `generateAndSavePlan` `:712`.
- **PlanUpdate** (Plans-tab "Update training and rebuild", **Pro-gated** via
  `GatedPlanUpdate` `RootNavigator.js:154,320`): experience / days (3–6,
  `DAYS_OPTIONS` `PlanUpdateScreen.js:28`) / session length / equipment (6 opts) /
  recovery / optional physique category + weak points. Training-only: explicitly
  does **not** touch calories/macros (`:52–56,151–153`). Rebuilds plan-first then
  commits profile (FF-002 `:108–125`); partial-result note (FF-003 `:133–136`).

### 1.6 Plan detail — `PlanDetailScreen.js` (434 ln)
- Header: Library / Active / Featured badges (`:213–230`), name, description,
  **3 stats** — Workouts, ~Est. sets/week (`workouts × 3`, `:180–183`), Level
  (`:246–253`). Primary action adapts: Add to my plans (library) / Set active
  (inactive) / none (active).
- **Workouts list** (`:266–315`): numbered rows, exercise count, Edit (→
  RoutineDetail) + Start per row when not library.
- **"Why this plan, for you"** (`:320–332`): only on the active auto-generated
  plan, reads the `PLAN_WHYTHIS_KEY` cache (`WHY_ORDER` `:27`: schedule, goal,
  experience, progression, equipment, recovery, nutrition, weakPoints).
- **Manage** (free only, `:336–354`): Duplicate / Archive.
- **Note:** there are **no week dots / effort labels on PlanDetail** — the brief's
  "week dots, effort labels" live on MesocycleBuilder (§1.7) and the block card,
  not here. PlanDetail is a static plan view; day editing is RoutineDetail.

### 1.7 Periodisation / mesocycle — `MesocycleBuilderScreen.js` (505 ln)
Reached only via the Training blocks row (§1.1). Shows: active plan card with
**week dots** + deload week marker (`:177–189`, `:263–274`), an
`ActiveMesoDashboard` (`:312–403`: progress track, weekly tonnage sparkline,
recovery EMAs, jargon-free deload-advice banner), and "Past blocks" archive →
`BlockReflection` summary. `InfoTooltip` explains "Training Block" in plain words
(`:148–160`, `:252–261`). This is the **mid-meso** detail surface.

### 1.8 Day editing — `RoutineDetailScreen.js` (816 ln)
Edit a single workout/day: reorder mode (`:106–123`), per-exercise edit sheet
(sets/reps/rest/start weight `:442–518`), **plan-level swap** via `rankSwaps`
(`swapEngine` `:181–213`) with "search all / create your own" escape hatch
(`:563–573`), unresolved-FK re-link recovery (`:301–314`), Muscle coverage chips
(factual, NO balance warnings — founder device-walk note `:35–41`), split
rationale line. The only `audit()` telemetry call in the whole area is here
(`workout.start.tap` `:239`).

---

## 2. WHERE — the entry-point map for "get a plan"

**Prior art F1/F4 found FIVE peer entry points with no funnel. That has changed.**
There is now a designated soft funnel for new/free users, but the peers still
exist alongside it. Current map:

| # | Entry | Path | Asks | Door |
|---|-------|------|------|------|
| A | **Find my plan** (FREE funnel, NEW) | Home no-plan card `HomeScreen.js:1349–1351`; Plans no-plan card `PlansScreen.js:572–576`; FirstRun post-name | goal + equipment + days (3 Qs) | `FreeStarter` → copies a difficulty-0 library plan, activates it |
| B | **Plan Library** | Plans Decision Hub (badge "Recommended") `PlansScreen.js:32–40`; Home "Browse plans"; no-plan card secondary | browse 8 chips, or 2-Q quiz (goal+equipment) | `PlanLibrary` → copy + activate |
| C | **Manual Builder** | Plans Decision Hub `PlansScreen.js:42–47` | name + goal; days hardcoded 4 | `ManualBuilder` |
| D | **Coach door — Update training** (Pro) | Plans Decision Hub `ACTION_CARDS_PRO_SWITCH` `:55–62`; post_recovery block CTA `:451–459` | exp/days/length/equip/recovery/weak points | `GatedPlanUpdate` → `generateAndSavePlan` |
| E | **Coach door — Pro onboarding** (Pro/first-run) | ProSetup stack | full question set | `ProOnboarding` → `generateAndSavePlan` |
| F | **Restart / new block** | Block advisor `post_recovery` CTA `:447–459` | none (restart) / re-run (new) | `activatePlanWithBlock` or PlanUpdate/ProUpgrade |

**Improvement vs prior art:** Find my plan (A) is now the visually-primary path
on both Home and Plans no-plan cards (a real Button, quiz-first), giving free
beginners a single "set me up" route — the F4 fix. **Still peer-y:** B/C still sit
as equal-weight cards in the Decision Hub directly beneath, and the Library quiz
(B) remains a *second*, weaker quiz that still omits experience+days, so two
different "answer some questions" funnels now coexist (A's 3-Q vs B's 2-Q).

**Exits / linkage:**
- Plans → Home for training: `handleStartNextWorkout`/`handleStartTemplate` →
  `HomeTab/ActiveWorkout` (`PlansScreen.js:240,349`); PlanDetail/RoutineDetail
  Start → `HomeTab/ActiveWorkout`.
- FreeStarter `fromFirstRun` → `completeFirstRun()` flips to MainTabs (Home);
  otherwise `popToTop` (`FreeStarterScreen.js:114–125`).
- Coach door exits via toast + `goBack` (PlanUpdate `:139`).
- Travel Mode + the **swap engine first entry** are NOT on the Plans tab. Travel
  Mode lives in `BuildWorkoutScreen.js:13,119–123,173` (Home → Build workout,
  hardcoded `daysPerWeek:4`, full-body only). Plan-level swap is in RoutineDetail
  (§1.8). So the brief's "travel mode and swap engine entry points from plans":
  swap is reachable from plans (via PlanDetail→RoutineDetail); **Travel Mode is
  not reachable from the Plans tab at all** — only from the Home ad-hoc builder.

**Dead ends / structural notes:**
- `PlanPreviewScreen.js` (63 ln) is registered only in the ProSetup stack
  (`RootNavigator.js:461`), not in PlansStack — the Plans tab's "Preview plan"
  goes to PlanDetail with `isLibrary:true`, not PlanPreview.
- FreeStarter is registered in **three** stacks (Home `:306`, Plans `:329`,
  FirstRun `:475`) — consistent, no dead route.

---

## 3. FEEL — tone, jargon, decision burden (Besa vs Eddie)

- **Decision burden to first value:**
  - A (Find my plan): **3 taps** → activated plan on Home. Lowest, and warmly
    framed. Best path for Besa.
  - B (Library quiz): 2 Qs → result → Add → confirm set-active = ~4 taps; or
    browse-then-copy-confirm-confirm. The prior F11 multi-tap friction persists
    in the non-quiz path.
  - C (Manual Builder): unbounded; assumes the user knows goals + exercises.
  - D/E (Coach door): 6 questions. Right for Eddie; gated/Pro, so Besa won't see D.
- **Jargon exposure to a newbie:** the funnels (A, B) are clean. But once a plan
  is open the structural jargon prior art F8 flagged is **still present and
  ungated**: "Est. sets/week" (`PlanDetailScreen.js:243`), "Level",
  RoutineDetail's "Muscle coverage", `PlanBalanceCard`'s MEV/MAV/MRV-derived dots
  and "volume is very high" copy (`ManualBuilderScreen.js:119–135`), Manual
  Builder's bare goal labels ("Aesthetic Focus", "Strength-Biased") with no
  explanation (`:22–28`), RoutineDetail edit "Rest (s)". MesocycleBuilder is the
  one surface that actively translates its jargon via `InfoTooltip` — a good
  pattern not reused elsewhere. No MEV/MRV/RIR acronym is shown raw to the user,
  but the underlying concepts leak through labels.
- **Besa vs Eddie per door:** Besa is now genuinely catered for at the front
  (A's copy, FreeStarter footnotes, the B2 card). Eddie's doors (D/E,
  MesocycleBuilder, RoutineDetail swap/edit, weak points) are intact and deep.
  The gap is the **middle**: a free intermediate who outgrows the starter plan
  has no free coached-rebuild — D is Pro-gated, C is unguided, B can't ask
  experience. The funnel is good at the entry and the ceiling, thin in between.

---

## 4. GAPS / FRICTION (code-verified, ranked)

**G1 — The FreeStarter "days" question is a no-op today.** All 5 difficulty-0
starter plans are tagged `days:3` (`seedRoutines.js`, verified). The scoring
admits this ("All current starters run three days a week, so this is a no-op
today" `freeStarter.js:115–116`). So a user who answers "2 days" or "4 days" is
still handed a 3-day plan with no acknowledgement. The question sets an
expectation the library can't honour. (Besa-facing.)

**G2 — Manual Builder still hardcodes 4 days/week** (`ManualBuilderScreen.js:154`),
unchanged from prior art F4. A user who can train 3× must add/remove days
manually after the fact; goal labels remain unexplained (`:22–28`).

**G3 — Two competing quizzes that disagree on questions.** FreeStarter asks
goal+equipment+days and only ever returns difficulty-0; the Library quiz asks
goal+equipment (no days, no experience) and can score a beginner onto a
Featured/Advanced plan (`PlanLibraryScreen.js:122–142` has no difficulty floor).
A free beginner who takes the *Library* quiz instead of Find-my-plan can still
land on an advanced plan — the F4 risk survives in path B.

**G4 — Plan Balance is non-blocking and goal labels don't bind it.** Manual
Builder lets you Save & Activate an imbalanced plan (only empty days block,
`:273–290`); the 5 goal labels on page 1 don't influence suggested sets/reps or
warn against mismatches. No per-session time estimate (prior F9 persists).

**G5 — No telemetry across the entire plan-acquisition funnel.** The only
`audit()`/event call in Area 03 is `workout.start.tap` in RoutineDetail
(`:239`). Find-my-plan, Library quiz, copy-from-library, set-active, manual
builder save, coach-door rebuild — none emit analytics. There is no way to see
which of the six entry points actually converts, or where users drop. (For an
audit explicitly chasing activation/retention, this is a measurement blind spot.)

**Secondary frictions (carried from prior art, still true):** the Decision Hub
keeps B/C as equal-weight peers right under the funnel (A) — the "five peers"
shape is softened, not removed; Travel Mode remains buried in the Home ad-hoc
builder and unreachable from Plans; "Preview plan" never uses PlanPreviewScreen.

---

## 5. Surface inventory

**Screens (9 primary + 2 adjacent):** PlansScreen, PlanLibraryScreen,
FreeStarterScreen, ManualBuilderScreen, PlanDetailScreen, RoutineDetailScreen,
PlanUpdateScreen, MesocycleBuilderScreen, BlockReflectionScreen; adjacent —
ProOnboardingScreen (coach door), BuildWorkoutScreen (Travel Mode + ad-hoc).
PlanPreviewScreen exists but is ProSetup-only (not in the Plans funnel).

**Components:** ScreenHeader, BackHeader, PressableCard, PeekMenu,
AnimatedEntrance, SkeletonCard/Skeleton, Button, SearchBar, Dropdown,
SegmentedControl, InfoTooltip, ExercisePickerModal, SvgBarSparkline, Toast,
AppAlert; in-file: `PlanBalanceCard`, `DivisionGrid`, `MuscleTagRow`,
`ActiveMesoDashboard`.

**Lib modules:** `planAutoGen.js` (generateAndSavePlan, PLAN_WHYTHIS_KEY,
planShortfallNote), `planEngine.js`, `planSwitch.js` (confirmPlanSwitchMidBlock),
`onboarding/freeStarter.js`, `onboarding/planPreview.js`, `seedRoutines.js`
(~31 plans, 5 difficulty-0, 8 divisions), `swapEngine.js` (rankSwaps),
`travelMode.js` (generateTravelPlan), `mesocycle.js` (predictDeloadWeek,
evaluateAutoReg), `recoveryEMA.js`, `blockAdvisor.js` (getBlockAdvice),
`coachingGoals.js` (PHYSIQUE_GOALS, GOALS_WITH_WEAK_POINTS, WEAK_POINT_MUSCLES),
`whyThisTemplates.js`, `algorithms.js` (VOLUME_LANDMARKS, MUSCLE_DISPLAY_NAMES),
plus database accessors.

**Flags / params:** `tier` (free/pro gating; `GatedPlanUpdate` Pro-guards the
coach door), `route.fromFirstRun` (Library + FreeStarter), `isLibrary`
(PlanDetail), `BLOCK_SNOOZE_KEY` 7-day snooze, `loadError`/FF-004,
FF-002/FF-003 rebuild-then-commit.

**Telemetry:** ONE call total — `audit('workout.start.tap')`
(`RoutineDetailScreen.js:239`). No funnel/conversion events anywhere else in
Area 03.

**Tests guarding the area:** `planAutoGen.test.js`, `planEngine*.test.js` (many),
`mesocycle.test.js`, `routineIntegrity.test.js`,
`planExercisePlacement.audit.test.js`, `onboarding/planPreview.test.js`
(freeStarter scoring is covered by the planAutoGen/library-pool suites).
