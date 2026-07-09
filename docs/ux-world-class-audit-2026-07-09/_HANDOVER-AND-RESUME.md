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
- [x] **Stage 2 — collect facts (7 of 8 saved).** Saved verbatim:
  `facts-onboarding.md`, `facts-home.md`, `facts-logging.md`,
  `facts-plans.md`, `facts-nutrition.md`, `facts-paywall-settings.md`,
  `facts-cross-cutting.md` (this one carries four hands-on accuracy caveats
  in its header where the grep sweep conflicts with closer reads — read them
  before trusting its numbers). STILL PENDING: `facts-coaching.md`
  (Coaching & progress agent, Sonnet, still running at last update). If it
  never lands, relaunch with the coverage-table row 6 prompt shape (flow map,
  verbatim copy, state coverage, interaction, accessibility, friction,
  standouts + rough edges; facts only, no recommendations).
- [ ] **Stage 3 — judgement and synthesis (hands-on, main loop).** Write
  `ASSESSMENT.md`: per-area verdict (what is already world class, what is
  the gap), then a single prioritised improvement list across the whole app
  (impact on user experience × effort, flagging any item that needs a founder
  decision or touches a locked system). British English, no em dashes.
- [ ] **Stage 4 — verify + ship.** `npm run lint && npm test` (docs-only
  change, but the rule is after EVERY change), report exact output, list
  files changed, commit, push with `git push -u origin
  claude/codebase-audit-docs-pv6mjd` (retry 2s/4s/8s/16s on network failure).
  No PR unless the founder asks.
- [ ] **Stage 5 — reply to founder.** Summarise the verdict and the top
  improvements in chat; surface any founder-decision items as explicit
  questions (no-parking rule).

## Current position

Stage 2 in progress: all 8 subagents launched and running in the background;
none have reported yet. Nothing blocked. No founder decisions pending yet.

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
