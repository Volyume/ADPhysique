# Volyume end-user coherence and safety-surface survey

Date: 2026-10-15. Tree: main at `0b5a6ce`, version 2.14.0, working tree clean.
Status: survey only. Nothing was changed, committed or written to the repo.

Method: seven read-only recon lanes (five Sonnet, two Haiku) mapped the eight
areas. The lead read every line that carries a proposal. Labels: OBSERVED means
read in code at the cited line; INFERRED means deduced, and says from what;
REPORTED means a doc or comment claim; NOT TRACED means unconfirmed.

Corrections folded in from the safety-surface lane's erratum: two line numbers
(`weeklyCoach.js:2041-2042` and `:2161`; `CoachHeldHistoryScreen.js:54-56` and
`:167-168`) and two scope notes (calm reads in notifications were checked in
`scheduler.js` and `handler.js`; the post-content claim rests on the key lists in
`validation.js`).

---

## 1. Executive summary

Six changes would do most for daily trust and flow. The first two are the
cultural risks the brief named, and both are real in code.

1. **Community: an adult's first finished workout becomes a public post with no
   confirmation.** Sharing is on and the audience is "everyone" by default in
   the server fallback, the client default and the onboarding literal (D194
   addendum 2, founder order 2026-09-26 "It is on for all users by default").
   The finish handler posts before the summary renders. The only notice
   afterwards is a strip whose wording is hard-coded to "everyone" whatever the
   audience. An unreadable sharing store answers "sharing on", and a "Followers"
   choice made at Join travels in a second best-effort call that can be lost.
   Public posts are served to signed-out visitors by the public edge function.
   Changing the default reverses a founder order, so that is a founder fork
   (P1). The wording, the fallback and the two-call defect can be fixed under
   any option.
2. **Calm mode leaves every nutrition number exactly as it is.** The calm
   toggle's own copy promises "your plan and your numbers do not change", and
   the food domain honours that literally. Diary rings, Food Insights adherence
   and kcal-versus-target bars, Food Search's kcal-left line, the meal plan, the
   weekly check-in's "averaging N kcal a day, over target" sentence and the
   coach screen's weekly weight-change chip all render unchanged under calm and
   under an open ED flag. Only body metrics, photos, the Analytics body pillar,
   the recap card, the slider and the calorie bank go quiet. Three different
   suppression compositions exist across the app. The Beat signpost renders in
   three places and is absent from the floor banner, the energy-availability
   caution, the positive wellbeing check and the FFM hold. P2 proposes one
   helper and a founder choice on what calm and a flag should mean on nutrition
   surfaces, respecting the D75 "never hide the rings" verdict.
3. **Meal reminders keep firing after a flag is raised while the app is
   backgrounded.** The raise site cancels only the weigh-in prompts. Meal
   reminders are the app's one OS daily repeat and are not cancelled until the
   next launch. The planned-meal confirm is a dated one-off with no foreground
   handler branch, so it fires even in the foreground. Calm cancels nothing.
   Both cancel functions already exist, so the minimal fix is a few lines (P4).
4. **The new planner's refusals end in dead ends.** The refusal copy is one
   generic sentence, the muscle shortfall the engine computes is never shown,
   the preview sheet's only control is "Not yet" when no day count is
   suggested, the onboarding failure alert drops the reason, and the Today
   "Update your plan" card uses a bare cross-stack navigate that the repo's own
   helper header calls a dead-tap class (P5).
5. **Settings copy that is not true on iOS, and orphans that each trace to a
   founder order.** The iOS widget alert and the FAQ describe a lock-screen
   widget the config does not build, and a test pins the plugin as parked. The
   Health row is dark behind a stub that always returns false. CoachReview lost
   its last caller under D224, MealNames under a 2026-07-13 order, and cardio
   logging is a standing founder boundary (D92 item 1), so "re-enable cardio"
   is a boundary re-open, not a tidy-up (P6 to P8).
6. **Logger and diary: small frictions remain, and the 8,014-line screen can be
   split without behaviour change.** The 2.10 to 2.14 logger changes are
   confirmed live. What remains: a planned-meal toast that counts foods as
   meals, tick-all excluded from supersets and per-side work, stale comments
   describing a row hold that no longer exists, and a recap toggle the comment
   calls opt-in but which starts on (P9).

---

## 2. Area-by-area findings

### Area 1: safety-layer coherence

Definitions, OBSERVED:

- `isCalm` is a pure comparison (`src/lib/wellbeing.js:45-47`); the mode lives
  in AsyncStorage (`:17`). The convenience reader `getWellbeingMode` fails open
  to "unspecified" on error (`:22-28`), which is why every safety surface reads
  the raw key instead.
- `getOpenEdPatternFlag` is a SQLite read with no catch
  (`src/lib/database.js:13407-13415`); every caller supplies its own.
- `readEdOrCalmSuppressed` and the `usePhotoSuppression` hook
  (`src/hooks/usePhotoSuppression.js:63-69`, `:77-125`) fail closed: a failed
  read of either input suppresses, the hook starts suppressed and re-reads on
  focus.
- Server side, `_community_ed_flag_open` returns true on a null id and on any
  error (`supabase/migrate_180_...sql:266-295`). It gates only the read-side
  RPCs through `_community_consistency_withheld` (`:337-346`, used at
  `migrate_191:311, 340, 546, 559, 671, 971, 1214, 1226`). It is not consulted
  by `community_create_post` or the feed.
- Three composition families exist: calm or flag or failed read (the hook, plus
  inline chains at `CoachOutputScreen.js:1116-1121`, `:1692-1693`,
  `:1918-1923`, `WorkoutSummaryScreen.js:898-903`); the same plus a SCOFF score
  of 2 or more (`HomeScreen.js:652-655`, `YouScreen.js:255-258`); and flag only
  (`DiaryScreen.js:404`, `GoalChangeSummaryScreen.js:181`,
  `handler.js:149-164`, `scheduler.js:257-272`).

Surfaces, OBSERVED (H hidden, A altered, U unchanged; under calm / under an
open flag):

