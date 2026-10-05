/**
 * D219 lane S1: programmes.plan_facts, the one synced JSON column that holds
 * the facts a plan built by the new planner carries (register D219 "Build
 * rulings, 2026-10-04" items 1 and 2; docs/audit/plan-builder-science-
 * 2026-10-04/00-AUDIT-AND-PLAN.md section 9).
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the REAL init path, the same
 * harness as campaign6.reinstall.test.js. It pins, each of which fails on the
 * code before this lane (no column, no getters, the pull never named the
 * column):
 *  - the local migration adds `programmes.plan_facts` TEXT, nullable; a
 *    pre-migration database upgrades with every existing programme reading
 *    NULL; running it twice changes nothing and throws on neither run;
 *  - the facts round trip through getProgrammePlanFacts/setProgrammePlanFacts
 *    (parsed object back, updated_at bumped, null clears); unreadable JSON
 *    reads as null and is logged, never thrown;
 *  - the programmes pull carries the column the way block_ledger is carried:
 *    a cloud NULL (or a missing key) NEVER overwrites a local value, a newer
 *    cloud object replaces it (stringified for the TEXT column), and a stale
 *    cloud row changes nothing.
 */

jest.mock('../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
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
jest.mock('../sync', () => ({ scheduleSync: () => {} }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const { DatabaseSync } = require('node:sqlite');
const {
  db,
  runMigrations,
  CURRENT_SCHEMA_VERSION,
  createProgramme,
  getProgrammeById,
  getProgrammePlanFacts,
  setProgrammePlanFacts,
  insertProgrammeFromCloud,
} = require('../database');
const { logError } = require('../errorLog');

const U = 'user-plan-facts-1';
const iso = (ms) => new Date(ms).toISOString();
const T_OLD = 1735000000000;
const T_NEW = 1735000900000;

const FACTS = {
  version: 2,
  roles: { chest: 'standard', quads: 'standard' },
  exposureShares: { chest: { r1: 0.6, r2: 0.4 } },
  sessionCaps: { chest: { direct: 8, fractional: 11 } },
};

let conn;
beforeAll(async () => {
  conn = await db();
});

function adaptRaw(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
  };
}

describe('the local migration', () => {
  test('a fresh install has programmes.plan_facts as a nullable TEXT column', async () => {
    const cols = await conn.getAllAsync('PRAGMA table_info(programmes)');
    const col = cols.find((c) => c.name === 'plan_facts');
    expect(col).toBeTruthy();
    expect(String(col.type).toUpperCase()).toBe('TEXT');
    expect(col.notnull).toBe(0);
    expect(col.dflt_value).toBeNull();
  });

  test('is its own additive schema version with the header note the schema rules require', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
    const op = "'ALTER TABLE programmes ADD COLUMN plan_facts TEXT'";
    expect(src.split(op).length - 1).toBe(1);
    // One entry, one additive ALTER, nothing destructive beside it.
    expect(src).toMatch(/\[\s*'ALTER TABLE programmes ADD COLUMN plan_facts TEXT',\s*\],/);
    // Header note: purpose, applied locally/remotely, safe to re-run, rollback.
    const header = src.slice(src.indexOf(op) - 2600, src.indexOf(op));
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'migrate_188']) {
      expect(header).toContain(word);
    }
  });

  test('a pre-migration database upgrades: every existing programme reads NULL', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE programmes (id TEXT PRIMARY KEY, name TEXT, updated_at INTEGER)');
    // 2026-10-05 (D219 lane LR2): workout_sets.entry_typed was appended after
    // plan_facts, so the window is the last 2 and the fixture carries the
    // workout_sets table that later ALTER needs (a mechanical +1 re-anchor).
    raw.exec('CREATE TABLE workout_sets (id TEXT PRIMARY KEY, user_id TEXT, workout_id TEXT, exercise_id TEXT)');
    raw.prepare('INSERT INTO programmes (id, name, updated_at) VALUES (?, ?, ?)').run('p-old', 'Old plan', 111);
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 2}`);
    await runMigrations(adaptRaw(raw));

    const row = raw.prepare('SELECT id, name, updated_at, plan_facts FROM programmes WHERE id = ?').get('p-old');
    expect(row).toEqual({ id: 'p-old', name: 'Old plan', updated_at: 111, plan_facts: null });
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('is idempotent: a second run changes nothing and throws on neither run', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE programmes (id TEXT PRIMARY KEY, name TEXT, updated_at INTEGER)');
    raw.exec('CREATE TABLE workout_sets (id TEXT PRIMARY KEY, user_id TEXT, workout_id TEXT, exercise_id TEXT)');
    raw.prepare('INSERT INTO programmes (id, name, updated_at) VALUES (?, ?, ?)').run('p-old', 'Old plan', 111);
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 2}`);
    await runMigrations(adaptRaw(raw));
    raw.prepare('UPDATE programmes SET plan_facts = ? WHERE id = ?').run('{"version":2}', 'p-old');
    const before = raw.prepare('SELECT * FROM programmes WHERE id = ?').get('p-old');

    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 2}`);
    await expect(runMigrations(adaptRaw(raw))).resolves.not.toThrow();

    expect(raw.prepare('SELECT * FROM programmes WHERE id = ?').get('p-old')).toEqual(before);
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('getProgrammePlanFacts / setProgrammePlanFacts', () => {
  test('a programme with no facts reads null; so does an unknown or missing id', async () => {
    const p = await createProgramme(U, 'No facts yet');
    expect(await getProgrammePlanFacts(p.id)).toBeNull();
    expect(await getProgrammePlanFacts('does-not-exist')).toBeNull();
    expect(await getProgrammePlanFacts(null)).toBeNull();
  });

  test('the facts round trip as a parsed object and updated_at is bumped', async () => {
    const p = await createProgramme(U, 'Facts plan');
    const before = (await getProgrammeById(p.id)).updatedAt;
    await new Promise((r) => setTimeout(r, 5));

    await setProgrammePlanFacts(p.id, FACTS);

    expect(await getProgrammePlanFacts(p.id)).toEqual(FACTS);
    const after = await getProgrammeById(p.id);
    expect(after.updatedAt).toBeGreaterThan(before);
    // Stored as JSON text in the local column.
    expect(typeof after.planFacts).toBe('string');
    expect(JSON.parse(after.planFacts)).toEqual(FACTS);
  });

  test('null clears the facts', async () => {
    const p = await createProgramme(U, 'Cleared plan');
    await setProgrammePlanFacts(p.id, FACTS);
    await setProgrammePlanFacts(p.id, null);
    expect(await getProgrammePlanFacts(p.id)).toBeNull();
  });

  test('unreadable JSON reads as null and is logged through logError, never thrown', async () => {
    const p = await createProgramme(U, 'Broken facts');
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', ['{not json', p.id]);
    logError.mockClear();

    await expect(getProgrammePlanFacts(p.id)).resolves.toBeNull();

    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0][0]).toBe('database.getProgrammePlanFacts');
  });

  test('a stored array or scalar is not a facts object and reads null', async () => {
    const p = await createProgramme(U, 'Odd facts');
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', ['[1,2]', p.id]);
    expect(await getProgrammePlanFacts(p.id)).toBeNull();
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', ['7', p.id]);
    expect(await getProgrammePlanFacts(p.id)).toBeNull();
  });
});

describe('the programmes pull (insertProgrammeFromCloud)', () => {
  const cloudRow = (id, updatedMs, extra = {}) => ({
    id, name: 'Upper/Lower', description: null, is_library: false, is_active: true, is_archived: false,
    source_programme_id: null, created_at: iso(T_OLD), updated_at: iso(updatedMs), ...extra,
  });

  async function localRow(id, updatedMs, facts) {
    await insertProgrammeFromCloud(U, cloudRow(id, updatedMs, facts === undefined ? {} : { plan_facts: facts }));
  }

  test('a new row carries the cloud facts in (an object is stringified for the TEXT column)', async () => {
    await localRow('pull-new', T_OLD, FACTS);
    expect(await getProgrammePlanFacts('pull-new')).toEqual(FACTS);
  });

  test('a new row with no cloud facts stays NULL', async () => {
    await localRow('pull-new-null', T_OLD, null);
    expect(await getProgrammePlanFacts('pull-new-null')).toBeNull();
  });

  test('a strictly newer cloud row with a NULL plan_facts NEVER overwrites a local value', async () => {
    await localRow('pull-keep', T_OLD, FACTS);

    await insertProgrammeFromCloud(U, cloudRow('pull-keep', T_NEW, { plan_facts: null, name: 'Renamed in the cloud' }));

    const row = await getProgrammeById('pull-keep');
    expect(row.name).toBe('Renamed in the cloud'); // the row itself was applied (strictly newer)
    expect(await getProgrammePlanFacts('pull-keep')).toEqual(FACTS);
  });

  test('a strictly newer cloud row that omits the key (the column not yet applied) keeps the local value', async () => {
    await localRow('pull-absent', T_OLD, FACTS);

    await insertProgrammeFromCloud(U, cloudRow('pull-absent', T_NEW, { name: 'Renamed again' }));

    expect((await getProgrammeById('pull-absent')).name).toBe('Renamed again');
    expect(await getProgrammePlanFacts('pull-absent')).toEqual(FACTS);
  });

  test('a strictly newer cloud row with facts replaces the local facts', async () => {
    await localRow('pull-replace', T_OLD, FACTS);
    const newer = { ...FACTS, roles: { chest: 'focus' } };

    await insertProgrammeFromCloud(U, cloudRow('pull-replace', T_NEW, { plan_facts: newer }));

    expect(await getProgrammePlanFacts('pull-replace')).toEqual(newer);
  });

  test('a plain string from the cloud (already JSON text) is kept as is', async () => {
    await localRow('pull-string', T_OLD, null);

    await insertProgrammeFromCloud(U, cloudRow('pull-string', T_NEW, { plan_facts: JSON.stringify(FACTS) }));

    expect(await getProgrammePlanFacts('pull-string')).toEqual(FACTS);
  });

  test('a stale cloud row (not strictly newer) changes nothing, facts included', async () => {
    await localRow('pull-stale', T_NEW, FACTS);

    await insertProgrammeFromCloud(U, cloudRow('pull-stale', T_OLD, { plan_facts: { version: 2, roles: {} } }));

    expect(await getProgrammePlanFacts('pull-stale')).toEqual(FACTS);
  });
});
