/**
 * What this suite pins (blueprint section 5.5; SD-04, SD-06):
 *
 *  - every builder emits EXACTLY the keys its kind allows and nothing
 *    else, so a personal column added to the app in a year's time
 *    cannot ride along in a post;
 *  - a caller cannot smuggle an extra field in through a builder;
 *  - a payload carrying a forbidden key is refused by
 *    `validatePostPayload`, which is the check that runs before the
 *    write leaves the device;
 *  - the session payload built from REAL logged rows carries no
 *    bodyweight, no food, no coaching output: only what the share card
 *    already shows.
 *
 * The session and block builders run against the REAL database module on
 * in-memory SQLite.
 */

jest.mock('../../dbCrypto', () => {
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
jest.mock('../../sync', () => ({ scheduleSync: () => {} }));

const { db, _invalidateExercisesCache } = require('../../database');
const { canonicalExerciseId } = require('../../exercise/canonicalId');
const {
  buildPrPayload, buildMilestonePayload,
  buildSessionPayload, buildBlockPayload,
} = require('../posts');
const { POST_PAYLOAD_KEYS, validatePostPayload, SENSITIVE_COMMUNITY_KEYS } = require('../validation');

const U = 'poster-1';
const SQUAT = canonicalExerciseId('Barbell Back Squat');

function keysOf(payload) {
  return Object.keys(payload).sort();
}

function allowed(kind) {
  return [...POST_PAYLOAD_KEYS[kind]].sort();
}

describe('pure builders', () => {
  test('a PR payload carries exactly the PR keys', () => {
    const p = buildPrPayload({
      exerciseName: 'Deadlift', weight: 180, reps: 3, units: 'kg', previousBest: 175, date: 12345,
    });
    expect(keysOf(p)).toEqual(allowed('pr'));
    expect(validatePostPayload('pr', p).ok).toBe(true);
    expect(p.units).toBe('kg');
  });

  test('an unknown unit falls back to kg rather than travelling as typed', () => {
    expect(buildPrPayload({ exerciseName: 'x', weight: 1, reps: 1, units: 'stone' }).units).toBe('kg');
  });

  test('a caller cannot smuggle an extra field through a builder', () => {
    const p = buildPrPayload({
      exerciseName: 'Deadlift', weight: 180, reps: 3, units: 'kg',
      bodyweight: 82, startingWeight: 100, rpe: 9,
    });
    expect(keysOf(p)).toEqual(allowed('pr'));
    expect(validatePostPayload('pr', p).ok).toBe(true);
  });

  test('a milestone payload carries exactly the milestone keys and caps its stats', () => {
    const p = buildMilestonePayload({
      eyebrow: 'Ten weeks', title: 'Consistent', heroValue: '30', heroUnit: 'sessions',
      caption: 'Good run.', stats: [{ label: 'a', value: '1' }, { label: 'b', value: '2' },
        { label: 'c', value: '3' }, { label: 'd', value: '4' }],
      bodyweight: 82,
    });
    expect(keysOf(p)).toEqual(allowed('milestone'));
    expect(p.stats).toHaveLength(3);
    expect(validatePostPayload('milestone', p).ok).toBe(true);
  });

  // The "programme" story kind (and buildProgrammePayload with it) is
  // retired: Community never shares published programmes
  // (communities revamp 2026-09-10). `POST_PAYLOAD_KEYS`/`POST_KINDS`
  // carry no `programme` entry any more -- see the guard below.
  test('there is no programme kind any more', () => {
    expect(POST_PAYLOAD_KEYS.programme).toBeUndefined();
    expect(Object.keys(POST_PAYLOAD_KEYS)).not.toContain('programme');
    expect(validatePostPayload('programme', { id: 'x' }).ok).toBe(false);
  });
});

describe('validatePostPayload refuses what the builders never produce', () => {
  test('a hand-built payload with a personal key is refused', () => {
    for (const key of ['bodyweight', 'kcal', 'startingWeight', 'ed_pattern', 'firstName']) {
      expect(SENSITIVE_COMMUNITY_KEYS).toContain(key);
      const out = validatePostPayload('pr', { exerciseName: 'x', [key]: 1 });
      expect(out.ok).toBe(false);
    }
  });
});

describe('builders over real rows', () => {
  let conn;
  const WORKOUT = 'w-1';
  const MESO = 'meso-1';

  beforeAll(async () => {
    conn = await db();
    const now = Date.now();
    await conn.runAsync(
      `INSERT INTO exercises (id, name, primary_muscle, equipment, equipment_category,
        compound_isolation, exercise_type, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [SQUAT, 'Barbell Back Squat', 'quads', 'barbell', 'barbell', 'compound', 'weight_reps', now, now],
    );
    _invalidateExercisesCache();

    await conn.runAsync(
      'INSERT INTO programmes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ['plan-1', U, 'Strength Block', now, now],
    );
    await conn.runAsync(
      `INSERT INTO routines (id, user_id, name, programme_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['rt-1', U, 'Lower A', 'plan-1', now, now],
    );
    await conn.runAsync(
      `INSERT INTO mesocycles (id, user_id, name, start_date, end_date, duration_weeks,
        planned_weeks, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [MESO, U, 'Strength Block', '2026-07-01', '2026-08-12', 6, 6, 0, now, now],
    );
    await conn.runAsync(
      `INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, started_at, duration_minutes,
        is_completed, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
      [WORKOUT, U, 'rt-1', MESO, now, 62, 'Lower A', now, now],
    );
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await conn.runAsync(
        `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, exercise_name, set_number,
          set_type, actual_reps, weight, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'straight', 5, 120, ?, ?)`,
        [`s-${i}`, U, WORKOUT, SQUAT, 'Barbell Back Squat', i + 1, now, now],
      );
    }
  });

  test('the session payload carries exactly the session keys, from real rows', async () => {
    const p = await buildSessionPayload(WORKOUT, { userId: U, units: 'kg' });
    expect(keysOf(p)).toEqual(allowed('session'));
    expect(validatePostPayload('session', p).ok).toBe(true);
    expect(p.sessionName).toBe('Lower A');
    expect(p.planName).toBe('Strength Block');
    expect(p.workingSets).toBe(4);
    expect(p.tonnage).toBe(2400);
    expect(p.exerciseCount).toBe(1);
    expect(p.exercises).toEqual(['Barbell Back Squat']);
    expect(p.units).toBe('kg');
    expect(['solid', 'tough', 'epic']).toContain(p.intensityTier);
  });

  test('no personal key appears anywhere in a session payload', async () => {
    const json = JSON.stringify(await buildSessionPayload(WORKOUT, { userId: U, units: 'kg' }));
    for (const key of SENSITIVE_COMMUNITY_KEYS) expect(json).not.toContain(`"${key}"`);
  });

  test('a missing workout yields null rather than an empty post', async () => {
    expect(await buildSessionPayload('nope', { userId: U, units: 'kg' })).toBeNull();
  });

  test('the block payload carries exactly the block keys', async () => {
    const p = await buildBlockPayload(MESO, { userId: U, units: 'kg' });
    expect(keysOf(p)).toEqual(allowed('block'));
    expect(validatePostPayload('block', p).ok).toBe(true);
    expect(p.planName).toBe('Strength Block');
    expect(p.weeks).toBe(6);
    expect(p.sessions).toBe(1);
    // No prior best exists, so there is no honest delta to show.
    expect(p.lifts).toEqual([]);
  });

  test('a block the user does not own yields null', async () => {
    expect(await buildBlockPayload('nope', { userId: U, units: 'kg' })).toBeNull();
    expect(await buildBlockPayload(MESO, { userId: null })).toBeNull();
  });
});

// D218 (founder order 2026-10-03, audit F-11): the session post's record
// count is the workout summary's own count. Before this, an absent count read
// as 0 (Number(null) is 0), so a post never carried the session's records,
// and the counter it skipped would have counted one per SET, a first-ever
// set included. Now: one per lift, a lift's first-ever set never a record.
describe('D218: the session post counts records by the summary\'s rule', () => {
  let conn;
  const PRIOR = 'w-d218-prior';
  const NOW_W = 'w-d218-now';
  const FIRST = 'w-d218-first';
  const U2 = 'poster-d218';
  const BENCH = canonicalExerciseId('Barbell Bench Press');

  beforeAll(async () => {
    conn = await db();
    const t0 = Date.now() - 7 * 86400000;
    await conn.runAsync(
      `INSERT OR IGNORE INTO exercises (id, name, primary_muscle, equipment, compound_isolation, exercise_type, created_at, updated_at)
       VALUES (?, 'Barbell Bench Press', 'chest', 'barbell', 'compound', 'weight_reps', 1, 1)`,
      [BENCH],
    );
    _invalidateExercisesCache();
    const insertWorkout = (id, at) => conn.runAsync(
      `INSERT INTO workouts (id, user_id, started_at, duration_minutes, is_completed, name, created_at, updated_at)
       VALUES (?, ?, ?, 50, 1, 'Push', ?, ?)`,
      [id, U2, at, at, at],
    );
    const insertSet = (id, workoutId, exerciseId, weight, at) => conn.runAsync(
      `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, set_type, actual_reps, weight, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, 'straight', 5, ?, ?, ?)`,
      [id, U2, workoutId, exerciseId, weight, at, at],
    );
    await insertWorkout(PRIOR, t0);
    await insertSet('d218-p1', PRIOR, SQUAT, 100, t0 + 1000);
    const t1 = t0 + 3 * 86400000;
    await insertWorkout(NOW_W, t1);
    // Four squat sets that each beat the prior 100 kg: one lift, one record.
    for (let i = 0; i < 4; i += 1) await insertSet(`d218-n${i}`, NOW_W, SQUAT, 110 + i * 5, t1 + 1000 * (i + 1));
    const t2 = t1 + 86400000;
    await insertWorkout(FIRST, t2);
    // A first-ever bench session at one weight: a starting point, never a record.
    for (let i = 0; i < 3; i += 1) await insertSet(`d218-f${i}`, FIRST, BENCH, 60, t2 + 1000 * (i + 1));
  });

  test('four sets beating the prior best on one lift post one record', async () => {
    const p = await buildSessionPayload(NOW_W, { userId: U2, units: 'kg' });
    expect(p.prCount).toBe(1);
  });

  test('a first-ever session on a lift at one weight posts no record', async () => {
    const p = await buildSessionPayload(FIRST, { userId: U2, units: 'kg' });
    expect(p.prCount).toBe(0);
  });

  test('a heavier set later in a first session is one record, as the summary counts it (founder ruling 2026-08-23)', async () => {
    const t3 = Date.now() - 86400000;
    const RAMP = 'w-d218-ramp';
    const DEADLIFT = canonicalExerciseId('Conventional Deadlift');
    await conn.runAsync(
      `INSERT INTO workouts (id, user_id, started_at, duration_minutes, is_completed, name, created_at, updated_at)
       VALUES (?, ?, ?, 40, 1, 'Pull', ?, ?)`,
      [RAMP, U2, t3, t3, t3],
    );
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await conn.runAsync(
        `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, set_type, actual_reps, weight, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'straight', 5, ?, ?, ?)`,
        [`d218-r${i}`, U2, RAMP, DEADLIFT, i + 1, 100 + i * 10, t3 + 1000 * (i + 1), t3 + 1000 * (i + 1)],
      );
    }
    const p = await buildSessionPayload(RAMP, { userId: U2, units: 'kg' });
    expect(p.prCount).toBe(1);
  });

  test('a caller-held count (the summary\'s list) is posted as given', async () => {
    const p = await buildSessionPayload(NOW_W, { userId: U2, units: 'kg', prCount: 3 });
    expect(p.prCount).toBe(3);
  });
});
