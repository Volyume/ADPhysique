# Phase 10b: Manual actions outside the codebase (for Al)

Status: COMPLETE. Date 2026-06-06. Each item: what, where, how, blocking?

## App Store Connect: app record + listing
- [ ] Confirm the app record (App Apple ID 6777083702, bundle `app.volyume`)
  details. Where: App Store Connect > Apps. Blocking: no (exists).
- [ ] Set Primary Category Health & Fitness, Secondary Sports; Primary language
  English (UK). Paste name/subtitle/description/keywords from
  `docs/APP_STORE_CONNECT_LISTING.md`. Blocking: yes for listing.
- [ ] Produce + upload SCREENSHOTS: 6.9" iPhone, 1320x2868 px portrait, 1-10
  images, PNG/JPEG RGB, NO transparency (iPad not needed). Where: App Store
  Connect > the version > Previews and Screenshots. Blocking: YES for submission.
- [ ] Upload a 1024x1024 app icon: flattened, RGB, NO alpha, NO rounded corners.
  Blocking: yes.
- [ ] Complete the Age Rating questionnaire (expect 12+ given health/body data).
  Blocking: yes.
- [ ] Privacy nutrition labels: declare the data types in Phase 2 (Health &
  Fitness, Contact Info, Identifiers, User Content, Usage Data, Diagnostics,
  Purchases; do NOT declare Location). Where: App Store Connect > App Privacy.
  Blocking: yes.
- [ ] Privacy Policy URL (`https://volyume.app/privacy`) and Support URL
  (`https://volyume.app/support`) must be live and reachable (source
  `public/privacy-policy.md`). Blocking: yes (Apple checks the URLs).
- [ ] Accept any pending agreements (Paid Apps agreement only if you ship IAP;
  free-only needs the free agreement). Where: Business > Agreements. Blocking:
  yes for IAP.

## Apple Developer Portal: capabilities
- [ ] If implementing native Sign in with Apple (C2): enable the Sign in with
  Apple capability on the `app.volyume` App ID and create the Services ID +
  return URL for the Supabase token exchange. Blocking: yes for C2.
- [ ] HealthKit + Push are already enabled on the App ID (Build 6 used them).
  Verify. Blocking: no.

## In-app purchase configuration (only if doing Phase 4 Option B)
- [ ] Create 3 iOS auto-renewable subscription products matching `catalogue.js`
  ids, with prices and the 28-day cascade as introductory offers. Where: App
  Store Connect > Subscriptions. Blocking: yes for paid iOS.
- [ ] Configure App Store Server Notifications v2 URL (the new Apple webhook Edge
  Function). Blocking: yes for paid iOS reconciliation.
- [ ] Set the App Store Connect shared secret / API key for receipt validation in
  the new Edge Function. Blocking: yes for paid iOS.
NOTE: not needed if shipping the free-beta iOS build (Phase 4 Option A).

## Push (APNs): only if enabling remote push
- [ ] Create the APNs auth key and add it to EAS credentials (needs Apple ID
  cookie auth: add `EXPO_APPLE_ID` + an app-specific password as repo secrets, or
  do it once on expo.dev). Blocking: no (local notifications work without it).

## TestFlight / beta
- [ ] The build pipeline already submits to TestFlight (Build 6 delivered). For
  external testers, complete the TestFlight test information + Beta App Review.
  Blocking: only for external TestFlight, not for internal.

## Universal Links (only if re-adding)
- [ ] Not currently used (Associated Domains removed). If re-added later, host
  `apple-app-site-association` at `https://volyume.app/.well-known/` and restore
  `ios.associatedDomains` + use Apple ID cookie auth so the profile carries the
  capability. Blocking: no.

## Submission gating summary
Hard gates for a FIRST submission (free-beta iOS): screenshots, icon, age rating,
privacy labels, live policy/support URLs, and code fixes C1 + C2. Everything in
the IAP-Option-B and APNs sections is only needed when iOS monetises or enables
remote push.
