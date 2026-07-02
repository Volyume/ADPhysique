/**
 * E3 search: end-to-end pins for the FTS5 local search, run against a REAL
 * SQLite (node:sqlite, Node 22) with the REAL index DDL
 * (database.ensureFoodSearchIndex) and the REAL query module
 * (localCache.searchLocalByName). What must hold:
 *   - partial multi-word queries hit ("chick brea" -> Chicken Breast);
 *   - brand terms match (the LIKE path never searched brand);
 *   - user text can never be parsed as FTS syntax (operators are quoted out);
 *   - customs rank first, soft-deleted and other users' customs never appear;
 *   - rank stays 0 for an exact name-prefix match (the waterfall's
 *     local-confidence signal);
 *   - the triggers keep the index live across INSERT / UPDATE / DELETE;
 *   - with no FTS tables the LIKE fallback answers (pre-E3 behaviour);
 *   - the whole DDL is re-runnable (additive + idempotent).
 */

let mockHandle;
jest.mock('../../database', () => {
  const actual = jest.requireActual('../../database');
  return { ...actual, db: jest.fn(async () => mockHandle) };
});

const { DatabaseSync } = require('node:sqlite');
const { ensureFoodSearchIndex } = require('../../database');
const { searchLocalByName, toFtsMatch } = require('../sources/localCache');

// expo-sqlite-shaped adapter over node:sqlite.
function adapt(raw) {
  return {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => raw.prepare(sql).run(...params),
  };
}

function freshDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE foods (
    id TEXT PRIMARY KEY, source TEXT, source_id TEXT, barcode_ean TEXT,
    name TEXT, brand TEXT, serving_g REAL, serving_label TEXT,
    kcal_100g REAL, protein_100g REAL, carbs_100g REAL, fat_100g REAL,
    fibre_100g REAL, sodium_100g REAL, sugar_100g REAL,
    verified INTEGER DEFAULT 0, fetched_at INTEGER, created_at INTEGER, updated_at INTEGER)`);
  raw.exec(`CREATE TABLE custom_foods (
    id TEXT PRIMARY KEY, user_id TEXT, name TEXT, brand TEXT,
    serving_g REAL, serving_label TEXT,
    kcal_100g REAL, protein_100g REAL, carbs_100g REAL, fat_100g REAL,
    fibre_100g REAL, sodium_100g REAL, sugar_100g REAL,
    barcode_ean TEXT, deleted_at INTEGER, created_at INTEGER, updated_at INTEGER)`);
  return raw;
}

function seedFood(raw, id, name, brand = null, verified = 0) {
  raw.prepare(
    `INSERT INTO foods (id, source, name, brand, kcal_100g, verified) VALUES (?, 'off', ?, ?, 100, ?)`
  ).run(id, name, brand, verified);
}

function seedCustom(raw, id, userId, name, deletedAt = null) {
  raw.prepare(
    `INSERT INTO custom_foods (id, user_id, name, kcal_100g, deleted_at) VALUES (?, ?, ?, 100, ?)`
  ).run(id, userId, name, deletedAt);
}

async function buildIndexed() {
  const raw = freshDb();
  seedFood(raw, 'f1', 'Chicken Breast', null, 1);
  seedFood(raw, 'f2', 'Greek Yoghurt', 'Fage');
  seedFood(raw, 'f3', 'Wholemeal Bread', 'Hovis');
  seedCustom(raw, 'c1', 'u1', 'My Protein Shake');
  seedCustom(raw, 'c2', 'u1', 'Old Chicken Thing', Date.now()); // soft-deleted
  seedCustom(raw, 'c3', 'u2', 'Chicken Curry Batch');           // another user
  mockHandle = adapt(raw);
  await ensureFoodSearchIndex(mockHandle);
  return raw;
}

afterEach(() => { mockHandle = null; });

describe('toFtsMatch', () => {
  test('words become quoted prefix tokens', () => {
    expect(toFtsMatch('chick brea')).toBe('"chick"* "brea"*');
  });
  test('FTS operators and quotes are neutralised, never syntax', () => {
    expect(toFtsMatch('bread" OR x')).toBe('"bread"* "or"* "x"*');
    expect(toFtsMatch('a-b NEAR(c)')).toBe('"a"* "b"* "near"* "c"*');
  });
  test('nothing tokenisable is null', () => {
    expect(toFtsMatch('  "!  ')).toBeNull();
    expect(toFtsMatch('')).toBeNull();
  });
});

describe('searchLocalByName over the real FTS index', () => {
  test('partial multi-word query hits: "chick brea" finds Chicken Breast', async () => {
    await buildIndexed();
    const rows = await searchLocalByName('u1', 'chick brea');
    expect(rows.map((r) => r.name)).toEqual(['Chicken Breast']);
    // Not a literal name prefix ("chicken " continues after "chick"), so the
    // waterfall's rank signal stays 1 — token matching widens RECALL without
    // inflating the local-confidence score.
    expect(rows[0].rank).toBe(1);
  });

  test('a literal name-prefix query keeps rank 0 (the strong local signal)', async () => {
    await buildIndexed();
    const rows = await searchLocalByName('u1', 'chicken b');
    expect(rows[0].name).toBe('Chicken Breast');
    expect(rows[0].rank).toBe(0);
  });

  test('brand terms match (new under FTS; LIKE never searched brand)', async () => {
    await buildIndexed();
    const rows = await searchLocalByName('u1', 'fage');
    expect(rows.map((r) => r.name)).toEqual(['Greek Yoghurt']);
    expect(rows[0].rank).toBe(1); // not a name prefix
  });

  test("the user's own custom food ranks before globals", async () => {
    await buildIndexed();
    const rows = await searchLocalByName('u1', 'protein');
    expect(rows[0].food_ref).toBe('custom:c1');
  });

  test('soft-deleted and other-user customs never appear', async () => {
    await buildIndexed();
    const rows = await searchLocalByName('u1', 'chicken');
    const refs = rows.map((r) => r.food_ref);
    expect(refs).toContain('global:f1');
    expect(refs).not.toContain('custom:c2');
    expect(refs).not.toContain('custom:c3');
  });

  test('hostile query text neither throws nor leaks operators', async () => {
    await buildIndexed();
    await expect(searchLocalByName('u1', 'bread" OR 1 NEAR( -x ^y')).resolves.toBeTruthy();
  });

  test('rows carry the full food shape including sodium and sugar columns', async () => {
    await buildIndexed();
    const [row] = await searchLocalByName('u1', 'yoghurt');
    for (const key of ['food_ref', 'source', 'name', 'brand', 'serving_g', 'kcal_100g', 'sodium_100g', 'sugar_100g', 'rank']) {
      expect(row).toHaveProperty(key);
    }
  });

  test('triggers keep the index live: insert, rename, delete', async () => {
    const raw = await buildIndexed();
    seedFood(raw, 'f9', 'Porridge Oats');
    expect((await searchLocalByName('u1', 'porridge')).map((r) => r.name)).toEqual(['Porridge Oats']);

    raw.prepare(`UPDATE foods SET name = 'Jumbo Oats' WHERE id = 'f9'`).run();
    expect(await searchLocalByName('u1', 'porridge')).toEqual([]);
    expect((await searchLocalByName('u1', 'jumbo')).map((r) => r.name)).toEqual(['Jumbo Oats']);

    raw.prepare(`DELETE FROM foods WHERE id = 'f9'`).run();
    expect(await searchLocalByName('u1', 'jumbo')).toEqual([]);
  });

  test('the DDL is idempotent: running ensureFoodSearchIndex twice is safe', async () => {
    await buildIndexed();
    await expect(ensureFoodSearchIndex(mockHandle)).resolves.toBeUndefined();
    const rows = await searchLocalByName('u1', 'chicken breast');
    expect(rows.map((r) => r.name)).toEqual(['Chicken Breast']); // no duplicates
  });

  test('a sync-style upsert (ON CONFLICT DO UPDATE) keeps the index exact — REPLACE corruption cannot recur', async () => {
    // E3 review: INSERT OR REPLACE deletes the old row WITHOUT firing the
    // FTS delete trigger (recursive_triggers is off) and moves the rowid,
    // orphaning the old name's tokens. The sync pull now uses a true upsert;
    // this pins, on real SQLite with the real DDL, that an upsert rename
    // updates the index (old name gone, new name found, no phantom row) —
    // and that the sync code never reverts to REPLACE.
    const raw = await buildIndexed();
    raw.prepare(
      `INSERT INTO custom_foods (id, user_id, name, kcal_100g) VALUES ('c1', 'u1', 'Renamed Shake', 100)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name`
    ).run();
    expect(await searchLocalByName('u1', 'protein')).toEqual([]);
    expect((await searchLocalByName('u1', 'renamed')).map((r) => r.food_ref)).toEqual(['custom:c1']);

    const fs = require('fs');
    const path = require('path');
    const dbSrc = fs.readFileSync(path.resolve(__dirname, '../db.js'), 'utf8');
    expect(dbSrc).not.toMatch(/INSERT OR REPLACE INTO custom_foods/);
    expect(dbSrc).toMatch(/INSERT INTO custom_foods \([\s\S]{0,600}ON CONFLICT\(id\) DO UPDATE SET/);
  });

  test('the sign-out wipe rebuilds the index so the next account inherits no tokens', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../database.js'), 'utf8');
    const wipeAt = src.indexOf('export async function wipeAllUserData');
    const wipeBody = src.slice(wipeAt, src.indexOf('\nexport ', wipeAt + 1));
    expect(wipeBody).toMatch(/custom_foods_fts\(custom_foods_fts\) VALUES\('rebuild'\)/);
  });

  test('the migration swallows ONLY a missing FTS5 module; other errors rethrow and retry', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '../../database.js'), 'utf8');
    const at = src.indexOf('export async function ensureFoodSearchIndex');
    const body = src.slice(at, src.indexOf('\nexport ', at + 1));
    expect(body).toMatch(/msg\.includes\('no such module'\) \|\| msg\.includes\('fts5'\)/);
    expect(body).toMatch(/throw e;/);
  });

  test('without the FTS tables the LIKE fallback answers (pre-E3 behaviour)', async () => {
    const raw = freshDb();
    seedFood(raw, 'f1', 'Chicken Breast');
    mockHandle = adapt(raw); // NO ensureFoodSearchIndex
    const rows = await searchLocalByName('u1', 'chicken');
    expect(rows.map((r) => r.name)).toEqual(['Chicken Breast']);
    // Multi-word partials are exactly the LIKE ceiling E3 lifts: they miss.
    expect(await searchLocalByName('u1', 'chick brea')).toEqual([]);
  });
});
