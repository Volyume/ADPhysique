# P11 - Maestro end-to-end testing proposal (DRAFT for founder approval)

> Status: PROPOSAL ONLY. Nothing here is built. This document assesses
> feasibility, blockers, runner cost and cadence for five end-to-end flows.
> Every technical claim carries a `file:line` reference or a dated web source.
> Items that could not be verified from the repo or a reachable source are
> marked UNVERIFIED.
>
> Author: research agent. Date: 2026-07-02. Scope: Android first (Google Play
> is the live surface; iOS is TestFlight-only).

---

## 0. What Maestro is, and why it fits (or does not)

Maestro is a YAML-driven mobile UI test runner. Flows are lists of commands
(`tapOn`, `inputText`, `assertVisible`, `launchApp`, `stopApp`, `pressKey`,
`openLink`). Local runs against a device or emulator are free and open source;
the hosted device cloud is a paid concurrency subscription (see cost table in
section 6). Source: maestro.dev/pricing, fetched 2026-07-02.

Maestro drives the app through its accessibility tree. Our screens already
carry `accessibilityLabel` / `accessibilityRole` in the surfaces we care about
(for example the consent checkbox at
`src/screens/Article9ConsentScreen.js:212-214`, the barcode close/torch buttons
at `src/screens/ScanBarcodeScreen.js:155-219`), which gives Maestro stable
selectors without needing new testIDs everywhere. Where a flow lacks a stable
selector we would add `testID`s as a small, additive, test-only change.

The five flows below split cleanly into "drivable today", "drivable with a
test-only seam", and "blocked by device reality (OAuth, camera, Play sandbox)".

---

## 1. Fresh-install onboarding to first plan

**What drives it in-app.** Auth is OAuth-only: Apple + Google, no email/password
(CLAUDE.md section 1; the removal is dated 2026-07-01). Sign-in is initiated
from the welcome/upgrade surfaces via a native OAuth provider call
(`src/screens/ProUpgradeScreen.js:238-273`, `ProUpgrade.oauth.begin`). After a
session exists, RootNavigator routes signed-in users with no consent to the
Article 9 gate, then first-run/tier (`src/navigation/RootNavigator.js:1346`,
`:1367-1374`). Consent + trial start happen together on the Article 9 screen
(`src/screens/Article9ConsentScreen.js:70-155`).

**The blocker: real OAuth in an emulator.** Google/Apple OAuth opens a system
browser / provider flow that Maestro cannot reliably script, and Google's
consent screen actively resists automation. There is **no `__DEV__` auth
shortcut, no mock session, and no test-login** in the product code. The only
tier override that ever existed, `PRO_BETA_ACTIVE`, is hard-`false` and does
NOT bypass auth (`src/lib/proGate.js:28`); it only forced tier to `pro` for
already-signed-in users, and it is off. So onboarding is **NOT drivable through
the real OAuth UI in CI.**

**The one seam that exists.** `App.js` deep-link handling accepts a Supabase
*implicit-flow* session injected by URL: `volyume://#access_token=...&refresh_token=...`
is passed straight to `supabase.auth.setSession(...)`
(`App.js:240-259`), and there is also a PKCE `?code=` path (`App.js:229-238`).
RootNavigator's `onAuthStateChange` then routes the now-signed-in user with no
further taps. This means a CI **setup step** could mint a real session for a
disposable Supabase test user (via the Supabase Admin API / a server-side token
grant, done outside the app), then Maestro's `openLink` fires the
`volyume://#access_token=...` deep link to establish the session without ever
touching Google's UI. From there the Article 9 consent tap, onboarding fields
and first-plan generation are ordinary drivable taps.

- Feasibility: **onboarding-after-auth is fully drivable; the OAuth UI itself is not.**
- Recommended approach: inject a real session via the documented deep-link seam
  (no product change), keeping OAuth-UI coverage as a manual pre-release check.
- Honest caveat (UNVERIFIED): whether the current Supabase project config
  permits server-side session minting for a test user needs a founder/back-end
  confirmation. If it does not, onboarding stays a manual flow.
- ED-safety note: onboarding writes biological sex and body metrics that feed
  the engine floors. Any test fixture user must use realistic values so the
  calorie-floor / FFM-floor guardrails are never exercised with junk data.

---

## 2. Log a complete workout, including backgrounding mid-session

**What drives it.** Home's hero card is the single start surface. "Start workout"
calls `startWorkout(...)` then navigates to `ActiveWorkout`
(`src/screens/HomeScreen.js:988-991`, blank session at `:1024-1025`); an
in-progress session shows a "resume" hero that navigates to `ActiveWorkout`
(`:1488-1491`). Logging sets, adding exercises and finishing are all standard
taps and text entry against the active-workout screen.

