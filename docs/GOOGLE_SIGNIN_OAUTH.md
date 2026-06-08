# Google Sign-In (native) — OAuth and signing-key setup

Status: WORKING in testing; one production action outstanding | Date:
2026-06-08 | Owner: founder (Google Cloud + Play Console config).

How "Sign in with Google" works in the live app and exactly what's needed
in the Google Cloud / Play consoles, so the SHA-1 question never has to be
re-derived. This is Google ⇄ the Android app; **it has nothing to do with
Supabase** (Supabase is only the downstream session backend).

---

## 1. How it works in the app

Native Google Sign-In via `@react-native-google-signin/google-signin`:
the OS account-picker returns a Google **ID token**, which is exchanged
for a session with Supabase `signInWithIdToken`
(`src/lib/supabase.js:173-212`). No browser, no code change needed in the
app to add SHAs (that's a console-only change).

- **Web OAuth client ID** (configured in the app, public, not a secret):
  `520741631478-apaethkp3g55o06lott116jag73l0ves.apps.googleusercontent.com`
  (`src/lib/supabase.js:162`). It's the token audience. Unchanged.
- **Google Cloud project**: `520741631478` (the prefix on the IDs above).

## 2. The Android OAuth client(s) — where the SHA-1 goes

An **Android OAuth client** is NOT referenced in app code; it just has to
*exist* with the app's package + signing SHA-1 so Google can match the
installed app. One SHA-1 per Android client, so multiple keys = multiple
clients.

- **Existing client** (`520741631478-2pcbatqk3qqnohh1pbv2pcoa865uf32b`),
  package `app.volyume`, SHA-1
  `F6:27:29:BB:5B:98:00:AB:01:AE:8D:E4:24:6C:9F:2D:33:44:B6:E5`
  (created 2026-06-06). This is the **UPLOAD key** SHA, from the
  `.github/workflows/print-signing-sha.yml` workflow. **It only covers
  APKs installed directly (sideloaded).**

### Outstanding production action

Every build installed **from Google Play** (closed testing AND production)
is **re-signed by Google with the Play App Signing key**, which has a
DIFFERENT SHA-1. So Google Sign-In for real store users needs the **Play
App Signing SHA-1** registered too:

1. Play Console → **Protected with Play** → expand **Play Store
   protection** → **Go to Play app signing** → **App signing key
   certificate** → copy its **SHA-1** (NOT the Upload key certificate one).
2. Google Cloud → APIs & Services → Credentials → **Create credentials →
   OAuth client ID → Android**, name `app.volyume (Play signing)`, package
   `app.volyume`, paste that SHA-1. Save. Keep the existing upload-key
   client too.

Going from closed testing to production does **not** create a new key; the
Play App Signing key is the same across all tracks. So: if Google Sign-In
already works on a build installed **from Play** (the closed-testing
track), the Play App Signing SHA is already registered and nothing more is
needed. If it only worked on a sideloaded APK, add it.

## 3. What is NOT needed

- **No API key.** Basic Google Sign-In (email/profile/openid) needs only
  the OAuth client + SHA-1. Any auto-created API key is unused.
- **No `google-services.json`** shipped; the app uses the web client ID
  directly via `GoogleSignin.configure({ webClientId })`.
- **No app code change, no rebuild** to add an Android client SHA, it's a
  Google-Cloud-only change. Propagation 5 min to a few hours.

## 4. OAuth consent screen (for public launch)

For the public production listing, the consent screen must be **"In
production"/Published** (Google Cloud → APIs & Services → OAuth consent
screen). In "Testing" mode only added test users can sign in. Basic scopes
only, so publishing needs no Google verification.

## 5. The "GitHub thing"

`.github/workflows/print-signing-sha.yml` (run from the Actions tab)
prints the **upload key** SHA-1/SHA-256 from the keystore secret, for the
upload-key OAuth client and for assetlinks. Its output explicitly says the
Play App Signing SHA is in Play Console, not from this workflow.
