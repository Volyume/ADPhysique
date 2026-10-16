/**
 * The note on a diary entry (D230 R20, food level-up lane 4A;
 * docs/audit/food-levelup-2026-10-16/03-ASSESSMENT-AND-PLAN.md section 3, R20).
 * Local column food_entries.note (a schema step in database.js), cloud
 * counterpart supabase/migrate_194_food_entries_note.sql, WRITTEN, HELD.
 *
 * Run against a REAL SQLite (node:sqlite) through the REAL database.js init
 * path (the real food_entries DDL, which carries the column). Only the edges
 * are mocked: sync, telemetry, the meal-reminder stand-down. Each pin is
 * written to fail on the code before this lane (no column, no validation, no
 * writer, a pull that REPLACEd the row and lost the note):
 *
 *  - the note round-trips: logFoodEntry, logFoodEntries (the batch), read
 *    (getFoodEntriesForDay), edit (updateFoodEntry), the in-place Diary row
 *    (entryRowFromPayload) and the copy path (copyEntriesToDate);
 *  - blank or absent saves NULL (one stored shape for "no note"); the value is
 *    trimmed; more than 120 characters, or a non-string, is refused by the
 *    SAME validators a single write and a batch both use, and the batch is
 *    all-or-nothing;
 *  - an edit that does not mention the note leaves it alone; a bulk "move"
 *    (updateFoodEntries) keeps it;
 *  - the pull maps `note` when the cloud row carries it, leaves this device's
 *    note alone when the key is absent (the column is not applied yet), and
 *    never stores an over-long or non-string value;
 *  - the push record has NO `note` key while FOOD_ENTRY_NOTE_PUSH is false and
 *    has it when true; the flag is false, and migrate_194 says HELD;
 *  - a note is never in a telemetry event (food_logged carries the food
 *    source and the meal only) and never in the PDF (csvExport.test.js).
 */
const mockState = { statements: [] };

