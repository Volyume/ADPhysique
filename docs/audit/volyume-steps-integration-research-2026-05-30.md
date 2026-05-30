# Volyume steps integration: research and recommendation

Date: 2026-05-30
Author: integration research pass (research only, no app code changed)
Scope: how to capture step count automatically from as many devices and
platforms as possible, with the least user friction, across iOS and
Android, through the fewest integration points. Aggregator route first
(Apple HealthKit on iOS, Health Connect on Android), device SDKs only if
gaps remain. Manual average on the weekly check-in is the fallback.

The only file this pass creates is this document. No app code was touched.

---

## 1. Executive summary

**Recommended approach: go all-in on the two platform aggregators and
drop the Core Motion pedometer path on iOS.** On iOS read steps from
Apple HealthKit. On Android read steps from Health Connect. Both are
aggregators: they collect step data that watches, rings, bands, and
phone pedometers write into them, and they hand back one deduplicated
daily total. That single pair of integrations covers the overwhelming
majority of trackers people actually own, through two permission sheets
and no per-device SDK work.

The repo is already about 70% of the way there. `health.js` already wraps
both platforms and already reads steps (`readStepsToday`) the right way:
HealthKit `getStepCount` on iOS, Health Connect `aggregateRecord` on
Android. The problem is `activitySteps.js`, which on iOS deliberately
bypasses HealthKit and reads the Core Motion pedometer through
`expo-sensors` instead. Core Motion counts the iPhone's own chip only. It
silently excludes the Apple Watch and every third-party wearable, which is
exactly the wrong trade for a training app. The founder correction banner
in the cardio/steps audit calls this out directly. The fix is to point the
iOS step read at HealthKit (which `health.js` already supports) and retire
the pedometer path.

**Device coverage with the aggregator route.** Apple Watch, iPhone
standalone, Samsung Galaxy Watch, Galaxy Ring, Garmin (all major lines),
Fitbit / Google Pixel Watch, Polar, Whoop, Amazfit, Xiaomi (via Zepp),
Oura, and Withings all write steps into HealthKit and/or Health Connect
once the user has the maker's companion app installed and sharing turned
on. No device in that list needs a direct SDK for step count. Direct SDKs
(Fitbit Web API, Garmin Connect, Samsung Health) are not worth it for
steps. They add OAuth servers, per-vendor review, and maintenance for data
the aggregators already deliver.

**Key libraries (versions confirmed 2026-05-30 against npm):**

- iOS: stay on `react-native-health` 1.19.0 (already installed, already
  configured as an Expo plugin in `app.json`). It is feature-frozen but
  stable and works on the app's current RN 0.74 / React 18 stack. The
  newer `@kingstinct/react-native-healthkit` 14.0.1 is the better library
  long-term but needs React 19, RN 0.79+, and Nitro Modules. That is an
  engine upgrade, not a step feature, so it is out of scope for now.
- Android: bump `react-native-health-connect` from the installed 3.3.3 to
  3.5.3 (matinzd, actively maintained, published 2026-05-15). It is the
  de-facto standard and already wired in `health.js`.
- Drop the iOS dependence on `expo-sensors` Pedometer for the daily step
  read. `expo-sensors` can stay for any live/session pedometer use, but it
  should not be the source of the day's total.

**Top three implementation priorities.**

1. **Fix the Android Health Connect crash with an Expo config plugin.**
   The permission flow currently crashes fatally
   (`UninitializedPropertyAccessException: lateinit property
   requestPermission`) because `HealthConnectPermissionDelegate` is never
   registered in `MainActivity.onCreate`, and `expo prebuild --clean`
   regenerates `MainActivity` every build. Until this is fixed, Android
   steps via the aggregator cannot work at all. This is the gating item.
2. **Repoint the iOS step read from Core Motion to HealthKit.** Change
   `activitySteps.js` so iOS reads `health.js readStepsToday` (HealthKit)
   rather than the `expo-sensors` pedometer. This is the change that turns
   "iPhone chip only" into "Apple Watch and every connected wearable".
3. **Decide and build the capture model the founder locked:** automatic
   only via the aggregator, manual fallback as a single average steps/day
   figure on the weekly check-in. The per-day `DailyStepsCard` is slated
   for removal per the founder banner; the check-in average is its
   replacement and does not exist yet.

---

## 2. Internal audit (from the actual repo)

Repo state at audit time: branch `main`, HEAD
`362b6318f3d04674af32841c8f4d336b1e24afb8`.

### 2.1 What exists

**Libraries are already installed** (`package.json`):

- `react-native-health` 1.19.0 (`package.json:64`)
- `react-native-health-connect` 3.3.3 (`package.json:65`)
- `expo-sensors` ~13.0.9 (`package.json:46`)

**`src/lib/health.js`** (492 lines) is a unified wrapper over Apple
HealthKit (iOS) and Health Connect (Android). It lazy-requires the native
modules so the app still runs in Expo Go or on a JS reload, and no-ops
quietly on failure. Relevant parts:

- `isHealthAvailable`, `getHealthProviderLabel` (`health.js:56,67`):
  availability check and the "Apple Health" / "Health Connect" label.
- `requestHealthPermissions(scopes)` (`health.js:109`): already supports a
  `'steps'` scope. iOS pushes `Constants.Permissions.StepCount` into the
  read set (`health.js:118`); Android adds `{ accessType: 'read',
  recordType: 'Steps' }` (`health.js:135`).
