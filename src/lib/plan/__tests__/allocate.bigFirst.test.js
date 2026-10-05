/**
 * Founder answer 2026-10-05, "Big muscles first" (register D219): when time
 * is short, chest, back, quads, hamstrings and glutes reach their growth floor
 * before a smaller muscle gets another session. Found in review: a 3-day,
 * 60-minute general plan gave back 7 sets a week (its floor is 10) while the
 * side delts took a third session, because every muscle counted the same and
 * an isolation set fits into leftover time more easily than a row.
 *
 * Pinned at the allocator, where the order is decided: two sessions short of
 * time, back and side delts both allowed in each. With back named as a big
 * muscle it reaches its growth floor and the side delts keep one session;
 * without the rule (the old order) the side delts take their second session
 * and back stops short. And the real 3-day, 60-minute general plan gives back
 * its floor.
 */
import { allocatePeakWeek } from '../allocate';
import { assignRoles } from '../roles';
import { buildPlan } from '../planner';
import { resolveCatalogue } from '../catalogue';
import { GROWTH_FLOOR } from '../science';
import { DIVISION_MATRIX } from '../../planEngine';

const { LIBRARY } = require('../../__tests__/campaign16.helpers');

const choices = resolveCatalogue({ library: LIBRARY, profile: 'full_gym' });
const allRoles = assignRoles({ goal: 'general', focusMuscles: [], experience: 'intermediate', firstBlock: false });
const roles = { back: allRoles.back, side_delts: allRoles.side_delts };

function run(bigFirst, minutes) {
  return allocatePeakWeek({
    sessionCount: 2,
    roles,
    exposures: { back: [0, 1], side_delts: [0, 1] },
    choices: { back: choices.back, side_delts: choices.side_delts },
    sessionLengthMinutes: minutes,
    bigFirst,
  });
}
const sessionsOf = (alloc, m) => alloc.sessions.filter((s) => s.slots.some((x) => x.muscle === m)).length;

describe('big muscles first when time is short', () => {
  // The shortest session length at which back can reach its floor at all.
  const minutes = [20, 25, 30, 35, 40, 45].find((t) => (run(['back'], t).weekly.back?.fractional || 0) >= GROWTH_FLOOR.standard);

  test('there is a session length where back can just reach its floor', () => {
    expect(minutes).toBeDefined();
  });

  test('back named big: it reaches its floor, and the side delts keep one session', () => {
    const alloc = run(['back'], minutes);
    expect(alloc.weekly.back.fractional).toBeGreaterThanOrEqual(GROWTH_FLOOR.standard);
    expect(sessionsOf(alloc, 'side_delts')).toBe(1);
  });

  test('without the rule, the side delts take the time first and back stops short', () => {
    const alloc = run([], minutes);
    expect(sessionsOf(alloc, 'side_delts')).toBe(2);
    expect(alloc.weekly.back.fractional).toBeLessThan(GROWTH_FLOOR.standard);
  });

  test('the review\'s case: back reaches its floor in a 3-day, 60-minute general plan', () => {
    const p = buildPlan({
      daysPerWeek: 3, sessionLengthMinutes: 60, goal: 'general', experience: 'intermediate',
      equipment: 'full_gym', choices, divisionMatrix: DIVISION_MATRIX, focusMuscles: [],
    });
    expect(p.weeklyVolumeSummary.back.fractional).toBeGreaterThanOrEqual(GROWTH_FLOOR.standard);
  });
});
