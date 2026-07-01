/**
 * A3: the coach ledger must count against the SAME published thresholds the
 * check-in gate enforces (MIN_WEIGH_INS / FIRST_CHECKIN_MIN_DAYS, single
 * source of truth in trialActivation.js), never show weigh-in counts under an
 * open ED flag, and name an unlock date the gate will actually honour.
 */
import {
  buildCoachLedger,
  buildHoldReceipt,
  formatUnlockDate,
} from '../coachLedger';
import {
  MIN_WEIGH_INS,
  FIRST_CHECKIN_MIN_DAYS,
  firstReviewUnlockDate,
} from '../trialActivation';

const DAY = 86400000;
// A fixed Wednesday 10:00 local so weekday maths is deterministic.
const WED = new Date(2026, 5, 24, 10, 0, 0, 0).getTime(); // 24 June 2026

describe('buildCoachLedger: rows vs published thresholds', () => {
  test('day 1, nothing logged: every row open, counts at zero', () => {
    const l = buildCoachLedger({ now: WED });
    expect(l.variant).toBe('full');
    expect(l.rows).toHaveLength(3);
    const byKey = Object.fromEntries(l.rows.map(r => [r.key, r]));
    expect(byKey.weighIns.done).toBe(false);
    expect(byKey.weighIns.label).toBe(`0 of ${MIN_WEIGH_INS} morning weigh-ins this week`);
    expect(byKey.days.done).toBe(false);
    expect(byKey.days.label).toBe('First morning weight starts the clock');
    expect(byKey.sessions.done).toBe(false);
  });

  test('counts tick up and complete exactly at the gate thresholds', () => {
    const l = buildCoachLedger({
      weighIns7d: MIN_WEIGH_INS,
      completedSessions: 2,
      firstWeightAt: WED - FIRST_CHECKIN_MIN_DAYS * DAY,
      now: WED,
    });
    expect(l.rows.every(r => r.done)).toBe(true);
    expect(l.rows.find(r => r.key === 'sessions').label).toBe('2 training sessions logged');
  });

  test('one short of each threshold stays open (gate parity)', () => {
    const l = buildCoachLedger({
      weighIns7d: MIN_WEIGH_INS - 1,
      firstWeightAt: WED - (FIRST_CHECKIN_MIN_DAYS - 1) * DAY,
      now: WED,
    });
    expect(l.rows.find(r => r.key === 'weighIns').done).toBe(false);
    expect(l.rows.find(r => r.key === 'days').done).toBe(false);
  });

  test('over-achievement never renders past the threshold (no "5 of 3")', () => {
    const l = buildCoachLedger({ weighIns7d: 7, now: WED });
    expect(l.rows.find(r => r.key === 'weighIns').label)
      .toBe(`${MIN_WEIGH_INS} of ${MIN_WEIGH_INS} morning weigh-ins this week`);
  });

  test('day counter is 1-based for humans, capped at the threshold', () => {
    const day1 = buildCoachLedger({ firstWeightAt: WED - 1000, now: WED });
    expect(day1.rows.find(r => r.key === 'days').label)
      .toBe(`Day 1 of ${FIRST_CHECKIN_MIN_DAYS} days of data`);
    const day9 = buildCoachLedger({ firstWeightAt: WED - 9 * DAY, now: WED });
    expect(day9.rows.find(r => r.key === 'days').label)
      .toBe(`Day ${FIRST_CHECKIN_MIN_DAYS} of ${FIRST_CHECKIN_MIN_DAYS} days of data`);
  });
});

describe('buildCoachLedger: ED-flag neutral variant', () => {
  test('open flag: no rows, no weigh-in counts anywhere', () => {
    const l = buildCoachLedger({
      weighIns7d: 2,
      completedSessions: 1,
      firstWeightAt: WED - 2 * DAY,
      edFlagOpen: true,
      now: WED,
    });
    expect(l.variant).toBe('neutral');
    expect(l.rows).toHaveLength(0);
    expect(JSON.stringify(l)).not.toMatch(/weigh/i);
  });
});

describe('buildCoachLedger: unlock date parity with the check-in gate', () => {
  test('the named date is exactly firstReviewUnlockDate', () => {
    const firstWeightAt = WED - 2 * DAY;
    const l = buildCoachLedger({ firstWeightAt, checkinDay: 0, now: WED });
    const expected = firstReviewUnlockDate(firstWeightAt, 0, WED);
    expect(l.unlockDate?.getTime()).toBe(expected.getTime());
    expect(l.unlockLabel).toBe(formatUnlockDate(expected));
  });

  test('no first weight yet: no promised date', () => {
    const l = buildCoachLedger({ now: WED });
    expect(l.unlockDate).toBeNull();
    expect(l.unlockLabel).toBeNull();
  });
});

describe('formatUnlockDate', () => {
  test('British long form, no year', () => {
    expect(formatUnlockDate(new Date(2026, 6, 5))).toBe('Sunday 5 July');
    expect(formatUnlockDate(null)).toBeNull();
  });
});

describe('buildHoldReceipt', () => {
  test('prefers the engine hold message as the rule', () => {
    const r = buildHoldReceipt({ dataNote: 'Need at least 3 morning weights.', now: WED });
    expect(r.rule).toBe('Need at least 3 morning weights.');
  });

  test('falls back to the published-threshold rule', () => {
    const r = buildHoldReceipt({ now: WED });
    expect(r.rule).toMatch(new RegExp(`${MIN_WEIGH_INS} morning weigh-ins`));
    expect(r.rule).toMatch(new RegExp(`${FIRST_CHECKIN_MIN_DAYS} days of data`));
    expect(r.rule).toMatch(/week 2/);
  });

  test('names the unlock date, keep-logging framing (future-conditional)', () => {
    const r = buildHoldReceipt({ firstWeightAt: WED - DAY, checkinDay: 0, now: WED });
    expect(r.unlockLine).toMatch(/^Keep logging and your first coaching review unlocks on /);
  });

  test('neutral variant drops the weight ask AND softens the date (no promise the gate can break)', () => {
    const r = buildHoldReceipt({ firstWeightAt: WED - DAY, checkinDay: 0, edFlagOpen: true, now: WED });
    expect(r.unlockLine).toMatch(/^Your first coaching review unlocks around /);
    expect(r.unlockLine).not.toMatch(/unlocks on /);
    expect(r.ledger.rows).toHaveLength(0);
  });

  test('no data at all: honest no-date line', () => {
    const r = buildHoldReceipt({ now: WED });
    expect(r.unlockLine).toBe('Log your first morning weight and your first review date is set.');
  });
});
