/**
 * swapScope.plan.test.js -- D219 lane A4 (design 4.12, founder R10, register
 * D219 "Addition" 2026-10-04: "When people swap in a workout can they get an
 * option to swap as a one off or permanent. Also when doing swaps the new
 * exercise should have the same sets and reps ideally so we don't misplace
 * load").
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the real database module, the
 * harness of campaign16.prescription.test.js. What it pins and why; each
 * assertion marked NEW fails on the code before this lane:
 *
 *  - A PERMANENT swap (updateRoutineExerciseExercise, the plan-level path every
 *    permanent swap goes through) keeps the slot's sets and its REP RANGE across
 *    a tier change (NEW: it recalibrated reps to the new tier's band), lets REST
 *    follow the new exercise only where the rest was the outgoing tier's
 *    default, and clears the load (Campaign 16 job 7).
 *  - On a plan the new planner built (facts version 2) it writes the new
 *    exercise's muscle, kind and curated credits into facts.slots (NEW), keeps
 *    every other fact, reports the muscle a slot's sets move between (NEW), and
 *    a swap back is an exact inverse for the facts. On a plan it did not build
 *    (no facts, or another version) the facts are never touched.
 *  - A ONE-OFF swap (applyExerciseSwap, scope session) changes NOTHING in the
 *    plan: the routine row and the plan's facts are byte-identical afterwards,
 *    and the swap is logged as a session swap (never preference evidence). A
 *    PERMANENT one updates the routine and the facts and logs a programme swap.
 *    A scope it does not know, or a slot with no routine row, never edits the
 *    plan (NEW, all of it).
 *  - SERVING after a permanent swap stays inside the per-exercise caps in every
 *    week of a block, including a swap into another muscle and a swap from a
 *    compound to an isolation exercise, and the swapped-in slot is served as the
 *    planner's slot of its new muscle.
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
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const {
  db, insertExerciseWithId, createProgramme, createRoutine, addExerciseToRoutine,
  updateRoutineExerciseExercise, setProgrammePlanFacts, getProgrammePlanFacts,
  getRoutineExercisesWithDetails, activatePlanWithBlock,
} = require('../database');
const { applyExerciseSwap } = require('../exercise/swapApply');
const { SWAP_SCOPE } = require('../exercise/swapScope');
const { REST_SEC, REP_RANGES } = require('../exercise/prescription');
const { catalogueCredits } = require('../plan/catalogue');
const { prescribeWeek } = require('../plan/prescribe');
const { exerciseCap } = require('../plan/science');
const { buildPlanSessions, getSessionWeeklyAllocation } = require('../sessionAdjustments');

const U = 'user-a4-swaps';
let conn;
let planNo = 0;

const LIBRARY = [
  ['a4-squat', 'Barbell Back Squat', 'quads', 'barbell', 'compound', 6, 10],
  ['a4-legext', 'Leg Extension', 'quads', 'machine_selectorised', 'isolation', 10, 20],
  ['a4-legext1', 'Single Leg Extension', 'quads', 'machine_selectorised', 'isolation', 10, 15],
  ['a4-legpress', 'Leg Press', 'quads', 'machine_plate_loaded', 'compound', 8, 15],
  ['a4-curl', 'Seated Leg Curl', 'hamstrings', 'machine_selectorised', 'isolation', 10, 20],
  ['a4-abduct', 'Hip Abduction Machine', 'glutes', 'machine_selectorised', 'isolation', 10, 20],
  ['a4-curl2', 'Lying Leg Curl', 'hamstrings', 'machine_selectorised', 'isolation', 10, 20],
  ['a4-bench', 'Barbell Bench Press', 'chest', 'barbell', 'compound', 6, 10],
  ['a4-dbbench', 'Dumbbell Bench Press', 'chest', 'dumbbell', 'compound', 8, 12],
  ['a4-fly', 'Pec Deck (Machine Fly)', 'chest', 'machine_selectorised', 'isolation', 10, 20],
  ['a4-pushdown', 'Cable Triceps Pushdown', 'triceps', 'cable', 'isolation', 10, 15],
];

beforeAll(async () => {
  conn = await db();
  for (const [id, name, primaryMuscle, equipmentCategory, compoundIsolation, defaultRepMin, defaultRepMax] of LIBRARY) {
    // eslint-disable-next-line no-await-in-loop
    await insertExerciseWithId(id, {
      name, primaryMuscle, equipment: equipmentCategory.split('_')[0], equipmentCategory,
      compoundIsolation, defaultRepMin, defaultRepMax,
    });
  }
});

/**
 * A two-session plan as the planner would save it: Lower (squat 4 sets, leg
 * extension 3, leg curl 3) and Upper (bench 4, fly 3). `facts` is the plan's
 * plan_facts: the new planner's (version 2) unless the caller says otherwise.
 */
