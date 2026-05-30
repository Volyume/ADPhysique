# Volyume native Google Sign-In: implementation spec and runbook

Date: 2026-05-30. Spec and runbook pass. No app code was changed.
The only file produced is this document.

Scope: migrate Volyume's Google sign-in from the current Supabase
web-redirect OAuth flow to native Google Sign-In, where the app gets
a Google ID token on-device against Al's own Google OAuth client and
hands that token to Supabase via `supabase.auth.signInWithIdToken`.
Apple sign-in stays exactly as it is today.

Web research note: the Supabase native-Google steps, the library
version pin, and the nonce behaviour below were confirmed against
live sources on 2026-05-30 (see Appendix). The
`react-native-google-signin` Expo setup page would not load in this
environment (TLS error), so the iOS URL-scheme / prebuild details
rest on the Supabase doc, the library's published peer ranges, and
training knowledge. Those points are flagged inline.

---

## Executive summary

**What changes.** Today "Continue with Google" opens an in-app
browser pointed at `<project-ref>.supabase.co/auth/v1/authorize`,
the user signs in on Google's web page, and the result returns to
the app over the `volyume://` deep link. We replace that single hop
for Google only with a native call: the Google SDK shows the system
account picker, returns an ID token signed for Al's own Google
client, and we pass that token straight to Supabase. The browser
and the `volyume://` round trip are no longer used for Google.

**What the user sees.** Tapping "Continue with Google" brings up the
native Google account sheet. The consent text reads "Sign in to
Volyume" because the ID token is minted against Al's own Google
OAuth client, not Supabase's. No browser, no address bar, no
`supabase.co` string anywhere. This solves the branding problem the
prior audit (`volyume-oauth-branding-audit-2026-05-30.md`) could
only soften, because `supabase.co` never appears in the flow at all.

**What Al must set up (before any code ships).**
1. Google Cloud Console: create a **Web** OAuth client, an **iOS**
   OAuth client (bundle id `app.volyume`), and an **Android** OAuth
   client (package `app.volyume` plus the SHA-1 fingerprints of both
   the EAS signing key and the Play App Signing key).
2. Supabase dashboard: into the Google provider, set the Web client
   ID and secret, and add the iOS and Android client IDs to
   **Authorized Client IDs** so `signInWithIdToken` accepts tokens
   minted by them. Decide on the nonce setting.
3. Hand the three client IDs back to be wired into `.env` /
   `app.json`.

**Apple is untouched.** Apple keeps the existing Supabase web-redirect
OAuth flow and the `volyume://` return path. Nothing in this spec
removes or alters it.

**Build requirement.** This needs a custom dev build / EAS build.
Native Google Sign-In does not work in Expo Go. Volyume already
prebuilds and builds with EAS (`eas.json` has
`developmentClient: true`; `app.json` already carries native config
plugins), so this is no change of model, just one more plugin.

---

## Internal audit (current Google flow, cited)

Repo state at spec time: branch `main`, HEAD
`807fefa940f0eeaf33af0146330a433a170c272f`
("docs(audit): Google OAuth branding research and recommendation"),
working tree clean, `origin/main` equal to HEAD (0 ahead, 0 behind).
`git fetch origin` ran cleanly. Work is on `main`, the only branch
per Rule 9.

### How Google sign-in is invoked today

- `src/lib/supabase.js:111` sets `OAUTH_REDIRECT_URL = 'volyume://'`.
- `src/lib/supabase.js:113-156` is `_signInWithOAuthProvider(provider)`.
  It calls `c.auth.signInWithOAuth({ provider, options: { redirectTo:
  OAUTH_REDIRECT_URL, skipBrowserRedirect: true } })`
  (`src/lib/supabase.js:122-128`), opens the returned
  `*.supabase.co/auth/v1/authorize` URL with
  `WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT_URL)`
  (`src/lib/supabase.js:136-137`), and on success parses `?code=` and
  calls `exchangeCodeForSession` as a backup
  (`src/lib/supabase.js:139-147`).
- `src/lib/supabase.js:158-160` exposes `signInWithGoogle()` which
  delegates to `_signInWithOAuthProvider('google')`.
- `src/lib/supabase.js:162-169` exposes `signInWithApple()` which
  delegates to the same helper with `'apple'`.

