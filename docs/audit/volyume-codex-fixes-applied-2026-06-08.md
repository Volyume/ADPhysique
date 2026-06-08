# DOCUMENT A — Codex audit fixes applied (2026-06-08)

Worked through the Codex audit report as a 13-step task list, in order, against
checkout `bd26b04` (origin/main). Every fix was made by hand (no agents), cites
the file changed, and was verified before moving on. Commands run and their
actual output are recorded below.

Branch worked on: `main`. The local checkout started 24 commits behind
`origin/main`; it was fast-forwarded to `bd26b04` (clean, no divergence) before
any edit, so all changes are relative to `bd26b04`.

Session commits (oldest first):

- `e3352f4` Steps 2-5 (OPS-001, SUB-001, SUB-003, PLAY-002)
- `e8af31b` Steps 6-8 (SUB-002, BUG-002, BUG-003)
- `2a6fdee` Step 9 (CODE-001)
- `89695f0` Step 10 (COPY-001, COPY-002, COPY-004)
- `cae6efc` Step 11 (IMP-001)
- `67e6c47` Step 12 (PERF-001)

---

## Step 1 — Dependencies + baseline (BUG-001 / QA-001)

BUG-001 / QA-001 are **false positives on this checkout**. The report expected
`node_modules/react-native-worklets/plugin.js`; the package actually resolves
the Babel plugin at `node_modules/react-native-worklets/plugin/index.js` (a
directory with an index), which is valid. `node_modules/typescript/bin/tsc`
exists. The dependency tree is healthy, so no destructive `npm ci` was run.

Baseline recorded (before any fix):

- `tsc --noEmit --strict`: 0 errors
- project `tsc --noEmit`: 0 errors
- `eslint .`: 0 errors, 4 warnings (pre-existing unused vars in tests/simulator)
- `npm audit --production`: 18 vulnerabilities (14 moderate, 4 high)
- `npm test -- --runInBand --silent`: 187 suites pass, 3042 passed / 3 skipped

## Step 2 — ESLint ignores (OPS-001)

`eslint.config.js` (ignores array): added `.audit-tools/**`, `.audit-output/**`,
`.tools/**` so audit scratch directories are not linted with the RN config.
Verified: `eslint .` still 0 errors / 4 warnings.

## Step 3 — RTDN grant failure surfaced (SUB-001)

`supabase/functions/play-billing-rtdn/index.ts`:

- `callUpgradeTier` now returns `{ ok, error }` instead of `void` (returns
  `{ ok:false, error:'service_role_unconfigured' }` when env is missing,
  `{ ok:false, error:'rpc_<status>' }` on RPC failure, `{ ok:true }` on success).
- `handleClientVerify` checks the result: a verified-but-unpersisted purchase
  now returns **502 `{ ok:false, error:'grant_failed' }`** instead of the old
  `200 { ok:true }`, so the client retries instead of showing Pro on a tier the
  server never changed. `setBillingPeriod` stays best-effort (display only).

Test: `src/lib/__tests__/rtdnWebhook.contract.test.js` — added the 502 / result
contract assertions.

## Step 4 — Await purchase confirmation (SUB-003)

`src/screens/ProUpgradeScreen.js` (`subscribePro`): `confirmPurchase` is now
**awaited** (was fire-and-forget), with `setBusy(true)`/`finally setBusy(false)`
so the button holds its loading state through the server round-trip. A failed
grant is logged and surfaced with an info toast; the optimistic unlock from
`payAt` still holds, so a paying user is never denied access (RTDN and the next
cloud refresh reconcile).

## Step 5 — No hardcoded user-facing prices (PLAY-002)

`src/lib/payments/usePlayPrices.js`: the resolver now returns the store's
localised price or `null`, never the hardcoded catalogue text. Updated every
consumer to render a price-free loading state ("Subscribe" / "Get Pro" / a short
placeholder) until Google Play responds:

- `src/screens/ProUpgradeScreen.js` (trial copy + period chips)
- `src/screens/WelcomeScreen.js` (switched from `priceTextFor` to the live hook)
- `src/screens/PaywallScreen.js` (CTA, Play disclosure, chips)
- `src/screens/SubscriptionScreen.js` (price card)
- `src/screens/CascadeGateScreen.js` (period chips)
- `src/components/DifferentialBadge.js` (buy CTA; dropped the `priceTextFor` fallback)
- `src/components/TierComparisonStrip.js` (Pro column)
- `src/screens/CoachOutputScreen.js` (now passes the live price to the badge,
  was `pricingPriceText={null}` which always forced the hardcoded fallback)

Supporting comment fixes: `src/lib/payments/playBilling.js`,
`src/lib/payments/catalogue.js`, `src/lib/differentialPaywall.js`,
`src/__tests__/tier-screens-mount.test.js`.

Test: `src/lib/payments/__tests__/usePlayPrices.test.js` (new) — returns the
store price or null, never the catalogue text.

## Step 6 — Paid-entitlement offline grace (SUB-002)

`src/store/useAppStore.js`: added `PAID_VERIFIED_AT_KEY` and helpers
`markPaidEntitlementVerified`, `readPaidEntitlementVerifiedAt`,
`lockStalePaidEntitlement` (local-only downgrade). The timestamp is seeded in
`setOptimisticPaid` and on a `paid_pro` server read in `refreshTierFromCloud`.

