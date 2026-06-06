# Build + release handoff — 2026-06-05

Single source of truth for the Android and iOS build work done this session.
Written for handoff. Everything below is verified against CI run logs and the
repo state at `origin/main` = `3f038c1`.

## 2026-06-06 resolution (read this first)

The iOS blocker is resolved by **dropping Associated Domains for now** (founder
decision). The path there, with the real evidence each step was read from, not
inferred:

1. The stored profile was stale, but that was not the whole story. A CI step was
   added that used the ASC API key to delete the stale App Store profile and
   force EAS to mint a fresh one (run #14, commit `977ff71`). It worked: the log
   shows `Provisioning profile 3K52LC4W38 does not exist in Apple Developer
   Portal`, then `Created Apple provisioning profile` (`ZJFWRGUWY2`).
2. The **freshly minted** profile *still* lacked the Associated Domains
   entitlement, and Xcode rejected it again. Apple includes whatever capabilities
   are enabled on the Bundle ID when the profile is created, so a brand-new
   profile missing it proves the **ASC API key path does not actually persist
   Associated Domains**, even though EAS prints
   `Synced capabilities: Enabled: Associated Domains`. This is the same class as
   eas-cli #804 (Sign In with Apple not sticking): these capabilities need Apple
   ID **cookie** auth, not an API token.
3. Sign-in does not depend on Associated Domains. The Supabase auth redirect is
   the custom scheme `volyume://` (`src/lib/supabase.js`), and `App.js` handles
   `volyume://` callbacks. Associated Domains only powers `https://volyume.app`
   universal links opening the app, a secondary nicety.

**What shipped:** `ios.associatedDomains` removed from `app.json`. The app's only
profile-relevant entitlements are now HealthKit and Push, both of which the
existing profile `ZJFWRGUWY2` already carries, so the build passes with no
further credential work. The temporary ASC-API profile-cleanup script was
removed (a dormant profile-deleting CI step is a footgun); `build-ios.yml` is
back to its prior shape.

**To restore universal links later (and enable remote push in the same task):**
add `EXPO_APPLE_ID` + `EXPO_APPLE_APP_SPECIFIC_PASSWORD` repo secrets and switch
the build to Apple ID cookie auth. That path manages capabilities through the
developer portal, so it gets Associated Domains into the profile AND can create
the APNs push key. Then re-add `ios.associatedDomains: ["applinks:volyume.app"]`.

Earlier note still standing: run #13's Xcode error named only Associated Domains,
so HealthKit and Push were already in the profile.

**Next blocker, then fixed (run #15).** With Associated Domains gone the build
signed and compiled for 7 minutes, then failed at the very end on the Sentry
source-map upload: `sentry-cli ... Auth token is required for this request`. The
`@sentry/react-native` build phase tries to upload source maps and needs
`SENTRY_AUTH_TOKEN`, which the EAS cloud build does not have. The Android build
already sidesteps this with `SENTRY_DISABLE_AUTO_UPLOAD=true` (build-android.yml).
The same switch is now set for the EAS build in `eas.json`
(`build.production.env.SENTRY_DISABLE_AUTO_UPLOAD = "true"`); it goes in
`eas.json`, not the workflow, because the upload runs on the EAS cloud builder,
not the GitHub runner. iOS crash reports will not be symbolicated until a
`SENTRY_AUTH_TOKEN` EAS secret is added (same trade-off Android already takes).

## Status at a glance

| Target | State | Where it stands |
|---|---|---|
| Android AAB + APK | **Fixed, verified** | CI run #1306 green; APK sideloaded and runs on device |
| Share Card export | **Fixed, verified locally** | Unit test + lint green; not yet checked on device |
| iOS (EAS → TestFlight) | **Unblocked 2026-06-06** | Associated Domains dropped (it cannot go in the profile via the ASC API key, proven in run #14). Build now signs with the existing HealthKit + Push profile. See the 2026-06-06 resolution note above. |

## Repo state

- `origin/main` tip: `3f038c1`.
- All work is pushed. Nothing important is local-only.
- Session commits (newest first), all on `origin/main`:
  - `3f038c1` iOS: set deployment target 16.0 to satisfy pod minimums
  - `16db507` iOS CI: answer No to EAS push-notification setup
  - `e38ed65` Fix share card export: define withAlpha inside the WebView canvas
  - `1a02193` iOS CI: build + submit to TestFlight automatically on push to main
  - `983be6e` Android CI: nudge push-trigger to validate the SDK 54 release fix
  - `d2c2c4b` iOS CI: answer the EAS "set up Push Notifications" prompt
- Pre-session, already on main: `2708391` (`-x` lint exclusions, was committed
  `[skip ci]` so it had never been validated on CI) and `3b2d2ea` (hoist
  `promise` for the Metro bundle).

## Android AAB + APK — fixed and verified

**Was:** the release build failed at Gradle configuration:
`Cannot run Project.afterEvaluate(Closure) when the project is already
evaluated` (android/build.gradle). The old workflow appended an
`allprojects { afterEvaluate { } }` lint-disable block, but Expo/RN autolinking
evaluates subprojects eagerly, so it ran too late.

**Fix (already in the tree, validated this session):** `2708391` replaced that
block with `-x lintVitalRelease -x lintVitalAnalyzeRelease
-x lintVitalReportRelease` on the gradlew line, which is evaluation-order-safe.
`3b2d2ea` fixed a separate Metro failure (could not resolve
`promise/setimmediate/done`) by hoisting `promise` to a direct dependency. Both
had landed but `2708391` carried `[skip ci]`, so CI had never run them.

**Validation:** run #1306 on `983be6e` went green end to end:
`assembleRelease` + `bundleRelease` built, the AAB passed the upload-keystore
release-signing check, and both APK and AAB artifacts uploaded. The APK was then
sideloaded onto a device and runs.

**One caveat for a real Play upload (not today):** the CI build is `arm64-v8a`
only (deliberate, to keep the free compile fast). Fine for sideload and for
proving the build. Before a real Play release, widen
`reactNativeArchitectures` back to at least `armeabi-v7a,arm64-v8a` in the
build step. The locked release policy says no new closed-test release yet, so
nothing to do now.

## Share Card export — fixed

**Was:** tapping "Share Session Card" showed "Couldn't generate card, try
again". The card is drawn in an off-screen WebView whose canvas script runs in
its own JS context. The app-wide `withAlpha` migration (`ad5f75b`) rewrote the
canvas badge fills from a `colour + 20` hex-alpha concat to
`withAlpha(colour, ...)`, but `withAlpha` is a React Native import and is not
defined inside the WebView, so the call threw `withAlpha is not defined`. The
draw is wrapped in try/catch and reported back as an error, which the screen
showed as the toast. Every session card (intensity badge) and PR card (badge)
failed; milestone cards (no `withAlpha`) still worked.

**Fix (`e38ed65`):** defined `withAlpha` inside the canvas script, mirroring
`styles/theme.js`. Exported `WEBVIEW_HTML` and added
`src/screens/__tests__/shareCardCanvas.test.js`, which runs the canvas script
against a stub for each card type and asserts a PNG comes back with no error.
That reproduces the regression (undefined helper throws and posts an error) and
guards against it returning. 6 tests pass, lint clean.

**Not yet done:** confirm on a device. The next Android sideload (or a debug
run) will show the card actually generating.

## iOS (EAS → TestFlight) — not complete, one blocker left

The iOS build runs on EAS (Expo's cloud) because there is no Mac. It is driven
non-interactively from CI with an `expect` script, using an App Store Connect
API key (.p8). Getting it working surfaced a chain of blockers, each only
visible after the previous one was cleared. State of the chain:

1. **Apple Team Type prompt** — answered (Individual). Done.
2. **"Set up Push Notifications?" prompt** — first answered Yes (`d2c2c4b`),
   which was wrong: it makes EAS try to create the APNs key, and that needs an
   interactive Apple Developer login (Apple ID + password) the ASC API key
   cannot do. Run #11 hung the full 110-minute timeout on the `Apple ID:`
   prompt. `16db507` changed the answer to **No** and added an `Apple ID:`
   fail-fast guard so any future interactive login aborts in seconds, not 110
   minutes. Done.
3. **Pods need a higher minimum deployment target** — `expo-build-properties`
   only had an `android` block, so iOS used the SDK 54 default and a pod needed
   higher. `3f038c1` added `ios.deploymentTarget: "16.0"`. Done (run #13 got
   past pods into Xcode).
4. **Provisioning profile is stale** — **this is the remaining blocker.** The
   app declares Associated Domains (`applinks:volyume.app`, universal links).
   The profile EAS minted in run #10 does not include the Associated Domains
   capability / `com.apple.developer.associated-domains` entitlement, so the
   Xcode signing step rejects it:
   `Provisioning profile "...AppStore..." doesn't include the Associated Domains
   capability`. The profile needs regenerating.

### Why the profile can't be fixed from CI as configured

Regenerating a provisioning profile (and creating the APNs push key) needs Apple
Developer **portal** authentication. The ASC API key is enough for builds and
TestFlight submission but not for those credential operations. So the fix needs
one of the choices below. The build loop was stopped here on purpose: each EAS
attempt spends a build credit and the account is over its monthly included
credits (the EAS log showed 93% used before these attempts).

### Options to finish iOS (pick one)

1. **Add Apple-login secrets (most complete).** Add `EXPO_APPLE_ID` and
   `EXPO_APPLE_APP_SPECIFIC_PASSWORD` (an app-specific password from
   appleid.apple.com) as repo secrets. EAS can then manage credentials
   non-interactively: regenerate the profile with Associated Domains AND create
   the APNs push key. With this in place, the `expect` push answer can go back
   to Yes and remote push works too. The build-ios.yml comment block already
   documents this.
2. **Regenerate the profile once on expo.dev (quickest, no secrets).** In the
   Expo project, Credentials → iOS → `app.volyume` → delete or regenerate the
   provisioning profile so it picks up the current App ID capabilities. The next
   push rebuilds with the fresh profile. The APNs push key is still a separate
   later step.
3. **Drop Associated Domains** if universal links are not wanted yet (they
   power web links opening the app). Not recommended; it removes a real feature.

### EAS credits

Each iOS cloud build spends a build credit. Runs #12 and #13 each spent one
reaching the build stage. The account was at ~93% of included credits before
these. Budget for this when finishing iOS.

## Workflow behaviour now (for whoever picks this up)

- **build-android.yml:** triggers on push to `main` and `claude/**` (docs and
  markdown ignored), plus manual dispatch. Free GitHub runner. Builds
  `arm64-v8a` AAB + APK, verifies release signing, uploads artifacts.
- **build-ios.yml:** triggers on push to `main` only (docs/markdown/config-only
  ignored), plus manual dispatch with a "submit to TestFlight" toggle.
  `cancel-in-progress` concurrency guard. Costs EAS credits. Currently answers
  No to push setup; will fail at signing until the profile is regenerated
  (option 1 or 2 above).

## Two operational notes from this session

1. **Push-webhook flakiness.** A push to `main` does not always start the CI
   run (a documented intermittent issue in the build-android.yml header). The
   automation token here also cannot dispatch workflows via the API
   (403 "Resource not accessible by integration"). If a push does not start a
   build, push again or start it from the Actions tab.
2. **Container resets mid-session.** The remote execution container was
   reclaimed twice during long build waits and came back at a stale cached
   checkout (`dbd3cf2`), behind `origin/main`. Recovery each time was
   `git fetch` then `git reset --hard origin/main`. All pushed work was intact
   on the remote; one local-only commit (the Share Card fix, deliberately held
   from pushing at the time) was lost from git and had to be re-made. Lesson:
   push as you go, do not hold finished commits locally across long waits.
