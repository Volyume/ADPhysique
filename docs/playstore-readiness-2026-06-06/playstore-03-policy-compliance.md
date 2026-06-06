# playstore-03 — Google Play policy compliance

Status: COMPLETE. Date: 2026-06-06. Most items here are **Play Console
paperwork** (Document B), not code.

## Health Apps Declaration (App content → Health apps) — MANUAL, BLOCKER
Volyume must declare, from the code:
- Fitness tracking: workout logging, training plans, active-workout service.
- Nutrition: food diary, calorie/macro targets.
- Body measurements: morning weight, body metrics.
- Step / activity tracking: daily steps, ACTIVITY_RECOGNITION.
- Health Connect data types (each justified individually):
  - **READ** `Steps` → daily steps + weekly average signal.
  - **READ** `Weight` → morning-weight log sync.
  - **WRITE** `ExerciseSession` → completed workouts to Health Connect.
  - **WRITE** `ActiveCaloriesBurned` → cardio/active-calorie write-back.
  No heart rate, glucose, oxygen, or sleep are read or written (confirmed: only
  the four permissions above exist in app.json + the merged manifest).

## Data Safety form — MANUAL, BLOCKER
Must match every SDK. Declare:
- **Supabase** → App activity, App info/performance, Personal info (name, email),
  Health & fitness (training, nutrition, body metrics, steps, weight). Collected +
  transmitted off-device. Encrypted in transit. User can request deletion.
- **Sentry** → Crash logs, diagnostics, device identifiers, app activity.
  PII is scrubbed before send (`sentry.js` beforeSend) — declare as collected
  diagnostics, not linked to identity beyond user id.
- **react-native-iap / Google Play Billing** → Purchase history.
- **Vision Camera** → camera images processed **on-device** (barcode/label OCR);
  not transmitted. Declare accordingly.
- **Expo push token** → device identifier for notifications.
Mismatch between declared and actual is the top 2025-26 rejection reason; this
list is the reconciliation source.

## Account deletion — PARTIAL, verify
- **In-app path: PRESENT.** `src/hooks/useAccountActions.js` → confirm dialog →
  `delete-account` Edge Function (admin deleteUser + audit log) + local wipe.
- **Public web URL: VERIFY.** Google also requires a publicly reachable deletion
  request route for users who already uninstalled. `public/privacy/index.html`
  mentions deletion. Confirm it states the deletion method + a contact/route
  reachable without signing in, and that this exact URL is entered in Play
  Console → App content → Data deletion. → Document B.

## Permissions justification — MANUAL
Each dangerous permission needs a user-visible rationale at request time:
- Camera, photos: requested only when the scanner / progress-photo feature is
  opened (vision-camera + media). PASS pattern.
- Health Connect: rationale activity is wired (`withHealthConnectPermissionDelegate`)
  and shows the privacy policy. PASS pattern.
- Confirm in Play Console permission declarations that no unused dangerous
  permission survives the merged manifest (see Document A H-3 for RECORD_AUDIO /
  SYSTEM_ALERT_WINDOW).

## Content rating (IARC) — MANUAL
Complete the questionnaire. Expected: everyone / PEGI 3 class. Fitness data,
accounts, and IAP do not raise the rating, but the questionnaire must be filled.
Declare in-app purchases = yes, user accounts = yes.