| Surface | What it prints | Calm | Flag | Read |
|---|---|---|---|---|
| Progress photos, compare, before/after sheet | bodyweight on photo, scan score | H | H | hook (`ProgressPhotosScreen.js:169`, `BeforeAfterShareSheet.js:129,480`) |
| Analytics body pillar | trend weight and rate | A, no figure | A, direction word only | `useWeightTrend.js:47-58`, `weightTrend.js:67-72, 396-424` |
| Body metrics | rate, direction, comparison, mornings | A, withheld | A, withheld | `bodyMetricsPolicy.js:55-66`; trend weight and body-fat list stay |
| Today evidence pane, weigh-in prompt | counts, plausibility figure | A | A | `HomeScreen.js:652-660, 2512` |
| Weekly recap share card | weight lost hero | A, stripped | A, stripped | `ShareCardScreen.js:145`, `greatWeek.js:111` |
| Energy slider, training status | kcal choice | H | H | `NutritionTargetsScreen.js:661, 1246, 1442` |
| Diary calorie bank row and sheet | banked kcal | U | H | `DiaryScreen.js:404` |
| Diary rings and macro sheet | kcal left or over, grams to go | U | U | none (`DiaryScreen.js:1541`, `MacroRings.js:147-148, 262-263, 316-321`) |
| Food Insights, all elements | kcal vs target, "on target" bars, protein hit days, adherence | U | U | none (`FoodInsightsScreen.js:437-614`) |
| Food Search | per-food kcal, "Sized for this meal: around N kcal" | U | U | none (`:862, :898`) |
| Meal plan | day kcal "of target" | U | U | none (`MealPlanScreen.js:1194-1196, 1300`) |
| Weekly check-in | "trend {weight}", "averaging N kcal a day ... under/over target" | U | U | none (`WeeklyCheckInScreen.js:1153, 1221-1227`; the hook at `:228` scopes only the scan packet) |
| Coach screen week rows | weekly weight delta chip, coaching rate | U | U | none (`CoachOutputScreen.js:2777-2783, 3028-3047`) |
| Coach held history | "Calories up +N" rows | U | U | chips hidden, rows stay (`:54-56, 167-168`) |
| Athlete profile, lift progress | bodyweight tile, "N x body weight" | U | U | none (`AthleteProfileScreen.js:531, 555`, `LiftProgressScreen.js:411`) |
| Today weigh-in strip prefill | last weight | U | U | none (`TodayStrip.js:107-113`) |
| Nutrition targets hero, macros, floor banner, EA caution | kcal, grams, floor line | U | U | numbers unchanged by design (D226) |
| Food sheets (macro breakdown, entry row, detail, quick add, curated, recipe, saved meal) | kcal and macros | U | U | none |

Beat signposting renders in exactly three places: the body-metrics calm
interstitial as plain text with the number (`BodyMetricsScreen.js:922-949`,
calm only, once per app session, never under a flag alone); the coach's
held-cut card as a "Get support · Beat" link (`CoachOutputScreen.js:690-757`,
Beat for en-GB, NEDA for en-US, Butterfly for en-AU via
`whyThisTemplates.js:442-456`); and a row on every physique Community page and
on its resting state (`CommunityDimensionScreen.js:164-181, 567, 579`). The
floor banner (`NutritionTargetsScreen.js:1848-1856`), the energy-availability
caution (`:1857-1890`), the FFM hold row (`CoachOutputScreen.js:673-684`) and
the wellbeing check's positive result (`WellbeingCheckScreen.js:89-94`, which
names a GP or dietitian) carry none. A comment at `YouScreen.js:538-541` says
the wellbeing check shows the Beat signpost; it does not (REPORTED, stale).

The recap card, traced in full:

- The offer: "Create share image" on the coach screen
  (`CoachOutputScreen.js:3259-3267`) is gated on `isGreatWeek` (`:2813`), whose
  safety test reads `edPatternFired`, `ffmFloorHeld` and `rapidWeightLossFlag`
  (`greatWeek.js:34-36`). `edPatternFired` is set only when no flag is already
  open (`weeklyCoach.js:2016-2028, 2582`), and nothing in the gate reads calm.
  OBSERVED: a person with an open flag or calm on can be offered the share.
  INFERRED: the card they then get is stripped, because the tap passes
  `suppress` (`:2837`) and the screen re-reads fail-closed
  (`ShareCardScreen.js:145-146`).
- The figure: `showProgress = hasWeight && onTarget && isCut && lostWeight &&
  !suppress && includeProgress` (`greatWeek.js:111`), hero "weight lost this
  week" with the magnitude (`:121`), coach clause "lost N kg" (`:172-175`),
  drawn at `drawShareCard.js:1331-1334, 1348-1351`. It is the weekly smoothed
  delta, not absolute bodyweight, and prints only on an on-target cut week.
- The toggle: the comment calls the hero opt-in (`ShareCardScreen.js:172`) but
  the state starts on (`:174`). It is hidden under suppress (`:1347`).
- Units: the card always prints kg (`greatWeek.js:98` from the gym unit, which
  is forced to kg at `useAppStore.js:2222-2226`), while body weight displays in
  stones, kg or lbs elsewhere (`units.js:47, 70`), and the coach chip converts
  (`CoachOutputScreen.js:2779-2782`).
- The phase label ("Week N · Mild cut") passes through under suppress
  (`ShareCardScreen.js:397`, `drawShareCard.js:1323`) although the header
  promises no progress language at all under suppress (`greatWeek.js:21-25`).
- The rule question: CLAUDE.md bans bodyweight on all but the before/after
  card. Reading A: a weight change is bodyweight data. Reading B: the ban names
  the absolute weight. The file header records the founder's 2026-06-22
  correction that the real number must be shown on a safe, on-target week
  (`greatWeek.js:13-20`), so any change is a founder fork. Suppression tests
  exist (`greatWeek.test.js:98, 142`, `greatWeek.integration.test.js:104`).

### Area 2: planner generations and refusal

