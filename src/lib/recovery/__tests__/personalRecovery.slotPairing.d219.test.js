/**
 * personalRecovery.slotPairing.d219.test.js -- register D219, learner design
 * docs/audit/plan-builder-science-2026-10-04/06-LEARNER-SIGNAL-DESIGN.md
 * section 2.3 (founder answer 2026-10-05: "Only what's already recorded"),
 * evidence 05-LEARNER-RECON.md section 2.6 and candidate D.
 *
 * The learner pairs a lift with its earlier session on the SAME WEEKDAY, because
 * on a weekly schedule the weekday sets the break and comparing across weekdays
 * reads a steady weekday difference in strength as recovery (D210 addendum 3).
 * That rule throws away most of the evidence of a person who does not train to a
 * weekly pattern, so when the weekdays do NOT set the gap the baseline is the
 * lift's previous session whenever it fell. The guard that says so is
 * personalRecovery.weekdayGapCoupling (the share of the gaps between the
 * person's sessions the weekday explains).
 *
 * Pinned here, each written to FAIL on the code before this lane:
 *  - the guard reads a fixed schedule, one with a third of its sessions moved a
 *    day, and one with a habit that moved, as coupled (the weekday rule stands),
 *    and a varied one as not; too little to say reads as coupled; breaks and a
 *    second session the same day are not the routine;
 *  - on a varied schedule the learner pairs across weekdays (the lift's previous
 *    session), and says so (`pairing: 'slot'`); on every fixed schedule it never
 *    does, and every pair is the same weekday at least three days earlier
 *    exactly as before (the recon measured slot pairing on a fixed schedule as
 *    unsafe: a false direction for 4% and the wrong one for 2% at the gate);
 *  - under slot pairing the other rules stand: effort targets must compare, a
 *    second session the same day is not a baseline, the 28-day gap holds.
 * How often it is fooled is the calibration suite's job (the schedules there).
 */
import {
  weekdayGapCoupling, comparablePairs, personalRecoveryEvidence, learnPersonalRecovery,
} from '../personalRecovery';
import { PERSONAL_SLOT_MAX_COUPLING, PERSONAL_SLOT_MIN_GAPS, PERSONAL_BASELINE_MAX_GAP_DAYS } from '../constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MONDAY = Date.UTC(2026, 0, 5, 12); // a Monday, at midday, so the local weekday is the same in every time zone
const NOW = MONDAY + 12 * 7 * DAY_MS;

const EX = {
  bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] },
  incline: { id: 'incline', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] },
  dbpress: { id: 'dbpress', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] },
};

/** mulberry32, as the calibration suite: the schedules here are random and the same on every run. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Session days (from a Monday) for a weekly pattern over twelve weeks. */
const weekly = (days) => Array.from({ length: 12 }, (_, w) => days.map((d) => w * 7 + d)).flat();
/** Gaps of one to four days, as the calibration suite's varied schedule. */
function varied(seed) {
  const rand = seeded(seed);
  const out = [];
  for (let day = 0; day < 12 * 7; day += 1 + Math.floor(rand() * 4)) out.push(day);
  return out;
}
/** A weekly pattern with a share of its sessions moved a day later. */
function movedSometimes(days, share, seed) {
  const rand = seeded(seed);
  return weekly(days).map((d) => d + (rand() < share ? 1 : 0));
}
/** One pattern for the first six weeks and another after. */
const moved = (first, second) => [
  ...Array.from({ length: 6 }, (_, w) => first.map((d) => w * 7 + d)).flat(),
  ...Array.from({ length: 6 }, (_, w) => second.map((d) => (w + 6) * 7 + d)).flat(),
];
const startsOf = (days) => days.map((d) => MONDAY + d * DAY_MS);

const liftSets = (exerciseId, reps) => [1, 2, 3].map((n) => ({
  exerciseId, weight: 100, actualReps: reps, setNumber: n, setType: 'straight',
}));
/**
 * Sessions on the given days. `exerciseOf(i)` is the chest exercise of session i (bench in
 * every session by default); the reps move from session to session (a seeded draw from 6 to
 * 10) so that no lift reads as logged as planned.
 */
