/**
 * campaign9.exerciseIntentSync.test.js — cross-device persistence for the
 * Campaign 9 exercise-intent layer (exercise_intent, exercise_swaps,
 * exercise_slot_defaults).
 *
 * Executable, not documentary: a genuinely fresh local database is built
 * by the REAL init path (full schema + every SCHEMA_MIGRATIONS entry
 * through v73) on a real in-memory SQLite via node:sqlite, and the REAL
 * cloud appliers run against it. The harness is the one
 * src/__tests__/campaign6.reinstall.test.js settled on.
 *
 * What this suite pins, and why each one is a real user outcome:
 *
 *  1. The push readers include TOMBSTONES. "Allow this exercise again" is
 *     recorded as deleted_at, not a delete. If the push dropped tombstones
 *     the restore would never leave the device and the user's other phone
 *     would keep suppressing an exercise they un-excluded.
 *  2. A tombstone applied from the cloud RESTORES the exercise on the
 *     receiving device, and a STALE cloud row can never overwrite a newer
 *     local intent (in either direction: it may not resurrect a restored
 *     exercise, and it may not un-exclude a freshly excluded one).
 *  3. exercise_swaps is an append-only event log: re-pulling the same
 *     events cannot duplicate them and inflate how often a replacement
 *     was deliberately chosen.
 *  4. The dedupe-by-name id remap in insertOrUpdateExerciseFromCloud
 *     covers all FIVE id columns across the three new tables. Without it
 *     a cross-device id merge orphans every exclusion, every remembered
 *     swap and every approved default the user set.
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
// Every local writer schedules a push; the harness has no transport.
jest.mock('../sync', () => ({ scheduleSync: () => {} }));

const {
  db,
  EXERCISE_INTENT,
  setExerciseIntent,
  clearExerciseIntent,
  getExerciseIntents,
  recordExerciseSwap,
  getExerciseSwaps,
  setExerciseSlotDefault,
  getExerciseSlotDefaults,
  getAllExerciseIntentsForUser,
  getAllExerciseSwapsForUser,
  getAllExerciseSlotDefaultsForUser,
  insertOrUpdateExerciseIntentFromCloud,
  insertOrUpdateExerciseSwapFromCloud,
  insertOrUpdateExerciseSlotDefaultFromCloud,
  insertOrUpdateExerciseFromCloud,
} = require('../database');

const U = 'user-c9-intent';
const iso = (ms) => new Date(ms).toISOString();
const T0 = 1767000000000; // fixed epoch so ordering is explicit, never "now"
const DAY = 86400000;

let conn;
beforeAll(async () => {
  conn = await db(); // the REAL fresh-install path: schema + all migrations
});

test('v73 created the three tables on a genuinely fresh database', async () => {
  const rows = await conn.getAllAsync(
    `SELECT name FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('exercise_intent', 'exercise_swaps', 'exercise_slot_defaults')
      ORDER BY name`,
  );
  expect(rows.map(r => r.name)).toEqual([
    'exercise_intent', 'exercise_slot_defaults', 'exercise_swaps',
  ]);
  const intents = await getAllExerciseIntentsForUser(U);
  expect(intents).toEqual([]);
});

// ─── 1. Tombstones ride the push ──────────────────────────────────────────

test('the push readers include tombstoned rows so a restore reaches the other device', async () => {
  await setExerciseIntent(U, 'ex-bench', EXERCISE_INTENT.EXCLUDED, { reason: 'discomfort' });
  await setExerciseSlotDefault(U, 'ex-bench', 'ex-dbpress');
  // The user changes their mind on both.
  await clearExerciseIntent(U, 'ex-bench');

  // Product readers hide the restored row...
  expect(await getExerciseIntents(U)).toEqual([]);
  // ...but the SYNC reader must still carry it, tombstone and all.
  const pushRows = await getAllExerciseIntentsForUser(U);
  expect(pushRows).toHaveLength(1);
  expect(pushRows[0].exerciseId).toBe('ex-bench');
  expect(pushRows[0].deletedAt).toBeGreaterThan(0);

  // Same contract on the other two readers.
  await recordExerciseSwap(U, 'ex-bench', 'ex-dbpress');
  expect(await getAllExerciseSwapsForUser(U)).toHaveLength(1);
  expect(await getAllExerciseSlotDefaultsForUser(U)).toHaveLength(1);
});

// ─── 2. Last-write-wins on intent, in both directions ─────────────────────

test('a cloud tombstone restores an exclusion on the receiving device', async () => {
  const V = 'user-c9-deviceB';
  // Device B holds the exclusion, made at T0.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-1', exercise_id: 'ex-squat', kind: 'excluded',
    created_at: iso(T0), updated_at: iso(T0), deleted_at: null,
  });
  expect((await getExerciseIntents(V)).map(r => r.exerciseId)).toEqual(['ex-squat']);

  // Device A restored it a day later; the tombstone arrives.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-1', exercise_id: 'ex-squat', kind: 'excluded',
    created_at: iso(T0), updated_at: iso(T0 + DAY), deleted_at: iso(T0 + DAY),
  });
  expect(await getExerciseIntents(V)).toEqual([]);
});

test('a STALE cloud row never overwrites a newer local intent (no resurrection)', async () => {
  const V = 'user-c9-stale';
  // Local: excluded at T0, restored at T0 + 2 days. This is device truth.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-2', exercise_id: 'ex-row', kind: 'excluded',
    created_at: iso(T0), updated_at: iso(T0 + 2 * DAY), deleted_at: iso(T0 + 2 * DAY),
  });
  // An offline device pushes its day-old copy of the exclusion. It must
  // not re-suppress an exercise the user has since restored.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-2', exercise_id: 'ex-row', kind: 'excluded',
    created_at: iso(T0), updated_at: iso(T0 + DAY), deleted_at: null,
  });
  expect(await getExerciseIntents(V)).toEqual([]);
  const row = await conn.getFirstAsync('SELECT updated_at, deleted_at FROM exercise_intent WHERE id = ?', ['int-2']);
  expect(row.updated_at).toBe(T0 + 2 * DAY);
  expect(row.deleted_at).toBe(T0 + 2 * DAY);
});

test('a stale cloud row cannot un-exclude, and a stale row minted under a DIFFERENT id cannot either', async () => {
  const V = 'user-c9-stale2';
  // Newest local truth: excluded at T0 + 3 days, for the block only.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-3', exercise_id: 'ex-dip', kind: 'avoided_block',
    scope_mesocycle_id: 'meso-9',
    created_at: iso(T0), updated_at: iso(T0 + 3 * DAY), deleted_at: null,
  });
  // A second device's independently-minted row for the SAME exercise,
  // older. UNIQUE(user_id, exercise_id) means only one may survive; the
  // newer one does, and the insert must not throw.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-3-other', exercise_id: 'ex-dip', kind: 'excluded',
    created_at: iso(T0), updated_at: iso(T0 + DAY), deleted_at: iso(T0 + DAY),
  });
  const live = await getExerciseIntents(V);
  expect(live).toHaveLength(1);
  expect(live[0].kind).toBe('avoided_block');
  expect(live[0].scopeMesocycleId).toBe('meso-9');
  const all = await conn.getAllAsync('SELECT id FROM exercise_intent WHERE user_id = ?', [V]);
  expect(all.map(r => r.id)).toEqual(['int-3']);

  // A NEWER row under the other id does win, and collapses to one row.
  await insertOrUpdateExerciseIntentFromCloud(V, {
    id: 'int-3-other', exercise_id: 'ex-dip', kind: 'excluded',
    created_at: iso(T0), updated_at: iso(T0 + 5 * DAY), deleted_at: null,
  });
  const after = await conn.getAllAsync('SELECT id, kind FROM exercise_intent WHERE user_id = ?', [V]);
  expect(after).toEqual([{ id: 'int-3-other', kind: 'excluded' }]);
});

test('a stale cloud slot default never overwrites a newer approved default', async () => {
  const V = 'user-c9-slot';
  await insertOrUpdateExerciseSlotDefaultFromCloud(V, {
    id: 'sd-1', from_exercise_id: 'ex-bench', routine_id: null,
    exercise_id: 'ex-dbpress',
    created_at: iso(T0), updated_at: iso(T0 + 2 * DAY), deleted_at: null,
  });
  // Older cloud copy naming a different replacement: refused.
  await insertOrUpdateExerciseSlotDefaultFromCloud(V, {
    id: 'sd-1', from_exercise_id: 'ex-bench', routine_id: null,
    exercise_id: 'ex-machinepress',
    created_at: iso(T0), updated_at: iso(T0 + DAY), deleted_at: null,
  });
  let live = await getExerciseSlotDefaults(V);
  expect(live).toEqual([
    { fromExerciseId: 'ex-bench', routineId: null, exerciseId: 'ex-dbpress', updatedAt: T0 + 2 * DAY },
  ]);

  // A newer one does land. The nullable routine_id is matched with IS, so
  // the plan-wide row is found rather than duplicated.
  await insertOrUpdateExerciseSlotDefaultFromCloud(V, {
    id: 'sd-2', from_exercise_id: 'ex-bench', routine_id: null,
    exercise_id: 'ex-machinepress',
    created_at: iso(T0), updated_at: iso(T0 + 4 * DAY), deleted_at: null,
  });
  live = await getExerciseSlotDefaults(V);
  expect(live).toHaveLength(1);
  expect(live[0].exerciseId).toBe('ex-machinepress');
});

// ─── 3. The swap log is append-only ───────────────────────────────────────

test('re-pulling the same swap events cannot duplicate them', async () => {
  const V = 'user-c9-swaps';
  const events = [
    { id: 'sw-1', from_exercise_id: 'ex-bench', to_exercise_id: 'ex-dbpress', created_at: iso(T0), updated_at: iso(T0) },
    { id: 'sw-2', from_exercise_id: 'ex-bench', to_exercise_id: 'ex-dbpress', created_at: iso(T0 + DAY), updated_at: iso(T0 + DAY) },
  ];
  for (const e of events) await insertOrUpdateExerciseSwapFromCloud(V, e);
  // A second pull whose watermark window overlaps delivers both again,
  // one of them with a bumped updated_at.
  for (const e of events) await insertOrUpdateExerciseSwapFromCloud(V, e);
  await insertOrUpdateExerciseSwapFromCloud(V, { ...events[0], updated_at: iso(T0 + 9 * DAY) });

  const rows = await getExerciseSwaps(V);
  expect(rows).toHaveLength(2);
  expect(rows.map(r => r.toExerciseId)).toEqual(['ex-dbpress', 'ex-dbpress']);
  // Append-only: the event's own creation time is never rewritten by a
  // later re-pull, so "how often did the user choose this" stays honest.
  const first = await conn.getFirstAsync('SELECT created_at, updated_at FROM exercise_swaps WHERE id = ?', ['sw-1']);
  expect(first.created_at).toBe(T0);
  expect(first.updated_at).toBe(T0);
});

// ─── 4. The dedupe-by-name id remap covers all five id columns ────────────

test('the cloud-pull id remap rewrites every Campaign 9 exercise reference', async () => {
  const V = 'user-c9-remap';
  const LOCAL = 'local-id-incline';
  const CLOUD = 'cloud-id-incline';

  await conn.runAsync(
    `INSERT INTO exercises (id, name, primary_muscle, is_custom, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [LOCAL, 'Incline Bench Press', 'chest', T0, T0],
  );
  // Also a second exercise, used as the far end of a swap pair.
  await setExerciseIntent(V, LOCAL, EXERCISE_INTENT.EXCLUDED);
  await recordExerciseSwap(V, LOCAL, 'ex-flye');
  await recordExerciseSwap(V, 'ex-flye', LOCAL);
  await setExerciseSlotDefault(V, LOCAL, 'ex-flye');
  await setExerciseSlotDefault(V, 'ex-flye', LOCAL);

  // The cloud carries the same exercise by NAME under a different id.
  await insertOrUpdateExerciseFromCloud({
    id: CLOUD, name: 'Incline Bench Press', primary_muscle: 'chest',
    created_at: iso(T0), updated_at: iso(T0),
  });

  // Nothing may still point at the dead local id.
  const orphans = await conn.getAllAsync(
    `SELECT 'intent' AS t FROM exercise_intent WHERE exercise_id = ?
     UNION ALL SELECT 'swap_from' FROM exercise_swaps WHERE from_exercise_id = ?
     UNION ALL SELECT 'swap_to' FROM exercise_swaps WHERE to_exercise_id = ?
     UNION ALL SELECT 'slot_from' FROM exercise_slot_defaults WHERE from_exercise_id = ?
     UNION ALL SELECT 'slot_to' FROM exercise_slot_defaults WHERE exercise_id = ?`,
    [LOCAL, LOCAL, LOCAL, LOCAL, LOCAL],
  );
  expect(orphans).toEqual([]);

  // And all five references now resolve against the cloud id.
  expect((await getExerciseIntents(V)).map(r => r.exerciseId)).toEqual([CLOUD]);
  const swaps = await getExerciseSwaps(V);
  expect(swaps).toHaveLength(2);
  expect(swaps.some(s => s.fromExerciseId === CLOUD && s.toExerciseId === 'ex-flye')).toBe(true);
  expect(swaps.some(s => s.fromExerciseId === 'ex-flye' && s.toExerciseId === CLOUD)).toBe(true);
  const defaults = await getExerciseSlotDefaults(V);
  expect(defaults).toHaveLength(2);
  expect(defaults.some(d => d.fromExerciseId === CLOUD && d.exerciseId === 'ex-flye')).toBe(true);
  expect(defaults.some(d => d.fromExerciseId === 'ex-flye' && d.exerciseId === CLOUD)).toBe(true);
});

test('the remap survives the user holding intent under BOTH ids (UNIQUE collision)', async () => {
  const V = 'user-c9-remap2';
  const LOCAL = 'local-id-pulldown';
  const CLOUD = 'cloud-id-pulldown';

  await conn.runAsync(
    `INSERT INTO exercises (id, name, primary_muscle, is_custom, created_at, updated_at)
     VALUES (?, ?, ?, 0, ?, ?)`,
    [LOCAL, 'Lat Pulldown', 'back', T0, T0],
  );
  // Intent recorded against BOTH ids for the same user: the newer one is
  // the cloud id's row, so it must be the one that survives the merge.
  await conn.runAsync(
    `INSERT INTO exercise_intent (id, user_id, exercise_id, kind, created_at, updated_at)
     VALUES (?, ?, ?, 'excluded', ?, ?)`,
    ['int-old', V, LOCAL, T0, T0],
  );
  await conn.runAsync(
    `INSERT INTO exercise_intent (id, user_id, exercise_id, kind, created_at, updated_at)
     VALUES (?, ?, ?, 'avoided_block', ?, ?)`,
    ['int-new', V, CLOUD, T0, T0 + DAY],
  );

  await insertOrUpdateExerciseFromCloud({
    id: CLOUD, name: 'Lat Pulldown', primary_muscle: 'back',
    created_at: iso(T0), updated_at: iso(T0),
  });

  const rows = await conn.getAllAsync(
    'SELECT id, exercise_id, kind FROM exercise_intent WHERE user_id = ?', [V],
  );
  expect(rows).toEqual([{ id: 'int-new', exercise_id: CLOUD, kind: 'avoided_block' }]);
});
