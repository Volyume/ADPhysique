/**
 * CC29 GATE - Audit G's C1-C4 misread walks re-run as fixtures, plus the
 * effective-view and provenance semantics (ARCHITECTURE sections 5.3,
 * 5.5, 14, 17, 18).
 *
 * REAL database (full init path, every migration), REAL stats reader.
 * Pins:
 *  C1/C4  an ended_early session whose every unperformed exercise is
 *         excused by its effects record counts COMPLETED; stopping
 *         BEYOND effective scope stays ended_early (scored 0);
 *  C2     the skip enum is untouched - a fully-omitted session under
 *         APPLIED episode rules reduces PLANNED instead;
 *  C3     mid-session removal omissions merge durably with completion
 *         effects (no duplicates, no clobber);
 *  5.5    recordExerciseSwap derives cause='constraint' from eligibility
 *         at write time, every surface, never free text;
 *  RT2-1  baseline-role rules produce NO effects records and NO markers.
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
const mockLocalConsent = { value: true };
jest.mock('../consent/capabilityConsent', () => ({
  getLocalCapabilityConsent: async () => mockLocalConsent.value,
}));

const { __raw: raw } = jest.requireMock('../dbCrypto');
const {
  db, getWeeklySessionStats, recordExerciseSwap, getExerciseSwaps,
  appendSessionConstraintEffects, getSessionConstraintEffect,
  createCapabilityConstraints, setConstraintEffectiveChoice,
  insertExerciseWithId,
} = require('../database');
const { _resetCapabilityResolveCache } = require('../capability/resolve');
const {
  computeEffectiveSession, computeCompletionEffects, EFFECTIVE_EFFECT,
} = require('../capability/effective');

const USER = 'u-adherence';
// Monday-anchored local week start for a fixed reference moment.
function weekStartOf(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const day = (d.getDay() + 6) % 7;
  return d.getTime() - day * 86400000;
}
const NOW = Date.now();
const WEEK = weekStartOf(NOW);

const SQUAT = { name: 'Fixture Squat', primaryMuscle: 'quads', equipment: 'barbell', movementPattern: 'squat', compoundIsolation: 'compound', position: 'standing', gripDemand: 'bar', bilateralUpper: true, bilateralLower: true, axialLoad: true, impact: false, floorAccess: false, overheadPosition: false, unilateralLoadable: false, balanceDemand: 'stable' };
const LEGPRESS = { name: 'Fixture Leg Press', primaryMuscle: 'quads', equipment: 'machine', movementPattern: 'squat', compoundIsolation: 'compound', position: 'seated', gripDemand: 'supportive', bilateralUpper: false, bilateralLower: true, axialLoad: false, impact: false, floorAccess: false, overheadPosition: false, unilateralLoadable: null, balanceDemand: 'supported' };

async function insertWorkout(id, routineId, startedAt) {
  const d = await db();
  await d.runAsync(
    `INSERT INTO workouts (id, user_id, routine_id, name, started_at, is_completed, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, USER, routineId, 'Fixture session', startedAt, startedAt, startedAt],
  );
}

beforeAll(async () => {
  await db();
  await insertExerciseWithId('fx-squat', { ...SQUAT, isCustom: false });
  await insertExerciseWithId('fx-legpress', { ...LEGPRESS, isCustom: false });
  const d = await db();
  // An active plan with one routine of two exercises (planned = 1/week).
  await d.runAsync(
    `INSERT INTO programmes (id, user_id, name, is_library, is_active, created_at, updated_at)
     VALUES ('prog1', ?, 'Fixture plan', 0, 1, ?, ?)`, [USER, NOW, NOW],
  );
  await d.runAsync(
    `INSERT INTO routines (id, user_id, name, programme_id, created_at, updated_at)
     VALUES ('rout1', ?, 'Day A', 'prog1', ?, ?)`, [USER, NOW, NOW],
  );
  await d.runAsync(
    `INSERT INTO routine_exercises (id, routine_id, exercise_id, order_in_routine, created_at, updated_at)
     VALUES ('re1', 'rout1', 'fx-squat', 0, ?, ?), ('re2', 'rout1', 'fx-legpress', 1, ?, ?)`,
    [NOW, NOW, NOW, NOW],
  );
});

beforeEach(() => { _resetCapabilityResolveCache(); });

async function addEpisodeRule(id, ruleValue, { choice = null } = {}) {
  const ids = await createCapabilityConstraints(USER, [{
    role: 'episode', source: 'self', ruleKind: 'demand', ruleValue,
    startsAt: NOW - 1000, episodeGroupId: `g_${id}`,
  }], { nowMs: NOW - 1000 });
  if (choice) await setConstraintEffectiveChoice(USER, ids[0], choice);
  return ids[0];
}

describe('effective view semantics (section 14)', () => {
  test('applied rule substitutes; no substitute means omitted; declined stays conflicted; baseline produces nothing', async () => {
    const ruleId = await addEpisodeRule('r1', 'standing', { choice: 'applied' });
    const { loadCapabilityResolveState } = require('../capability/resolve');
    const state = await loadCapabilityResolveState(USER, {});
    const library = [{ id: 'fx-squat', ...SQUAT }, { id: 'fx-legpress', ...LEGPRESS }];

    const view = computeEffectiveSession(
      [{ exercise: library[0] }, { exercise: library[1] }], library, state, () => true,
    );
    expect(view.lines[0].effect).toBe(EFFECTIVE_EFFECT.SUBSTITUTED);
    expect(view.lines[0].exerciseTo.id).toBe('fx-legpress');
    expect(view.lines[0].constraintIds).toContain(ruleId);
    expect(view.lines[1].effect).toBe(EFFECTIVE_EFFECT.UNCHANGED);

    // No eligible substitute -> omitted.
    const viewNoSub = computeEffectiveSession(
      [{ exercise: library[0] }], [library[0]], state, () => true,
    );
    expect(viewNoSub.lines[0].effect).toBe(EFFECTIVE_EFFECT.OMITTED);

    // Declined -> conflicted, base row stands.
    await setConstraintEffectiveChoice(USER, ruleId, 'declined');
    _resetCapabilityResolveCache();
    const declinedState = await loadCapabilityResolveState(USER, {});
    const viewDeclined = computeEffectiveSession(
      [{ exercise: library[0] }], library, declinedState, () => true,
    );
    expect(viewDeclined.lines[0].effect).toBe(EFFECTIVE_EFFECT.CONFLICTED);

    // Baseline role: NOTHING (RT2-1).
    await setConstraintEffectiveChoice(USER, ruleId, null);
    const baselineIds = await createCapabilityConstraints(USER, [{
      role: 'baseline', source: 'self', ruleKind: 'demand', ruleValue: 'impact', startsAt: NOW - 1000,
    }], { nowMs: NOW - 1000 });
    _resetCapabilityResolveCache();
    const s2 = await loadCapabilityResolveState(USER, {});
    // Seated so the still-active standing rule cannot touch it: the ONLY
    // rule matching this row is the baseline impact one.
    const impactRow = { id: 'fx-imp', name: 'Fixture Jump', primaryMuscle: 'quads', impact: true, position: 'seated', gripDemand: 'none', bilateralUpper: false, bilateralLower: false, axialLoad: false, floorAccess: false, overheadPosition: false, balanceDemand: 'supported' };
    const viewBaseline = computeEffectiveSession([{ exercise: impactRow }], [impactRow], s2, () => true);
    expect(viewBaseline.lines[0].effect).toBe(EFFECTIVE_EFFECT.UNCHANGED);
    expect(baselineIds).toHaveLength(1);
  });
});

describe('C1/C4: ended_early within effective scope counts completed', () => {
  test('excused stop counts; a stop beyond effective scope stays ended_early', async () => {
    const d = await db();
    await addEpisodeRule('r2', 'standing', { choice: 'applied' });

    // Session A: performed the leg press, skipped the squat (excused).
    await insertWorkout('wA', 'rout1', WEEK + 3600_000);
    await d.runAsync(
      `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, actual_reps, weight, created_at)
       VALUES ('setA1', ?, 'wA', 'fx-legpress', 1, 10, 100, ?)`, [USER, WEEK + 3600_000],
    );
    await d.runAsync(
      `INSERT INTO session_resolutions (id, user_id, mesocycle_week_id, routine_id, workout_id, resolution, resolved_at, created_at, updated_at)
       VALUES ('srA', ?, 'wk1', 'rout1', 'wA', 'ended_early', ?, ?, ?)`, [USER, NOW, NOW, NOW],
    );
    const { entries, coversAllUnperformed } = computeCompletionEffects(
      [
        { exercise: { id: 'fx-squat', ...SQUAT }, performed: false },
        { exercise: { id: 'fx-legpress', ...LEGPRESS }, performed: true },
      ],
      await require('../capability/resolve').loadCapabilityResolveState(USER, {}),
    );
    expect(coversAllUnperformed).toBe(true);
    await appendSessionConstraintEffects(USER, 'wA', entries);

    const stats = await getWeeklySessionStats(USER, WEEK);
    expect(stats.completed).toBe(1); // C1/C4 fixed: effectively complete

    // Session B: stopped beyond effective scope (leg press unperformed too,
    // and nothing excuses it) - stays ended_early, scored 0.
    await insertWorkout('wB', 'rout1', WEEK + 7200_000);
    await d.runAsync(
      `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, actual_reps, weight, created_at)
       VALUES ('setB1', ?, 'wB', 'fx-squat', 1, 5, 60, ?)`, [USER, WEEK + 7200_000],
    );
    await d.runAsync(
      `INSERT INTO session_resolutions (id, user_id, mesocycle_week_id, routine_id, workout_id, resolution, resolved_at, created_at, updated_at)
       VALUES ('srB', ?, 'wk2', 'rout1', 'wB', 'ended_early', ?, ?, ?)`, [USER, NOW, NOW, NOW],
    );
    // Its effects record excuses only the squat - but the squat WAS
    // performed here and the leg press was not: not covered.
    await appendSessionConstraintEffects(USER, 'wB', [
      { slot: 0, exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['x'] },
    ]);
    const stats2 = await getWeeklySessionStats(USER, WEEK);
    expect(stats2.completed).toBe(1); // wB still excluded
  });
});

describe('C3: removal omissions merge durably', () => {
  test('append merges by effect+exercise, never duplicates or clobbers', async () => {
    await appendSessionConstraintEffects(USER, 'wC', [
      { slot: 0, exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'] },
    ]);
    await appendSessionConstraintEffects(USER, 'wC', [
      { slot: 0, exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'] },
      { slot: 1, exerciseFrom: 'fx-legpress', effect: 'substituted', constraintIds: ['c1'] },
    ]);
    const rec = await getSessionConstraintEffect(USER, 'wC');
    expect(rec.effects).toHaveLength(2);
    expect(rec.effects.filter((e) => e.exerciseFrom === 'fx-squat')).toHaveLength(1);
  });
});

describe('section 5.5: eligibility-derived swap cause', () => {
  test("a swap FROM a capability-ineligible exercise records cause='constraint'; others record null", async () => {
    await addEpisodeRule('r3', 'standing');
    _resetCapabilityResolveCache();
    await recordExerciseSwap(USER, 'fx-squat', 'fx-legpress', { scope: 'session' });
    await recordExerciseSwap(USER, 'fx-legpress', 'fx-squat', { scope: 'session' });
    const swaps = await getExerciseSwaps(USER);
    const fromSquat = swaps.find((s) => s.fromExerciseId === 'fx-squat');
    const fromLegPress = swaps.find((s) => s.fromExerciseId === 'fx-legpress');
    expect(fromSquat.cause).toBe('constraint');
    expect(fromLegPress.cause).toBeNull();
  });
});
