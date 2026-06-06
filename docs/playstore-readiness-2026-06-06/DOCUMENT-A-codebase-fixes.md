# DOCUMENT A — codebase fixes (IMPLEMENTED)

Date: 2026-06-06. Approved by the founder and pushed to `main`. Fixes land in
the **Expo source of truth** (app.json / babel.config.js / package.json /
public) and the **GitHub Actions workflows** (the real Play build pipeline),
never in the gitignored generated `android/`.

Ordering: Critical → High → Medium → Low. There are **no pure-code Critical
blockers**; the one Critical-class item (16 KB) is verify-on-AAB (Document B).

> Incident: the first fix commit added a Babel devDependency to package.json
> without updating package-lock.json, which broke `npm ci` and failed two
> Android builds (`1e2f1f3`, `c7b1344`). Fixed in `b104d50`. Rule learned: any
> package.json dependency change regenerates package-lock.json in the same
> commit. Details in playstore-09-implementation-log.md.

---

## HIGH

### H-1 — assetlinks.json placeholder → DONE (wired into deploy workflow)
- **Files:** `public/.well-known/assetlinks.json`, `.github/workflows/deploy-pages.yml`
- **Was:** single placeholder `REPLACE_WITH_SHA256_OF_UPLOAD_KEY_CERT`, so
  `https://volyume.app` App Links never verified.
- **Done:** file moved to the two-fingerprint shape. The pages-deploy workflow now
  derives the **upload-key SHA-256 automatically** from the existing keystore
  secret (`ANDROID_KEYSTORE_BASE64`) and injects it at deploy time. The **Play
  App Signing SHA-256** is read from a `PLAY_APP_SIGNING_SHA256` repo secret
  (Document B) and injected too. Committed file stays a placeholder template;
  the served file carries real values. No manual file edit, no keytool.

### H-2 — Sentry source maps not uploaded → DONE (wired into build workflow)
- **File:** `.github/workflows/build-android.yml` (the real Play build pipeline,
  NOT eas.json — that was the initial mistake).
- **Was:** `SENTRY_DISABLE_AUTO_UPLOAD: 'true'` hardcoded, so the gradle
  `...SentryUpload...` task was SKIPPED on every build (confirmed in CI logs).
- **Done:** the workflow passes `SENTRY_AUTH_TOKEN` and sets the disable flag to
  `false` when that secret exists, `true` when absent (build never breaks). Maps
  upload automatically once the token secret is set. eas.json also updated for
  any future EAS use.

### H-3 — unused dangerous permissions may survive the merged manifest
- **Source:** generated `AndroidManifest.xml` snapshot shows `RECORD_AUDIO`,
  `SYSTEM_ALERT_WINDOW`, `MODIFY_AUDIO_SETTINGS`, `READ_EXTERNAL_STORAGE`,
  `WRITE_EXTERNAL_STORAGE` — none in app.json's list.
- **Impact:** RECORD_AUDIO + SYSTEM_ALERT_WINDOW draw Play review scrutiny and
  force Data-Safety questions; unused dangerous perms are a rejection risk.
- **Fix:** run a clean prebuild (`npx expo prebuild -p android --clean`), inspect
  the merged manifest, and for any of these that are present AND unused add
  `"blockedPermissions"` under `android` in app.json (Expo strips them via
  `tools:node="remove"`). The snapshot is stale (vision-camera mic is disabled,
  which should already drop RECORD_AUDIO) — **verify on a fresh prebuild first**,
  then block only what survives.

---

## MEDIUM

### M-1 — strip console.* from the production bundle
- **File:** `babel.config.js` (71 `console.*` calls currently ship).
- **Fix:** add `babel-plugin-transform-remove-console` (keep `error`/`warn`)
  guarded to production only, e.g. an `env.production.plugins` entry, placed
  before `react-native-worklets/plugin` (worklets must stay last). Add the
  devDependency. Re-run jest after (some tests assert on console).

### M-2 — set allowBackup=false for a health app (decision)
- **Where:** app.json `android` (Expo supports `allowBackup`).
- **Now:** allowBackup=true with SecureStore excluded from backup.
- **Trade-off:** false is the stronger default for health data and stops
  cloud/adb backup of the SQLite store; it also disables Android Auto Backup for
  the app. **Founder decision** — recommend false. I will not change without sign-off.

### M-3 — ESLint ignores web build artifacts
- **File:** `eslint.config.js` (no ignore for `web/`, `**/.next/**`).
- **Impact:** `npm run lint` reports 834 errors from minified `.next/` bundles;
  masks real signal. The shipped app is already clean.
- **Fix:** add `web/`, `**/.next/**`, `**/node_modules/**` to the ESLint `ignores`.

---

## LOW

- **L-1 — R8/ProGuard (decision):** leave OFF for the first production build
  (Hermes covers JS; enabling risks release-only crashes without a tested
  keep-rule set). Revisit post-launch. No change now unless founder directs.
- **L-2 — explicit cleartext lock:** optionally add
  `usesCleartextTraffic=false` + a `network_security_config.xml` via a config
  plugin. Currently defaults to false at SDK 35; hardening only.
- **L-3 — audit the single `useNativeDriver:false`** site to confirm it's an
  unavoidable layout animation, not an oversight.
- **L-4 — Maestro E2E (fast-follow):** add onboarding / sign-in / training /
  check-in / account-deletion flows. Needs Maestro + a release build to run;
  cannot execute in this environment. Pre-launch report covers the gap for the
  first upload.
- **L-5 — version sync:** `package.json` "version" is 1.1.0 while app.json is
  1.2.0 (cosmetic; app.json drives the build). Align for tidiness.

---

## Explicitly NOT broken (verified — counters the brief's assumptions)
Target SDK 35 ✓ · Hermes on ✓ · AAB configured ✓ · Sentry integrated w/ PII
scrub + session tracking ✓ · tokens in SecureStore (M9) ✓ · no hardcoded
secrets ✓ · no cleartext HTTP ✓ · Supabase env-loaded ✓ · Google Play Billing
(react-native-iap v15), restore + manage-subscription + paywall legal surface
present ✓ · account-deletion in-app path present ✓ · error boundary present ✓ ·
RLS + server-owned tier/payments ✓ · npm-audit vulns are all build-time, none in
runtime ✓. Trial is 14+7 and tiers are Free/Pro (the brief's "28-day" and
"Complete tier" are outdated).
