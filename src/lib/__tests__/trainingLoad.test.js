/**
 * Progress-tab audit 2026-09-24 (F4/F5, D200 item 3, S6-5), lane E, ruling 1.
 *
 * Pins src/lib/trainingLoad.js: the ONE Monday-anchored weekly tonnage
 * series that now feeds both the Consistency screen's plan-card sparkline
 * and its workload (ACWR) card, replacing the two disagreeing rolling-week
 * readings F4/F5 named, and excluding a distance/duration set's
 * metres/seconds from the kg sum (S6-5).
 */
import {
  mondayWeekLoadSeries, acuteChronicFromSeries, likeForLikeLoad, LOAD_IN_LINE_MIN, LOAD_ABOVE_MIN,
} from '../trainingLoad';
import { localWeekStartMs } from '../dayKey';

const HOUR_MS = 3600000;
const DAY_MS = 24 * HOUR_MS;

function setAt(at, extra = {}) {
  return { id: `s${at}`, exerciseId: 'bench', weight: 100, actualReps: 5, createdAt: at, ...extra };
}

describe('trainingLoad: mondayWeekLoadSeries Monday anchoring', () => {
  test('a Sunday-evening "now" gives a six-day current week', () => {
    const now = new Date(2026, 0, 4, 20, 0, 0).getTime(); // Sun 4 Jan 2026, 20:00
    const [current] = mondayWeekLoadSeries([], { weeks: 1, now });
    expect(current.isCurrent).toBe(true);
    expect(current.weekStartMs).toBe(localWeekStartMs(now));
    expect(current.weekEndMs).toBe(now);
    expect(Math.floor((current.weekEndMs - current.weekStartMs) / DAY_MS)).toBe(6);
  });

  test('a Monday-morning "now" gives a current week only a few hours old', () => {
    const now = new Date(2026, 0, 5, 3, 0, 0).getTime(); // Mon 5 Jan 2026, 03:00
    const [current] = mondayWeekLoadSeries([], { weeks: 1, now });
    expect(current.isCurrent).toBe(true);
    expect(current.weekStartMs).toBe(localWeekStartMs(now));
    expect(current.weekEndMs).toBe(now);
    expect((current.weekEndMs - current.weekStartMs) / HOUR_MS).toBe(3);
  });

  test('returns `weeks` entries, oldest to newest, only the last flagged current', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0).getTime(); // a plain Wednesday, no DST edge
    const series = mondayWeekLoadSeries([], { weeks: 5, now });
    expect(series).toHaveLength(5);
    series.forEach((w, i) => {
      expect(w.isCurrent).toBe(i === series.length - 1);
    });
    // Every earlier week is a full local week: exactly 7 days, and each
    // start is exactly 7 days before the next.
    for (let i = 0; i < series.length - 1; i++) {
      expect(series[i].weekEndMs - series[i].weekStartMs).toBe(7 * DAY_MS);
      expect(series[i + 1].weekStartMs - series[i].weekStartMs).toBe(7 * DAY_MS);
    }
    expect(series[series.length - 1].weekStartMs).toBe(localWeekStartMs(now));
    expect(series[series.length - 1].weekEndMs).toBe(now);
  });

  test('a set is attributed to the week containing its own createdAt, snake_case tolerated', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0).getTime();
    const thisWeekStart = localWeekStartMs(now);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const sets = [
      setAt(thisWeekStart + HOUR_MS), // this week: camelCase createdAt
      { id: 'sSnake', exerciseId: 'bench', weight: 100, actual_reps: 5, created_at: lastWeekStart.getTime() + HOUR_MS }, // last week: snake_case
    ];
    const series = mondayWeekLoadSeries(sets, { weeks: 2, now });
    expect(series[1].tonnage).toBe(500); // current week: 100 * 5
    expect(series[0].tonnage).toBe(500); // previous full week: 100 * 5
  });
});

