# Volyume — Full App Map + Deep Research Prompts

_This document is designed to be given in full to any AI (Gemini, ChatGPT, Claude, Grok, etc.)
so it has complete context before answering the research prompts at the bottom._

---

# PART 1: COMPLETE APP MAP

## What Volyume Is

Volyume is a hypertrophy-focused bodybuilding workout logbook for iOS and Android, built in
React Native + Expo. It is offline-first (SQLite local database), with optional Supabase cloud
sync. It has a free tier (workout logging) and a Pro tier (Precision Coaching — personalised
plans, nutrition targets, weekly check-ins). Pro is free during the current beta.

**Design principles:**
- Private by design — no social feed, no public profiles, no sharing
- No gamification — no streaks, XP, badges, leaderboards, or achievements
- British English throughout
- Calm UX — no aggressive notifications or urgency mechanics
- Offline-first — 100% functional without internet
- Not described as "AI" — coaching is deterministic and rules-based

---

## Navigation Structure

```
RootNavigator
├── AuthStack (not logged in / first run)
│   ├── LoginScreen          — email/password, "continue without account"
│   ├── OnboardingScreen     — basic free-tier setup (units, name)
│   ├── WelcomeScreen        — free vs Pro tier selection
│   ├── FirstRunScreen       — free-tier first run (units, name → home)
│   └── ProOnboardingStack   — Pro first-run (5 steps)
│       ├── ProOnboardingScreen — sex, age, height, weight, BF%, activity, goal, phase, days, equipment, experience, weak points, nutrition preview
│       ├── CoachBuilderScreen  — generates plan from onboarding inputs
│       └── ProSetupCompleteScreen — "Start training" → completeFirstRun()
│
└── MainTabs (logged in)
    ├── HomeTab
    │   ├── HomeScreen             — weekly stats, weight log, next session CTA, volume snapshot, coaching nudge, today's plan
    │   └── ActiveWorkoutScreen    — live workout logging (CORE SCREEN)
    │
    ├── PlansTab
    │   ├── PlansScreen            — active plan, my plans, plan library, "Change your goals" CTA
    │   ├── PlanDetailScreen       — plan overview, workout list, activate/deactivate
    │   ├── PlanLibraryScreen      — browse template plans
    │   ├── RoutineDetailScreen    — single session view, exercise list, edit mode
    │   ├── ManualBuilderScreen    — create plan from scratch (step-by-step)
    │   └── CoachBuilderScreen     — rebuild coaching plan (goal/phase/schedule)
    │
    ├── ProgressTab
    │   ├── AnalyticsScreen        — weekly volume grid, PR rate sparkline, tonnage trend, auto-reg suggestion
    │   ├── VolumeHeatmapScreen    — per-muscle volume bars with target ticks, customisable targets
    │   ├── WorkoutHistoryScreen   — calendar + session list, repeat workout
    │   ├── WorkoutSummaryScreen   — post-workout summary (volume, PRs, auto-reg), read-only history view
    │   ├── ExerciseLibraryScreen  — searchable exercise database with muscle/equipment filters
    │   ├── ExerciseDetailScreen   — per-exercise history, PRs, strength standard, substitutes
    │   ├── PRWallScreen           — lifetime bests, strength-to-bodyweight standards
    │   └── YearOfLiftsScreen      — calendar heatmap of all sessions
    │
    └── ProfileTab
        ├── AthleteHubScreen       — Pro coaching hub (update goals, coaching output, check-in, body metrics, nutrition)
        ├── CoachOutputScreen      — weekly coaching plan output (sets, exercises, adjustments)
        ├── WeeklyCheckInScreen    — weekly feedback form (performance, soreness, energy, motivation)
        ├── BodyMetricsScreen      — body weight log, measurements log, trend charts
        ├── NutritionTargetsScreen — daily macro targets with explanation, protein approach selector
        ├── ProGoalSetupScreen     — change goal/phase/protein approach (quick update)
        ├── MesocycleBuilderScreen — create/view training blocks (currently informational)
        ├── SettingsScreen         — profile, units, calm mode, data export, account, privacy policy
        ├── NotificationSettingsScreen — rest timer and session reminder settings
        └── WellbeingCheckScreen   — eating behaviour wellbeing screen (SCOFF-adjacent)

    Modals / overlays (accessible from multiple screens):
    ├── ProUpgradeScreen       — upgrade to Pro prompt
    ├── ShareCardScreen        — shareable workout card (canvas-rendered image)
    ├── BlockReflectionScreen  — end-of-block reflection
    ├── CoachHeldHistoryScreen — coaching adjustment history
    └── BuildWorkoutScreen     — quick-start workout outside of plan
```

