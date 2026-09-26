/**
 * coachOutputWeekRows.test.js
 *
 * D206 (founder order 2026-09-26: "Redesign it in line with the rest of the
 * app ... Cut the duplicate."). Pins the "Your week" rows builder: every
 * fact once, in training, body, food, recovery order; marks only where a
 * fact is training effort or a wellbeing answer worth a look; a body-weight
 * row and a food row NEVER carry a mark (colour is never a verdict on body
 * weight, and conservatively never on food); the check-in's own scale
 * words; and the sentence splitter the held rows use, which never changes
 * a word.
 */
import fs from 'fs';
import path from 'path';
import {
  buildWeekRows, splitLead, formatCoachingRate, ENERGY_LABELS, SORENESS_LABELS,
} from '../coachOutput/viewCopy';

const FOUNDER_WEEK = {
  sessionsCompleted: 2,
  sessionsPlanned: 4,
  prsThisWeek: 7,
  weight: { value: '+1.1 lbs', icon: 'arrow-up-outline', label: '7-day trend', tooltip: 'gloss' },
  rate: { value: 'gaining 0.28%/wk', label: 'Coaching trend', tooltip: 'rate gloss' },
  context: { nutrition: { coverage: { signal: 'unknown', value: 0 } } },
  checkin: { calsAdherence: 'yes', energyScore: 4, sorenessScore: 1 },
};

const byKey = (rows) => Object.fromEntries(rows.map((r) => [r.key, r]));

describe('buildWeekRows: the founder\'s week of 21 September', () => {
  const rows = buildWeekRows(FOUNDER_WEEK);
  const k = byKey(rows);

  test('rows come in training, body, food, recovery order', () => {
    expect(rows.map((r) => r.key)).toEqual(['sessions', 'prs', 'weight', 'rate', 'food', 'calories', 'energy', 'soreness']);
  });

  test('values read as the check-in and the chips did', () => {
    expect(k.sessions.value).toBe('2 of 4');
    expect(k.prs.value).toBe('7');
    expect(k.weight.value).toBe('+1.1 lbs');
    expect(k.rate.value).toBe('Gaining 0.28%/wk');
    expect(k.food.value).toBe('0 of 7 days');
    expect(k.calories.value).toBe('Hit your target');
    expect(k.energy.value).toBe('Good');
    expect(k.soreness.value).toBe('None');
  });

  test('two of four sessions is worth a look; seven PRs is marked done', () => {
    expect(k.sessions.mark).toBe('attention');
    expect(k.prs.mark).toBe('good');
  });

  test('tooltips travel with the weight and rate rows', () => {
    expect(k.weight.tooltip).toBe('gloss');
    expect(k.rate.tooltip).toBe('rate gloss');
  });
});

describe('marks are sparse, and never on body weight or food', () => {
  test('weight, rate, food and calorie rows carry no mark whatever the values', () => {
    for (const cals of ['yes', 'no', 'under', 'over', 'untracked']) {
      for (const days of [0, 3, 7]) {
        const rows = buildWeekRows({
          ...FOUNDER_WEEK,
          context: { nutrition: { coverage: { signal: days >= 4 ? 'good' : 'unknown', value: days } } },
          checkin: { calsAdherence: cals },
        });
        for (const r of rows.filter((x) => ['weight', 'rate', 'food', 'calories'].includes(x.key))) {
          expect(r.mark).toBeNull();
        }
      }
    }
  });

  test('sessions: all done is good, under three quarters is attention, between is unmarked', () => {
    const mark = (done, planned) => byKey(buildWeekRows({ sessionsCompleted: done, sessionsPlanned: planned })).sessions.mark;
    expect(mark(4, 4)).toBe('good');
    expect(mark(5, 4)).toBe('good');
    expect(mark(3, 4)).toBeNull();
    expect(mark(2, 4)).toBe('attention');
    expect(mark(0, 3)).toBe('attention');
  });

  test('wellbeing answers are marked only when worth a look', () => {
    const k = (checkin) => byKey(buildWeekRows({ checkin }));
    expect(k({ energyScore: 2 }).energy.mark).toBe('attention');
    expect(k({ energyScore: 3 }).energy.mark).toBeNull();
    expect(k({ sorenessScore: 4 }).soreness.mark).toBe('attention');
    expect(k({ sorenessScore: 3 }).soreness.mark).toBeNull();
    expect(k({ sleepHours: 6.2 }).sleep).toEqual(expect.objectContaining({ value: '6.2 h a night', mark: 'attention' }));
    expect(k({ sleepHours: 7.5 }).sleep.mark).toBeNull();
    expect(k({ jointPain: true }).joints).toEqual(expect.objectContaining({ value: 'Flagged', mark: 'attention' }));
  });

  test('main lifts and recovery come from the coach context\'s own signals', () => {
    expect(byKey(buildWeekRows({ context: { training: { progress: { signal: 'good' } } } })).lifts)
      .toEqual(expect.objectContaining({ value: 'Moving up', mark: 'good' }));
    expect(byKey(buildWeekRows({ context: { training: { progress: { signal: 'poor' } } } })).lifts)
      .toEqual(expect.objectContaining({ value: 'Not moving', mark: 'attention' }));
    expect(byKey(buildWeekRows({ context: { recovery: { systemic: { signal: 'poor' } } } })).recovery)
      .toEqual(expect.objectContaining({ value: 'Harder than usual', mark: 'attention' }));
  });
});

