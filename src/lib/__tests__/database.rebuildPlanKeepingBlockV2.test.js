/**
 * D219 lane C1b: the v2 keep-block writer, rebuildPlanKeepingBlockV2 in
 * database.js (register D219, "Build rulings" 3, 4 and 5; founder Q1 = A:
 * "Rebuild at next session"; design section 8).
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the REAL init path, with a
 * transaction adapter that really rolls back (the shared harness's
 * withTransactionAsync only calls the task), because the claim under test is
 * that a failure leaves a plan a person is following EXACTLY as it was.
 *
 * What it pins, each of which fails on the code before this lane (the
 * function did not exist):
 *  - the block is KEPT: no mesocycle row and no week row changes, the running
 *    effort ladder is untouched and is what the plan's facts carry (a running
 *    block keeps its stored ladder, the new ladder is for new blocks);
 *  - the targets are rewritten for the CURRENT and LATER weeks only: past
 *    weeks' rows are byte-identical; each row's planned sets and source change,
 *    its band (mev, mav, mrv) does not unless the caller passes one; the
 *    recovery week takes the plan's last target;
 *  - protective rows stay: a muscle under a capability reintroduction ramp, or
 *    blocked (mrv 0) in this block, is not rewritten;
 *  - in place (library, kit and manual plans): the programme, its routines and
 *    its exercises stay; only recommended sets and routine order change, and
 *    the facts are written; new programme (a generated plan): the new rows,
 *    the facts and the activation are one write, and only the REPLACED plan is
 *    archived, never the person's other saved plans;
 *  - one transaction: any failure part-way (a bad row, a facts builder that
 *    throws, a block whose current week cannot be read, a plan that is not the
 *    person's active one) leaves every plan, routine, exercise, week and
 *    planned-volume row exactly as it was.
 * activatePlanKeepingBlock and its guard are untouched (their own suite).
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
    // A REAL transaction: the task's throw rolls the whole write back.
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
  db,
  createProgramme,
  createRoutine,
  addExerciseToRoutine,
  activatePlanWithBlock,
  getProgrammePlanFacts,
  setProgrammePlanFacts,
  getAllExercises,
  rebuildPlanKeepingBlockV2,
} = require('../database');
const { seedExercisesIfNeeded } = require('../seedExercises');

const U = 'user-c1b-writer';
let conn;
let exercises;

beforeAll(async () => {
  conn = await db();
  await seedExercisesIfNeeded();
  exercises = await getAllExercises();
});

const exerciseId = (name) => {
  const row = exercises.find((e) => e.name === name);
  if (!row) throw new Error(`the seeded library has no ${name}`);
  return row.id;
};

// Local day key, as activatePlanWithBlock writes a block's start.
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Put the running block in week `weekIndex` (1 to 6) by moving its start back. */
async function setBlockWeek(blockId, weekIndex) {
  const start = new Date();
  start.setDate(start.getDate() - (weekIndex - 1) * 7);
  await conn.runAsync('UPDATE mesocycles SET start_date = ? WHERE id = ?', [dayKey(start), blockId]);
}

/**
 * An active two-session plan with a running block: Upper (bench, row) and
 * Lower (squat, leg press), three sets each, week `weekIndex`.
 */
async function seedPlan(name, { weekIndex = 3, userId = U } = {}) {
  const programme = await createProgramme(userId, name, '', 0, null, null, null, false);
  const upper = await createRoutine(userId, 'Upper', null, 'upper_lower', 0, null, programme.id, false, false);
  const lower = await createRoutine(userId, 'Lower', null, 'upper_lower', 0, null, programme.id, false, false);
  const rows = {};
  const add = async (routine, id, order, sets) => {
    const re = await addExerciseToRoutine(routine.id, exerciseId(id), order, 8, 12, null, sets, null, null, null, false, null);
    rows[id] = re?.id ?? (await conn.getFirstAsync(
      'SELECT id FROM routine_exercises WHERE routine_id = ? AND exercise_id = ?', [routine.id, exerciseId(id)],
    )).id;
  };
  await add(upper, 'Barbell Bench Press', 0, 3);
  await add(upper, 'Seated Cable Row', 1, 3);
  await add(lower, 'Barbell Back Squat', 0, 3);
  await add(lower, 'Leg Press', 1, 3);
  const blockId = await activatePlanWithBlock(userId, programme.id, name, { allowLearnedCarry: false });
  await setBlockWeek(blockId, weekIndex);
  return { programmeId: programme.id, upper: upper.id, lower: lower.id, rows, blockId };
}

