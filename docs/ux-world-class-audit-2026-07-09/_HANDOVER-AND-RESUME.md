# UX world-class audit — handover and resume note

**Branch:** `claude/codebase-audit-docs-pv6mjd` (began docs-only; now the
live BUILD campaign branch — app code changes land here too)
**Started:** 2026-07-09
**Founder standing orders (in force):** the app must feel like ONE
amalgamated application (cohesion mandate); Fable coordinates only, lowest
capable agent tier does the work; agents run in GROUPS OF TWO to completion;
ALL prior workstreams keep flowing; this handover is updated at EVERY
landing so a fresh chat resumes from this file alone; founder questions go
as structured multi-choice rounds, never walls of text.

## JOB BOARD (rewritten 2026-07-09 late; supersedes every earlier queue list
in this file — this section is the single source of truth for a fresh
session. Update it in place, do not append competing lists.)

### FINAL BURST 2026-07-09 (founder-ordered: 8 agents in flight, then
### PAUSE - resume tomorrow. On resume: check every landing below was
### committed; anything not landed appears in the stage log or sits
### uncommitted in the tree with a note.)
Running at pause time:
1. Notifications: amend locked Surface 6 to current app strings (D15) +
   rest-day notification spec doc (returns for founder sign-off).
2. Plan-G build: consecutiveExceededWeeks (N=3), bounded escalation +
   calm acknowledgement (D15 "Both"), adherence-why at Pro setup
   completion + first coach output (lead-delegated placements). ENGINE
   DIFF NEEDS HANDS-ON LEAD REVIEW at landing.
3. Workout finish confirm conditions (L07-F10) + PR re-detect on
   edit/delete (L07-F2).
4. First-run: FR-2 raw auth errors -> calm mapping + quiz progress bar.
5. Biceps subregion tags (seed + migration v64? check head) +
   SUBREGION_TRANSLATION.biceps pass-through (D8 residue). ENGINE-ADJACENT,
   lead review; agent told to STOP on any pinned-test conflict.
6. Partners cheer to ALL paired partners (L06-F4).
7. Free-tier height/DOB edit path (CP-8; sex + weight explicitly out of
   scope - weight is the NAV-2 founder round).
8. Workout summary onward links (CO-3, cohesion mandate register).

### After the burst (RESUMED 2026-07-09 late session; D16+D17 landed)
DECIDED this session (see DECISIONS D16/D17): CP-10 BUILD (plan-first
step approved as part of the build); CP-9 in-app FAQ screen; L08-B3 build
with billing test plan first; NAV-2 edit+delete+history; rest-day HELD
(gated+Variant A recorded for unblock; FQ-4/5 lead-ruled); training
reminder rebuilt on habit-derived weekdays + honest settings copy (lead
ruling under founder steer); B41 amend-to-live (lead-delegated);
payment-failure drift VERIFIED NON-ISSUE, closed; AY-7 announce with
exact visible text; LT-3 implement light-only Card shadow.

LANDED this session: Home decomposition (51c65d5); smalls bundle B41+
LT-3+AY-7 pin (df26d5a). D18 ruled: plan-F builds IN FULL, no staging.
D19 ruled: RED-S = lead drafts for founder sign-off; VC-1 light palette
APPROVED AS CODED (closed); plan-A band fork = narrowest exception
(bands may enter a loaded plan ONLY when the equipment context has no
measurable vertical-pull alternative) — QUEUED build.

BUILD QUEUE (two agents max, pairs to completion):
1. IN FLIGHT: plan-F FULL build per D18 (Opus; engine hunks get hands-on
   lead review at landing; no-commit).
2. IN FLIGHT: founder new-asks pair (Sonnet): meal additions "Add these
   extras too:" -> unambiguous optional/pick-any copy; Coach tab User
   (Pro) profile moved ABOVE the Coach box (supersedes D13 order; guard
   test update sanctioned with dated comment).
3. NEW FOUNDER ASK (2026-07-09): elegant one-time hint after adding
   meals from the meal builder to the diary — teach "select and Mark
   eaten (one meal or all) at end of day"; @volyume_seen_* convention;
   complements the existing D12 diary hint. NEXT SLOT.
4. Plan-A band exception build (D19 wording above, test-pinned).
5. NAV-2 weigh-in edit+delete+history (ED-adjacent bounds: floors/calm/
   ED suppression untouched, detection re-runs on corrected series).
6. Training reminder habit-schedule rebuild + honest settings copy (D17).
7. CP-9 in-app FAQ screen (voice-locked content).
8. L08-B3: lead WRITES billing test plan -> founder approval -> build.
9. CP-10 restart-free theming plan-first investigation (big; then build).
- Lead hands-on outstanding: RED-S two glossary entries draft -> founder
  sign-off; L08-B3 test plan; review plan-F engine hunks at landing.
- Founder rounds remaining: Ultimate-Audit 11-16 cluster (needs
  pass4-blueprint extraction first); plan-F Tier-1 study revisit (later).
- HELD: adversarial review (R1 fix belongs to it), media, Live Activity,
  rest-day notification.

### Superseded original section (kept for history):
### Running now (the current pair of two)
1. **D9 unilateral logging BUILD** (Sonnet). Full spec =
   `docs/exercise-planning-2026-07-09/plan-C-unilateral-logging.md` + D9
   and its two amendments in
   `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`.
   Two-phase per-side on the clusterSet pattern; suggest-and-confirm via
   laterality metadata (`src/lib/exerciseMetadata.js:130-135`, currently
   unread); rest by exercise class (compound = half rest between EVERY
   side; isolation = switch-sides prompt + full rest after the pair); ONE
   workout_sets row, actual_reps = lower side; first-timer walkthrough via
   the `@volyume_seen_*` one-time-hint convention. Lead reviews diff
   before commit.
2. **CO-1 "The Coach" naming sweep** (Sonnet). Rule = the actor-naming
   addendum in `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md` (~line 795);
   approval = D14 Group B. ~20 sites / ~14 files; nutritionEngine.js:402
   already restored HANDS-ON to "Precision Coaching has held your calorie
   target." (68/68 engine tests green, committed with plan-F).

### Queued next (fire as slots free, two at a time) — all founder-approved
under D14 Group A (see DECISIONS-2026-07-09.md D14 for the full ruling)
- **Home bundle:** AC-3 ink bug (`HomeScreen.js:1643,2391` →
  `colors.onPrimary`) + banner cap (lead-ruled under founder delegation:
  ONE attention banner max via the existing `pickAttentionVariant`
  priority; others wait their turn).
- **Charts bundle:** LT-6 gridline contrast (`VolyumeChart.js:236`) + CP-5
  PR markers on the per-exercise trend line (highlightIndices).
- **Picker bundle:** L07-F6 fuzzy/typo-tolerant search + L07-F7 recents row
  in `ExercisePickerModal`.
- **History bundle:** text search across workout history + session/workout
  terminology drift (L01-B37).
- **Food copy bundle:** `FoodSearchScreen.js:896` old additions intro;
  L05-MR1 recipe-row macros; L05-MM2 "Check your connection" miscopy (3
  screens, local reads); L05-FS1 "Custom" tab relabel.
- **Smalls bundle:** AY-6 share-segment `accessibilityState` on
  ShareCardScreen; CP-6 Settings "Workout & units" → own sub-screen;
  Viking Press + Plate-Loaded Shoulder Press retag (same ruling as v62);
  CO-2 "see your updated plan" link on the CoachOutput training card.

