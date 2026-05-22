# Volyume — Play Store Beta Submission Checklist

_Last updated 2026-05-22. Complete every item before triggering the first Internal Testing release._

This checklist reflects the **actual** build setup: GitHub Actions builds the AAB on every push using a stable upload keystore stored as GitHub secrets. EAS Build is not configured; do not run `eas build` until `extra.eas.projectId` in `app.json` is set via `eas init`.

---

## 1. Developer account setup

- [x] Google Play developer account verified
- [ ] App created in Play Console with package name `app.volyume`
- [ ] Default language set to English (UK)
- [ ] Contact email set: `support@volyume.app`
- [ ] Privacy policy URL hosted at `https://volyume.app/privacy`
      (source markdown lives at `public/privacy-policy.md`)

---

## 2. Supabase — before first build

All migrations must be applied in order. Latest is `migrate_014`.

- [x] `migrate_001` through `migrate_007` applied
- [x] `migrate_008_delete_rpc_tolerant.sql`
- [x] `migrate_009_nutrition_targets.sql`
- [x] `migrate_010_sync_completeness.sql`
- [x] `migrate_012_complete_sync.sql`
- [x] `migrate_013_user_feedback.sql`
- [x] `migrate_014_feedback_view_hardening.sql` (locks down the two feedback dashboard views so authenticated users cannot read every user's feedback messages)
- [ ] Anon key rotated since development if it was ever shared/committed
- [ ] Auth email templates customised (Settings → Auth → Email Templates)

Verify in Supabase Dashboard → Database → Tables that all tables have RLS enabled and at least one policy.

---

## 3. Upload keystore (one-time)

The release AAB needs a stable signing certificate that matches what Play
Store expects. The keystore is held in GitHub secrets, NOT in EAS.

- [x] `volyume-upload.keystore` generated (PKCS12, RSA 2048, validity 10000 days)
- [x] Keystore base64 + password stored in a password manager outside GitHub
- [x] Four GitHub repo secrets set:
  - `ANDROID_KEYSTORE_BASE64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS` (set to `volyume-upload`)
  - `ANDROID_KEY_PASSWORD`
- [x] SHA-1 fingerprint noted (`F6:27:29:BB:5B:98:00:AB:01:AE:8D:E4:24:6C:9F:2D:33:44:B6:E5`)
- [x] SHA-256 noted (`1B:5C:F2:34:32:DD:7A:E2:C4:D5:07:51:E0:54:35:70:9C:8A:3B:8E:44:28:BC:D9:B0:8C:B1:F4:E7:79:AE:2E`)
- [x] Sentry DSN secret `EXPO_PUBLIC_SENTRY_DSN` set so production crashes reach the dashboard

**Losing the keystore = losing the ability to update the app on Play
ever.** Back it up.

---

## 4. Build the AAB

Every push to `main` or `claude/**` triggers the workflow at
`.github/workflows/build-android.yml`. Two artifacts are produced per run:

- `volyume-release-apk-<run>` — for sideload testing
- `volyume-release-aab-<run>` — for Play Store upload

- [ ] CI run on the release commit completed without errors
- [ ] Download `volyume-release-aab-<run>` from GitHub Actions artifacts
- [ ] Verify the AAB is upload-signed (CI logs include "Patched build.gradle to use upload signing config")

---

## 5. Store listing (Play Console)

- [ ] App name entered (see `docs/PLAY_STORE_LISTING.md`)
- [ ] Short description added
- [ ] Full description added
- [ ] App icon uploaded (512 × 512 PNG)
- [ ] Feature graphic uploaded (1024 × 500)
- [ ] ≥2 screenshots uploaded (6 recommended)
- [ ] Category set: **Health & Fitness**
- [ ] Tags set per `docs/PLAY_STORE_LISTING.md`

---

## 6. Content rating + data safety

- [ ] Content rating questionnaire complete (target PEGI 3 / Everyone)
- [ ] Data safety form filled (answers in `docs/PLAY_STORE_LISTING.md`)
- [ ] Disclosed data types: email, health & fitness, app activity, device IDs
- [ ] Disclosed handling: encrypted in transit, deletable on request

---

## 7. Upload to Internal Testing

- [ ] Internal Testing track created in Play Console
- [ ] AAB uploaded via Play Console UI (drag-and-drop the artifact)
- [ ] Release notes entered (see `docs/PLAY_STORE_LISTING.md`)
- [ ] Review status reaches "Available to testers"

This first upload is manual. Once Play has processed it, set up the Play API service account (`docs/SENTRY_SETUP.md` covers the Cloud Console steps for the related Google OAuth client setup) and a future CI step can automate subsequent uploads.

After Play has processed the first upload, it gives you a **second SHA-1**
under Setup → App integrity → App signing key certificate. Save that SHA-1 too —
that's what the Google OAuth client and other Google APIs need to trust.

---

## 8. Testers

- [ ] Tester emails added in Play Console → Internal Testing → Testers
- [ ] Opt-in URL shared with the test group
- [ ] One tester confirmed they can install from Play and that the app opens
- [ ] Sign-in works (email + password)
- [ ] First workout logged end to end
- [ ] Account-deletion flow tested with a throwaway account

---

## 9. OTA updates (post-first-Play-upload)

`expo-updates` is installed and `App.js` checks for updates on every cold launch. The update server isn't configured yet:

- [ ] Run `eas init` locally — populates `app.json extra.eas.projectId`
- [ ] Run `eas update:configure` — adds `updates.url` to `app.json`
- [ ] Rebuild and upload one more AAB so the binary knows the update URL
- [ ] From then on, `eas update --branch production --message "..."` ships JS-only updates without going through Play again

JS-only updates do NOT cover native module additions, dependency upgrades that touch native code, app icon changes, deep-link scheme changes, or permission changes. Those still need a new AAB.

---

## 10. Pre-launch verification

Run through these on a real Android device installed via Internal Testing
before opening the test group up wider:

- [ ] Cold launch → splash → first-run / Pro onboarding lands on Train
- [ ] Sign in via Google OAuth (browser flow shows supabase.co URL during beta — expected)
- [ ] Start a workout, log 3 working sets, finish, see summary
- [ ] Discard workout halfway — confirm SQLite row + sets removed
- [ ] Weekly check-in submits and produces a coach card
- [ ] Body metrics: log a weight, see chart update
- [ ] Plate calculator: tap "Plates" pill on the weight row, sheet opens pre-filled
- [ ] Repeat-last quick chip pre-fills correctly
- [ ] Sign out, sign back in — workouts + plans restore from cloud
- [ ] Delete account — confirm row + auth user wiped
- [ ] Force-quit during a workout, relaunch — workout still in progress

---

## 11. Beta → production (later)

When ready to graduate from Internal Testing:

1. Complete the internal cycle, watch Android Vitals
2. Address every crash that appears in Sentry + Play Console
3. Set `VERBOSE_LOGGING = false` in `src/lib/errorLog.js`
4. Move `PRO_BETA_ACTIVE` to `false` when paid tiers go live (Stripe webhook + service-role tier-flip required first)
5. Move to closed beta → open beta → production