jest.mock('../../dbCrypto', () => {
  const { DatabaseSync } = require('node:sqlite');
  const raw = new DatabaseSync(':memory:');
  const adapt = {
    execAsync: async (sql) => raw.exec(sql),
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params),
    getFirstAsync: async (sql, params = []) => raw.prepare(sql).get(...params) ?? null,
    runAsync: async (sql, params = []) => {
      mockState.statements.push(sql);
      const r = raw.prepare(sql).run(...params);
      return { changes: Number(r.changes ?? 0), lastInsertRowId: Number(r.lastInsertRowid ?? 0) };
    },
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try { await fn(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
const mockTrack = jest.fn(() => Promise.resolve());
jest.mock('../../engineTelemetry', () => ({ track: (...a) => mockTrack(...a) }));
jest.mock('../../telemetry/firsts', () => ({ trackFirst: () => Promise.resolve() }));
jest.mock('../../notifications/standDown', () => ({ standDownMeal: () => Promise.resolve(true) }));
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const fs = require('fs');
const path = require('path');
const dbm = require('../../database');
const food = require('../db');
const bulk = require('../bulkEntryOps');
const { entryRowFromPayload } = require('../diaryInPlace');
const { buildFoodEntryPayload } = require('../loggingPayloads');
const { cleanFoodNote, displayFoodNote } = require('../entryNote');
const { __raw: raw } = require('../../dbCrypto');

const D = '2026-04-02';
const D2 = '2026-04-03';
let userSeq = 0;
const freshUser = () => `u-note-${++userSeq}`;
const row = (over = {}) => ({
  entryDate: D, mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60,
  kcal: 227, proteinG: 8, carbsG: 36, fatG: 5, fibreG: 6, ...over,
});
const stored = (id) => raw.prepare('SELECT * FROM food_entries WHERE id = ?').get(id);
const patchFor = (over = {}) => ({
  mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60,
  kcal: 227, proteinG: 8, carbsG: 36, fatG: 5, fibreG: 6, ...over,
});

beforeAll(async () => { await dbm.db(); });
beforeEach(() => { jest.clearAllMocks(); mockState.statements.length = 0; });

describe('cleanFoodNote', () => {
  test('the one definition of a clean note', () => {
    expect(cleanFoodNote(undefined)).toBeUndefined();
    expect(cleanFoodNote(null)).toBeNull();
    expect(cleanFoodNote('')).toBeNull();
    expect(cleanFoodNote('   ')).toBeNull();
    expect(cleanFoodNote('  with butter ')).toBe('with butter');
    expect(cleanFoodNote('a'.repeat(120))).toBe('a'.repeat(120));
    expect(cleanFoodNote('a'.repeat(121))).toBe(false);
    expect(cleanFoodNote(42)).toBe(false);
    expect(cleanFoodNote({})).toBe(false);
    expect(displayFoodNote('  hi ')).toBe('hi');
    expect(displayFoodNote(7)).toBeNull();
    expect(displayFoodNote('b'.repeat(300))).toHaveLength(120);
  });
});

describe('the local column', () => {
  test('food_entries carries a nullable TEXT note column on a fresh install', () => {
    const col = raw.prepare('PRAGMA table_info(food_entries)').all().find((c) => c.name === 'note');
    expect(col).toBeTruthy();
    expect(col.type).toBe('TEXT');
    expect(col.notnull).toBe(0);
    expect(col.dflt_value).toBeNull();
  });
});

describe('write: logFoodEntry and logFoodEntries', () => {
  test('logFoodEntry stores the trimmed note; blank and absent store NULL', async () => {
    const u = freshUser();
    const a = await food.logFoodEntry(u, row({ note: '  with the good butter  ' }));
    const b = await food.logFoodEntry(u, row({ note: '   ' }));
    const c = await food.logFoodEntry(u, row());
    const d = await food.logFoodEntry(u, row({ note: null }));
    expect(stored(a).note).toBe('with the good butter');
    expect(stored(b).note).toBeNull();
    expect(stored(c).note).toBeNull();
    expect(stored(d).note).toBeNull();
  });

  test('a note over 120 characters, or not a string, is refused and nothing is written', async () => {
    const u = freshUser();
    await expect(food.logFoodEntry(u, row({ note: 'x'.repeat(121) }))).rejects.toThrow('invalid food values');
    await expect(food.logFoodEntry(u, row({ note: 12 }))).rejects.toThrow('invalid food values');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM food_entries WHERE user_id = ?').get(u).n).toBe(0);
    // The 1 to 5000 g bound is untouched by a valid note.
    await expect(food.logFoodEntry(u, row({ quantityG: 5001, note: 'ok' }))).rejects.toThrow('between 1 and 5000 g');
  });

  test('logFoodEntries writes each row\'s note, and one bad note anywhere writes nothing', async () => {
    const u = freshUser();
    const ids = await food.logFoodEntries(u, [row({ note: 'first' }), row({ foodRef: 'global:milk' }), row({ foodRef: 'quick:adhoc', quantityG: 0, note: 'Curry at Raj\'s' })]);
    expect(ids.map((id) => stored(id).note)).toEqual(['first', null, 'Curry at Raj\'s']);
    await expect(food.logFoodEntries(u, [row({ note: 'fine' }), row({ note: 'y'.repeat(121) })])).rejects.toThrow('row 2');
    expect(raw.prepare('SELECT COUNT(*) AS n FROM food_entries WHERE user_id = ?').get(u).n).toBe(3);
  });

  test('buildFoodEntryPayload carries a note only when there is one', () => {
    const base = { entryDate: D, mealSlot: 'meal_1', foodRef: 'global:oats', quantityG: 60, food: { kcal_100g: 100, protein_100g: 1, carbs_100g: 1, fat_100g: 1 } };
    expect(buildFoodEntryPayload(base)).not.toHaveProperty('note');
    expect(buildFoodEntryPayload({ ...base, note: '' })).not.toHaveProperty('note');
    expect(buildFoodEntryPayload({ ...base, note: 'hi' }).note).toBe('hi');
  });
});

describe('read, edit and the in-place row', () => {
  test('getFoodEntriesForDay returns the note', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, row({ note: 'readable' }));
    const rows = await food.getFoodEntriesForDay(u, D);
    expect(rows).toHaveLength(1);
    expect(rows[0].note).toBe('readable');
  });

  test('updateFoodEntry: a patch that does not mention the note keeps it; text replaces it; blank clears it', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, row({ note: 'kept' }));
    expect(await food.updateFoodEntry(id, u, patchFor({ quantityG: 80 }))).not.toBe(false);
    expect(stored(id).note).toBe('kept');
    await food.updateFoodEntry(id, u, patchFor({ note: '  changed ' }));
    expect(stored(id).note).toBe('changed');
    await food.updateFoodEntry(id, u, patchFor({ note: '' }));
    expect(stored(id).note).toBeNull();
    await food.updateFoodEntry(id, u, patchFor({ note: 'back' }));
    await food.updateFoodEntry(id, u, patchFor({ note: null }));
    expect(stored(id).note).toBeNull();
  });

  test('updateFoodEntry refuses an over-long note and leaves the row as it was', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, row({ note: 'safe' }));
    await expect(food.updateFoodEntry(id, u, patchFor({ note: 'z'.repeat(121) }))).rejects.toThrow('invalid food values');
    expect(stored(id).note).toBe('safe');
  });

  test('a bulk move (updateFoodEntries) keeps each row\'s note', async () => {
    const u = freshUser();
    const id = await food.logFoodEntry(u, row({ note: 'moves with it' }));
    await food.updateFoodEntries(u, [{ id, patch: patchFor({ mealSlot: 'meal_2' }) }]);
    expect(stored(id)).toEqual(expect.objectContaining({ meal_slot: 'meal_2', note: 'moves with it' }));
  });

  test('entryRowFromPayload carries the note (null when there is none)', () => {
    const withNote = entryRowFromPayload({ id: 'x', userId: 'u', payload: { entryDate: D, mealSlot: 'meal_1', foodRef: 'global:a', quantityG: 1, kcal: 1, proteinG: 0, carbsG: 0, fatG: 0, note: 'n' }, food: null, now: 5 });
    const without = entryRowFromPayload({ id: 'x', userId: 'u', payload: { entryDate: D, mealSlot: 'meal_1', foodRef: 'global:a', quantityG: 1, kcal: 1, proteinG: 0, carbsG: 0, fatG: 0 }, food: null, now: 5 });
    expect(withNote.note).toBe('n');
    expect(without.note).toBeNull();
  });
});

