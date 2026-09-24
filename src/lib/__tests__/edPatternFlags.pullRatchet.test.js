/**
 * The ED-pattern flag local mirror under the cloud PULL and the rows the
 * cloud PUSH reads (founder decision B, 2026-09-23, register D196 item 8;
 * D92 item 7, "nothing remote may weaken an ED-safety state"), run against
 * the REAL database.js on an in-memory SQLite.
 *
 * WHAT THIS SUITE PINS, and why it is written to FAIL:
 *  - a pulled CLEAR never closes a local OPEN flag: the device's own engine
 *    is the only thing that clears its own flag; a second device's clear,
 *    or a stale cloud copy, leaves the open row exactly as it was (signals
 *    included) and every consumer of `getOpenEdPatternFlag` still sees it;
 *  - a pulled OPEN row does open the local mirror (the stricter direction
 *    always wins), and a pulled row for a flag this device never held is
 *    mirrored as the cloud says;
 *  - the local signals survive a pull: the cloud never carries them, so a
 *    null from the cloud keeps what the detector stored here;
 *  - a clear this device made itself is kept when the cloud still says
 *    open (the cloud copy is older; the next push moves it forward);
 *  - the push reader returns every open row plus rows cleared inside the
 *    window, never an older cleared row, never a tombstone, and never the
 *    signals column.
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

const {
  db,
  raiseEdPatternFlag,
  clearEdPatternFlag,
  getOpenEdPatternFlag,
  upsertEdPatternFlagFromCloud,
  getEdPatternFlagsForCloudPush,
  ED_FLAG_PUSH_CLEARED_WINDOW_MS,
} = require('../database');

const iso = (ms) => new Date(ms).toISOString();
const DAY = 86400000;
const SIGNALS = { rapidLoss: true, belowFloor: false, lowEa: true, restrictionStreak: false, count: 2 };

let conn;
let userSeq = 0;
const freshUser = () => `user-ratchet-${++userSeq}`;

beforeAll(async () => {
  conn = await db();
});

async function rowById(id) {
  return conn.getFirstAsync('SELECT * FROM ed_pattern_flags WHERE id = ?', [id]);
}

describe('a pulled clear never closes a local open flag (D196 item 8)', () => {
  test('the open row, its signals and its timestamps are untouched; the open-flag reader still answers', async () => {
    const u = freshUser();
    const id = await raiseEdPatternFlag(u, { reason: 'multi-signal harm check', signals: SIGNALS });
    const before = await rowById(id);
    expect(before.cleared_at).toBeNull();

    await upsertEdPatternFlagFromCloud(u, {
      id, user_id: u, flag_state: 'cleared', reason: 'multi-signal harm check', signals_json: null,
      raised_at: iso(before.raised_at), cleared_at: iso(Date.now()), updated_at: iso(Date.now()), deleted_at: null,
    });

    const after = await rowById(id);
    expect(after).toEqual(before);
    expect(JSON.parse(after.signals_json)).toEqual(SIGNALS);
    expect((await getOpenEdPatternFlag(u))?.id).toBe(id);
  });

  test('a pulled clear on a row this device already cleared itself is mirrored (nothing to protect)', async () => {
    const u = freshUser();
    const id = await raiseEdPatternFlag(u, { reason: 'multi-signal harm check', signals: SIGNALS });
    await clearEdPatternFlag(u);
    const local = await rowById(id);
    expect(local.cleared_at).not.toBeNull();
    const cloudClear = local.cleared_at + 5000;
    await upsertEdPatternFlagFromCloud(u, {
      id, user_id: u, flag_state: 'cleared', reason: 'multi-signal harm check', signals_json: null,
      raised_at: iso(local.raised_at), cleared_at: iso(cloudClear), updated_at: iso(cloudClear), deleted_at: null,
    });
    const after = await rowById(id);
    expect(after.cleared_at).toBe(cloudClear);
    expect(after.flag_state).toBe('cleared');
    // The signals the detector stored here survive: the cloud never carries them.
    expect(JSON.parse(after.signals_json)).toEqual(SIGNALS);
    expect(await getOpenEdPatternFlag(u)).toBeNull();
  });
});

describe('the stricter direction always applies', () => {
  test('a pulled OPEN row for a flag this device never held opens the local mirror, exactly as the cloud says', async () => {
    const u = freshUser();
    const raised = Date.now() - 3 * DAY;
    await upsertEdPatternFlagFromCloud(u, {
      id: 'cloud-open-1', user_id: u, flag_state: 'raised', reason: 'multi-signal harm check', signals_json: null,
      raised_at: iso(raised), cleared_at: null, updated_at: iso(raised), deleted_at: null,
    });
    const open = await getOpenEdPatternFlag(u);
    expect(open?.id).toBe('cloud-open-1');
    expect(open.raised_at).toBe(raised);
    expect(open.signals_json).toBeNull();
  });

  test('a pulled OPEN copy of a row this device cleared itself re-opens it (the cloud copy is the stricter state; the next push clears it forward)', async () => {
    // Deliberate: the engine on this device will re-evaluate on its next
    // weekly run and clear again if it should, and the push is forward-only
    // so the cloud clear then sticks. Between the two, the stricter state
    // holds, which is the only safe resting position for a safety row.
    const u = freshUser();
    const id = await raiseEdPatternFlag(u, { reason: 'multi-signal harm check', signals: SIGNALS });
    await clearEdPatternFlag(u);
    const local = await rowById(id);
    await upsertEdPatternFlagFromCloud(u, {
      id, user_id: u, flag_state: 'raised', reason: 'multi-signal harm check', signals_json: null,
      raised_at: iso(local.raised_at), cleared_at: null, updated_at: iso(local.raised_at), deleted_at: null,
    });
    expect((await getOpenEdPatternFlag(u))?.id).toBe(id);
    expect(JSON.parse((await rowById(id)).signals_json)).toEqual(SIGNALS);
  });
});

describe('the rows the cloud push reads', () => {
  test('every open row plus rows cleared inside the window; older clears and tombstones are not re-sent; the signals column is never selected', async () => {
    const u = freshUser();
    const now = Date.now();
    const rows = [
      ['open-now', now - DAY, null, null],
      ['cleared-recent', now - 10 * DAY, now - 2 * DAY, null],
      ['cleared-old', now - 90 * DAY, now - ED_FLAG_PUSH_CLEARED_WINDOW_MS - DAY, null],
      ['open-tombstone', now - 5 * DAY, null, now - DAY],
    ];
    for (const [id, raisedAt, clearedAt, deletedAt] of rows) {
      await conn.runAsync(
        `INSERT INTO ed_pattern_flags (id, user_id, flag_state, reason, signals_json, raised_at, cleared_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, u, clearedAt ? 'cleared' : 'raised', 'multi-signal harm check', JSON.stringify(SIGNALS), raisedAt, clearedAt, raisedAt, deletedAt],
      );
    }
    const out = await getEdPatternFlagsForCloudPush(u, 20, now);
    expect(out.map((r) => r.id)).toEqual(['open-now', 'cleared-recent']);
    for (const r of out) {
      expect(Object.keys(r).sort()).toEqual(['cleared_at', 'id', 'raised_at', 'reason']);
    }
  });

  test('the limit bounds the read, newest first', async () => {
    const u = freshUser();
    const now = Date.now();
    for (let i = 0; i < 5; i += 1) {
      await conn.runAsync(
        `INSERT INTO ed_pattern_flags (id, user_id, flag_state, reason, signals_json, raised_at, cleared_at, updated_at, deleted_at)
         VALUES (?, ?, 'raised', ?, ?, ?, NULL, ?, NULL)`,
        [`open-${i}`, u, 'multi-signal harm check', '{}', now - i * DAY, now - i * DAY],
      );
    }
    const out = await getEdPatternFlagsForCloudPush(u, 2, now);
    expect(out.map((r) => r.id)).toEqual(['open-0', 'open-1']);
  });
});
