/**
 * campaign7.upgrade.test.js — Campaign 7 (release readiness) Phases 12 + 13:
 * the permanent CLEAN INSTALL and OLD -> CURRENT UPGRADE pins.
 *
 * Executable, not a document. Both halves drive the REAL local schema and the
 * REAL SCHEMA_MIGRATIONS pipeline (src/lib/database.js) against a real SQLite
 * (node:sqlite), using the same dbCrypto adapter mock as
 * src/__tests__/campaign6.reinstall.test.js, so nothing here is a string match
 * on migration source.
 *
 * PHASE 12 — clean install:
 *   - the REAL init path (_doInit: base schema + runMigrations) completes
 *   - PRAGMA user_version lands exactly on SCHEMA_MIGRATIONS.length (probed
 *     the same way migrations.cardioLog / database.bicepsSubregion do)
 *   - every table the coaching, nutrition, safety and sync layers read exists
 *
 * PHASE 13 — upgrade from an older install:
 *   An aged database is built from the REAL head schema captured out of the
 *   freshly-initialised database's sqlite_master, then stamped back to an
 *   older PRAGMA user_version and seeded with realistic rows. The whole
 *   migration pipeline is then replayed forward to head and the result is
 *   checked for DATA LOSS.
 *
 *   Deliberate scope note: additive columns are inert to older code, so the
 *   aged fixture carries the current COLUMN set and is aged by user_version
 *   plus legacy-shaped DATA (duplicate coach outputs, legacy uid() coach
 *   output ids, the corrupted planned_weeks default, a NULL deload_week).
 *   What that exercises is exactly the risk that can destroy a live user's
 *   data: the row-level repairs (v68), the dedup (v71) and the re-id (v72).
 *   Numbering note: PRAGMA user_version at head is 72 (SCHEMA_MIGRATIONS has 72
 *   entries). The dedup and re-id entries' own "v71"/"v72" comments match their
 *   real positions; the mesocycles week-count repair below them is commented
 *   "v68" but actually sits at schema version 69. Nothing here hard-codes the
 *   head — it is probed — but the fixture versions are absolute on purpose so
 *   they stay meaningful as the array grows.
 *
 *   The one piece of real DDL archaeology that matters is v71's unique index
 *   idx_coach_outputs_user_week — it is withheld from the aged fixture, so
 *   the dedup genuinely has duplicates to resolve.
 *
 *   Assertions: no row is lost anywhere except the ONE coach_outputs
 *   duplicate v71 is defined to drop; the active plan and its archived
 *   sibling survive; the block ledger survives; the APPLIED receipt in
 *   output_json survives (v71 keeps the applied row on a timestamp tie);
 *   v72 leaves every surviving row on the deterministic id; the morning-weight
 *   tombstone is neither resurrected nor purged; tier / Article 9 consent
 *   columns, the open ED flag and manual planned-volume overrides all survive.
 *
 * Covered elsewhere, referenced not duplicated: the Article 9 consent gate and
 * first-run/onboarding routing (src/navigation/__tests__/rootNavigator*.test.js,
 * src/__tests__/consentGate*.test.js), the trial/tier resolution
 * (src/lib/__tests__/proGate*.test.js, payments suites), and the reinstall
 * restore path (src/__tests__/campaign6.reinstall.test.js).
 */

const { DatabaseSync } = require('node:sqlite');

