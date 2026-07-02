/**
 * COMP-005 — monthly + block recap card builders (pure).
 * Pins the delta-caption rules (never negative-framed; neutral under calm/ED),
 * the minimum-content rule, and the block climb slide.
 */

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the mount suites do. The screen module imports the vocabulary
// for the story tap-zone tick (M4), which pulls expo-haptics in at import
// time even though these tests only exercise the pure card builders.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import { buildMonthCards, buildBlockCards, buildCards } from '../YearOfLiftsScreen';

const MS = Date.UTC(2026, 5, 1); // 1 Jun 2026
const JUN_END = Date.UTC(2026, 6, 1); // 1 Jul 2026 (exclusive end)

function fullMonth(overrides = {}) {
  return {
    startMs: MS,
    endMs: JUN_END,
    totalSessions: 13,
    totalSets: 180,
    tonnage: 48200,
    avgSessionsPerWeek: 3.2,
    uniqueExercises: 14,
    topExercises: [{ name: 'Squat', sets: 24 }, { name: 'Bench', sets: 20 }],
    topPRs: [{ exerciseName: 'Squat', value: 142.5, reps: 3 }],
    bestSession: { startedAt: Date.UTC(2026, 5, 14), tonnage: 6840 },
    previous: { totalSessions: 11, tonnage: 43000 },
    ...overrides,
  };
}

const typesOf = (cards) => cards.map(c => c.type);
const find = (cards, pred) => cards.find(pred);

describe('buildMonthCards', () => {
  test('full month: intro + content + outro, positive deltas surfaced', () => {
    const cards = buildMonthCards(fullMonth(), 'kg', { label: 'June' });
    expect(cards[0].type).toBe('intro');
    expect(cards[0].headline).toBe('June, in numbers.');
    expect(cards[cards.length - 1].type).toBe('outro');
    const sessions = find(cards, c => c.unit && c.unit.includes('session'));
    expect(sessions.caption).toBe("That's 2 more than the month before.");
    const volume = find(cards, c => c.unit === 'kg moved');
    expect(volume.caption).toBe("That's 12% more than the month before.");
  });

  test('neutral (calm/ED): deltas go factual, no month-vs-month comparison', () => {
    const cards = buildMonthCards(fullMonth(), 'kg', { label: 'June', neutral: true });
    const sessions = find(cards, c => c.unit && c.unit.includes('session'));
    expect(sessions.caption).toMatch(/roughly 3\.2 sessions a week/);
    const volume = find(cards, c => c.unit === 'kg moved');
    expect(volume.caption).toBe("That's every set you logged, added together.");
  });

  test('down month is never negative-framed', () => {
    const cards = buildMonthCards(fullMonth({ totalSessions: 9, previous: { totalSessions: 13, tonnage: 50000 } }), 'kg', { label: 'June' });
    const sessions = find(cards, c => c.unit && c.unit.includes('session'));
    expect(sessions.caption).not.toMatch(/fewer|less|down/i);
    const volume = find(cards, c => c.unit === 'kg moved');
    expect(volume.caption).toBe("That's every set you logged, added together."); // no "down X%"
  });

  test('minimum-content rule: < 3 content cards → intro + sessions + outro, softened', () => {
    const thin = {
      startMs: MS, endMs: JUN_END, totalSessions: 2, totalSets: 12, tonnage: 0,
      avgSessionsPerWeek: 0.5, uniqueExercises: 1, topExercises: [], topPRs: [], bestSession: null, previous: null,
    };
    const cards = buildMonthCards(thin, 'kg', { label: 'June' });
    expect(typesOf(cards)).toEqual(['intro', 'stat', 'outro']);
    expect(find(cards, c => c.unit && c.unit.includes('session')).caption).toBe('2 sessions logged this month, and every one counts.');
  });

  test('null data → empty deck', () => {
    expect(buildMonthCards(null, 'kg', {})).toEqual([]);
  });
});

