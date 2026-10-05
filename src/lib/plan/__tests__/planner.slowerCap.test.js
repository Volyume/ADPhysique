/**
 * Design 4.4 and 4.13 (register D219; the founder's answer of 2026-10-05 on
 * the learner, item 2.4): a slower recoverer (a learned factor above 1) gets
 * a lower direct cap a session, max(6, floor(8 / factor)), only where the
 * sets can move to the muscle's other sessions, so the learned factor never
 * changes a weekly target. Found unwired by lane L1 (the constant had no
 * consumer).
 *
 * Pinned, on real catalogue plans: with a factor of 1.2 (cap 6) every muscle
 * keeps exactly its weekly sets and its number of exercises against the same
 * plan with no factor; every muscle given the lower cap is served at most 6
 * direct sets a session at the peak; at least one muscle gets it; a factor at
 * or below 1 changes no cap.
 */
import { buildPlan } from '../planner';
import { prescribeWeek } from '../prescribe';
import { resolveCatalogue } from '../catalogue';
import { BLOCK } from '../science';
import { DIVISION_MATRIX } from '../../planEngine';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const choices = resolveCatalogue({ library: LIBRARY, profile: 'full_gym' });
const credits = {};
for (const list of Object.values(choices)) for (const c of list) credits[c.name] = c.credits || {};

const build = (over) => buildPlan({
  goal: 'general', experience: 'intermediate', equipment: 'full_gym', choices, divisionMatrix: DIVISION_MATRIX, focusMuscles: [], ...over,
});

function peakDirectBySession(p) {
  const sessions = p.workouts.map((w) => ({
    id: w.sessionKey,
    slots: w.exercises.map((e) => ({ id: e.slotKey, muscle: e.muscle, kind: e.kind, baseSets: e.sets, credits: credits[e.name] || {}, thinEquipment: e.thinEquipment, focus: p.v2.roles[e.muscle] === 'focus' })),
  }));
  const weekTargets = Object.fromEntries(Object.entries(p.v2.weeklyTargets).map(([m, l]) => [m, l[BLOCK.peakWeek - 1]]));
  return prescribeWeek({ sessions, weekTargets, facts: { exposureShares: p.v2.exposureShares, sessionCaps: p.v2.sessionCaps } }).perSession;
}
const exercisesOf = (p, m) => p.workouts.reduce((a, w) => a + w.exercises.filter((e) => e.muscle === m).length, 0);

const CASES = [[4, 75], [5, 75], [6, 60], [3, 90]];

describe('a slower recoverer\'s lower session cap (design 4.4)', () => {
  let capped = 0;
  test.each(CASES.map(([d, m]) => [`${d} days, ${m} min`, d, m]))('%s: weekly targets unchanged, the cap held', (_name, daysPerWeek, sessionLengthMinutes) => {
    const base = build({ daysPerWeek, sessionLengthMinutes });
    const slow = build({ daysPerWeek, sessionLengthMinutes, learnedFactor: 1.2, recoveryRating: 'average' });
    for (const [m, v] of Object.entries(base.weeklyVolumeSummary)) {
      expect({ m, fractional: slow.weeklyVolumeSummary[m]?.fractional, exercises: exercisesOf(slow, m) })
        .toEqual({ m, fractional: v.fractional, exercises: exercisesOf(base, m) });
    }
    const per = peakDirectBySession(slow);
    for (const [m, caps] of Object.entries(slow.v2.sessionCaps || {})) {
      if (!(caps.direct <= 6) || base.v2.sessionCaps?.[m]?.direct === caps.direct) continue;
      capped++;
      for (const s of Object.values(per)) expect({ m, d: s.direct[m] || 0, ok: (s.direct[m] || 0) <= 6 }).toEqual({ m, d: s.direct[m] || 0, ok: true });
    }
  });

  test('at least one muscle got the lower cap across the cases', () => {
    expect(capped).toBeGreaterThan(0);
  });

  test('a factor at or below 1 changes no cap', () => {
    const base = build({ daysPerWeek: 4, sessionLengthMinutes: 75 });
    for (const f of [1, 0.85]) {
      expect(build({ daysPerWeek: 4, sessionLengthMinutes: 75, learnedFactor: f }).v2.sessionCaps).toEqual(base.v2.sessionCaps);
    }
  });
});
