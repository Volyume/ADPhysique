# Release plan (locked)

How we get from "the moves are merging" to "real users on real
devices paying real money." Locked 2026-05-23.

> **Founder override 2026-06-06 (release posture):** Closed testing
> completes 2026-06-06. The immediate target is **Android full
> production**, approved once three gates are met: (1) subscriptions in
> place (real Play Billing path off the react-native-iap v15 provider,
> Play Console products + 7-day offer, `play-billing-rtdn` deployed,
> sandbox purchase verified); (2) all functionality 100% in place; (3)
> all audits and errors cleared (Play + App store readiness findings, and
> the red Jest suite / Main CI restored to green). **iOS is in scope
> alongside Android** (EAS/TestFlight pipeline built; founder continues it
> Monday). Pricing is flat £4.99/month or £29.99/year (the £0.99 / £1.99
> open-beta windows below are retired). The Phase A → B → C framing below
> is preserved for history; `docs/CURRENT_STATUS.md` § "Release phase" and
> § 0 (2026-06-06) carry the live plan.

## Phases

```
Phase A: Internal closed test (current state)
   │
   │  Moves #0 -> #4 land here. Internal testers verify on real devices.
   │
   ▼
Phase B: Open beta (4 weeks)
   │
   │  Move #5 has landed. Cascade live. Waitlist invites going out.
   │  Open beta pricing (£0.99 / £1.99) active.
   │
   ▼
Phase C: Founders window (12 weeks)
   │
   │  Open beta ends. Open beta SKUs hidden from new signups.
   │  Founders pricing (£1.49 / £3.49) live.
   │  Existing open-beta subscribers keep their £0.99 / £1.99 forever
   │  while subscription stays continuous.
   │
   ▼
Phase D: Standard (indefinite)
   │
   │  Founders ends. Standard pricing (£2.99 / £6.99) live.
   │  Existing founders subscribers keep £1.49 / £3.49 forever.
   │
   ▼
Phase E: Coach beta (phase 2)
   │
   │  Coach.volyume.app launches with 60-day trial.
   │  First 100 coaches = founding coaches (6mo free + lifetime 50% off).
   │
   ▼
Phase F: Coach GA (phase 2 v2)
   │
   │  Standard coach pricing (£29.99 / £59.99 / £119.99) live.
   │  Founding coach prices grandfathered.
```

## Move ship order within Phase A

Aligned to the locked move sequence in
`MASTER_VISION_AND_PLAN.md` Section 16.

1. **Move #0: Code corrections**. citation fix, blocklist
   extension, surname audit. Smallest, can ship first, no schema
   changes.
2. **Move #1: Food foundation + FFM floor**. schema, manual
   entry, FFM guardrail.
3. **Move #1.5: Barcode + OCR**. camera, MLKit, OCR fallback,
   write-back to OFF.
4. **Move #2: ED-pattern detection**. state machine, lockout
   copy, goal-lock interaction.
5. **Move #3: Upward gate compression**. engine math change.
6. **Move #4: Differential paywall output**. output block,
   trigger logic, conversion copy. (Trigger logic is wired but
   paywall CTAs are disabled until Phase B, since cascade isn't
   live in Phase A.)
7. **Move #5: Tier infrastructure**. three tiers, cascade state
   machine, RevenueCat integration, web checkout endpoint stubs.

After move #5 lands and stabilises in Phase A internal testing, we
transition to Phase B.

## Phase A entry/exit criteria

### Entry (already met)
- Internal testing group active on Play closed test.
- Current build (v1.1.0+4) signed and deployed.

### Exit (to enter Phase B)
- All moves #0 through #5 merged to the target branch.
- Acceptance checks from each move-level doc passed.
- Engine simulator: all locked scenarios green.
- Maestro critical-path E2E flows green on iOS + Android emulator.
- 903+ existing tests still pass.
- Load test passed (1000-user sync, 100-user purchase concurrency).
- Privacy policy updated and deployed at volyume.app/privacy.
- Article 9 consent screen working end-to-end on a fresh install.
- Sentry receiving events from internal testers (DSN verified
  working).
- One real-money sandbox purchase per platform completed and
  reflected in `tier_history`.

## Phase B entry: open beta launch

### Pre-launch tasks (in order)

1. **App Store + Play store listings finalised.** Screenshots,
   privacy manifest, age rating, content descriptions. Use
   `docs/APP_STORE_CONNECT_LISTING.md` and
   `docs/PLAY_STORE_LISTING.md` as the templates.
2. **Open beta SKUs created in App Store Connect + Play Console.**
   `pro_monthly_open_beta` and `complete_monthly_open_beta` at the
   locked prices.
3. **Marketing site updated.** Waitlist signup form active.
   Pricing page shows "Coming soon" until launch day.
4. **Waitlist email template ready.** Pulls invite code from a
   Supabase table. Limit: 200-500 invites per week, paced on
   observability headroom.
