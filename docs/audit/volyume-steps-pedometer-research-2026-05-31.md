# Volyume steps: device-pedometer architecture research

Research date: 2026-05-31. Author: engineering session (research-only pass, no
code changed). Sister doc: `docs/audit/volyume-cardio-steps-audit-2026-05-30.md`
(the audit that established the `daily_steps` store).

This document researches and proposes a step-counting architecture for Volyume
that needs no setup from the user, works on any phone with a step sensor
whatever else is installed, and uses a wearable's more accurate number when one
is available. It does not change any code.

---

## Revision note (2026-05-31, after verification)

The first version of this doc claimed that on Android "nothing feeds Health
Connect automatically" and built an entire feed-then-read architecture on it:
a custom `TYPE_STEP_COUNTER` native module, `WRITE_STEPS`, interval writing, a
cumulative checkpoint, and reboot-delta logic. That premise is wrong. Verified
against Google's own page: on Android 14 (API 34) with SDK Extension 20 or
higher, Health Connect counts steps on-device itself, using `TYPE_STEP_COUNTER`,
batched no more than once a minute, active whenever any app has been granted
`READ_STEPS`. Volyume already requests `READ_STEPS` and already reads a plain
`COUNT_TOTAL` aggregate with no origin filter, so on the modern-Android majority
the bare phone is already solved by shipped code. The expensive native work was
unnecessary. This section and the Android sections below are the corrected
version. The honest cause: my own Phase 3 research had this right ("Health
Connect counts on-device via `TYPE_STEP_COUNTER` once any app holds
`READ_STEPS`") and I contradicted it when over-building around a write-first
instinct. Source: https://developer.android.com/health-and-fitness/health-connect/features/steps

## Executive summary

Both platforms already count the phone's own steps into their aggregator with no
app code, and Volyume already reads that aggregator. So the headline is much
smaller than first thought: on a modern phone, steps work with what Volyume
ships, once the steps permission is actually granted and the card refreshes. The
two things that broke it were both bugs that are now fixed: the Android 14
permission dialog never launching (the activity-alias / delegate / package
visibility fixes), and the steps card not refreshing on warm resume (`d554a17`).
The 51 steps that appeared on a bare S24 with no Samsung Health were Health
Connect's own on-device capture switching on the moment `READ_STEPS` was granted,
which is the confirmation that this works without Volyume feeding anything.

**iOS: already works via the shipped read.** The iPhone's motion coprocessor
records steps at the OS level and writes them into HealthKit with no setup, so
`health.js` reading `getStepCount` (a HealthKit statistics total, deduped across
iPhone and Watch) returns real data on a bare phone once the user grants the
HealthKit read. Catch-up after a full close is inherent: HealthKit kept the data,
the next read picks it up. A direct `expo-sensors` CMPedometer read is only a
fallback for the case where the user declines HealthKit but we still want a
number.

**Android: already works via the shipped read on Android 14+.** Health Connect is
the datastore and the arbiter, not a source Volyume must populate. On Android 14
with SDK Extension 20+, Health Connect runs `TYPE_STEP_COUNTER` itself and writes
the phone's steps in (attributed to the `android` origin, or a device-specific
Synthetic Package Name after June 2026), active whenever any app holds
`READ_STEPS`. Volyume holds `READ_STEPS` and reads the plain `COUNT_TOTAL`
aggregate, which picks those steps up transparently. A Galaxy Watch or Samsung
Health simply adds another source that Health Connect dedupes by the user's
priority. So on the modern-Android majority Volyume does not write anything, does
not need a native module, and catch-up after a close is the same single
`aggregate(startOfToday, now)` call, because Health Connect persisted everything
while the app was closed.

**Catch-up approach per platform (corrected):** both reduce to "request the
permission, read the platform aggregate for the day". iOS reads the HealthKit
total; Android reads the Health Connect `COUNT_TOTAL` aggregate. No checkpoint,
no gap backfill, no write. This is what `health.js` already does.

**Recommended libraries:** the ones already shipped do the core job:
`react-native-health` (iOS read) and `react-native-health-connect` `3.3.3`
(Android read). No new dependency and no new native code for the modern-phone
case. `expo-sensors` (`~13.0.9`, already present) is held in reserve as the iOS
permission-declined fallback only.

