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
  buildWeekRows, splitLead, formatCoachingRate, formatCoachingRateWeight, buildTimingLine, ENERGY_LABELS, SORENESS_LABELS,
} from '../coachOutput/viewCopy';
import { BODY_METRICS_FLAG_LINE } from '../bodyMetricsPolicy';
import { deriveSafetyState, withholdsWeightFigures, SAFETY_STATE_UNKNOWN } from '../safetyState';

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
    expect(rows.map((r) => r.key)).toEqual(['sessions', 'prs', 'rate', 'food', 'calories', 'energy', 'soreness']);
  });

  test('values read as the check-in and the chips did', () => {
    expect(k.sessions.value).toBe('2 of 4');
    expect(k.prs.value).toBe('7');
    expect(k.weight).toBeUndefined(); // item 15: one weight row, the coaching trend
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

  test('the scale reading moves into the coaching trend row\'s info sheet (item 15)', () => {
    expect(k.rate.tooltip).toBe('rate gloss Your scale reading over the same seven days: +1.1 lbs.');
  });

  test('with no rate (an output from before C10F) the scale reading stays as the one weight row', () => {
    const old = byKey(buildWeekRows({ ...FOUNDER_WEEK, rate: null }));
    expect(old.rate).toBeUndefined();
    expect(old.weight.value).toBe('+1.1 lbs');
    expect(old.weight.tooltip).toBe('gloss');
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
    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    expect(byKey(buildWeekRows({ context: { training: { progress: { signal: 'poor' } } } })).lifts)
      .toEqual(expect.objectContaining({ value: 'Not going up', mark: 'attention' }));
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


// D228 item 2, tier c (founder 2026-10-15): under an OPEN FLAG, a failed read or
// the unknown state the weight chip and the coaching-rate row print the Body
// metrics line in the chip's place and no rate value; under calm alone, and for
// everyone who is neither calm nor flagged, both rows are exactly as before.
describe('buildWeekRows: the weight figures under the safety state (D228 item 2, tier c)', () => {
  const STATES = {
    'neither calm nor flagged': deriveSafetyState({ mode: 'normal', edFlag: null }),
    'calm alone': deriveSafetyState({ mode: 'calm', edFlag: null }),
    'an open flag': deriveSafetyState({ mode: 'normal', edFlag: { id: 'f' } }),
    'a failed flag read': deriveSafetyState({ mode: 'normal', edFlag: 'read_failed' }),
    'a failed wellbeing read': deriveSafetyState({ mode: 'read_failed', edFlag: null }),
    'the unknown state': SAFETY_STATE_UNKNOWN,
  };
  const build = (state) => byKey(buildWeekRows({ ...FOUNDER_WEEK, withholdWeight: withholdsWeightFigures(state) }));

  test.each(['neither calm nor flagged', 'calm alone'])('%s: the chip and the rate are exactly as before', (name) => {
    const rows = buildWeekRows({ ...FOUNDER_WEEK, withholdWeight: withholdsWeightFigures(STATES[name]) });
    expect(rows).toEqual(buildWeekRows(FOUNDER_WEEK));
    const k = byKey(rows);
    expect(k.weight).toBeUndefined();
    expect(k.rate.value).toBe('Gaining 0.28%/wk');
  });

  test.each([
    'an open flag', 'a failed flag read', 'a failed wellbeing read', 'the unknown state',
  ])('%s: the Body metrics line in the chip\'s place, no direction glyph, no rate row', (name) => {
    const k = build(STATES[name]);
    expect(k.weight.value).toBe(BODY_METRICS_FLAG_LINE);
    expect(k.weight.value).toBe('Your weigh-ins are kept here.');
    expect(k.weight.icon).not.toMatch(/arrow/); // the glyph is the direction, so it goes too
    expect(k.weight.tooltip).toBeNull(); // the gloss points at the coaching trend, which is gone
    expect(k.weight.mark).toBeNull();
    expect(k.weight.wrap).toBe(true); // the sentence wraps at the largest text size instead of clipping
    expect(k.rate).toBeUndefined();
    const printed = JSON.stringify(Object.values(k));
    expect(printed).not.toMatch(/1\.1|0\.28|%\/wk|Gaining|Losing|Steady/);
  });

  test('every other row is untouched by the withhold', () => {
    const open = build(STATES['an open flag']);
    const base = byKey(buildWeekRows(FOUNDER_WEEK));
    for (const key of ['sessions', 'prs', 'food', 'calories', 'energy', 'soreness']) expect(open[key]).toEqual(base[key]);
    expect(buildWeekRows({ ...FOUNDER_WEEK, withholdWeight: true }).map((r) => r.key))
      .toEqual(['sessions', 'prs', 'weight', 'food', 'calories', 'energy', 'soreness']);
  });

  test('the line is the shared constant, not retyped here', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'coachOutput', 'viewCopy.js'), 'utf8');
    expect(src).toMatch(/import \{ BODY_METRICS_FLAG_LINE \} from '\.\.\/bodyMetricsPolicy';/);
    expect(src).not.toMatch(/Your weigh-ins are kept here/);
  });
});

// Owner order 2026-10-20 (Stage 2, item 12 safety part): under the safety
// verdict the Coaching decision screen showed "Calories: Under target" and
// "Food logged 1 of 7 days" with an open ED flag, because the builder took no
// safety input. Under `suppressed` (calm, an open flag, a failed read, the
// unknown state) the food rows go and no row carries a good/attention mark.
describe('buildWeekRows: food rows and marks under the safety verdict', () => {
  const STATES = {
    'calm alone': deriveSafetyState({ mode: 'calm', edFlag: null }),
    'an open flag': deriveSafetyState({ mode: 'normal', edFlag: { id: 'f' } }),
    'a failed flag read': deriveSafetyState({ mode: 'normal', edFlag: 'read_failed' }),
    'a failed wellbeing read': deriveSafetyState({ mode: 'read_failed', edFlag: null }),
    'the unknown state': SAFETY_STATE_UNKNOWN,
  };
  // A week with every mark the builder can give and both food rows present.
  const MARKED_WEEK = {
    ...FOUNDER_WEEK,
    context: {
      nutrition: { coverage: { signal: 'poor', value: 1 } },
      training: { progress: { signal: 'poor' } },
      recovery: { systemic: { signal: 'poor' } },
    },
    checkin: { calsAdherence: 'under', energyScore: 1, sorenessScore: 5, sleepHours: 5, jointPain: true },
  };
  const rowsFor = (state) => buildWeekRows({
    ...MARKED_WEEK, withholdWeight: withholdsWeightFigures(state), suppressed: state.suppressed,
  });

  test('the fixture really carries both food rows and marks when nothing is suppressed', () => {
    const rows = buildWeekRows(MARKED_WEEK);
    expect(rows.map((r) => r.key)).toEqual(expect.arrayContaining(['food', 'calories']));
    expect(rows.some((r) => r.mark)).toBe(true);
  });

  test.each(Object.keys(STATES))('%s: no Food logged row, no Calories row, no mark on any row', (name) => {
    expect(STATES[name].suppressed).toBe(true);
    const rows = rowsFor(STATES[name]);
    const keys = rows.map((r) => r.key);
    expect(keys).not.toContain('food');
    expect(keys).not.toContain('calories');
    expect(rows.every((r) => r.mark === null)).toBe(true);
    expect(JSON.stringify(rows)).not.toMatch(/Under target|Off target|Hit your target|Over target|of 7 days/);
  });

  test('the other facts are still stated, only unmarked', () => {
    const k = byKey(rowsFor(STATES['calm alone']));
    expect(k.sessions.value).toBe('2 of 4');
    expect(k.energy.value).toBe('Low');
    expect(k.joints.value).toBe('Flagged');
  });

  test('the screen passes the safetyState.js verdict, not its own reading of calm or the flag', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'screens', 'CoachOutputScreen.js'), 'utf8');
    expect(src).toMatch(/buildWeekRows\(\{[\s\S]{0,400}suppressed: safety\.suppressed \|\| edPatternOpen,/);
    expect(src).toMatch(/const safety = useSafetyState\(user\?\.id\);/);
  });
});