const table = (sql, params = []) => conn.getAllAsync(sql, params);

/** Every row the rebuild may or may not touch, for exact before and after comparison. */
async function snapshot(userId = U) {
  return {
    programmes: await table('SELECT * FROM programmes WHERE user_id = ? ORDER BY id', [userId]),
    routines: await table('SELECT * FROM routines WHERE user_id = ? ORDER BY id', [userId]),
    routineExercises: await table(
      'SELECT re.* FROM routine_exercises re JOIN routines r ON r.id = re.routine_id WHERE r.user_id = ? ORDER BY re.id', [userId],
    ),
    mesocycles: await table('SELECT * FROM mesocycles WHERE user_id = ? ORDER BY id', [userId]),
    weeks: await table(
      'SELECT w.* FROM mesocycle_weeks w JOIN mesocycles m ON m.id = w.mesocycle_id WHERE m.user_id = ? ORDER BY w.id', [userId],
    ),
    planned: await table(
      `SELECT p.* FROM planned_muscle_volume p
         JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id
         JOIN mesocycles m ON m.id = w.mesocycle_id WHERE m.user_id = ? ORDER BY p.id`, [userId],
    ),
  };
}

const plannedRows = (blockId, muscle) => table(
  `SELECT p.*, w.week_index FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id
    WHERE w.mesocycle_id = ? AND p.muscle = ? ORDER BY w.week_index`, [blockId, muscle],
);

const TARGETS = { chest: [8, 9, 10, 11, 12, 6], back: [9, 10, 11, 12, 13, 7] };

// An in-place spec for a plan made by seedPlan: reordered sessions, new sets.
const inPlaceSpec = (plan, over = {}) => ({
  mode: 'in_place',
  programmeId: plan.programmeId,
  routines: [
    { routineId: plan.lower, position: 0, exercises: [{ routineExerciseId: plan.rows['Barbell Back Squat'], sets: 4 }, { routineExerciseId: plan.rows['Leg Press'], sets: 2 }] },
    { routineId: plan.upper, position: 1, exercises: [{ routineExerciseId: plan.rows['Barbell Bench Press'], sets: 4 }, { routineExerciseId: plan.rows['Seated Cable Row'], sets: 3 }] },
  ],
  buildFacts: () => ({ version: 2, kind: 'library', roles: { chest: 'standard' }, rirLadder: [3, 2, 2, 1, 1, 4], weeklyTargets: TARGETS }),
  weeklyTargets: TARGETS,
  ...over,
});

