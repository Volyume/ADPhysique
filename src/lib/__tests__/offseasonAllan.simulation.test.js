/**
 * offseasonAllan.simulation.test.js -- register D227, spec G1: a 16-week
 * simulated off-season on "Mens Physique Off Season - Allan", run through the
 * REAL coach code on real SQLite (node:sqlite, the real init path, the real
 * exercise and plan seeds, the logger's own resolver, the check-in's own
 * resolve and Apply writes, the coach's atomic apply, the reduction triggers'
 * own reads, the stall rule's own reads and the live prescription resolver).
 *
 * The script (signals as the weekly coach would compute them, D1):
 *   Block 1 (8 weeks, starts at Ramp 1 when selected):
 *     wk1 Ramp 1, hold      -> wk2 repeats Ramp 1 (the ramp pauses a week)
 *     wk2, climb            -> wk3 Ramp 2
 *     wk3, raise (in ramp)  -> wk4 Growth (the ladder; nothing extra)
 *     wk4, raise            -> wk5 +1 lats, +1 side delts
 *     wk5, raise            -> wk6 +1 lats, +1 side delts
 *     wk6, pull-back        -> wk7 down up to 2 a muscle, never below Health
 *     wk7                   -> no card (next week is the reduction week)
 *     wk8 the reduction week (A5's Reduction column)
 *   Block 2 (the next-block flow), from block 1's level (its raises, not its
 *   pull-back):
 *     wk9, raise            -> lats blocked: their only open exercise has
 *                              stalled for 3 sessions (E2); side delts at 22
 *     wk10, two reduction triggers (joint discomfort in two sessions, a low
 *                              energy check-in) -> the reduction suggestion;
 *                              Apply -> wk11 is the Reduction column, the
 *                              block's own reduction week (wk16) still comes
 *     wk11, climb           -> wk12 back at the Growth level
 *     wk12, legs flat + climb -> wk13 +1 Leg Extension, +1 Seated Leg Curl
 *     wk13, wk14 climb      -> no change
 *     wk16 the reduction week
 * Every week's served sets are checked exercise by exercise against the A5
 * table (typed in here by hand) plus the raises applied, and the block's
 * planned volume rows against the served totals (one number everywhere).
 * Progression: the load goes up only when every set at the top load reaches
 * the top of the range, and never in a ramp week.
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
jest.mock('../consent/capabilityConsent', () => ({ getLocalCapabilityConsent: async () => true }));
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

const {
  db, activatePlanWithBlock, copyPlanFromLibrary, getLibraryPlans, getProgrammePlanFacts,
  getRoutinesForPlan, getRoutineExercisesWithDetails, getMesocycleWeeks, applyCoachTrainingAdjustmentAtomically,
  isAuthoredBlockRunning, createCapabilityConstraint, endCapabilityEpisode,
} = require('../database');
const { computePlanEffectiveLines } = require('../sessionEffective');
const { applyReintroductionRamp } = require('../capability/reintroduction');
const { seedExercisesIfNeeded } = require('../seedExercises');
const { seedRoutinesIfNeeded } = require('../seedRoutines');
const { getSessionWeeklyAllocation } = require('../sessionAdjustments');
const { resolveCheckinPlan, writeCheckinPlan } = require('../checkinPlan');
const {
  loadAuthoredStalls, loadAuthoredReductionTriggers, resolveAuthoredReductionApply, recordAuthoredLegsAnswer,
  authoredLegsQuestionDue, loadAuthoredProgression,
} = require('../library/authoredCoachIO');
const { authoredSwapOptions } = require('../library/authored');
const { buildEvidencePacket, resolveSetPrescription } = require('../livePrescription');

const NAME = 'Mens Physique Off Season - Allan';
const U = 'user-d227-sim';
const DAY = 24 * 60 * 60 * 1000;

// The A5 table, typed in from the spec by hand: [key, H, Ramp 1, Ramp 2, Growth, Reduction].
const A5 = [
  ['d1.lat_pulldown', 3, 4, 4, 4, 2], ['d1.single_arm_pulldown', 2, 2, 3, 3, 2], ['d1.chest_supported_row', 2, 2, 2, 3, 1],
  ['d1.cable_lateral', 3, 4, 5, 5, 3], ['d1.reverse_pec_deck', 2, 3, 3, 3, 2], ['d1.preacher_curl', 2, 2, 3, 3, 2],
  ['d1.kneeling_crunch', 2, 2, 2, 3, 2], ['d2.incline_press', 3, 3, 4, 4, 2], ['d2.converging_press', 2, 2, 3, 3, 2],
  ['d2.low_to_high_fly', 2, 2, 2, 3, 1], ['d2.machine_lateral', 3, 4, 4, 5, 2], ['d2.overhead_extension', 2, 2, 3, 3, 2],
  ['d2.pushdown', 2, 2, 2, 2, 1], ['d2.machine_crunch', 2, 2, 2, 3, 1], ['d3.seated_leg_curl', 3, 3, 3, 4, 2],
  ['d3.hack_squat', 2, 2, 3, 3, 2], ['d3.leg_extension', 2, 2, 2, 3, 1], ['d3.standing_calf', 3, 3, 3, 4, 2],
  ['d3.cable_lateral', 3, 4, 5, 5, 3], ['d3.straight_arm_pulldown', 2, 2, 2, 3, 1], ['d4.v_bar_pulldown', 3, 4, 4, 4, 2],
  ['d4.iso_lateral_pulldown', 2, 2, 3, 3, 2], ['d4.wide_row', 2, 3, 3, 3, 2], ['d4.machine_lateral', 3, 4, 4, 5, 2],
  ['d4.reverse_crossover', 2, 2, 2, 3, 1], ['d4.cable_curl', 2, 2, 2, 3, 1], ['d4.cross_body_extension', 2, 2, 2, 3, 1],
];
const COL = { health: 1, ramp1: 2, ramp2: 3, growth: 4, reduction: 5 };
const A5_BY_KEY = new Map(A5.map((r) => [r[0], r]));

let conn;
let copy;
const localDay = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
// Put "now" in week n of the block.
async function setWeek(blockId, n) {
  await conn.runAsync('UPDATE mesocycles SET start_date = ? WHERE id = ?', [localDay(Date.now() - (n - 1) * 7 * DAY), blockId]);
}
const activeBlockId = async (userId) => (await conn.getFirstAsync('SELECT id FROM mesocycles WHERE user_id = ? AND is_active = 1', [userId])).id;

async function routinesWithRows() {
  const out = [];
  for (const routine of await getRoutinesForPlan(copy.id)) out.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
  return out;
}

// What the logger serves in every session of a block week, by slot key.
async function served(weekRow) {
  const facts = await getProgrammePlanFacts(copy.id);
  const keyOf = new Map(facts.authored.sessions.flatMap((s) => s.exercises.map((x) => [x.routineExerciseId, x.key])));
  const byKey = {};
  for (const { routine, rows } of await routinesWithRows()) {
    const { allocation } = await getSessionWeeklyAllocation({
      workout: { mesocycleWeekId: weekRow.id, routineId: routine.id }, exercises: rows,
    });
    for (const r of rows) byKey[keyOf.get(r.routineExercise.id)] = allocation?.[r.exercise.id] ?? 0;
  }
  return byKey;
}
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

async function plannedTotal(weekId) {
  const r = await conn.getFirstAsync('SELECT SUM(planned_sets) AS n FROM planned_muscle_volume WHERE mesocycle_week_id = ?', [weekId]);
  return Number(r?.n ?? 0);
}

// A5 plus the raises applied (Growth only), less the pull-back's trims, never
// below Health; each slot's own cap.
function expected(phase, { raises = {}, trims = {} } = {}) {
  const out = {};
  for (const [key, row] of A5_BY_KEY) {
    let n = row[COL[phase]];
    if (phase === 'growth') n += raises[key] || 0;
    if (phase !== 'reduction' && trims[key]) n = Math.max(row[COL.health], n - trims[key]);
    out[key] = n;
  }
  return out;
}

let weekStartSeq = 1_800_000_000_000;
async function checkIn(signal, { withheld = false } = {}) {
  const resolved = await resolveCheckinPlan({ userId: U, signal, withheld, holdMuscles: [] });
  if (!resolved || !resolved.card.showApply) return resolved;
  await writeCheckinPlan(resolved);
  weekStartSeq += 7 * DAY;
  await applyCoachTrainingAdjustmentAtomically({
    userId: U,
    weekStart: weekStartSeq,
    mesocycleWeekId: resolved.nextWeekId,
    changes: resolved.nextWeekChanges,
    coachOutput: { weekStart: weekStartSeq, volumeSignal: signal },
  });
  return resolved;
}

let workoutSeq = 0;
async function logSession({ routineId, weekId, mesocycleId, daysAgo, exerciseId, sets = [], difficulty = 3, joint = null, repsMin = 8 }) {
  workoutSeq += 1;
  const id = `sim_w${workoutSeq}`;
  const at = Date.now() - daysAgo * DAY;
  await conn.runAsync(
    `INSERT INTO workouts (id, user_id, routine_id, mesocycle_id, mesocycle_week_id, started_at, ended_at, session_difficulty,
       joint_discomfort, is_completed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [id, U, routineId, mesocycleId, weekId, at, at + 3600000, difficulty, joint, at, at],
  );
  let k = 0;
  for (const [weight, reps] of sets) {
    k += 1;
    await conn.runAsync(
      `INSERT INTO workout_sets (id, user_id, workout_id, exercise_id, set_number, set_type, target_reps_min, actual_reps, weight, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'straight', ?, ?, ?, ?, ?)`,
      [`${id}_s${k}`, U, id, exerciseId, k, repsMin, reps, weight, at + k, at + k],
    );
  }
  return id;
}

beforeAll(async () => {
  conn = await db();
  await seedExercisesIfNeeded();
  await seedRoutinesIfNeeded('user-d227-sim-seed');
  const libPlan = (await getLibraryPlans()).find((p) => p.name === NAME);
  copy = await copyPlanFromLibrary(libPlan.id, U);
});

const exerciseRows = async () => (await routinesWithRows())
  .map(({ routine, rows }) => [routine.name, rows.map((r) => r.exercise.id)]);

test('G1: a 16-week off-season through the real coach code', async () => {
  const weekTotals = [];
  const rowsBefore = await exerciseRows();
  const checkWeek = async (weekRow, exp) => {
    const byKey = await served(weekRow);
    expect(byKey).toEqual(exp);
    expect(await plannedTotal(weekRow.id)).toBe(sum(byKey));
    weekTotals.push(sum(byKey));
  };

  // ── Block 1 ─────────────────────────────────────────────────────────────
  const blockA = await activatePlanWithBlock(U, copy.id, NAME, { allowLearnedCarry: false });
  const wA = await getMesocycleWeeks(blockA);
  const facts0 = await getProgrammePlanFacts(copy.id);
  const slot = (key) => facts0.authored.sessions.flatMap((s) => s.exercises.map((x) => ({ ...x, routineId: s.routineId }))).find((x) => x.key === key);

  // Week 1: Ramp 1, served exactly; a hold pauses the ramp.
  await setWeek(blockA, 1);
  expect(await isAuthoredBlockRunning(U, copy.id)).toBe(true); // H7: activating again keeps this block
  await checkWeek(wA[0], expected('ramp1'));
  // Progression is held in a ramp week, even with every set at the top.
  const vbar = slot('d4.v_bar_pulldown');
  await logSession({ routineId: vbar.routineId, weekId: wA[0].id, mesocycleId: blockA, daysAgo: 30, exerciseId: vbar.exerciseId, sets: [[60, 12], [60, 12], [60, 12], [60, 12]] });
  const rampCtx = await loadAuthoredProgression(U, { exerciseId: vbar.exerciseId, routineId: vbar.routineId });
  expect(rampCtx).toMatchObject({ phase: 'ramp1', kind: 'compound' });
  const rampPacket = await buildEvidencePacket({ exerciseId: vbar.exerciseId, currentWorkoutId: 'live', exercise: { category: 'compound', incrementKg: 2.5 }, prescription: { repsMin: 8, repsMax: 12 }, authored: rampCtx });
  expect(resolveSetPrescription(rampPacket, 1).weight).toBe(60);

  const hold = await checkIn(0);
  expect(hold.card.heading).toBe('Next week stays at this week\'s level');
  await checkWeek(wA[1], expected('ramp1'));

  await setWeek(blockA, 2);
  expect((await checkIn(1)).card.showApply).toBe(false);
  await checkWeek(wA[2], expected('ramp2'));

  await setWeek(blockA, 3);
  const inRamp = await checkIn(3);
  expect(inRamp.card.heading).toBe('Your plan\'s ramp carries on next week');
  expect(inRamp.card.showApply).toBe(false);
  await checkWeek(wA[3], expected('growth'));

  // Weeks 4 and 5: raises onto prescribed exercises, in the ruled order.
  const raises = {};
  await setWeek(blockA, 4);
  const r4 = await checkIn(3);
  expect(r4.plan.opened).toEqual([]);
  raises['d3.straight_arm_pulldown'] = 1;
  raises['d3.cable_lateral'] = 1;
  expect((await getProgrammePlanFacts(copy.id)).authored.raises).toEqual(raises);
  await checkWeek(wA[4], expected('growth', { raises }));

  await setWeek(blockA, 5);
  await checkIn(3);
  raises['d3.straight_arm_pulldown'] = 2;
  raises['d4.machine_lateral'] = 1;
  expect((await getProgrammePlanFacts(copy.id)).authored.raises).toEqual(raises);
  await checkWeek(wA[5], expected('growth', { raises }));

  // Week 6: a pull-back, never below the Health numbers.
  await setWeek(blockA, 6);
  const pb = await checkIn(-2);
  expect(pb.card.heading).toBe('Next week: up to 2 fewer sets for each muscle');
  const { trims } = (await getProgrammePlanFacts(copy.id)).authored;
  const w7 = await served(wA[6]);
  expect(w7).toEqual(expected('growth', { raises, trims }));
  const byMuscle = (byKey, col) => {
    const out = {};
    for (const [key, row] of A5_BY_KEY) {
      const m = slot(key).appMuscle;
      out[m] = (out[m] || 0) + (col == null ? byKey[key] : row[col]);
    }
    return out;
  };
  const health = byMuscle(null, COL.health);
  const before = byMuscle(expected('growth', { raises }));
  const after = byMuscle(w7);
  for (const m of Object.keys(health)) {
    expect(after[m]).toBeGreaterThanOrEqual(health[m]);
    expect(after[m]).toBe(Math.max(health[m], before[m] - 2));
  }
  await checkWeek(wA[6], w7);

  // Week 7: next week is the reduction week, so there is no card.
  await setWeek(blockA, 7);
  expect(await resolveCheckinPlan({ userId: U, signal: 3, holdMuscles: [] })).toBeNull();
  await checkWeek(wA[7], expected('reduction'));

  // The straight-arm pulldown went nowhere in four Growth sessions (weeks 4 to 7).
  const straight = slot('d3.straight_arm_pulldown');
  for (let i = 0; i < 4; i += 1) {
    await logSession({ routineId: straight.routineId, weekId: wA[3 + i].id, mesocycleId: blockA, daysAgo: 28 - i * 7, exerciseId: straight.exerciseId, sets: [[30, 15], [30, 14], [30, 13]], repsMin: 12 });
  }

  // ── Block 2 (the next-block flow) ──────────────────────────────────────
  await setWeek(blockA, 9); // the block has finished
  expect(await isAuthoredBlockRunning(U, copy.id)).toBe(false);
  const blockB = await activatePlanWithBlock(U, copy.id, NAME, { allowLearnedCarry: false });
  const wB = await getMesocycleWeeks(blockB);
  expect((await getProgrammePlanFacts(copy.id)).authored.trims).toEqual({});
  await setWeek(blockB, 1);
  await checkWeek(wB[0], expected('growth', { raises }));

  // E2: the stall, with only the listed substitutions.
  const stalls = await loadAuthoredStalls(U, await getProgrammePlanFacts(copy.id));
  const stall = stalls.get('d3.straight_arm_pulldown');
  expect(stall.message).toBe('No progress on Cable Straight-Arm Pulldown for 3 sessions. Check sleep and food first. If both are fine, swap to Cable Lat Pullover or Machine Pullover for 4 to 6 weeks.');
  const offered = authoredSwapOptions(await getProgrammePlanFacts(copy.id), straight.exerciseId, { routineId: straight.routineId });
  const listed = new Set(slot('d3.straight_arm_pulldown').subs.map((x) => x.exerciseId));
  expect(offered).toEqual(listed);
  expect([...stalls.keys()]).toEqual(['d3.straight_arm_pulldown']);

  // Week 9: a raise, but lats' only open exercise has stalled and side delts are at 22.
  const r9 = await checkIn(3);
  expect(r9.card.heading).toBe('No muscle can take more sets next week');
  expect(r9.card.unplacedLines.join(' ')).toMatch(/Lats \(its open exercises have not progressed for 3 sessions\), Side delts \(already at the plan's weekly ceiling\)/);
  await checkWeek(wB[1], expected('growth', { raises }));

  // Progression in Growth: held until every set reaches the top, then +5 kg.
  await setWeek(blockB, 2);
  const growthCtx = await loadAuthoredProgression(U, { exerciseId: vbar.exerciseId, routineId: vbar.routineId });
  expect(growthCtx).toMatchObject({ phase: 'growth', kind: 'compound' });
  await logSession({ routineId: vbar.routineId, weekId: wB[0].id, mesocycleId: blockB, daysAgo: 9, exerciseId: vbar.exerciseId, sets: [[60, 12], [60, 12], [60, 12], [60, 11]] });
  const notYet = await buildEvidencePacket({ exerciseId: vbar.exerciseId, currentWorkoutId: 'live', exercise: { category: 'compound', incrementKg: 2.5 }, prescription: { repsMin: 8, repsMax: 12 }, authored: growthCtx });
  expect(resolveSetPrescription(notYet, 1).weight).toBe(60);
  await logSession({ routineId: vbar.routineId, weekId: wB[1].id, mesocycleId: blockB, daysAgo: 2, exerciseId: vbar.exerciseId, sets: [[60, 12], [60, 12], [60, 12], [60, 12]] });
  const topped = await buildEvidencePacket({ exerciseId: vbar.exerciseId, currentWorkoutId: 'live', exercise: { category: 'compound', incrementKg: 2.5 }, prescription: { repsMin: 8, repsMax: 12 }, authored: growthCtx });
  expect(resolveSetPrescription(topped, 1)).toMatchObject({ weight: 65, repsTarget: 8 });

  // Week 10: two reduction triggers -> the reduction suggestion; Apply.
  await logSession({ routineId: slot('d1.lat_pulldown').routineId, weekId: wB[1].id, mesocycleId: blockB, daysAgo: 4, exerciseId: slot('d1.lat_pulldown').exerciseId, sets: [[80, 8]], joint: 2 });
  await logSession({ routineId: slot('d2.incline_press').routineId, weekId: wB[1].id, mesocycleId: blockB, daysAgo: 3, exerciseId: slot('d2.incline_press').exerciseId, sets: [[70, 8]], joint: 2 });
  expect((await loadAuthoredReductionTriggers(U, { checkin: { energyScore: 4, sleepHours: 8 } })).suggested).toBe(false);
  const triggers = await loadAuthoredReductionTriggers(U, { checkin: { energyScore: 2, sleepHours: 7 } });
  expect(triggers.suggested).toBe(true);
  expect(triggers.triggers.map((t) => t.key)).toEqual(['joints', 'wellbeing']);
  const reduction = await resolveAuthoredReductionApply(U, wB[2].id);
  expect(reduction.release).toBeNull(); // the block's own reduction week is 5 weeks away
  weekStartSeq += 7 * DAY;
  await applyCoachTrainingAdjustmentAtomically({
    userId: U, weekStart: weekStartSeq, mesocycleWeekId: wB[2].id, changes: reduction.changes,
    coachOutput: { weekStart: weekStartSeq }, setDeload: true, deloadRirTarget: reduction.rirTarget, releaseWeek: reduction.release,
  });
  const wB2 = await getMesocycleWeeks(blockB);
  expect(wB2.map((w) => Number(w.is_deload ?? w.isDeload))).toEqual([0, 0, 1, 0, 0, 0, 0, 1]);
  expect(Number(wB2[2].rir_target ?? wB2[2].rirTarget)).toBe(3);
  await checkWeek(wB2[2], expected('reduction'));

  // Week 11 (the early reduction week): a climb goes back to the Growth level.
  await setWeek(blockB, 3);
  const r11 = await checkIn(1);
  expect(r11.card.heading).toBe('Next week goes back to your plan\'s Growth level');
  await checkWeek(wB2[3], expected('growth', { raises }));

  // Week 12: the legs look flat -> +1 Leg Extension, +1 Seated Leg Curl.
  await setWeek(blockB, 4);
  expect(await authoredLegsQuestionDue(U)).toBe(true);
  await recordAuthoredLegsAnswer(U, 'yes');
  const r12 = await checkIn(1);
  expect(r12.card.lines.join(' ')).toMatch(/Leg Extension 3 to 4 and Seated Leg Curl 4 to 5/);
  raises['d3.leg_extension'] = 1;
  raises['d3.seated_leg_curl'] = 1;
  expect((await getProgrammePlanFacts(copy.id)).authored.raises).toEqual(raises);
  expect(await authoredLegsQuestionDue(U)).toBe(false); // once a block
  await checkWeek(wB2[4], expected('growth', { raises }));

  for (const n of [5, 6]) {
    await setWeek(blockB, n);
    expect((await checkIn(1)).card.showApply).toBe(false);
    await checkWeek(wB2[n], expected('growth', { raises }));
  }
  await setWeek(blockB, 7);
  expect(await resolveCheckinPlan({ userId: U, signal: 1, holdMuscles: [] })).toBeNull();
  await checkWeek(wB2[7], expected('reduction'));

  // G2 / D5: sixteen weeks of check-ins never opened an exercise or changed one.
  expect(await exerciseRows()).toEqual(rowsBefore);

  // The served week table (G1): every week's total, weeks 1 to 16.
  expect(weekTotals).toEqual([
    71, 71, 80, 93, 95, 97, 79, 47, // block 1
    97, 97, 47, 97, 99, 99, 99, 47, // block 2
  ]);
});

test('G2: every other plan is unchanged by lane B', async () => {
  const O = 'user-d227-sim-other';
  const other = (await getLibraryPlans()).find((p) => p.name === 'Aesthetic Upper Rotation');
  const otherCopy = await copyPlanFromLibrary(other.id, O);
  await activatePlanWithBlock(O, otherCopy.id, other.name, { allowLearnedCarry: false });
  expect(await getProgrammePlanFacts(otherCopy.id)).toBeNull();
  expect(await isAuthoredBlockRunning(O, otherCopy.id)).toBe(false);
  expect(await loadAuthoredReductionTriggers(O, { checkin: { energyScore: 1 } })).toBeNull();
  const week = (await getMesocycleWeeks(await activeBlockId(O)))[1];
  expect(await resolveAuthoredReductionApply(O, week.id)).toBeNull();
  expect(await authoredLegsQuestionDue(O)).toBe(false);
  expect(await recordAuthoredLegsAnswer(O, 'yes')).toBe(false);
  const routine = (await getRoutinesForPlan(otherCopy.id))[0];
  const row = (await getRoutineExercisesWithDetails(routine.id))[0];
  expect(await loadAuthoredProgression(O, { exerciseId: row.exercise.id, routineId: routine.id })).toBeNull();
  // A plan without version 2 facts gets no check-in plan at all (today's path).
  expect(await resolveCheckinPlan({ userId: O, signal: 3, holdMuscles: [] })).toBeNull();
});

test('G1 addendum (lead ruling): a side-delt episode is held by the capability lane, then ramped back, then the ladder', async () => {
  const E = 'user-d227-sim-episode';
  const libPlan = (await getLibraryPlans()).find((p) => p.name === NAME);
  const plan = await copyPlanFromLibrary(libPlan.id, E);
  const blockId = await activatePlanWithBlock(E, plan.id, NAME, { allowLearnedCarry: false });
  const weeks = await getMesocycleWeeks(blockId);
  await conn.runAsync('UPDATE mesocycles SET start_date = ? WHERE id = ?', [localDay(Date.now() - 2 * 7 * DAY), blockId]); // week 3, Growth
  const facts = await getProgrammePlanFacts(plan.id);
  const lateralIds = [...new Set(facts.authored.sessions.flatMap((s) => s.exercises).filter((x) => x.muscle === 'side_delts').map((x) => x.exerciseId))];
  const routines = [];
  for (const routine of await getRoutinesForPlan(plan.id)) routines.push({ routine, rows: await getRoutineExercisesWithDetails(routine.id) });
  const servedWeek = async (w) => {
    const keyOf = new Map(facts.authored.sessions.flatMap((s) => s.exercises.map((x) => [x.routineExerciseId, x])));
    const by = { side_delts: 0, other: 0 };
    for (const { routine, rows } of routines) {
      const { allocation } = await getSessionWeeklyAllocation({ workout: { mesocycleWeekId: w.id, routineId: routine.id }, exercises: rows });
      for (const r of rows) by[keyOf.get(r.routineExercise.id).muscle === 'side_delts' ? 'side_delts' : 'other'] += allocation?.[r.exercise.id] ?? 0;
    }
    return by;
  };

  // During the episode: the capability lane holds both lateral raises. Each is
  // the other's only listed option, so serve omits them; nothing outside the
  // plan's list is offered and no other exercise is touched.
  const ids = [];
  for (const exerciseId of lateralIds) {
    ids.push(await createCapabilityConstraint(E, {
      role: 'episode', source: 'self', ruleKind: 'exercise', ruleValue: exerciseId,
      startsAt: Date.now() - 10 * DAY, endsAt: Date.now() + 30 * DAY, episodeGroupId: 'grp-delts',
    }));
  }
  const { lines } = await computePlanEffectiveLines(E, ids);
  expect(lines.length).toBe(4);
  for (const l of lines) {
    expect(lateralIds).toContain(l.from.id);
    expect(l.to).toBeNull();
  }

  // The episode ends in week 3: the ramp starts at the plan's Health level
  // (12) this week, then climbs to the ladder over the block's later weeks.
  const endedAt = Date.now();
  await endCapabilityEpisode(E, 'grp-delts', 'user_ended', { nowMs: endedAt });
  const { ramped } = await applyReintroductionRamp(E, { endedAtMs: endedAt });
  expect(ramped).toEqual([{ muscle: 'side_delts', from: 12, to: 20 }]);
  const table = [];
  for (const w of weeks) table.push(await servedWeek(w));
  expect(table.map((x) => x.side_delts)).toEqual([16, 18, 12, 14, 16, 18, 20, 10]);
  // Every other muscle stays on the ladder (A5 minus side delts: 55, 62, 73 x 5, 37).
  expect(table.map((x) => x.other)).toEqual([55, 62, 73, 73, 73, 73, 73, 37]);
  // A check-in raise in week 4 keeps the ramp rows: side delts still capped.
  await conn.runAsync('UPDATE mesocycles SET start_date = ? WHERE id = ?', [localDay(Date.now() - 3 * 7 * DAY), blockId]);
  weekStartSeq += 7 * DAY;
  const resolved = await resolveCheckinPlan({ userId: E, signal: 3, holdMuscles: [] });
  await writeCheckinPlan(resolved);
  await applyCoachTrainingAdjustmentAtomically({ userId: E, weekStart: weekStartSeq, mesocycleWeekId: resolved.nextWeekId, changes: resolved.nextWeekChanges, coachOutput: { weekStart: weekStartSeq } });
  expect((await servedWeek(weeks[4])).side_delts).toBe(16);
  expect((await servedWeek(weeks[6])).side_delts).toBe(20);
});
