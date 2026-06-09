# iOS Live Activity (rest timer) — implementation handoff

Status: SCOPED, NOT BUILT | Date: 2026-06-09 | Picks up in the next session.

The rest-timer Live Activity (lock screen + Dynamic Island countdown) is
fully written in SwiftUI but does not appear on iOS yet, because it needs a
Widget Extension target that is not in the build. This doc is the plan to
finish it. Read it before touching `modules/live-activity/`.

The founder chose "build it now" for this. It was paused only because the
container kept rolling back (see `CURRENT_STATUS.md` § 0) and the session was
abandoned for a fresh one.

---

## 1. Why it does not work today

- `modules/live-activity` is an Expo local native module. `LiveActivityModule`
  (the JS bridge, `ios/LiveActivityModule.swift`) calls ActivityKit
  `Activity.request/update/end`. That part compiles into the app.
- Apple requires a **Widget Extension** target to *render* any Live Activity.
  The app target alone cannot host one. That target does not exist, so
  `Activity.request()` throws (caught) and nothing shows. The JS layer
  no-ops, which is why iOS looks silent while Android's `rest-timer-live`
  chronometer works.
- `ios/` is **gitignored** (`/ios/`, `/android/`), so "add the target in
  Xcode and commit `ios/`" is NOT viable. The only EAS-viable path is a
  **config plugin** that recreates the target on every `expo prebuild`.

## 2. File layout (do the restructure first)

The three SwiftUI sources already exist. The restructure below keeps the
`@main` widget bundle OUT of the autolinked module `ios/` dir, so Expo
autolinking can never compile it into the app target (a `@main` in the app
pod is a duplicate-entry link error). It was prepared this session and
reverted on the stop. Redo it:

```
# shared attributes -> up into the autolinked ios/ dir (app module needs it)
git mv modules/live-activity/ios/widget/VolyumeRestTimerAttributes.swift \
       modules/live-activity/ios/VolyumeRestTimerAttributes.swift
# widget-only files (incl. @main bundle) -> OUT of ios/, not autolinked
git mv modules/live-activity/ios/widget/VolyumeRestTimerLiveActivity.swift \
       modules/live-activity/widget/VolyumeRestTimerLiveActivity.swift
git mv modules/live-activity/ios/widget/VolyumeWidgetBundle.swift \
       modules/live-activity/widget/VolyumeWidgetBundle.swift
git mv modules/live-activity/ios/widget/README.md \
       modules/live-activity/widget/README.md
```

Resulting layout:
- `modules/live-activity/ios/LiveActivityModule.swift` — app module (bridge).
- `modules/live-activity/ios/VolyumeRestTimerAttributes.swift` — shared
  attributes, in the app module (so the bridge compiles) AND copied into the
  widget target by the plugin.
- `modules/live-activity/widget/VolyumeRestTimerLiveActivity.swift` — widget
  target only.
- `modules/live-activity/widget/VolyumeWidgetBundle.swift` — `@main`, widget
  target only.

Note on the shared type: the app module and the widget are separate Swift
modules, so each compiles its own copy of `VolyumeRestTimerAttributes`.
ActivityKit matches the running Activity to the widget by the attributes
type NAME and its Codable shape, not strict cross-module identity, so two
identical definitions named `VolyumeRestTimerAttributes` work. This is the
standard "same file in both targets" pattern.

## 3. The config plugin (to write)

`plugins/withVolyumeWidget.js`, wired into `app.json` `plugins`. Decision
this session: a self-contained plugin using Expo's bundled
`@expo/config-plugins` (no new dependency, safer for a launching app and the
flaky container). `@bacons/apple-targets` is the battle-tested alternative if
the hand-rolled pbxproj work proves fiddly; switching is a judgement call on
the next attempt.

The plugin must, via `withXcodeProject`:
1. Create `ios/VolyumeWidget/` and copy in the two widget files, the shared
   attributes file, an `Info.plist` (with `NSExtensionPointIdentifier =
   com.apple.widgetkit-extension`, `NSSupportsLiveActivities = YES`), and
   any required assets.
2. Add a `PBXNativeTarget` of product type
   `com.apple.product-type.app-extension`, product name `VolyumeWidget`,
   bundle id `app.volyume.widget`, deployment target 16.1, Swift 5.
3. Sources build phase: the three swift files (attributes +
   live-activity + bundle).
4. Embed the `.appex` into the main app target (a `PBXCopyFilesBuildPhase`,
   "Embed App Extensions", `dstSubfolderSpec 13`) and add a target
   dependency app -> widget.
5. Make it idempotent (guard against duplicate targets on re-prebuild).

Verify by reading the generated `ios/` after `expo prebuild --platform ios`,
then by an EAS build (the only true check; needs a Mac `pod install` +
Xcode, which no Linux container can do).

## 4. Mandatory founder provisioning (no build signs without it)

A Widget Extension is a separate app identity. Before any EAS build can sign
it:
1. App Store Connect / Apple Developer → Identifiers → new App ID
   `app.volyume.widget`, with the **Live Activities** capability.
2. A matching **distribution provisioning profile** for that bundle id,
   registered in the project's EAS credentials so
   `eas build --profile production` signs the extension.
   - EAS *may* auto-create this from the ASC API key during the build; try a
     build first and fall back to manual if EAS cannot (the same capability-
     persistence limitation that bit Associated Domains, per
     `BUILD_RELEASE_HANDOFF_2026-06-05.md`, may recur here).

Until this exists, an iOS build that includes the widget target fails at
signing. So either provision first, or ship iOS WITHOUT the widget (the app
builds fine without it) and add the widget once provisioned.

## 5. Build + verify loop

- Each EAS iOS build spends a credit; budget for 1-2 iterations on the
  pbxproj plugin.
- `build-ios.yml` auto-triggers on push to `main` (config/plugin changes are
  NOT in `paths-ignore`), and the webhook is flaky, so a build is often
  started by hand from Actions. Provision the widget App ID BEFORE running
  the first build so the credit is not spent on a guaranteed signing
  failure.

## 6. Out of scope for now (from the widget README)

- Home-screen widgets (next workout, weekly volume): the bundle can host
  them later.
- Interactive Live Activity buttons (iOS 17 App Intents): a follow-up.
