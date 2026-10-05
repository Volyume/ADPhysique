/**
 * swapScope.review.test.js -- D219 lane A4, the phase-close review's findings 1
 * and 2 (design 4.12: "The swapped-in exercise is checked against the caps like
 * any other", "the planner re-solves the week"; register D219 "Addition"
 * 2026-10-04: "the new exercise should have the same sets and reps ideally so we
 * don't misplace load").
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) and the REAL planner: the case is the
 * review's own, a general plan for an intermediate lifter, 4 days a week, 75
 * minutes, full gym, saved by generateAndSavePlan (Upper A, Lower A, Upper B,
 * Lower B), with the block moved to week 5. Every number below is read back
 * through the real resolver the logger, the mini bar and the plan screens share
 * (sessionAdjustments.getSessionWeeklyAllocation). A real transaction adapter,
 * so the swap's write is held to the same all-or-nothing rule as the app's.
 *
 * What it pins, each of which fails on the code before this fix:
 *
 *  - FINDING 1, a one-off swap past the new exercise's cap. The week's sets come
 *    from the SLOT (the plan has no idea a one-off happened), so an isolation
 *    exercise swapped into a slot that serves a compound's 4 sets was served 4,
 *    over its cap of 3, whenever the logger re-read the week (a remount, a crash
 *    restore, the refetch after a permanent swap); only the in-workout clamp held
 *    it. The exercise in the slot now carries its own cap into the resolver:
 *    3 for the Cable Straight-Arm Pulldown in week 5, on every read, with the plan
 *    untouched.
 *  - FINDING 2, a permanent swap to another muscle did not move the slot's sets.
 *    Lower B's Leg Extension (2 sets, quads) swapped for good to a glute
 *    isolation left the quads target at 10 for two squats that can hold 8 (a
 *    shortfall) and the glutes at 6 for three slots (the Machine Hip Thrust cut
 *    from 3 to 2). Now the slot's served sets move from the quads' rows to the
 *    glutes' for the current and later weeks (past weeks keep theirs), its share
 *    of each muscle moves in the plan's facts the same way, and the week reads:
 *    2 on the new exercise, 3 on the Machine Hip Thrust, no quads shortfall.
 *    A swap within a muscle, and a plan that is not the active one, move nothing.
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
    // A REAL transaction: a throw inside the task rolls the whole write back.
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

const {
  db, insertExerciseWithId, getAllExercises, getRoutineExercisesWithDetails, getProgrammePlanFacts,
  getCurrentMesocycleWeek, getActiveBlock, getPlannedMuscleVolumeForBlock,
} = require('../database');
const { generateAndSavePlan } = require('../planAutoGen');
const { canonicalExerciseId } = require('../exercise/canonicalId');
const { applyExerciseSwap } = require('../exercise/swapApply');
const { SWAP_SCOPE } = require('../exercise/swapScope');
const { prescribeWeek } = require('../plan/prescribe');
const { exerciseCap } = require('../plan/science');
const {
  getSessionWeeklyAllocation, getPlanServeContextForRoutine, getCurrentWeekPlanSets,
} = require('../sessionAdjustments');
const { LIBRARY } = require('./campaign16.helpers');

// The review's case: a general plan, 4 days a week, 75 minutes, full gym.
const PROFILE = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75, equipment: 'full_gym',
  trainingGoal: 'general', trainingPhase: 'maintain', recoveryRating: 'average',
};

let conn;
let library;
let userNo = 0;

beforeAll(async () => {
  conn = await db();
  for (const e of LIBRARY) {
    // eslint-disable-next-line no-await-in-loop
    await insertExerciseWithId(canonicalExerciseId(e.name), {
      name: e.name, primaryMuscle: e.primaryMuscle, secondaryMuscles: e.secondaryMuscles,
      equipment: e.equipment, equipmentCategory: e.equipmentCategory, compoundIsolation: e.compoundIsolation,
      movementPattern: e.movementPattern, subregion: e.subregion, equipmentProfiles: e.equipmentProfiles,
      difficulty: e.difficulty, stimulusToFatigueRatio: e.stimulusToFatigueRatio, minReps: e.minReps, maxReps: e.maxReps,
    });
  }
  library = await getAllExercises();
});

const exerciseNamed = (name) => {
  const found = library.find((e) => e.name === name);
  if (!found) throw new Error(`the library has no ${name}`);
  return found;
};

// Local day key, as activatePlanWithBlock writes a block's start.
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Put the running block in week `weekIndex` (1 to 6) by moving its start back. */
async function setBlockWeek(blockId, weekIndex) {
  const start = new Date();
  start.setDate(start.getDate() - (weekIndex - 1) * 7);
  await conn.runAsync('UPDATE mesocycles SET start_date = ? WHERE id = ?', [dayKey(start), blockId]);
}

