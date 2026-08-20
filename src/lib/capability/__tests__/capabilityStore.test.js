/**
 * CC26 - the capability store against a REAL fresh database (the
 * campaign9.exerciseIntentSync harness: real init path, every
 * SCHEMA_MIGRATIONS entry, in-memory node:sqlite).
 *
 * Pins the store half of the CC26 laws:
 *  - a fresh/upgraded database has the tables and ZERO rows - no
 *    fabricated capability state for anyone (CC26 migration law);
 *  - invalid combinations can never reach the table;
 *  - supersession/promotion END rows and INSERT rows - history is never
 *    destructively rewritten (CAP-14);
 *  - promotion is exactly-once per live rule;
 *  - the consent write-gate fails CLOSED;
 *  - READS NEVER WRITE: an episode past its planned end is reported
 *    awaiting but its row is untouched (the C31 sweep-clobber class is
 *    designed out).
 */

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
    withTransactionAsync: async (fn) => fn(),
    isInTransactionSync: () => false,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../../sync', () => ({ scheduleSync: () => {} }));
// Consent flag is controlled per test; the derived-from-rows path is real.
const mockLocalConsent = { value: null };
jest.mock('../../consent/capabilityConsent', () => ({
  getLocalCapabilityConsent: async () => mockLocalConsent.value,
}));

const {
  db,
  createCapabilityConstraint,
  getCapabilityConstraints,
  endCapabilityEpisode,
  promoteCapabilityEpisode,
  supersedeCapabilityConstraint,
  tombstoneAllCapabilityConstraints,
} = require('../../database');
const {
  loadCapabilityState, createConstraint, hasCapabilityConsent,
} = require('../store');

const U = 'user-cc26-store';
const T0 = 1767000000000;
const DAY = 86400000;

const baseInput = {
  role: 'baseline', source: 'self', ruleKind: 'demand',
  ruleValue: 'overhead_position', startsAt: T0,
};
const episodeInput = (over = {}) => ({
  role: 'episode', source: 'self', ruleKind: 'demand',
  ruleValue: 'standing', startsAt: T0, endsAt: T0 + 14 * DAY,
  episodeGroupId: 'grp-1', ...over,
});

let conn;
beforeAll(async () => { conn = await db(); });

test('the CC26 migration created both tables with ZERO rows - no fabricated state', async () => {
  const tables = await conn.getAllAsync(
    `SELECT name FROM sqlite_master WHERE type = 'table'
      AND name IN ('capability_constraints', 'session_constraint_effects') ORDER BY name`,
  );
  expect(tables.map(r => r.name)).toEqual(['capability_constraints', 'session_constraint_effects']);
  const count = await conn.getFirstAsync('SELECT COUNT(*) AS n FROM capability_constraints');
  expect(count.n).toBe(0);
});

test('invalid combinations never reach the table', async () => {
  await expect(createCapabilityConstraint(U, { ...baseInput, role: 'injured' }, { nowMs: T0 }))
    .rejects.toThrow('capability_constraint_invalid:role');
  await expect(createCapabilityConstraint(U, { ...baseInput, endsAt: T0 + DAY }, { nowMs: T0 }))
    .rejects.toThrow('capability_constraint_invalid:baseline_ends_at');
  const count = await conn.getFirstAsync('SELECT COUNT(*) AS n FROM capability_constraints');
  expect(count.n).toBe(0);
});

test('the consent write-gate fails CLOSED, and rows-imply-consent on a synced device', async () => {
  mockLocalConsent.value = null;
  await expect(createConstraint(U, baseInput, { nowMs: T0 })).rejects.toThrow('capability_consent_required');
  mockLocalConsent.value = true;
  const id = await createConstraint(U, baseInput, { nowMs: T0 });
  expect(id).toBeTruthy();
  // A device with rows but no local flag (fresh install after sync)
  // derives consent from the data's existence.
  mockLocalConsent.value = null;
  expect(await hasCapabilityConsent(U)).toBe(true);
  // An explicit local withdrawal wins over row presence on this device.
  mockLocalConsent.value = false;
  expect(await hasCapabilityConsent(U)).toBe(false);
  mockLocalConsent.value = true;
});

