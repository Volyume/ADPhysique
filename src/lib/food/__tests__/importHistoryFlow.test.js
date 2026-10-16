/**
 * importHistoryFlow.js, the I/O half of "Import food history" (D230 R21, lane
 * 4C): pick, review, import, cancel, re-import.
 *
 * Run against a REAL SQLite (node:sqlite) through the REAL database.js init
 * path and the REAL food/db.js writes (insertCustomFood, logFoodEntries, the
 * rollups), with the same expo-sqlite-shaped adapter the batched-writes suite
 * uses, so a rolled-back batch is SQLite's own. Only the edges are mocked: the
 * picker and file system, sync, telemetry, the meal-reminder scheduler.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - PICK. Only CSV and plain text types are offered; a cancelled pick reads
 *    nothing and returns { cancelled }; a file over 10 MB is refused with a
 *    calm sentence before it is read; a file that is neither export is refused
 *    whole before anything is written.
 *  - REVIEW BEFORE WRITE. planFromText writes nothing: the diary is the same
 *    after it as before.
 *  - IMPORT. Every row lands as an actual on its own date and meal, with R21's
 *    note in food_entries.note, and the day's rollup is the sum.
 *  - NOTHING OVERWRITTEN. A day the person already logged keeps exactly its
 *    own rows. A second import of the same file adds nothing and saves no food
 *    twice; and a stale plan written twice adds nothing the second time
 *    (the write reads the diary again before it starts).
 *  - CUSTOM FOODS. One per unique Cronometer name in grams; a name already
 *    saved (in any case) is reused; entries point at custom:<id>.
 *  - PARTIAL FAILURE. Batches are whole days; a batch that fails rolls back
 *    whole, the throw says how many were written, and importing the file
 *    again adds exactly the days that are missing.
 *  - QUIET. The import itself raises no flag, runs no coaching and lays no
 *    reminder: the scheduler's re-lay is never called for past days, and the
 *    flow's source imports nothing from the coaching, safety, notification,
 *    telemetry or network modules. It sends no per-row `food_logged` and no
 *    `first_food_logged` (logFoodEntries' `telemetry: false`).
 *  - NO INVENTED TIME. A row the file did not time is stored with eaten_at
 *    NULL (logFoodEntries' `keepUntimed`), never the moment of the import.
 *  - OWN DAYS, FOR GOOD. Imported rows keep their dates through their own push
 *    coming back in the pull, through a fresh-device pull and through the
 *    TZ-1 re-key, even imported at 00:30 BST for the day before (the one
 *    window where the key looks like the old UTC key).
 */
const mockState = { realTx: false, inTx: false, transactions: 0 };

jest.mock('../../dbCrypto', () => {
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
    withTransactionAsync: async (fn) => {
      if (!mockState.realTx) { await fn(); return; }
      mockState.transactions += 1;
      raw.exec('BEGIN');
      mockState.inTx = true;
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      } finally {
        mockState.inTx = false;
      }
    },
    isInTransactionSync: () => mockState.inTx,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
const mockRelay = jest.fn(() => Promise.resolve());
jest.mock('../../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: (...a) => mockRelay(...a),
}));

const fs = require('fs');
const path = require('path');
const DocumentPicker = require('expo-document-picker');
const FileSystem = require('expo-file-system/legacy');
const dbm = require('../../database');
const food = require('../db');
const flow = require('../importHistoryFlow');
const { summariseImport } = require('../importHistory');
const { _foodEntryToCloud } = require('../../sync/tables/foodDomain');
const { track: mockTrack } = require('../../engineTelemetry');
const { trackFirst: mockTrackFirst } = require('../../telemetry/firsts');
const { __raw: raw } = require('../../dbCrypto');

const fixture = (name) => fs.readFileSync(path.join(__dirname, 'fixtures', 'importHistory', name), 'utf8');
const MFP = fixture('mfp-nutrition-summary.csv');
const CRONO = fixture('cronometer-servings.csv');
const TODAY = '2026-10-16';