function sessionsOn(days, extra = (_i) => ({}), exerciseOf = () => 'bench') {
  const rand = seeded(99);
  return startsOf(days).map((startedAt, i) => ({
    id: `s${i}`,
    startedAt,
    endedAt: startedAt + HOUR_MS,
    durationMinutes: 60,
    sets: liftSets(exerciseOf(i), 6 + Math.floor(rand() * 5)),
    weekRirTarget: null,
    weekStatus: 'none',
    isFirstWeek: false,
    isDeload: false,
    ratings: { sorenessNext: null, fatigue: null, joint: null },
    ...extra(i),
  }));
}
const weekdayOf = (ms) => new Date(ms).getDay();
const pairsOf = (sessions) => comparablePairs({ sessions, exerciseById: EX, nowMs: NOW }).chest ?? [];

describe('the guard: do the weekdays set the gap? (weekdayGapCoupling)', () => {
  test('a fixed weekly schedule reads as coupled, almost entirely', () => {
    for (const days of [[0, 2, 4], [0, 3], [0, 1, 3, 4], [0, 1, 2, 3, 4, 5]]) {
      const g = weekdayGapCoupling(startsOf(weekly(days)));
      expect(g.coupled).toBe(true);
      expect(g.omega2).toBeGreaterThan(0.9);
    }
  });

  test('a fixed schedule with a third of its sessions moved a day still reads as coupled (the weekday rule stands)', () => {
    for (let seed = 1; seed <= 12; seed += 1) {
      expect(weekdayGapCoupling(startsOf(movedSometimes([0, 2, 4], 1 / 3, seed))).coupled).toBe(true);
    }
  });

  test('a habit that moved from one fixed pattern to another reads as coupled, and so does one that slipped a day every four weeks', () => {
    expect(weekdayGapCoupling(startsOf(moved([0, 2, 4], [1, 3, 5]))).coupled).toBe(true);
    expect(weekdayGapCoupling(startsOf(moved([0, 2, 4], [0, 1, 3]))).coupled).toBe(true);
    const slipping = Array.from({ length: 12 }, (_, w) => [0, 2, 4].map((d) => w * 7 + d + Math.floor(w / 4))).flat();
    expect(weekdayGapCoupling(startsOf(slipping)).coupled).toBe(true);
  });

  test('a schedule of gaps of one to four days reads as not coupled, for nearly every one drawn', () => {
    let coupled = 0;
    for (let seed = 1; seed <= 40; seed += 1) {
      const g = weekdayGapCoupling(startsOf(varied(seed)));
      expect(g.omega2).not.toBeNull();
      if (g.coupled) coupled += 1;
    }
    // About 5% of random schedules show a chance pattern; the weekday rule then stands, which is today's behaviour.
    expect(coupled).toBeLessThanOrEqual(4);
  });

  test('the threshold is the constant: coupled when the share is above it, and never the other way round', () => {
    const g = weekdayGapCoupling(startsOf(varied(3)));
    expect(PERSONAL_SLOT_MAX_COUPLING).toBe(0.2);
    expect(g.coupled).toBe(!(g.omega2 <= PERSONAL_SLOT_MAX_COUPLING));
  });

  test('too little to say reads as coupled: few gaps, one weekday, or gaps that never differ', () => {
    const few = weekdayGapCoupling(startsOf([0, 1, 3, 4, 6, 7, 9, 11]));
    expect(few.gaps).toBeLessThan(PERSONAL_SLOT_MIN_GAPS);
    expect(few).toEqual({ coupled: true, omega2: null, gaps: few.gaps });
    // One weekday only: Mondays, a week apart.
    expect(weekdayGapCoupling(startsOf(weekly([0]))).coupled).toBe(true);
    // Every gap the same length on every weekday.
    expect(weekdayGapCoupling(startsOf(Array.from({ length: 30 }, (_, i) => i * 2))).coupled).toBe(true);
    for (const empty of [[], null, undefined, [MONDAY]]) expect(weekdayGapCoupling(empty).coupled).toBe(true);
  });

  test('a break of more than a week and a second session the same day are not the routine, and do not unlock the rule', () => {
    const base = startsOf(weekly([0, 2, 4]));
    // A two-week break after week five, and a second session six hours after the first of week three.
    const withBreak = base.map((t, i) => (i >= 15 ? t + 14 * DAY_MS : t));
    const withSecond = [...withBreak, base[6] + 6 * HOUR_MS];
    const g = weekdayGapCoupling(withSecond);
    expect(g.coupled).toBe(true);
    expect(g.omega2).toBeGreaterThan(0.9);
  });
});

