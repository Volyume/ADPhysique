/**
 * personalRecovery.dayEffect.d219.test.js -- register D219, learner design
 * docs/audit/plan-builder-science-2026-10-04/06-LEARNER-SIGNAL-DESIGN.md
 * section 2.3 (founder answer 2026-10-05), evidence 05-LEARNER-RECON.md
 * candidate E and constants.js PERSONAL_DAY_EFFECT_MAX.
 *
 * The start sheet's sleep and energy chips say how the person walked in. They
 * are NOT recovery markers: the learner uses them to take out of a comparison the
 * part of the day's form they explain, so a poor night before the later session
 * does not read as a slow recoverer. One term for the person, never negative, never
 * more than PERSONAL_DAY_EFFECT_MAX a chip step; a comparison without both chips
 * is read exactly as it was; soreness is never a covariate (it is a mediator of
 * recovery).
 *
 * Pinned here, each written to FAIL on the code before this lane:
 *  - a day effect that is sleep, lined up with the breaks between sessions (the
 *    person sleeps badly before a session that follows a short break), reads as
 *    a slow recoverer without the chips and leaves the start alone with them, at
 *    the size the athlete's sleep really moves them;
 *  - no chips, a few chips, or chips that are not answered change nothing: the
 *    evidence is the evidence it was;
 *  - the term cannot be negative (a better night never predicts a worse session)
 *    and cannot exceed its cap;
 *  - the chip score is the mean of the answered chips measured from OK, and an
 *    unanswered chip is not the worst answer (Number(null) is 0).
 */
import {
  personalRecoveryEvidence, learnPersonalRecovery, comparablePairs, walkInScore,
} from '../personalRecovery';
import {
  LOOKBACK_DAYS, PERSONAL_LR_MIN, PERSONAL_DAY_EFFECT_MAX, PERSONAL_DAY_EFFECT_MIN_PAIRS, recoveryHours,
} from '../constants';
import { sessionMuscleLoads, recoveredFractionAt } from '../muscleRecoveryModel';
import { calculate1RM } from '../../algorithms';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 1, 12);
const EX = {
  bench: { id: 'bench', primaryMuscle: 'chest', secondaryMuscles: ['triceps'] },
  squat: { id: 'squat', primaryMuscle: 'quads', secondaryMuscles: ['glutes'] },
};
const set = (exerciseId, weight, reps, n) => ({
  exerciseId, weight, actualReps: reps, setNumber: n, setType: 'straight',
});
const setNumbers = (n) => Array.from({ length: n }, (_, i) => i + 1);
// Breaks of one to four days, in no weekly pattern.
const GAPS = [1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 1, 3, 2, 2, 4, 1, 3, 1, 2, 4, 3, 1, 2, 3, 4, 1, 2, 2, 3, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 2, 4, 1, 3, 2, 1];

/**
 * An athlete whose recovery is the model's own curve at `factor` (the start, 1, unless
 * said) with a sensitivity of `sens`, and whose day-to-day form is sleep alone: they sleep poorly
 * before a session that follows a break of a day or less (score -1), well before one
 * that follows three days or more (+1), and `perStep` of the estimated max moves with
 * each step. `chips` says whether they tell the start sheet. Noise-free otherwise.
 */
function sleepAthlete({
  sens = 0.06, perStep = 0.02, chips = true, offset = 0, days = 112, sets = 4, factor = 1,
} = {}) {
  const gaps = GAPS.slice(offset).concat(GAPS.slice(0, offset));
  const sessions = [];
  let day = 0;
  for (let i = 0; i < gaps.length && day + gaps[i] < days; i += 1) {
    day += gaps[i];
    const startedAt = NOW - days * DAY_MS + day * DAY_MS;
    sessions.push({
      id: `s${i}`,
      gap: gaps[i],
      startedAt,
      endedAt: startedAt + HOUR_MS,
      durationMinutes: 60,
      weekRirTarget: null,
      weekStatus: 'none',
      isFirstWeek: false,
      isDeload: false,
      ratings: { sorenessNext: null, fatigue: null, joint: null },
      sets: setNumbers(sets).flatMap((n) => [set('bench', 1, 1, n), set('squat', 1, 1, n)]),
    });
  }
  const curve = {};
  sessionMuscleLoads(sessions, EX).forEach((load, i) => {
    for (const [muscle, count] of Object.entries(load.setsByMuscle)) {
      if (!curve[muscle]) curve[muscle] = [];
      curve[muscle].push({
        endMs: load.endMs, sets: count, hoursT: recoveryHours(muscle, { sets: count, ratings: sessions[i].ratings, personalFactor: factor }),
      });
    }
  });
  const recovered = (muscle, atMs) => {
    const inside = (curve[muscle] ?? []).filter((e) => e.endMs <= atMs && atMs - e.endMs <= LOOKBACK_DAYS * DAY_MS);
    return inside.length ? recoveredFractionAt(inside, atMs) : 1;
  };
  sessions.forEach((s, i) => {
    const score = s.gap <= 1 ? -1 : (s.gap >= 3 ? 1 : 0);
    const form = Math.exp(perStep * score);
    const reps = 4 + (i % 5);
    const loadFor = (max) => max / calculate1RM(1, reps);
    const benchMax = 100 * (1 - sens * (1 - recovered('chest', s.startedAt))) * form;
    const squatMax = 140 * (1 - sens * (1 - recovered('quads', s.startedAt))) * form;
    s.sets = setNumbers(sets).flatMap((n) => [set('bench', loadFor(benchMax), reps, n), set('squat', loadFor(squatMax), reps, n)]);
    if (chips) {
      const chip = [2, 3, 4][score + 1];
      s.walkedIn = { sleep: chip, energy: chip };
    }
    delete s.gap;
  });
  return sessions;
}

