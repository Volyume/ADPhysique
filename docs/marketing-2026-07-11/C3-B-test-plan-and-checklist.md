# C3 (D71) option B — restore addition: billing test plan + device checklist

**Date:** 2026-07-11 · **Authority:** D71
(`docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md`), built from
`docs/marketing-2026-07-11/C3-duplicate-paywall-decision-brief.md`.

This document is the dedicated written test plan required by
`docs/rules/billing.md` for the restore affordance added to
`src/screens/ProUpgradeScreen.js`, plus the physical-Android device checklist
for the whole C3 change (excerpt card + restore + orphan deletion).

The change ported two PaywallScreen capabilities onto the single live upgrade
surface (ProUpgradeScreen) and deleted the orphaned PaywallScreen:

1. Play-review social-proof excerpt card (`pickPaywallExcerpt` from
   `src/screens/paywallExcerpts.js`), between the perks list and the tier
   comparison strip.
2. A quiet inline restore affordance (has-account branch only), calling the
   existing shared `restorePurchases()` from `src/lib/payments/restore`.

---

## Part A — Billing test plan (restore affordance)

### What is exercised

- The on-screen restore tap on ProUpgradeScreen (has-account branch) calls
  the EXISTING shared `restorePurchases()` in `src/lib/payments/restore.js`.
  No new billing code was written; this is a UI affordance over the same
  module ProGate and SubscriptionScreen already use.
- Three calm, tier-blind outcomes, mirroring ProGate.handleRestore and the
  deleted PaywallScreen.handleRestore semantics:
  - active Pro entitlement found → `appAlert('Pro restored', 'Your
    subscription is active again.')`, plus a light-touch
    `refreshTierFromCloud(...)` reconcile (the same reconcile the purchase
    path already runs; `restorePurchases` has already written entitlement
    server-side);
  - nothing to restore → `appAlert('Nothing to restore', 'We could not find
    an active subscription for this store account.')`;
  - failure / throw → `appAlert('Could not restore', 'Try again in a
    moment.')`, with `logError('ProUpgrade.restoreFailed', ...)`.
- A dedicated `restoring` busy flag disables the affordance while in flight
  (label flips to "Restoring...") and is independent of the purchase/OAuth
  `busy` flag, so the primary CTA never spins for a restore.
- `trackCta('restore')` fires on tap through the existing helper — the
  allow-listed `paywall_tapped_cta` event already carries `cta` strings, so
  NO new event name and NO server migration.

### What must not regress (invariants)

- **No purchase is initiated by restore.** Restore is a read of an existing
  entitlement. `restorePurchases()` calls `playBilling.restorePurchases()`
  (a query), never `purchasePackage`. Source-guarded: ProUpgradeScreen must
  not contain `playBilling.restorePurchases` (it routes through the shared
  module) and the restore handler never calls `subscribePro`/`purchasePackage`.
- **Entitlement read is read-only to the client.** Restore never writes a
  paid tier from the client; `payAt` unlocks optimistically and the server
  confirm + `refreshTierFromCloud` reconcile to the server-owned tier
  (migration 067 rule). Untouched by this change.
- **Product IDs untouched.** `pro_monthly` / `pro_annual` are not referenced
  by the restore path; `skuFor` is not involved in restore.
- **No changes to `restore.js`, `playBilling.js`, `cascade.js`,
  `catalogue.js`.** The addition is UI-only; the four billing modules are
  byte-unchanged.
- **Guardrails stay tier-blind.** Restore outcomes are the same for every
  user; no ED-safety surface is touched (nothing weight/food/notification
  adjacent).

### Automated coverage

- `src/__tests__/proUpgradeC3.guard.test.js` — restore routes through
  `../lib/payments/restore`, never an inline IAP call; `trackCta('restore')`
  present; no new restore event name; excerpt card renders from
  `pickPaywallExcerpt`; PaywallScreen file/registration/lazy-import all gone.
- `src/__tests__/proUpgradeTelemetry.guard.test.js` (C2) — unchanged; still
  pins the impression block, the single `trackCta` helper and the seven CTA
  strings, and "no new event names".
- `src/screens/__tests__/paywallExcerpts.test.js` — the excerpt module's own
  contract (deterministic pick, ships dark while empty) — now consumed by
  ProUpgradeScreen.

---

## Part B — Physical-Android device checklist (EAS build)

Run on a physical Android device from a green EAS build (custom native
modules mean Expo Go is not sufficient). Steps are numbered with the expected
result per step.

1. **Open the upgrade surface.** From a free signed-in account, tap any
   "Upgrade to Pro" entry (e.g. a Pro lock → "Upgrade to Pro").
   *Expected:* ProUpgradeScreen opens with the "Go Pro" pitch, perks, tier
   comparison strip, account/subscribe controls and FAQ.

2. **Excerpt card visibility.** Look between the perks list and the tier
   comparison strip.
   *Expected today:* with `PAYWALL_EXCERPTS` empty the card is absent (ships
   dark, correct). *When the founder adds >= 3 real Play reviews:* one
   excerpt card (stars + verbatim quote + "Name - Google Play - Mon YYYY")
   renders in that slot, above the comparison. Screen reader reads the card
   as a single labelled review.

3. **Restore affordance is present and quiet (signed-in account).**
   *Expected:* a small "Restore purchases" text row with a refresh icon
   appears near the "What stays if you switch back to Free later" link. It
   reads as a secondary affordance, not a second primary button.

4. **Restore with an active subscription restores Pro.** On a device/store
   account that already owns Pro (e.g. reinstall, or the account used to
   purchase), tap "Restore purchases".
   *Expected:* label shows "Restoring..." while in flight, then an alert
   "Pro restored — Your subscription is active again." Tier reconciles to Pro
   (coaching features unlock). No store purchase sheet appears; the user is
   NOT charged.

5. **Restore with no active subscription shows the calm not-found message.**
   On a store account with no Pro entitlement, tap "Restore purchases".
   *Expected:* "Restoring..." briefly, then an alert "Nothing to restore — We
   could not find an active subscription for this store account." No charge,
   no purchase sheet, tier unchanged.

6. **Restore failure is calm.** Simulate a store/network failure (e.g.
   airplane mode) and tap "Restore purchases".
   *Expected:* alert "Could not restore — Try again in a moment." No crash,
   tier unchanged.

7. **Purchase and trial CTAs unchanged.** For a trial-eligible account the
   primary CTA still reads "Start your free trial"; for a non-eligible
   account "Subscribe to Pro"; during beta "Activate Pro". Tapping still runs
   the existing purchase/trial flow (billing-period selector, store sheet,
   "You're Pro" success state). None of this behaviour changed.

8. **No reachable "Paywall" route.** Confirm the old surface is gone: there
   is no navigation path that reaches a "Paywall" screen (all upgrade entries
   land on ProUpgrade). A build-time smoke check: the app builds and runs
   with no `Paywall` route registered; the differential badge on Home still
   opens ProUpgrade, not Paywall.

9. **Restore affordance hidden for the no-account branch.** From a
   local-only (not signed-in) state where ProUpgrade shows the OAuth
   create-account buttons, confirm the "Restore purchases" row is NOT shown
   (restore requires a store account; the OAuth branch is for brand-new
   sign-up).

10. **Light/dark theme.** Toggle the app theme while on ProUpgrade.
    *Expected:* the excerpt card and the restore row track the theme flip on
    the same mounted instance (no static island), matching the rest of the
    screen.