describe('copy', () => {
  test('copyEntriesToDate carries the note to the new day', async () => {
    const u = freshUser();
    await food.logFoodEntries(u, [row({ note: 'copy me' }), row({ foodRef: 'global:milk' })]);
    const source = await food.getFoodEntriesForDay(u, D);
    const { ids } = await bulk.copyEntriesToDate(u, source, D2);
    expect(ids).toHaveLength(2);
    const copied = await food.getFoodEntriesForDay(u, D2);
    expect(copied.map((r) => r.note).sort((a, b) => String(a).localeCompare(String(b)))).toEqual([null, 'copy me'].sort((a, b) => String(a).localeCompare(String(b))));
  });
});

describe('pull: applyFoodEntryFromCloud', () => {
  const cloud = (id, over = {}) => ({
    id, meal_slot: 'meal_1', food_ref: 'global:oats', quantity_g: 60, kcal: 227,
    protein_g: 8, carbs_g: 36, fat_g: 5, fibre_g: 6, weight_state: 'as_weighed',
    logged_at: '2026-04-02T09:00:00.000Z', created_at: '2026-04-02T09:00:00.000Z',
    updated_at: '2026-04-02T09:00:01.000Z', ...over,
  });

  test('maps a present note, including a cloud NULL', async () => {
    const u = freshUser();
    await food.applyFoodEntryFromCloud(u, cloud('c1', { note: 'from the cloud' }));
    expect(stored('c1').note).toBe('from the cloud');
    await food.applyFoodEntryFromCloud(u, cloud('c1', { note: null, updated_at: '2026-04-02T10:00:00.000Z' }));
    expect(stored('c1').note).toBeNull();
  });

  test('tolerates a record without the key: this device\'s note is kept, and a new row reads NULL', async () => {
    const u = freshUser();
    await food.applyFoodEntryFromCloud(u, cloud('c2'));
    expect(stored('c2').note).toBeNull();
    raw.prepare('UPDATE food_entries SET note = ? WHERE id = ?').run('mine', 'c2');
    await food.applyFoodEntryFromCloud(u, cloud('c2', { updated_at: '2026-04-02T11:00:00.000Z', quantity_g: 70 }));
    expect(stored('c2')).toEqual(expect.objectContaining({ quantity_g: 70, note: 'mine' }));
  });

  test('never stores an over-long or non-string note from the cloud', async () => {
    const u = freshUser();
    await food.applyFoodEntryFromCloud(u, cloud('c3', { note: 'q'.repeat(500) }));
    expect(stored('c3').note).toBeNull();
    await food.applyFoodEntryFromCloud(u, cloud('c4', { note: { a: 1 } }));
    expect(stored('c4').note).toBeNull();
  });
});