describe('the block is kept; only the current and later weeks\' targets are rewritten', () => {
  test('in place: sets and order change on the person\'s own rows, the facts are written, and the block is byte-identical', async () => {
    const plan = await seedPlan('In place keep');
    const before = await snapshot();
    const out = await rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan));

    expect(out.programmeId).toBe(plan.programmeId);
    expect(out.blockId).toBe(plan.blockId);
    const after = await snapshot();
    // No mesocycle row, no week row changed: the block is kept as it was.
    expect(after.mesocycles).toEqual(before.mesocycles);
    expect(after.weeks).toEqual(before.weeks);
    // The person's routines and exercises are the same rows, in the same sessions.
    expect(after.routines.map((r) => r.id)).toEqual(before.routines.map((r) => r.id));
    expect(after.routineExercises.map((r) => r.id)).toEqual(before.routineExercises.map((r) => r.id));
    const sets = Object.fromEntries(after.routineExercises.map((r) => [r.id, r.recommended_sets]));
    expect(sets[plan.rows['Barbell Back Squat']]).toBe(4);
    expect(sets[plan.rows['Leg Press']]).toBe(2);
    expect(sets[plan.rows['Barbell Bench Press']]).toBe(4);
    expect(sets[plan.rows['Seated Cable Row']]).toBe(3);
    const position = Object.fromEntries(after.routines.map((r) => [r.id, r.position]));
    expect(position[plan.lower]).toBe(0);
    expect(position[plan.upper]).toBe(1);
    // Reps, rest and notes of every exercise are exactly as authored.
    for (let i = 0; i < before.routineExercises.length; i++) {
      const { recommended_sets: _s, updated_at: _u, ...was } = before.routineExercises[i];
      const { recommended_sets: _s2, updated_at: _u2, ...now } = after.routineExercises[i];
      expect(now).toEqual(was);
    }
    expect((await getProgrammePlanFacts(plan.programmeId)).version).toBe(2);
  });

  test('the current week (3) and later weeks take the targets; weeks 1 and 2 are untouched; the band is kept', async () => {
    const plan = await seedPlan('Rows from week 3', { weekIndex: 3 });
    const beforeRows = await plannedRows(plan.blockId, 'chest');
    expect(beforeRows).toHaveLength(6);
    await rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan));

    const afterRows = await plannedRows(plan.blockId, 'chest');
    expect(afterRows).toHaveLength(6);
    afterRows.forEach((row, i) => {
      const was = beforeRows[i];
      if (row.week_index < 3) {
        expect(row).toEqual(was); // a past week is exactly as it was
      } else {
        expect(row.planned_sets).toBe(TARGETS.chest[row.week_index - 1]);
        expect(row.source).toBe('template');
        // The band is the block's own, never rewritten here.
        expect([row.mev, row.mav, row.mrv]).toEqual([was.mev, was.mav, was.mrv]);
      }
    });
    // Week 6 is the recovery week: it takes the plan's last target.
    expect(afterRows[5].planned_sets).toBe(6);
  });

  test('a band the caller passes replaces the stored one (build ruling 3), only for that muscle', async () => {
    const plan = await seedPlan('Band passed');
    const backBefore = await plannedRows(plan.blockId, 'back');
    await rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan, { band: { chest: { mev: 6, mav: 12, mrv: 14 } } }));
    const chest = await plannedRows(plan.blockId, 'chest');
    chest.filter((r) => r.week_index >= 3).forEach((r) => expect([r.mev, r.mav, r.mrv]).toEqual([6, 12, 14]));
    const backAfter = await plannedRows(plan.blockId, 'back');
    backAfter.forEach((r, i) => expect([r.mev, r.mav, r.mrv]).toEqual([backBefore[i].mev, backBefore[i].mav, backBefore[i].mrv]));
  });

  test('a running block keeps its stored effort ladder, and the plan\'s facts carry that ladder, not the new one', async () => {
    const plan = await seedPlan('Ladder kept');
    await conn.runAsync('UPDATE mesocycles SET rir_ladder = ? WHERE id = ?', ['[3,2,1,0,0,4]', plan.blockId]);
    await rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan)); // the builder offers [3,2,2,1,1,4]

    const block = await conn.getFirstAsync('SELECT rir_ladder FROM mesocycles WHERE id = ?', [plan.blockId]);
    expect(block.rir_ladder).toBe('[3,2,1,0,0,4]');
    expect((await getProgrammePlanFacts(plan.programmeId)).rirLadder).toEqual([3, 2, 1, 0, 0, 4]);
  });

  test('a muscle under a reintroduction ramp, and a muscle blocked in this block (mrv 0), are left as they are', async () => {
    const plan = await seedPlan('Protective rows');
    await conn.runAsync(
      `UPDATE planned_muscle_volume SET source = 'reintroduction', planned_sets = 4
         WHERE muscle = 'chest' AND mesocycle_week_id IN (SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ?)`, [plan.blockId],
    );
    await conn.runAsync(
      `UPDATE planned_muscle_volume SET mrv = 0, planned_sets = 0
         WHERE muscle = 'back' AND mesocycle_week_id IN (SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ?)`, [plan.blockId],
    );
    const chestBefore = await plannedRows(plan.blockId, 'chest');
    const backBefore = await plannedRows(plan.blockId, 'back');
    await rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan));
    expect(await plannedRows(plan.blockId, 'chest')).toEqual(chestBefore);
    expect(await plannedRows(plan.blockId, 'back')).toEqual(backBefore);
  });

  test('no active block: the plan rows and facts are written, no week row and no block is created', async () => {
    const programme = await createProgramme(U, 'No block', '', 0, null, null, null, false);
    const r = await createRoutine(U, 'Only', null, null, 0, null, programme.id, false, false);
    const re = await addExerciseToRoutine(r.id, exerciseId('Barbell Bench Press'), 0, 8, 12, null, 3, null, null, null, false, null);
    await conn.runAsync('UPDATE programmes SET is_active = 0 WHERE user_id = ?', [U]);
    await conn.runAsync('UPDATE programmes SET is_active = 1 WHERE id = ?', [programme.id]);
    await conn.runAsync('UPDATE mesocycles SET is_active = 0 WHERE user_id = ?', [U]);
    const blocksBefore = await table('SELECT id FROM mesocycles WHERE user_id = ?', [U]);

    const out = await rebuildPlanKeepingBlockV2(U, {
      mode: 'in_place',
      programmeId: programme.id,
      routines: [{ routineId: r.id, position: 0, exercises: [{ routineExerciseId: re.id ?? (await conn.getFirstAsync('SELECT id FROM routine_exercises WHERE routine_id = ?', [r.id])).id, sets: 2 }] }],
      buildFacts: () => ({ version: 2, kind: 'manual' }),
      weeklyTargets: TARGETS,
    });
    expect(out.blockId).toBeNull();
    expect((await getProgrammePlanFacts(programme.id)).version).toBe(2);
    expect(await table('SELECT id FROM mesocycles WHERE user_id = ?', [U])).toEqual(blocksBefore);
  });
});

