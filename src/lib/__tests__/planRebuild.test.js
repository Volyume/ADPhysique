/**
 * D219 lane C1b: plans people already follow are rebuilt at their next session
 * (founder Q1 = A "Rebuild at next session"; register D219 "Build rulings" 3 to
 * 5, design section 8 and section 11 test 8).
 *
 * BEHAVIOURAL, real SQLite (node:sqlite) through the REAL init path with a
 * really-rolling-back transaction, the real exercise library (918 exercises)
 * and the real library plans, the real planner and the real catalogue. The
 * profile is the one input handed in. What it pins, each failing on the code
 * before this lane (the module did not exist):
 *
 *  - HOW THE KINDS ARE TOLD APART: a copy of a library plan (programmes.
 *    source_programme_id pointing at an is_library programme: a kit plan is
 *    one) is LIBRARY; otherwise a routine carrying a split_type or an exercise
 *    carrying a selection reason (the generator writes both, the manual builder
 *    neither) is GENERATED; otherwise MANUAL;
 *  - the TRIGGER: the first time the active plan is opened and its facts are not
 *    version 2 it is rebuilt; ONCE per plan (a second open does nothing: no new
 *    programme, no new note); a plan the planner built is left alone; nothing
 *    in it ever throws into the caller;
 *  - GENERATED: rebuilt by the new planner (structure search) with the person's
 *    days and block week kept, every week inside the caps, the old plan kept
 *    (archived), facts version 2;
 *  - LIBRARY and KIT: the same programme, the same sessions, the same exercises
 *    in the same order with the same reps and rest; only sets and the sessions'
 *    order change, inside the caps in every week; facts version 2 with the
 *    planner's roles; an exercise the planner cannot set (a timed one) keeps
 *    its stored count as typed;
 *  - MANUAL: nothing the person built changes; facts version 2 with EVERY count
 *    typed, so each is served as typed in weeks 1 to 5 (above the caps), at half
 *    in the recovery week, never climbed on top;
 *  - the block is kept in all three (no mesocycle or week row changes, past
 *    weeks' rows untouched, the running ladder is the facts' ladder);
 *  - A FAILURE leaves the plan exactly as it was, is logged, is retried a
 *    bounded number of times, and never blocks the session;
 *  - the ONE-TIME NOTE: written once after a rebuild, shown until dismissed,
 *    gone after, never rewritten for the same plan.
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

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const { logError } = require('../errorLog');
const database = require('../database');
const {
  db, createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock, copyPlanFromLibrary,
  getLibraryPlans, getProgrammePlanFacts, getAllExercises, getRoutinesForPlan, getRoutineExercisesWithDetails,
} = database;
const { seedExercisesIfNeeded } = require('../seedExercises');
const { seedRoutinesIfNeeded } = require('../seedRoutines');
const {
  ensureActivePlanRebuilt, classifyPlanKind, fixedSessionsFromPlan, getPlanRebuildNote, dismissPlanRebuildNote,
  PLAN_KIND, __resetPlanRebuildForTests,
} = require('../planRebuild');
const { buildPlanSessions, getSessionWeeklyAllocation, getPlanServeContextForRoutine } = require('../sessionAdjustments');
const { prescribeWeek } = require('../plan/prescribe');
const { exerciseCap, PER_SESSION } = require('../plan/science');
const { CATALOGUE } = require('../plan/catalogue');

// A fresh person for every test: plans, blocks and notes never leak between them.
let U;
let counter = 0;
const PROFILE = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75, equipment: 'full_gym',
  trainingGoal: 'general', trainingPhase: 'maintain', recoveryRating: 'average',
};

let conn;
let exercises;
let byName;
beforeAll(async () => {
  conn = await db();
  await seedExercisesIfNeeded();
  await seedRoutinesIfNeeded('user-c1b-seed');
  exercises = await getAllExercises();
  byName = new Map(exercises.map((e) => [e.name, e]));
});
beforeEach(() => {
  counter += 1;
  U = `user-c1b-rebuild-${counter}`;
  AsyncStorage.__store.clear();
  __resetPlanRebuildForTests();
  logError.mockClear();
});

const exId = (name) => {
  const e = byName.get(name);
  if (!e) throw new Error(`the seeded library has no ${name}`);
  return e.id;
};
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
async function setBlockWeek(blockId, weekIndex) {
  const start = new Date();
  start.setDate(start.getDate() - (weekIndex - 1) * 7);
  await conn.runAsync('UPDATE mesocycles SET start_date = ? WHERE id = ?', [dayKey(start), blockId]);
}
const table = (sql, params = []) => conn.getAllAsync(sql, params);

// A plan with a running block, hand-written the way each kind is stored.
async function seedPlan({ userId, name, sessions, splitType = null, reason = null, source = null, weekIndex = 3 }) {
  const programme = await createProgramme(userId, name, '', 0, null, null, null, false);
  if (source) await conn.runAsync('UPDATE programmes SET source_programme_id = ? WHERE id = ?', [source, programme.id]);
  const routineIds = [];
  const rowIds = {};
  for (const session of sessions) {
    const routine = await createRoutine(userId, session.name, null, splitType, 0, null, programme.id, false, false);
    routineIds.push(routine.id);
    let order = 0;
    // An entry is [name, sets] or [name, sets, reason]: a third value overrides the
    // plan's reason for that row (null: the person added it themselves).
    for (const [exName, sets, rowReason] of session.exercises) {
      const re = await addExerciseToRoutine(
        routine.id, exId(exName), order++, 8, 12, null, sets, null, 90, null, false, rowReason === undefined ? reason : rowReason,
      );
      rowIds[`${session.name}:${exName}`] = re.id;
    }
  }
  const blockId = await activatePlanWithBlock(userId, programme.id, name, { allowLearnedCarry: false });
  await setBlockWeek(blockId, weekIndex);
  return { programmeId: programme.id, routineIds, rowIds, blockId };
}

// An old-style generated plan: four sessions, six working sets of bench press.
const GENERATED_SESSIONS = [
  { name: 'Upper A', exercises: [['Barbell Bench Press', 6], ['Incline Dumbbell Press', 4], ['Lat Pulldown (Wide Grip)', 4], ['Seated Cable Row', 4], ['Tricep Pushdown (Rope)', 3], ['EZ Bar Preacher Curl', 3]] },
  { name: 'Lower A', exercises: [['Barbell Back Squat', 5], ['Leg Press', 4], ['Seated Leg Curl', 4], ['Standing Calf Raise (Machine)', 4]] },
  { name: 'Upper B', exercises: [['Incline Dumbbell Press', 4], ['Seated Cable Row', 4], ['Dumbbell Lateral Raise', 4], ['Barbell Curl', 3]] },
  { name: 'Lower B', exercises: [['Romanian Deadlift (Barbell)', 4], ['Leg Press', 4], ['Seated Leg Curl', 3], ['Standing Calf Raise (Machine)', 3]] },
];
const seedGenerated = (over = {}) => seedPlan({
  userId: U, name: 'Old generated plan', sessions: GENERATED_SESSIONS, splitType: 'upper_lower', reason: 'required_role', ...over,
});

const MANUAL_SESSIONS = [
  { name: 'Push', exercises: [['Barbell Bench Press', 6], ['Dumbbell Lateral Raise', 5], ['Tricep Pushdown (Rope)', 2]] },
  { name: 'Pull', exercises: [['Lat Pulldown (Wide Grip)', 3], ['Seated Cable Row', 7], ['Barbell Curl', 1]] },
  { name: 'Legs', exercises: [['Barbell Back Squat', 8], ['Seated Leg Curl', 3]] },
];
const seedManual = (over = {}) => seedPlan({ userId: U, name: 'My own plan', sessions: MANUAL_SESSIONS, ...over });

async function seedLibraryCopy(planName, over = {}) {
  const libs = await getLibraryPlans();
  const lib = libs.find((p) => p.name === planName);
  if (!lib) throw new Error(`no library plan ${planName}`);
  const copy = await copyPlanFromLibrary(lib.id, U);
  const blockId = await activatePlanWithBlock(U, copy.id, copy.name, { allowLearnedCarry: false });
  await setBlockWeek(blockId, over.weekIndex ?? 2);
  return { programmeId: copy.id, blockId, libraryId: lib.id };
}

async function snapshot(userId = U) {
  return {
    programmes: await table('SELECT * FROM programmes WHERE user_id = ? ORDER BY id', [userId]),
    routines: await table('SELECT * FROM routines WHERE user_id = ? ORDER BY id', [userId]),
    routineExercises: await table('SELECT re.* FROM routine_exercises re JOIN routines r ON r.id = re.routine_id WHERE r.user_id = ? ORDER BY re.id', [userId]),
    mesocycles: await table('SELECT * FROM mesocycles WHERE user_id = ? ORDER BY id', [userId]),
    weeks: await table('SELECT w.* FROM mesocycle_weeks w JOIN mesocycles m ON m.id = w.mesocycle_id WHERE m.user_id = ? ORDER BY w.id', [userId]),
    planned: await table(`SELECT p.* FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id JOIN mesocycles m ON m.id = w.mesocycle_id WHERE m.user_id = ? ORDER BY p.id`, [userId]),
  };
}
const activeProgramme = async () => (await table('SELECT * FROM programmes WHERE user_id = ? AND is_active = 1', [U]))[0];

/** Serve one week of the stored plan through the plan's own facts and the block's rows. */
async function servedWeek(programmeId, weekIndex) {
  const facts = await getProgrammePlanFacts(programmeId);
  const routines = await getRoutinesForPlan(programmeId);
  const withRows = [];
  for (const routine of routines) withRows.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
  const sessions = buildPlanSessions(withRows, facts);
  const block = await conn.getFirstAsync('SELECT id FROM mesocycles WHERE user_id = ? AND is_active = 1', [U]);
  const rows = await table(
    `SELECT p.muscle, p.planned_sets FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id
      WHERE w.mesocycle_id = ? AND w.week_index = ?`, [block.id, weekIndex],
  );
  const weekTargets = Object.fromEntries(rows.map((r) => [r.muscle, r.planned_sets]));
  const served = prescribeWeek({ sessions, weekTargets, facts: { exposureShares: facts.exposureShares, sessionCaps: facts.sessionCaps } });
  return { facts, sessions, served };
}