describe('absent facts write no row, never a placeholder', () => {
  test('an empty input is no rows', () => {
    expect(buildWeekRows({})).toEqual([]);
  });

  test('a failed diary read (no day count) writes no food row; no PRs writes no PR row', () => {
    const rows = buildWeekRows({ prsThisWeek: 0, context: { nutrition: { coverage: { signal: 'unknown', value: null } } } });
    expect(rows.map((r) => r.key)).toEqual([]);
  });

  test('non-finite numbers never reach a value', () => {
    const rows = buildWeekRows({ sessionsCompleted: NaN, sessionsPlanned: 4, prsThisWeek: Infinity, checkin: { sleepHours: NaN } });
    expect(rows.some((r) => /NaN|Infinity/.test(r.value))).toBe(false);
  });
});

describe('the scale words are the Weekly check-in\'s own', () => {
  test('every energy and soreness word appears on the check-in screen', () => {
    const checkIn = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'WeeklyCheckInScreen.js'), 'utf8');
    for (const word of [...Object.values(ENERGY_LABELS), ...Object.values(SORENESS_LABELS)]) {
      expect(checkIn).toContain(`label: '${word}'`);
    }
  });
});

describe('splitLead never changes a word', () => {
  test('splits at the first full stop into title and reason', () => {
    expect(splitLead('Calories held. Trend is on target.')).toEqual({ title: 'Calories held.', sub: 'Trend is on target.' });
    expect(splitLead('Next check-in: Saturday. Sessions in, and the next read shows it.'))
      .toEqual({ title: 'Next check-in: Saturday.', sub: 'Sessions in, and the next read shows it.' });
  });

  test('one sentence is all title; empty input is an empty title', () => {
    expect(splitLead('Calories held.')).toEqual({ title: 'Calories held.', sub: null });
    expect(splitLead('')).toEqual({ title: '', sub: null });
    expect(splitLead(null)).toEqual({ title: '', sub: null });
  });

  test('the two halves rejoin to the original words', () => {
    const text = 'Training volume held. The sessions already planned have not been run consistently enough this week for adding more to be the answer.';
    const { title, sub } = splitLead(text);
    expect(`${title} ${sub}`).toBe(text);
  });
});

describe('formatCoachingRate: signed like the 7-day row, from the engine\'s own number', () => {
  test('gains and losses carry a sign; the engine\'s steady band reads Steady', () => {
    expect(formatCoachingRate(0.28)).toBe('+0.28%/wk');
    expect(formatCoachingRate(-0.4)).toBe('-0.4%/wk');
    expect(formatCoachingRate(0.01)).toBe('Steady');
    expect(formatCoachingRate(-0.01)).toBe('Steady');
    expect(formatCoachingRate(0)).toBe('Steady');
  });
  test('non-finite input is null, so the stored label is used instead', () => {
    expect(formatCoachingRate(null)).toBeNull();
    expect(formatCoachingRate(NaN)).toBeNull();
    expect(formatCoachingRate(undefined)).toBeNull();
  });
});