describe('buildCards (Year of Lifts) — tonnage year-over-year anchor (ULTIMATE-WR-5)', () => {
  function fullYear(overrides = {}) {
    return {
      totalSessions: 130, totalSets: 1800, tonnage: 48000,
      avgSessionsPerWeek: 2.5, uniqueExercises: 22,
      topExercises: [{ name: 'Squat', sets: 200 }],
      topPRs: [{ exerciseName: 'Squat', value: 150, reps: 3 }],
      topMonth: 'March',
      monthlyBreakdown: Array.from({ length: 12 }, (_, i) => ({ month: i, sessions: 10 })),
      yearStart: Date.UTC(2025, 5, 1), yearEnd: Date.UTC(2026, 5, 1),
      previous: { totalSessions: 110, tonnage: 40000 },
      ...overrides,
    };
  }
  const volumeOf = (cards) => find(cards, c => c.unit === 'kg moved');

  test('an up year surfaces a factual relative %', () => {
    const v = volumeOf(buildCards(fullYear(), 'kg'));
    expect(v.value).toBe('48,000'); // raw number stays the hero, numbers-first
    expect(v.caption).toBe("That's 20% more than the year before.");
  });

  test('a sub-1% increase falls back to the generic line (never "Up 0%")', () => {
    // 48000 vs 47800 = +0.42% → rounds to 0; must not render "Up 0% on the year before."
    const v = volumeOf(buildCards(fullYear({ tonnage: 48000, previous: { totalSessions: 110, tonnage: 47800 } }), 'kg'));
    expect(v.caption).toBe("That's every set you logged this year, added together.");
    expect(v.caption).not.toMatch(/Up 0%/);
  });

  test('a down year is never negative-framed (falls back to the generic line)', () => {
    const v = volumeOf(buildCards(fullYear({ tonnage: 38000, previous: { totalSessions: 110, tonnage: 40000 } }), 'kg'));
    expect(v.caption).toBe("That's every set you logged this year, added together.");
    expect(v.caption).not.toMatch(/down|less|fewer|-/i);
  });

  test('neutral (calm / ED flag) suppresses the comparison', () => {
    const v = volumeOf(buildCards(fullYear(), 'kg', { neutral: true }));
    expect(v.caption).toBe("That's every set you logged this year, added together.");
  });

  test('no previous window → generic caption, never a fabricated comparison', () => {
    const v = volumeOf(buildCards(fullYear({ previous: null }), 'kg'));
    expect(v.caption).toBe("That's every set you logged this year, added together.");
  });

  test('null data → empty deck', () => {
    expect(buildCards(null, 'kg')).toEqual([]);
  });
});

describe('buildBlockCards', () => {
  const block = {
    meso: { name: 'Hypertrophy Block One', plannedWeeks: 6 },
    totalSessions: 18, totalSets: 240, tonnage: 62000,
    tonnageDelta: 18,
    prs: [{ exerciseName: 'Deadlift', value: 200, reps: 2 }],
    startDate: '2026-03-03', endDate: '2026-04-13',
  };

  test('climb slide surfaces a positive tonnageDelta', () => {
    const cards = buildBlockCards(block, 'kg');
    const climb = find(cards, c => c.unit === 'weekly volume');
    expect(climb.value).toBe('+18%');
    expect(climb.caption).toMatch(/climb is the block working/);
  });

  test('deload-ending (negative delta) reads rest-positive', () => {
    const cards = buildBlockCards({ ...block, tonnageDelta: -12 }, 'kg');
    const climb = find(cards, c => c.unit === 'weekly volume');
    expect(climb.value).toBe('-12%');
    expect(climb.caption).toMatch(/plan working/);
  });

  test('null tonnageDelta drops the climb slide', () => {
    const cards = buildBlockCards({ ...block, tonnageDelta: null }, 'kg');
    expect(find(cards, c => c.unit === 'weekly volume')).toBeUndefined();
  });

  test('intro shape line + totals + outro present', () => {
    const cards = buildBlockCards(block, 'kg');
    expect(cards[0].headline).toBe('Hypertrophy Block One');
    expect(cards[0].subline).toMatch(/6 weeks/);
    expect(cards[cards.length - 1].headline).toMatch(/block is done/);
  });
});
