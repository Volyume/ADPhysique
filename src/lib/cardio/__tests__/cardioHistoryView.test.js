import {
  buildCardioWeekWindows,
  cardioTrendAccessibilityLabel,
  cardioTrendWhenLabel,
  cardioWeekRangeLabel,
  prettyCardioDate,
  trimEmptyTrendWeeks,
} from '../cardioHistoryView';

describe('cardioHistoryView', () => {
  test('formats day headers and week ranges in the Cardio History voice', () => {
    expect(prettyCardioDate('2026-07-05')).toBe('Sun 5 Jul');
    expect(cardioWeekRangeLabel('2026-07-01', '2026-07-07')).toBe('1 to 7 Jul');
    expect(cardioWeekRangeLabel('2026-06-29', '2026-07-05')).toBe('29 Jun to 5 Jul');
    expect(cardioWeekRangeLabel('not-a-date', '2026-07-05')).toBe('');
  });

  test('builds newest-first 7-day windows using the supplied app day key', () => {
    const dayKey = jest.fn((ms) => `day-${Math.round(ms / 1000)}`);
    const windows = buildCardioWeekWindows(2, 100 * 24 * 60 * 60 * 1000, dayKey);

    expect(windows).toEqual([
      { fromKey: 'day-8121600', toKey: 'day-8640000' },
      { fromKey: 'day-7516800', toKey: 'day-8035200' },
    ]);
    expect(dayKey).toHaveBeenCalledTimes(4);
  });

  test('trims trailing empty older weeks but keeps this week', () => {
    expect(trimEmptyTrendWeeks([
      { sessions: 0 },
      { sessions: 0 },
    ])).toEqual([{ sessions: 0 }]);

    expect(trimEmptyTrendWeeks([
      { sessions: 1 },
      { sessions: 0 },
      { sessions: 2 },
      { sessions: 0 },
    ])).toEqual([
      { sessions: 1 },
      { sessions: 0 },
      { sessions: 2 },
    ]);
  });

  test('builds visible and spoken trend labels without grading missed cardio red', () => {
    const older = { fromKey: '2026-06-22', toKey: '2026-06-28' };
    expect(cardioTrendWhenLabel({}, 0)).toBe('This week');
    expect(cardioTrendWhenLabel({}, 1)).toBe('Last week');
    expect(cardioTrendWhenLabel(older, 2)).toBe('22 to 28 Jun');

    expect(cardioTrendAccessibilityLabel({
      when: 'This week',
      sessions: 2,
      goal: 3,
      mark: 'Mostly',
    })).toBe('This week, 2 of 3 sessions, Mostly');
    expect(cardioTrendAccessibilityLabel({
      when: 'Last week',
      sessions: 1,
      goal: 0,
      mark: null,
    })).toBe('Last week, 1 sessions');
  });
});