5. **Welcome push template ready** for waitlist invitees who
   install.
6. **Incident response runbook signed off**
   (`docs/INCIDENT_RESPONSE_RUNBOOK.md`).
7. **Support workflow ready.** support@volyume.app forwarded to
   founder inbox; reply template for common questions; in-app
   feedback view live.
8. **Coach marketing landing page** at volyume.app/coach (still
   "phase 2 coming soon" at this point).

### Launch day

- Bump version to 1.2.0 (representing the food + cascade work).
- Publish APK + AAB to closed test, then promote to production.
- Send first wave of 200 invite emails.
- Founder is on-call for the full launch day for any P1.

### Weekly cadence during Phase B

- Monday: review last week's telemetry against alert thresholds.
- Tuesday: send next wave of invites (size based on dashboards).
- Wednesday: triage feedback digest, write coach support tickets
  for any P2/P3 issues.
- Thursday: ship any urgent fixes.
- Friday: cumulative cohort report (signups, conversions, ED-flag
  rate, FFM-floor rate).

### Phase B exit (to enter Phase C)

- 4 weeks elapsed since launch.
- No outstanding P0 or P1 incidents.
- ED-pattern flag false-positive rate verified under 5% via spot
  review.
- Hit at least 80% of internal user-count target (pace per the
  waitlist).

## Phase C entry: founders window

### Tasks at the Phase B -> Phase C transition

1. **Hide open beta SKUs.** Set them to "Developer Removed" in App
   Store Connect and Play Console. Existing subscribers keep their
   SKU at the locked price.
2. **Show founders SKUs.** `pro_monthly_founders` and
   `complete_monthly_founders` become the visible products.
3. **Update marketing site pricing page** with founders prices and
   a "Founders pricing ends [date]" countdown.
4. **Email all open-beta subscribers** thanking them and confirming
   they keep their open-beta price for life.
5. **Open the waitlist signup further**. at this stage Volyume is
   publicly available, not invite-only. Waitlist toggles to a "Sign
   up now" path.

### Cadence during Phase C

- Same weekly review.
- Add: pricing-elasticity report. Compare conversion rate at
  founders pricing vs open beta pricing on cohort-matched data.

### Phase C exit (to enter Phase D)

- 12 weeks elapsed since Phase C launch.
- Cumulative paying users hit at least the modelled threshold
  (specific number tracked in
  `docs/PHASE_C_TARGETS.md`, written closer to the date).
- No outstanding P0 or P1.

## Phase D entry: standard pricing

### Tasks at Phase C -> Phase D transition

1. **Hide founders SKUs.** Set to "Developer Removed."
2. **Show standard SKUs.** `pro_monthly_standard` and
   `complete_monthly_standard`.
3. **Email founders subscribers** confirming they keep founders
   price for life.
4. **Marketing site** updated to standard prices, no countdown.
5. **B2B coach marketing** begins promotion in earnest if Phase E
   readiness is good.

## Versioning

Semantic-ish. Patch increments for bug fixes, minor for new moves,
major reserved for breaking changes. App versionCode increments
monotonically (Google Play requires this).

| Version | Phase | Notes |
| --- | --- | --- |
| 1.1.0+4 | Phase A entry (current) | Workout-only, food work in branch |
| 1.2.0+5 | Phase A exit | Food work + cascade work merged |
| 1.3.0+? | Phase B mid-cycle | Bug fixes from open beta cohort |
| 2.0.0+? | Phase E entry (phase 2 launch) | Coach web app integration |

## Rollback plan

If a release introduces a P0 in production:

1. Force-stop further rollout in App Store Connect / Play Console.
2. Mark the broken version as "deprecated" via a remote config flag
   read by the app at startup (gates feature flags off).
3. If the bug requires data migration repair, run a one-off
   Supabase script. Account states are logged in `tier_history`,
   `consent_log`, etc., so we can reconstruct.
4. Ship the fix in a patch release. Promote through closed test
   first, then to production.

Account-deletion path is never reversible. If a P0 affects deletion,
freeze the deletion queue while the bug is investigated; resume
manually once verified.

## Communication

- **Status page** at status.volyume.app (Vercel free tier, simple
  static page that reads from a `status` table in Supabase).
- **In-app banner** for any active incident, polled hourly from
  Supabase.
- **Email notification** to all users for incidents affecting
  Article 9 data (this triggers the FTC HBNR / UK ICO clock).
- **Twitter / X / Bluesky** post for general service incidents.

## Acceptance check

- Phase A exit criteria all green before flipping to Phase B.
- Open beta SKUs purchasable on day 1 of Phase B.
- Waitlist invite system sends a real invite to a test address
  and that invite redeems for a working signup.
- Founders pricing transition (Phase B -> C) does not affect
  existing open-beta subscribers' bills.
- Rollback drill: deploy a deliberately broken build to internal
  testing and verify the remote-config kill switch returns the app
  to a working state.