- `getHealthPermissionStatus(scopes)` (`health.js:154`): checks granted
  steps read on Android via `getGrantedPermissions` (`health.js:172`); on
  iOS returns granted if init succeeded (HealthKit hides read status by
  design).
- **`readStepsToday()`** (`health.js:277`): this is the correct
  aggregator read. iOS calls HealthKit `getStepCount` for the day
  (`health.js:288`). Android calls Health Connect **`aggregateRecord`**
  with `COUNT_TOTAL` (`health.js:304-308`), with a deliberate, well
  commented note that aggregate deduplicates overlapping data across
  sources (phone, watch, Garmin, Whoop) using Health Connect's per-app
  priority, so a user with several trackers sees one accurate total rather
  than the sum. There is a raw-records fallback if aggregate throws
  (`health.js:314-320`). This is exactly the behaviour the aggregator
  route wants. It is already built.
- `openSystemHealthSettings()` (`health.js:191`): deep links to
  `x-apple-health://` on iOS and the Health Connect package on Android,
  because neither platform lets an app revoke its own grant.
- Weight read and workout write are also implemented (`health.js:217`,
  `health.js:362`), plus `importNewWeights` (`health.js:451`). These show
  the working pattern the steps importer should follow.

**`src/lib/activitySteps.js`** (167 lines) is the problem module. Its
header states the design plainly (`activitySteps.js:13-18`): on iOS it
reads the `expo-sensors` Pedometer (Core Motion) for one "Motion and
Fitness" permission with no HealthKit and no account; on Android it falls
through to `health.js readStepsToday` because `expo-sensors`
`getStepCountAsync` is not implemented on Android.

- `isStepSourceAvailable` (`activitySteps.js:52`): iOS uses
  `Pedometer.isAvailableAsync`; Android uses `health.js isHealthAvailable`.
- `getStepPermissionStatus` (`activitySteps.js:80`): iOS reads the
  Pedometer permission; Android delegates to `getHealthPermissionStatus(['steps'])`.
- `requestStepPermission` (`activitySteps.js:111`): iOS prompts the
  Pedometer "Motion and Fitness" sheet; Android requests Health Connect
  `['steps']`.
- `readTodaySteps` (`activitySteps.js:141`): iOS calls
  `Pedometer.getStepCountAsync` (Core Motion, **iPhone chip only, no
  watch, no wearable**); Android calls `readStepsToday` (the aggregator).

This is the asymmetry the founder banner flags: Android already routes
through the aggregator and picks up wearables; iOS routes through Core
Motion and excludes them. The HealthKit path it should use already exists
one file over in `health.js`.

**`src/components/DailyStepsCard.js`** (309 lines) is a PRO surface that
reads today's step count through `activitySteps.js`, persists an automatic
read with `source: 'auto'`, and offers a manual per-day text entry
(`source: 'manual'`) as a fallback (`DailyStepsCard.js:51,146`). It asks
for the step permission on mount when undetermined (`DailyStepsCard.js:76-88`).
Per the founder correction banner this whole card, and the per-day manual
entry, is slated for **removal**. It is shipped today but on the way out.

**`src/lib/sync/tables/dailySteps.js`** (125 lines): push and pull for the
`daily_steps` table. One row per local day, last-write-wins on
`(user_id, entry_date)`, updated_at as the LWW gate, 200-row batched
upsert. Mirrors `daily_water` but on its own handler. The push reads
`getDailyStepsForPush`; pull applies `insertDailyStepsFromCloud` only when
the cloud row is strictly newer.

**`src/lib/sync/registry.js`**: the `daily_steps` registry entry exists
(`registry.js:103-113`): pk `['user_id', 'entry_date']`,
`last_write_wins`, `softDelete: false`, `bidirectional`. Wired correctly.

**`supabase/migrate_056_daily_steps.sql`** (104 lines): creates
`daily_steps (user_id, entry_date, steps, source, updated_at)`, RLS on,
LWW touch trigger, CASCADE delete. The migration header says applied
locally **no**, applied remotely **pending founder apply**
(`migrate_056_daily_steps.sql:44-45`). So the table is defined and the
client is wired, but it is **not yet on the cloud**.

  Note one contract mismatch worth flagging: the migration comment and the
  table default describe `source` as `'manual'` vs `'health'`
  (`migrate_056_daily_steps.sql:9-11`), but the shipped card writes
  `'auto'` vs `'manual'` (`DailyStepsCard.js:53,146`). The column is free
  text so nothing breaks, but the vocabulary is inconsistent. If the card
  is removed and replaced by a check-in average, settle on one source
  vocabulary then (suggested: `'health'` for an aggregator read,
  `'manual_avg'` for the check-in average).

**`app.json`** is already configured for the aggregator route:

- iOS `infoPlist` has `NSHealthShareUsageDescription` (mentions weight and
  daily steps, `app.json:32`), `NSHealthUpdateUsageDescription`
  (`app.json:33`), and `NSMotionUsageDescription` (`app.json:34`, the Core
  Motion string that becomes unnecessary once iOS moves to HealthKit for
  steps).
- Android `permissions` include `android.permission.health.READ_STEPS`
  (`app.json:57`) and `android.permission.ACTIVITY_RECOGNITION`
  (`app.json:58`).
- Plugins include the `react-native-health` config plugin with share and
  update permission strings (`app.json:126-133`) and a bare
  `react-native-health-connect` plugin string (`app.json:134`).
- `expo-build-properties` sets Android `minSdkVersion: 26`,
  `compileSdkVersion: 34`, `targetSdkVersion: 35` (`app.json:111-114`).

