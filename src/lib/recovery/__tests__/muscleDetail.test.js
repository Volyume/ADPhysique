/**
 * muscleDetail.test.js -- D219 lanes A5 and B4 (design 5.1, 5.3 and F16): what a
 * muscle's detail on the Recovery screen says.
 *
 * Founder (register D219): "we need to make sure recovery shows that and explains
 * why. The upper tier of sets per week and things. As I did 27 sets of biceps which
 * is upper tier but it shows I have overtrained or something. We need a
 * demonstration on recovery that this muscle has been selected to be brought up or
 * extra volume and this is within that", and "biceps recover quicker than back".
 *
 * What this pins, and why:
 *   - The week's figures are the heatmap's own (one number everywhere): credit from
 *     calculateWeeklyVolume over the Monday-anchored week so far, split into direct
 *     sets and indirect sets at half credit so "27 sets counted: 20 direct and 14
 *     indirect at half credit" always adds up to the credit it explains.
 *   - A muscle the plan raised reads, first, with the reason ("Biceps are your focus
 *     this block: 27 sets, inside the focus range of 20 to 30."), then the band, in
 *     the one judgement's words: never "too much", never "overtrained".
 *   - The detail shows the muscle's OWN clock in plain words, and the clocks differ:
 *     biceps are estimated at about 2 days and back at about 2.5, each with a range,
 *     stated as estimates (the evidence for differences between muscles is weak,
 *     design 4.13), so "biceps recover quicker than back" is shown and not asserted.
 *   - The estimate after the last session, with its range and the hours that have
 *     passed, the spacing of the sessions the model counted, the most sets in one
 *     session against its limit, and the session note only when above the cap.
 *   - Every line describes and never instructs (D204), carries no em dash, and the
 *     module is pure (no I/O, no clock read, no randomness).
 */
import fs from 'fs';
import path from 'path';
import {
  weekFigures, clockWords, clockLine, spacingLine, estimateLine, muscleDetailRows,
} from '../muscleDetail';
import { calculateWeeklyVolume } from '../../algorithms';
import { recoveryHours } from '../constants';

const HOUR = 3600000;
const DAY = 24 * HOUR;
// Wednesday 7 October 2026, 12:00 local: its Monday is 5 October.
const NOW = new Date(2026, 9, 7, 12, 0, 0).getTime();
const MONDAY_9 = new Date(2026, 9, 5, 9, 0, 0).getTime();
const SUNDAY_20 = new Date(2026, 9, 4, 20, 0, 0).getTime(); // last week

const EXERCISES = {
  curl: { id: 'curl', primaryMuscle: 'biceps', secondaryMuscles: [] },
  row: { id: 'row', primaryMuscle: 'back', secondaryMuscles: ['biceps'] },
};
const set = (exerciseId, workoutId, createdAt, extra = {}) => ({
  id: `${workoutId}-${exerciseId}-${Math.random()}`, exerciseId, workoutId, createdAt, setType: 'straight', ...extra,
});
const many = (n, exerciseId, workoutId, at, extra) => Array.from({ length: n }, () => set(exerciseId, workoutId, at, extra));

const NEVER = /\b(you should|should|must|try to|consider|take it easy|train more|train less|add sets|cut back|overtrain(ed|ing)?|too much|near the limit)\b/i;

describe('weekFigures: the heatmap\'s own week, split into direct and indirect sets', () => {
  // 20 curls + 14 rows: biceps credit 20 + 14 x 0.5 = 27 (the founder's case).
  const sets = [
    ...many(10, 'curl', 'w1', MONDAY_9),
    ...many(10, 'curl', 'w2', MONDAY_9 + 2 * DAY),
    ...many(7, 'row', 'w1', MONDAY_9),
    ...many(7, 'row', 'w2', MONDAY_9 + 2 * DAY),
    ...many(5, 'curl', 'w0', SUNDAY_20), // last week: never counted
  ];
  const figures = weekFigures({ sets, exerciseMap: EXERCISES, nowMs: NOW });

  test('the credit is calculateWeeklyVolume\'s, and the direct and indirect sets add up to it', () => {
    const credit = calculateWeeklyVolume(sets.filter((s) => s.createdAt >= MONDAY_9), EXERCISES);
    expect(figures.biceps.credit).toBe(27);
    expect(figures.biceps.credit).toBe(credit.biceps.workingSets);
    expect(figures.biceps.direct).toBe(20);
    expect(figures.biceps.indirect).toBe(14);
    expect(figures.biceps.direct + 0.5 * figures.biceps.indirect).toBe(figures.biceps.credit);
    expect(figures.back).toMatchObject({ credit: 14, direct: 14, indirect: 0 });
  });

  test('the most in one session, in credit and in direct sets', () => {
    // Two sessions of 10 curls and 7 rows: 13.5 credit and 10 direct each.
    expect(figures.biceps.sessionCredit).toBe(13.5);
    expect(figures.biceps.sessionDirect).toBe(10);
  });

  test('warm-ups, last week and a muscle with no sets are not in the week', () => {
    const f = weekFigures({
      sets: [...many(3, 'curl', 'w1', MONDAY_9, { setType: 'warmup' }), ...many(4, 'curl', 'w0', SUNDAY_20)],
      exerciseMap: EXERCISES,
      nowMs: NOW,
    });
    expect(f.biceps).toBeUndefined();
  });

  test('a non-finite "now" reads as no week at all, never a crash', () => {
    expect(weekFigures({ sets, exerciseMap: EXERCISES, nowMs: NaN })).toEqual({});
    expect(weekFigures({ sets: null, exerciseMap: EXERCISES, nowMs: NOW })).toEqual({});
  });
});

