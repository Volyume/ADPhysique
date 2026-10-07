/**
 * Pins buildExerciseHistory (src/lib/exerciseHistory.js), the pure derivation
 * behind the workout logger's HistorySheet, Records segment and bests line
 * (12-BUILD-SPEC sections 2a and 2b). It must: group previous sets by session
 * newest first, mark one best set per session, leave warm-ups out of
 * everything, keep unusable sets in history but out of records, apply the
 * 90-day window, and never throw on empty or malformed input.
 */
import { buildExerciseHistory } from '../exerciseHistory';
import { calculate1RM } from '../algorithms';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0); // 7 Oct 2026
const ago = (days, extraMs = 0) => NOW - days * DAY + extraMs;

const set = (workoutId, weight, reps, createdAt, extra = {}) => ({
  workoutId,
  weight,
  actualReps: reps,
  createdAt,
  setType: 'straight',
  ...extra,
});

const build = (sets, todayWeight) => buildExerciseHistory({ sets, todayWeight, now: NOW, units: 'kg' });

describe('empty and malformed input', () => {
  test.each([[[]], [null], [undefined], ['x'], [{}]])('returns the empty shape for %p', (sets) => {
    const out = build(sets, 70);
    expect(out.history).toEqual([]);
    expect(out.repsAtWeight).toEqual([]);
    expect(out.bests).toBeNull();
    for (const period of [out.records.lifetime, out.records.threeMonths]) {
      expect(period).toEqual({
        heaviest: null,
        mostRepsAtWeight: null,
        bestEstimatedMax: null,
        bestSessionVolume: null,
      });
    }
  });

  test('no arguments at all does not throw', () => {
    expect(() => buildExerciseHistory()).not.toThrow();
    expect(buildExerciseHistory().bests).toBeNull();
  });

  test('only warm-ups behaves as empty', () => {
    const out = build([set('a', 40, 10, ago(3), { setType: 'warmup' })], 40);
    expect(out.history).toEqual([]);
    expect(out.bests).toBeNull();
  });
});

describe('history grouping and ordering', () => {
  const sets = [
    // newest first, as the database returns them
    set('b', 72.5, 8, ago(2, 3000)),
    set('b', 70, 10, ago(2, 2000)),
    set('b', 70, 10, ago(2, 1000)),
    set('a', 60, 12, ago(9, 2000)),
    set('a', 60, 10, ago(9, 1000)),
  ];
  const out = build(sets, 70);

  test('one entry per session, newest first', () => {
    expect(out.history).toHaveLength(2);
    expect(out.history[0].dateLabel).toBe('5 Oct');
    expect(out.history[1].dateLabel).toMatch(/^28 Sep/); // en-GB short September is "Sept" on newer ICU
  });

  test('sets are in the order they were logged', () => {
    expect(out.history[0].sets.map((s) => [s.weight, s.reps])).toEqual([
      [70, 10],
      [70, 10],
      [72.5, 8],
    ]);
    expect(out.history[1].sets.map((s) => [s.weight, s.reps])).toEqual([
      [60, 10],
      [60, 12],
    ]);
  });

  test('exactly one best per session: heaviest, ties by most reps', () => {
    expect(out.history[0].sets.map((s) => s.isBest)).toEqual([false, false, true]);
    expect(out.history[1].sets.map((s) => s.isBest)).toEqual([false, true]);
  });

  test('a full tie marks the first logged set only', () => {
    const tied = build([set('t', 50, 8, ago(1, 2000)), set('t', 50, 8, ago(1, 1000))]);
    expect(tied.history[0].sets.map((s) => s.isBest)).toEqual([true, false]);
  });

  test('accepts snake_case rows, numeric strings and the reps alias', () => {
    const out2 = build([
      { workout_id: 'w', weight: '80', actual_reps: '5', created_at: ago(1), set_type: 'straight' },
      { workout_id: 'w', weight: 75, reps: 6, created_at: ago(1, -1000) },
    ]);
    expect(out2.history).toHaveLength(1);
    expect(out2.history[0].sets).toEqual([
      { weight: 75, reps: 6, isBest: false },
      { weight: 80, reps: 5, isBest: true },
    ]);
  });
});

