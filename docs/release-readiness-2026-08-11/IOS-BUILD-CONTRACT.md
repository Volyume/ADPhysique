# Campaign 7 — WS-5 (iOS half): config contract + Mac/device gate

**No iOS compile was performed and none is claimed.** This environment
is Linux with no Xcode; iOS buildability is a **BUILD GATE** that must
be cleared on a Mac or by an EAS production build. What follows is what
WAS verified — the generated native configuration from current main —
plus the exact gate steps.

## Verified from the generated iOS project (`expo prebuild --platform ios`)

| Item | Value | Verdict |
|---|---|---|
| Bundle identifier | `app.volyume` | PASS (single production identity) |
| Deployment target | iOS 16.0 (expo-build-properties) | PASS |
| New architecture | `RCTNewArchEnabled: true` | Matches Android |
| Short version / build | 1.2.0 / 10 — note the build number is **inert**: `eas.json` uses `appVersionSource: remote` + `autoIncrement`, and real builds are already at 40+ | Recorded (About screen now reads the true native build) |
| ATS | `NSAllowsArbitraryLoads: false` | PASS — no cleartext |
| **Associated domains** | `applinks:volyume.app` — **added this campaign** | Was MISSING; now present |
| Apple Sign-In | `com.apple.developer.applesignin: Default` | PASS |
| Push | `aps-environment: development` in the generated file; EAS rewrites to `production` at archive time | Expected; verify on a real TestFlight build |
| Camera string | now names barcodes, nutrition labels **and** progress photos (plugin string was overriding the fuller one) | Fixed this campaign |
| Photo strings | add/usage descriptions present (share-card save) | PASS |
| Face ID / Motion / Location / Microphone strings | present, with the "never requested" honesty wording on the two library-forced entries | PASS |
| Background modes | `fetch`, `remote-notification` | See gate item 5 |
| Live Activities | `NSSupportsLiveActivities: true` **but** the widget config plugin is not in the plugins array and its absence is deliberately pinned (unprovisioned) | **Parity gap — iOS Live Activity is NOT shipped**; the plist flag is inert |
| Privacy manifest | `NSPrivacyAccessedAPICategoryUserDefaults` / CA92.1 declared | Present; SDK-bundled manifests ride along |
| Entitlements not present | HealthKit, keychain sharing, extra capabilities | PASS — no excess entitlements |

## Mac / EAS build gate — exact steps

1. `npx expo prebuild --platform ios --clean` then `pod install`, or run
   `eas build --profile production --platform ios`.
2. **Confirm the archive succeeds.** Historic risk on this app:
   `react-native-ios-utilities` caused a Fabric start-up crash
   (Sentry VOLYUME-1X, build 40) and is patched via
   `react-native.config.js` — verify that patch still holds under the
   current dependency set.
3. **Confirm the Xcode/iOS SDK version** used by the EAS image meets
   Apple's current submission minimum (the platform-requirements lane
   records Xcode 26 / iOS 26 SDK as mandatory since 2026-04-28 and
   flags that `eas.json` pins no image).
4. **Verify `aps-environment` is `production`** in the archived
   entitlements and that push registration succeeds on TestFlight.
5. **Justify or remove the `fetch` background mode.** If nothing
   actually schedules background fetch, App Review can question it; the
   `remote-notification` mode is used.
6. **Universal Links end-to-end:** with the new entitlement, install a
   TestFlight build and tap a `https://volyume.app/partner/<code>`
   link. It must open the app. This also requires the AASA at
   `https://volyume.app/.well-known/apple-app-site-association` to be
   served (it exists in `public/` with the correct
   `K79JA5JUF8.app.volyume` appID and `/partner/*` path).
7. **Bump `expo.version` before this release** — `runtimeVersion` is
   the appVersion policy and this release changes native config.

## Verdict

**iOS configuration: PASS with the Universal-Links gap now closed in
config.** iOS **compilation and device behaviour remain UNPROVEN in
this environment — BUILD GATE + DEVICE GATE**, with the seven steps
above as the exact clearance path.
