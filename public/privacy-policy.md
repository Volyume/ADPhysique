# Volyume Privacy Policy

**Effective date:** 4 July 2026
**Last updated:** 4 July 2026

This policy explains what Volyume collects, why, how it is stored, and how to delete it. Volyume is a training and nutrition self-coaching tool. We are private by design: no social feed, no community, no targeted advertising, and no sale of your data.

## 1. Who we are

Volyume is operated by the developer of the Volyume mobile app. For privacy queries, contact support@volyume.app.

## 2. Data we collect

When you create an account we collect your email address, a user ID, sign-in metadata, and any first name you choose to enter.

To run the app and coach you, Volyume may use:

- Profile details such as age, sex, height, training goal, schedule and equipment
- Workouts, exercises, sets, reps, weight lifted, routines, programmes and training notes
- Body weight, body measurements, body-fat percentage and lean mass when you enter them
- Food diary entries, recipes, saved meals, water, calories and macro targets
- Weekly check-ins, recovery, energy, adherence and eating-habits screening responses
- Progress photo metadata and Volyume Score analysis metadata, including photo quality, result confidence, leanness band, visual score and progress change
- Usage events that tell us which app surfaces are used and where the app is slow
- Crash and diagnostic events, scrubbed before they leave the device

Progress photo image files stay on your device unless you choose to share or export them. Volyume Score is a visual progress feature, not an exact body-fat percentage, DEXA scan, diagnosis, or medical assessment.

## 3. Why we collect this data

Volyume uses your data to run your account, sync your own records, calculate training and nutrition targets, show progress, run the deterministic coaching system, and protect against unsafe under-fuelling patterns. We do not sell your data, share it for advertising, or use it to train a public AI model.

Under UK and EU GDPR, core account operation is processed under contract, and health/nutrition data is processed with explicit Article 9 consent. Crash diagnostics and first-party product telemetry are processed under legitimate interest. You can switch usage telemetry off in Settings > Privacy & legal.

## 4. Where data is stored

Local data is stored on your device. Auth tokens use secure device storage. Training, nutrition, body metrics, progress metadata and settings live in SQLite.

Cloud-backed account data is stored in Supabase in the EU region, protected by row-level security so only you, and the team supporting your account when needed, can see it. Progress photo and scan image files are not cloud-synced by Volyume.

## 5. Third parties

We use a small number of processors to run the app:

| Provider | Purpose | Data |
|---|---|---|
| Supabase | Database, authentication and cloud backup | Cloud-backed account data, never progress-photo image files |
| Sentry | Crash and performance reporting | Scrubbed diagnostic events |
| Apple App Store / Google Play | Subscription purchases | Store receipt and transaction metadata |
| Expo push | Push notification delivery | Device push token |
| Open Food Facts / USDA FoodData Central | Food lookup data | Search terms and barcode values only |

We do not pass data to advertising networks or third-party analytics providers.

## 6. Health-app access

If you opt in, Volyume can read body weight and daily steps and write completed workouts through Apple Health or Health Connect. We do not read heart rate, sleep, or HRV. Health-app permissions are controlled by the operating system and can be revoked there at any time.

## 7. Deletion and retention

While your account is active, we keep your data so the app can work and sync across devices.

If you delete your account from Settings > Account > Delete account, cloud removal starts immediately and local data is wiped on the device that initiated deletion. If final sign-in removal cannot finish while offline, Volyume tells you and completes it when you reconnect. Backup copies are purged within 30 days.

Crash and diagnostic events age out according to the retention settings of our Sentry project.

## 8. Your rights

Under UK and EU GDPR you have the right to access, correct, delete, restrict, object to, and port your personal data. In Volyume, Settings > Your data lets you export workout sets as CSV and create a JSON app-data backup. The JSON backup contains database records, including progress photo metadata and Volyume Score analysis metadata, but not private photo image files.

To make a request, use the in-app controls or email support@volyume.app. We respond to verifiable requests within 30 days.

## 9. Children

Volyume is not directed at children under 13 and we do not knowingly collect data from anyone under 13. If we discover an account belongs to someone under 13, we delete it and refund any active subscription where possible.

## 10. Changes

If we materially change this policy we update the date above and notify signed-in users in the app.

## 11. Contact

Privacy questions or requests: support@volyume.app. You can also contact the UK Information Commissioner's Office at https://ico.org.uk/.