let seq = 0;
const freshUser = () => `u-import-${++seq}`;
const entries = (u) => raw.prepare(
  'SELECT * FROM food_entries WHERE user_id = ? AND deleted_at IS NULL ORDER BY entry_date, meal_slot, logged_at',
).all(u);
const foods = (u) => raw.prepare('SELECT * FROM custom_foods WHERE user_id = ? AND deleted_at IS NULL ORDER BY name').all(u);
const rollup = (u, d) => raw.prepare('SELECT * FROM daily_intake_rollups WHERE user_id = ? AND entry_date = ?').get(u, d) ?? null;

beforeAll(async () => {
  await dbm.db();
  mockState.realTx = true;
});
beforeEach(() => {
  jest.clearAllMocks();
  mockState.transactions = 0;
});

describe('pick', () => {
  test('offers CSV and plain text only; a cancelled pick reads nothing', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: true, assets: null });
    await expect(flow.pickHistoryFile()).resolves.toEqual({ cancelled: true });
    const { type } = DocumentPicker.getDocumentAsync.mock.calls[0][0];
    expect(type).toEqual(expect.arrayContaining(['text/csv', 'text/plain']));
    expect(type).not.toContain('*/*');
    expect(type.every((t) => /csv|comma-separated|text\/plain|ms-excel/.test(t))).toBe(true);
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });

  test('reads the picked file', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///a.csv', size: 900 }] });
    FileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true, size: 900 });
    FileSystem.readAsStringAsync.mockResolvedValueOnce(MFP);
    await expect(flow.pickHistoryFile()).resolves.toEqual({ text: MFP });
  });

  test('a file over 10 MB is refused with a calm sentence before it is read', async () => {
    DocumentPicker.getDocumentAsync.mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///big.csv', size: 11 * 1024 * 1024 }] });
    await expect(flow.pickHistoryFile()).rejects.toMatchObject({ code: 'too_large', sentence: flow.FILE_TOO_LARGE });
    expect(FileSystem.readAsStringAsync).not.toHaveBeenCalled();
  });
});

describe('review before write', () => {
  test('a file that is neither export is refused whole', async () => {
    const u = freshUser();
    await expect(flow.planFromText(u, 'Date,Exercise,Minutes\n2026-03-03,Run,30\n', { today: TODAY }))
      .resolves.toEqual({ error: flow.NOT_A_FOOD_EXPORT });
    expect(entries(u)).toEqual([]);
  });

  test('the plan writes nothing, and says what will be added', async () => {
    const u = freshUser();
    const { plan, format } = await flow.planFromText(u, MFP, { today: TODAY });
    expect(format).toBe('mfp');
    expect(entries(u)).toEqual([]);
    expect(foods(u)).toEqual([]);
    expect(summariseImport(plan).join(' ')).toBe('Read 9 rows from 3 March to 14 October. 6 will be added. 3 could not be read.');
  });
});