`src/lib/payments/cascade.js` (`reconcilePaidEntitlement`): named constant
`PAID_ENTITLEMENT_OFFLINE_GRACE_MS = 24h`. A `paid_pro` device that cannot
reconfirm its entitlement (no real provider, or a failing Play read) past the
grace window now locks down **locally** to free; the next online
`refreshTierFromCloud` restores Pro if the sub is genuinely active, so a false
lockdown self-heals. A confirmed-active read refreshes the clock. Documented as
defence in depth, not a substitute for RTDN.

Test: `src/lib/payments/__tests__/cascade.reconcile.test.js` — added the grace
cases (within-grace defers, past-grace locks down, no-anchor never locks).

## Step 7 — Stale trial comments (BUG-002)

`src/lib/payments/cascade.js`: the reminder-scheduling comment in
`startCascade` and the `autoDowngrade` comment no longer reference the retired
"day 19 / day 21" schedule; they state the 14-day in-app trial and the separate
7-day Play intro phase.

## Step 8 — RTDN OIDC fails closed (BUG-003)

`supabase/functions/play-billing-rtdn/index.ts`:

- Added `RTDN_ALLOW_UNAUTHENTICATED_SETUP` (setup-only escape hatch).
- `verifyPubSubOidc`: an unset `RTDN_OIDC_AUDIENCE` now **fails closed**
  (returns `{ ok:false, reason:'oidc_unconfigured' }`, which the RTDN path turns
  into 401) unless `RTDN_ALLOW_UNAUTHENTICATED_SETUP=true`. Client purchase
  verification is unaffected (it is authenticated by the Play Developer API).
- Added a startup log that makes the OIDC posture obvious at boot.

Test: `src/lib/__tests__/rtdnWebhook.contract.test.js` — fail-closed + setup-mode
+ startup-warning assertions.

## Step 9 — Production console.* routed through the log layer (CODE-001)

Replaced every `console.log/warn/error` in production code paths with
`logInfo`/`logWarn`/`logError` from `src/lib/errorLog`. Files changed:

- `src/navigation/RootNavigator.js` (bootstrap, via a lazy-require `_bootLog` helper)
- `src/screens/HomeScreen.js`, `ExerciseDetailScreen.js`, `LiftProgressScreen.js`,
  `MesocycleBuilderScreen.js`, `WeeklyCheckInScreen.js`, `CoachOutputScreen.js`
- `src/lib/seedRoutines.js`, `seedExercises.js`, `sync.js`,
  `notifications/scheduler.js`, `database.js`, `telemetry/transport.js`

`src/lib/errorLog.js` keeps its console sink (that is where the log funnels to).
Test files are out of scope. Updated the `transport` unknown-event assertion for
the richer `logWarn` message. Verified no remaining production `console.*` calls.

## Step 10 — Copy (COPY-001 / COPY-002 / COPY-004)

- COPY-001 `public/app-map/index.html`: MEV → "minimum effective sets", MRV →
  "maximum sets before recovery drops", "Mesocycle" → "training block", "deload"
  → "lighter recovery week" (all four flagged lines, confirmed no others remain).
- COPY-002 `src/screens/ProUpgradeScreen.js`: the Precision Coaching credential
  line now reads "built from training research, your recovery, your food, and
  your progress" instead of "volume landmarks, autoregulation, and RED-S safety
  limits".
- COPY-004 `src/lib/payments/catalogue.js`: header comment states SKU IDs are the
  source of truth in code and user-facing prices always come from Play Billing.

Verified: `jargonBlocklist` test passes; lint clean.

## Step 11 — Release gate (IMP-001)

- `package.json`: added `release:check` =
  `npm ci --legacy-peer-deps --ignore-scripts && npx tsc --noEmit --strict &&
  npm run lint && npm test -- --runInBand && npm audit --production --audit-level=high`.
- `.github/workflows/build-android.yml`: added a "Release gate (release:check)"
  step before the AAB artifact upload, so a build that fails the checks never
  produces an uploadable Play bundle.

Note: `npm audit --production --audit-level=high` currently exits non-zero on the
known Expo build-chain high advisories (build-host only). Clearing or formally
excepting those is a manual action (see DOCUMENT B), otherwise the gate reports
them.

## Step 12 — Periodic sync guards (PERF-001)

`App.js`: the 15-minute sync interval already had its `clearInterval` cleanup in
the same effect's return (confirmed). Added caller-side guards in `callSyncAll`
so it skips when (1) a sync is already in flight (`syncInFlight` flag), (2) no
user is signed in (kept), and (3) NetInfo reports the device offline (falls
through when NetInfo is unavailable rather than blocking).

## Step 13 — Final checks (after counts)

| Check | Baseline | After |
|---|---|---|
| `tsc --noEmit --strict` | 0 errors | 0 errors |
| project `tsc --noEmit` | 0 errors | 0 errors |
| `eslint .` | 0 errors / 4 warnings | 0 errors / 4 warnings |
| `npm test -- --runInBand` | 187 suites, 3042 passed / 3 skipped | 188 suites, 3052 passed / 3 skipped, 0 fail |
| `npm audit --production` | 18 (14 moderate, 4 high) | 18 (14 moderate, 4 high) |

Test count rose by 1 suite / 10 tests from the new coverage (usePlayPrices,
reconcile grace cases, RTDN contract additions). No regressions.

The 4 high / 14 moderate audit findings are unchanged: they are Expo build-chain
advisories (`@xmldom/xmldom`, `postcss`, `uuid`), build-host only, not shipped
runtime. They are tracked in DOCUMENT B.