describe('warm-ups and invalid sets', () => {
  test('warm-ups are left out of history, records and bests', () => {
    const out = build(
      [set('a', 100, 1, ago(1, 2000), { setType: 'warmup' }), set('a', 60, 8, ago(1, 1000))],
      60,
    );
    expect(out.history[0].sets).toEqual([{ weight: 60, reps: 8, isBest: true }]);
    expect(out.records.lifetime.heaviest).toMatchObject({ weight: 60, reps: 8 });
    expect(out.bests.heaviest).toEqual({ weight: 60, reps: 8 });
  });

  test('unusable sets stay in history, out of records, and never take isBest', () => {
    const out = build([
      set('a', 0, 12, ago(1, 3000)), // bodyweight / no weight
      set('a', 60, 0, ago(1, 2000)), // no reps
      set('a', 'abc', 5, ago(1, 1500)),
      set('a', 50, 5, ago(1, 1000)),
    ]);
    expect(out.history[0].sets).toHaveLength(4);
    expect(out.history[0].sets.filter((s) => s.isBest)).toHaveLength(1);
    expect(out.history[0].sets.find((s) => s.isBest)).toMatchObject({ weight: 50, reps: 5 });
    expect(out.records.lifetime.heaviest).toMatchObject({ weight: 50, reps: 5 });
    expect(out.records.lifetime.bestSessionVolume.value).toBe(250);
  });

  test('a session of only unusable sets has no best and no records', () => {
    const out = build([set('a', 0, 12, ago(1)), set('a', 20, 0, ago(1, -1))], 20);
    expect(out.history).toHaveLength(1);
    expect(out.history[0].sets.some((s) => s.isBest)).toBe(false);
    expect(out.records.lifetime.heaviest).toBeNull();
    expect(out.records.lifetime.bestEstimatedMax).toBeNull();
    expect(out.records.lifetime.bestSessionVolume).toBeNull();
    expect(out.repsAtWeight).toEqual([]);
    expect(out.bests).toEqual({ lastDateLabel: out.history[0].dateLabel, heaviest: null, atWeight: null });
  });
});

describe('records', () => {
  const sets = [
    set('c', 80, 3, ago(5, 1000)),
    set('b', 70, 8, ago(20, 2000)),
    set('b', 70, 6, ago(20, 1000)),
    set('a', 70, 8, ago(200, 1000)),
    set('a', 90, 2, ago(200, 500)),
  ];
  const out = build(sets, 70);
  const life = out.records.lifetime;

  test('heaviest: weight, its reps and date', () => {
    expect(life.heaviest).toEqual({ weight: 90, reps: 2, dateLabel: '21 Mar' });
  });

  test('heaviest ties go to most reps, then the most recent', () => {
    const t = build([
      set('a', 60, 5, ago(10)),
      set('b', 60, 8, ago(20)),
      set('c', 60, 8, ago(5)),
    ]);
    expect(t.records.lifetime.heaviest).toEqual({ weight: 60, reps: 8, dateLabel: '2 Oct' });
  });

  test('mostRepsAtWeight uses todayWeight, most recent on a rep tie', () => {
    // 70 x 8 twice (20 days ago and 200 days ago): the more recent date wins.
    expect(life.mostRepsAtWeight).toMatchObject({ weight: 70, reps: 8 });
    expect(life.mostRepsAtWeight.dateLabel).toMatch(/^17 Sep/);
    expect(life.mostRepsAtWeight.dateLabel).toBe(out.history[1].dateLabel);
  });

  test('mostRepsAtWeight is null with no match or an invalid todayWeight', () => {
    expect(build(sets, 71).records.lifetime.mostRepsAtWeight).toBeNull();
    for (const bad of [undefined, null, 0, -5, NaN, Infinity, 'heavy', {}]) {
      const o = build(sets, bad);
      expect(o.records.lifetime.mostRepsAtWeight).toBeNull();
      expect(o.bests.atWeight).toBeNull();
    }
  });

  test('bestEstimatedMax uses calculate1RM, one decimal, with its date', () => {
    const candidates = sets.map((s) => calculate1RM(s.weight, s.actualReps));
    const top = Math.max(...candidates);
    expect(life.bestEstimatedMax.value).toBe(Math.round(top * 10) / 10);
    const winner = sets[candidates.indexOf(top)];
    expect(life.bestEstimatedMax.dateLabel).toBe(
      out.history.find((h) => h.sets.some((s) => s.weight === winner.weight && s.reps === winner.actualReps)).dateLabel,
    );
  });

  test('bestSessionVolume is the largest per-session weight x reps, whole number', () => {
    // c: 240, b: 560 + 420 = 980, a: 560 + 180 = 740
    expect(life.bestSessionVolume.value).toBe(980);
    expect(life.bestSessionVolume.dateLabel).toBe(out.history[1].dateLabel);
    const frac = build([set('a', 22.5, 5, ago(1))]);
    expect(frac.records.lifetime.bestSessionVolume.value).toBe(113); // 112.5 rounds up
  });
});

