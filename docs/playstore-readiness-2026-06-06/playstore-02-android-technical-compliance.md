# playstore-02 — Android technical compliance

Status: COMPLETE. Date: 2026-06-06. Source of truth = app.json + plugins
(NOT the gitignored generated `android/`). See prework for why.

## Target API / 16 KB page size
- targetSdk 35, compileSdk 35, buildTools 35.0.0 (expo-build-properties). **Meets
  the Aug-2025 API-35 requirement. PASS.** minSdk 26.
- versionCode 11 (app.json), production `autoIncrement: true` (eas.json) — unique
  + incrementing. PASS.
- **16 KB alignment: CANNOT be confirmed from source.** RN 0.81 + Expo 54 ship
  16 KB-aligned core `.so`, and `expo.useLegacyPackaging=false` keeps libs
  uncompressed (the prerequisite). But the third-party native libs each ship
  their own `.so`: react-native-vision-camera, @shopify/react-native-skia,
  react-native-reanimated, react-native-nitro-modules, react-native-health-connect.
  Alignment is a property of the **built AAB**, not the repo. → Document B M-1:
  build the production AAB and run the alignment check before submitting. This is
  the one genuine *silent* blocker and it is unverifiable here.

## Hermes — PASS
`hermesEnabled=true` (gradle.properties) and RN 0.81 defaults Hermes on; app/build.gradle
links `com.facebook.react:hermes-android` when hermesEnabled. JS ships as bytecode.

## R8 / ProGuard — OFF (decision item, not a blocker)
- `enableMinifyInReleaseBuilds` / `enableShrinkResourcesInReleaseBuilds` are not
  set, so release builds are **not** minified/shrunk. Hermes already compiles JS
  to bytecode (the JS layer is not plain-text regardless).
- Generated `proguard-rules.pro` keeps only reanimated + turbomodule. If R8 is
  enabled it would need keep rules for the native modules in use, and enabling it
  risks release-only crashes. **Recommendation: leave OFF for the first
  production build** (lower risk; Hermes covers JS obfuscation; size win is
  modest). Revisit post-launch with a tested keep-rule set. Flagged as Document A
  L-1 (decision), not a fix to make blind.

## Manifest audit (from generated snapshot + app.json)
- `allowBackup`: generated manifest has `allowBackup="true"` with
  `fullBackupContent`/`dataExtractionRules` pointing at expo-secure-store's
  exclusion rules (auth tokens are excluded from backup). For a health app,
  `allowBackup="false"` is the stronger default. → Document A M-2 (decision).
- `usesCleartextTraffic`: not set in the main manifest → defaults **false** at
  targetSdk ≥ 28. Debug manifest sets it true (debug only). No `http://` endpoints
  exist in `src` (grep clean). PASS, though an explicit
  `usesCleartextTraffic=false` + network_security_config would harden it (L-2).
- `debuggable`: not set in release (defaults false for release buildType). PASS.
- **Library-injected permissions** appear in the generated manifest that are NOT
  in app.json and may be unused: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`,
  `MODIFY_AUDIO_SETTINGS`, `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`.
  RECORD_AUDIO and SYSTEM_ALERT_WINDOW draw Play scrutiny and force Data-Safety
  questions. The snapshot is **stale** (vision-camera has `enableMicrophonePermission:false`,
  which should drop RECORD_AUDIO on a fresh prebuild). → Document A H-3: run a
  fresh prebuild, inspect the merged manifest, and add `android.blockedPermissions`
  for any of these that survive and are unused.
- Declared + justified permissions that ARE used: CAMERA (barcode/label scan),
  READ_MEDIA_IMAGES (progress photos), VIBRATE/WAKE_LOCK/FOREGROUND_SERVICE
  (active-workout foreground notification + rest timer), RECEIVE_BOOT_COMPLETED
  (re-arm scheduled notifications), ACTIVITY_RECOGNITION (steps; required
  companion to FOREGROUND_SERVICE_TYPE_HEALTH on Android 14 — confirmed in the
  prior audit, removing it reintroduces a native crash), health.READ_STEPS/
  READ_WEIGHT/WRITE_EXERCISE/WRITE_ACTIVE_CALORIES_BURNED (Health Connect).

## Signing — PASS (EAS + Play App Signing)
No release keystore in the repo (correct). EAS holds the upload key; Play App
Signing is the Play-side requirement and is configured at first upload (Document
B). Submit config present in eas.json.

## Build output — PASS
Production AAB (`buildType: "app-bundle"`).

## HTTPS / cleartext — PASS
No `http://` API calls in `src`. Supabase + Sentry + Expo push are all HTTPS.
Certificate pinning is **not** implemented; for this app profile that is an
accepted trade-off (pinning adds outage risk and Supabase rotates infra). Noted,
not required.

## Sensitive data storage — PASS (M9)
Supabase auth tokens use a SecureStore adapter (`supabase.js:7-17,33`) →
Android Keystore-backed, not AsyncStorage. AsyncStorage holds only low-sensitivity
items (first name, tier flag, first-run flags, Expo push token). Health/training
data is in expo-sqlite, not AsyncStorage. No tokens/passwords in AsyncStorage.

## Background processing — PASS
The only foreground service is the active-workout notification
(`notifications/activeWorkout.js`) with FOREGROUND_SERVICE + the health service
type and ACTIVITY_RECOGNITION companion. No unsupervised background sensor access.