jest.mock('../lib/dbCrypto', () => {
  const { DatabaseSync: DS } = require('node:sqlite');
  const raw = new DS(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../lib/sync', () => ({ scheduleSync: () => {} }));

const { db, runMigrations, CURRENT_SCHEMA_VERSION } = require('../lib/database');
const { __raw: liveRaw } = require('../lib/dbCrypto');

function adapt(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
  };
}

const U = 'user-upgrade-1';
const WEEK_A = 1735000000000; // the week with the duplicate + applied receipt
const WEEK_B = 1734395200000; // the week with a legacy uid() id
const DAY = 86400000;

let headVersion = 0;
let headSchema = [];

beforeAll(async () => {
  await db(); // the REAL fresh-install path: base schema + every migration
  headVersion = liveRaw.prepare('PRAGMA user_version').get().user_version;
  headSchema = liveRaw
    .prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL")
    .all()
    .filter((r) => !String(r.name).startsWith('sqlite_'))
    // FTS5 is optional at runtime (ensureFoodSearchIndex swallows a missing
    // module by design) and its shadow tables must never be replayed by hand.
    .filter((r) => !String(r.name).includes('fts'));
});

// ── Phase 12: clean install ────────────────────────────────────────────────

describe('Phase 12 — clean install', () => {
  test('the real init path lands on the head schema version', async () => {
    expect(headVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(headVersion).toBeGreaterThan(0);
  });

  test('every table the coaching, nutrition, safety and sync layers read exists', () => {
    const names = new Set(
      liveRaw.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name),
    );
    for (const t of [
      'exercises', 'workouts', 'workout_sets', 'routines', 'routine_exercises',
      'programmes', 'mesocycles', 'mesocycle_weeks', 'planned_muscle_volume',
      'adaptation_events', 'nutrition_targets', 'morning_weights',
      'weekly_checkins', 'coach_outputs', 'user_body_profile', 'body_metric_log',
      'ed_pattern_flags', 'tier_history', 'foods', 'custom_foods', 'food_entries',
      'pending_sync_ops', 'sync_meta',
    ]) {
      expect(names.has(t)).toBe(true);
    }
  });

  test('v71 ships its unique index, so one coach output per week is structural', () => {
    const idx = liveRaw
      .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_coach_outputs_user_week'")
      .get();
    expect(idx).toBeTruthy();
  });
});

// ── Phase 13: upgrade from an older install ───────────────────────────────

// Rebuilds the head schema in a fresh database, stamps it to `version`, and
// seeds realistic rows in their pre-migration (legacy) shape.
function agedDb(version) {
  const raw = new DatabaseSync(':memory:');
  for (const row of headSchema) {
    // v71 creates this index; an install older than v71 cannot have it, and
    // withholding it is what lets the dedup actually see duplicates.
    if (row.name === 'idx_coach_outputs_user_week') continue;
    raw.exec(row.sql);
  }
  raw.exec(`PRAGMA user_version = ${version}`);

  const ins = (sql, params) => raw.prepare(sql).run(...params);

  // Article 9 consent + tier state + the goal lock.
  ins(
    `INSERT INTO user_body_profile
       (id, user_id, sex, date_of_birth, height_cm, experience_level,
        training_age_years, primary_goal, gdpr_consented, scoff_score,
        goal_lock_advanced, goal_lock_set_at, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['ubp-1', U, 'female', '1990-04-02', 168, 'intermediate', 4, 'hypertrophy',
      1, 1, 1, WEEK_A - 30 * DAY, WEEK_A - 200 * DAY, WEEK_A - 10 * DAY],
  );
  ins(
    `INSERT INTO tier_history (id, user_id, from_tier, to_tier, event_type, occurred_at, payload_json, created_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    ['th-1', U, 'free', 'pro', 'trial_start', WEEK_A - 40 * DAY, '{"source":"play"}', WEEK_A - 40 * DAY],
  );
  // An OPEN ED flag: it must survive an upgrade untouched (tier-blind
  // guardrails read this; losing it would silently unsuppress food-adjacent
  // notifications).
  ins(
    `INSERT INTO ed_pattern_flags (id, user_id, flag_state, reason, signals_json, raised_at, cleared_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    ['edf-1', U, 'open', 'rapid_loss', '{"weeks":3}', WEEK_A - 14 * DAY, null, WEEK_A - 14 * DAY, null],
  );

  // Active plan + an archived sibling.
  ins(
    `INSERT INTO programmes (id, user_id, name, description, is_library, is_active, is_archived,
        source_programme_id, next_workout_index, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['plan-active', U, 'Upper/Lower 4d', 'Main plan', 0, 1, 0, 'lib-7', 3,
      WEEK_A - 120 * DAY, WEEK_A - 5 * DAY],
  );
  ins(
    `INSERT INTO programmes (id, user_id, name, description, is_library, is_active, is_archived,
        source_programme_id, next_workout_index, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['plan-archived', U, 'Old PPL', null, 0, 0, 1, null, 0,
      WEEK_A - 300 * DAY, WEEK_A - 130 * DAY],
  );

  // Active block WITH a ledger, correct week counts already.
  const LEDGER = JSON.stringify({ v: 1, entries: { chest: { classification: 'RESPONSIVE' } } });
  ins(
    `INSERT INTO mesocycles (id, user_id, name, start_date, end_date, duration_weeks,
        planned_weeks, deload_week, rir_ladder, is_active, status, block_ledger, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['meso-active', U, 'Block 3', '2026-06-01', null, 6, 6, 6, '[3,2,1,0,4]', 1, 'active',
      LEDGER, WEEK_A - 45 * DAY, WEEK_A - 2 * DAY],
  );
  // Completed block carrying the pre-v68 corruption: planned_weeks stuck at
  // the cloud DEFAULT 5 while duration_weeks is the honest 6, and a NULL
  // deload_week. The v68 repair must fix these WITHOUT touching the ledger.
  ins(
    `INSERT INTO mesocycles (id, user_id, name, start_date, end_date, duration_weeks,
        planned_weeks, deload_week, rir_ladder, is_active, status, block_ledger, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['meso-done', U, 'Block 2', '2026-04-01', '2026-05-10', 6, 5, null, '[3,2,1,0,4]', 0, 'completed',
      LEDGER, WEEK_A - 140 * DAY, WEEK_A - 50 * DAY],
  );
  ins(
    `INSERT INTO mesocycle_weeks (id, mesocycle_id, user_id, week_index, is_deload, rir_target, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    ['mw-1', 'meso-active', U, 1, 0, 3, WEEK_A - 45 * DAY, WEEK_A - 45 * DAY],
  );
  // A MANUAL planned-volume override beside a template row: `source` is the
  // provenance marker and a manual figure must never be reverted by a migration.
  ins(
    `INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ['pmv-1', 'mw-1', 'chest', 18, 10, 16, 22, 'manual', WEEK_A - 45 * DAY, WEEK_A - 8 * DAY],
  );
  ins(
    `INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    ['pmv-2', 'mw-1', 'back', 14, 10, 16, 22, 'template', WEEK_A - 45 * DAY, WEEK_A - 45 * DAY],
  );

  // Training history.
  ins(
    `INSERT INTO workouts (id, user_id, mesocycle_id, mesocycle_week_id, name, started_at, ended_at,
        is_completed, set_count, total_volume, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['wo-1', U, 'meso-active', 'mw-1', 'Upper A', WEEK_A - 7 * DAY, WEEK_A - 7 * DAY + 3600000,
      1, 2, 2400, WEEK_A - 7 * DAY, WEEK_A - 7 * DAY],
  );
  ins(
    `INSERT INTO workout_sets (id, workout_id, exercise_id, exercise_name, user_id, set_number,
        weight, actual_reps, rir, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['ws-1', 'wo-1', 'ex-bench', 'Barbell Bench Press', U, 1, 60, 10, 2, WEEK_A - 7 * DAY, WEEK_A - 7 * DAY],
  );
  ins(
    `INSERT INTO workout_sets (id, workout_id, exercise_id, exercise_name, user_id, set_number,
        weight, actual_reps, rir, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['ws-2', 'wo-1', 'ex-bench', 'Barbell Bench Press', U, 2, 60, 10, 1, WEEK_A - 7 * DAY, WEEK_A - 7 * DAY],
  );

  // Morning weights, including a TOMBSTONE (soft-deleted weigh-in, R-8).
  ins(
    `INSERT INTO morning_weights (id, user_id, logged_at, weight_kg, notes, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    ['mwt-1', U, WEEK_A - 3 * DAY, 68.4, null, WEEK_A - 3 * DAY, WEEK_A - 3 * DAY, null],
  );
  ins(
    `INSERT INTO morning_weights (id, user_id, logged_at, weight_kg, notes, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    ['mwt-2', U, WEEK_A - 2 * DAY, 68.1, 'post-travel', WEEK_A - 2 * DAY, WEEK_A - 2 * DAY, null],
  );
  ins(
    `INSERT INTO morning_weights (id, user_id, logged_at, weight_kg, notes, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    ['mwt-tomb', U, WEEK_A - 4 * DAY, 71.9, 'mis-typed', WEEK_A - 4 * DAY, WEEK_A - 1 * DAY, WEEK_A - 1 * DAY],
  );

  // Nutrition targets + check-ins.
  ins(
    `INSERT INTO nutrition_targets (id, user_id, bmr, tdee, target_kcal, protein_g, carbs_g, fat_g,
        phase, bmr_method, activity_level, confidence, goal, protein_approach,
        gdpr_consented, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['nt-1', U, 1420, 2180, 1980, 140, 200, 60, 'cut', 'mifflin', 'moderate', 'high',
      'fat_loss', 'moderate', 1, WEEK_A - 60 * DAY, WEEK_A - 6 * DAY, null],
  );
  ins(
    `INSERT INTO weekly_checkins (id, user_id, week_start, energy_score, soreness_score, stress_score,
        sleep_hours, cals_adherence, steps_adherence, notes, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ['wc-1', U, WEEK_A, 4, 3, 2, 7.5, 'on', 'under', 'busy week',
      WEEK_A + DAY, WEEK_A + DAY, null],
  );

  // Coach outputs in their legacy shape:
  //  - WEEK_A: TWO rows for the same (user_id, week_start) — the two-device
  //    split v71 exists to resolve. Identical updated_at, so the documented
  //    `applied DESC` tie-break decides, and the APPLIED row (which carries
  //    the receipt in output_json) must be the survivor.
  //  - WEEK_B: a single row on a legacy uid() id, which v72 must re-id.
  const RECEIPT = JSON.stringify({ applied: true, appliedAt: WEEK_A + 2 * DAY, deltas: { kcal: -100 } });
  ins(
    `INSERT INTO coach_outputs (id, user_id, week_start, goal_phase, calorie_change, why_this,
        output_json, applied, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['co-legacy-applied', U, WEEK_A, 'cut', -100, 'Weight fell faster than target',
      RECEIPT, 1, WEEK_A + DAY, WEEK_A + 2 * DAY, null],
  );
  ins(
    `INSERT INTO coach_outputs (id, user_id, week_start, goal_phase, calorie_change, why_this,
        output_json, applied, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['co-legacy-dup', U, WEEK_A, 'cut', -100, 'Weight fell faster than target',
      '{"applied":false}', 0, WEEK_A + DAY, WEEK_A + 2 * DAY, null],
  );
  ins(
    `INSERT INTO coach_outputs (id, user_id, week_start, goal_phase, calorie_change, why_this,
        output_json, applied, created_at, updated_at, deleted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ['9f2c1a-legacy-uid', U, WEEK_B, 'cut', 0, 'Hold', '{"applied":false}', 0,
      WEEK_B + DAY, WEEK_B + DAY, null],
  );

  return raw;
}

const counts = (raw) => Object.fromEntries(
  ['programmes', 'mesocycles', 'mesocycle_weeks', 'planned_muscle_volume', 'workouts',
    'workout_sets', 'morning_weights', 'weekly_checkins', 'nutrition_targets',
    'coach_outputs', 'user_body_profile', 'tier_history', 'ed_pattern_flags']
    .map((t) => [t, raw.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]),
);

// The live Play binary's exact user_version is not provable from this repo
// (eas.json sets appVersionSource: remote with production autoIncrement, so
// app.json's versionCode is not the store's), so the pin tests a RANGE that
// brackets every plausible installed base: the version the tree carried at the
// versionCode-30 commit (d97d513f, 2026-07-13), a much older install, and a
// pre-version-tracking install.
describe.each([
  ['the versionCode-30-era install (user_version 68)', 68],
  ['a much older install (user_version 40)', 40],
  ['a pre-version-tracking install (user_version 0)', 0],
])('Phase 13 — upgrade from %s', (_label, fromVersion) => {
  let raw;
  let before;

  beforeAll(async () => {
    raw = agedDb(fromVersion);
    before = counts(raw);
    await runMigrations(adapt(raw));
  });

  test('the upgrade reaches head and the aged fixture really was older', () => {
    expect(fromVersion).toBeLessThan(headVersion);
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(headVersion);
  });

  test('NO DATA LOSS: every table keeps its rows, bar the one coach_outputs duplicate v71 drops', () => {
    const after = counts(raw);
    const expected = { ...before, coach_outputs: before.coach_outputs - 1 };
    expect(after).toEqual(expected);
  });

  test('the active plan and its archived sibling both survive intact', () => {
    const rows = raw.prepare(
      'SELECT id, name, is_active, is_archived, source_programme_id, next_workout_index FROM programmes ORDER BY id',
    ).all();
    expect(rows).toEqual([
      { id: 'plan-active', name: 'Upper/Lower 4d', is_active: 1, is_archived: 0, source_programme_id: 'lib-7', next_workout_index: 3 },
      { id: 'plan-archived', name: 'Old PPL', is_active: 0, is_archived: 1, source_programme_id: null, next_workout_index: 0 },
    ]);
  });

  test('the block ledger survives on both blocks, and the week-count repair fixes the corruption', () => {
    const rows = raw.prepare(
      'SELECT id, block_ledger, planned_weeks, duration_weeks, deload_week, is_active, status FROM mesocycles ORDER BY id',
    ).all();
    const ledger = JSON.stringify({ v: 1, entries: { chest: { classification: 'RESPONSIVE' } } });
    expect(rows[0]).toEqual({
      id: 'meso-active', block_ledger: ledger, planned_weeks: 6, duration_weeks: 6,
      deload_week: 6, is_active: 1, status: 'active',
    });
    // The mesocycles repair (array index 68, i.e. schema version 69 — its own
    // header comment says "v68", which is off by one against the array's real
    // position): planned_weeks reconciled FROM duration_weeks, deload_week derived.
    expect(rows[1]).toEqual({
      id: 'meso-done', block_ledger: ledger, planned_weeks: 6, duration_weeks: 6,
      deload_week: 6, is_active: 0, status: 'completed',
    });
  });

  test('the APPLIED receipt survives the dedup, and v72 leaves every row deterministically idd', () => {
    const rows = raw.prepare(
      'SELECT id, week_start, applied, output_json, updated_at FROM coach_outputs ORDER BY week_start',
    ).all();
    expect(rows).toHaveLength(2);
    // WEEK_B: legacy uid() re-idded, updated_at untouched (honest timestamps).
    expect(rows[0].id).toBe(`co_${WEEK_B}_${U}`);
    expect(rows[0].updated_at).toBe(WEEK_B + DAY);
    // WEEK_A: the APPLIED row won the tie and kept its receipt.
    expect(rows[1].id).toBe(`co_${WEEK_A}_${U}`);
    expect(rows[1].applied).toBe(1);
    expect(JSON.parse(rows[1].output_json).applied).toBe(true);
    expect(JSON.parse(rows[1].output_json).deltas).toEqual({ kcal: -100 });
    expect(rows[1].updated_at).toBe(WEEK_A + 2 * DAY);
  });

  test('the unique index exists after the upgrade, so the split can never recur', () => {
    const idx = raw.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_coach_outputs_user_week'",
    ).get();
    expect(idx).toBeTruthy();
  });

  test('the morning-weight tombstone is neither resurrected nor purged', () => {
    const rows = raw.prepare('SELECT id, weight_kg, deleted_at FROM morning_weights ORDER BY id').all();
    expect(rows).toEqual([
      { id: 'mwt-1', weight_kg: 68.4, deleted_at: null },
      { id: 'mwt-2', weight_kg: 68.1, deleted_at: null },
      { id: 'mwt-tomb', weight_kg: 71.9, deleted_at: WEEK_A - 1 * DAY },
    ]);
  });

  test('tier, Article 9 consent, the goal lock and the OPEN ED flag all survive', () => {
    const p = raw.prepare(
      'SELECT sex, gdpr_consented, scoff_score, goal_lock_advanced, goal_lock_set_at FROM user_body_profile WHERE user_id = ?',
    ).get(U);
    expect(p).toEqual({
      sex: 'female', gdpr_consented: 1, scoff_score: 1,
      goal_lock_advanced: 1, goal_lock_set_at: WEEK_A - 30 * DAY,
    });
    const t = raw.prepare('SELECT to_tier, event_type FROM tier_history WHERE user_id = ?').get(U);
    expect(t).toEqual({ to_tier: 'pro', event_type: 'trial_start' });
    const ed = raw.prepare('SELECT flag_state, cleared_at, deleted_at FROM ed_pattern_flags WHERE user_id = ?').get(U);
    expect(ed).toEqual({ flag_state: 'open', cleared_at: null, deleted_at: null });
  });

  test('manual planned-volume overrides are not reverted to template values', () => {
    const rows = raw.prepare(
      'SELECT id, planned_sets, source FROM planned_muscle_volume ORDER BY id',
    ).all();
    expect(rows).toEqual([
      { id: 'pmv-1', planned_sets: 18, source: 'manual' },
      { id: 'pmv-2', planned_sets: 14, source: 'template' },
    ]);
  });

  test('nutrition targets, check-ins and training history survive field-for-field', () => {
    const nt = raw.prepare(
      'SELECT target_kcal, protein_g, phase, goal, protein_approach, gdpr_consented, deleted_at FROM nutrition_targets WHERE user_id = ?',
    ).get(U);
    expect(nt).toEqual({
      target_kcal: 1980, protein_g: 140, phase: 'cut', goal: 'fat_loss',
      protein_approach: 'moderate', gdpr_consented: 1, deleted_at: null,
    });
    const wc = raw.prepare('SELECT week_start, energy_score, cals_adherence, notes FROM weekly_checkins WHERE user_id = ?').get(U);
    expect(wc).toEqual({ week_start: WEEK_A, energy_score: 4, cals_adherence: 'on', notes: 'busy week' });
    const sets = raw.prepare('SELECT id, weight, actual_reps, rir, exercise_name FROM workout_sets ORDER BY id').all();
    expect(sets).toEqual([
      { id: 'ws-1', weight: 60, actual_reps: 10, rir: 2, exercise_name: 'Barbell Bench Press' },
      { id: 'ws-2', weight: 60, actual_reps: 10, rir: 1, exercise_name: 'Barbell Bench Press' },
    ]);
    const wo = raw.prepare('SELECT id, mesocycle_week_id, is_completed, set_count, total_volume FROM workouts').get();
    expect(wo).toEqual({ id: 'wo-1', mesocycle_week_id: 'mw-1', is_completed: 1, set_count: 2, total_volume: 2400 });
  });

  test('the whole pipeline is idempotent: replaying it from 0 over the upgraded database changes nothing', async () => {
    const snapshot = counts(raw);
    const coach = raw.prepare('SELECT id, applied, output_json FROM coach_outputs ORDER BY id').all();
    raw.exec('PRAGMA user_version = 0');
    await runMigrations(adapt(raw));
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(headVersion);
    expect(counts(raw)).toEqual(snapshot);
    expect(raw.prepare('SELECT id, applied, output_json FROM coach_outputs ORDER BY id').all()).toEqual(coach);
  });
});