The Supabase client is created with `detectSessionInUrl: false`
(`src/lib/supabase.js:36`) and a SecureStore session store
(`src/lib/supabase.js:7-17`, `31-37`). Both are correct for React
Native and do not change.

### The return path (deep link)

`App.js` completes the web-redirect exchange:

- `handleAuthDeepLink(url)` at `App.js:133-164` accepts `volyume://`
  and `https://volyume.app` (`App.js:135`), handles PKCE
  (`?code=` then `exchangeCodeForSession`, `App.js:140-143`) and the
  implicit fallback (`#access_token=` then `setSession`,
  `App.js:146-162`).
- Listeners are registered at `App.js:342-343`
  (`Linking.getInitialURL()` and `Linking.addEventListener('url', ...)`).

This deep-link handler stays. Apple still uses it, and so do the
Supabase confirmation-email links. Native Google simply stops
relying on it.

### Where the Google buttons live (three call sites)

All three import the helpers from `src/lib/supabase.js` and branch
on `provider === 'google' ? signInWithGoogle : signInWithApple`:

1. `src/screens/LoginScreen.js`
   - import at `:19`
   - `handleOAuth(provider)` at `:180-204`
   - Google button onPress at `:281` (`handleOAuth('google')`)
   - Apple button onPress at `:270` (iOS only)
2. `src/screens/ProOnboardingScreen.js`
   - import at `:17`
   - `handleOAuthOnboarding(provider)` at `:233-263`
   - Google button onPress at `:593`, Apple at `:582`
3. `src/screens/ProUpgradeScreen.js`
   - import at `:11`
   - `handleOAuth(provider)` at `:68-...` (polls `getSession` for up
     to 3 s after the dialog returns, `:81-99`)
   - Google button onPress at `:283`, Apple at `:272`

Because all three go through `signInWithGoogle()` in
`src/lib/supabase.js`, the cleanest change keeps that single seam:
rewrite the body of `signInWithGoogle()` to the native path and the
three screens barely change.

### What Apple does (must keep working unchanged)

Apple sign-in (`signInWithApple()`, `src/lib/supabase.js:162-169`)
runs the identical Supabase web-redirect OAuth flow through
`_signInWithOAuthProvider('apple')` and returns over `volyume://`.
The header comment at `:163-167` already flags that a future native
Apple button is a separate enhancement. This spec does not touch
Apple. After the change, `_signInWithOAuthProvider` remains in the
file, still called by `signInWithApple()`.

### Dependency baseline (audited)

`package.json`: Expo `~51.0.0` (`:39`), React Native `0.74.5`
(`:63`), `@supabase/supabase-js ^2.43.4` (`:37`), `expo-web-browser
~13.0.3` (`:60`). Neither `@react-native-google-signin/google-signin`
nor `expo-auth-session` nor `expo-apple-authentication` is present.
`signInWithIdToken` ships in supabase-js v2, so the installed
client already supports it; no Supabase SDK bump is required.

---

## Recommended library

**Use `@react-native-google-signin/google-signin`.** This is the
path Supabase documents for native Google on React Native, and it is
the one that returns a real Google ID token for `signInWithIdToken`.

Why not `expo-auth-session`'s Google provider:

- `expo-auth-session` runs a browser-based auth-code/PKCE flow. It
  can return an ID token, but it still routes through a web view and
  a redirect, which is the surface we are trying to remove. It does
  not give the native system account sheet.
- The native library shows the OS account picker (the
  "Sign in to Volyume" sheet), no browser, which is the entire point
  of this migration.

**Version pin (compatibility finding).** The library's latest is
`16.1.2`, but versions from `13.3.0` upward declare a peer of
`expo: >=52.0.40` (and 16.x the same), while Volyume is on Expo
SDK 51. The correct pin for SDK 51 is **`13.2.0`** (published
2025-02-15, peer `expo: >=50.0.0`, `react-native: *`). Pin it
exactly, do not float to `^13`, because `13.3.0` would resolve and
break the Expo peer. This was checked live via `npm view` on
2026-05-30.

**Config plugin.** The library ships an Expo config plugin and must
be added to `app.json` `plugins`. The plugin's one required option
is `iosUrlScheme`, the reversed iOS client ID
(`com.googleusercontent.apps.<id>`). After adding it, a fresh
prebuild and EAS build are required. The Android side needs no
plugin option; it reads the package name and the signing SHA-1 from
the build and Google Cloud.

