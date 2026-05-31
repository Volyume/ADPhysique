# Volyume steps: device-pedometer architecture research

Research date: 2026-05-31. Author: engineering session (research-only pass, no
code changed). Sister doc: `docs/audit/volyume-cardio-steps-audit-2026-05-30.md`
(the audit that established the `daily_steps` store).

This document researches and proposes a step-counting architecture for Volyume
that needs no setup from the user, works on any phone with a step sensor
whatever else is installed, and uses a wearable's more accurate number when one
is available. It does not change any code.

---

## Executive summary

The goal is three layers: (1) Volyume measures steps itself from the phone's
built-in sensor, with zero setup; (2) when Apple Health or Health Connect holds
a better number from a watch or band, that wins; (3) a decision tree picks the
right source at any moment, including after the app has been fully closed.

The single most important finding is that the two platforms are not symmetric,
so the "phone sensor is the foundation, health platform is the upgrade" framing
holds on iOS but only half-holds on Android. Be honest about this rather than
design for a symmetry that does not exist.

**iOS is effectively solved with what Volyume already ships.** The iPhone's
motion coprocessor records steps at the OS level whether or not Volyume is
running, and keeps roughly seven days of history. `expo-sensors`
(`~13.0.9`, already a dependency) wraps this: `Pedometer.getStepCountAsync(start,
now)` returns the real total for any window in the last seven days, even one
where the app was dead the whole time. Catch-up after a full close is one query
on launch. No background service, no native code, near-zero battery. This is the
Pedometer++ model.

**Android is where the work is, and the right model is feed-then-read.** Health
Connect is the underlying datastore and arbiter on Android. It does not generate
steps itself; apps are sources that write to it and readers that query it, and
the `aggregate` query dedupes across all sources by the user's priority list.
Samsung Health, Fitbit, Garmin and the rest are just sources, not the
infrastructure. The key correction to make here: on Android nothing feeds Health
Connect automatically. Unlike iOS, the phone's hardware steps are not written
into Health Connect by the OS. That is precisely why a device with no fitness app
(an S24 with no Samsung Health out of the box) shows nothing: the infrastructure
is present but no source is feeding it.

So the correct Android design is for Volyume's own pedometer to become a source.
Volyume measures steps from the phone sensor, writes them into Health Connect,
and reads the deduplicated `aggregate` back. Health Connect does the arbitration:
if a Galaxy Watch is also present and higher priority, the watch wins for
overlapping windows; on a bare phone Volyume is the only source, so steps just
work with zero setup. The raw hardware path is still needed, but its job is to
*measure* what Volyume writes, including the cumulative-delta backfill on relaunch
for the period the app was closed (Health Connect will not capture the closed gap
on a bare device unless an app writes it). `expo-sensors` cannot do this:
`getStepCountAsync` throws on Android and the live watcher only reports
subscription-relative deltas while foregrounded, so a small custom native module
that exposes the raw `TYPE_STEP_COUNTER` value is required. Two consequences:
feeding Health Connect needs the `WRITE_STEPS` permission (`app.json` has
`READ_STEPS` only today), and the raw counter loses steps across a reboot while
the app was closed unless another source covered the gap.

**Catch-up approach per platform:**

- iOS: on launch/foreground, `getStepCountAsync(startOfToday, now)` via
  `expo-sensors`. Read only, the phone already feeds HealthKit. Done.
- Android: a new raw `TYPE_STEP_COUNTER` module measures steps, writes them into
  Health Connect (with the cumulative-delta backfill for the closed period on
  relaunch), and Volyume reads the deduplicated
  `aggregate(Steps → COUNT_TOTAL, between(startOfToday, now))` back (the read is
  already wired in `health.js`). Health Connect arbitrates between Volyume's
  contribution and any wearable. If another source (Samsung Health, a watch) is
  already feeding Health Connect, Volyume's write is deduped against it and the
  higher-priority source wins, so feeding does not double count.

**Recommended libraries:** `expo-sensors` (already present) for iOS and for the
Android live-while-open figure; `react-native-health-connect` `3.3.3` (already
present) for the Android catch-up and wearable merge; `react-native-health`
(already present) for the optional iOS HealthKit upgrade. The only new native
code is a small Android config-plugin module that exposes the raw
`TYPE_STEP_COUNTER` value, and only if we decide to support the no-Health-Connect
fallback.

