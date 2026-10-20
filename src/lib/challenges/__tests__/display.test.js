/**
 * Gym challenge display lines: the sentences the Challenge screen, the Home
 * card and the Community entries print. Pins the withheld rule (no food or
 * weigh-in row, failing closed, withheld when the server OR the device's own
 * gate says so), the join screen's scoring table, the finished statuses and
 * the terms link, and the draw and gap wording.
 */
import {
  partRows, showCoachingCard, isWithheld, joinScoring, isChallengeFinished, termsLink,
  daysLeftLine, drawLines, countsLine, pointsText, scoreLine,
} from '../display';

const score = (over = {}) => ({
  total: 50,
  parts: { train: 20, week: 5, stronger: 3, community: 2, checkin: 5, food: 3, weighin: 2 },
  max: { train: 40, week: 15, stronger: 15, community: 10, checkin: 10, food: 6, weighin: 4 },
  detail: { training_days: 6, target_days: 12, weeks_hit: 1, weeks: 4, lifts_beaten: 1, posts_weeks: 1,
    checkins: 2, checkins_target: 4, food_days: 5, food_cap: 12, weighin_weeks: 2 },
  withheld: false, tier: null, to_main: 20, to_second: 0, ...over,
});

test('points drop a trailing .0', () => {
  expect(pointsText(12.5)).toBe('12.5');
  expect(pointsText(9)).toBe('9');
  expect(pointsText(9.04)).toBe('9');
});

test('four core rows always; three coaching rows only when set up and clear on both gates', () => {
  const clear = { coachingSetUp: true, deviceWithheld: false };
  expect(partRows(score(), clear).coaching.map((r) => r.key)).toEqual(['checkin', 'food', 'weighin']);
  expect(partRows(score(), { ...clear, coachingSetUp: false }).coaching).toEqual([]);
  expect(partRows(score(), clear).core).toHaveLength(4);
});

test('a withheld caller never gets a food or weigh-in row', () => {
  const rows = partRows(score({ withheld: true }), { coachingSetUp: true, deviceWithheld: false });
  expect(rows.coaching.map((r) => r.key)).toEqual(['checkin']);
});

test('the device gate alone withholds, even when the server says withheld: false', () => {
  const rows = partRows(score({ withheld: false }), { coachingSetUp: true, deviceWithheld: true });
  expect(rows.coaching.map((r) => r.key)).toEqual(['checkin']);
  expect(showCoachingCard(score({ withheld: false }), false, true)).toBe(false);
  expect(isWithheld(score({ withheld: false }), true)).toBe(true);
});

test('a missing withheld flag fails closed, on either gate', () => {
  const s = score();
  delete s.withheld;
  expect(partRows(s, { coachingSetUp: true, deviceWithheld: false }).coaching.map((r) => r.key)).toEqual(['checkin']);
  expect(showCoachingCard(s, false, false)).toBe(false);
  // The device gate unresolved (undefined) is withheld too.
  expect(partRows(score(), { coachingSetUp: true }).coaching.map((r) => r.key)).toEqual(['checkin']);
  expect(showCoachingCard(score(), false)).toBe(false);
  expect(isWithheld(null, false)).toBe(true);
  expect(isWithheld(score(), false)).toBe(false);
});

test('the coaching card is for a clear, not-set-up caller only', () => {
  expect(showCoachingCard(score(), false, false)).toBe(true);
  expect(showCoachingCard(score(), true, false)).toBe(false);
  expect(showCoachingCard(score({ withheld: true }), false, false)).toBe(false);
});

test('detail lines are plain', () => {
  const rows = partRows(score(), { coachingSetUp: true, deviceWithheld: false });
  const by = Object.fromEntries([...rows.core, ...rows.coaching].map((r) => [r.key, r.detail]));
  expect(by.train).toBe('6 of 12 training days');
  expect(by.week).toBe('1 of 4 weeks hit');
  expect(by.checkin).toBe('2 of 4 check-ins');
  expect(by.food).toBe('5 of 12 days logged');
});

test('draw and gap lines', () => {
  const c = { status: 'active', main_threshold: 70, second_threshold: 50 };
  expect(drawLines(score({ tier: 'main', to_main: 0 }), c)).toEqual(['You are in the main draw.']);
  expect(drawLines(score({ tier: 'second', to_main: 8 }), c)).toEqual(['You are in the second draw.', '8 more points for the main draw.']);
  expect(drawLines(score({ tier: 'second', to_main: 1 }), c)[1]).toBe('1 more point for the main draw.');
  expect(drawLines(score({ tier: null, to_second: 5, to_main: 25 }), c)).toEqual(['5 more points for the second draw, 25 for the main draw.']);
  expect(drawLines(score({ tier: null }), { status: 'closed' })).toEqual([]);
});