describe('how the kinds are told apart', () => {
  const routine = (splitType) => ({ id: 'r', splitType });
  const row = (selectionReason) => ({ routineExercise: { selectionReason } });
  const plan = (sourceProgrammeId = null) => ({ id: 'p', sourceProgrammeId });

  test('a copy of a library plan (a kit plan is one) is LIBRARY, whatever its routines carry', () => {
    expect(classifyPlanKind({ programme: plan('lib'), source: { isLibrary: 1 }, routines: [routine(null)], rows: [row(null)] })).toBe(PLAN_KIND.LIBRARY);
    expect(classifyPlanKind({ programme: plan('lib'), source: { isLibrary: 1 }, routines: [routine('ppl')], rows: [row('required_role')] })).toBe(PLAN_KIND.LIBRARY);
  });

  test('a split type on a routine, or a selection reason on an exercise, means GENERATED', () => {
    expect(classifyPlanKind({ programme: plan(), source: null, routines: [routine('upper_lower')], rows: [row(null)] })).toBe(PLAN_KIND.GENERATED);
    expect(classifyPlanKind({ programme: plan(), source: null, routines: [routine(null)], rows: [row('required_role')] })).toBe(PLAN_KIND.GENERATED);
  });

  test('neither, and no library source, is MANUAL', () => {
    expect(classifyPlanKind({ programme: plan(), source: null, routines: [routine(null), routine('')], rows: [row(null), row(null)] })).toBe(PLAN_KIND.MANUAL);
  });

  test('a duplicate of a person\'s own plan (its source is not a library plan) is told by its routines, not called library', () => {
    expect(classifyPlanKind({ programme: plan('mine'), source: { isLibrary: 0 }, routines: [routine('ppl')], rows: [] })).toBe(PLAN_KIND.GENERATED);
    expect(classifyPlanKind({ programme: plan('mine'), source: { isLibrary: 0 }, routines: [routine(null)], rows: [row(null)] })).toBe(PLAN_KIND.MANUAL);
    expect(classifyPlanKind({ programme: plan('gone'), source: null, routines: [routine(null)], rows: [row(null)] })).toBe(PLAN_KIND.MANUAL);
  });
});