async function buildPlan({ facts = 'v2' } = {}) {
  planNo += 1;
  const prog = await createProgramme(U, `A4 plan ${planNo}`, '', 0, null, null, null, false);
  const lower = await createRoutine(U, 'Lower', null, 'upper_lower', 0, null, prog.id, false, false);
  const upper = await createRoutine(U, 'Upper', null, 'upper_lower', 0, null, prog.id, false, false);
  const H = REP_RANGES.heavy_compound;
  const I = REP_RANGES.isolation;
  await addExerciseToRoutine(lower.id, 'a4-squat', 0, H.repMin, H.repMax, null, 4, 100, REST_SEC.heavy_compound, null, false);
  await addExerciseToRoutine(lower.id, 'a4-legext', 1, I.repMin, I.repMax, null, 3, null, REST_SEC.isolation, null, false);
  await addExerciseToRoutine(lower.id, 'a4-curl', 2, I.repMin, I.repMax, null, 3, null, REST_SEC.isolation, null, false);
  await addExerciseToRoutine(upper.id, 'a4-bench', 0, H.repMin, H.repMax, null, 4, 80, REST_SEC.heavy_compound, null, false);
  await addExerciseToRoutine(upper.id, 'a4-fly', 1, I.repMin, I.repMax, null, 3, null, REST_SEC.isolation, null, false);
  if (facts === 'v2') {
    await setProgrammePlanFacts(prog.id, {
      version: 2,
      roles: { quads: 'standard', hamstrings: 'standard', chest: 'standard', glutes: 'standard', triceps: 'standard' },
      slots: {
        [lower.id]: {
          'a4-squat': { muscle: 'quads', kind: 'heavy_compound', credits: { glutes: 0.5, adductors: 0.5 } },
          'a4-legext': { muscle: 'quads', kind: 'isolation', credits: {} },
          'a4-curl': { muscle: 'hamstrings', kind: 'isolation', credits: {} },
        },
        [upper.id]: {
          'a4-bench': { muscle: 'chest', kind: 'heavy_compound', credits: { triceps: 0.5, front_delts: 0.5 } },
          'a4-fly': { muscle: 'chest', kind: 'isolation', credits: {} },
        },
      },
      typed: {},
      exposureShares: {},
      sessionCaps: {},
    }, { scheduleSync: false });
  } else if (facts != null) {
    await setProgrammePlanFacts(prog.id, facts, { scheduleSync: false });
  }
  return { prog, lower, upper };
}

const rowOf = (routineId, exerciseId) => conn.getFirstAsync(
  `SELECT id, exercise_id, exercise_name, recommended_sets AS sets, recommended_reps_min AS lo,
          recommended_reps_max AS hi, rest_seconds AS rest, starting_weight AS weight
     FROM routine_exercises WHERE routine_id = ? AND exercise_id = ?`,
  [routineId, exerciseId],
);
const rowById = (id) => conn.getFirstAsync('SELECT * FROM routine_exercises WHERE id = ?', [id]);
const factsText = async (programmeId) => (await conn.getFirstAsync('SELECT plan_facts FROM programmes WHERE id = ?', [programmeId])).plan_facts;
const exerciseObj = (id) => {
  const [, name, primaryMuscle, equipmentCategory, compoundIsolation] = LIBRARY.find((l) => l[0] === id);
  return { id, name, primaryMuscle, equipmentCategory, compoundIsolation };
};
const swapRows = () => conn.getAllAsync('SELECT * FROM exercise_swaps WHERE user_id = ? ORDER BY created_at, id', [U]);

