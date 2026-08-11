# SHIPPING ARCHITECTURE — Volyume, traced from the repo

**Date:** 2026-08-11
**Authority:** Campaign 7 founder order, Phases 1, 8, 9, 10 (shipping-architecture lane).
**Method:** every fact below is read out of the working tree at
`/home/user/ADPhysique` on branch `claude/campaign7-release-readiness`
(clean tree at the start of the trace) and carries `file:line` evidence.
Nothing here is taken from a summary doc; where a `docs/` file is cited it is
cited as a *claim to be checked*, never as evidence.

**Scope note (read-only lane).** This lane changed no code, no config and no
git state. The only file written is this one.

**Concurrency note.** Two files moved under this lane while it was tracing,
edited by another lane. Neither change alters any line number or conclusion
below, but both are recorded so the evidence trail stays honest:

1. `package.json:84` — `expo` moved from `~54.0.35` to `~54.0.36`.
2. `app.json:209-228` — inside the `expo-build-properties`
   `android.manifestQueries.intent` array, the action strings were shortened
   from the fully-qualified `android.intent.action.SENDTO` /
   `android.intent.action.VIEW` to the bare `SENDTO` / `VIEW` form Expo's
   plugin expects. The share-target intent surface (WhatsApp, SMS, mailto) is
   otherwise unchanged, and every `app.json` line number cited in this
   document still resolves to the same key.

Every other version and value cited below was stable across the trace.

---

## 1. Platform baseline

| Fact | Value | Evidence |
|---|---|---|
| Expo SDK | `expo ~54.0.36` | `package.json:84` |
| React Native | `0.81.5` (exact pin, no caret) | `package.json:121` |
| React | `19.1.0` (exact pin) | `package.json:120` |
| New Architecture | **enabled** — `"newArchEnabled": true` | `app.json:19` |
| JS engine | **Hermes, by SDK 54 default.** There is no `jsEngine` key anywhere in `app.json`, `eas.json` or `package.json`; Hermes is the SDK 54 default and JSC is not requested | absence verified across `app.json`, `eas.json`, `package.json` |
| Language | JavaScript. TypeScript is a devDependency used only for `tsc --noEmit` over JSDoc | `package.json:155`, `package.json:16` |
| Node | pinned `>=20.19.4` in engines, `20.19.4` in `.nvmrc`, `20.19.4` in the EAS production profile | `package.json:7`, `.nvmrc:1`, `eas.json:32` |
| Package manager | `npm@10.9.4`, `legacy-peer-deps=true` repo-wide | `package.json:4`, `.npmrc:1` |

**Android SDK levels** (via `expo-build-properties`): `compileSdkVersion 35`,
`targetSdkVersion 35`, `minSdkVersion 26`, `buildToolsVersion 35.0.0`,
`usesCleartextTraffic: false` — `app.json:199-204`.
**iOS deployment target:** `16.0` — `app.json:232`.

---

## 2. Native project generation model — CNG (prebuild), nothing committed

There are **no `android/` or `ios/` directories** in the working tree and none
tracked in git (`git ls-files android ios` returns empty). Both are explicitly
gitignored at `.gitignore:18-19` (`/ios/`, `/android/`).

This is a **pure Continuous Native Generation (CNG) / managed workflow**: the
native projects are generated at build time from `app.json` + the plugins array
+ `modules/*` + `plugins/withVolyumeWidget.js`.

Practical consequence, and it is the single most important structural fact in
this document: **`app.json` is the native project.** There is no committed
`AndroidManifest.xml` or `Info.plist` to inspect or patch — anything not
expressed in `app.json` or a config plugin does not exist in the binary.

### 2a. The two build paths are NOT the same

| Platform | Build path | Evidence |
|---|---|---|
| **Android** | **Local prebuild + Gradle inside GitHub Actions.** `npx expo prebuild --platform android --clean`, then `cd android && ./gradlew assembleRelease bundleRelease`. **EAS Build is not used for Android.** | `.github/workflows/build-android.yml:195`, `:233`, `:390` |
| **iOS** | **EAS Build**, production profile, then `eas submit` to TestFlight | `.github/workflows/build-ios.yml:195` (`eas build --platform ios --profile production --wait`), `:239` (`eas submit --platform ios --latest`) |

This asymmetry propagates into versioning (§4) and into which parts of
`eas.json` actually govern a shipped artefact (§3).

---

## 3. EAS profiles — `eas.json` verbatim analysis

```jsonc
"cli": { "version": ">= 10.0.0", "appVersionSource": "remote" }   // eas.json:2-5
```

| Profile | Config | Evidence |
|---|---|---|
| `development` | `developmentClient: true`, `distribution: "internal"`, `env.APP_VARIANT = "development"` | `eas.json:7-13` |
| `development-device` | **byte-identical to `development`** — same three keys, same values | `eas.json:14-20` |
| `preview` | `developmentClient: false`, `distribution: "internal"`, `env.APP_VARIANT = "preview"`, `android.buildType: "apk"` | `eas.json:21-30` |
| `production` | `node: "20.19.4"`, `autoIncrement: true`, `env: { APP_VARIANT: "production", EAS_SKIP_AUTO_FINGERPRINT: "1", RCT_USE_PREBUILT_RNCORE: "0", RCT_USE_RN_DEP: "0" }`, `android.buildType: "app-bundle"` | `eas.json:31-43` |
| `submit.production` | `android.serviceAccountKeyPath: "./google-play-service-account.json"`, `track: "internal"` | `eas.json:45-52` |

Observations, each load-bearing:

1. **No profile declares a `channel`.** With no channel on any profile and no
   `updates` key in `app.json` (§5), EAS Update cannot target any build.
2. **No profile declares `distribution: "store"` for production** — the
   default for a production profile is store distribution, so this is correct
   but implicit.
3. **`production.autoIncrement: true` + `appVersionSource: "remote"`** means
   EAS holds the authoritative build number on its servers and increments it
   per build. Because only iOS builds through EAS, this governs **iOS
   `buildNumber` only**.
4. **`production.android.buildType: "app-bundle"` is inert.** Android never
   builds through EAS (§2a); the AAB that reaches Play comes from
   `./gradlew bundleRelease` in `build-android.yml:390`.
5. **`submit.production.android.serviceAccountKeyPath` is inert for the same
   reason**, and the file it names is gitignored (`.gitignore:33`) and absent
   from the tree — so `eas submit --platform android` would fail today. Play
   submission is manual.
6. **`development` and `development-device` are duplicates.** The
   `development-device` name implies a device-vs-simulator split
   (`ios.simulator: true/false`), but neither profile sets it. Whichever
   behaviour the founder expects from the split, `eas.json` does not encode it.

---

## 4. Identifiers and versioning

| Identifier | Value | Evidence |
|---|---|---|
| App name | `Volyume` | `app.json:3` |
| Slug | `volyume` | `app.json:4` |
| EAS owner | `volyume` | `app.json:5` |
| EAS projectId | `2f60a6ed-8b37-4cd6-8057-60ee04e39ea8` | `app.json:8` |
| URL scheme | `volyume` | `app.json:11` |
| Android package | `app.volyume` | `app.json:63` |
| iOS bundleIdentifier | `app.volyume` | `app.json:24` |
| iOS widget extension bundle id | `app.volyume.widget` (config plugin, **not wired** — §9) | `plugins/withVolyumeWidget.js:48` |
| iOS App Group | `group.app.volyume.widget` | `plugins/withVolyumeWidget.js:53`, `src/lib/widgets/storage.js:24` |
| Apple Team ID | `K79JA5JUF8` | `public/.well-known/apple-app-site-association` (`appID: "K79JA5JUF8.app.volyume"`) |