**`src/screens/SettingsScreen.js`** (1400 lines) has the health
integration surface: imports from `health.js` (`SettingsScreen.js:31-34`),
per-scope status for weight and workout (`SettingsScreen.js:143-145`), a
weight toggle that requests permission and imports
(`SettingsScreen.js:201`), a workout toggle (`SettingsScreen.js:233`), and
"Sync now" (`SettingsScreen.js:256`). It also owns the daily-movement
controls: a `stepsEnabled` toggle and a `stepTargetInput`
(`SettingsScreen.js:136-138,166,176`) writing `stepsTarget` /
`stepsEnabled` to the local profile. There is **no** steps health-source
toggle here today (only weight read and workout write are wired to the
health module).

**`src/screens/ProOnboardingScreen.js`** (1365 lines) has the step-target
opt-in: `stepsTargetOn` defaults true (`ProOnboardingScreen.js:181-183`)
and is saved as `stepsTarget` (default 8000) plus `stepsEnabled` on
completion (`ProOnboardingScreen.js:448-449`). It does **not** request any
health or motion permission during onboarding.

**`src/screens/WeeklyCheckInScreen.js`** (1261 lines): the steps surface
here today is a single three-way adherence chip, **not** a number.
`hasStepsTarget` gates a "Steps target" question with
`hit` / `mostly` / `missed` (`WeeklyCheckInScreen.js:254,627-639`), and
`stepsAdherence` is saved into the check-in payload
(`WeeklyCheckInScreen.js:238,415`). Step 2's heading is "This week's data"
(`WeeklyCheckInScreen.js:544`) and nutrition can be auto-derived from the
diary (`WeeklyCheckInScreen.js:602`). There is **no manual
average-steps-per-day input anywhere on the check-in today.** That is the
slot the founder's manual fallback would occupy: a new numeric "average
steps per day" field on Step 2, shown when the user has a step target but
no automatic source. The plumbing pattern to copy is the auto-derived
calories override on the same step.

**`modules/`** contains only `live-activity` and `rest-timer-live`. No
health or steps native module lives there.

**Tests that exist:** `src/lib/__tests__/dailySteps.test.js`,
`src/components/__tests__/dailyStepsCard.test.js`,
`src/lib/sync/__tests__/sync.dailySteps.test.js`.

### 2.2 What is entirely absent

- **`src/lib/dailySteps.js` does not exist.** The brief listed it; the
  daily-steps logic lives in `src/lib/database.js` (the CRUD:
  `getDailyStepsToday`, `setDailySteps`, `getDailyStepsForPush`,
  `insertDailyStepsFromCloud`, `getDailyStepsUpdatedAt`, all referenced by
  the card and sync handler) and in `src/lib/activitySteps.js` (the
  capture). There is no standalone `dailySteps.js` library file.
- **No HealthKit step read on iOS in the live capture path.** `health.js`
  has `readStepsToday` for iOS, but `activitySteps.js` (what the card
  actually calls) routes iOS to Core Motion instead. So in practice, on
  iOS, no wearable steps reach the app today.
- **No background step delivery on either platform.** Nothing calls
  HealthKit `enableBackgroundDelivery` or registers an observer, and
  nothing reads Health Connect in the background. Steps are read only when
  the card mounts.
- **No steps history or trend display anywhere.** Confirmed by the founder
  banner. The card shows only today's figure.
- **No manual average-steps input on the weekly check-in.** Only the
  hit/mostly/missed chip exists.
- **The Expo config plugin that registers the Health Connect permission
  delegate in `MainActivity` does not exist.** This is the documented
  fatal crash. `react-native-health-connect` is added as a bare plugin
  string in `app.json:134`, which does not register the delegate.
- **Migration 056 is not applied to the cloud.** The `daily_steps` table
  is defined and the client is wired, but the table is not live in
  Supabase yet.

---

## 3. Platform research (live web, 2026-05-30)

All sections below were researched live today. Where a specific data point
could not be confirmed from a primary source, it is flagged.

### 3.1 iOS: Apple HealthKit as the step aggregator

**How it aggregates.** HealthKit is the system store every health source
writes into. The iPhone's own motion coprocessor writes step samples; the
paired Apple Watch writes its own; and any third-party app the user has
installed (Garmin Connect, the Google Health app formerly Fitbit, Zepp for
Amazfit, Oura, Withings, Whoop) writes its steps in too, once the user
turns on sharing inside that maker's app. When you ask HealthKit for a
step total over a time range it returns a deduplicated figure rather than
the naive sum across sources, so a user with both an iPhone and an Apple
Watch does not get double-counted. This is the whole reason to prefer
HealthKit over Core Motion: Core Motion is the iPhone chip only.

**Which third-party devices sync steps into HealthKit (status today):**

- **Garmin:** yes. Garmin Connect has an Apple Health integration (More >
  Settings > Connected Apps > Apple Health, enable Steps and the rest).
  Garmin Connect must be installed and the user must enable sharing.
  Garmin data may need to be dragged to the top of the Health "Data
  Sources & Access" priority list for Steps to read from Garmin rather
  than the phone.
- **Fitbit / Google Health:** the Fitbit app became the **Google Health**
  app on 2026-05-19. It continues to write step data to the platform.
- **Oura:** yes, version 4.10+ for full iOS 17+ support. Profile >
  Settings > Apple Health Integration > Share Data with Apple Health.
