/**
 * Founder request 2026-10-17 (logger): deleting a set or changing its type
 * must leave set_number as 1, 2, 3 within each kind. Real SQLite (node:sqlite)
 * through the REAL database.js, set up as food/__tests__/localFrequents
 * .realdb.test.js does; only the edges are mocked. Written to FAIL on the old
 * code (renumberWorkoutSets and the evidenceClass edit column did not exist):
 *  - after a delete the survivors close the gap, in the order they were
 *    logged, and the next set logged takes the next number;
 *  - warm-ups number on their own (setNumberForKind's split), so changing a
 *    working set to a warm-up moves BOTH sequences;
 *  - only rows whose number changes are written, with updated_at bumped so the
 *    per-set sync pushes them; a second run changes nothing;
 *  - it is scoped to one workout and one exercise;
 *  - updateWorkoutSet can set and clear evidence_class (a type change stamps
 *    the class the set would have been logged with).
 */
const mockState = { realTx: false, inTx: false };

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
    withTransactionAsync: async (fn) => {
      if (!mockState.realTx) { await fn(); return; }
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
jest.mock('../sync', () => ({ scheduleSync: jest.fn() }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('../engineTelemetry', () => ({ track: jest.fn(() => Promise.resolve()) }));
jest.mock('../telemetry/firsts', () => ({ trackFirst: jest.fn(() => Promise.resolve()) }));
jest.mock('../notifications/standDown', () => ({ standDownMeal: jest.fn(() => Promise.resolve(false)) }));
jest.mock('../notifications/scheduler', () => ({
  schedulePlannedMealConfirm: () => Promise.resolve(),
  relayMealRemindersFromPrefs: () => Promise.resolve(),
}));

const dbm = require('../database');
const { setNumberForKind } = require('../workoutHelpers');

let clock = new Date(2026, 9, 17, 10, 0).getTime();
let nowSpy;
let seq = 0;

beforeAll(async () => {
  await dbm.db();
});
beforeEach(() => {
  clock += 60_000;
  nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => clock);
});
afterEach(() => nowSpy.mockRestore());

const U = 'u-renumber';
const fresh = () => ({ workoutId: `w-${++seq}`, exerciseId: 'ex-bench' });

// Logs a set the way the screen does: numbered within its kind from the sets
// already logged for the exercise in this workout.
async function logSet(w, setType, logged, over = {}) {
  clock += 1000;
  const setNumber = setNumberForKind(logged, setType === 'warmup');
  const saved = await dbm.createWorkoutSet({
    userId: U, workoutId: w.workoutId, exerciseId: over.exerciseId ?? w.exerciseId,
    setNumber, setType, actualReps: 8, weight: 60, ...over,
  });
  logged.push({ id: saved.id, setType });
  return saved.id;
}
const rows = async (w, exerciseId = w.exerciseId) => (await dbm.db()).getAllAsync(
  'SELECT id, set_type, set_number, updated_at, evidence_class FROM workout_sets WHERE workout_id = ? AND exercise_id = ? ORDER BY created_at ASC, rowid ASC',
  [w.workoutId, exerciseId],
);

describe('renumberWorkoutSets', () => {
  test('after a delete the survivors close the gap in logged order, and the next set takes the next number', async () => {
    const w = fresh();
    const logged = [];
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push(await logSet(w, 'straight', logged));
    await dbm.deleteWorkoutSet(U, ids[0]);
    const changed = await dbm.renumberWorkoutSets(w.workoutId, w.exerciseId);
    expect((await rows(w)).map((r) => r.set_number)).toEqual([1, 2]);
    expect(changed.map((c) => c.setNumber)).toEqual([1, 2]);
    const survivors = logged.filter((s) => s.id !== ids[0]);
    expect(setNumberForKind(survivors, false)).toBe(3);
  });

  test('warm-ups number on their own: a working set changed to a warm-up moves both sequences', async () => {
    const w = fresh();
    const logged = [];
    const first = await logSet(w, 'straight', logged); // the one forgotten as a warm-up
    await logSet(w, 'warmup', logged);
    await logSet(w, 'straight', logged);
    expect((await rows(w)).map((r) => [r.set_type, r.set_number])).toEqual([['straight', 1], ['warmup', 1], ['straight', 2]]);
    await dbm.updateWorkoutSet(first, { setType: 'warmup', evidenceClass: null });
    await dbm.renumberWorkoutSets(w.workoutId, w.exerciseId);
    expect((await rows(w)).map((r) => [r.set_type, r.set_number])).toEqual([['warmup', 1], ['warmup', 2], ['straight', 1]]);
  });

  test('only changed rows are written, updated_at is bumped for them, and a second run changes nothing', async () => {
    const w = fresh();
    const logged = [];
    const ids = [];
    for (let i = 0; i < 3; i += 1) ids.push(await logSet(w, 'straight', logged));
    const before = await rows(w);
    await dbm.deleteWorkoutSet(U, ids[0]);
    clock += 5000;
    const stamp = clock;
    await dbm.renumberWorkoutSets(w.workoutId, w.exerciseId);
    const after = await rows(w);
    expect(after.every((r) => r.updated_at === stamp)).toBe(true);
    expect(after.every((r) => r.updated_at > before[1].updated_at)).toBe(true);
    clock += 5000;
    expect(await dbm.renumberWorkoutSets(w.workoutId, w.exerciseId)).toEqual([]);
    expect((await rows(w)).every((r) => r.updated_at === stamp)).toBe(true);
  });

  test('a delete of the last set renumbers nothing', async () => {
    const w = fresh();
    const logged = [];
    await logSet(w, 'straight', logged);
    const last = await logSet(w, 'straight', logged);
    await dbm.deleteWorkoutSet(U, last);
    expect(await dbm.renumberWorkoutSets(w.workoutId, w.exerciseId)).toEqual([]);
  });

  test('scoped to one workout and one exercise', async () => {
    const w = fresh();
    const other = fresh();
    const a = []; const b = []; const c = [];
    const first = await logSet(w, 'straight', a);
    await logSet(w, 'straight', a);
    await logSet(w, 'straight', b, { exerciseId: 'ex-row' });
    await logSet(w, 'straight', b, { exerciseId: 'ex-row' });
    await logSet(other, 'straight', c);
    await logSet(other, 'straight', c);
    await dbm.deleteWorkoutSet(U, first);
    await dbm.renumberWorkoutSets(w.workoutId, w.exerciseId);
    expect((await rows(w)).map((r) => r.set_number)).toEqual([1]);
    expect((await rows(w, 'ex-row')).map((r) => r.set_number)).toEqual([1, 2]);
    expect((await rows(other)).map((r) => r.set_number)).toEqual([1, 2]);
  });

  test('missing ids are a benign empty result', async () => {
    expect(await dbm.renumberWorkoutSets(null, 'ex')).toEqual([]);
    expect(await dbm.renumberWorkoutSets('w', undefined)).toEqual([]);
  });
});

describe('updateWorkoutSet evidenceClass', () => {
  test('sets and clears the stored evidence class', async () => {
    const w = fresh();
    const id = await logSet(w, 'straight', [], { evidenceClass: null });
    await dbm.updateWorkoutSet(id, { setType: 'straight', evidenceClass: 'circuit' });
    expect((await rows(w))[0].evidence_class).toBe('circuit');
    await dbm.updateWorkoutSet(id, { setType: 'warmup', evidenceClass: null });
    const r = (await rows(w))[0];
    expect(r.evidence_class).toBeNull();
    expect(r.set_type).toBe('warmup');
  });

  test('an update that does not mention it leaves it alone', async () => {
    const w = fresh();
    const id = await logSet(w, 'straight', [], { evidenceClass: 'ballistic' });
    await dbm.updateWorkoutSet(id, { notes: 'felt good' });
    expect((await rows(w))[0].evidence_class).toBe('ballistic');
  });
});
