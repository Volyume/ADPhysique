⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# watchOS scoping memo - evidence pack (P12)

Date: 2026-07-02. Researcher: agent (read-only on product code). Branch at time
of research: `claude/codebase-audit-docs-pv6mjd` @ `ee2d19d`.

Purpose: raw evidence for the founder-authored watchOS scoping memo. EVIDENCE
ONLY - no recommendation is made anywhere in this file. Every claim carries a
file:line reference or a dated web source; unreachable evidence is marked
UNVERIFIED.

Web sources were fetched on 2026-07-02 unless stated otherwise. Apple
developer pages were fetched via their JSON data endpoints because the HTML
pages are JS-rendered.

---

## 1. HealthKit gate - Path 1: watch app WITHOUT HealthKit

What the OS gives a plain (no-HKWorkoutSession) watch app, and what it takes
away.

### 1.1 Runtime truths

- Frontmost lifetime: "By default, the frontmost app remains in the foreground
  for two minutes before transitioning to the background and becoming
  suspended." (Apple docs, surfaced via web search 2026-07-02; corroborated by
  Apple Developer Forums threads
  https://developer.apple.com/forums/thread/671990 and
  https://developer.apple.com/forums/thread/23510 - wrist-down suspends the
  app's timer thread; it resumes on wrist raise.)
- Extended runtime sessions (Apple, "Using extended runtime sessions",
  developer.apple.com/documentation/watchkit/using-extended-runtime-sessions,
  fetched 2026-07-02) - the ONLY non-workout long-running options, with hard
  limits:
  - Self care: "10 minutes", frontmost only, not schedulable.
  - Mindfulness: "1 hour", frontmost only, not schedulable.
  - Physical therapy: "1 hour", background, not schedulable.
  - Smart alarm: "30 minutes", background, schedulable "any time within the
    next 36 hours" via `start(at:)`; only one scheduled session at a time.
  - Frontmost session types end when "the user explicitly leaves your app
    (for example, by pressing the digital crown or switching to a different
    app)".
  - There is NO general fitness/strength-training session type in the list.
    The fetched page does not state a category-enforcement rule for who may
    use each type; whether App Review enforces intended-use for, say, a
    physical-therapy session in a lifting app is UNVERIFIED (not tested, no
    dated ruling found).
- Timer workaround pattern without any session: schedule a local notification
  for a wall-clock date; the notification's haptic fires on the wrist even
  while the watch app is suspended. This is exactly the pattern the phone app
  already uses for rest-end (see 2.5), and it is the workaround developers
  describe on the Apple forums threads above (threads date from 2015 and
  2021; behaviour re-confirmed in those threads, current-OS behaviour
  UNVERIFIED beyond that).
- Notification mirroring nuance: iPhone-scheduled local notifications are
  delivered to a paired watch only under Apple's routing rules (phone locked,
  watch worn/unlocked). No first-party page was fetched confirming the exact
  current routing matrix - UNVERIFIED; the memo should not assume phone-side
  scheduling alone guarantees a wrist haptic.

### 1.2 What Path 1 avoids

- No `com.apple.developer.healthkit` entitlement, no
  `NSHealthShareUsageDescription`/`NSHealthUpdateUsageDescription` strings, no
  App Review guideline 5.1.3 exposure (see 2.x below for the current app's
  clean posture - HealthKit was fully removed from builds).
- No Article 9 surface widening: today's app.json contains zero NSHealth*
  keys (app.json:32-48 is the full infoPlist block; verified by grep
  2026-07-02).

---

## 2. HealthKit gate - Path 2: watch app WITH HKWorkoutSession

### 2.1 What HKWorkoutSession grants

Apple, HKWorkoutSession (developer.apple.com/documentation/healthkit/hkworkoutsession,
fetched 2026-07-02):

- Availability: watchOS 2.0+; iOS/iPadOS 17.0+, visionOS 1.0.
- "All workout sessions generate high-frequency heart rate samples".
- One session at a time on the watch: a second workout starting delivers
  `errorAnotherWorkoutSessionStarted` and "your session ends".

Apple, "Running workout sessions" (fetched 2026-07-02):

- Background grant: "Apps with an active workout session can run in the
  background", continuously, "even when the user lowers their wrist or uses
  other apps"; requires the "workout processing" background mode in the watch
  target (plus "audio" background mode if playing sounds/haptics from the
  background).

### 2.2 What HKWorkoutSession requires (the founder's
"session-runtime-only, no read, no write" question)

