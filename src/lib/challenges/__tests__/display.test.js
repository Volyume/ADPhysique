/**
 * Gym challenge display lines: the sentences the Challenge screen, the Home
 * card and the Community entries print. Pins the withheld rule (no food or
 * weigh-in row, failing closed) and the draw and gap wording.
 */
import {
  partRows, showCoachingCard, daysLeftLine, drawLines, countsLine, pointsText, scoreLine,
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

test('four core rows always; three coaching rows only when set up and not withheld', () => {
  expect(partRows(score(), { coachingSetUp: true }).coaching.map((r) => r.key)).toEqual(['checkin', 'food', 'weighin']);
  expect(partRows(score(), { coachingSetUp: false }).coaching).toEqual([]);
  expect(partRows(score(), { coachingSetUp: true }).core).toHaveLength(4);
});

test('a withheld caller never gets a food or weigh-in row', () => {
  const rows = partRows(score({ withheld: true }), { coachingSetUp: true });
  expect(rows.coaching.map((r) => r.key)).toEqual(['checkin']);
});

test('a missing withheld flag fails closed', () => {
  const s = score();
  delete s.withheld;
  expect(partRows(s, { coachingSetUp: true }).coaching.map((r) => r.key)).toEqual(['checkin']);
  expect(showCoachingCard(s, false)).toBe(false);
});

test('the coaching card is for a clear, not-set-up caller only', () => {
  expect(showCoachingCard(score(), false)).toBe(true);
  expect(showCoachingCard(score(), true)).toBe(false);
  expect(showCoachingCard(score({ withheld: true }), false)).toBe(false);
});

test('detail lines are plain', () => {
  const rows = partRows(score(), { coachingSetUp: true });
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
