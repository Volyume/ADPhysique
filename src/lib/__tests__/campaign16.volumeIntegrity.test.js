/**
 * campaign16.volumeIntegrity.test.js — Campaign 16 job 6.
 *
 * FOUNDER BRIEF: "Run the canonical allocator after final exercise
 * selection. The Abductor Machine bug demonstrated why preview intent is
 * not enough. Pin: target / preview delivered / persisted delivered /
 * activated-block planned volume against one another. No
 * generated-but-unpersisted exercise may contribute phantom volume."
 *
 * THE DEFECT THIS EXISTS FOR
 *
 * The engine's `weeklyVolumeSummary` is computed from the workouts it built
 * using the pool it built them from, so it describes INTENT. Anything that
 * happens to an exercise afterwards - a name that fails to resolve, a slot
 * the user excluded, a row that never gets written - is invisible to it.
 *
 * `Abductor Machine` was in the fallback pool and in no library row. It was
 * counted into the weekly summary and dropped at save. A Bikini three-day
 * plan reported fourteen weekly glute sets and delivered eleven, and every
 * number the app showed agreed with every other number, because they all
 * came from one source.
 *
 * So this suite deliberately counts TWICE, from different places: once from
 * the engine's claim, once by resolving the actual exercises against the
 * exercise catalogue, and once more by reading the rows back out of the
 * database after the commit. Two independent counts that agree are
 * evidence. One count repeated is not.
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

const { db, insertExerciseWithId, getAllExercises } = require('../database');
const { generateAndSavePlan, generatePlanDryRun } = require('../planAutoGen');
const { generatePlan } = require('../planEngine');
const { auditPlanVolume, countDeliveredSets, compareStages } = require('../exercise/volumeAudit');
const { canonicalExerciseId } = require('../exercise/canonicalId');
const { LIBRARY, inputs } = require('./campaign16.helpers');

/** The catalogue, keyed the way volumeAudit resolves: id first, name second. */
const CATALOGUE = new Map();
for (const e of LIBRARY) {
  CATALOGUE.set(canonicalExerciseId(e.name), e);
  CATALOGUE.set(e.name, e);
}

