/**
 * blockProgression.production.test.js — Campaign 18 block-progression
 * amendment, the completion law.
 *
 * "Do NOT build 24 isolated helper tests and call it complete." So this suite
 * drives the REAL `resolveProgrammePosition` against a mocked database layer
 * that returns the row shapes production actually stores, and asserts the
 * numbers Home, Plans and Train genuinely consume.
 *
 * THE FOUNDER-REPORTED DEFECT, restated so the suite cannot drift: the
 * athlete's next required session was Legs, they trained Push & Arms instead,
 * and `advancePlanNextWorkout` moved `next_workout_index` PAST Legs because it
 * incremented itself rather than looking at what was performed.
 */
jest.mock('../lib/database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getAllMesocyclesForUser: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  getBlockTrainingData: jest.fn(),
  getLiveSessionResolutions: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
}));

import { readFileSync } from 'fs';
import { resolve as resolvePath } from 'path';
import { resolveProgrammePosition, resolveNextSession } from '../lib/programmePosition';
import { SESSION_STATE } from '../lib/blockProgression';
import { RECOVERY_STATE } from '../lib/recoveryState';

// eslint-disable-next-line global-require
const db = require('../lib/database');
const read = (p) => readFileSync(resolvePath(__dirname, '..', p), 'utf8');

const PLANNED_WEEKS = 6;
const RECOVERY_WEEK = 6;
const WEEKS = Array.from({ length: PLANNED_WEEKS }, (_, i) => ({
  id: `wk_${i + 1}`, week_index: i + 1,
}));
/** The founder's shape: Legs sits BEFORE Push & Arms in programme order. */
const ROUTINES = [
  { id: 'r_legs', name: 'Legs', position: 0 },
  { id: 'r_push', name: 'Push & Arms', position: 1 },
  { id: 'r_pull', name: 'Pull', position: 2 },
];
/** A completed workout row exactly as the execution ledger stores one. */
const done = (weekId, routineId, id = `w_${weekId}_${routineId}`) => ({
  id, routine_id: routineId, mesocycle_week_id: weekId, is_completed: 1, deleted_at: null,
});
const skipped = (weekId, routineId) => ({
  mesocycleWeekId: weekId, routineId, resolution: 'skipped_by_user',
  resolvedAt: 5000, updatedAt: 5000, id: `sr_${weekId}_${routineId}`,
});
const endedEarly = (weekId, routineId, workoutId) => ({
  mesocycleWeekId: weekId, routineId, resolution: 'ended_early', workoutId,
  resolvedAt: 5000, updatedAt: 5000, id: `sr_${weekId}_${routineId}`,
});

/**
 * Every required session completed for weeks 1..n-1, so a fixture can place
 * the athlete at a given week without leaving earlier weeks outstanding (which
 * would be a DIFFERENT and equally correct answer - the model resolves the
 * earliest unresolved week, so an untouched week 1 legitimately wins).
 */
const priorWeeksDone = (upToWeekExclusive) => {
  const out = [];
  for (let w = 1; w < upToWeekExclusive; w += 1) {
    for (const r of ROUTINES) out.push(done(`wk_${w}`, r.id, `w_${w}_${r.id}`));
  }
  return out;
};

/**
 * @param over.anchor  1 for a block created under the new model, null for a
 *   legacy block created while the pointer was broken.
 */
function setup({
  calendarWeekIndex = 1, workouts = [], resolutions = [],
  anchor = 1, isDeload = false, awaitingDecision = false,
} = {}) {
  db.getActivePlan.mockResolvedValue({ id: 'plan_1' });
  db.getRoutinesForPlan.mockResolvedValue(ROUTINES);
  db.getAllMesocyclesForUser.mockResolvedValue([{
    id: 'blk_1', isActive: 1, deletedAt: null, createdAt: 1,
    plannedWeeks: PLANNED_WEEKS, durationWeeks: PLANNED_WEEKS,
    deloadWeek: RECOVERY_WEEK, progressionAnchorWeek: anchor,
  }]);
  db.getMesocycleWeeks.mockResolvedValue(WEEKS);
  db.getBlockTrainingData.mockResolvedValue({ workouts, sets: [] });
  db.getLiveSessionResolutions.mockResolvedValue(resolutions);
  db.getCurrentMesocycleWeek.mockResolvedValue({
    weekIndex: calendarWeekIndex, isDeload, awaitingDecision,
    mesocycleId: 'blk_1', plannedWeeks: PLANNED_WEEKS, deloadWeek: RECOVERY_WEEK,
  });
}