describe('import', () => {
  test('MyFitnessPal: actuals on their own dates and meals, with the note, and the rollup is the sum', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    const out = await flow.writePlan(u, plan);
    expect(out).toEqual({ added: 6, foodsSaved: 0, daysLeft: 0 });
    const rows = entries(u);
    expect(rows.map((r) => [r.entry_date, r.meal_slot, r.note])).toEqual([
      ['2026-03-03', 'meal_1', 'Breakfast, from MyFitnessPal'],
      ['2026-03-03', 'meal_2', 'Lunch, from MyFitnessPal'],
      ['2026-03-03', 'meal_3', 'Dinner, from MyFitnessPal'],
      ['2026-03-03', 'meal_4', 'Snacks, from MyFitnessPal'],
      ['2026-03-04', 'meal_1', 'Breakfast, from MyFitnessPal'],
      ['2026-10-14', 'meal_4', 'Snacks, from MyFitnessPal'],
    ]);
    rows.forEach((r) => {
      expect(r.is_planned).toBe(0);
      expect(r.food_ref).toBe('quick:import');
      expect(r.quantity_g).toBe(0);
    });
    expect(rollup(u, '2026-03-03').kcal_total).toBe(412 + 655 + 780 + 210);
    expect(rollup(u, '2026-03-04').kcal_total).toBe(1050);
  });

  test('a day the person already logged keeps exactly its own rows', async () => {
    const u = freshUser();
    await food.logFoodEntry(u, {
      entryDate: '2026-03-03', mealSlot: 'meal_1', foodRef: 'quick:adhoc', quantityG: 0,
      kcal: 300, proteinG: 10, carbsG: 30, fatG: 10, note: 'Typed by hand',
    });
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    expect(plan.existingDays).toBe(1);
    await flow.writePlan(u, plan);
    const march3 = entries(u).filter((r) => r.entry_date === '2026-03-03');
    expect(march3.map((r) => r.note)).toEqual(['Typed by hand']);
    expect(rollup(u, '2026-03-03').kcal_total).toBe(300);
    expect(entries(u).filter((r) => r.entry_date !== '2026-03-03')).toHaveLength(2);
  });

  test('a second import of the same file adds nothing, and the review says so', async () => {
    const u = freshUser();
    const first = await flow.planFromText(u, MFP, { today: TODAY });
    await flow.writePlan(u, first.plan);
    const before = entries(u).length;
    const again = await flow.planFromText(u, MFP, { today: TODAY });
    expect(again.plan.addedRows).toBe(0);
    expect(summariseImport(again.plan)[1]).toBe('Every day in this file already has food in your diary, so nothing new will be added.');
    await flow.writePlan(u, again.plan);
    expect(entries(u)).toHaveLength(before);
  });

  test('a stale plan written twice adds nothing the second time', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    await flow.writePlan(u, plan);
    const out = await flow.writePlan(u, plan);
    expect(out.added).toBe(0);
    expect(out.daysLeft).toBe(3);
    expect(entries(u)).toHaveLength(6);
  });

  test('Cronometer: one custom food per unique name in grams; a saved name is reused; no food saved twice', async () => {
    const u = freshUser();
    const chickenId = await food.insertCustomFood(u, {
      name: 'chicken breast', servingG: 100, kcal100g: 165, protein100g: 31, carbs100g: 0, fat100g: 3.6,
    });
    const { plan } = await flow.planFromText(u, CRONO, { today: TODAY });
    const out = await flow.writePlan(u, plan);
    expect(out.foodsSaved).toBe(3);
    expect(foods(u).map((f) => f.name)).toEqual(['Dark chocolate', 'Oats, rolled', 'Semi-skimmed milk', 'chicken breast']);
    const oatsId = foods(u).find((f) => f.name === 'Oats, rolled').id;
    const rows = entries(u);
    expect(rows.filter((r) => r.food_ref === `custom:${oatsId}`).map((r) => [r.entry_date, r.quantity_g])).toEqual([
      ['2026-03-03', 60], ['2026-03-04', 90],
    ]);
    expect(rows.find((r) => r.food_ref === `custom:${chickenId}`)).toEqual(expect.objectContaining({ quantity_g: 150, kcal: 248 }));
    expect(rows.find((r) => r.note === 'Egg, 2.00 large, from Cronometer')).toEqual(expect.objectContaining({ food_ref: 'quick:import', quantity_g: 0 }));
    // The file's own clock time on its own day.
    const oats = rows.find((r) => r.food_ref === `custom:${oatsId}` && r.entry_date === '2026-03-03');
    expect(oats.eaten_at).toBe(new Date(2026, 2, 3, 8, 5).getTime());

    // Again: nothing new, and no food saved twice.
    const again = await flow.planFromText(u, CRONO, { today: TODAY });
    expect(again.plan.customFoods).toEqual([]);
    await flow.writePlan(u, again.plan);
    expect(foods(u)).toHaveLength(4);
    expect(entries(u)).toHaveLength(rows.length);
  });

  test('the diary write is handed "no time" for a row the file did not time', async () => {
    const u = freshUser();
    const spy = jest.spyOn(food, 'logFoodEntries');
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    await flow.writePlan(u, plan);
    const sent = spy.mock.calls.flatMap((c) => c[1]);
    expect(sent).toHaveLength(6);
    sent.forEach((e) => {
      expect(e.eatenAt).toBeNull();
      expect(e.isPlanned).toBe(false);
      expect(Object.keys(e).sort()).toEqual([
        'carbsG', 'eatenAt', 'entryDate', 'fatG', 'fibreG', 'foodRef', 'isPlanned', 'kcal', 'mealSlot', 'note', 'proteinG', 'quantityG',
      ]);
    });
    spy.mock.calls.forEach((c) => expect(c[2]).toEqual({ keepUntimed: true, telemetry: false }));
    spy.mockRestore();
  });

  test('a row the file did not time is stored with no time; a timed row keeps the file time', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    await flow.writePlan(u, plan);
    const rows = entries(u);
    expect(rows).toHaveLength(6);
    rows.forEach((r) => expect(r.eaten_at).toBeNull());

    const v = freshUser();
    const crono = await flow.planFromText(v, CRONO, { today: TODAY });
    await flow.writePlan(v, crono.plan);
    const timed = entries(v).filter((r) => r.eaten_at != null);
    expect(timed.length).toBeGreaterThan(0);
    // Every time on a Cronometer row is the file's own, on the row's own day.
    timed.forEach((r) => expect(new Date(r.eaten_at).toISOString().slice(0, 10) <= r.entry_date).toBe(true));
    expect(entries(v).filter((r) => r.eaten_at != null && r.eaten_at > Date.now() - 60000)).toEqual([]);
  });
});

