import {
  formatProgressPhotoDay,
  formatProgressPhotoMonth,
  formatProgressPhotoShortDay,
} from '../progressPhotoDates';

const sample = new Date(2026, 2, 4, 12).getTime();

describe('progressPhotoDates', () => {
  test('formats shared British progress-photo dates', () => {
    expect(formatProgressPhotoDay(sample)).toBe('4 Mar 2026');
    expect(formatProgressPhotoShortDay(sample)).toBe('4 Mar');
    expect(formatProgressPhotoMonth(sample)).toBe('March 2026');
  });

  test('returns an empty label for invalid timestamps', () => {
    expect(formatProgressPhotoDay(undefined)).toBe('');
    expect(formatProgressPhotoShortDay('nope')).toBe('');
    expect(formatProgressPhotoMonth(Number.NaN)).toBe('');
  });
});
