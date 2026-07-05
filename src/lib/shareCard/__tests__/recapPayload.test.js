import { buildRecapMilestoneData } from '../recapPayload';

const START = Date.UTC(2026, 5, 1);
const END = Date.UTC(2026, 6, 1);

function assertTrainingOnly(payload) {
  const text = JSON.stringify(payload);
  expect(text).not.toMatch(/bodyweight|body fat|weightKg|bodyFat|measurements|notes/i);
}

describe('buildRecapMilestoneData', () => {
  test('builds the monthly recap share payload from factual training stats only', () => {
    const payload = buildRecapMilestoneData({
      startMs: START,
      endMs: END,
      totalSessions: 13,
      totalSets: 180,
      tonnage: 48200,
      topPRs: [{ exerciseName: 'Squat' }],
      notes: 'private note',
      bodyFatPercent: 12,
    }, { variant: 'month', monthLabel: 'June' });

    expect(payload).toEqual({
      eyebrow: 'MONTHLY RECAP',
      title: 'June',
      heroValue: '13',
      heroUnit: 'sessions',
      caption: '1 June 2026 to 30 June 2026',
      stats: [
        { value: '48,200', label: 'kg lifted' },
        { value: '180', label: 'sets' },
        { value: '1', label: 'PR' },
      ],
    });
    assertTrainingOnly(payload);
  });

  test('builds the weekly recap share payload with week-specific fallback title', () => {
    const payload = buildRecapMilestoneData({
      startMs: START,
      endMs: START + 7 * 86400000,
      totalSessions: 1,
      totalSets: 24,
      tonnage: 9200,
      topPRs: [{}, {}],
    }, { variant: 'week' });

    expect(payload).toEqual({
      eyebrow: 'WEEKLY RECAP',
      title: 'Your week',
      heroValue: '1',
      heroUnit: 'session',
      caption: '1 June 2026 to 7 June 2026',
      stats: [
        { value: '9,200', label: 'kg lifted' },
        { value: '24', label: 'sets' },
        { value: '2', label: 'PRs' },
      ],
    });
    assertTrainingOnly(payload);
  });

  test('builds the block-complete share payload with planned week context', () => {
    const payload = buildRecapMilestoneData({
      meso: { name: 'Hypertrophy Block', plannedWeeks: 6 },
      totalSessions: 18,
      totalSets: 240,
      tonnage: 62000,
    }, { variant: 'block', blockName: 'Fallback block' });

    expect(payload).toEqual({
      eyebrow: 'BLOCK COMPLETE',
      title: 'Hypertrophy Block',
      heroValue: '18',
      heroUnit: 'sessions',
      caption: '',
      stats: [
        { value: '62,000', label: 'kg lifted' },
        { value: '240', label: 'sets' },
        { value: '6', label: 'weeks' },
      ],
    });
    assertTrainingOnly(payload);
  });

  test('builds the year-of-lifts payload from annual training totals', () => {
    const payload = buildRecapMilestoneData({
      yearStart: Date.UTC(2025, 6, 5),
      yearEnd: Date.UTC(2026, 6, 5),
      totalSessions: 130,
      totalSets: 1800,
      tonnage: 480000,
      uniqueExercises: 22,
    });

    expect(payload).toEqual({
      title: 'My year of lifts',
      eyebrow: '',
      heroValue: '130',
      heroUnit: 'sessions',
      caption: '5 July 2025 to 5 July 2026',
      stats: [
        { value: '480,000', label: 'kg lifted' },
        { value: '1,800', label: 'sets' },
        { value: '22', label: 'exercises' },
      ],
    });
    assertTrainingOnly(payload);
  });

  test('null data returns null so callers can skip navigation', () => {
    expect(buildRecapMilestoneData(null)).toBeNull();
  });
});