describe('a permanent swap carries the slot\'s sets and reps (updateRoutineExerciseExercise)', () => {
  test('across a tier change the slot keeps its sets and rep range (NEW), rest follows the new exercise, the load is cleared', async () => {
    const { lower } = await buildPlan();
    const before = await rowOf(lower.id, 'a4-squat');
    expect(before).toMatchObject({ sets: 4, lo: 6, hi: 10, rest: REST_SEC.heavy_compound, weight: 100 });

    await updateRoutineExerciseExercise(before.id, 'a4-legext1');

    const after = await rowById(before.id);
    expect(after.exercise_id).toBe('a4-legext1');
    expect(after.exercise_name).toBe('Single Leg Extension');
    expect(after.recommended_sets).toBe(4);
    // NEW: the isolation tier's own band is 10 to 20; the slot's 6 to 10 stays.
    expect(after.recommended_reps_min).toBe(6);
    expect(after.recommended_reps_max).toBe(10);
    expect(after.recommended_reps_min).not.toBe(REP_RANGES.isolation.repMin);
    expect(after.rest_seconds).toBe(REST_SEC.isolation);
    expect(after.starting_weight).toBeNull();
  });

  test('a rest the person set stays through the tier change, and so do their reps', async () => {
    const { lower } = await buildPlan();
    const row = await rowOf(lower.id, 'a4-squat');
    await conn.runAsync('UPDATE routine_exercises SET rest_seconds = 200, recommended_reps_min = 7, recommended_reps_max = 9 WHERE id = ?', [row.id]);
    await updateRoutineExerciseExercise(row.id, 'a4-legext1');
    expect(await rowById(row.id)).toMatchObject({ rest_seconds: 200, recommended_reps_min: 7, recommended_reps_max: 9 });
  });

  test('a person-tuned rep range with the default rest: reps stay, rest still follows the new exercise', async () => {
    const { lower } = await buildPlan();
    const row = await rowOf(lower.id, 'a4-squat');
    await conn.runAsync('UPDATE routine_exercises SET recommended_reps_min = 8, recommended_reps_max = 12 WHERE id = ?', [row.id]);
    await updateRoutineExerciseExercise(row.id, 'a4-legext1');
    expect(await rowById(row.id)).toMatchObject({ recommended_reps_min: 8, recommended_reps_max: 12, rest_seconds: REST_SEC.isolation });
  });
});

