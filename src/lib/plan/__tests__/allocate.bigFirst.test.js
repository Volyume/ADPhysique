/**
 * Founder answer 2026-10-05, "Big muscles first" (register D219), as amended
 * by the founder order 2026-10-10 (the standard floor): no muscle's standard
 * is cut to fit the session length. Found in review (2026-10-05): a 3-day,
 * 60-minute general plan gave back 7 sets a week (its floor is 10) while the
 * side delts took a third session, because every muscle counted the same and
 * an isolation set fits into leftover time more easily than a row. Under the
 * 2026-10-10 order the time no longer picks between them: back AND side delts
 * both reach their floors at every session length, and the big muscle's
 * further session still opens before a smaller muscle's.
 *
 * Pinned at the allocator, where the order is decided: two sessions with
 * back and side delts both allowed in each, at lengths far too short for
 * either. Both reach their growth floor and their direct floor, with and
 * without back named as a big muscle; named big, back takes both its
 * sessions. And the real 3-day, 60-minute general plan gives back its floor.
 */
import { allocatePeakWeek } from '../allocate';
import { assignRoles } from '../roles';
import { buildPlan } from '../planner';
import { resolveCatalogue } from '../catalogue';
import { GROWTH_FLOOR, STANDARD_DIRECT_FLOOR } from '../science';
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

describe('big muscles first, and no standard cut for time', () => {
  const SHORT = [10, 20, 30];

  test.each(SHORT)('%i minutes: back and the side delts both reach their growth and direct floors', (minutes) => {
    for (const bigFirst of [['back'], []]) {
      const alloc = run(bigFirst, minutes);
      expect(alloc.weekly.back.fractional).toBeGreaterThanOrEqual(GROWTH_FLOOR.standard);
      expect(alloc.weekly.side_delts.fractional).toBeGreaterThanOrEqual(GROWTH_FLOOR.standard);
      expect(alloc.weekly.back.direct).toBeGreaterThanOrEqual(STANDARD_DIRECT_FLOOR.back);
      expect(alloc.weekly.side_delts.direct).toBeGreaterThanOrEqual(STANDARD_DIRECT_FLOOR.side_delts);
    }
  });

  test.each(SHORT)('%i minutes: back named big opens its further session, and the side delts keep theirs', (minutes) => {
    const alloc = run(['back'], minutes);
    expect(sessionsOf(alloc, 'back')).toBe(2);
    expect(sessionsOf(alloc, 'side_delts')).toBeGreaterThanOrEqual(1);
  });

  test('the review\'s case: back reaches its floor in a 3-day, 60-minute general plan', () => {
    const p = buildPlan({
      daysPerWeek: 3, sessionLengthMinutes: 60, goal: 'general', experience: 'intermediate',
      equipment: 'full_gym', choices, divisionMatrix: DIVISION_MATRIX, focusMuscles: [],
    });
    expect(p.weeklyVolumeSummary.back.fractional).toBeGreaterThanOrEqual(GROWTH_FLOOR.standard);
  });
});
