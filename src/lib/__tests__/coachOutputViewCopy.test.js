import {
  DAY_NAMES_FULL,
  CONFIDENCE_CAPTIONS,
  buildFocus,
  buildOffItems,
  weekRangeLabel,
} from '../coachOutput/viewCopy';

describe('coach output view copy helpers', () => {
  test('formats coach week ranges and fails closed for invalid input', () => {
    expect(weekRangeLabel(new Date(2026, 4, 19).getTime())).toBe('19 May to 25 May 2026');
    expect(weekRangeLabel(null)).toBe('Week dates unavailable');
  });

  test('builds off-items from mapped adherence and recovery signals', () => {
    expect(buildOffItems(
      { sessionsCompleted: 2, sessionsPlanned: 4 },
      {
        sleepHours: 6.2,
        jointPain: true,
        energyScore: 2,
        sorenessScore: 4,
        calsAdherence: 'no',
      },
    )).toEqual([
      'You hit 2 of 4 sessions.',
      'Your sleep averaged 6.2 hours.',
      'You flagged joint pain.',
      'Energy was low this week.',
      'Soreness was high.',
      'You were off your calorie target.',
    ]);
  });

  test('prioritises focus copy without recomputing coach policy', () => {
    expect(buildFocus(
      { sessionsCompleted: 4, sessionsPlanned: 4, trend: { delta: 0, deltaLabel: 'Log morning weight' } },
      {},
    )).toBe('Log morning weight every day. The trend gets sharper with each log.');

    expect(buildFocus(
      { sessionsCompleted: 4, sessionsPlanned: 4, trend: { delta: 0.1, deltaLabel: 'up' } },
      { sleepHours: 6.1 },
    )).toBe('Sleep is the priority this week. Aim for 7 hours or more. Nothing else moves until it does.');
  });

  test('exports the forward-pull day names and confidence captions used by the screen', () => {
    expect(DAY_NAMES_FULL[0]).toBe('Sunday');
    expect(CONFIDENCE_CAPTIONS).toEqual({
      high: 'Confidence: high. A full week of data sits behind this decision.',
      medium: 'Confidence: medium. Some data was thin this week, so changes are sized cautiously.',
      low: 'Confidence: low. The trend is still building, so this week stays conservative.',
    });
  });
});