- Flags are all literal true: `STRUCTURE_ENGINE`
  (`src/lib/structure/release.js:24`), `PLANNER_V2`,
  `PLAN_REBUILD_AT_NEXT_SESSION`, `PLAN_FACTS_PUSH`. The header above the flag
  still says "It is OFF on main until the founder signs off" (`:7-8`), and the
  handover's top line says "(off)" (REPORTED, stale). Commit `38fd470` changed
  one non-test line and put 16 test suites under an engine-off mock.
- Dispatch (`src/lib/planAutoGen.js:1051-1073`): with the engine on and no
  style pool, `generateAndSavePlan`, the dry run, the fit check and the
  next-open rebuild all go to the structure engine. The D219 planner is
  unreachable (INFERRED: every call sits behind the structure branch). Legacy
  `planEngine.generatePlan` still runs for style-tagged plans (kettlebell,
  circuit) at `:293, :1073, :2370`, and the block-boundary "Continue with
  adjustments" path (`PlansScreen.js:736, 815`) carries no style lock, so a
  style plan re-run there goes to the legacy generator and loses its tag
  (`:1120-1122`, INFERRED).
- Refusal shapes: `days_out_of_range`, `experience_unknown`,
  `minimum_unreachable` (with the muscle list), `checks_failed`,
  `sense_failed` (`engine.js:327, 333, 904, 2105, 2111`). The seam reduces them
  to one generic line, "This plan could not be built with these choices. Try a
  different number of days or session length." (`adapt.js:502-519`), plus the
  suggested day count when there is one. The muscle list is never shown;
  `refusalMessage` in `messages.js:161` exists for the audit renderer only.
- Where the person lands: the preview sheet shows the text and the
  suggested-days buttons, else only "Not yet"
  (`PlanPreviewSheet.js:415-443, 472-480`): a hard dead end on that sheet.
  Onboarding's fit review hides "Build my plan" and offers session-length rows
  plus "Another option" only when a day count is suggested
  (`ProOnboardingScreen.js:3150-3305`). An onboarding final-build refusal shows
  "Plan setup didn't finish ... Open Today and choose Start with a plan to
  retry" and drops the reason (`:2136-2140`). The silent next-open rebuild
  records "needs_choice" and Today shows "Your plan can be updated"
  (`messages.js:533-537`) whose button is `navigation.navigate('PlanUpdate')`
  (`HomeScreen.js:2641`); `PlanUpdate` is registered only in the Plans stack
  (`RootNavigator.js:581`), and the repo's own helper header says a bare
  cross-stack navigate "silently no-ops" (`navigateCrossTab.js:3-6`). NOT
  TRACED on device; no test pins the card's navigation. Commit refusals log
  only the string `structure_refused`.
- Apply paths, OBSERVED: seven writers change a plan or targets. The weekly
  check-in resolver (`src/lib/checkinPlan.js:192`) forks by plan: engine plans
  place sets from candidates filtered by exclusions and today's kit
  (`:428-435`, fails closed to no candidates), authored plans use a closed list
  with no kit or exclusions (`:207`), and plans without facts (library, kit,
  manual) take the legacy volume apply that reads no kit, no exclusions and
  touches next week only (`coachApply.js:279`; `CoachOutputScreen.js:1408-1409`).
  The early deload (`coachApply.js:185`) has no engine awareness. The next-open
  rebuild (`planRebuild.js:390-821`) reads exclusions and kit but not phase,
  recovery or age. RoutineDetail edits pass a structure gate on engine plans;
  ManualBuilder (`ManualBuilderScreen.js:951-1023`) and the capability rewrite
  swap (`sessionEffective.js:823`) write with no gate (both already on the
  board as follow-ups 2 and 3). Generation's exclusions read fails open by
  recorded ruling (`intent.js:78-94`, D107-2/D109-2); the check-in's fails
  closed (`checkinPlan.js:428`).

### Area 3: Community exposure

- Server: `share_sessions` column default was flipped to true by 184 (`:89`),
  then `community_upsert_profile` was rewritten in 186 so an omitted key on a
  new profile is false ("never on unasked", `:242-245`) and an omitted audience
  is "everyone" for an adult, "followers" for a minor (`:251-256`); a minor
  sending "everyone" is refused, anything else is forced to followers
  (`:266-271`). `community_create_post` maps everyone to public (`187:155`) and
  re-reads the row before an automatic post (`:222-239`). No ED or calm gate on
  create_post.
- Client: `TP_DEFAULT_SHARE.share_sessions = true` and
  `DEFAULT_SESSIONS_AUDIENCE = 'everyone'` (`trainingProfile.js:162, 181`); the
  onboarding step sends the literals `visibility: 'public', share_sessions:
  true, sessions_audience: 'everyone'` (`onboardingJoin.js:215-218`) under a
  static line "Every session you finish is shared with everyone in
  Community..." (`ProOnboardingScreen.js:2848`). An unreadable store returns
  the defaults with sharing on (`trainingProfile.js:506-520`), contradicting
  the comment above it. At Join, the audience is not in the create call; it
  follows in `publishSharingSettings(...).catch(() => {})`
  (`CommunityJoinScreen.js:349-352`), so a lost second call leaves the row at
  "everyone" (INFERRED; likelihood NOT TRACED).
- The automatic path: `handleFinishWorkout` writes the workout, then the
  summary mounts and runs `publishAmbientItems` once per mount
  (`WorkoutSummaryScreen.js:403-458`); it exits when sharing is off and when
  `sessionShareGateState` says gated, which is `readEdOrCalmSuppressed`
  (`ambient.js:160-166`; `trainingConsistency.js:281-284`). The privacy
  policy's "pauses on its own while calm mode is on" is therefore true in code.
  No confirmation before the post; after it, a strip reads "Shared to
  Community. Your sessions are shared with everyone on Community unless you
  change it." as a hard-coded literal whatever the audience (`:1402-1413`),
  with "Add a note" and no undo. The audience-aware sentence already exists and
  is unused there (`trainingProfile.js:193-198`). Up to one session post,
  three PR posts and a milestone go out sequentially; failures queue and flush
  later from the summary or the Hub with no notice.
