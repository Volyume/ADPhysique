# 15 — Settings & customization (Hevy teardown, 2026-06-29)

> Method note: Hevy ships RN/Hermes, so almost all app strings are Hermes-packed
> in `index.android.bundle` (not in `res_strings.xml`, which is mostly ExoPlayer /
> system strings). Findings below are corroborated from **symbol names** in the raw
> bundle (`/tmp/.../scratchpad/xapk/_b/assets/index.android.bundle`),
> `corpus/screens_components.txt`, and `corpus/events_keys.txt`. They are LEARNINGS
> about what knobs Hevy exposes — no Hevy code/assets are copied.

## Settings & customization — Hevy vs Volyume

### How Hevy does it

Symbol-level evidence of the settings surface Hevy ships (ViewModel / Screen /
Modal / Overlay names in the bundle):

- **Per-exercise units** — `SelectExerciseUnitsModal/Overlay`,
  `SelectExerciseUnitsViewModel`, `ExerciseUnitsModal`. A given exercise can be
  logged in kg or lb (or other) independent of the global unit. Power-users with
  mixed-equipment gyms (lb dumbbells, kg plates) value this heavily.
- **Per-exercise dumbbell handling** — `ExerciseDumbbellSettingsModal/Overlay`.
  Lets a dumbbell exercise track per-hand vs total weight.
