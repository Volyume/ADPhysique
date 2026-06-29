# 10 — Health / Wearables / Widgets — Hevy vs Volyume

Competitive teardown of Hevy (RN/Hermes v3.1.0, Android XAPK + Hermes bundle) against
Volyume's current code. LEARNINGS ONLY — no Hevy code or assets are copied; everything
below is "what they do" + "what we should do ourselves", evidenced by the decompiled
manifest and Hermes-packed bundle strings (corroborated, since Hermes concatenates
strings and some greps surface false neighbours).

Evidence corpus:
- `scratchpad/base_decoded/AndroidManifest.xml` (decoded, authoritative for components/permissions)
- `scratchpad/corpus/bundle_strings.txt` (Hermes string dump — corroborate, never quote as API)
- `scratchpad/corpus/native_libs.txt`

---

## Health / wearables / widgets — Hevy vs Volyume

| Capability | Hevy | Volyume today |
| --- | --- | --- |
| Health Connect (Android) | Read+write: weight, body-fat, exercise, total-calories, heart-rate (+read weight/body-fat) | Read: weight, steps, cardio(+HR); write: exercise + active-calories |
| Apple HealthKit (iOS) | Yes (read/write, Apple Watch sourced) | Yes (weight/steps read, workout write, cardio+HR read) |
| Wear OS companion app | **Yes** — native `WearListenerService`, `wear://…/workout-started` path, MessageClient sync | **None** |
| Apple Watch companion app | **Yes** — log a workout on the watch, HR during workout, complications | **None** (only HK read of watch-sourced data) |
| Heart-rate during a live workout | **Yes** (watch streams avg/max HR into the set log) | No live HR; only post-hoc avg HR imported with cardio sessions |
| iOS Live Activity / Dynamic Island | Live Activity during workout (`LiveActivity*`, `Workout_*` strings) | Yes, but rest-timer only (`VolyumeRestTimerLiveActivity.swift`) |
| Home-screen widgets | **10** distinct Android widgets (5 configurable) + iOS/complication set | **2** Android widgets (NextSession, WeeklyConsistency) + 1 iOS widget bundle |

### How Hevy does it

**Health Connect (Android).** Manifest declares a broad health scope set:
`health.WRITE_BODY_FAT`, `WRITE_EXERCISE`, `WRITE_WEIGHT`, `WRITE_TOTAL_CALORIES_BURNED`,
`WRITE_HEART_RATE`, plus `READ_WEIGHT` and `READ_BODY_FAT`, and a `<package
android:name="com.google.android.apps.healthdata"/>` visibility entry. Note they *write*
heart-rate and total-calories (because the watch is the source of truth), where Volyume
only writes exercise + active-calories. They also hold `ACTIVITY_RECOGNITION` for steps.

**Wear OS companion (Android).** A real exported native service
`com.hevy.services.WearListenerService` listens for `com.google.android.gms.wearable.MESSAGE_RECEIVED`
on data scheme `wear`, path prefix `/workout-started`. Bundle strings corroborate a
two-way protocol: `WatchWorkout`, `Workout_wearOSWatch`, `WorkoutToWatch`,
`WorkoutDataWatch`, `WorkoutIndexToWatch`, `sendToWatch`, `messageClient`,
`Sync con Wear OS Watch`, `SYNC_DATA to Apple Watch`. So the watch is a first-class
logging surface: you start/run a workout on the watch, it streams set/HR data back to
the phone, which persists it.

**Apple Watch companion (iOS).** Bundle is dense with watch/HR vocabulary —
`Apple Watch` (91x), `appleWatch`/`AppleWatch` (90+), `WorkoutToAppleWatch`,
`workout on your watch`, `complication`, `LiveActivity`, `averageHeartRate`,
`maxHeartRate`, `bpm`. The Apple Watch app logs workouts standalone and records
real HR (avg + max) per set, which the phone reads back via HealthKit.

**Live Activity (iOS).** `LiveActivity` + `Workout_*` strings indicate a *whole-workout*
Live Activity (elapsed time, current exercise, rest), not merely a rest-timer pill.

