import { computePRsPerWeek } from '../useProgressData';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 31); // fixed reference so week binning is stable

// computePRsPerWeek bins "new running-max estimated 1RM" events into weekly
// slots inside the window. It was extracted verbatim from AnalyticsScreen when
// the Progress data layer moved into useProgressData; these lock its behaviour.
describe('computePRsPerWeek', () => {
  test('no sets gives a zero-filled week array sized to the window', () => {
    expect(computePRsPerWeek([], {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
    expect(computePRsPerWeek([], {}, 7, NOW)).toEqual([0]);
  });

  test('a single best today lands in the most recent week slot', () => {
    const sets = [{ exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW }];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 1]);
  });

  test('a best set entirely outside the window is not counted', () => {
    const sets = [{ exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 40 * DAY }];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
  });

  test('only sets that beat the running max count, and old maxes still carry forward', () => {
    const sets = [
      // Pre-window heavy set sets the running max but is not itself recorded.
      { exerciseId: 'e1', weight: 100, actualReps: 5, createdAt: NOW - 40 * DAY },
      // In-window set that does NOT beat it: no new PR.
      { exerciseId: 'e1', weight: 90, actualReps: 5, createdAt: NOW - 10 * DAY },
      // In-window set that beats it: one PR, this week.
      { exerciseId: 'e1', weight: 110, actualReps: 5, createdAt: NOW },
    ];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 1]);
  });

  test('zero-weight or zero-rep sets are ignored', () => {
    const sets = [
      { exerciseId: 'e1', weight: 0, actualReps: 5, createdAt: NOW },
      { exerciseId: 'e1', weight: 100, actualReps: 0, createdAt: NOW },
    ];
    expect(computePRsPerWeek(sets, {}, 30, NOW)).toEqual([0, 0, 0, 0, 0]);
  });
});
