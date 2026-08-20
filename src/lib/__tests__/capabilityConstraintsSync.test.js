/**
 * CC26 - capability lane cross-device persistence, on the real-DB harness.
 *
 * Pins the sync laws the campaign order names:
 *  - the push reader includes TOMBSTONES and maps EVERY architecture
 *    field (role and the interval fields especially - losing either
 *    corrupts the provenance joins, CAP-14);
 *  - pull is strictly-newer LWW: a stale cloud row never clobbers a
 *    newer local one, and retirement can never resurrect;
 *  - the section 28 A/B replay: device A logs under a restriction it
 *    holds active, device B ends it online; after convergence A's
 *    earlier session still interprets as constrained and later ones do
 *    not - historical context is never retroactively changed.
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
  createCapabilityConstraint,
  getCapabilityConstraints,
  getAllCapabilityConstraintsForUser,
  endCapabilityConstraint,
  tombstoneAllCapabilityConstraints,
  insertCapabilityConstraintFromCloud,
  createSessionConstraintEffect,
  getAllSessionConstraintEffectsForUser,
  insertSessionConstraintEffectFromCloud,
} = require('../database');
const { isConstraintActiveAt } = require('../capability/model');

const U = 'user-cc26-sync';
const T0 = 1767000000000;
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();

beforeAll(async () => { await db(); });

const ARCH_FIELDS = [
  'id', 'userId', 'role', 'source', 'ruleKind', 'ruleValue', 'laterality',
  'startsAt', 'endsAt', 'state', 'endedAt', 'endedReason', 'episodeGroupId',
  'acknowledgedAt', // section 33.7 cadence anchor - must survive transit
  'createdAt', 'updatedAt', 'deletedAt',
];

test('push reader carries every architecture field and includes tombstones', async () => {
  const id = await createCapabilityConstraint(U, {
    role: 'episode', source: 'clinician_reported', ruleKind: 'demand',
    ruleValue: 'overhead_position', laterality: 'left',
    startsAt: T0, endsAt: T0 + 21 * DAY, episodeGroupId: 'g-sync',
  }, { nowMs: T0 });
  await endCapabilityConstraint(U, id, 'user_ended', { nowMs: T0 + 5 * DAY });
  await tombstoneAllCapabilityConstraints(U, { nowMs: T0 + 6 * DAY });

  const rows = await getAllCapabilityConstraintsForUser(U);
  expect(rows).toHaveLength(1);
  const r = rows[0];
  for (const f of ARCH_FIELDS) expect(r).toHaveProperty(f);
  expect(r.role).toBe('episode');
  expect(r.source).toBe('clinician_reported');
  expect(r.laterality).toBe('left');
  expect(r.startsAt).toBe(T0);
  expect(r.endedAt).toBe(T0 + 5 * DAY);
  expect(r.deletedAt).toBe(T0 + 6 * DAY); // the tombstone travels
});

test('strictly-newer LWW: stale cloud rows never clobber; retirement never resurrects', async () => {
  const U2 = 'user-cc26-lww';
  const id = await createCapabilityConstraint(U2, {
    role: 'baseline', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', startsAt: T0,
  }, { nowMs: T0 + 10 * DAY });

  // A STALE cloud copy (older updated_at, still active) must not apply.
  const staleApplied = await insertCapabilityConstraintFromCloud(U2, {
    id, user_id: 'cloud-uid', role: 'baseline', source: 'self',
    rule_kind: 'demand', rule_value: 'standing', state: 'active',
    starts_at: iso(T0), created_at: iso(T0), updated_at: iso(T0 + 5 * DAY),
  });
  expect(staleApplied).toBe(false);

  // The user retires it here (newer). An OLDER active cloud copy arriving
  // later must not resurrect it.
  await endCapabilityConstraint(U2, id, 'user_ended', { nowMs: T0 + 20 * DAY });
  const resurrect = await insertCapabilityConstraintFromCloud(U2, {
    id, user_id: 'cloud-uid', role: 'baseline', source: 'self',
    rule_kind: 'demand', rule_value: 'standing', state: 'active',
    starts_at: iso(T0), created_at: iso(T0), updated_at: iso(T0 + 15 * DAY),
  });
  expect(resurrect).toBe(false);
  const rows = await getCapabilityConstraints(U2);
  expect(rows[0].state).toBe('ended');

  // A NEWER cloud tombstone always wins (erasure propagates).
  const erase = await insertCapabilityConstraintFromCloud(U2, {
    id, user_id: 'cloud-uid', role: 'baseline', source: 'self',
    rule_kind: 'demand', rule_value: 'standing', state: 'ended',
    starts_at: iso(T0), ended_at: iso(T0 + 20 * DAY), ended_reason: 'user_ended',
    created_at: iso(T0), updated_at: iso(T0 + 30 * DAY), deleted_at: iso(T0 + 30 * DAY),
  });
  expect(erase).toBe(true);
  expect(await getCapabilityConstraints(U2)).toHaveLength(0);
});

test('section 28 A/B replay: convergence never rewrites historical context', async () => {
  const U3 = 'user-cc26-ab';
  // Device A creates the episode offline at T0 and trains under it.
  const id = await createCapabilityConstraint(U3, {
    role: 'episode', source: 'self', ruleKind: 'demand',
    ruleValue: 'overhead_position', startsAt: T0, endsAt: null,
    episodeGroupId: 'g-ab',
  }, { nowMs: T0 });
  const sessionDuring = T0 + 3 * DAY;   // A logs this while constrained
  const sessionAfter = T0 + 12 * DAY;   // logged after B's end, before A syncs

  // Device B (via cloud) confirms the episode ENDED at T0+10d.
  const applied = await insertCapabilityConstraintFromCloud(U3, {
    id, user_id: 'cloud-uid', role: 'episode', source: 'self',
    rule_kind: 'demand', rule_value: 'overhead_position',
    starts_at: iso(T0), ends_at: null, state: 'ended',
    ended_at: iso(T0 + 10 * DAY), ended_reason: 'user_ended',
    episode_group_id: 'g-ab',
    created_at: iso(T0), updated_at: iso(T0 + 10 * DAY),
  });
  expect(applied).toBe(true);

  const row = (await getCapabilityConstraints(U3))[0];
  // Role and interval survived convergence intact...
  expect(row.role).toBe('episode');
  expect(row.startsAt).toBe(T0);
  expect(row.endedAt).toBe(T0 + 10 * DAY);
  // ...so A's during-session still reads constrained, and the later one
  // does not. Latest-state never applies retroactively (campaign law).
  expect(isConstraintActiveAt(row, sessionDuring)).toBe(true);
  expect(isConstraintActiveAt(row, sessionAfter)).toBe(false);
});

test('session_constraint_effects round-trips with strictly-newer LWW', async () => {
  const U4 = 'user-cc26-fx';
  await createSessionConstraintEffect(U4, 'w1', [{ slot: 0, effect: 'omitted', constraintIds: ['c1'] }], { nowMs: T0 });
  const pushed = await getAllSessionConstraintEffectsForUser(U4);
  expect(pushed).toHaveLength(1);
  expect(pushed[0].id).toBe('sce_w1');
  const stale = await insertSessionConstraintEffectFromCloud(U4, {
    id: 'sce_w1', user_id: 'cloud', workout_id: 'w1',
    effects_json: '[]', created_at: iso(T0 - DAY), updated_at: iso(T0 - DAY),
  });
  expect(stale).toBe(false);
  const newer = await insertSessionConstraintEffectFromCloud(U4, {
    id: 'sce_w1', user_id: 'cloud', workout_id: 'w1',
    effects_json: JSON.stringify([{ slot: 1, effect: 'reduced' }]),
    created_at: iso(T0), updated_at: iso(T0 + DAY),
  });
  expect(newer).toBe(true);
});
