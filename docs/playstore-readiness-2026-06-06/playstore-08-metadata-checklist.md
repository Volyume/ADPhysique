# playstore-08 — Play Store metadata & submission checklist

Status: COMPLETE. Date: 2026-06-06. ☑ = satisfied in repo/config, ☐ = manual /
unverifiable here.

## Technical submission
- ☑ Target SDK 35 (expo-build-properties)
- ☐ All native `.so` 16 KB-aligned — VERIFY on the built AAB (Document B M-1)
- ☑ AAB output (eas.json `app-bundle`)
- ☐ Play App Signing — enrol at first upload (Document B)
- ☑ versionCode 11, unique + autoIncrement
- ☑ versionName 1.2.0
- ☑ Hermes enabled
- ◐ R8/ProGuard — OFF by decision (Hermes covers JS); see Document A L-1
- ☐ No console.log in prod bundle — currently 71 ship; Document A M-1
- ☐ Sentry source maps uploaded for release — blocked by `SENTRY_DISABLE_AUTO_UPLOAD`;
  Document A H-2

## Play Console content
- ☐ Privacy Policy URL — `https://volyume.app/privacy` exists; confirm it is
  entered and public/non-geofenced
- ☐ Data Safety form — complete to match SDKs (Phase 3 list)
- ☐ Health Apps Declaration — complete for all fitness features (Phase 3)
- ☐ Health Connect data types — declare + justify the 4 (READ steps/weight,
  WRITE exercise/active-calories)
- ☑ Account deletion in-app path — present and wired
- ☐ Account deletion public web URL — confirm + enter in Console (Phase 3)
- ☐ Content rating (IARC) — complete questionnaire
- ☐ Target audience — declare (adults; fitness)
- ☐ App content sections — health features declared
- ☐ Permissions — justify in Console; confirm no unused dangerous perm survives
  the merged manifest (Document A H-3)

## Store listing
- ☐ Title ≤ 30 chars ("Volyume" is fine; confirm any subtitle)
- ☐ Short description ≤ 80 chars
- ☐ Full description ≤ 4000 chars — see `docs/PLAY_STORE_LISTING.md` (refreshed
  for £4.99/£29.99 + 14+7 trial)
- ☐ Icon 512×512 PNG
- ☐ Feature graphic 1024×500
- ☐ ≥ 2 phone screenshots, current UI
- ☐ Category: Health & Fitness

## Account-type gate (new personal Play accounts)
- ☐ Closed test ≥ 12 testers, ≥ 14 continuous days before production access.
  Per the founder's standing release policy the existing closed-testing build
  stays until the whole project is built out; the production application is in
  progress. This gate is an account-level Google requirement and is tracked
  separately from the build itself.
