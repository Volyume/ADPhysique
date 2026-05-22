# Volyume Privacy Policy

**Effective date: 22 May 2026**
**Last updated: 22 May 2026**

This policy explains what Volyume collects, why, and how to delete it.
Volyume is a training logbook and self-coaching tool. We are private by
design: no social feed, no community, no targeted advertising, no
selling of your data.

## 1. Who we are

Volyume is operated by the developer of the Volyume mobile app
(iPhone and Android). Contact for privacy queries:

- **Email**: allansdouglas1983@gmail.com

This policy applies to the Volyume mobile app (`app.volyume`). Volyume
does not offer a web version.

## 2. Data we collect

### Account data (cloud-stored, signed-in users only)

- Email address (Supabase Auth)
- A randomly-generated user ID (Supabase Auth)
- First name (if you choose to enter one)
- Authentication tokens (encrypted in device secure storage)

### Profile data (cloud-stored, signed-in users only)

- Biological sex, age, height, body weight, body fat percentage
- Training preferences (experience level, goal, equipment available,
  days per week, session length)
- Phase and goal selections for coaching

### Training data (cloud-stored, signed-in users only)

- Workouts, exercises, sets, reps, weight lifted, rest times, dates
- Training notes you choose to add to specific exercises or sessions
- Personal records, volume by muscle, training-block progress
- Weekly check-in answers (energy, soreness, sleep, adherence)
- Calorie and macro **targets** (we don't track meals or food)
- Morning body weight if you choose to log it
- Body measurements (waist, chest, etc.) if you choose to log them

### Local-only data (never leaves your device)

- App preferences (units, dark/light, accessibility)
- A local error ring buffer used for crash diagnostics. The buffer
  redacts known-sensitive fields (emails, tokens, body weights,
  notes) before storing them. You can view the buffer in
  Settings → Debug Logs and export or clear it at any time.

### Crash and performance telemetry

- Crash stack traces and error events sent to Sentry, used to fix
  bugs. Sentitive fields (emails, tokens, body weights, notes, names)
  are redacted before transmission. We do not use Sentry for product
  analytics or behavioural tracking.

### Camera and photo library

We access the camera or photo library only when you explicitly take
a progress photo or save a workout share card. These permissions are
requested at the moment of use, not at app startup. Progress photos
remain on your device unless you explicitly export them.

### Health data (iOS HealthKit / Android Health Connect)

If you opt in via Settings → Health, Volyume can:

- **Read** your most recent body weight so the morning-weight card
  picks up entries from your smart scale or wearable
- **Write** completed workouts so the Health app shows your training
  alongside other activity

We do not read heart rate, sleep, HRV, or step data (step-count read
is gated behind a separate explicit opt-in). All health-app access
is opt-in and revocable from the OS Settings app at any time.

### Data we do NOT collect

- Meals or food (Volyume is not a diet tracker)
- Heart rate, HRV, sleep stages
- Precise location (we don't use GPS)
- Browsing history outside the app
- Contacts or address book
- Social-graph data (no friends, followers, leaderboards)

## 3. Why we collect this data

| Purpose | Data used | Lawful basis (UK/EU GDPR) |
|---|---|---|
| Run the app + sync between your devices | account, profile, training data | Performance of contract (Art. 6(1)(b)) |
| Personalised coaching adjustments | training data, check-ins, body weight | Performance of contract |
| Crash diagnostics | redacted error events | Legitimate interest (Art. 6(1)(f)), keeping the app working |
| Optional Health-app integration | weight read / workout write | Explicit consent (Art. 6(1)(a)), revocable in OS Settings |
| Storing your data while signed-in | all of the above | Performance of contract |

We do not use your data for advertising, profiling, or sale to third
parties. We do not run behavioural analytics.

## 4. Third parties we share data with

We process data through these services. Each has its own privacy policy.

| Service | What's shared | Why | Their privacy policy |
|---|---|---|---|
| Supabase | account + training + profile data | Cloud database and authentication | https://supabase.com/privacy |
| Sentry | redacted error events | Crash diagnostics | https://sentry.io/privacy |
| Apple / Google (HealthKit / Health Connect) | weight read / workout write (opt-in only) | OS-level health integration | https://www.apple.com/legal/privacy / https://policies.google.com/privacy |

We do not pass data to advertising networks, analytics providers,
or any third party not listed above.

## 5. Where data is stored

- **Cloud data** (account, training, profile) is stored in Supabase,
  which uses AWS data centres. The region depends on the Supabase
  project configuration; for the Volyume production project it is
  in the EU.
- **Local data** is stored on your device in encrypted secure
  storage (Keychain on iOS, EncryptedSharedPreferences on Android)
  for tokens, and in SQLite for training history.

## 6. How long we keep your data

- While your account is active: indefinitely
- If you delete your account (Settings → Delete account): all
  cloud-stored data is removed within 24 hours; auth record is
  removed immediately. Local device data is wiped at the same time.
- If you uninstall the app without deleting your account: cloud
  data is retained so you can sign back in on a new device.
- Crash and error logs: 90 days in Sentry, then aged out.

## 7. Your rights

Under UK and EU GDPR you have the right to:

- **Access** the personal data we hold on you
- **Correct** inaccurate or incomplete data
- **Delete** your account and all associated data
- **Export** your data in a portable format (Settings → Export data)
- **Withdraw consent** for optional features (Health integration, etc.)
- **Lodge a complaint** with the UK Information Commissioner's Office
  (https://ico.org.uk/) or your local EU supervisory authority

To exercise any of these rights, email allansdouglas1983@gmail.com or use
Settings → Delete account. We respond to verifiable requests within
30 days.

## 8. Children's privacy

Volyume is not directed at children under 13 and we do not knowingly
collect data from anyone under 13. If you believe a child has
created an account, contact allansdouglas1983@gmail.com and we will delete
the account on receipt.

## 9. Changes to this policy

If we change this policy materially we will update the "Last updated"
date at the top and notify signed-in users via an in-app banner. Minor
clarifications may be made without notice. The current version is
always available in the app under Settings → Privacy policy, and will
move to https://volyume.app/privacy once that domain is live.

## 10. Contact

- **Email**: allansdouglas1983@gmail.com

For complaints about how we handle your data you can also contact
the UK Information Commissioner's Office at https://ico.org.uk/.
