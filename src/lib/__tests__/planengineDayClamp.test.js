/**
 * The generator supports 2-6 training days. An out-of-range day count used to
 * fall through selectSplit to a 6-day ppl_ab, so a user who asked for 1 or 2
 * days got six sessions; effectiveDays is clamped so that cannot happen.
 *
 * RE-ANCHORED, C16 closure. The floor used to be 3, which meant a user who
 * explicitly chose two sessions in the quiz silently received three. The
 * founder's ruling is direct: "VOLYUME SUPPORTS REAL 2-DAY TRAINING. Do NOT
 * silently clamp 2 -> 3." Two days now produces two sessions, built as a
 * whole-programme full-body distribution. 1 and 7 are still clamped: neither
 * is offered anywhere in the app, and a corrupted or imported value has to
 * land on something defined.
 */
import { genLib } from './planengineBench';

const days = (plan) => plan.workouts.length;

describe('day-count is clamped to the supported 2-6 range', () => {
  test('TWO requested days produces exactly two sessions, never three', () => {
    expect(days(genLib('general', { days: 2, experience: 'intermediate' }))).toBe(2);
    expect(days(genLib('general', { days: 2, experience: 'beginner' }))).toBe(2);
    expect(days(genLib('general', { days: 2, experience: 'advanced' }))).toBe(2);
  });

  test('1 requested day still clamps up, because one session is not offered', () => {
    expect(days(genLib('general', { days: 1, experience: 'intermediate' }))).toBe(2);
  });

  test('7 requested days clamps down to a 6-day plan', () => {
    expect(days(genLib('general', { days: 7, experience: 'intermediate' }))).toBe(6);
  });

  test('valid 2-6 day counts are unchanged', () => {
    for (const d of [2, 3, 4, 5, 6]) {
      expect(days(genLib('general', { days: d, experience: 'intermediate' }))).toBe(d);
    }
  });
});