describe('push: the flag', () => {
  const localRow = { id: 'e1', entry_date: D, meal_slot: 'meal_1', food_ref: 'global:oats', quantity_g: 60, kcal: 1, protein_g: 1, carbs_g: 1, fat_g: 1, note: 'a note' };

  function mapperWithFlag(value) {
    let mapper;
    jest.isolateModules(() => {
      jest.doMock('../../sync/featureFlags', () => ({ ...jest.requireActual('../../sync/featureFlags'), FOOD_ENTRY_NOTE_PUSH: value }));
      mapper = require('../../sync/tables/foodDomain')._foodEntryToCloud;
    });
    jest.dontMock('../../sync/featureFlags');
    return mapper;
  }

  test('with the flag false the pushed record has NO note key (not even null)', () => {
    const rec = mapperWithFlag(false)(localRow, 'u1');
    expect(Object.keys(rec)).not.toContain('note');
    expect(JSON.stringify(rec)).not.toContain('a note');
  });

  test('with the flag true the pushed record carries the note, or null', () => {
    expect(mapperWithFlag(true)(localRow, 'u1').note).toBe('a note');
    expect(mapperWithFlag(true)({ ...localRow, note: undefined }, 'u1').note).toBeNull();
  });

  test('the flag is FALSE in the tree, the migration says HELD, and the README row says HELD', () => {
    const flags = fs.readFileSync(path.join(__dirname, '../../sync/featureFlags.js'), 'utf8');
    expect(flags).toMatch(/export const FOOD_ENTRY_NOTE_PUSH = false;/);
    const sql = fs.readFileSync(path.join(__dirname, '../../../../supabase/migrate_194_food_entries_note.sql'), 'utf8');
    const header = sql.slice(0, sql.indexOf('DO $$'));
    expect(header).toMatch(/Applied remotely:\s+NO\. HELD/);
    expect(header).toContain('Purpose:');
    expect(header).toContain('Applied locally:');
    expect(header).toContain('Safe to re-run:');
    expect(header).toContain('Rollback:');
    expect(header).toContain('Depends on:');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS note text');
    expect(sql).toMatch(/DROP COLUMN IF EXISTS note/);
    const readme = fs.readFileSync(path.join(__dirname, '../../../../supabase/README.md'), 'utf8');
    const line = readme.split('\n').find((l) => l.startsWith('| 194 |'));
    expect(line).toBeTruthy();
    expect(line).toContain('HELD');
  });

  test('migrate_194 re-issues food_sync_push with note in the insert and the update, and touches no other branch', () => {
    const sql = fs.readFileSync(path.join(__dirname, '../../../../supabase/migrate_194_food_entries_note.sql'), 'utf8');
    const prior = fs.readFileSync(path.join(__dirname, '../../../../supabase/migrate_118_workouts_recipes_sync_schema_fix.sql'), 'utf8');
    const body = (s) => s.slice(s.indexOf('CREATE OR REPLACE FUNCTION public.food_sync_push'), s.indexOf('$function$;') + 11);
    const strip = (s) => s
      .replace(/ weight_state, eaten_at, note,\n/, ' weight_state, eaten_at,\n')
      .replace(/\n\s+NULLIF\(left\(v_row->>'note', 120\), ''\),/, '')
      .replace(/\n\s+-- note: written only[^\n]*\n\s+-- build that predates[^\n]*\n\s+note = CASE[^\n]*/, '');
    expect(strip(body(sql))).toBe(body(prior));
    expect(body(sql)).toContain("NULLIF(left(v_row->>'note', 120), '')");
    expect(body(sql)).toContain("note = CASE WHEN v_row ? 'note'");
  });
});

describe('privacy: a note is the person\'s own text', () => {
  test('no telemetry event carries it', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, row({ note: 'SECRET-NOTE-TEXT' }));
    await food.logFoodEntries(u, [row({ note: 'SECRET-NOTE-TEXT' })]);
    expect(mockTrack).toHaveBeenCalled();
    expect(JSON.stringify(mockTrack.mock.calls)).not.toContain('SECRET-NOTE-TEXT');
    // Source-level: no track( call in the food db reads a note at all.
    const src = fs.readFileSync(path.join(__dirname, '../db.js'), 'utf8');
    const trackBlocks = src.match(/track\(userId,[\s\S]*?\}\)/g) ?? [];
    expect(trackBlocks.length).toBeGreaterThan(0);
    trackBlocks.forEach((b) => expect(b).not.toMatch(/note/i));
  });
});
