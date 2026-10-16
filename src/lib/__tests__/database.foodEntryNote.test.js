/**
 * D230 R20: food_entries.note, the local schema step (cloud counterpart
 * supabase/migrate_194_food_entries_note.sql, WRITTEN, HELD).
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the real runMigrations. It
 * pins, each written to fail on the code before this lane (no step):
 *  - the step adds `food_entries.note` TEXT, nullable, with no default, so a
 *    pre-migration row reads NULL and nothing else about it moves;
 *  - it adds the column exactly once and is safe to re-run: a second run from
 *    the pre-migration version throws nothing and leaves the row and the
 *    column list as they were (the benign duplicate-column skip);
 *  - the step carries the header the schema rule requires (purpose, applied
 *    locally, applied remotely, safe to re-run, rollback) and names migrate_194;
 *  - it is ADDITIVE: one ALTER ... ADD COLUMN, nothing dropped or renamed.
 *
 * Head independence: this file does not hard-code how far the step sits from
 * the head. It probes the smallest last-N window that adds the column (the
 * windows are tiny, so the fixtures only need the tables those later steps
 * touch), then asserts the pins at that window. A later step that needs a
 * table this fixture does not create fails here and is re-anchored like the
 * other head-relative suites (see "re-anchor" in database.entryTyped.test.js).
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
const { runMigrations, CURRENT_SCHEMA_VERSION } = require('../database');

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

// A pre-migration database: food_entries as it was (no note), plus an empty
// stand-in for every table the few steps after this one ALTER.
function preMigrationDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE food_entries (id TEXT PRIMARY KEY, user_id TEXT, entry_date TEXT, kcal REAL)');
  raw.exec('CREATE TABLE custom_foods (id TEXT PRIMARY KEY)');
  raw.prepare('INSERT INTO food_entries (id, user_id, entry_date, kcal) VALUES (?, ?, ?, ?)').run('old-1', 'u', '2026-10-01', 250);
  return raw;
}

const noteColumns = (raw) => raw.prepare('PRAGMA table_info(food_entries)').all().filter((c) => c.name === 'note');

// The smallest window (counted back from the head) whose run adds the column.
async function probeWindow() {
  for (let k = 1; k <= 8; k += 1) {
    const raw = preMigrationDb();
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - k}`);
    try {
      // eslint-disable-next-line no-await-in-loop
      await runMigrations(adaptRaw(raw));
    } catch (_) { continue; }
    if (noteColumns(raw).length === 1) return k;
  }
  throw new Error('no window of 8 steps adds food_entries.note');
}

describe('the local migration', () => {
  test('adds food_entries.note once, nullable with no default; an existing row reads NULL and nothing else moves', async () => {
    const k = await probeWindow();
    const raw = preMigrationDb();
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - k}`);
    await runMigrations(adaptRaw(raw));

    const cols = noteColumns(raw);
    expect(cols).toHaveLength(1);
    expect(cols[0].type).toBe('TEXT');
    expect(cols[0].notnull).toBe(0);
    expect(cols[0].dflt_value).toBeNull();
    expect(raw.prepare('SELECT * FROM food_entries WHERE id = ?').get('old-1'))
      .toEqual({ id: 'old-1', user_id: 'u', entry_date: '2026-10-01', kcal: 250, note: null });
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('is safe to re-run: a second run from the pre-migration version changes nothing and throws on neither run', async () => {
    const k = await probeWindow();
    const raw = preMigrationDb();
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - k}`);
    await runMigrations(adaptRaw(raw));
    raw.prepare('UPDATE food_entries SET note = ? WHERE id = ?').run('kept', 'old-1');
    const before = raw.prepare('SELECT * FROM food_entries').all();

    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - k}`);
    await expect(runMigrations(adaptRaw(raw))).resolves.not.toThrow();

    expect(noteColumns(raw)).toHaveLength(1);
    expect(raw.prepare('SELECT * FROM food_entries').all()).toEqual(before);
  });

  test('the step is one additive ALTER with the header the schema rule requires', () => {
    const src = fs.readFileSync(path.join(__dirname, '../database.js'), 'utf8');
    const op = "'ALTER TABLE food_entries ADD COLUMN note TEXT',";
    expect(src.split(op).length - 1).toBe(1);
    expect(src).toMatch(/\[\s*'ALTER TABLE food_entries ADD COLUMN note TEXT',\s*\],/);
    const header = src.slice(src.indexOf(op) - 2600, src.indexOf(op));
    for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'migrate_194']) {
      expect(header).toContain(word);
    }
    // Fresh installs: the CREATE TABLE names the column too.
    const create = src.slice(src.indexOf('CREATE TABLE IF NOT EXISTS food_entries ('), src.indexOf('idx_food_entries_user_date_slot'));
    expect(create).toMatch(/note TEXT/);
  });
});
