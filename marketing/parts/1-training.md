# VOLYUME Marketing Fact-Base — Part 1: Training & Progress

Read-only extraction. Every feature line below is TRUE-AS-SHIPPED and traced to
real code. Roadmap / partial / unverified items are quarantined in their own
sections at the foot of the document. British English. No em dash.

**Tier rule (verified).** `src/lib/proGate.js` gates the app all-or-nothing:
`tier === 'pro'` unlocks everything, otherwise Free (`PRO_BETA_ACTIVE = false`
for production, so tier comes from each user's real trial / subscription
state). CLAUDE.md's mandate: Free is the training core (Plan Library, builder,
workout logging, exercise library, PBs, progress stats); Pro is
nutrition/coaching. Verified against `RootNavigator.js`: the training and
progress screens (`ActiveWorkout`, `BuildWorkout`, `ManualBuilder`,
`PlanLibrary`, `Plans`, `RoutineDetail`, `ExerciseDetail`, `MesocycleBuilder`,
`WorkoutHistory`, `WorkoutSummary`, `VolumeHeatmap`, `LiftProgress`,
`Consistency`, `YearOfLifts`, `Analytics`) are registered WITHOUT
`withProGuard`. The coaching-engine surfaces (`CoachOutput`, `WeeklyCheckIn`,
`PlanUpdate`, `ProGoalSetup`, `CoachingReminders`, `LogCardio`,
`CardioHistory`, `Partner`) ARE wrapped in `withProGuard`. In-session
readiness/autoregulation is gated inline by `tier === 'pro'` in
`ActiveWorkoutScreen.js`.

---

## 1. TRAINING FEATURES

### Logging (Free)

- **Free workout logging** — log every set (weight and reps) as you train, no
  plan required. Start a blank session and just lift. Free.
  (`ActiveWorkoutScreen.js`; HomeScreen "Start workout" / blank-session hero.)
- **Editable and deletable logged sets, in-session** — tap any logged set to
  open an "Edit set" sheet and change weight/reps, or delete it outright,
  during the workout. Free. (`ActiveWorkoutScreen.js` editSet overlay,
  `removeSetFromCurrentExercise`, "Delete set?" confirm.)
- **Weight carried forward** — after you log a working set the next set
  pre-fills the SAME weight and reps you just did (Strong/Hevy behaviour), so
  logging the next set is effectively one tap. Free. (`ActiveWorkoutScreen.js`,
  `setCurrentSet` carry-forward.)
- **Warm-up sets** — sets can be marked warm-up and are excluded from tonnage,
  working-set counts and PR detection. Free. (`warmupRamp.js`,
  `summariseWorkoutSets`.)
- **Supersets in-session** — exercises that share a superset group alternate in
  the live session. Free. (`ManualBuilderScreen.js` superset authoring,
  `ActiveWorkoutScreen.js` shared `supersetGroupId`.)
- **Plate maths and warm-up ramp helpers** — the loading suggestions and
  plate breakdown are computed on device. Free. (`plateMath.js`,
  `warmupRamp.js`, used in `ActiveWorkoutScreen.js`.)
- **Rest timer (see below)** — Free, not tier-gated.

### Rest timer, incl. background survival (Free)

- **Rest timer** — a countdown starts automatically after a logged set
  (auto-start is a preference), with 3-2-1 end cues. Free, no tier gate.
  (`components/RestTimer`, `ActiveWorkoutScreen.js` `startRestTimer`,
  `restTimerMath.js`, `restSuggest.js`, `restSound.js`.)
- **Native background survival (Android)** — during a rest window the countdown
  ticks NATIVELY on the lock-screen notification, the app process is protected
  from OS reap for the window, and the end-of-rest alert is a separately
  scheduled exact/inexact alarm that survives process death. This is a real
  native Expo module, not a JS sticky. Free.
  (`modules/rest-timer-live/` `WorkoutForegroundService.kt` — Android 14+
  SHORT_SERVICE foreground service; `restEnd.js` alarm.)
  Note: the native rest-timer module ships `"platforms": ["android"]` only
  (`expo-module.config.json`). See honest limits for iOS.

### Deterministic coaching / volume engine — MEV/MRV/MAV (mixed)

- **Volume landmarks per muscle** — every muscle carries maintenance (MV),
  minimum-effective (MEV), maximum-adaptive (MAV) and maximum-recoverable (MRV)
  weekly-set landmarks. These drive the heatmap and the plan generator. The
  landmark model itself is visible Free via the heatmap; the auto-progression
  that moves your sets between them is Pro. (`algorithms.js` `VOLUME_LANDMARKS`,
  `planEngine.js`.)
