# Pre-work: current iOS state of record

Status: COMPLETE. Date 2026-06-06. Method: read of repo + `expo prebuild
--platform ios --no-install` generated project (the real artifacts Apple
receives), since this is an Expo managed app with no committed `ios/` tree.

## Project shape
- Expo SDK ~54.0.35, React Native 0.81.5, React 19. New Architecture enabled
  (`app.json` `newArchEnabled: true`). JS engine: Hermes (SDK 54 default; no
  `jsEngine` override, so Hermes).
- Managed workflow: no committed `ios/`, `Info.plist`, `*.entitlements`,
  `Podfile`, or `AppDelegate`. Source of truth is `app.json` + config plugins
  (`plugins/withHealthConnectPermissionDelegate.js`,
  `plugins/withEdgeToEdgeOptOut.js`) + two local native modules
  (`modules/live-activity`, `modules/rest-timer-live`).

## Identity / versions
- Bundle id: `app.volyume` (iOS + Android share it).
- Marketing version: `1.1.1` (`app.json` `version`).
- iOS build number: `5` in `app.json`; EAS `production` profile has
  `autoIncrement: true`, so EAS owns the real number (last accepted was Build 6,
  App Store Connect App Apple ID `6777083702`).
- Android `versionCode`: `10` (bumped this session from 9).

## Permissions (generated `Info.plist`)
Present and specific: `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`,
`NSPhotoLibraryAddUsageDescription`, `NSHealthShareUsageDescription`,
`NSHealthUpdateUsageDescription`, `NSMotionUsageDescription`,
`ITSAppUsesNonExemptEncryption=false`, `UIBackgroundModes=[fetch,
remote-notification]`, Live Activities keys.
Added this session (staged): `NSLocationWhenInUseUsageDescription`,
`NSMicrophoneUsageDescription`, `NSFaceIDUsageDescription` (see Phase 2).

## Entitlements (generated `Volyume.entitlements`)
- `aps-environment` = `development` (EAS sets production for store export).
- `com.apple.developer.healthkit` = true, `healthkit.access` = empty array.
- No `com.apple.developer.applesignin` (consistent with web-OAuth Apple sign-in).
- No Associated Domains (removed this session; was unbuildable via ASC key).

## Privacy manifest
No app-level `PrivacyInfo.xcprivacy` is generated. Build 6 was still accepted,
so the SDK-bundled manifests cover the required-reason APIs at present.

## SDKs of note (`package.json`)
`@sentry/react-native` (crash + telemetry), `@supabase/supabase-js` (auth + DB),
`react-native-iap` (payments, Google-only wiring), `react-native-vision-camera`
(scanner + photos, links CoreLocation/mic unused), `react-native-health`
(HealthKit), `expo-av` (timer sounds, links mic unused), `expo-secure-store`
(token store, links LocalAuthentication unused), `expo-notifications`,
`expo-sensors` (shake gesture).

## Payments / auth posture
- Payments: Google Play Billing only (`src/lib/payments/playBilling.js`); no
  StoreKit path. Pro is free during beta (`PRO_BETA_ACTIVE = true`,
  `src/lib/proGate.js`).
- Auth: email/password + Google OAuth + Apple OAuth, all via Supabase web OAuth
  (`src/lib/supabase.js`). Apple is web OAuth, not native.

## Deep links
Custom scheme `volyume://` (auth redirect, `src/lib/supabase.js`
`OAUTH_REDIRECT_URL`). Universal links removed this session.

## Strategy context (critical)
`docs/SUBSCRIPTION_AND_PAYMENT_LOCKED.md` lines 35-38, 193: iOS was deliberately
deferred under the Android-first locked decision. StoreKit IAP and native Apple
Sign-In were never built; this audit measures the gap to reverse that.
