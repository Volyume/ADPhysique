/**
 * D230 R20 (lane 4B): the local step that adds custom_foods.portions_json.
 *
 * Real SQLite (node:sqlite) through the real init path, the harness of
 * database.entryTyped.test.js. Pins: a fresh install has the column once, as
 * nullable TEXT with no default; the step is its own additive schema version
 * with the header note the schema rules require; a pre-migration database
 * upgrades with every existing custom food reading NULL and nothing else
 * moved; running the step again changes nothing and throws on neither run.
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

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const { db, runMigrations, CURRENT_SCHEMA_VERSION } = require('../database');

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

test('a fresh install has custom_foods.portions_json once, nullable TEXT, no default', async () => {
  const conn = await db();
  const cols = (await conn.getAllAsync('PRAGMA table_info(custom_foods)')).filter((c) => c.name === 'portions_json');
  expect(cols).toHaveLength(1);
  expect(String(cols[0].type).toUpperCase()).toBe('TEXT');
  expect(cols[0].notnull).toBe(0);
  expect(cols[0].dflt_value).toBeNull();
});

test('is its own additive schema version with the header note the schema rules require', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
  const op = "'ALTER TABLE custom_foods ADD COLUMN portions_json TEXT'";
  expect(src.split(op).length - 1).toBe(1);
  expect(src).toMatch(/\[\s*'ALTER TABLE custom_foods ADD COLUMN portions_json TEXT',\s*\],/);
  const previous = src.indexOf("'ALTER TABLE food_entries ADD COLUMN note TEXT',");
  expect(previous).toBeGreaterThan(-1);
  const header = src.slice(previous, src.indexOf(op));
  for (const word of ['Purpose', 'Applied locally', 'Applied remotely', 'Safe to re-run', 'Rollback', 'migrate_195', 'HELD']) {
    expect(header).toContain(word);
  }
});

describe('upgrading a database that lacks the column', () => {
  function preMigrationDb() {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE food_entries (id TEXT PRIMARY KEY)');
    raw.exec('CREATE TABLE custom_foods (id TEXT PRIMARY KEY, name TEXT, serving_g REAL, updated_at INTEGER)');
    raw.prepare('INSERT INTO custom_foods (id, name, serving_g, updated_at) VALUES (?, ?, ?, ?)').run('cf-old', 'Toast', 36, 111);
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 1}`);
    return raw;
  }

  test('adds the column once, every existing row reads NULL, nothing else moves', async () => {
    const raw = preMigrationDb();
    await runMigrations(adaptRaw(raw));
    const cols = raw.prepare('PRAGMA table_info(custom_foods)').all().filter((c) => c.name === 'portions_json');
    expect(cols).toHaveLength(1);
    expect(raw.prepare('SELECT * FROM custom_foods WHERE id = ?').get('cf-old'))
      .toEqual({ id: 'cf-old', name: 'Toast', serving_g: 36, updated_at: 111, portions_json: null });
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  test('is safe to re-run: a second boot at the old version changes nothing and throws on neither run', async () => {
    const raw = preMigrationDb();
    await runMigrations(adaptRaw(raw));
    raw.prepare('UPDATE custom_foods SET portions_json = ? WHERE id = ?').run('[{"label":"1 mug","grams":250}]', 'cf-old');
    const before = raw.prepare('SELECT * FROM custom_foods WHERE id = ?').get('cf-old');
    raw.exec(`PRAGMA user_version = ${CURRENT_SCHEMA_VERSION - 1}`);
    await expect(runMigrations(adaptRaw(raw))).resolves.not.toThrow();
    expect(raw.prepare('PRAGMA table_info(custom_foods)').all().filter((c) => c.name === 'portions_json')).toHaveLength(1);
    expect(raw.prepare('SELECT * FROM custom_foods WHERE id = ?').get('cf-old')).toEqual(before);
    expect(raw.prepare('PRAGMA user_version').get().user_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});