describe('the 90-day boundary', () => {
  const sets = [
    set('new', 60, 8, ago(89)),
    set('old', 100, 5, ago(91)),
  ];
  const out = build(sets, 100);

  test('a set at 89 days is in the three-month window, one at 91 is not', () => {
    expect(out.records.threeMonths.heaviest).toMatchObject({ weight: 60, reps: 8 });
    expect(out.records.lifetime.heaviest).toMatchObject({ weight: 100, reps: 5 });
    expect(out.records.threeMonths.mostRepsAtWeight).toBeNull();
    expect(out.records.lifetime.mostRepsAtWeight).toMatchObject({ weight: 100, reps: 5 });
  });

  test('three-month volume and estimated max ignore sets outside the window', () => {
    expect(out.records.threeMonths.bestSessionVolume.value).toBe(480);
    expect(out.records.threeMonths.bestEstimatedMax.value).toBe(
      Math.round(calculate1RM(60, 8) * 10) / 10,
    );
  });

  test('a session straddling the cutoff counts only its in-window sets for the period', () => {
    const o = build([set('s', 50, 10, ago(91)), set('s', 50, 4, ago(89))]);
    expect(o.records.lifetime.bestSessionVolume.value).toBe(700);
    expect(o.records.threeMonths.bestSessionVolume.value).toBe(200);
  });

  test('nothing in the window leaves the three-month period null', () => {
    const o = build([set('x', 60, 8, ago(120))]);
    expect(o.records.threeMonths).toEqual({
      heaviest: null,
      mostRepsAtWeight: null,
      bestEstimatedMax: null,
      bestSessionVolume: null,
    });
    expect(o.repsAtWeight).toEqual([]);
    expect(o.records.lifetime.heaviest).not.toBeNull();
  });
});

describe('repsAtWeight', () => {
  const out = build([
    set('c', 70, 6, ago(2)),
    set('b', 80, 3, ago(10)),
    set('b', 70, 9, ago(10, -1000)),
    set('a', 70, 9, ago(30)),
    set('a', 60, 12, ago(30, -1000)),
    set('z', 100, 5, ago(95)), // outside 90 days
    set('w', 55, 10, ago(3), { setType: 'warmup' }),
    set('u', 65, 0, ago(3)), // unusable
  ]);

  test('heaviest weight first, best reps per weight, outside-window and unusable sets left out', () => {
    expect(out.repsAtWeight.map((r) => [r.weight, r.reps])).toEqual([
      [80, 3],
      [70, 9],
      [60, 12],
    ]);
  });

  test('on a rep tie the dateLabel is the most recent', () => {
    // 70 x 9 was done 10 days ago and 30 days ago: the 10-days-ago date wins.
    expect(out.repsAtWeight[1].dateLabel).toMatch(/^27 Sep/);
  });
});

