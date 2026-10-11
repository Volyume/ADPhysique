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
  durationText, rangeText, recoveryTimeline, clockComparison, intentFor, weekPanel,
} from '../muscleDetail';
import { readyWindow, readyHoursAfterOneSession, buildMuscleRecoveryMap } from '../muscleRecoveryModel';
import { readyByClause } from '../nextInPlan';
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

// RE-ANCHORED D224 (founder 2026-10-11: "Inaccuracies on reported recovery
// too. Side delts ready tomorrow on Today. But different in recovery."): the
// usual time is the time one session of about 6 sets takes to read as READY
// (the same 90% every ready-by on the screen means), never the time to clear
// the session completely, so it and the muscle's own estimate measure one
// thing. Under 72 hours it reads in hours, so biceps and back still differ.
describe('the usual time: each muscle\'s own, in plain words, as an estimate', () => {
  test('biceps and back differ, each is the ready time of one session, and each carries a range', () => {
    const biceps = clockWords('biceps');
    const back = clockWords('back');
    expect(biceps.hours).toBeCloseTo(readyHoursAfterOneSession(recoveryHours('biceps')), 9);
    expect(biceps.hours).toBeLessThan(recoveryHours('biceps'));
    expect(biceps.hours).toBeLessThan(back.hours); // the founder: biceps recover quicker than back
    expect(biceps.text).toBe('about 43 hours (range 32 to 54 hours)');
    expect(back.text).toBe('about 54 hours (range 40 to 67 hours)');
  });

  test('the line is an estimate of readiness, names the muscle\'s own time and compares with back (or biceps for back)', () => {
    expect(clockLine('biceps')).toBe(
      'Biceps are usually estimated ready about 43 hours (range 32 to 54 hours) after a session of about 6 sets. Muscles differ: back is usually estimated ready about 54 hours (range 40 to 67 hours).',
    );
    expect(clockLine('back')).toBe(
      'Back is usually estimated ready about 54 hours (range 40 to 67 hours) after a session of about 6 sets. Muscles differ: biceps are usually estimated ready about 43 hours (range 32 to 54 hours).',
    );
  });

  test('a muscle whose time equals back\'s does not claim a difference', () => {
    expect(recoveryHours('chest')).toBe(recoveryHours('back'));
    expect(clockLine('chest')).toBe('Chest is usually estimated ready about 54 hours (range 40 to 67 hours) after a session of about 6 sets.');
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

  // RE-ANCHORED D224: the estimate is the one ready estimate (the model's
  // readyWindow, every counted session compounding), never the last
  // session's own clock alone.
  test('the estimate: ready now once the model reads it ready, with the hours passed and "Estimated, not measured"', () => {
    expect(estimateLine(entry, NOW)).toBe('Estimated ready now; 60 hours have passed since the last session. Estimated, not measured.');
  });

  test("the estimate: still recovering, the ready instant in the card's words, the hours to go and their range", () => {
    const soon = { contributingSessions: [{ workoutId: 'c', endMs: NOW - 4 * HOUR, sets: 6, hoursT: 36 }] };
    const w = readyWindow(soon.contributingSessions, NOW);
    expect(estimateLine(soon, NOW)).toBe(
      `Estimated ready ${readyByClause(w.readyAtMs, NOW)}, in about ${durationText((w.readyAtMs - NOW) / HOUR)} (range ${rangeText((w.earliestMs - NOW) / HOUR, (w.latestMs - NOW) / HOUR)}); 4 hours have passed since the last session. Estimated, not measured.`,
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

// D223 (founder 2026-10-11: "This data for muscles recovery looks horrendous, redesign this areas
// make it understandable, readable and slick."): the same facts as the rows above, as figures a
// panel draws. What this pins: each figure is the one the rows print (one clock, one band, one cap),
// so the drawing and the words never disagree; the durations read as people say them.
describe('D223: the figures the drawn detail reads', () => {
  test('durations: hours under 36, then days to the nearest half; never "0 hours"', () => {
    expect(durationText(0)).toBe('less than an hour');
    expect(durationText(0.4)).toBe('less than an hour');
    expect(durationText(1)).toBe('1 hour');
    expect(durationText(4.2)).toBe('4 hours');
    expect(durationText(35)).toBe('35 hours');
    expect(durationText(36)).toBe('1.5 days');
    expect(durationText(48)).toBe('2 days');
    expect(durationText(60)).toBe('2.5 days');
    expect(rangeText(18, 30)).toBe('18 to 30 hours');
    expect(rangeText(36, 60)).toBe('1.5 to 2.5 days');
    expect(rangeText(24, 24)).toBe('24 hours');
  });

  // RE-ANCHORED D224: the timeline is the one ready estimate.
  test("the timeline is the model's ready window: the ready instant, its range, the hours passed", () => {
    const recovering = { contributingSessions: [
      { workoutId: 'b', endMs: NOW - 26 * HOUR, sets: 5, hoursT: 36 },
      { workoutId: 'c', endMs: NOW - 4 * HOUR, sets: 5, hoursT: 36 },
    ] };
    const tl = recoveryTimeline(recovering, NOW);
    const w = readyWindow(recovering.contributingSessions, NOW);
    const lastEnd = NOW - 4 * HOUR;
    expect(tl.ready).toBe(false);
    expect(tl.passedHours).toBeCloseTo(4, 6);
    expect(tl.readyHours).toBeCloseTo((w.readyAtMs - lastEnd) / HOUR, 6);
    expect(tl.lowHours).toBeLessThanOrEqual(tl.readyHours);
    expect(tl.highHours).toBeGreaterThanOrEqual(tl.readyHours);
    expect(tl.scaleHours).toBe(Math.max(tl.highHours, tl.passedHours));
    expect(tl.readyText).toBe(readyByClause(w.readyAtMs, NOW));
    // Already ready: no range, the bar is the time passed.
    const done = recoveryTimeline({ contributingSessions: [{ workoutId: 'z', endMs: NOW - 100 * HOUR, sets: 6, hoursT: 48 }] }, NOW);
    expect(done.ready).toBe(true);
    expect(done.readyText).toBe('now');
    expect(recoveryTimeline(null, NOW)).toBeNull();
    expect(recoveryTimeline({ contributingSessions: [{ endMs: NOW - HOUR, sets: 3 }] }, NOW)).toBeNull();
  });

  test("D224: the detail's ready instant is the model's own, the one the list row and the card state", () => {
    // Side delts trained yesterday and today (the founder's screenshot): the
    // model's map entry and the detail's window agree to the millisecond.
    const lib = { lat: { id: 'lat', name: 'Lateral Raise', primaryMuscle: 'side_delts', secondaryMuscles: [] } };
    const day = (h) => NOW - h * HOUR;
    const setsOf = (w) => Array.from({ length: 5 }, (_, i) => ({ id: `${w}${i}`, workoutId: w, exerciseId: 'lat', setType: 'straight' }));
    const sessions = [
      { id: 'y', startedAt: day(27), endedAt: day(26), sets: setsOf('y') },
      { id: 't', startedAt: day(5), endedAt: day(4), sets: setsOf('t') },
    ];
    const map = buildMuscleRecoveryMap({ sessions, exerciseById: lib, recoveryRating: 'average', nowMs: NOW });
    const e = map.side_delts;
    expect(e.contributingSessions).toHaveLength(2);
    expect(Number.isFinite(e.readyAtMs)).toBe(true);
    expect(readyWindow(e.contributingSessions, NOW).readyAtMs).toBe(e.readyAtMs);
    expect(recoveryTimeline(e, NOW).readyText).toBe(readyByClause(e.readyAtMs, NOW));
  });

  test('the clocks compared are clockLine\'s: the muscle\'s own first, then back (or biceps for back)', () => {
    const abs = clockComparison('abs');
    expect(abs.map((c) => c.muscle)).toEqual(['abs', 'back']);
    expect(abs[0].hours).toBe(clockWords('abs').hours);
    expect(abs[1].hours).toBe(clockWords('back').hours);
    expect(clockComparison('back').map((c) => c.muscle)).toEqual(['back', 'biceps']);
    expect(abs[1].text).toBe('about 54 hours'); // RE-ANCHORED D224: the usual ready time
    expect(clockComparison('biceps')[0].text).toBe('about 43 hours');
  });

  test('the intent is the rows\' own "In your plan"; a standard muscle has none', () => {
    const week = { credit: 27, direct: 20, indirect: 14, sessionCredit: 13.5, sessionDirect: 10 };
    expect(intentFor({ muscle: 'biceps', role: 'focus', week })).toBe('Biceps are your focus this block: 27 sets, inside the focus range of 20 to 30.');
    expect(intentFor({ muscle: 'abs', role: 'maintenance' })).toBe('Maintained.');
    expect(intentFor({ muscle: 'abs', role: 'standard', week })).toBeNull();
  });

  test('the week panel: the rows\' band and cap, the bar\'s range, the session note only above the cap', () => {
    const week = { credit: 27, direct: 20, indirect: 14, sessionCredit: 13.5, sessionDirect: 10 };
    const focus = weekPanel({ muscle: 'biceps', role: 'focus', week });
    const rows = muscleDetailRows({ muscle: 'biceps', entry: null, role: 'focus', week, nowMs: NOW });
    expect(focus.bandLine).toBe(rows.find((r) => r.label === 'Band').value);
    expect(focus.bandLabel).toBe('Focus range');
    expect(focus.creditText).toBe('27');
    expect(focus.mainText).toBe('20 as the main muscle worked');
    expect(focus.helperText).toBe('14 as a helper, at half credit');
    expect(focus.bar).toEqual({ rangeStart: 2, rangeEnd: 42, bandStart: 20, bandEnd: 30, max: 42 });
    expect(focus.zoneText).toBe('The shaded part is the focus range, 20 to 30 sets a week.');
    expect(focus.sessionCap).toBe(12);
    expect(focus.sessionCapText).toBe('Limit for a focus muscle: 12 sets in one session');
    expect(focus.flagLine).toBe(rows.find((r) => r.label === 'Session').value);
    const standard = weekPanel({ muscle: 'biceps', role: 'standard', week: { ...week, credit: 12, sessionCredit: 6, sessionDirect: 6 } });
    expect(standard.bandLabel).toBe('Normal growth range');
    expect(standard.bar.bandStart).toBe(10);
    expect(standard.bar.bandEnd).toBe(20);
    expect(standard.sessionCap).toBe(11);
    expect(standard.flagLine).toBeNull();
    // A total past the studied top stretches the bar so the dot stays on it.
    expect(weekPanel({ muscle: 'biceps', role: 'standard', week: { ...week, credit: 50 } }).bar.max).toBe(50);
    expect(weekPanel({ muscle: 'biceps', role: 'standard', week: null })).toBeNull();
    expect(weekPanel({ muscle: 'biceps', role: 'standard', week: { ...week, credit: 0 } })).toBeNull();
  });

  test('no figure text blames, instructs or carries an em dash (D204)', () => {
    for (const role of ['focus', 'raised', 'standard', 'maintenance']) {
      for (const credit of [1, 6, 12, 27, 36, 50]) {
        const p = weekPanel({ muscle: 'biceps', role, week: { credit, direct: credit, indirect: 0, sessionCredit: credit, sessionDirect: credit } });
        const words = [p.unit, p.mainText, p.helperText, p.bandLabel, p.bandLine, p.zoneText, p.sessionCapText, p.flagLine].filter(Boolean).join(' ');
        expect(words).not.toMatch(NEVER);
        expect(words).not.toContain('—');
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
