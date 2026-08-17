/**
 * YearOfLiftsScreen.tonnageUnits.guard.test.js
 *
 * WAVE-D-FINDINGS.md UNIT_DEFECT (systemic, 7 sites across all four deck
 * builders, :118, :191, :255, :278, :344, :367, :436): every tonnage/volume
 * figure across buildCards/buildMonthCards/buildWeekCards/buildBlockCards
 * hard-coded 'kg moved'/'kg lifted'/'kg, best session', ignoring the `units`
 * parameter each function already accepts and already uses correctly for
 * every PR value in the same functions. Mirrors the already-fixed share-
 * card sibling exactly (recapPayload.js:51,
 * `const u = units === 'lbs' ? 'lbs' : 'kg';`).
 *
 * Behavioural pins against the real builder functions (not mocked), with
 * lbs fixtures, so an lbs user's on-screen story deck agrees with the
 * exported share card's unit for the identical numbers.
 */
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import { buildCards, buildMonthCards, buildWeekCards, buildBlockCards } from '../YearOfLiftsScreen';

function findUnit(cards, matcher) {
  const card = cards.find((c) => c.type === 'stat' && matcher(c));
  return card?.unit;
}

describe('YearOfLiftsScreen story-deck tonnage labels follow `units` (WAVE-D UNIT_DEFECT)', () => {
  const yearData = {
    yearStart: Date.parse('2026-01-01'),
    yearEnd: Date.parse('2026-12-31'),
    totalSessions: 120,
    avgSessionsPerWeek: 3,
    tonnage: 500000,
    previous: null,
    totalSets: 900,
    uniqueExercises: 20,
    topMonth: 'July',
    topExercises: [{ name: 'Bench Press', sets: 80 }],
    topPRs: [{ exerciseName: 'Bench Press', value: 100 }],
  };
  const lifetime = { sessions: 400, tonnage: 2000000, reps: 40000 };

  test('year deck: tonnage stat + lifetime-totals caption read lbs for an lbs user, kg by default', () => {
    const lbsCards = buildCards(yearData, 'lbs', { lifetime });
    expect(findUnit(lbsCards, (c) => c.icon === 'trending-up')).toBe('lbs moved');
    const lifetimeCardLbs = lbsCards.find((c) => c.icon === 'infinite');
    expect(lifetimeCardLbs.caption).toMatch(/lbs lifted/);
    expect(lifetimeCardLbs.caption).not.toMatch(/\bkg\b/);

    const kgCards = buildCards(yearData, 'kg', { lifetime });
    expect(findUnit(kgCards, (c) => c.icon === 'trending-up')).toBe('kg moved');
    const lifetimeCardKg = kgCards.find((c) => c.icon === 'infinite');
    expect(lifetimeCardKg.caption).toMatch(/kg lifted/);

    // No `units` supplied at all -> default to kg (unchanged default behaviour).
    const defaultCards = buildCards(yearData, undefined, { lifetime });
    expect(findUnit(defaultCards, (c) => c.icon === 'trending-up')).toBe('kg moved');
  });

  const monthData = {
    startMs: Date.parse('2026-07-01'),
    endMs: Date.parse('2026-08-01'),
    totalSessions: 12,
    avgSessionsPerWeek: 3,
    previous: null,
    tonnage: 40000,
    topExercises: [{ name: 'Squat', sets: 30 }],
    topPRs: [{ exerciseName: 'Squat', value: 150 }],
    bestSession: { tonnage: 5000, startedAt: Date.parse('2026-07-15') },
  };

  test('month deck: tonnage stat + best-session stat read lbs for an lbs user', () => {
    const lbsCards = buildMonthCards(monthData, 'lbs');
    expect(findUnit(lbsCards, (c) => c.icon === 'trending-up')).toBe('lbs moved');
    expect(findUnit(lbsCards, (c) => c.icon === 'flash')).toBe('lbs, best session');

    const kgCards = buildMonthCards(monthData, 'kg');
    expect(findUnit(kgCards, (c) => c.icon === 'trending-up')).toBe('kg moved');
    expect(findUnit(kgCards, (c) => c.icon === 'flash')).toBe('kg, best session');
  });

  const weekData = { ...monthData, totalSessions: 4 };

  test('week deck: tonnage stat + best-session stat read lbs for an lbs user', () => {
    const lbsCards = buildWeekCards(weekData, 'lbs');
    expect(findUnit(lbsCards, (c) => c.icon === 'trending-up')).toBe('lbs moved');
    expect(findUnit(lbsCards, (c) => c.icon === 'flash')).toBe('lbs, best session');

    const kgCards = buildWeekCards(weekData, 'kg');
    expect(findUnit(kgCards, (c) => c.icon === 'trending-up')).toBe('kg moved');
    expect(findUnit(kgCards, (c) => c.icon === 'flash')).toBe('kg, best session');
  });

  const blockData = {
    meso: { name: 'Hypertrophy Block', plannedWeeks: 6 },
    startDate: '2026-06-01',
    endDate: '2026-07-12',
    tonnageDelta: 12,
    prs: [{ exerciseName: 'Deadlift', value: 200 }],
    totalSessions: 18,
    totalSets: 150,
    tonnage: 60000,
  };

  test('block deck: the sessions/sets/tonnage caption reads lbs for an lbs user', () => {
    const lbsCards = buildBlockCards(blockData, 'lbs');
    const sessionsCard = lbsCards.find((c) => c.icon === 'layers');
    expect(sessionsCard.caption).toMatch(/lbs moved/);
    expect(sessionsCard.caption).not.toMatch(/\bkg\b/);

    const kgCards = buildBlockCards(blockData, 'kg');
    const sessionsCardKg = kgCards.find((c) => c.icon === 'layers');
    expect(sessionsCardKg.caption).toMatch(/kg moved/);
  });

  test('no residual hard-coded kg-only unit literal remains for any of the 7 sites', () => {
    // eslint-disable-next-line global-require
    const fs = require('fs');
    // eslint-disable-next-line global-require
    const path = require('path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'YearOfLiftsScreen.js'), 'utf8');
    expect(source).not.toMatch(/unit: 'kg moved'/);
    expect(source).not.toMatch(/unit: 'kg, best session'/);
    expect(source).not.toMatch(/kg lifted and/);
    expect(source).not.toMatch(/kg moved\.`/);
  });
});