describe('bests line', () => {
  const sets = [
    set('b', 70, 8, ago(1)),
    set('a', 75, 6, ago(30)),
    set('a', 70, 10, ago(30, -1000)),
  ];

  test('last session date, heaviest ever and most reps at todayWeight', () => {
    const o = build(sets, 70);
    expect(o.bests).toEqual({
      lastDateLabel: '6 Oct',
      heaviest: { weight: 75, reps: 6 },
      atWeight: { weight: 70, reps: 10 },
    });
  });

  test('atWeight is null without todayWeight, the rest still present', () => {
    const o = build(sets);
    expect(o.bests).toEqual({ lastDateLabel: '6 Oct', heaviest: { weight: 75, reps: 6 }, atWeight: null });
  });

  test('is lifetime, not limited to 90 days', () => {
    const o = build([set('a', 120, 1, ago(400))], 120);
    expect(o.bests.heaviest).toEqual({ weight: 120, reps: 1 });
    expect(o.bests.atWeight).toEqual({ weight: 120, reps: 1 });
  });
});

describe('date labels', () => {
  test('d MMM within the current year, year appended otherwise', () => {
    const o = build([
      set('a', 60, 5, Date.UTC(2026, 9, 6, 12)),
      set('b', 60, 5, Date.UTC(2025, 11, 31, 12)),
      set('c', 60, 5, Date.UTC(2026, 0, 1, 12)),
    ]);
    expect(o.history.map((h) => h.dateLabel)).toEqual(['6 Oct', '1 Jan', '31 Dec 2025']);
  });

  test('a year boundary relative to now', () => {
    const now = Date.UTC(2027, 0, 2, 12);
    const o = buildExerciseHistory({
      sets: [set('a', 60, 5, Date.UTC(2026, 11, 30, 12)), set('b', 60, 5, Date.UTC(2027, 0, 1, 12))],
      now,
    });
    expect(o.history.map((h) => h.dateLabel)).toEqual(['1 Jan', '30 Dec 2026']);
  });

  test('falls back to d/m when the locale API throws', () => {
    const spy = jest.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(() => {
      throw new RangeError('no locale');
    });
    try {
      const o = build([set('a', 60, 5, Date.UTC(2026, 9, 6, 12)), set('b', 60, 5, Date.UTC(2025, 2, 4, 12))]);
      expect(o.history.map((h) => h.dateLabel)).toEqual(['6/10', '4/3/2025']);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('estimated max eligibility (the record system\'s own rule)', () => {
  test('a myo-rep, rest-pause or ballistic row never feeds the best estimated max; a straight row does', () => {
    const now = Date.UTC(2026, 9, 7);
    const day = 24 * 60 * 60 * 1000;
    const sets = [
      { workoutId: 'w1', setType: 'myo_reps', weight: 60, actualReps: 30, createdAt: now - 2 * day },
      { workoutId: 'w1', setType: 'rest_pause', weight: 60, actualReps: 25, createdAt: now - 2 * day + 1 },
      { workoutId: 'w1', setType: 'straight', evidenceClass: 'circuit_ballistic', weight: 40, actualReps: 40, createdAt: now - 2 * day + 2 },
      { workoutId: 'w1', setType: 'straight', weight: 80, actualReps: 5, createdAt: now - 2 * day + 3 },
    ];
    const out = buildExerciseHistory({ sets, todayWeight: 80, now });
    // The app's own estimate on 80 x 5, never on the summed or ballistic rows.
    const { calculate1RM } = require('../algorithms');
    expect(out.records.lifetime.bestEstimatedMax.value).toBeCloseTo(calculate1RM(80, 5), 1);
    const onlyClusters = buildExerciseHistory({ sets: sets.slice(0, 3), todayWeight: 80, now });
    expect(onlyClusters.records.lifetime.bestEstimatedMax).toBeNull();
  });
});