describe('the clock: each muscle\'s own, in plain words, as an estimate', () => {
  test('biceps and back differ, and each carries a range', () => {
    const biceps = clockWords('biceps');
    const back = clockWords('back');
    expect(biceps.hours).toBe(recoveryHours('biceps'));
    expect(biceps.hours).toBeLessThan(back.hours); // the founder: biceps recover quicker than back
    expect(biceps.text).toBe('about 2 days (range 1.5 to 2.5 days)');
    expect(back.text).toBe('about 2.5 days (range 2 to 3 days)');
  });

  test('the line is an estimate, names the muscle\'s own clock and compares with back (or biceps for back)', () => {
    expect(clockLine('biceps')).toBe(
      'Biceps are estimated at about 2 days (range 1.5 to 2.5 days) after a session of about 6 sets. Muscles differ: back is estimated at about 2.5 days (range 2 to 3 days).',
    );
    expect(clockLine('back')).toBe(
      'Back is estimated at about 2.5 days (range 2 to 3 days) after a session of about 6 sets. Muscles differ: biceps are estimated at about 2 days (range 1.5 to 2.5 days).',
    );
  });

  test('a muscle whose clock equals back\'s does not claim a difference', () => {
    expect(recoveryHours('chest')).toBe(recoveryHours('back'));
    expect(clockLine('chest')).toBe('Chest is estimated at about 2.5 days (range 2 to 3 days) after a session of about 6 sets.');
  });
});

describe('the estimate after the last session, and the spacing of the sessions counted', () => {
  const entry = {
    muscle: 'biceps',
    contributingSessions: [
      { workoutId: 'a', endMs: NOW - 200 * HOUR, sets: 6, hoursT: 50 },
      { workoutId: 'b', endMs: NOW - 144 * HOUR, sets: 6, hoursT: 48 },
      { workoutId: 'c', endMs: NOW - 60 * HOUR, sets: 9, hoursT: 59 },
    ],
  };

  test('the spacing is the shortest to the longest gap, in hours', () => {
    // 56 hours, then 84 hours.
    expect(spacingLine(entry)).toBe('Sessions were 56 to 84 hours apart.');
  });

  test('one gap reads "about N hours apart"; one session or none reads nothing', () => {
    expect(spacingLine({ contributingSessions: entry.contributingSessions.slice(1) })).toBe('Sessions were about 84 hours apart.');
    expect(spacingLine({ contributingSessions: entry.contributingSessions.slice(2) })).toBeNull();
    expect(spacingLine({ contributingSessions: [] })).toBeNull();
    expect(spacingLine(null)).toBeNull();
  });

  test('the estimate: about T hours with its range, the hours that have passed, and "Estimated, not measured"', () => {
    expect(estimateLine(entry, NOW)).toBe(
      'Estimated recovery after the last session: about 59 hours (range 44 to 74); 60 hours have passed. Estimated, not measured.',
    );
  });

  test('no clock on the last session, or no sessions, reads nothing', () => {
    expect(estimateLine({ contributingSessions: [{ endMs: NOW - HOUR, sets: 3 }] }, NOW)).toBeNull();
    expect(estimateLine({ contributingSessions: [] }, NOW)).toBeNull();
    expect(estimateLine(null, NOW)).toBeNull();
  });
});

