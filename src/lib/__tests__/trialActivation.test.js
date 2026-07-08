import {
  FIRST_CHECKIN_MIN_DAYS,
  MIN_WEIGH_INS,
  TRIAL_LENGTH_DAYS,
  trialStartFromEndsAt,
  trialDay3FireDate,
  firstReviewUnlockDate,
  dayName,
  selectTrialVariant,
  trialDay3Push,
  trialBannerLine,
} from '../trialActivation';

const DAY = 86400000;
// A fixed local-noon anchor so weekday maths is deterministic regardless of
// the machine clock. 2026-06-10 is a Wednesday.
const WED = new Date(2026, 5, 10, 12, 0, 0, 0).getTime();

describe('trialActivation: trial-start + day-3 fire date', () => {
  test('trial start is 14 days before the stored end', () => {
    const endsAt = WED + TRIAL_LENGTH_DAYS * DAY;
    expect(trialStartFromEndsAt(endsAt)).toBe(WED);
  });

  test('day-3 fire date is trial start + 3 days at 10:00 local', () => {
    const endsAt = WED + TRIAL_LENGTH_DAYS * DAY;
    const fire = trialDay3FireDate(endsAt);
    expect(fire.getHours()).toBe(10);
    expect(Math.round((fire.getTime() - new Date(2026, 5, 10, 10).getTime()) / DAY)).toBe(3);
  });

  test('null end date yields null', () => {
    expect(trialStartFromEndsAt(null)).toBeNull();
    expect(trialDay3FireDate(null)).toBeNull();
  });
});

describe('trialActivation: firstReviewUnlockDate gate parity', () => {
  // The check-in gate (WeeklyCheckInScreen) opens when: today === checkinDay,
  // floor((now - firstWeight)/DAY) >= FIRST_CHECKIN_MIN_DAYS, and >= MIN_WEIGH_INS
  // weigh-ins in the trailing 7d. The date helper enforces day + the 5-day floor
  // (weigh-ins are future-conditional). Re-derive the gate here and assert the
  // named date is one the gate is open for at every hour of that day.
  function gateTooSoonAt(instantMs, firstWeightAt) {
    return Math.floor((instantMs - firstWeightAt) / DAY) < FIRST_CHECKIN_MIN_DAYS;
  }

  test('Sunday starter, Sunday check-in → first review is the following Sunday (day 7)', () => {
    const sun = new Date(2026, 5, 7, 9, 0, 0, 0).getTime(); // 2026-06-07 is a Sunday, 09:00
    const unlock = firstReviewUnlockDate(sun, 0, sun);
    expect(dayName(unlock)).toBe('Sunday');
    expect(Math.round((unlock.getTime() - new Date(2026, 5, 7, 0).getTime()) / DAY)).toBe(7);
  });

  test('Wednesday starter, Sunday check-in → first review is day 11 (the second Sunday)', () => {
    const wed = new Date(2026, 5, 10, 9, 0, 0, 0).getTime(); // Wednesday 09:00
    const unlock = firstReviewUnlockDate(wed, 0, wed);
    expect(dayName(unlock)).toBe('Sunday');
    // The first Sunday (day 4) is too soon (<5 days); the next Sunday is day 11.
    expect(Math.round((unlock.getTime() - new Date(2026, 5, 10, 0).getTime()) / DAY)).toBe(11);
  });

  test('the named day is open at its local midnight AND its local 23:59 (never broken)', () => {
    for (let checkinDay = 0; checkinDay < 7; checkinDay++) {
      for (let offsetH = 0; offsetH < 24; offsetH += 6) {
        const firstWeight = new Date(2026, 5, 8, offsetH, 30, 0, 0).getTime();
        const unlock = firstReviewUnlockDate(firstWeight, checkinDay, firstWeight);
        expect(unlock).not.toBeNull();
        expect(unlock.getDay()).toBe(checkinDay);
        const midnight = new Date(unlock); midnight.setHours(0, 0, 0, 0);
        const lastMinute = new Date(unlock); lastMinute.setHours(23, 59, 0, 0);
        // gate must NOT be "too soon" at any point of the named day
        expect(gateTooSoonAt(midnight.getTime(), firstWeight)).toBe(false);
        expect(gateTooSoonAt(lastMinute.getTime(), firstWeight)).toBe(false);
      }
    }
  });

  test('null inputs yield null', () => {
    expect(firstReviewUnlockDate(null, 0)).toBeNull();
    expect(firstReviewUnlockDate(WED, null)).toBeNull();
  });
});