- **Plate calculator + plate inventory** — `EnablePlateCalculatorViewModel`,
  `PlatesScreen`, `CreatePlatePress`, `disabledPlateIds`,
  `updateExerciseDisabledPlateIds`. Users toggle the calculator on/off AND tell
  the app which plates exist in their gym (disable plates they don't own) so the
  breakdown is realistic.
- **Barbell config** — `BarbellsScreen`, `barWeightInput`. Multiple named bars
  (e.g. 20 kg Olympic, 15 kg women's, EZ/trap), selectable per exercise.
- **Warm-up calculator** — `WarmupCalculatorSettingsScreen`,
  `WarmupCalculatorStore`, `WarmupMethodEditor`, `isWarmupCalculatorSupportedForExerciseType`,
  `isWarmupSetsCountEnabled`, `warmup_values_setting` (event). Auto-generates
  warm-up ramp sets toward the working weight; the method is user-editable.
- **Rest timer defaults + auto-start** — `RestTimerSetting(s)`,
  `defaultRestTimer`/`defaultRestTimerValue`, `AutoRestTimerSettings`,
  `AutoRestTimerConfigOverlay`, `AutoRestTimerModal`, `rest_timer` (event),
  `SelectTimerSoundsSettingsScreen`, `TimerSoundSettingsViewModel`. Global default
  rest, per-exercise override, auto-start-on-set-complete, and timer sound choice.
- **Default workout visibility** — `DefaultWorkoutVisibilityOverlay`,
  `SelectWorkoutVisibilitySettingsScreen`, `workoutVisibilityModal`,
  `default_workout_visibility_public`, `workout_visibility` (event). Private /
  followers / public default for new workouts (social product).
- **Theme / appearance** — `LightThemeSettingViewModel`,
  `DarkThemeSettingScreen`, `SelectBackgroundThemeModal`,
  `BackgroundThemedDraggableModal`. Light/dark plus selectable accent/background
  themes.
- **Language** — `LanguageSettingViewModel` (full in-app locale picker;
  Italian/German strings seen in `ui_copy.txt`).
- **Tracking knobs** — `RoutineTrackingSettingScreen`,
  `volume_includes_warmup_sets` (event) — user chooses whether warm-up sets
  count toward volume; `previousWorkoutValues` (×8) — "previous values" prefill.
- **First day of week** — implied by calendar/weekly-report ViewModels
  (`isFirstWorkoutOfWeekInMonthlyReport`); standard Hevy setting (not isolated as
  a clean symbol in this corpus — treated as a likely-but-uncorroborated knob).

### How Volyume does it today (file:line)

- Settings landing: `src/screens/SettingsScreen.js:14-73` — categories: Account,
  Profile, Coaching, Notifications, Display & accessibility, Health, Your data,
  Privacy, Help/about. No "Workout"/"Units"/"Timer" category exists.
- **Units = kg-only by deliberate design (UK).** `src/store/useAppStore.js:1360-1379`
  — `setUnits` coerces anything to `'kg'`; lbs removed. `:796` forces `units: 'kg'`
  from cloud. So there is no global unit picker and no per-exercise unit.
- Body-weight units: `src/store/useAppStore.js:1381-1396` (`bodyWeightUnits`,
  default `'st'`; `st`|`kg`|`lbs`). Only set in onboarding
  (`src/screens/ProOnboardingScreen.js`); **not editable in any Settings screen.**
- Barbell weight: store `barWeight` default 20 (`useAppStore.js:797, 1468`);
  setter exists but no Settings UI surfaces it (only consumed inside
  `src/components/PlateCalculator.js:9`).
- Plate calculator: `src/components/PlateCalculator.js` exists with
  `PLATE_SETS`/`DEFAULT_BAR_WEIGHT` from `src/lib/algorithms.js:5`, but it is a
  display widget — no enable/disable toggle, no plate-inventory config, no named
  bars. (Note: lbs plate branches at `:16,34` are dead given kg-only.)
- Rest timer: global default is a hardcoded constant
  `DEFAULT_REST = 90` (`src/screens/BuildWorkoutScreen.js:19`); per-exercise rest
  IS editable in the routine builder (`:73-74, 268`) and consumed at
  `src/screens/ActiveWorkoutScreen.js:940` (`restSeconds || 90`). No global
  default-rest setting, no auto-start toggle, no timer-sound choice. Store timer
  logic: `useAppStore.js:1308-1340`.
- Effort: **RIR-only.** RPE picker was removed (`src/components/SetEntry.js:145`
  "Effort picker removed"); `rpe` is always written `null`
  (`ActiveWorkoutScreen.js:851,868`). Default set carries `rir: 2`
  (`ActiveWorkoutScreen.js:35`). No user toggle for RPE vs RIR vs none.
- Theme/appearance: `src/screens/SettingsDisplayScreen.js:12-16` — Dark / Light /
  Match phone, plus larger text, higher contrast, colour-blind palette, reduce
  motion. Strong a11y story; no accent/background theme choice.
- Language: none — app is British-English only (CLAUDE.md language rule). No
  in-app locale picker.
- Workout visibility: none — Volyume is offline-first, no social feed, so there is
  no per-workout public/private default (architecturally absent, not a gap to copy).
- First day of week: hardcoded Monday (`weekStartsOn: 1`,
  `src/screens/CoachReviewScreen.js:53,245,246`); no user setting.
- Warm-up: warm-up sets are a `setType` excluded from tonnage
  (`src/lib/algorithms.js:126,136,350`); no warm-up *calculator* or
  ramp-generation, and no "include warm-up in volume" toggle.

### Gaps

1. **No global rest-timer default + no auto-start.** Hevy lets users set a default
   rest and auto-start it when a set completes; Volyume hardcodes 90 s and never
   auto-starts from a global setting. This is the single most-used power-user knob.
2. **No warm-up calculator.** Hevy auto-builds warm-up ramp sets to the working
   weight; Volyume only tags warm-ups manually. High value for barbell lifters.
3. **Body-weight unit not editable post-onboarding & barbell weight has no UI.**
   `bodyWeightUnits` and `barWeight` both have store setters but no Settings screen
   surfaces them — a user who picks the wrong unit in onboarding is stuck.
4. **Plate calculator has no config** (enable toggle, plate inventory, named bars).
   The widget exists but can't be tailored to a user's actual gym.
5. **No first-day-of-week setting** (Monday hardcoded) — non-trivial for US users
   and anyone whose training week starts Sunday.
6. (Intentional, NOT gaps to close): per-exercise lb/kg units, default workout
   visibility, in-app language picker, "include warm-ups in volume" — these clash
   with Volyume's kg-only / offline-first / British-English deliberate decisions.
   Per CLAUDE.md these are architectural decisions; flag, don't copy.

### Recommendations (adopt / adapt, size, priority, why)

| # | Recommendation | Adopt/Adapt | Size | Priority | Why |
|---|----------------|-------------|------|----------|-----|
| R1 | Add a **"Workout" settings sub-page** holding: global **default rest timer**, **auto-start rest on set complete** toggle, **rest-timer sound** choice. Wire default rest into `BuildWorkoutScreen` `DEFAULT_REST` and `ActiveWorkoutScreen:940` fallback. | Adapt | M | **P1** | Most-used Hevy knob; Volyume already has all timer plumbing (`useAppStore.js:1308-1340`), just no default/auto-start setting. |
| R2 | Surface **body-weight units** and **barbell weight** as editable rows (setters already exist: `setBodyWeightUnits`, `setBarWeight`). Put bar weight on the same Workout page. | Adopt | S | **P1** | Pure UI wiring over existing store; fixes "stuck after onboarding". Keep gym units kg-only per design. |
| R3 | **Warm-up calculator**: generate ramp sets (e.g. 40/60/80% of working weight) as a per-exercise opt-in in the routine builder / active workout. Reuse `PlateCalculator` for the plate breakdown of each ramp step. | Adapt | L | **P2** | High value for barbell lifters; deterministic maths fits the no-AI engine rule. Coordinate with coaching engine owner before touching set generation. |
| R4 | **Plate calculator config**: enable/disable toggle, plate-inventory (disable plates you don't own), and named bars (20/15 kg, EZ, trap). Extend `PLATE_SETS`/`DEFAULT_BAR_WEIGHT` and persist a `disabledPlateIds`-style list. | Adapt | M | **P2** | Makes the existing widget gym-accurate; mirrors Hevy's `disabledPlateIds`/`BarbellsScreen` without copying. |
| R5 | **First-day-of-week** setting (Mon/Sun) feeding `weekStartsOn` everywhere it's hardcoded (`CoachReviewScreen.js:53,245,246` + any weekly aggregation). | Adopt | M | **P3** | Correctness for non-Monday weeks; medium because every weekly boundary must read the setting, and coaching weekly windows are touched — verify with engine owner. |
| R6 | **Effort-display toggle (RIR / RPE / off)** in Coaching settings. Currently RIR-only with RPE forced `null`. | Adapt | M | **P3** | Some power-users prefer RPE. Engine reads RIR; RPE→RIR mapping would touch coaching maths — gate behind a founder/engine decision, do not silently add. |

### Quick wins

- **R2** (body-weight units + barbell weight rows): both store setters exist
  (`useAppStore.js:1383, 1468`); this is a few `SettingRow`s on a new/existing
  sub-page — **S, P1, no engine risk.**
- **Global default rest value** alone (the value, before tackling auto-start/sound):
  one row + replace the `90` literals at `BuildWorkoutScreen.js:19` and
  `ActiveWorkoutScreen.js:940` with the stored default — **S, P1.**
- **Accent/theme polish is optional**: Volyume's a11y palette work
  (`SettingsDisplayScreen.js`) is already ahead of Hevy on accessibility; an accent
  picker is low-priority cosmetic, not a power-user gap.

> Engine/safety note: R3, R5, R6 touch set generation, weekly windows, or effort
> maths that border the deterministic coaching engine. Per CLAUDE.md SACRED RULES,
> do not modify those paths without the structured founder/engine decision first.