**Backgrounding is scriptable.** Maestro supports `pressKey` and `stopApp`
(given in the brief). `pressKey: Home` backgrounds the app; `launchApp` (without
`clearState`) foregrounds it with state intact. This is exactly the lifecycle
the app is built to survive: backgrounding triggers a sync flush and widget
snapshot (`App.js:748-770`), and cold-boot restores an interrupted workout via
`restoreActiveWorkout(user.id)` (`src/screens/HomeScreen.js:113`). So a flow of
"start -> log two sets -> `pressKey: Home` -> `launchApp` -> assert the session
resumed with the logged sets -> finish" is fully drivable.

- Feasibility: **fully drivable on an emulator. No blocker.** This is the
  strongest of the five flows and the best first candidate.
- Native-module caveat: the rest timer uses custom native modules
  (`modules/rest-timer-live`, live-activity), so this must run on an **EAS dev/
  release build**, not Expo Go. iOS Live Activity is out of scope for Android CI.

---

## 3. Log a food via search AND via barcode

**Search path: drivable.** The food search screen (`FoodSearch`) is reached from
the Diary and takes ordinary text input and result taps. It is Pro-gated
(`Diary` wraps in `withProGuard`, `src/navigation/RootNavigator.js:646-649`), so
the test user must be on a Pro/trial tier - which the Article 9 trial start
provides (`src/screens/Article9ConsentScreen.js:121-138`). No device blocker.

**Barcode path: blocked by the camera.** `ScanBarcodeScreen` uses
`react-native-vision-camera`'s live `codeScanner`
(`src/screens/ScanBarcodeScreen.js:35-37`, `:104-139`). An emulator has no real
camera; vision-camera's code scanner against the emulator's virtual scene is
unreliable and cannot be counted on to decode an EAN-13 (UNVERIFIED that it
works at all on a headless CI emulator).

**Is there a camera-free injection seam? No, not today.** The route accepts only
`entryDate` and `mealSlot` params (`ScanBarcodeScreen.js:57-58`); there is no
route param or deep link to pass a *resolved food* or a *scanned value*. The
deep-link `linking` config registers only `workout/start`, `diary`,
`routine/:planId` and `progress` (`src/navigation/RootNavigator.js:633-670`) -
`ScanBarcode` is deliberately absent. On a successful decode the screen forwards
a resolved `scannedFood` to `FoodSearch` or a `prefillBarcode` to `ScanLabel`
(`ScanBarcodeScreen.js:120-127`), but those params are only reachable from a
real decode, not from outside.

- Feasibility: **search = drivable; barcode = blocked without a test seam.**
- Two honest options for barcode, both needing founder sign-off (they touch a
  Pro food surface, so keep them test-only and additive):
  1. Add a `__DEV__`-guarded deep link that injects a fixed barcode value into
     `onCodeScanned` (or routes straight to `FoodSearch` with a fixture
     `scannedFood`). Smallest change; camera code stays untested.
  2. Cover barcode only in Google Play's pre-launch crawler / manual pre-release,
     and have Maestro assert the *resolution* logic by deep-linking to
     `FoodSearch` with a fixture food. Zero product change; leaves the live
     camera scan as a manual check.
- Recommendation: option 2 for CI, option 1 only if the founder wants automated
  scan-path coverage. Do not automate the live camera in CI.

---

## 4. Trial paywall render + Play sandbox purchase / restore

**What drives it.** The paywall/upgrade surface is `ProUpgradeScreen`. The real
purchase path is `playBilling.purchasePackage(sku.id, ...)` followed by a
server-side `confirmPurchase` (`src/screens/ProUpgradeScreen.js:117-132`);
restore reads the active subscription back
(`src/lib/payments/restore.js`, "Restore purchases" copy at
`ProUpgradeScreen.js:50`). The trial itself is granted by `cascade.startCascade`
at Article 9 consent, not by a purchase (`Article9ConsentScreen.js:121-138`;
also `ProUpgradeScreen.js:176`). The SKUs are fixed:
`pro_monthly` and `pro_annual` (`src/lib/payments/catalogue.js:32-42`; these IDs
are locked per CLAUDE.md section 2).

**What is drivable vs blocked.**
- **Paywall render + trial start: drivable.** Asserting the paywall renders, the
  prices show, and tapping through to a trial (`startCascade`) needs no store
  transaction and can be scripted.
- **A real Play sandbox purchase: effectively blocked in an emulator.**
  `react-native-iap` talks to Google Play Billing, which requires the app to be
  installed *from a Play track* (internal/closed) and signed with the upload key,
  running on a device/emulator signed into a **Play licence-tester** Google
  account with Google Play services. A bare CI emulator image without Play
  services and without a licence-tester account cannot complete the purchase
  UI. (UNVERIFIED whether a Play-services emulator image plus a licence-tester
  account can be provisioned non-interactively in CI; in practice this is the
  hardest thing to automate and is normally a manual check.)
