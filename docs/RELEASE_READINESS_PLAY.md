# Volyume — Play production release readiness

Date 2026-06-06. The single source of truth for getting to a paid Play
production launch. Separates what's done, what code is left (mine), and
what only you can do in Play Console / your accounts (the real gate).

## Where it stands, in one line

The code is essentially production-ready. The launch is gated on your
merchant + Play Console config and one on-device sandbox purchase, then
the beta switch. None of what's left is a rebuild.

## Done (code, on `main`)

- **Trial 14 + 7.** Migration 065 sets the in-app cardless trial to 14
  days; the Play subscription carries a 7-day intro free trial (21 days
  free total, card only at day 14).
- **Billing rewritten for react-native-iap v15** (the installed version;
  the old code targeted a removed v12 API). Selects the 7-day offer token
  and bridges the v15 event-based purchase result. Unit-tested.
- **Flat pricing £4.99/month + £29.99/year**, with a monthly/annual
  toggle on the Paywall and a "Save 50%" badge. The old escalating
  launch/founders/standard windows are retired.
- **Gating verified, no leaks.** Diary, cardio, body metrics and all
  coaching are correctly Pro.
- **Upsell wired.** ProUpgrade subscribes (or starts the trial for a brand
  new account); the old "grant Pro free on sign-in" path is gated to beta
  only, so it can't leak post-launch.
- **Beta language removed in-app**; the store listing is refreshed
  (real pricing, no "free during beta", an eating-disorder safety trust
  line, exercise count corrected to 400+).
- **Consent fixes.** The automated eating-pattern safety check is now
  named in the Article 9 consent; the deletion line matches the code
  (immediate). Consent audit-version bumped.
- **PR count.** One PR per exercise per session, not dozens.
- **Build identity.** `versionCode` 11, `version` 1.2.0.

## Remaining code (mine), none blocking

- **Timezone week boundary.** The weekly check-in buckets its week by UTC
  Monday, not UK-local Monday: a ≤1-hour edge each week during British
  Summer Time. It's internally consistent today (the check-in screen and
  the reminder scheduler agree), so the real impact is a reminder
  mis-timing in a one-hour window. Fixing it properly is a coordinated
  change to the week-keyed coaching path (check-in screen + scheduler +
  the stored week_start + the coach-output week), best done as a focused,
  fully-tested change rather than bundled into launch. **Recommend doing
  this as the next task.**
- **Purchase "confirming" state.** If Google charges but the local write
  fails (poor connection), the user briefly looks un-upgraded until the
  RTDN webhook reconciles. A short "confirming your purchase" state would
  be cleaner. Self-heals once the webhook is deployed.
- **Annual everywhere.** The monthly/annual toggle is on the Paywall; the
  day-14 gate and the lock-screen upsell default to monthly. Worth adding
  the toggle to the day-14 gate (a prime conversion moment), and the
  server should store the purchased period so the Subscription screen
  shows annual subscribers the right figure.
- **Remote push** is code-ready; it needs the token migration + the send
  function deployed (your side, below).

## Your Play Console / config actions (the real gate)

1. **Merchant account verified** (in progress, awaiting the bank deposit).
2. **Create two subscription products** in Play Console:
   - `pro_monthly` — £4.99/month
   - `pro_annual` — £29.99/year
   Each needs a base plan with a **7-day free-trial offer**. These exact
   product IDs are what the app queries; they must match.
3. **Deploy the `play-billing-rtdn` edge function** and set its env vars
   (Google service account JSON, package name `app.volyume`, the OIDC
   audience). Create a Pub/Sub topic and point Play's Real-Time Developer
   Notifications at it. This keeps Pro status in sync with Google
   (renewals, cancels, refunds, payment failures).
4. **Deploy `send-push` + apply migration 053** (device_push_tokens) so
   payment-failure notifications can reach users.
5. **Apply the pending migrations** in numeric order (059–065) in the
   Supabase SQL Editor (all additive; see `supabase/README.md`).
6. **Store listing.** Paste the refreshed `docs/PLAY_STORE_LISTING.md`,
   set the two price points, complete the Data Safety and content-rating
   forms, add screenshots.
7. **One sandbox purchase on a real device** (try both monthly and
   annual) to confirm the v15 provider and the 7-day offer apply. This is
   the only piece I can't test from here.

## The final switch (last, done together)

On the build where the sandbox purchase passed:

- Flip `PRO_BETA_ACTIVE = false` in `src/lib/proGate.js`. This makes Free
  actually free and the gates live. **Do this last**, on the verified
  build, not before the products exist.
- Your 12 closed-test users drop to Free and subscribe like everyone else
  (your "no grandfather" decision).
- Cut the production AAB (`versionCode` 11) via the GitHub Actions
  workflow, upload to the production track, roll out.

## Accepted at launch (known, minor)

- Annual is offered on the Paywall; other purchase surfaces default to
  monthly.
- The Subscription screen shows the monthly price until the server stores
  the purchased period.
- The timezone week edge above.