---

## All Screens — Detail

### HomeScreen
- Loads: weekly session count, total working sets, total volume (kg), last session name + tonnage, active plan + next workout, body weight for today, block progress, coaching nudge
- Displays: weight log input (kg / lbs / stone+lbs), weekly stats chips, "Start next session" CTA, session carousel (this week's plan), progression teaser (free tier)
- Writes: body weight entry via `logBodyMetric()`
- State: `weekStats`, `activePlan`, `nextWorkout`, `todayWeight`, `blockProgress`, `lastSession`, `teaserInsight`

### ActiveWorkoutScreen ← CORE SCREEN
- Displays: exercise name, previous session performance inline, weight/reps input (SetEntry), set type picker (working/warm-up/drop set), logged sets list, rest timer, plate calculator, progression suggestion chip, exercise swap button, finish workout button, exercise navigator (swipe or dots)
- Writes: `createWorkoutSet()` to SQLite on each set completion
- PR detection: runs `detectPR()` after every set → `PRCelebration` overlay if triggered
- Auto-advances to next exercise after last target set is complete (2.5s delay)
- Deload banner: shows if current week is flagged as recovery week
- Time-crunch mode: reduces set targets if session is running long
- Plate calculator: inline (not a modal)
- Rest timer: auto-starts on set complete, haptic at 10s and 3s remaining, haptic + sound at 0s
- Guards: `if (!activeWorkout) → navigate back`; `if (!exercise) → EmptyExerciseView`

### PlansScreen
- Two card lists: free-tier cards (Manual Builder, Browse Templates) + Pro cards (Change your goals)
- Active plan block with block progress bar, current week, deload flag
- "Change your goals" → CoachBuilderScreen (rebuilds plan)

### AnalyticsScreen
- Weekly volume snapshot grid (all muscles, colour-coded)
- PR rate sparkline (last 12 weeks)
- Monthly tonnage bar chart
- Auto-reg suggestion card
- Volume tooltip: plain English (no jargon)
- Filters all data to completed workouts only

### VolumeHeatmapScreen
- Horizontal bars per muscle, colour-coded (grey / green / amber / red)
- Two tick marks per bar: minimum effective / sweet spot
- Previous week ghost bar (translucent)
- "Edit Volume Targets" expandable section with per-muscle sliders
- Tooltip: explains ticks in plain English
- Window selector: this week / last 2 weeks / last 4 weeks

### WorkoutHistoryScreen
- Month calendar with coloured dots on training days
- Session list: date, name, duration, working sets, volume
- Each session: expandable exercise list, "Repeat" button (cross-tab navigate to ActiveWorkout)

### WorkoutSummaryScreen
- Post-workout: PR count, working sets, duration, volume, exercise list with sets
- Auto-reg suggestion if enough data
- Feedback sliders (performance, soreness, energy, motivation) — saved to weekly check-in
- `readOnly` mode for history view (hides feedback, replaces "Save" with "Done")

### AthleteHubScreen
- Pro-only. Shows: coaching summary card, "Update your goals" CTA, weekly check-in CTA, body metrics CTA, nutrition targets CTA
- Current goal, phase, protein approach displayed

### CoachOutputScreen
- Weekly coaching output: recommended sessions, sets per muscle group, rationale
- Adjustment history (what changed this week vs last)
- Nutrition summary

### WeeklyCheckInScreen
- Sliders: performance (1-5), soreness (1-5), energy (1-5), motivation (1-5)
- Muscle group flags: which muscles feel overworked / underworked
- Optional: unusual events (illness, travel, stress)
- Saves to SQLite `weekly_checkins` table
- Triggers weekly coach computation (`runWeeklyCoach()`)

### BodyMetricsScreen
- Body weight log with trend chart + slope calculation (gaining/losing/maintaining)
- Measurement log (waist, chest, arms, legs, etc.) with per-measurement trend charts
- Tab selector for measurement charts

### NutritionTargetsScreen
- Displays: calories (target, min, max), protein (g, g/kg), carbs, fat
- Protein approach toggle: Standard / Optimised / Advanced (with rates explained)
- "How was this calculated?" expandable panel
- Fat tooltip: explains per-phase g/kg logic
- Disclaimer: "These targets are estimates, not medical advice"
- Recalculates and saves when protein approach changes

### ProGoalSetupScreen
- Goal selector (grouped: Physique, Strength, General)
- Training phase selector (8 options)
- Protein approach selector (Standard / Optimised / Advanced with descriptions)
- Saves profile + recalculates nutrition on save
- Called from: AthleteHub "Update your goals" and WeeklyCheckInScreen

### CoachBuilderScreen
- Multi-step plan builder:
  Step 1: Goal selection
  Step 2: Training phase + weak point muscles
  Step 3: Schedule (days/week, session length, equipment, recovery rating, experience)
  Step 4: Plan preview (exercises, splits, sessions)
  Step 5: Nutrition summary + plan name + save
- Generates plan via `generatePlan()` from planEngine.js
- Saves plan, routines, exercises to SQLite
- Saves profile fields + protein approach + nutrition to AsyncStorage/Supabase
- First-run: navigates to ProSetupCompleteScreen (both Pro and free tier)

### PRWallScreen
- Lifetime bests per exercise (heaviest weight, most reps, highest estimated 1RM)
- Strength-to-bodyweight standards (Beginner / Novice / Intermediate / Advanced / Elite)
- Sorted by recency or by muscle group
- Share button → ShareCardScreen

### SettingsScreen
- Profile name edit
- Units: body weight (kg/lbs/stone), height (metric/imperial)
- Calm mode toggle (removes aggressive calorie framing, quietens prompts)
- Data: export CSV, full backup, restore from backup, clear history
- Account: sign out, delete account (cascade delete via Supabase RPC + local clear)
- Legal: Privacy Policy screen link
- About: version, beta note

### WellbeingCheckScreen
- 5-question eating behaviour screen (adapted from SCOFF questionnaire)
- Non-judgmental framing
- Resources provided if responses indicate concern

---

## All Components — Detail

### SetEntry.js
- Props: `value` ({weight, reps, setType}), `onChange`, `units`, `prevSet`
- Weight input: stepper (±2.5 kg) + freeform text (clamped 0-500 kg)
- Reps input: stepper (±1) + freeform text (clamped 1-200)
- Set type chip: working / warm-up / drop set
- Previous set display: shown above inputs when `prevSet` provided

### RestTimer.js
- Reads from Zustand store: `restTimerActive`, `restTimerRemaining`, `restTimerDuration`
- Animated progress bar (uses `restTimerRemaining` for sync accuracy)
- ±30s / ±60s adjustment buttons
- Haptics at 10s, 3s, 0s remaining
- Shows "Done!" overlay at 0s for 2s then disappears

### PlateCalculator.js
- Input: target weight (kg or lbs), bar weight
- Output: plate combination per side
- Available plates: 25, 20, 15, 10, 5, 2.5, 1.25 kg (or lbs equivalent)
- Displayed inline in ActiveWorkoutScreen below weight input

### PRCelebration.js
- Triggered by `showPRCelebration` Zustand action
- Animated overlay: PR type label (Heaviest ever / Most reps / Best estimated 1RM)
- 3× haptic pulse + 2s duration

### VolumeBars.js
- Props: `volume` (weekly volume by muscle), `landmarks`
- Colour-coded horizontal bars with tick marks
- Used in VolumeHeatmapScreen and AnalyticsScreen snapshot

### InfoTooltip.js
- Small info icon that opens a modal with plain-text explanation
- Used throughout to explain concepts without cluttering the UI

### ExerciseCard.js
- Exercise name, primary muscle chip, equipment chip
- Used in ExerciseLibraryScreen and exercise picker modal

### ProGate.js (`withProGuard` HOC)
- Wraps Pro-only screens
- If `tier !== 'pro'` → shows ProUpgradeScreen instead
- List of gated screens: NutritionTargets, BodyMetrics, WeeklyCheckIn, CoachOutput, CoachHeldHistory, BlockReflection, ProGoalSetup

### BrandMark.js
- SVG Volyume logotype, used in auth screens and ProSetupComplete

### EmptyState.js
- Generic empty state component with icon, title, body text, optional CTA button

---

## All Library Files — Functions

### algorithms.js (903 lines)

**Volume landmarks (static defaults, user-customisable):**
```
VOLUME_LANDMARKS: { muscle: { mev, mav, mrv } }
  chest:       mev 6,  mav 14, mrv 20
  back:        mev 10, mav 16, mrv 24
  front_delts: mev 0,  mav 6,  mrv 12
  side_delts:  mev 8,  mav 16, mrv 24
  rear_delts:  mev 4,  mav 14, mrv 20
  biceps:      mev 6,  mav 14, mrv 22
  triceps:     mev 6,  mav 12, mrv 18
  quads:       mev 8,  mav 14, mrv 20
  hamstrings:  mev 6,  mav 12, mrv 18
  glutes:      mev 4,  mav 10, mrv 16
  calves:      mev 8,  mav 14, mrv 20
  abs:         mev 0,  mav 16, mrv 24
  traps:       mev 6,  mav 12, mrv 18
```

**Exported functions:**
- `calculate1RM(weight, reps)` — ensemble Epley + Brzycki, weighted toward 3-8 rep range
- `calculateTonnage(sets)` — sum of weight × reps for working sets
- `calculateWeeklyVolume(sets, exerciseMap)` — working sets per muscle (RIR ≤ 2 or RPE ≥ 7 only, or no RIR logged)
- `getVolumeStatus(workingSets, muscle, customLandmarks)` — returns: below / optimal / getting_close / too_much
- `getProgressionSuggestion(currentSets, prevWorkoutSets, targetRepsMin, targetRepsMax, units)` — double progression: if reps ≥ max AND RIR ≤ 2 → increase weight; if reps < min → decrease weight; else → add a rep
- `computeSetTargets(prevSets, repMin, repMax, units, options)` — computes target weight/reps for each upcoming set
- `detectPR(newSet, historicalSets, exercise, units)` — detects: heaviest weight ever, most reps at weight, highest estimated 1RM; returns PR type or null
- `getAutoRegSuggestion(workoutFeedback, weeklyVolumeByMuscle, customLandmarks)` — returns volume adjustment recommendation
- `shouldDeload(last4WeeksData)` — multi-signal: soreness > 3.5 for 3+ weeks OR energy < 3.0 for 2+ weeks OR performance declining 2 consecutive weeks OR fatigue > 7
- `getExerciseSubstitutes(targetExercise, allExercises, userEquipment)` — ranks by: same primary muscle, SFR score, fatigue cost, equipment match
- `getProgressionPath(thisWeekSets, lastWeekSets, units)` — week-over-week progression direction
- `calculatePlates(targetWeight, barWeight, availablePlates)` — plate combination per side
- `STRENGTH_STANDARDS` — Beginner/Novice/Intermediate/Advanced/Elite per lift as % bodyweight
- `getStrengthStandard(lift, estimated1RM, bodyWeight)` — returns standard tier
- `computeAdaptiveDecision({soreness, performance, pump, joint})` — returns volume directive
- `runAdaptiveEngine(weekFeedback)` — processes full week feedback into coaching decision
- `computeAdaptiveLandmarks(history, baseDefaults)` — adjusts MEV/MAV/MRV based on personal response history
- `generateDeloadPrescription(prevSets, isFirstHalf)` — returns reduced set targets for recovery week
- `evaluateDeloadTriggers(events)` — returns trigger list with severity

### nutritionEngine.js (424 lines)

**Constants:**
- `PROTEIN_APPROACHES`: standard / optimised / advanced (rates below)
- `ADVANCED_PROTEIN_GOALS`: list of goals that auto-select 'advanced' approach
- `FAT_TARGETS_GKG`: per-phase fat targets in g/kg bodyweight
- Activity multipliers: sedentary 1.2 → very active 1.9

**Protein rates by approach and phase (g/kg BW):**
```
Standard:  lean_gain 2.2, build 2.2, maintain 2.0, recomp 2.2, mild_cut 2.5, aggressive_cut 2.7, contest_prep 2.9
Optimised: lean_gain 2.5, build 2.5, maintain 2.2, recomp 2.6, mild_cut 2.8, aggressive_cut 3.0, contest_prep 3.2
Advanced:  lean_gain 2.8, build 2.8, maintain 2.5, recomp 2.8, mild_cut 3.0, aggressive_cut 3.2, contest_prep 3.3
```

**Fat targets by phase (g/kg BW):**
```
lean_gain: 1.0, build: 0.9, maintain: 1.0, recomp: 0.85,
mild_cut: 0.8, aggressive_cut: 0.75, contest_prep: 0.7
Minimum floor: 0.5 g/kg BW (hormonal health)
```

**Calorie adjustments by phase:**
```
lean_gain: +5%, build: +10%, maintain: 0%, recomp: -5%,
mild_cut: -15%, aggressive_cut: -25%, contest_prep: -30%
```

**`calculateNutritionTargets(inputs)`:**
- Inputs: sex, age, height, weight (clamped: age 13-100, height 100-250cm, weight 30-350kg), bodyFatPercent, activityLevel, goal/phase, trainingGoal, proteinApproach, customProteinGPerKg, targetRateKgPerWeek
- BMR: Mifflin-St Jeor (no BF%) or Katch-McArdle (with BF%)
- Safety floor: 1500 kcal male, 1200 kcal female
- Hard gate: max 1.5% BW loss/week enforced by capping deficit
- Outputs: bmrKcal, maintenanceKcal, targetKcal, kcalMin, kcalMax, proteinG, carbsG, fatG, proteinGPerKg, estimatedWeeklyRateKg, warnings[]

**`runWeeklyCoach(inputs)` (weeklyCoach.js, 713 lines):**
- Inputs: userProfile, weeklyCheckin, previousCheckins, weeklyVolume, completedWorkouts, nutritionTargets, currentBlock
- Computes EWMA body weight trend (exponentially weighted moving average, α=0.1)
- Assesses data confidence (needs 3+ weigh-ins, 4+ weeks for full confidence)
- Outputs coaching adjustment: volume up/down, protein adjustment, deload flag, phase change recommendation, narrative explanation

### planEngine.js (1198 lines)

**Plan generation (`generatePlan(inputs)`):**
- Inputs: goal, phase, daysPerWeek, sessionLengthMinutes, equipment, experience, recoveryRating, weakPoints
- Split selection: 2 days → full body, 3 days → full body, 4 days → upper/lower, 5-6 days → push/pull/legs or body part split; strength goals → different defaults
- Volume assignment per muscle: base sets from landmarks, scaled by: experience (0.7-1.3×), recovery (0.8-1.2×), training phase, weak point bonus (+30% to flagged muscles)
- Exercise selection from POOL (categorised by muscle group and equipment)
- Rest times: compound 120-180s, isolation 60-90s
- Rep ranges: hypertrophy 8-15, strength 3-6
- Session length estimation via `estimateWorkoutMinutes()`

### phaseEngine.js (242 lines)
- Maps training phase to nutrition key, coaching key, volume multiplier
- `applyPhaseToInputs()` — adjusts plan inputs based on phase
- `getPhaseLabel()`, `getPhaseDescription()` — display strings

### swapEngine.js
- `rankSwaps(targetExercise, allExercises, options)` — scores alternatives by: muscle match (primary/secondary), SFR score, equipment match, fatigue cost, excludes exercises already in the workout

### blockAdvisor.js
- `getBlockAdvice(userId, block, userProfile)` — returns block progress advice: continue / heads_up / early_deload / in_recovery / post_recovery

### insightsEngine.js
- `getProgressionTeaser(userId, workoutId1, workoutId2)` — generates free-tier progression insight to nudge Pro upgrade

### recoveryEMA.js
- EWMA calculation for body weight trend smoothing

### wellbeing.js
- `isCalm()` — reads calm mode preference
- `getWellbeingMode()` — returns mode object

### database.js (2372 lines) — SQLite functions
All data access through parameterised queries. Key exports include:

**Workouts:** `createWorkout`, `updateWorkout`, `getAllWorkouts`, `getWorkoutById`, `getCompletedWorkoutSets`

**Sets:** `createWorkoutSet`, `getWorkoutSetsForWorkout`, `getLastNWorkoutSets`, `getAllCompletedSetsForExercise`

**Exercises:** `getAllExercises`, `getExerciseById`, `insertExercise`, `getExercisesByMuscle`

**Routines/Plans:** `createRoutine`, `addExerciseToRoutine`, `getRoutineExercises`, `createProgramme`, `getActivePlan`, `activatePlanWithBlock`

**Body metrics:** `logBodyMetric`, `getBodyMetrics`, `logMeasurement`, `getMeasurements`

**Personal records:** `savePersonalRecord`, `getPersonalRecords`, `getLifetimePRs`

**Weekly check-ins:** `saveWeeklyCheckin`, `getLastNCheckins`

**Mesocycles:** `createMesocycle`, `getActiveBlock`

**Migrations:** 10 incremental migrations (additive only — `ALTER TABLE ADD COLUMN`)

---

## Data Model

### SQLite (local, on-device)
```
workouts          — id, userId, routineId, mesocycleId, startedAt, endedAt, isCompleted, name, setCount, workingSetCount, totalVolume, intent, durationMinutes
workout_sets      — id, workoutId, exerciseId, userId, weight, reps, setType, setNumber, rir, rpe, notes, createdAt
exercises         — id, name, primaryMuscle, secondaryMuscles[], equipment, sfrScore, fatigeCost, isCustom
routines          — id, userId, name, splitType, programmeId, isActive
routine_exercises — id, routineId, exerciseId, order, repsMin, repsMax, recommendedSets, notes, startingWeight, restSeconds
programmes        — id, userId, name, description
mesocycles        — id, userId, name, lengthWeeks, phase, startDate
weekly_checkins   — id, userId, weekStartDate, performance, soreness, energy, motivation, musclesOverworked[], musclesUnderworked[], unusualEvents, soreMusles[]
body_metrics      — id, userId, loggedAt, weightKg, bodyFatPct, lbmKg, notes
measurements      — id, userId, measuredAt, waistCm, chestCm, leftArmCm, rightArmCm, leftThighCm, rightThighCm, neckCm, hipCm, shouldersCm, calveCm
```

### Supabase (cloud, optional)
All 15 tables mirror SQLite for relevant tables, plus:
```
users_profile        — id, firstName, sex, age, heightCm, weightKg, bodyFatPct, trainingGoal, trainingPhase, proteinApproach, daysPerWeek, experience, equipment[], tier, isFirstRunComplete, gdprConsented
personal_records     — id, userId, exerciseId, recordType, weight, reps, estimated1RM, achievedDate
weekly_volumes       — id, userId, weekEndingDate, volumeByMuscle{} (JSONB)
achievements         — id, userId, achievementType, achievedDate, metadata
autoregulation_suggestions — id, userId, workoutId, type, muscle, text, reason
```

**RLS:** All tables have Row Level Security with `auth.uid() = user_id` policies.

**GDPR:** `delete_user_data()` RPC — cascade deletes all user rows across all 11 tables.

---

## Zustand Store (useAppStore.js) — Key State

```javascript
// Auth
user, session, tier ('free'|'pro'), userProfile

// Active workout
activeWorkout          — { id, routineId, startedAt, ... }
workoutExercises       — [{ exercise, routineExercise, sets[] }]
currentExerciseIndex
workoutStartTime
lastActivityAt

// Rest timer
restTimerActive, restTimerRemaining, restTimerDuration

// PR celebration
prCelebrationVisible, prCelebrationData

// UI preferences
units                  — { bodyWeight: 'st'|'kg'|'lbs', height: 'metric'|'imperial' }

// Actions
startWorkout, endWorkout, addSetToCurrentExercise
startRestTimer, stopRestTimer, tickRestTimer
showPRCelebration
saveLocalProfile, completeFirstRun
setTier, refreshTierFromCloud
```

---

## Configuration

### app.json (key fields)
```json
{
  "name": "Volyume",
  "slug": "volyume",
  "scheme": "volyume",
  "version": "1.1.0",
  "android": {
    "package": "app.volyume",
    "versionCode": 2,
    "targetSdkVersion": 34,
    "minSdkVersion": 24
  },
  "ios": {
    "bundleIdentifier": "app.volyume"
  },
  "plugins": ["expo-secure-store", "expo-notifications"]
}
```

### eas.json (build profiles)
- `development`: dev client, iOS simulator
- `preview`: APK for internal device testing
- `production`: signed AAB (Google Play app bundle), autoIncrement version codes

### Security
- Auth tokens: stored in `expo-secure-store` (encrypted at rest)
- Deep links: validated for `volyume://` scheme before processing
- No service role key in client code
- Error boundary: limits stack trace to 5 lines in production

---

## Current Limitations (Explicitly Accepted)

1. **No Supabase sync implemented** — Supabase client exists, RLS + schema in place, but sync is fire-and-forget (upload on login, no delta sync). Offline is the source of truth.
2. **Mesocycles informational only** — created and stored, but `activeMesocycle` does not affect coaching, volume accumulation, or deload timing
3. **RIR not required** — users can log without RIR; algorithms default RIR=2 assumption
4. **No wearable integration** — no HRV, heart rate, or sleep data
5. **No food diary** — nutrition targets only, no meal logging
6. **No social** — deliberately private
7. **No gamification** — deliberately excluded

---

---

# PART 2: RESEARCH PROMPTS

_Copy each prompt separately and give it to your chosen AI. You can paste PART 1 above as context before each prompt._

---

## Research Prompt A — Competitive Product & UX Gap Analysis

You have the complete technical and product map of Volyume above. Now research every major competitor and identify every gap.

**Apps to research:**
Hevy, Strong, RP Hypertrophy App, Dr. Muscle, Fitbod, Boostcamp, WHOOP,
Renaissance Periodization, Trainerize, GymAI, GainzApp, Caliber, Future,
Volt Athletics, Ladder, Centr, Freeletics, Jefit, Bodyspace (Bodybuilding.com),
Iron / Progression, Sigma Nutrition (coaching), Stronger by Science app,
Barbell Medicine app, Starting Strength App, Mass (podcast/app)

**Research what each competitor does better in:**

1. Workout logging UX — tap targets, set entry speed, voice input, Apple Watch input, quick log
2. Progressive overload — how do they suggest weight/rep increases? What algorithms?
3. Volume tracking — how do they track MEV/MAV/MRV or equivalent? Per muscle? Per session?
4. Adaptive/AI coaching — how do they personalise plans? What inputs do they use?
5. Recovery tracking — what signals? Subjective only or HRV/sleep?
6. Nutrition integration — how tightly is nutrition linked to training phases?
7. Periodisation — mesocycles, deloads, peaking — what UI do they use?
8. Exercise library — what makes theirs better? Video, cues, substitution, search?
9. Analytics and visualisation — what charts, metrics, views do users love most?
10. Onboarding — how long, what questions, what personalisation do they achieve?
11. Community/social — even if Volyume won't add this, what retention does it provide competitors?
12. Wearable integration — what does WHOOP/Garmin/Apple Watch integration unlock?
13. Monetisation UX — how do elite apps handle free vs premium paywall?
14. App store reviews — what do users of each app love/hate? What do they beg for?

**For each gap found, tell me:**
- The exact feature
- Which competitor(s) have it
- Why users value it
- Severity: Critical / High / Medium / Low
- Whether it conflicts with Volyume's core principles (private, no gamification, no social, no food logging)

**Output:** Markdown with a gap table per category, then a priority-ranked top 25 gaps.

---

## Research Prompt B — Hypertrophy Science Methodology Audit

You have the complete algorithm and nutrition implementation of Volyume above.
Now audit every calculation against current scientific evidence.

**Audit each area:**

1. **Volume landmarks** — Are the MEV/MAV/MRV static defaults (e.g. chest: 6/14/20) scientifically defensible? What does the current literature say about inter-individual variation? How should landmarks vary by sex, training age, frequency, and exercise selection?

2. **Progressive overload algorithm** — Is double progression correct as the default model? When should weight increase vs reps vs sets? What does research say about plateau mechanisms? How should the algorithm differ for beginners vs advanced?

3. **Proximity to failure** — Is RIR ≤ 2 the right cutoff for a "working set"? Does the literature support this? What is the minimum effective stimulus per set?

4. **1RM calculation** — Is the Epley/Brzycki ensemble correct? How accurate are formula-based 1RM estimates? Should the rep range weighting be different?

5. **Deload triggers** — Is the multi-signal deload detection (soreness > 3.5 for 3+ weeks, energy < 3.0 for 2+ weeks, declining performance, fatigue > 7) evidence-based? What signals have the best predictive validity for overreaching?

6. **Protein targets** — Are 2.2-3.3 g/kg BW ranges across phases correct? What is the current scientific consensus? Should it be per lean body mass or total body weight? Is the elevation of protein in cuts (up to 3.3 g/kg) supported?

7. **Fat targets** — Is 0.7-1.0 g/kg BW per phase correct? Is 0.5 g/kg the right hormonal minimum? What does the evidence say about fat requirements for performance and hormone production?

8. **Calorie surplus size** — Is +5-10% for lean gain and +10% for build evidence-based for muscle gain without excessive fat gain? What does the research say about optimal surplus size?

9. **BMR formula selection** — Mifflin-St Jeor vs Katch-McArdle vs Harris-Benedict — which is most accurate for this population and why? Are the activity multipliers correct?

10. **Exercise SFR scores** — Is stimulus-to-fatigue ratio a scientifically validated construct or an RP heuristic? What research supports or challenges it?

11. **Periodisation model** — The app uses block periodisation (one phase at a time). What does research say about DUP, conjugate, and other models for hypertrophy?

12. **EWMA body weight trend** — Is α=0.1 the right smoothing factor? How should body weight trends be interpreted for coaching decisions?

**For each gap:**
- What Volyume currently does
- What the evidence says
- Severity: Critical / High / Medium / Low
- Specific recommendation

Include researcher names and study references.

---

## Research Prompt C — Coaching, Autoregulation & Periodisation Deep Dive

You have the full Volyume coaching system above (CoachBuilder, WeeklyCheckIn, runWeeklyCoach). Now research every gap against elite coaching practice and sports science.

**Research each domain:**

1. **Autoregulation systems** — RPE-based (Mike Tuchscherer / RTS), velocity-based training (VBT), HRV-based, subjective readiness. How do elite coaches use these? Can they be implemented in a self-coaching app without a human coach?

2. **Mesocycle structure** — How do elite bodybuilding coaches structure 4-8 week blocks? Accumulation, intensification, realisation phases. How should a self-coaching app implement this without overwhelming the user?

3. **Volume progression within a mesocycle** — How do elite coaches ramp volume week to week? When do they deload? How do they determine the starting volume for a new client? How should the app calibrate this automatically?

4. **Weekly check-in signals** — What check-in questions give the most useful coaching signal? Research what Future, Caliber, TrainHeroic, and other platforms ask in their weekly reviews. What is the minimum viable check-in that retains user compliance while providing enough signal?

5. **Individual volume calibration** — How do elite coaches determine someone's MRV empirically? How should an app do this progressively over multiple training blocks without a human coach?

6. **Sex differences in programming** — How does optimal training volume, frequency, and recovery differ between males and females? How should Volyume's plan generation and coaching adapt for this?

7. **Training age adaptations** — How should programming differ for beginners (0-1 year), intermediates (1-3 years), and advanced (3+ years)? How should the plan generator adapt?

8. **Contest prep specifics** — What does elite bodybuilding contest prep look like? Peak week protocols (water, sodium, carb loading). How should an app handle the unique demands of contest prep?

9. **Transition between phases** — How should the app handle the transition from a bulk to a cut? From a cut back to maintenance? What are the physiological and programming considerations?

10. **Feedback loop quality** — How should the weekly coaching output be framed? What tone, level of detail, and specificity do users find most actionable? Research what makes coach feedback high vs low quality.

**For each gap:** Critical / High / Medium / Low + specific recommendation.

---

## Research Prompt D — UX, Retention, Onboarding & Monetisation Benchmarking

You have the full Volyume UX and onboarding structure above. Now benchmark against elite fitness apps and UX research.

**Research each area:**

1. **Onboarding** — What does research say about optimal onboarding length and friction for fitness apps? What do Headspace, Noom, Future, WHOOP, and Fitbod do in their onboarding that makes it effective? What is the time-to-first-value for each? What information is essential upfront vs can be collected progressively?

2. **Retention** — D1/D7/D30 retention benchmarks for fitness apps. What separates high-retention apps (WHOOP, Fitbit, Peloton) from average ones? How do apps create habit formation without gamification? What triggers bring lapsed users back?

3. **First workout experience** — What does the ideal first session look like for a user who has never logged a workout? How do Hevy, Strong, and Fitbod handle this? What guidance do elite apps give during the first session?

4. **Empty states** — How do elite apps handle empty analytics screens, empty workout history, no exercises yet? What is best practice for progressive feature disclosure?

5. **Notifications** — What notification types have the strongest evidence for driving engagement? How do WHOOP and Fitbod use notifications? What is the minimum effective notification strategy for a "calm" app?

6. **Pro conversion** — What are the most effective patterns for free-to-paid conversion in fitness apps? How do elite apps time and frame upgrade prompts? What features most effectively drive premium conversion in training apps? How should the transition from "free beta" to "paid Pro" be managed without losing users?

7. **Accessibility** — What accessibility features do elite fitness apps include? What WCAG guidelines are most relevant to a dark-mode gym app? What accommodations matter most for the gym environment (large tap targets, gloved hands, bright light conditions, one-hand use)?

8. **Platform UX differences** — iOS vs Android user expectations for fitness apps. Platform conventions that must be followed. What does each platform's HIG say about fitness/health apps?

9. **Trust and privacy messaging** — How do privacy-first apps communicate their commitment effectively? What language and UI patterns build user trust around personal health data?

10. **Gym-specific UX** — What are the unique UX challenges of using an app in a gym (noise, gloves, wet hands, bright overhead lighting, time pressure between sets)? How do elite apps address these?

**For each gap:** Critical / High / Medium / Low + specific recommendation.

---

## How to Use These Prompts

1. Copy PART 1 (the full app map) and paste it before each research prompt
2. Give each prompt + app map to: ChatGPT (o1 or GPT-4o), Gemini (Ultra/Advanced), Claude (Opus), Grok, and any others
3. Collect all responses
4. Feed them back here — I will synthesise everything into a prioritised gap list, map each gap to specific files in the codebase, and produce an implementation plan for the next phase of development

The goal: Volyume should be measurably better than every competitor in its core use case (hypertrophy-focused self-coaching) by the end of the next development phase.
