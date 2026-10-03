/**
 * D218 (founder order 2026-10-03: "I need you to check across the board and
 * ensure all exercises are logged and reported correct after the workout
 * ends"; audit docs/audit/exercise-logging-reporting-audit-2026-10-03/
 * 00-FINDINGS.md, F-22 and P37): an imported workout's set rows carry the
 * workout's OWN time, not the moment of the import.
 *
 * Before D218 runImport wrote every set with `created_at = now` (the import
 * time) while the workout row kept its real `started_at`. History, keyed by
 * workout date, was right; every surface keyed by SET time (the volume
 * heatmap windows and strip, the weekly volume trend, the Consistency weight
 * lifted bars, the Home and Consistency block rows, the coaching log, PR
 * timelines ordered by set time) put the whole imported history in the week
 * of the import, in one identical millisecond.
 *
 * The rule pinned here:
 *  - a set's `created_at` is its workout's `started_at` plus the set's
 *    0-based position among the rows actually written for THAT workout, so
 *    the rows keep their order and sit in the workout's own week;
 *  - a set skipped for want of an exercise does not use up a position;
 *  - `updated_at` stays the import time, so the sync push (last-write-wins on
 *    updated_at) still carries the rows;
 *  - nothing here repairs rows imported before this change (ruled: the cloud
 *    holds no imported sets today).
 *
 * Same harness shape as importIsolation.test.js: a stand-in database whose
 * runAsync records each INSERT's parameters.
 */

const IMPORT_TIME = 1_900_000_000_000; // a fixed "now" long after the workouts below

const mockRows = { exercises: [], workouts: [], workout_sets: [] };

/** Column order of the workout_sets INSERT in importExternal.js (13 bound values; `failed` is the literal 0). */
const SET_PARAM = {
  id: 0, userId: 1, workoutId: 2, exerciseId: 3, exerciseName: 4, setNumber: 5,
  setType: 6, reps: 7, weight: 8, rpe: 9, notes: 10, createdAt: 11, updatedAt: 12,
};

function makeDb() {
  return {
    runAsync: async (sql, params = []) => {
      if (/INSERT (OR IGNORE )?INTO exercises/i.test(sql)) {
        mockRows.exercises.push({ id: params[0], name: params[1] });
      } else if (/INSERT INTO workouts/i.test(sql)) {
        mockRows.workouts.push({ id: params[0], user_id: params[1], started_at: params[2] });
      } else if (/INSERT INTO workout_sets/i.test(sql)) {
        expect(params).toHaveLength(13);
        mockRows.workout_sets.push({
          id: params[SET_PARAM.id],
          workout_id: params[SET_PARAM.workoutId],
          exercise_id: params[SET_PARAM.exerciseId],
          exercise_name: params[SET_PARAM.exerciseName],
          set_number: params[SET_PARAM.setNumber],
          created_at: params[SET_PARAM.createdAt],
          updated_at: params[SET_PARAM.updatedAt],
        });
      }
      return {};
    },
    getFirstAsync: async (sql, params = []) => {
      if (/FROM workouts WHERE user_id = \? AND started_at = \?/.test(sql)) {
        return mockRows.workouts.find((w) => w.user_id === params[0] && w.started_at === params[1]) ?? null;
      }
      return null;
    },
    getAllAsync: async () => [],
  };
}

let mockDb;

jest.mock('../database', () => ({
  db: async () => mockDb,
  runInTransaction: async (d, task) => task(),
  _invalidateExercisesCache: () => {},
}));

jest.mock('../uuid', () => {
  let n = 0;
  return { generateUUID: () => `id-${++n}` };
});

const { runImport } = require('../importExternal');

const USER = 'user-1';
// Monday 28 September 2026 07:00 UTC and Thursday 8 October 2026 18:30 UTC: two different Monday weeks.
const MONDAY_WORKOUT = Date.UTC(2026, 8, 28, 7, 0, 0);
const THURSDAY_WORKOUT = Date.UTC(2026, 9, 8, 18, 30, 0);

const set = (exerciseName, reps, weightKg) => ({ exerciseName, reps, weightKg });

function fixture() {
  return {
    parsed: {
      exerciseNames: ['Bench Press', 'Barbell Row'],
      workouts: [
        {
          startedAt: MONDAY_WORKOUT,
          endedAt: MONDAY_WORKOUT + 3600000,
          title: 'Push',
          sets: [set('Bench Press', 8, 100), set('Bench Press', 8, 100), set('Barbell Row', 10, 70)],
        },
        {
          startedAt: THURSDAY_WORKOUT,
          endedAt: THURSDAY_WORKOUT + 3600000,
          title: 'Pull',
          sets: [set('Barbell Row', 10, 72.5), set('Bench Press', 6, 105)],
        },
      ],
    },
    analysis: {
      unmappedNames: [],
      unmappedCount: 0,
      _mappedIndex: new Map([['Bench Press', 'ex-bench'], ['Barbell Row', 'ex-row']]),
    },
  };
}

