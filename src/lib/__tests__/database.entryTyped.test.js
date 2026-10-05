/**
 * D219 learner data path: workout_sets.entry_typed, the one extra fact about a
 * logged set that says whether the person typed or changed its weight or reps
 * (1) or kept them exactly as the screen filled them in (0); NULL is unknown
 * (register D219, "Founder answers on the learner design, 2026-10-05";
 * evidence docs/audit/plan-builder-science-2026-10-04/05-LEARNER-RECON.md
 * candidate C; cloud counterpart supabase/migrate_189_workout_sets_entry_typed.sql,
 * WRITTEN, NOT APPLIED).
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the REAL init path, the same
 * harness as database.planFacts.test.js. It pins, each of which fails on the
 * code before this lane (no column, no writer, no edit rule, no reader field,
 * a pull that never named the column):
 *  - the local migration adds `workout_sets.entry_typed` INTEGER, nullable,
 *    exactly once; a pre-migration database upgrades with every existing set
 *    reading NULL and nothing else moved; running it again changes nothing and
 *    throws on neither run;
 *  - createWorkoutSet stores the fact it is given (1 / 0, or true / false) and
 *    NULL for anything else, including a caller that says nothing, and the fact
 *    changes no other column of the row;
 *  - updateWorkoutSet makes a set typed when an edit CHANGES its weight or its
 *    reps, and only then: a save that changes neither, or an edit of a note, a
 *    set type or an effort figure, leaves the fact as it was (0 stays 0, an
 *    unknown stays unknown);
 *  - the reader the recovery learner uses (getWorkoutSetsForWorkoutIds) hands
 *    back `entryTyped` as 1, 0 or null, always present, and null for a stray
 *    stored value;
 *  - the pull maps the cloud boolean when it is present, and a cloud NULL or a
 *    missing key never overwrites a local value, even when the newer cloud row
 *    replaces the rest of the set (the INSERT OR REPLACE carries the value);
 *  - the local backup and restore carry the column untouched (1, 0 and NULL).
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

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const {
  db,
  runMigrations,
  CURRENT_SCHEMA_VERSION,
  createWorkoutSet,
  updateWorkoutSet,
  getWorkoutSetsForWorkoutIds,
  insertWorkoutSetFromCloud,
  dumpAllTables,
  restoreAllTables,
} = require('../database');

const U = 'user-entry-typed-1';
const iso = (ms) => new Date(ms).toISOString();

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

let nextSet = 0;
async function log(extra = {}, workoutId = 'w-et-1') {
  nextSet += 1;
  const set = await createWorkoutSet({
    userId: U, workoutId, exerciseId: 'ex-et-1', setNumber: nextSet, actualReps: 8, weight: 60, ...extra,
  });
  return set.id;
}
const flagOf = async (id) => (await conn.getFirstAsync('SELECT entry_typed FROM workout_sets WHERE id = ?', [id])).entry_typed;

describe('the local migration', () => {
  test('a fresh install has workout_sets.entry_typed as one nullable INTEGER column with no default', async () => {
    const cols = (await conn.getAllAsync('PRAGMA table_info(workout_sets)')).filter((c) => c.name === 'entry_typed');
    expect(cols).toHaveLength(1);
    expect(String(cols[0].type).toUpperCase()).toBe('INTEGER');
    expect(cols[0].notnull).toBe(0);
    expect(cols[0].dflt_value).toBeNull();
  });

  test('is its own additive schema version with the header note the schema rules require', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
    const op = "'ALTER TABLE workout_sets ADD COLUMN entry_typed INTEGER'";
    expect(src.split(op).length - 1).toBe(1);
    // One entry, one additive ALTER, nothing destructive beside it.
    expect(src).toMatch(/\[\s*'ALTER TABLE workout_sets ADD COLUMN entry_typed INTEGER',\s*\],/);
    // Header note: purpose, applied locally/remotely, safe to re-run, rollback.
    const previous = src.indexOf("'ALTER TABLE programmes ADD COLUMN plan_facts TEXT',");
    expect(previous).toBeGreaterThan(-1);
    const header = src.slice(previous, src.indexOf(op));
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'migrate_189']) {
      expect(header).toContain(word);
    }
    expect(header).toContain('NOT');
    expect(header).toContain('run against production: 189');
  });

  function preMigrationDb() {
    const raw = new DatabaseSync(':memory:');
    raw.exec(`CREATE TABLE workout_sets (
      id TEXT PRIMARY KEY, user_id TEXT, workout_id TEXT, exercise_id TEXT,
      weight REAL, actual_reps INTEGER, updated_at INTEGER
    )`);
    raw.prepare('INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, weight, actual_reps, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('s-old', 'u', 'w', 'e', 60, 8, 111);
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 1}`);
    return raw;
  }

  test('a pre-migration database upgrades: every existing set reads NULL and nothing else moves', async () => {
    const raw = preMigrationDb();
    await runMigrations(adaptRaw(raw));

    const row = raw.prepare('SELECT id, weight, actual_reps, updated_at, entry_typed FROM workout_sets WHERE id = ?').get('s-old');
    expect(row).toEqual({ id: 's-old', weight: 60, actual_reps: 8, updated_at: 111, entry_typed: null });
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('adds the column exactly once and is idempotent: a second run changes nothing and throws on neither run', async () => {
    const raw = preMigrationDb();
    await runMigrations(adaptRaw(raw));
    raw.prepare('UPDATE workout_sets SET entry_typed = 1 WHERE id = ?').run('s-old');
    const before = raw.prepare('SELECT * FROM workout_sets WHERE id = ?').get('s-old');

    // A second boot that still sees the pre-migration version (a restored
    // snapshot, an interrupted run): the column is already there.
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 1}`);
    await expect(runMigrations(adaptRaw(raw))).resolves.not.toThrow();

    const columns = raw.prepare('PRAGMA table_info(workout_sets)').all().filter((c) => c.name === 'entry_typed');
    expect(columns).toHaveLength(1);
    expect(raw.prepare('SELECT * FROM workout_sets WHERE id = ?').get('s-old')).toEqual(before);
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});

describe('createWorkoutSet stores the fact it is given, and NULL when it is given none', () => {
  test.each([
    { label: '1', given: 1, expected: 1 },
    { label: 'true', given: true, expected: 1 },
    { label: '0', given: 0, expected: 0 },
    { label: 'false', given: false, expected: 0 },
    { label: 'null', given: null, expected: null },
    { label: 'undefined', given: undefined, expected: null },
    { label: '2 (a stray number)', given: 2, expected: null },
    { label: "'1' (a string)", given: '1', expected: null },
    { label: 'NaN', given: NaN, expected: null },
  ])('entryTyped $label is stored as $expected', async ({ given, expected }) => {
    const id = await log({ entryTyped: given });
    expect(await flagOf(id)).toBe(expected);
  });

  test('a caller that says nothing at all (a watch event, any other path) stores NULL, never a guess', async () => {
    const id = await log({});
    expect(await flagOf(id)).toBeNull();
  });

  test('the fact changes nothing else about the row: the same set logged kept, typed and unknown stores identical columns', async () => {
    const ids = [await log({ entryTyped: 0 }), await log({ entryTyped: 1 }), await log({})];
    const rows = [];
    for (const id of ids) rows.push(await conn.getFirstAsync('SELECT * FROM workout_sets WHERE id = ?', [id]));
    const rest = ({ id, set_number, created_at, updated_at, entry_typed, ...others }) => others;
    expect(rest(rows[0])).toEqual(rest(rows[1]));
    expect(rest(rows[1])).toEqual(rest(rows[2]));
    expect(rows[0].weight).toBe(60);
    expect(rows[0].actual_reps).toBe(8);
    expect(rows.map((r) => r.entry_typed)).toEqual([0, 1, null]);
  });
});

describe('updateWorkoutSet: an edit that changes the weight or the reps makes the set typed', () => {
  test.each([
    ['a kept set, the weight changed', 0, { weight: 62.5, actualReps: 8 }, 1],
    ['a kept set, the reps changed', 0, { weight: 60, actualReps: 9 }, 1],
    ['a kept set, both changed', 0, { weight: 62.5, actualReps: 9 }, 1],
    ['an unknown set, the weight changed', null, { weight: 65, actualReps: 8 }, 1],
    ['an unknown set, the reps changed', null, { weight: 60, actualReps: 6 }, 1],
    ['a typed set, changed again', 1, { weight: 70, actualReps: 8 }, 1],
  ])('%s', async (_label, start, fields, expected) => {
    const id = await log(start == null ? {} : { entryTyped: start });
    await updateWorkoutSet(id, fields);
    expect(await flagOf(id)).toBe(expected);
  });

  test.each([
    ['a kept set saved exactly as it was (the editor opened and saved)', 0, { weight: 60, actualReps: 8 }, 0],
    ['a kept set saved with the same numbers written another way', 0, { weight: '60.0', actualReps: '8' }, 0],
    ['an unknown set saved exactly as it was stays unknown', null, { weight: 60, actualReps: 8 }, null],
    ['a typed set saved exactly as it was stays typed', 1, { weight: 60, actualReps: 8 }, 1],
  ])('%s', async (_label, start, fields, expected) => {
    const id = await log(start == null ? {} : { entryTyped: start });
    await updateWorkoutSet(id, fields);
    expect(await flagOf(id)).toBe(expected);
  });

  test.each([
    ['notes', { notes: 'felt heavy' }],
    ['rir', { rir: 2 }],
    ['rpe', { rpe: 8 }],
    ['setType', { setType: 'warmup' }],
    ['failed', { failed: true }],
  ])('an edit of %s alone leaves the fact as it was (a kept set stays kept, an unknown set stays unknown)', async (_field, fields) => {
    const kept = await log({ entryTyped: 0 });
    const unknown = await log({});
    await updateWorkoutSet(kept, fields);
    await updateWorkoutSet(unknown, fields);
    expect(await flagOf(kept)).toBe(0);
    expect(await flagOf(unknown)).toBeNull();
  });

  test('the edit itself is saved as before: the new weight and reps are stored and updated_at moves', async () => {
    const id = await log({ entryTyped: 0 });
    const before = await conn.getFirstAsync('SELECT updated_at FROM workout_sets WHERE id = ?', [id]);
    await new Promise((r) => setTimeout(r, 5));

    await updateWorkoutSet(id, { weight: 62.5, actualReps: 9, notes: 'second look' });

    const row = await conn.getFirstAsync('SELECT weight, actual_reps, notes, entry_typed, updated_at FROM workout_sets WHERE id = ?', [id]);
    expect(row.weight).toBe(62.5);
    expect(row.actual_reps).toBe(9);
    expect(row.notes).toBe('second look');
    expect(row.entry_typed).toBe(1);
    expect(row.updated_at).toBeGreaterThan(before.updated_at);
  });

  test('an edit that supplies nothing editable writes nothing', async () => {
    const id = await log({ entryTyped: 0 });
    await updateWorkoutSet(id, {});
    await updateWorkoutSet(id, { unknownField: 1 });
    expect(await flagOf(id)).toBe(0);
  });
});

describe('the reader the recovery learner uses returns entryTyped', () => {
  const W = 'w-et-reader';

  test('1, 0 and null come back as entryTyped, the key always present, and no snake_case twin', async () => {
    const typed = await log({ entryTyped: 1 }, W);
    const kept = await log({ entryTyped: 0 }, W);
    const unknown = await log({}, W);

    const sets = await getWorkoutSetsForWorkoutIds([W]);
    const byId = Object.fromEntries(sets.map((s) => [s.id, s]));
    expect(byId[typed].entryTyped).toBe(1);
    expect(byId[kept].entryTyped).toBe(0);
    expect(byId[unknown].entryTyped).toBeNull();
    for (const s of sets) {
      expect(Object.keys(s)).toContain('entryTyped');
      expect(Object.keys(s)).not.toContain('entry_typed');
    }
  });

  test('a stray stored value reads as null, never as a claim', async () => {
    const W2 = 'w-et-reader-stray';
    const id = await log({}, W2);
    await conn.runAsync('UPDATE workout_sets SET entry_typed = 7 WHERE id = ?', [id]);
    const [row] = await getWorkoutSetsForWorkoutIds([W2]);
    expect(row.entryTyped).toBeNull();
  });

  test('the rest of the row is read as before', async () => {
    const W3 = 'w-et-reader-rest';
    await log({ entryTyped: 1, weight: 82.5, actualReps: 6 }, W3);
    const [row] = await getWorkoutSetsForWorkoutIds([W3]);
    expect(row).toMatchObject({ weight: 82.5, actualReps: 6, workoutId: W3, userId: U });
  });
});

describe('the pull (insertWorkoutSetFromCloud) maps the fact and never lets a cloud NULL erase a local value', () => {
  const T_OLD = 1735000000000;
  const T_NEW = 1735000900000;
  const W = 'w-et-pull';

  const cloudRow = (id, updatedMs, extra = {}) => ({
    id, workout_id: W, exercise_id: 'ex-et-pull', exercise_name: 'Bench Press',
    set_number: 1, set_type: 'straight', actual_reps: 8, weight: 60,
    created_at: iso(T_OLD), updated_at: iso(updatedMs), ...extra,
  });
  const localOf = async (id) => conn.getFirstAsync('SELECT entry_typed, weight, actual_reps, updated_at FROM workout_sets WHERE id = ?', [id]);

  test.each([
    { label: 'true', cloud: true, expected: 1 },
    { label: 'false', cloud: false, expected: 0 },
    { label: 'null', cloud: null, expected: null },
    { label: '1 (an integer cloud column)', cloud: 1, expected: 1 },
    { label: '0 (an integer cloud column)', cloud: 0, expected: 0 },
    { label: 'an unreadable value', cloud: 'yes', expected: null },
    { label: 'a stray number', cloud: 2, expected: null },
  ])('a new row with a cloud value of $label is stored as $expected', async ({ label, cloud, expected }) => {
    const id = `pull-new-${label.replace(/\W+/g, '-')}`;
    await insertWorkoutSetFromCloud(U, cloudRow(id, T_OLD, { entry_typed: cloud }));
    expect((await localOf(id)).entry_typed).toBe(expected);
  });

  test('a new row whose cloud copy has no such key (the column not yet applied) is stored NULL', async () => {
    await insertWorkoutSetFromCloud(U, cloudRow('pull-new-absent', T_OLD));
    expect((await localOf('pull-new-absent')).entry_typed).toBeNull();
  });

  test.each([
    ['typed', 1],
    ['kept', 0],
  ])('a strictly newer cloud row with a NULL fact never overwrites a local %s value, though the row itself is replaced', async (_label, local) => {
    const id = `pull-keep-${_label}`;
    await insertWorkoutSetFromCloud(U, cloudRow(id, T_OLD, { entry_typed: local === 1 }));
    expect((await localOf(id)).entry_typed).toBe(local);

    await insertWorkoutSetFromCloud(U, cloudRow(id, T_NEW, { entry_typed: null, weight: 65, actual_reps: 7 }));

    const row = await localOf(id);
    expect(row.weight).toBe(65); // the newer cloud row was applied
    expect(row.actual_reps).toBe(7);
    expect(row.entry_typed).toBe(local); // and the local value survived the REPLACE
  });

  test('a strictly newer cloud row that omits the key keeps the local value too', async () => {
    await insertWorkoutSetFromCloud(U, cloudRow('pull-keep-absent', T_OLD, { entry_typed: true }));
    await insertWorkoutSetFromCloud(U, cloudRow('pull-keep-absent', T_NEW, { weight: 70 }));
    const row = await localOf('pull-keep-absent');
    expect(row.weight).toBe(70);
    expect(row.entry_typed).toBe(1);
  });

  test('a strictly newer cloud row that carries the fact replaces the local one', async () => {
    await insertWorkoutSetFromCloud(U, cloudRow('pull-replace', T_OLD, { entry_typed: false }));
    await insertWorkoutSetFromCloud(U, cloudRow('pull-replace', T_NEW, { entry_typed: true, weight: 67.5 }));
    const row = await localOf('pull-replace');
    expect(row.weight).toBe(67.5);
    expect(row.entry_typed).toBe(1);
  });

  test('a stale cloud row (not strictly newer) changes nothing, the fact included', async () => {
    await insertWorkoutSetFromCloud(U, cloudRow('pull-stale', T_NEW, { entry_typed: true }));
    await insertWorkoutSetFromCloud(U, cloudRow('pull-stale', T_OLD, { entry_typed: false, weight: 1 }));
    const row = await localOf('pull-stale');
    expect(row.entry_typed).toBe(1);
    expect(row.weight).toBe(60);
  });
});

describe('the local backup and restore carry the column untouched', () => {
  test('a dump holds entry_typed for each set (1, 0, NULL) and a restore puts the same values back', async () => {
    const UB = 'user-entry-typed-backup';
    const T = 1735000000000;
    await conn.runAsync(
      'INSERT INTO workouts (id, user_id, started_at, is_completed, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
      ['w-et-backup', UB, T, T, T],
    );
    const ids = [];
    for (const [n, entryTyped] of [[1, 1], [2, 0], [3, undefined]]) {
      const set = await createWorkoutSet({
        userId: UB, workoutId: 'w-et-backup', exerciseId: 'ex-et-backup', setNumber: n, actualReps: 8, weight: 60,
        ...(entryTyped === undefined ? {} : { entryTyped }),
      });
      ids.push(set.id);
    }

    const dump = await dumpAllTables(UB);
    const dumped = Object.fromEntries(dump.tables.workout_sets.map((r) => [r.id, r.entry_typed]));
    expect(dumped).toEqual({ [ids[0]]: 1, [ids[1]]: 0, [ids[2]]: null });

    await restoreAllTables(dump, UB);

    const back = await conn.getAllAsync('SELECT id, entry_typed FROM workout_sets WHERE user_id = ? ORDER BY set_number', [UB]);
    expect(back.map((r) => [r.id, r.entry_typed])).toEqual([[ids[0], 1], [ids[1], 0], [ids[2], null]]);
  });
});
