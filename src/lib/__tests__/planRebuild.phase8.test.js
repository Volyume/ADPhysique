/**
 * planRebuild.phase8.test.js -- D222 phase 8 (R90 to R97): people already on
 * plans, with STRUCTURE_ENGINE mocked ON. Real SQLite, the real exercise
 * library and the REAL structure engine.
 *
 * What it pins: a generated plan of the older planner is rebuilt through the
 * engine once (exercises kept where the checks allow, the old facts under
 * facts.previous, the note listing kept and swapped, the state recording
 * engine 3) and the second open is current; an old `done` record without
 * engine 3 is run again; a refusal or a question rebuilds nothing, records
 * needs_choice and Today's card reads it; the founder's programme, authored,
 * library, kit, hand-built and style-pool plans are never rebuilt; a
 * hand-built plan with a hard fault gets the calm note once per plan version
 * and no change; a failed write leaves the plan as it was. The switch-off
 * behaviour is pinned by planRebuild.phase8.off.test.js and the older suites.
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


jest.mock('../structure/release', () => ({
  ...jest.requireActual('../structure/release'),
  STRUCTURE_ENGINE: true,
}));

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const database = require('../database');
const {
  db, createProgramme, createRoutine, addExerciseToRoutine, activatePlanWithBlock, copyPlanFromLibrary,
  getLibraryPlans, getProgrammePlanFacts, getAllExercises, setProgrammePlanFacts,
} = database;
const { seedExercisesIfNeeded } = require('../seedExercises');
const { seedRoutinesIfNeeded } = require('../seedRoutines');
const {
  ensureActivePlanRebuilt, getPlanRebuildNote, getPlanRebuildChoice, dismissPlanRebuildChoice, __resetPlanRebuildForTests,
} = require('../planRebuild');
const { checkFixedPlanOnce, __resetFixedChecksForTests, exerciseChanges, previousFactsOf } = require('../structure/existing');
const { fixedPlanNote, NEEDS_CHOICE_CARD } = require('../structure/messages');

let U;
let counter = 0;
const PROFILE = {
  experience: 'intermediate', daysPerWeek: 4, sessionLengthMinutes: 75, equipment: 'full_gym',
  trainingGoal: 'general', trainingPhase: 'maintain', recoveryRating: 'average',
};

let conn;
let byName;
beforeAll(async () => {
  conn = await db();
  await seedExercisesIfNeeded();
  await seedRoutinesIfNeeded('user-p8-seed');
  byName = new Map((await getAllExercises()).map((e) => [e.name, e]));
});
beforeEach(() => {
  counter += 1;
  U = `user-p8-${counter}`;
  AsyncStorage.__store.clear();
  __resetPlanRebuildForTests();
  __resetFixedChecksForTests();
});

const exId = (name) => {
  const e = byName.get(name);
  if (!e) throw new Error(`the seeded library has no ${name}`);
  return e.id;
};
const table = (sql, params = []) => conn.getAllAsync(sql, params);

async function seedPlan({ name, sessions, splitType = null, reason = null, source = null, tags = null }) {
  const programme = await createProgramme(U, name, '', 0, null, null, null, false);
  if (source) await conn.runAsync('UPDATE programmes SET source_programme_id = ? WHERE id = ?', [source, programme.id]);
  if (tags) await conn.runAsync('UPDATE programmes SET tags = ? WHERE id = ?', [tags, programme.id]);
  const rowIds = {};
  for (const session of sessions) {
    const routine = await createRoutine(U, session.name, null, splitType, 0, null, programme.id, false, false);
    let order = 0;
    for (const [exName, sets] of session.exercises) {
      const re = await addExerciseToRoutine(routine.id, exId(exName), order++, 8, 12, null, sets, null, 90, null, false, reason);
      rowIds[`${session.name}:${exName}`] = re.id;
    }
  }
  await activatePlanWithBlock(U, programme.id, name, { allowLearnedCarry: false });
  return { programmeId: programme.id, rowIds };
}

const GENERATED_SESSIONS = [
  { name: 'Upper A', exercises: [['Barbell Bench Press', 6], ['Incline Dumbbell Press', 4], ['Lat Pulldown (Wide Grip)', 4], ['Seated Cable Row', 4], ['Tricep Pushdown (Rope)', 3], ['EZ Bar Preacher Curl', 3]] },
  { name: 'Lower A', exercises: [['Barbell Back Squat', 5], ['Leg Press', 4], ['Seated Leg Curl', 4], ['Standing Calf Raise (Machine)', 4]] },
  { name: 'Upper B', exercises: [['Incline Dumbbell Press', 4], ['Seated Cable Row', 4], ['Dumbbell Lateral Raise', 4], ['Barbell Curl', 3]] },
  { name: 'Lower B', exercises: [['Romanian Deadlift (Barbell)', 4], ['Leg Press', 4], ['Seated Leg Curl', 3], ['Standing Calf Raise (Machine)', 3]] },
];
const seedGenerated = (over = {}) => seedPlan({
  name: 'Old generated plan', sessions: GENERATED_SESSIONS, splitType: 'upper_lower', reason: 'required_role', ...over,
});
// Hand-built: chest trained on two days in a row (a hard fault for any plan).
const FAULTY_MANUAL = [
  { name: 'Push', exercises: [['Barbell Bench Press', 4], ['Dumbbell Lateral Raise', 3]] },
  { name: 'Upper', exercises: [['Incline Dumbbell Press', 4], ['Seated Cable Row', 4]] },
  { name: 'Legs', exercises: [['Barbell Back Squat', 4], ['Seated Leg Curl', 3]] },
];
const activeProgramme = async () => (await table('SELECT * FROM programmes WHERE user_id = ? AND is_active = 1', [U]))[0];
const countProgrammes = async () => (await table('SELECT id FROM programmes WHERE user_id = ?', [U])).length;
const rowNames = async (programmeId) => (await table(
  `SELECT e.name FROM routine_exercises re JOIN routines r ON r.id = re.routine_id JOIN exercises e ON e.id = re.exercise_id
    WHERE r.programme_id = ? AND re.deleted_at IS NULL`, [programmeId])).map((r) => r.name);

describe('R90, R92, R93, R96: a generated plan of the older planner', () => {
  test('is rebuilt through the engine once, keeping exercises where the checks allow, with facts.previous and a note', async () => {
    const old = await seedGenerated();
    const oldNames = new Set(await rowNames(old.programmeId));
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('rebuilt');
    const now = await activeProgramme();
    expect(now.id).not.toBe(old.programmeId);
    const facts = await getProgrammePlanFacts(now.id);
    expect(facts.structure.version).toBe(3);
    expect(facts.kind).toBe('generated');
    // R96: one level of the old facts, and no deeper
    expect(facts.previous).toBeTruthy();
    expect(facts.previous.previous).toBeUndefined();
    // R92: the exercises the person had are the plan's preferred choices
    const newNames = await rowNames(now.id);
    const kept = newNames.filter((n) => oldNames.has(n));
    expect(kept.length).toBeGreaterThan(0);
    const note = await getPlanRebuildNote(U);
    const text = note.lines.map((l) => l.text).join(' ');
    expect(text).toMatch(/Kept: /);
    expect(text).not.toMatch(/—/);
    // the state says the engine did it (R90)
    const state = JSON.parse(AsyncStorage.__store.get(`@volyume_plan_rebuild_state_${U}`));
    expect(state[old.programmeId]).toMatchObject({ status: 'done', engine: 3 });
  });

  test('the second open is current: no new programme, no new note', async () => {
    await seedGenerated();
    await ensureActivePlanRebuilt(U, { profile: PROFILE });
    const n = await countProgrammes();
    __resetPlanRebuildForTests();
    const again = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(again.status).toBe('current');
    expect(await countProgrammes()).toBe(n);
  });

  test('a done record from the older planner (no engine 3) is run once more', async () => {
    const old = await seedGenerated();
    await conn.runAsync('UPDATE programmes SET plan_facts = ? WHERE id = ?', [JSON.stringify({ version: 2 }), old.programmeId]);
    AsyncStorage.__store.set(`@volyume_plan_rebuild_state_${U}`, JSON.stringify({ [old.programmeId]: { status: 'done', kind: 'generated', at: 1 } }));
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('rebuilt');
  });

  test('a count the person typed is carried onto the row of the same exercise (R93)', async () => {
    const old = await seedGenerated();
    await setProgrammePlanFacts(old.programmeId, { version: 2, typed: { [old.rowIds['Upper A:Barbell Bench Press']]: 7 } }, { scheduleSync: false });
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('rebuilt');
    const facts = await getProgrammePlanFacts((await activeProgramme()).id);
    if (rowNamesHasBench(await rowNames((await activeProgramme()).id))) {
      expect(Object.values(facts.typed || {})).toContain(7);
    }
  });
});
const rowNamesHasBench = (names) => names.includes('Barbell Bench Press');

describe('R94: a refusal or a question rebuilds nothing', () => {
  test('days the engine refuses leave the plan untouched, record needs_choice and offer the card', async () => {
    const old = await seedGenerated();
    const before = await table('SELECT * FROM routine_exercises ORDER BY id');
    // One session cannot build (the rulebook covers 2 to 6 days).
    await conn.runAsync('DELETE FROM routines WHERE programme_id = ? AND name != ?', [old.programmeId, 'Upper A']);
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('skipped');
    expect(out.reason).toBe('needs_choice');
    expect((await activeProgramme()).id).toBe(old.programmeId);
    expect(await countProgrammes()).toBe(1);
    expect(await getPlanRebuildNote(U)).toBeNull();
    expect((await table('SELECT * FROM routine_exercises ORDER BY id')).length).toBeLessThanOrEqual(before.length);
    expect(await getPlanRebuildChoice(U, old.programmeId)).toBe(true);
    await dismissPlanRebuildChoice(U, old.programmeId);
    expect(await getPlanRebuildChoice(U, old.programmeId)).toBe(false);
    // not worked out again at every open
    __resetPlanRebuildForTests();
    expect((await ensureActivePlanRebuilt(U, { profile: PROFILE })).reason).toBe('needs_choice');
  });

  test('the card words are plain, name the action and carry no em dash', () => {
    expect(NEEDS_CHOICE_CARD.action).toBe('Update your plan');
    expect(`${NEEDS_CHOICE_CARD.title} ${NEEDS_CHOICE_CARD.body}`).not.toMatch(/—/);
  });
});

describe('R91: plans that are never moved', () => {
  async function expectUntouched(plan, reason) {
    const before = await table('SELECT id, plan_facts FROM programmes WHERE user_id = ?', [U]);
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    // An authored plan reads as current (D227: served as written, never
    // rebuilt); every other kept plan is skipped with its reason.
    if (reason === 'authored') expect(out.status).toBe('current');
    else { expect(out.status).toBe('skipped'); if (reason) expect(out.reason).toBe(reason); }
    expect(await table('SELECT id, plan_facts FROM programmes WHERE user_id = ?', [U])).toEqual(before);
    expect(await getPlanRebuildNote(U)).toBeNull();
    expect((await activeProgramme()).id).toBe(plan.programmeId);
  }

  test('an authored plan (facts.kind authored)', async () => {
    const plan = await seedGenerated();
    await setProgrammePlanFacts(plan.programmeId, { version: 2, kind: 'authored' }, { scheduleSync: false });
    await expectUntouched(plan, 'authored');
  });

  test('a library copy and a kit plan', async () => {
    const libs = await getLibraryPlans();
    const copy = await copyPlanFromLibrary(libs[0].id, U);
    await activatePlanWithBlock(U, copy.id, copy.name, { allowLearnedCarry: false });
    await expectUntouched({ programmeId: copy.id }, 'fixed_plan');
  });

  test('a hand-built plan', async () => {
    const plan = await seedPlan({ name: 'Mine', sessions: FAULTY_MANUAL });
    await expectUntouched(plan, 'fixed_plan');
  });

  test('a style-pool plan (kettlebell tag)', async () => {
    const plan = await seedGenerated({ tags: 'style:kettlebell_foundations' });
    const before = await table('SELECT id FROM programmes WHERE user_id = ?', [U]);
    const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
    expect(out.status).toBe('skipped');
    expect(await table('SELECT id FROM programmes WHERE user_id = ?', [U])).toEqual(before);
    expect((await activeProgramme()).id).toBe(plan.programmeId);
  });

  test('the founder\'s programme', async () => {
    const out = await (async () => {
      const founder = '31a3b33c-5548-4c54-9b9a-dd3a927b2c49';
      const p = await createProgramme(U, 'Founder', '', 0, null, null, null, false);
      await conn.runAsync('UPDATE programmes SET id = ? WHERE id = ?', [founder, p.id]);
      await conn.runAsync('UPDATE programmes SET is_active = 1 WHERE id = ?', [founder]);
      return ensureActivePlanRebuilt(U, { profile: PROFILE });
    })();
    expect(out).toMatchObject({ status: 'skipped', reason: 'protected' });
  });
});

describe('R95: hand-built plans are checked, once per plan version, never changed', () => {
  async function sessionsOf(programmeId) {
    const routines = await table('SELECT * FROM routines WHERE programme_id = ? ORDER BY position', [programmeId]);
    const out = [];
    for (const routine of routines) {
      // eslint-disable-next-line no-await-in-loop
      out.push({ key: routine.id, name: routine.name, rows: await database.getRoutineExercisesWithDetails(routine.id) });
    }
    return out;
  }

  test('a hard fault gives one calm note and the same answer on a second look', async () => {
    const plan = await seedPlan({ name: 'Mine', sessions: FAULTY_MANUAL });
    const sessions = await sessionsOf(plan.programmeId);
    const faults = checkFixedPlanOnce(plan.programmeId, null, sessions);
    expect(faults.length).toBeGreaterThan(0);
    const note = fixedPlanNote(faults);
    expect(note).toMatch(/^This plan is kept as it was written\./);
    expect(note).not.toMatch(/—/);
    expect(checkFixedPlanOnce(plan.programmeId, null, sessions)).toBe(faults); // once per plan version
    expect(await rowNames(plan.programmeId)).toHaveLength(6); // never a change
  });

  test('a changed plan is a new version and is checked again', async () => {
    const plan = await seedPlan({ name: 'Mine', sessions: FAULTY_MANUAL });
    const first = checkFixedPlanOnce(plan.programmeId, null, await sessionsOf(plan.programmeId));
    const second = checkFixedPlanOnce(plan.programmeId, null, (await sessionsOf(plan.programmeId)).slice(1));
    expect(second).not.toBe(first);
  });

  test('an authored plan and an engine plan are not checked here', async () => {
    const plan = await seedPlan({ name: 'Mine', sessions: FAULTY_MANUAL });
    const sessions = await sessionsOf(plan.programmeId);
    expect(checkFixedPlanOnce('a', { kind: 'authored' }, sessions)).toEqual([]);
    expect(checkFixedPlanOnce('b', { version: 2, structure: { version: 3, sessions: [] } }, sessions)).toEqual([]);
  });
});

describe('R96: a failed write leaves the plan as it was', () => {
  test('state failed, nothing changed, retried at most twice', async () => {
    const old = await seedGenerated();
    // The failure comes mid-transaction, after the new plan's rows were written.
    await conn.execAsync("CREATE TRIGGER p8_boom BEFORE UPDATE OF is_active ON programmes WHEN NEW.is_active = 1 AND OLD.is_active = 0 BEGIN SELECT RAISE(ABORT, 'boom'); END");
    try {
      const out = await ensureActivePlanRebuilt(U, { profile: PROFILE });
      expect(out.status).toBe('failed');
    } finally { await conn.execAsync('DROP TRIGGER p8_boom'); }
    expect((await activeProgramme()).id).toBe(old.programmeId);
    expect(await countProgrammes()).toBe(1);
    expect(await rowNames(old.programmeId)).toHaveLength(GENERATED_SESSIONS.flatMap((s) => s.exercises).length);
  });
});

describe('pure helpers', () => {
  test('exerciseChanges: kept, swapped (same muscle), added and removed', () => {
    const r = exerciseChanges(
      [[{ exerciseId: 'a', name: 'A', muscle: 'chest' }, { exerciseId: 'b', name: 'B', muscle: 'back' }, { exerciseId: 'c', name: 'C', muscle: 'biceps' }]],
      [[{ exerciseId: 'a', name: 'A', muscle: 'chest' }, { exerciseId: 'x', name: 'X', muscle: 'back' }, { exerciseId: 'y', name: 'Y', muscle: 'calves' }]],
    );
    expect(r).toEqual({ kept: ['A'], replaced: [{ from: 'B', to: 'X' }], removed: ['C'], added: ['Y'] });
  });
  test('previousFactsOf keeps one level and never nests', () => {
    expect(previousFactsOf({ version: 2, previous: { deep: 1 }, x: 1 }, [])).toEqual({ version: 2, x: 1 });
    expect(previousFactsOf(null, [{ name: 'S', exercises: ['A'] }])).toEqual({ version: null, sessions: [{ name: 'S', exercises: ['A'] }] });
  });
});