// food_sync_push (created branch) then food_sync_pull, for one local row: the
// pushed day, time and note; logged_at, created_at and updated_at all the
// server's now() (supabase/migrate_195 food_sync_push never sends logged_at).
function serverRoundTrip(u, local, pushMs) {
  const pushed = _foodEntryToCloud(local, u);
  const iso = new Date(pushMs).toISOString();
  return {
    ...pushed, note: local.note ?? null, logged_at: iso, created_at: iso, updated_at: iso, deleted_at: null,
  };
}

describe('own days, for good', () => {
  // 00:30 BST on 15 October: the file's 14 October row has a key equal to the
  // UTC day of the moment it is written, the old TZ-1 signature.
  const HALF_PAST_MIDNIGHT = new Date(2026, 9, 15, 0, 30).getTime();
  let nowSpy;
  beforeEach(() => { nowSpy = jest.spyOn(Date, 'now').mockReturnValue(HALF_PAST_MIDNIGHT); });
  afterEach(() => nowSpy.mockRestore());

  const shape = (rows) => rows.map((r) => [r.id, r.entry_date, r.meal_slot, r.eaten_at, r.note]).sort();

  test('through their own push coming back in the pull, a fresh-device pull and the re-key', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, MFP, { today: '2026-10-15' });
    await flow.writePlan(u, plan);
    const written = entries(u);
    expect(written.map((r) => r.entry_date)).toContain('2026-10-14');
    const before = shape(written);

    // The same device: each row's own push comes back in the pull.
    const cloud = written.map((r) => serverRoundTrip(u, r, HALF_PAST_MIDNIGHT + 2000));
    for (const c of cloud) await food.applyFoodEntryFromCloud(u, c); // eslint-disable-line no-await-in-loop
    expect(shape(entries(u))).toEqual(before);
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(0);
    expect(shape(entries(u))).toEqual(before);

    // A fresh device: nothing local, the pull, then the one-time re-key.
    raw.prepare('DELETE FROM food_entries WHERE user_id = ?').run(u);
    raw.prepare('DELETE FROM daily_intake_rollups WHERE user_id = ?').run(u);
    const days = new Set();
    for (const c of cloud) days.add(await food.applyFoodEntryFromCloud(u, c)); // eslint-disable-line no-await-in-loop
    for (const d of days) await food.recomputeRollup(u, d); // eslint-disable-line no-await-in-loop
    await expect(food.rekeyFoodEntriesToLocalDay(u)).resolves.toBe(0);
    expect(shape(entries(u))).toEqual(before);
    expect(rollup(u, '2026-10-14').kcal_total).toBe(written.filter((r) => r.entry_date === '2026-10-14').reduce((a, r) => a + r.kcal, 0));
    expect(rollup(u, '2026-10-15')).toBeNull();
  });
});