describe('trainingLoad: mondayWeekLoadSeries crosses the 2026-10-25 UK clock change with calendar-week bounds', () => {
  // Jest runs with TZ=Europe/London from jest.globalSetup.js (set before
  // any worker starts, so every worker inherits it), so this runs
  // in-process against the real module exactly as
  // src/lib/__tests__/blockWeekProgress.test.js already does for the same
  // 2026-10-25 change -- no child process needed.
  const HOUR = 3600000;
  // Wed 28 Oct 2026, 09:00 local -- the week after the fall-back
  // transition (clocks go back on Sun 25 Oct 2026). weeks:3 spans
  // Mon 12 Oct -> now, so the middle entry (Mon 19 Oct -> Mon 26 Oct)
  // contains the transition.
  const now = new Date(2026, 9, 28, 9, 0, 0).getTime();
  const series = mondayWeekLoadSeries([], { weeks: 3, now });
  const hours = series.map((w) => (w.weekEndMs - w.weekStartMs) / HOUR);

  test('the no-transition week is exactly 168 hours', () => {
    expect(hours[0]).toBe(168);
  });

  test('the week containing the fall-back transition is 169 hours, not 168', () => {
    expect(hours[1]).toBe(169);
  });

  test('every week start is a genuine local Monday at 00:00, on both sides of the change', () => {
    for (const w of series) {
      const d = new Date(w.weekStartMs);
      expect(d.getDay()).toBe(1); // Monday
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
    }
  });

  test('the current (last) week is flagged and ends at "now", not a full week', () => {
    const last = series[series.length - 1];
    expect(last.isCurrent).toBe(true);
    expect(last.weekEndMs).toBe(now);
  });
});

describe('trainingLoad: mondayWeekLoadSeries S6-5 (distance/duration excluded from tonnage)', () => {
  test('a distance set (metres/seconds in the weight/reps columns) contributes nothing', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0).getTime();
    const weekStart = localWeekStartMs(now);
    const sets = [
      // A 5km run logged as weight=5000 (metres), reps=1 -- must NOT be
      // summed as 5000 kg.
      { id: 'run1', exerciseId: 'run', weight: 5000, actualReps: 1, createdAt: weekStart + HOUR_MS },
      // A real lift in the same week, which must still count.
      setAt(weekStart + 2 * HOUR_MS),
    ];
    const exerciseTypeById = { run: 'distance', bench: 'weight_reps' };
    const [current] = mondayWeekLoadSeries(sets, { weeks: 1, now, exerciseTypeById });
    expect(current.tonnage).toBe(500); // only the 100kg x 5 lift
  });

  test('with no exerciseTypeById supplied, behaviour is unchanged (every set counted) -- callers opt in', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0).getTime();
    const weekStart = localWeekStartMs(now);
    const sets = [{ id: 'run1', exerciseId: 'run', weight: 5000, actualReps: 1, createdAt: weekStart + HOUR_MS }];
    const [current] = mondayWeekLoadSeries(sets, { weeks: 1, now });
    expect(current.tonnage).toBe(5000);
  });

  test('per-hand load semantics are threaded through, doubling the counted load', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0).getTime();
    const weekStart = localWeekStartMs(now);
    const sets = [setAt(weekStart + HOUR_MS, { exerciseId: 'db' })];
    const loadSemanticsById = { db: 'per_hand' };
    const [current] = mondayWeekLoadSeries(sets, { weeks: 1, now, loadSemanticsById });
    expect(current.tonnage).toBe(1000); // 100 * 5 * 2
  });
});

