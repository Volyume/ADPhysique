# Trial Audit 00 — Final confirmation

Date: 2026-06-08. Each line is either CONFIRMED with a file:line, or marked
NOT-CONFIRMED / FOUNDER-ACTION with the reason. Items that depend on a Google
Play / Supabase console action cannot be proven from code and are marked as such.

1. **Trial starts at signup (Article 9 consent)** — CONFIRMED.
   `src/screens/Article9ConsentScreen.js:112` `await cascade.startCascade()` in
   `handleContinue` (Continue button `:194`). Note: it is the consent step of
   Pro onboarding, not raw account creation.

2. **Trial is 14 days** — CONFIRMED.
   `supabase/migrate_068:123` `ends_at := starts_at + interval '14 days'`.

3. **Trial is server-side and cannot be reset/extended by the client** —
   CONFIRMED IN CODE, pending apply.
   Server-side: `migrate_068:126-131` writes `users_profile`. Reset/extend now
   blocked by `supabase/migrate_070_protect_trial_columns.sql` (trigger reverts
   client writes to `trial_state`/`pro_trial_ends_at`/…). **FOUNDER-ACTION:**
   apply 070; until applied, the C1 bypass remains open.

4. **At trial expiry, the Google Play prompt is shown** — CONFIRMED (as a
   dismissible prompt, not a wall).
   `src/screens/HomeScreen.js` one-time launch prompt + `scheduler.js:253-258`
   notifications → `notificationRoute.js:24-27` → `CascadeGateScreen`.

5. **Declining the prompt downgrades to free** — CONFIRMED.
   Server worker `migrate_068:438-442` (`tier='free'` at expiry, scheduled
   `migrate_031:127-131`); explicit "Drop to Free" → `cascade.skipToFree`
   (`CascadeGateScreen.js:165` → `cascade.js:218-227`). Local enforcement at
   launch: `useAppStore.js checkTier` (C3).

6. **Google Play introductory offer is 7 days free** — CODE-CONFIRMED;
   offer is console config.
   The client selects the free-phase offer token: `playBilling.js:116-129`
   (`selectOfferToken`, prefers `priceAmountMicros === 0`). The 7-day length is
   set on the Play Console product offer. **FOUNDER-ACTION:** confirm the offer
   is 7 days in Play Console.

7. **After 7 days, £4.99/month billing starts** — CODE-CONFIRMED; price is
   store-driven.
   `catalogue.js:30` (`£4.99/month` fallback) and the live store price via
   `usePlayPrices.js`/`selectDisplayPrice` (`playBilling.js:142-158`). Actual
   billing + price are Play Console config. **FOUNDER-ACTION:** confirm the
   product price.

8. **Every purchase is acknowledged within 3 days** — CONFIRMED.
   `playBilling.js:271-273` (`finishTransaction` in the purchase listener) plus
   the new `acknowledgeOutstanding()` swept on `initialise` and
   `restorePurchases` (catches missed-event / restore cases).

9. **Subscription cancellation revokes Pro access** — PARTIALLY CONFIRMED.
   Authoritative path: `play-billing-rtdn index.ts:481-486` (expire→free,
   refund→free) — **requires the Pub/Sub push wired (FOUNDER-ACTION,
   `index.ts:31-43`)**. Code-side safety net now covers the common case:
   `cascade.reconcilePaidEntitlement` downgrades a `paid_pro` user when Play
   reports no active entitlement (wired in `RootNavigator.js`). Until Pub/Sub is
   wired, a refund/cancel is caught on the user's next launch, not instantly.

10. **No bypass path exists** — IMPROVED, NOT FULLY SIGNED OFF.
    - DB trial extend/reset: closed by migration 070 (item 3) once applied.
    - Offline / cached entitlement: closed for trials by C3 (`checkTier` local
      expiry); a paid sub that lapses while permanently offline is bounded by
      the next online launch (inherent to offline support; mitigated by C2 net
      + RTDN).
    - Navigation: every Pro route is guarded (`withProGuard`, `RootNavigator.js
      :114-120`; `ProGate.js:123-128`).
    - OUTSTANDING (M4): a screen-by-screen sweep confirming no Pro content
      renders on an unwrapped shared screen was not exhaustively completed.

## Founder checklist to reach full sign-off
1. Apply `migrate_070` (and run 068's + 070's verification queries).
2. Wire the Play → Pub/Sub push subscription for `play-billing-rtdn` (item 9).
3. Confirm the Play Console `pro_monthly`/`pro_annual` products carry the 7-day
   intro free trial and the £4.99 / £29.99 prices (items 6, 7).
4. Run a real purchase from Play Internal testing end-to-end.
5. Complete the M4 per-feature gate sweep.