**Home-screen widgets (Android, 10).** Decoded manifest receivers:
`streak`, `rest`, `calendarstats`, `weeklystats`, `dayroutine`, `lastroutines`,
`lastworkouts`, `calendar`, `quickaccess`, `chart`. Five have native
`*ConfigurationActivity` (`chart`, `dayroutine`, `lastroutines`, `quickaccess`,
`weeklystats`) so the user picks which routine/metric/chart the widget shows. Bundle
strings confirm parallel iOS widgets + watch complications (`RoutinesWidget`,
`StatsWidget`, `WeeklyStatsWidgetConfigScreen`, `QuickAccessWidgetConfigScreen`,
`ChartWidgetConfigScreen`, `updateAppleWidgetStatus`, `ComplicationAndWidget`). The
notable interactive one is **QuickAccess** (tap a routine on the home screen → opens
straight into starting it) and **Rest** (a rest-timer widget).

### How Volyume does it today (file:line)

- `src/lib/health.js:1-137` — unified HealthKit/Health Connect wrapper, lazy-required,
  no-ops cleanly when native modules absent. Provider label + availability at `:122-137`.
- `src/lib/health.js:175-253` — `requestHealthPermissions`: iOS scopes weight/steps/
  workout/cardio (`:48-70`); Android record types weight(read), steps(read),
  exercise+active-calories(write), cardio = ExerciseSession+HeartRate read (`:199-215`).
- `src/lib/health.js:444-554` — steps read (today + per-day backfill), Android uses
  `aggregateRecord`/`aggregateGroupByPeriod` to dedupe multi-tracker sources.
- `src/lib/health.js:556-660` — `writeWorkoutToHealth` (strength session, est. kcal at
  `:567-574`). Writes exercise + active-calories only; does NOT write HR.
- `src/lib/health.js:591-602` — `shouldSkipPhoneHealthWrite` (COMP-020): if an Apple
  Watch session covered ≥50% of the workout, skip the phone's estimated duplicate so the
  watch's real HR/energy wins. **So watch-awareness exists in logic, but there is no
  Volyume watch app producing that `watchSessionMs` — it can only ever come from a
  third-party watch via HealthKit.**
- `src/lib/health.js:738-1007` — passive cardio import (ULTIMATE-CUX-PCI): reads
  completed cardio sessions + avg HR (`_avgHeartRateIos`/`_avgHeartRateAndroid`
  `:768-802`), read-only, feedback-only, Pro-gated, de-duped on `extId`.
- `src/screens/SettingsHealthScreen.js:1-313` — per-scope toggles: read weight, read
  steps, read cardio (Pro), write workout. Steps copy already says "your watch, phone or
  tracker" (`:117,:236-237`).
- `src/lib/activitySteps.js` — NEAT/step estimator consuming `readStepsToday`.
- Android widgets: `src/widgets/widgets.js:34-65` — `NextSessionWidget`,
  `WeeklyConsistencyWidget` (dumb renderers; ED-suppression fallback at `:52-55`);
  snapshot/writer logic in `src/lib/widgets/{snapshot,writer,storage}.js`;
  `src/widgets/widgetTaskHandler.js`; configured in `app.json:177-195`. Free tier, never
  exposes weight/calories/body data (semi-public home screen).
- iOS Live Activity: `modules/live-activity/ios/widget/VolyumeRestTimerLiveActivity.swift`
  + `VolyumeRestTimerAttributes.swift` + `VolyumeWidgetBundle.swift` — **rest-timer only**.

### Gaps