describe('a permanent swap on a plan the new planner built updates the plan\'s facts (lane brief 3)', () => {
  test('the new exercise\'s muscle, kind and credits are written (NEW); the old entry and every other fact stay', async () => {
    const { prog, lower, upper } = await buildPlan();
    const row = await rowOf(lower.id, 'a4-squat');
    const factsBefore = await getProgrammePlanFacts(prog.id);

    const res = await updateRoutineExerciseExercise(row.id, 'a4-legext1');

    const facts = await getProgrammePlanFacts(prog.id);
    expect(facts.slots[lower.id]['a4-legext1']).toEqual({ muscle: 'quads', kind: 'isolation', credits: {} });
    expect(facts.slots[lower.id]['a4-squat']).toEqual(factsBefore.slots[lower.id]['a4-squat']);
    expect(facts.slots[upper.id]).toEqual(factsBefore.slots[upper.id]);
    expect({ ...facts, slots: undefined }).toEqual({ ...factsBefore, slots: undefined });
    // The same muscle: nothing moves.
    expect(res.muscleChange).toBeNull();
  });

  test('the credits are the catalogue\'s curated ones for a name it lists', async () => {
    const { prog, upper } = await buildPlan();
    const row = await rowOf(upper.id, 'a4-bench');
    await updateRoutineExerciseExercise(row.id, 'a4-dbbench');
    const facts = await getProgrammePlanFacts(prog.id);
    const entry = facts.slots[upper.id]['a4-dbbench'];
    expect(entry).toEqual({ muscle: 'chest', kind: 'mod_compound', credits: catalogueCredits('chest', 'Dumbbell Bench Press') });
    expect(Object.keys(entry.credits).length).toBeGreaterThan(0);
  });

  test('a swap into another primary muscle reports what moves (NEW) and the slot is that muscle\'s', async () => {
    const { prog, lower } = await buildPlan();
    const row = await rowOf(lower.id, 'a4-legext');
    const res = await updateRoutineExerciseExercise(row.id, 'a4-abduct');
    expect(res.muscleChange).toEqual({ from: 'quads', to: 'glutes' });
    const facts = await getProgrammePlanFacts(prog.id);
    expect(facts.slots[lower.id]['a4-abduct']).toEqual({ muscle: 'glutes', kind: 'isolation', credits: {} });
  });

  test('swapping back is an exact inverse for the row\'s sets, reps, rest and for the facts', async () => {
    const { prog, lower } = await buildPlan();
    const row = await rowOf(lower.id, 'a4-squat');
    const rowBefore = await rowById(row.id);
    await updateRoutineExerciseExercise(row.id, 'a4-legext1');
    const factsAfterFirst = await factsText(prog.id);
    await updateRoutineExerciseExercise(row.id, 'a4-squat');
    const back = await rowById(row.id);
    expect(back).toMatchObject({
      exercise_id: 'a4-squat', recommended_sets: 4,
      recommended_reps_min: rowBefore.recommended_reps_min, recommended_reps_max: rowBefore.recommended_reps_max,
      rest_seconds: rowBefore.rest_seconds,
    });
    expect(await factsText(prog.id)).toBe(factsAfterFirst);
  });

  test('a plan the new planner did not build is never given facts: none, or another version, stay as they were', async () => {
    const legacy = await buildPlan({ facts: null });
    await updateRoutineExerciseExercise((await rowOf(legacy.lower.id, 'a4-squat')).id, 'a4-legext1');
    expect(await factsText(legacy.prog.id)).toBeNull();
    // The reps are carried on a legacy plan too: the swap path is one path.
    expect(await rowOf(legacy.lower.id, 'a4-legext1')).toMatchObject({ lo: 6, hi: 10 });

    const other = await buildPlan({ facts: { version: 1, slots: { x: { y: { muscle: 'quads' } } } } });
    const text = await factsText(other.prog.id);
    await updateRoutineExerciseExercise((await rowOf(other.lower.id, 'a4-squat')).id, 'a4-legext1');
    expect(await factsText(other.prog.id)).toBe(text);
  });

  test('the typed set counts are keyed by the slot, so they stay with it', async () => {
    const { prog, lower } = await buildPlan();
    const row = await rowOf(lower.id, 'a4-squat');
    const facts = await getProgrammePlanFacts(prog.id);
    await setProgrammePlanFacts(prog.id, { ...facts, typed: { [row.id]: 5 } }, { scheduleSync: false });
    await updateRoutineExerciseExercise(row.id, 'a4-legext1');
    expect((await getProgrammePlanFacts(prog.id)).typed).toEqual({ [row.id]: 5 });
  });
});

