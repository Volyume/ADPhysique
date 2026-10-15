/**
 * D228 item 4 (founder, 2026-10-15), second-device parity: a pulled
 * ED-pattern row that OPENS a flag this device did not hold silences the
 * weight and food prompts here too, exactly as the raising device does.
 * Run against the REAL database.js on an in-memory SQLite with the
 * scheduler mocked. Written to FAIL if the cancels are not called, or are
 * called when nothing changed.
 *
 *  - a pulled open row for an id this device never held: three cancels;
 *  - the same open row pulled again (already open locally): no cancels;
 *  - a pulled CLEAR: no cancels (and, per D196, the local open row stays);
 *  - a pulled tombstone: no cancels;
 *  - a scheduler that throws never breaks the pull.
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

const mockCancelMorning = jest.fn(() => Promise.resolve());
const mockCancelMeals = jest.fn(() => Promise.resolve());
const mockCancelPlanned = jest.fn(() => Promise.resolve());
jest.mock('../notifications/scheduler', () => ({
  cancelMorningNotification: (...a) => mockCancelMorning(...a),
  cancelMealReminders: (...a) => mockCancelMeals(...a),
  cancelPlannedMealConfirm: (...a) => mockCancelPlanned(...a),
}));

const { db, raiseEdPatternFlag, getOpenEdPatternFlag, upsertEdPatternFlagFromCloud } = require('../database');

const iso = (ms) => new Date(ms).toISOString();
let userSeq = 0;
const freshUser = () => `user-pull-${++userSeq}`;
const openRow = (id, u) => ({
  id, user_id: u, flag_state: 'raised', reason: 'multi-signal harm check', signals_json: null,
  raised_at: iso(Date.now() - 60000), cleared_at: null, updated_at: iso(Date.now()), deleted_at: null,
});

beforeAll(async () => { await db(); });
beforeEach(() => { mockCancelMorning.mockClear(); mockCancelMeals.mockClear(); mockCancelPlanned.mockClear(); });

describe('a pulled row that opens a flag silences the prompts (D228 item 4)', () => {
  test('new open row: weigh-in, meal and planned-meal prompts are cancelled, and the flag reads open', async () => {
    const u = freshUser();
    await upsertEdPatternFlagFromCloud(u, openRow('flag-a', u));
    expect(mockCancelMorning).toHaveBeenCalledTimes(1);
    expect(mockCancelMeals).toHaveBeenCalledTimes(1);
    expect(mockCancelPlanned).toHaveBeenCalledTimes(1);
    expect((await getOpenEdPatternFlag(u))?.id).toBe('flag-a');
  });

  test('the same open row pulled again: nothing to silence, no cancels', async () => {
    const u = freshUser();
    await upsertEdPatternFlagFromCloud(u, openRow('flag-b', u));
    mockCancelMeals.mockClear(); mockCancelMorning.mockClear(); mockCancelPlanned.mockClear();
    await upsertEdPatternFlagFromCloud(u, openRow('flag-b', u));
    expect(mockCancelMorning).not.toHaveBeenCalled();
    expect(mockCancelMeals).not.toHaveBeenCalled();
    expect(mockCancelPlanned).not.toHaveBeenCalled();
  });

  test('a pulled clear or tombstone never cancels anything', async () => {
    const u = freshUser();
    const id = await raiseEdPatternFlag(u, { reason: 'multi-signal harm check', signals: {} });
    await upsertEdPatternFlagFromCloud(u, { ...openRow(id, u), flag_state: 'cleared', cleared_at: iso(Date.now()) });
    await upsertEdPatternFlagFromCloud(u, { ...openRow('flag-gone', u), deleted_at: iso(Date.now()) });
    expect(mockCancelMorning).not.toHaveBeenCalled();
    expect(mockCancelMeals).not.toHaveBeenCalled();
    expect(mockCancelPlanned).not.toHaveBeenCalled();
    expect((await getOpenEdPatternFlag(u))?.id).toBe(id);
  });

  test('a scheduler failure never breaks the pull: the row still lands', async () => {
    const u = freshUser();
    mockCancelMeals.mockImplementationOnce(() => Promise.reject(new Error('os')));
    await expect(upsertEdPatternFlagFromCloud(u, openRow('flag-c', u))).resolves.toBeUndefined();
    expect((await getOpenEdPatternFlag(u))?.id).toBe('flag-c');
  });
});
