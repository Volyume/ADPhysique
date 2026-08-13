/**
 * campaign16.prescription.test.js — Campaign 16 job 7: reps, rest and load.
 *
 * FOUNDER BRIEF: "Investigate and correct the established 3x5-9
 * strength-style ranges appearing in hypertrophy plans. Do not blindly make
 * every exercise 8-12. Use exercise role and practical hypertrophy usage.
 * No artificial rep-range rotation by block number. No fake starting load.
 * Exact retained exercise: preserve progression/history relationship.
 * Replacement/new exercise: do NOT inherit an old exercise's starting load.
 * Rest must remain realistic and included in session-time maths."
 *
 * TWO DEFECTS, one of them worse than the logged one.
 *
 * The logged defect: `heavy_compound` prescribed 5-9 reps in the HYPERTROPHY
 * table, so a general hypertrophy plan handed out 3x5-9 on barbell bench,
 * incline bench and close-grip bench, next to a separate strength table that
 * already existed for people who chose strength.
 *
 * The one found while fixing it: a plan-level exercise swap changed the
 * exercise and left the previous exercise's reps, rest AND STARTING WEIGHT on
 * the row. Swapping a 100 kg barbell bench for a dumbbell press left 100 kg
 * as the prescription. That is a number the user may try to honour.
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

const fs = require('fs');
const path = require('path');
const {
  db, insertExerciseWithId, createProgramme, createRoutine,
  addExerciseToRoutine, updateRoutineExerciseExercise,
} = require('../database');
const { generatePlan } = require('../planEngine');
const {
  REP_RANGES, STRENGTH_REP_RANGES, REST_SEC, repRangeFor, restFor, REP_OVERRIDES,
} = require('../exercise/prescription');
const { canonicalExerciseId } = require('../exercise/canonicalId');
const { LIBRARY, inputs, planExercises } = require('./campaign16.helpers');

const U = 'user-c16-rx';
const plan = over => generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });

let conn;
beforeAll(async () => { conn = await db(); });

// ---------------------------------------------------------------------------

describe('C16-7 the strength range is out of the hypertrophy plans', () => {
  test('no hypertrophy plan prescribes the old 5-9', () => {
    const offenders = [];
    for (const over of [{}, { daysPerWeek: 3 }, { daysPerWeek: 5 }, { daysPerWeek: 6 },
      { goal: 'general_hypertrophy' }, { goal: 'bodybuilding', daysPerWeek: 5 },
      { goal: 'mens_physique', daysPerWeek: 5 }, { goal: 'bikini', daysPerWeek: 4 },
      { experience: 'beginner', daysPerWeek: 3 }, { experience: 'advanced', daysPerWeek: 6 }]) {
      for (const e of planExercises(plan(over))) {
        if (e.repMin === 5 && e.repMax === 9) {
          offenders.push(`${JSON.stringify(over)} ${e.exerciseName}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('a heavy compound is still HEAVIER than the work around it', () => {
    // The correction is 6-10, not 8-12. Flattening every exercise to one
    // range would lose the distinction the tiers exist to express.
    expect(REP_RANGES.heavy_compound).toEqual({ repMin: 6, repMax: 10 });
    expect(REP_RANGES.heavy_compound.repMin).toBeLessThan(REP_RANGES.mod_compound.repMin);
    expect(REP_RANGES.mod_compound.repMin).toBeLessThanOrEqual(REP_RANGES.machine.repMin);
    expect(REP_RANGES.machine.repMin).toBeLessThan(REP_RANGES.isolation.repMin);
  });

  test('no hypertrophy range starts below 6', () => {
    // Below six reads as a strength prescription, which is what the defect
    // was. Users who want that have their own table.
    for (const r of Object.values(REP_RANGES)) expect(r.repMin).toBeGreaterThanOrEqual(6);
  });

  test('users who CHOSE strength are untouched', () => {
    expect(STRENGTH_REP_RANGES.heavy_compound).toEqual({ repMin: 4, repMax: 6 });
    const p = plan({ goal: 'strength_hypertrophy' });
    const heavy = planExercises(p).filter(e => e.restSec >= 180);
    expect(heavy.length).toBeGreaterThan(0);
    for (const e of heavy) expect(e.repMin).toBeLessThanOrEqual(6);
  });
});

describe('C16-7 exercise role, without invented precision', () => {
  test('the deadlift family is prescribed lower than other heavy compounds', () => {
    const dl = repRangeFor('Conventional Deadlift', 'heavy_compound', false);
    expect(dl).toEqual({ repMin: 5, repMax: 8 });
    expect(dl.repMax).toBeLessThan(REP_RANGES.heavy_compound.repMax);
  });

  test('an ordinary heavy compound is NOT overridden', () => {
    expect(repRangeFor('Barbell Bench Press', 'heavy_compound', false))
      .toEqual(REP_RANGES.heavy_compound);
    expect(repRangeFor('Barbell Back Squat', 'heavy_compound', false))
      .toEqual(REP_RANGES.heavy_compound);
  });

  test('the override list stays small and every entry states its reason', () => {
    // The campaign was warned against pseudo-scientific micro-targeting. A
    // long per-exercise rep table would be exactly that: numbers implying a
    // precision the evidence does not support.
    expect(REP_OVERRIDES.length).toBeLessThanOrEqual(3);
    for (const o of REP_OVERRIDES) {
      expect(typeof o.match).toBe('function');
      expect(o.range.repMin).toBeGreaterThan(0);
      expect(o.reason.length).toBeGreaterThan(60);
    }
  });

  test('an override never applies to a strength user', () => {
    expect(repRangeFor('Conventional Deadlift', 'heavy_compound', true))
      .toEqual(STRENGTH_REP_RANGES.heavy_compound);
  });
});

describe('C16-7 no rotation by block number', () => {
  test('the prescription module has no notion of a block or a week', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../exercise/prescription.js'), 'utf8');
    const code = src.slice(src.indexOf('export const REP_RANGES'));
    expect(code).not.toMatch(/block|week|mesocycle|cycle/i);
  });

  test('the same inputs always produce the same prescription', () => {
    // Determinism is the property that makes "no rotation" checkable: if a
    // counter were consulted anywhere, repeated generation would drift.
    const a = planExercises(plan()).map(e => `${e.exerciseName}:${e.repMin}-${e.repMax}:${e.restSec}`);
    const b = planExercises(plan()).map(e => `${e.exerciseName}:${e.repMin}-${e.repMax}:${e.restSec}`);
    expect(a).toEqual(b);
  });
});

describe('C16-7 rest is realistic and is paid for in the session estimate', () => {
  test('each tier rests less than the one above it', () => {
    expect(REST_SEC.heavy_compound).toBeGreaterThan(REST_SEC.mod_compound);
    expect(REST_SEC.mod_compound).toBeGreaterThan(REST_SEC.machine);
    expect(REST_SEC.machine).toBeGreaterThan(REST_SEC.isolation);
    expect(restFor('heavy_compound')).toBe(180);
  });

  test('every generated exercise carries a real rest, never zero or null', () => {
    for (const e of planExercises(plan({ daysPerWeek: 5 }))) {
      expect(typeof e.restSec).toBe('number');
      expect(e.restSec).toBeGreaterThanOrEqual(60);
    }
  });

  test('the session estimate charges full rest between every set', () => {
    const engine = fs.readFileSync(path.resolve(__dirname, '../planEngine.js'), 'utf8');
    const start = engine.indexOf('function estimateSessionMinutes');
    const body = engine.slice(start, engine.indexOf('\n}', start));
    expect(body).toMatch(/\(ex\.sets - 1\) \* ex\.restSec/);
  });
});

describe('C16-7 load: never invented, never inherited', () => {
  test('generation sets no starting weight at all', () => {
    for (const e of planExercises(plan())) {
      expect(e.startingWeight).toBeUndefined();
    }
    const src = fs.readFileSync(path.resolve(__dirname, '../planAutoGen.js'), 'utf8');
    expect(src).toMatch(/null,\s*\/\/ startingWeight, engine doesn't set this/);
  });

  test('a swap CLEARS the previous exercise\'s starting weight', async () => {
    const bench = canonicalExerciseId('C16 Bench');
    const dbPress = canonicalExerciseId('C16 DB Press');
    await insertExerciseWithId(bench, {
      name: 'C16 Bench', primaryMuscle: 'chest', equipment: 'barbell',
      equipmentCategory: 'barbell', compoundIsolation: 'compound',
    });
    await insertExerciseWithId(dbPress, {
      name: 'C16 DB Press', primaryMuscle: 'chest', equipment: 'dumbbell',
      equipmentCategory: 'dumbbell', compoundIsolation: 'compound',
    });
    const prog = await createProgramme(U, 'C16 Rx plan', '', 0, null, null, null, false);
    const routine = await createRoutine(U, 'Upper', null, 'upper_lower', 0, null, prog.id, false, false);
    await addExerciseToRoutine(routine.id, bench, 0, 6, 10, null, 3, 100, 180, null, false);

    const before = await conn.getFirstAsync(
      'SELECT id, starting_weight FROM routine_exercises WHERE routine_id = ?', [routine.id]);
    expect(before.starting_weight).toBe(100);

    await updateRoutineExerciseExercise(before.id, dbPress);

    const after = await conn.getFirstAsync(
      'SELECT exercise_id, exercise_name, starting_weight FROM routine_exercises WHERE id = ?',
      [before.id]);
    expect(after.exercise_id).toBe(dbPress);
    expect(after.exercise_name).toBe('C16 DB Press');
    // The whole point: 100 kg does not follow the user onto a dumbbell.
    expect(after.starting_weight).toBeNull();
  });

  test('a swap across tiers recalibrates an UNTOUCHED prescription', async () => {
    const squat = canonicalExerciseId('C16 Squat');
    const extension = canonicalExerciseId('C16 Extension');
    await insertExerciseWithId(squat, {
      name: 'C16 Squat', primaryMuscle: 'quads', equipment: 'barbell',
      equipmentCategory: 'barbell', compoundIsolation: 'compound',
    });
    await insertExerciseWithId(extension, {
      name: 'C16 Extension', primaryMuscle: 'quads', equipment: 'machine',
      equipmentCategory: 'machine_selectorised', compoundIsolation: 'isolation',
    });
    const prog = await createProgramme(U, 'C16 Rx plan 2', '', 0, null, null, null, false);
    const routine = await createRoutine(U, 'Legs', null, 'upper_lower', 0, null, prog.id, false, false);
    // The DEFAULT heavy-compound prescription, exactly as the engine writes it.
    await addExerciseToRoutine(
      routine.id, squat, 0,
      REP_RANGES.heavy_compound.repMin, REP_RANGES.heavy_compound.repMax,
      null, 3, null, REST_SEC.heavy_compound, null, false,
    );
    const row = await conn.getFirstAsync(
      'SELECT id FROM routine_exercises WHERE routine_id = ?', [routine.id]);

    await updateRoutineExerciseExercise(row.id, extension);

    const after = await conn.getFirstAsync(
      `SELECT recommended_reps_min AS lo, recommended_reps_max AS hi, rest_seconds AS rest
         FROM routine_exercises WHERE id = ?`, [row.id]);
    // An isolation slot no longer asks for three minutes' rest at 6-10.
    expect(after.lo).toBe(REP_RANGES.isolation.repMin);
    expect(after.hi).toBe(REP_RANGES.isolation.repMax);
    expect(after.rest).toBe(REST_SEC.isolation);
  });

  test('a prescription the USER tuned is never overwritten by a swap', async () => {
    const squat = canonicalExerciseId('C16 Squat B');
    const extension = canonicalExerciseId('C16 Extension B');
    await insertExerciseWithId(squat, {
      name: 'C16 Squat B', primaryMuscle: 'quads', equipment: 'barbell',
      equipmentCategory: 'barbell', compoundIsolation: 'compound',
    });
    await insertExerciseWithId(extension, {
      name: 'C16 Extension B', primaryMuscle: 'quads', equipment: 'machine',
      equipmentCategory: 'machine_selectorised', compoundIsolation: 'isolation',
    });
    const prog = await createProgramme(U, 'C16 Rx plan 3', '', 0, null, null, null, false);
    const routine = await createRoutine(U, 'Legs B', null, 'upper_lower', 0, null, prog.id, false, false);
    // A deliberately non-default range: this is the user's own choice.
    await addExerciseToRoutine(routine.id, squat, 0, 7, 9, null, 3, null, 200, null, false);
    const row = await conn.getFirstAsync(
      'SELECT id FROM routine_exercises WHERE routine_id = ?', [routine.id]);

    await updateRoutineExerciseExercise(row.id, extension);

    const after = await conn.getFirstAsync(
      `SELECT recommended_reps_min AS lo, recommended_reps_max AS hi, rest_seconds AS rest
         FROM routine_exercises WHERE id = ?`, [row.id]);
    expect(after.lo).toBe(7);
    expect(after.hi).toBe(9);
    expect(after.rest).toBe(200);
  });

  test('a swap WITHIN a tier leaves the prescription alone', async () => {
    const a = canonicalExerciseId('C16 Bench C');
    const b = canonicalExerciseId('C16 Incline C');
    await insertExerciseWithId(a, {
      name: 'C16 Bench C', primaryMuscle: 'chest', equipment: 'barbell',
      equipmentCategory: 'barbell', compoundIsolation: 'compound',
    });
    await insertExerciseWithId(b, {
      name: 'C16 Incline C', primaryMuscle: 'chest', equipment: 'barbell',
      equipmentCategory: 'barbell', compoundIsolation: 'compound',
    });
    const prog = await createProgramme(U, 'C16 Rx plan 4', '', 0, null, null, null, false);
    const routine = await createRoutine(U, 'Upper C', null, 'upper_lower', 0, null, prog.id, false, false);
    await addExerciseToRoutine(
      routine.id, a, 0,
      REP_RANGES.heavy_compound.repMin, REP_RANGES.heavy_compound.repMax,
      null, 4, null, REST_SEC.heavy_compound, null, false,
    );
    const row = await conn.getFirstAsync(
      'SELECT id FROM routine_exercises WHERE routine_id = ?', [routine.id]);

    await updateRoutineExerciseExercise(row.id, b);

    const after = await conn.getFirstAsync(
      `SELECT recommended_reps_min AS lo, recommended_reps_max AS hi,
              rest_seconds AS rest, recommended_sets AS sets
         FROM routine_exercises WHERE id = ?`, [row.id]);
    expect(after.lo).toBe(REP_RANGES.heavy_compound.repMin);
    expect(after.hi).toBe(REP_RANGES.heavy_compound.repMax);
    expect(after.rest).toBe(REST_SEC.heavy_compound);
    // Set count and slot belong to the programme, not the exercise.
    expect(after.sets).toBe(4);
  });

  test('a RETAINED exercise keeps its id, so its history stays attached', async () => {
    // The other half of the founder rule. History is keyed on exercise_id,
    // so identity is the progression relationship: an exercise that is kept
    // must keep the same id, and a replacement must not adopt the old one.
    const kept = canonicalExerciseId('C16 Kept');
    await insertExerciseWithId(kept, {
      name: 'C16 Kept', primaryMuscle: 'back', equipment: 'cable',
      equipmentCategory: 'cable', compoundIsolation: 'compound',
    });
    const prog = await createProgramme(U, 'C16 Rx plan 5', '', 0, null, null, null, false);
    const routine = await createRoutine(U, 'Pull', null, 'upper_lower', 0, null, prog.id, false, false);
    await addExerciseToRoutine(routine.id, kept, 0, 8, 12, null, 3, null, 150, null, false);
    const row = await conn.getFirstAsync(
      'SELECT id, exercise_id FROM routine_exercises WHERE routine_id = ?', [routine.id]);
    expect(row.exercise_id).toBe(kept);
    expect(canonicalExerciseId('C16 Kept')).toBe(kept);
  });
});