function setsOfWorkout(startedAt) {
  const wid = mockRows.workouts.find((w) => w.started_at === startedAt).id;
  return mockRows.workout_sets.filter((s) => s.workout_id === wid);
}

beforeEach(() => {
  mockRows.exercises = [];
  mockRows.workouts = [];
  mockRows.workout_sets = [];
  mockDb = makeDb();
  jest.spyOn(Date, 'now').mockReturnValue(IMPORT_TIME);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('D218 (F-22, P37): an imported set carries its workout\'s own time', () => {
  test('created_at is the workout\'s started_at plus the set\'s 0-based position in that workout, in order', async () => {
    const { parsed, analysis } = fixture();
    const result = await runImport(USER, parsed, analysis);
    expect(result).toMatchObject({ workouts: 2, sets: 5, skipped: 0 });

    expect(setsOfWorkout(MONDAY_WORKOUT).map((s) => s.created_at))
      .toEqual([MONDAY_WORKOUT, MONDAY_WORKOUT + 1, MONDAY_WORKOUT + 2]);
    // The position restarts for the next workout: it is per workout, not per import.
    expect(setsOfWorkout(THURSDAY_WORKOUT).map((s) => s.created_at))
      .toEqual([THURSDAY_WORKOUT, THURSDAY_WORKOUT + 1]);
  });

  test('never the import time: every imported set sits years before "now" and in its workout\'s own local week', async () => {
    const { parsed, analysis } = fixture();
    await runImport(USER, parsed, analysis);
    expect(mockRows.workout_sets).toHaveLength(5);
    for (const s of mockRows.workout_sets) {
      expect(s.created_at).not.toBe(IMPORT_TIME);
      expect(s.created_at).toBeLessThan(IMPORT_TIME - 365 * 24 * 60 * 60 * 1000);
    }
    // Same Monday-anchored week as the workout (a one-millisecond offset cannot cross a week).
    const { localWeekStartMs } = require('../dayKey');
    for (const s of setsOfWorkout(MONDAY_WORKOUT)) {
      expect(localWeekStartMs(s.created_at)).toBe(localWeekStartMs(MONDAY_WORKOUT));
    }
    for (const s of setsOfWorkout(THURSDAY_WORKOUT)) {
      expect(localWeekStartMs(s.created_at)).toBe(localWeekStartMs(THURSDAY_WORKOUT));
    }
    expect(localWeekStartMs(MONDAY_WORKOUT)).not.toBe(localWeekStartMs(THURSDAY_WORKOUT));
  });

  test('updated_at stays the import time, so the push carries the rows', async () => {
    const { parsed, analysis } = fixture();
    await runImport(USER, parsed, analysis);
    expect(mockRows.workout_sets.every((s) => s.updated_at === IMPORT_TIME)).toBe(true);
  });

  test('a set skipped for want of an exercise does not use up a position', async () => {
    const { parsed, analysis } = fixture();
    // "Ghost Curl" is in neither the mapped index nor the created customs: runImport skips it.
    parsed.workouts[0].sets = [set('Bench Press', 8, 100), set('Ghost Curl', 12, 20), set('Barbell Row', 10, 70)];
    const result = await runImport(USER, parsed, analysis);
    expect(result.sets).toBe(4); // 2 written for Monday, 2 for Thursday
    expect(setsOfWorkout(MONDAY_WORKOUT).map((s) => s.created_at)).toEqual([MONDAY_WORKOUT, MONDAY_WORKOUT + 1]);
  });

  test('a custom exercise created by the import is stamped the same way', async () => {
    const parsed = {
      exerciseNames: ['Zercher Squat'],
      workouts: [{
        startedAt: MONDAY_WORKOUT,
        endedAt: null,
        title: 'Legs',
        sets: [set('Zercher Squat', 5, 100), set('Zercher Squat', 5, 105)],
      }],
    };
    const analysis = { unmappedNames: ['Zercher Squat'], unmappedCount: 1, _mappedIndex: new Map() };
    await runImport(USER, parsed, analysis);
    expect(mockRows.exercises).toHaveLength(1);
    expect(setsOfWorkout(MONDAY_WORKOUT).map((s) => s.created_at)).toEqual([MONDAY_WORKOUT, MONDAY_WORKOUT + 1]);
  });
});