describe('a new programme (a generated plan): one write, the replaced plan archived, the block kept', () => {
  const generatedSpec = (over = {}) => ({
    mode: 'new_programme',
    programme: { name: 'Rebuilt plan', description: '' },
    workouts: [
      { sessionKey: 's0', name: 'Upper', splitType: 'upper_lower', exercises: [
        { exerciseId: exerciseId('Barbell Bench Press'), repMin: 6, repMax: 10, notes: null, sets: 3, restSec: 150, selectionReason: 'required_role', muscle: 'chest', kind: 'heavy_compound', credits: { triceps: 0.5 }, thinEquipment: false },
        { exerciseId: exerciseId('Seated Cable Row'), repMin: 8, repMax: 12, notes: null, sets: 3, restSec: 120, selectionReason: 'required_role', muscle: 'back', kind: 'machine_compound', credits: {}, thinEquipment: true },
      ] },
      { sessionKey: 's1', name: 'Lower', splitType: 'upper_lower', exercises: [
        { exerciseId: exerciseId('Barbell Back Squat'), repMin: 6, repMax: 10, notes: null, sets: 3, restSec: 150, selectionReason: 'required_role', muscle: 'quads', kind: 'heavy_compound', credits: {}, thinEquipment: false },
      ] },
    ],
    buildFacts: ({ routineIdBySession, thinByRoutine, slotsByRoutine }) => ({
      version: 2, kind: 'generated', roles: { chest: 'standard' }, rirLadder: [3, 2, 2, 1, 1, 4],
      weeklyTargets: TARGETS, routineIdBySession, thin: thinByRoutine, slots: slotsByRoutine,
    }),
    weeklyTargets: TARGETS,
    ...over,
  });

  test('creates the programme, its routines in rotation order and its exercises, activates it, and writes the facts keyed by the new routine ids', async () => {
    const plan = await seedPlan('Old generated');
    const out = await rebuildPlanKeepingBlockV2(U, generatedSpec());

    expect(out.programmeId).not.toBe(plan.programmeId);
    const active = await table('SELECT id, name, is_active, is_archived FROM programmes WHERE user_id = ? AND is_active = 1', [U]);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(out.programmeId);
    const routines = await table('SELECT id, name, position, split_type FROM routines WHERE programme_id = ? ORDER BY position', [out.programmeId]);
    expect(routines.map((r) => r.name)).toEqual(['Upper', 'Lower']);
    expect(routines.map((r) => r.position)).toEqual([0, 1]);
    const rows = await table('SELECT routine_id, exercise_id, recommended_sets, selection_reason FROM routine_exercises WHERE routine_id IN (?, ?) ORDER BY routine_id, order_in_routine', [routines[0].id, routines[1].id]);
    expect(rows).toHaveLength(3);
    const facts = await getProgrammePlanFacts(out.programmeId);
    expect(facts.version).toBe(2);
    expect(Object.values(facts.routineIdBySession).sort()).toEqual(routines.map((r) => r.id).sort());
    expect(facts.thin[facts.routineIdBySession.s0]).toEqual([exerciseId('Seated Cable Row')]);
    expect(Object.keys(facts.slots[facts.routineIdBySession.s0])).toEqual([exerciseId('Barbell Bench Press'), exerciseId('Seated Cable Row')]);
  });

  test('archives only the plan it replaced: a plan the person saved for later is untouched, and the replaced plan is kept (archived), not deleted', async () => {
    const plan = await seedPlan('Replaced plan');
    const saved = await createProgramme(U, 'Saved for later', '', 0, null, null, null, false);
    await conn.runAsync('UPDATE programmes SET is_active = 0, is_archived = 0 WHERE id = ?', [saved.id]);
    const savedBefore = await conn.getFirstAsync('SELECT * FROM programmes WHERE id = ?', [saved.id]);

    const out = await rebuildPlanKeepingBlockV2(U, generatedSpec());

    const old = await conn.getFirstAsync('SELECT is_active, is_archived FROM programmes WHERE id = ?', [plan.programmeId]);
    expect([old.is_active, old.is_archived]).toEqual([0, 1]);
    expect(await conn.getFirstAsync('SELECT * FROM programmes WHERE id = ?', [saved.id])).toEqual(savedBefore);
    // The old plan's routines are still there (a person can restore it).
    expect((await table('SELECT id FROM routines WHERE programme_id = ?', [plan.programmeId])).length).toBe(2);
    expect(out.programmeId).toBeTruthy();
  });

  test('the block is kept: no mesocycle or week row changes, and the current and later weeks take the targets', async () => {
    const plan = await seedPlan('Generated keeps block', { weekIndex: 4 });
    const before = await snapshot();
    const chestBefore = await plannedRows(plan.blockId, 'chest');
    await rebuildPlanKeepingBlockV2(U, generatedSpec());

    const after = await snapshot();
    expect(after.mesocycles).toEqual(before.mesocycles);
    expect(after.weeks).toEqual(before.weeks);
    const chest = await plannedRows(plan.blockId, 'chest');
    chest.forEach((row, i) => {
      if (row.week_index < 4) expect(row).toEqual(chestBefore[i]);
      else expect(row.planned_sets).toBe(TARGETS.chest[row.week_index - 1]);
    });
  });

  test('a failure while writing leaves no new programme, routine or exercise, and the old plan active', async () => {
    const plan = await seedPlan('Generated fails');
    const before = await snapshot();
    const bad = generatedSpec();
    bad.workouts[1].exercises[0].exerciseId = null; // violates NOT NULL on the LAST exercise: the programme and routines are already written
    await expect(rebuildPlanKeepingBlockV2(U, bad)).rejects.toBeTruthy();

    expect(await snapshot()).toEqual(before);
    const active = await table('SELECT id FROM programmes WHERE user_id = ? AND is_active = 1', [U]);
    expect(active.map((r) => r.id)).toEqual([plan.programmeId]);
  });

  test('a facts builder that throws rolls the whole write back', async () => {
    await seedPlan('Facts throw');
    const before = await snapshot();
    await expect(rebuildPlanKeepingBlockV2(U, generatedSpec({ buildFacts: () => { throw new Error('facts failed'); } })))
      .rejects.toThrow('facts failed');
    expect(await snapshot()).toEqual(before);
  });
});

