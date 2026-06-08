# Trial Audit 06A — Confirmed working

Only items verified from a file:line read this session. Deployment facts (RTDN
deployed, Play products + 7-day offers active) are from `CURRENT_STATUS.md` §0
(2026-06-07) and cannot be proven from repo code — marked DOC.

1. **14-day value, server-side.** `migrate_068:123` `interval '14 days'`; writes
   `users_profile.tier/trial_state/trial_started_at/pro_trial_ends_at`
   (`:126-131`). Columns `migrate_030:42-44`.
2. **Trial starts at Article 9 consent (server RPC).** `Article9ConsentScreen.js:112`
   → `cascade.startCascade` (`cascade.js:104-105`) → `start_cascade`.
3. **Re-call is idempotent.** `migrate_068:114-119` (no-op unless
   `trial_state='unstarted'`).
4. **Trial expiry enacted + scheduled server-side.** Worker
   `cascade_advance_due_users` sets `trial_state='cascade_expired', tier='free'`
   at `pro_trial_ends_at<=now()` (`migrate_068:431-442`), every 15 min
   (`migrate_031:127-131`).
5. **Pro feature gates use one consistent check (`store.tier`).**
   `ProGate.js:31,125-126` + every inline `tier==='pro'` (HomeScreen, PlansScreen,
   AnalyticsScreen, BodyMetricsScreen, Settings*, YouScreen). (Exceptions in 06b
   M1.)
6. **Client cannot self-grant Pro.** Authenticated `upgrade_tier` is
   downgrade-only (`migrate_068:184-189`); `upgrade_tier_for_user` REVOKEd from
   `authenticated` (`:412-413`).
7. **Paid grant is server-authoritative + Play-verified.** `confirmPurchase`
   (`cascade.js:190-216`) → `play-billing-rtdn handleClientVerify`
   (`index.ts:379-408`): Play Developer API verify (`:236-251,:242`), user id from
   `obfuscatedExternalAccountId` (`:388`), → `upgrade_tier_for_user` (`:404,:312`).
8. **Purchase flow + 7-day offer-token selection + double-tap guard.**
   `purchasePackage` (`playBilling.js:311-384`), free-offer token
   (`:116-129`), single-bridge + 90s timeout (`:331-353`); `busy`/`loading`
   (`PaywallScreen.js:63,197`; `CascadeGateScreen.js:113`).
9. **Price fetched from the store on purchase surfaces.** `usePlayPrices.js:17-30`
   → `selectDisplayPrice` (`playBilling.js:142-158`); catalogue text only as
   pre-load fallback (`catalogue.js:30,37`).
10. **Acknowledgement on the normal purchase path.** `playBilling.js:271-273`
    `finishTransaction` (skips PENDING `:270`). (Edge case in 06b M2.)
11. **Cancel/refund/grace handlers correctly written.** `index.ts:481-495`
    (expire→free, refund→free, cancel→no-op, grace→keep access + push) — correct
    **where they run** (06b C2 on the wiring).
12. **Restore cannot reactivate a cancelled sub.** `restore.js:42-48` (null when
    Play reports no active entitlement).
13. **Trial-ending notifications timed from the real end date.**
    `scheduler.js:253-258` (at `pro_trial_ends_at`, and 2 days before).
14. **Cancel deep-links to Play (correct; Google owns cancellation).**
    `SubscriptionScreen.js:61-85`.
15. **Safety logic is tier-blind** (locked rule). `weeklyCoach.js` uses
    `hasUsedTrial` only for CTA copy (`:374,381,1089`), never for safety gating.
16. **(DOC) RTDN + send-push deployed; Play products + 7-day offers active.**
    `CURRENT_STATUS.md` §0 (2026-06-07). Not code-verifiable.