Android and iOS share one identifier, `app.volyume`. There is exactly one
identifier family in the whole tree — see Phase 8 (§14).

### 4a. Versions

| Field | Value | Evidence | Who actually consumes it |
|---|---|---|---|
| `expo.version` | `1.2.0` | `app.json:12` | `runtimeVersion` derivation; the Settings → About display; Android `versionName` via prebuild |
| `package.json.version` | `1.2.0` | `package.json:3` | nothing at runtime; kept in step by hand |
| `android.versionCode` | `30` | `app.json:64` | **authoritative** — Android builds via local prebuild, so Gradle reads this value directly |
| `ios.buildNumber` | `10` | `app.json:25` | **inert for shipped iOS builds** — see below |

**Android versionCode is a manual bump with no CI guard.** No workflow and no
script touches `versionCode` (`grep versionCode .github/workflows/*.yml
scripts/*.cjs` → no matches). The last bump was a dedicated hand commit,
`d97d513f "Bump Android versionCode to 30 for the capture-gates release"`.
Shipping a Play release without remembering that commit produces an AAB Play
rejects for a duplicate versionCode.

**iOS `buildNumber: "10"` does not describe any shipped build.** With
`appVersionSource: "remote"` (`eas.json:4`) EAS ignores the local value and
uses its server-side counter, incremented per build by
`production.autoIncrement` (`eas.json:33`). The real numbers are far ahead:
source comments reference *"Sentry VOLYUME-1X, 2026-07-12, **build 40**"*
(`react-native.config.js:21`) and *"the residual VOLYUME-2E events on **build
48**"* (`src/lib/supabase.js:64-65`). `app.json:25` has not moved since commit
`36643798`. See finding **F-6**.

### 4b. `runtimeVersion: { policy: "appVersion" }` — what it actually means

`app.json:13-15` sets the runtime version policy to `appVersion`. The policy
means: **the runtime version equals `expo.version` verbatim — today, the
string `"1.2.0"`.**

The runtime version is the compatibility key between a native binary and an OTA
JS bundle. Under `appVersion`:

- Every binary built while `expo.version === "1.2.0"` — regardless of
  versionCode 28, 29 or 30, regardless of iOS build 40 or 48 — advertises
  runtime version `1.2.0` and would accept any OTA update published for
  `1.2.0`.
- The moment `expo.version` becomes `1.2.1`, the runtime version changes, and
  binaries on `1.2.0` become **ineligible** for `1.2.1` updates. Users stay on
  the last `1.2.0` bundle until they install the new binary from the store.
- The policy carries a hard obligation: **any native change — a new plugin, a
  new permission, a native module upgrade — MUST be accompanied by an
  `expo.version` bump.** If a native module is added without bumping
  `expo.version`, the runtime version does not change, and an OTA bundle
  written against the new native API would be served to old binaries that lack
  it. That is the classic `appVersion`-policy crash.

**All of the above is currently theoretical**, because OTA is not configured at
all (§5). The policy is correctly declared and completely unexercised.

---

## 5. EAS Update / OTA — installed, invoked, and NOT configured

This is the sharpest single finding in the trace.

**Installed:** `expo-updates ~29.0.18` — `package.json:115`.

**Invoked at runtime, in production only:**

```js
// App.js:652-675
// OTA update check — runs once on mount, production builds only.
useEffect(() => {
  async function checkForUpdate() {
    if (__DEV__) return;                          // App.js:656
    try {
      const update = await Updates.checkForUpdateAsync();   // App.js:658
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();                   // App.js:660
        Alert.alert('Update available', …, [
          { text: 'Later' },
          { text: 'Restart now', onPress: () => Updates.reloadAsync() },  // App.js:666
        ]);
      }
    } catch (_) {
      // Silently ignore — update check is non-critical      // App.js:670-672
    }
  }
  checkForUpdate();
}, []);
```

Also used as the error-boundary recovery action —
`App.js:389`, `Updates.reloadAsync()`.

**Configured:** nowhere.

- `app.json` has **no `updates` key at all** (verified by parsing the file:
  `expo.updates` → absent). There is no `updates.url`, no
  `updates.enabled`, no `updates.fallbackToCacheTimeout`.
- `eas.json` declares **no `channel`** on any of the four build profiles
  (`eas.json:6-44`).
- There is **no `app.config.js` / `app.config.ts`** that could inject the
  config dynamically (neither file exists).
- Neither build workflow injects update config
  (`grep -n 'updates' .github/workflows/build-android.yml
  .github/workflows/build-ios.yml` → no matches).

**Consequence.** `Updates.checkForUpdateAsync()` has no update URL to query. It
throws, the `catch (_)` at `App.js:670` swallows it, and the user sees nothing.
`Updates.reloadAsync()` in the error boundary reloads the embedded bundle,
which is benign, but the whole update path is dead code.

**State it plainly: OTA / EAS Update is NOT configured. Volyume ships fixes
only through the app stores.** Any plan, doc or comment that assumes an OTA
patch route is wrong — including `src/widgets/widgets.js:4-5`, which describes
the widget snapshot logic as *"OTA-patchable"*. It is not. See findings **F-1**
and **F-11**.

---

## 6. Environment configuration — how secrets reach the client

### 6a. The client reads plain `process.env.EXPO_PUBLIC_*`, inlined by Metro

There is no `Constants.expoConfig.extra` indirection for configuration. Every
consumer reads a static `process.env.EXPO_PUBLIC_X` dot-path, which Metro
replaces with a literal at bundle time:

| Variable | Read at | Purpose |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `src/lib/supabase.js:95`, `:224`; `src/store/useAppStore.js:561`; `src/hooks/useAccountActions.js:351` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase.js:96`, `:225` | Supabase anon key |
| `EXPO_PUBLIC_SENTRY_DSN` | `src/lib/sentry.js:51` | Sentry DSN |
| `EXPO_PUBLIC_USDA_API_KEY` | `src/lib/food/sources/usda.js:28` | USDA FoodData Central fallback |

`Constants.expoConfig` is used only for **metadata**, never configuration:
version/build for the About screen (`src/screens/SettingsAboutScreen.js:121-141`),
observability tags (`src/lib/observability.js:66-75`), and the EAS `projectId`
for push tokens (`src/lib/notifications/pushToken.js:62`).

**There are no hardcoded Supabase URLs or keys in `src/`.** The client fails
closed: `src/lib/supabase.js:97` — `if (!url || !key) return null;` — so a build
with missing env produces a null client rather than a wrong-project client.

### 6b. `.env` files

- **`.env.example` is the only env file in the tree** and the only one tracked
  (`git ls-files | grep .env` → `.env.example`, `web/apps/web/.env.example`).
- It contains **placeholders only**: `https://your-project-id.supabase.co`
  (`.env.example:2`), `your-anon-public-key-here` (`.env.example:3`), empty
  `EXPO_PUBLIC_SENTRY_DSN=` (`.env.example:16`), empty
  `EXPO_PUBLIC_USDA_API_KEY=` (`.env.example:51`).
