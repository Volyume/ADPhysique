# Testing strategy (locked)

How we know the engine, food layer, sync, payments, and the cascade
all work before users see them. Locked 2026-05-23.

## Stack

| Layer | Tool | Why |
| --- | --- | --- |
| Unit + integration | Jest (already wired) | 903 tests already in suite |
| Property-based | fast-check (already in suite) | Engine math invariants |
| Snapshot | Jest snapshot | Surface copy regressions |
| End-to-end | Maestro (free, YAML-driven) | iOS + Android with zero subscription |
| Engine simulation | Custom harness (`tests/simulator/`) | Multi-week user trajectories |
| Sync regression | Jest + Supabase test fixtures | Each table in registry has paired test |
| Load test | k6 (free, open source) | 1000-user sync simulation |

Maestro chosen over Detox: free, simpler YAML flows, no Detox tax on
build-time. Detox is the alternative if Maestro can't drive a
specific surface.

## The engine simulator

Lives in `tests/simulator/`. Feeds synthetic users through
`weeklyCoach.js` and `nutritionEngine.js` for 12 simulated weeks
each. CI runs all scenarios on every PR; any unexpected output
fails the build.

### Scenarios (locked baseline)

| Scenario | Setup | Expected trajectory |
| --- | --- | --- |
| `straight_cut` | 80kg male, 20% BF, goal mild cut, adherence "hit" weekly | Steady weight loss, no flags, no holds |
| `aggressive_cut_supervised` | 90kg male, 15% BF, goal physique competition, goal-lock TRUE, energy 4 | Cut runs, ED detector at 3-signal threshold doesn't fire |
| `aggressive_cut_unsupervised` | Same body, goal physique competition, goal-lock FALSE, energy 2-3, weight dropping 1.7% wk2 | ED-pattern flag fires by week 4, lockout copy shown |
| `red_s_trajectory` | 70kg female, 18% BF, intake at 28 kcal/kg FFM | FFM floor fires immediately, deficit refused |
| `recomp_steady` | 75kg, 22% BF, kcal at maintenance, protein 2.2g/kg | No weight change, modest strength gains, no flags |
| `bulk_gentle` | 75kg, 18% BF, mild surplus | Weight up 0.5%/wk, no flags |
| `bulk_aggressive` | 85kg, goal bulk_aggressive, protein 2.8g/kg | Weight up 1%/wk, no flags |
| `rapid_loss_correction` | 80kg, deficit too steep, weight drops 1.8% in wk1 | Rapid-loss flag fires, upward gate compresses to 1-week |
| `stalled_lift` | Bench plateaued 3 weeks, adherence "under" 2 of 3 | Stalled-lift insight surfaces; differential paywall trigger fires for free users |
| `plateau_then_break` | Cut stalls 4 weeks, then diet break trigger | Diet break suggested per MATADOR; resumes after |
| `returning_user` | Account exists, 6-week absence, weight log resumes | Data confidence gate clamps adjustments until 2 weeks of fresh data |
| `noisy_logger` | Logs only 2-3 days/week | Adherence-quality gate prevents engine adjustments until logging improves |

Each scenario asserts on:
- Held decisions raised (which, when)
- Adjustment magnitudes per week
- Surface copy strings rendered (compared to snapshot)
- Final-week state

### Adding a scenario

```js
// tests/simulator/scenarios/my_new_scenario.test.js
import { simulate } from '../runner';

test('my_new_scenario', () => {
  const result = simulate({
    user: { weight_kg: 80, bf_pct: 20, sex: 'M', goal: 'mild_cut' },
    weeks: 12,
    weeklyInputs: [
      { weight_kg: 79.8, adherence: 'hit', energy: 4, recovery: 4 },
      // ...
    ],
  });

  expect(result.weekByWeek[3].held_decisions).toEqual([]);
  expect(result.finalState.target_kcal).toBeGreaterThan(2000);
  expect(result.totalAdjustments).toBeLessThan(3);
});
```

## Property-based tests (engine math)

Invariants checked across thousands of random inputs:

```
calcBMR(weight, age, sex) >= 1000 always
calcBMR(weight, age, sex) <= 3000 always

calcProtein(weight, approach, goal):
  approach = 'standard' → result in [2.0, 2.7] × weight_kg
  approach = 'optimised' → result in [2.4, 3.1] × weight_kg
  approach = 'advanced' → result in [2.7, 3.4] × weight_kg

computeAdaptiveTDEEAdjustment:
  larger deficit → larger adjustment (monotonicity)
  output bounded by [-300, +300] kcal/wk (cap)
  output respects 2-week cooldown unless rapidLossOverride flag set

FFM floor:
  computeFFMFloor(weight, bf_pct) = (weight × (1 - bf_pct/100)) × 30
  always >= absolute floor (1500/1200 by sex)

ED-pattern detector:
  signal count required = 2 when goal_lock_advanced = false
  signal count required = 3 when goal_lock_advanced = true
  FFM floor NEVER suppressed by goal_lock_advanced
```

Files: `tests/engine/*.property.test.js`.

## Snapshot tests (surface copy)

Locked outputs from `WHY_LIBRARY` and every conversion-trigger
string snapshot. Updates require explicit review (CI fails on
unexpected changes).

Files: `tests/snapshots/whyLibrary.snap.js`,
`tests/snapshots/conversionCopy.snap.js`,
`tests/snapshots/onboardingCopy.snap.js`.

