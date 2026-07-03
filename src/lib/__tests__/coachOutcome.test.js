/**
 * coachOutcome.js — S1 "give the coach a memory" (pure).
 *
 * Pins the outcome-loop pairing + scorecard: only truly-applied decisions are
 * paired with the CALENDAR-consecutive next week's verdict (never across a gap),
 * the newest week is never a decision (no verdict yet), and the scorecard hides
 * below the (founder-set) minimum sample. Suppression is the caller's job, not
 * pinned here.
 */
import {
  appliedDomain,
  pairAppliedWithOutcome,
  buildScorecard,
  MIN_SCORECARD_SAMPLE,
} from '../coachOutcome';

const DAY = 86400000;
// A coach-output week: applied domain (or none) + trend verdict (or none).
const wk = (days, applied, onTarget) => ({
  weekStart: days * DAY,
  adjustments: applied ? { [applied]: { applied: true } } : {},
  trend: typeof onTarget === 'boolean' ? { onTarget } : {},
});

describe('appliedDomain', () => {
  test('returns the first applied domain, else null', () => {
    expect(appliedDomain(wk(0, 'calories', true))).toBe('calories');
    expect(appliedDomain(wk(0, 'training', true))).toBe('training');
    expect(appliedDomain(wk(0, undefined, true))).toBeNull();
    expect(appliedDomain(null)).toBeNull();
  });
});

describe('pairAppliedWithOutcome', () => {
  // most-recent-first (getCoachOutputHistory order): days 21,14,7,0
  const historyDesc = [
    wk(21, 'calories', true), // newest — a verdict for day 14, never a decision here
    wk(14, 'training', false),
    wk(7, 'calories', true),
    wk(0, 'steps', false),
  ];

  test('pairs each applied decision with the following week, oldest-first, verdict is the LATER week', () => {
    const pairs = pairAppliedWithOutcome(historyDesc);
    expect(pairs).toEqual([
      { weekStart: 0, domain: 'steps', verdictWeekStart: 7 * DAY, onTarget: true },
      { weekStart: 7 * DAY, domain: 'calories', verdictWeekStart: 14 * DAY, onTarget: false },
      { weekStart: 14 * DAY, domain: 'training', verdictWeekStart: 21 * DAY, onTarget: true },
    ]);
    for (const p of pairs) expect(p.verdictWeekStart).toBeGreaterThan(p.weekStart);
  });

  test('the newest week is never paired as a decision (it has no following week yet)', () => {
    const pairs = pairAppliedWithOutcome(historyDesc);
    expect(pairs.some((p) => p.weekStart === 21 * DAY)).toBe(false);
  });

  test('a week with no applied decision is never paired', () => {
    expect(pairAppliedWithOutcome([wk(7, undefined, true), wk(0, undefined, undefined)])).toEqual([]);
  });

  test('a following week without a boolean trend verdict is never paired', () => {
    expect(pairAppliedWithOutcome([wk(7, undefined, undefined), wk(0, 'calories', undefined)])).toEqual([]);
  });

  test('a gap in history never misattributes a verdict (only ~7-day-consecutive weeks pair)', () => {
    // decision at day 0, next stored week is day 14 (a missed week) -> no pairing
    expect(pairAppliedWithOutcome([wk(14, undefined, true), wk(0, 'calories', undefined)])).toEqual([]);
  });

  test('empty / garbage input -> []', () => {
    expect(pairAppliedWithOutcome()).toEqual([]);
    expect(pairAppliedWithOutcome(null)).toEqual([]);
    expect(pairAppliedWithOutcome([wk(0, 'calories', true)])).toEqual([]); // single week, no next
  });
});

describe('buildScorecard', () => {
  test('minimum sample is the founder-set floor of 2', () => {
    expect(MIN_SCORECARD_SAMPLE).toBe(2);
  });

  test('null below the minimum sample', () => {
    // one pair only -> below 2 -> null
    expect(buildScorecard([wk(7, undefined, true), wk(0, 'calories', undefined)])).toBeNull();
  });

  test('counts on-target hits at/above the minimum sample', () => {
    const historyDesc = [
      wk(21, undefined, true),
      wk(14, 'training', false),
      wk(7, 'calories', true),
      wk(0, 'steps', false),
    ];
    // pairs: (0->7 true), (7->14 false), (14->21 true) => 2 of 3
    expect(buildScorecard(historyDesc)).toEqual({ onTarget: 2, of: 3 });
  });
});