describe('a failure leaves the plan exactly as it was', () => {
  test('a bad row part-way through an in-place rebuild rolls back every earlier update', async () => {
    const plan = await seedPlan('In place fails');
    const before = await snapshot();
    const spec = inPlaceSpec(plan);
    spec.routines[1].exercises[1].routineExerciseId = 'no-such-row'; // the LAST row: three updates have already run
    await expect(rebuildPlanKeepingBlockV2(U, spec)).rejects.toBeTruthy();
    expect(await snapshot()).toEqual(before);
    expect(await getProgrammePlanFacts(plan.programmeId)).toBeNull();
  });

  test('a facts builder that throws, after the sets, the order and the weekly rows were written, rolls them all back', async () => {
    const plan = await seedPlan('In place facts throw');
    const before = await snapshot();
    await expect(rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan, { buildFacts: () => { throw new Error('boom'); } })))
      .rejects.toThrow('boom');
    expect(await snapshot()).toEqual(before);
  });

  test('a routine that is not in the plan is refused before anything is written', async () => {
    const plan = await seedPlan('Foreign routine');
    const other = await seedPlan('Another plan', { userId: 'user-c1b-other' });
    const before = await snapshot();
    const spec = inPlaceSpec(plan);
    spec.routines[0].routineId = other.upper;
    await expect(rebuildPlanKeepingBlockV2(U, spec)).rejects.toBeTruthy();
    expect(await snapshot()).toEqual(before);
    expect((await snapshot('user-c1b-other')).routines.length).toBe(2);
  });

  test('a plan that is not the person\'s active plan is refused, nothing written', async () => {
    const plan = await seedPlan('Active one');
    const inactive = await seedPlan('Inactive one');
    // seedPlan's activation made `inactive` the active plan; make the first one inactive instead.
    await conn.runAsync('UPDATE programmes SET is_active = 0 WHERE id = ?', [plan.programmeId]);
    const before = await snapshot();
    await expect(rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan))).rejects.toBeTruthy();
    expect(await snapshot()).toEqual(before);
    expect(inactive.programmeId).toBeTruthy();
  });

  test('a running block whose current week cannot be read fails the whole rebuild, nothing written', async () => {
    const plan = await seedPlan('Weeks gone');
    await conn.runAsync('DELETE FROM planned_muscle_volume WHERE mesocycle_week_id IN (SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ?)', [plan.blockId]);
    await conn.runAsync('DELETE FROM mesocycle_weeks WHERE mesocycle_id = ?', [plan.blockId]);
    const before = await snapshot();
    await expect(rebuildPlanKeepingBlockV2(U, inPlaceSpec(plan))).rejects.toBeTruthy();
    expect(await snapshot()).toEqual(before);
  });

  test('no user, no spec or an unknown mode throws before touching anything', async () => {
    await expect(rebuildPlanKeepingBlockV2(null, { mode: 'in_place' })).rejects.toBeTruthy();
    await expect(rebuildPlanKeepingBlockV2(U, null)).rejects.toBeTruthy();
    await expect(rebuildPlanKeepingBlockV2(U, { mode: 'elsewhere' })).rejects.toBeTruthy();
  });
});

