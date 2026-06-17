/**
 * checkinDerive — pure display-tier derivations for the weekly check-in. These
 * are pre-selected verdicts the user always sees and can override; NOT the ED
 * safety system. Tests lock the verdict thresholds and the date/text helpers.
 */
import {
  formatWeekRange,
  hasLoggedToday,
  earliestWeightTs,
  deriveTrainingPerformance,
  deriveCalsAdherence,
  stripAutoNotes,
} from '../checkinDerive';
import { todayLocalKey, parseLocalDay } from '../dayKey';

describe('formatWeekRange', () => {
  test('spans Monday to the following Sunday', () => {
    const mon = parseLocalDay('2026-06-15'); // a Monday
    expect(formatWeekRange(mon)).toBe('Mon 15 Jun – Sun 21 Jun');
  });
});

describe('hasLoggedToday', () => {
  test('false for empty or missing input', () => {
    expect(hasLoggedToday(null)).toBe(false);
    expect(hasLoggedToday([])).toBe(false);
  });

  test('true when a weight is stamped with the local today', () => {
    const todayMs = parseLocalDay(todayLocalKey()).getTime() + 9 * 3600000; // 9am today
    expect(hasLoggedToday([{ loggedAt: todayMs }])).toBe(true);
  });

  test('false when the only weight is from another day', () => {
    const longAgo = parseLocalDay('2020-01-01').getTime();
    expect(hasLoggedToday([{ logged_at: longAgo }])).toBe(false);
  });
});

describe('earliestWeightTs', () => {
  test('null with no weights', () => {
    expect(earliestWeightTs([])).toBeNull();
    expect(earliestWeightTs(null)).toBeNull();
  });

  test('returns the smallest valid timestamp across field shapes', () => {
    expect(earliestWeightTs([
      { loggedAt: 3000 },
      { logged_at: 1000 },
      { loggedAt: 2000 },
    ])).toBe(1000);
  });
});

describe('deriveTrainingPerformance', () => {
  test('null with no plan or no completed sessions', () => {
    expect(deriveTrainingPerformance({ completed: 0, planned: 4 })).toBeNull();
    expect(deriveTrainingPerformance({ completed: 3, planned: 0 })).toBeNull();
  });

  test('dropped when fewer than half the sessions were done', () => {
    expect(deriveTrainingPerformance({ completed: 1, planned: 4, prs: 0, volDeltaPct: 0 })).toBe('dropped');
  });

  test('exceeded on a full plan with a PR or clearly more volume', () => {
    expect(deriveTrainingPerformance({ completed: 4, planned: 4, prs: 1, volDeltaPct: null })).toBe('exceeded');
    expect(deriveTrainingPerformance({ completed: 4, planned: 4, prs: 0, volDeltaPct: 0.05 })).toBe('exceeded');
  });

  test('struggled when volume fell away even on a near-full plan', () => {
    expect(deriveTrainingPerformance({ completed: 4, planned: 4, prs: 0, volDeltaPct: -0.10 })).toBe('struggled');
  });

  test('hit when on plan and holding', () => {
    expect(deriveTrainingPerformance({ completed: 4, planned: 4, prs: 0, volDeltaPct: 0 })).toBe('hit');
    expect(deriveTrainingPerformance({ completed: 9, planned: 10, prs: 0, volDeltaPct: 0 })).toBe('hit');
  });

  test('struggled as the mid-range fallback', () => {
    expect(deriveTrainingPerformance({ completed: 3, planned: 4, prs: 0, volDeltaPct: 0 })).toBe('struggled');
  });
});

describe('deriveCalsAdherence', () => {
  test('null without a target or any logged day', () => {
    expect(deriveCalsAdherence({ rollups: [{ kcal_total: 2000 }], targetKcal: 0 })).toBeNull();
    expect(deriveCalsAdherence({ rollups: [], targetKcal: 2000 })).toBeNull();
    expect(deriveCalsAdherence({ rollups: [{ kcal_total: 0 }], targetKcal: 2000 })).toBeNull();
  });

  test('ignores NaN/zero days when averaging', () => {
    // Only the 2000 day counts -> exactly on target -> yes.
    expect(deriveCalsAdherence({
      rollups: [{ kcal_total: NaN }, { kcal_total: 0 }, { kcal_total: 2000 }],
      targetKcal: 2000,
    })).toBe('yes');
  });

  test('yes within 10% of target, no beyond it', () => {
    expect(deriveCalsAdherence({ rollups: [{ kcal_total: 2180 }], targetKcal: 2000 })).toBe('yes'); // +9%
    expect(deriveCalsAdherence({ rollups: [{ kcal_total: 2300 }], targetKcal: 2000 })).toBe('no');  // +15%
  });
});

describe('stripAutoNotes', () => {
  test('returns empty for falsy input', () => {
    expect(stripAutoNotes('')).toBe('');
    expect(stripAutoNotes(null)).toBe('');
  });

  test('removes the appended joint and sore lines, keeping the user note', () => {
    const raw = 'Felt strong this week. Joint pain flagged this week. Sore: quads, glutes.';
    expect(stripAutoNotes(raw)).toBe('Felt strong this week.');
  });

  test('collapses whitespace from a note that was only auto-lines', () => {
    expect(stripAutoNotes('Joint pain flagged this week. Sore: back.')).toBe('');
  });
});
