import {
  MILESTONES,
  LONGEST_RUN_PB_FLOOR,
  pausedWeekKeys,
  addPauseSpan,
  recordHighWater,
  longestRun,
  pendingMilestone,
  pendingPerfectMonth,
  pendingLongestRunPb,
} from '../streakState';
import { computeStreak } from '../streak';

const WEEKS = ['2026-03-30', '2026-04-06', '2026-04-13', '2026-04-20', '2026-04-27'];

describe('streakState: pausedWeekKeys', () => {
  test('covers the span start plus the next weeks-1 in the ordered list', () => {
    const set = pausedWeekKeys([{ startKey: '2026-04-06', weeks: 2 }], WEEKS);
    expect([...set].sort()).toEqual(['2026-04-06', '2026-04-13']);
  });
  test('clamps a span that runs past the end of the window', () => {
    const set = pausedWeekKeys([{ startKey: '2026-04-20', weeks: 8 }], WEEKS);
    expect([...set].sort()).toEqual(['2026-04-20', '2026-04-27']);
  });
  test('ignores a span whose start is not in the window', () => {
    expect(pausedWeekKeys([{ startKey: '2025-01-01', weeks: 4 }], WEEKS).size).toBe(0);
  });
  test('unions multiple spans; empty inputs are safe', () => {
    const set = pausedWeekKeys(
      [{ startKey: '2026-03-30', weeks: 1 }, { startKey: '2026-04-27', weeks: 1 }],
      WEEKS,
    );
    expect([...set].sort()).toEqual(['2026-03-30', '2026-04-27']);
    expect(pausedWeekKeys([], WEEKS).size).toBe(0);
    expect(pausedWeekKeys(null, null).size).toBe(0);
  });
});

describe('streakState: addPauseSpan', () => {
  test('appends a new span', () => {
    expect(addPauseSpan([], '2026-04-06', 2)).toEqual([{ startKey: '2026-04-06', weeks: 2 }]);
  });
  test('renewing the same start replaces (no duplicate)', () => {
    const after = addPauseSpan([{ startKey: '2026-04-06', weeks: 2 }], '2026-04-06', 4);
    expect(after).toEqual([{ startKey: '2026-04-06', weeks: 4 }]);
  });
  test('floors weeks at 1', () => {
    expect(addPauseSpan([], '2026-04-06', 0)).toEqual([{ startKey: '2026-04-06', weeks: 1 }]);
  });
});

describe('streakState: recordHighWater', () => {
  test('raises the run for a week', () => {
    expect(recordHighWater({}, '2026-04-06', 5)).toEqual({ '2026-04-06': 5 });
  });
  test('never lowers a previously shown run (retro-shrink guard)', () => {
    const hw = { '2026-04-06': 9 };
    expect(recordHighWater(hw, '2026-04-06', 7)).toBe(hw); // unchanged reference
  });
  test('null run or week is a no-op', () => {
    const hw = { a: 1 };
    expect(recordHighWater(hw, '2026-04-06', null)).toBe(hw);
    expect(recordHighWater(hw, null, 5)).toBe(hw);
  });
});

describe('streakState: longestRun', () => {
  test('max across history and the current run', () => {
    expect(longestRun({ a: 8, b: 14, c: 3 }, 5)).toBe(14);
    expect(longestRun({ a: 8 }, 20)).toBe(20);
    expect(longestRun({}, 0)).toBe(0);
  });
});

describe('streakState: pendingMilestone', () => {
  test('returns the highest newly-crossed milestone not yet seen', () => {
    expect(pendingMilestone(4, [])).toBe(4);
    expect(pendingMilestone(13, [4])).toBe(12);
    expect(pendingMilestone(60, [4, 12, 26])).toBe(52);
  });
  test('null when nothing new is crossed', () => {
    expect(pendingMilestone(3, [])).toBeNull();
    expect(pendingMilestone(12, [4, 12])).toBeNull();
    expect(pendingMilestone(null, [])).toBeNull();
  });
  test('thresholds are 4/12/26/52', () => {
    expect(MILESTONES).toEqual([4, 12, 26, 52]);
  });
});

describe('streakState: pendingPerfectMonth', () => {
  // Build labelled weeks via the real engine.
  const kept = (k, target = 4) => ({ weekKey: k, completed: target, target, isDeload: false, paused: false });
  const current = (k, c, target = 4) => ({ weekKey: k, completed: c, target, isDeload: false, paused: false, isCurrent: true });
  const perfectWeeks = () => computeStreak({
    weeks: [kept('w1'), kept('w2'), kept('w3'), kept('w4'), current('w5', 1)],
  }).weeks;

  test('fires for a completed perfect month not yet seen', () => {
    const pm = pendingPerfectMonth(perfectWeeks(), []);
    expect(pm).not.toBeNull();
    expect(pm.lastWeekKey).toBe('w4');
  });

  test('returns null once that month has been seen (fires once)', () => {
    expect(pendingPerfectMonth(perfectWeeks(), ['w4'])).toBeNull();
  });

  test('null when there is no perfect month', () => {
    const weeks = computeStreak({ weeks: [kept('w1'), current('w2', 1)] }).weeks;
    expect(pendingPerfectMonth(weeks, [])).toBeNull();
  });
});

describe('pendingLongestRunPb (S2c, "every new all-time-high run")', () => {
  test('fires on a new high above the celebrated best', () => {
    expect(pendingLongestRunPb(5, 4)).toBe(5);
    expect(pendingLongestRunPb(9, 8)).toBe(9);
  });

  test('null at or below the celebrated best', () => {
    expect(pendingLongestRunPb(4, 4)).toBeNull();
    expect(pendingLongestRunPb(3, 5)).toBeNull();
  });

  test('never records a trivial run below the floor', () => {
    expect(LONGEST_RUN_PB_FLOOR).toBe(2);
    expect(pendingLongestRunPb(1, 0)).toBeNull();
  });

  test('defers to the milestone card on a fixed milestone value', () => {
    for (const m of MILESTONES) expect(pendingLongestRunPb(m, 1)).toBeNull();
    // a non-milestone value between milestones still fires
    expect(pendingLongestRunPb(5, 1)).toBe(5);
  });

  test('null until seeded (seen is null) so an existing run never retro-fires', () => {
    expect(pendingLongestRunPb(20, null)).toBeNull();
    expect(pendingLongestRunPb(20, undefined)).toBeNull();
  });
});
