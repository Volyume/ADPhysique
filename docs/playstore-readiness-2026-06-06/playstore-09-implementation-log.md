# playstore-09 — implementation log

Date: 2026-06-06. HEAD at start: `7a944a5`. Founder approved the full Document-A
H/M/L set, **allowBackup=false** (M-2), and **R8 left OFF** (L-1). All fixes
land in the Expo source of truth, never in the gitignored generated `android/`.

## Changes made

| ID | File | Change |
|----|------|--------|
| M-3 | `eslint.config.js` | Added `web/**` + `**/.next/**` to global ignores. `eslint .` went from 834 errors → 0 (4 pre-existing warnings in tests/simulator remain). |
| M-1 | `babel.config.js` | Switched to `api.cache.using(() => process.env.NODE_ENV)`; in production only, adds `transform-remove-console` (keeps `error`+`warn`). Dev/test keep all console. |
| M-1 | `package.json` | Added `babel-plugin-transform-remove-console ^6.9.4` to devDependencies (EAS `npm install` pulls it; jest runs under NODE_ENV=test so the plugin is never loaded locally). |
| L-5 | `package.json` | `version` 1.1.0 → 1.2.0 (aligns with app.json; app.json still drives the build). |
| M-2 | `app.json` | `android.allowBackup: false` (health-data privacy; SecureStore was already backup-excluded). |
| H-3 | `app.json` | `android.blockedPermissions`: RECORD_AUDIO, MODIFY_AUDIO_SETTINGS, SYSTEM_ALERT_WINDOW. These are NOT injected by any current dependency (verified by grepping node_modules manifests) — they were phantoms in the stale prebuild snapshot. The block is a forward guard + pre-empts Play scrutiny, with zero functional risk. READ/WRITE_EXTERNAL_STORAGE were deliberately NOT blocked: expo-file-system/expo-image inject them and they have legitimate use on API ≤28 (minSdk is 26). |
| L-2 | `app.json` | `expo-build-properties.android.usesCleartextTraffic: false` (explicit; was already the SDK-35 default). |
| H-2 | `eas.json` | Removed `SENTRY_DISABLE_AUTO_UPLOAD: "true"` from the **production** EAS profile so the Sentry Expo plugin uploads Hermes source maps during the real Play build. The GitHub Actions `build-android.yml` keeps its flag (it is an arm64-only compile-validation build, explicitly NOT the Play bundle). **PREREQUISITE — see below.** |
| H-1 | `public/.well-known/assetlinks.json` + README | Restructured to the correct two-fingerprint shape (Play App Signing key + upload key). **Values still placeholders — needs the founder.** |

## L-3 — assessed, NO change (correct as-is)
`src/components/food/MacroRings.js:123` uses `useNativeDriver: false`
legitimately: it attaches a per-frame `addListener` that calls `setDisp`
(React state) to drive a Skia canvas + number count-up. The native driver
forbids JS listeners on the animated value, so `false` is required here. Gated
by `reduceMotion`. No change.

## L-1 — R8/ProGuard: left OFF per founder decision
No change. Hermes ships JS as bytecode; enabling R8 without a tested keep-rule
set risks release-only crashes. Revisit post-launch.

## Validation (actual output)
- `node -e JSON.parse` on app.json / eas.json / assetlinks.json / package.json → all OK.
- `npx tsc --noEmit` → exit 0.
- `npx eslint .` → exit 0 (0 errors; 4 pre-existing tests/simulator warnings).
- `npx eslint src App.js index.js plugins` → exit 0.
- Babel config: NODE_ENV=test → `[worklets]`; NODE_ENV=production → `[transform-remove-console, worklets]`. Verified.
- `npx jest` (full) → **96 failed / 2838 passed**, identical to the pre-existing
  `act()` baseline. **Zero new failures introduced.**

## REQUIRED before the next production build (manual — Document B)
1. **H-2 prerequisite:** set `SENTRY_AUTH_TOKEN` as an EAS project secret
   (`eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value <token>`).
   With auto-upload now enabled and no token, the Sentry gradle step can fail
   the EAS `bundleRelease` task. Set the token first, then build.
2. **H-1 values:** paste the Play App Signing key SHA-256 (and upload key
   SHA-256) into `assetlinks.json`, replacing the two placeholders, then
   redeploy GitHub Pages and re-trigger App Links verification.
3. **M-1 install:** the next `npm install` / EAS build pulls
   `babel-plugin-transform-remove-console`. (Not installed in this audit
   container; the prod-only Babel branch is never exercised by jest.)

## Not changed
No app runtime/source code was modified. All edits are build/config + the
deletion-trust assetlinks file. The trialState billing fix from earlier today
(`7a944a5`) already shipped separately.