/** The review's plan, saved for a fresh user, the block in week 5. */
async function seedPlan() {
  userNo += 1;
  const userId = `user-a4-review-${userNo}`;
  const saved = await generateAndSavePlan(userId, PROFILE);
  expect(saved.ok).toBe(true);
  const block = await getActiveBlock(userId);
  await setBlockWeek(block.id, 5);
  const week = await getCurrentMesocycleWeek(userId);
  expect(week.weekIndex).toBe(5);
  const routines = await conn.getAllAsync('SELECT id, name FROM routines WHERE programme_id = ? ORDER BY position', [saved.programmeId]);
  const routine = (name) => routines.find((r) => r.name === name);
  return { userId, programmeId: saved.programmeId, block, week, routine };
}

const rowsOf = (routineId) => getRoutineExercisesWithDetails(routineId);
const rowNamed = (rows, name) => {
  const row = rows.find((r) => r.exercise.name === name);
  if (!row) throw new Error(`no ${name} in the session`);
  return row;
};

// What the logger shows for a session's exercises in `week`, by exercise id.
async function served({ week, routineId, exercises }) {
  const { allocation } = await getSessionWeeklyAllocation({
    workout: { mesocycleWeekId: week.id, routineId },
    exercises,
  });
  return allocation ?? {};
}

const targetsOf = async (blockId) => {
  const out = {};
  for (const r of await getPlannedMuscleVolumeForBlock(blockId)) {
    out[r.week_index] = out[r.week_index] || {};
    out[r.week_index][r.muscle] = r.planned_sets;
  }
  return out;
};

