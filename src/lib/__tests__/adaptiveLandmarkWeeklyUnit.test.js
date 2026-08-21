/**
 * PD-1 (bundle 2 prelude) - the adapted-landmark WEEKLY unit.
 *
 * computeAdaptiveLandmarks treats `weeklyVolume` as weekly sets for the
 * muscle: bestVolume becomes the adapted MAV, a WEEKLY landmark clamped
 * between the weekly mev/mrv bounds. getAdaptiveLandmarkHistory used to
 * pass the per-SESSION set count, so a user training a muscle twice a
 * week at six sets each taught a six-set "weekly" ceiling - one session
 * masquerading as a week. These tests pin the corrected unit end to end
 * against the REAL database (full init path) and the REAL engine:
 *  - two 6-set sessions in one UK-local week -> every entry for that
 *    week carries weeklyVolume 12, never 6;
 *  - weeks keep their own totals (a 5-set single-session week stays 5);
 *  - through computeAdaptiveLandmarks, a consistent 2x6 pattern can
 *    never produce bestVolume 6.
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

const { db, getAdaptiveLandmarkHistory, insertExerciseWithId } = require('../database');
const { computeAdaptiveLandmarks, VOLUME_LANDMARKS } = require('../algorithms');
const { localWeekStartMs } = require('../dayKey');

const USER = 'u-pd1';
// A fixed Wednesday well in the past; week anchors derive from it so the
// fixture never straddles a real week boundary.
const WED = new Date(2026, 3, 15, 10, 0, 0).getTime(); // 2026-04-15 local
const WEEK0 = localWeekStartMs(WED);
const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
async function loggedSession(startedAt, { sets = 6, pump = 3, soreness = 1 } = {}) {
  const d = await db();
  seq += 1;
  const wid = `w-${seq}`;
  await d.runAsync(
    `INSERT INTO workouts (id, user_id, started_at, is_completed, overall_pump,
       soreness_24h_before, joint_discomfort, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?, 0, ?, ?)`,
    [wid, USER, startedAt, pump, soreness, startedAt, startedAt],
  );
  for (let i = 0; i < sets; i += 1) {
    await d.runAsync(
      `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number,
         set_type, target_reps_min, actual_reps, created_at, updated_at)
       VALUES (?, ?, ?, 'ex-chest', ?, 'straight', 8, 9, ?, ?)`,
      [`s-${seq}-${i}`, USER, wid, i + 1, startedAt + i, startedAt + i],
    );
  }
  return wid;
}

beforeAll(async () => {
  await db();
  await insertExerciseWithId('ex-chest', {
    name: 'PD1 Bench', primaryMuscle: 'chest', equipment: 'barbell',
    movementPattern: 'horizontal_push', compoundIsolation: 'compound',
  });
});

describe('PD-1: weeklyVolume is the WEEK total for the muscle, never one session', () => {
  test('a 2 x 6-set week yields entries carrying 12; other weeks keep their own totals', async () => {
    // Week 0: Monday + Thursday, six sets each. Week -1: one 5-set session.
    await loggedSession(WEEK0 + 9 * 60 * 60 * 1000, { sets: 6 });
    await loggedSession(WEEK0 + 3 * DAY + 9 * 60 * 60 * 1000, { sets: 6 });
    await loggedSession(WEEK0 - 4 * DAY, { sets: 5 });

    const history = await getAdaptiveLandmarkHistory(USER);
    const chest = history.filter((e) => e.muscle === 'chest');
    expect(chest).toHaveLength(3);

    const week0Entries = chest.filter((e) => e.weeklyVolume === 12);
    const priorEntries = chest.filter((e) => e.weeklyVolume === 5);
    expect(week0Entries).toHaveLength(2);
    expect(priorEntries).toHaveLength(1);
    // The defect shape: no entry may carry a bare per-session 6.
    expect(chest.some((e) => e.weeklyVolume === 6)).toBe(false);
  });

  test('through the real engine, a consistent 2x6 pattern cannot teach bestVolume 6', async () => {
    // Three more 2x6 weeks so chest clears the 3-data-point gate with a
    // uniform 12-set weekly pattern.
    for (let w = 1; w <= 3; w += 1) {
      await loggedSession(WEEK0 - w * 7 * DAY + 1 * DAY, { sets: 6, pump: 3 });
      await loggedSession(WEEK0 - w * 7 * DAY + 4 * DAY, { sets: 6, pump: 3 });
    }
    const history = await getAdaptiveLandmarkHistory(USER);
    const adapted = computeAdaptiveLandmarks(history);
    expect(adapted.chest.isAdapted).toBe(true);
    expect(adapted.chest.bestVolume).not.toBe(6);
    // bestVolume is one of the genuine weekly totals in evidence (12 or 5).
    expect([12, 5]).toContain(adapted.chest.bestVolume);
    // And the adapted MAV stays inside the weekly landmark bounds, as the
    // consumer contract requires.
    expect(adapted.chest.mav).toBeGreaterThan(VOLUME_LANDMARKS.chest.mev);
    expect(adapted.chest.mav).toBeLessThan(VOLUME_LANDMARKS.chest.mrv);
  });
});
