/**
 * programmePosition.weekComplete.test.js — F-18 (final certification
 * 2026-09-05), evidence 05-SURFACE-TRUTH.md B-1 and B-3.
 *
 * WHAT THIS PINS AND WHY. Once every required session at the athlete's
 * position is resolved, `resolveProgrammePosition` returns `nextSession:
 * null`. Home and Train both read that null and fell back to `routines[0]`,
 * so Today re-offered the FIRST session of the week under the eyebrow
 * "Day 1 of N" with a "Start workout" button, and nothing anywhere said the
 * week's required work was done. The fix needs one shared fact rather than
 * two screens each re-deriving it, so `isWeekComplete` is that fact and this
 * suite drives it through the REAL resolver against the row shapes
 * production stores (same mocked-database convention as
 * src/__tests__/blockProgression.production.test.js).
 *
 * It also pins the two facts that must never be confused: a week is complete
 * when its sessions are RESOLVED (completed, skipped or ended early), which
 * is not the same as "you completed all your workouts"; and a block AWAITING
 * ITS DECISION is a separate, higher-ranked state, which the Today line
 * already owns and the hero now agrees with.
 */
jest.mock('../database', () => ({
  getActivePlan: jest.fn(),
  getRoutinesForPlan: jest.fn(),
  getAllMesocyclesForUser: jest.fn(),
  getMesocycleWeeks: jest.fn(),
  getBlockTrainingData: jest.fn(),
  getLiveSessionResolutions: jest.fn(),
  getCurrentMesocycleWeek: jest.fn(),
}));

import { resolveProgrammePosition, isWeekComplete } from '../programmePosition';
import { resolveTodayLine } from '../home/todayLineArbiter';

// eslint-disable-next-line global-require
const db = require('../database');

const PLANNED_WEEKS = 6;
const RECOVERY_WEEK = 6;
const WEEKS = Array.from({ length: PLANNED_WEEKS }, (_, i) => ({
  id: `wk_${i + 1}`, week_index: i + 1,
}));
const ROUTINES = [
  { id: 'r_legs', name: 'Legs', position: 0 },
  { id: 'r_push', name: 'Push & Arms', position: 1 },
  { id: 'r_pull', name: 'Pull', position: 2 },
];
const done = (weekId, routineId, id = `w_${weekId}_${routineId}`) => ({
  id, routine_id: routineId, mesocycle_week_id: weekId, is_completed: 1, deleted_at: null,
});
const skipped = (weekId, routineId) => ({
  mesocycleWeekId: weekId, routineId, resolution: 'skipped_by_user',
  resolvedAt: 5000, updatedAt: 5000, id: `sr_${weekId}_${routineId}`,
});
const weeksDone = (upToWeekInclusive) => {
  const out = [];
  for (let w = 1; w <= upToWeekInclusive; w += 1) {
    for (const r of ROUTINES) out.push(done(`wk_${w}`, r.id, `w_${w}_${r.id}`));
  }
  return out;
};

function setup({ calendarWeekIndex = 1, workouts = [], resolutions = [], awaitingDecision = false } = {}) {
  db.getActivePlan.mockResolvedValue({ id: 'plan_1' });
  db.getRoutinesForPlan.mockResolvedValue(ROUTINES);
  db.getAllMesocyclesForUser.mockResolvedValue([{
    id: 'blk_1', isActive: 1, deletedAt: null, createdAt: 1,
    plannedWeeks: PLANNED_WEEKS, durationWeeks: PLANNED_WEEKS,
    deloadWeek: RECOVERY_WEEK, progressionAnchorWeek: 1,
  }]);
  db.getMesocycleWeeks.mockResolvedValue(WEEKS);
  db.getBlockTrainingData.mockResolvedValue({ workouts, sets: [] });
  db.getLiveSessionResolutions.mockResolvedValue(resolutions);
  db.getCurrentMesocycleWeek.mockResolvedValue({
    weekIndex: calendarWeekIndex, isDeload: false, awaitingDecision,
    mesocycleId: 'blk_1', plannedWeeks: PLANNED_WEEKS, deloadWeek: RECOVERY_WEEK,
  });
}

beforeEach(() => jest.clearAllMocks());

describe('isWeekComplete — the shared fact', () => {
  test('an unreadable position is never evidence that anything is finished', () => {
    expect(isWeekComplete(null)).toBe(false);
    expect(isWeekComplete(undefined)).toBe(false);
  });

  test('an outstanding session is not a complete week', () => {
    expect(isWeekComplete({ nextSession: { routineId: 'r_legs' }, weekResolved: false })).toBe(false);
  });

  test('a week with no required sessions at all is not "complete"', () => {
    // weekProgressionResolved([]) is false by design: an empty week resolves
    // nothing, so the state must not claim the work is done.
    expect(isWeekComplete({ nextSession: null, weekResolved: false })).toBe(false);
  });

  test('nothing outstanding and every session resolved is a complete week', () => {
    expect(isWeekComplete({ nextSession: null, weekResolved: true })).toBe(true);
  });
});

describe('through the real resolver', () => {
  test('every required session of the reached week done: no next session, week complete', async () => {
    setup({ calendarWeekIndex: 3, workouts: weeksDone(3) });
    const p = await resolveProgrammePosition('u1');
    expect(p.nextSession).toBeNull();
    expect(p.weekResolved).toBe(true);
    expect(p.activeWeekIndex).toBe(3);
    expect(p.source).toBe('all_reached_weeks_resolved');
    expect(isWeekComplete(p)).toBe(true);
  });

  test('one session still outstanding: NOT week complete, and it is still next', async () => {
    setup({
      calendarWeekIndex: 3,
      workouts: [...weeksDone(2), done('wk_3', 'r_legs'), done('wk_3', 'r_push')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(p.nextSession.name).toBe('Pull');
    expect(isWeekComplete(p)).toBe(false);
  });

  test('resolved is not the same as completed: a skipped session still completes the week', async () => {
    setup({
      calendarWeekIndex: 3,
      workouts: [...weeksDone(2), done('wk_3', 'r_legs'), done('wk_3', 'r_push')],
      resolutions: [skipped('wk_3', 'r_pull')],
    });
    const p = await resolveProgrammePosition('u1');
    expect(isWeekComplete(p)).toBe(true);
    // The honest counts stay honest: nothing claims three completions.
    expect(p.execution.completed).toBe(2);
    expect(p.execution.skipped).toBe(1);
  });
});

describe('block awaiting its decision (B-3) is a separate, higher-ranked fact', () => {
  test('a finished block is week-complete AND awaiting a decision at once', async () => {
    setup({ calendarWeekIndex: RECOVERY_WEEK, workouts: weeksDone(RECOVERY_WEEK), awaitingDecision: true });
    const p = await resolveProgrammePosition('u1');
    expect(isWeekComplete(p)).toBe(true);
    // Read to the end of the mechanism: `resolveRecoveryState` returns NULL
    // once the block awaits its decision (recoveryState.js:110), so the
    // position deliberately carries no recovery state here. The
    // awaiting-decision fact lives on the calendar week, which is what both
    // the Today line and the hero read - so the two cannot disagree.
    expect(p.recoveryState).toBeNull();
    // Which is why the hero's precedence puts the decision first: the Today
    // line has always said so, and the hero now agrees with it instead of
    // offering "Start workout" on session 1 beneath it.
    const line = resolveTodayLine({ blockComplete: { eligible: true, onPress: () => {} } });
    expect(line.key).toBe('block_complete');
    expect(line.text).toBe("Block complete. Choose what's next.");
  });
});
