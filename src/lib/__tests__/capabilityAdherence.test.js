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

    // The conflicted row substitutes to the pool's seated option. Round 5
    // (R5-8): the session here is the squat ALONE - a substitute may
    // never duplicate a row the session already holds, so a session that
    // already contained the leg press would (correctly) omit the squat
    // instead. The two-row shape is pinned separately below.
    const view = computeEffectiveSession(
      [{ exercise: library[0] }], library, state, () => true,
    );
    expect(view.lines[0].effect).toBe(EFFECTIVE_EFFECT.SUBSTITUTED);
    expect(view.lines[0].exerciseTo.id).toBe('fx-legpress');
    expect(view.lines[0].constraintIds).toContain(ruleId);

    // R5-8: with the substitute already IN the session, serving it twice
    // is the defect the taken-set closes - the conflicted row falls to
    // the honest omitted path and the compatible row stands unchanged.
    const viewTaken = computeEffectiveSession(
      [{ exercise: library[0] }, { exercise: library[1] }], library, state, () => true,
    );
    expect(viewTaken.lines[0].effect).toBe(EFFECTIVE_EFFECT.OMITTED);
    expect(viewTaken.lines[1].effect).toBe(EFFECTIVE_EFFECT.UNCHANGED);

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
    // The previous test left r1 (same axis) undecided; excusal requires
    // EVERY driving rule applied, so align it - and that requirement
    // itself is pinned in the declined/undecided test below.
    const all = await require('../database').getCapabilityConstraints(USER);
    for (const r of all.filter(x => x.role === 'episode' && x.ruleValue === 'standing')) {
      // eslint-disable-next-line no-await-in-loop
      await setConstraintEffectiveChoice(USER, r.id, 'applied');
    }
    _resetCapabilityResolveCache();

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

