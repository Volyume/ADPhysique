/**
 * EP-23/UI-11 (end-user-polish audit, 2026-07-12): buildCards, buildMonthCards,
 * buildWeekCards and buildBlockCards each built their "Personal bests" list
 * with `${parseFloat(pr.value).toFixed(1)}${units}`. A PR record's `value`
 * can be malformed after a bad restore/import/sync (a corrupted string is
 * the simplest reproduction), which silently rendered the string "NaNkg"
 * rather than throwing. Pins the fix against the real, exported (pure) card
 * builders: a malformed PR value never produces "NaN" in the built card.
 */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import {
  buildCards, buildMonthCards, buildWeekCards, buildBlockCards,
} from '../YearOfLiftsScreen';

const BAD_PR = { exerciseName: 'Barbell bench press', value: 'corrupt', reps: 5 };

function personalBestsRows(cards) {
  const card = cards.find(c => c.headline === 'Personal bests');
  return card ? card.rows : null;
}

describe('YearOfLiftsScreen PR-value guard (EP-23/UI-11)', () => {
  test('buildCards (year): a malformed PR value never renders "NaN"', () => {
    const cards = buildCards({
      yearStart: Date.UTC(2026, 0, 1),
      yearEnd: Date.UTC(2026, 11, 31),
      totalSessions: 0,
      tonnage: 0,
      totalSets: 0,
      topPRs: [BAD_PR],
    }, 'kg');

    const rows = personalBestsRows(cards);
    expect(rows).toHaveLength(1);
    expect(rows[0].secondary).not.toMatch(/NaN/);
    expect(rows[0].primary).toBe('Barbell bench press');
  });

  test('buildMonthCards: a malformed PR value never renders "NaN"', () => {
    // The minimum-content rule drops the whole content deck (including the
    // Personal bests card) below 3 content cards, so sessions/tonnage/top
    // exercises are populated here purely to clear that threshold and keep
    // the PR card in the built deck.
    const cards = buildMonthCards({
      startMs: Date.UTC(2026, 5, 1),
      endMs: Date.UTC(2026, 6, 1),
      totalSessions: 13,
      totalSets: 180,
      tonnage: 48200,
      avgSessionsPerWeek: 3.2,
      topExercises: [{ name: 'Squat', sets: 24 }],
      topPRs: [BAD_PR],
    }, 'kg', { label: 'June' });

    const rows = personalBestsRows(cards);
    expect(rows).toHaveLength(1);
    expect(rows[0].secondary).not.toMatch(/NaN/);
  });

  test('buildWeekCards: a malformed PR value never renders "NaN"', () => {
    const cards = buildWeekCards({
      startMs: Date.UTC(2026, 5, 1),
      endMs: Date.UTC(2026, 5, 8),
      totalSessions: 5,
      totalSets: 40,
      tonnage: 8000,
      topExercises: [{ name: 'Squat', sets: 12 }],
      topPRs: [BAD_PR],
    }, 'kg', { label: 'This week' });

    const rows = personalBestsRows(cards);
    expect(rows).toHaveLength(1);
    expect(rows[0].secondary).not.toMatch(/NaN/);
  });

  test('buildBlockCards: a malformed PR value never renders "NaN"', () => {
    const cards = buildBlockCards({
      totalSessions: 1,
      totalSets: 1,
      tonnage: 100,
      tonnageDelta: 0,
      prs: [BAD_PR],
    }, 'kg');

    const rows = personalBestsRows(cards);
    expect(rows).toHaveLength(1);
    expect(rows[0].secondary).not.toMatch(/NaN/);
  });
});