- Minor versus adult at Join: a minor (or anyone whose cloud date of birth is
  absent, `migrate_174:104-130`) sees no follow chips, "Share what I did"
  starts off until touched (`CommunityJoinScreen.js:259-262`), and if switched
  on shows "Shared with people who follow you." (`:661`). An adult sees the
  switch on with chips Followers, My groups, Everyone (`:666-681`). The
  policy's "The switch is shown, already on" is false for minors (minor
  mismatch).
- Reach: an adult's post is public, and `community-public` serves public posts
  to anonymous visitors (`supabase/functions/community-public/index.ts:106-108,
  226-231`). Posts carry no bodyweight, kcal or photo key: the per-kind key
  allow-list and the recursive sensitive-key check in
  `src/lib/community/validation.js:65-101` exclude them on the client and again
  in SQL (nested payload contents not read separately).

### Area 4: notifications after a flag or calm

- Raise is a database write only (`database.js:13460-13479`). Its one caller
  (`CoachOutputScreen.js:2241`) then pushes the flag to the cloud, enforces the
  energy choice, and cancels only the weigh-in sets: `cancelMorningNotification`
  (`:2259`, body `scheduler.js:1801-1813`). Clear re-lays only the weigh-ins
  (`:2265-2278`). The calm toggle calls no notification function
  (`SettingsCoachingScreen.js:75-83`).
- Trigger types: meal reminders are the only OS daily repeat
  (`scheduler.js:541`); a slot logged today becomes three dated one-shots
  (`:548-559`). Everything else is a dated one-shot. Schedule-time flag gates,
  fail closed: weigh-ins (`:162, :374`), meal reminders (`:589-590`),
  planned-meal confirm (`:1526-1527`), missed check-in, activation, return
  nudge. No flag read at lay: weekly check-in, coach-ready, block-ready,
  training reminders. In `scheduler.js` and `handler.js`, calm is read only by
  the return nudge and the dormant win-back; the monthly recap's copy is
  additionally softened from calm by an argument set in `App.js`.
- Foreground handler (`handler.js:19-89`): re-checks the flag for weigh-ins
  (`:34-37`), missed check-in (`:48-51`), meal reminders (`:57-59`) and
  activation (`:72-75`). No branch for `planned_meal_confirm`. No calm read
  anywhere in the file. A second module-scope handler in `App.js:154-166`
  reads nothing (INFERRED: the later RootNavigator call replaces it; library
  source absent).
- After a raise with the app backgrounded: the daily meal repeats and today's
  planned-meal confirm stay queued until the next `restoreNotifications`
  (launch, a prefs pull, a quiet-hours edit, or the weekly weigh-in horizon
  refresh, `:1889-2029`) or the next meal re-lay. On a second device the pulled
  flag opens the local row with no notification hook
  (`database.js:12543-12581`).
- REPORTED versus OBSERVED: `docs/NOTIFICATIONS_LOCKED.md:350-352` says an open
  ED or wellbeing flag suppresses every event push at schedule time and at
  foreground delivery; code suppresses most by flag and none by calm. Lines
  `614-618` already record the unbounded meal repeats as "noted, not changed".

### Area 5: discoverability and orphans

- CoachReview: registered (`RootNavigator.js:483`), zero navigate callers. The
  last caller was the Today deload card's tap-through, removed in `24859ea`
  under D224 ("Remove the recovery data from today"). The check-in's "View your
  coach review" goes to CoachOutput (`WeeklyCheckInScreen.js:1674-1675`).
- MealNames: registered (`:700`), zero callers; the Settings row was removed by
  founder order 2026-07-13 "not needed" (`SettingsScreen.js:84-87`).
  `setMealLabel` has no other caller, so meal renaming is unreachable.
- SettingsHealth: reachable only from a row behind `isHealthAvailable()`, which
  returns false on every platform because both module getters return null
  (`health.js:98-109`; `SettingsScreen.js:23, 131-138`).
- Widgets: `app.json` lists `react-native-android-widget` with two Android
  widgets (`:317-347`) and `NSSupportsLiveActivities: true` (`:30`), but not
  `./plugins/withVolyumeWidget`; `liveActivity.wiring.test.js:121-128` pins
  that absence as "extension parked 2026-07-12, unprovisioned". The Live
  Activity JS calls exist in the store (`useAppStore.js:2010-2107`) with no
  extension target to drive (INFERRED).
- Cardio: local table created by three schema steps
  (`database.js:1354-1378, 1425-1451, 1564-1567`), registry entry
  `direction: 'pull_only'` with the comment "Cardio logging itself is retired
  (D92-1/D95 founder boundary)" (`src/lib/sync/registry.js:138-151`), pull
  handler only (`sync/tables/cardioLog.js`), cloud table from 064 and 087.
  Writers: only the cloud-apply upsert and an uncalled soft delete
  (`database/activity.js:74-157`). No screen or component references cardio as
  a feature. The register's D92 item 1 reads, verbatim: "Volyume is not a
  cardio logging product. Cardio logging is intentionally OUT OF SCOPE ... No
  audit should recommend restoring cardio for feature completeness; no
  campaign may re-enable cardio routes or surface cardio UI." The pull stays to
  protect existing cloud history (D95 H1), so the table is not an accident.
- Other orphans: `ProgressScanHistoryCard.js` has no importer (INFERRED
  orphan). Four dormant billing routes are navigated to but unregistered
  (CascadeGate, ProUpgrade, Subscription, SubscriptionPolicy), consistent with
  D137.

### Area 6: logger and diary

Live in code from 2.10 to 2.14 (OBSERVED): type reps then "Log set"
(`ActiveWorkoutScreen.js:5130, 5317`), last session beside every set with
tap-to-use (`:5240, 5378`; `SetRow.js:299, 318`), the record mark (`:5345`;
`SetRow.js:263`), the docked keyboard bar with steps (`:6130, 6148`), History
on the toolbar (`SessionToolbar.js:93`), Notes from a button only (`7b1602a`),
and the blank-tap fix. Note the board attributes the blank-tap fix to
`da0b431`; that commit only added the OK action, the mechanism landed in
`d68091a` and the row hold was removed outright in `7b1602a`. No row hold is
wired today (the screen passes no `onLongPressRow`), yet the comment at `:5957`
and `SetRowSheet.js:4` still describe one.

