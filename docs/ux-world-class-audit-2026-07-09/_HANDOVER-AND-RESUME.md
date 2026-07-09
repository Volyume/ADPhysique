# UX world-class audit — handover and resume note

**Branch:** `claude/codebase-audit-docs-pv6mjd` (docs-only; no app code changes)
**Started:** 2026-07-09
**Task (founder's words):** assess the main user-facing areas and judge the
improvements that move the app from very good to world class. Judgement done
hands-on in the main loop (Fable); all big reads delegated to cheap subagents
(Sonnet for flow reads, Haiku for mechanical sweeps) per the CLAUDE.md agent
tier rule. Output is a written assessment in this folder. No implementation
in this session unless the founder asks.

## How to resume this work

1. Read this file top to bottom.
2. Read every `facts-*.md` in this folder that exists (raw subagent fact
   extractions, saved verbatim; they are the evidence base).
3. If `ASSESSMENT.md` exists, it is the deliverable; resume by checking the
   "Stage log" below for the last completed stage and continue from the next
   unchecked stage.
4. Judgement rules of the road (decided this session, keep to them):
   - Facts come from subagents; ALL judgement is made hands-on against the
     locked voice doc (`docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`, esp. the
     honesty test in Section 1 and the founder override 2026-06-03) and the
     styling rules (`docs/rules/styling.md`).
   - Recommendations must respect the inviolable constraints in `CLAUDE.md`
     Section 2 (ED safety, tier binarity, deterministic engine, GDPR gate).
     Nothing in the assessment may propose weakening any of them.
   - This is an ASSESSMENT, not a build. Improvements are proposed and
     prioritised; every fork between "full thing" and "less" stays a founder
     decision (no-parking rule, founder 2026-07-03).

## Stage log (tick as completed; update this file at every stage)

- [x] **Stage 0 — orientation.** Listed 82 screens (`src/screens/`),
  component library (`src/components/`), confirmed branch. Read
  `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (first 60 lines: honesty test,
  founder override on naming) and `package.json` dependencies.
  Key calibration facts: polish toolkit already installed (Reanimated 4,
  Skia, FlashList, expo-haptics, expo-image, vision-camera, TFLite,
  Live Activities via `modules/live-activity` and `modules/rest-timer-live`,
  `react-native-android-widget`, `expo-quick-actions`, `expo-store-review`),
  so world-class gaps are about consistency of use, not missing capability.
- [x] **Stage 1 — fact extraction dispatched.** 8 read-only background
  subagents launched (7× Sonnet flow readers, 1× Haiku mechanical sweep).
  Coverage and where each report will be saved:
  | # | Area | Files covered (primary) | Saved to |
  |---|------|------------------------|----------|
  | 1 | Onboarding & auth | RootNavigator, Welcome/Login/FirstRun/Quiz/Article9Consent/GoalLockConsent/ProOnboarding/ProGoalSetup/ProSetupComplete/FreeStarter | `facts-onboarding.md` |
  | 2 | Home & daily hub | HomeScreen, YouScreen, TodayStrip, CoachDailyBrief, VolyumeTabBar, WhatsNewSheet, ActiveSessionMiniBar, AttentionCard, ConsistencyEcho, WeeklyStreakStrip | `facts-home.md` |
  | 3 | Workout logging | ActiveWorkout/WorkoutSummary/WorkoutHistory/LogCardio/CardioHistory, SetEntry, RestTimer, PRCelebration, ExercisePickerModal, rest-timer-live + live-activity modules | `facts-logging.md` |
  | 4 | Plans & builder | Plans/PlanLibrary/PlanDetail/PlanPreview/PlanUpdate/ManualBuilder/BuildWorkout/MesocycleBuilder/RoutineDetail/ExerciseDetail | `facts-plans.md` |
  | 5 | Nutrition (Pro) | Diary/FoodSearch/ScanBarcode/ScanLabel/AddCustomFood/MyMeals/MyRecipes/RecipeBuilder/MealPlan/NutritionTargets/PerDayTargets/FoodInsights/MealNames, components/food | `facts-nutrition.md` |
  | 6 | Coaching & progress | WeeklyCheckIn/CoachReview/CoachOutput/WeeklyStory/Analytics/LiftProgress/Consistency/VolumeHeatmap/YearOfLifts/BodyMetrics/ProgressPhotos/ShareCard/BlockReflection, components/coachOutput | `facts-coaching.md` |
  | 7 | Paywall & settings | Paywall/paywallExcerpts/ProUpgrade/Subscription/CascadeGate/Settings*/NotificationSettings, TierComparisonStrip, CancelReasonSheet, PostLapseSheet, ProGate | `facts-paywall-settings.md` |
  | 8 | Cross-cutting sweep (Haiku) | greps: a11y props, haptics, animation libs, reduced motion, EmptyState/Skeleton/ActivityIndicator coverage, Alert.alert use, hard-coded hex colours, font scaling, media, largest files | `facts-cross-cutting.md` |
- [x] **Stage 2 — collect facts (COMPLETE, 8 of 8 saved).** All eight
  reports saved verbatim: `facts-onboarding.md`, `facts-home.md`,
  `facts-logging.md`, `facts-plans.md`, `facts-nutrition.md`,
  `facts-paywall-settings.md`, `facts-coaching.md`, and
  `facts-cross-cutting.md` (this last carries four hands-on accuracy
  caveats in its header where the grep sweep conflicts with closer reads —
  read them before trusting its numbers).
- [x] **Stage 3 — judgement and synthesis (COMPLETE).** `ASSESSMENT.md`
  written hands-on: protect-list (what is already world class), eight
  per-area verdicts, prioritised P1/P2/P3 gap list, eight explicit founder
  decision questions (no-parking rule), and a what-NOT-to-do section.
  Core verdict: brains/ethics/resilience already world class; the gap is
  the sensory layer (media, haptics, drag, Live Activities, plate maths)
  plus reach (dynamic type, hints) and a few built-but-dark features.
- [x] **Stage 4 — verify + ship.** `npm run lint` passed clean
  (`eslint . --max-warnings 0`). `npm test`: 587 suites passed, 1 skipped,
  1 failed; 7,469 tests passed, 9 skipped. The single failure is
  ENVIRONMENTAL, pre-existing and unrelated to these docs-only changes:
  `progressScanVision.test.js` cannot resolve `react-native-fast-tflite`
  because that dependency was never installed in this remote container's
  node_modules (it is present in package.json and package-lock.json).
  Committed and pushed in stages: f148a96 (evidence), 617212e
  (assessment), plus the final scoping commit after this edit.
- [ ] **Stage 5 — reply to founder.** Summarise the verdict and the top
  improvements in chat; surface any founder-decision items as explicit
  questions (no-parking rule).
- [ ] **Stage 6 — NEW SCOPE (founder, mid-session 2026-07-09): dietary
  preferences and allergen exclusions.** Founder's words: "ensure the meal
  builder and planner builds the capability for the user to select dietary
  preferences vegan vegi and so on and exclude allergies perhaps. Research
  might be needed and maybe additions to meals and so on. Please scope this
  out as well." Plan: one Sonnet fact-reader over the meal-suggestion /
  meal-plan / recipe / food-DB domain (data model, suggestion engine,
  ingestion sources, where user prefs live, sync surface), then a hands-on
  scoping document `SCOPING-DIETARY-PREFERENCES.md` in this folder:
  requirements, data-model options, UK/EU 14-allergen framing, data-source
  reality (OpenFoodFacts allergen/ingredient-analysis tags vs bundled meal
  set needing manual tagging), ED-safety considerations (exclusion UX must
  not become a restriction tool; consult edPatternDetector context),
  phasing options and founder decision questions. SCOPING ONLY, no build.
  **DONE:** facts saved to `facts-meals-dietary.md`; scoping written to
  `SCOPING-DIETARY-PREFERENCES.md`. Headline: the engine half already
  exists (diet axis live + synced; FSA-tag exclusion mechanism live for
  plans); five gaps identified (diary suggestions unwired to prefs, no
  allergen data ingested for external foods, thin curated library for
  restricted diets, incomplete FSA vocabulary + buried UX, exclusions not
  synced). Six founder decision questions in that doc, section 7.

## FOUNDER RULINGS (2026-07-09, after the assessment landed)

See `DECISIONS-2026-07-09.md` in this folder for the full register. Short
form: media HOLD, Live Activities HOLD, plate calculator REJECTED, haptics
APPROVED, social proof NO, a11y/ease-of-use pass APPROVED with emphasis;
dietary = Phase A+B, sync diet+allergens, add pescatarian, soft nudge
guardrail. Build work proceeds in this session on this branch; per-stage
commits continue. Anything REJECTED/HELD must never be re-proposed.

## Current position

Stages 0 to 3 complete. Stage 4 (lint + test + ship) in progress. After
shipping, the only open work is Stage 5: the eight founder decision
questions in `ASSESSMENT.md` section 5 need founder answers before any of
the gated improvements (media, haptics, reorder, plate placement, RPE/RIR,
billing default, review excerpts, apply-all/giant sets) may be built.
No implementation has been started, deliberately.

## Decisions made this session (and why)

1. **Dated folder `docs/ux-world-class-audit-2026-07-09/`** over a single
   `docs/audit/*.md` file, because the evidence base (8 fact files) plus the
   handover plus the assessment is multi-file; matches the existing
   `docs/<topic>-audit-YYYY-MM-DD/` convention.
2. **Sonnet for flow readers, Haiku for the grep sweep** — the tier rule
   requires explicit opus/sonnet/haiku on every subagent; founder asked for
   the cheapest viable tier. Reading and faithfully describing UX flows is
   mid-weight (Sonnet); counting greps is bounded mechanical work (Haiku).
   Quality backstop: all judgement re-derives from quoted facts hands-on.
3. **Subagents forbidden from recommending** so the assessment's judgement
   is made in one place, at full quality, against the locked voice/styling
   docs rather than eight generic opinions.
4. **Commit and push after every stage** so a token cut or guardrail stop
   loses at most one stage of work.

## CONSOLIDATED ALL-WORKSTREAMS QUEUE (2026-07-09, founder: "the entire flow
## down" — cohesion mandate is a lens over the WHOLE backlog, not a replacement)

IN FLIGHT (batch, Sonnet): dietary Phase B meals; haptics rollout; cohesion
audit 1 (flow/language); cohesion audit 2 (novice/psychology).

NEXT BATCHES (tier-matched, ~4 at a time, in order):
1. Day-level plan reorder (OLD founder GO, verified UNBUILT: routines has no
   position column; only routine_exercises.order_in_routine exists). Additive
   local column + consumers + UI reusing the no-dep reorder pattern; cloud
   migration only if routines sync (agent verifies).
2. The 18 unapproved-parked items (old task): agent LOCATES the register in
   docs/ (not found by quick grep in the 2026-07-03 directive files), lists
   each item + status, builds the buildable to full spec, surfaces the rest.
3. Backlog-verify pass (HAIKU-grade mechanical): confirm which old campaign
   leftovers are actually done vs open — Partner/MealPlan skeletons,
   RecipeBuilder ModalHeader, header-trio docs, remaining Dimensions.get
   migrations, Card adoption count, EmptyState adoption, B-5 label
   consolidation. (shadow.glow at 3 Pro sites, letterSpacing sweep,
   quiet-hours UI: VERIFIED DONE 2026-07-09.)
4. Coverage-synthesis leftovers (Sonnet): FR-1 free-tier completion warmth,
   FR-3 Welcome hero beat, MO-5 CheerPill dialect, MO-6 Diary swipe
   transition. LT-3 light-elevation policy + CP-10 restart-free theming stay
   founder-decision items.
5. Cohesion build waves from the two audit docs once synthesised.
6. Adversarial bug/crash/security hunt (old queued task): re-sized to Sonnet
   finders + hands-on synthesis per the tier rule; token-heavy, fire when
   budget allows or founder says go.
7. P5 growth items (funnel events ship-ahead; review prompts + importers are
   propose-then-approve; quiz A/B log-only).

FOUNDER-SIDE (unchanged): migrations 110/111/112; App Groups + Live
Activities provisioning; fresh EAS build (new native dep + widgets); Play
OAuth SHA-1; Cut 4 seed walk.

## STAGE RECORD (2026-07-09, running log — append at EVERY boundary; founder
## rule: every change documented here so a cleared chat resumes from this file)

- Dietary Phase A COMPLETE + pushed (38df2ff). Agent-built: preferences into
  suggestion surfaces (curatedMeals/foodRoles/planPreferences/FoodSearchScreen/
  useAppStore), allergen_excludes profile sync with 4-step column-tolerance
  ladder + "only a real cloud array can change the local list" pull rule,
  pescatarian axis, SettingsDietaryScreen with soft tier-blind 15-exclusion
  nudge, migrate_112 (founder-run). Lead boundary fixes: profiles retry test
  now simulates an unmigrated cloud faithfully (asserts final attempt drops
  sex + allergen_excludes, core fields survive); SettingsDietaryScreen was
  built but UNREACHABLE — registered in RootNavigator + Pro-gated "Dietary
  needs" row (leaf-outline, "Diet, allergies and foods to avoid") in
  SettingsScreen's nutrition block. Lint clean; dietary+nav suites 134/134.
- Consolidated all-workstreams queue recorded (1c5f539) — see section above.
- IN FLIGHT now (4 Sonnet agents): dietary Phase B (~25-40 diet-tagged curated
  meals, data-only); haptics vocabulary rollout (builder/settings, existing
  vocabulary, none on ED/weight surfaces); cohesion-01 flow/language audit ->
  docs/ux-world-class-audit-2026-07-09/cohesion-01-flow-language.md;
  cohesion-02 novice/psychology audit -> cohesion-02-novice-psychology.md.
  Boundary on landing: builds get ED/food-naming grep + tests + reset-author
  + push; audit docs get committed then synthesised into a ranked cohesion
  build backlog (lens over the WHOLE queue above).
- Operating rules in force: Fable coordinates only (no long code/heavy
  reading); lowest capable agent tier; ~4 agents per batch to completion;
  per-stage handover append + push at every boundary; NO attribution in
  commits; reset-author rebase before every push.
- Cohesion-01 (flow/language) LANDED: cohesion-01-flow-language.md, 7 findings
  (A1/B4/C2). Headline CO-1: D4 naming ("The Coach" banned) unimplemented at
  20 sites/14 files incl. YouScreen:337 headline, MethodologyScreen:32, and
  nutritionEngine.js:402 (ED-safety FFM-floor line -> HANDS-ON restoration
  only) + 2 guard tests pinning wrong copy. CO-2 volume card no deep-link;
  CO-3 WorkoutSummary links; CO-5 "goal" 3 meanings; CO-6 tab-label grammar.
  CO-4 TodayStrip weight-only = founder-awareness only. Strong: navigateCrossTab,
  DiaryScreen training-day wiring, NAV-5 tab reset.
- Cohesion-02 (novice/psychology) LANDED: cohesion-02-novice-psychology.md,
  4 findings ALL SAFE (NV-1 plan-balance legend via GLOSSARY.volumeBands
  tooltip; NV-2 superset gloss in ManualBuilder + glossary entry; NV-3
  onboarding "starting volume" -> plain English; NV-4 baseline set/rep
  glossary entry). Daily loops friction-counted near best-in-class; no
  ED/shame/dark-pattern drift found; WorkoutSummary "down" verdict flagged
  PROTECT-THIS. NV fixes -> next build batch.
- FOUNDER DIRECTIVE (new): exercise-library expansion + weak-point
  set-stacking fix (6-set lat pulldown = junk volume; cap 3-4 sets/exercise;
  specialisation adds a DIFFERENT-angle exercise instead). PLAN-FIRST with
  agents: 2 Sonnet planners running -> docs/exercise-planning-2026-07-09/
  plan-A-library-expansion.md + plan-B-weak-point-sets.md (diagnosis +
  options + founder multiple-choice; engine changes remain founder-gated).
- Dietary Phase B LANDED (bfaf8cf): 26 new diet-tagged meals (94 total) -
  pescatarian 10, vegetarian 9, vegan 7 - all from existing staples, authored
  additions each, vegan 28g protein bar enforced (2 drafts resized not
  shipped short), calm naming, no schema/dep. Pool sizes now clear the
  no-repeat-more-than-twice-in-7-days bar on every restricted diet.
  mealPlanAssembler crushed-pool fixture tightened (excludeFoodKeys chickpeas)
  so the never-silently-under-fill invariant still genuinely bites.
  WATCH: haptics agent WIP transiently fails BuildWorkoutScreen.travelSheet
  guard - hold haptics to a green suite at its boundary.
- Haptics rollout LANDED (273613b): existing vocabulary only (selection/
  commit; Button primary CTAs already auto-fired), added to non-Button
  touchables across BuildWorkout/ManualBuilder/RoutineDetail + Settings
  (Display/Health/Profile/Dietary/main). Deliberately excluded: ED/wellbeing/
  weight surfaces, billing-adjacent screens, Stepper ticks, pure viewers.
  travelSheet guard updated (pinned pre-rollout literal). haptics.js stays
  the sole expo-haptics importer (importBan green). Full suite green.
  Batch state: builds done (Phase B bfaf8cf, haptics 273613b); 2 planners
  still out (plan-A library expansion, plan-B weak-point sets).
- Exercise PLANS LANDED (docs/exercise-planning-2026-07-09/): plan-A library
  expansion (449 exercises; VERIFIED holes: bands 0/449 with a live dead
  filter chip, zero vertical pulls in 3 real equipment contexts, unfillable
  rear-delt/hamstring patterns; rec = ~40 targeted fills; 5 founder Qs; note:
  seedRoutines curated plans do NOT auto-pick-up new exercises). plan-B
  weak-point sets (root cause: numExHint>5 threshold + MAX_SETS_PER_ENTRY=6
  at planEngine.js:1008-1010/1168; founder case reproduced 6+5; rec = Option
  2 cap 3-4 + numEx=ceil(target/cap) using existing angle metadata; 6 founder
  Qs; engine build = FABLE HANDS-ON when answered).
- FABLE ADVERSARIAL WHOLE-DIFF REVIEW (founder-chosen) IN PROGRESS. Findings
  so far: allergen-order sync equality = non-bug (LWW self-heals); REAL
  finding R1: mealAdditions carry no FSA tags + no exclusion filtering while
  explicitly allowing soya + mustard (both FSA allergens) -> allergic user
  can be shown their allergen as an addition on a filtered meal. Fix: tag
  allergen-bearing additions + filter by profile exclusions in
  CuratedMealSheet. R2 (CO-1 subset): nutritionEngine.js:402 FFM-floor hold
  insight says "The Coach has held" (D4 violation in ED-safety copy) ->
  hands-on one-word fix pending guard-test check.
- FOUNDER: adversarial whole-diff review HELD until everything else is done.
  R1 (additions allergen filtering) and R2 (nutritionEngine:402 D4 actor) are
  RECORDED ABOVE, NOT FIXED - do not fix until the review resumes. Exercise
  plan decision rounds (plan-A 5 Qs + plan-B 6 Qs) ready whenever the founder
  wants them; engine/library builds wait on those answers.
- Haiku leftover-verify LANDED (first Haiku agent; cheap, decisive). OLD
  CAMPAIGN LEFTOVERS NOW CLOSED as DONE: Partner/MealPlan SkeletonCard,
  RecipeBuilder ModalHeader, ALL Dimensions.get migrations (comments only
  remain), EmptyState 27 screens, Card 41 screens, styling.md header-trio +
  letterSpacing docs, eslint.config.js raw-letterSpacing ban, WhatsNew
  version-key (1.2.0 map). The stale "still outstanding" list in the
  design-usability campaign doc is superseded by this.
  ONE REAL TAIL: B-5 uppercase consolidation PARTIAL - 15 files hand-roll
  textTransform uppercase outside SectionLabel (screens: CoachOutput,
  CoachReview, DebugLog, GoalLockConsent, Import, PlanUpdate; components:
  BodyDiagramHeatmap, PartnerPrivacyReceipt, RestTimer, Toast, WeightTrendCard,
  FoodDetailSheet, MicronutrientPanel, QuickAddSheet, TodaysPlateTeaser).
  QUEUED as a Sonnet judgement sweep - distinguish true section-label roles
  (convert) from legit uppercase (keep); GoalLockConsent + PartnerPrivacyReceipt
  are consent surfaces: convert style tokens only if at all, never copy.
- Parked-items triage LANDED (parked-items-triage.md): the "18-item register"
  NEVER EXISTED (task-description folklore). True state from primary sources:
  33 items -> 4 done (verified), 19 superseded by recorded rulings (stay
  settled), 8 open (2 of which = the exercise rounds now answered as D8, so
  6 truly open: A2 rest-day notification re-spec, NAV-2 BodyMetrics
  edit/delete, VC-1 light-brand sign-off, RED-S/autoregulation wording
  (known), LT-3/CP-10 theming, Ultimate-Audit 11-16 (known)), and 2
  approved-but-unbuilt SMALL builds (getCoachOutputHistory deleted_at filter
  + see doc) -> QUEUED with the B-5 uppercase tail for the next small-batch
  slot. Old task #105 satisfied by this triage; opens go to ONE consolidated
  founder round later (not now - round fatigue).
- NV cohesion fixes LANDED (2b026dd): NV-1 Plan-balance InfoTooltip
  (GLOSSARY.volumeBands); NV-2 superset glossary entry + builder tooltip
  (copy modelled on the live-session modal so both teach the same thing);
  NV-3 onboarding line -> "Setting how much you'll train each muscle" (copy
  only, staging untouched, not in ONBOARDING_SEQUENCE_LOCKED); NV-4 set/rep
  glossary entries surfaced via ActiveWorkout's existing once-ever first-use
  hint gate. Suite green. Cohesion-02's four SAFE items now ALL BUILT.
- Unilateral plan LANDED (plan-C-unilateral-logging.md): THREE disconnected
  prior attempts found (laterality computed never read exerciseMetadata:130;
  orphaned unilateral.js toggle; dead legacy left/right_reps cols mig 054).
  NO competitor has solved unilateral logging = differentiator. Rec Option 2:
  two-phase per-side flow on the clusterSet pattern, one workout_sets row,
  actual_reps = lower side, first-timer walkthrough like the superset modal,
  no schema change, engine volume/PR invariant preserved. Founder round next.
- FOUNDER RULE (2026-07-09): max TWO agents at a time from now on (usage
  protection); each pair runs to completion before the next launches. The 4
  currently in flight (engine set-cap, library ~100, day-reorder, superset
  plan) drain naturally; no new launches until <=2, then strict pairs.
- Superset plan LANDED (plan-D-intelligent-supersets.md): intelligence already
  exists (assignSupersets planEngine:2278, shipped 5eb50d9 for this exact
  complaint) but migration v2 (database.js:419-422) MISTAGS Machine Shoulder
  Press/Shoulder Press as side_delts (should be front_delts) -> looks
  same-muscle with lateral raises -> "legit" tier-2 pairing; manual builder
  has zero pairing validation. QUEUED pair 2 (Option C): additive retag
  migration (also fixes front/side-delt volume tracking corruption) + share
  engine classifiers with builder for a calm non-blocking nudge. Agent health
  check 17:16: all four builders actively writing (mtimes seconds old).
- Day-level plan reorder LANDED (cd613a6) - OLD founder-GO closed: routines
  .position (local v61 + backfill), migrate_113 (founder-run; column-tolerant
  push retry until applied, per the 094/112 pattern), PlanDetailScreen
  reorder toggle + chevrons (no drag lib, tier-blind, optimistic swap +
  revert-on-failure), tests + source guard. Its 2 suite failures verified
  (stash test) as the ENGINE agent's in-flight planEngine WIP - hold engine
  to a green suite at its boundary. Founder-run migration queue now: 110,
  111, 112, 113.
- FOUNDER ASK (queued as plan-E, fires on next free slot per two-agent rule):
  adherence feedback + engine responsiveness investigation -> docs/
  exercise-planning-2026-07-09/plan-E-adherence-loop.md. Scope: (1) map every
  signal weeklyCoach/mesocycle consume; (2) VERIFY whether consistent
  OVER-performance accelerates progression or the engine only defends the
  downside; (3) audit encouragement surfaces (daily brief, runway, badge,
  mini-story, memory, missed-week) against "elegant, never pushy" + whether
  the BENEFIT of following the programme is ever explained; (4) options +
  short multi-choice round. Queue after: pair 1 (unilateral build +
  small-batch bundle), pair 2 (superset mistag fix + builder nudge).
- CORRECTION (founder): plan-E is about PROGRESS PHOTOS, not programme
  adherence. Rescoped -> plan-E-progress-photos-loop.md: (1) encouragement
  loop - is photo-taking elegantly encouraged with the benefit explained
  (ProgressPhotoPrompt exists - audit its triggers/tone), never pushy;
  (2) engine consumption - what the progress-scan assessment
  (progressScanVision + CoachOutputScreen.progressScanAssessment) actually
  feeds into coaching adjustments today, how deep; (3) the divergence case:
  logs/performance fine but photos show body-comp drift -> should the plan
  modify. PART 3 IS HARD ED-SAFETY TERRITORY: any photo-driven adjustment
  must be floors-intact, calm-framed, adherence-neutral, suppressed under ED
  flag/calm mode, and lands as FOUNDER OPTIONS not a build. Same queue slot
  as before.
- Library expansion LANDED (31c395b): 103 exercises (551->654), all plan-A
  holes re-verified FIXED via live pool-generator runs (bands 0->21 + chip
  works; hamstring hip_extension, rear-delt face_pull, incline chest, soleus,
  front-delt machine press, unilateral gaps). Seed v3 top-up (existing
  installs get them); canonical exercises confirmed local-only (no cloud
  migration). FORK SURFACED (not picked): plan-A's band-tagging fix for the
  loaded-plan vertical-pull hole contradicts the locked "bands never reach a
  loaded plan / measurable staples only" founder rule + tests. Agent added
  the band exercises (bodyweight context fixed), pinned current state in a
  test, left the loaded-profile question OPEN -> founder round.
- ENGINE D8 build: implementation COMPLETE + tested (founder repro now 4+4+3
  angle-diverse, weekly volume preserved; biceps subregion added; two
  pre-existing weekly-MRV trim bugs fixed to respect the new caps; mesocycle
  progression verified cap-safe; builder nudge live). Agent STOPPED correctly
  pre-commit on a new fork: 2-3 simultaneous weak points can inflate a session
  to 111-126 min (trim constants calibrated for old 2-exercise regime). LEAD
  RULING (under D8's recorded "bounded by the existing session budget"):
  Option A - retune WEAKPOINT/STRUCTURAL_SESSION_FLOOR_CAP + trim ceiling so
  the honest time ceiling wins; agent resumed to implement + commit; lead
  hands-on review of the FULL engine diff before push.
- ENGINE D8 LANDED + LEAD-REVIEWED + PUSHED (bf2e834): CAP_COMPOUND=4/
  CAP_ISOLATION=3, numExHint=ceil(target/4), growth loop + angle-diverse
  spill, biceps SUBREGION_REQUIREMENTS, 2 weekly-MRV trim bugs fixed, builder
  nudge (calm, once, no block). Option A resolved WITHOUT constant changes:
  root cause was _req protection granted to duplicate same-sub entries making
  sessions untrimmable; now first-per-sub only -> the 4 blown combos are
  79-96 min (ceiling 110). Founder repro = 4+4+3 angle-diverse. Lead review:
  scope/determinism/ED-clean/copy verified; independent suite run 44/44;
  lint 0. NOTE for library follow-up: live library has NO biceps subregion
  tags yet (pool fallback only) - when plan-A tags land, poolGenerator needs
  a SUBREGION_TRANSLATION.biceps pass-through.
- ALL PRE-PAIR WORK DRAINED. Pair 1 firing: plan-E progress-photos loop
  (Sonnet planner) + small-batch bundle (B-5 uppercase tail, D10 band
  exception, getCoachOutputHistory deleted_at + 2nd approved-unbuilt item).
- Plan-E LANDED (plan-E-progress-photos-loop.md): encouragement loop already
  strong (5 gated surfaces, dismissible, frequency-capped, usePhotoSuppression
  fail-closed, tone-guarded); engine consumption = deterministic evidence/
  receipt layer AROUND the engine (progressScanCoachEvidence/-CheckInEvidence,
  affectsTargets:false hard-coded + guard) with the founder's divergence case
  ALREADY the `conflicts` state (built by the parallel progress-scan
  workstream, merged today, 7fc4ba0/84cab3b). ONE GAP: the benefit of photos
  vs the scale is never explained anywhere. Founder round: confirm receipt
  layer sufficient + add the benefit line.
- Small-batch LANDED (e0c09ea D10 band exception test-pinned + verified via
  pool run; 34ac986 getCoachOutputHistory deleted_at + guard; b0f5766 B-5
  tail: 2 zero-visual conversions, 17 kept with role reasons, consent + ED
  headers untouched). Second "approved-unbuilt" item correctly REFUSED: it is
  Cut 4 (seed->.dat), the already-known founder-gated dedicated-window item -
  stays gated, not a fork. Pair 1 fully drained. NEXT: re-ask the photo round
  (transport error ate it), then pair 2: superset mistag fix + builder nudge.
- CI BREAK FIXED: both GitHub workflows (Android APK/AAB + Main CI) failed
  from the CP-7 push onward - expo-local-authentication was in package.json
  but NOT package-lock.json, so npm ci died at install. Lockfile regenerated
  (--package-lock-only, +13 lines) and pushed. LESSON pinned: any agent
  adding a dependency MUST update the lockfile; lead checks lockfile sync at
  every boundary where package.json changed.
- D11 benefit line LANDED (02fa63f, Haiku agent): "The scale can't tell
  muscle from water. Photos can." on ProgressPhotoPrompt + ProgressPhotos
  empty state, inside existing suppression gates, 219 photo tests green.
  Pair 2 slot B done; slot A (superset mistag fix + builder nudge) still out.
- FOUNDER MANDATE (2026-07-09): rate EVERY user-facing function of the app
  out of 10 -> a scorecard doc (function | score | what keeps it off 10 |
  what would make it 10), evidence-anchored in the existing audit corpus +
  code checks, honest not flattering. Goal: all areas legitimately 10/10 or
  as close as possible; the scorecard drives the next attention queue.
  QUEUED as a Sonnet agent for the next free slot (paired with the D13
  bundle). Output: docs/ux-world-class-audit-2026-07-09/SCORECARD.md.
  Function list must cover: first-run/onboarding (free + Pro), Home, workout
  logging, plans/builder/library, exercise library, rest timer, progress
  (analytics, photos, body metrics), coach (weekly review, daily brief,
  check-in, output), food (diary, search, barcode, label scan, curated/saved
  meals, recipes, targets, per-day, dietary needs), partners, share cards,
  settings (incl. app lock, widgets), notifications, lapse/read-only states.
- D12 diary de-clutter LANDED (03e3c1d): MicronutrientPanel deleted (VERIFIED
  diary-only; femaleNutritionAwareness on NutritionTargets is separate,
  untouched); mark-all banner moved below WaterRow (same gating/copy, position
  only, per-meal primary); one-time mark-eaten hint via the @volyume_seen_*
  convention, dismisses on first successful mark. 14-assertion D12 guard test.
  Suite green (env exception only; 1 lint warning = superset agent's live WIP).
- Superset fix LANDED (6087b7f): v62 retag migration (local-only, correctly no
  cloud counterpart), seedExercises fixed for fresh installs, founder pair now
  tier:null/practical:false (test-pinned), calm builder nudge, real-sqlite
  migration idempotency tests. SURFACED: Viking Press + Plate-Loaded Shoulder
  Press carry the SAME mistag (queued tiny retag extension, same ruling).
- D13 bundle LANDED (cc3ed7b): "First check-in: DD/MM/YYYY" (en-GB short);
  additions intro -> "Optional extras. Add any you fancy for flavour. They
  will not change the meal's numbers." + heading "Optional extras" (NOTE:
  FoodSearchScreen:896 has a hardcoded duplicate of the OLD intro - queued);
  Coach profile moved to directly beneath the hero (guard test satisfied).
- CI INVESTIGATION LIVE: Android build unblocked by the lockfile fix (in
  progress). Main CI still red on EVERY run in window with ALL TESTS PASSING
  and exit 1 - masked locally by the progressScanVision env failure.
  Diagnosing exit-code source (suspect: leaked process.exitCode / teardown).
