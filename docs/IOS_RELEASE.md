# iOS release (TestFlight + App Store) without a Mac

The Android app is built by the Gradle GitHub workflow. iOS cannot build there
(no Xcode on Linux), so iOS goes through **EAS Build** (Expo's cloud). It builds
the app and creates all the Apple certificates for you. You run it once
interactively from any machine (Windows is fine), then CI can take over.

App facts: name **Volyume**, bundle id **app.volyume**, version **1.1.1**, iOS
build number auto-increments (starts from 5). The app uses HealthKit,
In-App Purchase and Push, EAS provisions those capabilities during the build.

---

## One-time accounts

1. **Apple Developer Program** (£79/year). Apple ID with two-factor on, then
   enrol as **Individual** at developer.apple.com/programs/enroll. Wait for the
   "you're active" email.
2. **Expo account** (free) at expo.dev.
3. **Expo access token**: expo.dev → Account settings → Access tokens → create
   one. Add it to the GitHub repo as the secret **`EXPO_TOKEN`**
   (Settings → Secrets and variables → Actions). The iOS workflow needs it.

## One-time project config (so builds aren't shipped with empty config)

The app reads its backend config from `EXPO_PUBLIC_*` env vars. The Android
workflow injects these from GitHub secrets; EAS Build reads them from **EAS
secrets** instead. Create them once (on expo.dev → your project → Secrets, or
via the CLI):

```
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <url>
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key>
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>
eas secret:create --scope project --name EXPO_PUBLIC_USDA_API_KEY --value <key>
```

(These are the same values used by the Android workflow secrets. The anon key
is a public client key, it already ships inside the app, so this is not a new
exposure.)

## First build (interactive, once, to set up Apple signing)

From a PC with Node installed, in a clone of the repo:

```
npm install -g eas-cli
eas login                 # your Expo account
eas init                  # links the project, writes the project id into app.json
eas build --platform ios --profile production
```

When it asks about Apple credentials, **log in with your Apple ID**. EAS then
creates the distribution certificate, the provisioning profile, and registers
`app.volyume` with the HealthKit / In-App Purchase / Push capabilities. This is
the part that normally needs a Mac. It builds in the cloud and produces a `.ipa`.

## Create the App Store Connect app record

appstoreconnect.apple.com → Apps → + → New App: platform **iOS**, name
**Volyume**, language **English (UK)**, bundle id **app.volyume**, SKU any text
(e.g. `volyume-ios`).

## Submit to TestFlight

```
eas submit --platform ios --latest
```

Use your Apple ID when prompted (or an App Store Connect API key, below). The
build then shows in App Store Connect → TestFlight as "Processing" for 10–30
min. Answer the one **Export Compliance** question (standard HTTPS only → take
the exemption). Add yourself under **Internal Testing** (instant, no review),
install the **TestFlight** app on the iPhone, accept the invite.

## After the first time: build from CI like Android

Once credentials exist in EAS, run the **Build iOS (EAS)** workflow
(Actions → Build iOS (EAS) → Run workflow). It triggers an EAS build with the
`EXPO_TOKEN` secret. Tick **auto_submit** to also push to TestFlight, that needs
the submit config below in `eas.json`.

### Optional: fully non-interactive submit

Create an **App Store Connect API key** (App Store Connect → Users and Access →
Integrations → App Store Connect API → generate, role **App Manager**). Download
the `.p8` once, note the **Key ID** and **Issuer ID**, and the app's
**ascAppId** (the numeric id in the App Store Connect URL for the app). Add to
`eas.json` under `submit.production`:

```json
"ios": {
  "ascApiKeyPath": "./asc-api-key.p8",
  "ascApiKeyId": "<KEY_ID>",
  "ascApiKeyIssuerId": "<ISSUER_ID>",
  "ascAppId": "<NUMERIC_APP_ID>"
}
```

Upload the `.p8` to EAS as a credential (or keep it out of git and provide it at
submit time). With this set, `--auto-submit` works from CI.

## App-specific notes

- **HealthKit**: capability added automatically from the app's Health usage
  strings; nothing manual.
- **Push**: EAS creates the APNs key during the build; nothing manual.
- **In-App Purchase (Pro subscription)**: the build uploads and tests on
  TestFlight without products. For the upgrade to actually charge on iOS you
  later sign the **Paid Apps agreement** (App Store Connect → Business) and
  create the subscription products. Not a blocker for testing.
- **Version vs build number**: `autoIncrement` in `eas.json` bumps the build
  number each build, so you never hit "build already exists".