describe('the trigger: once per plan, idempotent, never throws', () => {
  test('a plan the planner built (facts version 2) is left exactly as it is', async () => {
    const plan = await seedGenerated();
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', [JSON.stringify({ version: 2 }), plan.programmeId]);
    const before = await snapshot();
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('current');
    expect(await snapshot()).toEqual(before);
    expect(await getPlanRebuildNote(U)).toBeNull();
  });

  test('no active plan: nothing to do, nothing thrown', async () => {
    await conn.runAsync('UPDATE programmes SET is_active = 0 WHERE user_id = ?', [U]);
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('none');
  });

  test('a second open rebuilds nothing: no new programme, no second note', async () => {
    await seedGenerated();
    const first = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(first.status).toBe('rebuilt');
    const after = await snapshot();
    const second = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(second.status).toBe('current');
    expect(await snapshot()).toEqual(after);
    // Even a restart (the in-memory memory gone): the plan's own facts say it is done.
    __resetPlanRebuildForTests();
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('current');
    expect(await snapshot()).toEqual(after);
  });

  test('two screens opening at once share one rebuild', async () => {
    await seedGenerated();
    const [a, b] = await Promise.all([ensureActivePlanRebuilt(U, { profile: PROFILE }), ensureActivePlanRebuilt(U, { profile: PROFILE })]);
    expect(a).toEqual(b);
    expect((await table("SELECT id FROM programmes WHERE user_id = ? AND is_archived = 0 AND (is_library = 0 OR is_library IS NULL)", [U])).length).toBe(1);
  });

  test('a read that fails is answered, never thrown', async () => {
    const spy = jest.spyOn(database, 'getActivePlan').mockRejectedValueOnce(new Error('disk I/O'));
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('failed');
    expect(logError).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('GENERATED: the structure search, with the days and the week kept', () => {
  test('rebuilds with the planner, keeps the block and the days, archives the old plan, writes version 2 facts', async () => {
    const old = await seedGenerated({ weekIndex: 3 });
    const before = await snapshot();
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });

    expect(out).toMatchObject({ status: 'rebuilt', kind: 'generated' });
    const active = await activeProgramme();
    expect(active.id).not.toBe(old.programmeId);
    const facts = await getProgrammePlanFacts(active.id);
    expect(facts.version).toBe(2);
    expect(facts.kind).toBe('generated');
    // The person's days: four sessions before, four now.
    expect((await getRoutinesForPlan(active.id)).length).toBe(4);
    // The old plan is kept, archived, with its routines.
    const oldRow = await conn.getFirstAsync('SELECT is_active, is_archived FROM programmes WHERE id = ?', [old.programmeId]);
    expect([oldRow.is_active, oldRow.is_archived]).toEqual([0, 1]);
    expect((await getRoutinesForPlan(old.programmeId)).length).toBe(4);
    // The block, and so the person's week, is the same rows.
    const after = await snapshot();
    expect(after.mesocycles).toEqual(before.mesocycles);
    expect(after.weeks).toEqual(before.weeks);
  });

  test('weeks 1 and 2 are untouched; the current week and later take the planner\'s targets', async () => {
    const old = await seedGenerated({ weekIndex: 3 });
    const beforeRows = await table(
      `SELECT p.*, w.week_index FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id WHERE w.mesocycle_id = ? ORDER BY p.id`, [old.blockId],
    );
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const facts = await getProgrammePlanFacts((await activeProgramme()).id);
    const afterRows = await table(
      `SELECT p.*, w.week_index FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id WHERE w.mesocycle_id = ? ORDER BY p.id`, [old.blockId],
    );
    const byId = new Map(beforeRows.map((r) => [r.id, r]));
    let rewritten = 0;
    for (const row of afterRows) {
      const was = byId.get(row.id);
      if (row.week_index < 3) { expect(row).toEqual(was); continue; }
      const targets = facts.weeklyTargets[row.muscle];
      if (!targets) { expect(row).toEqual(was); continue; }
      const expected = row.week_index === 6 ? targets[targets.length - 1] : targets[row.week_index - 1];
      expect(row.planned_sets).toBe(expected);
      expect([row.mev, row.mav, row.mrv]).toEqual([was.mev, was.mav, was.mrv]);
      rewritten += 1;
    }
    expect(rewritten).toBeGreaterThan(10);
  });

  test('every week of the rebuilt plan passes the caps: exercises, and each muscle\'s session', async () => {
    await seedGenerated({ weekIndex: 1 });
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const programmeId = (await activeProgramme()).id;
    for (const weekIndex of [1, 2, 3, 4, 5, 6]) {
      const { facts, sessions, served } = await servedWeek(programmeId, weekIndex);
      for (const session of sessions) {
        for (const slot of session.slots) {
          const cap = exerciseCap(slot.kind, slot.thinEquipment === true, { focus: slot.focus === true });
          expect(served.sets[slot.id]).toBeLessThanOrEqual(cap);
        }
        for (const [muscle, direct] of Object.entries(served.perSession[session.id]?.direct ?? {})) {
          const sessionCap = facts.sessionCaps?.[muscle]?.direct ?? PER_SESSION.directCap;
          expect(direct).toBeLessThanOrEqual(sessionCap);
        }
      }
    }
  });

  test('the one-time note names what changed and why, and shows until dismissed, once', async () => {
    await seedGenerated();
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const note = await getPlanRebuildNote(U);
    expect(note).not.toBeNull();
    expect(note.title).toBe('Your plan has been updated');
    const ids = note.lines.map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(['cap', 'block']));
    expect(note.lines.find((l) => l.id === 'cap').text).toMatch(/No exercise goes above 4 sets/);
    expect(note.lines.find((l) => l.id === 'block').text).toMatch(/week 3 of your block/);
    // Dismissed once, gone for good, and the same rebuild never writes it again.
    await dismissPlanRebuildNote(U);
    expect(await getPlanRebuildNote(U)).toBeNull();
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(await getPlanRebuildNote(U)).toBeNull();
  });

  test('a person with an incomplete profile is left alone and tried again later, not marked done', async () => {
    await seedGenerated();
    const before = await snapshot();
    const out = await ensureActivePlanRebuilt(U, { profile: { daysPerWeek: 4 } });
    expect(out.status).toBe('retry');
    expect(await snapshot()).toEqual(before);
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('rebuilt');
  });

  test('a beginner whose plan has more days than the planner can hold keeps the plan exactly as it is', async () => {
    const sessions = [...GENERATED_SESSIONS, { name: 'Extra A', exercises: [['Barbell Curl', 3]] }];
    await seedGenerated({ sessions });
    const before = await snapshot();
    const out = await ensureActivePlanRebuilt(U, { profile: { ...PROFILE, experience: 'beginner' } });
    expect(out).toMatchObject({ status: 'skipped', reason: 'days_not_kept' });
    expect(await snapshot()).toEqual(before);
    // Final for this plan: not recomputed on every open.
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('skipped');
  });
});

describe('GENERATED: a generator pick outside the catalogue is replaced and named; what the person trained stays', () => {
  // A corpus abs exercise that is auto-eligible (continuity would keep it) and that the
  // standard catalogue does not list: only this lane's rule replaces it.
  const OUTSIDE = 'Ab Wheel Rollout';
  const listed = (muscle) => new Set((CATALOGUE[muscle] ?? []).flatMap((r) => r.names));
  const SESSIONS = [
    GENERATED_SESSIONS[0],
    { ...GENERATED_SESSIONS[1], exercises: [...GENERATED_SESSIONS[1].exercises, [OUTSIDE, 3]] }, // the generator's pick (a reason code)
    ...GENERATED_SESSIONS.slice(2),
  ];
  const namesOfActivePlan = async () => {
    const out = [];
    for (const r of await getRoutinesForPlan((await activeProgramme()).id)) {
      for (const row of await getRoutineExercisesWithDetails(r.id)) out.push(row.exercise.name);
    }
    return out;
  };

  test('the premise: the exercise is outside the standard catalogue', () => {
    expect(listed('abs').has(OUTSIDE)).toBe(false);
  });

  test('the generator\'s pick is replaced by the catalogue\'s choice and named in the note', async () => {
    await seedGenerated({ sessions: SESSIONS });
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('rebuilt');
    const names = await namesOfActivePlan();
    expect(names).not.toContain(OUTSIDE);
    expect(names.some((n) => ['Cable Crunch', 'Hanging Knee Raise'].includes(n))).toBe(true);
    const changes = (await getPlanRebuildNote(U)).lines.find((l) => l.id === 'changes');
    expect(changes.text).toContain(OUTSIDE);
  });

  test('the same exercise, picked by the person (no selection reason), stays', async () => {
    const sessions = [
      GENERATED_SESSIONS[0],
      { ...GENERATED_SESSIONS[1], exercises: [...GENERATED_SESSIONS[1].exercises, [OUTSIDE, 3, null]] },
      ...GENERATED_SESSIONS.slice(2),
    ];
    await seedGenerated({ sessions });
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(await namesOfActivePlan()).toContain(OUTSIDE);
  });

  test('a generator pick the person has trained is kept: they used it, so it is theirs', async () => {
    await seedGenerated({ sessions: SESSIONS });
    const now = Date.now();
    await conn.runAsync(
      'INSERT INTO workouts (id, user_id, started_at, ended_at, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)',
      ['w-trained', U, now - 86400000, now - 86000000, now, now],
    );
    await conn.runAsync(
      "INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, set_type, actual_reps, weight) VALUES ('s-trained', ?, 'w-trained', ?, 1, 'straight', 10, 30)",
      [U, exId(OUTSIDE)],
    );
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('rebuilt');
    expect(await namesOfActivePlan()).toContain(OUTSIDE);
  });

  // Every other exercise stays where the new plan has a place for it; one it
  // has no place for is named in the note as taken out, never dropped in
  // silence. (With big muscles first, founder answer 2026-10-05, a smaller
  // muscle can have fewer exercises than the old plan gave it.)
  test('every other exercise the person was training is still in the plan, or named in the note as taken out', async () => {
    const old = await seedGenerated({ sessions: SESSIONS });
    const oldNames = new Set();
    for (const r of await getRoutinesForPlan(old.programmeId)) {
      for (const row of await getRoutineExercisesWithDetails(r.id)) oldNames.add(row.exercise.name);
    }
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const now = new Set(await namesOfActivePlan());
    const gone = [...oldNames].filter((n) => !now.has(n));
    expect(gone).toContain(OUTSIDE);
    const changes = ((await getPlanRebuildNote(U))?.lines ?? []).find((l) => l.id === 'changes')?.text ?? '';
    for (const name of gone.filter((n) => n !== OUTSIDE)) expect({ name, named: changes.includes(name) }).toEqual({ name, named: true });
  });
});

describe('the one-time note shows once, for every kind of plan', () => {
  const KINDS = [
    ['generated', () => seedGenerated(), 'generated'],
    ['library', () => seedLibraryCopy('Upper / Lower 4×/Week'), 'library'],
    ['manual', () => seedManual(), 'manual'],
  ];

  test.each(KINDS)('%s: shown after the rebuild, kept until dismissed, gone after, never written again', async (_name, seed, kind) => {
    await seed();
    expect(await getPlanRebuildNote(U)).toBeNull(); // nothing before the rebuild
    expect(await ensureActivePlanRebuilt(U, { profile: PROFILE })).toMatchObject({ status: 'rebuilt', kind });

    const shown = await getPlanRebuildNote(U);
    expect(shown.title).toBe('Your plan has been updated');
    expect(shown.lines.length).toBeGreaterThan(1);
    // Opening again (even after a restart) leaves it exactly as it is: not rewritten, not duplicated.
    __resetPlanRebuildForTests();
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect((await getPlanRebuildNote(U)).createdAt).toBe(shown.createdAt);

    await dismissPlanRebuildNote(U);
    expect(await getPlanRebuildNote(U)).toBeNull();
    __resetPlanRebuildForTests();
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(await getPlanRebuildNote(U)).toBeNull();
  });

  test('a failed rebuild leaves no note', async () => {
    await seedManual();
    const spy = jest.spyOn(database, 'rebuildPlanKeepingBlockV2').mockRejectedValue(new Error('write failed'));
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(await getPlanRebuildNote(U)).toBeNull();
    spy.mockRestore();
  });
});

describe('a failure leaves the plan exactly as it was', () => {
  test('a write that fails: nothing changes, it is logged, the session is not blocked, and it is retried a bounded number of times', async () => {
    await seedGenerated();
    const before = await snapshot();
    const spy = jest.spyOn(database, 'rebuildPlanKeepingBlockV2').mockRejectedValue(new Error('write failed'));
    const first = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(first.status).toBe('failed');
    expect(await snapshot()).toEqual(before);
    expect(logError).toHaveBeenCalledWith('planRebuild.failed', expect.any(Error), expect.anything());
    expect(await getPlanRebuildNote(U)).toBeNull();

    __resetPlanRebuildForTests();
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('failed'); // attempt 2
    __resetPlanRebuildForTests();
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).status).toBe('failed'); // spent: not tried again
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
    expect(await snapshot()).toEqual(before);
  });

  test('a database failure part-way through the real write rolls everything back', async () => {
    await seedGenerated();
    const before = await snapshot();
    // Break the LAST step of the write: the weekly rows.
    await conn.runAsync(`CREATE TRIGGER fail_pmv BEFORE UPDATE ON planned_muscle_volume BEGIN SELECT RAISE(ABORT, 'forced failure'); END`);
    try {
      const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
      expect(out.status).toBe('failed');
      expect(await snapshot()).toEqual(before);
    } finally {
      await conn.runAsync('DROP TRIGGER fail_pmv');
    }
  });
});