test('days left, counts and score lines', () => {
  expect(daysLeftLine({ status: 'active', days_left: 1 })).toBe('1 day left');
  expect(daysLeftLine({ status: 'active', days_left: 12 })).toBe('12 days left');
  expect(countsLine({ main: 1, second: 3 }, { main_threshold: 70, second_threshold: 50 }))
    .toBe('1 member has reached 70 points, and 3 have reached 50.');
  expect(countsLine({ main: 0, second: 1 }, { main_threshold: 70, second_threshold: 50 }))
    .toBe('0 members have reached 70 points, and 1 has reached 50.');
  expect(scoreLine({ total: 62 })).toBe('Your score: 62 of 100');
});

test('the join screen table: food and weigh-in rows and their invitation only when the device is clear', () => {
  const clear = joinScoring(false);
  expect(clear.core).toHaveLength(4);
  expect(clear.coaching.map((r) => r.label)).toEqual(['Weekly check-in', 'Food logging', 'Weekly weigh-in']);
  expect(clear.note).toBe('Coaching adds up to 20 more points. Without it you can still reach 80.');
  for (const gate of [true, undefined, null]) {
    const w = joinScoring(gate);
    expect(w.coaching.map((r) => r.label)).toEqual(['Weekly check-in']);
    expect(w.note).toBe('Weekly check-ins with coaching add up to 10 more points.');
    expect(w.note).not.toMatch(/food|weigh/i);
  }
});

test('ended, closed and cancelled are finished; upcoming and active are not', () => {
  for (const status of ['ended', 'closed', 'cancelled']) expect(isChallengeFinished({ status })).toBe(true);
  for (const status of ['upcoming', 'active']) expect(isChallengeFinished({ status })).toBe(false);
  expect(isChallengeFinished(null)).toBe(false);
});

test('the terms link is the server URL as given, or null when there is nothing safe to open', () => {
  expect(termsLink({ terms_url: 'https://volyume.app/challenge-terms/?c=volt-nov-3f9a1c2e' }))
    .toBe('https://volyume.app/challenge-terms/?c=volt-nov-3f9a1c2e');
  expect(termsLink({ terms_url: '' })).toBeNull();
  expect(termsLink({})).toBeNull();
  expect(termsLink(null)).toBeNull();
  expect(termsLink({ terms_url: 'javascript:alert(1)' })).toBeNull();
});

// Usage data for challenge_viewed: the band of the five non-food parts (out of
// 90) and a count of those that are full, the same two fields for everyone.
// The total, tier, food and weigh-in lean upward for a withheld entrant
// (credited in full without logging), so none of them is read.
describe('challengeTelemetryFields', () => {
  const { challengeTelemetryFields, corePointsBand } = require('../display');
  const max = { train: 40, week: 15, stronger: 15, community: 10, checkin: 10, food: 6, weighin: 4 };
  const parts = (sum) => ({ train: sum, week: 0, stronger: 0, community: 0, checkin: 0 });

  test('bands the five non-food parts out of 90', () => {
    expect([0, 19, 20, 39, 40, 59, 60, 74, 75, 90].map((v) => corePointsBand(parts(v))))
      .toEqual(['0-19', '0-19', '20-39', '20-39', '40-59', '40-59', '60-74', '60-74', '75-90', '75-90']);
    expect(corePointsBand(null)).toBeNull();
  });

  test('counts full parts among the five non-food parts', () => {
    const p = { train: 40, week: 15, stronger: 9, community: 10, checkin: 5, food: 6, weighin: 4 };
    expect(challengeTelemetryFields({ total: 89, parts: p, max })).toEqual({ points_band_90: '75-90', parts_full: 3 });
  });

  test('food, weigh-in, the total and the withheld flag never change the fields', () => {
    const base = { train: 30, week: 11, stronger: 9, community: 6, checkin: 5 };
    const a = challengeTelemetryFields({ total: 61, withheld: false, tier: 'second', parts: { ...base, food: 0, weighin: 0 }, max });
    const b = challengeTelemetryFields({ total: 71, withheld: true, tier: 'main', parts: { ...base, food: 6, weighin: 4 }, max });
    expect(a).toEqual(b);
    expect(Object.keys(a).sort()).toEqual(['parts_full', 'points_band_90']);
  });

  test('no score: nothing', () => {
    expect(challengeTelemetryFields(null)).toEqual({});
  });
});