1. **No Volyume watch app (Apple Watch or Wear OS).** Hevy lets users log a whole
   workout from the wrist and streams real per-set heart rate back. Volyume can only
   passively read a third-party watch's HealthKit/Health Connect data after the fact.
   This is the single biggest functional gap in this area and a real reason gym users
   pick Hevy. (Large effort, and collides with Expo-managed-workflow + the "no native
   eject" architecture rule — see Recommendations.)
2. **No live in-workout heart rate.** Even without our own watch app, HealthKit/Health
   Connect can surface live HR during an active session (Hevy shows avg/max HR per set).
   Volyume reads avg HR only for *cardio* sessions post-hoc, never during a strength
   workout. We don't write HR back either.
3. **Widget breadth is thin.** 2 widgets vs Hevy's 10, and none are *interactive*
   (no QuickAccess "tap to start a routine" widget, no rest-timer widget on the home
   screen). Five of Hevy's widgets are user-configurable; ours are fixed. Volyume's iOS
   Live Activity is rest-timer-only, not a whole-workout activity.

Lesser gaps: we don't write heart-rate or total-calories to Health Connect (low value
without a watch source); no watch complications.

### Recommendations (adopt / adapt, S/M/L, P1/P2/P3, why)

1. **[ADAPT] QuickAccess "Start a routine" interactive Android widget — S, P1.**
   `react-native-android-widget` already supports tap actions routed through
   `widgetTaskHandler.js`. Add a widget listing the user's next 1–3 planned sessions;
   tapping deep-links into start-workout. Highest leverage:leverage ratio here — reuses
   the existing snapshot pipeline, free tier, no native work, directly closes Hevy's
   most-used widget. Keep the ED-suppression + no-body-data rules from `widgets.js`.

2. **[ADAPT] Live in-workout heart rate from HealthKit / Health Connect — M, P2.**
   No watch app required: subscribe to the live HR stream during an active strength
   session for users who already wear any HR-capable watch, show current/avg/max in the
   workout UI, and (optionally) write HR back so the session record carries real HR.
   Reuses `_avgHeartRate*` plumbing in `health.js`. Pro feature (heart-rate sits under
   Pro per the gating rules). Verify whether `react-native-health` /
   `react-native-health-connect` expose an observer/live-query path before committing —
   if not, this becomes a polling read every N seconds.

3. **[ADOPT, decision-gated] Volyume Apple Watch + Wear OS companion app — L, P3.**
   The correct strategic answer to gap #1, but it is the heaviest item and **conflicts
   with two architecture rules**: Expo managed workflow / never eject, and "native
   modules via config plugins only". A watchOS/Wear OS target is not deliverable as a
   pure config plugin; it needs real native targets. **This is a founder decision, not a
   build task** — surface it as: (a) accept a development-build / bare-adjacent watch
   target as an explicit, scoped exception; (b) ship a minimal Wear OS tile first
   (smaller surface, the manifest shows Hevy's Wear path is just a MessageClient +
   listener service); or (c) defer and lean on passive HealthKit/Health Connect import
   (status quo). Do not start any of (a)/(b) without that decision.

Supporting (lower priority):
- **[ADAPT] More configurable widgets — S/M, P2.** Add Streak and a Weekly-stats /
  consistency-chart widget (Hevy's `streak`, `weeklystats`, `chart`). We already compute
  streak + weekly consistency in the snapshot — mostly a rendering job. Keep
  configurability minimal (which metric) to avoid native config activities on iOS.
- **[ADAPT] Whole-workout iOS Live Activity — M, P2.** Extend the existing
  `live-activity` module beyond the rest timer to show elapsed time + current exercise,
  matching Hevy's in-workout Live Activity. Native Swift but inside the module we
  already own.
- **[ADAPT] Write heart-rate + total-calories to Health Connect — S, P3.** Only worth it
  once we have a live-HR or watch source; otherwise we'd be writing estimates.

### Quick wins

- Ship the **QuickAccess "start routine" widget** (#1) — small, free-tier, reuses the
  snapshot pipeline, closes Hevy's single most-used widget.
- Add a **Streak widget** by rendering the streak value the snapshot already carries —
  pure JSX in `widgets.js`, no new data.
- **Write HR back** in `writeWorkoutToHealth` when a session already captured HR (one
  Health Connect record type; the permission shape mirrors the existing exercise write).
- Settings copy already nods to "your watch" for steps — extend the same honest framing
  to cardio so users understand watch data flows in passively today.
