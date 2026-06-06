# Phase 10a: Codebase fixes required (by severity)

Status: COMPLETE (audit). Date 2026-06-06. No fixes implemented yet (awaiting
go-ahead per the checkpoint). Items already staged this session are marked.

## CRITICAL (submission blockers)

### C1. iOS purchase UI is a dead StoreKit call (3.1.1 / 2.1)
- Where: `App.js` (`tryWireRealProvider`), `src/components/ProGate.js`,
  `src/screens/CascadeGateScreen.js`, `src/screens/PaywallScreen.js`,
  `src/screens/SubscriptionScreen.js`.
- Fix (Option A, recommended, small): while `PRO_BETA_ACTIVE`, do not wire the
  IAP provider on iOS and hide/disable every purchase + restore CTA on iOS, so
  no broken StoreKit call is reachable. App stays fully usable (Pro is free).
- Fix (Option B, large): implement StoreKit 2 provider + Apple receipt validation
  + App Store Server Notifications (separate project, see Phase 4).

### C2. Sign in with Apple is non-native with a non-compliant button (4.8)
- Where: `src/lib/supabase.js` (`signInWithApple`), `src/components/auth/
  OAuthButtons.js`.
- Fix: add `expo-apple-authentication` + `applesignin` entitlement; use the
  official Apple button on iOS; `signInAsync` then Supabase
  `signInWithIdToken({ provider: 'apple' })`; keep web OAuth as the non-iOS
  fallback. (See Phase 5.) If deferring native, at minimum verify the Supabase
  Apple web flow works and swap to a compliant Apple button.

## HIGH

### H1. App Store screenshots (Phase 8) — asset production, not code. Manual.

## MEDIUM

### M1. Add app-level `PrivacyInfo.xcprivacy` via `app.json` `ios.privacyManifests`
(UserDefaults reason CA92.1 + declared data types). Phase 2.

### M2. Chart/visualisation `accessibilityLabel`s (volume grid, PR sparkline, body
diagram, MacroRings). Phase 7.

### M3. Dynamic Type decision: allow body-text font scaling or confirm layouts
tolerate the largest accessibility text size. Phase 7.

## LOW
- L1 "not medical advice" disclaimer in onboarding/coach.
- L2 reconsider unused permission strings before PUBLIC review (location strip via
  vision-camera `enableLocation:false`; expo-av -> expo-audio for mic).
- L3 confirm production `aps-environment` on the store build.
- L4 tighten `remote-notification` background mode if push is deferred.
- L5/L6 device verification of Share Card image decode + long-list windowing.
- L7 hide decorative icons from VoiceOver.
- L8 muted text contrast (#727272) below 4.5:1 for small text.
- L9 verify 44x44 minimum on icon-only controls/chips.

## Already done this session
- ITMS-90683 purpose strings (location/mic/Face ID) added to `app.json` (staged).
- Associated Domains removed (was unbuildable via ASC key; sign-in unaffected).
- Sentry source-map upload disabled for the EAS build (`eas.json`).
- Android `versionCode` -> 10.
- Share Card export aligned to the in-app preview.

## Order of implementation (when approved)
C1 (Option A) -> C2 -> M1 -> M2/M3 -> L items. C1+C2 are the only true blockers
for a beta/free iOS submission; everything else is quality or manual.