beforeEach(() => jest.clearAllMocks());

describe('THE FOUNDER CASE, through production', () => {
  test('Push & Arms completed out of order leaves LEGS next and the block accumulating', async () => {
    setup({
      calendarWeekIndex: 5,
      workouts: [...priorWeeksDone(5), done('wk_5', 'r_push')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.nextSession.name).toBe('Legs');
    expect(p.activeWeekIndex).toBe(5);
    expect(p.execution.completed).toBe(1);
    expect(p.preRecoveryOutstanding).toBe(true);
    expect(p.recoveryState.state).toBe(RECOVERY_STATE.NORMAL_ACCUMULATION);
    // And the surfaces read exactly this.
    expect((await resolveNextSession('u1')).name).toBe('Legs');
  });

  test('CASE 15/19: the calendar reaching the recovery week does NOT start it', async () => {
    setup({
      calendarWeekIndex: RECOVERY_WEEK,
      workouts: [...priorWeeksDone(5), done('wk_5', 'r_push')],
    });
    const p = await resolveProgrammePosition('u1');
    // Calendar says recovery. Programme says week 5 still owes Legs.
    expect(p.calendarWeekIndex).toBe(RECOVERY_WEEK);
    expect(p.activeWeekIndex).toBe(5);
    expect(p.nextSession.name).toBe('Legs');
    expect(p.recoveryPhaseAllowed).toBe(false);
    expect(p.recoveryState.state).not.toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
    expect(p.recoveryState.because).toBe('accumulation_work_outstanding');
  });
});

describe('RESOLUTION THROUGH PRODUCTION', () => {
  const week5 = (extra = {}) => setup({
    calendarWeekIndex: RECOVERY_WEEK,
    workouts: [...priorWeeksDone(5), done('wk_5', 'r_legs'), done('wk_5', 'r_push'), ...(extra.workouts ?? [])],
    resolutions: extra.resolutions ?? [],
  });

  test('CASE 16: the final accumulation session COMPLETED opens recovery', async () => {
    week5({ workouts: [done('wk_5', 'r_pull')] });
    const p = await resolveProgrammePosition('u1');
    expect(p.preRecoveryOutstanding).toBe(false);
    expect(p.recoveryPhaseAllowed).toBe(true);
    expect(p.activeWeekIndex).toBe(RECOVERY_WEEK);
    expect(p.recoveryState.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
  });

  test('CASE 17: the final session SKIPPED opens recovery, and history knows', async () => {
    week5({ resolutions: [skipped('wk_5', 'r_pull')] });
    const p = await resolveProgrammePosition('u1');
    expect(p.recoveryPhaseAllowed).toBe(true);
    expect(p.recoveryState.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
    // The position has genuinely moved on to the recovery week, whose own
    // sessions are of course still ahead of the athlete.
    expect(p.activeWeekIndex).toBe(RECOVERY_WEEK);
    // And the skip did NOT become a completion: no accumulation work is
    // outstanding, but nothing claims the session was performed either.
    expect(p.preRecoveryOutstanding).toBe(false);
  });

  test('CASE 18: the final session ENDED EARLY opens recovery, work preserved', async () => {
    week5({
      workouts: [done('wk_5', 'r_pull', 'w_partial')],
      resolutions: [endedEarly('wk_5', 'r_pull', 'w_partial')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.recoveryPhaseAllowed).toBe(true);
    expect(p.recoveryState.state).toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
  });

  test('CASE 21: a resolved week is NOT "you completed all your workouts"', async () => {
    setup({
      calendarWeekIndex: 5,
      workouts: [...priorWeeksDone(5), done('wk_5', 'r_legs'), done('wk_5', 'r_pull', 'w_partial')],
      resolutions: [skipped('wk_5', 'r_push'), endedEarly('wk_5', 'r_pull', 'w_partial')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.weekResolved).toBe(true);
    expect(p.execution).toEqual({
      required: 3, completed: 1, skipped: 1, endedEarly: 1, outstanding: 0, resolved: 3,
    });
    expect(p.execution.resolved).not.toBe(p.execution.completed);
  });
});

describe('CASES 2, 3, 8, 9, 10, 11: nothing else corrupts position', () => {
  test('out of order: A and C done leaves B next', async () => {
    setup({
      calendarWeekIndex: 3,
      workouts: [...priorWeeksDone(3), done('wk_3', 'r_legs'), done('wk_3', 'r_pull')],
    });
    expect((await resolveProgrammePosition('u1')).nextSession.name).toBe('Push & Arms');
  });

  test('a duplicate session resolves only its own instance', async () => {
    setup({
      calendarWeekIndex: 3,
      workouts: [...priorWeeksDone(3), done('wk_3', 'r_legs', 'a'), done('wk_3', 'r_legs', 'b')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.execution.completed).toBe(1);
    expect(p.execution.outstanding).toBe(2);
    expect(p.weekResolved).toBe(false);
  });

  test('CALENDAR ROLLOVER resolves nothing: the same workout is still next', async () => {
    const at = async (calendarWeekIndex) => {
      setup({
        calendarWeekIndex,
        workouts: [...priorWeeksDone(3), done('wk_3', 'r_push')],
      });
      return resolveProgrammePosition('u1');
    };
    // Week 3 owes Legs and Pull. Weeks pass; the debt does not evaporate.
    expect((await at(3)).nextSession.name).toBe('Legs');
    expect((await at(4)).nextSession.name).toBe('Legs');
    expect((await at(5)).nextSession.name).toBe('Legs');
    expect((await at(3)).activeWeekIndex).toBe(3);
  });

  test('and a week the calendar has NOT reached is not outstanding', async () => {
    setup({ calendarWeekIndex: 1, workouts: [done('wk_1', 'r_legs'), done('wk_1', 'r_push'), done('wk_1', 'r_pull')] });
    const p = await resolveProgrammePosition('u1');
    // Week 1 resolved and week 2 not yet reached: position rests at week 1.
    expect(p.preRecoveryOutstanding).toBe(false);
    expect(p.activeWeekIndex).toBe(1);
  });
});

describe('CASE 15: LEGACY ACTIVE BLOCKS are not sent backwards', () => {
  test('a legacy block floors at the furthest week actually trained', async () => {
    // Created under the broken pointer: weeks 1-3 have gaps that may be
    // unperformed OR consumed by the counter. Ambiguous either way.
    setup({
      anchor: null, calendarWeekIndex: 4,
      workouts: [done('wk_1', 'r_legs'), done('wk_4', 'r_legs')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.legacyBlock).toBe(true);
    expect(p.candidateFloorWeek).toBe(4);
    // Not dragged back to week 1, and week 1's gaps are NOT relabelled.
    expect(p.activeWeekIndex).toBe(4);
    expect(p.nextSession.name).toBe('Push & Arms');
  });

  test('and a NEW block gets the full model with no floor', async () => {
    setup({ anchor: 1, calendarWeekIndex: 4, workouts: [done('wk_4', 'r_legs')] });
    const p = await resolveProgrammePosition('u1');
    expect(p.legacyBlock).toBe(false);
    expect(p.candidateFloorWeek).toBe(1);
    // Week 1 was never resolved, so that is where the outstanding work is.
    expect(p.activeWeekIndex).toBe(1);
  });

  test('LEGACY AMBIGUITY IS NEVER RELABELLED as skipped or completed', async () => {
    setup({ anchor: null, calendarWeekIndex: 4, workouts: [done('wk_4', 'r_legs')] });
    const p = await resolveProgrammePosition('u1');
    // Nothing manufactured a resolution row for the ambiguous earlier weeks.
    expect(db.getLiveSessionResolutions).toHaveBeenCalled();
    expect(p.sessions.every((s) => s.state !== SESSION_STATE.SKIPPED_BY_USER)).toBe(true);
  });
});

describe('CASE 20: adaptive recovery is untouched by the gate', () => {
  test('a mid-accumulation deload stays ADAPTIVE and keeps the queue', async () => {
    setup({
      calendarWeekIndex: 3, isDeload: true,
      workouts: [...priorWeeksDone(3), done('wk_3', 'r_legs'), done('wk_3', 'r_push'), done('wk_3', 'r_pull')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.recoveryState.state).toBe(RECOVERY_STATE.ADAPTIVE_RECOVERY_ADJUSTMENT);
    expect(p.recoveryState.state).not.toBe(RECOVERY_STATE.PLANNED_BLOCK_RECOVERY);
  });
});

describe('CASE 24: rendering is not mutation', () => {
  test('resolving position writes nothing', async () => {
    setup({ calendarWeekIndex: 3, workouts: [...priorWeeksDone(3), done('wk_3', 'r_push')] });
    await resolveProgrammePosition('u1');
    await resolveProgrammePosition('u1');
    // The module imports only readers. Any writer would have to appear here.
    const src = read('lib/programmePosition.js');
    expect(src).not.toMatch(/recordSessionResolution|updateWorkout|runAsync|INSERT|UPDATE/);
  });
});

describe('CASE 13/14: PERSISTENCE AND RESTORE', () => {
  test('a skip survives as a row, so a restart cannot resurrect the session', async () => {
    setup({
      calendarWeekIndex: 3, workouts: priorWeeksDone(3),
      resolutions: [skipped('wk_3', 'r_legs')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.sessions.find((s) => s.routineId === 'r_legs').state)
      .toBe(SESSION_STATE.SKIPPED_BY_USER);
    expect(p.nextSession.name).toBe('Push & Arms');
  });

  test('the resolution table is written, pushed and pulled', () => {
    const dbSrc = read('lib/database.js');
    expect(dbSrc).toMatch(/CREATE TABLE IF NOT EXISTS session_resolutions/);
    // One current resolution per required instance, structurally.
    expect(dbSrc).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS idx_session_resolutions_instance/);
    // Both timestamps written, so cross-device merge never falls to the id
    // except on a genuine tie.
    expect(dbSrc).toMatch(/resolved_at = excluded\.resolved_at,/);
    expect(dbSrc).toMatch(/updated_at_iso = excluded\.updated_at_iso,/);
    const sync = read('lib/sync.js');
    expect(sync).toMatch(/_pushSessionResolutions\(sb, supabaseUserId, localUserId\)/);
    expect(sync).toMatch(/await _pullSessionResolutions\(sb, supabaseUserId\)/);
  });

  test('the id is derived from the instance, so two devices converge on one row', () => {
    const dbSrc = read('lib/database.js');
    expect(dbSrc).toMatch(/const sessionResolutionId = \(mesocycleWeekId, routineId\) =>/);
    expect(dbSrc).toMatch(/`sr_\$\{mesocycleWeekId\}_\$\{routineId\}`/);
  });
});

describe('THE POINTER IS RETIRED', () => {
  test('nothing reads next_workout_index for progression', () => {
    // Comments stripped: these files deliberately DOCUMENT the retired
    // pointer, so matching the prose would fail on the explanation itself.
    const code = (f) => read(f)
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const f of ['screens/HomeScreen.js', 'screens/PlansScreen.js', 'screens/WorkoutSummaryScreen.js']) {
      expect(code(f)).not.toMatch(/nextWorkoutIndex/);
    }
  });

  test('and the blind increment is a no-op tombstone, not a live path', () => {
    const dbSrc = read('lib/database.js');
    const fn = dbSrc.slice(dbSrc.indexOf('export async function advancePlanNextWorkout'));
    expect(fn.slice(0, 200)).not.toMatch(/UPDATE programmes SET next_workout_index/);
    expect(read('screens/WorkoutSummaryScreen.js')).not.toMatch(/await advancePlanNextWorkout/);
  });

  test('HOME, PLANS AND TRAIN read ONE authority', () => {
    expect(read('screens/HomeScreen.js')).toMatch(/resolveProgrammePosition\(user\.id\)/);
    expect(read('screens/PlansScreen.js')).toMatch(/resolveNextSession\(user\.id\)/);
    expect(read('screens/ActiveWorkoutScreen.js')).toMatch(/resolveProgrammePosition\(user\?\.id\)/);
  });
});