describe('finding 1: a one-off swap is served inside the new exercise\'s own cap', () => {
  const ISOLATION_CAP = exerciseCap('isolation');

  test('the premise: week 5 serves the Upper A Lat Pulldown a compound\'s sets, above an isolation exercise\'s cap', async () => {
    const { week, routine } = await seedPlan();
    const rows = await rowsOf(routine('Upper A').id);
    const lat = rowNamed(rows, 'Lat Pulldown (Wide Grip)');
    expect(lat.exercise.compoundIsolation).toBe('compound');
    const allocation = await served({ week, routineId: routine('Upper A').id, exercises: rows });
    expect(allocation[lat.exercise.id]).toBeGreaterThan(ISOLATION_CAP);
  });

  test('swapped for an isolation pulldown for one session it is served 3, on every read, and the plan is untouched', async () => {
    const { week, routine } = await seedPlan();
    const upperA = routine('Upper A');
    const rows = await rowsOf(upperA.id);
    const lat = rowNamed(rows, 'Lat Pulldown (Wide Grip)');
    const isolation = exerciseNamed('Cable Straight-Arm Pulldown');
    expect(isolation.compoundIsolation).toBe('isolation');
    // The logger's rows after a one-off swap: the new exercise in the slot's own routineExercise.
    const asLogged = rows.map((r) => (r === lat ? { ...r, exercise: isolation } : r));

    const first = await served({ week, routineId: upperA.id, exercises: asLogged });
    expect(first[isolation.id]).toBe(ISOLATION_CAP);
    expect(ISOLATION_CAP).toBe(3);
    // A remount, a crash restore: the same rows read again, from nothing but the rows.
    const again = await served({ week, routineId: upperA.id, exercises: asLogged.map((r) => ({ ...r, routineExercise: { ...r.routineExercise } })) });
    expect(again[isolation.id]).toBe(ISOLATION_CAP);

    // The rest of the session is served as it was, and the plan never held the one-off.
    const before = await served({ week, routineId: upperA.id, exercises: rows });
    for (const r of rows) {
      if (r !== lat) expect(again[r.exercise.id]).toBe(before[r.exercise.id]);
    }
    const after = await rowsOf(upperA.id);
    expect(rowNamed(after, 'Lat Pulldown (Wide Grip)').routineExercise.id).toBe(lat.routineExercise.id);
  });

  test('swapped for a compound the slot\'s sets are kept: the cap is the exercise\'s own, not a cut', async () => {
    const { week, routine } = await seedPlan();
    const upperA = routine('Upper A');
    const rows = await rowsOf(upperA.id);
    const lat = rowNamed(rows, 'Lat Pulldown (Wide Grip)');
    const closeGrip = exerciseNamed('Lat Pulldown (Close Grip)');
    const asLogged = rows.map((r) => (r === lat ? { ...r, exercise: closeGrip } : r));
    const planned = (await served({ week, routineId: upperA.id, exercises: rows }))[lat.exercise.id];
    expect((await served({ week, routineId: upperA.id, exercises: asLogged }))[closeGrip.id]).toBe(planned);
  });

  test('the person\'s own typed count is served as typed, even over the swapped-in exercise\'s cap (design 4.3)', async () => {
    const { programmeId, week, routine } = await seedPlan();
    const upperA = routine('Upper A');
    const rows = await rowsOf(upperA.id);
    const lat = rowNamed(rows, 'Lat Pulldown (Wide Grip)');
    const facts = await getProgrammePlanFacts(programmeId);
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', [JSON.stringify({ ...facts, typed: { [lat.routineExercise.id]: 5 } }), programmeId]);
    const isolation = exerciseNamed('Cable Straight-Arm Pulldown');
    const asLogged = rows.map((r) => (r === lat ? { ...r, exercise: isolation } : r));
    expect((await served({ week, routineId: upperA.id, exercises: asLogged }))[isolation.id]).toBe(5);
  });

  test('a permanent swap to the same isolation exercise is served inside the cap on the refetch too', async () => {
    const { userId, week, routine } = await seedPlan();
    const upperA = routine('Upper A');
    const rows = await rowsOf(upperA.id);
    const lat = rowNamed(rows, 'Lat Pulldown (Wide Grip)');
    const isolation = exerciseNamed('Cable Straight-Arm Pulldown');
    await applyExerciseSwap({
      userId, scope: SWAP_SCOPE.PROGRAMME, routineId: upperA.id, routineExerciseId: lat.routineExercise.id,
      fromExercise: lat.exercise, toExercise: isolation,
    });
    const refetched = await rowsOf(upperA.id);
    expect((await served({ week, routineId: upperA.id, exercises: refetched }))[isolation.id]).toBeLessThanOrEqual(ISOLATION_CAP);
    // The logger's refetch hands the resolver its in-memory rows, the new exercise in the slot's own row.
    const inMemory = rows.map((r) => (r === lat ? { ...r, exercise: isolation } : r));
    expect((await served({ week, routineId: upperA.id, exercises: inMemory }))[isolation.id]).toBeLessThanOrEqual(ISOLATION_CAP);
  });
});