const evidenceOf = (sessions) => personalRecoveryEvidence({
  sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW,
});
const learnedOf = (sessions) => learnPersonalRecovery({
  sessions, exerciseById: EX, recoveryRating: 'average', nowMs: NOW,
});

describe('a day effect that is sleep no longer reads as recovery', () => {
  for (const offset of [0, 7, 14]) {
    test(`pattern ${offset}: without the chips the learner reads a slower recoverer; with them the start stands, and the term is the athlete's own`, () => {
      const without = sleepAthlete({ chips: false, offset });
      const withChips = sleepAthlete({ chips: true, offset });
      const bare = learnedOf(without);
      // The false direction the chips exist to prevent: recovery IS the start.
      expect(bare.reason).toBe('adjusted');
      expect(bare.factor).toBeGreaterThan(bare.prior);
      expect(evidenceOf(without).lr).toBeGreaterThanOrEqual(PERSONAL_LR_MIN);

      const told = learnedOf(withChips);
      expect(told.reason).toBe('not_clear');
      expect(told.factor).toBe(1);
      const evidence = evidenceOf(withChips);
      expect(evidence.lr).toBeLessThan(PERSONAL_LR_MIN);
      // The term found is the athlete's own 2% a step, inside its cap.
      expect(evidence.dayEffect).toBeCloseTo(0.02, 10);
      expect(evidence.dayEffect).toBeLessThanOrEqual(PERSONAL_DAY_EFFECT_MAX);
      expect(evidence.dayEffectPairs).toBeGreaterThanOrEqual(PERSONAL_DAY_EFFECT_MIN_PAIRS);
    });
  }

  test('the chips take out the day, not the recovery: a slow recoverer is still found slower with them', () => {
    // A true factor of 1.4 and a sleep effect of 1% a step, the chips told: the direction survives.
    const slow = sleepAthlete({
      chips: true, perStep: 0.01, sens: 0.1, factor: 1.4,
    });
    const learned = learnedOf(slow);
    expect(learned.reason).toBe('adjusted');
    expect(learned.factor).toBeGreaterThanOrEqual(1.3);
    expect(evidenceOf(slow).dayEffect).toBeCloseTo(0.01, 10);
  });
});

