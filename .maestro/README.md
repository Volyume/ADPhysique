# Maestro end-to-end flows (E13)

The two adopted pre-release flows (founder decision 2026-07-02; scope and
guardrails in `docs/maestro-e2e-proposal-DRAFT.md` section 8):

| Flow | Guards |
| --- | --- |
| `flows/01-article9-consent.yaml` | The un-skippable Article 9 gate (blocks until ticked, grant records, withdrawal surface reachable and correctly warns) |
| `flows/02-workout-backgrounding.yaml` | Blank session -> add exercise -> log set -> process death -> restore via the mini-bar -> second set -> finish to Session Complete |

Cadence: **pre-release, manual dispatch only** (`Maestro E2E (pre-release)`
in GitHub Actions). Never per-PR.

## Guardrails (proposal section 8.6 — binding)

- Additive `testID`s only; no change to auth, billing, consent-gate or
  engine code in service of a test.
- No test path may bypass the Article 9 gate or self-grant `pro`.
- The consent flow **cancels** at the withdrawal dialog. Withdrawing
  Article 9 consent is account deletion (`useAccountActions.js`,
  per `PRIVACY_CONSENT_LOCKED.md`) — completing it would destroy the test
  user on every run. The flow asserts the dialog appears and states the
  deletion consequence, then taps Cancel.
- The dedicated test user is the ONLY account these flows touch, and they
  run against real EU-Dublin Supabase. Keep that account free of anything
  you care about.

## One-time founder setup

1. **Create the dedicated test user** in Supabase (EU-Dublin) with email +
   password: Dashboard -> Authentication -> Users -> Add user (or the admin
   API). Use a throwaway address you control, e.g. `e2e@volyume.app`.
   Auto-confirm the email. The app's UI stays Apple/Google-only — the email
   provider is used exclusively server-side by CI to mint a session
   (`grant_type=password`), so it must be **enabled** in Authentication ->
   Providers (it can stay invisible in the app; no product change).
2. **Walk onboarding once as that user** on an emulator or device (inject
   the session with the deep link below, grant consent, complete profile
   setup with realistic metrics — 30-year-old intermediate, sensible body
   weight; nothing that trips the ED-safety guardrails). The flows assume a
   test user whose profile is complete; they reset and re-grant consent
   themselves each run.
3. **Add the four repository secrets** (Settings -> Secrets and variables ->
   Actions):
   - `E2E_SUPABASE_URL` — the project URL (`https://<ref>.supabase.co`)
   - `E2E_SUPABASE_ANON_KEY` — the anon (public) API key
   - `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` — the test user's credentials

   The anon key + user credentials are the least privilege that works:
   everything the workflow does (mint session, flip the user's own consent
   via `record_health_consent`) is RLS-bound to that one user. No service
   key anywhere.

## Running in CI

1. Dispatch **Build Android (APK + AAB, signed)** with `architectures` set
   to `arm64-v8a,x86_64`. The standard builds are ARM-only; the GitHub
   emulator is x86_64, and ARM translation is slow/best-effort (the e2e
   workflow warns if the APK has no x86_64 libs but still tries).
2. Dispatch **Maestro E2E (pre-release)**, optionally passing that build
   run's id (blank = latest successful Android build on the branch).

The workflow mints a fresh session per run (Supabase rotates refresh tokens
on use, so static token secrets would die after one run), resets the test
user's consent to withdrawn so flow 01 can assert the gate, boots an API 34
x86_64 emulator (AVD snapshot cached), installs the APK and runs both flows.
Maestro's debug output (screenshots + logs per failed step) uploads as an
artifact on failure.

## Running locally

Requires Java 17+, an Android emulator (or device), and Maestro
(`curl -Ls https://get.maestro.mobile.dev | bash`).

```sh
# 1. Mint a session for the test user
RESP=$(curl -sS -X POST "$E2E_SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $E2E_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"<e2e email>","password":"<e2e password>"}')
ACCESS=$(echo "$RESP" | jq -r .access_token)
REFRESH=$(echo "$RESP" | jq -r .refresh_token)

# 2. Reset consent so flow 01 sees the gate
curl -sSf -X POST "$E2E_SUPABASE_URL/rest/v1/rpc/record_health_consent" \
  -H "apikey: $E2E_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS" \
  -H "Content-Type: application/json" \
  -d '{"_granted": false, "_app_version": "e2e-local", "_platform": "android"}'

# 3. Install a build that matches your emulator ABI, then run the flows
adb install -r app-release.apk
adb shell pm grant app.volyume android.permission.POST_NOTIFICATIONS

maestro test .maestro/flows \
  -e E2E_ACCESS_TOKEN="$ACCESS" \
  -e E2E_REFRESH_TOKEN="$REFRESH"
```

Run a single flow the same way by pointing `maestro test` at one file.
Flows are self-sufficient (02 clears the consent gate itself if it appears)
but the numbered order is the intended sequence: 01 leaves consent granted,
which is the state 02 expects to sail through.

## How session injection works (no product change)

`App.js` (`handleAuthUrl`) has always accepted the implicit-flow fallback
`volyume://#access_token=...&refresh_token=...` and calls
`supabase.auth.setSession(...)`. The flows fire that link with `openLink`
after the signed-in entry point renders. This is the documented seam from
the proposal (section 1) — real session, real RLS, no gate bypassed: the
injected user still hits the Article 9 gate, tier resolution, and sync
exactly like an OAuth sign-in.