describe('LIBRARY and KIT: the person\'s own sessions and exercises, with the planner setting sets and order', () => {
  const NAME = 'Upper / Lower 4×/Week';

  test('the same programme, sessions and exercises in the same order, reps and rest as authored; only sets and session order move', async () => {
    const copy = await seedLibraryCopy(NAME);
    const beforeRows = [];
    const beforeRoutines = await getRoutinesForPlan(copy.programmeId);
    for (const r of beforeRoutines) beforeRows.push(await getRoutineExercisesWithDetails(r.id));
    const before = await snapshot();

    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out).toMatchObject({ status: 'rebuilt', kind: 'library' });

    expect((await activeProgramme()).id).toBe(copy.programmeId);
    const afterRoutines = await getRoutinesForPlan(copy.programmeId);
    expect([...afterRoutines.map((r) => r.id)].sort()).toEqual([...beforeRoutines.map((r) => r.id)].sort());
    const after = await snapshot();
    expect(after.routineExercises.map((r) => r.id)).toEqual(before.routineExercises.map((r) => r.id));
    for (let i = 0; i < before.routineExercises.length; i++) {
      const { recommended_sets: _a, updated_at: _b, ...was } = before.routineExercises[i];
      const { recommended_sets: _c, updated_at: _d, ...now } = after.routineExercises[i];
      expect(now).toEqual(was); // exercise, order, reps, rest, notes, load, superset: authored
    }
    // Every session keeps its own exercises in its own order.
    for (const r of beforeRoutines) {
      const was = (await getRoutineExercisesWithDetails(r.id)).map((x) => x.exercise.id);
      expect(was).toEqual(beforeRows[beforeRoutines.indexOf(r)].map((x) => x.exercise.id));
    }
    // Mesocycle and week rows are the same: the person's week is kept.
    expect(after.mesocycles).toEqual(before.mesocycles);
    expect(after.weeks).toEqual(before.weeks);
    const facts = await getProgrammePlanFacts(copy.programmeId);
    expect(facts.version).toBe(2);
    expect(facts.kind).toBe('library');
    expect(Object.keys(facts.roles).length).toBeGreaterThan(3);
  });

  test('every rebuilt week is inside the caps, and week 5 holds fewer sets than the old climb', async () => {
    const copy = await seedLibraryCopy(NAME, { weekIndex: 1 });
    const oldWeek5 = await table(
      `SELECT p.muscle, p.planned_sets FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id WHERE w.mesocycle_id = ? AND w.week_index = 5`, [copy.blockId],
    );
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    for (const weekIndex of [1, 2, 3, 4, 5, 6]) {
      const { sessions, served } = await servedWeek(copy.programmeId, weekIndex);
      for (const session of sessions) {
        for (const slot of session.slots) {
          if (slot.typedSets != null) continue; // a typed count is served as typed
          expect(served.sets[slot.id]).toBeLessThanOrEqual(exerciseCap(slot.kind, slot.thinEquipment === true, { focus: slot.focus === true }));
        }
      }
    }
    const newWeek5 = await table(
      `SELECT p.muscle, p.planned_sets FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id WHERE w.mesocycle_id = ? AND w.week_index = 5`, [copy.blockId],
    );
    const sum = (rows) => rows.reduce((a, r) => a + r.planned_sets, 0);
    expect(sum(newWeek5)).toBeLessThan(sum(oldWeek5));
  });

  test('an exercise the planner cannot set (a timed one) keeps its stored count, served as typed', async () => {
    const copy = await seedLibraryCopy(NAME);
    const timed = exercises.find((e) => (e.exerciseType ?? 'weight_reps') === 'duration' && e.primaryMuscle === 'abs');
    expect(timed).toBeTruthy();
    const [firstRoutine] = await getRoutinesForPlan(copy.programmeId);
    const re = await addExerciseToRoutine(firstRoutine.id, timed.id, 99, null, null, null, 3, null, null, null, false, null);
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const facts = await getProgrammePlanFacts(copy.programmeId);
    expect(facts.typed[re.id]).toBe(3);
    const stored = await conn.getFirstAsync('SELECT recommended_sets FROM routine_exercises WHERE id = ?', [re.id]);
    expect(stored.recommended_sets).toBe(3);
  });

  test('the note says the sessions and exercises are as they were', async () => {
    await seedLibraryCopy(NAME);
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const note = await getPlanRebuildNote(U);
    expect(note.lines[0]).toMatchObject({ id: 'kept' });
    expect(note.lines.map((l) => l.id)).toEqual(expect.arrayContaining(['sets', 'cap', 'block']));
  });

  test('a session the planner cannot set (nothing in it takes sets and reps) keeps the whole plan as it is', async () => {
    const copy = await seedLibraryCopy(NAME);
    const routines = await getRoutinesForPlan(copy.programmeId);
    await conn.runAsync(`UPDATE routine_exercises SET group_kind = 'circuit' WHERE routine_id = ?`, [routines[0].id]);
    const before = await snapshot();
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out).toMatchObject({ status: 'skipped', reason: 'unplannable_session' });
    expect(await snapshot()).toEqual(before);
  });
});