test('supersession ends the old row and inserts the new - both remain readable', async () => {
  const rows0 = await getCapabilityConstraints(U);
  const oldId = rows0.find(r => r.state === 'active').id;
  const newId = await supersedeCapabilityConstraint(U, oldId, { ...baseInput, ruleValue: 'axial_load' }, { nowMs: T0 + DAY });
  expect(newId).toBeTruthy();
  const rows = await getCapabilityConstraints(U);
  const old = rows.find(r => r.id === oldId);
  const fresh = rows.find(r => r.id === newId);
  expect(old.state).toBe('ended');
  expect(old.endedReason).toBe('superseded');
  expect(old.ruleValue).toBe('overhead_position'); // meaning never rewritten
  expect(fresh.state).toBe('active');
  expect(fresh.ruleValue).toBe('axial_load');
});

test('reads never write: an awaiting episode row is untouched by loading', async () => {
  await createCapabilityConstraint(U, episodeInput(), { nowMs: T0 });
  const before = await conn.getFirstAsync(
    "SELECT state, updated_at FROM capability_constraints WHERE episode_group_id = 'grp-1'");
  const state = await loadCapabilityState(U, { nowMs: T0 + 30 * DAY }); // far past ends_at
  const ep = state.episodes.find(e => e.groupId === 'grp-1');
  expect(ep.status).toBe('awaiting_confirmation');
  const after = await conn.getFirstAsync(
    "SELECT state, updated_at FROM capability_constraints WHERE episode_group_id = 'grp-1'");
  expect(after).toEqual(before); // no lazy sweep, no write-back
});

test('ending an episode ends every live rule of the group, once', async () => {
  const n = await endCapabilityEpisode(U, 'grp-1', 'user_ended', { nowMs: T0 + 31 * DAY });
  expect(n).toBe(1);
  const again = await endCapabilityEpisode(U, 'grp-1', 'user_ended', { nowMs: T0 + 32 * DAY });
  expect(again).toBe(0); // idempotent - nothing live remains
});

test('promotion is exactly-once per live rule and copies to baseline (CAP-16)', async () => {
  await createCapabilityConstraint(U, episodeInput({ episodeGroupId: 'grp-2', ruleValue: 'grip_bar' }), { nowMs: T0 });
  await createCapabilityConstraint(U, episodeInput({ episodeGroupId: 'grp-2', ruleValue: 'impact' }), { nowMs: T0 });
  const created = await promoteCapabilityEpisode(U, 'grp-2', { nowMs: T0 + 5 * DAY });
  expect(created).toHaveLength(2);
  const rows = await getCapabilityConstraints(U);
  const promoted = rows.filter(r => r.endedReason === 'promoted');
  expect(promoted).toHaveLength(2);
  const baselines = rows.filter(r => r.role === 'baseline' && r.state === 'active'
    && ['grip_bar', 'impact'].includes(r.ruleValue));
  expect(baselines).toHaveLength(2);
  for (const b of baselines) {
    expect(b.endsAt).toBeNull();
    expect(b.episodeGroupId).toBeNull();
  }
  // Double-tap / cross-device replay: nothing live remains, nothing copies.
  const again = await promoteCapabilityEpisode(U, 'grp-2', { nowMs: T0 + 6 * DAY });
  expect(again).toHaveLength(0);
});

test('history stays legible in the loader after lifecycle churn', async () => {
  const state = await loadCapabilityState(U, { nowMs: T0 + 40 * DAY });
  expect(state.unavailable).toBe(false);
  expect(state.history.length).toBeGreaterThanOrEqual(3); // superseded + ended + promoted rows
  expect(state.baseline.some(r => r.ruleValue === 'grip_bar')).toBe(true);
});

test('consent withdrawal tombstones every row so the erasure propagates (CAP-20)', async () => {
  const n = await tombstoneAllCapabilityConstraints(U, { nowMs: T0 + 50 * DAY });
  expect(n).toBeGreaterThan(0);
  const visible = await getCapabilityConstraints(U);
  expect(visible).toHaveLength(0);
  const raw = await conn.getFirstAsync(
    'SELECT COUNT(*) AS n FROM capability_constraints WHERE user_id = ? AND deleted_at IS NOT NULL', [U]);
  expect(raw.n).toBeGreaterThan(0); // tombstoned, not silently gone: sync carries the delete
});