- **Whoop:** writes some data to Apple Health but is selective about which
  metrics. Whoop is a strain/recovery band and is not a reliable step
  source. Treat Whoop steps as best-effort.
- **Amazfit / Xiaomi:** sync to Apple Health through the **Zepp** app
  (Xiaomi bands also use Zepp Life). The user selects Zepp in Apple Health
  and allows steps.
- **Withings, Polar:** both integrate with Apple HealthKit through their
  companion apps.
- **Samsung:** Samsung's first-party health app is Android-centric;
  Samsung wearables are best read on Android via Health Connect rather than
  on iOS.

**Background delivery.** HealthKit can wake a backgrounded or terminated
app when new samples land, via `enableBackgroundDelivery(for:frequency:)`
plus an `HKObserverQuery`, declared every launch in
`didFinishLaunchingWithOptions`, behind the
`com.apple.developer.healthkit.background-delivery` entitlement. So yes,
the app can receive steps without being opened. `react-native-health`
exposes this through `initializeBackgroundObservers` in the AppDelegate,
but its Expo config plugin does **not** wire background delivery for you,
so it would need a custom config-plugin or AppDelegate modification. For a
step-target app this is a nice-to-have, not a requirement (see UX, §5).

**Best-maintained RN library today.** Two real options:

- **`react-native-health` (agencyenterprise / AE Studio), 1.19.0,
  published 2024-10-15.** Feature-frozen ("temporarily holding off on
  introducing new features", PRs accepted for bug and dependency fixes
  only), ~120 open issues, but stable and widely used. Has an Expo config
  plugin (already in Volyume's `app.json`). Supports steps via
  `getStepCount`. Works on the old RN architecture, so it is compatible
  with Volyume's RN 0.74 / React 18. **This is the pragmatic pick for now**
  because it is already installed and configured.
- **`@kingstinct/react-native-healthkit`, 14.0.1, published 2026-05-14.**
  Modern, type-safe, Nitro-Modules-based, has a config plugin with a
  `background: true` option and first-class `enableBackgroundDelivery`.
  The catch: peer deps are **React >= 19, React Native >= 0.79,
  react-native-nitro-modules >= 0.35**. Volyume is on React 18.2 / RN
  0.74.5. Adopting kingstinct means a full engine upgrade first. Worth
  earmarking for when Volyume next bumps RN, not for this feature.

**Permission flow the user sees on iOS.** A single system HealthKit sheet
listing the data categories the app requests (Steps, plus Weight and
Workouts already requested elsewhere). The user toggles each on or off.
HealthKit deliberately does not tell the app whether read access was
granted (privacy by design), which `health.js` already handles by treating
a successful init as granted and letting reads no-op if actually denied.

### 3.2 Android: Health Connect as the step aggregator

**How it works.** Health Connect is the on-device store and aggregator
that watches, rings, bands, and phone step counters write into. From
Android 14 it is part of the OS framework rather than a separate APK. You
read steps with the aggregate API and it returns one deduplicated total
across all contributing sources using per-app priority, which is exactly
what `health.js` already does with `aggregateRecord` + `COUNT_TOTAL`.

**Which devices/apps write steps to Health Connect (status today):**

- **Samsung Health (Galaxy Watch, Galaxy Ring, Samsung phones):** yes,
  Galaxy Watch metrics sync to Health Connect via Samsung Health. The
  Galaxy Ring reports through Samsung Health, which feeds Health Connect.
- **Google Pixel Watch / Fitbit / Google Health:** yes. Pixel Watch
  metrics are stored in both the Fitbit/Google Health account and Android
  Health Connect.
- **Garmin:** Garmin has been extending Health Connect support (announced
  mid-2025). Garmin Connect writes steps to Health Connect where enabled.
- **Wear OS:** Wear OS watches generally surface steps through their
  companion apps into Health Connect.
- **Amazfit / Xiaomi:** through **Zepp** / Zepp Life, which support Health
  Connect.
- **Oura, Withings, Polar:** their Android companion apps write to Health
  Connect.

**Google Fit deprecation (important context).** The Google Fit APIs are
deprecated and end of service **late 2026** (supported until the end of
2026; no new sign-ups since 2024-05-01). Health Connect is the named
successor for mobile step tracking; the Google Health API is the
server-to-server successor. There is no automatic data migration: users
connect each source to Health Connect themselves. **Takeaway: do not build
on Google Fit. Health Connect is the only correct Android target now.**

**Background sync and freshness.** Health Connect supports a dedicated
background read permission,
`android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND` (Android 14 /
API 34+), gated by user consent and a feature check
(`FEATURE_READ_HEALTH_DATA_IN_BACKGROUND`). Without it, reads only succeed
while the app is foregrounded. For a daily step target a foreground read on
app open and at check-in is enough; background read is optional polish.
Data freshness depends on the source app syncing into Health Connect (for
example Garmin Connect refreshes on app open or watch sync), so there can
be a lag of minutes to a sync cycle, which is fine for a daily figure.

**Minimum Android version.** Health Connect needs Android 8 / API 26 as
the practical floor for the framework path, and the library targets API
34/35 for the modern framework integration. Volyume's `minSdkVersion` is
already 26 and `targetSdkVersion` 35, so it is correctly set.

**Best-maintained RN library.** **`react-native-health-connect`
(matinzd), 3.5.3, published 2026-05-15.** This is the de-facto standard,
actively maintained, already used by `health.js`. Volyume has 3.3.3
installed; bump to 3.5.3. It cannot run in Expo Go (needs a dev client /
prebuild), which Volyume already does.

  **Known critical issue (the documented crash).** The permission flow
  throws `kotlin.UninitializedPropertyAccessException: lateinit property
  requestPermission has not been initialized` (issues #114 and #214 on the
  matinzd repo) unless the host app registers the permission delegate in
  `MainActivity.onCreate`:

      // MainActivity.kt
      import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate
      override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        HealthConnectPermissionDelegate.setPermissionDelegate(this)
      }

  Because Volyume uses Expo prebuild and `expo prebuild --clean`
  regenerates `MainActivity` every build, this line is wiped each time. The
  fix has to be an **Expo config plugin** that re-inserts the import and the
  `setPermissionDelegate(this)` call into `MainActivity.onCreate` on every
  prebuild. This is item 1 in the priorities. There is a community
  `expo-health-connect` plugin but it is stale (0.1.1, ~2 years old); a
  small purpose-built `withHealthConnectPermissionDelegate` plugin in the
  Volyume repo is the safer route.

