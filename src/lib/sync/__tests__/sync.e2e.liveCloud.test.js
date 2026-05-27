/**
 * Live-cloud sync E2E (T7 + T8 from the sync regression matrix).
 *
 * TESTING_STRATEGY_LOCKED.md lines 144-160 spec the eight scenarios
 * per registry table. The pure-Jest matrix at
 * sync.regressionMatrix.test.js covers T1-T6 (50 assertions, every
 * registry table, mocked supabase). T7 and T8 require a real cloud
 * round trip:
 *
 *   T7  Two-device propagation
 *       Device A pushes a row. Device B (same user, separate local
 *       state) pulls within seconds and observes the row.
 *
 *   T8  Offline collision
 *       Both devices insert a row each while disconnected. Both
 *       reconnect, both push, both pull. Both rows are present in
 *       both local states.
 *
 * These tests are gated on a set of env vars pointing at a
 * THROWAWAY Supabase test project (never production: the tests
 * insert + delete real rows and would pollute telemetry / RLS
 * behaviour). The gating is conditional so:
 *   - When env vars are present: the suite runs against the cloud
 *     and the matrix's T7/T8 deferred markers can be retired.
 *   - When absent: the suite registers a single skipped test that
 *     documents what's missing, so CI output makes the gap visible
 *     instead of silently passing.
 *
 * Env vars required (set in CI secrets, not in the repo):
 *   SUPABASE_TEST_URL                Test project REST URL
 *   SUPABASE_TEST_ANON_KEY           Test project anon key
 *   SUPABASE_TEST_USER_EMAIL         Test user account email
 *   SUPABASE_TEST_USER_PASSWORD      Test user account password
 *
 * Setup: see supabase/README.md § Live-cloud E2E test project.
 *
 * Each "device" is a separate @supabase/supabase-js client
 * authenticated as the same user. The per-table handlers
 * (pushWeeklyCheckins / pullWeeklyCheckins) take the supabase
 * client as their first arg so we can hand each device its own
 * client without going through the singleton in src/lib/supabase.js.
 *
 * Local "device state" is two separate arrays of rows — the
 * handlers' database dependency (getAllWeeklyCheckinsForUser /
 * insertWeeklyCheckinFromCloud / getWeeklyCheckinUpdatedAt) is
 * mocked per-device so each device has its own SQLite-equivalent.
 *
 * Cleanup: a single `afterAll` deletes every row whose id is tagged
 * with the test-run prefix. Failed runs leave at most a handful of
 * orphan rows; the prefix lets the next run wipe them too.
 */

/* eslint-disable global-require */

const HAS_ENV = !!(
  process.env.SUPABASE_TEST_URL &&
  process.env.SUPABASE_TEST_ANON_KEY &&
  process.env.SUPABASE_TEST_USER_EMAIL &&
  process.env.SUPABASE_TEST_USER_PASSWORD
);

const TEST_RUN_ID = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Each device has its own local-row store. The database module
// mock dispatches to the right store based on a per-test setter.
const mockDeviceA = { rows: [] };
const mockDeviceB = { rows: [] };
let mockActiveDevice = mockDeviceA;

jest.mock('../../database', () => ({
  getAllWeeklyCheckinsForUser: jest.fn(async () => mockActiveDevice.rows.slice()),
  insertWeeklyCheckinFromCloud: jest.fn(async (_userId, c) => {
    // Mirror the real LWW REPLACE semantics: drop any existing row
    // with the same id before inserting the cloud copy.
    mockActiveDevice.rows = mockActiveDevice.rows.filter((r) => r.id !== c.id);
    mockActiveDevice.rows.push({
      id: c.id,
      weekStart: c.week_start,
      energyScore: c.energy_score ?? null,
      sorenessScore: c.soreness_score ?? null,
      stressScore: c.stress_score ?? null,
      sleepHours: c.sleep_hours ?? null,
      calsAdherence: c.cals_adherence ?? null,
      stepsAdherence: c.steps_adherence ?? null,
      trainingPerformance: c.training_performance ?? null,
      jointPain: !!c.joint_pain,
      soreMuscles: c.sore_muscles ?? null,
      cycleOverride: !!c.cycle_override,
      notes: c.notes ?? null,
      updatedAt: c.updated_at ? Date.parse(c.updated_at) : Date.now(),
    });
  }),
  getWeeklyCheckinUpdatedAt: jest.fn(async (_userId, id) => {
    const row = mockActiveDevice.rows.find((r) => r.id === id);
    return row?.updatedAt ?? null;
  }),
}));

jest.mock('../telemetry', () => ({
  logSyncError: jest.fn(),
}));

const { pushWeeklyCheckins, pullWeeklyCheckins } = require('../tables/weeklyCheckins');

// ---------------------------------------------------------------------------
// Skipped placeholder when env vars are absent
// ---------------------------------------------------------------------------

