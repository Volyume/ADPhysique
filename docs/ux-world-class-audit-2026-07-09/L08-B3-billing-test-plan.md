# L08-B3 — Post-cancel forward link: written billing test plan

**Status:** Awaiting founder "proceed" (per docs/rules/billing.md, billing-
adjacent changes need this plan approved BEFORE code). Ruling authorising
the build: D16 (DECISIONS-2026-07-09.md).

## The change (statement required by billing.md)

1. **File:** `src/components/PostLapseSheet.js` — the one-time
   first-open-after-lapse sheet. Why: L08-B3 (conversion-funnel audit) —
   the peak-attention post-cancellation moment carries no forward path.
2. **Exact change:** one additional calm line beneath the existing body —
   "Changed your mind? Pro is always one tap away in Subscription." —
   rendered with a tertiary (non-primary) pressable that navigates to the
   Subscription screen and dismisses the sheet via the existing
   `handleDone` path (so `markLapseSheetShown()` still runs and the
   one-time contract holds). No urgency framing, no discount mention, no
   change to the reason picker or the primary button.
3. **Purchase / entitlement / trial impact:** none. No purchase flow,
   entitlement check, trial logic, product id, pricing or cascade code is
   read or written. Copy + navigation only. `winbackState` calls are the
   existing ones, unmoved.
4. **Sandbox before production:** the flow is device-walked from an EAS
   build with a sandbox (licence-tester) account before any release build
   carries it.

## Automated tests (written with the change)

- Guard test pinning the exact new line and that it renders in BOTH the
  ask-reason and no-reason variants of the sheet.
- Contract test: tapping the new link calls `markLapseSheetShown()`
  exactly once and navigates to `Subscription` (mocked navigation), so
  the sheet can never re-show because of the new exit path.
- Contract test: the primary Done/Got-it path is byte-identical in
  behaviour (unchanged assertions re-run).
- Source guard: `PostLapseSheet.js` contains no import from
  `react-native-iap` and no product id literal (keeps the sheet
  billing-logic-free forever).

## Manual device checklist (physical Android, EAS build, sandbox account)

1. With an active sandbox Pro subscription, cancel from Google Play's
   subscription settings. Expected: app still Pro until expiry.
2. After the sandbox entitlement lapses, cold-start the app. Expected:
   PostLapseSheet appears once, with the saved-data reassurance, the
   optional reason question (if none captured), and the new calm line
   with the Subscription link — no urgency copy anywhere.
3. Tap the new link. Expected: sheet closes, Subscription screen opens,
   nothing is purchased, no store dialog appears.
4. Background and re-open the app. Expected: the sheet does NOT re-show
   (one-time contract intact).
5. From Subscription, complete a sandbox re-subscribe. Expected: tier
   returns to Pro via the normal restore/entitlement path (untouched by
   this change).
6. Fresh lapse episode with the link ignored (dismiss via Got it), then
   re-open. Expected: sheet does not re-show; nothing regressed.
7. ED-safety spot check: no weight/food content on this surface (none
   exists); calm mode users see identical behaviour.

## Rollback

Revert the single commit; the sheet returns to its current copy. No data,
schema or entitlement state is touched, so rollback is copy-only.