- `.env`, `.env.local`, `.env.*.local` are gitignored (`.gitignore:15-17`).
- **No real `.env` exists in the working tree.** Local `npm test` / `npm run
  lint` therefore run with all four vars unset, which is why the fail-closed
  null-client path matters.

### 6c. Values reach builds from GitHub Actions secrets

**Android** (`build-android.yml`): the four `EXPO_PUBLIC_*` values are injected
as job env for the Metro bundle step (`:197-200`) and the Gradle step
(`:370-373`). Signing comes from `ANDROID_KEYSTORE_BASE64`,
`ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
(`:263-266`, `:376-378`). Sentry source-map upload uses `SENTRY_AUTH_TOKEN`,
with `SENTRY_DISABLE_AUTO_UPLOAD` computed to `'true'` when the token is empty
(`:207-208`) — a correct fail-soft.

The workflow **validates the secrets before building** — length checks with a
hard error on empty and a warning on an implausible length
(`build-android.yml:105-128`): URL expected ~40 chars, anon key expected ~220
chars starting `eyJ`. This is a genuinely good guard: it catches the classic
"secret got re-pasted with a truncation" failure before a broken binary ships.

**iOS** (`build-ios.yml`): the same values are pushed into EAS project secrets
before the build — `eas secret:create --scope project --name … --force`
(`:164-167`) — with the two optional ones guarded by `if [ -n … ]`
(`:166-167`). A required-variable presence loop covers `EXPO_TOKEN`,
`ASC_API_KEY_P8`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `APPLE_TEAM_ID` and the two
Supabase values (`:131`).

### 6d. `APP_VARIANT` — declared, never read

`APP_VARIANT` is set on all four EAS profiles (`eas.json:11`, `:18`, `:25`,
`:35`) and is **read by nothing**. A repo-wide grep excluding `node_modules`
and `docs/` returns only those four `eas.json` lines. No `app.config.js` exists
to consume it, and no JS module references it.

So `APP_VARIANT` cannot vary the bundle id, the app name, the icon, or the
backend. Every profile — development, preview, production — builds the **same
`app.volyume` identifier against the same Supabase project**. See finding
**F-3**; note that this is also the reason Phase 9's "can production point at
staging?" question has such a clean answer (§15).

---

## 7. Billing configuration

| Fact | Value | Evidence |
|---|---|---|
| Library | `react-native-iap ^15.3.1` | `package.json:126` |
| Loading | **lazy `require`**, so the JS bundle parses without the native module | `src/lib/payments/playBilling.js:78-84` |
| Product ID (monthly) | `pro_monthly` | `src/lib/payments/catalogue.js:36` |
| Product ID (annual) | `pro_annual` | `src/lib/payments/catalogue.js:43` |

The two product IDs are defined in exactly one place, `catalogue.js:36` and
`:43` — there is no second literal anywhere in `src/`. That satisfies the
Section 2 constraint that the IDs never change: there is a single point of
truth to guard.

Server-side entitlement plumbing exists as Supabase Edge Functions:
`supabase/functions/play-billing-rtdn` (Google real-time developer
notifications), `supabase/functions/app-store-notifications` and
`supabase/functions/app-store-verify` (Apple). Their bearer-token contract is
pinned by tests against `SUPABASE_SERVICE_ROLE_KEY`
(`src/lib/__tests__/rtdnWebhook.contract.test.js:67`,
`src/lib/__tests__/appStoreWebhook.contract.test.js:25`) — the key is
referenced as a shell/Deno env expansion, never as a literal (§15).

**No billing configuration is expressed in `app.json`.** The Play Billing
permission (`com.android.vending.BILLING`) is contributed by the
`react-native-iap` library manifest through autolinking, not declared in the
`android.permissions` array (`app.json:66-73`).

---

## 8. Notification configuration

**Plugin** (`app.json:188-195`):

```jsonc
["expo-notifications", {
  "icon": "./assets/notification-icon.png",
  "color": "#F59E0B",
  "sounds": []          // no custom sound assets bundled
}]
```

**Legacy top-level `notification` block** (`app.json:277-281`): `icon`
`./assets/notification-icon.png`, `color` `#F59E0B`, `androidMode: "default"`.
This duplicates the plugin config; the plugin is authoritative in SDK 54 and
the legacy block is a no-op remnant. Harmless, but it means two places claim to
set the notification colour.

**Android channels** are created in JS, not in config. Primary channel setup is
`src/lib/notifications/channels.js:32-71`, called once at boot from
`App.js:682`:

| Channel ID | Importance | Sound | Evidence |
|---|---|---|---|
| `training-reminders` | HIGH | default, vibrate | `channels.js:34-41` |
| `coaching-reminders` | HIGH | default, vibrate, badge | `channels.js:42-49` |
| `rest-timer` | LOW | silent | `channels.js:50-57` |
| `rest-alerts` | HIGH | default, vibrate | `channels.js:58-65` |

Two further channels are created lazily outside that function:
`src/lib/notifications/activeWorkout.js:66` (the "Active workout" LOW channel)
and `:216` (the rest channel), plus
`src/lib/notifications/trainingReminders.js:86`. The rest-timer notification
**category** (action buttons) is registered at `channels.js:70` via
`registerRestTimerCategory()`, with the correct caveat in the comment at
`channels.js:67-69` that categories need a fresh native build.

The whole channel routine is wrapped in a bare `try {} catch {}`
(`channels.js:33`, `:71`) — a channel-creation failure is silent, and every
subsequent notification on Android 8+ targeting a missing channel is dropped by
the OS. See finding **F-9**.

**Remote push:** `src/lib/notifications/pushToken.js` obtains an Expo push
token using `Constants.expoConfig.extra.eas.projectId` (`:62`) and upserts it
to `device_push_tokens` (`:118-125`); the server side is
`supabase/functions/send-push`. But there is **no FCM configuration in the
build**: `googleServicesFile` appears nowhere in `app.json`, and no
`google-services.json` or `GoogleService-Info.plist` exists in the tree or in
either build workflow. The code already anticipates the resulting failure —
`isRemotePushNativeSetupError()` at `pushToken.js:43-51` pattern-matches
*"default firebaseapp is not initialized"* and *"fcm-credentials"* and returns
`null` (`:95`). See finding **F-2**.

---

## 9. Health integrations — what exists vs what does NOT

**What does NOT exist.** There is **no health dependency in the app**:
`react-native-health`, `react-native-health-connect`, `expo-health` and every
similar package are absent from `package.json`. No health config plugin is in
the `app.json` plugins array. No health permission is in
`android.permissions` (`app.json:66-73`) and no `NSHealthShareUsageDescription`
/ `NSHealthUpdateUsageDescription` is in `ios.infoPlist` (`app.json:28-45`).

**What exists.** A complete, ~600-line wrapper that is deliberately inert:

```js
// src/lib/health.js:90-99
// Health Connect (Android) and Apple HealthKit (iOS) were removed entirely
// (founder 2026-06-30: the health-platform permissions were a Google Play
// review liability and the integration is not wanted). These getters now always
// return null, so isHealthAvailable() is false and every function below no-ops
// gracefully. Removing the native require() strings is what lets the
// react-native-health / react-native-health-connect dependencies be dropped
// without a Metro resolution error. Manual weight logging is entirely
// separate (morning_weights) and is unaffected.
function getIosModule() { return null; }
function getAndroidModule() { return null; }
```

