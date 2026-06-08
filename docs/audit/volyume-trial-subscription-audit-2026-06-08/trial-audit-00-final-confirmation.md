# Trial Audit 00 — Final confirmation

Date: 2026-06-08. Each line is CONFIRMED with a file:line, or marked
NOT-CONFIRMED / FOUNDER-ACTION with the reason. Items dependent on a Google Play
/ Supabase console action cannot be proven from code and are marked so.

1. **Trial starts at signup (Article 9 consent)** — CONFIRMED.
   `src/screens/Article9ConsentScreen.js:112` `await cascade.startCascade()`.
   Note: it is the consent step of Pro onboarding, not raw account creation
   (intentional — consent must precede health-data processing).

2. **Trial is 14 days** — CONFIRMED. `supabase/migrate_068:123`
   `ends_at := starts_at + interval '14 days'`.

3. **Trial is server-side and cannot be reset/extended by the client** —
   CONFIRMED IN CODE, pending apply. Server-side: `migrate_068:126-131`.
   Reset/extend now blocked by `migrate_070_protect_trial_columns.sql` (trigger
   reverts client writes to the trial columns). **FOUNDER-ACTION:** apply 070.

4. **At trial expiry, the Google Play prompt is shown** — CONFIRMED (dismissible
   prompt). In-app one-time gate `src/screens/HomeScreen.js` (H2) +
   `scheduler.js:253-258` notifications → `notificationRoute.js:24-27` →
   `CascadeGateScreen`.

5. **Declining the prompt downgrades to free** — CONFIRMED.
   Server worker `migrate_068:438-442` (scheduled `migrate_031:127-131`);
   explicit "Drop to Free" → `cascade.skipToFree`
   (`CascadeGateScreen.js:165`→`cascade.js:218-227`); local enforcement
   `useAppStore.checkTier` (C3); cached-tier offline loophole closed (C3).

6. **Google Play introductory offer is 7 days free** — CODE-CONFIRMED selection;
   length is console config. `playBilling.js:116-129` selects the £0-phase offer
   token. **FOUNDER-ACTION:** confirm the offer is 7 days in Play Console (active
   per `CURRENT_STATUS.md` §0).

7. **After 7 days, £4.99/month billing starts** — CODE-CONFIRMED price source;
   billing is console config. `catalogue.js:30` fallback + live store price via
   `usePlayPrices.js`/`selectDisplayPrice` (`playBilling.js:142-158`).
   **FOUNDER-ACTION:** confirm the product price.

8. **Every purchase is acknowledged within 3 days** — CONFIRMED.
   `playBilling.js:271-273` (listener) + `acknowledgeOutstanding()` on
   `initialise` and `restorePurchases` (M2), covering the missed-event / restore
   cases.

9. **Subscription cancellation revokes Pro access** — CONFIRMED with one
   founder dependency. Authoritative: `index.ts:481-486` (expire/refund→free) —
   **requires the Pub/Sub push wired (FOUNDER-ACTION)**. Code-side safety net:
   `cascade.reconcilePaidEntitlement` downgrades a `paid_pro` user when Play
   reports no active entitlement (wired in `RootNavigator.js`, C2). Until Pub/Sub
   is wired, a cancel/refund is caught on the next launch, not instantly.

10. **No bypass path exists** — IMPROVED.
    - DB trial extend/reset: closed by migration 070 (item 3) once applied.
    - Offline / cached entitlement: closed for trials by C3 (`checkTier` local
      expiry); a paid sub that lapses while permanently offline is bounded by the
      next online launch (inherent to offline support; mitigated by C2 + RTDN).
    - Startup window: H1 covered by C3's local expiry.
    - Entitlement-resolver inconsistency: closed by M1 (single source).
    - Navigation: every Pro route is `withProGuard`-guarded
      (`RootNavigator.js:114-120`; `ProGate.js:123-128`).

## Founder checklist to reach full sign-off
1. Apply `migrate_070` (and run 068's + 070's verification queries).
2. Wire the Play → Pub/Sub push for `play-billing-rtdn` (item 9).
3. Confirm the Play Console `pro_monthly`/`pro_annual` products carry the 7-day
   intro free trial and the £4.99 / £29.99 prices (items 6, 7).
4. Run a real purchase from Play Internal testing end-to-end.