- **Deterministic plan generation** — a pure-function engine builds a
  hypertrophy plan (split, exercise pool, sets, rep ranges, rest) from the
  user's profile. No AI, no `Math.random()`. Pro (runs in Pro onboarding /
  re-plan). (`planEngine.js` "Pure functions only, no side effects, no DB
  calls, no Math.random()", `planAutoGen.js`, `poolGenerator.js`.)
- **Weekly coach run** — the deterministic weekly review that reads your logged
  volume, recovery and check-in and adjusts next week's sets within the MEV to
  MRV band, and tells you WHY. Pro. (`weeklyCoach.js` `runWeeklyCoach`,
  `coachApply.js`, surfaced on `CoachOutputScreen` behind `withProGuard`.)
- **In-session autoregulation (readiness / intent)** — at session start you can
  answer a short readiness/intent prompt (sharp / average / below par, with
  optional sleep and energy chips). A "below par" answer trims that session
  DOWNWARD only (one fewer set per lift, load trimmed ~5% rounded down) and
  explains why; a good day NEVER pushes beyond the written plan. Pro, gated
  inline. (`ActiveWorkoutScreen.js` `tier === 'pro'`; `sessionAdjustments.js`
  `getReadinessTweak` / `READINESS_RULES`; `components/ReadinessCards.js`.)
- **Per-session set autoregulation (COMP-015)** — inside a mesocycle the engine
  can nudge this session's set count from recent signals, logging every
  decision to an audit trail. Pro. (`sessionAdjustments.js`
  `computeSessionAdjustments`; runs only with a live `mesocycleWeekId`.)

### Plan library (Free)

- **Plan Library** — a browsable library of ready-made training plans you can
  start in a couple of taps. Free. (`PlanLibraryScreen.js`, `seedRoutines.js`
  `LIBRARY_PLANS`, `getLibraryPlans`.)
- **31 built-in plans** (verified count, see Proof Points) spanning beginner
  full-body, PPL, upper/lower, bro splits, specialisation blocks (chest/back/
  legs/glutes/arms/V-taper), minimalist/busy-schedule, dumbbell-only,
  home/no-equipment, women-specific foundations, and off-season plans for every
  physique division. Free.

### Manual builder (Free)

- **Manual workout builder** — build your own multi-day plan: add exercises,
  set sets/reps/rest per exercise with steppers, duplicate exercises, reorder,
  and pair supersets. Free. (`ManualBuilderScreen.js`, `BuildWorkoutScreen.js`,
  `RoutineDetailScreen.js`.)
- **Supersets (pairs)** — two exercises sharing a group id become a superset;
  capped at a pair because the live session alternates exactly two. Free.
  (`ManualBuilderScreen.js` `toggleSupersetSelect`.)

### Mesocycles / blocks / deloads (mixed)

- **Training blocks (mesocycle scheduler)** — a block runs accumulation weeks
  then a built-in recovery (deload) week: standard = 4 build + 1 recovery
  (5 weeks), advanced = 5 build + 1 recovery (6 weeks), with per-week set
  multipliers (1.00 up to 1.25, then 0.50 on recovery). The manual Training
  Blocks builder is reachable Free (no `withProGuard`, no tier gate).
  (`mesocycle.js` `MESO_SCHEDULE`, `MesocycleBuilderScreen.js`.)
- **Automated block progression and deload detection** — the engine's automatic
  week progression / deload logic is driven by the Pro weekly coach. Pro.
  (`mesocycle.js`, `weeklyCoach.js`, `blockAdvisor.js`.)

### Division-specific programming (Pro)

- **Physique-division programming** — competitors pick their division and the
  plan generator biases volume landmarks and exercise selection to that
  division's judged muscles (e.g. glute ceilings raised for Bikini/Wellness/
  Figure). Eight divisions plus a non-competing "general" option. Pro (division
  is chosen in Pro goal setup). (`coachingGoals.js` division values;
  `planEngine.js`; `divisionDiff.js`.)
- **Division fingerprint on the heatmap** — when your active plan IS the
  generated division plan, the heatmap marks which muscles the division wants
  elevated or capped. Shown only when that data exists. (`VolumeHeatmapScreen.js`
  `divisionMarkers`.)

### Progress, history and recaps (Free)