describe('fixedSessionsFromPlan: the plan\'s own structure in the planner\'s shape', () => {
  test('circuit members and untyped-load exercises stay out of the planner\'s list and are counted as stored', async () => {
    const copy = await seedLibraryCopy('Upper / Lower 4×/Week');
    const routines = await getRoutinesForPlan(copy.programmeId);
    const withRows = [];
    for (const routine of routines) withRows.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
    const index = new Map(exercises.map((e) => [e.id, e]));
    const built = fixedSessionsFromPlan(withRows, index);
    expect(built.sessions).toHaveLength(routines.length);
    for (const [i, session] of built.sessions.entries()) {
      expect(session.routineId).toBe(routines[i].id);
      for (const e of session.exercises) {
        expect(typeof e.exerciseId).toBe('string');
        expect(typeof e.muscle).toBe('string');
        expect(typeof e.kind).toBe('string');
        expect(e.credits && typeof e.credits).toBe('object');
      }
    }
  });
});

describe('MANUAL: everything the person built is kept, every count is typed', () => {
  test('nothing changes in the plan; facts version 2 carry every count as typed', async () => {
    const plan = await seedManual();
    const before = await snapshot();
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out).toMatchObject({ status: 'rebuilt', kind: 'manual' });

    const after = await snapshot();
    expect(after.programmes.map((p) => [p.id, p.is_active, p.is_archived, p.name])).toEqual(before.programmes.map((p) => [p.id, p.is_active, p.is_archived, p.name]));
    expect(after.routines).toEqual(before.routines);
    expect(after.routineExercises).toEqual(before.routineExercises);
    expect(after.mesocycles).toEqual(before.mesocycles);
    expect(after.weeks).toEqual(before.weeks);
    const facts = await getProgrammePlanFacts(plan.programmeId);
    expect(facts.version).toBe(2);
    expect(facts.kind).toBe('manual');
    const stored = Object.fromEntries(before.routineExercises.map((r) => [r.id, r.recommended_sets]));
    expect(facts.typed).toEqual(stored); // a fresh person: these are this plan's rows and no other's
  });

  test('served as typed in weeks 1 to 5, above the caps, and at half in the recovery week', async () => {
    const plan = await seedManual({ weekIndex: 1 });
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const week = (n) => conn.getFirstAsync('SELECT id FROM mesocycle_weeks WHERE mesocycle_id = ? AND week_index = ?', [plan.blockId, n]);
    const routines = await getRoutinesForPlan(plan.programmeId);
    for (const weekIndex of [1, 2, 3, 4, 5, 6]) {
      const { id: mesocycleWeekId } = await week(weekIndex);
      for (const routine of routines) {
        const rows = await getRoutineExercisesWithDetails(routine.id);
        const context = await getPlanServeContextForRoutine(routine.id);
        const { allocation, v2 } = await getSessionWeeklyAllocation({
          workout: { mesocycleWeekId, routineId: routine.id }, exercises: rows, planContext: context,
        });
        expect(v2).toBe(true);
        for (const row of rows) {
          const typed = row.routineExercise.recommendedSets;
          const expected = weekIndex === 6 ? Math.max(1, Math.round(typed / 2)) : typed;
          expect(allocation[row.exercise.id]).toBe(expected);
        }
      }
    }
    // The 8-set squat and the 7-set row are above any cap and still served as typed.
    expect(MANUAL_SESSIONS[2].exercises[0][1]).toBeGreaterThan(4);
  });

  test('the block\'s current and later rows are the person\'s own sums: flat in weeks 1 to 5, half in the recovery week', async () => {
    const plan = await seedManual({ weekIndex: 2 });
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const rows = await table(
      `SELECT p.muscle, p.planned_sets, w.week_index FROM planned_muscle_volume p JOIN mesocycle_weeks w ON w.id = p.mesocycle_week_id
        WHERE w.mesocycle_id = ? AND p.muscle IN ('chest', 'back', 'quads') ORDER BY w.week_index`, [plan.blockId],
    );
    const at = (muscle, week) => rows.find((r) => r.muscle === muscle && r.week_index === week).planned_sets;
    // Squat 8 is the only quad exercise; the row 7 and pulldown 3 are the back's; bench 6 is the chest's.
    for (const week of [2, 3, 4, 5]) {
      expect(at('quads', week)).toBe(8);
      expect(at('back', week)).toBe(10);
      expect(at('chest', week)).toBe(6);
    }
    expect(at('quads', 6)).toBe(4);
    expect(at('back', 6)).toBe(Math.round(7 / 2) + Math.round(3 / 2));
    expect(at('chest', 6)).toBe(3);
  });

  test('the note says the counts are the person\'s own and the caps never bind them', async () => {
    await seedManual();
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const note = await getPlanRebuildNote(U);
    expect(note.lines.map((l) => l.id)).toEqual(['kept', 'typed', 'block']);
  });

  test('a manual plan needs no profile at all: it is rebuilt without one', async () => {
    await seedManual();
    expect((await ensureActivePlanRebuilt(U, { profile: null })).status).toBe('rebuilt');
  });
});
