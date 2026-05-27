#!/usr/bin/env node
/**
 * Verify the live-cloud E2E test project setup.
 *
 * Run after the dashboard steps in supabase/README.md §
 * Live-cloud E2E test project. Confirms in order:
 *
 *   1. All four SUPABASE_TEST_* env vars are set
 *   2. The anon key + URL resolve to a live project
 *   3. The test user can sign in (email confirmation disabled,
 *      password correct)
 *   4. Migration 047 columns exist on the test project (proxy
 *      for "every migration up to 047 was applied"). If the
 *      column probe returns PGRST204, the bootstrap bundle
 *      hasn't been run yet against this project.
 *   5. The test user can INSERT + DELETE a row in
 *      weekly_checkins_v2 (RLS lets the test write its own
 *      data, which is what T7/T8 need).
 *
 * Exits 0 on success, prints a numbered checklist of what's
 * working and what isn't. Exits 1 on any failure with a single
 * line pointing at the failing step.
 *
 * Usage:
 *   export SUPABASE_TEST_URL=https://xxx.supabase.co
 *   export SUPABASE_TEST_ANON_KEY=eyJ...
 *   export SUPABASE_TEST_USER_EMAIL=e2e+volyume@example.com
 *   export SUPABASE_TEST_USER_PASSWORD='...'
 *   node scripts/verify-e2e-setup.js
 *
 * Safe to re-run. Inserts a per-run tagged row and deletes it
 * before exit; failed runs leave at most one orphan row that the
 * next run will not see (different tag) but is harmless on a
 * throwaway project.
 */

/* eslint-disable no-console */

async function main() {
  const url = process.env.SUPABASE_TEST_URL;
  const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
  const email = process.env.SUPABASE_TEST_USER_EMAIL;
  const password = process.env.SUPABASE_TEST_USER_PASSWORD;

  console.log('Verifying live-cloud E2E test project setup\n');

  // Step 1 — env vars
  const missing = [
    !url && 'SUPABASE_TEST_URL',
    !anonKey && 'SUPABASE_TEST_ANON_KEY',
    !email && 'SUPABASE_TEST_USER_EMAIL',
    !password && 'SUPABASE_TEST_USER_PASSWORD',
  ].filter(Boolean);
  if (missing.length) {
    console.log(`[1/5] env vars        FAIL  (missing: ${missing.join(', ')})`);
    console.log('\nSet the four SUPABASE_TEST_* env vars and re-run.');
    process.exit(1);
  }
  console.log('[1/5] env vars        OK    (all four present)');

  // Step 2 — client builds
  let createClient;
  try {
    ({ createClient } = require('@supabase/supabase-js'));
  } catch (e) {
    console.log('[2/5] client import   FAIL  (@supabase/supabase-js missing)');
    console.log('\nRun `npm ci` and try again.');
    process.exit(1);
  }
  const sb = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  console.log('[2/5] client built    OK');

  // Step 3 — sign in
  const { data: signInData, error: signInError } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signInData?.user) {
    console.log(`[3/5] sign-in         FAIL  (${signInError?.message ?? 'no user returned'})`);
    if (/email not confirmed/i.test(signInError?.message ?? '')) {
      console.log('\nThe test user account exists but email confirmation is on.');
      console.log('Dashboard -> Authentication -> Providers -> Email -> turn');
      console.log('off "Confirm email", then re-create the user (or manually');
      console.log('confirm the user via Authentication -> Users -> the user');
      console.log('-> "..." menu -> Confirm email).');
    } else if (/invalid login credentials/i.test(signInError?.message ?? '')) {
      console.log('\nEmail / password did not match. Recheck the test user');
      console.log('account in Authentication -> Users.');
    }
    process.exit(1);
  }
  const userId = signInData.user.id;
  console.log(`[3/5] sign-in         OK    (user ${userId.slice(0, 8)}...)`);

  // Step 4 — migration 047 probe (updated_at column on weekly_checkins_v2)
  const probe = await sb
    .from('weekly_checkins_v2')
    .select('updated_at')
    .eq('user_id', userId)
    .limit(1);
  if (probe.error) {
    const msg = probe.error.message ?? '';
    if (/PGRST20[45]/i.test(msg) || /column .* does not exist/i.test(msg)) {
      console.log(`[4/5] migration 047   FAIL  (${msg})`);
      console.log('\nThe weekly_checkins_v2.updated_at column is missing.');
      console.log('Run supabase/test_project_bootstrap.sql against the test');
      console.log('project once, then re-run this script.');
    } else {
      console.log(`[4/5] migration 047   FAIL  (${msg})`);
    }
    process.exit(1);
  }
  console.log('[4/5] migration 047   OK    (weekly_checkins_v2.updated_at present)');

  // Step 5 — round-trip insert + delete under RLS
  const probeId = `e2e-verify-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const ins = await sb
    .from('weekly_checkins_v2')
    .insert({
      id: probeId,
      user_id: userId,
      week_start: 1717200000000,
      updated_at: nowIso,
    });
  if (ins.error) {
    console.log(`[5/5] RLS write       FAIL  (${ins.error.message})`);
    console.log('\nRLS policy is rejecting the test user\'s write. Confirm');
    console.log('weekly_checkins_v2 has the "Users can manage own v2');
    console.log('checkins" FOR ALL policy from migration 007. The bootstrap');
    console.log('bundle includes it; re-run if you skipped that section.');
    process.exit(1);
  }
  const del = await sb.from('weekly_checkins_v2').delete().eq('id', probeId);
  if (del.error) {
    console.log(`[5/5] RLS write       PARTIAL (insert OK, delete failed: ${del.error.message})`);
    console.log('\nLeaving orphan row id=' + probeId + '. Safe to delete manually.');
    process.exit(1);
  }
  console.log('[5/5] RLS write       OK    (insert + delete round-trip)');

  await sb.auth.signOut().catch(() => {});
  console.log('\nAll checks passed. The next CI run (or local `npx jest');
  console.log('src/lib/sync/__tests__/sync.e2e.liveCloud.test.js`) will');
  console.log('execute T7 + T8 against this test project.');
}

main().catch((e) => {
  console.error('\nUnhandled error during verification:');
  console.error(e);
  process.exit(1);
});
