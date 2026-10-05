/**
 * planAutoGen.plannerV2.factsTime.test.js -- D219 (lead, after lane B5): a plan's
 * stored facts keep its session length facts, keyed by the saved routine ids,
 * so the device can say when focus sets take a session past the person's
 * length (founder rule 2026-10-04: "if it goes over time they're made aware").
 * Pins plannerV2PlanFacts directly; fails on the code before this change,
 * which dropped all three.
 */
import { plannerV2PlanFacts } from '../planAutoGen';

const V2 = {
  version: 2, family: 'upper_lower_x2', roles: {}, weeklyTargets: {},
  exposureShares: {}, sessionCaps: {}, lightCaps: {}, gapRanks: { s0: 0, s1: 1 },
  builtFactor: null, rirLadder: [3, 2, 2, 1, 1, 4], readiness: { passes: true }, notes: [], limitedBy: {},
  sessionMinutesAtPeak: [82.5, 64],
  overTime: { s0: 7.5 },
  overCeilings: ['s0'],
};

describe('the stored facts keep the session length facts', () => {
  const facts = plannerV2PlanFacts(V2, { s0: 'routine-a', s1: 'routine-b' }, {}, {});

  test('each session\'s peak minutes, by routine id', () => {
    expect(facts.sessionMinutesAtPeak).toEqual({ 'routine-a': 82.5, 'routine-b': 64 });
  });

  test('the over-time minutes and the sessions past the D45 ceilings, by routine id', () => {
    expect(facts.overTime).toEqual({ 'routine-a': 7.5 });
    expect(facts.overCeilings).toEqual(['routine-a']);
  });

  test('a plan with nothing over keeps empty values, never the planner\'s session keys', () => {
    const plain = plannerV2PlanFacts({ ...V2, overTime: {}, overCeilings: [] }, { s0: 'routine-a', s1: 'routine-b' }, {}, {});
    expect(plain.overTime).toEqual({});
    expect(plain.overCeilings).toEqual([]);
    expect(JSON.stringify(plain)).not.toMatch(/"s[0-9]"/);
  });
});

// Design 4.14 step 4 (review finding 5): the recovery-safe weekly maximum the
// check-in clamps to rides in the facts, by muscle, whole numbers only.
describe('the stored facts keep the recovery-safe weekly maximum', () => {
  test('each muscle\'s maximum, in direct sets; anything not a number is left out', () => {
    const facts = plannerV2PlanFacts({ ...V2, recoverySafeMax: { chest: 12, quads: 11, glutes: Number.NaN, back: null } }, { s0: 'routine-a', s1: 'routine-b' }, {}, {});
    expect(facts.recoverySafeMax).toEqual({ chest: 12, quads: 11 });
  });

  test('a plan built before the maximum existed stores an empty one', () => {
    const facts = plannerV2PlanFacts({ ...V2, recoverySafeMax: undefined }, { s0: 'routine-a', s1: 'routine-b' }, {}, {});
    expect(facts.recoverySafeMax).toEqual({});
  });
});
