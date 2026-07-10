> ⚠ STATUS (2026-07-10): SUPERSEDED/CLOSED - do not build from this document. Play Store readiness audit; all Document-A codebase fixes shipped to main, only external Play Console paperwork remains (tracked founder-side in TASKBOARD). Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md. Pre-campaign items require the D37 triage rule before any consideration.

# Volyume — Play Store production readiness: executive summary

Date: 2026-06-06. Repo: `main` @ `7a944a5` (clean, = origin/main). Read-only
audit; **no code changed.** Full evidence in the sibling files; decisions in
DOCUMENT-A (codebase) and DOCUMENT-B (manual).

## Headline
The app is in **strong technical shape** for production. The brief was written
against several assumptions that no longer hold — and the things it feared are
already done: target SDK is 35, Hermes is on, the build is an AAB, Sentry is
wired with PII scrubbing, auth tokens are in the Keystore (not AsyncStorage),
there are no hardcoded secrets and no cleartext HTTP, billing is Google Play
Billing with a working Restore + manage-subscription + legal paywall, and the
in-app account-deletion path exists. The shipped React Native source is 100%
ESLint-clean and TypeScript-clean.

What remains is **not deep code work**. It is: one unverifiable-here build check
(16 KB), a short list of build-config fixes, and the Play Console paperwork that
can only be done in the Console.

## The one architectural fact that governs everything
`android/` is **gitignored and generated** (Expo prebuild). The committed
`android/app/build.gradle` (versionCode 9, debug signing, minify off) is a stale
artifact, not the truth. Every fix lands in `app.json` / `eas.json` /
`babel.config.js` / `plugins` / `public` — editing `android/` does nothing.

## Submission blockers
**Codebase:** none that are pure-code-and-broken.
**Verify-on-build (Critical):**
- **16 KB page-size alignment** of all native `.so` — the one genuine *silent*
  blocker, and it can only be checked on the built AAB (Document B M-1).

**Manual, in Play Console (block approval or block billing):**
- Health Apps Declaration; Data Safety form; Data-deletion URL; Content rating;
  permissions/audience declarations.
- Create `pro_monthly` / `pro_annual` subscriptions + 7-day offers; apply
  migrations 059–066; redeploy the RTDN function; sandbox-purchase test.
- Play App Signing enrolment; then put the real signing SHA-256 into
  `assetlinks.json`.

## Critical / High codebase fixes (Document A)
- **H-1** `assetlinks.json` ships a placeholder cert fingerprint → App Links
  won't verify. Fix once Play App Signing gives the SHA-256.
- **H-2** the production build workflow `build-android.yml` hardcoded
  `SENTRY_DISABLE_AUTO_UPLOAD=true`, so the Sentry upload task was SKIPPED on
  every build (confirmed in CI logs) → prod crashes arrive minified. Fixed in the
  workflow: uploads when `SENTRY_AUTH_TOKEN` secret exists, auto-disables when
  absent. (The real Play build is this GitHub Actions workflow, not EAS.)
- **H-3** unused dangerous permissions (RECORD_AUDIO, SYSTEM_ALERT_WINDOW, …)
  may survive the merged manifest → block them via app.json `blockedPermissions`
  after checking a fresh prebuild.
- **M-1** 71 `console.*` ship in production → add `transform-remove-console`.
- **M-2** `allowBackup=false` for health data (founder decision).
- **M-3** ESLint should ignore `web/.next` (834 artifact errors mask signal).
- Lows: R8 left off by decision, cleartext lock, native-driver check, Maestro
  E2E fast-follow, version-string sync.

## Test + security posture
- Jest: 2838 pass / 96 fail. **Correction 2026-06-06 (later in the day):** the
  earlier "known pre-existing `act()` baseline, not product failures" framing was
  wrong on two counts. (1) Not pre-existing: the suite was fully green (2770
  passing) on 06-03; the 96 failures appeared with the 06-05 Expo SDK 54 / RN
  0.81 / React 19 upgrade. (2) Not all `act()`: the component-render suites fail
  because React 19's `react-test-renderer` no longer flushes `create()` outside
  `act()`, but several other suites fail to load at all under the SDK-54 jest
  setup (`__DEV__ is not defined`, `StyleSheet` undefined), so their tests do not
  run. Main CI has been red on every code commit since 06-05. Critical numeric
  logic (calorie/MET, planEngine, check-in, PR/volume, dayKey) is still tested
  and passes, but **the red suite is a production blocker** under the 2026-06-06
  "all errors cleared" goal, not a benign baseline.
- Security: no critical/high client-side defect; tokens encrypted, RLS
  comprehensive, tier + payments server-authoritative, triple-layer PII scrub.
  npm-audit's 18 findings are all build-time tooling, none in the runtime bundle.

## Confidence
- **Technical build readiness: high**, contingent on the 16 KB AAB check passing.
- **Policy/paperwork readiness: gated on manual Console work** — that, plus
  creating the billing products, is the real remaining surface, not code.
- **Recommended path:** approve Document A fixes (H/M items), build the AAB to
  the **internal track** to get the 16 KB + pre-launch report, do the Console
  paperwork in parallel, then promote.

## Status (updated after implementation)
The founder approved the full Document-A H/M/L set, allowBackup=false, and R8
off. All fixes are implemented and pushed to `main`. Build/config changes land
in the Expo source of truth + the GitHub Actions workflows (the real Play build
pipeline), not the gitignored `android/`.

**Incident, recorded honestly:** the first fix commit (`1e2f1f3`) added a Babel
devDependency without updating `package-lock.json`, which broke `npm ci` and
failed two Android builds. Fixed in `b104d50`; the subsequent build cleared the
install + prebuild steps and proceeded into the gradle compile. H-2 was also
initially edited in the wrong file (eas.json) before being corrected in the
real workflow. Both are detailed in `playstore-09-implementation-log.md`.

**Remaining inputs:** two optional values that live only in the Sentry and Google
Play accounts (`SENTRY_AUTH_TOKEN`, `PLAY_APP_SIGNING_SHA256`). Neither blocks the
build or submission; both degrade gracefully if never set. Everything else is
wired into the workflows.
