# DOCUMENT B — manual actions (Play Console / Google / external)

Date: 2026-06-06. These cannot be done from the codebase. "Blocks" = stops
submission/approval or stops billing working. "Follow" = can trail the first
upload.

## BLOCKS — build artifact
- **M-1 · 16 KB page-size verification.** Build the production AAB
  (`eas build -p android --profile production`), download it, and verify every
  `.so` is 16 KB-aligned. Quickest: upload to the **internal testing track** —
  Play now reports 16 KB compliance in the release dashboard. Or run Google's
  `check-elf-alignment.sh` against the extracted libs. If a third-party lib
  (vision-camera / skia / reanimated / nitro / health-connect) is misaligned,
  bump that lib or the Expo SDK. *Where:* EAS + Play Console → Testing →
  Internal testing.

## BLOCKS — Play Console paperwork (App content)
- **Health Apps Declaration.** Declare fitness, nutrition, body measurements,
  steps, and the 4 Health Connect types (READ steps/weight, WRITE exercise/
  active-calories), each justified. *Where:* App content → Health apps.
- **Data Safety form.** Match Supabase / Sentry / Play Billing / Vision Camera /
  Expo push (see Phase 3 list). *Where:* App content → Data safety.
- **Data deletion.** Enter the in-app deletion description **and** the public web
  URL for uninstalled users; confirm `volyume.app/privacy` (or a dedicated page)
  states the method and is reachable without sign-in. *Where:* App content →
  Data deletion.
- **Privacy policy URL.** `https://volyume.app/privacy` — confirm entered,
  public, non-geofenced. *Where:* App content → Privacy policy.
- **Content rating (IARC).** Complete questionnaire; declare IAP=yes, accounts=yes.
- **Target audience / Permissions declarations.** Declare audience; justify each
  dangerous permission; confirm no unused dangerous perm survives the manifest
  (pair with Document A H-3).

## BLOCKS — billing (so the trial/subscription actually works)
- **Create subscription products** `pro_monthly` (£4.99/mo) and `pro_annual`
  (£29.99/yr) with base plans and a **7-day free-trial offer** on each. *Where:*
  Monetise → Products → Subscriptions. Product IDs must match
  `src/lib/payments/catalogue.js` exactly.
- **Merchant/payments profile** active (you noted this is sorted — confirm it
  shows "active").
- **Apply Supabase migrations** 059–066 in order (notably 065 trial-14d, 066
  billing_period) per `supabase/README.md`, then **redeploy** `play-billing-rtdn`
  (+ `send-push`) and confirm the Pub/Sub RTDN topic is wired.
- **Sandbox purchase** end-to-end on a real device via a licensed tester; confirm
  a `tier_history` row + `trial_state` + `billing_period` write land server-side.

## BLOCKS — signing / App Links
- **Play App Signing.** Enrol at first upload (default for new apps).
- **assetlinks SHA-256.** After enrolment, copy the **Play App Signing SHA-256**
  (App integrity → App signing) into `public/.well-known/assetlinks.json`
  (Document A H-1), redeploy the site, then re-trigger App Links verification.

## BLOCKS — store listing
- Title ≤30 / short ≤80 / full ≤4000 (use `docs/PLAY_STORE_LISTING.md`); icon
  512×512; feature graphic 1024×500; ≥2 current screenshots; category Health &
  Fitness.

## FOLLOW — after first upload
- **Pre-launch report + Android Vitals:** read crash/ANR/cold-start/frozen-frame
  from the internal-track upload before promoting.
- **Closed-test gate** (new personal account): ≥12 testers, ≥14 continuous days
  before production access. Tracked separately from the founder's "hold closed
  testing until the project is built out" policy.
- **Sentry maps (Document A H-2):** confirm symbolicated traces appear from the
  first production build.