### Founder rounds queued (bring as multi-choice, in this order — D14)
1. Notifications: locked Surface 6 wording drift (restore vs amend the
   locked doc) + rest-day notification A2 (re-specify / shelve / kill).
2. Settings cluster: CP-10 restart-free theming (architectural), CP-9
   Help/FAQ path, L08-B3 post-cancel calm forward link (billing-adjacent,
   written test plan required per docs/rules/billing.md).
3. Weigh-in edit/delete (NAV-2): edit-only / edit+delete+history / as-is.
4. Plan-F photo corroboration (4 questions at the end of
   `docs/exercise-planning-2026-07-09/plan-F-photo-corroboration.md`).
5. Consolidated triage round: CP-10/LT-3 + the 6 truly-open items from the
   parked-items triage (see stage log entry).
NOT selected by founder this round: RPE/RIR revisit (stays settled-removed).

### Investigations queued (plan-style, no build without a ruling)
- Adherence/over-performance: does the engine accelerate when a user
  over-performs, and is the benefit of following the programme explained?
  (Founder asked 2026-07-09; treat as plan-first.)
- SUBREGION_TRANSLATION.biceps pass-through once library subregion tags
  exist (residue from the D8 engine fix).

### HELD by explicit founder order (do NOT start)
- **Adversarial whole-diff review** — held "until we are done everything
  else". Recorded finding awaiting it: R1 = curated-meal additions carry
  no FSA allergen tags/filtering (soya, mustard reachable by allergic
  users — top scorecard risk; the fix belongs to the review's resumption).
  R2 = CLOSED separately under D14 (the nutritionEngine.js:402 restore).
- Exercise media (video/images) — founder HOLD.
- iOS rest-timer Live Activity — founder HOLD.
- Cut 4 seed→.dat — needs a dedicated window + first-install device walk.
- Old task #128 (adversarial hunt) — fires with the held review.
- Old task #86 (P5 growth: funnel events, review prompts, importers).

### Founder-side actions outstanding (not Claude's to do)
- Run supabase/migrate_110..113 on EU-Dublin (049/059 remain HELD).
- Apple: App Groups (group.app.volyume.widget) + Live Activities
  provisioning; fresh EAS build (new native dep expo-local-authentication).
- Confirm Google Play OAuth SHA-1.

### Key reference docs (full paths — read before acting)
- Scorecard: `docs/ux-world-class-audit-2026-07-09/SCORECARD.md` (25
  functions rated; the top-8 attention list drives the queue above).
- Decisions D8–D14: `docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`
  (includes the REJECTED/never-re-propose register).
- Exercise plans A–F: `docs/exercise-planning-2026-07-09/`.
- Coverage synthesis: `docs/design-usability-audit-2026-07-09/coverage-00-SYNTHESIS.md`.
- Locked voice + actor naming: `docs/COACHING_VOICE_SYNTHESIS_LOCKED.md`.
- CI leak post-mortem: stage log entry "CI EXIT-1 LEAK FIXED" below.

## How to resume this work

1. Read this file top to bottom (the JOB BOARD above is the truth for what
   runs next; the stage log below is the history of every landing).
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
- FOUNDER RULE (2026-07-09 resume session, standing): update and PUSH the
  handover + decision documents after EVERY completed pair of agent tasks
  (not just at session end), so a guardrail stop or chat loss never costs
  progress — a clean context must be able to resume fully and in detail
  from the docs alone. Max TWO agents in flight (re-affirmed).
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
- SCORECARD LANDED (docs/ux-world-class-audit-2026-07-09/SCORECARD.md, Sonnet
  agent, method: re-verified every low-score claim against branch tip 87ee57e,
  not stale audit docs). 25 functions scored. Lowest (all 6/10): Home/Today,
  Notifications, Curated meals/recipes/additions, Share cards, Widgets+Live
  Activity. Highest (8/10): Progress analytics, Mesocycle engine, Plan
  library, Daily brief, Food diary, Food search, Barcode. Top-8 attention
  list inside; #1 Home banner cap + AC-3 ink-token bug (HomeScreen.js:1643,
  2391 - two-line fix + founder nod on cap), #2 R1 allergen gap (HELD with
  the adversarial review), #3 CO-1 "The Coach" naming sweep (D4 decided,
  unbuilt, 20 sites incl. nutritionEngine.js:402 hands-on). Confirmed FIXED
  since morning audits: AY-1/AY-2/AY-5, AC-1/AC-2/AC-5, LT-1 incl. billing,
  MO-1, ShareCard fallback, biometric lock, iOS widget. Confirmed STILL OPEN:
  CO-1, AC-3, CP-6, CO-2/CO-3, R1, AY-6 (share segment SR state), LT-6
  (gridlines), L07-F6/F7 (fuzzy search/recents).
- Android build GREEN on 87ee57e (signed APK+AAB success) - founder's "APKs
  failing to build" ask RESOLVED (lockfile fix ef77eb5). Main CI still red =
  the jest exit-1 leak only; Sonnet debug agent live on it (order-sensitive
  leak in src/screens combination runs; instrumenting exitCode per suite).
- CI EXIT-1 LEAK FIXED (ac28db2, Sonnet debug agent): culprit was
  WeeklyCheckInScreen.scanEvidence.test.js "submit with no scan" test.
  Submit flips Button into its success phase (SUCCESS_HOLD_MS = 900ms REAL
  setTimeout); the test never unmounted, so under --runInBand the timer
  fired ~900ms later mid-later-suite, setState on a torn-down tree outside
  act() -> jest frozen-console "Cannot log after tests are done" -> sets
  process.exitCode = 1 (jest-runner runTest.js:149) with ALL suites passing.
  Fix: await act(unmount) at test end, running Button's own clearTimeout
  cleanup. Verified by agent: screens repro exit 0 (95 suites/700 tests),
  full suite exit 0 (592 suites/7,537 tests), lint clean, test-file-only
  diff. LESSON pinned: tests that trigger the Button success beat must
  unmount (or the beat leaks a real timer process-wide under --runInBand).
  Awaiting Main CI green on GitHub to close the founder's build ask fully.
- MAIN CI GREEN CONFIRMED on faf12f0 (first green in the window); Android
  build green on 87ee57e and running on faf12f0. Founder build ask CLOSED.
- PLAN-F LANDED (docs/exercise-planning-2026-07-09/plan-F-photo-corroboration.md,
  Sonnet, plan only, no source touched): validation answer = NO evidence yet
  (Tier 1 volunteer study never run; Tier 2 DEXA programme not started);
  photos never leave device (no sync registry entry, zero upload calls);
  engine attachment point identified = assessDataConfidence -> confidence.level
  (weeklyCoach.js:1407); staged rollout 0/1/2 with 4 founder questions at
  the end (bring as a structured round AFTER the current D14 clusters).
- D14 RECORDED (see DECISIONS-2026-07-09.md): Group A approved in full,
  CO-1 sweep approved, banner cap delegated -> lead ruled ONE banner max,
  Group C rounds = notifications, Settings cluster, weigh-in edit/delete.
