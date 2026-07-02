# iOS Live Activity viability audit — rest timer

Date: 2026-07-02 | Status: **PENDING FOUNDER APPROVAL** (P4 PART B step 1)
Read-only audit of `modules/live-activity` assuming nothing works until proven.
Source of prior plan: `docs/LIVE_ACTIVITY_IOS.md` (read in full, reconciled below).

---

## 1. Current-state truth

### 1.1 What exists on disk (all files read)

- `modules/live-activity/expo-module.config.json` — declares `ios.modules: ["LiveActivityModule"]`, platforms `["ios"]`.
- `modules/live-activity/package.json` — private local module, `main: index.ts`, wired via `"live-activity": "file:./modules/live-activity"` (root `package.json:88`).
- `modules/live-activity/index.ts` — JS API: `isAvailable()`, `startRestActivity({exerciseName, workoutName?, setNumber?, totalSets?, endTimeMs})`, `updateRestActivity({endTimeMs})`, `endRestActivity()`, `endAllActivities()`. Single-activity discipline (starts end the previous one); every method no-ops safely when the native module is absent.
- `modules/live-activity/ios/LiveActivityModule.swift` — Expo module bridging to ActivityKit: `Activity.request(attributes:contentState:pushType: nil)`, `activity.update(using:)`, `activity.end(dismissalPolicy: .immediate)`, `endAll`. Every call wrapped in `if #available(iOS 16.1, *)` plus `ActivityAuthorizationInfo().areActivitiesEnabled`. Includes the audit-2026-07-01 guard rejecting non-finite or already-past `endTimeMs`.
- `modules/live-activity/ios/widget/VolyumeRestTimerAttributes.swift` — correct `ActivityAttributes` split: static (exerciseName, workoutName) vs `ContentState` (endTime, setNumber, totalSets), Codable + Hashable.
- `modules/live-activity/ios/widget/VolyumeRestTimerLiveActivity.swift` — full `ActivityConfiguration` widget: lock-screen card, Dynamic Island expanded/compact/minimal, `Text(timerInterval:countsDown:)` system-rendered countdown, `volyumeSafeRestRange()` clamp preventing the ClosedRange trap (Sentry VOLYUME-1K).
- `modules/live-activity/ios/widget/VolyumeWidgetBundle.swift` — `@main WidgetBundle`.
- `modules/live-activity/ios/widget/README.md` — manual Xcode target instructions (superseded; see 1.4).

### 1.2 JS callers: NONE

`grep -rn 'live-activity|LiveActivity' src/` matches only a jest mock
(`src/__tests__/screen-mount.test.js:296`). **No production code imports or calls
this module.** Even if the native side worked, nothing would start an Activity.

### 1.3 The module cannot even LINK on iOS: no podspec

`find modules -name '*.podspec'` → no results. Expo local-module autolinking on
iOS discovers modules via a `.podspec` next to `expo-module.config.json`; without
one, CocoaPods never includes `LiveActivityModule.swift` in the app target, so
`requireNativeModule('LiveActivityModule')` throws and `isAvailable()` is false on
every build. (Contrast: `modules/rest-timer-live` is Android-only and has
`android/build.gradle`.) `docs/LIVE_ACTIVITY_IOS.md:18-20` claims "That part
compiles into the app" — **UNVERIFIED and almost certainly false today**; no EAS
iOS build log was available in-repo to confirm either way, but the missing
podspec makes non-linking the expected outcome.

### 1.4 Widget extension target: DOES NOT EXIST

- No `ActivityConfiguration`/`WidgetBundle` anywhere outside `modules/live-activity/ios/widget/`.
- No config plugin (`plugins/`, `config-plugins/` absent), nothing widget-related in `app.json` plugins or `eas.json`.
- `ios/` is gitignored, so a hand-edited Xcode target is not a viable path (LIVE_ACTIVITY_IOS.md §1 confirms; config plugin is the only EAS-viable route).
- Even with linking fixed, without the extension `Activity.request()` throws at runtime (caught, returns nil).

### 1.5 Info.plist and deployment target

- `NSSupportsLiveActivities` is **absent** from `app.json` `ios.infoPlist` (app.json:32-48). The widget README claims app.json covers it — it does not. Without this key, `areActivitiesEnabled` is false and `Activity.request()` fails even with an extension.
- `expo-build-properties` sets `ios.deploymentTarget: "16.0"` (app.json:188). ActivityKit floor is 16.1. The runtime gate correctly lives in BOTH layers already: Swift `#available(iOS 16.1, *)` around every ActivityKit call, and JS `isAvailable()` returning false otherwise. No deployment-target change needed; sub-16.1 devices get a graceful no-op by construction.

### 1.6 Push / update budget

`pushType: nil` — no push channel, no push token handling, no remote updates
(correct for v1: no server exists to send them). Updates are local-only and occur
solely when the end time changes (±15/30s adjustments); the per-second countdown
is rendered by the system via `Text(timerInterval:)` at zero update cost. No
`staleDate` or `relevanceScore` is set (minor polish, not a blocker). ActivityKit's
update budget effectively cannot be exhausted by this design. No budget-handling
code exists, and none is required beyond honesty about the local-only limitation:
if the app is killed mid-rest, the Activity keeps counting down but is never
ended until next launch (`endAllActivities()` is defined for this but never called).