- **Restore: drivable only once a sandbox entitlement exists** for the test
  account, i.e. it inherits the same Play-track + licence-tester prerequisite.

- Feasibility: **paywall render + trial start = drivable; sandbox purchase/
  restore = keep manual** (licence-tester device walk on an internal-track build).
- Billing guardrail (CLAUDE.md section 2): no test may refactor or exercise the
  real purchase/restore/entitlement/cascade code paths beyond read/assert. Any
  Maestro coverage here is render + navigation assertions only, never a change
  to billing logic, and never a self-grant of `pro`.

---

## 5. Article 9 consent grant AND revoke

**Grant: fully drivable.** The consent screen is a single-screen gate
(`Article9ConsentStack`, `src/navigation/RootNavigator.js:588-592`). The flow is
tap the checkbox (`accessibilityRole="checkbox"`,
`src/screens/Article9ConsentScreen.js:209-222`) then tap Continue
(`:230-238`), which records consent and starts the trial. Clean, labelled
selectors already exist.

**Revoke: drivable.** Withdrawal lives at You -> Privacy: the "Health-data
consent" row calls `handleWithdrawConsent`
(`src/screens/SettingsPrivacyScreen.js:45-52`), reachable via the
`SettingsPrivacy` route (`src/navigation/RootNavigator.js:84`). The consent
screen itself points the user there ("You can withdraw this consent at any time
in You -> Privacy", `Article9ConsentScreen.js:226-228`). Account deletion is a
separate, heavier surface (`useAccountActions.handleDeleteAccount`).

- Feasibility: **grant and revoke both fully drivable on an emulator. No blocker.**
- GDPR guardrail (CLAUDE.md section 2): the consent gate must stay un-skippable
  and fail-closed. A Maestro flow that *asserts* the gate blocks progress until
  the box is ticked is a useful regression guard for exactly this invariant and
  is worth including. Tests must not add any path that bypasses the gate.

---

## 6. CI runner reality and cost comparison

Two runner models are realistic: (A) self-hosted-style GitHub Actions emulator
via `reactivecircus/android-emulator-runner` running Maestro locally (free
Maestro tier), and (B) Maestro Cloud hosted devices. iOS is excluded (no Mac in
the loop; TestFlight only).

**GitHub Actions minutes and rates (dated).**
- Private-repo Free plan includes **2,000 Linux minutes/month**; Linux is the
  1x baseline, Windows 2x, macOS 10x. Source: GitHub Docs / pricing, via web
  search 2026-07-02.
- 2026 pricing change: a **$0.002/min Actions cloud-platform charge** applies to
  all runners, bundled into a reduced GitHub-hosted meter; net GitHub-hosted
  Linux cost cut by up to 39%. Effective 2026-01-01. Public repos remain free.
  Source: github.com/resources/insights/2026-pricing-changes-for-github-actions,
  fetched 2026-07-02. (Overflow Linux 2-core minute cited elsewhere at ~$0.006
  before the reduction; treat the exact post-reduction per-minute figure as
  approximate / UNVERIFIED to the cent.)
- Emulator startup on `android-emulator-runner` typically takes **3-4 minutes**
  before the device is available; AVD snapshot caching reduces this. Source:
  atkinsondev.com and the action's own docs, via web search 2026-07-02.

**Per-flow wall-clock estimate (Linux emulator, our app).** UNVERIFIED until
measured on a real build; these are planning estimates:
- Boot + install APK: ~4-6 min fixed per job.
- Each drivable flow (workout, consent grant/revoke, food search, paywall
  render): ~1-3 min.
- Backgrounding flow adds ~0.5-1 min for the stop/relaunch cycle.
- A five-flow suite (the drivable subset) on one emulator: roughly **12-18 min
  wall-clock per run**, dominated by boot/install.

**Maestro Cloud (dated).** Local CLI/Studio runs are **free** and open source.
Hosted **Maestro Cloud is $250/device/month**, priced on max concurrent
executions, with unlimited runs; Enterprise is custom. Source: maestro.dev/pricing,
fetched 2026-07-02.

### Cost comparison table

| Option | Fixed monthly | Per-run cost | Boot/flake risk | Play Billing / OAuth reality | Best for |
|---|---|---|---|---|---|
| **A. GitHub Actions + android-emulator-runner + local Maestro (Linux)** | £0 beyond the 2,000 free Linux min/month | ~12-18 emulator-min/run (UNVERIFIED); ~$0.002/min platform charge applies 2026+ once free min exhausted | Medium: emulator boot 3-4 min, needs KVM acceleration + AVD cache | Neither real OAuth UI nor Play sandbox purchase works on a bare image; both stay manual | Low-cost pre-release gate on the drivable flows |
| **B. Maestro Cloud (hosted Android device)** | $250/device/month (unlimited runs) | $0 marginal per run | Low: managed devices, parallel | Same device-reality blockers (OAuth UI, Play sandbox) unless a Play-services device + licence-tester is provisioned | Teams wanting parallel, low-maintenance runs and richer reports |
| **C. GitHub-hosted macOS runner + emulator** | Uses the 10x macOS multiplier | 10x minute burn - expensive | Low-medium | Same blockers | Not recommended (cost); only if Linux KVM proves unreliable |

At our volume (pre-release, not per-PR), option A is the cheapest credible
path and likely stays inside or near the free Linux allowance. Option B buys
lower flake and parallelism for a flat $250/mo if maintenance of the emulator
job proves painful.

---

## 7. Play pre-launch reports

**No internal-track submission automation exists in the repo.** The Android
workflow builds a signed AAB and **uploads it only as a GitHub Actions
artifact** ("Upload AAB artifact (Play Store)",
`.github/workflows/build-android.yml:411`); there is no `eas submit --platform
android`, no Gradle Play Publisher, and no service-account upload step. iOS is
the only track auto-submitted (TestFlight via `eas submit`,
`.github/workflows/build-ios.yml:218-225`). So the founder uploads the AAB to a
Play track manually.

**Pre-launch reports would still be generated - by Google, on upload.** Google
Play auto-generates a pre-launch report every time an app bundle is published to
a test track (including internal), running Google's crawler on a device lab for
a few minutes. Read them in Play Console at **Test and release -> Testing ->
Pre-launch report**. Source: support.google.com pre-launch report docs, via web
search 2026-07-02.

- Practical consequence: the pre-launch crawler is a free, zero-maintenance
  complement to Maestro for exactly the surfaces Maestro cannot drive
  (it taps/swipes/types through the app on real Google devices). It will not,
  however, complete OAuth sign-in or a real purchase either, so its coverage of
  our signed-in flows is shallow. It is a safety net, not a substitute.

---

## 8. Recommended cadence and scope (for approval)

Brief's steer: **pre-release, not per-PR.** Recommendation:

1. **Scope Maestro to the four fully-drivable flows first**, in priority order:
   (a) complete workout + backgrounding, (b) Article 9 grant + revoke,
   (c) food search, (d) paywall render + trial start. These need **no product
   change** and cover the highest-value regressions.
2. **Onboarding**: automate only the after-auth portion via the deep-link
   session-injection seam, contingent on founder/back-end confirming a test user
   can be minted server-side (section 1 caveat). Keep the real OAuth UI as a
   manual pre-release check.
3. **Barcode and Play sandbox purchase/restore**: keep manual (licence-tester
   device walk on an internal-track build) plus Google's pre-launch report.
   Automate the barcode *resolution* only if the founder approves a
   `__DEV__`-guarded injection seam.
4. **Cadence**: run the Maestro suite on **`main` before a release is cut** and
   on demand via `workflow_dispatch` - not on every PR. This matches the brief,
   keeps us inside the free Linux minutes, and avoids flaky-emulator PR noise.
5. **Runner**: start with **option A** (GitHub Actions + android-emulator-runner
   + local Maestro on Linux with KVM + AVD snapshot cache). Re-evaluate Maestro
   Cloud ($250/mo) only if emulator flake or maintenance becomes a real cost.
6. **Guardrails for the test code itself**: additive testIDs only; no change to
   auth, billing, consent-gate or engine code; fixture users use realistic
   metrics so ED-safety floors are never exercised with junk; no test path may
   bypass the Article 9 gate or self-grant `pro`.

**Manual pre-release checklist stays mandatory** (founder device-walk on a green
EAS build) for the three device-reality flows Maestro cannot cover: real
Google/Apple OAuth, live barcode scan, and a Play licence-tester
purchase/restore.

---

## 9. Open decisions for the founder

1. Confirm whether a disposable Supabase test user can be minted server-side so
   the onboarding session-injection seam is usable (section 1). If not,
   onboarding stays manual.
2. Approve or decline a `__DEV__`-guarded barcode-injection seam for automated
   scan-path coverage (section 3). Default recommendation: decline; cover via
   pre-launch report + manual.
3. Confirm runner choice: option A (GitHub Actions emulator, ~£0) vs option B
   (Maestro Cloud, $250/mo). Default recommendation: option A.
4. Confirm cadence: pre-release on `main` + manual dispatch (recommended) rather
   than per-PR.

*No build proceeds until these are answered.*
