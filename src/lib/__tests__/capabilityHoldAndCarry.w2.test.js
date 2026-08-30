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

describe('R18-2 - a rule that drives nothing cannot veto a live baseline rewrite', () => {
  /**
   * Round 18. The rebuild and block-review evidence builders computed
   * `capabilityAffected` from the RAW definite episode list - held and
   * declined rules included - and `capabilityIneligible` as "any
   * definite conflict minus affected". So a held (or declined) episode
   * rule, which drives nothing (D120 ruling 2), flipped a live BASELINE
   * rule's REPLACE into a KEEP whose receipt called a permanent
   * conflict "your temporary change". Driven here, at both layers the
   * closure rides on: the term semantics against REAL resolver states
   * (the builders' own expressions over episodeConflicts /
   * removalExcusalConflicts / baselineConflicts - wiring pinned at
   * source in planRationale.capabilityLaneStop.guard), and the
   * slotVerdict ranking (D130): live overlay KEEP, then baseline
   * REPLACE, then open-episode KEEP - each above every evidence rank.
   * The write-carve chain for the open-episode keep is the T1-07 block
   * above: CAPABILITY_HOLD -> continuity marker -> resolver writes it.
   */
  const { buildCapabilityResolveState } = require('../capability/resolve');
  const { episodeConflicts, removalExcusalConflicts, baselineConflicts } = require('../capability/effective');
  const { slotVerdict, SLOT_VERDICT, SLOT_REASON } = require('../programmeEpoch');

  const NOW = 1_750_000_000_000;
  const rule = (over) => ({
    id: over.id, userId: 'u1', source: 'self', ruleKind: 'demand',
    laterality: null, startsAt: NOW - 1000, endsAt: null, state: 'active',
    endedAt: null, endedReason: null, deletedAt: null, acknowledgedAt: NOW,
    ...over,
  });
  // The reviewer's breaking input: a permanent baseline rule (no axial
  // load) plus a temporary standing episode the user HELD, both bearing
  // on one standing axial incumbent (SQUAT above).
  const heldPlusBaseline = buildCapabilityResolveState([
    rule({ id: 'ep-stand', role: 'episode', ruleValue: 'standing', episodeGroupId: 'g1', effectiveChoice: 'applied', adaptationMode: 'hold' }),
    rule({ id: 'base-axial', role: 'baseline', ruleValue: 'axial_load', effectiveChoice: null, adaptationMode: null }),
  ], { atMs: NOW });
  const terms = (state, ex) => {
    const episodeDefinite = episodeConflicts(state, ex).filter((c) => !c.unknown);
    const capabilityAffected = removalExcusalConflicts(episodeDefinite).length > 0;
    return {
      capabilityAffected,
      capabilityEpisodeOpen: !capabilityAffected && episodeDefinite.length > 0,
      capabilityIneligible: baselineConflicts(state, ex).some((c) => !c.unknown),
    };
  };

  test('held episode + live baseline: the baseline fact stands and the slot REPLACES', () => {
    const t = terms(heldPlusBaseline, SQUAT);
    expect(t).toEqual({ capabilityAffected: false, capabilityEpisodeOpen: true, capabilityIneligible: true });
    expect(slotVerdict(t, {})).toEqual(
      { verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.CAPABILITY_EXCLUDED },
    );
  });

  test('declined episode + live baseline: same - declined drives nothing either', () => {
    const declined = buildCapabilityResolveState([
      rule({ id: 'ep-stand', role: 'episode', ruleValue: 'standing', episodeGroupId: 'g1', effectiveChoice: 'declined', adaptationMode: null }),
      rule({ id: 'base-axial', role: 'baseline', ruleValue: 'axial_load', effectiveChoice: null, adaptationMode: null }),
    ], { atMs: NOW });
    const t = terms(declined, SQUAT);
    expect(t.capabilityAffected).toBe(false);
    expect(slotVerdict(t, {})).toEqual(
      { verdict: SLOT_VERDICT.REPLACE, reason: SLOT_REASON.CAPABILITY_EXCLUDED },
    );
  });

  test('LIVE applied episode + baseline: the overlay outranks the replace (D129 ruling 6 preserved)', () => {
    const live = buildCapabilityResolveState([
      rule({ id: 'ep-stand', role: 'episode', ruleValue: 'standing', episodeGroupId: 'g1', effectiveChoice: 'applied', adaptationMode: null }),
      rule({ id: 'base-axial', role: 'baseline', ruleValue: 'axial_load', effectiveChoice: null, adaptationMode: null }),
    ], { atMs: NOW });
    const t = terms(live, SQUAT);
    expect(t.capabilityAffected).toBe(true);
    expect(slotVerdict(t, {})).toEqual(
      { verdict: SLOT_VERDICT.KEEP, reason: SLOT_REASON.CAPABILITY_HOLD },
    );
  });

  test('held episode ALONE still defers document judgement, below the baseline rank (D130)', () => {
    const heldOnly = buildCapabilityResolveState([
      rule({ id: 'ep-stand', role: 'episode', ruleValue: 'standing', episodeGroupId: 'g1', effectiveChoice: 'applied', adaptationMode: 'hold' }),
    ], { atMs: NOW });
    const t = terms(heldOnly, SQUAT);
    expect(t).toEqual({ capabilityAffected: false, capabilityEpisodeOpen: true, capabilityIneligible: false });
    // Deferred even against strong replace-shaped evidence below it.
    expect(slotVerdict({ ...t, swappedAwayCount: 3, plateau: true }, {})).toEqual(
      { verdict: SLOT_VERDICT.KEEP, reason: SLOT_REASON.CAPABILITY_HOLD },
    );
  });

  test('the slotVerdict ranking, driven as a table', () => {
    const rows = [
      [{ capabilityAffected: true }, SLOT_VERDICT.KEEP, SLOT_REASON.CAPABILITY_HOLD],
      [{ capabilityIneligible: true }, SLOT_VERDICT.REPLACE, SLOT_REASON.CAPABILITY_EXCLUDED],
      [{ capabilityEpisodeOpen: true }, SLOT_VERDICT.KEEP, SLOT_REASON.CAPABILITY_HOLD],
      [{ capabilityAffected: true, capabilityIneligible: true }, SLOT_VERDICT.KEEP, SLOT_REASON.CAPABILITY_HOLD],
      [{ capabilityEpisodeOpen: true, capabilityIneligible: true }, SLOT_VERDICT.REPLACE, SLOT_REASON.CAPABILITY_EXCLUDED],
      // The user's own exclusion outranks all three, unchanged.
      [{ excluded: true, capabilityAffected: true }, SLOT_VERDICT.REPLACE, SLOT_REASON.USER_EXCLUDED],
    ];
    for (const [evidence, verdict, reason] of rows) {
      expect({ evidence, ...slotVerdict(evidence, {}) }).toEqual({ evidence, verdict, reason });
    }
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