**Permission flow the user sees on Android.** A Health Connect permission
screen listing the requested record types (Steps read, plus Weight read
and the workout writes already requested). The user grants per type. If
the user has no Health Connect data source at all, the app still works,
the read just returns zero and the check-in average fallback applies.

### 3.3 Cross-platform RN approach (single integration point)

There is no single mature RN library that wraps both HealthKit and Health
Connect behind one API as of today. The realistic "one integration point"
is the pattern Volyume already has: a thin app-level facade (`health.js`)
that branches on `Platform.OS` and calls the best platform library on each
side (`react-native-health` on iOS, `react-native-health-connect` on
Android). That facade IS the unified surface. The rest of the app should
call only `health.js` (or a small `steps.js` wrapper over it) and never
touch the platform libraries directly. The cleanest architecture is to
keep that facade and delete the parallel Core Motion path so there is
exactly one step source per platform.

(There are commercial cross-platform aggregator SDKs, for example Spike,
Thryve, Validic, Terra, that wrap HealthKit, Health Connect, and direct
vendor APIs behind one cloud API. They buy breadth and a server-side data
model but add a paid third party, a backend dependency, and a privacy
surface. For a step count that HealthKit and Health Connect already
deliver for free on-device, they are not justified. Revisit only if
Volyume later needs many health metrics from many vendors with
server-side processing.)

---

## 4. Device coverage table

"Native app" = the maker's companion app must be installed and sharing
enabled. "Auto" = once that is set up, steps flow with no further user
action. Aggregator route = HealthKit on iOS, Health Connect on Android.

| Device | Writes steps to HealthKit (iOS) | Writes steps to Health Connect (Android) | Needs maker app installed | Known gap / delay |
|---|---|---|---|---|
| Apple Watch (all series) | Yes, native, auto | n/a (no Android) | No (built into iOS) | None. Dedupes with iPhone in HealthKit. |
| iPhone standalone pedometer | Yes, native, auto | n/a | No | None. |
| Android phone standalone pedometer | n/a | Yes, via the phone's health/steps provider into Health Connect | Usually built in (Samsung Health, Google Health, etc.) | Varies by OEM; most modern phones contribute. |
| Samsung Galaxy Watch | Limited on iOS (Samsung is Android-first) | Yes, via Samsung Health, auto | Yes (Samsung Health) | iOS coverage weak; read on Android. |
| Samsung Galaxy Ring | Not reliably on iOS | Yes, via Samsung Health, auto | Yes (Samsung Health) | Android-first device. iOS not a target. |
| Garmin (Forerunner, Fenix, Venu, Instinct, vivo lines) | Yes, via Garmin Connect, auto | Yes, via Garmin Connect (HC support rolled out from 2025), auto | Yes (Garmin Connect) | May need Garmin set as top priority source for Steps on iOS. Sync on app open / watch sync. |
| Fitbit / Google Pixel Watch | Yes, via Google Health (ex-Fitbit) app | Yes, stored in Health Connect and the Google Health account | Yes (Google Health app) | Fitbit app rebranded to Google Health 2026-05-19. Some 2026 firmware step-count bugs reported, since patched. |
| Wear OS watches (non-Samsung, non-Pixel) | Via the watch's companion app where it supports HealthKit | Yes, via companion app into Health Connect | Yes (companion app) | Depends on the specific watch app. |
| Polar | Yes, via Polar Flow, auto | Yes, via Polar Flow into Health Connect | Yes (Polar Flow) | None significant for steps. |
| Whoop | Partial (Whoop is selective about Apple Health metrics) | Partial via Whoop app | Yes (Whoop app) | Strain/recovery band, not a dependable step source. Treat as best-effort. |
| Amazfit | Yes, via Zepp app | Yes, via Zepp into Health Connect | Yes (Zepp) | None significant. |
| Xiaomi Mi Band | Yes, via Zepp / Zepp Life | Yes, via Zepp / Zepp Life into Health Connect | Yes (Zepp / Zepp Life) | Xiaomi nudges users to its own ecosystem; Zepp is the bridge. |
| Oura Ring | Yes (app v4.10+, iOS 17+), auto | Yes, via Oura app into Health Connect | Yes (Oura app) | Steps are a secondary Oura metric but it does write them. |
| Withings (scales, watches, trackers) | Yes, via Withings Health Mate | Yes, via Health Mate into Health Connect | Yes (Health Mate) | None significant for steps. |