Remaining friction, mechanics only: a prefilled row logs in one tap; a blank
row needs well, digits, "Log set" (two taps plus digits), or well, digits,
Next, digits, "Log set" for both fields. Tick-all ("Log the remaining sets?")
is offered only when weight and reps are set and the exercise is not a
warm-up, cluster, per-side or superset (`:5306-5316`). There is no "fill this
exercise from last session" action, though each row's last cell copies one
set. Long presses: the rest strip's plus and minus repeat
(`RestTimer.js:529-531`) and the reorder sheet's drag
(`DragReorderList.js:110, 423`, with arrow buttons beside it). Plate calculator
is REJECTED on the board and pinned absent (`gymBasics.guard.test.js:94-98`);
RPE/RIR is settled-removed; neither is proposed.

Diary: a planned entry is `is_planned = 1` with a null `eaten_at`
(`food/db.js:143-155`), shown as a faded ring arc with "+N planned"
(`MacroRings.js:65-94, 330`), a day banner counting meal slots
(`DiaryScreen.js:1867-1870` via `diaryViewModel.js:19`), and a "Mark eaten" row
per meal. The confirm toast counts rows (`DiaryScreen.js:358` prints
`res.changes` from `db.js:437`), so one meal of three foods reads "3 planned
meals marked as eaten". The calorie bank lives only in the AsyncStorage
profile blob (`useAppStore.js:2355-2362`), rides the guarded pref sync without
a write stamp (INFERRED: cross-device arrival conditional). The energy choice
is in AsyncStorage and on the synced-pref allowlist (`sync.js:1880`), so it
does travel; push and pull not traced.

Monolith map: 8,014 lines; the component spans `:339-7338`, styles
`:7345-7859`. Inside it: 81 state hooks, handlers `:1396-2362`, the
per-exercise load `:2786-3135`, `handleCompleteSet` `:3191-3706`, finish
`:4265-4741`, well and keyboard-bar handlers `:4959-5292`, JSX `:5547-7338` of
which the three raw modals, five bottom sheets and the swap modal occupy
`:6243-7338`. Already extracted: 13 session components under
`src/components/workout/session/` plus `RestTimer.js`. Guards: 58 test files
read the screen source by regex; `ActiveWorkoutScreen.verticalLogger.guard.test.js`
pins whitespace-exact anchors (the ScrollView, the ExerciseSection order,
`handleJumpToExercise`, `handleReorderWorkoutExercises`, `openWell` and
`openWellNow` bodies, `outlineItems`, `setTableRows`);
`loggerVisualArchitecture.guard.test.js:93-95` pins the RestTimer line after
`</ScrollView>` and before `<KeyboardBar`. `screen-mount.test.js` mounts the
real screen 35 times, which is the behaviour net a split can lean on.

### Area 7: settings copy versus what ships

- iOS alert copy claims "home screen widgets for your next session and this
  week's consistency, plus a lock screen widget" with lock-screen steps
  (`SettingsScreen.js:127`), and the FAQ says "plus a lock screen widget on
  iOS" (`SettingsFaqScreen.js:85-87`). OBSERVED: the only widget plugin is
  Android-only; no iOS widget or extension is configured. The row renders on
  both platforms (`:119-130`).
- Health: unreachable, as above; the stub screen's own copy says connections
  are switched off in this build (`SettingsHealthScreen.js:161`).
- Stale claims elsewhere: CLAUDE.md:56 lists the widget plugin as part of the
  surface; CLAUDE.md:92 names only `planEngine.js` as the training engine;
  `docs/LIVE_ACTIVITY_IOS.md:70` says the plugin is wired; TASKBOARD:528 says
  the Live Activity is "ALREADY fully wired" (true of the JS, not of the
  extension).

### Area 8: energy choice and training status

- The slider renders only when `chooseActive = !suppressed &&
  !!bounds?.canChoose` (`NutritionTargetsScreen.js:661, 1442-1466`);
  `suppressed` starts true and is set from `readEdOrCalmSuppressed` with a
  catch that keeps it true (`:466-478`), re-read on focus and on
  recalculation. The enforcement module has its own fail-closed read
  (`energyChoiceEnforce.js:56-68`) and runs after start-up and every sync, on
  foreground, on the calm toggle, on a flag raise and on the screen
  (`App.js:726, 870`; `SettingsCoachingScreen.js:82`;
  `CoachOutputScreen.js:2253`). Under suppression the "Estimated range" line
  still shows and nothing replaces the slider (`:1437-1441`), which matches
  D226 answer 1.
- Training status: SecureStore only (`trainingStatus.js:21-54`), never in any
  sync table or migration, cleared on sign-out and deletion. Read by the
  gain-ceiling path (`CoachOutputScreen.js:2059` into `runWeeklyCoach`) and by
  the Nutrition settings pill, which is hidden under suppression and says
  "Kept on this phone only" (`NutritionTargetsScreen.js:1246-1256`).
- Outstanding founder device checks on the board: the slider and status
  (`TASKBOARD.md:58`, checklist given in chat 2026-10-12); the Sentry,
  Today-no-recovery and muscle-detail landings carry no recorded device result
  (`:66, :68, :70`); the device-walk backlog (`:533`); the iOS crash-fix walk
  with no status (`:520-527`); the Community level-up build and the ED-flag
  walk after it (`:156, :203`).

---

## 3. Proposed fixes

### P1. Community first-post exposure

Touches ED-safety: no (the client gate stays `readEdOrCalmSuppressed`).
Founder decision required: changing the default reverses D194 addendum 2.