### 1.7 Reconciliation with docs/LIVE_ACTIVITY_IOS.md

The doc (2026-06-09, "SCOPED, NOT BUILT") is accurate on: the missing extension
target, gitignored `ios/`, config-plugin-only path, provisioning prerequisite
(App ID `app.volyume.widget` + Live Activities capability + distribution profile
in EAS credentials, §4), and the file restructure moving `@main` out of the
autolinked `ios/` dir (§2 — prepared and reverted; the restructure has NOT been
applied, files still sit in `ios/widget/`). It omits two facts found here: the
missing podspec and the missing `NSSupportsLiveActivities` app.json entry.

### 1.8 Wall-clock timer state (the wiring source)

`src/store/useAppStore.js:1405-1475`: rest timer is anchored to
`restTimerEndsAt` (epoch ms). Actions: `startRestTimer(duration)` (line 1417),
`stopRestTimer()` (1433), `addRestTime(seconds)` (1440), `tickRestTimer()`
natural expiry (1460-ish); session restore re-hydrates from a snapshot
(lines 1345-1350). Each already lazy-requires `notifications/restEnd` best-effort —
the exact pattern the Live Activity calls should mirror.

---

## 2. Concrete missing pieces (nothing works until ALL exist)

1. **Podspec** for the local module (`modules/live-activity/ios/LiveActivity.podspec` or equivalent) so Expo autolinking compiles the bridge into the app target at all.
2. **File restructure** per LIVE_ACTIVITY_IOS.md §2: attributes up into `ios/`; `@main` bundle + widget view out of `ios/` into `modules/live-activity/widget/` so autolinking can never pull `@main` into the app pod.
3. **Config plugin** (`plugins/withVolyumeWidget.js`, `@expo/config-plugins`, no new dependency): create `VolyumeWidget` extension target (product type app-extension, bundle id `app.volyume.widget`, deployment target 16.1), compile the three Swift files, Info.plist with `NSExtensionPointIdentifier = com.apple.widgetkit-extension` + `NSSupportsLiveActivities`, embed `.appex`, target dependency, idempotent on re-prebuild.
4. **`NSSupportsLiveActivities: true`** in `app.json` `ios.infoPlist` (main app target).
5. **Founder provisioning** (blocking, manual): App ID `app.volyume.widget` with Live Activities capability + distribution profile in EAS credentials — else the first build fails at signing (LIVE_ACTIVITY_IOS.md §4-5; provision BEFORE spending a build credit).
6. **JS wiring** — currently zero call sites (see step-2 plan).
7. Verification is EAS-build-only: no Linux-side compile check for Swift/pbxproj; budget 1-2 iOS build credits.

---

## 3. STEP-2 build plan skeleton (after founder approval)

Driven entirely by the existing wall-clock state; fire-and-forget, best-effort,
never blocking the in-app timer (matches the `restEnd` notification pattern).

1. **Start** — in `startRestTimer` (useAppStore.js:1417), after computing `endsAt`: lazy-require `live-activity`, `startRestActivity({ exerciseName, workoutName, setNumber, totalSets, endTimeMs: endsAt })`, wrapped `try {} catch (_) {}`. Exercise/set context sourced from the active-workout state the caller already holds.
2. **Update** — in `addRestTime` (1440): `updateRestActivity({ endTimeMs: nextEndsAt })`.
3. **End** — in `stopRestTimer` (1433, covers skip and set-complete paths that stop the timer), and on natural expiry in `tickRestTimer` (`expired === true` branch): `endRestActivity()`. On app launch: one `endAllActivities()` to clear stale Activities from a killed session.
4. **Sub-16.1 / Android / Expo Go graceful no-op** — already guaranteed by `isAvailable()` + `#available(iOS 16.1, *)`; add a regression test pinning that every call site tolerates module absence.
5. **Reduce Motion** — the countdown is system-rendered text (`Text(timerInterval:)`), not app animation; the system honours accessibility settings. No custom animation is added; note this in the delivery checklist rather than adding code.
6. **Update-budget honesty** — local updates only, and only on user end-time changes; per-second ticking is free (system-rendered). Limitation stated plainly in code comments and the device checklist: no push channel, so a force-killed app leaves the Activity to count to 0:00 and be cleared on next launch (or by the system after its own timeout).
7. **Device checklist (physical iPhone, EAS build)** — start rest with phone locked → Activity appears; +30s → countdown jumps; skip rest → Activity dismisses; natural expiry → dismisses; Dynamic Island compact/expanded on a Pro device; Settings toggle off → silent no-op; iOS 16.0 device (if available) → no crash, no Activity.

Not in scope (per LIVE_ACTIVITY_IOS.md §6): home-screen widgets, iOS 17
interactive buttons, push-driven updates.