**Decision tree in one line:** request the platform read permission; read the
platform aggregate for the day; if the platform has no data or the permission is
declined, fall back (where built) to a direct sensor read; manual entry at the
weekly check-in is the last resort and is sticky for its day.

**Top three priorities (corrected, much smaller):**

1. Confirm on-device the two fixes already landed: the Android permission dialog
   launches and grants `READ_STEPS`, and the steps card refreshes on warm resume.
   This is verification of shipped code, not new work, and may close the whole
   issue for modern phones.
2. Measure the real Android install base: how many users are on Android 13 and
   below (no on-device Health Connect counting), and how many Android 14 users
   are on SDK Extension 20+. This single measurement decides whether any further
   work is justified.
3. Only if the numbers warrant it, address the genuine residual: Android 13 and
   below via Google's Recording API (not a hand-rolled sensor module), and an
   optional direct-sensor fallback for users who decline the read permission.

The honest complexity assessment: for modern phones there is little to no new
code, the work was already done and the blockers were bugs. The residual is
narrow (older Android, and permission-declined users) and should be sized against
real install data before anything native is built. The custom `TYPE_STEP_COUNTER`
module, `WRITE_STEPS`, and reboot logic from the first draft are not needed.

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

Android verdict: `expo-sensors` is a dead end for catch-up, but that no longer
matters for the common case. On Android 14+ with SDK Extension 20+, Health
Connect runs this exact `TYPE_STEP_COUNTER` sensor itself, in the OS, and writes
the phone's steps into its own store whenever any app holds `READ_STEPS`. So
Volyume gets the phone's steps and the closed-app catch-up from the Health
Connect aggregate it already reads, with no custom module. A hand-rolled
`TYPE_STEP_COUNTER` module is only relevant to the genuine residual: Android 13
and below (where Google's Recording API is the recommended option), or as a
fallback when the user declines the read permission. The detail above is kept as
background for that narrow case, not as the main path.

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

Pattern to copy: on both platforms, hold the read permission and read the
platform aggregate on launch. iOS reads the HealthKit total (the iPhone feeds it);
Android reads the Health Connect `COUNT_TOTAL` aggregate (Health Connect feeds
itself on 14+). The third-party-app pain described above is mostly the old world
of apps that avoided the health platform; Volyume should lean on it, not around
it. A direct sensor read is a fallback for older Android and permission-declined
users only.

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

The write trap, stated plainly: do not have Volyume write its own measured steps
into either platform, because each platform already records the phone's steps
itself. On iOS the coprocessor writes them into HealthKit; on Android 14+ Health
Connect writes them via its own `TYPE_STEP_COUNTER` capture. If Volyume also
wrote a phone figure, it would create a second phone source the platform then has
to dedupe against its own, which can only go wrong. Read the platform aggregate
and let it arbitrate. This is why the first draft's feed-then-read model was a
mistake: it solved a problem the platform had already solved, and added a
double-source risk in the process. The only legitimate writer-style work is the
narrow Android 13-and-below case, and even there Google's Recording API, not a
raw write, is the recommended route.

### Availability with zero setup

Android: on Android 14+ (API 34) Health Connect ships in the OS framework, cannot
be uninstalled, and needs no install. More than that, with SDK Extension 20+ it
counts the phone's steps itself the moment any app holds `READ_STEPS`, so on the
modern-Android majority "Health Connect available" means "phone steps already
work", not "steps work only if something feeds it". On Android 13 and below it is
a separate Play Store app with no on-device counting; Google recommends the
Recording API for apps with significant users there. Check availability at runtime
with `getSdkStatus`: `SDK_AVAILABLE` (proceed), `SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED`
(offer an update), `SDK_UNAVAILABLE` (do not attempt). Volyume already exposes this
via `getHealthConnectSdkStatus` in `health.js:273`. The one unknown to measure
against real users is SDK Extension 20+ coverage among Android-14 installs;
Android 14 launched October 2023 and extensions arrive via Play system updates, so
it should be near-universal, but that is the number that sizes the residual.

iOS: HealthKit is present on every iPhone (check `isHealthDataAvailable()`). An
iPhone with no wearable still has step data because the coprocessor records it
with no setup, so the statistics query returns real data on a bare phone. A watch
or third-party app just adds sources to merge.

Framing permission as optional: present it as an enhancement ("connect your
health data for a more complete step count"), make it skippable, and never block
logging on it. Note that on Android the same `READ_STEPS` grant that lets Volyume
read is also what switches on Health Connect's on-device capture, so granting it
is what makes a bare phone start counting at all.

The June 2026 Synthetic Package Name change, scoped correctly: from June 2026
Health Connect attributes its on-device step records to a device-specific SPN
rather than the `android` origin. This only affects code that filters the
aggregate by `DataOrigin = "android"`. Volyume's `health.js` does a plain
`COUNT_TOTAL` aggregate with no origin filter, so it picks up both the legacy and
the SPN-tagged steps transparently and is not at risk. The change matters only if
Volyume ever adds origin-based source attribution to the UI. The first draft
overstated this as a risk to the current read; it is not.

---

## Decision tree and architecture

### Source model, per platform

Both platforms reduce to the same shape: hold the read permission, read the
platform aggregate for the day, never write.

iOS:

1. HealthKit statistics total (the iPhone feeds it, merges the Watch, deduped).
2. Direct CMPedometer read via `expo-sensors` (fallback only when HealthKit is
   declined and we still want a number).
3. Manual entry at the weekly check-in. Last resort.

Android:

1. Health Connect `COUNT_TOTAL` aggregate. On 14+ Health Connect feeds itself the
   phone's steps once `READ_STEPS` is held, and dedupes any wearable or Samsung
   Health against it by the user's priority order, so the read is the best total.
2. On Android 13 and below (no on-device counting), the Recording API or whatever
   other source the user has feeding Health Connect; a direct sensor read is the
   last automatic option.
3. Manual entry at the weekly check-in. Last resort.

The reconciliation rule: read the platform aggregate and trust it; it already
merges the phone and any wearable. Never write a phone figure back, never sum
across sources. The only choosing Volyume does is "platform aggregate if it has
data, else fallback, else manual".

### Normal operation (app open)

On app start and on every foreground, this is what `health.js` and
`recordTodaySteps` already do:

- iOS: read the HealthKit total for start-of-today to now, write it to
  `daily_steps` with `source = 'health'`.
- Android: read the Health Connect `aggregate(COUNT_TOTAL, between(startOfToday, now))`,
  write it to `daily_steps` with `source = 'health'`.
- Either platform: if the read returns nothing and a fallback sensor read is
  built, use it; otherwise leave the last value and let the weekly check-in own
  manual entry.

The authoritative daily total in `daily_steps` is the most recent aggregate, not
an in-app accumulator.

### App relaunch after a full close

There is no gap to backfill and no checkpoint to maintain, which is the whole
point of the correction. The platform kept counting and persisting while the app
was closed, so the relaunch path is identical to a normal foreground: read the
aggregate for start-of-today to now and overwrite today's `daily_steps` row.
`setDailySteps` already upserts by `(user_id, entry_date)`. The StepsCard already
re-reads on focus and foreground (`d554a17`), which is the fix that made this
visible.

### Device reboot

Not Volyume's problem on the main path. Health Connect's own on-device counter and
HealthKit handle their counters across reboots internally; Volyume only ever reads
the day aggregate, which is unaffected. Reboot handling is a concern only inside a
hand-rolled raw-sensor fallback, which is the narrow residual, not the main path.

### Data architecture

- The day total lives in the existing `daily_steps` row, overwritten by the latest
  aggregate read, `source = 'health'` (plus `'manual'` for typed entries and the
  legacy `'auto'`). No new table, no per-install checkpoint state, no last-seen
  timestamp needed for the main path. These were artefacts of the dropped
  feed-then-read model.
- The platform aggregate is read on launch, foreground, and the periodic sync,
  exactly where `recordTodaySteps` already runs.

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

Libraries: the core needs nothing new. `react-native-health` (iOS read) and
`react-native-health-connect` `3.3.3` (Android read) are already wired and already
do the right thing. `expo-sensors` `~13.0.9` (already present) is the iOS
permission-declined fallback only. No `WRITE_STEPS`, no new native module, for the
main path.

The main path is what Volyume already ships: hold the read permission, read the
platform aggregate for the day, write it to `daily_steps`. Catch-up after a close
is the same call, because the platform persisted the steps while the app was
closed. This is already in `recordTodaySteps` and is run from `App.js`, the
periodic sync, and the StepsCard. The two bugs that stopped it working are fixed
(the Android permission dialog and the warm-resume refresh).

So the recommended work, in order:

1. Verify on-device that the two fixes hold: the Android 14 permission dialog
   launches, grants `READ_STEPS`, Volyume then shows the Health Connect figure,
   and it refreshes on warm resume. On iOS confirm the HealthKit read after grant.
   This is QA of shipped code and may close the issue for modern phones with no
   new code at all.
2. Measure the Android install base before building anything native: the share of
   users on Android 13 and below, and the share of Android-14 users below SDK
   Extension 20. That decides whether the residual is worth code.
3. Only if the numbers warrant it, build the residual:
   - Android 13 and below: integrate Google's Recording API (the recommended route
     for on-device counting where Health Connect does not self-feed), not a
     hand-rolled sensor module.
   - Permission-declined fallback: a direct sensor read (iOS `expo-sensors`
     `getStepCountAsync`; Android a small `TYPE_STEP_COUNTER` module) so a user
     who refuses the health read still gets a rough number. This is the only place
     the raw-sensor and reboot detail from the Direct Pedometer section applies,
     and it is optional.

Where any new logic lives: keep it behind `activitySteps.js`, which already gates
on permission and writes `daily_steps`, so existing call sites get it for free.
Keep `health.js` as the thin platform wrapper.

Permission request flow: keep the once-per-install launch prompt
(`stepsLaunchPrompt.js`) and the Pro-enrolment ask (`ProOnboardingScreen.js`).
Frame them as the thing that turns steps on, because on Android the `READ_STEPS`
grant is also what switches on Health Connect's on-device counting. On iOS the
HealthKit read grant does the same job. `ACTIVITY_RECOGNITION` (already declared)
is only needed if the direct-sensor fallback is built.

React Native specifics to plan for: `expo-sensors` `getStepCountAsync` is iOS-only,
so any Android fallback must use a different path; the existing
`withHealthConnectPermissionDelegate` config plugin is the pattern if a native
module is ever needed; `react-native-health-connect` 3.3.3's `getGrantedPermissions`
and `getSdkStatus` are already in use, so the gating is in place.

Honest assessment of complexity and failure modes:

- Modern phones (the majority): little to no new code. The capability shipped; the
  blockers were two bugs, now fixed. The risk is that the on-device fixes are not
  confirmed yet, so step 1 is verification.
- Android 13 and below: real but narrow work via the Recording API, sized by the
  install-base measurement. Not started until the numbers justify it.
- Permission-declined fallback: optional, moderate complexity if pursued, and the
  only place the raw-sensor and reboot edge cases live.
- The dropped feed-then-read model would have added native code, `WRITE_STEPS`, a
  checkpoint, reboot logic, and a double-source risk, all to solve a problem the
  platform already solves. It is not recommended.

---

## Open questions

1. The decisive measurement: what share of Volyume's Android users are on Android
   13 and below, and what share of the Android-14 users are below SDK Extension
   20? Until that is known, the residual is unsized. Recommendation: measure
   before building anything native.
2. On-device verification: do the two shipped fixes (permission dialog,
   warm-resume refresh) close the issue on a real Android 14 phone and a real
   iPhone? This is the first thing to confirm and may end the work.
3. Permission-declined fallback: is it worth building a direct-sensor read for
   users who refuse the health-platform read, or is "no steps until you grant it"
   acceptable? Recommendation: defer until asked for.
4. Manual-wins rule: should a manual check-in entry be sticky for its day, or be
   overwritten by a later automatic read? Recommendation: manual is sticky for its
   day.
5. iOS HealthKit versus a direct CMPedometer read: HealthKit is already wired and
   already merges the Watch, so the direct read is only a decline fallback. Worth
   confirming the HealthKit grant prompt is in the same shape as the Android ask.

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
