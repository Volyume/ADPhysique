/**
 * CC27 - the exercise-demand migration (database.js SCHEMA_MIGRATIONS
 * tail): ten nullable demand columns + a canonical-row backfill derived
 * via capability/demands.js.
 *
 * BEHAVIOURAL, real SQLite (node:sqlite), same harness as
 * database.bicepsSubregion.test.js. Pins:
 *  - a pre-CC27 database upgrades cleanly and every canonical row gets the
 *    SAME values a fresh seed would derive;
 *  - custom rows stay NULL on every axis (CAP-8: unknown is honest; the
 *    owner supplies axes progressively, never a guess);
 *  - updated_at is NOT touched by the backfill (F5 honest timestamps);
 *  - the migration is idempotent.
 * If a later migration appends to the array, bump the window count per the
 * house convention.
 */
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../database');
const { deriveDemandMetadata } = require('../capability/demands');

jest.mock('expo-sqlite');

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

function fakeProbeDb() {
  let version = 0;
  return {
    getFirstAsync: async (sql) => (/user_version/i.test(String(sql)) ? { user_version: version } : null),
    getAllAsync: async () => [],
    runAsync: async () => ({}),
    execAsync: async (sql) => {
      const m = /PRAGMA user_version = (\d+)/.exec(String(sql));
      if (m) version = Number(m[1]);
    },
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    get _version() { return version; },
  };
}

async function totalMigrationCount() {
  const probe = fakeProbeDb();
  await runMigrations(probe);
  return probe._version;
}

function freshDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE exercises (
    id TEXT PRIMARY KEY, name TEXT, primary_muscle TEXT, equipment TEXT,
    movement_pattern TEXT, compound_isolation TEXT, subregion TEXT,
    is_custom INTEGER DEFAULT 0, updated_at INTEGER
  )`);
  raw.prepare('INSERT INTO exercises (id, name, primary_muscle, equipment, movement_pattern, compound_isolation, is_custom, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('ex-squat', 'Barbell Back Squat', 'quads', 'barbell', 'squat', 'compound', 0, 111);
  raw.prepare('INSERT INTO exercises (id, name, primary_muscle, equipment, movement_pattern, compound_isolation, is_custom, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('ex-legpress', 'Leg Press', 'quads', 'machine', 'squat', 'compound', 0, 222);
  raw.prepare('INSERT INTO exercises (id, name, primary_muscle, equipment, movement_pattern, compound_isolation, is_custom, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run('ex-custom', 'My Adapted Press', 'chest', 'machine', 'push', 'compound', 1, 333);
  return raw;
}

async function runLast(raw, count) {
  const total = await totalMigrationCount();
  raw.exec(`PRAGMA user_version = ${total - count}`);
  await runMigrations(adapt(raw));
  return total;
}

const demandRow = (raw, id) => raw.prepare(
  `SELECT position, floor_access, overhead_position, grip_demand,
          unilateral_loadable, bilateral_upper, bilateral_lower,
          axial_load, impact, balance_demand, updated_at
     FROM exercises WHERE id = ?`,
).get(id);

test('a pre-CC27 database upgrades: canonical rows derive, matching the seed derivation exactly', async () => {
  const raw = freshDb();
  await runLast(raw, 1);

  const squat = demandRow(raw, 'ex-squat');
  const expected = deriveDemandMetadata({
    name: 'Barbell Back Squat', primaryMuscle: 'quads', equipment: 'barbell',
    movementPattern: 'squat', compoundIsolation: 'compound',
  });
  expect(squat.position).toBe(expected.position);
  expect(squat.grip_demand).toBe(expected.gripDemand);
  expect(squat.axial_load).toBe(expected.axialLoad === true ? 1 : expected.axialLoad === false ? 0 : null);
  expect(squat.bilateral_lower).toBe(1);
  expect(squat.balance_demand).toBe('stable');

  const legPress = demandRow(raw, 'ex-legpress');
  expect(legPress.position).toBe('seated');
  expect(legPress.grip_demand).toBe('supportive');
  expect(legPress.bilateral_upper).toBe(0);
});

test('custom rows stay NULL on every axis (CAP-8), and updated_at is untouched everywhere', async () => {
  const raw = freshDb();
  await runLast(raw, 1);

  const custom = demandRow(raw, 'ex-custom');
  for (const col of ['position', 'floor_access', 'overhead_position', 'grip_demand',
    'unilateral_loadable', 'bilateral_upper', 'bilateral_lower', 'axial_load', 'impact', 'balance_demand']) {
    expect({ col, value: custom[col] }).toEqual({ col, value: null });
  }
  expect(custom.updated_at).toBe(333);
  expect(demandRow(raw, 'ex-squat').updated_at).toBe(111);
  expect(demandRow(raw, 'ex-legpress').updated_at).toBe(222);
});

test('is idempotent: a second run changes nothing and errors on neither run', async () => {
  const raw = freshDb();
  const total = await runLast(raw, 1);
  const once = ['ex-squat', 'ex-legpress', 'ex-custom'].map((id) => demandRow(raw, id));

  raw.exec(`PRAGMA user_version = ${total - 1}`);
  await expect(runMigrations(adapt(raw))).resolves.not.toThrow();
  expect(['ex-squat', 'ex-legpress', 'ex-custom'].map((id) => demandRow(raw, id))).toEqual(once);
});