```jsonc
// app.json → expo.plugins (add this entry)
[
  "@react-native-google-signin/google-signin",
  { "iosUrlScheme": "com.googleusercontent.apps.REVERSED_IOS_CLIENT_ID" }
]
```

(The exact plugin option name `iosUrlScheme` is confirmed by the
library's published Expo guide as surfaced in search; the live page
itself would not load here. Verify the spelling against the
installed package's `app.plugin.js` / README before the build.)

**Build model.** No change. `eas.json` already has a `development`
profile with `developmentClient: true` and `app.json` already loads
native plugins (`react-native-vision-camera`, `react-native-health`,
a custom `withHealthConnectPermissionDelegate`, etc.), so Volyume is
firmly on the prebuild + dev-client + EAS model. Expo Go was never
an option for this app and is not a regression here.

---

## Google Cloud setup

All three clients live in the same Google Cloud project, under
**APIs & Services > Credentials**. The names below are the standard
console labels.

### Why three client IDs

- **Web client ID + secret.** This is the audience Supabase
  validates against. Even though there is no web app, the native
  library uses the Web client ID as its `webClientId` (the
  "server client id"), and Supabase needs the matching client ID and
  secret in its Google provider config. Confirmed by the Supabase
  doc: "The Web client ID is the one used in your Android app."
- **iOS client ID.** Ties the ID token to the iOS bundle identifier
  so Google's iOS SDK will mint a token for this app. Provides the
  reversed-client-ID URL scheme for `Info.plist`.
- **Android client ID.** Ties the token to the Android package name
  plus the app's signing certificate SHA-1. Without the correct
  SHA-1, native sign-in fails with `DEVELOPER_ERROR`.

### Step by step

1. **OAuth consent screen.** Configure it once: app name "Volyume",
   support email, the Volyume logo, and the app domain `volyume.app`
   (verified in Search Console). Scopes stay the non-sensitive
   defaults (`openid`, `email`, `profile`), so this is light brand
   verification, not the sensitive-scope security review. This is
   the same consent screen the prior audit described; doing it here
   gives the native sheet the "Volyume" name and logo.

2. **Create the Web client.** Credentials > Create credentials >
   OAuth client ID > Application type **Web application**. No
   redirect URIs are needed for the native flow itself, but Supabase
   will give a callback URL when you wire the provider (step in the
   Supabase section); add that to the Web client's "Authorized
   redirect URIs" so the provider stays valid. Record the **Web
   client ID** and **client secret**.

3. **Create the iOS client.** Create credentials > OAuth client ID >
   Application type **iOS**. Bundle ID: **`app.volyume`** (from
   `app.json` `expo.ios.bundleIdentifier`, line 22). Record the
   **iOS client ID**. Google also shows the reversed client ID
   (`com.googleusercontent.apps.<id>`); that is the `iosUrlScheme`.

4. **Create the Android client.** Create credentials > OAuth client
   ID > Application type **Android**. Package name: **`app.volyume`**
   (from `app.json` `expo.android.package`, line 48). SHA-1: add the
   fingerprint(s) below. Record the **Android client ID**.

### Getting the SHA-1 fingerprints (Android)

Android OAuth clients are keyed on package name **plus** the SHA-1 of
the certificate that signs the APK/AAB. There are two signing
identities in play and both must be registered:

- **EAS-managed upload/debug key.** Ask EAS to print the credential:

  ```
  eas credentials
  ```

  Select Android > the build profile > "Keystore" to view the SHA-1
  (and SHA-256) of the keystore EAS uses to sign builds. For a local
  debug keystore the classic command is:

  ```
  keytool -list -v -keystore ~/.android/debug.keystore \
    -alias androiddebugkey -storepass android -keypass android
  ```

  Use whichever keystore actually signs the build profile being
  tested.

- **Play App Signing key (the re-sign).** When the app is delivered
  through Play, Google re-signs it with the Play-managed key, so the
  SHA-1 that reaches Google's servers at runtime is the Play one, not
  the upload key. Get it from **Play Console > the app > Setup > App
  signing**, "App signing key certificate" SHA-1. Register that
  SHA-1 on the Android OAuth client too. If only the upload-key SHA-1
  is registered, store-delivered builds get `DEVELOPER_ERROR` even
  though sideloaded EAS builds work.

Register every relevant SHA-1 (EAS upload key + Play App Signing key,
and any separate debug key used in dev) on the single Android OAuth
client. Multiple SHA-1 values per client are allowed.

---

## Supabase setup

In the Supabase dashboard, **Authentication > Providers > Google**:

1. **Enable** the Google provider (it is presumably already enabled
   for the current flow).
2. **Client ID** and **Client Secret**: set these to the **Web**
   client's ID and secret. This is the audience Supabase verifies the
   ID token against.
3. **Authorized Client IDs**: add the **iOS client ID** and the
   **Android client ID** (comma-separated). `signInWithIdToken`
   accepts a Google ID token only if its `aud` matches the Web
   client ID or one of these Authorized Client IDs. Without the iOS
   and Android IDs here, native tokens minted on-device are rejected.
   Confirmed by the Supabase doc: "Register your Client IDs in the
   Google provider settings on the Supabase Dashboard under
   _Client IDs_."
4. **URL configuration**: leave `volyume://` and `https://volyume.app/**`
   in Redirect URLs. Apple and email confirmation still need them.

### Nonce handling and "Skip Nonce Check"

This is the one fiddly part and the most common failure mode.

- Supabase enables nonce validation by default. If you call
  `signInWithIdToken` with a raw nonce, Supabase SHA-256-hashes it
  and compares against the `nonce` claim in the ID token.
- `react-native-google-signin` on iOS does not attach a nonce unless
  you pass one, and Apple/Google handle nonces differently. The
  recurring error is "Passed nonce and nonce in id_token should
  either both exist or not."

Two workable options:

- **Option A (simplest, recommended to start).** In the dashboard,
  **Authentication > Providers > Google > Skip Nonce Check = on**.
  Then call `GoogleSignin.signIn()` without a nonce and pass only the
  ID token to `signInWithIdToken`. Tradeoff: skipping the nonce check
  removes one replay-protection layer. The risk is small here because
  the token is obtained on-device by the native SDK and handed
  straight to Supabase over TLS with no redirect in between, so there
  is no browser hop where a token could be intercepted and replayed.
  This is the documented production-acceptable setting.

- **Option B (keep nonce, more code).** Generate a raw nonce, pass
  its SHA-256 hex digest to `GoogleSignin.signIn({ nonce: hashed })`,
  and pass the **raw** nonce to
  `signInWithIdToken({ provider, token, nonce: raw })`. Leave
  Skip Nonce Check off. This keeps replay protection but adds a
  hashing dependency and is the source of most of the GitHub issue
  traffic on this integration.

Recommendation: ship with **Option A** to get the migration working,
and treat Option B as a follow-up hardening task if desired. Whatever
is chosen, the dashboard setting and the code path must agree, or
sign-in fails.

---

## Code changes (per file, described, not written)

### `src/lib/supabase.js` (the single seam)

- Add a top-of-file import for the native library, lazily required
  the same way `expo-web-browser` is required inside the function
  today, to keep module-load side effects out: e.g.
  `const { GoogleSignin, statusCodes } = require('@react-native-google-signin/google-signin')`.
- Add a one-time `GoogleSignin.configure({ webClientId, iosClientId })`.
  Read both IDs from env (see env section). Call configure once
  (guard with a module flag) before the first sign-in.
- **Rewrite the body of `signInWithGoogle()`** (`:158-160`) to the
  native flow:
  1. `await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })`
     (Android only; on iOS this resolves trivially).
  2. `const res = await GoogleSignin.signIn()`.
  3. Pull the ID token from the result. The shape changed across
     library majors; on 13.x it is typically `res.data?.idToken`
     with a fallback to `res.idToken`. Read both defensively.
  4. If no token, return `{ error: { message: 'No Google token returned.' } }`.
  5. `const c = getSupabaseClient()`; if null, return the existing
     "Cloud sign-in is not available right now." error to match the
     other helpers.
  6. `const { data, error } = await c.auth.signInWithIdToken({ provider: 'google', token: idToken })`.
     If Option B, also pass `nonce: rawNonce`.
  7. On error return `{ error }`; on success return `{ ok: true }`.
- **Error mapping**, matching the result shape the three screens
  already expect (`{ error }`, `{ cancelled }`, `{ ok }`):
  - User cancels: `statusCodes.SIGN_IN_CANCELLED` (named
    `SIGN_IN_CANCELLED` on older majors) -> return `{ cancelled: true }`.
  - No Play Services / out of date:
    `statusCodes.PLAY_SERVICES_NOT_AVAILABLE` -> return
    `{ error: { message: 'Google Play services is not available or out of date.' } }`.
  - In progress: `statusCodes.IN_PROGRESS` -> treat as no-op / ignore.
  - Anything else: return `{ error: { message: e?.message ?? 'Google sign-in failed.' } }`.
- **Leave `signInWithApple()` and `_signInWithOAuthProvider`
  unchanged.** Apple keeps the browser + `volyume://` flow. The
  `OAUTH_REDIRECT_URL` constant and `WebBrowser` usage stay for Apple.
- Update the header comment block (`:94-109`) so it documents two
  flows: native ID-token for Google, web-redirect for Apple. Keep it
  short, no tutorial voice.

Because the function signature and return shape of
`signInWithGoogle()` do not change, the three screens need no logic
changes. Confirm each still treats `{ ok }` / `{ cancelled }` /
`{ error }` correctly:

### `src/screens/LoginScreen.js`

- `handleOAuth('google')` at `:180-204` already handles
  `result?.error` and the success-via-`onAuthStateChange` model.
  With the native flow the session lands synchronously when
  `signInWithIdToken` resolves, so `onAuthStateChange` fires the
  `SIGNED_IN` event without any deep link. No code change required;
  verify the success branch still routes. The Apple button (`:270`)
  is unchanged.

### `src/screens/ProOnboardingScreen.js`

- `handleOAuthOnboarding('google')` at `:233-263` checks
  `result?.error` and `result?.cancelled`, then advances the wizard.
  Native flow returns the same shape, so this works unchanged. The
  cancel branch (`:248-251`) now triggers on the native
  `{ cancelled: true }`. No change required beyond verification.

### `src/screens/ProUpgradeScreen.js`

- `handleOAuth('google')` at `:68-` polls `getSession()` for up to
  3 s after the dialog returns (`:81-99`). With the native flow the
  session exists the instant `signInWithIdToken` resolves, so the
  first poll succeeds immediately. The poll is now belt-and-braces
  rather than load-bearing. No change strictly required; optionally
  simplify later. Leave for this migration to keep the diff small.

### Deep-link handler in `App.js`

- No change. `handleAuthDeepLink` (`:133-164`) and the listeners
  (`:342-343`) stay for Apple and for email confirmation links.
  Google simply stops producing a `volyume://` callback.

### Tests

- `src/__tests__/screen-mount.test.js:43` mocks `signInWithOAuth`.
  Add a mock for `@react-native-google-signin/google-signin`
  (`GoogleSignin.configure`, `hasPlayServices`, `signIn`, and
  `statusCodes`) in the jest setup so the screens still mount. Add a
  unit test around the new `signInWithGoogle()` covering: happy path
  returns `{ ok }`, cancel returns `{ cancelled }`, missing token
  returns `{ error }`, no-Play-Services returns `{ error }`. Per
  CLAUDE.md Rule 7 this is part of the change, not a follow-up.

---

## iOS setup

- **URL scheme.** Add the reversed iOS client ID
  (`com.googleusercontent.apps.<id>`) as a URL scheme. With the
  config plugin this is supplied via the plugin's `iosUrlScheme`
  option (see Recommended Library), which writes the
  `CFBundleURLTypes` entry into `Info.plist` at prebuild. Do not
  hand-edit `Info.plist`; let the plugin own it.
- **`GIDClientID`.** Google's iOS SDK expects the iOS client ID in
  `Info.plist` as `GIDClientID`. The config plugin handles this from
  the `iosUrlScheme` / configure values on current library versions;
  if a build throws a "missing client id" at runtime, add
  `ios.infoPlist.GIDClientID` in `app.json` as the explicit fallback.
  (This detail rests on training knowledge; the live library page did
  not load. Verify against the installed package README.)
- **Apple unaffected.** The "Continue with Apple" button on iOS
  (`LoginScreen.js:270`, and the equivalents in the other two
  screens) keeps the existing Supabase web-redirect flow. No iOS
  change touches it.
- The existing `volyume` scheme (`app.json:5`) and
  `associatedDomains` (`app.json:25-27`) stay; the new Google scheme
  is additive.

## Android setup

- **SHA-1 registration is the make-or-break step.** Register the EAS
  signing-key SHA-1 and the Play App Signing SHA-1 on the Android
  OAuth client (see Google Cloud setup). Missing or wrong SHA-1 gives
  `DEVELOPER_ERROR` at `GoogleSignin.signIn()` time, with no useful
  on-screen message.
- **Package name** is `app.volyume` (`app.json:48`); it must match
  the Android OAuth client exactly.
- **Play App Signing re-sign**: because Play re-signs, the runtime
  SHA-1 on store builds is the Play-managed one. Register it or store
  installs fail while local EAS installs pass, which is a confusing
  split to debug.
- No Android plugin option is needed beyond installing the library
  and rebuilding; the native module reads package + signature at
  runtime.

---

## Implementation order

Al's tasks (no code), in order:

1. Google Cloud: configure the consent screen ("Volyume", logo,
   `volyume.app`). Create the Web, iOS, and Android OAuth clients.
   Collect the EAS SHA-1 (`eas credentials`) and, once a Play build
   exists, the Play App Signing SHA-1; register both on the Android
   client.
2. Supabase: set the Web client ID + secret on the Google provider;
   add iOS + Android client IDs to Authorized Client IDs; set
   Skip Nonce Check = on (Option A).
3. Hand back: Web client ID, iOS client ID, Android client ID, and
   the iOS reversed client ID (`iosUrlScheme`).

Code tasks (after the IDs exist):

4. `npm install @react-native-google-signin/google-signin@13.2.0`
   (exact pin for Expo SDK 51). Update `package.json` /
   `package-lock.json`.
5. Add the config-plugin entry to `app.json` `plugins` with
   `iosUrlScheme`.
6. Add env vars (below) and document them in `.env.example`.
7. Rewrite `signInWithGoogle()` in `src/lib/supabase.js` to the
   native flow; add `GoogleSignin.configure`; map errors.
8. Add the jest mock and the unit tests for the four paths.
9. `npx expo prebuild --clean`, then build the `development` profile
   on both platforms and test on real devices (see Gotchas:
   simulator limits).
10. Verify Apple sign-in still works end to end on iOS, and email
    sign-in on both.

### Env vars and `app.json` fields

The client IDs are public identifiers (the secret stays only in the
Supabase dashboard), so the `EXPO_PUBLIC_` prefix is correct, matching
the existing Supabase keys in `src/lib/supabase.js:27-28`:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` -> `GoogleSignin.configure({ webClientId })`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` -> `GoogleSignin.configure({ iosClientId })`

The Android client ID is not passed to `configure`; the native module
resolves it from package + SHA-1, so it does not need an env var. The
iOS reversed client ID goes into `app.json` as the plugin's
`iosUrlScheme` (it is a build-time value, not a runtime env read).

Add a block to `.env.example` documenting these two vars and a one
line note that the values come from the Google Cloud Web and iOS
OAuth clients, mirroring the style of the existing Supabase block.

---

## Gotchas

- **Dev-build requirement.** Native Google Sign-In does not run in
  Expo Go. Test only on a custom dev-client / EAS build. This is no
  change for Volyume but worth stating so nobody tests in Go and
  concludes it is broken.
- **SHA-1 mismatch -> `DEVELOPER_ERROR`.** The single most common
  Android failure. No readable error, just a generic code. Check the
  Android OAuth client's SHA-1 list first.
- **Play App Signing re-sign.** Store builds use a different SHA-1
  than your local EAS keystore. Register both, or store testers hit
  `DEVELOPER_ERROR` while you cannot reproduce it locally.
- **Nonce mismatch on iOS.** "Passed nonce and nonce in id_token
  should either both exist or not." If Skip Nonce Check is off and
  you do not pass a hashed nonce, iOS sign-in fails. Option A
  (skip-nonce on, no nonce in code) avoids this; if you choose
  Option B, the hashed-vs-raw nonce pairing must be exact.
- **Web client ID is the audience.** A frequent mistake is passing
  the iOS or Android client ID as `webClientId`. The `webClientId`
  must be the **Web** client, and it must match the Client ID in the
  Supabase Google provider, or `signInWithIdToken` rejects the token.
- **Library version.** Do not install `latest`. `>=13.3.0` requires
  Expo >= 52; Volyume is on 51. Pin `13.2.0` exactly.
- **iOS Simulator.** Google Sign-In needs Google Play services on
  Android (no emulator without Play) and a real Apple ID environment
  on iOS; test on physical devices to avoid false negatives.
- **`onAuthStateChange` timing.** With the native flow the session
  appears synchronously, so the `SIGNED_IN` event fires without a
  deep link. The screens already rely on `onAuthStateChange` for
  routing, so this is fine, but the `ProUpgradeScreen` poll loop is
  now redundant (harmless).
- **Token field name.** The ID-token property moved between library
  majors (`idToken` vs `data.idToken`). Read defensively on 13.2.0.

---

## Open questions for the founder

1. **Nonce posture.** Ship with Skip Nonce Check on (Option A,
   simplest, small documented risk) or invest in the hashed-nonce
   pairing now (Option B)? Recommendation: A now, B as optional
   hardening.
2. **Single Google Cloud project.** Are the existing web-flow Google
   credentials in the same Cloud project you want to keep using, or
   should the native clients live in a fresh project? Reusing the
   existing project keeps the verified consent screen.
3. **Play App Signing SHA-1 timing.** The Play-managed SHA-1 only
   exists once an app has been uploaded to Play. Closed testing is
   already live, so it should exist; confirm the value is retrievable
   now so Android store builds are not stuck on `DEVELOPER_ERROR`.
4. **Native Apple later?** This spec leaves Apple on the web-redirect
   flow. Do you want a follow-up to move Apple to
   `expo-apple-authentication` + `signInWithIdToken` for symmetry, or
   leave it?
5. **Closed-testing build contract.** Per the release policy, the
   current closed-test build stays until the whole project is built
   out. The current build uses the web-redirect Google flow and will
   keep working against Supabase unchanged. The native flow ships
   only in the next build. Confirm that is the intent (no forced
   release just for this).

---

## Appendix: sources and doc links

Live web research, 2026-05-30:

- Supabase "Login with Google" guide, native React Native section
  (client IDs, Authorized Client IDs, Skip Nonce Check, the
  `GoogleSignin.configure` + `signInWithIdToken` shape). Fetched via
  the raw doc source:
  https://raw.githubusercontent.com/supabase/supabase/master/apps/docs/content/guides/auth/social-login/auth-google.mdx
  (rendered at https://supabase.com/docs/guides/auth/social-login/auth-google)
- `react-native-google-signin` security / nonce notes:
  https://react-native-google-signin.github.io/docs/security
- Nonce-mismatch issue threads (confirming the "both exist or not"
  failure and the hashed-vs-raw fix):
  https://github.com/react-native-google-signin/google-signin/issues/1176
  and https://github.com/orgs/supabase/discussions/35209
- Library version / Expo peer ranges confirmed via
  `npm view @react-native-google-signin/google-signin versions`
  and `... @13.2.0 / @13.3.0 peerDependencies` on 2026-05-30:
  latest `16.1.2`; `>=13.3.0` peers `expo >=52.0.40`; `13.2.0` peers
  `expo >=50.0.0`. Pin `13.2.0` for Expo SDK 51.

Could not fetch in this environment (flagged inline where relied on):

- `react-native-google-signin` Expo setup page
  (https://react-native-google-signin.github.io/docs/setting-up/expo)
  returned a TLS error. The `iosUrlScheme` plugin option, `GIDClientID`
  fallback, and prebuild requirement rest on the Supabase doc, the
  published peer ranges, and training knowledge. Verify the exact
  plugin option spelling against the installed package's
  `app.plugin.js` / README before building.

Repo files cited:

- `src/lib/supabase.js` (lines 7-17, 27-28, 31-37, 94-169)
- `src/screens/LoginScreen.js` (lines 19, 180-204, 270, 281)
- `src/screens/ProOnboardingScreen.js` (lines 17, 233-263, 582, 593)
- `src/screens/ProUpgradeScreen.js` (lines 11, 68-99, 272, 283)
- `App.js` (lines 133-164, 342-343)
- `app.json` (scheme line 5, ios.bundleIdentifier line 22,
  android.package line 48, plugins 90-136)
- `eas.json` (development profile lines 7-13)
- `package.json` (expo line 39, react-native line 63, supabase-js
  line 37, expo-web-browser line 60)
- `.env.example` (Supabase block, for the env style to mirror)
- Prior audit: `docs/audit/volyume-oauth-branding-audit-2026-05-30.md`
