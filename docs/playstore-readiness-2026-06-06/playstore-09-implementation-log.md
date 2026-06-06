# playstore-09 — implementation log

Date: 2026-06-06. HEAD at start: `7a944a5`. Founder approved the full Document-A
H/M/L set, **allowBackup=false** (M-2), and **R8 left OFF** (L-1). All fixes
land in the Expo source of truth, never in the gitignored generated `android/`.

## INCIDENT + CORRECTIONS (added after the first push)

Three things were got wrong on the first pass and are corrected below. Recording
them plainly.

1. **I broke the Android build.** Commit `1e2f1f3` added
   `babel-plugin-transform-remove-console` to `package.json` devDependencies but
   did NOT update `package-lock.json`. The build workflow runs `npm ci`, which
   hard-fails on a lockfile/manifest mismatch. Runs for `1e2f1f3` and `c7b1344`
   both went red at step 5 "Install dependencies" (~1s). **Fix:** `b104d50`
   regenerated the lock entry (minimal diff: the one devDependency + the version
   bump). Verified `npm ci --dry-run` exit 0, and the `b104d50` build then passed
   step 5 (Install) and step 10 (Expo Prebuild — which validates the app.json
   changes). Lesson: any `package.json` dependency change must regenerate
   `package-lock.json` in the same commit or `npm ci` fails.

2. **H-2 was fixed in the wrong file first.** I initially edited `eas.json`. The
   real production AAB is built by the **GitHub Actions workflow
   `build-android.yml`** (expo prebuild + gradle bundleRelease + upload-key
   signing), NOT EAS. The Sentry source-map control that matters is the
   `SENTRY_DISABLE_AUTO_UPLOAD: 'true'` hardcoded in that workflow (lines 139,
   307). Corrected in `c7b1344`: the workflow now uploads maps when the
   `SENTRY_AUTH_TOKEN` repo secret is present and auto-disables when absent (so
   the build never breaks). The eas.json edit is harmless and left in place for
   any future EAS use.

3. **I claimed the Sentry token "isn't set" without checking — I could not have
   known that.** The available GitHub tools cannot list Actions secrets, so I
   have no visibility into whether `SENTRY_AUTH_TOKEN` exists. What the CI logs
   DO show (run 27063477423, the last green build before my changes): the Sentry
   gradle plugin runs module collection but the upload task
   `...SentryUpload...` is **SKIPPED** on every build. That was caused by the
   hardcoded `SENTRY_DISABLE_AUTO_UPLOAD='true'`, which is now removed/conditional.
   Whether maps actually upload now depends on the token secret existing — the
   next green build's log will show the `SentryUpload` task as run vs skipped,
   which is the real test. No claim made here about the secret's presence.

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
| H-2 | `.github/workflows/build-android.yml` (`c7b1344`) + `eas.json` (`1e2f1f3`) | The real fix: `build-android.yml` now passes `SENTRY_AUTH_TOKEN` and sets `SENTRY_DISABLE_AUTO_UPLOAD` to `false` when that secret exists, `true` when it doesn't (build never breaks). eas.json edit also kept for future EAS use. Source maps upload once the token secret exists; nothing to run. |
| H-1 | `public/.well-known/assetlinks.json` + README + `.github/workflows/deploy-pages.yml` (`c7b1344`) | File moved to the two-fingerprint shape. The **upload-key SHA-256 is derived automatically in the pages-deploy workflow** from the existing keystore secret (`ANDROID_KEYSTORE_BASE64`) and injected at deploy time. The **Play App Signing key SHA-256** is read from a `PLAY_APP_SIGNING_SHA256` secret. The committed file stays a placeholder template; the served file carries real values. |

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

## Remaining external values (everything else is wired into the workflows)
Nothing here is a command to run. Two values live only inside accounts the repo
has no login to (Sentry, Google Play Console). They are optional for shipping and
each degrades gracefully if never provided:

1. **`SENTRY_AUTH_TOKEN`** (Sentry → Settings → Auth Tokens). Without it, the
   build still succeeds and the app still runs; production crashes just arrive
   minified. With it, the workflow uploads source maps automatically.
2. **`PLAY_APP_SIGNING_SHA256`** (Play Console → App integrity → App signing key
   certificate). Without it, https App Links verify against the upload key only
   (auto-injected); with it, they also verify for Play-Store-signed installs.

Both are repo Actions secrets. The build break (npm ci) and the H-2/H-1 wiring
are done; these two values are the only outstanding inputs and neither blocks
the build, the AAB, or store submission.

## M-1 install note
`babel-plugin-transform-remove-console` is now in `package.json` AND
`package-lock.json` (`b104d50`), so `npm ci` installs it. The prod-only Babel
branch is never exercised by jest (NODE_ENV=test).

## Not changed
No app runtime/source code was modified. All edits are build/config + the
deletion-trust assetlinks file. The trialState billing fix from earlier today
(`7a944a5`) already shipped separately.