`isHealthAvailable()` (`health.js:105-109`) therefore returns `false` on every
platform, and every read path below it no-ops. Downstream consumers —
`src/lib/activitySteps.js`, `src/screens/SettingsHealthScreen.js`,
`src/lib/database.js:1477` (health-import de-duplication column) — are live code
paths that can never fire.

**Verdict: the health integration is fully and correctly severed at the native
boundary.** The removal is the safest possible shape (no dependency, no
permission, no manifest entry), and the residual JS is dead but harmless. The
one live consequence is a Settings screen that offers a feature which is always
unavailable — see finding **F-10**.

---

## 10. Camera and photo plugins

| Plugin | Config | Evidence |
|---|---|---|
| `react-native-vision-camera` | `cameraPermissionText`, `enableCodeScanner: true`, `enableMicrophonePermission: false` | `app.json:173-180` |
| `expo-camera` | `cameraPermission` (progress-photo wording, explicitly promises photos stay on device), `recordAudioAndroid: false` | `app.json:181-187` |
| `expo-media-library` | `photosPermission`, `savePhotosPermission`, `isAccessMediaLocationEnabled: false` | `app.json:126-133` |

Two camera stacks coexist by role: Vision Camera drives barcode/label scanning,
`expo-camera` drives progress photos.

Microphone and media-location are disabled at every layer, and the matching
Android permissions are **blocked** rather than merely unrequested:
`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`, `SYSTEM_ALERT_WINDOW`,
`READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO` — `app.json:74-80`. Blocking
`READ_MEDIA_*` while shipping `expo-media-library` is the right call for a
save-only use case and is the kind of thing Play review notices.

The iOS `NSMicrophoneUsageDescription` and
`NSLocationWhenInUseUsageDescription` strings (`app.json:33-34`) both state in
plain English that the permission is never requested and exists only because a
bundled library forces the key. Correct and honest.

`expo-image-picker ~17.0.11` (`package.json:98`) is installed with **no config
plugin entry**, so it ships with default permission strings rather than
Volyume-worded ones on iOS.

---

## 11. Widgets

### 11a. Android — live

`react-native-android-widget ^0.20.3` (`package.json:122`), configured in
`app.json:244-274` with two widgets:

| Widget | Size | Update period | Evidence |
|---|---|---|---|
| `NextSession` | 180×110dp, 3×1 cells, resize both axes | 1,800,000 ms (30 min) | `app.json:248-259` |
| `WeeklyConsistency` | 110×110dp, 2×1 cells, no resize | 1,800,000 ms (30 min) | `app.json:260-271` |

Both use `./assets/notification-icon.png` as their preview image
(`app.json:254`, `:266`) — a placeholder, not a widget preview.

Runtime wiring: `index.js:8-18` registers the task handler on Android only,
inside a `try/catch` so a build without the plugin degrades to a no-op.
`src/widgets/widgetTaskHandler.js` reads a snapshot from AsyncStorage and
renders `src/widgets/widgets.js`, which are pure renderers with a documented
privacy rule — *"Free tier; NEVER weight, calories or body data (the home
screen is semi-public)"* (`src/widgets/widgets.js:6-7`).

### 11b. iOS — built, tested, and deliberately NOT shipped

`plugins/withVolyumeWidget.js` (9,959 bytes) is a complete Expo config plugin
that creates a `VolyumeWidget` app-extension target (bundle id
`app.volyume.widget`, deployment target 16.1), compiles the Swift sources from
`modules/live-activity/widget/`, writes the Info.plist and entitlements, and
embeds the `.appex`. It is idempotent on re-prebuild.

**It is not in the `app.json` plugins array** (`app.json:111-276` contains no
`./plugins/withVolyumeWidget` entry), and a test **actively pins that
absence**:

```js
// src/lib/__tests__/liveActivity.wiring.test.js:121-129
test('app.json does NOT wire the widget plugin (extension parked 2026-07-12, unprovisioned)', () => {
  // Wiring an unprovisioned extension target fails App Store signing, so the
  // plugin stays out of the build until the widget App ID / App Group
  // profile is set up. …
  expect(app.expo.plugins).not.toContain('./plugins/withVolyumeWidget');
  expect(app.expo.ios.infoPlist.NSSupportsLiveActivities).toBe(true);
});
```

Consequence: on iOS there is **no Live Activity, no Dynamic Island, and no
home/lock-screen widget**, while `app.json:30` still advertises
`NSSupportsLiveActivities: true`. `modules/live-activity/index.ts:25-31`
records the runtime shape — the module links, but `Activity.request()` throws.
The blocker is founder-side provisioning (App ID `app.volyume.widget` + App
Group + profile), not code. See finding **F-4**.

---

## 12. Background work

**iOS `UIBackgroundModes`:** `["fetch", "remote-notification"]` —
`app.json:36-39`.

**Task definitions** (`App.js`):

| Task | Defined | Registered | Cadence |
|---|---|---|---|
| `VOLYUME_REST_TIMER_KEEPALIVE` | `App.js:82`, `:84` | not registered with BackgroundFetch in `App.js` | — |
| `VOLYUME_DAILY_SYNC` | `App.js:100`, `:102` | `App.js:705`, guarded by `BackgroundFetch.getStatusAsync()` at `:703-704` | `minimumInterval: 12 * 60 * 60` s, `stopOnTerminate: false`, `startOnBoot: true` (`App.js:706-708`) |

`startOnBoot: true` is why `android.permission.RECEIVE_BOOT_COMPLETED` is
declared (`app.json:69`). Registration failure is swallowed with a comment
noting foreground sync covers it (`App.js:710`).

**Android foreground service.** Two flags to keep apart:

1. `USE_FOREGROUND_SERVICE = false` — `src/lib/notifications/activeWorkout.js:49`,
   read at `:138`. This governs the **whole-session** notification, which is
   itself disabled; the comment at `:36-48` explains the history
   (`FOREGROUND_SERVICE_TYPE_HEALTH` threw a `SecurityException` from Android 14).
2. The **rest-window** service that IS live:
   `modules/rest-timer-live/.../WorkoutForegroundService.kt`, typed
   `shortService`, orchestrated by `src/lib/notifications/restForeground.js`.
   Pinned by `src/__tests__/e6aRestSurvival.guard.test.js:35-46`, which asserts
   `android:foregroundServiceType="shortService"`, `android:exported="false"`,
   `FOREGROUND_SERVICE_TYPE_SHORT_SERVICE`, and the **absence** of anything
   matching `/health/i` or `FOREGROUND_SERVICE_TYPE_HEALTH`.

The `FOREGROUND_SERVICE` permission at `app.json:70` therefore backs the live
shortService path, not the disabled one. `SCHEDULE_EXACT_ALARM`
(`app.json:72`) and `WAKE_LOCK` (`:71`) back the notification scheduler.

---

## 13. Deep links

**Scheme:** `volyume` — `app.json:11`. Navigation accepts both prefixes:
`prefixes: ['volyume://', 'https://volyume.app']` —
`src/navigation/RootNavigator.js:749`. Cold and warm links are handled at
`App.js:610-611`; notification-tap links are re-opened at `App.js:686-690`,
restricted to URLs starting `volyume://`.

