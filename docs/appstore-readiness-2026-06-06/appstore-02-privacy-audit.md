# Phase 2: Privacy and permissions

Status: COMPLETE. Date 2026-06-06. Verified against Apple's privacy-manifest
docs and the May 2024 required-reason-API requirement (ITMS-91053).

## Privacy manifest (PrivacyInfo.xcprivacy)
- App-level manifest: NONE generated (confirmed in the prebuilt project).
- Empirical status: Build 6 was ACCEPTED by App Store Connect, so the
  required-reason APIs the app/SDKs touch are currently covered by the
  SDK-bundled manifests that ship inside RN/Expo pods in SDK 54. Not a current
  blocker.
- FINDING-M1 (Medium, recommended): add an app-level `PrivacyInfo.xcprivacy` via
  `app.json` `ios.privacyManifests` declaring at least
  `NSPrivacyAccessedAPICategoryUserDefaults` reason `CA92.1` (the app uses
  AsyncStorage / preferences) plus the data-collection types below. This makes
  the manifest authoritative rather than relying on transitive pod manifests,
  and it must agree with the nutrition labels.

## Permission usage strings (Info.plist)
All present strings are specific and honest (no "required for app functionality"
filler), so they pass 5.1.1 quality:
- Camera, Photo Library (read + add), Health (share + update), Motion: good.
- Added this session for frameworks bundled SDKs link but the app does not use,
  to clear ITMS-90683 (which was a non-blocking warning on Build 6):
  - `NSLocationWhenInUseUsageDescription` (vision-camera links CoreLocation)
  - `NSMicrophoneUsageDescription` (expo-av + vision-camera link the mic API)
  - `NSFaceIDUsageDescription` (expo-secure-store links LocalAuthentication)
  Ruled out: `NSFallDetectionUsageDescription` is referenced only in an
  expo-sensors code comment, not a linked API, so it is not added.
- FINDING-L2 (Low): before public App Store review (not TestFlight), reconsider
  these three. A reviewer may query a fitness app declaring location/mic/Face ID
  it does not use. The honest alternative for location is to strip it via
  vision-camera `enableLocation: false`; for mic, migrate `expo-av` (deprecated
  in SDK 54) playback to `expo-audio` which does not link recording. Out of
  scope for clearing the current warning.

## App Store privacy nutrition labels (manual, App Store Connect)
Source of truth for declarations: `docs/PRIVACY_CONSENT_LOCKED.md`. Declare:
- Health & Fitness: workouts, body weight, steps, nutrition. Linked to identity.
  Purpose: App Functionality. (Special-category, Article 9 consented in-app.)
- Contact Info: email address. Linked. Purpose: App Functionality (account).
- Identifiers: user id. Linked. App Functionality.
- User Content: food diary, exercise history, notes. Linked. App Functionality.
- Usage Data: feature/engagement telemetry (engineTelemetry). Linked. Analytics
  (the app has an analytics opt-out gate, so declare with the opt-out honoured).
- Diagnostics: crash + performance data via Sentry. Linked or not-linked per the
  Sentry config; Sentry scrubs PII (`src/lib/observability/sentryScrub.js`).
- Purchases: subscription status. Linked. App Functionality.
- Location: DO NOT declare. The app does not collect location; the Info.plist
  string exists only for a linked-but-unused framework.

## Third-party SDK privacy
- Supabase (`@supabase/supabase-js`): database + auth. Data processor named in
  the privacy policy. No client SDK privacy-manifest concern (JS).
- Sentry (`@sentry/react-native`): crash + performance. Ships its own privacy
  manifest in-pod. PII scrubbed before send (`sentryScrub.js`). Declared as a
  sub-processor in the policy. Trace sampling lowered to 5%.
- Google OAuth: via Supabase web flow; no Google SDK embedded.
- react-native-iap / vision-camera / react-native-health / expo-*: bundle their
  own privacy manifests in SDK 54 (why Build 6 passed).

## Severity summary
- No privacy blockers. M1 (add app privacy manifest) recommended for
  nutrition-label fidelity; L2 (reconsider unused permission strings before
  public review). Nutrition labels themselves are a manual App Store Connect
  task (Phase 10b), required before the listing goes live.