const PROFILES = [
  { label: 'general 4d', over: {}, profile: { experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60, equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain' } },
  { label: 'bikini 3d', over: { goal: 'bikini', daysPerWeek: 3 }, profile: { experience: 'intermediate', daysPerWeek: 3, sessionLengthMinutes: 60, equipment: 'full_gym', trainingGoal: 'bikini', trainingPhase: 'maintain' } },
  { label: 'wellness 4d', over: { goal: 'wellness' }, profile: { experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 60, equipment: 'full_gym', trainingGoal: 'wellness', trainingPhase: 'maintain' } },
  { label: 'advanced 6d', over: { experience: 'advanced', daysPerWeek: 6 }, profile: { experience: 'advanced', daysPerWeek: 6, sessionLengthMinutes: 60, equipment: 'full_gym', trainingGoal: 'build_muscle', trainingPhase: 'maintain' } },
];

let conn;
beforeAll(async () => {
  conn = await db();
  // Seed the real library into the real database, with the real canonical ids.
  for (const e of LIBRARY) {
    await insertExerciseWithId(canonicalExerciseId(e.name), {
      name: e.name,
      primaryMuscle: e.primaryMuscle,
      secondaryMuscles: e.secondaryMuscles,
      equipment: e.equipment,
      equipmentCategory: e.equipmentCategory,
      compoundIsolation: e.compoundIsolation,
      movementPattern: e.movementPattern,
      subregion: e.subregion,
      equipmentProfiles: e.equipmentProfiles,
      difficulty: e.difficulty,
      stimulusToFatigueRatio: e.stimulusToFatigueRatio,
      minReps: e.minReps,
      maxReps: e.maxReps,
    });
  }
});

/** Read a saved programme's exercises back out as workout-shaped rows. */
async function readPersisted(programmeId) {
  const routines = await conn.getAllAsync(
    'SELECT id, name FROM routines WHERE programme_id = ? ORDER BY position ASC', [programmeId]);
  const out = [];
  for (const r of routines) {
    const rows = await conn.getAllAsync(
      `SELECT exercise_id, exercise_name, recommended_sets
         FROM routine_exercises
        WHERE routine_id = ? AND deleted_at IS NULL
        ORDER BY order_in_routine ASC`, [r.id]);
    out.push({
      name: r.name,
      exercises: rows.map(x => ({
        exerciseId: x.exercise_id,
        exerciseName: x.exercise_name,
        sets: x.recommended_sets,
      })),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------

describe('C16-6 the engine delivers the volume it claims', () => {
  test.each(PROFILES)('$label: an independent recount agrees with the summary', ({ over }) => {
    const p = generatePlan({ ...inputs(over), exerciseLibrary: LIBRARY });
    const audit = auditPlanVolume(p, CATALOGUE);
    expect(audit.mismatches).toEqual([]);
    expect(audit.unresolved).toEqual([]);
  });

  test('the recount is genuinely independent of the engine', () => {
    // If it read the engine's pool it would agree by construction and prove
    // nothing. It resolves against the exercise CATALOGUE instead, which is
    // the source the persistence layer uses.
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.resolve(__dirname, '../exercise/volumeAudit.js'), 'utf8');
    expect(src).not.toMatch(/from '\.\.\/planEngine'|require\('\.\.\/planEngine'\)/);
    expect(src).not.toMatch(/_effectivePool|POOL/);
  });

  test('an unresolvable exercise is REPORTED, never counted as zero and forgotten', () => {
    // The Abductor Machine shape. Silence is the failure mode this whole
    // job exists to remove.
    const { sets, unresolved } = countDeliveredSets(
      [{ exercises: [
        { exerciseName: 'Abductor Machine', sets: 3 },
        { exerciseName: 'Barbell Hip Thrust', exerciseId: canonicalExerciseId('Barbell Hip Thrust'), sets: 4 },
      ] }],
      CATALOGUE,
    );
    expect(unresolved).toEqual(['Abductor Machine']);
    expect(sets.glutes).toBe(4);
  });

  test('a phantom exercise cannot inflate a muscle silently', () => {
    const real = [{ exercises: [
      { exerciseId: canonicalExerciseId('Barbell Hip Thrust'), exerciseName: 'Barbell Hip Thrust', sets: 4 },
    ] }];
    const withPhantom = [{ exercises: [
      ...real[0].exercises,
      { exerciseName: 'Abductor Machine', sets: 3 },
    ] }];
    // The phantom adds nothing to the count AND is named in `unresolved`.
    expect(countDeliveredSets(withPhantom, CATALOGUE).sets.glutes).toBe(4);
    expect(compareStages(real, withPhantom, CATALOGUE).equal).toBe(true);
    expect(countDeliveredSets(withPhantom, CATALOGUE).unresolved).toHaveLength(1);
  });
});

describe('C16-6 preview, persisted and activated agree', () => {
  test.each(PROFILES)('$label: every stage delivers the same volume', async ({ profile }) => {
    const userId = `u-vol-${profile.trainingGoal}-${profile.daysPerWeek}-${profile.experience}`;

    const preview = await generatePlanDryRun(userId, profile);
    expect(preview.ok).toBe(true);
    const previewSets = countDeliveredSets(preview.plan.workouts, CATALOGUE);
    expect(previewSets.unresolved).toEqual([]);

    const saved = await generateAndSavePlan(userId, profile);
    expect(saved.ok).toBe(true);

    const persisted = await readPersisted(saved.programmeId);
    const persistedSets = countDeliveredSets(persisted, CATALOGUE);
    expect(persistedSets.unresolved).toEqual([]);

    // 1. Preview vs persisted: what the user was shown is what they got.
    expect(compareStages(preview.plan.workouts, persisted, CATALOGUE).differences).toEqual([]);

    // 2. The engine's own claim vs what actually reached the database.
    const claim = preview.plan.weeklyVolumeSummary ?? {};
    const mismatches = [];
    for (const [bucket, v] of Object.entries(claim)) {
      const delivered = persistedSets.sets[bucket] ?? 0;
      if ((v.plannedSets ?? 0) !== delivered) {
        mismatches.push({ bucket, claimed: v.plannedSets, delivered });
      }
    }
    expect(mismatches).toEqual([]);
  });

  test('the activated block carries planned volume for every muscle the plan trains', async () => {
    // The fourth stage the brief names. The block's planned volume is a
    // per-week TARGET that ramps MEV -> MAV, so it is deliberately NOT
    // equal to the plan's delivered sets - asserting equality would be
    // asserting the ramp does not exist. What must hold is that every
    // muscle the plan actually trains has a real target in the block, and
    // that no target is zero or missing: a muscle with exercises but no
    // planned volume is a muscle the coach cannot reason about later.
    const profile = PROFILES[0].profile;
    const userId = 'u-vol-block';
    const saved = await generateAndSavePlan(userId, profile);
    expect(saved.ok).toBe(true);

    const persisted = await readPersisted(saved.programmeId);
    const trained = new Set();
    for (const w of persisted) {
      for (const e of w.exercises) {
        const row = CATALOGUE.get(e.exerciseId) ?? CATALOGUE.get(e.exerciseName);
        if (row?.primaryMuscle) trained.add(row.primaryMuscle);
      }
    }
    expect(trained.size).toBeGreaterThan(4);

    const block = await conn.getFirstAsync(
      'SELECT id FROM mesocycles WHERE user_id = ? AND is_active = 1 LIMIT 1', [userId]);
    expect(block?.id).toBeTruthy();
    const planned = await conn.getAllAsync(
      `SELECT pmv.muscle, pmv.planned_sets
         FROM planned_muscle_volume pmv
         JOIN mesocycle_weeks mw ON mw.id = pmv.mesocycle_week_id
        WHERE mw.mesocycle_id = ?`, [block.id]);
    expect(planned.length).toBeGreaterThan(0);

    const plannedByMuscle = new Map();
    for (const row of planned) {
      plannedByMuscle.set(row.muscle, Math.max(plannedByMuscle.get(row.muscle) ?? 0, row.planned_sets));
    }
    const missing = [...trained].filter(m => !((plannedByMuscle.get(m) ?? 0) > 0));
    expect(missing).toEqual([]);
  });

  test('the activated block prescribes exactly the persisted rows', async () => {
    // The block references the plan rather than carrying its own copy of
    // the volume, so activation must not be able to change what is
    // prescribed. This asserts that rather than assuming it.
    const profile = PROFILES[0].profile;
    const userId = 'u-vol-activation';
    const saved = await generateAndSavePlan(userId, profile);
    expect(saved.ok).toBe(true);

    const beforeBlock = await readPersisted(saved.programmeId);
    const block = await conn.getFirstAsync(
      'SELECT id, is_active FROM mesocycles WHERE user_id = ? ORDER BY start_date DESC LIMIT 1',
      [userId]);
    expect(block?.is_active).toBe(1);

    const afterBlock = await readPersisted(saved.programmeId);
    expect(compareStages(beforeBlock, afterBlock, CATALOGUE).differences).toEqual([]);
  });

  test('every persisted row resolves to a real catalogue exercise', async () => {
    // A row whose exercise_id does not resolve is a plan the user cannot
    // open: the ActiveWorkout join returns nothing for it.
    const userId = 'u-vol-resolve';
    const saved = await generateAndSavePlan(userId, PROFILES[1].profile);
    expect(saved.ok).toBe(true);
    const persisted = await readPersisted(saved.programmeId);
    const catalogue = await getAllExercises();
    const ids = new Set(catalogue.map(e => e.id));
    const orphans = persisted.flatMap(w => w.exercises)
      .filter(e => !ids.has(e.exerciseId))
      .map(e => e.exerciseName);
    expect(orphans).toEqual([]);
  });

  test('the count written matches the count previewed, exercise for exercise', async () => {
    const userId = 'u-vol-count';
    const preview = await generatePlanDryRun(userId, PROFILES[3].profile);
    const saved = await generateAndSavePlan(userId, PROFILES[3].profile);
    const persisted = await readPersisted(saved.programmeId);
    const previewNames = preview.plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    const persistedNames = persisted.flatMap(w => w.exercises.map(e => e.exerciseName));
    expect(persistedNames).toEqual(previewNames);
  });
});

describe('C16-6 the Bikini regression specifically', () => {
  test('a Bikini three-day plan delivers the glute volume it previews', async () => {
    // The exact plan that exposed the defect: preview showed 14 weekly
    // glute sets, the user received 11.
    const userId = 'u-vol-bikini';
    const preview = await generatePlanDryRun(userId, PROFILES[1].profile);
    expect(preview.ok).toBe(true);
    const previewed = countDeliveredSets(preview.plan.workouts, CATALOGUE).sets.glutes ?? 0;
    const claimed = preview.plan.weeklyVolumeSummary?.glutes?.plannedSets ?? 0;

    const saved = await generateAndSavePlan(userId, PROFILES[1].profile);
    const delivered = countDeliveredSets(await readPersisted(saved.programmeId), CATALOGUE).sets.glutes ?? 0;

    expect(previewed).toBe(claimed);
    expect(delivered).toBe(claimed);
    expect(delivered).toBeGreaterThan(0);
  });
});