**Decision tree in one line:** pick the highest-quality available source for the
window, never sum sources, prefer the health-platform aggregate when authorised
(it already includes the phone's own steps), and fall back to the internal
sensor, then to manual entry at the weekly check-in.

**Top three build priorities:**

1. iOS internal pedometer via `expo-sensors`, written into the existing
   `daily_steps` store with `source = 'device'`. Lowest effort, immediate win,
   no new dependency.
2. A source-selection layer in `activitySteps.js` that prefers the health
   aggregate when granted and falls back to the device sensor, with a stored
   last-seen checkpoint so a relaunch query fills the gap. This makes catch-up
   real on both platforms without double counting.
3. Android raw `TYPE_STEP_COUNTER` fallback (custom config-plugin module) for
   devices where Health Connect is not available. Highest effort and the only
   new native code, so it comes last and only if the data says enough users land
   on Android without Health Connect.

The honest complexity assessment: iOS is a day or two. The cross-cutting
source-selection and checkpoint logic is a few days with tests. The Android raw
sensor module is the hard, risky part (native code, reboot edge cases, OEM
battery behaviour, ~5 to 10 percent of devices with no usable sensor) and may
not be worth it if Android 14+ Health Connect coverage is high enough among real
users.

---

## Internal audit (from the code)

What exists today, with file references:

**Health-platform integration only. No direct sensor reading for steps.**
`src/lib/health.js` is the unified wrapper over Apple Health
(`react-native-health`, iOS) and Health Connect (`react-native-health-connect`
`3.3.3`, Android). Steps are read by `readStepsToday()` (`health.js:371`):

- iOS: `HK.getStepCount({startDate, endDate})`, which wraps HealthKit's
  statistics query and is already deduplicated across iPhone and Watch.
- Android: `HC.aggregateRecord({recordType: 'Steps', timeRangeFilter})` reading
  `COUNT_TOTAL` (`health.js:398`), with a raw `readRecords('Steps')` sum as a
  fallback. The aggregate path is the correct deduplicated read.

`requestHealthPermissions(['steps'])` (`health.js:109`) handles the iOS HealthKit
init and the Android Health Connect `requestPermission`, and now logs the silent
empty-grant case (`health.requestPermission.empty`) that was the Android 14
field failure.

**`expo-sensors` `~13.0.9` is installed but not used for steps.** The only motion
use is the shake-to-send-feedback gesture in `src/components/FeedbackSheet.js`.
The iOS usage string even says so: `NSMotionUsageDescription` in `app.json` reads
"Steps now come from Apple Health, not the phone's motion sensor." So the
Pedometer API is already available to us, just unused. This is the foothold for
Layer 1.

**Step data model.** `daily_steps` table (`database.js:1111`):
`PRIMARY KEY (user_id, entry_date)`, columns `steps`, `source`
(`'manual' | 'auto' | 'health'`), `updated_at`. Last-write-wins on `updated_at`,
mirrored to cloud (migrations 056 and 058, additive). Helpers:
`setDailySteps` (`database.js:3519`), `getDailySteps`, `getDailyStepsToday`,
`getDailyStepsRange`, `getDailyStepsForPush`, `insertDailyStepsFromCloud`, and
`activityDayKey` (UTC-day key, matching the food domain so steps and food share a
calendar boundary). The store is a clean place to write a device-measured figure
against; it just needs a new `source` value such as `'device'`.

**Read/record layer.** `src/lib/activitySteps.js` is the guarded, lazy layer the
rest of the app calls: `isStepSourceAvailable`, `getStepPermissionStatus`,
`requestStepPermission(Status)`, `readTodaySteps` (returns null when unavailable
or a genuine zero), and `recordTodaySteps(userId)` which writes the read figure
into `daily_steps` with `source = 'auto'` when the permission is granted. This is
the right home for the source-selection decision tree.

**Permissions and prompt flow.** `src/lib/stepsLaunchPrompt.js` shows a single
once-per-install alert offering to connect steps; `ProOnboardingScreen.js`
(`advanceFrom4`, around line 376, and the steps request around line 468) requests
the steps permission alongside notifications during Pro enrolment.

**App-state and background plumbing already wired.** `App.js` registers a
background task `VOLYUME_DAILY_SYNC` via `expo-task-manager` +
`expo-background-fetch` (`App.js:73` and `App.js:431`), with
`minimumInterval` ~12h, `stopOnTerminate: false`, `startOnBoot: true`. It is used
for cloud sync today, not steps, but it is exactly the mechanism a periodic
Android step-counter sampler would reuse. Foreground refresh runs through
`maybeSync` (`App.js:449`), which calls `recordTodaySteps` (`App.js:510`), plus a
second `AppState` 'active' sync effect (`App.js:641`), and the `StepsCard`
component re-reads on both navigation focus and `AppState` 'active'
(`src/components/StepsCard.js`).

**Display.** `src/components/StepsCard.js` on the Progress tab shows today's total
and the week's average; `src/lib/stepsSummary.js` (`summariseWeekSteps`) feeds the
weekly coach.

**Manual entry.** Only at the weekly check-in: `WeeklyCheckInScreen.js` shows the
week's auto average when four or more days are registered, otherwise the user
types a single weekly average (`stepsManual`). There is no per-day manual entry,
which is fine.

What is absent:

- No direct `CMPedometer` / `TYPE_STEP_COUNTER` reading. Steps depend entirely on
  a health platform holding data.
- No last-active timestamp or checkpoint to compute a gap on relaunch.
- No reboot handling (nothing reads a cumulative counter yet).
- No internal-versus-platform reconciliation (only one source exists today, so
  the double-count question has never arisen).

The three-layer design maps cleanly onto this: Layer 2 (platform override) works
already; the data store and background plumbing for Layer 3 are mostly in place;
Layer 1 (internal pedometer) is the real gap, hard on Android, easy on iOS.

---

## Direct pedometer research

### iOS: Core Motion `CMPedometer`

`CMPedometer` reads system-generated walking data from the motion coprocessor
present since the iPhone 5s. The coprocessor logs steps continuously at the OS
level, independent of whether any app runs, and the OS keeps roughly the last
seven days. Two entry points:

- `startUpdates(from:withHandler:)`: live updates, but only while the app is in
  the foreground. Updates pause when backgrounded or the screen is off; the OS
  keeps logging regardless.
- `queryPedometerData(from:to:)`: historical totals for any window in the last
  seven days, read back from the stored log. This is accurate for windows when
  the app was not running. Live-only fields (pace, cadence) come back nil for
  historical queries; steps and distance are populated.

Catch-up after a full close is therefore trivial and is the documented pattern:
on launch or foreground, query from start-of-today (or the last synced point,
clamped to seven days) to now. The OS retained the steps while the app was dead,
so the query returns them. No background execution needed, negligible battery.

Permission: `NSMotionUsageDescription` (already in `app.json`). The user sees a
one-time Motion and Fitness prompt. Read it via `CMPedometer.authorizationStatus()`.

Library assessment for an Expo SDK 51 / RN 0.74.5 app:

- `expo-sensors` Pedometer (`~13.0.9`, already installed): the right choice on
  iOS. `Pedometer.getStepCountAsync(start, end)` maps to `queryPedometerData` and
  works for historical ranges on iOS (the docs note only the past seven days are
  stored). `watchStepCount` maps to live updates. Declares
  `NSMotionUsageDescription` via its config plugin. No native code.
- `react-native-pedometer` (mathieudutour): dead, last publish ~8 years ago. Do
  not use.
- `@dongminyu/react-native-step-counter`: maintained, but requires the New
  Architecture from v0.3.0, a poor fit for stock SDK 51 and offering nothing
  `expo-sensors` does not already give us on iOS.
- `react-native-sensors`: raw accelerometer/gyro, no pedometer abstraction. Not
  relevant.

iOS verdict: solved with the existing `expo-sensors`. Live-today and closed-app
catch-up both come from `getStepCountAsync`. No new dependency, no eject.

### Android: `TYPE_STEP_COUNTER` sensor

`Sensor.TYPE_STEP_COUNTER` is a low-power hardware counter that reports cumulative
steps since the last reboot, resetting to zero only on reboot. Its first reading
after boot is rarely zero (it counts since the OS started). `TYPE_STEP_DETECTOR`
fires one event per step with no running total; you would accumulate it yourself,
at higher battery cost and with no historical value. `TYPE_STEP_COUNTER` is the
one you want.

The closed-app case is solvable in principle: the hardware keeps counting even
with no app listening, so on reopen you read the current since-boot cumulative
value and subtract a stored checkpoint to recover the steps taken while closed.
This works only if you can read the raw cumulative value, which is exactly what
`expo-sensors` hides (see below).

Reboot resets the counter to zero, so if a stored checkpoint is greater than the
current reading, a reboot happened and the pre-reboot gap is lost unless you can
backfill it from a health platform. Persist the checkpoint with a timestamp and
re-baseline at the current value when a reset is detected.

Catch-up strategies, assessed:

| Strategy | Reliability | Battery | Complexity | Notes |
|---|---|---|---|---|
| Cumulative-counter delta on relaunch | High for "closed, no reboot"; loses pre-reboot steps | Negligible | Low | The natural fit. Needs raw cumulative access. |
| WorkManager periodic sampling (~15 min min) | Moderate; OEM Doze can delay or kill it | Low to moderate | Moderate | Checkpoints more often, bounds reboot loss. Not real-time. |
| Foreground service | Highest continuity | Highest; persistent notification | High | Overkill for a logging app; bad UX and battery. |
| Query Health Connect for the gap | High, survives reboot | Low | Moderate | The cleanest backfill, but it is the "intermediary" the brief wanted to avoid. In practice it is the right answer (see below). |

The React Native blocker: `expo-sensors` does not give you what catch-up needs on
Android. Confirmed from the SDK 51 source: the native module subscribes to
`TYPE_STEP_COUNTER` but stores a baseline on the first event and emits
"steps since you subscribed", a delta, only while subscribed and in the
foreground. `getStepCountAsync` rejects on Android with "Getting step count for
date range is not supported on Android yet". So with `expo-sensors` alone you
cannot read the raw cumulative value, cannot compute a closed-app delta, and
cannot detect a reboot. This is a long-standing, well-documented limitation
(Expo issues #4895, #9463, #13131, #16605).

To read the raw counter you need either:

- A small custom native module via an Expo config plugin (the recommended path if
  we support the no-Health-Connect fallback): register a `SensorEventListener` on
  `TYPE_STEP_COUNTER`, expose `event.values[0]` (raw cumulative) to JS, persist a
  timestamped checkpoint, optionally pair with a WorkManager sampler. Roughly 50
  lines of Kotlin. Works in the managed workflow through `expo prebuild` and EAS
  Build. This adds native code but is not a permanent eject.
- `@dongminyu/react-native-step-counter`: requires the New Architecture,
  incompatible with stock SDK 51 without risk. Not recommended.

Permission: `ACTIVITY_RECOGNITION` is a runtime permission on Android 10+
(already declared in `app.json`). The user sees an "allow physical activity"
dialog. Without it the counter delivers nothing.

Device coverage: the step counter arrived with Android 4.4 (2013) but is
hardware-gated, so it is common but not universal. Some low-end and certain
Xiaomi/MIUI devices lack it or fire it late. Always feature-detect
(`isAvailableAsync`) and plan an accelerometer fallback or manual entry for the
~5 to 10 percent without a usable sensor.

Android verdict: `expo-sensors` is a dead end for catch-up. The live watcher gives
a foreground-only, subscription-relative delta, useful only as a "steps since you
opened the app" figure. True catch-up needs either Health Connect (preferred, see
the next section) or a custom raw-sensor module.

---

## How other apps solve this

The whole topic splits along iOS versus Android because the OS plumbing differs.

iOS consensus, strong: apps do not run in the background for steps. The
coprocessor records continuously and cheaply; the app queries history on launch
and instantly catches up for any window in the last seven days. HealthKit sits on
top for cross-device merge and longer history.

- Pedometer++ (David Smith) is the reference implementation: CMPedometer as the
  live phone source, Apple Health as the merge layer, plus its own algorithm that
  picks the best device per window and offers "import historical data". It works
  with no background service and merges Apple Watch data when present, preferring
  whichever device is the better source for a window rather than summing.
- StepsApp and Stepz follow the same pattern: CMPedometer primary, HealthKit
  optional for import and Watch merge, catch-up via the seven-day historical
  query. StepsApp's own docs describe passing a start date up to seven days old
  and getting the total since.
- Pacer is dual-mode: phone motion sensor or Apple Health on iOS; phone sensor
  plus Google Fit / Samsung Health / Health Connect on Android. Whether the Watch
  overrides the phone is decided by the user's Apple Health source priority, not
  by Pacer.

Android consensus, harder and well-documented: there is no free, always-on,
queryable OS history at the raw-sensor layer. `TYPE_STEP_COUNTER` is
cumulative-since-boot, resets on reboot, and only increments visibly while you
reconcile against it. Reliable catch-up requires either a persistent foreground
service plus baseline bookkeeping plus midnight checkpoints (fighting OEM battery
killers the whole way), or delegating to a health platform that persists records
independent of your process. The dominant user complaint across Android step apps
is "missed steps when the app was closed", and the dominant fix is "turn off
battery optimisation" or "use the health platform".

- Google Fit was the old Android way to get retained, queryable history, but its
  APIs shut down on 30 June 2025 with end-of-service in late 2026. Google directs
  everyone to Health Connect. Do not build new on Google Fit. (Volyume does not.)
- Samsung Health counts on the phone accelerometer with a system-blessed
  background service on Galaxy devices, so it survives closure better than
  third-party apps; on non-Samsung hardware (a Pixel) users report it missing a
  large share of steps.
- Weight-loss walking apps (WalkFit and similar) are thin layers over the health
  platform and inherit its catch-up: good on iOS, platform-dependent on Android.

Wearable override: almost no app writes its own override logic. They read
HealthKit or Health Connect and let the platform's source priority or aggregation
decide whether the watch beats the phone. Pedometer++ is the exception that adds
its own merge.

Pattern to copy: iOS is CMPedometer historical query on launch (via
`expo-sensors`), done. Android is Health Connect `aggregate` on launch as the
primary catch-up source, with a raw-sensor fallback for devices without Health
Connect.

---

## Health-platform priority override

### Deduplication and source priority

Health Connect: the aggregate API deduplicates, `readRecords` does not. An
`aggregate` of `StepsRecord.COUNT_TOTAL` keeps only the highest-priority app's
data for any overlapping window, so a user with a phone plus a Garmin plus a
Galaxy Watch sees one true total, not the sum. Steps fall under the Activity data
type, which Health Connect dedupes (only Activity and Sleep are deduped; other
types are combined). The priority order is set by the user in Health Connect
settings; the app cannot read or change it. `readRecords` returns raw per-source
rows and would double-count if summed. Volyume already uses the aggregate path in
`health.js:398`, which is correct.

HealthKit: `HKStatisticsQuery` / `HKStatisticsCollectionQuery` with
`.cumulativeSum` dedupes automatically and matches what the system Health app
shows; iPhone-versus-Watch overlap is merged with no app work because the two
sources derive from each other. `HKSampleQuery` returns raw, un-merged samples
that you must not sum. `react-native-health`'s `getStepCount` and
`getDailyStepCountSamples` wrap the statistics queries, so Volyume's iOS read
(`health.js:382`) already inherits the merge. A privacy quirk: for read types
HealthKit will not tell the app whether the user granted or denied, so you do not
branch on status, you just query and fall back if the result is empty.

Does a watch yield a better total? Generally yes, when read through the
aggregate/statistics API. A wrist device captures steps the phone misses, and
because both platforms dedupe by priority, adding the watch raises the total
toward the true count rather than inflating it. "Better" still depends on the
user wearing the device and on their priority order; the platform total is "best
available given the user's sources", not guaranteed ground truth.

### Catch-up via the health platform after a close

Both platforms persist everything the phone and any synced wearable recorded
while the app was terminated, so a relaunch range query fills the gap:

- Health Connect: `aggregate(COUNT_TOTAL, between(lastSeen, now))` returns the
  deduplicated total for the whole gap, including a watch's steps from while the
  app was dead. Use `aggregateGroupByDuration/Period` for per-bucket fill.
- HealthKit: `HKStatisticsQuery` with a start/end predicate and `.cumulativeSum`,
  or `HKAnchoredObjectQuery` with a persisted anchor for incremental sync. The
  store keeps collecting while the app is terminated; only background delivery to
  the process stops, which is precisely why a relaunch query is needed.

The double-count trap, stated plainly, and it differs by platform:

- iOS: the phone already writes its own steps into HealthKit automatically. So
  Volyume must read only and must not write its CMPedometer figure back, or it
  creates a second phone source HealthKit then has to dedupe. Read the HealthKit
  statistics total when connected (it merges the Watch), or the bare CMPedometer
  figure otherwise. Never write, never sum.
- Android: the opposite. Nothing feeds Health Connect automatically, so Volyume
  *should* write its measured steps in as a source. The double-count risk is not
  Volyume-versus-the-platform, it is Volyume overlapping its own previous writes,
  so the writer must track its last-written end time and write non-overlapping
  intervals. Across sources, Health Connect handles dedup by priority: if Samsung
  Health or a watch also wrote the same window, the higher-priority source wins
  and the rest is discarded from the aggregate. So Volyume writes, then reads the
  aggregate, and lets the infrastructure arbitrate rather than choosing at read
  time.

### Availability with zero setup

Android: on Android 14+ (API 34) Health Connect ships in the OS framework, cannot
be uninstalled, and needs no install, which is as close to zero-setup as Android
gets. On Android 13 and below it is a separate Play Store app the user must
install. Check at runtime with `getSdkStatus`: `SDK_AVAILABLE` (proceed),
`SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED` (offer an update, treat as not ready),
`SDK_UNAVAILABLE` (do not attempt). Volyume already exposes this via
`getHealthConnectSdkStatus` in `health.js:273`. If anything other than available,
fall back to the internal sensor and do not nag.

iOS: HealthKit is present on every iPhone (check `isHealthDataAvailable()`). An
iPhone with no wearable still has step data because the coprocessor records it
with no setup, so the statistics query returns real data on a bare phone. A watch
or third-party app just adds sources to merge.

Framing permission as optional: present it as an enhancement ("connect your
health data for a more complete step count"), make it skippable, never block
logging on it, and when declined keep working entirely on the internal sensor
with no degraded messaging.

Forward-looking Android risk worth flagging now: from June 2026 Health Connect
moves on-device step records to device-specific Synthetic Package Names. When
aggregating, code should be ready to include both the legacy `android` origin and
the device SPN so on-device steps are not missed after that change. This affects
the existing `health.js` aggregate read, not just future work.

---

## Decision tree and architecture

### Source model, per platform

The two platforms work differently, so the model is not symmetric.

iOS (read only, the phone already feeds HealthKit):

1. HealthKit statistics total when connected (merges the Watch, deduped). Best.
2. CMPedometer via `getStepCountAsync` (bare phone figure). Layer 1.
3. Manual entry at the weekly check-in. Last resort.

Android (feed-then-read, Health Connect is the arbiter):

1. Volyume's raw sensor measures steps and writes them into Health Connect as a
   source.
2. Volyume reads the `aggregate` back. Health Connect dedupes Volyume's
   contribution against any wearable or other source (Samsung Health, a watch) by
   the user's priority order, so the read is always the best available total.
3. If the raw sensor is unavailable (no chip, or `WRITE_STEPS` declined), Volyume
   still reads whatever else is feeding Health Connect; if nothing is, manual
   entry at the check-in is the last resort.

The reconciliation rule: on iOS choose the single highest read source for the
window and never sum. On Android do not choose at read time at all, write the
sensor data in and let Health Connect's aggregate arbitrate. The only summing
Volyume ever does is its own non-overlapping interval writes on Android.

### Normal operation (app open)

On app start and on every foreground:

- iOS: read the HealthKit statistics total for start-of-today to now if connected,
  else `getStepCountAsync(startOfToday, now)`, and write it to `daily_steps` with
  `source = 'health'` or `'device'`.
- Android: read the raw cumulative counter, write the new interval since the last
  write into Health Connect (`WRITE_STEPS`), then read the Health Connect
  `aggregate` for start-of-today to now and write that deduped total to
  `daily_steps` with `source = 'health'`.
- Either platform: if no source has data, leave the last known value; the weekly
  check-in owns manual entry.

While the app stays open, iOS can stream live increments with `watchStepCount`
and Android can keep writing intervals for a responsive number, but the
authoritative daily total in `daily_steps` is always the most recent aggregate or
query result, not an in-app accumulator.

### App relaunch after a full close (first-class scenario)

1. Read the stored last-seen timestamp (new checkpoint, see data architecture).
   The gap is last-seen to now, clamped to seven days on iOS.
2. Fill the gap, per platform:
   - iOS: the OS retained the steps, so `getStepCountAsync` over the gap (or the
     HealthKit statistics total if connected) returns them. Read, do not write.
   - Android: read the raw cumulative counter, compute the delta since the stored
     checkpoint, and write that interval into Health Connect to backfill the
     closed period (Health Connect did not capture it on a bare device because no
     source was running). If a reboot reset the counter (stored checkpoint greater
     than current reading) the pre-reboot delta is lost from the sensor; if
     another source fed Health Connect during the gap, the aggregate still covers
     it.
3. Read the day total back: on Android the Health Connect `aggregate` for the day,
   which now includes the backfilled interval deduped against any wearable; on iOS
   the query result. Overwrite today's `daily_steps` row with that full-day total
   rather than adding the gap to the stored value. `setDailySteps` already upserts
   by `(user_id, entry_date)`.
4. Surface the day total on the StepsCard, which already re-reads on focus and
   foreground.

### Device reboot (Android)

If the stored `TYPE_STEP_COUNTER` checkpoint is greater than the current reading,
a reboot happened and the counter reset. The steps between the last checkpoint and
the reboot are lost from the raw sensor. Recovery options, in order: if Health
Connect is available, its aggregate for the day already covers the gap, so prefer
it and re-baseline silently; otherwise accept the small loss, re-baseline at the
current reading, and let the rest of the day accumulate normally. Persist the
checkpoint with a timestamp so a reboot is distinguishable from a normal
increment.

### Data architecture

- Internal-sensor totals are stored in the existing `daily_steps` row for the day,
  overwritten by the latest query, with `source` recording where the figure came
  from (`'device'`, `'health'`, `'manual'`, plus the legacy `'auto'`). No new
  table needed.
- Two new pieces of small per-install state (AsyncStorage, not SQLite, since they
  are device facts not user data): a last-seen timestamp (ms) updated on every
  successful read, used to compute the relaunch gap; and, on Android only, the
  last `TYPE_STEP_COUNTER` checkpoint value plus its timestamp, used for the delta
  and reboot detection.
- Health-platform data is queried on launch, foreground, and the periodic sync,
  exactly where `recordTodaySteps` already runs.
- The two sources are compared by the quality order above and the better one is
  chosen, never summed.

### Manual fallback

The weekly check-in already owns manual steps (`WeeklyCheckInScreen.js`): the auto
weekly average when four or more days are registered, otherwise a typed weekly
average. Keep that. A manually entered figure writes `daily_steps` with
`source = 'manual'` and, being a deliberate user action, should win over an
automatic read for that day (a manual entry is not overwritten by a later
automatic query for the same day). This is the one exception to "the latest query
wins", and it is worth a guard in `setDailySteps` or its caller.

---

## Recommended implementation

Libraries, named and versioned, all already present except none new for the core:

- iOS internal pedometer: `expo-sensors` `~13.0.9` (`Pedometer.getStepCountAsync`,
  `watchStepCount`). No new dependency.
- Android live-while-open figure: `expo-sensors` `watchStepCount` (delta only,
  cosmetic).
- Android read (aggregate) and write (feed steps in): `react-native-health-connect`
  `3.3.3` (`aggregateRecord` already wired; `insertRecords` for `StepsRecord` is
  the new write path). Needs the `WRITE_STEPS` permission added to `app.json`
  (`READ_STEPS` is there today).
- iOS wearable merge and >7-day history (optional upgrade): `react-native-health`.
  Already wired.
- Android step measurement: a new ~50-line Kotlin config-plugin module exposing
  the raw `TYPE_STEP_COUNTER` cumulative value, since `expo-sensors` cannot. This
  is what produces the intervals Volyume writes into Health Connect, including the
  relaunch backfill. The only new native code.

Catch-up on relaunch, per platform:

- iOS: on launch/foreground, `getStepCountAsync(startOfToday, now)`. The OS
  retained the steps; one query catches up. If HealthKit is connected, prefer its
  statistics total for the same window (it merges the Watch); otherwise the
  CMPedometer figure stands. Read only, no write.
- Android: on launch/foreground, read the raw cumulative counter, write the delta
  since the stored checkpoint into Health Connect to backfill the closed period
  (handling reboot as above), then read
  `aggregate(COUNT_TOTAL, between(startOfToday, now))` back as the day total. If
  the raw module is absent or `WRITE_STEPS` is declined, Volyume still reads
  whatever else is feeding Health Connect, and falls back to manual entry if
  nothing is.

Where the logic lives: extend `src/lib/activitySteps.js` with the source-selection
function (call it something like `readBestTodaySteps`) and have `recordTodaySteps`
call it, so every existing trigger (`App.js` foreground sync, `StepsCard` focus and
foreground, the periodic sync) gets catch-up for free with no new call sites. The
last-seen and Android-checkpoint state lives in a small new helper alongside
`health.js`. Keep `health.js` as the thin platform wrapper and put the
decision/reconciliation in `activitySteps.js`, matching the current separation.

Last-active timestamp: store it in AsyncStorage keyed per install, write it after
every successful read, and read it on launch to compute the gap. It is a device
fact, not user data, so it does not belong in `daily_steps` or the cloud sync.

Permission request flow: keep the once-per-install launch prompt
(`stepsLaunchPrompt.js`) and the Pro-enrolment ask (`ProOnboardingScreen.js`), but
reframe both as optional enhancement, since the internal sensor now works without
them. On iOS request Motion (already covered by `NSMotionUsageDescription`) for
the internal sensor and HealthKit only as the upgrade. On Android request
`ACTIVITY_RECOGNITION` for the sensor plus Health Connect `READ_STEPS` and
`WRITE_STEPS` (the write is what lets Volyume feed the aggregator). When declined,
Volyume still reads whatever else is feeding Health Connect and falls back to
manual entry.

Implementation order:

1. iOS internal pedometer via `expo-sensors`, written to `daily_steps` with
   `source = 'device'`, behind the source-selection function. Add the last-seen
   checkpoint. Tests for the read, the null/zero handling, and the
   day-boundary query. Lowest risk, immediate value, no new dependency. Per the
   runtime-critical rule this touches a read path only, so it is safe and additive.
2. The cross-platform source-selection and reconciliation in `activitySteps.js`:
   prefer health aggregate when granted, fall back to device, never sum, manual
   wins for its day. Tests for each branch and for the no-double-count rule. This
   is the piece that makes catch-up correct on both platforms.
3. Android raw `TYPE_STEP_COUNTER` config-plugin module, plus the `WRITE_STEPS`
   feed into Health Connect, the checkpoint, and reboot logic. This is what fixes
   the original zero-setup gap (the bare S24 with nothing feeding Health Connect),
   so it is central, but it is the hard, risky native piece, so it is sequenced
   last. Users who already have a source feeding Health Connect (Samsung Health, a
   watch) are covered by the read-only path from step 1 and 2; this step is what
   serves the users who have nothing feeding it. Tests for the interval write and
   its non-overlap bookkeeping, the relaunch delta, the reboot reset, and the
   WorkManager sampler if added.

React Native specifics to plan for: `expo-sensors` historical query is iOS-only,
so the Android path must never call it; the Android raw module needs `expo
prebuild` and EAS, and the existing `withHealthConnectPermissionDelegate` config
plugin is the pattern to follow; `react-native-health-connect` 3.3.3's
`getGrantedPermissions` and `getSdkStatus` are already in use, so the gating is in
place. Per Rule 5 (runtime-critical: background handlers, permissions, async
scheduling) the Android sensor module and any WorkManager sampler ship with tests
in the same commit, not later.

Honest assessment of complexity and failure modes:

- iOS: low complexity, near-zero battery, accurate catch-up for seven days. Known
  limitation: CMPedometer underestimates against a waist pedometer by a known
  margin, and history is capped at seven days. Neither blocks the use case.
- Cross-platform source selection: moderate complexity, mostly testable in pure
  functions. The main risk is the double-count rule; tests must cover it.
- Android raw sensor: high complexity and the real risk. Native code, reboot edge
  cases, OEM battery managers killing background sampling, ~5 to 10 percent of
  devices with no usable sensor, and the June 2026 Synthetic Package Name change.
  This is why the recommendation is to lean on Health Connect (in-OS on Android
  14+) as the Android foundation and treat the raw sensor as a fallback that may
  not be worth building if Health Connect coverage among real users is high.

---

## Open questions

1. Android raw sensor: build it now, or ship iOS internal plus Android Health
   Connect first and measure how many real users land on Android without Health
   Connect available before committing to the native module? Recommendation:
   measure first.
2. Manual-wins rule: should a manual check-in entry be permanently sticky for its
   day, or only until the next automatic read with a higher confidence source?
   Recommendation: manual is sticky for its day.
3. iOS HealthKit upgrade: is the Apple Watch merge and >7-day history worth
   prompting for, given the bare-phone CMPedometer figure already works? Could be
   deferred.
4. `source` values: add `'device'` (and keep the legacy `'auto'`), or migrate
   `'auto'` to a clearer set? Recommendation: add `'device'`, leave existing rows
   alone (additive, no migration).
5. Do we want a live in-app counter (`watchStepCount`) at all, or is a
   query-on-foreground total enough? The live counter is cosmetic and adds a
   subscription lifecycle to manage.

---

## Appendix: sources and library links

Pedometer and sensors:

- Expo Pedometer docs: https://docs.expo.dev/versions/latest/sdk/pedometer/
- expo-sensors Pedometer.ts (sdk-51): https://raw.githubusercontent.com/expo/expo/sdk-51/packages/expo-sensors/src/Pedometer.ts
- expo-sensors PedometerModule.kt (sdk-51): https://github.com/expo/expo/blob/sdk-51/packages/expo-sensors/android/src/main/java/expo/modules/sensors/modules/PedometerModule.kt
- Expo issue #4895 (getStepCountAsync unsupported on Android): https://github.com/expo/expo/issues/4895
- Expo issues #9463, #13131, #16605 (Android Pedometer limitations)
- Apple CMPedometer: https://developer.apple.com/documentation/coremotion/cmpedometer
- Apple queryPedometerData: https://developer.apple.com/documentation/coremotion/cmpedometer/1613946-querypedometerdata
- Apple startUpdates: https://developer.apple.com/documentation/coremotion/cmpedometer/1613950-startupdates
- DevFright CMPedometer guide: https://www.devfright.com/how-to-use-the-cmpedometer-for-counting-steps/
- How to correctly count steps on Android (Medium): https://medium.com/@vovnovvalera/how-to-correctly-count-steps-on-android-a-complete-developers-guide-from-sensors-to-health-da99e5043968
- Android: read step count data with SensorManager: https://developer.android.com/health-and-fitness/fitness/basic-app/read-step-count-data
- @dongminyu/react-native-step-counter: https://github.com/AndrewDongminYoo/react-native-step-counter

Health platforms:

- Health Connect, read aggregated data: https://developer.android.com/health-and-fitness/health-connect/aggregate-data
- Health Connect, read raw data: https://developer.android.com/health-and-fitness/health-connect/read-data
- Health Connect, track steps: https://developer.android.com/health-and-fitness/health-connect/features/steps
- Health Connect, get started: https://developer.android.com/health-and-fitness/health-connect/get-started
- Health Connect, check availability: https://developer.android.com/health-and-fitness/guides/health-connect/plan/availability
- Health Connect on Android 14: https://support.google.com/android/answer/14119325
- Google Fit migration to Health Connect: https://developer.android.com/health-and-fitness/health-connect/migration/fit
- react-native-health-connect getSdkStatus: https://matinzd.github.io/react-native-health-connect/docs/api/methods/getSdkStatus/
- react-native-health-connect aggregateRecord: https://matinzd.github.io/react-native-health-connect/docs/api/methods/aggregateRecord/
- Apple HKStatisticsQuery: https://developer.apple.com/documentation/healthkit/hkstatisticsquery
- Apple HKStatisticsCollectionQuery: https://developer.apple.com/documentation/healthkit/hkstatisticscollectionquery
- Apple HKAnchoredObjectQuery: https://developer.apple.com/documentation/healthkit/hkanchoredobjectquery
- Synchronize health data with HealthKit (WWDC20): https://developer.apple.com/videos/play/wwdc2020/10184/
- react-native-health getStepCount: https://github.com/agencyenterprise/react-native-health/blob/master/docs/getStepCount.md

Other apps and accuracy:

- Pedometer++ FAQ: https://www.david-smith.org/pedometer_faq.html
- StepsApp, how it counts steps: https://steps.app/support/pedometer/ios/general-information/how-does-stepsapp-count-my-steps
- Pacer, Apple Watch vs Pacer: https://support.mypacer.com/hc/en-us/articles/41615702918029-Apple-Watch-reports-more-less-steps-than-Pacer
- Samsung Community, Pixel 9 Pro missed steps: https://eu.community.samsung.com/t5/wearables/samsung-health-phone-pedometer-ignores-40-steps-on-pixel9pro/td-p/11456645
- Vice, iPhone step tracker accuracy: https://www.vice.com/en/article/9kdbj3/iphone-step-tracker-accuracy

One confidence note: David Smith's Pedometer++ FAQ and pedometer.app blocked
direct fetching during research, so his exact wording is drawn from the search
index, not read in full. The mechanism (CMPedometer live plus historical query,
coprocessor records while the app is dead, Watch-plus-phone merge) is
independently confirmed by Apple's docs and the developer write-ups cited, so the
conclusion holds. Apple's HKStatisticsQuery page rendered title-only during
research; its dedup behaviour is corroborated by Apple's developer forums and
secondary references rather than a verbatim quote.