describe('red-team finding 4: declined or undecided rules never excuse a stop', () => {
  test('computeCompletionEffects excuses only all-applied conflicts', async () => {
    const declinedId = await addEpisodeRule('rDecl', 'axial_load', { choice: 'declined' });
    _resetCapabilityResolveCache();
    const state = await require('../capability/resolve').loadCapabilityResolveState(USER, {});
    const axialRow = { id: 'fx-ax', name: 'Fixture Axial', primaryMuscle: 'back', axialLoad: true, position: 'seated', gripDemand: 'none', bilateralUpper: false, bilateralLower: false, impact: false, floorAccess: false, overheadPosition: false, balanceDemand: 'supported' };
    const declinedOut = computeCompletionEffects([{ exercise: axialRow, performed: false }], state);
    expect(declinedOut.entries).toEqual([]);
    expect(declinedOut.coversAllUnperformed).toBe(false);

    await setConstraintEffectiveChoice(USER, declinedId, null); // undecided
    _resetCapabilityResolveCache();
    const s2 = await require('../capability/resolve').loadCapabilityResolveState(USER, {});
    const undecidedOut = computeCompletionEffects([{ exercise: axialRow, performed: false }], s2);
    expect(undecidedOut.entries).toEqual([]);

    await setConstraintEffectiveChoice(USER, declinedId, 'applied');
    _resetCapabilityResolveCache();
    const s3 = await require('../capability/resolve').loadCapabilityResolveState(USER, {});
    const appliedOut = computeCompletionEffects([{ exercise: axialRow, performed: false }], s3);
    expect(appliedOut.entries).toHaveLength(1);
    expect(appliedOut.coversAllUnperformed).toBe(true);
    await setConstraintEffectiveChoice(USER, declinedId, 'declined'); // park it out of later tests
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


describe("R9-1: a second serve pass never deletes the first pass's true record", () => {
  test('an omission-only pass 1, then a pass 2 over the RESTORED reduced list: both omissions survive', async () => {
    // Round 8's replaceSource wiped exactly this: pass 2 runs over the
    // already-reduced list, cannot re-derive pass 1's omission for a
    // row it can no longer see, and its replace deleted the record the
    // post-session detail, the excusal counter, the ended-early
    // excusal and the block-ledger denominator all score from. The
    // merge is pure again; this drives the REAL serve twice through
    // the restored list against the REAL database.
    await insertExerciseWithId('fx-curl', {
      name: 'Fixture Curl', primaryMuscle: 'biceps', equipment: 'dumbbell',
      movementPattern: 'curl', compoundIsolation: 'isolation', position: 'seated',
      gripDemand: 'supportive', bilateralUpper: false, bilateralLower: false,
      axialLoad: false, impact: false, floorAccess: false, overheadPosition: false,
      unilateralLoadable: true, balanceDemand: 'supported', isCustom: false,
    });
    const { applyEffectiveViewToSession } = require('../sessionEffective');
    const { getSessionConstraintEffect } = require('../database');
    const row = (id, name, muscle) => ({ id, name, primaryMuscle: muscle });
    // A fresh user: the suite's earlier tests leave undecided rules on
    // USER, whose conflicted-held rows would mask the omission path.
    const U2 = 'u-r9';
    const ids1 = await createCapabilityConstraints(U2, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'standing',
      startsAt: NOW - 1000, episodeGroupId: 'g_r9a',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U2, ids1[0], 'applied');
    _resetCapabilityResolveCache();
    const pass1 = await applyEffectiveViewToSession(U2, 'w-r9', [
      row('fx-squat', 'Fixture Squat', 'quads'),
      row('fx-legpress', 'Fixture Leg Press', 'quads'),
      row('fx-curl', 'Fixture Curl', 'biceps'),
    ]);
    expect(pass1.served.map((r) => r.id)).toEqual(['fx-legpress', 'fx-curl']);

    // Mid-session, a second APPLIED rule arrives - an exercise-kind
    // block on the leg press - and the screen remounts, re-serving the
    // RESTORED (reduced) list.
    const ids2 = await createCapabilityConstraints(U2, [{
      role: 'episode', source: 'self', ruleKind: 'exercise', ruleValue: 'fx-legpress',
      startsAt: NOW - 500, episodeGroupId: 'g_r9b',
    }], { nowMs: NOW - 500 });
    await setConstraintEffectiveChoice(U2, ids2[0], 'applied');
    _resetCapabilityResolveCache();
    const pass2 = await applyEffectiveViewToSession(U2, 'w-r9', [
      row('fx-legpress', 'Fixture Leg Press', 'quads'),
      row('fx-curl', 'Fixture Curl', 'biceps'),
    ]);
    expect(pass2.served.map((r) => r.id)).toEqual(['fx-curl']);

    const rec = await getSessionConstraintEffect(U2, 'w-r9');
    const omitted = rec.effects.filter((e) => e.effect === 'omitted').map((e) => e.exerciseFrom).sort();
    expect(omitted).toEqual(['fx-legpress', 'fx-squat']);
  });
});

// Round 10 (R10-1/R10-3): the record's identity is the planned SLOT,
// and it corrects itself FORWARD on the session's own logged facts.
// Real serve, real writer, real database, real weekly-stats reader.
describe('R10-1/R10-3: duplicate slots write two true entries; a performed omission is revoked', () => {
  const U3 = 'u-r10';
  const W3 = 'w-r10';
  const row = (id, name, muscle) => ({ id, name, primaryMuscle: muscle });

  test('two slots of one exercise, both omitted: BOTH entries survive the writer, then a re-add-and-train revokes them and every counter drops the session', async () => {
    // A doubled quads movement is ordinary programming (the round-10
    // breaking input). Standing rule blocks the squat; an exercise-kind
    // rule blocks the only pool substitute, so BOTH squat slots omit -
    // under the old (effect, exerciseFrom) key the second slot's entry
    // silently vanished and the receipt said one where two happened.
    const ids1 = await createCapabilityConstraints(U3, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'standing',
      startsAt: NOW - 1000, episodeGroupId: 'g_r10a',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U3, ids1[0], 'applied');
    const ids2 = await createCapabilityConstraints(U3, [{
      role: 'episode', source: 'self', ruleKind: 'exercise', ruleValue: 'fx-legpress',
      startsAt: NOW - 1000, episodeGroupId: 'g_r10b',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U3, ids2[0], 'applied');
    _resetCapabilityResolveCache();
    const { applyEffectiveViewToSession } = require('../sessionEffective');
    const pass = await applyEffectiveViewToSession(U3, W3, [
      row('fx-squat', 'Fixture Squat', 'quads'),
      row('fx-squat', 'Fixture Squat', 'quads'),
      row('fx-curl', 'Fixture Curl', 'biceps'),
    ], { rowIds: ['re-a', 're-b', 're-c'] });
    expect(pass.served.map((r) => r.id)).toEqual(['fx-curl']);

    const rec = await getSessionConstraintEffect(U3, W3);
    const omitted = rec.effects.filter((e) => e.effect === 'omitted');
    expect(omitted.map((e) => e.rowId).sort()).toEqual(['re-a', 're-b']);
    expect(omitted.every((e) => e.exerciseFrom === 'fx-squat')).toBe(true);

    // The week's counters see the session while the omissions stand.
    const d = await db();
    await d.runAsync(
      `INSERT INTO workouts (id, user_id, routine_id, name, started_at, is_completed, created_at, updated_at)
       VALUES (?, ?, NULL, 'R10 session', ?, 1, ?, ?)`,
      [W3, U3, NOW, NOW, NOW],
    );
    const before = await getWeeklySessionStats(U3, WEEK);
    expect(before.constraintExcusedSessions).toBe(1);
    expect(before.constraintReshapedSessions).toBe(1);

    // R10-3: the user re-adds the squat and TRAINS it. performedIds is
    // workout_sets fact, not an intent judgement - the writer renames
    // every performed omission and the strict-matching readers drop it.
    const res = await appendSessionConstraintEffects(U3, W3, [], { performedIds: ['fx-squat'] });
    expect(res).not.toBeNull();
    const rec2 = await getSessionConstraintEffect(U3, W3);
    expect(rec2.effects.filter((e) => e.effect === 'omitted')).toHaveLength(0);
    const revoked = rec2.effects.filter((e) => e.effect === 'omitted_revoked');
    expect(revoked.map((e) => e.rowId).sort()).toEqual(['re-a', 're-b']);

    // Excused: the quoted LIKE no longer matches. Reshaped: a record
    // whose every entry is revoked is no longer a reshaped session
    // (round 10 corrected the non-empty-record predicate).
    const after = await getWeeklySessionStats(U3, WEEK);
    expect(after.constraintExcusedSessions).toBe(0);
    expect(after.constraintReshapedSessions).toBe(0);
  });

  test('two slots of one exercise, both substituted: two entries, two DIFFERENT substitutes (the taken-set), two rowIds', async () => {
    await insertExerciseWithId('fx-hack', {
      name: 'Fixture Hack Press', primaryMuscle: 'quads', equipment: 'machine',
      movementPattern: 'squat', compoundIsolation: 'compound', position: 'seated',
      gripDemand: 'supportive', bilateralUpper: false, bilateralLower: true,
      axialLoad: false, impact: false, floorAccess: false, overheadPosition: false,
      unilateralLoadable: null, balanceDemand: 'supported', isCustom: false,
    });
    const U4 = 'u-r10s';
    const ids = await createCapabilityConstraints(U4, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'standing',
      startsAt: NOW - 1000, episodeGroupId: 'g_r10c',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U4, ids[0], 'applied');
    _resetCapabilityResolveCache();
    const { applyEffectiveViewToSession } = require('../sessionEffective');
    const pass = await applyEffectiveViewToSession(U4, 'w-r10s', [
      row('fx-squat', 'Fixture Squat', 'quads'),
      row('fx-squat', 'Fixture Squat', 'quads'),
    ], { rowIds: ['re-s1', 're-s2'] });
    expect(pass.served).toHaveLength(2);
    const servedIds = pass.served.map((r) => r.id).sort();
    expect(new Set(servedIds).size).toBe(2); // R5-8: never the same substitute twice
    const rec = await getSessionConstraintEffect(U4, 'w-r10s');
    const subs = rec.effects.filter((e) => e.effect === 'substituted');
    expect(subs.map((e) => e.rowId).sort()).toEqual(['re-s1', 're-s2']);
    expect(new Set(subs.map((e) => e.exerciseTo)).size).toBe(2);
  });

  test('legacy tolerance: a keyed entry never doubles a keyless record of the same fact, and a keyless entry never doubles anything', async () => {
    const U5 = 'u-r10l';
    // A record written by pre-round-10 code: no rowId.
    await appendSessionConstraintEffects(U5, 'w-r10l', [
      { slot: 0, exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'] },
    ]);
    // New code re-derives the same fact WITH a rowId: skipped.
    await appendSessionConstraintEffects(U5, 'w-r10l', [
      { slot: 0, rowId: 're-l1', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    // A keyless write meets a keyed record of the same fact: skipped.
    await appendSessionConstraintEffects(U5, 'w-r10l', [
      { slot: 1, rowId: 're-l2', exerciseFrom: 'fx-legpress', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    await appendSessionConstraintEffects(U5, 'w-r10l', [
      { slot: 1, exerciseFrom: 'fx-legpress', effect: 'omitted', constraintIds: ['c1'] },
    ]);
    const rec = await getSessionConstraintEffect(U5, 'w-r10l');
    expect(rec.effects.filter((e) => e.exerciseFrom === 'fx-squat')).toHaveLength(1);
    expect(rec.effects.filter((e) => e.exerciseFrom === 'fx-legpress')).toHaveLength(1);
  });
});

// Round 10 (R10-2): the user's own swap over a serve substitute amends
// the slot's entry - the record names what actually stood in the slot,
// stamped as the user's choice; a swap back to the original revokes.
describe('R10-2: a manual swap over a substitute corrects the slot\'s record', () => {
  test('amend names the user\'s pick on the right slot only; swap-back revokes; other slots untouched', async () => {
    const { amendSessionConstraintSubstitution } = require('../database');
    const U6 = 'u-r10m';
    await appendSessionConstraintEffects(U6, 'w-r10m', [
      { slot: 0, rowId: 're-m1', exerciseFrom: 'fx-squat', exerciseTo: 'fx-legpress', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
      { slot: 1, rowId: 're-m2', exerciseFrom: 'fx-squat', exerciseTo: 'fx-hack', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
    ]);
    await amendSessionConstraintSubstitution(U6, 'w-r10m', {
      exerciseFrom: 'fx-squat', rowId: 're-m1', exerciseTo: 'fx-curl',
    });
    let rec = await getSessionConstraintEffect(U6, 'w-r10m');
    const m1 = rec.effects.find((e) => e.rowId === 're-m1');
    const m2 = rec.effects.find((e) => e.rowId === 're-m2');
    expect(m1.exerciseTo).toBe('fx-curl');
    expect(m1.toChosenByUser).toBe(true);
    expect(m1.effect).toBe('substituted');
    expect(m2.exerciseTo).toBe('fx-hack');
    expect(m2.toChosenByUser).toBeUndefined();

    // Swapping the other slot BACK to the original excluded movement:
    // the change did not keep it out, so the entry revokes.
    await amendSessionConstraintSubstitution(U6, 'w-r10m', {
      exerciseFrom: 'fx-squat', rowId: 're-m2', exerciseTo: 'fx-squat',
    });
    rec = await getSessionConstraintEffect(U6, 'w-r10m');
    expect(rec.effects.find((e) => e.rowId === 're-m2').effect).toBe('substituted_revoked');
    expect(rec.effects.find((e) => e.rowId === 're-m1').effect).toBe('substituted');
  });
});

// Round 11 (R11-1/R11-2, D123): the substituted lane corrects forward
// too; the legacy tolerance is counted; ambiguous amends touch one
// entry; the counters and the record honour the workout's own life.
describe('R11: substituted-lane forward correction, counted legacy credit, bounded amends', () => {
  test('R11-1: a substitution whose ORIGINAL was performed revokes at reconciliation, exactly like an omission', async () => {
    const U7 = 'u-r11a';
    await appendSessionConstraintEffects(U7, 'w-r11a', [
      { slot: 0, rowId: 're-a1', exerciseFrom: 'fx-squat', exerciseTo: 'fx-legpress', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
      { slot: 1, rowId: 're-a2', exerciseFrom: 'fx-curl', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    // The user trains the excluded squat (re-added via the picker) but
    // never the omitted curl - only the squat entries' claims fall.
    await appendSessionConstraintEffects(U7, 'w-r11a', [], { performedIds: ['fx-squat'] });
    const rec = await getSessionConstraintEffect(U7, 'w-r11a');
    expect(rec.effects.find((e) => e.rowId === 're-a1').effect).toBe('substituted_revoked');
    expect(rec.effects.find((e) => e.rowId === 're-a2').effect).toBe('omitted');
  });

  test('R11-1: removing a serve substitute converts the slot to an omission; the other slot stays', async () => {
    const { convertSessionConstraintSubstitutionToOmission } = require('../database');
    const U8 = 'u-r11b';
    await appendSessionConstraintEffects(U8, 'w-r11b', [
      { slot: 0, rowId: 're-b1', exerciseFrom: 'fx-squat', exerciseTo: 'fx-legpress', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
      { slot: 1, rowId: 're-b2', exerciseFrom: 'fx-squat', exerciseTo: 'fx-hack', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
    ]);
    await convertSessionConstraintSubstitutionToOmission(U8, 'w-r11b', {
      exerciseFrom: 'fx-squat', rowId: 're-b1',
    });
    const rec = await getSessionConstraintEffect(U8, 'w-r11b');
    const b1 = rec.effects.find((e) => e.rowId === 're-b1');
    expect(b1.effect).toBe('omitted');
    expect(b1.exerciseTo).toBeUndefined(); // the claim a substitute stood drops with it
    expect(b1.constraintIds).toEqual(['c1']);
    expect(rec.effects.find((e) => e.rowId === 're-b2').effect).toBe('substituted');
  });

  test('R11-2: one legacy entry absorbs exactly ONE keyed re-derivation - a true second slot still lands', async () => {
    const U9 = 'u-r11c';
    // Pre-round-10 record: one keyless omission.
    await appendSessionConstraintEffects(U9, 'w-r11c', [
      { slot: 0, exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'] },
    ]);
    // New code re-serves a session with TWO squat slots: the first keyed
    // entry is the legacy fact re-derived (absorbed), the second is a
    // TRUE second slot the round-10 blanket suppression deleted.
    await appendSessionConstraintEffects(U9, 'w-r11c', [
      { slot: 0, rowId: 're-c1', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
      { slot: 1, rowId: 're-c2', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    const rec = await getSessionConstraintEffect(U9, 'w-r11c');
    const omitted = rec.effects.filter((e) => e.effect === 'omitted');
    expect(omitted).toHaveLength(2);
    expect(omitted.filter((e) => e.rowId == null)).toHaveLength(1);
  });

  test('R11-2: an ambiguous amend touches AT MOST ONE entry', async () => {
    const { amendSessionConstraintSubstitution } = require('../database');
    const U10 = 'u-r11d';
    await appendSessionConstraintEffects(U10, 'w-r11d', [
      { slot: 0, rowId: 're-d1', exerciseFrom: 'fx-squat', exerciseTo: 'fx-legpress', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
      { slot: 1, rowId: 're-d2', exerciseFrom: 'fx-squat', exerciseTo: 'fx-hack', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
    ]);
    // A legacy-marker swap carries no rowId: the round-10 map rewrote
    // BOTH slots off this one swap.
    await amendSessionConstraintSubstitution(U10, 'w-r11d', {
      exerciseFrom: 'fx-squat', rowId: null, exerciseTo: 'fx-curl',
    });
    const rec = await getSessionConstraintEffect(U10, 'w-r11d');
    const amended = rec.effects.filter((e) => e.toChosenByUser === true);
    expect(amended).toHaveLength(1);
    expect(rec.effects.filter((e) => e.exerciseTo === 'fx-hack')).toHaveLength(1);
  });

  test('B9: the weekly constraint counters ignore an opened-and-abandoned session', async () => {
    const U11 = 'u-r11e';
    await appendSessionConstraintEffects(U11, 'w-r11e', [
      { slot: 0, rowId: 're-e1', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    const d = await db();
    await d.runAsync(
      `INSERT INTO workouts (id, user_id, routine_id, name, started_at, is_completed, created_at, updated_at)
       VALUES ('w-r11e', ?, NULL, 'Abandoned session', ?, 0, ?, ?)`,
      [U11, NOW, NOW, NOW],
    );
    const stats = await getWeeklySessionStats(U11, WEEK);
    expect(stats.constraintExcusedSessions).toBe(0);
    expect(stats.constraintReshapedSessions).toBe(0);
  });

  test('hygiene: discarding an incomplete workout tombstones its effects record, and a later write cannot resurrect it', async () => {
    const { deleteIncompleteWorkout } = require('../database');
    const U12 = 'u-r11f';
    await appendSessionConstraintEffects(U12, 'w-r11f', [
      { slot: 0, rowId: 're-f1', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    const d = await db();
    await d.runAsync(
      `INSERT INTO workouts (id, user_id, routine_id, name, started_at, is_completed, created_at, updated_at)
       VALUES ('w-r11f', ?, NULL, 'Discarded session', ?, 0, ?, ?)`,
      [U12, NOW, NOW, NOW],
    );
    expect(await getSessionConstraintEffect(U12, 'w-r11f')).not.toBeNull();
    await deleteIncompleteWorkout('w-r11f');
    expect(await getSessionConstraintEffect(U12, 'w-r11f')).toBeNull();
    // Round 12 (I2): the round-11 replace dropped deleted_at, so one
    // racing best-effort effects write resurrected the dead record into
    // sync and the export. deleted_at now survives every replace.
    await appendSessionConstraintEffects(U12, 'w-r11f', [
      { slot: 1, rowId: 're-f2', exerciseFrom: 'fx-legpress', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    expect(await getSessionConstraintEffect(U12, 'w-r11f')).toBeNull();
  });
});

// Round 12 (R12-1/R12-2/R12-4, D124): the slot's record is the
// conversion identity; unknown drives no removal excusal; the effects
// record dies with a deleted COMPLETED workout too.
describe('R12: record-keyed conversion, definite-only removal excusal, completed-delete tombstone', () => {
  test('R12-1: swap-then-remove - the conversion finds the AMENDED entry by rowId alone (the marker is gone)', async () => {
    const { amendSessionConstraintSubstitution, convertSessionConstraintSubstitutionToOmission } = require('../database');
    const U13 = 'u-r12a';
    await appendSessionConstraintEffects(U13, 'w-r12a', [
      { slot: 0, rowId: 're-x1', exerciseFrom: 'fx-squat', exerciseTo: 'fx-legpress', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
      { slot: 1, rowId: 're-x2', exerciseFrom: 'fx-squat', exerciseTo: 'fx-hack', effect: 'substituted', constraintIds: ['c1'], source: 'serve' },
    ]);
    // The user swaps slot re-x1's substitute for their own pick (the
    // swap clears the in-memory marker) ...
    await amendSessionConstraintSubstitution(U13, 'w-r12a', {
      exerciseFrom: 'fx-squat', rowId: 're-x1', exerciseTo: 'fx-curl',
    });
    // ... then removes that row. Round 11's marker-gated call would
    // never fire; the record-keyed conversion matches the slot exactly.
    await convertSessionConstraintSubstitutionToOmission(U13, 'w-r12a', { rowId: 're-x1' });
    const rec = await getSessionConstraintEffect(U13, 'w-r12a');
    const x1 = rec.effects.find((e) => e.rowId === 're-x1');
    expect(x1.effect).toBe('omitted');
    expect(x1.exerciseTo).toBeUndefined();
    expect(x1.toChosenByUser).toBeUndefined();
    // The other slot's entry is untouched, and a rowId-only call for a
    // slot with no substitution entry is a clean no-op.
    expect(rec.effects.find((e) => e.rowId === 're-x2').effect).toBe('substituted');
    expect(await convertSessionConstraintSubstitutionToOmission(U13, 'w-r12a', { rowId: 're-none' })).toBeNull();
  });

  test('R12-2: removalExcusalConflicts against the REAL resolver - unknown excuses nothing, definite applied does', async () => {
    const { removalExcusalConflicts, actionableEpisodeConflicts } = require('../capability/effective');
    const { loadCapabilityResolveState } = require('../capability/resolve');
    const U14 = 'u-r12b';
    const ids = await createCapabilityConstraints(U14, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'axial_load',
      startsAt: NOW - 1000, episodeGroupId: 'g_r12b',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U14, ids[0], 'applied');
    _resetCapabilityResolveCache();
    const state = await loadCapabilityResolveState(U14, {});
    // A custom lift with NULL demand columns: the conflict is UNKNOWN,
    // the in-session notice says "doesn't know yet", and the removal
    // writer must record nothing - the old gate had no certainty term.
    const nullDemand = { id: 'fx-custom', name: 'Custom Lift', primaryMuscle: 'quads' };
    const unknownConflicts = actionableEpisodeConflicts(state, nullDemand);
    expect(unknownConflicts.length).toBeGreaterThan(0);
    expect(unknownConflicts.every((c) => c.unknown)).toBe(true);
    expect(removalExcusalConflicts(unknownConflicts)).toEqual([]);
    // The definite control: the full-shape squat carries axial load.
    const definiteConflicts = actionableEpisodeConflicts(state, { id: 'fx-squat', ...SQUAT });
    expect(definiteConflicts.some((c) => !c.unknown)).toBe(true);
    const answer = removalExcusalConflicts(definiteConflicts);
    expect(answer.length).toBeGreaterThan(0);
    expect(answer.every((c) => !c.unknown)).toBe(true);
    // A definite conflict whose rule is not APPLIED excuses nothing.
    await setConstraintEffectiveChoice(U14, ids[0], 'declined');
    _resetCapabilityResolveCache();
    const declinedState = await loadCapabilityResolveState(U14, {});
    expect(removalExcusalConflicts(actionableEpisodeConflicts(declinedState, { id: 'fx-squat', ...SQUAT }))).toEqual([]);
  });

  test('R13-2: BOTH writers give one answer - a held co-driver neither excuses nor vetoes, and the constraintIds match', async () => {
    // D120 ruling 2's own shape: a live APPLIED axial rule beside an
    // applied-and-HELD impact rule, both definite on one movement. Round
    // 12's helper rejected the whole answer on the held co-driver while
    // the completion writer excused on the live rule - the two writers
    // recorded different things for the same row depending on whether
    // the user deleted it or left it unlogged. One shared gate now:
    // held drops BEFORE the applied test (hold suspends a rule's OWN
    // automation - D120 ruling 2; a held rule itself excuses nothing -
    // D112 R8), so both writers excuse on exactly the live driver.
    await insertExerciseWithId('fx-jump', {
      name: 'Fixture Jump Squat', primaryMuscle: 'quads', equipment: 'bodyweight',
      movementPattern: 'squat', compoundIsolation: 'compound', position: 'standing',
      gripDemand: 'none', bilateralUpper: false, bilateralLower: true,
      axialLoad: true, impact: true, floorAccess: false, overheadPosition: false,
      unilateralLoadable: null, balanceDemand: 'stable', isCustom: false,
    });
    const { removalExcusalConflicts, episodeConflicts, computeCompletionEffects: cce } = require('../capability/effective');
    const { loadCapabilityResolveState } = require('../capability/resolve');
    const U16 = 'u-r13a';
    const liveIds = await createCapabilityConstraints(U16, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'axial_load',
      startsAt: NOW - 1000, episodeGroupId: 'g_r13a1',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U16, liveIds[0], 'applied');
    const heldIds = await createCapabilityConstraints(U16, [{
      role: 'episode', source: 'self', ruleKind: 'demand', ruleValue: 'impact',
      startsAt: NOW - 1000, episodeGroupId: 'g_r13a2',
    }], { nowMs: NOW - 1000 });
    await setConstraintEffectiveChoice(U16, heldIds[0], 'applied');
    const { setCapabilityAdaptationMode } = require('../database');
    await setCapabilityAdaptationMode(U16, 'g_r13a2', 'hold');
    _resetCapabilityResolveCache();
    const state = await loadCapabilityResolveState(U16, {});
    const jump = { id: 'fx-jump', name: 'Fixture Jump Squat', primaryMuscle: 'quads', axialLoad: true, impact: true, position: 'standing' };

    // The removal writer's feed (raw, held included).
    const removalAnswer = removalExcusalConflicts(episodeConflicts(state, jump));
    expect(removalAnswer.length).toBeGreaterThan(0);
    expect(removalAnswer.map((c) => c.constraintId)).toEqual([liveIds[0]]);

    // The completion writer, same fixture, same movement, unperformed.
    const { entries } = cce([{ exercise: jump, performed: false, rowId: 're-p1' }], state);
    expect(entries).toHaveLength(1);
    expect(entries[0].constraintIds).toEqual([liveIds[0]]);

    // R13-2's other half: a row the user chose themselves is NEVER
    // excused at completion, exactly as the removal writer refuses it.
    const { entries: none } = cce([{ exercise: jump, performed: false, rowId: 're-p2', userChosen: true }], state);
    expect(none).toHaveLength(0);

    // And a held-ONLY driver still excuses nothing anywhere (D112 R8).
    await setConstraintEffectiveChoice(U16, liveIds[0], 'declined');
    _resetCapabilityResolveCache();
    const heldOnlyState = await loadCapabilityResolveState(U16, {});
    expect(removalExcusalConflicts(episodeConflicts(heldOnlyState, jump))).toEqual([]);
  });

  test('R13-3: Clear workout history tombstones the effects records with the sessions', async () => {
    const { clearWorkoutHistory } = require('../database');
    const U17 = 'u-r13b';
    await appendSessionConstraintEffects(U17, 'w-r13b', [
      { slot: 0, rowId: 're-h1', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    const d = await db();
    await d.runAsync(
      `INSERT INTO workouts (id, user_id, routine_id, name, started_at, is_completed, created_at, updated_at)
       VALUES ('w-r13b', ?, NULL, 'Cleared session', ?, 1, ?, ?)`,
      [U17, NOW, NOW, NOW],
    );
    expect(await getSessionConstraintEffect(U17, 'w-r13b')).not.toBeNull();
    await clearWorkoutHistory(U17);
    expect(await getSessionConstraintEffect(U17, 'w-r13b')).toBeNull();
  });

  test('R12-4: deleting a COMPLETED workout tombstones its effects record too', async () => {
    const { deleteWorkoutAndSets } = require('../database');
    const U15 = 'u-r12c';
    await appendSessionConstraintEffects(U15, 'w-r12c', [
      { slot: 0, rowId: 're-y1', exerciseFrom: 'fx-squat', effect: 'omitted', constraintIds: ['c1'], source: 'serve' },
    ]);
    const d = await db();
    await d.runAsync(
      `INSERT INTO workouts (id, user_id, routine_id, name, started_at, is_completed, created_at, updated_at)
       VALUES ('w-r12c', ?, NULL, 'History-deleted session', ?, 1, ?, ?)`,
      [U15, NOW, NOW, NOW],
    );
    expect(await getSessionConstraintEffect(U15, 'w-r12c')).not.toBeNull();
    expect(await deleteWorkoutAndSets(U15, 'w-r12c')).toBe(true);
    expect(await getSessionConstraintEffect(U15, 'w-r12c')).toBeNull();
  });
});
