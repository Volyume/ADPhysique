/**
 * CC33 D112 - W2 landing 7 (closes audit findings T1-07 and T2-25's
 * residual).
 *
 * T1-07, the receipt/commit contradiction: continuity deliberately
 * KEEPS an episode-affected incumbent (KEEP/CAPABILITY_HOLD - temporary
 * is an overlay, the document keeps the movement), but the plan writer
 * then dropped the same exercise as blocked, so the receipt said "kept
 * as it is" beside a slot that was saved empty. Pinned here: a
 * _capabilityHold row is WRITTEN through the resolver even though the
 * filter blocks it right now, an unmarked blocked row still drops, and
 * continuity stamps the marker exactly on CAPABILITY_HOLD keeps.
 *
 * T2-25's residual, the block-boundary launder: constrainedMusclesInWindow
 * judged by interval overlap only, so an episode ending just before a
 * block boundary left the next block's first sessions fully
 * learning-eligible while the muscle was still rebuilding. Pinned: a
 * window starting within the reintroduction carry of an episode's end
 * still stamps its muscles; beyond the carry it does not; live episodes
 * unchanged.
 */
const { resolvePlanAgainstLibrary } = require('../planAutoGen');
const {
  constrainedMusclesInWindow, REINTRODUCTION_CARRY_MS,
} = require('../capability/eligibility');
const fs = require('fs');
const path = require('path');

const SQUAT = { id: 'ex-squat', name: 'Barbell Back Squat', primaryMuscle: 'quads', position: 'standing', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 1, axialLoad: 1, impact: 0, balanceDemand: 'stable' };
const BENCH = { id: 'ex-bench', name: 'Barbell Bench Press', primaryMuscle: 'chest', position: 'lying', floorAccess: 0, overheadPosition: 0, gripDemand: 'bar', unilateralLoadable: 0, bilateralUpper: 1, bilateralLower: 0, axialLoad: 0, impact: 0, balanceDemand: 'supported' };

describe('T1-07 - the writer honours CAPABILITY_HOLD', () => {
  const exerciseMap = {
    byId: new Map([[SQUAT.id, SQUAT], [BENCH.id, BENCH]]),
    byName: new Map([[SQUAT.name, SQUAT], [BENCH.name, BENCH]]),
    byLowerName: new Map([[SQUAT.name.toLowerCase(), SQUAT], [BENCH.name.toLowerCase(), BENCH]]),
  };
  const filteredBlockingSquat = {
    library: [BENCH],
    reasonById: new Map([[SQUAT.id, 'capability_declared']]),
    reasonByName: new Map(),
  };
  const plan = (squatExtra = {}) => ({
    workouts: [{
      name: 'Lower A',
      exercises: [
        { exerciseId: SQUAT.id, exerciseName: SQUAT.name, sets: 3, ...squatExtra },
        { exerciseId: BENCH.id, exerciseName: BENCH.name, sets: 3 },
      ],
    }],
  });

  test('an unmarked blocked slot still drops to blockedSlots - the filter is not weakened', () => {
    const out = resolvePlanAgainstLibrary(plan(), exerciseMap, filteredBlockingSquat);
    expect(out.workouts[0].exercises.map((e) => e.exerciseId)).toEqual([BENCH.id]);
    expect(out.blockedSlots).toHaveLength(1);
    expect(out.blockedSlots[0]).toMatchObject({ exerciseId: SQUAT.id, reason: 'capability_declared' });
  });

  test('a continuity CAPABILITY_HOLD keep is WRITTEN - the receipt and the saved plan agree', () => {
    const out = resolvePlanAgainstLibrary(plan({ _capabilityHold: true }), exerciseMap, filteredBlockingSquat);
    expect(out.workouts[0].exercises.map((e) => e.exerciseId)).toEqual([SQUAT.id, BENCH.id]);
    expect(out.blockedSlots).toHaveLength(0);
    // The marker is transient and never persists past the resolver.
    expect(out.workouts[0].exercises[0]._capabilityHold).toBeUndefined();
  });

  test('continuity stamps the marker on CAPABILITY_HOLD keeps, at source', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'exercise', 'continuity.js'), 'utf8');
    expect(src).toContain("...(reason === SLOT_REASON.CAPABILITY_HOLD ? { _capabilityHold: true } : {})");
  });
});

describe("T2-25 residual - the block boundary cannot launder return-period evidence", () => {
  const NOW = 1_750_000_000_000;
  const DAY = 24 * 60 * 60 * 1000;
  const library = [SQUAT, BENCH];
  const endedEpisode = (endedAt) => [{
    id: 'c1', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
    ruleValue: 'standing', laterality: null, startsAt: endedAt - 30 * DAY, endsAt: null,
    state: 'ended', endedAt, endedReason: 'user_ended', episodeGroupId: 'ep1',
    deletedAt: null,
  }];

  test('a window starting inside the carry still stamps the released muscle', () => {
    const windowStart = NOW;
    const rows = endedEpisode(windowStart - 3 * DAY);
    const stamped = constrainedMusclesInWindow(rows, library, windowStart, windowStart + 7 * DAY);
    expect(stamped.has('quads')).toBe(true);
  });

  test('beyond the carry the muscle is clean again', () => {
    const windowStart = NOW;
    const rows = endedEpisode(windowStart - (REINTRODUCTION_CARRY_MS + DAY));
    const stamped = constrainedMusclesInWindow(rows, library, windowStart, windowStart + 7 * DAY);
    expect(stamped.has('quads')).toBe(false);
  });

  test('a live episode overlapping the window stamps exactly as before', () => {
    const rows = [{
      id: 'c2', userId: 'u1', role: 'episode', source: 'self', ruleKind: 'demand',
      ruleValue: 'standing', laterality: null, startsAt: NOW - DAY, endsAt: null,
      state: 'active', endedAt: null, endedReason: null, episodeGroupId: 'ep2',
      deletedAt: null,
    }];
    const stamped = constrainedMusclesInWindow(rows, library, NOW, NOW + 7 * DAY);
    expect(stamped.has('quads')).toBe(true);
  });

  test('the carry is two weeks, stated once', () => {
    expect(REINTRODUCTION_CARRY_MS).toBe(14 * DAY);
  });
});