describe('trainingLoad: acuteChronicFromSeries -- the chronic rule', () => {
  function series(pastTonnages, acuteTonnage) {
    return [...pastTonnages.map((t) => ({ isCurrent: false, tonnage: t })), { isCurrent: true, tonnage: acuteTonnage }];
  }

  test('fewer than two populated past weeks returns null (not enough data)', () => {
    expect(acuteChronicFromSeries(series([0, 0, 0, 500], 800))).toBeNull();
    expect(acuteChronicFromSeries(series([], 800))).toBeNull();
  });

  test('exactly two populated past weeks is enough', () => {
    const result = acuteChronicFromSeries(series([0, 400, 0, 600], 800));
    expect(result).toEqual({ acute: 800, chronic: 500, ratio: 1.6, weeksOfData: 2 });
  });

  test('zero-tonnage past weeks are dropped, not averaged in and not counted toward weeksOfData', () => {
    const result = acuteChronicFromSeries(series([1000, 0, 2000, 0], 1500));
    // mean of [1000, 2000] = 1500, over 2 populated weeks -- the two zero
    // weeks neither pull the average down nor count as data.
    expect(result).toEqual({ acute: 1500, chronic: 1500, ratio: 1.0, weeksOfData: 2 });
  });

  test('at most the four most recent past weeks are used, even given a longer series', () => {
    // Five past weeks + the current one: the OLDEST past week (1) must be
    // dropped, keeping only the four most recent (2000, 2000, 2000, 2000).
    const result = acuteChronicFromSeries(series([1, 2000, 2000, 2000, 2000], 4000));
    expect(result).toEqual({ acute: 4000, chronic: 2000, ratio: 2.0, weeksOfData: 4 });
  });

  test('acute and chronic are each Math.round-ed, ratio to two decimals', () => {
    const result = acuteChronicFromSeries(series([333.4, 666.6], 500.5));
    expect(result.acute).toBe(501);
    expect(result.chronic).toBe(500); // round((333.4+666.6)/2) = round(500) = 500
    expect(result.ratio).toBe(1.0);
  });

  test('defect fixed: a zero-acute week with populated chronic data reads ratio 0.00, not null', () => {
    // The database read this replaced (getAcuteChronicWorkload, retired
    // 2026-09-25 once nothing called it) computed
    // `ratio = chronic > 0 ? acute / chronic : null` then returned
    // `ratio ? Math.round(ratio * 100) / 100 : null` -- a TRUTHY check, so
    // a genuine ratio of exactly 0 (rest-day Monday morning, chronic > 0)
    // collapsed to null and hid the whole WorkloadCard (ConsistencyScreen.js
    // and ProgressSections.js both gate on `ratio === null`/`!== null`, a
    // strict null check, so a real 0 now renders correctly). Lead ruling:
    // that truthy check was the defect, fixed here.
    const result = acuteChronicFromSeries(series([1000, 1000], 0));
    expect(result.ratio).toBe(0);
    expect(result.acute).toBe(0);
    expect(result.chronic).toBe(1000);
    expect(result.ratio).not.toBeNull();
  });

  test('the current entry is always acute regardless of its position, and an all-zero acute week with no chronic still resolves', () => {
    expect(acuteChronicFromSeries([{ isCurrent: true, tonnage: 0 }])).toBeNull(); // no past weeks at all
  });
});

describe('trainingLoad: parity with the retired database read\'s aggregation rule', () => {
  // A faithful, minimal re-implementation of the bucketing rule the old
  // getAcuteChronicWorkload read used (retired 2026-09-25 once nothing
  // called it), operating on a plain 5-slot `weeklyTonnage` array (index 0
  // = this week, 1..4 = the four prior weeks, oldest last) -- exactly as
  // that read built it, so this test proves
  // acuteChronicFromSeries computes the SAME numbers from the equivalent
  // Monday-week series, not merely a similarly-shaped one.
  function referenceRule(weeklyTonnage) {
    const acute = weeklyTonnage[0];
    const pastWeeks = weeklyTonnage.slice(1, 5).filter((t) => t > 0);
    if (pastWeeks.length < 2) return null;
    const chronic = pastWeeks.reduce((s, t) => s + t, 0) / pastWeeks.length;
    const ratio = chronic > 0 ? acute / chronic : null;
    return {
      acute: Math.round(acute),
      chronic: Math.round(chronic),
      ratio: ratio ? Math.round(ratio * 100) / 100 : null,
      weeksOfData: pastWeeks.length,
    };
  }

  // weeklyTonnage[0] = acute (this week); [1..4] = past weeks, most recent
  // first -- converted to a mondayWeekLoadSeries-shaped array (oldest to
  // newest, current last) for acuteChronicFromSeries.
  function toSeries(weeklyTonnage) {
    const [acute, ...past] = weeklyTonnage;
    return [...past.reverse().map((t) => ({ isCurrent: false, tonnage: t })), { isCurrent: true, tonnage: acute }];
  }

  // [0, 1000, 1000, 0, 0] (acute 0, chronic 1000) is deliberately EXCLUDED
  // from this parity list: it is exactly the ratio-zero case the lead ruled
  // a defect (see the "defect fixed" test above), so acuteChronicFromSeries
  // now correctly disagrees with referenceRule (the old, still-defective
  // rule) on that one input by design -- pinned separately below.
  const cases = [
    [800, 400, 600, 0, 0],
    [1500, 1000, 0, 2000, 0],
    [4000, 2000, 2000, 2000, 2000],
    [0, 0, 0, 0, 0],
    [500, 500, 0, 0, 0], // only 1 populated past week -> null
    [999.6, 1052.4, 1052.4, 0, 0],
  ];

  test.each(cases)('weeklyTonnage %p produces identical acute/chronic/ratio/weeksOfData', (...weeklyTonnage) => {
    expect(acuteChronicFromSeries(toSeries(weeklyTonnage))).toEqual(referenceRule(weeklyTonnage));
  });

  test('the one deliberate divergence: acute 0 with a populated chronic reads 0 here, null under the old rule', () => {
    const weeklyTonnage = [0, 1000, 1000, 0, 0];
    expect(referenceRule(weeklyTonnage).ratio).toBeNull(); // the old, still-defective rule
    expect(acuteChronicFromSeries(toSeries(weeklyTonnage)).ratio).toBe(0); // the fix
  });
});

