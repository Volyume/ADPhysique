/**
 * Live-cloud sync E2E (T7 + T8) — INTENTIONALLY DEFERRED.
 *
 * TESTING_STRATEGY_LOCKED.md lines 144-160 spec eight scenarios
 * per registry table. The pure-Jest matrix at
 * sync.regressionMatrix.test.js covers T1-T6 (50 assertions across
 * every registry table) against a mocked Supabase client.
 *
 * T7 (two-device propagation: device A pushes, device B foregrounds
 * within seconds, the row appears) and T8 (offline collision: both
 * devices insert offline, both reconnect, both rows present on
 * both) were originally tracked as "deferred pending live-cloud
 * test project" and a throwaway Supabase project + bootstrap SQL
 * + CI secrets infrastructure was built for them.
 *
 * Founder decision 2026-05-27: deferred indefinitely on product-
 * scope grounds, not infrastructure grounds.
 *
 *   - Volyume is Android-only, single-device. Nobody carries a
 *     tablet to the gym alongside their phone; the "two simultaneous
 *     active devices" scenario T7/T8 tests doesn't reflect any
 *     realistic user.
 *   - The only realistic cross-device path is sign-out on one
 *     handset, sign-in on another (phone upgrade / re-install).
 *     That's been manually tested dozens of times on real devices
 *     this session and prior — far better coverage than an
 *     automated cloud round trip would give.
 *   - The matrix already proves push/pull payload shape against
 *     a mocked cloud, and supabase/audit_cloud_schema_drift.sql
 *     catches client-vs-cloud column drift. Together these cover
 *     the failure modes T7/T8 would catch in a multi-device app.
 *
 * The supporting infrastructure stays in the repo for re-enable
 * later if Volyume ever ships a tablet companion or web app:
 *   - supabase/test_project_bootstrap.sql (consolidated migrations)
 *   - supabase/audit_cloud_schema_drift.sql (schema audit)
 *   - .github/workflows/main-ci.yml (SUPABASE_TEST_* env-block
 *     routing + the auto-post Jest failure comment step that is
 *     genuinely useful for any future Jest failure, not just E2E)
 *   - scripts/verify-e2e-setup.js (five-step probe)
 *
 * To re-enable: replace the single skipped test below with the
 * full suite. The previous full implementation is recoverable
 * from git history (see commits 26014e4, 1c674b7, ffb6c93).
 */

describe('sync E2E (T7 + T8) — live cloud', () => {
  test.skip(
    'deferred indefinitely: Android-only single-device product. '
    + 'See file header for rationale + restore path.',
    () => {},
  );
});