- **Workout history** — full log of past sessions. Free.
  (`WorkoutHistoryScreen.js`.)
- **Post-session summary** — after finishing, a recap of the session: total
  sets, tonnage, PRs hit, block shape, milestones claimed. Free.
  (`WorkoutSummaryScreen.js`.)
- **Lift Progress** — one row per exercise you have actually trained, each with
  a sparkline of best estimated-1RM per session and a percent change. Free.
  (`LiftProgressScreen.js`, `liftProgress.js`.)
- **Consistency** — your training consistency view. Free.
  (`ConsistencyScreen.js`.)
- **Volume heatmap** — per-muscle weekly working-set volume plotted against that
  muscle's MV/MEV/MAV/MRV landmarks, with a trend window (4W/8W/3M/6M) and
  editable custom landmarks. Free. (`VolumeHeatmapScreen.js`.)
- **Year of Lifts** — a swipeable, Spotify-Wrapped-style annual recap: one stat
  per full-screen story card. Free. (`YearOfLiftsScreen.js`, also the RecapStory
  route.)
- **Progress / Analytics tab** — the Progress hub screen. Free.
  (`AnalyticsScreen.js`.)
- **Training milestones** — session-count milestones (first session, 10, 25,
  50, 100, 250, 500) surfaced with a burst on the summary. Free.
  (`components/ReadinessCards.js` `MILESTONES`, `milestones.js`,
  `WorkoutSummaryScreen.js`.)

### Personal bests (Free)

- **Automatic PB detection with in-session celebration** — every logged working
  set is checked against your history and a PB fires a celebration. Three PB
  types are detected: new estimated 1RM, new heaviest weight, and most reps at a
  given weight. Collapsed to one headline PB per exercise per session. Free.
  (`algorithms.js` `detectPR` / `bestPRPerExercise`, `ActiveWorkoutScreen.js`
  `showPRCelebration`, `getWeeklyPRCount` in `database.js`.)
- **Estimated 1RM** — uses `calculate1RM` (Epley `weight * (1 + reps/30)`) so
  PBs and the weekly PR count agree. Free. (`algorithms.js`, `bestLift.js`.)

### Exercise library (Free)

- **Exercise library** — 448 built-in canonical exercises (verified count),
  each with primary muscle, secondary muscles, equipment, movement pattern,
  compound/isolation flag and default rep range. Browsable, and users can add
  their own custom exercises. Free. (`seedExercises.js` `RAW`,
  `ExerciseDetailScreen.js`, `getAllExercises`.)
- **Exercise detail + form tips** — per-exercise detail with text coaching
  cues. Free. (`ExerciseDetailScreen.js`, `formTips.js`.)

### Cardio (Pro)

- **Structured cardio coaching** — the coach prescribes a DOSE (sessions x
  duration x intensity), never a specific activity, capped so a cut can never
  spiral it (max 5 sessions/week; cut default 3 easy 20-30 min sessions).
  Compliance comes from the actual log. Pro. (`cardio/cardioEngine.js`,
  `LogCardioScreen`, `CardioHistoryScreen` behind `withProGuard`.)

---

## 2. PROOF POINTS (verified from code)

- **448 exercises** in the built-in library. (`seedExercises.js` `RAW` array,
  counted: 448 rows.) Plus 16 extra plan-support exercises seeded by
  `seedRoutines.js` `REQUIRED_EXERCISES`, and unlimited user-added custom
  exercises.
- **31 built-in training plans** in the Plan Library. (`seedRoutines.js`
  `LIBRARY_PLANS`: 31 numbered plan headers, 31 `tags:` and 31 `difficulty:`
  fields.)
- **8 physique divisions** programmed for, plus "general" / not competing:
  Men's Physique, Classic Physique, Bodybuilding, Bikini, Wellness, Figure,
  Women's Physique, Women's Bodybuilding. (`coachingGoals.js` division values.)
- **3 PB types** auto-detected per set: estimated 1RM, heaviest weight, most
  reps at a weight. (`algorithms.js` `detectPR`.)
- **7 training milestones**: first session, 10, 25, 50, 100, 250, 500 sessions.
  (`ReadinessCards.js` `MILESTONES`.)
- **Mesocycle length**: standard block 5 weeks (4 build + 1 recovery), advanced
  6 weeks (5 build + 1 recovery); recovery week runs at 0.50 set multiplier.
  (`mesocycle.js` `MESO_SCHEDULE`.)