describe('muscleDetailRows: the rows behind a muscle\'s estimate', () => {
  const sets = [
    ...many(10, 'curl', 'w1', MONDAY_9),
    ...many(10, 'curl', 'w2', MONDAY_9 + 2 * DAY),
    ...many(7, 'row', 'w1', MONDAY_9),
    ...many(7, 'row', 'w2', MONDAY_9 + 2 * DAY),
  ];
  const figures = weekFigures({ sets, exerciseMap: EXERCISES, nowMs: NOW });
  const entry = {
    muscle: 'biceps',
    contributingSessions: [
      { workoutId: 'w1', endMs: NOW - 60 * HOUR, sets: 13.5, hoursT: 59 },
      { workoutId: 'w2', endMs: NOW - 4 * HOUR, sets: 13.5, hoursT: 59 },
    ],
  };
  const rowsOf = (over = {}) => muscleDetailRows({
    muscle: 'biceps', entry, role: 'focus', week: figures.biceps, nowMs: NOW, ...over,
  });
  const value = (rows, label) => rows.find((r) => r.label === label)?.value;

  test('the founder\'s case: a focus muscle at 27 sets reads inside its focus range, with the reason, first', () => {
    const rows = rowsOf();
    expect(rows[0]).toEqual({
      label: 'In your plan',
      value: 'Biceps are your focus this block: 27 sets, inside the focus range of 20 to 30.',
    });
    expect(value(rows, 'This week so far')).toBe('27 sets counted: 20 direct and 14 indirect at half credit.');
    expect(value(rows, 'Band')).toBe(
      'Within your focus range for biceps: you picked it to bring up. Studies have found small extra gains at weekly totals like this.',
    );
  });

  test('the same 27 sets for a muscle the plan did not raise: focus-level volume, described, never blamed', () => {
    const rows = rowsOf({ role: 'standard' });
    expect(rows.find((r) => r.label === 'In your plan')).toBeUndefined();
    expect(value(rows, 'Band')).toBe('Above the normal growth range. This is focus-level volume for a muscle that is not a focus in your plan.');
  });

  test('the most in one session, against its limit (12 for a focus muscle, 11 for any other)', () => {
    expect(value(rowsOf(), 'Most in one session')).toBe('13.5 sets (limit for a focus muscle: 12)');
    expect(value(rowsOf({ role: 'standard' }), 'Most in one session')).toBe('13.5 sets (limit for this muscle: 11)');
  });

  test('above the session cap the one band module\'s own session line is added, and only then', () => {
    const rows = rowsOf({ role: 'standard' });
    expect(value(rows, 'Session')).toMatch(/^More than most studies have tested in one session/);
    const small = weekFigures({ sets: many(6, 'curl', 'w1', MONDAY_9), exerciseMap: EXERCISES, nowMs: NOW });
    expect(value(muscleDetailRows({ muscle: 'biceps', entry, role: 'standard', week: small.biceps, nowMs: NOW }), 'Session')).toBeUndefined();
  });

  test('the clock, the estimate and the spacing are rows of the same detail', () => {
    const rows = rowsOf();
    expect(value(rows, 'Recovery clock')).toBe(clockLine('biceps'));
    expect(value(rows, 'Estimate')).toBe(estimateLine(entry, NOW));
    expect(value(rows, 'Spacing')).toBe('Sessions were about 56 hours apart.');
  });

  test('a muscle with no sets this week and no recent session still shows its role and its own clock', () => {
    const rows = muscleDetailRows({ muscle: 'biceps', entry: null, role: 'focus', week: null, nowMs: NOW });
    expect(rows).toEqual([
      { label: 'In your plan', value: 'Focus: you picked biceps to bring up.' },
      { label: 'This week so far', value: 'No sets counted yet.' },
      { label: 'Recovery clock', value: clockLine('biceps') },
    ]);
  });

  test('a muscle the plan holds says "Maintained."; a standard muscle with no sets says nothing about its role', () => {
    expect(muscleDetailRows({ muscle: 'abs', entry: null, role: 'maintenance', week: null, nowMs: NOW })[0])
      .toEqual({ label: 'In your plan', value: 'Maintained.' });
    expect(muscleDetailRows({ muscle: 'abs', entry: null, role: 'standard', week: null, nowMs: NOW })[0].label).toBe('This week so far');
  });

  test('no row, for any role or total, blames, instructs or carries an em dash (D204)', () => {
    for (const role of ['focus', 'raised', 'standard', 'maintenance']) {
      for (const n of [0, 2, 6, 12, 20, 27, 36, 50]) {
        const week = n ? weekFigures({ sets: many(n, 'curl', 'w1', MONDAY_9), exerciseMap: EXERCISES, nowMs: NOW }).biceps : null;
        for (const row of muscleDetailRows({ muscle: 'biceps', entry, role, week, nowMs: NOW })) {
          expect(`${row.label} ${row.value}`).not.toMatch(NEVER);
          expect(`${row.label} ${row.value}`).not.toContain('—');
        }
      }
    }
  });
});

describe('the module is pure (source guard)', () => {
  test('no I/O, no store, no clock read, no randomness', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'muscleDetail.js'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const needle of ['Date.now(', 'Math.random(', "from '../database'", 'store/useAppStore', 'async-storage', 'require(']) {
      expect(src).not.toContain(needle);
    }
  });
});
