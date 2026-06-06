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

- **Timezone week boundary, fixed.** The check-in week now anchors on
  local Monday (new `localWeekStartMs` in dayKey.js); the reminder
  suppression and the de-dup match on `created_at`, so old UTC-stored rows
  still match with no transition glitch. Tested.
- **Purchase "confirming" state, done.** If Google charges but the local
  write fails, the Paywall, day-14 gate and ProUpgrade now show "Payment
  received, we're confirming your access" instead of looking un-upgraded;
  the webhook reconciles it.
- **Annual at the day-14 gate, done.** The monthly/annual toggle is now on
  the day-14 gate too, not just the Paywall.
- **Purchased period stored, done.** Migration 066 adds
  `users_profile.billing_period`; the webhook sets it from the bought
  product and the Subscription screen reads it, so annual subscribers see
  £29.99/year.

- **Annual on ProUpgrade, done.** The lock-screen subscribe path now has
  the monthly/annual toggle too, so all three purchase surfaces (Paywall,
  day-14 gate, ProUpgrade) offer annual.

Still open, none blocking:

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
5. **Apply the pending migrations** in numeric order (059–066) in the
   Supabase SQL Editor (all additive; see `supabase/README.md`). After
   066, **redeploy `play-billing-rtdn`** so it writes `billing_period`.
6. **Store listing.** Paste the refreshed `docs/PLAY_STORE_LISTING.md`,
   set the two price points, complete the Data Safety and content-rating
   forms, add screenshots.
7. **One sandbox purchase on a real device** (try both monthly and
   annual) to confirm the v15 provider and the 7-day offer apply. This is
   the only piece I can't test from here.

## The final switch — DONE

`PRO_BETA_ACTIVE = false` is committed on `main` (2026-06-06). Tier now
resolves from each user's real trial / subscription state; Free is
actually free and the gates and paid flow are live. The full test suite
returned to its pre-flip baseline (no new failures). The push triggered a
GitHub Actions build, so a production AAB (`versionCode` 11) is being
produced now.

Remaining to ship, your side:

1. Apply migrations 059–066, deploy `play-billing-rtdn` (+ redeploy after
   066) and `send-push`, wire Pub/Sub.
2. One sandbox purchase on a device (monthly and annual) to confirm the
   offer applies. The only piece I can't test from here.
3. Download the AAB from the latest GitHub Actions run and upload to the
   production track once Google grants production access, then roll out.

Note: the build from this push has the beta switch OFF, it is the
production build. Do not upload it to the closed test track unless you
want your 12 testers moved to the paid flow now; otherwise leave the
current beta build on closed test until production goes live.

## Accepted at launch (known, minor)

- Annual is offered on the Paywall; other purchase surfaces default to
  monthly.
- The Subscription screen shows the monthly price until the server stores
  the purchased period.
- The timezone week edge above.