**Android intent filters** (`app.json:81-109`), both `autoVerify: true`:

1. `scheme: "volyume"` — custom scheme (`autoVerify` is meaningless here but
   harmless).
2. `scheme: "https"`, `host: "volyume.app"` — **no `pathPrefix`**, so the app
   claims **every path on volyume.app**, including the marketing site, the
   privacy policy and the support pages. See finding **F-7**.

**Android App Links verification** is correctly plumbed. `public/.well-known/assetlinks.json`
carries `REPLACE_WITH_*` placeholders **in the repo**, but
`.github/workflows/deploy-pages.yml:60-93` derives the upload-key SHA-256 from
the keystore secret, reads the Play App Signing SHA-256 from
`PLAY_APP_SIGNING_SHA256`, and rewrites the file at deploy time — then
`:97-116` **fails the deploy closed** if any `REPLACE_WITH` survives in a
served association file. `public/CNAME` is `volyume.app`, so GitHub Pages serves
the domain. This is correct by design; the placeholders are not a defect.

**iOS Universal Links do not work.** `public/.well-known/apple-app-site-association`
is real and committed, declaring `appID: "K79JA5JUF8.app.volyume"` and
`paths: ["/partner/*"]`. But **`app.json` contains no `ios.associatedDomains`
and no `ios.entitlements` block at all** — the `ios` key holds exactly
`buildNumber`, `bundleIdentifier`, `infoPlist`, `privacyManifests`,
`requireFullScreen`, `supportsTablet`, `usesAppleSignIn`. Without the
`applinks:volyume.app` associated domain in the entitlement, iOS never fetches
the AASA and never routes the link. The server side is ready; the app side
never claims the domain. See finding **F-5**.

Note the mismatch in reach as well: Android claims all of `volyume.app`, iOS
would claim only `/partner/*`. The two platforms disagree about what a
volyume.app link means even before the entitlement gap.

---

## 14. Complete native-module and config-plugin inventory

### `app.json` plugins array, in order (`app.json:111-276`)

| # | Plugin | Line | What it does |
|---|---|---|---|
| 1 | `expo-splash-screen` | 112-124 | Splash logo, 220px wide, `#0D0D0D` background, contain, explicit dark variant |
| 2 | `expo-secure-store` | 125 | Keychain/Keystore — holds the SQLCipher key and the Supabase session |
| 3 | `expo-media-library` | 126-133 | Save share cards to the gallery; media-location off |
| 4 | `expo-quick-actions` | 134-158 | iOS home-screen shortcuts: "Start workout" → `volyume://workout/start`, "Log food" → `volyume://diary` |
| 5 | `expo-sqlite` | 159-164 | **`useSQLCipher: true`** — the encrypted local database |
| 6 | `expo-apple-authentication` | 165 | Sign in with Apple (paired with `ios.usesAppleSignIn`, `app.json:27`) |
| 7 | `@react-native-google-signin/google-signin` | 166 | Google OAuth — **Android only** at the native layer (`react-native.config.js:16-20`) |
| 8 | `expo-local-authentication` | 167-172 | Face ID / biometric app lock |
| 9 | `react-native-vision-camera` | 173-180 | Barcode + label scanning, code scanner on, microphone off |
| 10 | `expo-camera` | 181-187 | Progress photos, Android audio recording off |
| 11 | `expo-notifications` | 188-195 | Notification icon `#F59E0B`, no custom sounds |
| 12 | `expo-build-properties` | 196-235 | SDK levels, cleartext off, Android `manifestQueries` for WhatsApp/SMS/mailto share targets, iOS deployment target 16.0 |
| 13 | `@sentry/react-native/expo` | 236-243 | Source-map upload, org `volyume`, project `volyume` |
| 14 | `react-native-android-widget` | 244-274 | The two Android home-screen widgets (§11a) |
| 15 | `@react-native-community/datetimepicker` | 275 | Native date/time picker |

### Local Expo modules (`modules/`, all `private: true`, linked by `file:` path)

| Module | Platforms | Purpose | Evidence |
|---|---|---|---|
| `live-activity` | **iOS only** | Live Activity / Dynamic Island rest timer + the App-Group snapshot writer for the iOS widget. **Inert** — the extension target is unwired (§11b) | `package.json:117`, `modules/live-activity/expo-module.config.json` |
| `rest-timer-live` | **Android only** | `WorkoutForegroundService` chronometer notification for the rest window, with +15s / Skip actions routed as `getService` PendingIntents | `package.json:139`, `modules/rest-timer-live/expo-module.config.json`, `src/lib/notifications/restForeground.js:1-25` |
| `progress-scan-image` | **Android + iOS** | Still-image RGB preprocessing for Progress Scan | `package.json:118`, `modules/progress-scan-image/expo-module.config.json` |

`plugins/withVolyumeWidget.js` is the fourth native surface — a real config
plugin, present, tested, and **not wired** (§11b).

### Autolinking overrides (`react-native.config.js`)

Three packages are excluded from **iOS** autolinking, each with a recorded
production failure as its reason:

- `@react-native-google-signin/google-signin` (`:18-20`) — its pod chain
  (GoogleSignIn ~> 9.0 → AppCheckCore → GoogleUtilities) cannot integrate as
  static libraries, so `pod install` failed and killed the EAS iOS build.
- `react-native-ios-utilities` (`:32-34`) and `react-native-ios-context-menu`
  (`:35-37`) — `RNIBaseView` threw a fatal `NSUnknownKeyException` during Fabric
  component-descriptor registration at **app start** on RN 0.81, crash-looping
  TestFlight build 40 (Sentry VOLYUME-1X). Kept in `package.json` because
  zeego's shared sources import them for the Android bundle; the single JS
  consumer is platform-forked at
  `src/components/workout/SetRowMenu.ios.js`.

The same three are mirrored in `package.json:167-176` under
`expo.autolinking.apple.exclude`.

### Other native-bearing dependencies not in the plugins array

`@shopify/react-native-skia` 2.2.12, `react-native-reanimated ~4.1.1` +
`react-native-worklets` 0.5.1, `react-native-nitro-modules` 0.35.9,
`react-native-fast-tflite ^3.0.1` (Progress Scan segmentation),
`@react-native-ml-kit/text-recognition ^2.0.0` (nutrition-label OCR),
`react-native-iap ^15.3.1`, `react-native-keyboard-controller` 1.18.5,
`react-native-gesture-handler`, `react-native-screens`, `react-native-svg`,
`react-native-webview`, `react-native-haptic-feedback` — all autolinked without
explicit config (`package.json:68-141`).

### Build-chain config

- **Metro** (`metro.config.js`): wrapped in `getSentryExpoConfig(__dirname, {
  includeWebReplay: false })` (`:16`) so debug IDs are emitted for source-map
  symbolication and the web-only replay surface resolves to empty on native.
  Adds `dat` (OpenFoodFacts UK snapshot) and `tflite` (Progress Scan model) to
  `assetExts` (`:17-21`) so they bundle as registry IDs.
- **Babel** (`babel.config.js`): `babel-preset-expo`;
  `transform-remove-console` **only when `NODE_ENV === 'production'`**, with
  `error` and `warn` preserved (`:14-16`); `react-native-worklets/plugin` last
  (`:20`). The cache key correctly includes `NODE_ENV` (`:5`) — `api.cache(true)`
  would have frozen the first environment's result.