- **A.** Default audience to followers for adults. Files: `migrate_192`
  altering the fallback at `186:252-253` and the 184 column default;
  `trainingProfile.js:181`; `onboardingJoin.js:217`;
  `ProOnboardingScreen.js:2848` copy; `PrivacyPolicyScreen.js:124-131` and
  `privacyTruth.guard.test.js:94`; the Join and receipt copy
  (`PrivacyReceipt.js:45`). Existing rows keep their stored choice unless a
  backfill is ordered. Risk medium (policy, server and client must move
  together). Lane: one Sonnet build plus Opus review of the SQL.
- **B.** Keep on and everyone, but require an explicit confirmation on the
  first automatic post: a one-time sheet on the summary before
  `publishAmbientItems` runs ("Share this and every session automatically?
  Everyone / Followers / Not now"), keyed per user, with the Hub flush
  (`CommunityHubScreen.js:431-448`) and the summary flush gated on the same
  key. Files: `WorkoutSummaryScreen.js:403-458`, `ambient.js:152-175, 270-279`,
  a new small sheet component. Risk medium (a queued item must not post before
  the answer). Lane: one Sonnet build, Opus fresh-eyes review.
- **C.** Keep the default, add a one-time post-join receipt: after "Create
  profile" or the onboarding Join, a card on the Hub stating the audience with
  a direct "Change who sees this" link to Community privacy, dismissed once.
  Files: `CommunityHubScreen.js:740-819` notices block,
  `CommunityJoinScreen.js:368`, `onboardingJoin.js`. Risk low. Lane: Sonnet.
- **D.** Derived from the code: a ten-minute "Undo" on the summary strip for
  the automatic session post (delete via the existing post delete path), with
  no default change. Files: `WorkoutSummaryScreen.js:1402-1413`, `feed.js`
  delete. Risk low to medium. Lane: Sonnet.
- Under every option, three defects fix regardless: the strip uses
  `sessionsSharingSentence` instead of the literal
  (`WorkoutSummaryScreen.js:1406`); `readShareSettings` returns a failure the
  ambient path treats as gated instead of defaults with sharing on
  (`trainingProfile.js:506-520`, `ambient.js:160-161`); the Join create carries
  `sessions_audience` in the one call the server already accepts
  (`CommunityJoinScreen.js:334, 349-352`; `186:252-256`). Risk low. Lane: Haiku
  for the sentence swap, Sonnet for the other two.

### P2. One safety-state helper and a calm policy for nutrition surfaces

Touches ED-safety: yes, by composition only; no floor, gate or threshold
changes. Founder decision required on the policy; the helper itself is
lead-delegable.

- Helper: `useSafetyState(userId)` and `readSafetyState(userId)` in
  `src/hooks/usePhotoSuppression.js` (or a sibling), returning
  `{ calm, edFlagOpen, readFailed, suppressed, scoffPositive }`, built on the
  existing fail-closed reads, with a source guard pinning that no screen
  composes `calm || flag` inline. Call sites to migrate: the inline chains at
  `CoachOutputScreen.js:1116-1121, 1692-1693, 1918-1923`,
  `WorkoutSummaryScreen.js:898-903`, `HomeScreen.js:652-655`,
  `YouScreen.js:255-258`, `WeeklyStoryScreen.js:90`,
  `YearOfLiftsScreen.js:575-600`, `CoachHeldHistoryScreen.js:140-147`,
  `bodyMetricsPolicy.js:55-66` (feed, not replace),
  `energyChoiceEnforce.js:56-68`, `widgets/writer.js:133`, and the flag-only
  reads at `DiaryScreen.js:254, 404` and `GoalChangeSummaryScreen.js:181`. Risk
  medium (many files, behaviour-identical in phase one); covered by
  `usePhotoSuppression.test.js`, `edFlagFailClosed.guard.test.js`,
  `wellbeingFailClosed.guard.test`, `DiaryScreen.bankingAvailable.test.js`.
  Lane: one Sonnet build in two commits, Opus review.
- Policy options for the surfaces in the "unchanged" rows above:
  - **a.** Full suppression of numbers under calm and under a flag. This
    contradicts the calm toggle's own copy ("your plan and your numbers do not
    change", `SettingsCoachingScreen.js:147`) and the D75 founder verdict that
    the Diary rings render unconditionally ("Never re-propose hiding it",
    `DiaryScreen.js:1536-1540`), so it needs both reversed by the founder.
  - **b.** Numbers stay; a calm banner with the Beat signpost appears once per
    screen on the Diary, Food Insights, Nutrition targets (beside the floor
    banner and the energy-availability caution), the FFM hold row and the
    wellbeing check's positive result. Files: those screens plus
    `wellbeing.js:19` for a link variant. Risk low. Lane: Sonnet.
  - **c.** Two tiers, mirroring the body-metrics policy already in the app:
    under calm, totals stay and valence goes quiet (hide "under/over target"
    words, adherence day counts and "vs the week before" comparisons on Food
    Insights and the check-in; keep what is left to eat); under a flag,
    additionally withhold the weight-change figures that still print (the
    coach chip `:2777-2783`, the check-in trend `:1153`, the athlete-profile
    tile `:531`, the lift-progress ratio `:411`, the Today prefill
    `TodayStrip.js:107-113`) with the body-metrics line already written ("Your
    weigh-ins are kept here."). Rings and daily kcal stay, so D75 holds. Risk
    medium. Lane: Sonnet build, Opus review.
  - **d.** Helper only, no behaviour change, then revisit after the device
    walk.
- Also under any option: the recap CTA gate reads the helper
  (`CoachOutputScreen.js:2813`), and the three signpost sites share one
  component.

### P3. The recap card's "weight lost this week"

Touches ED-safety: yes (share-card suppression). Founder decision required:
the 2026-06-22 correction ordered the real number.

- **A.** Remove the weight hero and the coach "lost N kg" clause entirely; the
  card leads with the best lift, PRs and sessions. Files:
  `greatWeek.js:100-125, 162-175`; `ShareCardScreen.js:174, 1347-1349` (toggle
  removed); tests `greatWeek.test.js` (the on-target weight test) and the
  integration test.
- **B.** Replace with a non-weight hero: "right on target" with sessions
  completed of planned, or the best lift. Same files;
  `drawShareCard.js:1331-1334` unchanged.
- **C.** Leave the figure under the fail-closed suppress, and fix the four
  incoherences: the CTA gate reads calm and the open flag; the toggle starts
  off so it is the opt-in the comment claims; the figure prints in the
  person's body-weight unit (`formatBodyWeight` from `units.js:70`); the phase
  label is dropped under suppress (`ShareCardScreen.js:397`).
- **D.** Derived: keep the figure, opt-in only (toggle off by default),
  magnitude rounded to the nearest half kilogram, no coach clause.
- Risk low for all; suppression tests cover the stripped path. Lane: Sonnet.

### P4. Meal-log and planned-meal reminders respect an open flag while backgrounded

Touches ED-safety: yes, strengthening only.

- Minimal change: at the raise site (`CoachOutputScreen.js:2259`) also
  `await cancelMealReminders()` (`scheduler.js:497`) and
  `await cancelPlannedMealConfirm()` (`:1490`); at the clear site
  (`:2271-2278`) re-lay with `relayMealRemindersFromPrefs()` (`:605`) and
  `schedulePlannedMealConfirm(user.id)`; add a `planned_meal_confirm` branch to
  the handler (`handler.js:57-59` pattern, fail closed). Risk low;
  `notifications.handler.test.js`, `standDown.wiring.guard.test.js` and
  `edFlagFailClosed.guard.test.js` cover the neighbours (the last counts
  exactly seven `read_failed` reads in `scheduler.js`, so the new read belongs
  in `handler.js`, where it already has a helper). Lane: Sonnet, with a device
  case in the checklist.
- Options beyond the minimum, founder choice: (i) second-device parity,
  cancelling the same categories when a pulled flag opens a local row
  (`database.js:12543-12581` or the pull handler, lazy-requiring the
  scheduler); (ii) calm also cancels meal and weigh-in prompts and the
  schedulers read calm fail-closed, which changes calm's contract from
  "quieter progress prompts" to "no food or weight prompts"; (iii) bound the
  meal repeats to a dated run like the weigh-ins, closing the "noted, not
  changed" item in the locked doc.

### P5. Next steps when the engine refuses

Touches ED-safety: no.

- **A.** A chooser on every refusal surface: the suggested day count and
  length rows that exist, plus "Allow more equipment" (opens the equipment
  field at `PlanUpdateScreen.js:609-618` or onboarding step 4), "Review
  avoided movements" (`AvoidedMovements`, registered in all three stacks),
  "Build it yourself" (`ManualBuilder`, registered only in the Plans stack at
  `RootNavigator.js:585`, so a registration in the onboarding and home stacks
  is needed), and the plain muscle shortfall for `minimum_unreachable` (the
  refusal already carries `muscles`; the sentence exists in
  `messages.js:161`). Files: `adapt.js:502-519`, `messages.js`,
  `PlanPreviewSheet.js:415-443`, `ProOnboardingScreen.js:3150-3305,
  2136-2140`, `RootNavigator.js`. Copy pinned by
  `PlanPreviewSheet.structure.test.js`,
  `ProOnboardingScreen.structureFit.guard.test.js`, `adapt.test.js:286-306`.
  Risk medium. Lane: Sonnet, Opus review of the copy against the voice doc.
- **B.** Dead ends only: the Today card uses
  `navigateCrossTab(navigation, 'PlansTab', 'PlanUpdate')`
  (`HomeScreen.js:2641`); the onboarding failure alert carries the refusal
  text and a direct "Start with a plan" action; the preview sheet always
  offers "Change my setup" beside "Not yet". Risk low. Lane: Haiku for the
  navigate, Sonnet for the rest.
- **C.** A plus telemetry: refusal reason and suggestion codes to
  `engineTelemetry` (no PII), so the refusal rate is visible.
- Apply-path consistency, as a founder question rather than a fix: plans
  without facts (library, kit, manual) stay on the legacy volume apply that
  ignores kit and exclusions; ManualBuilder and the capability rewrite write
  engine plans with no gate (board follow-ups 2 and 3); generation fails open
  on an unreadable exclusions read while the check-in fails closed to no
  candidates. Options: leave as recorded; give library and kit plans facts at
  copy so one placement path serves all; or make the check-in's fail-closed
  case say so on the card instead of placing nothing silently.

### P6. Orphans

Touches ED-safety: no. Each is a founder choice because each traces to an
order.

- CoachReview: delete the screen and route; re-wire from the Recovery screen
  or the check-in as the volume-by-muscle review; or leave registered. The
  screen was maintained under D219 lane A5 while unreachable.
- MealNames: delete the screen and route; re-wire as a row under Nutrition
  targets (reverses the 2026-07-13 "not needed"); or leave.
- SettingsHealth and `health.js`: delete the stub screen, row and module (no
  dependency change); or leave dormant with the comment. Re-wiring needs
  native health modules, which would be a new-dependency ask and is not
  proposed.
- `ProgressScanHistoryCard`: delete or leave; no runtime effect.

### P7. Cardio

Touches ED-safety: no. Founder decision required: D92 item 1 forbids
re-enabling cardio routes or UI.

- **A.** Leave dormant: the boundary stands, the pull stays
  legacy-load-bearing, the stale comment naming two deleted screens
  (`cardioLog.js:4`) is corrected.
- **B.** Re-open the boundary with the lightest surface: a "Log activity"
  sheet from the Train tab or the workout summary writing `cardio_log`
  (activity name, minutes, intensity), a push handler added to `transport.js`
  and the registry direction flipped to bidirectional (server table exists
  from 064 and 087), with no kcal estimate shown.
- **C.** Re-open with an inline Diary "Activity" row (same writer, shown beside
  food). Risk medium for B and C (a new push handler on a soft-delete table).
  Lane: Sonnet with Opus review of the sync change.
- **D.** Remove the local table and pull. Not proposed: schema changes must be
  additive, and the pull protects existing cloud history.

### P8. Settings copy

Touches ED-safety: no.

- **A.** Hide the widget row on iOS and make the FAQ answer Android-only until
  an iOS widget ships (`SettingsScreen.js:119-130`,
  `SettingsFaqScreen.js:85-87`). Risk low; `liveActivity.wiring.test.js`
  unaffected. Lane: Haiku.
- **B.** Keep the row on iOS with honest copy ("Widgets are on Android. iOS
  widgets are on the way.").
- **C.** Wire the iOS extension. Founder-side provisioning (App ID, App Group)
  and a build risk the test records; not a copy fix.
- Also: correct the stale flag header (`structure/release.js:7-8`), the
  handover line, CLAUDE.md:56 and :92, the `ShareCardScreen.js:172` comment,
  the `YouScreen.js:538-541` comment, the two row-hold comments and the
  board's blank-tap attribution. Lane: Haiku, one commit.

### P9. Logger and diary

Touches ED-safety: no. All inside existing components, no dependencies.

- Small, high-frequency improvements (lead-delegable, pick any):
  1. The planned-meal toast counts slots like the banner, or says "foods"
     (`DiaryScreen.js:358`; `db.js:437`). Risk low. Lane: Haiku.
  2. "Use last session for this exercise": fills every pending row from
     `prevSets` through the existing `handleUseHistorySet` path (`:5278`,
     `lastCellFor :5240`), offered on the exercise header's overflow. Risk
     low; `verticalLogger` anchors untouched. Lane: Sonnet.
  3. Tick-all for supersets and per-side exercises, confirming the pair or
     both sides (`:5306-5316`, `handleLogRemaining :1556`). Risk medium
     (per-side rows write one set per pair). Lane: Sonnet, device case
     required.
- Monolith first cut, founder choice (phase one must be behaviour-identical
  and pass the 58 source guards, the 35 mount tests and the full gate):
  - **A.** Extract the rest flow: the rest sheet, hint and per-exercise length
    (`:616, 2584-2612, 1522-1528, 6111, 6167, 6196`) into a `useRestFlow` hook
    and a `RestLayer` component. Keeps the pinned RestTimer line in place.
  - **B.** Extract set entry: the well and keyboard-bar handlers and the set
    sheet (`:4959-5292, 6130-6226`) into `useSetEntry` and `SetEntryLayer`.
    Collides with the `openWell` and `openWellNow` body pins in
    `verticalLogger`, which would need re-pointing.
  - **C.** Extract PR detection: `detectPR` calls, `exerciseRecords`,
    `RecordLine` wiring (`:510-512, 3414-3427, 3832, 5345, 5976`) into
    `useSessionRecords`. Collides with `prReEval` guard regexes.
  - **D.** Leave intact for now.
  - **E.** Derived from the guards: move the three raw modals, five bottom
    sheets and the swap modal (`:6243-7338`, about 1,100 lines of JSX) into
    `SessionSheets.js` with props. No pinned anchor lives in that range, so
    the regex guards pass unchanged, and the mount tests exercise the result.
  - Lane for any cut: one Sonnet build, Opus review, device walk before the
    next cut.

### P10. Energy choice and training status

No change proposed. Both match D226. The founder device check from
2026-10-12 is still outstanding on the board.

---

## 4. Founder decisions needed before any implementation

Reply with the letter per item, for example "P1-C, P2-c".

1. **P1 Community default and first post**: A (followers default), B
   (first-post confirmation), C (post-join receipt), D (undo window), or a
   combination such as B+C. The three defects fix under every answer unless
   you say otherwise.
2. **P2 calm and flag policy on nutrition surfaces**: a (hide numbers;
   reverses the calm copy and D75), b (banner and Beat signpost, numbers
   stay), c (two tiers, valence quiet under calm, weight figures withheld
   under a flag), d (helper only). The helper itself proceeds under D33
   unless you stop it.
3. **P3 recap card weight figure**: A (remove), B (non-weight hero), C (keep,
   fix the four incoherences), D (opt-in, rounded, no clause). This reverses
   or keeps your 2026-06-22 correction.
4. **P4 notifications**: the minimal change proceeds under D33 unless you say
   otherwise. Choose any of (i) second-device parity, (ii) calm also silences
   food and weight prompts, (iii) bounded meal runs.
5. **P5 planner refusal**: A (chooser with equipment, avoided movements,
   manual builder and the muscle shortfall), B (dead ends only), C (A plus
   telemetry). And the apply-path question: leave, facts for library and kit
   plans, or a visible "no candidates" line.
6. **P6 orphans**: per item, delete, re-wire or leave (CoachReview; MealNames
   reverses 2026-07-13; SettingsHealth).
7. **P7 cardio**: A (boundary stands), B (lightest sheet), C (Diary row). D is
   not offered.
8. **P8 iOS widget copy**: A (hide on iOS), B (honest copy), C (wire the
   extension, founder-side provisioning first).
9. **P9 monolith first cut**: A, B, C, D or E. And which of the three small
   improvements to take.

---

## 5. Out of scope and deliberately not proposed

- No LLM, randomness or AI food input anywhere; the engine stays pure (the
  planner refusal copy is static text from `messages.js`).
- No paywall, tier, trial or price; the `tier !== 'pro'` gates in the
  scheduler pass for everyone because the store clamps tier to pro under
  `FULL_ACCESS_FOR_ALL` (`useAppStore.js:43-47`).
- No change to the calorie floors, the FFM floor, the rapid-loss and
  safe-loss gates, the Beat text, calm's existence or the flag suppression
  that exists; P2 and P4 only compose or extend the reads.
- No new dependency: the iOS extension, native health modules and any widget
  library beyond what is installed are named as founder-side or declined.
- No schema deletion: the cardio table and its pull stay under every option
  offered.
- No migration run and no edge-function deploy; a P1-A migration would be
  written and held for your exact phrase.
- Not re-proposed: the plate calculator, RPE/RIR, the flat timeline diary,
  hiding the Diary rings (D75), the rest-day notification, exercise media.
- No build or submission; when a lane lands, I will state what a build would
  carry and leave the build to you.
