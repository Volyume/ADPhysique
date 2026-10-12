/**
 * offseasonAllan.integration.test.js -- register D227, "Mens Physique Off
 * Season - Allan", end to end through the REAL code on real SQLite
 * (node:sqlite, the real init path, the real exercise and plan seeds).
 *
 * What this pins (spec docs/audit/offseason-allan-2026-10-12/01-SPEC.md), each
 * failing on the code before lane A:
 *   - SEEDING (A1, A3): the library plan is created with its authored facts and
 *     every exercise and substitution resolves (none skipped).
 *   - INSTALL KEEPS THE AUTHORED SETS (C2): the copy carries the facts re-keyed
 *     to its own routines, and the planner's rebuild leaves it exactly as it is
 *     (before lane A a copy had no facts and rebuildFixed rewrote every set).
 *     A copy that arrived without facts gets them back before any rebuild.
 *   - THE BLOCK (B1, B3): activation writes an 8-week block, the A6 week RIR
 *     ladder, the recovery week at week 8, and planned volume from the
 *     authored ladder (source 'authored'), never the template.
 *   - SERVING (C1): the logger's own resolver (getSessionWeeklyAllocation)
 *     serves A5 exactly, week by week: 71, 80, 93 x 5, 47; then block 2 from
 *     the plan screen's next-block path: 93 x 7, 47.
 *   - CLOSED LIST (F1): the serve-time and kit substitute scope, resolved from
 *     the active plan, admits only an exercise's listed options.
 *   - EVERY OTHER PLAN UNCHANGED: a non-authored library copy gets no facts and
 *     the standard 6-week template block.
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
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try {
        await fn();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
    isInTransactionSync: () => raw.isTransaction,
    closeAsync: async () => {},
  };
  return { openEncryptedDb: async () => ({ db: adapt, encrypted: true }), __raw: raw };
});
jest.mock('expo-sqlite');
jest.mock('../sync', () => ({ scheduleSync: () => {} }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: async (k) => (store.has(k) ? store.get(k) : null),
      setItem: async (k, v) => { store.set(k, String(v)); },
      removeItem: async (k) => { store.delete(k); },
      multiRemove: async (keys) => { keys.forEach((k) => store.delete(k)); },
      __store: store,
    },
  };
});

const { logError } = require('../errorLog');
const {
  db, activatePlanWithBlock, copyPlanFromLibrary, getLibraryPlans, getProgrammePlanFacts, setProgrammePlanFacts,
  getAllExercises, getRoutinesForPlan, getRoutineExercisesWithDetails, getMesocycleWeeks,
} = require('../database');
const { seedExercisesIfNeeded } = require('../seedExercises');
const { seedRoutinesIfNeeded } = require('../seedRoutines');
const { ensureActivePlanRebuilt, __resetPlanRebuildForTests } = require('../planRebuild');
const { getSessionWeeklyAllocation } = require('../sessionAdjustments');
const { loadSubstituteScope } = require('../sessionEffective');
const { isAuthoredFacts, authoredSwapOptions } = require('../library/authored');
const { BLOCK } = require('../plan/science');

const NAME = 'Mens Physique Off Season - Allan';
const PROFILE = {
  experience: 'advanced', daysPerWeek: 4, sessionLengthMinutes: 75, equipment: 'machines_cables',
  trainingGoal: 'mens_physique', trainingPhase: 'build', recoveryRating: 'average',
};
// Per routine, the A5 column totals: [Ramp 1, Ramp 2, Growth, Reduction].
const BY_SESSION = { 'Back Width A': [19, 22, 24, 14], 'Upper Chest & Arms': [17, 20, 23, 11], 'Legs, Delts & Lats': [16, 18, 22, 11], 'Back Width B & Arms': [19, 20, 24, 11] };

let conn;
let library;
let libPlan;
beforeAll(async () => {
  conn = await db();
  await seedExercisesIfNeeded();
  await seedRoutinesIfNeeded('user-d227-seed');
  library = await getAllExercises();
  libPlan = (await getLibraryPlans()).find((p) => p.name === NAME);
});
beforeEach(() => {
  __resetPlanRebuildForTests();
  logError.mockClear();
});

const routinesWithRows = async (programmeId) => {
  const out = [];
  for (const routine of await getRoutinesForPlan(programmeId)) {
    out.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
  }
  return out;
};
const storedSets = async (programmeId) => (await routinesWithRows(programmeId))
  .map(({ routine, rows }) => [routine.name, rows.map((r) => [r.exercise.name, r.routineExercise.recommendedSets])]);

// What the logger serves in every session of block week `weekRow`.
async function servedTotals(programmeId, weekRow) {
  const out = {};
  for (const { routine, rows } of await routinesWithRows(programmeId)) {
    const { allocation } = await getSessionWeeklyAllocation({
      workout: { mesocycleWeekId: weekRow.id, routineId: routine.id }, exercises: rows,
    });
    out[routine.name] = rows.reduce((a, r) => a + (allocation?.[r.exercise.id] ?? 0), 0);
  }
  return out;
}

test('seeding creates the library plan with its authored facts, every name resolved', async () => {
  expect(libPlan).toBeDefined();
  const facts = await getProgrammePlanFacts(libPlan.id);
  expect(isAuthoredFacts(facts)).toBe(true);
  const libRoutines = await routinesWithRows(libPlan.id);
  expect(libRoutines.map((x) => x.routine.name)).toEqual(Object.keys(BY_SESSION));
  facts.authored.sessions.forEach((s, i) => {
    expect(s.routineId).toBe(libRoutines[i].routine.id);
    s.exercises.forEach((x, j) => {
      expect(x.exerciseId).toBe(libRoutines[i].rows[j].exercise.id);
      expect(x.routineExerciseId).toBe(libRoutines[i].rows[j].routineExercise.id);
      for (const sub of x.subs) expect(sub.exerciseId).toBeTruthy();
    });
  });
  // Stored with Ramp 1's sets: 71 in all.
  const total = libRoutines.flatMap((x) => x.rows).reduce((a, r) => a + r.routineExercise.recommendedSets, 0);
  expect(total).toBe(71);
});

describe('installing and running the plan', () => {
  const U = 'user-d227-allan';
  let copy;
  let before;

  beforeAll(async () => {
    copy = await copyPlanFromLibrary(libPlan.id, U);
    before = await storedSets(copy.id);
  });

  test('the copy carries the facts, re-keyed to its own routines and rows', async () => {
    const facts = await getProgrammePlanFacts(copy.id);
    expect(isAuthoredFacts(facts)).toBe(true);
    const rows = await routinesWithRows(copy.id);
    facts.authored.sessions.forEach((s, i) => {
      expect(s.routineId).toBe(rows[i].routine.id);
      s.exercises.forEach((x, j) => expect(x.routineExerciseId).toBe(rows[i].rows[j].routineExercise.id));
    });
    expect(facts.authored.run).toBeNull();
  });

  test('activation writes an 8-week block, the A6 ladder and the authored planned volume', async () => {
    const blockId = await activatePlanWithBlock(U, copy.id, NAME, { allowLearnedCarry: false });
    const meso = await conn.getFirstAsync('SELECT * FROM mesocycles WHERE id = ?', [blockId]);
    expect(meso.planned_weeks).toBe(8);
    expect(meso.deload_week).toBe(8);
    expect(JSON.parse(meso.rir_ladder)).toEqual([2, 2, 1, 1, 1, 1, 1, 3]);
    const weeks = await getMesocycleWeeks(blockId);
    expect(weeks.map((w) => w.rir_target ?? w.rirTarget)).toEqual([2, 2, 1, 1, 1, 1, 1, 3]);
    expect(weeks.map((w) => Number(w.is_deload ?? w.isDeload))).toEqual([0, 0, 0, 0, 0, 0, 0, 1]);
    const planned = await conn.getAllAsync(
      `SELECT w.week_index, p.muscle, p.planned_sets, p.mev, p.mrv, p.source FROM planned_muscle_volume p
         JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id WHERE w.mesocycle_id = ?`, [blockId],
    );
    expect(new Set(planned.map((r) => r.source))).toEqual(new Set(['authored']));
    const weekSum = (i) => planned.filter((r) => r.week_index === i).reduce((a, r) => a + r.planned_sets, 0);
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(weekSum)).toEqual([71, 80, 93, 93, 93, 93, 93, 47]);
    const row = (i, m) => planned.find((r) => r.week_index === i && r.muscle === m);
    expect(row(3, 'side_delts')).toMatchObject({ planned_sets: 20, mev: 12, mrv: 22 });
    expect(row(3, 'back')).toMatchObject({ planned_sets: 23, mev: 16, mrv: 26 });
    expect(row(3, 'glutes')).toMatchObject({ planned_sets: 0, mev: 0, mrv: 0 });
    const facts = await getProgrammePlanFacts(copy.id);
    expect(facts.authored.run).toEqual({ block: 1, mesocycleId: blockId, blocks: { [blockId]: 1 } });
  });

  test('the planner\'s rebuild never touches it: every stored set is the author\'s', async () => {
    const res = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(res.status).toBe('current');
    expect(await storedSets(copy.id)).toEqual(before);
    expect((await getProgrammePlanFacts(copy.id)).kind).toBe('authored');
  });

  test('block 1 is served exactly as A5, week by week', async () => {
    const block = await conn.getFirstAsync('SELECT id FROM mesocycles WHERE user_id = ? AND is_active = 1', [U]);
    const weeks = await getMesocycleWeeks(block.id);
    const phaseCol = [0, 1, 2, 2, 2, 2, 2, 3];
    const totals = [];
    for (let i = 0; i < 8; i += 1) {
      const served = await servedTotals(copy.id, weeks[i]);
      expect(served).toEqual(Object.fromEntries(Object.entries(BY_SESSION).map(([k, v]) => [k, v[phaseCol[i]]])));
      totals.push(Object.values(served).reduce((a, b) => a + b, 0));
    }
    expect(totals).toEqual([71, 80, 93, 93, 93, 93, 93, 47]);
  });

  test('the serve-time and kit stand-in scope admits only listed options', async () => {
    const facts = await getProgrammePlanFacts(copy.id);
    const scope = await loadSubstituteScope(U, { equipment: null });
    expect(typeof scope).toBe('function');
    const byId = new Map(library.map((e) => [e.id, e]));
    for (const s of facts.authored.sessions) {
      for (const x of s.exercises) {
        const original = byId.get(x.exerciseId);
        const options = authoredSwapOptions(facts, x.exerciseId);
        for (const c of library) {
          if (c.id !== original.id && scope(c, original)) expect(options.has(c.id)).toBe(true);
        }
      }
    }
  });

  test('the next block is block 2: Growth x 7 then the reduction week', async () => {
    const blockId = await activatePlanWithBlock(U, copy.id, NAME, { allowLearnedCarry: false });
    const meso = await conn.getFirstAsync('SELECT * FROM mesocycles WHERE id = ?', [blockId]);
    expect(JSON.parse(meso.rir_ladder)).toEqual([1, 1, 1, 1, 1, 1, 1, 3]);
    const weeks = await getMesocycleWeeks(blockId);
    const totals = [];
    for (const w of weeks) totals.push(Object.values(await servedTotals(copy.id, w)).reduce((a, b) => a + b, 0));
    expect(totals).toEqual([93, 93, 93, 93, 93, 93, 93, 47]);
    expect((await getProgrammePlanFacts(copy.id)).authored.run.block).toBe(2);
    expect(await storedSets(copy.id)).toEqual(before);
  });
});

test('a copy that arrived without facts gets them back, and is never rebuilt', async () => {
  const U = 'user-d227-nofacts';
  const copy = await copyPlanFromLibrary(libPlan.id, U);
  const before = await storedSets(copy.id);
  await setProgrammePlanFacts(copy.id, null);
  await activatePlanWithBlock(U, copy.id, NAME, { allowLearnedCarry: false });
  const res = await ensureActivePlanRebuilt(U, { profile: PROFILE });
  expect(res.status).toBe('current');
  expect(isAuthoredFacts(await getProgrammePlanFacts(copy.id))).toBe(true);
  expect(await storedSets(copy.id)).toEqual(before);
});

test('every other library plan is unchanged: no facts on the copy, the 6-week template block', async () => {
  const U = 'user-d227-other';
  const other = (await getLibraryPlans()).find((p) => p.name === 'Aesthetic Upper Rotation');
  const copy = await copyPlanFromLibrary(other.id, U);
  expect(await getProgrammePlanFacts(copy.id)).toBeNull();
  const blockId = await activatePlanWithBlock(U, copy.id, other.name, { allowLearnedCarry: false });
  const meso = await conn.getFirstAsync('SELECT * FROM mesocycles WHERE id = ?', [blockId]);
  expect(meso.planned_weeks).toBe(6);
  expect(JSON.parse(meso.rir_ladder)).toEqual([...BLOCK.rirLadder]);
  const sources = await conn.getAllAsync(
    `SELECT DISTINCT p.source FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id WHERE w.mesocycle_id = ?`, [blockId],
  );
  expect(sources.map((r) => r.source)).toEqual(['template']);
});