describe('what the chips cannot do', () => {
  test('no chips, or too few answered, change nothing: the evidence is exactly what it was', () => {
    const none = evidenceOf(sleepAthlete({ chips: false }));
    // Answered on a handful of sessions only: fewer comparisons with both chips than the minimum.
    const few = sleepAthlete({ chips: false });
    few.slice(0, 5).forEach((s) => { s.walkedIn = { sleep: 2, energy: 2 }; });
    const sparse = evidenceOf(few);
    expect(sparse.dayEffectPairs).toBeLessThan(PERSONAL_DAY_EFFECT_MIN_PAIRS);
    const { dayEffectPairs: _a, ...sparseRest } = sparse;
    const { dayEffectPairs: _b, ...noneRest } = none;
    expect(sparseRest).toEqual(noneRest);
    expect(none.dayEffect).toBe(0);
  });

  test('only a comparison with both days answered carries the chips\' difference; every other is the object it always was', () => {
    const sessions = sleepAthlete({ chips: true });
    // The sheet was skipped before every third session.
    sessions.forEach((s, i) => { if (i % 3 === 0) s.walkedIn = { sleep: null, energy: null }; });
    const byStart = new Map(sessions.map((s) => [s.startedAt, s]));
    const pairs = Object.values(comparablePairs({ sessions, exerciseById: EX, nowMs: NOW })).flat();
    expect(pairs.length).toBeGreaterThan(20);
    let withDifference = 0;
    for (const q of pairs) {
      const b = walkInScore(byStart.get(q.startB));
      const p = walkInScore(byStart.get(q.startP));
      if (b === null || p === null) {
        expect(q).not.toHaveProperty('dc');
      } else {
        expect(q.dc).toBe(b - p);
        withDifference += 1;
      }
    }
    expect(withDifference).toBeGreaterThan(8);
  });

  test('a skipped sheet (null chips) reads as no answer, never as the worst one', () => {
    const answered = sleepAthlete({ chips: true });
    const skipped = answered.map((s) => ({ ...s, walkedIn: { sleep: null, energy: null } }));
    const missing = answered.map((s) => { const { walkedIn: _w, ...rest } = s; return rest; });
    const a = evidenceOf(skipped);
    const b = evidenceOf(missing);
    expect(a).toEqual(b);
    expect(a.dayEffectPairs).toBe(0);
  });

  test('chips that run the wrong way never help: the term is never negative, so the reading is the bare one', () => {
    // A better night, a WORSE session: the same athlete with the chips turned upside down.
    const upsideDown = sleepAthlete({ chips: true }).map((s) => ({
      ...s, walkedIn: { sleep: 6 - s.walkedIn.sleep, energy: 6 - s.walkedIn.energy },
    }));
    const bare = evidenceOf(sleepAthlete({ chips: false }));
    const turned = evidenceOf(upsideDown);
    expect(turned.dayEffect).toBe(0);
    expect(turned.best).toBe(bare.best);
    expect(turned.lr).toBeCloseTo(bare.lr, 9);
  });

  test('the term cannot exceed its cap: an athlete whose sleep moves them 5% a step is corrected by 2% at most', () => {
    const big = sleepAthlete({ chips: true, perStep: 0.05 });
    const evidence = evidenceOf(big);
    expect(evidence.dayEffect).toBe(PERSONAL_DAY_EFFECT_MAX);
    expect(PERSONAL_DAY_EFFECT_MAX).toBe(0.02);
  });

  test('soreness is never a covariate: the score reads sleep and energy and nothing else (load.test.js pins what the session carries)', () => {
    expect(walkInScore({ walkedIn: { sleep: 3, energy: 3, soreness: 1 } })).toBe(0);
    expect(walkInScore({ walkedIn: { sleep: 3, energy: 3 }, soreness24hBefore: 3, ratings: { sorenessNext: 3 } })).toBe(0);
    expect(walkInScore({ walkedIn: { soreness: 3 }, soreness24hBefore: 3, ratings: { sorenessNext: 3 } })).toBeNull();
  });
});

describe('the chip score', () => {
  test('the mean of the answered chips, each measured from OK', () => {
    expect(walkInScore({ walkedIn: { sleep: 2, energy: 2 } })).toBe(-1);
    expect(walkInScore({ walkedIn: { sleep: 4, energy: 4 } })).toBe(1);
    expect(walkInScore({ walkedIn: { sleep: 2, energy: 4 } })).toBe(0);
    expect(walkInScore({ walkedIn: { sleep: 4, energy: 3 } })).toBe(0.5);
  });

  test('one answered chip stands for the sheet; none is no score', () => {
    expect(walkInScore({ walkedIn: { sleep: 2, energy: null } })).toBe(-1);
    expect(walkInScore({ walkedIn: { sleep: undefined, energy: 4 } })).toBe(1);
    for (const none of [null, undefined, {}, { walkedIn: null }, { walkedIn: {} }, { walkedIn: { sleep: null, energy: null } }]) {
      expect(walkInScore(none)).toBeNull();
    }
  });

  test('an unanswered chip is not the worst answer (Number(null) is 0, which is below the sheet\'s whole range), and a value off the sheet is not an answer', () => {
    expect(walkInScore({ walkedIn: { sleep: null, energy: 4 } })).toBe(1);
    expect(walkInScore({ walkedIn: { sleep: '', energy: 3 } })).toBe(0);
    expect(walkInScore({ walkedIn: { sleep: 0, energy: 4 } })).toBe(1);
    expect(walkInScore({ walkedIn: { sleep: 9, energy: 2 } })).toBe(-1);
    expect(walkInScore({ walkedIn: { sleep: 'x', energy: NaN } })).toBeNull();
  });
});