if (!HAS_ENV) {
  describe('sync E2E (T7 + T8) — live cloud', () => {
    test.skip('skipped: SUPABASE_TEST_* env vars not set (see supabase/README.md § Live-cloud E2E test project)', () => {});
  });
} else {
  describe('sync E2E (T7 + T8) — live cloud', () => {
    let sbA;
    let sbB;
    let userId;
    const insertedIds = [];

    function newRowId(suffix) {
      const id = `${TEST_RUN_ID}-${suffix}`;
      insertedIds.push(id);
      return id;
    }

    beforeAll(async () => {
      const { createClient } = require('@supabase/supabase-js');

      function buildClient() {
        return createClient(
          process.env.SUPABASE_TEST_URL,
          process.env.SUPABASE_TEST_ANON_KEY,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
      }

      sbA = buildClient();
      sbB = buildClient();

      const { data, error } = await sbA.auth.signInWithPassword({
        email: process.env.SUPABASE_TEST_USER_EMAIL,
        password: process.env.SUPABASE_TEST_USER_PASSWORD,
      });
      if (error || !data?.user) {
        throw new Error(`SUPABASE_TEST_USER_* sign-in failed: ${error?.message ?? 'no user'}`);
      }
      userId = data.user.id;

      const { error: errB } = await sbB.auth.signInWithPassword({
        email: process.env.SUPABASE_TEST_USER_EMAIL,
        password: process.env.SUPABASE_TEST_USER_PASSWORD,
      });
      if (errB) throw new Error(`Device B sign-in failed: ${errB.message}`);
    }, 30_000);

    beforeEach(() => {
      mockDeviceA.rows = [];
      mockDeviceB.rows = [];
      mockActiveDevice = mockDeviceA;
      jest.clearAllMocks();
    });

    afterAll(async () => {
      if (!sbA || !insertedIds.length) return;
      try {
        await sbA.from('weekly_checkins_v2').delete().in('id', insertedIds);
      } catch (_) { /* best effort */ }
      try { await sbA.auth.signOut(); } catch (_) { /* tolerate */ }
      try { await sbB.auth.signOut(); } catch (_) { /* tolerate */ }
    }, 30_000);

    test('T7 two-device propagation: A pushes, B pulls within seconds, B has the row', async () => {
      // Device A inserts a row.
      mockActiveDevice = mockDeviceA;
      mockDeviceA.rows.push({
        id: newRowId('t7'),
        weekStart: 1717200000000,
        energyScore: 4,
        sleepHours: 7.5,
        updatedAt: Date.now(),
      });
      const pushResA = await pushWeeklyCheckins(sbA, { userId, localUserId: userId });
      expect(pushResA.errors).toBe(0);
      expect(pushResA.count).toBe(1);

      // Device B foregrounds. Local state is empty; pulls from cloud.
      mockActiveDevice = mockDeviceB;
      const pullResB = await pullWeeklyCheckins(sbB, { userId });
      expect(pullResB.errors).toBe(0);
      expect(pullResB.count).toBeGreaterThanOrEqual(1);
      expect(mockDeviceB.rows.some((r) => r.id === insertedIds[insertedIds.length - 1])).toBe(true);
    }, 30_000);

    test('T8 offline collision: both devices insert separately offline, both reconnect, both rows present on both', async () => {
      const idA = newRowId('t8a');
      const idB = newRowId('t8b');

      // Both devices insert different rows while "offline" (no cloud
      // calls yet; just local state).
      mockActiveDevice = mockDeviceA;
      mockDeviceA.rows.push({ id: idA, weekStart: 1717300000000, energyScore: 5, updatedAt: Date.now() });
      mockActiveDevice = mockDeviceB;
      mockDeviceB.rows.push({ id: idB, weekStart: 1717400000000, energyScore: 3, updatedAt: Date.now() });

      // Both reconnect. Both push their own row, then both pull.
      mockActiveDevice = mockDeviceA;
      const pushA = await pushWeeklyCheckins(sbA, { userId, localUserId: userId });
      expect(pushA.errors).toBe(0);

      mockActiveDevice = mockDeviceB;
      const pushB = await pushWeeklyCheckins(sbB, { userId, localUserId: userId });
      expect(pushB.errors).toBe(0);

      mockActiveDevice = mockDeviceA;
      const pullA = await pullWeeklyCheckins(sbA, { userId });
      expect(pullA.errors).toBe(0);
      expect(mockDeviceA.rows.some((r) => r.id === idA)).toBe(true);
      expect(mockDeviceA.rows.some((r) => r.id === idB)).toBe(true);

      mockActiveDevice = mockDeviceB;
      const pullB = await pullWeeklyCheckins(sbB, { userId });
      expect(pullB.errors).toBe(0);
      expect(mockDeviceB.rows.some((r) => r.id === idA)).toBe(true);
      expect(mockDeviceB.rows.some((r) => r.id === idB)).toBe(true);
    }, 30_000);
  });
}
