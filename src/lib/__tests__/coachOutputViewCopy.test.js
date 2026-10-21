import {
  DAY_NAMES_FULL,
  buildConfidenceLine,
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
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    expect(buildFocus(
      { sessionsCompleted: 4, sessionsPlanned: 4, trend: { delta: 0, deltaLabel: 'Log morning weight' } },
      {},
    )).toBe('Log your morning weight every day. Each weigh-in makes your weight trend clearer.');

    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    expect(buildFocus(
      { sessionsCompleted: 4, sessionsPlanned: 4, trend: { delta: 0.1, deltaLabel: 'up' } },
      { sleepHours: 6.1 },
    )).toBe('Sleep is the priority this week. Aim for 7 hours or more. Nothing else will improve until your sleep does.');
  });

  test('exports the forward-pull day names and confidence line used by the screen', () => {
    expect(DAY_NAMES_FULL[0]).toBe('Sunday');
    // Item 12: the line names its basis (weigh-ins and the check-in), never food or sessions.
    expect(buildConfidenceLine('high', 6)).toBe('Confidence: high. Based on 6 morning weigh-ins and your check-in.');
    expect(buildConfidenceLine('high', 1)).toBe('Confidence: high. Based on 1 morning weigh-in and your check-in.');
    expect(buildConfidenceLine('high')).toBe('Confidence: high. Based on your morning weigh-ins and your check-in.');
    expect(buildConfidenceLine('medium', 3)).toBe('Confidence: medium. Based on 3 morning weigh-ins and your check-in. That is less to go on than usual, so your coach waits an extra week before changing your calorie target.');
    expect(buildConfidenceLine('low', 4)).toBe('Confidence: low. Based on 4 morning weigh-ins and your check-in. Your weight trend is still taking shape, so your coach waits an extra week before changing your calorie target.');
    expect(buildConfidenceLine('data_hold', 2)).toBeNull();
    expect(buildConfidenceLine('high', 6)).not.toMatch(/full week|session|food/i);
  });
});

describe('C6 RB6-9 (D97-25): a decision older than its own week says so', () => {
  const { decisionAgeNote } = require('../coachOutput/viewCopy');
  const WEEK = 7 * 86400000;

  test('the current or immediately reviewed week carries no age note', () => {
    const live = 1770000000000;
    expect(decisionAgeNote(live, live)).toBeNull();
    expect(decisionAgeNote(live - WEEK, live)).toBeNull();
  });

  test('an older decision states it has not been updated since, without urgency', () => {
    const live = 1770000000000;
    const note = decisionAgeNote(live - 12 * WEEK, live);
    expect(note).toBe('This decision covers the dates above and has not been updated since.');
    expect(note).not.toMatch(/—/);
    expect(note).not.toMatch(/now|hurry|expired/i);
  });

  test('undated inputs cannot prove age and stay silent', () => {
    expect(decisionAgeNote(null, 1770000000000)).toBeNull();
    expect(decisionAgeNote(1770000000000, undefined)).toBeNull();
  });
});
