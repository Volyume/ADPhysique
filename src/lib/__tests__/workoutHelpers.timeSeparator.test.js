/**
 * parseTimeToSeconds on a pad with no colon (D220 addendum 37, the Android
 * time well): the first dot or comma is the minute separator, so a plank
 * typed as 1.30 or 1,30 is 1:30, never 1 second; a plain number stays
 * seconds; a colon still works.
 */
import { parseTimeToSeconds } from '../workoutHelpers';

test('dot and comma read as the minute separator', () => {
  expect(parseTimeToSeconds('1.30')).toBe(90);
  expect(parseTimeToSeconds('1,30')).toBe(90);
  expect(parseTimeToSeconds('0.45')).toBe(45);
  expect(parseTimeToSeconds('2.5')).toBe(125);
});

test('a colon and a plain number are unchanged', () => {
  expect(parseTimeToSeconds('1:30')).toBe(90);
  expect(parseTimeToSeconds('90')).toBe(90);
  expect(parseTimeToSeconds('')).toBe('');
  expect(parseTimeToSeconds('x')).toBe('');
});