describe('D140 stays as it is', () => {
  test('the writer is its own function: it does not edit activatePlanKeepingBlock, which still has no mesocycle or planned-volume write', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.resolve(__dirname, '..', 'database.js'), 'utf8');
    const start = src.indexOf('export async function activatePlanKeepingBlock');
    const end = src.indexOf('\nexport ', start + 10);
    const keep = src.slice(start, end);
    expect(keep).toMatch(/await setActivePlan\(userId, planId\);/);
    expect(keep).not.toMatch(/planned_muscle_volume|mesocycle_weeks|rebuildPlanKeepingBlockV2/);
    // The new writer never calls the nested-transaction writers (setActivePlan opens its own).
    expect(src).toContain('export async function rebuildPlanKeepingBlockV2');
    const w = src.slice(src.indexOf('export async function rebuildPlanKeepingBlockV2'));
    const body = w.slice(0, w.indexOf('\nexport ', 10));
    expect(body).not.toMatch(/await setActivePlan\(|await activatePlanKeepingBlock\(|await activatePlanWithBlock\(|await archiveOtherUserPlans\(/);
    expect(body).not.toMatch(/INSERT INTO mesocycles|UPDATE mesocycles|INSERT INTO mesocycle_weeks|UPDATE mesocycle_weeks/);
  });
});

// setProgrammePlanFacts is imported so an unused-export change cannot hide a rename.
test('the facts accessors the writer builds on are the live ones', () => {
  expect(typeof setProgrammePlanFacts).toBe('function');
});