- HANDS-ON: nutritionEngine.js:402 restored to pre-drift locked register
  ("Precision Coaching has held your calorie target."), verified against
  ae42b4d^ history; nutritionEngine suite 68/68 green. R2 finding CLOSED
  under D14 (founder-approved sweep), independent of the held review.
- CO-1 NAMING SWEEP LANDED (Sonnet, lead-reviewed): 19 sites + 3 test
  updates across 18 files brought into the D4 two-register rule ("Precision
  Coaching" branded / "your coach" running prose). Included 3 case-variant
  sites the original audit grep missed (PaywallScreen "Start Precision
  Coaching", AttentionCard + ProSetupComplete methodology links). Left
  alone: "Coach tab" navigation references (separate CO-6 finding),
  lowercase common-noun "the coach" uses (flagged, not in D4 scope), code
  comments. Judgement calls recorded in the agent report: CoachOutput:2435
  and coachGlossary engineLog gloss read as branded surfaces. Lint clean;
  97 screen suites green; restSuggest.test.js failure confirmed to come
  from the unilateral agent's live WIP, not this sweep (stash-verified) -
  MUST be green again when the unilateral build lands.
- D9 UNILATERAL LOGGING LANDED (Sonnet build, lead-reviewed diff): two-phase
  per-side flow in ActiveWorkoutScreen on the cluster-banner pattern;
  laterality metadata wired (database.js getRoutineExercisesWithDetails now
  selects e.laterality - query-only, no schema change); suggest-and-confirm
  with sticky per-exercise asked/enabled prefs (@volyume_unilateral_* keys);
  rest by class per amendment 2 (compound: half rest between sides AND
  after pair, ceil-rounded; isolation: switch-sides prompt, full rest after
  pair); ONE workout_sets row, actual_reps = lowerSideReps, "L 10 / R 9"
  breakdown in notes (legacy left/right_reps columns stay dead); first-ever
  walkthrough modal + light confirm for later exercises + manual overflow
  toggle. restSuggest guard updated to pin the new fullRest shape (formula
  unchanged). 59 tests across 3 suites green, lint clean. 10-step Android
  device checklist in the agent report (chat log, this landing). Old
  orphaned single-tap design documented as superseded in unilateral.js
  header. JOB BOARD: unilateral moved from Running to DONE; Home bundle
  running; concurrency limit raised to THREE agents (founder, 2026-07-09).
- HOME BUNDLE LANDED (Sonnet, lead-reviewed): AC-3 ink fix (continue card
  chevron + subtitle -> withAlpha(colors.onPrimary, 0.8); continueIcon
  backing verified as genuine fill, untouched). Banner cap D14: single
  shownBannerKey = highest-priority ELIGIBLE banner from BANNER_PRIORITY
  (verified filtered by eligibility); superseded the interim top-2+overflow
  model; no trigger/dismiss logic deleted; all 7 stack members classified
  capped (none ED/consent - ConsistencyEcho independent, Article 9 gates in
  RootNavigator upstream). D14 decision-log wording CORRECTED: master
  ranking is BANNER_PRIORITY, not pickAttentionVariant (which only orders
  the attention card's sub-variants). Guard tests rewritten for the new
  model; 97 screen suites/720 tests + 4 banner guards/28 tests green, lint
  clean. JOB BOARD: Home bundle DONE; Charts + Picker bundles running;
  History bundle firing into the third slot.
- PICKER BUNDLE CLOSED (Sonnet verify+tests): L07-F6 fuzzy search and
  L07-F7 recents row were ALREADY BUILT on this branch (commits 82f420b,
  e935be4 - pre-existing, spec-verified solid: token AND-matching,
  exact>prefix>substring>subsequence>Levenshtein, deterministic ties;
  getRecentlyUsedExerciseIds database.js:~2465; free-tier; recents hidden
  during search/filters/swap). Agent added the missing test coverage: 5
  tests for the recents DB read + spec-literal fuzzy cases ("dumbell
  press", "lat pulldwon"), determinism, exact-outranks-fuzzy. 29/29 green,
  lint clean. Timing sub-frame (worst ~18ms full-list). LEAD BLESSED the
  flagged deviation: recents row also hides when muscle/equipment filter
  chips are active (entry point into an untouched browse, not a filter) -
  keep. SCORECARD note: exercise library/picker gaps L07-F6/F7 now closed.
- FOUNDER (2026-07-09, late): concurrency REVERTS to TWO agents max once
  the current three in flight (Charts, History, Food-copy) land - token
  budget running tight for the 5-hour window. Prefer cheaper tiers even
  more aggressively; Smalls bundle fires only as part of a pair.
- HISTORY BUNDLE LANDED (Sonnet, lead-reviewed): history text search was
  mostly pre-built (e935be4); agent closed the routine-name gap (predicate
  now matches workout name, routine name, exercise names - data already on
  the row, no db change) and fixed L01-B37 card drift ("Couldn't repeat
  session" -> workout; delete-confirm body "session" -> workout; "workout"
  is the dominant app term 228:174). LEAD BLESSED the scoping call: the
  screen's "X sessions" header/calendar labels are internally consistent,
  left alone (screen-wide rename would be a drive-by). 4 new tests; full
  suite 595/596 green (env exception only); lint clean.
- CHARTS BUNDLE LANDED (Sonnet, lead-reviewed): LT-6 was already fixed
  (9c44e2d removed the 0.5 gridline alpha); agent added the missing
  contrast regression tests (border vs surface/background: dark 3.45/3.81,
  light 3.25/3.10 - all clear WCAG 3:1). CP-5 PR markers: VolyumeChart
  highlightIndices prop (line variant, theme.gold ring, bounds-checked,
  scrub announcement appends ", Personal best"); ExerciseDetailScreen
  derivePRSessionDates replays detectPR (algorithms.js:538, same engine as
  log time) chronologically with the Wave-A first-lift exclusion mirrored.
  LEAD BLESSED the flagged call: markers show on ALL five chart lenses (a
  PR is a fact about the session, lens-independent). New VolyumeChart suite
  (9 tests) + 7 derivation tests; full suite 596 green (env exception
  only); lint clean.
- FOOD COPY BUNDLE LANDED (Sonnet, lead-reviewed): FoodSearchScreen stale
  additions intro now IMPORTS canonical ADDITIONS_INTRO (can never drift
  twice; guard test pins it; verified the only remaining duplicate site).
  Recipe rows now show energy+protein PER SERVING, labelled, via new pure
  perServingTotals (macros.js, divide-by-zero guarded), respecting kcal/kJ
  pref. L05-MM2 miscopy and L05-FS1 tab relabel were ALREADY FIXED in
  569441f ("More" tab, reasoned + tested) - agent verified and added the
  missing label regression test. LEAD BLESSED: keep "More" (honest for
  scan/quick-add/recipes/saved contents); intro placement without heading
  at the suggested-list tip site is correct (not a meal-detail additions
  section). 12 new tests; full suite 598 green (env exception only); lint
  clean. GROUP A STATUS: 5 of 6 bundles landed; Smalls bundle in flight.
- PLAN-G LANDED (docs/exercise-planning-2026-07-09/plan-G-adherence-responsiveness.md,
  Sonnet, read-only): VERDICT (1) engine DOES respond to over-performance
  at two levels already (per-exercise top-of-band load suggestions,
  algorithms.js:295-490; weekly -2..+3 set push from PRs + derived
  trainingPerformance, weeklyCoach.js:170-203, MRV-clamped confirm-then-
  apply) - the founder's "faster progress" case is partially served;
  (2) the adherence-benefit "why" sentence EXISTS but hides behind an
  info-icon tap (ReadinessCards.js:182) - same gap shape as plan-E's
  photo benefit; T8 calm missed-week + streak surfaces confirmed correct;
  (3) safest acceleration attachment = consecutiveExceededWeeks counter
  mirroring consecutiveOffTargetWeeks, bounded one-step volumeSignal
  escalation OR copy-only acknowledgement, floors/gates untouched;
  (4) 4 founder questions at doc end - ADD to rounds queue after the
  D14-selected three. JOB BOARD: investigations queue now empty (plan-G
  done); awaiting Smalls bundle (last Group A item).
- SMALLS BUNDLE: 3 of 4 LANDED (Sonnet, lead-reviewed): AY-6 share
  segments announce selection (shared SegmentBtn fix covers all three
  rows); CP-6 "Workout & units" moved wholesale to new
  SettingsWorkoutScreen (same keys/behaviour; root row after Coaching -
  lead blessed placement); CO-2 "See your updated plan" link on the
  training card (same style/a11y as the nutrition sibling; targets Plans
  landing - no plan id on this screen). 14 new tests; lint clean.
- RETAG HELD - FOUNDER FORK OPEN (no-parking rule, surfaced immediately):
  the approved Viking Press + Plate-Loaded Shoulder Press front_delts
  retag (v63 migration, written and working) trips the FOUNDER-SET
  division-specialisation gate: planengineRebuildPhase2.test.js
  overlapPct(bikini, mensPhysique) rises 0.50 -> 0.56 (stash-verified
  cause; poolGenerator.js:55 maps all front_delts to sub 'press' while
  side_delts:38 only maps overhead_press). Retag diff sits UNCOMMITTED in
  the tree (database.js v63, seedExercises.js, frontDeltMigration tests -
  9/9 pass). Founder options: (a) pool-rule fix so overlap returns <50,
  (b) raise the gate, (c) narrow the retag. DO NOT commit until ruled.
  ALSO PENDING: founder decision round (notifications drift, rest-day A2,
  plan-G acceleration + adherence-why) - asked once, founder deferred;
  re-raise when founder is ready, never silently drop.
- D15 RULED AND LANDED: v63 retag committed (Viking + Plate-Loaded
  Shoulder Press -> front_delts, migration + seed + 9 idempotency tests)
  with the overlap gate raised 0.50 -> 0.60 per founder ("Raise the
  gate"; measured 0.56). Rulings recorded in DECISIONS D15: amend locked
  doc for notif drift; re-specify rest-day; plan-G = BOTH (ack copy +
  bounded escalation), lead-delegated N=3 and adherence-why placement =
  onboarding + first coach output. NEXT PAIR: (1) notifications agent
  (amend Surface 6 to current strings + rest-day spec doc), (2) plan-G
  build agent (engine diff gets hands-on lead review at landing).
- BURST LANDING 1/8 NOTIFICATIONS (Sonnet, lead-reviewed): Surface 6
  amended per D15 (weekly-coach-ready + both cascade-gate strings now
  match code verbatim, dated founder-amendment addendum; cascade-21 got
  its missing entry; NOTIFICATIONS_LOCKED already matched). Rest-day spec
  written (rest-day-notification-spec.md): 2 copy variants, habit-class
  trigger, quiet-hours shift, 5 founder questions FQ-1..5. CRITICAL
  FINDING FQ-1: @volyume_schedule_v1 (the training-day reminder's own
  schedule substrate) appears NEVER WRITTEN anywhere - the existing
  training reminder may be dead on live devices; founder question, not
  patched. EXTRA DRIFT flagged NOT amended (needs founder): B41 weekly
  check-in reminder strings; payment-failure push (appStore.ts:248) -
  both added to tomorrow's rounds queue.
- BURST LANDING 2/8 FIRST-RUN (Sonnet, lead-reviewed): FR-2 raw auth
  errors were ALREADY FIXED (c1addd5, calm fallback "That didn't go
  through. Try again." - lead accepts this register over the suggested
  literal); agent added the missing ProOnboarding guard test. Quiz
  progress dots added to QuizScreen (the audit-named zero-indicator
  screen; FreeStarter already had dots), reusing FreeStarter's exact
  pattern; answered-count semantics (single-page quiz). NOTE: QuizScreen
  sits behind ONBOARDING_QUIZ_FIRST=false (quizFlow.js:23) - not
  user-reachable until founder flips the flag. 14 targeted tests green,
  lint clean on touched files. WATCH: src/lib/widgets storage.test.js
  reported failing on the shared tree mid-burst - verify at final
  boundary (likely concurrent WIP interplay).
- BURST LANDING 3/8 WORKOUT FINISH + PR (Sonnet + lead edge-case fix):
  L07-F10 finish confirm now conditional via pure
  shouldConfirmBeforeFinish (confirm when zero sets OR a planned
  non-timeCrunchSkipped exercise has none; instant finish otherwise).
  LEAD closed the flagged edge hands-on: skip path also requires
  !hasInProgressSetEntry() so a typed-but-unlogged set never silently
  drops. L07-F2 PR re-detect was ALREADY BUILT (69e1937, verified
  line-by-line); agent added the missing contract tests (revoke on
  edit-down, award on edit-up, delete prunes, sibling survives). All
  suites green, lint clean.
- BURST LANDINGS 4+5/8 WORKOUT SUMMARY (joint commit, shared file,
  lead-reviewed combined): L06-F4 partners - one cheer card per active
  paired partner (activeBeatPairs map, per-pair send state/moments/a11y
  labels; pairId passed to Preview win; no schema change - cheer RPC was
  already per-pair; PartnerRow stays dead). CO-3 cohesion links - quiet
  pill row after the PR banner: "See your progress[ on {lift}]" (PR or
  strong 4-week verdict) and "See this week's coaching review" (reuses
  the T2 hasUnseenCoachChange badge signal, pro + withProGuard
  triple-safe; never generic upsell; read-only view shows neither).
  LEAD BLESSED: per-partner cards idiom, pairId preview targeting, link
  placement at the PR-banner seam, two-variant progress copy. 32
  guard/contract tests green on the combined file, lint clean.

## EMERGENCY SNAPSHOT (2026-07-09, ~4% of budget left - READ THIS FIRST ON RESUME)
Committed+pushed through "Cheer every paired partner..." (5 of 8 burst
landings done: notifications docs, first-run, workout-finish+PR,
partners+summary-links joint). Main CI green as of faf12f0 lineage.

3 AGENTS WERE STILL IN FLIGHT; their WIP sits UNCOMMITTED in the tree:
1. PLAN-G BUILD (D15 "Both", N=3): weeklyCoach.js, CoachOutputScreen.js,
   ProSetupCompleteScreen.js (+ likely lib tests). ENGINE-ADJACENT: on
   resume, get/read the agent's final report if it landed; otherwise
   review the diff hands-on against plan-G-adherence-responsiveness.md +
   D15 (bounds: one extra step max, MRV clamp, confirm-then-apply, resets
   on non-exceeded week, blocked by every hold/ED flag; ack copy only
   when escalation fires; adherence-why at ProSetupComplete + first coach
   output once each). Run src/lib/__tests__ engine suites before commit.
2. BICEPS SUBREGION (D8 residue): seedExercises.js, database.js (new
   migration after v63 - verify number + header), poolGenerator.js (?!),
   database.bicepsSubregion.test.js, frontDeltMigration.test.js,
   poolGenerator.test.js. NOTE poolGenerator.js was NOT in its brief -
   check that diff carefully; agent was told to STOP on pinned-test
   conflicts, so a poolGenerator edit may be its translation pass-through
   (SUBREGION_TRANSLATION lives there or planEngine) - verify against
   the D8 pattern; planEngine suites must ALL pass, no threshold changes.
3. HEIGHT/DOB (CP-8): SettingsProfileScreen.js (new-ish),
   SettingsScreen.js, NutritionTargetsScreen.js, AthleteProfileScreen.js,
   new AgeYearsField.js + HeightFeetInchesField.js components + test.
   Bounds: sex + weight NOT editable there; shared components with the
   Pro surface; free-reachable.
IF the agents' reports are lost: the diffs themselves + the briefs above
are sufficient to review and land each; nothing else was in flight.

AFTER LANDING THOSE THREE: full lint + jest (ignore progressScanVision
env failure), stage-log each landing, push. Then TOMORROW'S QUEUE (see
job board above): founder rounds (Settings cluster, NAV-2 weigh-in,
plan-F 4 questions, rest-day spec FQ-1..5 incl. the possibly-dead
@volyume_schedule_v1 finding, B41 check-in drift, payment-failure drift),
Home decomposition, AY-7 wording. HELD: adversarial review + R1.
Founder-side: migrations 110-113 (+ any new from tonight - CHECK
supabase/ for additions), App Groups + EAS build, OAuth SHA-1.
- BURST LANDING 6/8 BICEPS SUBREGION (Sonnet, lead-reviewed): 36 seed tags
  (9 long_head / 20 short_head incl. general bucket / 7 brachialis, tag
  table + reasoning in agent report), migration v64 (idempotent, local
  only, rollback documented; LIBRARY_VERSION top-up correctly N/A),
  SUBREGION_TRANSLATION.biceps pass-through in poolGenerator.js (the
  brief wrongly said planEngine - constant lives in poolGenerator,
  correction accepted). D8's biceps requirement now binds: real-library
  weak-point plan covers both heads, determinism checked. ALL 12
  planengine suites / 240 tests pass untouched; 81/81 targeted; lint
  clean. EMERGENCY SNAPSHOT above: item 2 now LANDED; plan-G and
  height/DOB still in flight.
- BURST LANDING 7/8 HEIGHT/DOB (Sonnet, lead-reviewed): CP-8 closed -
  height + age editable on the free SettingsProfileScreen (the audit's
  own proposed placement), shared HeightFeetInchesField/AgeYearsField
  components extracted and NutritionTargets refactored onto them; saves
  mirror the changeSex dual-write (user_body_profile + local profile),
  on-blur like the name field; sex stays chip-only, NO weight field
  (NAV-2 remains founder-gated). 13 new tests + mounts green, lint
  clean. FLAGGED for a future round: NutritionTargets' own height/age
  inputs remain calculation-ephemeral (never persisted) - founder may
  want them persisting on Calculate too. ONLY PLAN-G still in flight.
- BURST LANDING 8/8 PLAN-G BUILD (Sonnet, ENGINE HUNK LEAD-REVIEWED
  HANDS-ON at weeklyCoach.js:1313-1351 - approved: escalation requires an
  existing push, exactly one step, +3 matrix ceiling AND downstream MRV
  clamp untouched, blocked by deload/matrixDeload/poorRecovery/safetyHold/
  ffmFloorHeld/edPatternHeld/rapidWeightLoss/scoffPositive/calmMode,
  deterministic named inputs): consecutiveExceededWeeks derived in
  CoachOutputScreen mirroring consecutivePoorRecoveryWeeks; ack line
  "You have been ahead of your plan for three weeks running..." fires
  only with the escalation; adherence-why lines at ProSetupComplete +
  first coach output (both avoid weight references; ED-flag render test
  included). exceededEscalationApplied returned explicitly (avoids the
  latent consecutiveOffTargetWeeks persistence gap - that pre-existing
  gap NOTED for a future fix, not touched). 29 new tests; 252 lib suites
  /3571 tests green; lint clean. FLAGGED (accepted by lead): diet-break
  copy shadows the ack line on coinciding weeks, matching the existing
  push_volume precedent.
- ALL 8 BURST LANDINGS COMMITTED. Session PAUSED here by founder order
  (budget). Emergency snapshot above is now historical - tree is CLEAN.
  Resume from "After the burst (tomorrow's queue)" in the job board.
- RESUME SESSION LANDINGS (2026-07-09 late): Home decomposition (51c65d5);
  smalls B41+LT-3+AY-7 pin (df26d5a); extras pick-any copy + Coach tab
  profile-above-status reorder (093fc18, supersedes D13.3 order, guard
  updated). D16-D19 recorded + pushed. RED-S wording founder-APPROVED as
  live (closed); VC-1 CLOSED approved-as-coded. L08-B3 test plan written,
  founder PROCEED granted (0be00ee). Standing order: lowest capable agent
  tier always. IN FLIGHT: plan-F FULL build (Opus, D18, engine hunks get
  hands-on review); mark-eaten add-flow teach + L08-B3 link (Sonnet).
  QUEUE after: band exception (D19), NAV-2 (D16), training-reminder habit
  rebuild (D17), CP-9 FAQ, CP-10 investigation, Ultimate-Audit 11-16
  round prep (Haiku extraction of pass4 blueprints).
- FOUNDER ASK (2026-07-09, resume session): dietary needs are hidden in
  Settings — add a "Dietary needs" entry point in the Meal Builder's Meal
  preferences so users can set needs BEFORE meals are built. Shape agreed:
  a row inside Meal preferences opening the existing SettingsDietaryScreen
  (single source of truth), with a live summary of current selections
  (e.g. "Vegetarian · 2 foods excluded"). Pro surface (builder is Pro).
  QUEUED NEXT — blocked until the mark-eaten agent lands (it is editing
  MealPlanScreen.js right now).
- FOUNDER CLARIFICATION (same ask): needs set from the Meal Builder are
  REMEMBERED AS THE USER'S DEFAULT and appear ticked in Settings too.
  Satisfied by the single-source-of-truth shape already queued (both
  entry points open the same SettingsDietaryScreen over the same synced
  profile fields — one store, two doors, can never disagree). The build
  agent must include a test proving a selection made via the builder
  entry point is reflected in Settings state and vice versa.
- PAIR LANDED (2026-07-09): mark-eaten add-flow teach + L08-B3 post-cancel
  Subscription link (f626eea, lead-reviewed; hint one-time via
  @volyume_seen_diary_planadded_hint, mutually exclusive with D12's hint,
  both dismiss on first mark; L08-B3 built exactly to the approved billing
  test plan, 11/11 plan tests, sandbox device walk still owed before
  release). HANDS-ON founder fixes landed same window: Analytics "Good
  start" momentum note now closable, space collapses (085fa3b); Rate
  Volyume row goes straight to the store page — in-app review sheet
  silently declines on non-Play installs/quota, which was the founder's
  "does nothing" (d89efa9). IN FLIGHT: plan-F FULL build (Opus, engine
  hunks pending hands-on review); dietary-needs entry point in Meal
  Builder preferences (Sonnet, single-source-of-truth via
  SettingsDietaryScreen route + cross-reflection test).
- Dietary-needs builder entry point LANDED (04a3bbe, lead-reviewed):
  "Dietary needs" SettingRow leads MealPreferencesControls on both builder
  surfaces, live summary from the same synced profile fields Settings
  writes (one store, two doors), navigateCrossTab to the registered
  SettingsDietary route; 6 tests incl. cross-reflection + route guard.
  IN FLIGHT: plan-F FULL build (Opus, engine hunks pending hands-on
  review — touching weeklyCoach/progressScan*/database.js/
  WeeklyCheckInScreen/CoachOutputScreen); D19 band exception build
  (Sonnet, poolGenerator/planEngine, files disjoint from plan-F).
  QUEUE after: NAV-2 (waits for database.js to free), training-reminder
  habit rebuild (D17), CP-9 FAQ, CP-10 investigation, Ultimate-Audit
  11-16 round prep.
- PLAN-F LANDED (0fef065, ENGINE HUNKS LEAD-REVIEWED HANDS-ON per D18):
  corroborateConfidenceLevel pure one-step ladder (never lowers/originates,
  data_hold unreachable, clamped high), suppressed under every hold incl.
  scoffPositive+calmMode; CRITICAL judgement APPROVED: only the EMITTED
  confidence field moves — plan-F §4.4's "no path into calorieAdjustment"
  premise is WRONG (confidence.level feeds offTargetWeeksRequired), so
  internals keep the base level and adjustments/heldDecisions/floors are
  byte-identical (bounded-delta guard pins it). v65 local-only enum-only
  classification-history table (no photo/score/text; absent from sync;
  wipe-scoped), written post-check-in, never engine-read. Callers still
  pass photoCorroboration=null (capability dark until display lands).
- D19 band exception: ALREADY BUILT under D10 (883d3f8); D19-cited pins +
  live-pool sweep tests landed (062c31f). Static allowlist judgement
  flagged: if a future library add gives dumbbells/barbell/home a real
  non-band vertical pull, exerciseMetadata.js needs a hand revisit.
- PLAN-F FORKS: founder DELEGATED both to lead (answers registered as
  "you decide and do the work"; founder also said a question failed to
  display — rulings restated in chat for veto). LEAD RULINGS: (1) conflict
  receipt line, exact wording in the agent brief ("Your logs and photos
  point in slightly different directions this week. A steady weigh-in
  routine, same time, same conditions, usually brings them back into
  line."); (2) render-time-only caption transform on-device (nothing
  photo-derived persisted/synced; NU-8 guard updated mechanically, dated).
  IN FLIGHT: that implementation (Sonnet) + NAV-2 edit+delete+history
  (Sonnet, BodyMetrics + weigh-in storage/sync, detection re-runs on
  corrected series).
- PAIR LANDED (2026-07-10): NAV-2 weigh-in edit+delete+history (a99f499,
  lead-reviewed): soft-delete tombstones through the existing
  body_composition sync, live reads exclude deleted, history from first
  entry, edit reuses the entry form; KEY ARCHITECTURE FACT test-pinned -
  body_metric_log NEVER feeds the rapid-loss ED detector (that reads
  morning_weights), body-fat target inputs are live-read so corrections
  apply next run; no haptics/judgement copy, gates untouched. Plan-F
  display forks (ce968e4, lead-ruled under founder delegation):
  render-time-only caption raise on-device from the local packet via the
  one shared derivation (fail-to-base incl. older outputs; thin-data
  disclosure stays on base), conflicts receipt sentence live and
  unreachable under suppression; NU-8 guard mechanically updated (D18).
  Combined verification: lint clean, 12 suites/170 targeted tests green.
  10-step Android checklist for NAV-2 in the agent report (chat log).
  NEXT PAIR FIRING: D17 training-reminder habit rebuild + CP-9 in-app FAQ.
- PAIR LANDED (2026-07-10): CP-9 Help & FAQ (0f1a87d, lead-reviewed
  incl. one hands-on copy fix: "Eat" tab reference corrected to "the
  food diary" - the tab is titled Nutrition): SettingsFaqScreen, 16
  code-verified tier-neutral entries, free-reachable, offline; What's
  new row correctly omitted (WhatsNewSheet has no imperative open API -
  future plumbing item). D17 training-reminder rebuild (29de79e,
  lead-reviewed): habit-derived weekdays (6 trailing full weeks,
  half-rounded-up threshold, <2wk history = no write, lapsed pattern
  actively clears), writer feeds @volyume_schedule_v1 in the reader's
  exact shape (end-to-end contract test vs the REAL reader), hooks on
  workout finish + App.js foreground beside the timezone re-lay, honest
  settings copy guard-pinned. The shipped-but-silent reminder now works.
  NEXT PAIR FIRING: CP-10 restart-free theming INVESTIGATION (plan-only,
  no build) + Haiku extraction of pass4 blueprints for the Ultimate-Audit
  11-16 founder round.
- D16 GO (2026-07-10): Ultimate-Audit 11-16 unblocked (order 13, 12, 11,
  15, 16 per DECISIONS D16; rulings in ultimate-audit-11-16-
  reconciliation.md) + Core-Haptics research approved (report only, no
  install without the founder's final yes). PAIR 1 LAUNCHED: item 13
  build + Core-Haptics research. CLAUDE.md STATUS note ("MUST NOT start
  11-16 without structured founder decision") is now SATISFIED by D16 -
  update that STATUS block when 11-16 complete.
- CP-10 PLAN LANDED (docs/ux-world-class-audit-2026-07-09/
  CP-10-restart-free-theming-plan.md): the pre-approved restart-free
  theming build's plan-first investigation (blast radius, staged rollout;
  section 8 holds the few genuinely open sub-decisions for a founder
  round). Build stages queue after the D16 11-16 sequence unless the
  founder reorders. Meanwhile running: next-exercise button (founder
  order) + Core-Haptics research.
- FOUNDER CORRECTION (2026-07-10): old-audit-sourced work is NOT
  authorised in this run. CP-10 plan doc stays as a record only - NO
  build, NO further reads/plans from old audits without a fresh founder
  order IN THIS RUN. Authorised live queue is ONLY: next-exercise button
  (founder order this run), Core-Haptics research (approved this run),
  Ultimate-Audit 11-16 in order (approved this run via D16 round).
  Tomorrow-queue items sourced from old audits are SUSPENDED pending
  explicit founder re-approval.
- CORE-HAPTICS RESEARCH LANDED (core-haptics-research.md): expo-haptics
  has NO Core Haptics/AHAP surface (checked SDK 55 changelog) so "wait
  for Expo" is unavailable. Best candidate: react-native-haptic-feedback
  v3 (MIT, ~438k weekly, 2026-03 release) via its triggerPattern() JS
  API only (.ahap path needs manual Xcode edits - incompatible with the
  managed workflow). Honest read: iOS-only texture polish for two
  already-tuned moments; marginal, not functional. Founder decision A
  (adopt, triggerPattern only) vs C (close item 14) - ASKED.
- NEXT-EXERCISE RELIABILITY LANDED (founder order, Sonnet, lead-reviewed):
  ROOT CAUSE of "keeps adding more and more sets" = targetSets read only
  adjustedSetCount, which is undefined whenever the slot has no
  routineExercise row - i.e. blank/freeform workouts AND any exercise
  added mid-session via the picker (addExerciseToWorkout defaults
  routineExercise to null). targetComplete then short-circuits falsy
  forever, so the existing Next exercise/Finish workout bar (built
  2026-07-03) never appeared on those paths. FIX: fallback cascade
  adjustedSetCount || recommendedSets || 3 (3 = the file's own existing
  display fallback). Button matrix unchanged otherwise (extra sets stay
  loggable via Log another set; hidden mid cluster/per-side pair; last
  exercise offers Finish through the conditional confirm). 15 new guard
  tests incl. a tripwire on addExerciseToWorkout's null default; full
  suite 624 green; lint clean. FLAGGED not fixed (pre-existing latent
  gap, surfaced per no-silent-patch rule): a TRAILING time-crunch-skipped
  exercise means the true second-to-last slot shows "Next exercise"
  which no-ops instead of offering Finish - queued as a small follow-up
  for a founder nod.
- ITEM 13 LANDED (D16 order 1/5, Sonnet, lead-reviewed): the June ruling
  (NA-wr-3, mid-session swap credits the ACTUAL swapped-in exercise's
  muscle) was verified already structurally true (getWeeklyVolumeByMuscle
  joins on logged exercise_id at read time; handleConfirmSwap rebuilds
  the slot so set writes carry the new id). The gap was user-facing: the
  swap sheet note now reads "Choose a close match for today. Your plan
  is not changed, and sets you log count towards the new exercise's own
  muscle in your weekly volume." 4 tests (copy verbatim + mechanism
  pins). Full suite green (progressScanVision even passed this run).
  NEXT per D16: item 12 raw/cooked basis toggle firing now; haptics
  adoption still in flight.
- D17 HAPTICS ADOPTION LANDED (Sonnet, lead-reviewed): react-native-
  haptic-feedback ^3.0.0 added with lockfile regenerated in the SAME
  commit (npm ci --dry-run clean, 16-line lock diff verified - lockfile
  rule enforced); its documented no-op config plugin added to app.json.
  haptics.js: iOS-only lazy resolver, REST_DONE/PR_ACHIEVED pattern
  constants (calm sub-0.9 curves, exported for retuning), byte-identical
  legacy ladder on Android/any failure, reduce-motion gate first. 9 new
  tests incl. both fallback surfaces; full suite 627 green; lint +
  check:imports + tsc clean. FOUNDER-SIDE: fresh EAS build REQUIRED
  before this (or the iOS widget) reaches a device - native dep added.
- ITEM 12 LANDED (D16 order 2/5, Sonnet, lead-reviewed): built from the
  REAL June ruling (pass3-v2-founder-decisions.md:195-196, NA-nutrition-1
  "store the basis, no conversion") which SUPERSEDES the pass4 blueprint's
  conversion-factor design. food_entries.weight_state label (as_weighed
  default | raw | cooked) - grams/kcal/macros NEVER change; UI = "Weighed:
  Raw / Cooked" chips on FoodDetailSheet + MealPlan plate items, only for
  non-ready-state foods. Local migration v66 + NEW CLOUD MIGRATION
  supabase/migrate_114_food_entry_weight_state.sql (FOUNDER APPLIES
  MANUALLY - queue now 110-114). Sync mapper carries the label; cloud
  apply normalises. 18 new tests; 628 suites green; lint clean. AGENT
  FINDINGS recorded: reconciliation doc cited wrong line number for the
  ruling (says :75, real source :195-196 - correct on next doc touch);
  pre-existing migrate_090 saved_meals/recipes field-name drift
  (ingredients/servings vs items_json/total_servings) NOT fixed, queued
  as a founder-visible investigation. 5-step device checklist in agent
  report. NEXT: item 11 autonomy modes firing.
- ITEM 11 LANDED (D16 order 3/5, Sonnet + hands-on lead review of the
  coaching diff): Coached/Collaborative/Manual autonomy modes per the
  June ruling (source verified pass3-v2:166 + NA-coaching-10:186-187).
  Engine emits ONE flag autoApplyHoldActive (weeklyCoach.js ~1396, pure,
  derived from in-scope booleans); Coached mode auto-invokes the SAME
  existing apply handlers via effect, gated on that flag (hold open ->
  falls back to tap-to-apply); Manual strips Apply controls (decision +
  reason still shown); every clamp identical in all modes (coachApply
  untouched). Preference = userProfile.coachAutonomy, default
  collaborative, local-only like coachTone. LEAD RESTORE hands-on:
  scoffPositive ADDED to the hold set (the June rule's "suppression"
  covers it; D15/D18 sibling gates include it; my D16 brief enumeration
  had omitted it) + mirrored test. 28 new tests (15 engine incl. per-hold
  + determinism, 13 screen guards); 48 targeted green; lint clean. Copy
  uses "the coach" matching SettingsCoaching's own sibling rows (voice
  doc: branded name is for named/sold surfaces). D16 SMALL THREE COMPLETE
  (13, 12, 11). NEXT: scoping reads for items 15 (timeline food logging)
  and 16 (micronutrients/NRV completion).
- ITEM 15 SCOPING LANDED (item-15-timeline-scoping.md, read-only):
  ruling verified ("Timeline replaces the meal buckets for everyone",
  pass3-v2:67+:190). Better-placed than feared: logged_at timestamp has
  ALWAYS existed (database.js:928, indexed), EntryRow already shows it,
  within-meal chronological sort exists. Remaining delta = the diary's
  per-meal card structure -> one continuous list (LARGE, staged 1-3).
  KEY NEW FINDING: logged_at = write time not eaten time, and bulk
  mark-eaten stamps ALL rows the same instant -> a true timeline would
  clump a 9pm bulk-confirm into one false 9pm eating event (honesty/ED
  flag, needs founder sign-off). 4 founder questions in section 6 -
  bring TOGETHER with item 16's round when its scoping lands.
- ITEM 16 SCOPING LANDED (item-16-micronutrients-scoping.md, read-only):
  schema (v58 + migrate_109), maths module, custom-food entry and sync
  plumbing all genuinely built; diary display deleted by D12 and nothing
  replaced it. CRITICAL: measured bundled data coverage = 0% of CoFID
  (2,852 rows) and 0% of OFF (26,427 rows) carry ANY micronutrient value
  (seed doesn't write the columns; snapshot builder parses Proximates
  only; live fetch + OCR never map vitamins/minerals). A display today
  would show unknown almost everywhere - the exact D12 failure mode.
  Also: food_library_pull RPC (migrate_028) never re-issued for the 27
  columns, so even server data can't reach devices. Founder rounds for
  BOTH 15+16 being asked now (consolidated).
- PENDING FOUNDER ROUND (asked in chat 2026-07-10; AskUserQuestion tool
  failed twice with a stream error - round NOT yet answered, re-raise on
  resume if unanswered): (15a) timeline layout: continuous list with
  quiet day-part labels / pure continuous / meal headings inside one
  scroll; (15b) time truth: editable eaten-time + untimed bulk display
  (grouped, no false timestamp) / keep logged-at shown loosely / accept
  the clump; (16a) micronutrients path: data-first CoFID spike then
  display / park item 16 / ship display on today's 0% coverage; (16b)
  NRV home if it proceeds: per-food detail sheet / Food Insights weekly
  average / decide when data exists. Builds for 15 and 16 DO NOT START
  until these are answered.
- FOUNDER STANDING ORDER (2026-07-10, binding on all future delegated
  decisions): product decisions are made ENTIRELY on what produces the
  better end product - never on build effort. Effort may inform
  sequencing, never the choice itself.
- ITEM 16 DATA SPIKE LANDED (D22 data-first, Sonnet, lead-reviewed):
  CoFID workbook fetched from the script's own existing URL (raw xlsx
  never repo-committed by design); Inorganics + Vitamins sheets join 1:1
  on all 2,886 codes. MEASURED COVERAGE: median 20/27 nutrients per
  food; minerals mostly 86-98%; B-vitamins 78-90%; vit K only 9.9% (K1
  only); fluoride/chromium/molybdenum permanently 0% from CoFID (not
  published). No unit conversions needed (verified per nutrient; vit A =
  retinol equivalents, niacin = equivalents, both matching NRV basis).
  Tr/N markers -> null (new numMicro; unknown never zero). seed.js now
  writes the 27 columns with a COALESCE top-up upsert (existing devices
  get micro data on version bump; never touches macros). migrate_116
  re-issues food_library_pull with the 27 columns (FOUNDER-RUN; queue
  now 110-116). 37 tests green, lint clean on the spike's files.
  DISCLOSED: agent briefly ran git stash on the shared tree (immediately
  popped, verified restored) - agent briefs now include a no-stash rule.
  COVERAGE PROVES VIABILITY -> per D22 the display build is GO: per-food
  detail sheet primary + Food Insights weekly average secondary, quiet
  non-quantified-first register; presentation shown to founder at
  landing. Display build firing into the free slot. Item 15 timeline
  build still in flight (its WIP explains the transient DiaryScreen lint
  error + 4 eaten_at test failures on the shared tree).
- D24 RECORDED (2026-07-10): five design-leveling items approved (see
  DECISIONS D24) - restart-free theming REINSTATED (build from
  CP-10-restart-free-theming-plan.md), @gorhom/bottom-sheet, blurhash
  image polish, shared-element transitions, dynamic-type completion.
  QUEUE after the in-flight pair (item 15 timeline + item 16 NRV
  display): theming stage 1 + bottom-sheet adoption, then transitions +
  blurhash, then dynamic type. Every landing keeps the usual boundary
  (lead review, tests, commit, push, stage-log).
- BEST-IN-CLASS DEPENDENCY MAP given to founder in chat (2026-07-10,
  AWAITING founder picks - do not build until named): (1) react-native-
  keyboard-controller (keyboard feel on every input moment); (2) zeego
  (native long-press context menus); (3) react-native-awesome-gallery or
  Reanimated hand-roll (progress-photo viewing/compare); (4) Rive for
  onboarding/empty-state motion (needs founder-side animation assets);
  (5) brand variable font via expo-font (founder taste call). NO-DEP
  enhancements recommended: SQLite FTS5 instant search (foods/exercises/
  history), chart scrub haptics via the new pattern API, Android themed
  icon/edge-to-edge/splash polish. Deliberately NOT recommended: chart
  lib swap, state/forms/list/toast libs (ours are strong); held/rejected
  register untouched. Lead recommendation: keyboard-controller + zeego +
  gallery + FTS5 join the design campaign after the D24 five.
- D25 RECORDED: the dependency map is APPROVED IN FULL (see DECISIONS
  D25). Master design-campaign queue (two at a time, after the in-flight
  item 15 + NRV pair): (1) theming stage 1 + bottom-sheet; (2)
  transitions + blurhash; (3) dynamic type + FTS5 search; (4)
  keyboard-controller + zeego; (5) gallery + scrub-haptics/Android
  polish; (6) Rive + brand font (asset/shortlist gated). Font shortlist
  = lead prepares for founder taste call.
- COMPETITOR-SEPARATION ANALYSIS given in chat (2026-07-10, AWAITING
  founder picks): MFP/Cronometer separate on DATA + INPUT ASSIST, not
  client libs (our client stack already equal/better). Recommended for
  the queue: (a) OFF micronutrient parsing into the snapshot (branded/
  retail foods gain verified-style micro depth; same pattern as the
  landed CoFID spike; no dep, data work) - the biggest remaining
  Cronometer-gap closer; (b) MLKit code-scanner frame processor on
  vision-camera (faster, low-light-tolerant barcode scanning; small).
  OPEN FOUNDER FORK, not a lead call: AI-assisted food input (photo
  meal-scan / voice logging, MFP-style). Constitution bans AI in the
  COACHING ENGINE (stands regardless); input-assist is a product-shape
  + server-cost decision that belongs to the founder alone - yes =
  proper scoping; no = never-re-propose register. Context note: CoFID
  landing already gives UK foods Cronometer-class verified micro depth
  (median 20/27) - a home-market edge over MFP's crowdsourced UK data.
- WORKOUT-LOGGER ANALYSIS given in chat (2026-07-10): code-verified that
  the logger already carries the best-in-class basics (focus-scoped
  keep-awake B8, ghost pre-fill + tap-apply of last session, layoff
  detection, warm-up, clusters, unilateral per-side, PR re-detect,
  next-exercise offer, haptic curves) - no dependency gap in the daily
  loop. Remaining separators surfaced to founder: (1) iOS Live Activity
  rest timer - module ALREADY BUILT (modules/rest-timer-live), wiring
  HELD by founder; offered as "say unhold" (needs App Groups + EAS,
  already on founder-side list); (2) Android rest-timer notification
  actions (skip/+15s) - VERIFY what exists, close gap if absent (queued
  small); (3) zeego on logged sets (already D25); (4) watch app =
  horizon programme, scoping only on founder request. D26 recorded: OFF
  micronutrient parsing + MLKit scanner approved; AI-input fork still
  open with founder.
- D27 RECORDED: four logger separators approved — Live Activity HOLD
  LIFTED (wire modules/rest-timer-live; founder-side App Groups + EAS
  stand), Android rest-timer notification actions (verify+build), zeego
  first on logged sets, watch-app SCOPING (memo then round). AI food
  input fork stays OPEN. Queue slots them after the D24/D25 design
  waves; Live Activity wiring can pair earlier since it is small and
  the module exists.
- NRV DISPLAY LANDED (item 16 complete pending one seam; lead-reviewed):
  MicronutrientDetail (per-food, collapsed, known-values-only, <3-known
  fallback line) + WeeklyMicronutrientsCard on Food Insights (rolling 7
  days, 50%-of-logged-kcal coverage floor per nutrient, awareness copy,
  no NRV% on the aggregate per the screen's own convention - lead
  ACCEPTED that judgement + the "Vitamins and minerals" header). 40
  tests green, lint clean. DELIBERATELY HELD BACK from this commit:
  FoodDetailSheet.js (shared with item 15's live WIP - carries the
  4-line render hook) + micronutrientDisplay.guard.test.js (pins that
  hook) - BOTH commit at item 15's landing boundary after reviewing the
  two agents' edits to that file together. AI food input fork: HELD by
  founder (D27 addendum). Item 15 timeline agent still in flight (file
  mtimes active).
