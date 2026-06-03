/**
 * The generator supports 3-6 training days (selectSplit + DIVISION_MATRIX only
 * define splits for that range). An out-of-range day count used to fall
 * through selectSplit to a 6-day ppl_ab, so a user who asked for 1 or 2 days
 * got six sessions. effectiveDays is now clamped to [3, 6].
 */
import { genLib } from './planengineBench';

const days = (plan) => plan.workouts.length;

describe('day-count is clamped to the supported 3-6 range', () => {
  test('1 or 2 requested days clamp up to a 3-day plan', () => {
    expect(days(genLib('general', { days: 1, experience: 'intermediate' }))).toBe(3);
    expect(days(genLib('general', { days: 2, experience: 'intermediate' }))).toBe(3);
  });

  test('7 requested days clamps down to a 6-day plan', () => {
    expect(days(genLib('general', { days: 7, experience: 'intermediate' }))).toBe(6);
  });

  test('valid 3-6 day counts are unchanged', () => {
    for (const d of [3, 4, 5, 6]) {
      expect(days(genLib('general', { days: d, experience: 'intermediate' }))).toBe(d);
    }
  });
});