- Apple's documented flow does NOT offer an authorisation-free session:
  "Before creating a workout session, you must set up HealthKit and request
  permission to read and share any health data your app intends to use" and,
  specifically, "For workout sessions, you must request permission to share
  workout types." ("Running workout sessions", fetched 2026-07-02.) Share
  permission for `HKQuantityType.workoutType()` is write-side authorisation,
  so per the documented flow a session-running app is a HealthKit-writing app.
  Whether a session will technically start with authorisation never requested
  is UNVERIFIED (not empirically tested; the docs mandate requesting it).
- Entitlement: "Before you can use HealthKit, you must enable the HealthKit
  capabilities for your app" ("Setting up HealthKit", fetched 2026-07-02).
  The capability adds the `com.apple.developer.healthkit` entitlement. Note
  for watch targets: "The `healthkit` entry isn't used by watchOS apps"
  refers only to the Required-device-capabilities array, not the entitlement.
- Purpose strings: "In watchOS 6 and later, users can authorize reading and
  sharing data on Apple Watch. As a result, you must add usage descriptions
  to your WatchKit App Extension" - `NSHealthShareUsageDescription` for reads,
  `NSHealthUpdateUsageDescription` for writes ("Running workout sessions",
  fetched 2026-07-02). And on `requestAuthorization(toShare:read:)` (fetched
  2026-07-02): "You must set the usage keys, or your app will crash when you
  request authorization."
- Container too: App Store Connect has been reported to require BOTH the
  watch extension AND the container app to carry the two NSHealth* strings
  (Dan Beech, "Get your standalone HealthKit Watch app through App Store
  Connect & Review", medium.com, undated post surfaced 2026-07-02; secondary
  source - treat the exact placement rule as PLAUSIBLE but UNVERIFIED against
  a first-party page).

### 2.3 App Review exposure (fetched from
developer.apple.com/app-store/review/guidelines/ on 2026-07-02)

- 5.1.3(i): apps "may not use or disclose to third parties data gathered in
  the health, fitness, and medical research context ... for advertising,
  marketing, or other use-based data mining purposes"; "You must disclose the
  specific health data that you are collecting from the device."
- 5.1.3(ii): "Apps must not write false or inaccurate data into HealthKit ...
  and may not store personal health information in iCloud."
- 2.5.1: "Apps should use APIs and frameworks for their intended purposes ...
  HealthKit should be used for health and fitness purposes and integrate with
  the Health app."

### 2.4 Current repo HealthKit posture (clean slate)