describe('a one-off leaves the plan unchanged; a permanent swap updates the routine and the facts (applyExerciseSwap)', () => {
  const base = async () => {
    const plan = await buildPlan();
    const row = await rowOf(plan.lower.id, 'a4-squat');
    const legExtRow = await rowOf(plan.lower.id, 'a4-legext');
    return { ...plan, row, legExtRow };
  };

  test('just this session: the routine row and the plan\'s facts are byte-identical afterwards (NEW)', async () => {
    const { prog, lower, row } = await base();
    const rowBefore = JSON.stringify(await rowById(row.id));
    const factsBefore = await factsText(prog.id);
    const swapsBefore = (await swapRows()).length;

    const res = await applyExerciseSwap({
      userId: U, scope: SWAP_SCOPE.SESSION, routineId: lower.id, routineExerciseId: row.id,
      fromExercise: exerciseObj('a4-squat'), toExercise: exerciseObj('a4-legext1'),
    });

    expect(res).toMatchObject({ scope: SWAP_SCOPE.SESSION, plan: false, muscleChange: null });
    expect(JSON.stringify(await rowById(row.id))).toBe(rowBefore);
    expect(await factsText(prog.id)).toBe(factsBefore);
    const swaps = await swapRows();
    expect(swaps).toHaveLength(swapsBefore + 1);
    expect(swaps[swaps.length - 1]).toMatchObject({
      from_exercise_id: 'a4-squat', to_exercise_id: 'a4-legext1', routine_id: lower.id, scope: SWAP_SCOPE.SESSION, explicit: 1,
    });
  });

  test('from now on: the routine row is replaced, the facts follow, and a programme swap is logged (NEW)', async () => {
    const { prog, lower, legExtRow } = await base();
    const res = await applyExerciseSwap({
      userId: U, scope: SWAP_SCOPE.PROGRAMME, routineId: lower.id, routineExerciseId: legExtRow.id,
      fromExercise: exerciseObj('a4-legext'), toExercise: exerciseObj('a4-abduct'),
    });
    expect((await rowById(legExtRow.id)).exercise_id).toBe('a4-abduct');
    expect(res).toMatchObject({ scope: SWAP_SCOPE.PROGRAMME, plan: true });
    expect(res.muscleChange).toEqual({ from: 'quads', to: 'glutes' });
    const facts = await getProgrammePlanFacts(prog.id);
    expect(facts.slots[lower.id]['a4-abduct'].muscle).toBe('glutes');
    const swaps = await swapRows();
    expect(swaps[swaps.length - 1]).toMatchObject({
      from_exercise_id: 'a4-legext', to_exercise_id: 'a4-abduct', routine_id: lower.id, scope: SWAP_SCOPE.PROGRAMME,
    });
  });

  test('a scope it does not know, or no routine row to write, never edits the plan (NEW)', async () => {
    const { prog, lower, row } = await base();
    const rowBefore = JSON.stringify(await rowById(row.id));
    const factsBefore = await factsText(prog.id);
    for (const args of [
      { scope: 'forever', routineExerciseId: row.id },
      { scope: SWAP_SCOPE.PROGRAMME, routineExerciseId: null },
      { scope: undefined, routineExerciseId: row.id },
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await applyExerciseSwap({
        userId: U, routineId: lower.id, fromExercise: exerciseObj('a4-squat'), toExercise: exerciseObj('a4-legext1'), ...args,
      });
      expect(res).toMatchObject({ scope: SWAP_SCOPE.SESSION, plan: false });
    }
    expect(JSON.stringify(await rowById(row.id))).toBe(rowBefore);
    expect(await factsText(prog.id)).toBe(factsBefore);
  });
});

describe('serving after a permanent swap stays inside the caps, in every week (design 4.12: checked against the caps like any other)', () => {
  const WEEKS = [
    { quads: 8, hamstrings: 6, chest: 8, glutes: 4, triceps: 4 },
    { quads: 10, hamstrings: 8, chest: 10, glutes: 6, triceps: 6 },
    { quads: 12, hamstrings: 10, chest: 12, glutes: 8, triceps: 8 },
    { quads: 14, hamstrings: 12, chest: 14, glutes: 10, triceps: 10 },
    { quads: 16, hamstrings: 14, chest: 16, glutes: 12, triceps: 12 },
    { quads: 6, hamstrings: 4, chest: 6, glutes: 3, triceps: 3 },
  ];

  async function serve(prog, lower, upper) {
    const facts = await getProgrammePlanFacts(prog.id);
    const rows = [
      { routine: { id: lower.id }, rows: await getRoutineExercisesWithDetails(lower.id) },
      { routine: { id: upper.id }, rows: await getRoutineExercisesWithDetails(upper.id) },
    ];
    const sessions = buildPlanSessions(rows, facts);
    return WEEKS.map((weekTargets) => ({
      weekTargets,
      sessions,
      ...prescribeWeek({ sessions, weekTargets, facts: { exposureShares: facts.exposureShares, sessionCaps: facts.sessionCaps } }),
    }));
  }

  const everySlotInsideItsCap = (weeks) => {
    for (const w of weeks) {
      for (const session of w.sessions) {
        for (const slot of session.slots) {
          const served = w.sets[slot.id];
          expect(served).toBeGreaterThanOrEqual(1);
          expect(served).toBeLessThanOrEqual(exerciseCap(slot.kind, slot.thinEquipment, { focus: slot.focus }));
        }
      }
    }
  };

  test('a swap into another muscle and a swap from a compound to an isolation exercise', async () => {
    const { prog, lower, upper } = await buildPlan();
    await updateRoutineExerciseExercise((await rowOf(lower.id, 'a4-legext')).id, 'a4-abduct');
    await updateRoutineExerciseExercise((await rowOf(lower.id, 'a4-squat')).id, 'a4-legext1');
    await updateRoutineExerciseExercise((await rowOf(upper.id, 'a4-bench')).id, 'a4-pushdown');
    // NEW: the plan's facts hold the planner's slot of each swapped-in exercise,
    // which is what the weeks below are served from.
    const facts = await getProgrammePlanFacts(prog.id);
    expect(facts.slots[lower.id]['a4-abduct']).toEqual({ muscle: 'glutes', kind: 'isolation', credits: {} });
    expect(facts.slots[lower.id]['a4-legext1']).toEqual({ muscle: 'quads', kind: 'isolation', credits: {} });
    expect(facts.slots[upper.id]['a4-pushdown']).toEqual({ muscle: 'triceps', kind: 'isolation', credits: {} });
    const weeks = await serve(prog, lower, upper);
    everySlotInsideItsCap(weeks);

    // The swapped-in slots are served as the planner's slots of their new muscle.
    const abductRow = await rowOf(lower.id, 'a4-abduct');
    const legext1Row = await rowOf(lower.id, 'a4-legext1');
    const pushdownRow = await rowOf(upper.id, 'a4-pushdown');
    const slots = Object.fromEntries(weeks[0].sessions.flatMap((s) => s.slots).map((x) => [x.id, x]));
    expect(slots[abductRow.id]).toMatchObject({ muscle: 'glutes', kind: 'isolation' });
    expect(slots[legext1Row.id]).toMatchObject({ muscle: 'quads', kind: 'isolation' });
    expect(slots[pushdownRow.id]).toMatchObject({ muscle: 'triceps', kind: 'isolation' });
    // The stored 4 sets of the squat slot are served inside the isolation cap of 3.
    for (const w of weeks) expect(w.sets[legext1Row.id]).toBeLessThanOrEqual(3);
    // A muscle with no slot left is reported as a shortfall, never forced onto an exercise (design 4.9 step 5).
    expect(weeks.every((w) => w.shortfall.chest > 0)).toBe(true);
  });

  test('a swap of a catalogue exercise keeps the curated credits the planner counts in its session totals', async () => {
    const { prog, lower, upper } = await buildPlan();
    await updateRoutineExerciseExercise((await rowOf(upper.id, 'a4-bench')).id, 'a4-dbbench');
    const weeks = await serve(prog, lower, upper);
    everySlotInsideItsCap(weeks);
    const dbRow = await rowOf(upper.id, 'a4-dbbench');
    const slot = weeks[0].sessions.flatMap((s) => s.slots).find((x) => x.id === dbRow.id);
    expect(slot.credits).toEqual(catalogueCredits('chest', 'Dumbbell Bench Press'));
  });
});

describe('the logger\'s own resolver serves a swapped-in exercise the slot\'s week (design 4.9 and 4.12: one number everywhere)', () => {
  // The block's weekly targets in direct sets, as the planner writes them: a
  // climb to week 5 and the recovery week at the end.
  const BLOCK_TARGETS = [
    { quads: 8, hamstrings: 6, chest: 8 },
    { quads: 9, hamstrings: 7, chest: 9 },
    { quads: 10, hamstrings: 8, chest: 10 },
    { quads: 11, hamstrings: 9, chest: 11 },
    { quads: 12, hamstrings: 10, chest: 12 },
    { quads: 5, hamstrings: 4, chest: 5 },
  ];

  async function startBlock() {
    const { prog, lower, upper } = await buildPlan();
    const blockId = await activatePlanWithBlock(U, prog.id, `A4 block ${planNo}`, { allowLearnedCarry: false });
    const weeks = await conn.getAllAsync('SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ? ORDER BY week_index', [blockId]);
    let n = 0;
    for (let i = 0; i < weeks.length; i++) {
      for (const [muscle, sets] of Object.entries(BLOCK_TARGETS[i])) {
        n += 1;
        // eslint-disable-next-line no-await-in-loop
        await conn.runAsync(
          `INSERT INTO planned_muscle_volume (id, mesocycle_week_id, muscle, planned_sets, mev, mav, mrv, source, created_at, updated_at)
           VALUES (?, ?, ?, ?, 4, 12, 20, 'template', 1, 1)`,
          [`pmv-${planNo}-${n}`, weeks[i].id, muscle, sets],
        );
      }
    }
    return { prog, lower, upper, weeks };
  }

  // What the logger shows for each exercise of a routine, week by week (the
  // resolver the logger, the mini bar and the plan screens all read).
  const servedByWeek = async (weeks, routine) => {
    const rows = await getRoutineExercisesWithDetails(routine.id);
    const out = [];
    for (const w of weeks) {
      // eslint-disable-next-line no-await-in-loop
      const { allocation, v2 } = await getSessionWeeklyAllocation({ workout: { mesocycleWeekId: w.id, routineId: routine.id }, exercises: rows });
      expect(v2).toBe(true);
      out.push(allocation);
    }
    return out;
  };

  test('a like-for-like swap keeps the slot\'s sets in every week, under the cap', async () => {
    const { lower, weeks } = await startBlock();
    const before = await servedByWeek(weeks, lower);
    await applyExerciseSwap({
      userId: U, scope: SWAP_SCOPE.PROGRAMME, routineId: lower.id,
      routineExerciseId: (await rowOf(lower.id, 'a4-curl')).id,
      fromExercise: exerciseObj('a4-curl'), toExercise: exerciseObj('a4-curl2'),
    });
    const after = await servedByWeek(weeks, lower);
    weeks.forEach((_, i) => {
      expect(after[i]['a4-curl2']).toBe(before[i]['a4-curl']);
      expect(after[i]['a4-curl2']).toBeLessThanOrEqual(exerciseCap('isolation'));
      // The rest of the session is served as it was.
      expect(after[i]['a4-squat']).toBe(before[i]['a4-squat']);
      expect(after[i]['a4-legext']).toBe(before[i]['a4-legext']);
    });
  });

  test('a compound swapped for an isolation exercise is served inside the isolation cap, in every week', async () => {
    const { lower, weeks } = await startBlock();
    await applyExerciseSwap({
      userId: U, scope: SWAP_SCOPE.PROGRAMME, routineId: lower.id,
      routineExerciseId: (await rowOf(lower.id, 'a4-squat')).id,
      fromExercise: exerciseObj('a4-squat'), toExercise: exerciseObj('a4-legext1'),
    });
    const after = await servedByWeek(weeks, lower);
    weeks.forEach((_, i) => {
      expect(after[i]['a4-legext1']).toBeGreaterThanOrEqual(1);
      expect(after[i]['a4-legext1']).toBeLessThanOrEqual(exerciseCap('isolation'));
      expect(after[i]['a4-legext']).toBeLessThanOrEqual(exerciseCap('isolation'));
    });
  });
});