**Devices that do NOT reliably reach the aggregators, and would need a
direct SDK if you insisted on covering them:** none that matter for steps.
The few partial cases (Whoop's selective sharing) are partial in the maker
app, not solvable by a direct SDK in a way that helps a step count, and
Whoop is a poor step source regardless. The aggregator route covers the
meaningful device universe for step count.

---

## 5. UX research

Sources are the platform docs and integration guides listed in the
appendix; the patterns below are how well-regarded health apps handle the
same flow.

**Lowest-friction connection flow.** The best apps do not front-load a
health connection in cold onboarding. They ask at the first moment the
data is actually useful, with a one-line plain reason and a single CTA
that fires the system sheet directly. On iOS that sheet is the HealthKit
category list; on Android it is the Health Connect permission screen. One
tap, one sheet, done. Avoid a custom pre-permission explainer screen that
adds a tap before the real sheet unless you have evidence users are
declining.

**Where to offer the connection.** Three candidate moments:

- **Cold onboarding (`ProOnboardingScreen`):** highest visibility but
  worst timing. The user has not seen why steps matter yet, and Volyume's
  audit notes roughly 80% of users have no wearable, so most would decline
  a health prompt here for no benefit. Do not put the steps connection in
  cold onboarding.
- **First time steps become relevant (recommended primary):** when the
  coach first shows a step target, or the user lands on the step surface,
  offer "Connect your watch or tracker for automatic steps" with the
  reason stated. This is where intent is highest.
- **Settings (always available):** a permanent "Steps source" row beside
  the existing weight and workout health rows in `SettingsScreen`, so a
  user who declined or bought a tracker later can connect any time. This
  reuses the exact pattern already built for weight.

Recommended: settings row always present, plus a single contextual prompt
the first time a step target is shown. No onboarding prompt.

**Handling a supported-device user who has not connected.** Prompt once,
contextually, then leave them alone. Do not nag. A persistent but quiet
affordance (the settings row, and a small "connect for automatic steps"
link on the check-in steps question) is enough. Repeated prompts read as
pushy and the audit's voice rules forbid encouragement nobody asked for.

**Presenting the manual average-steps fallback on the weekly check-in.**
Per the founder lock, the manual path is a **single average steps/day**
number at check-in, not a per-day log. Concretely: on Step 2 of
`WeeklyCheckInScreen` ("This week's data"), when the user has a step
target but no connected automatic source, show one numeric field,
"Average steps per day this week", with a plain label and a number pad. If
an automatic source IS connected, replace the input with the read figure
and the existing hit/mostly/missed adherence can be derived from it rather
than asked. Keep it to one field. No helper paragraph, no encouragement,
matching the existing auto-derived-calories pattern on the same step.

**Displaying step data once connected.** Keep it factual and minimal,
consistent with the no-AI-fingerprint design rules:

- **Today's total** where the coach surfaces activity (a single figure,
  optionally "x of target").
- **Weekly trend** only if it earns its place: a simple line or bar of the
  last 7 to 14 daily totals, no decorative chrome. The audit confirms no
  steps-over-time view exists yet, so this is net-new and should be built
  deliberately, not as a default dashboard tile.
- **Progress to target** as a quiet inline indicator, not a celebratory
  ring. Volyume reports facts.

**Switching manual <-> automatic.** If a user later connects a source, the
automatic read should take precedence for new days and the check-in should
switch from the manual average field to the read figure automatically. If
they disconnect, fall back to the manual average at the next check-in. The
source vocabulary in the data layer should make this unambiguous (a
`'health'` row beats a `'manual_avg'` row for the same period).

---

## 6. Recommended approach

**Architecture.** One step facade per the existing pattern. Keep
`health.js` as the single platform-branching wrapper. Either fold steps
fully into it or keep a thin `activitySteps.js` that, after the fix, calls
`health.js` on **both** platforms instead of Core Motion on iOS. The rest
of the app calls only that facade.

**Libraries (exact, with rationale):**

- iOS: **`react-native-health` 1.19.0** (already installed). Stable,
  Expo-plugin-configured, compatible with RN 0.74 / React 18. Use its
  `getStepCount`. Limitation: feature-frozen and no background delivery via
  its Expo plugin, so background step delivery would need a custom
  config-plugin/AppDelegate change. Acceptable, because background steps
  are optional for a daily target. Earmark a future migration to
  `@kingstinct/react-native-healthkit` 14.x when Volyume moves to React 19
  / RN 0.79+ / Nitro.
- Android: **`react-native-health-connect` 3.5.3** (bump from 3.3.3).
  Actively maintained, de-facto standard, already wired. Use
  `aggregateRecord` with `COUNT_TOTAL` (already implemented).
- Remove the iOS daily-total dependence on **`expo-sensors`** Pedometer.

**iOS vs Android handling.** Shared facade, platform-specific
implementation inside it, which is already the shape. The single behaviour
change is making iOS read HealthKit rather than Core Motion so the two
platforms are symmetric: both go through their aggregator, both pick up
wearables.

**How steps are fetched (recommendation).** Foreground read on app open
plus a read at weekly check-in time. This is enough for a daily step
target and avoids the entitlement and config-plugin work that background
delivery needs on iOS and the extra background permission on Android. Add
background delivery later only if users ask for same-second freshness.
Concretely: read today's total when the relevant surface mounts, persist
it to `daily_steps` with `source: 'health'`, and at check-in read the
week's daily totals to fill the average automatically.