describe('trialActivation: variant selection', () => {
  test('S1 when training and weighing', () => {
    expect(selectTrialVariant({ completedSessions: 3, weighIns7d: 4 })).toBe('S1');
    expect(selectTrialVariant({ completedSessions: 1, weighIns7d: MIN_WEIGH_INS })).toBe('S1');
  });
  test('S2 when training but under-weighing', () => {
    expect(selectTrialVariant({ completedSessions: 2, weighIns7d: 1 })).toBe('S2');
    expect(selectTrialVariant({ completedSessions: 1, weighIns7d: 0 })).toBe('S2');
  });
  test('S3 when no sessions, regardless of weigh-ins', () => {
    expect(selectTrialVariant({ completedSessions: 0, weighIns7d: 5 })).toBe('S3');
    expect(selectTrialVariant({})).toBe('S3');
  });
});

describe('trialActivation: copy', () => {
  test('S1 push names counts and the dated readiness with a keep-logging promise', () => {
    expect(trialDay3Push({ variant: 'S1', completedSessions: 3, weighIns7d: 4, unlockDayName: 'Sunday' }))
      .toEqual({
        title: 'Your coach has a read on you',
        body: '3 sessions and 4 weigh-ins logged. Keep logging and your first coaching review is ready on Sunday.',
      });
  });
  test('S2 push states the concrete remaining ask', () => {
    expect(trialDay3Push({ variant: 'S2', completedSessions: 2, weighIns7d: 1, unlockDayName: 'Sunday' }))
      .toEqual({
        title: 'Your coach can see your training',
        body: '2 sessions logged. 2 more morning weigh-ins and your first coaching review is ready on Sunday.',
      });
  });
  test('S3 push points at the smallest step, no weight ask', () => {
    const p = trialDay3Push({ variant: 'S3' });
    expect(p.title).toBe('Your plan is ready when you are');
    expect(p.body).not.toMatch(/weigh/i);
  });
  test('S2 singular weigh-in pluralises correctly', () => {
    expect(trialDay3Push({ variant: 'S2', completedSessions: 1, weighIns7d: 2, unlockDayName: 'Monday' }).body)
      .toBe('1 session logged. 1 more morning weigh-in and your first coaching review is ready on Monday.');
  });

  test('banner: S1 shows counts, advances at the day-7 midpoint', () => {
    expect(trialBannerLine({ variant: 'S1', completedSessions: 3, weighIns7d: 4, unlockDayName: 'Sunday', trialDay: 3 }))
      .toBe('First coaching review is ready Sunday - 3 sessions, 4 weigh-ins in');
    expect(trialBannerLine({ variant: 'S1', completedSessions: 3, weighIns7d: 4, unlockDayName: 'Sunday', trialDay: 7 }))
      .toBe('Half-way. Your first coaching review is ready Sunday');
  });
  test('banner: open ED flag falls back to a neutral line with no weigh-in counts or weight ask', () => {
    const line = trialBannerLine({ variant: 'S2', completedSessions: 2, weighIns7d: 0, unlockDayName: 'Sunday', trialDay: 3, edFlagOpen: true });
    expect(line).toBe('First coaching review is ready Sunday');
    expect(line).not.toMatch(/weigh/i);
  });
  test('banner: S3 invites the first session', () => {
    expect(trialBannerLine({ variant: 'S3', trialDay: 2 }))
      .toBe('Your 14-day trial is live. One session starts your first coaching review.');
  });
});
