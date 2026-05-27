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
 * Tables covered:
 *   - weekly_checkins_v2     (LWW, no soft-delete)
 *   - body_composition_log   (LWW, soft-delete via deleted_at)
 *   - recipe_ingredients     (LWW, soft-delete via deleted_at)
 *
 * For soft-delete tables a T7-tombstone variant also runs: A pushes
 * a row, B pulls, A then soft-deletes + pushes the tombstone, B
 * pulls again, the tombstone lands on B with deleted_at set.
 *
 * Other registry tables are deliberately out of scope here:
 *   - profiles                (merge strategy, store-driven push)
 *   - food domain coordinator (bulk RPC architecture)
 *   - nutrition_targets       (single-row-per-user)
 *   - notification_preferences (composite PK + server-side LWW)
 * Each merits its own E2E coverage; tracked as a follow-up in
 * CURRENT_STATUS § 8 LATER.
 *
 * Live as of 2026-05-27: the `volyume-e2e-test` Supabase project,
 * the test user, the bootstrap SQL, and the four GitHub Actions
 * secrets are all in place. CI exercises this suite end-to-end on
 * every run that touches a non-`paths-ignore`d file.
 *
 * These tests are gated on a set of env vars pointing at a
 * THROWAWAY Supabase test project (never production: the tests
 * insert + delete real rows and would pollute telemetry / RLS
 * behaviour). When the env vars are absent the suite registers a
 * single visible skipped test that points at the setup section, so
 * the gap stays surfaced in CI output instead of silently passing.
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
 * authenticated as the same user. The per-table handlers take the
 * supabase client as their first arg so each device gets its own
 * without going through the singleton in src/lib/supabase.js.
 *
 * Local "device state" is two arrays of rows per table — the
 * database module's helpers (getAll* / insert*FromCloud / get*UpdatedAt)
 * are mocked per-device so each device has its own SQLite-equivalent.
 * The active device is switched by assigning mockActiveDevice between
 * push/pull calls inside a single test.
 *
 * Cleanup: a single `afterAll` deletes every row whose id is tagged
 * with the test-run prefix from all three test tables. Failed runs
 * leave at most a handful of orphan rows; the prefix lets the next
 * run wipe them too.
 */

/* eslint-disable global-require */

const HAS_ENV = !!(
  process.env.SUPABASE_TEST_URL &&
  process.env.SUPABASE_TEST_ANON_KEY &&
  process.env.SUPABASE_TEST_USER_EMAIL &&
  process.env.SUPABASE_TEST_USER_PASSWORD
);

const TEST_RUN_ID = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// body_metrics.id and recipe_ingredients.id are UUID columns
// (cloud schema), while weekly_checkins_v2.id is TEXT. We can use
// a readable per-run prefix only on the TEXT table; UUID tables
// have to use a real UUID format or Postgres rejects the insert
// with "invalid input syntax for type uuid". Tracking per-table
// in insertedByTable still lets afterAll clean up by id.
const { randomUUID } = require('crypto');
const UUID_TABLES = new Set(['body_metrics', 'recipe_ingredients']);

// Per-table per-device row stores. mockActiveDevice toggles which
// side of each pair the next helper call reads / writes.
const mockState = {
  weekly_checkins: { A: [], B: [] },
  body_metric: { A: [], B: [] },
  recipe_ingredients: { A: [], B: [] },
};
let mockActiveDevice = 'A';

