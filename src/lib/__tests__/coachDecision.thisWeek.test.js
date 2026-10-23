/**
 * coachDecision: the Coach tab's "This week" card and its "Past decisions" row
 * (D231, app layout rework, batch 4).
 *
 * What this suite pins: which COMPLETED decision is this week's (the same
 * seven-day window Today's coaching-decision line reads), which is the most
 * recent past one, and that an output with no check-in behind it (or a baseline
 * week) is never a decision. Pure functions plus one walk with an injected
 * check-in lookup, so no database is touched.
 */
import {
  isCompletedCoachDecision, isThisWeeksDecision, completedDecisionsFrom, splitCoachDecisions,
} from '../coachDecision';

const DAY = 24 * 60 * 60 * 1000;
// A Wednesday midday; the week started the Monday before.
const NOW = new Date(2026, 9, 21, 12).getTime();
const MONDAY = new Date(2026, 9, 19).getTime();

describe('isThisWeeksDecision: the seven-day window Today uses', () => {
  test('an output filed against this Monday is this week\'s', () => {
    expect(isThisWeeksDecision({ weekStart: MONDAY }, NOW)).toBe(true);
  });
  test('an output from last week is not', () => {
    expect(isThisWeeksDecision({ weekStart: MONDAY - 7 * DAY }, NOW)).toBe(false);
    expect(isThisWeeksDecision({ weekStart: MONDAY - 14 * DAY }, NOW)).toBe(false);
  });
  test('the window ends seven days after the week starts', () => {
    expect(isThisWeeksDecision({ weekStart: NOW - 7 * DAY + 1 }, NOW)).toBe(true);
    expect(isThisWeeksDecision({ weekStart: NOW - 7 * DAY }, NOW)).toBe(false);
  });
  test('a missing or unreadable week start is never this week\'s', () => {
    for (const bad of [null, undefined, {}, { weekStart: null }, { weekStart: 'soon' }, { weekStart: NaN }]) {
      expect(isThisWeeksDecision(bad, NOW)).toBe(false);
    }
  });
});

describe('completedDecisionsFrom: only outputs with their check-in behind them', () => {
  const checkins = {
    [MONDAY]: { weekStart: MONDAY, energyScore: 3 },
    [MONDAY - 7 * DAY]: { weekStart: MONDAY - 7 * DAY, energyScore: null }, // a sleep-only contribution is not a check-in
    [MONDAY - 14 * DAY]: { weekStart: MONDAY - 14 * DAY, energyScore: 4 },
    [MONDAY - 21 * DAY]: { weekStart: MONDAY - 21 * DAY, energyScore: 2 },
  };
  const getCheckin = jest.fn(async (weekStart) => checkins[weekStart] ?? null);
  beforeEach(() => getCheckin.mockClear());

  test('keeps newest-first order and drops outputs without a completed check-in', async () => {
    const history = [
      { weekStart: MONDAY },
      { weekStart: MONDAY - 7 * DAY },
      { weekStart: MONDAY - 14 * DAY },
    ];
    const out = await completedDecisionsFrom(history, getCheckin);
    expect(out.map((o) => o.weekStart)).toEqual([MONDAY, MONDAY - 14 * DAY]);
  });

  test('a baseline output (not enough data) is never a decision, and its check-in is not even read', async () => {
    const out = await completedDecisionsFrom([{ weekStart: MONDAY - 21 * DAY, hasEnoughData: false }], getCheckin);
    expect(out).toEqual([]);
    expect(getCheckin).not.toHaveBeenCalled();
  });

  test('a check-in for a different week does not complete the output', async () => {
    const out = await completedDecisionsFrom([{ weekStart: MONDAY }], async () => ({ weekStart: MONDAY - 7 * DAY, energyScore: 3 }));
    expect(out).toEqual([]);
  });

  test('walks at most `max` outputs', async () => {
    const history = Array.from({ length: 12 }, (_, i) => ({ weekStart: MONDAY - (i + 30) * 7 * DAY }));
    await completedDecisionsFrom(history, getCheckin, { max: 3 });
    expect(getCheckin).toHaveBeenCalledTimes(3);
  });

  test('a failing check-in read rejects, so the caller can call it a failed load', async () => {
    await expect(completedDecisionsFrom([{ weekStart: MONDAY }], async () => { throw new Error('db down'); })).rejects.toThrow('db down');
  });

  test('nothing in, nothing out', async () => {
    expect(await completedDecisionsFrom(undefined, getCheckin)).toEqual([]);
    expect(await completedDecisionsFrom([], getCheckin)).toEqual([]);
  });
});

describe('splitCoachDecisions: this week\'s decision and the most recent past one', () => {
  const week = (n) => ({ weekStart: MONDAY - n * 7 * DAY });

  test('this week\'s decision and an earlier one: both found, the earlier is the most recent earlier week', () => {
    const { thisWeek, past } = splitCoachDecisions([week(2), week(0), week(1)], NOW);
    expect(thisWeek.weekStart).toBe(MONDAY);
    expect(past.weekStart).toBe(MONDAY - 7 * DAY);
  });
  test('only this week\'s: no past decision', () => {
    const { thisWeek, past } = splitCoachDecisions([week(0)], NOW);
    expect(thisWeek).not.toBeNull();
    expect(past).toBeNull();
  });
  test('only earlier ones: no decision this week, the newest earlier one is the past decision', () => {
    const { thisWeek, past } = splitCoachDecisions([week(3), week(1)], NOW);
    expect(thisWeek).toBeNull();
    expect(past.weekStart).toBe(MONDAY - 7 * DAY);
  });
  test('nothing: neither', () => {
    expect(splitCoachDecisions([], NOW)).toEqual({ thisWeek: null, past: null });
    expect(splitCoachDecisions(undefined, NOW)).toEqual({ thisWeek: null, past: null });
  });
  test('rows with no usable week are ignored', () => {
    const { thisWeek, past } = splitCoachDecisions([{ weekStart: null }, { weekStart: 'x' }, week(1)], NOW);
    expect(thisWeek).toBeNull();
    expect(past.weekStart).toBe(MONDAY - 7 * DAY);
  });
});

describe('the predicate itself is unchanged', () => {
  test('a decision is an output with enough data and a same-week check-in with an energy score', () => {
    expect(isCompletedCoachDecision({ weekStart: 5 }, { weekStart: 5, energyScore: 3 })).toBe(true);
    expect(isCompletedCoachDecision({ weekStart: 5, hasEnoughData: false }, { weekStart: 5, energyScore: 3 })).toBe(false);
    expect(isCompletedCoachDecision({ weekStart: 5 }, { weekStart: 4, energyScore: 3 })).toBe(false);
    expect(isCompletedCoachDecision({ weekStart: 5 }, { weekStart: 5, energyScore: null })).toBe(false);
    expect(isCompletedCoachDecision(null, null)).toBe(false);
  });
});