describe('trainingLoad: the sparkline\'s last value and the workload card\'s acute figure agree', () => {
  test('acuteChronicFromSeries(series).acute equals the rounded tonnage of the series\' own last (current) entry', () => {
    const now = new Date(2026, 5, 10, 12, 0, 0).getTime();
    const weekStart = localWeekStartMs(now);
    const sets = [
      setAt(weekStart + HOUR_MS),
      setAt(weekStart + 2 * HOUR_MS, { weight: 80, actualReps: 8 }),
    ];
    const series = mondayWeekLoadSeries(sets, { weeks: 5, now });
    const cardFigure = acuteChronicFromSeries(series);
    const sparklineLastBarValue = Math.round(series[series.length - 1].tonnage);
    // No chronic history in this fixture, so the card itself is null --
    // the invariant under test is the SHARED number, proven directly on
    // the series regardless of whether the card renders.
    expect(sparklineLastBarValue).toBe(Math.round(100 * 5 + 80 * 8));
    expect(cardFigure).toBeNull();

    // With enough chronic history, the card's acute is the identical
    // rounded figure the sparkline's last bar would show.
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const twoWeeksAgoStart = new Date(weekStart);
    twoWeeksAgoStart.setDate(twoWeeksAgoStart.getDate() - 14);
    const withHistory = [
      ...sets,
      setAt(lastWeekStart.getTime() + HOUR_MS),
      setAt(twoWeeksAgoStart.getTime() + HOUR_MS),
    ];
    const seriesWithHistory = mondayWeekLoadSeries(withHistory, { weeks: 5, now });
    const withHistoryFigure = acuteChronicFromSeries(seriesWithHistory);
    expect(withHistoryFigure.acute).toBe(sparklineLastBarValue);
    expect(withHistoryFigure.acute).toBe(Math.round(seriesWithHistory[seriesWithHistory.length - 1].tonnage));
  });
});


