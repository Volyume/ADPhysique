/**
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"), against the REAL database.js on an in-memory SQLite. Each case
 * failed before this landing (audit
 * docs/audit/exercise-logging-reporting-audit-2026-10-03/00-FINDINGS.md):
 *
 *  - F-8: the 4-week comparison's prior sessions are totalled on the
 *    summary's basis (per hand x2, distance out), so an identical dumbbell
 *    session is no longer counted at half its total;
 *  - F-9 / ruling S2: Year of Lifts, the monthly recap and the block
 *    reflection count every working set (bodyweight, timed and untyped sets
 *    included) and name a set from its snapshot when its row is gone; their
 *    total lifted is the loaded part on the summary's basis; an assistance
 *    machine is never an estimated-max record; lifetime tonnage is on the
 *    same basis and lifetime reps count bodyweight reps;
 *  - F-12: the weekly record count refuses myo-rep and explosive rows, never
 *    reads more assistance as a record, and counts less assistance at no
 *    fewer reps (detectPR's rule); the best lift of the week refuses
 *    explosive rows and is named from the snapshot;
 *  - F-20 / ruling S3: "Trained N days ago" counts a helper muscle, ignores
 *    explosive sets, and sees sets on a deleted custom exercise or a retired
 *    id;
 *  - F-3: the weekly volume trend credits an unknown id whose snapshot names
 *    a known exercise;
 *  - F-6: a by-exercise read for a retired id returns the survivor's sets;
 *  - F-18: an untyped set is a working set for the picker's recents;
 *  - F-4: the data export names a set from its snapshot.
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
jest.mock('../sync', () => ({ scheduleSync: () => {}, syncAll: () => Promise.resolve() }));
jest.mock('../engineTelemetry', () => ({ track: () => Promise.resolve() }));
jest.mock('../telemetry/firsts', () => ({ trackFirst: () => Promise.resolve() }));

const dbm = require('../database');
const { __raw: raw } = require('../dbCrypto');
const { canonicalExerciseId } = require('../exercise/canonicalId');
const { compareWithPriorSessions } = require('../sessionShareData');

const DAY = 86400000;
const RETIRED = canonicalExerciseId('Lateral Raise Machine');
const SURVIVOR = canonicalExerciseId('Machine Lateral Raise');

function insertExercise(id, name, primary, { secondary = null, type = 'weight_reps', semantics = 'total', deletedAt = null, isCustom = 0 } = {}) {
  raw.prepare(`INSERT INTO exercises (id, name, primary_muscle, secondary_muscles, exercise_type, load_semantics, deleted_at, is_custom, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1)`).run(id, name, primary, secondary, type, semantics, deletedAt, isCustom);
}

let seq = 0;
function insertWorkout(userId, startedAt, { routineId = null, mesocycleId = null } = {}) {
  seq += 1;
  const id = `w-${userId}-${seq}`;
  raw.prepare(`INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, started_at, ended_at, is_completed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`).run(id, userId, routineId, mesocycleId, startedAt, startedAt + 3600e3, startedAt, startedAt);
  return id;
}
function insertSet(userId, workoutId, exerciseId, { weight = 50, reps = 10, setType = 'straight', at, name = null, evidence = null } = {}) {
  seq += 1;
  raw.prepare(`INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, exercise_name, set_number, set_type, actual_reps, weight, evidence_class, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`).run(`s-${seq}`, userId, workoutId, exerciseId, name, setType, reps, weight, evidence, at, at);
}

beforeAll(async () => {
  await dbm.db();
  insertExercise('bench', 'Bench Press', 'chest', { secondary: '["triceps","front_delts"]' });
  insertExercise('db-press', 'Dumbbell Shoulder Press', 'front_delts', { semantics: 'per_hand' });
  insertExercise('assist-pull', 'Assisted Pull-Up', 'back', { semantics: 'assisted' });
  insertExercise('heel-walk', 'Heel Walk', 'tibialis', { type: 'distance' });
  insertExercise('pullup', 'Pull-Up', 'back', { secondary: '["biceps"]' });
  insertExercise('kb-swing', 'Kettlebell Swing', 'glutes', { secondary: '["hamstrings"]' });
  insertExercise('garage', 'Garage Press', 'chest', { isCustom: 1, deletedAt: 1700000000000 });
  insertExercise(SURVIVOR, 'Machine Lateral Raise', 'side_delts');
  dbm._invalidateExercisesCache();
});

describe('F-8: the 4-week comparison reads the summary\'s basis', () => {
  test('an identical earlier dumbbell session is totalled per hand, a distance set adds nothing', async () => {
    const u = 'u-compare';
    const at = Date.now() - 7 * DAY;
    const w = insertWorkout(u, at, { routineId: 'r-1' });
    for (let i = 0; i < 3; i += 1) insertSet(u, w, 'db-press', { weight: 30, reps: 10, at: at + i * 1000 });
    insertSet(u, w, 'heel-walk', { weight: 400, reps: 90, at: at + 5000 });
    const rows = await dbm.getRoutineWorkoutTonnages(u, 'r-1', at - DAY, null);
    expect(rows).toEqual([{ workoutId: w, startedAt: at, tonnage: 1800 }]);
    // The live summary totals the same session at 1800, so it is not "100% more".
    expect(compareWithPriorSessions(rows, 1800).pct).toBe(0);
  });
});

describe('F-9 / S2: the recaps count every working set, total the loaded part on one basis', () => {
  const u = 'u-recap';
  let workoutId;
  beforeAll(() => {
    const at = Date.now() - 3 * DAY;
    raw.prepare(`INSERT INTO mesocycles (id, user_id, name, start_date, end_date, duration_weeks, deload_week, created_at, updated_at)
      VALUES ('meso-1', ?, 'Block', ?, ?, 4, 4, 1, 1)`).run(u, new Date(at - DAY).toISOString().slice(0, 10), new Date(at + 20 * DAY).toISOString().slice(0, 10));
    workoutId = insertWorkout(u, at, { mesocycleId: 'meso-1' });
    insertSet(u, workoutId, 'bench', { weight: 100, reps: 5, at: at + 1 }); // 500
    insertSet(u, workoutId, 'bench', { weight: 60, reps: 10, at: at + 2, setType: 'warmup' }); // not a working set
    insertSet(u, workoutId, 'db-press', { weight: 20, reps: 10, at: at + 3 }); // 400 (per hand)
    insertSet(u, workoutId, 'assist-pull', { weight: 30, reps: 8, at: at + 4 }); // 0, never an estimated max
    insertSet(u, workoutId, 'pullup', { weight: 0, reps: 8, at: at + 5 }); // a set, no load
    insertSet(u, workoutId, 'heel-walk', { weight: 400, reps: 90, at: at + 6 }); // a set, no load
    insertSet(u, workoutId, 'gone-id', { weight: 40, reps: 10, at: at + 7, name: 'Cable Thing' }); // 400, named by snapshot
    insertSet(u, workoutId, 'bench', { weight: 80, reps: 8, at: at + 8, setType: null }); // untyped: 640
  });

  test('Year of Lifts', async () => {
    const y = await dbm.getYearOfLiftsData(u);
    expect(y.totalSets).toBe(7);
    expect(y.tonnage).toBe(500 + 400 + 400 + 640);
    expect(y.uniqueExercises).toBe(6);
    expect(y.topExercises.map((e) => e.name)).toEqual(expect.arrayContaining(['Bench Press']));
    const prNames = y.topPRs.map((p) => p.exerciseName);
    expect(prNames).not.toContain('Assisted Pull-Up');
    expect(prNames).not.toContain('Heel Walk');
    expect(prNames).toContain('Cable Thing');
    expect(prNames).not.toContain('Unknown');
  });

  test('the monthly recap', async () => {
    const r = await dbm.getRecapData(u, { startMs: Date.now() - 30 * DAY, endMs: Date.now() + DAY });
    expect(r.totalSets).toBe(7);
    expect(r.tonnage).toBe(1940);
    expect(r.bestSession.tonnage).toBe(1940);
    expect(r.topPRs.map((p) => p.exerciseName)).not.toContain('Assisted Pull-Up');
  });

  test('the block reflection', async () => {
    const b = await dbm.getBlockReflectionData(u, 'meso-1');
    expect(b.totalSets).toBe(7);
    expect(b.tonnage).toBe(1940);
    expect(b.topExercise).toBe('Bench Press');
    expect(b.prs.map((p) => p.exerciseName)).not.toContain('Assisted Pull-Up');
  });

  test('lifetime tonnage is on the same basis; lifetime reps count bodyweight reps', async () => {
    expect(await dbm.getLifetimeTonnage(u)).toBe(1940);
    const stats = await dbm.getLifetimeWorkoutStats(u);
    // 5 + 10 + 8 (assisted reps are reps) + 8 (pull-ups at bodyweight) + 10 + 8; the heel walk's seconds are not reps.
    expect(stats.reps).toBe(49);
  });

  test('the data export names a set from its snapshot when the exercise row is gone', async () => {
    const { csv } = await dbm.buildWorkoutCSV(u);
    expect(csv).toContain('Cable Thing');
  });
});

describe('F-12: the weekly record count and the best lift of the week', () => {
  const u = 'u-pr';
  const weekStart = Date.now() - 2 * DAY;
  beforeAll(() => {
    const before = weekStart - 10 * DAY;
    const old = insertWorkout(u, before);
    insertSet(u, old, 'bench', { weight: 100, reps: 5, at: before + 1 });
    insertSet(u, old, 'assist-pull', { weight: 30, reps: 8, at: before + 2 });
    insertSet(u, old, 'kb-swing', { weight: 24, reps: 15, at: before + 3, evidence: 'ballistic' });
    const now = insertWorkout(u, weekStart + DAY);
    // A myo-reps row would beat the bench best by its summed reps; an explosive swing at a new weight; more assistance.
    insertSet(u, now, 'bench', { weight: 80, reps: 30, at: weekStart + DAY + 1, setType: 'myo_reps' });
    insertSet(u, now, 'kb-swing', { weight: 40, reps: 20, at: weekStart + DAY + 2, evidence: 'ballistic' });
    insertSet(u, now, 'assist-pull', { weight: 40, reps: 8, at: weekStart + DAY + 3 });
  });

  test('none of those is a record', async () => {
    expect(await dbm.getPRCountInWindow(u, weekStart, Date.now() + DAY)).toBe(0);
  });

  test('less assistance at no fewer reps is one record', async () => {
    const w = insertWorkout(u, weekStart + DAY + 60e3);
    insertSet(u, w, 'assist-pull', { weight: 20, reps: 8, at: weekStart + DAY + 70e3 });
    expect(await dbm.getPRCountInWindow(u, weekStart, Date.now() + DAY)).toBe(1);
  });

  test('the best lift of the week is never an explosive, cluster or assisted row, and is named', async () => {
    const best = await dbm.getBestLiftThisWeek(u, weekStart);
    expect(best).toBeNull();
    const w = insertWorkout(u, weekStart + DAY + 120e3);
    insertSet(u, w, 'gone-id-2', { weight: 70, reps: 5, at: weekStart + DAY + 130e3, name: 'Snapshot Row' });
    const named = await dbm.getBestLiftThisWeek(u, weekStart);
    expect(named.exerciseName).toBe('Snapshot Row');
  });
});

describe('F-20 / S3: one recency rule', () => {
  test('helper credit counts, explosive sets do not, a deleted custom exercise and a retired id do', async () => {
    const u = 'u-recency';
    const yesterday = Date.now() - DAY;
    const w = insertWorkout(u, yesterday);
    insertSet(u, w, 'bench', { at: yesterday + 1 });
    insertSet(u, w, 'kb-swing', { at: yesterday + 2, evidence: 'ballistic' });
    insertSet(u, w, 'garage', { at: yesterday + 3 });
    insertSet(u, w, RETIRED, { at: yesterday + 4 });
    const recency = await dbm.getLastTrainedPerMuscle(u);
    expect(recency.chest).toBe(yesterday);
    expect(recency.front_delts).toBe(yesterday); // a helper of the bench press
    expect(recency.side_delts).toBe(yesterday); // the retired id's survivor
    expect(recency.glutes).toBeUndefined(); // explosive swing only
  });

  test('a session begun before midnight with every set after it: the heatmap and the Recovery list read one instant', async () => {
    // Adversarial review of D218, item 7: the heatmap's lastTrained read each
    // set's own time and the Recovery list the session's start, so on the
    // Wednesday after a Monday 23:40 start the heatmap said one day fewer.
    const { buildDataset } = require('../volumeLogged');
    const u = 'u-midnight';
    const start = Date.now() - 2 * DAY - 20 * 60 * 1000;
    const w = insertWorkout(u, start);
    insertSet(u, w, 'bench', { at: start + 30 * 60 * 1000 });
    insertSet(u, w, 'bench', { at: start + 40 * 60 * 1000 });
    const rows = await dbm.getCompletedWorkoutSets(u);
    expect(rows.every((r) => r.workoutStartedAt === start)).toBe(true);
    const heatmap = buildDataset(rows, await dbm.getExerciseLookup(), Date.now());
    const recovery = await dbm.getLastTrainedPerMuscle(u);
    expect(heatmap.lastTrained.chest).toBe(start);
    expect(heatmap.lastTrained.chest).toBe(recovery.chest);
    expect(heatmap.lastTrained.triceps).toBe(recovery.triceps); // helper credit, same instant
    // The week windows still read each set's own time.
    expect(heatmap.earliestSetMs).toBe(start + 30 * 60 * 1000);
  });
});

describe('F-3: the weekly volume trend resolves like the heatmap rows', () => {
  test('an unknown id whose snapshot names a known exercise is credited', async () => {
    const u = 'u-trend';
    const at = Date.now() - DAY;
    const w = insertWorkout(u, at);
    insertSet(u, w, 'another-device-id', { at, name: 'Bench Press' });
    const weeks = await dbm.getWeeklyVolumeByMuscle(u, 1);
    expect(weeks[0].volumeByMuscle.chest).toBe(1);
  });
});

describe('F-6: a by-exercise read for a retired id returns its survivor\'s sets', () => {
  test('completed history', async () => {
    const u = 'u-byid';
    const at = Date.now() - 2 * DAY;
    const w = insertWorkout(u, at);
    insertSet(u, w, SURVIVOR, { at });
    const rows = await dbm.getCompletedSetHistoryForExercise(RETIRED, u);
    expect(rows).toHaveLength(1);
    expect(await dbm.getAllCompletedSetsForExercise(RETIRED, 'none')).toEqual(expect.arrayContaining([expect.objectContaining({ exerciseId: SURVIVOR })]));
  });
});

describe('F-18: an untyped set is a working set everywhere', () => {
  test('the picker\'s recents include an exercise logged only with untyped sets', async () => {
    const u = 'u-untyped';
    const at = Date.now() - DAY;
    const w = insertWorkout(u, at);
    insertSet(u, w, 'pullup', { at, setType: null });
    expect(await dbm.getRecentlyUsedExerciseIds(u)).toContain('pullup');
  });

  test('no SQL predicate drops an untyped set', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
    // Review of D218, NIT 9: any alias or none, `!=` or `<>`, and NOT IN, so
    // a predicate written another way cannot slip past; comments are not SQL.
    const dropsUntyped = /\b(?:\w+\.)?set_type\s*(?:!=|<>)\s*'warmup'|\b(?:\w+\.)?set_type\s+NOT\s+IN\s*\(/i;
    const nullSafe = /\b(?:\w+\.)?set_type\s+IS\s+NULL\s+OR\s+(?:\w+\.)?set_type\s*(?:!=|<>)\s*'warmup'/i;
    const bare = src.split('\n')
      .filter((l) => !/^\s*(\/\/|\*)/.test(l))
      .filter((l) => dropsUntyped.test(l) && !nullSafe.test(l));
    expect(bare).toEqual([]);
    // The guard itself catches the shapes it names.
    expect(['  AND set_type <> \'warmup\'', '  AND set_type != \'warmup\'', '  AND x.set_type NOT IN (\'warmup\')']
      .every((l) => dropsUntyped.test(l) && !nullSafe.test(l))).toBe(true);
  });
});