- **Cardio cap**: max 5 sessions/week; cut default 3 sessions of 20-30 min low
  intensity. (`cardioEngine.js` `MAX_CARDIO_SESSIONS`, `cutCardioTarget`.)
- **Tap counts** (verified as single-action handlers):
  - Repeat last session = one action from the Home hero
    (`HomeScreen.js` `handleRepeatLastSession`).
  - Start a workout / blank session = one action from the Home hero
    (`HomeScreen.js` "Start workout").
  - Log the next set = effectively one tap once weight/reps carry forward from
    the set you just logged (`ActiveWorkoutScreen.js` carry-forward).
  - Start a plan from the library = a couple of taps (open plan, start).
    Exact per-screen tap count is a UI detail: state as "in a couple of taps",
    not a hard number. [UNVERIFIED exact tap total - confirm on device.]

---

## 3. DIFFERENTIATORS (grounded, with file basis)

- **Deterministic and explainable, never AI.** The whole coaching brain is pure
  functions with no LLM, no randomness: identical inputs always give identical
  outputs, and it tells you WHY it changed a set or load. Basis: `planEngine.js`
  header ("Pure functions only, no side effects, no DB calls, no Math.random()"),
  `mesocycle.js`, `cardioEngine.js`, `sessionAdjustments.js` (per-decision "why"
  strings and audit-trail logging), CLAUDE.md engine mandate.
- **Division-specific programming.** Real bodybuilding/physique divisions bias
  the plan's volume and exercise choice to the muscles that division is judged
  on. Basis: `coachingGoals.js` (8 divisions), `planEngine.js`,
  `divisionDiff.js`, `VolumeHeatmapScreen.js` division markers.
- **Free workout logging, full-featured.** Log every set, edit or delete sets
  mid-session, PB detection, rest timer with native background survival, 31
  plans and 448 exercises, and the full progress suite are all Free, with no
  tier wall. Basis: `RootNavigator.js` (training screens not `withProGuard`),
  `proGate.js`, `modules/rest-timer-live/`.
- **Readiness-aware but safe.** In-session autoregulation only ever adjusts
  DOWNWARD; a good day never pushes past the written plan. Basis:
  `sessionAdjustments.js` `READINESS_RULES` (sharp = no change),
  `applyReadinessToSets`/`applyReadinessToLoad` (downward-only, floored).

---

## 4. HONEST LIMITS in this domain (verified by absence)

- **No exercise demo videos or animations.** No video/gif/animation assets or
  players found for exercises; coaching is text cues only. (No matches for
  video/mp4/demo/animation in `src/lib`, `src/screens`, `src/components`;
  `formTips.js` is text.)
- **No velocity-based training / bar-path / VBT.** No barbell-path, rep-velocity
  or tempo-tracking feature. ("velocity" appears only incidentally; no VBT
  module exists.)
- **No lifting wearable / smartwatch app.** There is no Wear OS or Apple Watch
  companion, no live heart-rate during lifting, and no auto set-detection.
  Health Connect / HealthKit integration exists but is READ-ONLY and scoped to
  weight, daily steps, and completed cardio sessions + their heart rate
  (feedback-only) for the nutrition/cardio side, not lifting. Workout
  write-back to Health is explicitly "planned, not yet wired". (`health.js`
  header scopes; `SettingsHealthScreen.js`.)
- **Supersets are pairs only.** The live session alternates exactly two
  exercises, so giant sets / tri-sets of 3+ cannot be authored. (`ManualBuilder`
  toast "Supersets pair two exercises for now.")
- **Native background rest timer is Android-only.** The `rest-timer-live` native
  module ships `"platforms": ["android"]`. iOS uses the Live Activity module
  (`modules/live-activity`, iOS) and does not have this Android foreground
  service; iOS parity for the background rest chronometer is not confirmed in
  this module. [Confirm iOS rest-timer behaviour before claiming parity.]
- **In-session autoregulation and the weekly coach are Pro.** A Free user logs
  and tracks fully, but the adaptive week-to-week volume progression, readiness
  tweak, and division plan generation are Pro. (`RootNavigator.js`,
  `ActiveWorkoutScreen.js` `tier === 'pro'`.)

---

## ROADMAP / NOT-YET (do not use as live features)

- **Workout write-back to Apple Health / Health Connect** — `health.js` lists
  `'workout'` under "Write scopes planned (not yet wired)". Not shipped.
- **iOS native background rest chronometer** — the foreground-service rest timer
  is Android-only in `rest-timer-live`; iOS parity unconfirmed here.
</content>
</invoke>
