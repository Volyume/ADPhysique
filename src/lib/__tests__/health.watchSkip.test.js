/**
 * COMP-020 phone/watch HKWorkout dedupe rule (§4.4). The phone skips its
 * estimated-kcal write only when the watch session covered >= 50% of the
 * workout, so rings/HR credit come from the watch's real capture, not a guess.
 */
import { shouldSkipPhoneHealthWrite } from '../health';

const hour = 60 * 60000;

describe('shouldSkipPhoneHealthWrite', () => {
  const base = { startedAt: 0, endedAt: hour };

  test('skips when the watch covered the whole session', () => {
    expect(shouldSkipPhoneHealthWrite({ ...base, watchSessionMs: hour })).toBe(true);
  });
  test('skips at exactly 50%', () => {
    expect(shouldSkipPhoneHealthWrite({ ...base, watchSessionMs: hour / 2 })).toBe(true);
  });
  test('writes (no skip) below 50%', () => {
    expect(shouldSkipPhoneHealthWrite({ ...base, watchSessionMs: hour / 3 })).toBe(false);
  });
  test('writes when there was no watch session', () => {
    expect(shouldSkipPhoneHealthWrite(base)).toBe(false);
  });
  test('safe on a zero-length workout', () => {
    expect(shouldSkipPhoneHealthWrite({ startedAt: 5, endedAt: 5, watchSessionMs: 10 })).toBe(false);
  });
});