// D214 (Consistency elevation, lane 4; plan section 7.3 item 6, CS-6, B10):
// the comparison the Consistency screen prints is like for like, Monday to now
// against the same weekday-and-time span of each previous week. The ratio card
// it replaces divided a PART week by FULL ones, so early in any week it read
// "below your average" by construction (acuteChronicFromSeries is unchanged and
// pinned above; the screen just no longer prints its ratio).
describe('trainingLoad: likeForLikeLoad compares the same point of each week (D214, CS-6)', () => {
  // Wed 10 Jun 2026, 10:00 local: no clock change anywhere near.
  const NOW = new Date(2026, 5, 10, 10, 0, 0).getTime();
  const at = (weeksBack, day, hour, minute = 0) => {
    // Local date arithmetic: Monday of this week, then back whole weeks.
    const monday = new Date(localWeekStartMs(NOW));
    monday.setDate(monday.getDate() - 7 * weeksBack + day);
    monday.setHours(hour, minute, 0, 0);
    return monday.getTime();
  };
  // 100 kg x 10 = 1,000 kg per set row below; `kg` makes the arithmetic plain.
  const lift = (when, kg = 1000) => setAt(when, { weight: kg / 10, actualReps: 10 });

  // Every previous week: 1,000 kg by Wednesday 10:00, then 3,000 kg more later
  // in the week (Thursday and Saturday), so a full week is 4,000 kg.
  const previousWeeks = (weeks = 3) => Array.from({ length: weeks }, (_, i) => i + 1).flatMap((w) => [
    lift(at(w, 0, 9)),            // Monday 09:00, before the cut-off
    lift(at(w, 3, 18), 1500),     // Thursday 18:00, after the cut-off
    lift(at(w, 5, 11), 1500),     // Saturday 11:00, after the cut-off
  ]);

  test('a Wednesday-morning read compares only Monday to Wednesday-morning of each previous week', () => {
    const sets = [lift(at(0, 0, 9), 800), ...previousWeeks()];
    const r = likeForLikeLoad(sets, { now: NOW });
    expect(r.current).toBe(800);
    // Each previous week counts 1,000 kg (its Monday session), never its
    // 4,000 kg whole.
    const previous = r.weeks.filter((w) => !w.isCurrent);
    expect(previous).toHaveLength(3);
    previous.forEach((w) => {
      expect(w.byNowTonnage).toBe(1000);
      expect(w.fullTonnage).toBe(4000);
    });
    expect(r.expected).toBe(1000);
    expect(r.ratio).toBe(0.8);
    expect(r.comparison).toBe('in_line');
    expect(r.weeksOfData).toBe(3);
  });

  test('the same week against the full-week average would have read "below" by construction; like for like does not', () => {
    const sets = [lift(at(0, 0, 9), 1000), ...previousWeeks()];
    const series = mondayWeekLoadSeries(sets, { weeks: 5, now: NOW });
    const ratioCard = acuteChronicFromSeries(series);
    expect(ratioCard.ratio).toBe(0.25); // 1,000 against a 4,000 kg average: "below", always
    const r = likeForLikeLoad(sets, { now: NOW });
    expect(r.ratio).toBe(1);
    expect(r.comparison).toBe('in_line');
  });

  test('the cut-off is exact: a previous-week set just before it counts, at or after it does not', () => {
    const sets = [
      lift(at(1, 0, 9)),
      lift(at(1, 2, 9, 59)),     // Wednesday 09:59 of last week: counts
      lift(at(1, 2, 10, 0)),     // Wednesday 10:00 exactly: the cut-off, half-open, excluded
      lift(at(1, 2, 10, 1)),     // after
      lift(at(2, 0, 9)),
      lift(at(3, 0, 9)),
    ];
    const r = likeForLikeLoad(sets, { now: NOW });
    expect(r.weeks.find((w) => w.weekStartMs === localWeekStartMs(at(1, 0, 9))).byNowTonnage).toBe(2000);
  });

  test('a previous week with nothing logged all week was a break, not a pace, and is left out', () => {
    const sets = [lift(at(0, 0, 9)), ...previousWeeks(1), lift(at(3, 0, 9))]; // weeks -1 and -3 populated, week -2 empty
    const r = likeForLikeLoad(sets, { now: NOW });
    expect(r.weeksOfData).toBe(2);
    expect(r.expected).toBe(1000);
  });

  test('a populated week that had logged nothing BY this point still counts, as zero', () => {
    const sets = [
      lift(at(0, 0, 9)),
      lift(at(1, 4, 9)),   // last week: only a Friday session (by Wednesday: nothing)
      lift(at(2, 0, 9)),   // two weeks ago: Monday session
      lift(at(3, 0, 9)),
    ];
    const r = likeForLikeLoad(sets, { now: NOW });
    expect(r.weeksOfData).toBe(3);
    expect(r.expected).toBe(667);          // (0 + 1,000 + 1,000) / 3
    expect(r.ratio).toBe(1.5);             // 1,000 / 666.67
    expect(r.comparison).toBe('above');
  });

  test('fewer than two populated previous weeks is not enough to compare against', () => {
    const r = likeForLikeLoad([lift(at(0, 0, 9)), ...previousWeeks(1)], { now: NOW });
    expect(r.weeksOfData).toBe(1);
    expect(r.ratio).toBeNull();
    expect(r.comparison).toBeNull();
    expect(r.expected).toBeNull();
  });

  test('nothing logged by this point of the previous weeks is withheld, never "above" a zero', () => {
    const sets = [lift(at(0, 0, 9)), lift(at(1, 4, 9)), lift(at(2, 4, 9)), lift(at(3, 4, 9))];
    const r = likeForLikeLoad(sets, { now: NOW });
    expect(r.expected).toBe(0);
    expect(r.ratio).toBeNull();
    expect(r.comparison).toBeNull();
  });

  test('the words are cut at the ratio card\'s own bounds (0.8 and 1.3), unchanged (D204)', () => {
    expect(LOAD_IN_LINE_MIN).toBe(0.8);
    expect(LOAD_ABOVE_MIN).toBe(1.3);
    const cases = [[790, 'below'], [800, 'in_line'], [1290, 'in_line'], [1300, 'above']];
    for (const [kg, word] of cases) {
      const r = likeForLikeLoad([lift(at(0, 0, 9), kg), ...previousWeeks()], { now: NOW });
      expect({ kg, word: r.comparison }).toEqual({ kg, word });
    }
  });

  test('the current figure is the identical number the Monday series calls the current week', () => {
    const sets = [lift(at(0, 0, 9), 1234), lift(at(0, 2, 9, 30), 600), ...previousWeeks()];
    const series = mondayWeekLoadSeries(sets, { weeks: 5, now: NOW });
    expect(likeForLikeLoad(sets, { now: NOW }).current).toBe(Math.round(series[series.length - 1].tonnage));
    expect(likeForLikeLoad(sets, { now: NOW }).current).toBe(1834);
  });

  test('a distance set\'s metres never enter the kg sum, and snake_case rows are read', () => {
    const typeById = { bench: 'weight_reps', run: 'distance' };
    const sets = [
      setAt(at(0, 0, 9), { weight: 100, actualReps: 5 }),
      { id: 'run', exercise_id: 'run', weight: 5000, actual_reps: 1, created_at: at(0, 0, 10) },
      { id: 'snake', exercise_id: 'bench', weight: 50, actual_reps: 10, created_at: at(0, 1, 9) },
    ];
    expect(likeForLikeLoad(sets, { now: NOW, exerciseTypeById: typeById }).current).toBe(1000);
  });

  test('a clock-change week keeps the same time of day: the cut-off is wall-clock, not a fixed 7 x 24 h', () => {
    // Wed 28 Oct 2026, 10:00 GMT; the UK clocks went back on Sunday 25 Oct.
    // Seven fixed days earlier would be 11:00 BST on Wed 21 Oct.
    const now = new Date(2026, 9, 28, 10, 0, 0).getTime();
    const r = likeForLikeLoad([], { now });
    const lastWeek = r.weeks[r.weeks.length - 2];
    expect(new Date(lastWeek.cutoffMs).getHours()).toBe(10);
    expect(new Date(lastWeek.cutoffMs).getDate()).toBe(21);
    expect(lastWeek.cutoffMs).not.toBe(now - 7 * DAY_MS);
    expect(new Date(lastWeek.weekStartMs).getDay()).toBe(1); // Monday
    expect(new Date(lastWeek.weekStartMs).getHours()).toBe(0);
  });

  test('empty and malformed input degrade to no comparison, never a throw', () => {
    expect(likeForLikeLoad([], { now: NOW })).toMatchObject({ current: 0, ratio: null, comparison: null, weeksOfData: 0 });
    expect(likeForLikeLoad(null, { now: NOW }).comparison).toBeNull();
    expect(likeForLikeLoad([lift(at(0, 0, 9))], { now: NaN }).comparison).toBeNull();
  });
});
