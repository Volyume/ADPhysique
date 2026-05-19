# Volyume — Full Architectural Map & Feature Inventory
> Branch: `claude/build-volyume-app-srY9C`  
> Last updated: 2026-05-19  
> Purpose: Deep-research reference. Everything that exists, how it connects, and what is planned next.

---

## Table of Contents

1. [Product Philosophy](#1-product-philosophy)
2. [Tech Stack](#2-tech-stack)
3. [Navigation Structure](#3-navigation-structure)
4. [Screen Inventory — All 26 Screens](#4-screen-inventory)
5. [Component Library — 9 Components](#5-component-library)
6. [Engine & Library Files — 19 Files](#6-engine--library-files)
7. [Database Schema — 15 Tables](#7-database-schema)
8. [Global State (Zustand)](#8-global-state-zustand)
9. [Core Algorithms](#9-core-algorithms)
10. [Intelligence Engines Summary](#10-intelligence-engines-summary)
11. [Plan Generation System](#11-plan-generation-system)
12. [Nutrition System](#12-nutrition-system)
13. [Volume Landmarks System](#13-volume-landmarks-system)
14. [Legal & Brand Constraints (CRITICAL)](#14-legal--brand-constraints-critical)
15. [Current App State — What is Built](#15-current-app-state--what-is-built)
16. [Pending Work — Weekly Coach / Pro Tier](#16-pending-work--weekly-coach--pro-tier)
17. [File Size Reference](#17-file-size-reference)

---

## 1. Product Philosophy

**Volyume** is an intelligent, private hypertrophy logbook. It is not a clone of any existing product. All training intelligence is Volyume's own.

### Core Principles
- **Private by design** — all data lives on device (SQLite). No cloud required to use the app. Supabase is optional (future sync).
- **Offline-first** — expo-sqlite, no network dependency for core features.
- **Hypertrophy-intelligent** — auto-regulation, volume landmarks, PR detection, progression suggestions are native to the logging experience, not buried in settings.
- **Dark mode only** — no light mode. Consistent dark aesthetic.
- **No jargon / no brand references** — researcher names, organisation acronyms, and competitor brand names are banned from all user-facing text (see Section 14).
- **Education-first UI** — InfoTooltips explain the "why" contextually. The methodology is not disclosed as a document.
- **No methodology screen** — removed entirely. Education stays in contextual tooltips only.

### App Identity
- Name: **Volyume**
- Tagline: *Intelligent Hypertrophy Logbook*
- Theme: Dark, minimal, numbers-first
- Default units: kg (user-switchable to lbs)

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | React Native + Expo SDK 51 | `expo: ~51.0.0` |
| Language | JavaScript ES6+ | All `.js` files |
| Local Database | expo-sqlite `~14.0.4` | SQLite, fully offline |
| Cloud (optional) | Supabase `@supabase/supabase-js ^2.43.4` | Auth + future sync |
| State | Zustand `^4.5.2` | Lightweight, no boilerplate |
| Navigation | React Navigation v6 | Bottom tabs + stack |
| Charts | react-native-gifted-charts `^1.4.41`, victory-native `^41.12.0` | Bars, lines, PRs |
| 2D Graphics | @shopify/react-native-skia `^1.2.3` | Volume heatmap |
| Haptics | expo-haptics `~13.0.1` | Set complete, PR celebration |
| Sharing | expo-sharing `~12.0.0`, expo-print `~13.0.0` | Share card, coach export |
| Secure storage | expo-secure-store `~13.0.1` | Future auth tokens |
| File system | expo-file-system `~17.0.1`, expo-document-picker `~12.0.2` | Backup/restore |
| Animations | react-native-reanimated `~3.10.1` | Splash, celebrations |
| Gestures | react-native-gesture-handler `~2.16.1` | Swipe interactions |
| Calendar | react-native-calendar-heatmap `^0.2.4` | Workout history |
| Linear gradient | expo-linear-gradient `~13.0.2` | Cards and headers |
| Storage | @react-native-async-storage/async-storage `1.23.1` | Prefs, profile |
| SVG | react-native-svg `15.2.0` | Charts, coach export |
| WebView | react-native-webview `13.8.6` | Coach HTML export |
| Icons | @expo/vector-icons `^14.0.2` | Ionicons throughout |

---

## 3. Navigation Structure

```
App.js (ErrorBoundary)
└── RootNavigator
    │
    ├── SplashScreen (animated — min 3.8s)
    │   └── Hero image + "Volyume" wordmark + tagline
    │
    ├── FirstRunStack (shown until firstRunComplete = true)
    │   ├── FirstRunScreen         ← path choice: Coach Build / Browse Plans / Manual
    │   ├── CoachBuilderScreen     ← 7-step wizard → generates plan
    │   ├── PlanLibraryScreen      ← pre-built plans catalogue
    │   └── PlanDetailScreen       ← plan detail + activate
    │
    └── MainTabs (bottom tab navigator — 4 tabs)
        │
        ├── [Train] HomeStack
        │   ├── HomeScreen                    ← dashboard
        │   ├── BuildWorkoutScreen            ← pre-session setup
        │   ├── ActiveWorkoutScreen           ← live logging (CRITICAL)
        │   ├── WorkoutSummaryScreen          ← post-session summary
        │   └── ShareCardScreen              ← session social share
        │
        ├── [Plans] PlansStack
        │   ├── PlansScreen                  ← active plan + options
        │   ├── PlanDetailScreen             ← plan view + edit
        │   ├── RoutineDetailScreen          ← edit individual workout
        │   ├── ExerciseLibraryScreen        ← search / filter exercises
        │   ├── ExerciseDetailScreen         ← exercise history + PRs
        │   ├── ManualBuilderScreen          ← manual plan creation wizard
        │   ├── CoachBuilderScreen           ← AI plan wizard (also in FirstRun)
        │   └── PlanLibraryScreen            ← library of pre-built plans
        │
        ├── [Progress] ProgressStack
        │   ├── AnalyticsScreen              ← full progress dashboard
        │   ├── WorkoutHistoryScreen         ← calendar + session list
        │   ├── WorkoutSummaryScreen         ← re-view past session
        │   ├── VolumeHeatmapScreen          ← muscle-group volume map
        │   ├── PRWallScreen                 ← all-time PRs + strength standards
        │   ├── BodyMetricsScreen            ← bodyweight + measurements
        │   ├── ExerciseLibraryScreen        ← lift progress view
        │   ├── ExerciseDetailScreen         ← per-exercise history
        │   └── ShareCardScreen              ← progress social share
        │
        └── [You] ProfileStack
            ├── AthleteHubScreen             ← profile + stats + engine log
            ├── SettingsScreen               ← preferences + data tools
            ├── NutritionTargetsScreen       ← macro calculator
            ├── BodyMetricsScreen            ← body log
            ├── PRWallScreen                 ← PRs from profile
            ├── ExerciseLibraryScreen        ← from profile
            ├── ExerciseDetailScreen         ← from profile
            └── MesocycleBuilderScreen       ← training blocks

AuthStack (LoginScreen → OnboardingScreen) is defined but currently bypassed.
The app auto-creates a local UUID user — no login required.
```

---

## 4. Screen Inventory

### 4.1 Auth / Onboarding

| Screen | File | Size | Purpose |
|---|---|---|---|
| LoginScreen | `LoginScreen.js` | 421 lines | Email/password + Apple/Google UI. Currently bypassed by local user auto-init. |
| OnboardingScreen | `OnboardingScreen.js` | 336 lines | 4-step profile setup (sex, DOB, height, experience). Saves to `user_body_profile`. |
| FirstRunScreen | `FirstRunScreen.js` | 238 lines | First-launch path choice: Coach Build / Browse Plans / Manual. Sets `firstRunComplete` via AsyncStorage. |

### 4.2 Plan Building

| Screen | File | Size | Purpose |
|---|---|---|---|
| CoachBuilderScreen | `CoachBuilderScreen.js` | 999 lines | **7-step plan generation wizard.** Most complex entry point. Steps: Experience → Schedule → Equipment → Goal → Weak Points (conditional) → Recovery → Generated Plan. Calls `generatePlan()` from `planEngine.js`. Applies competition phase if detected from nutrition. Shows "Why this plan?" expandable. |
| ManualBuilderScreen | `ManualBuilderScreen.js` | 1,266 lines | Drag-and-drop manual plan creator. Name, days, routine assignment, exercise search. |
| PlanLibraryScreen | `PlanLibraryScreen.js` | 278 lines | Browse pre-built library plans. Filter by goal/split. One-tap activate. |
| PlanDetailScreen | `PlanDetailScreen.js` | 340 lines | View/edit an activated plan. Shows all workout days. Navigate to RoutineDetail to edit exercises. |
| RoutineDetailScreen | `RoutineDetailScreen.js` | 279 lines | Edit a single workout's exercise list — add/remove/reorder. |
| MesocycleBuilderScreen | `MesocycleBuilderScreen.js` | 566 lines | Create and manage training blocks (mesocycles). Progression schedule, deload week config. |

### 4.3 Active Training

| Screen | File | Size | Purpose |
|---|---|---|---|
| BuildWorkoutScreen | `BuildWorkoutScreen.js` | 502 lines | Pre-session setup. Select/confirm exercises, view plan context, start workout. |
| ActiveWorkoutScreen | `ActiveWorkoutScreen.js` | 1,689 lines | **Core experience.** Live set logging. Per-set: weight, reps, RIR (default 2 = effort 3), RPE, set type. Previous performance shown inline. Progression suggestions. Plate calculator. Rest timer. PR detection. Deload mode. Set type picker (straight/dropset/superset/myo-reps/AMRAP/warmup/rest-pause). `countProgressSets()` excludes warmup + dropsets. |
| WorkoutSummaryScreen | `WorkoutSummaryScreen.js` | 829 lines | Post-session review. Volume status per muscle (MEV/MAV/MRV coloured). Auto-reg feedback. Tonnage, set count, PRs hit. Session feedback inputs (pump, soreness, fatigue). Share card trigger. |

### 4.4 Progress & Analytics

| Screen | File | Size | Purpose |
|---|---|---|---|
| AnalyticsScreen | `AnalyticsScreen.js` | 867 lines | Full dashboard: strength trends, volume over time, session streaks, insights cards, weekly volume bars, recent PRs. |
| WorkoutHistoryScreen | `WorkoutHistoryScreen.js` | 604 lines | Month calendar view + session list. Tap to re-view. Repeat button. |
| VolumeHeatmapScreen | `VolumeHeatmapScreen.js` | 432 lines | Per-muscle-group heatmap grid. Current week vs MEV/MAV/MRV landmarks. Colour-coded (below/optimal/over). |
| PRWallScreen | `PRWallScreen.js` | 320 lines | All-time lifetime bests. Estimated 1RM. Strength standards comparison vs bodyweight (Beginner/Intermediate/Advanced/Elite). |
| ExerciseLibraryScreen | `ExerciseLibraryScreen.js` | 551 lines | Search + filter (muscle group, equipment). Shows SFR score, fatigue cost. Navigates to detail. |
| ExerciseDetailScreen | `ExerciseDetailScreen.js` | 363 lines | History graph (last 8 sessions), PR badges, substitutes ranked by SFR. Form tips. |
| ShareCardScreen | `ShareCardScreen.js` | 808 lines | Social share card builder. Session stats, PRs, volume bars. Privacy toggles (hide weight on share). Export via expo-sharing. |

### 4.5 Body & Nutrition

| Screen | File | Size | Purpose |
|---|---|---|---|
| BodyMetricsScreen | `BodyMetricsScreen.js` | 697 lines | Bodyweight log + trend graph. Body measurements (waist, chest, hips, etc.). Body fat % entry (DEXA/scan/visual estimate). |
| NutritionTargetsScreen | `NutritionTargetsScreen.js` | 1,399 lines | Full macro calculator. Inputs: sex, age, height, weight, body fat (optional), activity, goal, nutrition phase. Outputs: BMR, TDEE, target kcal, protein/fat/carbs. **Protein approach selector**: Standard / Optimised (default) / Advanced / Custom. "Why these numbers for you?" narrative card. Carbs auto-rebalance when protein changes. InfoTooltip on page title. |
| PeakWeekScreen | `PeakWeekScreen.js` | 417 lines | Competition peak week planner. 7-day protocol with carb/water/sodium targets per day. Federation selection. Export to coach. |

### 4.6 Profile & Settings

| Screen | File | Size | Purpose |
|---|---|---|---|
| AthleteHubScreen | `AthleteHubScreen.js` | 715 lines | Profile hub: avatar, name, stats (session count — excludes 0-set sessions, streak, PRs). Milestone progress with InfoTooltip. Engine Log (Adaptive Landmark History) — collapsible card. Links to Settings, Nutrition, Body Metrics, PRs. |
| SettingsScreen | `SettingsScreen.js` | 414 lines | Units (kg/lbs), bar weight (20/15kg default), wellbeing mode, data export (backup JSON), data import (restore), clear all data. **No methodology section** (removed). |
| PlansScreen | `PlansScreen.js` | 419 lines | My Plans dashboard. Active plan card with current workout CTA. Manage plans, add new. Travel mode entry point. |

---

## 5. Component Library

| Component | File | Size | Purpose |
|---|---|---|---|
| SetEntry | `SetEntry.js` | 280 lines | One row = one set. Weight input, reps stepper, RIR 1–5 effort buttons (default effort 3 = RIR 2), RPE, set type. Large tap targets (≥48dp). |
| RestTimer | `RestTimer.js` | 218 lines | Countdown timer. Circular progress. +30s button. Haptic pulse on completion. Auto-starts on set complete. |
| PlateCalculator | `PlateCalculator.js` | 228 lines | Inline plate maths. Given target weight + bar weight → plate loadout each side. Standard + custom plate sets. |
| VolumeBars | `VolumeBars.js` | 80 lines | Horizontal coloured bars: grey (below MEV), green (MEV–MAV), amber (MAV–MRV), red (over MRV). Used in Summary, Home, Heatmap. |
| PRCelebration | `PRCelebration.js` | 235 lines | Overlay on new PR: 3× haptic pulse + confetti animation (2 seconds). Dismissed by tap. |
| ExerciseCard | `ExerciseCard.js` | 125 lines | Search result row. Name, muscle group chip, equipment badge, SFR score dot. |
| InfoTooltip | `InfoTooltip.js` | 57 lines | Small (i) icon tap → modal with title + body. Used throughout for contextual education without exposing methodology. |
| EmptyState | `EmptyState.js` | 129 lines | Reusable empty state illustration + heading + sub-text + optional CTA button. |
| BrandMark | `BrandMark.js` | 73 lines | Volyume wordmark logo component. Used in splash and headers. |

---

## 6. Engine & Library Files

### 6.1 algorithms.js (903 lines)
Core pure-function calculation library. No side effects.

| Function | Purpose |
|---|---|
| `VOLUME_LANDMARKS` | Per-muscle weekly set targets: MEV / MAV / MRV. 18 muscle groups. Volyume's own internally developed values. |
| `MUSCLE_DISPLAY_NAMES` | Maps internal keys to user-facing names. |
| `STRENGTH_STANDARDS` | Bodyweight-relative strength benchmarks for 6 core lifts (Beginner/Intermediate/Advanced/Elite). |
| `calculate1RM(weight, reps)` | Ensemble Epley + Brzycki with rep-range weighting. Returns estimated 1RM. |
| `calculateTonnage(sets)` | Sum(weight × reps) for hard sets only. |
| `calculateWeeklyVolume(sets, exerciseMap)` | Hard sets per muscle (RIR ≤2 OR RPE ≥7 only). Returns `{ muscle: setCount }` map. |
| `getVolumeStatus(sets, muscle, customLandmarks)` | Returns 'below' / 'optimal' / 'over' using landmarks. |
| `getProgressionSuggestion(currentSets, prevSets, repMin, repMax, units)` | Double progression logic. Returns suggestion text. |
| `computeSetTargets(prevSets, repMin, repMax, units, options)` | Detailed per-set weight/reps targets. Handles layoff penalty, consecutive miss detection, anchoring. |
| `detectPR(newSet, historicalSets, exercise, units)` | Checks estimated 1RM PR, weight PR, rep PR. Returns PR type or null. |
| `getAutoRegSuggestion(workoutFeedback, weeklyVolumeByMuscle, customLandmarks)` | Volume adjustment advice based on session feedback. |
| `shouldDeload(last4WeeksData)` | Multi-signal deload detection (soreness, performance, MRV weeks). |
| `getExerciseSubstitutes(target, allExercises, userEquipment)` | SFR-ranked exercise substitutes matching primary muscle. |
| `getProgressionPath(thisWeek, lastWeek, units)` | Week-over-week progression summary. |
| `calculatePlates(targetWeight, barWeight, availablePlates)` | Plate loadout calculation per side. |
| `getStrengthStandard(lift, estimated1RM, bodyWeight)` | Returns tier label for a given estimated 1RM. |
| `computeAdaptiveDecision({soreness, performance, pump, joint})` | Single-session 2-axis adaptive engine decision. Returns volume action + reason. |
| `runAdaptiveEngine(weekFeedback)` | Runs adaptive decision across all muscles for a week. |
| `computeAdaptiveLandmarks(history, baseDefaults)` | Personalises MEV/MAV/MRV landmarks from rolling session history. |

### 6.2 planEngine.js (1,223 lines)
AI plan generator. Produces complete weekly workout schedules from user inputs.

| Function | Purpose |
|---|---|
| `GOAL_LABELS` | Display labels for 7 training goals. |
| `SPLIT_LABELS` | Labels for Full Body / Upper-Lower / PPL / Push-Pull / Bro etc. |
| `generatePlan(inputs)` | **Main export.** Takes 7 inputs → returns complete plan with sessions, exercises, sets, rep ranges, rest periods, rationale. |
| `estimateWorkoutMinutes(exercises)` | Estimates session length in minutes given exercise list. |
| `selectSplit(experience, effectiveDays, goal)` | Picks appropriate training split. |
| `buildFullBodyWorkouts(...)` | Generates full-body split sessions. |
| `buildUpperLowerWorkouts(...)` | Generates upper/lower split. |
| `selectExercisesForMuscle(...)` | Picks exercises from pool for a muscle, respecting SFR, equipment, goal overlays, session budget. |
| `applyGoalOverlay(targets, landmarks, goal, weakPoints)` | Adjusts volume targets for goal (V-taper, X-frame, etc). |
| `computeLandmarks(experience, recoveryRating, nutritionPhase, age)` | Personalised landmark computation for plan generation. |

**Coach Builder Step 1 inputs → Plan Generator inputs:**
- Experience: beginner / intermediate / advanced / competitive
- Days per week: 3–6
- Session length: 45 / 60 / 75 / 90 min
- Equipment: full_gym / machines_cables / dumbbells_only / barbell_plates / home_gym / bodyweight
- Goal: general_hypertrophy / balanced_bodybuilding / aesthetic_v_taper / x_frame_physique / weak_point_spec / strength_hypertrophy / recomp
- Weak points (multi-select, conditional): Chest / Upper Chest / Lats / Back Thickness / Side Delts / Rear Delts / Front Delts / Biceps / Triceps / Quads / Hamstrings / Glutes / Calves / Core / Traps
- Recovery: poor / average / good

### 6.3 nutritionEngine.js (387 lines)
Pure-function nutrition calculator. No side effects.

| Export | Purpose |
|---|---|
| `PROTEIN_APPROACHES` | 4-key object: `standard` (1.2–1.6 g/kg), `optimised` (1.6–2.2 g/kg, **default**), `advanced` (2.2–3.3 g/kg), `custom` (coach-specified g/kg override). Each has label, range, description, LBM rates, BW fallback rates, floor g/kg. |
| `calculateNutritionTargets(inputs)` | **Main export.** Inputs: sex, age, height, weight, bodyFat, bodyFatSource, activityLevel, goal, nutritionPhase, proteinApproach, customProteinGPerKg. Returns: BMR (standard or lean-mass formula), TDEE, targetKcal, protein/fat/carbs (g), confidence, warnings, estimatedWeeklyRate, proteinApproach, proteinRateUsed. |
| `getPlanNutritionContext(targets)` | Converts stored nutrition targets into a context object for plan generation (phase type, surplus/deficit %, description). |

**Macro calculation logic:**
1. BMR via 'Standard BMR formula' (sex/age/height/weight) or 'Lean mass-adjusted formula' (if body fat provided from scan/DEXA)
2. TDEE = BMR × activity multiplier
3. Target kcal = TDEE ± phase adjustment (bulk +10–15%, cut −15–25%, maintain ±0)
4. Protein = approach-aware g/kg × bodyweight (or LBM if available)
5. Fat = max(25% of target kcal, 0.5g/kg × weight, 30g floor)
6. **Carbs = remaining calories** (auto-adjusts when protein changes)

### 6.4 phaseEngine.js (242 lines)
Competition phase detection and modifier application.

| Function | Purpose |
|---|---|
| `getCompPhase(compDateMs)` | Returns phase: 'off_season' / 'pre_contest' / 'peak_week' / 'post_show' based on weeks-to-comp. |
| `getWeeksToComp(compDateMs)` | Weeks remaining to competition date. |
| `getPhaseModifiers(phase)` | Phase-specific training modifiers (volume multiplier, intensity, rest adjustments). |
| `applyPhaseToInputs(planInputs, compDateMs)` | Applies phase modifiers to plan generation inputs. |
| `buildSessionAddons(phase, weeksToComp)` | Returns posing/cardio add-on sessions for competition phases. |
| `getPhaseLabel(phase)` | User-facing phase label. |
| `getPhaseDescription(phase, weeksToComp)` | Descriptive phase explanation. |

### 6.5 mesocycle.js (415 lines)
Training block (mesocycle) management and auto-regulation.

| Function | Purpose |
|---|---|
| `getCurrentMesoWeek(startDateMs, experience)` | Current week number within active mesocycle. |
| `getMesoSchedule(experience)` | Returns week-by-week volume progression schedule for experience level. |
| `getWeekSetsMultiplier(mesoWeek, experience)` | Volume multiplier for given week (accumulation → peak → deload). |
| `isRecoveryWeek(mesoWeek, experience)` | Is this week a deload/recovery week? |
| `getVolumeTargetsForWeek(baseSets, mesoWeek, experience)` | Scales base sets by week multiplier. |
| `buildWeeklyProgression(baseSets, mrvSets, experience)` | Full block volume progression ramp. |
| `evaluateAutoReg(feedbackWindow)` | Weighted rolling average of session feedback → auto-regulation decision. |
| `predictDeloadWeek(feedbackWindow, mesoWeek, experience)` | Predicts when deload is needed from feedback trends. |

### 6.6 peakWeekEngine.js (154 lines)
Competition peak week protocol builder.

| Export | Purpose |
|---|---|
| `FEDERATIONS` | Supported federation list. |
| `PEAK_WEEK_DISCLAIMER` | Standard advisory disclaimer text. |
| `buildPeakWeek(inputs)` | Generates 7-day peak week plan: carb loading, water manipulation, sodium protocol per day. |
| `peakWeekToText(plan, meta)` | Plain-text / CSV export for coach sharing. |

### 6.7 insightsEngine.js (232 lines)
Generates user-facing training insights from workout data.

| Function | Purpose |
|---|---|
| `generateInsights({workouts, sets, exerciseMap, now})` | Analyses full history → returns array of insight objects (type, severity, copy, actionPayload). Types: volume trend, plateau detection, fatigue signal, overreaching, frequency. |
| `rankAndCapInsights(insights, max)` | Sorts by severity, caps at max (default 3). Used on home screen and analytics. |

### 6.8 recoveryEMA.js (114 lines)
Exponential moving average (EMA) for fatigue and recovery tracking.

| Function | Purpose |
|---|---|
| `emaValue(points, now, halfLifeDays)` | EMA of a time-series. Half-life default = 7 days. |
| `computeRecoveryEMAs(workouts, now)` | Returns `{ fatigue, readiness }` EMAs from workout history. |
| `emaWeekOverWeekPct(points, now)` | Week-over-week percentage change in EMA. |
| `dailySeries(points, days, now)` | Bucketed daily series for charting (last N days). |

### 6.9 setTypeEngine.js (214 lines)
Advanced set technique selection and warmup calculation.

| Export | Purpose |
|---|---|
| `SET_TYPES` | All set type definitions: straight, dropset, superset, myo-reps, AMRAP, warmup, rest-pause. |
| `shouldDeployAdvancedSets({mesoWeek, mesoPhase, isTimeCrunch, experience})` | Decision: should advanced techniques be used this session? |
| `selectAdvancedSetType(exercise, context, alreadyUsedThisSession)` | Picks the best advanced technique for an exercise given context. |
| `getAdvancedSetInstructions(technique, sets)` | User-facing instructions for technique. |
| `annotateSessionSetTypes(exercises, context)` | Annotates a full session's exercises with set type assignments. |
| `calculateWarmupSets(workingWeight, compoundIsolation)` | Returns warmup set sequence (weight, reps) for compound vs isolation. |
| `getSetTypeLabel(setType)` | Short label for display. |

### 6.10 swapEngine.js (267 lines)
Exercise substitution scoring and joint discomfort detection.

| Function | Purpose |
|---|---|
| `rankSwaps(originalExercise, allExercises, options)` | Returns sorted list of substitute exercises by score (muscle match, SFR, equipment, fatigue delta). |
| `buildSwapReason(original, candidate)` | Human-readable reason why this swap is suggested. |
| `detectJointDiscomfortPattern(discomfortLog, exerciseId, windowMs)` | Identifies exercises causing repeated joint issues (last 30 days). |
| `autoSwapForJointDiscomfort(flaggedExerciseIds, exerciseLibrary, options)` | Auto-replaces flagged exercises with best alternatives. |

### 6.11 travelMode.js (295 lines)
Hotel/travel workout plan generator (minimal equipment).

| Export | Purpose |
|---|---|
| `TRAVEL_EQUIPMENT_OPTIONS` | Bodyweight / resistance bands / dumbbells / hotel gym. |
| `generateTravelPlan({equipment, daysPerWeek, sessionLengthMinutes, splitType})` | Generates minimal-equipment plan matching travel constraints. Builds Full Body / Upper-Lower / PPL variants. |

### 6.12 coachExport.js (295 lines)
HTML/PDF coach report generator.

| Function | Purpose |
|---|---|
| `exportCoachReport(userId, opts)` | Builds a 4-week HTML report with body weight graph (SVG), top PRs, volume summary. Exports via expo-sharing. |

### 6.13 dataBackup.js (122 lines)
Full device backup/restore.

| Function | Purpose |
|---|---|
| `exportBackup()` | Dumps all SQLite tables + AsyncStorage prefs to JSON. Shares via expo-sharing. |
| `importBackup()` | Picks a `.json` backup file, validates, restores all tables and prefs. |

### 6.14 whyThisTemplates.js (308 lines)
User-facing narrative text for plan and exercise explanations.

**JARGON BLOCKLIST enforced** — these strings are banned from all output:
- Brand names: "Renaissance Periodization", "RP ", "Stronger By Science", "Jeff Nippard"
- Researcher names: "Schoenfeld", "Helms", "Israetel", "Krieger", "Morton", "Haun", "Brad", "Eric"
- Organisation acronyms: "ISSN", "ACSM", "NSCA", "ISSA"
- Formula names: "Mifflin", "St Jeor", "Katch-McArdle", "Harris-Benedict"

| Function | Purpose |
|---|---|
| `getExerciseWhyThis(exerciseName, subregion)` | Explains why this exercise is in the plan. |
| `getVolumeStatusMessage(status, muscleDisplayName, currentSets)` | MEV/MAV/MRV status narrative. |
| `getProgressionMessage(action, currentWeight, suggestedWeight, units)` | Progression suggestion narrative. |
| `getAutoRegMessage(action, weeksInBlock)` | Auto-regulation action explanation. |
| `getWeekPhaseDescription(phase, week)` | Week description within meso (intro, accumulation, peak, deload). |
| `getSplitRationale(splitType)` | Why this split was selected. |
| `getDeloadPredictionMessage(weeksUntilDeload, reason)` | Deload prediction explanation. |
| `getTimeCrunchMessage(droppedExercises, restReductionPct, newEstimatedMins)` | Time-crunch adaptation message. |
| `getTravelModeMessage(equipmentLabel, weeks)` | Travel mode explanation. |
| `getPosingConditioningMessage(type, minutesPerSession, weeksToComp)` | Competition posing/cardio add-on message. |
| `checkJargon(str)` | Validates string against jargon blocklist (used in tests). |

### 6.15 formTips.js (196 lines)
Exercise-specific form cues database.

| Export | Purpose |
|---|---|
| `FORM_TIPS` | Object keyed by exercise name. Each entry: focus cues, common errors, cue for target muscle connection. Used in ExerciseDetailScreen. |

### 6.16 wellbeing.js (36 lines)
Mental health awareness mode.

| Export | Purpose |
|---|---|
| `WELLBEING_KEY` | AsyncStorage key for mode. |
| `WELLBEING_HELPLINE` | Support line info for wellbeing screen. |
| `getWellbeingMode()` | Returns current mode ('standard' / 'calm'). |
| `setWellbeingMode(mode)` | Persists mode to AsyncStorage. |
| `isCalm(mode)` | True if mode = 'calm'. |

### 6.17 seedExercises.js (368 lines)
Exercise database seeder.

| Function | Purpose |
|---|---|
| `seedExercisesIfNeeded()` | Checks if exercises table is empty. If so, inserts full exercise catalogue. Called at app init in RootNavigator. |

Exercises include: name, primary_muscle, secondary_muscles, equipment, movement_pattern, compound_isolation, default_rep_min/max, fatigue_cost, stimulus_to_fatigue_ratio, subregion, notes.

### 6.18 seedRoutines.js (842 lines)
Pre-built library plan seeder.

| Function | Purpose |
|---|---|
| Seed data | Library programmes and routines for PlanLibraryScreen. Standard templates (PPL, Upper-Lower, Full Body, etc.). |

### 6.19 supabase.js (85 lines)
Supabase client (currently optional).

| Function | Purpose |
|---|---|
| `getSupabaseClient()` | Returns Supabase client if credentials are set in env. Returns null gracefully if not configured. |

Environment variables:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## 7. Database Schema

All tables live in SQLite on-device via expo-sqlite. Schema is versioned with `PRAGMA user_version`. Migrations are append-only.

### Core Training Tables

#### `exercises`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| name | TEXT NOT NULL | |
| primary_muscle | TEXT | Internal key (e.g. 'quads', 'side_delts') |
| secondary_muscles | TEXT | Comma-separated or JSON |
| equipment | TEXT | full_gym / dumbbells / barbell / cables / bodyweight |
| movement_pattern | TEXT | push / pull / hinge / squat / carry |
| compound_isolation | TEXT | compound / isolation |
| default_rep_min | INTEGER | |
| default_rep_max | INTEGER | |
| fatigue_cost | INTEGER | 1–5 |
| stimulus_to_fatigue_ratio | INTEGER | 1–5 (SFR) |
| subregion | TEXT | e.g. 'upper_chest', 'long_head' |
| is_custom | INTEGER | 0=library, 1=user-created |
| notes | TEXT | |

#### `workouts`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | TEXT | |
| routine_id | TEXT | |
| mesocycle_id | TEXT | |
| started_at | INTEGER | Unix ms |
| ended_at | INTEGER | Unix ms |
| duration_minutes | INTEGER | |
| notes | TEXT | |
| session_difficulty | INTEGER | 1–5 |
| overall_pump | INTEGER | 1–3 |
| soreness_24h_before | INTEGER | 1–3 |
| fatigue_level | INTEGER | 1–5 |
| is_completed | INTEGER | 0/1 |

*Session count milestone: excludes workouts where set_count = 0.*

#### `workout_sets`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | TEXT | |
| workout_id | TEXT | FK workouts |
| exercise_id | TEXT | FK exercises |
| set_number | INTEGER | |
| set_type | TEXT | straight/dropset/superset/myo-reps/AMRAP/warmup/rest-pause |
| target_reps_min | INTEGER | |
| target_reps_max | INTEGER | |
| actual_reps | INTEGER | |
| weight | REAL | |
| rir | INTEGER | Reps In Reserve. Default **2** (effort 3 on 1–5 display scale) |
| rpe | REAL | Rate of Perceived Exertion 1–10 |
| failed | INTEGER | 0/1 |
| post_set_pump | INTEGER | 1–3 |
| post_set_muscle_connection | INTEGER | 1–3 |
| joint_discomfort | INTEGER | 0–3 |
| is_amrap | INTEGER | |
| amrap_reps | INTEGER | |

#### `routines`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | TEXT | |
| name | TEXT | |
| description | TEXT | |
| split_type | TEXT | |
| is_active | INTEGER | |
| is_library | INTEGER | 0=user, 1=pre-built |
| source_routine_id | TEXT | If copied from library |
| programme_id | TEXT | FK programmes |

#### `routine_exercises`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| routine_id | TEXT | FK routines |
| exercise_id | TEXT | FK exercises |
| order_in_routine | INTEGER | |
| recommended_sets | INTEGER | Default 3 |
| recommended_reps_min | INTEGER | Default 6 |
| recommended_reps_max | INTEGER | Default 12 |
| notes | TEXT | |

#### `programmes`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | TEXT | null = library |
| name | TEXT | |
| description | TEXT | |
| is_library | INTEGER | 0/1 |
| tags | TEXT | JSON |
| split_type | TEXT | |
| difficulty | TEXT | |

#### `mesocycles`
| Column | Type | Notes |
|---|---|---|
| id | TEXT PK | |
| user_id | TEXT | |
| name | TEXT | |
| start_date | TEXT | ISO date |
| end_date | TEXT | ISO date |
| duration_weeks | INTEGER | |
| focus | TEXT | |
| goals | TEXT | |
| is_active | INTEGER | |
| deload_week | INTEGER | Which week is deload |
| auto_regulation_enabled | INTEGER | 0/1 |

#### `mesocycle_weeks` (v3 migration)
Scaffold for per-week planned volume tracking.

#### `planned_muscle_volume` (v3 migration)
Planned vs actual set counts per muscle per mesocycle week.

#### `adaptation_events` (v3 migration)
Log of auto-regulation events (volume up/down decisions with reason).

### Body & Nutrition Tables

#### `nutrition_targets`
BMR, TDEE, target kcal, protein/fat/carbs, phase, method, confidence, warnings.

#### `body_metric_log`
Bodyweight + 9 circumference measurements per entry. body_fat_percent + source (DEXA/scan/visual).

#### `user_body_profile`
Static user profile: sex, DOB, height, experience, training age, primary goal.

#### `user_insights`
Generated insights cache: type, severity, copy, action payload, dismissed_at.

#### `peak_week_plans`
Competition peak week config: show date, federation, bodyweight, lean estimate, carb/water/sodium baseline.

---

## 8. Global State (Zustand)

File: `src/store/useAppStore.js`

### State Slices

| Slice | Fields | Purpose |
|---|---|---|
| **Auth** | user, session, userProfile, isAuthLoading | User identity. `user.isLocal = true` for local users. |
| **First-run** | firstRunComplete, firstRunChecked | Gate for FirstRunStack vs MainTabs. |
| **Active workout** | activeWorkout, workoutExercises, currentExerciseIndex, workoutStartTime, lastActivityAt | Live session state. |
| **Rest timer** | restTimerActive, restTimerDuration, restTimerRemaining | Countdown state. Updated per-second by ActiveWorkoutScreen. |
| **PR Celebration** | prCelebration | Pending PR celebration overlay data. |
| **Units** | units ('kg'/'lbs') | Persisted to AsyncStorage + user profile. |
| **Bar weight** | barWeight (20 or 15 kg) | Persisted to AsyncStorage + user profile. |

### Key Actions

| Action | Purpose |
|---|---|
| `initLocalUser()` | Creates/restores UUID-based local user from AsyncStorage. No login required. |
| `saveLocalProfile(userId, profile)` | Persists onboarding answers (units, barWeight, trainingFocus, etc). |
| `checkFirstRun()` | Reads AsyncStorage `@volyume_first_run_complete`. |
| `completeFirstRun()` | Sets key to 'true', triggers MainTabs. |
| `startWorkout(workout, exercises)` | Initialises active workout state. |
| `endWorkout()` | Clears all workout state. |
| `addSetToCurrentExercise(setData)` | Appends set to current exercise in session. |
| `startRestTimer(duration)` | Begins countdown. Default 90s. |
| `tickRestTimer()` | Called every 1s. Stops at 0. |
| `addRestTime(seconds)` | +30s button handler. |

---

## 9. Core Algorithms

### RIR → Effort Scale Mapping (UI convention)
```
Effort button 1 = RIR 4  (very easy)
Effort button 2 = RIR 3  (easy)
Effort button 3 = RIR 2  (moderate) ← DEFAULT for every new set
Effort button 4 = RIR 1  (hard)
Effort button 5 = RIR 0  (failure)
Formula: rir = 5 − effort_button_value
```

### Hard Set Definition
A set qualifies as a "hard set" (counted for volume) if:
- `rir ≤ 2` OR `rpe ≥ 7`
- AND set_type is NOT 'warmup'

### Progress Set Definition (for milestone count)
Counted toward the "X sessions" milestone if:
- `set_type` is NOT 'warmup' AND NOT 'dropset'

### 1RM Estimation
Ensemble of Epley and Brzycki formulas:
```
epley   = weight × (1 + reps / 30)
brzycki = weight / (1.0278 − 0.0278 × reps)  [capped at reps < 37]
weighted by rep range (closer to 5 reps → more weight to Brzycki)
```

### Double Progression
1. If top set reps ≥ repMax for all sets → increase weight by increment
2. If top set reps < repMin for 2+ consecutive sessions → decrease weight
3. Increment sizes: 2.5kg compounds, 1.25kg isolation, 0.5kg bodyweight

### Volume Landmarks (18 muscle groups)
Each muscle has MEV / MAV / MRV expressed as weekly hard sets. Values are Volyume's own internally developed training principles. Not attributed to any external source in user-facing text.

Example (intermediate):
- Quads: MEV 8 / MAV 12–16 / MRV 20
- Chest: MEV 6 / MAV 10–14 / MRV 18
- Side Delts: MEV 8 / MAV 14–18 / MRV 26

### Auto-Regulation 2-Axis Model
Axes: **stimulus** (pump, muscle connection) × **readiness** (soreness, joint, fatigue).
- High stimulus + high readiness → increase volume
- Low stimulus + low readiness → decrease volume / deload
- Mismatches → maintain + flag

---

## 10. Intelligence Engines Summary

| Engine | Trigger | Output |
|---|---|---|
| Plan Generator | Coach Builder step 7 | Complete weekly plan (split, sessions, exercises, sets, reps, rest) |
| Progression Suggester | Every set logged | Per-set weight/rep target with action (increase/maintain/decrease) |
| PR Detector | Every set saved | PR type (1RM/weight/reps), triggers PRCelebration |
| Auto-Reg Advisor | Post-session feedback | Volume action per muscle group |
| Deload Predictor | Weekly | Weeks until recommended deload |
| Insights Generator | Home screen / Analytics | 1–3 ranked insights from full history |
| Recovery EMA | Passive (recalculated) | Fatigue + readiness EMAs for charting |
| Adaptive Landmarks | Rolling session history | Personalised MEV/MAV/MRV adjustments |
| Swap Engine | Exercise detail / joint discomfort | Ranked substitute list |
| Set Type Annotator | Plan generation / session start | Advanced technique assignments |
| Travel Mode Generator | Travel mode entry | Bodyweight/band plan for hotel stays |
| Peak Week Builder | Competition toggle | 7-day peak week protocol |
| Phase Engine | Competition date input | Training phase + modifiers |
| Nutrition Calculator | NutritionTargetsScreen | BMR / TDEE / kcal / macros |
| Coach Report | AthleteHub export | HTML/PDF 4-week summary for coach |

---

## 11. Plan Generation System

### Full Generation Flow

```
CoachBuilderScreen (user inputs)
    ↓
applyPhaseToInputs()   ← if competition date detected in nutrition
    ↓
generatePlan(inputs)   ← planEngine.js
    ├── computeLandmarks()       sets MEV/MAV/MRV for user's experience
    ├── applyGoalOverlay()       adjusts volume for goal (V-taper, weak points, etc)
    ├── selectSplit()            picks Full Body / Upper-Lower / PPL / Push-Pull
    ├── buildSessions()          generates each workout day
    │   └── selectExercisesForMuscle()  picks from filtered pool, ranked by SFR
    │       └── makeEx()        assigns sets, rep ranges, rest, RIR, rationale
    ├── trimToTimeBudget()       cuts exercises if session would exceed time limit
    └── annotateSessionSetTypes()  adds advanced technique annotations
    ↓
buildSessionAddons()   ← phaseEngine (posing/cardio for competition phases)
    ↓
savePlan() + saveRoutines() + saveRoutineExercises()
    ↓
PlansScreen (active plan view)
```

### Plan Data Structure
```js
{
  name: "Your Plan",
  splitType: "upper_lower",
  sessions: [
    {
      name: "Upper A",
      exercises: [
        {
          name: "Incline Dumbbell Press",
          sets: 3,
          repMin: 8, repMax: 12,
          restSec: 150,
          rir: 2,
          whyThis: "...",   // from whyThisTemplates.js
          setType: "straight",
          technique: null,
          techniqueInstruction: null,
        }
      ],
      estimatedMinutes: 65
    }
  ],
  compPhase: null,
  compPhaseLabel: null,
  generatedAt: 1716000000000
}
```

---

## 12. Nutrition System

### Inputs
- Sex (male / female)
- Age (years)
- Height (cm)
- Weight (kg)
- Body fat % (optional — from DEXA / scan / visual estimate)
- Activity level (sedentary / lightly_active / moderately_active / very_active / extremely_active)
- Goal (fat_loss / maintain / lean_bulk / aggressive_bulk)
- Nutrition phase (cutting / maintaining / bulking / peaking)
- Protein approach (standard / optimised / advanced / custom)
- Custom g/kg (if approach = custom)

### Outputs
- BMR (kcal) — formula label: 'Standard BMR formula' or 'Lean mass-adjusted formula'
- TDEE (kcal)
- Target kcal (with ±10% range)
- Protein (g)
- Fat (g)
- Carbs (g) — always the remainder
- Confidence ('high' / 'medium' / 'low')
- Warnings (array) — e.g. very low calorie, aggressive deficit
- estimatedWeeklyRate (kg/week)
- proteinApproach + proteinRateUsed

### Protein Approaches
| Approach | Range | Default? |
|---|---|---|
| Standard | 1.2–1.6 g/kg BW | No |
| Optimised | 1.6–2.2 g/kg BW | **YES** |
| Advanced | 2.2–3.3 g/kg BW | No |
| Custom | Coach-specified | No |

When protein approach changes → carbs auto-adjust (fat protected at floor).

### "Why These Numbers?" Education Card
Shown in NutritionTargetsScreen. Goal-aware narrative covering:
- Calories: why this deficit/surplus for this goal
- Protein: approach-aware explanation (generic language only — no researcher names)
- Fat: hormonal health floor rationale
- Carbs: training fuel, remainder-based explanation

---

## 13. Volume Landmarks System

Volume is tracked per muscle group per week as **hard sets** (RIR ≤2 or RPE ≥7, non-warmup).

### Landmark Definitions
- **MEV** (Minimum Effective Volume): fewest sets/week to make progress
- **MAV** (Maximum Adaptive Volume): optimal range for growth
- **MRV** (Maximum Recoverable Volume): maximum before recovery breaks down

### Colour Coding (VolumeBars component)
| Range | Colour | Meaning |
|---|---|---|
| 0 → MEV | Grey | Below threshold — likely insufficient stimulus |
| MEV → MAV | Green | Optimal growth zone |
| MAV → MRV | Amber | High volume — monitor recovery |
| > MRV | Red | Exceeding recovery capacity |

### Personalisation
`computeAdaptiveLandmarks()` adjusts base defaults from rolling session history:
- Consistent high pump + low soreness → raises MAV/MRV
- Persistent soreness + low performance → lowers MAV/MRV
- Uses last 8 data points (EMA-weighted)

---

## 14. Legal & Brand Constraints (CRITICAL)

**Zero tolerance. These constraints are non-negotiable.**

### Banned from ALL user-facing text (including tooltips, cards, notifications, share cards):
1. Competitor / researcher brand names: "Renaissance Periodization", "RP", "Stronger By Science", "Jeff Nippard", "Alan Aragon"
2. Researcher names: "Schoenfeld", "Helms", "Israetel", "Krieger", "Morton", "Haun"
3. Organisation acronyms used as authority references: "ISSN", "ACSM", "NSCA"
4. Named formula references: "Mifflin-St Jeor", "Katch-McArdle", "Harris-Benedict", "Epley formula", "Brzycki formula"
5. External methodology documents / source lists

### What to use instead:
- "Sports science research on…" / "Current evidence suggests…"
- "Standard BMR formula" / "Lean mass-adjusted formula"
- "Volyume's internally developed training principles"
- "General athletic guidelines" / "Current sports science consensus for hypertrophy"

### Code comments:
- Researcher names MAY appear in internal code comments if needed for traceability, but never in exported strings.
- `whyThisTemplates.js` has a runtime JARGON BLOCKLIST enforced via `assertNoJargon()`.

### Methodology screen:
- **DELETED** — `src/lib/methodologySources.js` no longer exists.
- No "How Volyume Works" settings modal.
- Education lives only in contextual `InfoTooltip` components.

---

## 15. Current App State — What is Built

### Fully functional
- [x] App launch + animated splash (3.8s minimum)
- [x] Local user creation (no login required)
- [x] First-run path choice (Coach / Library / Manual)
- [x] Coach Builder — 7-step wizard → generates personalised plan
- [x] Plan Library — pre-built plans, activate with one tap
- [x] Manual Builder — drag-and-drop plan creation
- [x] Active workout logging — full feature set (weight/reps/RIR/RPE/set type)
- [x] Default RIR = 2 (effort 3) for every new set
- [x] Rest timer with haptics
- [x] Plate calculator inline
- [x] Progression suggestions inline
- [x] PR detection + celebration overlay
- [x] Deload week detection + gentle prompt
- [x] Post-workout summary with volume status + auto-reg
- [x] Workout history — calendar + session list
- [x] Analytics dashboard — trends, insights, volume, PRs
- [x] Volume heatmap — per-muscle MEV/MAV/MRV
- [x] PR Wall — lifetime bests + strength standards
- [x] Exercise library — search + filter
- [x] Exercise detail — history graph, PRs, substitutes, form tips
- [x] Body metrics — weight log, measurements, body fat
- [x] Nutrition targets — full macro calculator with protein approach selector
- [x] "Why these numbers?" education card
- [x] AthleteHub — profile, stats, session milestone, engine log
- [x] Settings — units, bar weight, wellbeing mode, backup/restore
- [x] Peak week planner — 7-day competition protocol
- [x] Mesocycle builder — training blocks with progression
- [x] Share card — social media session card
- [x] Coach export — HTML/PDF 4-week report
- [x] Travel mode — hotel workout plan generator
- [x] Phase engine — competition phase modifiers
- [x] Jargon enforcement via blocklist in whyThisTemplates.js
- [x] All methodology references removed (legal clean)

### Wired but not active
- [ ] Supabase auth (UI exists in LoginScreen, bypassed by local user)
- [ ] Cloud sync (Supabase client exists, not connected to data flow)
- [ ] Apple/Google OAuth (buttons in LoginScreen, need OAuth config)

---

## 16. Pending Work — Weekly Coach / Pro Tier

**STATUS: Not built. Awaiting user research + architectural decision.**

### What the user described
A once-a-week coaching moment that ties together all app data streams:
1. **Weight entry** — morning weigh-in or weekly check-in
2. **Recovery input** — how did training feel this week (soreness, energy, adherence)
3. **Coaching output** — unified card:
   - Weight trend (rolling 7-day average, requires ≥2 weeks)
   - Training adjustments (volume up/down by muscle, deload signal)
   - Calorie/macro adjustments (based on weight delta vs target)
   - **Steps target** (primary NEAT intervention before formal cardio)
   - Cardio prescription (conditional: walking → LISS → HIIT escalation)
4. **Social share card** — privacy-first (weight hidden by default), session highlights
5. **Pro notifications** — `expo-notifications` morning prompt (Pro users only)

### Files that will be needed
| File | Purpose |
|---|---|
| `src/screens/WeeklyCheckInScreen.js` | Weekly check-in UI: weight, recovery sliders |
| `src/screens/CoachWeeklyOutputScreen.js` | Coaching output display: plan adjustments, macros, steps, cardio |
| `src/lib/weeklyCoach.js` | Coaching logic: weight trend analysis, calorie adjustment algo, cardio prescription |
| `src/components/CheckInShareCard.js` | Social share card for weekly check-in |
| `src/lib/stepsEngine.js` | Steps targets by phase and NEAT calculation |

### Key algorithm requirements
- Rolling 7-day weight average (needs ≥14 days of data before confident calorie advice)
- Weight delta vs expected rate → calorie surplus/deficit adjustment
- Steps as primary intervention (phase-appropriate targets: cut → higher; bulk → moderate)
- Cardio escalation: only prescribed if steps target not meeting energy goals
- NEAT first, LISS second, HIIT only if sustained cut stall

### Pro tier decision (pending)
**Option A**: First choice in Coach Builder (Pro / Standard path before step 1)
**Option B**: Separate component at first launch / Plans screen
**Pending decision**: Where does the Pro/Standard gate surface?

### Pro tier features (proposed)
- Weekly check-in system
- Morning weight notification
- Coaching output card (steps, cardio, macro adjustments)
- Enhanced analytics (7-day rolling averages, trend forecasting)
- Social share cards

---

## 17. File Size Reference

| File | Lines | Complexity |
|---|---|---|
| database.js | 1,879 | Very high — schema + all DB functions |
| ActiveWorkoutScreen.js | 1,689 | Very high — core UX |
| NutritionTargetsScreen.js | 1,399 | High |
| ManualBuilderScreen.js | 1,266 | High |
| planEngine.js | 1,223 | Very high — plan generation |
| HomeScreen.js | 1,060 | High |
| CoachBuilderScreen.js | 999 | High |
| algorithms.js | 903 | High — all core maths |
| AnalyticsScreen.js | 867 | High |
| seedRoutines.js | 842 | Medium (data) |
| WorkoutSummaryScreen.js | 829 | High |
| ShareCardScreen.js | 808 | High |
| AthleteHubScreen.js | 715 | High |
| BodyMetricsScreen.js | 697 | High |
| WorkoutHistoryScreen.js | 604 | Medium |
| MesocycleBuilderScreen.js | 566 | Medium |
| ExerciseLibraryScreen.js | 551 | Medium |
| BuildWorkoutScreen.js | 502 | Medium |
| VolumeHeatmapScreen.js | 432 | Medium |
| LoginScreen.js | 421 | Medium |
| PeakWeekScreen.js | 417 | Medium |
| mesocycle.js | 415 | Medium |
| SettingsScreen.js | 414 | Medium |
| nutritionEngine.js | 387 | Medium |
| seedExercises.js | 368 | Low (data) |
| ExerciseDetailScreen.js | 363 | Medium |
| RootNavigator.js | 359 | Medium |
| PlanDetailScreen.js | 340 | Medium |
| OnboardingScreen.js | 336 | Medium |
| PRWallScreen.js | 320 | Medium |
| whyThisTemplates.js | 308 | Medium |
| travelMode.js | 295 | Medium |
| coachExport.js | 295 | Medium |
| **TOTAL** | **~27,400** | |

---

*Document generated from source. All information reflects the current state of branch `claude/build-volyume-app-srY9C` as of 2026-05-19.*
