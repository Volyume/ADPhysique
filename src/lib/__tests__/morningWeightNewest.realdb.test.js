/**
 * Two morning_weights rows on one local day (two devices) always read, and are
 * updated as, the NEWEST. Real SQLite (node:sqlite) through the REAL
 * database.js, set up as renumberWorkoutSets.realdb.test.js does. Written to
 * FAIL on the old queries, which had no ORDER BY and so returned whichever row
 * SQLite found first (the OLDEST, by the user_id/logged_at index), so Home
 * showed and overwrote the wrong weight: founder report "not take the weight".
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
    withTransactionAsync: async (fn) => { await fn(); },
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: jest.fn(), syncMorningWeight: jest.fn(() => Promise.resolve()) }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
jest.mock('../notifications/standDown', () => ({
  standDownMeal: jest.fn(() => Promise.resolve(false)),
  standDownWeighIn: jest.fn(() => Promise.resolve()),
}));
jest.mock('../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../database');

const U = 'u-newest';
const day = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const at = (h) => new Date(day().getFullYear(), day().getMonth(), day().getDate(), h, 0).getTime();

async function insert(id, loggedAt, kg) {
  const d = await dbm.db();
  await d.runAsync(
    'INSERT INTO morning_weights (id, user_id, logged_at, weight_kg, notes, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)',
    [id, U, loggedAt, kg, loggedAt, loggedAt],
  );
}
async function wipe() {
  const d = await dbm.db();
  await d.runAsync('DELETE FROM morning_weights WHERE user_id = ?', [U]);
}

beforeAll(async () => { await dbm.db(); });
beforeEach(wipe);

describe('two rows on one local day', () => {
  test('getMorningWeightToday returns the newest by logged_at, whatever the insert order', async () => {
    await insert('mw-late', at(9), 81.2);
    await insert('mw-early', at(7), 80.0);
    const today = await dbm.getMorningWeightToday(U);
    expect(today.id).toBe('mw-late');
    expect(today.weightKg).toBe(81.2);
  });

  test('equal logged_at: the later-inserted row (higher rowid) wins', async () => {
    await insert('mw-a', at(8), 80.0);
    await insert('mw-b', at(8), 80.5);
    expect((await dbm.getMorningWeightToday(U)).id).toBe('mw-b');
  });

  test('logMorningWeight updates the newest row, the same one Home reads', async () => {
    await insert('mw-early', at(7), 80.0);
    await insert('mw-late', at(9), 81.2);
    const saved = await dbm.logMorningWeight(U, { weightKg: 79.4, loggedAt: at(10) });
    expect(saved).toBe('mw-late');
    expect((await dbm.getMorningWeightToday(U)).weightKg).toBe(79.4);
    const d = await dbm.db();
    const early = await d.getFirstAsync('SELECT weight_kg FROM morning_weights WHERE id = ?', ['mw-early']);
    expect(early.weight_kg).toBe(80.0);
  });
});