## E2E flows (Maestro)

YAML flows in `e2e/`. Each runs against a fresh app install on a
Maestro Cloud free tier device or a local emulator.

### Critical-path flows (must pass before any move ships)

```
e2e/
├── onboarding_happy_path.yaml          -- new signup -> first run summary
├── onboarding_decline_article9.yaml    -- declining consent deletes account
├── diary_log_first_meal.yaml           -- search -> add -> see in diary
├── diary_swipe_delete.yaml             -- delete an entry
├── scan_barcode_happy_path.yaml        -- (move #1.5) scan -> add
├── scan_barcode_miss_ocr.yaml          -- (move #1.5) scan miss -> OCR
├── cascade_day14_gate_pay.yaml         -- (move #5) pay at day 14
├── cascade_day14_gate_skip.yaml        -- (move #5) skip to Pro at day 14
├── cascade_day28_gate.yaml             -- (move #5) decisions at day 28
├── subscription_restore.yaml           -- (move #5) restore on new install
├── account_deletion_path.yaml          -- delete flow + 30-day promise copy
└── goal_lock_set_and_clear.yaml        -- (move #2) goal lock toggle
```

### Maestro Cloud usage

Maestro Cloud free tier: 100 runs/month. Use for the critical-path
flows. CI runs locally on emulator for unlimited runs; Maestro Cloud
runs are reserved for pre-release validation on real devices.

## Sync regression matrix

Each table in `SYNC_REGISTRY` from
`SYNC_ARCHITECTURE_LOCKED.md` has six paired tests:

1. Local insert -> sync -> remote contains row
2. Local update -> sync -> remote reflects update
3. Local soft-delete -> sync -> remote shows `deleted_at`
4. Remote insert (service role) -> sync -> local contains row
5. Conflict (local + remote modified) -> resolution strategy applies
6. Network failure mid-push -> retry succeeds

Plus the two-device pair:

7. Device A inserts -> Device B foregrounds within 60s -> row appears
8. Both insert offline -> both reconnect -> both rows present

Files: `tests/sync/<table_name>.test.js`.

## Payments testing

Sandbox accounts on Apple StoreKit and Google Play Billing. Each
cascade transition exercised:

```
tests/payments/
├── purchase_pro.test.js                -- INITIAL_PURCHASE webhook
├── purchase_complete.test.js
├── renewal.test.js                     -- RENEWAL webhook (no-op)
├── product_change_upgrade.test.js      -- pro -> complete
├── product_change_downgrade.test.js    -- complete -> pro (next renewal)
├── cancellation.test.js                -- user cancels
├── expiration.test.js                  -- expiry after cancel
├── billing_issue.test.js               -- grace period start
├── grace_lapse.test.js                 -- 3-day timeout -> downgrade
├── refund.test.js                      -- REFUND webhook -> immediate downgrade
└── cross_platform.test.js              -- iOS purchase, Android sees entitled
```

## Load testing

k6 scripts in `tests/load/`:

- 1000 concurrent users syncing 30 days of history. Target: p95 sync
  under 8s.
- 100 concurrent purchase attempts (RevenueCat sandbox). Target: zero
  failures, p95 under 3s end-to-end.
- 10,000 weekly_coach_run invocations in 5 minutes. Target: zero
  Supabase Postgres function errors.

Run before each major release. Not on every PR.

## Pre-launch checklist (per move)

Each move-level doc names which of the above tests are required.
Headline:

- Engine moves (#0, #2, #3): property-based + simulator scenarios.
- Food moves (#1, #1.5): sync regression + manual food flow E2E.
- Subscription move (#5): full payments test suite + cross-platform.
- Paywall move (#4): snapshot for conversion copy + simulator's
  stalled_lift scenario.

## Continuous integration

GitHub Actions workflow (existing). Add the following jobs:

- `test` (existing, extended): runs Jest unit + integration +
  property + snapshot. Required for merge.
- `simulator` (NEW): runs all scenarios in `tests/simulator/`.
  Required for merge.
- `sync_regression` (NEW): runs against a Supabase test project.
  Required for merge.
- `e2e_emulator` (NEW): runs Maestro flows on emulator. Required for
  merge.
- `e2e_cloud` (NEW): runs Maestro flows on Maestro Cloud free tier.
  Required for release tag only (not every PR).
- `load_test` (NEW): runs k6 scripts. Required for release tag only.

## Coverage targets

- Engine code (`nutritionEngine.js`, `weeklyCoach.js`,
  `edPatternDetector.js`, `proGate.js`): 90%+ line coverage.
- Sync code: 85%+ line coverage.
- UI components: 70%+ via snapshot + interaction tests.
- Surface copy: 100% via snapshot.

Coverage report from Jest, surfaced in PR comments via the
`codecov` GitHub action (free tier).

## Out of scope at v1

- Mutation testing (Stryker). Nice-to-have, defer until engine
  changes slow down.
- Visual regression testing (Percy, Chromatic). Defer.
- Production canary rollouts. Internal testing track + open beta
  waitlist serve a similar function at v1 scale.

## Acceptance check

- All locked scenarios in the simulator pass on `main`.
- 903+ existing tests still pass.
- Maestro critical-path flows pass on iOS and Android emulator.
- Sync regression matrix passes for every table in the registry.
- Coverage targets met or PR cannot merge.
