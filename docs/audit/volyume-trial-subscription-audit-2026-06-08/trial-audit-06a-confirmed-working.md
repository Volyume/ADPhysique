# Trial Audit 06A — Confirmed working

Only items fully verified from a file+line read appear here.

1. **14-day trial value is correct and server-side.**
   `migrate_068:123` `ends_at := starts_at + interval '14 days'`; writes
   `users_profile.trial_started_at`/`pro_trial_ends_at`/`trial_state`
   (`:126-131`). Schema `migrate_030:31-47`.

2. **Trial starts at Article 9 consent via a server RPC.**
   `Article9ConsentScreen.js:112` → `cascade.startCascade()`
   (`cascade.js:104-105`) → `start_cascade` (`migrate_068:93-143`).

3. **Trial start is idempotent against re-call.**
   `migrate_068:114-119` no-ops unless `trial_state='unstarted'`.

4. **Trial expiry is enacted server-side and scheduled.**
   Worker `cascade_advance_due_users` sets `trial_state='cascade_expired',
   tier='free'` at `pro_trial_ends_at<=now()` (`migrate_068:431-442`),
   scheduled every 15 min (`migrate_031:127-131`).

5. **The entitlement gate is a single, consistent check.**
   `ProGate.js:31` and `withProGuard :125-126` both `store.tier === 'pro'`;
   all Pro routes wrapped (`RootNavigator.js:114-120`).

6. **Paid grant is server-authoritative; client cannot self-grant Pro.**
   Client `upgrade_tier` is downgrade-only (`migrate_068:184-189`); paid grant
   only via service-role `upgrade_tier_for_user` (`migrate_068:284-413`,
   REVOKEd from authenticated `:412-413`) called by the edge function after
   Play Developer API verification (`index.ts:236-251`, `:404`), with the user
   id taken from Google's `obfuscatedExternalAccountId` (`:388`).

7. **Purchase flow + 7-day offer selection + double-tap guard.**
   `purchasePackage` selects the free-trial offer token
   (`playBilling.js:116-129`) and guards a single in-flight purchase + 90s
   timeout (`:331-353`); UI uses `setBusy`/`loading` (`PaywallScreen.js:63,197`;
   `CascadeGateScreen.js:113`).

8. **Price is fetched dynamically from the store on purchase surfaces.**
   `usePlayPrices.js:17-30` → `selectDisplayPrice` (`playBilling.js:142-158`),
   catalogue text only as pre-load fallback. Used by Paywall/CascadeGate/
   ProUpgrade/Subscription/TierComparisonStrip.

9. **Acknowledgement exists for the normal purchase path.**
   `playBilling.js:271-273` `finishTransaction` in the purchase listener
   (skips PENDING `:270`). (Not robust on the restore/killed-app path — see 06b.)

10. **Cancel/refund/grace handlers are correctly written (where they run).**
    `index.ts:481-495`: expire→free, refund→free, cancel→no-op, grace→keep
    access + payment-failure push. Logic is correct **if** Pub/Sub delivers
    them (see 06b).

11. **Restore cannot reactivate a cancelled subscription.**
    `restore.js:39-48` only grants when Play reports an active `'pro'`
    entitlement; otherwise `tier:null`.

12. **Trial-ending notifications are timed from the real end date.**
    `scheduler.js:253-258` schedules at `pro_trial_ends_at` and 2 days before
    (day 12 / day 14 for a 14-day trial).
