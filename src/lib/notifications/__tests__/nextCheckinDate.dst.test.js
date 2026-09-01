import { computeNextCheckinFireDate } from '../nextCheckinDate';

describe('next weekly check-in uses UK civil dates', () => {
  test('spring transition does not skip the midnight occurrence', () => {
    const result = computeNextCheckinFireDate(
      0, 0, 0,
      new Date(2025, 2, 24, 0, 0, 0).getTime(),
      7,
      new Date(2025, 2, 31, 12, 0, 0).getTime(),
    );
    expect([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours()])
      .toEqual([2025, 3, 6, 0]);
  });

  test('autumn transition preserves the next civil Sunday', () => {
    const result = computeNextCheckinFireDate(
      0, 0, 0,
      new Date(2025, 9, 20, 0, 0, 0).getTime(),
      7,
      new Date(2025, 9, 27, 12, 0, 0).getTime(),
    );
    expect([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours()])
      .toEqual([2025, 10, 2, 0]);
  });
});
