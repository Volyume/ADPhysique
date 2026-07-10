# AUD-01 Apple webhook fail-closed test plan

**Status:** Approved for implementation by the founder in the 2026-07-10
adversarial-audit remediation request.

## Exact change

`supabase/functions/app-store-notifications/index.ts` will acknowledge a
notification without changing tier whenever Apple's authoritative subscription
lookup fails. User routing, product information and payment references will be
taken only from the transaction returned by Apple. Purchase events may grant Pro
only for `ACTIVE` or `GRACE_PERIOD`; expiry/refund events may downgrade only when
Apple reports a terminal status. No SQL or deterministic coaching code changes.

The function remains on the feature branch until the founder merges it. It must
not be pushed directly to `main`, where the Edge Function auto-deploys.

## Automated contract tests

- Missing/failed authoritative lookup logs and returns `200 OK` without calling
  `upgrade_tier_for_user`, `setBillingPeriod` or payment-failure push delivery.
- `SUBSCRIBED`, `DID_RENEW` and `OFFER_REDEEMED` grant only when Apple reports
  `ACTIVE` or `GRACE_PERIOD`.
- `EXPIRED` and `GRACE_PERIOD_EXPIRED` downgrade only when Apple reports
  `EXPIRED` or `REVOKED`.
- `REFUND` and `REVOKE` cannot downgrade an active transaction.
- A claimed `appAccountToken` that differs from Apple's transaction is ignored;
  only Apple's token can select the account.
- Unsigned/forged payloads and nonexistent transaction IDs cannot change tier.
- An RPC failure is observable and does not produce a false persisted-success
  assertion.

## Sandbox and TestFlight device plan

1. Buy monthly Pro with an App Store Sandbox account. Confirm the webhook grants
   Pro to the purchasing account and records the correct product and transaction.
2. Allow a sandbox renewal. Confirm Pro remains active and no duplicate or
   cross-account entitlement is created.
3. Cancel renewal, retain access until expiry, then allow sandbox expiry. Confirm
   the account downgrades only after Apple reports a terminal status.
4. Repeat purchase, renewal and cancellation in a TestFlight build using a
   sandbox tester. Confirm the app refreshes the cloud tier after each event.
5. POST an unsigned/forged `SUBSCRIBED` payload with a chosen account UUID and a
   nonexistent transaction. Expect `200 OK`, a warning log and no tier change.
6. POST forged `EXPIRED`, `REFUND` and `REVOKE` payloads for an active real
   transaction. Expect no downgrade because Apple still reports it active.
7. Simulate Apple API timeout, missing credentials, 404 and malformed response
   for purchase and expiry events. Expect acknowledgement, warning log and no
   tier change.
8. Supply a claimed account token different from the authoritative transaction
   token. Confirm only the authoritative account can be affected.

## Rollback

Revert the AUD-01 commit. There is no migration or production data operation.
Do not use rollback as a substitute for validating the fail-closed cases before
merging to `main`.