describe('thousands of rows, whole-day batches, a failure part-way', () => {
  // 300 days of three meals: 900 rows, so several 200-row batches.
  const days = Array.from({ length: 300 }, (_, i) => {
    const d = new Date(2025, 0, 1 + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const big = ['Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g)']
    .concat(days.flatMap((d) => [`${d},Breakfast,400,10,50,20`, `${d},Lunch,600,20,60,40`, `${d},Dinner,700,25,70,45`]))
    .join('\r\n');

  test('batches never split a day, yield between them, and report progress', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, big, { today: TODAY });
    const batches = flow.batchByDay(plan.entries);
    expect(batches.length).toBeGreaterThan(3);
    batches.forEach((b) => expect(b.length).toBeLessThanOrEqual(flow.IMPORT_BATCH));
    const firstDays = batches.map((b) => b[0].entryDate);
    const lastDays = batches.map((b) => b[b.length - 1].entryDate);
    for (let i = 1; i < batches.length; i += 1) expect(firstDays[i] > lastDays[i - 1]).toBe(true);

    const progress = [];
    const out = await flow.writePlan(u, plan, { onProgress: (n, total) => progress.push([n, total]) });
    expect(out.added).toBe(900);
    expect(mockState.transactions).toBe(batches.length);
    expect(progress[progress.length - 1]).toEqual([900, 900]);
    expect(progress).toHaveLength(batches.length);
    expect(entries(u)).toHaveLength(900);
  });

  test('a batch that fails rolls back whole; the throw says how many went in; importing again adds the rest', async () => {
    const u = freshUser();
    raw.exec(`CREATE TRIGGER import_fail BEFORE INSERT ON food_entries
      WHEN NEW.user_id = '${u}' AND NEW.entry_date = '2025-06-15'
      BEGIN SELECT RAISE(ABORT, 'disk full'); END;`);
    const { plan } = await flow.planFromText(u, big, { today: TODAY });
    let caught = null;
    try { await flow.writePlan(u, plan); } catch (e) { caught = e; }
    expect(caught).toBeTruthy();
    expect(caught.stage).toBe('entries');
    const written = entries(u).length;
    expect(caught.written).toBe(written);
    expect(written).toBeGreaterThan(0);
    expect(written % 3).toBe(0); // whole days only
    expect(entries(u).some((r) => r.entry_date === '2025-06-15')).toBe(false);

    raw.exec('DROP TRIGGER import_fail');
    const again = await flow.planFromText(u, big, { today: TODAY });
    expect(again.plan.addedRows).toBe(900 - written);
    await flow.writePlan(u, again.plan);
    expect(entries(u)).toHaveLength(900);
    const perDay = raw.prepare('SELECT entry_date, COUNT(*) AS n FROM food_entries WHERE user_id = ? GROUP BY entry_date').all(u);
    expect(perDay.every((r) => r.n === 3)).toBe(true);
  });
});

describe('quiet', () => {
  test('an import sends no per-row food_logged and no first_food_logged', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    await flow.writePlan(u, plan);
    await new Promise((r) => setImmediate(r));
    expect(mockTrack).not.toHaveBeenCalled();
    expect(mockTrackFirst).not.toHaveBeenCalled();
  });

  test('an import of past days lays and re-lays no reminder', async () => {
    const u = freshUser();
    const { plan } = await flow.planFromText(u, MFP, { today: TODAY });
    await flow.writePlan(u, plan);
    await new Promise((r) => setImmediate(r));
    expect(mockRelay).not.toHaveBeenCalled();
  });

  test('the import code reaches no coaching, safety, notification, telemetry or network module', () => {
    const files = ['importHistory.js', 'importHistoryFlow.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
      .concat(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'components', 'food', 'ImportHistorySheet.js'), 'utf8'));
    const imports = files.join('\n').match(/(?:from\s+|require\()\s*'[^']+'/g) || [];
    const banned = /weeklyCoach|coachApply|edPatternDetector|wellbeing|nutritionEngine|coachingGoals|notifications|telemetry|engineTelemetry|supabase|sentry|fetch|\/sync['/]|syncQueue/i;
    expect(imports.filter((i) => banned.test(i))).toEqual([]);
  });

  test('every log line carries no food name and no figure from the file', () => {
    const src = ['importHistoryFlow.js'].map((f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8'))
      .concat(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'components', 'food', 'ImportHistorySheet.js'), 'utf8'),
        fs.readFileSync(path.join(__dirname, '..', '..', '..', 'screens', 'SettingsDataScreen.js'), 'utf8'))
      .join('\n');
    const calls = src.match(/logError\('ImportHistory\.[^']+', e, \{[^}]*\}\)/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    calls.forEach((c) => {
      const keys = (c.match(/\{([^}]*)\}/)[1].match(/(\w+):/g) || []).map((k) => k.slice(0, -1));
      keys.forEach((k) => expect(['stage', 'format', 'code']).toContain(k));
    });
  });
});
