# iOS release (TestFlight + App Store) from CI, no Mac, no terminal

The Android app is built by the Gradle GitHub workflow. iOS can't build there
(no Xcode on Linux), so iOS goes through **EAS Build** (Expo's cloud) via the
**Build iOS (EAS)** GitHub workflow. EAS does the Xcode compile and creates all
the Apple signing for you. You only create a few credentials on web pages and
paste them into GitHub Secrets; the workflow does the rest.

App facts: name **Volyume**, bundle id **app.volyume**, version **1.1.1**, build
number auto-increments. Uses HealthKit, In-App Purchase and Push (EAS provisions
those during the build).

---

## What you create once (all on web pages)

### 1. Expo
- Sign up at **expo.dev**.
- Create a **project** (Projects → Create). Use slug **volyume**. Note its
  **Project ID** (a UUID in the project's settings) and your **username**.
- Account settings → **Access tokens** → create one.

### 2. Apple (App Store Connect)
- **Apps → + → New App**: iOS, name **Volyume**, language **English (UK)**,
  bundle id **app.volyume**, SKU `volyume-ios`.
- **Users and Access → Integrations → App Store Connect API → Team Keys → +**:
  role **Admin**, name e.g. `eas-ci`. **Download the `.p8`** (only offered once)
  and note the **Key ID** and **Issuer ID**.

### 3. GitHub repo secrets
Settings → Secrets and variables → Actions → New repository secret:

| Secret | Value |
|---|---|
| `EXPO_TOKEN` | the Expo access token |
| `ASC_API_KEY_P8` | paste the full text of the `.p8` file (open it in Notepad) |
| `ASC_KEY_ID` | the App Store Connect API Key ID |
| `ASC_ISSUER_ID` | the App Store Connect API Issuer ID |

The four `EXPO_PUBLIC_*` secrets already exist (the Android build uses them); the
iOS workflow reuses them.

### 4. One value for Claude
Send the Expo **username** and **Project ID** so the project is linked in
`app.json` (`owner` + `extra.eas.projectId`). One commit, then builds work.

---

## Building + submitting

Once the secrets and the project id are in place:

**Actions → Build iOS (EAS) → Run workflow** (leave "Submit to TestFlight"
ticked). The workflow:
1. syncs the app config to EAS,
2. builds the iOS app in the cloud (EAS creates the distribution certificate and
   provisioning profile from the App Store Connect API key, no Mac),
3. submits the build to TestFlight.

In **App Store Connect → TestFlight**, the build processes (~15 min). Answer the
one **Export Compliance** question (standard HTTPS → take the exemption), add
**yourself** under Internal Testing, install the **TestFlight** app on the
iPhone, accept the invite.

---

## Notes

- **First build credential generation**: the Admin App Store Connect API key
  lets EAS create the signing certificate and profile automatically. If EAS ever
  can't (rare), credentials can also be set up from the **expo.dev project →
  Credentials** page, still no terminal.
- **HealthKit / Push**: capabilities and the APNs key are configured by EAS
  during the build; nothing manual.
- **In-App Purchase (Pro)**: the build tests on TestFlight without products. For
  the upgrade to charge on iOS you later sign the **Paid Apps agreement** (App
  Store Connect → Business) and create the subscription products. Not a blocker
  for testing.
- **Build number**: `autoIncrement` in `eas.json` bumps it each build, so you
  never hit "build already exists".
- **Cost**: EAS Build free tier works but queues; a paid Expo plan builds faster.