describe('finding 2: a permanent swap to another muscle moves the slot\'s sets', () => {
  async function swapLegExtensionForGlutes(plan) {
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    const glute = exerciseNamed('Glute Kickback Machine');
    const result = await applyExerciseSwap({
      userId: plan.userId, scope: SWAP_SCOPE.PROGRAMME, routineId: lowerB.id, routineExerciseId: legExt.routineExercise.id,
      fromExercise: legExt.exercise, toExercise: glute,
    });
    return { lowerB, legExt, glute, result };
  }

  // The week as the planner solves it now: what it could not place, by muscle.
  async function shortfallOf(plan, routineId) {
    const context = await getPlanServeContextForRoutine(routineId);
    const weekTargets = (await targetsOf(plan.block.id))[5];
    return prescribeWeek({
      sessions: context.sessions, weekTargets,
      facts: { exposureShares: context.facts.exposureShares, sessionCaps: context.facts.sessionCaps },
    }).shortfall;
  }

  test('the new exercise gets the old slot\'s sets, the rest of the session keeps its own, and the quads show no shortfall', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rowsBefore = await rowsOf(lowerB.id);
    const legExt = rowNamed(rowsBefore, 'Leg Extension');
    const before = await served({ week: plan.week, routineId: lowerB.id, exercises: rowsBefore });
    const quadsShortBefore = (await shortfallOf(plan, lowerB.id)).quads ?? 0;
    expect(before[legExt.exercise.id]).toBeGreaterThanOrEqual(1);
    expect(quadsShortBefore).toBe(0);

    const { glute, result } = await swapLegExtensionForGlutes(plan);
    expect(result.muscleChange).toEqual({ from: 'quads', to: 'glutes' });

    const rows = await rowsOf(lowerB.id);
    const after = await served({ week: plan.week, routineId: lowerB.id, exercises: rows });
    // The slot's sets went with it, and nobody else in the session lost one.
    expect(after[glute.id]).toBe(before[legExt.exercise.id]);
    for (const r of rowsBefore) {
      if (r !== legExt) expect(after[r.exercise.id]).toBe(before[r.exercise.id]);
    }
    const shortfall = await shortfallOf(plan, lowerB.id);
    expect(shortfall.quads ?? 0).toBe(0);
    expect(shortfall.glutes ?? 0).toBe(0);
  });

  test('the review\'s case in numbers: Leg Extension 2 sets goes to the glute exercise, the Machine Hip Thrust keeps 3', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rowsBefore = await rowsOf(lowerB.id);
    const before = await served({ week: plan.week, routineId: lowerB.id, exercises: rowsBefore });
    // The premise is the review's plan, as the planner built it then; if the planner's
    // served numbers have since changed, re-read the case, the relations above still hold.
    expect(before[rowNamed(rowsBefore, 'Leg Extension').exercise.id]).toBe(2);
    expect(before[rowNamed(rowsBefore, 'Machine Hip Thrust').exercise.id]).toBe(3);

    const { glute } = await swapLegExtensionForGlutes(plan);
    const rows = await rowsOf(lowerB.id);
    const after = await served({ week: plan.week, routineId: lowerB.id, exercises: rows });
    expect(after[glute.id]).toBe(2);
    expect(after[rowNamed(rows, 'Machine Hip Thrust').exercise.id]).toBe(3);
  });

  test('the sets move for the current and later weeks by what each week served; past weeks keep theirs', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    const weeks = await conn.getAllAsync('SELECT id, week_index FROM mesocycle_weeks WHERE mesocycle_id = ? ORDER BY week_index', [plan.block.id]);
    const servedBefore = {};
    for (const w of weeks) {
      // eslint-disable-next-line no-await-in-loop
      servedBefore[w.week_index] = (await served({ week: w, routineId: lowerB.id, exercises: rows }))[legExt.exercise.id];
    }
    const targetsBefore = await targetsOf(plan.block.id);

    await swapLegExtensionForGlutes(plan);

    const targetsAfter = await targetsOf(plan.block.id);
    for (const w of weeks) {
      const i = w.week_index;
      const moved = i >= 5 ? servedBefore[i] : 0;
      expect(targetsAfter[i].quads).toBe(targetsBefore[i].quads - moved);
      expect(targetsAfter[i].glutes).toBe(targetsBefore[i].glutes + moved);
      // Nothing else in the week moves.
      for (const [muscle, sets] of Object.entries(targetsBefore[i])) {
        if (muscle !== 'quads' && muscle !== 'glutes') expect(targetsAfter[i][muscle]).toBe(sets);
      }
    }
    expect(servedBefore[5]).toBeGreaterThanOrEqual(1);
  });

  test('the slot\'s share of each muscle moves in the plan\'s facts the same way, and the facts\' targets follow', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    const before = await getProgrammePlanFacts(plan.programmeId);
    const targetsBefore = (await targetsOf(plan.block.id))[5];
    const moved = (await served({ week: plan.week, routineId: lowerB.id, exercises: rows }))[legExt.exercise.id];

    await swapLegExtensionForGlutes(plan);

    const after = await getProgrammePlanFacts(plan.programmeId);
    const targetsAfter = (await targetsOf(plan.block.id))[5];
    // Every other session keeps exactly the sets its share was worth; the slot's session gives up and takes on the moved sets.
    const worth = (facts, targets, muscle, sessionId) => (facts.exposureShares?.[muscle]?.[sessionId] ?? 0) * targets[muscle];
    for (const session of Object.keys({ ...before.exposureShares.quads, ...before.exposureShares.glutes })) {
      if (session === lowerB.id) continue;
      expect(worth(after, targetsAfter, 'quads', session)).toBeCloseTo(worth(before, targetsBefore, 'quads', session), 9);
      expect(worth(after, targetsAfter, 'glutes', session)).toBeCloseTo(worth(before, targetsBefore, 'glutes', session), 9);
    }
    expect(worth(after, targetsAfter, 'quads', lowerB.id)).toBeCloseTo(worth(before, targetsBefore, 'quads', lowerB.id) - moved, 9);
    expect(worth(after, targetsAfter, 'glutes', lowerB.id)).toBeCloseTo(worth(before, targetsBefore, 'glutes', lowerB.id) + moved, 9);
    for (const muscle of ['quads', 'glutes']) {
      expect(Object.values(after.exposureShares[muscle]).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    }
    // The facts' own record of every week's targets follows, for the current week and not the first.
    expect(after.weeklyTargets.quads[4]).toBe(before.weeklyTargets.quads[4] - moved);
    expect(after.weeklyTargets.glutes[4]).toBe(before.weeklyTargets.glutes[4] + moved);
    expect(after.weeklyTargets.quads[0]).toBe(before.weeklyTargets.quads[0]);
    // The rest of the plan's facts are as they were.
    expect(after.roles).toEqual(before.roles);
    expect(after.version).toBe(2);
  });

  test('a swap within a muscle moves nothing: the rows and the shares are byte-identical', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    const targetsBefore = JSON.stringify(await targetsOf(plan.block.id));
    const sharesBefore = JSON.stringify((await getProgrammePlanFacts(plan.programmeId)).exposureShares);
    await applyExerciseSwap({
      userId: plan.userId, scope: SWAP_SCOPE.PROGRAMME, routineId: lowerB.id, routineExerciseId: legExt.routineExercise.id,
      fromExercise: legExt.exercise, toExercise: exerciseNamed('Single-Leg Leg Extension'),
    });
    expect(JSON.stringify(await targetsOf(plan.block.id))).toBe(targetsBefore);
    expect(JSON.stringify((await getProgrammePlanFacts(plan.programmeId)).exposureShares)).toBe(sharesBefore);
  });

  test('a one-off never moves a set', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    const targetsBefore = JSON.stringify(await targetsOf(plan.block.id));
    const factsBefore = JSON.stringify(await getProgrammePlanFacts(plan.programmeId));
    await applyExerciseSwap({
      userId: plan.userId, scope: SWAP_SCOPE.SESSION, routineId: lowerB.id, routineExerciseId: legExt.routineExercise.id,
      fromExercise: legExt.exercise, toExercise: exerciseNamed('Glute Kickback Machine'),
    });
    expect(JSON.stringify(await targetsOf(plan.block.id))).toBe(targetsBefore);
    expect(JSON.stringify(await getProgrammePlanFacts(plan.programmeId))).toBe(factsBefore);
  });

  test('a plan that is not the active one has no running block to move sets in: only the facts follow', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    await conn.runAsync('UPDATE programmes SET is_active = 0 WHERE id = ?', [plan.programmeId]);
    const targetsBefore = JSON.stringify(await targetsOf(plan.block.id));
    const sharesBefore = JSON.stringify((await getProgrammePlanFacts(plan.programmeId)).exposureShares);
    const result = await applyExerciseSwap({
      userId: plan.userId, scope: SWAP_SCOPE.PROGRAMME, routineId: lowerB.id, routineExerciseId: legExt.routineExercise.id,
      fromExercise: legExt.exercise, toExercise: exerciseNamed('Glute Kickback Machine'),
    });
    expect(result.plan).toBe(true);
    expect(JSON.stringify(await targetsOf(plan.block.id))).toBe(targetsBefore);
    expect(JSON.stringify((await getProgrammePlanFacts(plan.programmeId)).exposureShares)).toBe(sharesBefore);
  });

  test('swapping back is an exact inverse for the weekly targets of the current and later weeks', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    const targetsBefore = await targetsOf(plan.block.id);
    const { glute } = await swapLegExtensionForGlutes(plan);
    await applyExerciseSwap({
      userId: plan.userId, scope: SWAP_SCOPE.PROGRAMME, routineId: lowerB.id, routineExerciseId: legExt.routineExercise.id,
      fromExercise: glute, toExercise: legExt.exercise,
    });
    expect(await targetsOf(plan.block.id)).toEqual(targetsBefore);
  });

  test('a protective row is never raised: a muscle held down by an injury protocol takes nothing, and nothing leaves the quads', async () => {
    const plan = await seedPlan();
    const lowerB = plan.routine('Lower B');
    const rows = await rowsOf(lowerB.id);
    const legExt = rowNamed(rows, 'Leg Extension');
    await conn.runAsync(
      `UPDATE planned_muscle_volume SET source = 'reintroduction'
        WHERE muscle = 'glutes' AND mesocycle_week_id IN (SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ?)`,
      [plan.block.id],
    );
    const targetsBefore = JSON.stringify(await targetsOf(plan.block.id));
    await applyExerciseSwap({
      userId: plan.userId, scope: SWAP_SCOPE.PROGRAMME, routineId: lowerB.id, routineExerciseId: legExt.routineExercise.id,
      fromExercise: legExt.exercise, toExercise: exerciseNamed('Glute Kickback Machine'),
    });
    expect(JSON.stringify(await targetsOf(plan.block.id))).toBe(targetsBefore);
  });
});

describe('finding 3, the half that is the resolver: the plan screen\'s number is the logger\'s', () => {
  test('week 5 of the 4-day plan: what the routine screen resolves is what the logger serves, and it is not the stored week-1 count', async () => {
    const plan = await seedPlan();
    let differs = 0;
    for (const name of ['Upper A', 'Lower A', 'Upper B', 'Lower B']) {
      const routineId = plan.routine(name).id;
      // eslint-disable-next-line no-await-in-loop
      const rows = await rowsOf(routineId);
      // eslint-disable-next-line no-await-in-loop
      const bySlot = await getCurrentWeekPlanSets({ userId: plan.userId, routineId, rows });
      // eslint-disable-next-line no-await-in-loop
      const logger = await served({ week: plan.week, routineId, exercises: rows });
      expect(bySlot).not.toBeNull();
      for (const r of rows) {
        expect(bySlot[r.routineExercise.id]).toBe(logger[r.exercise.id]);
        if (bySlot[r.routineExercise.id] !== r.routineExercise.recommendedSets) differs += 1;
      }
    }
    expect(differs).toBeGreaterThan(10);
  });
});