**Local storage once fetched.** Reuse the existing `daily_steps` table and
its sync handler. One row per local day, `source` set to `'health'` for an
aggregator read. The sync registry entry and the per-table push/pull are
already correct. Apply migration 056 to the cloud (currently pending) so
the rows have a home to sync to. Settle the `source` vocabulary mismatch
noted in §2.1 at the same time.

**Permissions, including the Health Connect crash fix.**

- iOS: request the `'steps'` scope through the existing
  `requestHealthPermissions(['steps'])`. The Info.plist strings are
  already in `app.json`. `NSMotionUsageDescription` can stay for now but
  becomes unnecessary once Core Motion is dropped; removing it is tidy but
  not urgent.
- Android: the `READ_STEPS` and `ACTIVITY_RECOGNITION` permissions are
  already declared. The blocker is the `MainActivity` permission delegate.
  Write an Expo config plugin (a `withMainActivity` mod) that, on every
  prebuild, inserts:

      import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate
      // inside onCreate, after super.onCreate(...):
      HealthConnectPermissionDelegate.setPermissionDelegate(this)

  Register that plugin in `app.json` alongside the existing
  `react-native-health-connect` entry. This survives
  `expo prebuild --clean`, which the raw `MainActivity` edit does not.
  This is a runtime-critical change (permissions + native): add a smoke
  test or a documented manual verification that the permission sheet opens
  without crashing.

**Device coverage summary and gaps.** The aggregator route covers Apple
Watch, iPhone, Android phones, Samsung Galaxy Watch and Ring (Android),
Garmin, Fitbit/Pixel/Google Health, Wear OS, Polar, Amazfit, Xiaomi (via
Zepp), Oura, and Withings for step count, through two integration points
and two permission sheets. The only soft spot is Whoop, which shares steps
selectively and is a poor step source anyway. No device needs a direct SDK
for steps.

**Direct SDK verdict.** Not needed. Fitbit Web API, Garmin Connect API,
and Samsung Health SDK each add OAuth, a server, per-vendor approval, and
maintenance to fetch data the aggregators already provide on-device for
free. Skip them for steps. Revisit only if Volyume later wants rich
vendor-specific metrics that the aggregators do not expose.

**UX proposal (summary).** Settings "Steps source" row always available
(reusing the weight-row pattern), plus one contextual connect prompt the
first time a step target is shown, no onboarding prompt, no nagging.
Automatic display: today's total and a quiet progress-to-target, optional
minimal weekly trend. Manual fallback: a single "average steps per day"
number on check-in Step 2, shown only when no source is connected, derived
automatically when one is. Switching is automatic via source precedence
(`'health'` beats `'manual_avg'`).

---

## 7. Implementation proposal and build order

**Complexity assessment.** Moderate, front-loaded on the Android native
fix. The data layer (table, sync, CRUD) already exists. The capture
wrapper exists and is mostly right. The real work is: one config plugin
(Android, fiddly but small), one source-routing change (iOS, small), the
check-in average field (UI, medium), removing the old card (cleanup), and
applying the migration (ops).

**Gotchas.**

- The Android crash is fatal and silent in JS (it is a native exception),
  so it must be fixed before any Android step testing. Confirm the plugin
  output by reading the generated `MainActivity.kt` after a clean prebuild.
- HealthKit never reports read-permission status, so the app cannot tell
  "denied" from "no data". `health.js` already handles this; keep treating
  a zero read as "no figure" and falling back, never as "zero steps".
- Health Connect aggregate can throw if permission is missing or the source
  is old; the existing raw-records fallback covers it. Keep it.
- The Garmin-on-iOS priority quirk (Garmin must be top of the Steps source
  list) is a user-side setting, not something the app controls. A one-line
  help note is the most the app should do.
- The `source` vocabulary mismatch (`'auto'`/`'manual'` in the card vs
  `'manual'`/`'health'` in the migration) must be reconciled when the card
  is replaced, or the check-in precedence logic will be ambiguous.
- Migration 056 must be applied to the cloud before health-sourced rows
  can sync, and the frozen closed-test build must keep working against it
  (it is additive, so it does, per the migration header).

**Suggested build order (fastest working integration first):**

1. **Android config plugin for the Health Connect permission delegate.**
   Unblocks all Android step testing. Smallest change with the biggest
   gate behind it.
2. **Repoint iOS step read to HealthKit** in `activitySteps.js` (or fold
   into `health.js`). Turns on wearable coverage on iOS. Drop the Core
   Motion path.
3. **Bump `react-native-health-connect` to 3.5.3** and re-test the Android
   read end to end with the plugin in place.
4. **Apply migration 056 to the cloud** and verify the round trip with the
   existing sync handler. Reconcile the `source` vocabulary.
5. **Add the manual average-steps field to weekly check-in Step 2,** shown
   only when no automatic source is connected; derive it automatically
   when one is.
6. **Remove the per-day `DailyStepsCard`** and its per-day manual entry per
   the founder lock, once the check-in average and automatic display
   replace it.
7. **Add the automatic display** (today's total, quiet progress, optional
   minimal weekly trend) and the contextual one-time connect prompt.
8. **Optional later:** background delivery (iOS entitlement + observer via
   a custom plugin; Android background-read permission) only if same-second
   freshness is wanted.

Each step that touches a runtime-critical surface (permissions, sync,
native modules) should ship with a test or a documented manual
verification in the same change, per the engineering rules.

---

## 8. Open questions

