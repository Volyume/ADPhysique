# S1 banked summary — surface inventory (Sonnet recon, 2026-08-28)

Full report delivered in session; this bank holds the load-bearing facts the
lead is carrying into S2/S3. All file:line refs verified by the agent against
the tree at CC33 open.

## Entry points (complete set: 7 navigate('HowYouTrain') call sites)
- SettingsScreen.js:34 — row "How you train" (3 taps from cold open via
  Coach tab -> gear -> row; Home lands on Today tab, RootNavigator.js:659)
- FreeStarterScreen.js:344 (onboarding step 4 of 4) · ProOnboardingScreen.js:2088
  (step 5 of 7, between Training week and Targets)
- TrainingConsiderationsScreen.js:59 (directory question -> preselect)
- ExerciseConflictSheet.js:176 + ExercisePickerModal.js:407 ("Update How you
  train", clinician-conflict only)
- ActiveWorkoutScreen.js:4661 ("Work around this" -> "Swap and note a
  temporary change")
- NO entry from Home, CoachOutput, WeeklyCheckIn (check-in names it as prose,
  no link, WeeklyCheckInScreen.js:1274-1275), PlanLibrary badges, or any plan
  screen. Directory reachable ONLY through HowYouTrain (4 taps).

## The screen (HowYouTrainScreen.js, 914 lines)
Render order: energy/short-sessions row -> directory row -> "Your setup"
(baseline) -> "Temporary, right now" (episodes; actions "Done with it" /
"A while longer" / "Still going for now" / "This is how I train now") ->
"Add something" -> "Past" (restartable) -> "Your data" (export/delete).
Add flow stages: role -> kind -> axes(10)/family/exercise -> side ->
dates(presets only) -> consent(inline, at save; decline discards draft
silently) -> readback. Capability consent is a SEPARATE lane from the app
Article 9 gate (capabilityConsent.js, CAPABILITY_CONSENT_VERSION 2026-08-20).

## Explanation layer
- EXISTS: episode-save diff prompt (HowYouTrainScreen.js:337-378);
  PlanUpdateScreen.js:509-546 near-miss/thin-session/blocked-slot lines;
  PlanLibraryScreen.js:708-714 badges; picker captions
  (ExercisePickerModal.js:117-145); conflict sheet captions; in-workout
  status strip (ActiveWorkoutScreen.js:777-790, episode-role only);
  homeCoachBrief.js:21-23; check-in conditional question.
- ABSENT: WorkoutSummaryScreen.js (2,489 lines) has ZERO capability/
  constraint/restriction/temporary matches — the ARCHITECTURE §17
  post-workout quiet line was NEVER BUILT. session_constraint_effects is
  written (ActiveWorkoutScreen.js:3170-3180, HowYouTrainScreen.js:359/369)
  and consumed ONLY by stats/ledger/sync/scrub — no screen renders any
  persisted effect row back to the user.

## Open integration questions handed to S2
1. ExerciseDetailScreen.js:385-394 substitutes list: rankSwaps over the RAW
   library — no isEligibleExercise/capability reference in the whole file
   (bypasses BOTH lanes). 2. poolGenerator path closure unproven.
3. src/lib/notifications/: zero capability references. 4. WorkoutSummary as
   above.

## A11y notes
SettingsRow accessible name = label only (sub-copy not folded in,
SettingsPrimitives.js:29-30). HowYouTrain choices/labels carry proper
roles/labels/state; picker rows fold captions into accessibilityLabel.

## State model
No Zustand keys (on-demand SQLite via capability/store.js).
capability_constraints + session_constraint_effects local (database.js:
2631-2661) + sync registry both directions + AsyncStorage consent flag
capabilityConsent.v1.{userId}. Cloud 145-149+151 applied per board
(not re-verified against live DB in S1 — UNVERIFIED there).