describe('pairing by slot on a varied schedule, never on a fixed one', () => {
  test('on a varied schedule the lift pairs with its previous session, whatever the weekday, and the learner says so', () => {
    const days = varied(7);
    const sessions = sessionsOn(days);
    const pairs = pairsOf(sessions);
    expect(weekdayGapCoupling(startsOf(days)).coupled).toBe(false);
    // Different weekdays pair (the weekday rule never allowed it), and the baseline is the
    // lift's most recent earlier session, at least 12 hours before and inside the gap.
    expect(pairs.some((q) => weekdayOf(q.startB) !== weekdayOf(q.startP))).toBe(true);
    for (const q of pairs) {
      const earlier = sessions
        .map((s) => s.startedAt)
        .filter((t) => q.startB - t >= 12 * HOUR_MS && q.startB - t <= PERSONAL_BASELINE_MAX_GAP_DAYS * DAY_MS);
      expect(q.startP).toBe(Math.max(...earlier));
    }
    const evidence = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
    expect(evidence.pairing).toBe('slot');
    expect(learnPersonalRecovery({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW }).pairing).toBe('slot');
  });

  test('a plan that rotates its exercises gives many more comparisons than the same-weekday rule would', () => {
    // The recon (section 2.4): on a varied schedule the same-weekday rule is the largest single loss,
    // and a plan, whose lift comes round once in three sessions, loses most to it.
    const days = varied(7);
    const exerciseOf = (i) => ['bench', 'incline', 'dbpress'][i % 3];
    const sessions = sessionsOn(days, () => ({}), exerciseOf);
    const slot = pairsOf(sessions).length;
    let sameWeekday = 0;
    sessions.forEach((b, i) => {
      for (let j = i - 1; j >= 0; j -= 1) {
        if (b.startedAt - sessions[j].startedAt > PERSONAL_BASELINE_MAX_GAP_DAYS * DAY_MS) break;
        if (exerciseOf(j) === exerciseOf(i) && weekdayOf(sessions[j].startedAt) === weekdayOf(b.startedAt)
          && b.startedAt - sessions[j].startedAt >= 3 * DAY_MS) { sameWeekday += 1; break; }
      }
    });
    expect(sameWeekday).toBeGreaterThan(0);
    expect(slot).toBeGreaterThan(sameWeekday * 1.8);
  });

  test('on a fixed schedule every pair is the same weekday, at least three days earlier, exactly as before', () => {
    for (const days of [weekly([0, 2, 4]), weekly([0, 3]), weekly([0, 1, 3, 4]), movedSometimes([0, 2, 4], 1 / 3, 5), moved([0, 2, 4], [1, 3, 5])]) {
      const sessions = sessionsOn(days);
      const pairs = pairsOf(sessions);
      expect(pairs.length).toBeGreaterThan(5);
      for (const q of pairs) {
        expect(weekdayOf(q.startB)).toBe(weekdayOf(q.startP));
        expect(q.startB - q.startP).toBeGreaterThanOrEqual(3 * DAY_MS);
      }
      const evidence = personalRecoveryEvidence({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW });
      expect(evidence.pairing).toBe('weekday');
      // The word is said only when it is true: a fixed schedule's reading carries no `pairing`.
      expect(learnPersonalRecovery({ sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW })).not.toHaveProperty('pairing');
    }
  });

  test('under slot pairing a second session the same day is not a baseline, and the 28-day gap still holds', () => {
    // Varied history, plus a second bench session five hours after one of them.
    const days = varied(7);
    const sessions = sessionsOn(days);
    const target = sessions[20];
    const second = {
      ...target, id: 'same-day', startedAt: target.startedAt + 5 * HOUR_MS, endedAt: target.startedAt + 6 * HOUR_MS,
    };
    const pairs = comparablePairs({ sessions: [...sessions, second], exerciseById: EX, nowMs: NOW }).chest;
    expect(pairs.some((q) => q.startB === second.startedAt && q.startP === target.startedAt)).toBe(false);
    for (const q of pairs) expect(q.startB - q.startP).toBeLessThanOrEqual(PERSONAL_BASELINE_MAX_GAP_DAYS * DAY_MS);
  });

  test('under slot pairing the effort rule stands: a session in a plan never pairs with one outside any plan', () => {
    const days = varied(7);
    const planned = new Set([10, 11, 12, 13, 14, 15]);
    const sessions = sessionsOn(days, (i) => (planned.has(i) ? { weekRirTarget: 2, weekStatus: 'resolved' } : {}));
    const pairs = pairsOf(sessions);
    const inPlan = new Set([...planned].map((i) => sessions[i].startedAt));
    expect(pairs.length).toBeGreaterThan(5);
    for (const q of pairs) expect(inPlan.has(q.startB)).toBe(inPlan.has(q.startP));
  });
});
