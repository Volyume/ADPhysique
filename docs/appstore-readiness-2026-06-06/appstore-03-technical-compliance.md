# Phase 3: Technical compliance

Status: COMPLETE. Date 2026-06-06. From the prebuilt iOS project + config.

## iOS version and device support
- Deployment target: 16.0 (main app target in `app.json`
  `expo-build-properties`); one pod is 15.1. Well within Apple's accepted range
  for new submissions. PASS.
- Devices: iPhone only (`ios.supportsTablet: false`), portrait
  (`orientation: portrait`, `requireFullScreen: true`). Consistent and declared.
  PASS. Note: iPad not supported, so iPad screenshots are not required.

## React Native specifics
- RN 0.81.5 / Expo SDK 54 / React 19. Current and supported. PASS.
- Hermes: enabled (SDK 54 default, no `jsEngine` override). PASS.
- New Architecture: enabled (`newArchEnabled: true`). Built and accepted (Build
  6), so Fabric/TurboModules are functioning.
- Private API use: none found. No dynamic native code loading / `eval` of remote
  code (the WebView in `ShareCardScreen` runs a static local canvas script with
  `originWhitelist` and no remote URL, which is fine).
- Architecture: arm64 (EAS iOS). The Android free-runner build is arm64-v8a only
  by choice; widen before a real Play production upload (noted in the build
  handoff), not an iOS concern.

## Code signing / provisioning
- Bundle id `app.volyume` matches App Store Connect (App Apple ID 6777083702).
- Signing is EAS-managed via the ASC API key; Build 6 signed and shipped. PASS.
- Entitlements vs capabilities: HealthKit + Push are enabled on the App ID and
  in the profile (Build 6's Xcode error history confirms). Associated Domains was
  removed because the ASC-API-token path could not put it in the profile (see the
  build handoff). No `applesignin` entitlement, consistent with web-OAuth Apple.

## Entitlements audit
- `aps-environment`: `development` in the prebuilt plist; EAS rewrites to
  `production` for App Store export. FINDING-L3 (Low): confirm the store build's
  entitlement is `production` (it will be for a TestFlight/App Store export);
  remote push also needs the APNs key (not set up; Phase 9).
- HealthKit: present and used (`react-native-health`). Justified.
- No unused entitlements present (clean).

## App Transport Security
- Generated `Info.plist`: `NSAllowsArbitraryLoads = false`,
  `NSAllowsLocalNetworking = true`, no per-domain exceptions. Every backend call
  is HTTPS (Supabase). PASS, clean. No HTTP calls found in the app data path.

## URL schemes and links
- `CFBundleURLSchemes` includes `volyume` (custom scheme for auth redirect and
  in-app deep links). Registered and handled (`App.js handleAuthDeepLink`).
- Universal Links: removed this session (no `applinks`), so no
  apple-app-site-association file is needed for iOS right now.

## Background modes
- `UIBackgroundModes: [fetch, remote-notification]`. `fetch` is used by the
  sync/health catch-up on foreground/background; `remote-notification` pairs with
  push. FINDING-L4 (Low): if remote push is not enabled for v1 (APNs key absent),
  `remote-notification` is declared-but-dormant. Harmless, but tighten to match
  actual use before public review if push is deferred.

## Third-party frameworks
- No jailbreak-detection-bypass, ad-fraud, or prohibited frameworks. vision-camera,
  react-native-health, Sentry, Supabase, react-native-iap, expo-* are all
  App-Store-safe. `npm`/pod install resolves (Build 6 compiled).

## Severity summary
No technical blockers. L3 (confirm production aps-environment + APNs), L4
(background-mode tightening if push deferred). Everything else passes.