describe('formatCoachingRateWeight: the coaching trend in the person\'s own body-weight unit (item 15)', () => {
  test('kg users read kg a week; lb and stone users read lbs a week', () => {
    // 0.5% of 80 kg is 0.4 kg a week.
    expect(formatCoachingRateWeight(-0.5, 80, 'kg')).toBe('-0.4 kg a week');
    expect(formatCoachingRateWeight(-0.5, 80, 'lbs')).toBe('-0.88 lbs a week');
    expect(formatCoachingRateWeight(-0.5, 80, 'st')).toBe('-0.88 lbs a week');
    expect(formatCoachingRateWeight(0.25, 80, 'kg')).toBe('+0.2 kg a week');
  });
  test('the engine\'s steady band, and a rate that rounds to nothing, read Steady', () => {
    expect(formatCoachingRateWeight(0.01, 80, 'kg')).toBe('Steady');
    expect(formatCoachingRateWeight(0.02, 20, 'kg')).toBe('Steady');
  });
  test('no weight or no rate gives no figure, never the old percentage', () => {
    expect(formatCoachingRateWeight(-0.5, null, 'kg')).toBeNull();
    expect(formatCoachingRateWeight(-0.5, 0, 'kg')).toBeNull();
    expect(formatCoachingRateWeight(null, 80, 'kg')).toBeNull();
    expect(formatCoachingRateWeight(NaN, 80, 'kg')).toBeNull();
  });
});

describe('buildTimingLine: when a decision is looked at again, on every decision (item 15)', () => {
  test('names the check-in day, or says next check-in when unknown', () => {
    expect(buildTimingLine({ checkinDayName: 'Sunday' })).toBe('Your coach looks at this again at your Sunday check-in.');
    expect(buildTimingLine()).toBe('Your coach looks at this again at your next check-in.');
  });
  test('a change waiting for a tap says from when it starts', () => {
    expect(buildTimingLine({ checkinDayName: 'Monday', pending: true }))
      .toBe('A change starts from the moment you tap Apply. Your coach looks at this again at your Monday check-in.');
  });
  test('it carries no weight, food or calorie figure', () => {
    expect(buildTimingLine({ checkinDayName: 'Sunday', pending: true })).not.toMatch(/\d|kg|lb|kcal|calorie/i);
  });
});