jest.mock('../../database', () => ({
  // ─── weekly_checkins_v2 ─────────────────────────────────────────
  getAllWeeklyCheckinsForUser: jest.fn(async () => mockState.weekly_checkins[mockActiveDevice].slice()),
  insertWeeklyCheckinFromCloud: jest.fn(async (_userId, c) => {
    const list = mockState.weekly_checkins[mockActiveDevice];
    const next = list.filter((r) => r.id !== c.id);
    next.push({
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
    mockState.weekly_checkins[mockActiveDevice] = next;
  }),
  getWeeklyCheckinUpdatedAt: jest.fn(async (_userId, id) => {
    const row = mockState.weekly_checkins[mockActiveDevice].find((r) => r.id === id);
    return row?.updatedAt ?? null;
  }),

  // ─── body_metric_log ─────────────────────────────────────────────
  // getBodyMetricLog returns camelCase via rowToCamel in real
  // database.js; mirror that.
  getBodyMetricLog: jest.fn(async () => mockState.body_metric[mockActiveDevice].slice()),
  insertBodyMetricFromCloud: jest.fn(async (_userId, m) => {
    const list = mockState.body_metric[mockActiveDevice];
    const next = list.filter((r) => r.id !== m.id);
    // dateToMs at midnight UTC, matches the real helper.
    const dateToMs = (s) => {
      if (s == null) return null;
      if (typeof s === 'number') return s;
      const ms = new Date(`${s}T00:00:00Z`).getTime();
      return Number.isFinite(ms) ? ms : null;
    };
    const tsToMs = (v) => v == null ? null : (typeof v === 'string' ? new Date(v).getTime() : v);
    next.push({
      id: m.id,
      loggedAt: dateToMs(m.metric_date) ?? tsToMs(m.logged_at),
      weightKg: m.body_weight ?? null,
      waistCm: m.waist ?? null,
      chestCm: m.chest ?? null,
      hipsCm: m.hips ?? null,
      thighCm: m.quads ?? null,
      armCm: m.arms ?? null,
      shouldersCm: m.shoulders ?? null,
      forearmCm: m.forearms ?? null,
      hamCm: m.hamstrings ?? null,
      calfCm: m.calves ?? null,
      bodyFatPercent: m.body_fat_percent ?? null,
      bodyFatSource: m.body_fat_source ?? null,
      notes: m.notes ?? null,
      updatedAt: tsToMs(m.updated_at) ?? Date.now(),
      deletedAt: m.deleted_at ? tsToMs(m.deleted_at) : null,
    });
    mockState.body_metric[mockActiveDevice] = next;
  }),
  getBodyMetricUpdatedAt: jest.fn(async (_userId, id) => {
    const row = mockState.body_metric[mockActiveDevice].find((r) => r.id === id);
    return row?.updatedAt ?? null;
  }),

  // ─── recipe_ingredients ─────────────────────────────────────────
  getAllRecipeIngredientsForUser: jest.fn(async () => mockState.recipe_ingredients[mockActiveDevice].slice()),
  upsertRecipeIngredientFromCloud: jest.fn(async (_userId, row) => {
    const list = mockState.recipe_ingredients[mockActiveDevice];
    const next = list.filter((r) => r.id !== row.id);
    const tsToMs = (v) => v == null ? null : (typeof v === 'string' ? new Date(v).getTime() : v);
    next.push({
      id: row.id,
      recipeId: row.recipe_id,
      foodRef: row.food_ref,
      quantityG: Number(row.quantity_g) || 0,
      orderIndex: Number(row.order_index) || 0,
      createdAt: tsToMs(row.created_at) ?? Date.now(),
      updatedAt: tsToMs(row.updated_at) ?? Date.now(),
      deletedAt: row.deleted_at ? tsToMs(row.deleted_at) : null,
    });
    mockState.recipe_ingredients[mockActiveDevice] = next;
  }),
  getRecipeIngredientUpdatedAt: jest.fn(async (_userId, id) => {
    const row = mockState.recipe_ingredients[mockActiveDevice].find((r) => r.id === id);
    return row?.updatedAt ?? null;
  }),
}));

// Surface the underlying Supabase error on console so the
// auto-posted PR-comment diagnostic sees WHY a push errored
// (the handler swallows the error into `errors: 1` otherwise).
jest.mock('../telemetry', () => ({
  logSyncError: jest.fn((scope, err) => {
    const msg = err?.message ?? String(err);
    const code = err?.code ?? '';
    const details = err?.details ?? '';
    const hint = err?.hint ?? '';

    console.error(
      `[logSyncError ${scope}] code=${code} msg=${msg}` +
      (details ? ` details=${details}` : '') +
      (hint ? ` hint=${hint}` : ''),
    );
  }),
}));

const { pushWeeklyCheckins, pullWeeklyCheckins } = require('../tables/weeklyCheckins');
const { pushBodyComposition, pullBodyComposition } = require('../tables/bodyComposition');
const { pushRecipeIngredients, pullRecipeIngredients } = require('../tables/recipeIngredients');

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
    const insertedByTable = {
      weekly_checkins_v2: [],
      body_metrics: [],
      recipe_ingredients: [],
    };

    function newRowId(table, suffix) {
      const id = UUID_TABLES.has(table)
        ? randomUUID()
        : `${TEST_RUN_ID}-${suffix}`;
      insertedByTable[table].push(id);
      return id;
    }

    // Parent recipe row for the recipe_ingredients tests.
    // recipe_ingredients.recipe_id is a UUID FK to recipes(id)
    // with ON DELETE CASCADE, so we create one parent in
    // beforeAll, share it across all recipe_ingredients tests,
    // and the cleanup of the parent in afterAll wipes any
    // ingredient rows the test inserts as a side effect.
    let testRecipeId = null;

    beforeAll(async () => {
      const { createClient } = require('@supabase/supabase-js');
      // Supabase JS v2 initialises a RealtimeClient eagerly in the
      // SupabaseClient constructor; on Node < 22 there's no native
      // WebSocket so the constructor throws. `ws` is a transitive
      // dep in node_modules (8.x); pass it explicitly. The tests
      // never actually open a realtime channel — this is purely to
      // unblock construction.
      // eslint-disable-next-line global-require
      const ws = require('ws');

      function buildClient() {
        return createClient(
          process.env.SUPABASE_TEST_URL,
          process.env.SUPABASE_TEST_ANON_KEY,
          {
            auth: { persistSession: false, autoRefreshToken: false },
            realtime: { transport: ws },
          },
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

      // Seed the parent recipe for the recipe_ingredients tests.
      // ON DELETE CASCADE in migration 015 means deleting this row
      // in afterAll also wipes any ingredient rows the tests
      // inserted.
      testRecipeId = randomUUID();
      const seed = await sbA.from('recipes').insert({
        id: testRecipeId,
        user_id: userId,
        name: `e2e-${TEST_RUN_ID}-recipe`,
        total_servings: 1,
      });
      if (seed.error) {
        throw new Error(`Could not seed parent recipe: ${seed.error.message}`);
      }
    }, 30_000);

    beforeEach(() => {
      for (const t of Object.keys(mockState)) {
        mockState[t].A = [];
        mockState[t].B = [];
      }
      mockActiveDevice = 'A';
      jest.clearAllMocks();
    });

    afterAll(async () => {
      if (!sbA) return;
      for (const [table, ids] of Object.entries(insertedByTable)) {
        if (!ids.length) continue;
        try { await sbA.from(table).delete().in('id', ids); } catch (_) { /* best effort */ }
      }
      // Drop the parent recipe LAST. ON DELETE CASCADE then wipes
      // any ingredient rows the explicit delete above missed
      // (e.g. tombstoned-then-resurrected ids).
      if (testRecipeId) {
        try { await sbA.from('recipes').delete().eq('id', testRecipeId); } catch (_) { /* best effort */ }
      }
      try { await sbA.auth.signOut(); } catch (_) { /* tolerate */ }
      try { await sbB.auth.signOut(); } catch (_) { /* tolerate */ }
    }, 30_000);

    // ─── weekly_checkins_v2 ─────────────────────────────────────────

    describe('weekly_checkins_v2', () => {
      test('T7 two-device propagation: A pushes, B pulls within seconds, B has the row', async () => {
        mockActiveDevice = 'A';
        mockState.weekly_checkins.A.push({
          id: newRowId('weekly_checkins_v2', 'wc-t7'),
          weekStart: 1717200000000,
          energyScore: 4,
          sleepHours: 7.5,
          updatedAt: Date.now(),
        });
        const pushResA = await pushWeeklyCheckins(sbA, { userId, localUserId: userId });
        expect(pushResA.errors).toBe(0);
        expect(pushResA.count).toBe(1);

        mockActiveDevice = 'B';
        const pullResB = await pullWeeklyCheckins(sbB, { userId });
        expect(pullResB.errors).toBe(0);
        expect(pullResB.count).toBeGreaterThanOrEqual(1);
        const expectedId = insertedByTable.weekly_checkins_v2.at(-1);
        expect(mockState.weekly_checkins.B.some((r) => r.id === expectedId)).toBe(true);
      }, 30_000);

      test('T8 offline collision: both devices insert separately offline, both reconnect, both rows present on both', async () => {
        const idA = newRowId('weekly_checkins_v2', 'wc-t8a');
        const idB = newRowId('weekly_checkins_v2', 'wc-t8b');

        mockActiveDevice = 'A';
        mockState.weekly_checkins.A.push({ id: idA, weekStart: 1717300000000, energyScore: 5, updatedAt: Date.now() });
        mockActiveDevice = 'B';
        mockState.weekly_checkins.B.push({ id: idB, weekStart: 1717400000000, energyScore: 3, updatedAt: Date.now() });

        mockActiveDevice = 'A';
        expect((await pushWeeklyCheckins(sbA, { userId, localUserId: userId })).errors).toBe(0);
        mockActiveDevice = 'B';
        expect((await pushWeeklyCheckins(sbB, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'A';
        expect((await pullWeeklyCheckins(sbA, { userId })).errors).toBe(0);
        expect(mockState.weekly_checkins.A.some((r) => r.id === idA)).toBe(true);
        expect(mockState.weekly_checkins.A.some((r) => r.id === idB)).toBe(true);

        mockActiveDevice = 'B';
        expect((await pullWeeklyCheckins(sbB, { userId })).errors).toBe(0);
        expect(mockState.weekly_checkins.B.some((r) => r.id === idA)).toBe(true);
        expect(mockState.weekly_checkins.B.some((r) => r.id === idB)).toBe(true);
      }, 30_000);
    });

    // ─── body_composition_log (cloud table body_metrics) ────────────

    describe('body_composition_log', () => {
      test('T7 two-device propagation: A pushes a body metric, B pulls, B has the row', async () => {
        const id = newRowId('body_metrics', 'bm-t7');
        mockActiveDevice = 'A';
        mockState.body_metric.A.push({
          id,
          loggedAt: Date.UTC(2026, 0, 1),
          weightKg: 80,
          waistCm: 80,
          updatedAt: Date.now(),
        });
        expect((await pushBodyComposition(sbA, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'B';
        const pullB = await pullBodyComposition(sbB, { userId });
        expect(pullB.errors).toBe(0);
        const arrived = mockState.body_metric.B.find((r) => r.id === id);
        expect(arrived).toBeTruthy();
        expect(arrived.weightKg).toBe(80);
      }, 30_000);

      test('T7 soft-delete propagation: A pushes a row, B pulls, A tombstones + pushes, B pulls, B sees deleted_at', async () => {
        const id = newRowId('body_metrics', 'bm-t7-tomb');

        // Initial push (A creates the row).
        mockActiveDevice = 'A';
        mockState.body_metric.A.push({
          id,
          loggedAt: Date.UTC(2026, 1, 1),
          weightKg: 81,
          updatedAt: Date.now(),
        });
        expect((await pushBodyComposition(sbA, { userId, localUserId: userId })).errors).toBe(0);

        // B pulls and observes the row alive.
        mockActiveDevice = 'B';
        await pullBodyComposition(sbB, { userId });
        expect(mockState.body_metric.B.find((r) => r.id === id)?.deletedAt).toBeNull();

        // A tombstones the row and pushes again with a later updated_at.
        mockActiveDevice = 'A';
        const aRow = mockState.body_metric.A.find((r) => r.id === id);
        aRow.deletedAt = Date.now();
        aRow.updatedAt = Date.now();
        expect((await pushBodyComposition(sbA, { userId, localUserId: userId })).errors).toBe(0);

        // B pulls again. LWW gate must allow the cloud row (newer
        // updated_at) to replace local; deleted_at lands on B.
        mockActiveDevice = 'B';
        await pullBodyComposition(sbB, { userId });
        const tomb = mockState.body_metric.B.find((r) => r.id === id);
        expect(tomb).toBeTruthy();
        expect(tomb.deletedAt).toBeTruthy();
      }, 30_000);

      test('T8 offline collision: both devices insert separately offline, both reconnect, both rows present on both', async () => {
        const idA = newRowId('body_metrics', 'bm-t8a');
        const idB = newRowId('body_metrics', 'bm-t8b');

        mockActiveDevice = 'A';
        mockState.body_metric.A.push({ id: idA, loggedAt: Date.UTC(2026, 2, 1), weightKg: 82, updatedAt: Date.now() });
        mockActiveDevice = 'B';
        mockState.body_metric.B.push({ id: idB, loggedAt: Date.UTC(2026, 2, 2), weightKg: 83, updatedAt: Date.now() });

        mockActiveDevice = 'A';
        expect((await pushBodyComposition(sbA, { userId, localUserId: userId })).errors).toBe(0);
        mockActiveDevice = 'B';
        expect((await pushBodyComposition(sbB, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'A';
        await pullBodyComposition(sbA, { userId });
        expect(mockState.body_metric.A.some((r) => r.id === idA)).toBe(true);
        expect(mockState.body_metric.A.some((r) => r.id === idB)).toBe(true);

        mockActiveDevice = 'B';
        await pullBodyComposition(sbB, { userId });
        expect(mockState.body_metric.B.some((r) => r.id === idA)).toBe(true);
        expect(mockState.body_metric.B.some((r) => r.id === idB)).toBe(true);
      }, 30_000);
    });

    // ─── recipe_ingredients ─────────────────────────────────────────

    describe('recipe_ingredients', () => {
      test('T7 two-device propagation: A pushes an ingredient, B pulls, B has the row', async () => {
        const id = newRowId('recipe_ingredients', 'ri-t7');
        mockActiveDevice = 'A';
        mockState.recipe_ingredients.A.push({
          id,
          recipeId: testRecipeId,
          foodRef: 'off:000',
          quantityG: 100,
          orderIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        });
        expect((await pushRecipeIngredients(sbA, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'B';
        const pullB = await pullRecipeIngredients(sbB, { userId });
        expect(pullB.errors).toBe(0);
        const arrived = mockState.recipe_ingredients.B.find((r) => r.id === id);
        expect(arrived).toBeTruthy();
        expect(arrived.foodRef).toBe('off:000');
      }, 30_000);

      test('T7 soft-delete propagation: A pushes, B pulls, A tombstones + pushes, B pulls, B sees deleted_at', async () => {
        const id = newRowId('recipe_ingredients', 'ri-t7-tomb');

        mockActiveDevice = 'A';
        mockState.recipe_ingredients.A.push({
          id,
          recipeId: testRecipeId,
          foodRef: 'off:001',
          quantityG: 50,
          orderIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        });
        expect((await pushRecipeIngredients(sbA, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'B';
        await pullRecipeIngredients(sbB, { userId });
        expect(mockState.recipe_ingredients.B.find((r) => r.id === id)?.deletedAt).toBeNull();

        mockActiveDevice = 'A';
        const aRow = mockState.recipe_ingredients.A.find((r) => r.id === id);
        aRow.deletedAt = Date.now();
        aRow.updatedAt = Date.now();
        expect((await pushRecipeIngredients(sbA, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'B';
        await pullRecipeIngredients(sbB, { userId });
        const tomb = mockState.recipe_ingredients.B.find((r) => r.id === id);
        expect(tomb).toBeTruthy();
        expect(tomb.deletedAt).toBeTruthy();
      }, 30_000);

      test('T8 offline collision: both devices insert separately offline, both reconnect, both rows present on both', async () => {
        const idA = newRowId('recipe_ingredients', 'ri-t8a');
        const idB = newRowId('recipe_ingredients', 'ri-t8b');

        mockActiveDevice = 'A';
        mockState.recipe_ingredients.A.push({
          id: idA,
          recipeId: testRecipeId,
          foodRef: 'off:00a',
          quantityG: 100,
          orderIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        });
        mockActiveDevice = 'B';
        mockState.recipe_ingredients.B.push({
          id: idB,
          recipeId: testRecipeId,
          foodRef: 'off:00b',
          quantityG: 200,
          orderIndex: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deletedAt: null,
        });

        mockActiveDevice = 'A';
        expect((await pushRecipeIngredients(sbA, { userId, localUserId: userId })).errors).toBe(0);
        mockActiveDevice = 'B';
        expect((await pushRecipeIngredients(sbB, { userId, localUserId: userId })).errors).toBe(0);

        mockActiveDevice = 'A';
        await pullRecipeIngredients(sbA, { userId });
        expect(mockState.recipe_ingredients.A.some((r) => r.id === idA)).toBe(true);
        expect(mockState.recipe_ingredients.A.some((r) => r.id === idB)).toBe(true);

        mockActiveDevice = 'B';
        await pullRecipeIngredients(sbB, { userId });
        expect(mockState.recipe_ingredients.B.some((r) => r.id === idA)).toBe(true);
        expect(mockState.recipe_ingredients.B.some((r) => r.id === idB)).toBe(true);
      }, 30_000);
    });
  });
}