---

## 15. PHASE 8 — identity cross-wiring audit

**Method.** Repo-wide grep excluding `node_modules/` and `docs/` for:
`*.supabase.co`, `adphysique`/`ADPhysique`, `com.volyume`, `app.volyume.*`,
`staging`/`STAGING`, `volyume.dev`, and alternate deep-link hosts.

### Every `*.supabase.co` occurrence, classified

| # | Location | Value | Classification |
|---|---|---|---|
| 1 | `.env.example:2` | `https://your-project-id.supabase.co` | **PRODUCTION-CORRECT** — documented placeholder |
| 2 | `src/__tests__/error-and-feedback-pipeline.test.js:32` | `https://test.supabase.co` | **TEST-ONLY** — assigned to `process.env` inside a Jest file; never bundled |
| 3 | `src/lib/__tests__/authErrorCopy.test.js:26` | `getaddrinfo ENOTFOUND sujrylzzxcqxxfygptns.supabase.co` | **TEST-ONLY** — a captured DNS-failure string used as an error-copy fixture. It embeds what appears to be the real production project ref. Not a secret (the ref is in every client's network traffic and is public-by-design), but see **F-8** |
| 4 | `src/lib/supabase.js:331` | prose in a comment: *"…supabase.co URL on screen…"* | **PRODUCTION-CORRECT** — comment text, no URL |
| 5 | `supabase/functions/app-store-notifications/index.ts:33` | `https://<project>.supabase.co/functions/v1/…` | **PRODUCTION-CORRECT** — templated doc comment |
| 6 | `supabase/functions/play-billing-rtdn/index.ts:39` | `https://<supabase-project>.supabase.co/functions/v1/…` | **PRODUCTION-CORRECT** — templated doc comment |
| 7 | `.github/workflows/refresh-off-snapshot.yml:12` | `https://<project>.supabase.co` | **PRODUCTION-CORRECT** — templated doc comment |
| 8 | `.github/workflows/build-android.yml:114`, `:121`, `:510` | `https://abcdef.supabase.co` | **PRODUCTION-CORRECT** — example in a length-validation message |
| 9 | `scripts/seed/uploadOffToSupabase.js:15` | `https://<project>.supabase.co` | **PRODUCTION-CORRECT** — templated doc comment |

**No hardcoded live Supabase URL exists in `src/`.** Every runtime read is
`process.env.EXPO_PUBLIC_SUPABASE_URL` (§6a).

### Identifiers

Exactly **one** identifier family exists in the tree:

- `app.volyume` — Android package (`app.json:63`) and iOS bundle
  (`app.json:24`).
- `app.volyume.widget` — the iOS widget extension, referenced only in
  `plugins/withVolyumeWidget.js:48`, `:29`, `modules/live-activity/index.ts:36`,
  and `src/lib/__tests__/notifications.pushToken.test.js:147` (a captured
  Firebase error string). **PRODUCTION-CORRECT** — a legitimate child bundle id,
  not an alternate app identity.
- `group.app.volyume.widget` — App Group
  (`plugins/withVolyumeWidget.js:53`, `src/lib/widgets/storage.js:24`).
  **PRODUCTION-CORRECT**.

**No `com.volyume`, no `com.adphysique`, no `.dev`/`.staging` variant, no
alternate applicationId, no `applicationIdSuffix` anywhere.** The working
directory is named `ADPhysique` — a legacy directory name only; the string
appears in no tracked file.

### Deep-link hosts

`volyume.app` is the only host in `app.json:101`,
`src/navigation/RootNavigator.js:749`, `public/CNAME`,
`public/.well-known/assetlinks.json` and
`public/.well-known/apple-app-site-association`. No wrong or stale host.

### Staging

**There is no staging environment.** No staging profile in `eas.json`, no
staging URL, no staging identifier, no `APP_VARIANT` consumer (§6d). The only
`staging`-matching strings in `src/` are the English word in unrelated comments
(`src/screens/ProOnboardingScreen.js:818`, `src/screens/DiaryScreen.js:335`).

**Phase 8 verdict: NO cross-wiring defects.** Every occurrence is
PRODUCTION-CORRECT or TEST-ONLY. The one item worth the founder's attention is
`authErrorCopy.test.js:26` (**F-8**), which is a hygiene point, not a defect.

---

## 16. PHASE 9 — secrets and environment audit

### Secret-shaped values committed to the repo

| Value | Location | Genuinely secret? | Assessment |
|---|---|---|---|
| Google OAuth web client ID `520741631478-apaethkp3g55o06lott116jag73l0ves.apps.googleusercontent.com` | `src/lib/supabase.js:328`, used at `:353` | **No — public by design.** An OAuth *client ID* for a public/installed client is not a credential; the client *secret* is what matters and is not here | **PRODUCTION-CORRECT.** Correct to commit; it must match the value in Supabase Auth's Google provider |
| Apple Team ID `K79JA5JUF8` | `public/.well-known/apple-app-site-association` | **No** — published in every App Store binary and required in the served AASA | **PRODUCTION-CORRECT** |
| Supabase anon key | **not in the repo** — env-injected only (`src/lib/supabase.js:96`) | Public by design when present (it is RLS-bound and ships in the client bundle) | **PRODUCTION-CORRECT** |
| Sentry DSN | **not in the repo** — env-injected only (`src/lib/sentry.js:51`) | Public by design (write-only ingestion endpoint) | **PRODUCTION-CORRECT** |
| USDA API key | **not in the repo** — env-injected only (`src/lib/food/sources/usda.js:28`) | Low-value; rate-limit key | **PRODUCTION-CORRECT** |
| `SUPABASE_SERVICE_ROLE_KEY` | referenced only as an env expansion inside Edge Functions; pinned by `src/lib/__tests__/rtdnWebhook.contract.test.js:67`, `appStoreWebhook.contract.test.js:25`, `sendPush.contract.test.js:31` | **YES — genuinely secret** | **PRODUCTION-CORRECT.** Never a literal; server-side only, never in the client bundle |
| Android keystore + passwords | GitHub Actions secrets only (`build-android.yml:263-266`); `*.jks`, `*.p12`, `*.key` gitignored (`.gitignore:7-10`) | **YES** | **PRODUCTION-CORRECT** |
| Apple ASC API key | `ASC_API_KEY_P8`, `ASC_KEY_ID`, `ASC_ISSUER_ID` as Actions secrets (`build-ios.yml:131`); `AuthKey_*.p8` and `*.p8` gitignored (`.gitignore:34`, `:8`) | **YES** | **PRODUCTION-CORRECT** |
| `google-play-service-account.json` | named at `eas.json:48`; gitignored at `.gitignore:33`; **absent from the tree** | **YES** | **PRODUCTION-CORRECT** (and inert — §3 note 5) |
| `SENTRY_AUTH_TOKEN` | Actions secret (`build-android.yml:207`, `build-ios.yml:174`) | **YES** | **PRODUCTION-CORRECT**, with a correct fail-soft to `SENTRY_DISABLE_AUTO_UPLOAD=true` when absent |
| Three personal email addresses (`allansdouglas1983@`, `allansdoug1983@`, `allanhendy69@` gmail.com) | `src/lib/progressScanCalibrationAccess.js:1-5` | Not a secret, but **personal data compiled into every shipped bundle** | **RISK — see F-12** |

**Scans run and clean:** no JWT-shaped literal (`eyJ…`) outside two test
fixtures (`error-and-feedback-pipeline.test.js:179`, `:184`, both synthetic
`'eyJ-leak-token'` used to assert redaction); no Sentry-DSN-shaped literal
anywhere; no `sk_live`/`sk_test`; no `-----BEGIN` private-key block; no inline
`apiKey|secret|token = "<16+ chars>"` in `src/`.

### Can a production build point at staging?

**No — and not because of a guard, but because staging does not exist.**

There is no staging Supabase project referenced anywhere, no staging EAS
profile, no staging identifier, and `APP_VARIANT` is read by nothing (§6d).
A build points wherever the four `EXPO_PUBLIC_*` GitHub Actions secrets point.

Both sides of that:

- **Reassuring:** there is no code path by which a production build could
  select a non-production backend. The class of bug is absent.
- **The actual exposure:** the *only* thing separating production from anything
  else is the value of a GitHub Actions secret. Repoint
  `EXPO_PUBLIC_SUPABASE_URL` and every profile — development, preview,
  production — follows it, because all four build the same `app.volyume`
  identifier. There is no second identifier, so a mis-pointed **development**
  build installs over the production app and writes to the production database
  under the production package name.

The mitigations that do exist are: the pre-build length validation at
`build-android.yml:105-128`, the required-variable presence loop at
`build-ios.yml:131`, and the fail-closed null client at
`src/lib/supabase.js:97`. Those catch *empty* and *truncated*, not *wrong*.
Recorded as **F-3**.

**EU residency (Section 2 inviolable):** the client never hardcodes a region;
residency is a property of the Supabase project the secret names. Nothing in
the repo can move data out of EU-Dublin, and nothing in the repo verifies that
it hasn't. That is the correct division — but it means residency rests entirely
on the secret's value.

---

## 17. PHASE 10 — feature and platform flags

### Complete inventory of module-level boolean flags

A repo-wide sweep of `src/`, `App.js` and `index.js` for
`^\s*(export )?const [A-Z][A-Z0-9_]{2,} = (true|false)` returns **exactly four**
flags. There is no `src/config/` directory and no flags module.

| Flag | file:line | Production value | Purpose | Verdict |
|---|---|---|---|---|
| `ONBOARDING_QUIZ_FIRST` | `src/lib/onboarding/quizFlow.js:24` | **`false`** | Quiz-first front door, turned off by founder decision 2026-06-26 because a free-style quiz on the Pro CTA broke the Pro flow (`quizFlow.js:19-23`). Read at `src/screens/WelcomeScreen.js:69` | **CORRECT.** Regression-guarded: `src/__tests__/campaign5.firstUse.test.js:82-84` asserts the source literally contains `export const ONBOARDING_QUIZ_FIRST = false;` |
| `PRO_BETA_ACTIVE` | `src/lib/proGate.js:28` | **`false`** | The closed-test override that used to force `tier = 'pro'`. Read at `src/store/useAppStore.js:816-817` and `:1036-1037` | **CORRECT.** Matches CLAUDE.md §1. With it false, tier is authoritative from real trial/subscription state. Pinned by `src/lib/__tests__/proGate.test.js:13`. **No Pro feature is exposed to free users via this flag** |
| `PHASE_PRE_ACCOUNT` | `src/lib/onboarding/quizFlow.js:48` | **`true`** | Whether the training-phase question (cut / lean gain / maintain) may be asked before account creation. Deliberate conservative default: treated as a goal preference, not a health-status statement; flipping to `false` moves the ask behind the Article 9 gate (`quizFlow.js:44-47`) | **CORRECT but GDPR-adjacent.** It is a live Article 9 classification decision carried by a flag, with the DPO note recorded in the source. Only reachable via the quiz flow, which `ONBOARDING_QUIZ_FIRST = false` currently disables — so it is doubly dormant today |
| `USE_FOREGROUND_SERVICE` | `src/lib/notifications/activeWorkout.js:49` | **`false`** | The foreground-service-backed **whole-session** notification. Read at `activeWorkout.js:138`. Stays false because the session-length notification surface is itself disabled, and a `shortService` (~3 min) cannot host a session-length notification anyway (`activeWorkout.js:36-48`) | **CORRECT.** Distinct from the live rest-window `shortService` path (§12), which is pinned by `src/__tests__/e6aRestSurvival.guard.test.js:35-46` |

### `__DEV__`-gated surfaces

| Surface | file:line | Production behaviour |
|---|---|---|
| Sentry environment | `src/lib/sentry.js:77` | `'production'` when not `__DEV__` — correct |
| Sentry trace sampling | `src/lib/sentry.js:89` | `0.05` in production, `1.0` in dev — matches CLAUDE.md §1 |
| Verbose logging | `src/lib/errorLog.js:25` | `VERBOSE_LOGGING = false` in production |
| OTA check | `App.js:656` | `if (__DEV__) return;` — production-only, and inert (§5) |
| Debug-log long-press | `src/screens/SettingsAboutScreen.js:18` | Long-press path exists **only in `__DEV__`**. In production, DebugLog is reachable solely via an unadvertised 7-taps-in-3s gesture (`SettingsAboutScreen.js:19-20`), added because the old accessibility label advertised debug logs to every screen-reader user. **Correctly hidden** |
| Progress-Scan calibration export | `src/lib/progressScanCalibrationAccess.js:12` | `if (__DEV__) return true;` — in production, gated to a three-address email allowlist (`:1-5`, `:13`). **Not exposed to users**, but see **F-12** |
| Engine dev warnings | `src/lib/notifications/scheduler.js` (16 sites), `coachResponse.js:42`, `coachRegister.js:48`, `whyThisTemplates.js:86`, `progressScanCoachResolver.js:13` | Dev-only diagnostics, stripped/no-op in production |

### Explicit checks required by the brief

- **No dev-only feature is exposed in production.** The two candidates —
  DebugLog and the calibration export — are both correctly gated.
- **No removed feature is toggled on.** Health is severed at the native
  boundary with no flag to revive it (§9). The quiz is off and test-pinned. The
  iOS widget extension is unwired and test-pinned.
- **No cardio flag exists.** A case-insensitive `cardio` sweep across `src/`
  and `App.js` returns only data-layer functions (`deleteCardioLog`,
  `getCardioLogUpdatedAt`, `insertCardioLogFromCloud` and the `cardio_log`
  table — `src/lib/database/activity.js:58-160`) and one unrelated comment
  (`src/components/TodayStrip.js:6`). **Cardio is a shipped data domain, not a
  flagged feature.**

---

## 18. Findings — consolidated

Ordered by consequence. `F-1`, `F-2`, `F-4`, `F-5` are the ones that change
what the app can do in a user's hands.

| # | Severity | file:line | Consequence |
|---|---|---|---|
| **F-1** | **DEFECT** | `App.js:652-675` + `app.json` (no `updates` key) + `eas.json:6-44` (no `channel`) | `expo-updates` is installed and called in production but has no configured update URL or channel, so `checkForUpdateAsync()` throws into a silent `catch` — Volyume has **no OTA route** and every fix, including a critical one, requires a full store release. |
| **F-2** | **DEFECT** | `src/lib/notifications/pushToken.js:92` + `app.json` (no `googleServicesFile`; no `google-services.json` in tree or workflows) | Android has no FCM credentials in the build, so `getExpoPushTokenAsync()` fails, `pushToken.js:43-51` swallows it, and **remote push silently never works on Android** — the `send-push` Edge Function and the `device_push_tokens` table have no Android tokens to target. |
| **F-3** | **RISK** | `eas.json:11`, `:18`, `:25`, `:35` (`APP_VARIANT` set) vs. zero consumers repo-wide | All four build profiles produce the **same `app.volyume` identifier against the same backend**; a development or preview build installs over the production app and writes to the production database, and nothing in the repo prevents it. |
| **F-4** | **DEFECT** | `app.json:30` (`NSSupportsLiveActivities: true`) vs. `app.json:111-276` (plugin unwired), pinned by `src/lib/__tests__/liveActivity.wiring.test.js:121-129` | iOS advertises Live Activities support while the widget extension target is never created, so `Activity.request()` throws (`modules/live-activity/index.ts:25-31`) — **no Live Activity, no Dynamic Island, no iOS home-screen widget**, and Android widget parity is absent on iOS. Blocked on founder-side provisioning, not code. |
| **F-5** | **DEFECT** | `app.json:22-56` (no `ios.associatedDomains`, no `ios.entitlements`) vs. `public/.well-known/apple-app-site-association` | iOS never claims `volyume.app`, so the served AASA is never fetched and **`https://volyume.app/partner/*` links open Safari instead of the app** on iOS — the partner-invite flow is broken on one platform while working on the other. |
| **F-6** | **RISK** | `app.json:25` (`buildNumber: "10"`) vs. `eas.json:4` (`appVersionSource: "remote"`), `:33` (`autoIncrement: true`); real builds at 40/48 per `react-native.config.js:21` and `src/lib/supabase.js:64-65` | The committed iOS build number is inert and ~4× behind reality, so any human or script reading `app.json` for the shipped iOS build number gets a wrong answer — and `SettingsAboutScreen.js:123` renders `Constants.expoConfig.ios.buildNumber` to users. |
| **F-7** | **RISK** | `app.json:98-102` (https intent filter with `host: "volyume.app"` and **no `pathPrefix`**) | Android claims **every** path on volyume.app, so tapping the marketing site, privacy policy or a support link opens the app instead of the browser; iOS (were F-5 fixed) would claim only `/partner/*`, so the two platforms disagree about what a volyume.app link means. |
| **F-8** | **RISK** | `src/lib/__tests__/authErrorCopy.test.js:26` | A test fixture embeds what appears to be the **live Supabase project ref** (`sujrylzzxcqxxfygptns`) as a literal; not a secret (it is public-by-design), but it pins a production infrastructure identifier into a test, so a project migration silently breaks the suite. |
| **F-9** | **RISK** | `src/lib/notifications/channels.js:33`, `:71` (bare `try {} catch {}`) | If channel creation fails, the failure is completely silent, and on Android 8+ **every subsequent notification targeting a missing channel is dropped by the OS** with no telemetry — contrary to the `trackNotificationFailed` convention in CLAUDE.md §3. |
| **F-10** | **RISK** | `src/lib/health.js:98-99` (`getIosModule`/`getAndroidModule` return `null`) + `src/screens/SettingsHealthScreen.js` | `isHealthAvailable()` is permanently `false`, so a Settings screen still offers Apple Health / Health Connect (`health.js:116-119` returns those labels) for an integration that can never connect — a user-visible dead end. |
| **F-11** | **RISK** | `src/widgets/widgets.js:4-5` | The source comment describes widget snapshot logic as *"OTA-patchable"*, which is false given F-1; a future change made on that assumption ships broken until the next store release. |
| **F-12** | **RISK** | `src/lib/progressScanCalibrationAccess.js:1-5` | Three personal email addresses — including two that are not the founder's primary — are compiled as literals into **every shipped production bundle** and are trivially recoverable from the APK; a server-side or hashed allowlist would carry no personal data to users' devices. |
| **F-13** | **RISK** | `app.json:64` (`versionCode: 30`); no `versionCode` handling in `.github/workflows/*.yml` or `scripts/*.cjs` | The Android versionCode is a **manual bump with no CI guard** (last moved by hand in `d97d513f`), so a forgotten bump produces an AAB that Play rejects at upload, after a full build. |
| **F-14** | **OBSERVATION** | `eas.json:14-20` | `development-device` is byte-identical to `development` — the device-vs-simulator distinction its name implies (`ios.simulator`) is not encoded, so the two profiles build the same artefact. |
| **F-15** | **OBSERVATION** | `eas.json:40-42`, `:45-52` | `production.android.buildType` and the whole `submit.production.android` block are inert — Android builds via local prebuild + Gradle (`build-android.yml:195`, `:390`), never through EAS, and the named `google-play-service-account.json` is gitignored and absent, so `eas submit --platform android` would fail today. |
| **F-16** | **OBSERVATION** | `package.json` (no `expo-constants` entry); resolved at `node_modules/expo-constants@18.0.13` | `expo-constants` is imported by at least six runtime modules (`src/lib/observability.js:66`, `src/lib/notifications/pushToken.js:62`, `src/screens/SettingsAboutScreen.js:75`, and others) but is an **undeclared transitive dependency**; a future Expo release that stops hoisting it breaks those modules with no lockfile signal. |
| **F-17** | **OBSERVATION** | `app.json:277-281` vs. `app.json:188-195` | The legacy top-level `notification` block duplicates the `expo-notifications` plugin config; the plugin is authoritative in SDK 54, so two places claim to set the notification icon and colour. |
| **F-18** | **OBSERVATION** | `package.json:98` (`expo-image-picker`, no plugin entry in `app.json:111-276`) | `expo-image-picker` ships with default iOS permission strings rather than Volyume-worded ones, inconsistent with the carefully written strings for every other camera/photo surface (§10). |

### Confirmed correct — worth recording as *not* findings

- **No identity cross-wiring.** One identifier family, one backend, no staging,
  no alternate host (§15).
- **No genuine secret is committed.** Every secret-shaped literal is
  public-by-design; every real credential is an Actions/EAS secret with the
  matching gitignore rule (§16).
- **Android App Links association is correct**, with deploy-time fingerprint
  injection **and** a fail-closed placeholder guard
  (`deploy-pages.yml:60-116`).
- **Every flag sits at its correct production value**, three of the four
  test-pinned; no dev-only feature is exposed; no removed feature is toggled
  on; **no cardio flag exists** (§17).
- **Blocked Android permissions** (`app.json:74-80`) go beyond not-requesting
  to actively blocking `RECORD_AUDIO`, `READ_MEDIA_IMAGES` and
  `READ_MEDIA_VIDEO` — the right posture for Play review.
- **Client fails closed on missing config** (`src/lib/supabase.js:97`), and CI
  validates secret shape before building (`build-android.yml:105-128`).
- **The rest-window foreground service is correctly typed** `shortService`,
  never `health`, and is regression-pinned
  (`src/__tests__/e6aRestSurvival.guard.test.js:35-46`).

---

*Traced read-only. No code, config or git state was changed by this lane.*