1. **Background delivery: in or out for v1?** Recommendation is out
   (foreground + check-in read is enough), but if the coach needs
   intraday freshness, the iOS entitlement and a custom config plugin are
   the cost.
2. **`source` vocabulary:** confirm `'health'` for aggregator reads and
   `'manual_avg'` for the check-in average, and migrate the existing
   `'auto'`/`'manual'` rows or accept mixed history.
3. **Check-in average vs per-day:** the founder lock says single average.
   Confirm the coach engine can consume a weekly average where it
   currently expects per-day or adherence input, or add a thin adapter.
4. **`@kingstinct/react-native-healthkit` migration:** worth scheduling
   against a future RN 0.79 / React 19 bump for first-class background
   delivery, or stay on `react-native-health` indefinitely?
5. **Whoop and other partial sources:** accept best-effort, or surface a
   note when the only connected source is a poor step reporter?
6. **iOS `NSMotionUsageDescription`:** remove once Core Motion is dropped,
   or keep for any future live-pedometer use?

---

## 9. Appendix: sources and library links

**Libraries**

- react-native-health (iOS, agencyenterprise / AE Studio):
  https://github.com/agencyenterprise/react-native-health
  npm: https://www.npmjs.com/package/react-native-health (1.19.0)
  Expo docs: https://github.com/agencyenterprise/react-native-health/blob/master/docs/Expo.md
  Background docs: https://github.com/agencyenterprise/react-native-health/blob/master/docs/background.md
- @kingstinct/react-native-healthkit (iOS, modern alternative):
  https://github.com/kingstinct/react-native-healthkit
  npm: https://www.npmjs.com/package/@kingstinct/react-native-healthkit (14.0.1)
- react-native-health-connect (Android, matinzd):
  https://github.com/matinzd/react-native-health-connect
  npm: https://www.npmjs.com/package/react-native-health-connect (3.5.3)
  docs: https://matinzd.github.io/react-native-health-connect/docs/get-started/
  permissions: https://matinzd.github.io/react-native-health-connect/docs/permissions/
  crash issue #114: https://github.com/matinzd/react-native-health-connect/issues/114
  crash issue #214: https://github.com/matinzd/react-native-health-connect/issues/214

**Apple HealthKit**

- enableBackgroundDelivery: https://developer.apple.com/documentation/HealthKit/HKHealthStore/enableBackgroundDelivery(for:frequency:withCompletion:)
- background-delivery entitlement: https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.healthkit.background-delivery
- RN background app refresh with HealthKit: https://medium.com/react-native-training/how-to-handle-background-app-refresh-with-healthkit-in-react-native-3a32704461fe

**Android Health Connect and Google Fit deprecation**

- Health Connect get started: https://developer.android.com/health-and-fitness/health-connect/get-started
- Read raw data / background reads: https://developer.android.com/health-and-fitness/health-connect/read-data
- Data types: https://developer.android.com/health-and-fitness/health-connect/data-types
- Android 13 to 14 migration: https://developer.android.com/health-and-fitness/health-connect/migration/android-13-to-14
- Health Connect historical background reads: https://www.androidauthority.com/health-connect-historical-background-reads-3443726/
- Google Fit migration guide: https://developer.android.com/health-and-fitness/health-connect/migration/fit
- Google Fit migration FAQ: https://developer.android.com/health-and-fitness/health-connect/migration/fit/faq
- Google Fit shutdown 2025/2026 developer guide: https://www.spikeapi.com/blog/google-fit-shutdown-what-developers-need-to-know-and-how-to-prepare
- Google Fit API deprecation overview: https://www.thryve.health/blog/google-fit-api-deprecation-and-the-new-health-connect-by-android-what-thryve-customers-need-to-know

**Device sync behaviour**

- Garmin to Apple Health (Garmin support): https://support.garmin.com/en-US/?faq=lK5FPB9iPF5PXFkIpFlFPA
- Garmin and Health Connect (the5krunner): https://the5krunner.com/2025/06/20/garmin-to-add-health-connect-support-to-apple/
- Fitbit becomes Google Health (support): https://support.google.com/googlehealth/answer/17068213
- Google Health roadmap 2026 (9to5Google): https://9to5google.com/2026/05/27/google-health-roadmap-fitbit-backlash/
- Pixel / Galaxy / Apple Watch / Fitbit metrics comparison (Empirical Health): https://www.empirical.health/blog/health-metrics-samsung-pixel-apple-watch-fitbit/
- Whoop Apple Health integration: https://support.whoop.com/s/article/Apple-Health-Integration
- Withings partner apps: https://support.withings.com/hc/en-us/articles/201489577-Partner-Apps-Which-apps-are-compatible-with-the-Withings-ecosystem
- Xiaomi Mi Band with Samsung Health (Android Authority): https://www.androidauthority.com/mi-band-samsung-health-3246266/
- Connect accessories to Samsung Health: https://www.samsung.com/us/support/answer/ANS10001380/
- Commercial cross-platform aggregators (context): https://www.spikeapi.com/integrations

**Internal**

- docs/audit/volyume-cardio-steps-audit-2026-05-30.md (founder correction
  banner, lines 16-72)
- src/lib/health.js, src/lib/activitySteps.js,
  src/components/DailyStepsCard.js, src/lib/sync/tables/dailySteps.js,
  src/lib/sync/registry.js, supabase/migrate_056_daily_steps.sql, app.json,
  src/screens/WeeklyCheckInScreen.js, src/screens/SettingsScreen.js,
  src/screens/ProOnboardingScreen.js, package.json
</content>
</invoke>