- `react-native-health` / `react-native-health-connect` are NOT in
  package.json (grep 2026-07-02: no matches). The former HealthKit/Health
  Connect integration was ripped out (task history #52-54, "Rip out ALL
  Health Connect/HealthKit: deps + plugins + permissions").
- `src/lib/health.js` survives as a 1,000-line lazy-require wrapper that
  no-ops "rather than crashing" when the native modules are absent
  (src/lib/health.js:1-25); every call path is therefore inert in current
  builds.
- Watch-awareness already exists in logic:
  `shouldSkipPhoneHealthWrite(workout)` skips the phone's estimated Health
  write when `workout.watchSessionMs` covered >= 50% of the session
  (src/lib/health.js:590-601; pinned by
  src/lib/__tests__/health.watchSkip.test.js).
- app.json has no HealthKit entitlement, no NSHealth* strings, and
  UIBackgroundModes is only ["fetch", "remote-notification"]
  (app.json:39-42).

---

## 3. Architecture inputs (repo truths a watch mirror would consume)

### 3.1 Wall-clock rest timer (store)

`src/store/useAppStore.js`:

- Anchor design: "Rest timer. Anchored to a wall-clock end timestamp
  (restTimerEndsAt) so it ... " survives background/foreground; every tick
  recomputes from the anchor (useAppStore.js:1405-1409).
- State fields: `restTimerActive` (:1411), `restTimerDuration` default 90
  (:1412), `restTimerRemaining` (:1413), `restTimerEndsAt` epoch ms (:1414).
- Mutations: `startRestTimer(duration = 90)` sets `endsAt` (:1416-1423);
  `stopRestTimer` (:1432-1434); `adjustRestTimer(seconds)` shifts the anchor
  (:1440-1448); `tickRestTimer` recomputes remaining from `endsAt`
  (:1458-1470). Per-exercise default rest and `autoStartRestTimer` pref
  (:1485-1491).

### 3.2 Active-session snapshot (crash/kill recovery, WK-1)

`_persistActiveWorkout` (useAppStore.js:86-116) writes one AsyncStorage key
after every workout mutation. Snapshot shape (:92-111):

- `userId`, `workout` (the activeWorkout object), `workoutExercises` (carries
  logged sets), `currentExerciseIndex`, `workoutStartTime`,
  `sessionAdjustments` (COMP-015), `appliedRemoteEventIds` (COMP-020, last
  500, "persist the applied watch event ids so replay after a crash /
  background-relaunch stays idempotent (never double-logs a set)"
  :102-105), `restTimerEndsAt` (only while active) + `restTimerDuration`
  (:106-109), `savedAt`.

Restore: `restoreActiveWorkout(userId)` (useAppStore.js:1306-1360) - only for
the same user, only if the workout row is still incomplete in SQLite, never
clobbers a live in-memory session, and rehydrates a truthful countdown from
`restTimerEndsAt` if it is still in the future (:1345-1350).

### 3.3 The wrist-logged-set entry point ALREADY EXISTS

`applyRemoteSetEvent(event)` (useAppStore.js:1215-1282) is documented in-code
as "COMP-020: the headless, idempotent set-commit path the watch bridge
calls." Properties:

- Event shape: `{ eventId, workoutId, type: 'logSet', payload: { reps,
  weight, rir, setType, restSeconds } }` (:1224, :1251-1262).
- Idempotent by `eventId` against `appliedRemoteEventIds` (:1227-1229);
  rejects when no active workout or workout-id mismatch (:1230-1233); set
  number is "recomputed phone-side" via `countProgressSets` (:1244).
- Reuses the same primitives as the screen: `createWorkoutSet` (SQLite) +
  `addSetToCurrentExercise` + `startRestTimer` (:1240-1272); deliberately
  does NOT run PR detection/celebration (:1217-1219, "a watch-applied set
  queues its PR check for the summary instead - §4.3").
- Snapshot persisted after apply (:1275); returns `{ applied, reason? }`.
- Contract test: src/store/__tests__/applyRemoteSetEvent.test.js:1-7 ("locks
  the never-lose-a-set / never-double-log guarantees").
- Known defect logged against it: "SD-11 | low | `applyRemoteSetEvent`
  idempotency check spans an await - replayed watch event can double-log a
  set | src/store/useAppStore.js:1206-1253 | Record the eventId synchronously
  before the DB write" (audit/01-codebase-audit.md:73).
- Doc inaccuracy to flag: pass3-missing-features.md:9 cites
  `lib/watch/bridge.js` ("watch bridge is for rest-timer haptic only") - no
  such file exists in the repo today (verified 2026-07-02). The only watch
  plumbing that exists is the store path above plus health.js watch-skip.

### 3.4 Rest-end alert precedent (phone side)

`src/lib/notifications/restEnd.js:1-60` - one OS-scheduled local notification
at `restTimerEndsAt` as the locked/backgrounded backstop; store schedules it
when the timer is running (useAppStore.js:1552-1554); it survives process
death (restEnd.js:20-21) and is suppressed in the foreground (restEnd.js:17-19).
This is the existing wall-clock-notification pattern a Path 1 wrist haptic
would mirror.

---

## 4. Expo / EAS reality

### 4.1 Repo build posture

- Managed workflow / CNG: there is NO `ios/` directory, no `config-plugins/`
  directory and no `credentials.json` in the repo (ls 2026-07-02). Prebuild
  runs on EAS.
- iOS deployment target 16.0 via expo-build-properties (app.json:187-189).
  Bundle id `app.volyume`, buildNumber "9" (app.json:29-30). Expo ~54.0.35 /
  RN 0.81.5 (package.json:59, :91).
- eas.json: CLI >= 10.0.0, `appVersionSource: "remote"` (eas.json:2-5); four
  profiles - development, development-device, preview (internal APK),
  production (autoIncrement, app-bundle, iOS image
  "macos-sequoia-15.6-xcode-26.2") (eas.json:6-43); submit config is
  Android-only (eas.json:44-51). No credentials.json referenced anywhere -
  EAS-managed remote credentials posture.

### 4.2 The two local modules as the native precedent - and the target
distinction

- Both are `file:` deps: `"live-activity": "file:./modules/live-activity"`
  (package.json:88) and `"rest-timer-live": "file:./modules/rest-timer-live"`
  (package.json:104), each with an `expo-module.config.json`
  (`platforms: ["ios"]` / `["android"]`) autolinked into the MAIN app target.
- rest-timer-live is Android-only Kotlin (RestTimerLiveModule.kt +
  WorkoutForegroundService.kt with its own AndroidManifest.xml) - a module,
  not a separate app.
- live-activity is the instructive one: the Swift module file compiles into
  the main target, but its widget files DO NOT ship. The module's own README
  states: "The Live Activity Swift files in this directory need to live
  inside a Widget Extension target before they actually render. The main app
  target alone cannot host a Live Activity"
  (modules/live-activity/ios/widget/README.md:1-6). The wiring steps are
  manual Xcode work after prebuild (README.md:25-57), then either commit
  `ios/` or "add a config plugin that recreates the target during prebuild
  ... there are examples at https://github.com/bacons/apple-targets"
  (README.md:59-66), plus a separate App ID `app.volyume.widget` and its own
  provisioning profiles in EAS credentials (README.md:70-77).
- Neither step has been done: no `ios/` is committed, no plugin exists, and
  app.json does not contain `NSSupportsLiveActivities` (grep 2026-07-02 - the
  README's claim at README.md:50-53 that app.json ships this key is wrong).
  CONCLUSION FROM EVIDENCE: this repo has never actually shipped an extra
  Apple target; both local modules are single-target. A watch app is a
  heavier class of artefact (its own app target + provisioning) than
  anything the codebase has done before.

### 4.3 @bacons/apple-targets (the config-plugin route), state 2025/2026

- Latest release 4.0.7, published 2026-05-13 (npm registry via `npm view`,
  2026-07-02).
- Repo README (github.com/EvanBacon/expo-apple-targets, fetched 2026-07-02):
  supports 30+ target types including `watch` and `watch-widget`; targets
  live in a magic `/targets` folder, each with `expo-target.config.js`, and
  the plugin links them into the Xcode project at prebuild. On signing: "The
  codesigning is theoretically handled entirely by EAS Build. This plugin
  will add the requisite entitlements for target signing to work."
  ("theoretically" is the author's own word.)
- Watch guide (project docs, read via mintlify.wiki mirror
  mintlify.wiki/EvanBacon/expo-apple-targets/guides/watch-apps, fetched
  2026-07-02 - mirror, so treat quotes as near-source): `type: "watch"`,
  example `deploymentTarget: "9.0"`; "Watch apps require a paired iOS app and
  cannot run standalone in this configuration"; "Watch apps must be built in
  pure Swift/SwiftUI. React Native does not support watchOS."; communication
  is App Groups (`UserDefaults(suiteName:)`) for persisted data plus
  WatchConnectivity for live messaging, with the caveat "The React Native app
  must be running for `WCSession.isReachable` to return `true`."; workflow is
  `npx create-target watch` then `npx expo prebuild -p ios --clean` then
  Xcode for the Swift work.
- Known watch-specific defect: issue #175 "expo prebuild generates incorrect
  Watch embed/dependency wiring" - opened 2026-02-18 against ^4.0.3 with expo
  ~54.0.9; wrong self-dependencies, missing "Embed Watch Content" phase,
  stale references; reporter shipped a patch-package workaround for
  `with-xcode-changes.js`; issue is CLOSED, but whether the fix landed in
  4.0.7 is UNVERIFIED (changelog not fetched). It "particularly affects EAS
  build pipelines, where prebuild runs automatically."

### 4.4 EAS Build multi-target support

- Official mechanism (docs.expo.dev/build-reference/app-extensions/, fetched
  2026-07-02): declare extra targets up front via
  `extra.eas.build.experimental.ios.appExtensions` in app.json with
  `targetName`, `bundleIdentifier`, `entitlements` - "makes it possible for
  EAS CLI to know what app extensions exist before the build starts" so
  managed credentials are generated per target; alternatively
  `credentials.json` in multi-target format. The config key is still labelled
  `experimental`. The page "makes no mention of Apple Watch or watchOS
  companion apps specifically."
- History of watch-target friction on EAS: eas-cli issue #795 (opened
  2021-11-25) - watch companion build failed with "No profiles for
  '...watchkitapp.watchkitextension' were found"; closed with PR #821.
  eas-cli issue #2578 (opened 2024-09-19) - same class of error ("No profiles
  for 'xx.watchkitapp' were found"); closed WITHOUT a documented resolution
  in-thread; the reporter was archiving manually outside EAS. Net: EAS can
  sign extra targets via the mechanisms above, but watch targets specifically
  have a trail of provisioning issues and no first-party watch guide -
  first-build friction should be assumed.
- A watch app also means at least one new bundle identifier (e.g.
  `app.volyume.watchkitapp`) with its own App ID and profiles, mirroring what
  the live-activity README already describes for the widget
  (modules/live-activity/ios/widget/README.md:70-77).

---

## 5. Minimal v1 inputs (competitive shapes)

### 5.1 In-repo competitive evidence (docs/)

- docs/hevy-teardown-2026-06-29/10-health-wearables-widgets.md:
  - Hevy ships BOTH watch platforms; Volyume has "None" (:22-23).
  - Hevy Apple Watch: "log a workout on the watch, HR during workout,
    complications" (:23); "logs workouts standalone and records real HR (avg
    + max) per set, which the phone reads back via HealthKit" (:49-50).
  - Hevy Wear OS transport is small: "a MessageClient + listener service"
    (`WearListenerService`, path prefix `/workout-started`) (:37-44, :142-143).
  - The doc's own framing: a watch app "conflicts with two architecture
    rules" (never eject; native modules via config plugins only) and "is a
    founder decision, not a build task", with options (a) scoped native-target
    exception, (b) minimal Wear OS tile first, (c) stay passive (:135-144).
- docs/hevy-teardown-2026-06-29/_PARITY-SCORECARD-AND-BACKLOG.md:79-80 - watch
  app listed under GATED: "biggest functional gap; conflicts with
  Expo-managed / never-eject; needs native targets."
- docs/ultimate-audit-2026-06-13/pass3-missing-features.md:9,17 - MF-2:
  standalone watch app "CONFIRMED NO"; open question Q-MF2 is a founder call.
  (Its `lib/watch/bridge.js` citation is stale - file absent, see 3.3.)

### 5.2 Web shapes (fetched 2026-07-02)

- Hevy watch v1 shape (hevyapp.com/features/, App Store listing
  apps.apple.com id1458862350, findyouredge.app "Best Strength Training Apps
  for Apple Watch in 2026"): companion app - start routines from the watch,
  log sets with previous weights shown, rest timer with haptic feedback, HR
  from the watch appears in workout details afterwards, live sync with the
  phone mid-workout. The 2026 round-up lists Strong/Gymaholic/Edge as
  phone-free capable and NOT Hevy, i.e. Hevy's watch app is paired-companion
  in practice.
- MacroFactor (nutrition comparator): announced/shipped a watch app around
  Sept 2025 (macrofactorapp.com/apple-watch/; macrofactor.com/mm-sept-2025/)
  - voice food logging, haptics, complications as gauges/progress rings for
  calories/macros/key micronutrients, scrollable day timeline, tap-to-log
  serving/quantity selector. No workout session component claimed.

---

## 6. Effort inputs (facts the estimate must price in)

1. New artefact class: separate watchOS app target (+ its own bundle id,
   entitlements, provisioning), not an Expo module - unprecedented in this
   repo (4.2). The nearest precedent (live-activity widget target) was
   specified but never materialised (4.2).
2. All watch UI/logic is native SwiftUI - "React Native does not support
   watchOS" (4.3). Today the repo contains ~1 Swift file compiled into any
   build (LiveActivityModule.swift); the widget Swift files are dormant.
3. Phone-watch transport is WatchConnectivity + App Groups;
   `WCSession.isReachable` requires the RN app running (4.3). The
   phone-side commit path (`applyRemoteSetEvent`) and its idempotency
   snapshot already exist and are test-pinned, with one known low-severity
   defect (SD-11) to fix before real watch traffic (3.3).
4. Rest timer state is a single epoch-ms anchor (`restTimerEndsAt`) plus
   duration - trivially serialisable to a watch (3.1); session state is
   already snapshotted in one JSON blob per mutation (3.2).
5. Path 2 (HKWorkoutSession) pulls in: HealthKit entitlement, share
   authorisation for workoutType, both NSHealth* strings, workout-processing
   background mode, and App Review 5.1.3/2.5.1 exposure (2.1-2.3) - all of
   which the app currently has none of (2.4).
6. Path 1 (no HealthKit) is bounded by: ~2-minute frontmost window, no
   fitness-eligible extended runtime type, wrist-down suspension, and the
   local-notification haptic workaround with unverified watch-routing
   guarantees (1.1).
7. EAS: experimental-but-official multi-target credential support; watch
   targets specifically carry a history of provisioning failures (795, 2578)
   and a Feb-2026 prebuild wiring bug in the main config plugin whose current
   fix status is UNVERIFIED (4.3-4.4).
8. Founder testing constraint (CLAUDE.md, workflow rules): physical-device
   testing via EAS builds only, no simulator - a watch feature additionally
   requires a paired physical Apple Watch for every device-walk. Whether the
   founder owns one: UNVERIFIED.
