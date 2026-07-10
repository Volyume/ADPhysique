⚠ STATUS (2026-07-10): PRE-CAMPAIGN BLUEPRINT/SPEC - GATED. Do not build from this document. Any item here requires the D37 triage (verify against today's tree + the decision register) and the D38 elevation test before consideration. Current work runs from docs/ux-world-class-audit-2026-07-09/_HANDOVER-AND-RESUME.md and docs/TASKBOARD.md.

# Move #5: Three-tier infrastructure (locked)

The largest non-engine move. Introduces the Complete tier, the 28-
day cascade state machine, RevenueCat integration, six consumer
SKUs, and the per-tier feature gate map. Phase 1 groundwork for the
B2B coach surface ships here too (`engine_overrides` table, schema
hooks for `coach_id`). Locked 2026-05-23.

## Scope

### Database (migration 007)

From `DATABASE_SCHEMA_LOCKED.md` Section "Tier and subscription
domain":

- `tier_history` table.
- `profiles` column additions: `trial_state`, `trial_started_at`,
  `complete_trial_ends_at`, `pro_trial_ends_at`,
  `locked_in_price_tier`, `revenuecat_app_user_id`,
  `goal_lock_advanced`, `goal_lock_set_at`,
  `health_data_consent`.
- `upgrade_tier` RPC.
- Tier-protect trigger updated to whitelist `upgrade_tier`.

### proGate

```
src/lib/proGate.js                        EXTENDED
  - PRO_BETA_ACTIVE flag retired (replaced by tier state).
  - new function: isPaidTier(user)
      returns 'free' | 'pro' | 'complete'
  - new function: hasFeature(user, feature)
      reads against the per-tier feature flag map below.
  - new function: hasGoalUnlock(user, feature)
      checks goal-based unlocks independent of tier.
  - existing safety functions (FFM floor check, ED-flag wiring)
    NEVER consult proGate. Verified via test.
```

#### Feature flag map (locked)

```js
const FEATURE_MAP = {
  free: [
    'engine_safety_guardrails',     // always on
    'food_logging_basic',
    'weight_logging',
    'weekly_checkin_basic',
    'history_30_days',
    'csv_export',
  ],
  pro: [
    ...free,
    'food_logging_full',
    'adaptive_engine',
    'macro_rings',
    'history_90_days',
    'differential_paywall_disabled', // pro doesn't see paywalls
    'refeed_aggressive_cut_or_contest_prep',
  ],
  complete: [
    ...pro,
    'history_unlimited',
    'peak_week_module',
    'block_planning_extended',
    'photo_progress_local',  // on-device only per BUDGET_POSTURE_LOCKED.md
    'body_composition_summary', // read-only at v1; full charts in v1.1
    'coach_link_eligible',   // means client can be linked, no Pro
    'share_pack_csv',
    'priority_support',
    'refeed_automated_any_cut', // v1.1 (deferred per budget)
    'body_composition_deep',     // v1.1
    'share_pack_pdf',            // v1.1
  ],
};
```

### RevenueCat integration

```
src/lib/payments/                         NEW directory
  revenuecat.js                           NEW (SDK init, wrappers)
  catalogue.js                            NEW (the six SKUs + lookup)
  cascade.js                              NEW (state machine)
  restore.js                              NEW (restore purchases)

supabase/functions/revenuecat-webhook/    NEW Edge Function
  index.ts                                Webhook handler (see SUBSCRIPTION_AND_PAYMENT_LOCKED.md)
```

Six SKUs created in App Store Connect + Google Play Console:

- `pro_monthly_open_beta` £0.99
- `pro_monthly_founders` £1.49
- `pro_monthly_standard` £2.99
- `complete_monthly_open_beta` £1.99
- `complete_monthly_founders` £3.49
- `complete_monthly_standard` £6.99

### UI

```
src/screens/CascadeGateScreen.js          NEW (day 14 + day 28 modals)
src/screens/SubscriptionScreen.js         NEW (You tab management)
src/screens/PaywallScreen.js              EXTENDED from move #4
src/components/TierComparisonStrip.js     NEW
```

The cascade gate UI was already specified in
`UI_FLOWS_LOCKED.md`. Move #5 builds it.

### Behaviour wiring

- New signup -> Article 9 consent recorded -> `trial_state =
  'complete_trial_active'`, `complete_trial_ends_at = now() + 14d`,
  `locked_in_price_tier` = current pricing window.
- Day 14 worker -> if `trial_state = 'complete_trial_active'` and
  no payment, fire `upgrade_tier('pro', 'auto_downgrade')`. Sets
  `pro_trial_ends_at = now() + 14d`.
- Day 28 worker -> if `trial_state = 'pro_trial_active'` and no
  payment, fire `upgrade_tier('free', 'auto_downgrade')`. Sets
  `trial_state = 'cascade_expired'`.
- User pays at any stage -> `upgrade_tier('pro'|'complete',
  'user_paid', payment_ref)`. Locks in price window.
- User skips -> `upgrade_tier('pro'|'free', 'user_skip')`.

Workers run as Supabase scheduled functions (`pg_cron`). One job
per gate, runs at the user's local 10:00. Locale stored on
profile.

### B2B groundwork (no UI at this move)

- `engine_overrides` table created.
- `coach_id` added to relevant tables (nullable; phase 2 populates).
- `engine_overrides` is read by `weeklyCoach.js` when present
  (returns null at this move since no coach exists yet).

### Telemetry

```
cascade_state_transition
purchase_initiated
purchase_completed
purchase_failed
subscription_cancelled
restore_purchases_attempted
paywall_shown          (already exists from move #4)
paywall_tapped_cta     (already exists)
```

Daily aggregations and dashboards per
`TELEMETRY_DASHBOARDS_LOCKED.md` Panel 5.

## Tests required

### Unit

```
tests/lib/proGate.test.js                  EXTENDED
  - isPaidTier returns correct values
  - hasFeature reads the map correctly
  - hasGoalUnlock honours goal state independent of tier
  - safety functions ignore proGate
```

### Integration

```
tests/payments/<every webhook event>.test.js
  (full list in TESTING_STRATEGY_LOCKED.md)
```

### Cascade state machine

```
tests/payments/cascadeStateMachine.test.js
  - all 17 transitions
  - 3-day grace period
  - cross-platform sign-in
```

### E2E (Maestro)

```
e2e/cascade_day14_gate_pay.yaml
e2e/cascade_day14_gate_skip.yaml
e2e/cascade_day28_gate.yaml
e2e/subscription_restore.yaml
e2e/account_deletion_path.yaml
```

### Load

```
tests/load/purchase_100_concurrent.js
  - 100 concurrent RevenueCat sandbox purchases
  - target: zero failures, p95 < 3s
```

## Acceptance check

- All 17 cascade transitions pass automated tests.
- Sandbox purchase of `pro_monthly_open_beta` produces
  `trial_state = 'paid_pro'` AND `locked_in_price_tier =
  'open_beta'`.
- Cancellation via App Store sandbox triggers CANCELLATION webhook,
  banner shows, EXPIRATION fires at period end.
- Refund via App Store sandbox immediately downgrades to free.
- iOS purchase visible on Android Volyume without re-charge.
- Restore purchases on fresh install correctly restores tier.
- Account deletion wipes all tier_history rows for the user.
- proGate `isPaidTier` returns correct tier across 100 synthetic
  account states.
- Safety guardrail tests confirm FFM floor and ED-pattern detector
  fire regardless of tier.

## Effort estimate

3-4 weeks. The state machine is straightforward but RevenueCat
sandbox testing across iOS + Android, plus the webhook plumbing
through a Supabase Edge Function, eats most of the time.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| RevenueCat webhook signature verification fails | Test signature path with RevenueCat sandbox events before launch |
| Cascade workers (pg_cron) miss transitions on busy days | Idempotent design; running the worker twice produces the same result |
| User payment locked-in price not honoured on platform price changes | Tested on sandbox: Apple/Google promise current subscribers keep their price absent re-confirmation |
| Account deletion races with tier transitions | Deletion path acquires advisory lock; tier change refuses on deleted users |
| Coach overrides accidentally consumed before phase 2 | `engine_overrides` reads return null until phase 2 wires the consumer; tested |

## Effort sequence within the move

1. Database migration 007.
2. proGate extension + tests.
3. RevenueCat SDK wired in app, sandbox purchases verified.
4. Webhook Edge Function.
5. Cascade workers (pg_cron jobs).
6. Cascade gate UI screens.
7. Subscription management screen.
8. E2E flows on Maestro.
9. Load test.
10. Phase A internal smoke test on a real device with sandbox IAP.

After Phase A smoke passes, move #5 is ready for Phase B launch.
