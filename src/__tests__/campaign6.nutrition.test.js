/**
 * campaign6.nutrition.test.js — Phases 22, 23, 24 and the nutrition half
 * of Phase 47 from the Campaign 6 order: the deterministic Pro nutrition
 * athlete over 26 simulated weeks (lean gain -> maintenance -> cut),
 * driven through the REAL runWeeklyCoach with a fixed clock, plus the
 * lapse and safety behaviours around it.
 *
 * The thesis under test: history increases useful personalisation
 * (confidence, adaptive sizing) without old data becoming false
 * certainty, floors never personalise downward, and a lapse produces
 * conservative silence rather than confident adjustment.
 */
import { runWeeklyCoach, assessDataConfidence } from '../lib/weeklyCoach';
import { kcalFloorForSex } from '../lib/nutritionEngine';

const WEEK_MS = 7 * 86400000;
const DAY_MS = 86400000;
const T0 = Date.UTC(2026, 0, 5, 8, 0, 0); // a Monday

/**
 * Deterministic daily morning weights between two week indices, linear
 * drift, one reading per day.
 */
function weights({ fromWeek, toWeek, startKg, kgPerWeek, daysPerWeek = 7 }) {
  const rows = [];
  for (let w = fromWeek; w < toWeek; w += 1) {
    for (let d = 0; d < daysPerWeek; d += 1) {
      const t = T0 + w * WEEK_MS + d * DAY_MS;
      const kg = startKg + kgPerWeek * (w - fromWeek) + (kgPerWeek / 7) * d;
      rows.push({ weightKg: Math.round(kg * 100) / 100, createdAt: t });
    }
  }
  return rows;
}

const checkin = (over = {}) => ({
  energyScore: 4, sorenessScore: 2, calsAdherence: 'in_range',
  sleepHours: 7.5, notes: '', ...over,
});

function runWeek({
  weekIndex, allWeights, currentCalTarget, weeksInPhase, goalPhase,
  lastCalAdjustmentDirection = null, lastCalAdjustmentWeeksAgo = 99,
  consecutiveOffTargetWeeks = 0,
}) {
  const nowMs = T0 + weekIndex * WEEK_MS + 6 * DAY_MS;
  const visible = allWeights.filter((w) => w.createdAt <= nowMs).slice(-28);
  return runWeeklyCoach({
    nowMs,
    checkin: checkin(),
    morningWeights: visible,
    sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 0,
    goalPhase, weeksInPhase,
    currentCalTarget,
    lastCalAdjustmentDirection, lastCalAdjustmentWeeksAgo,
    consecutiveOffTargetWeeks,
    bodyweightKg: visible.length ? visible[visible.length - 1].weightKg : 80,
    units: 'kg', scoffPositive: false,
  });
}

describe('PHASE 22: personalisation compounds without false certainty', () => {
  // Lean gain weeks 0-11: gaining a touch slow (+0.15 kg/week against a
  // lean-gain target band), daily weigh-ins.
  const gainWeights = weights({ fromWeek: 0, toWeek: 12, startKg: 80, kgPerWeek: 0.15 });

  test('the first phase week never adjusts confidently (the baseline period is honest)', () => {
    const out = runWeek({
      weekIndex: 0, allWeights: gainWeights, currentCalTarget: 2800,
      weeksInPhase: 1, goalPhase: 'lean_gain',
    });
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });

  test('with weeks of daily weigh-ins the coach genuinely knows more: confidence is earned by density', () => {
    expect(assessDataConfidence({
      weigh_ins: 7, adherenceKnown: true, weeksInPhase: 6, hasUnusualEvent: false,
    }).level).toBe('high');
    // Below three weigh-ins the engine refuses outright: a hold, not a
    // guess with a low label.
    expect(assessDataConfidence({
      weigh_ins: 2, adherenceKnown: true, weeksInPhase: 6, hasUnusualEvent: false,
    }).level).toBe('data_hold');
    expect(assessDataConfidence({
      weigh_ins: 4, adherenceKnown: true, weeksInPhase: 6, hasUnusualEvent: false,
    }).level).toBe('medium');
  });

  test('a mature phase week proposes bounded, deterministic adjustments', () => {
    const out = runWeek({
      weekIndex: 8, allWeights: gainWeights, currentCalTarget: 2800,
      weeksInPhase: 9, goalPhase: 'lean_gain',
    });
    const change = out.adjustments?.calories?.change ?? 0;
    expect(Math.abs(change)).toBeLessThanOrEqual(300);
    const again = runWeek({
      weekIndex: 8, allWeights: gainWeights, currentCalTarget: 2800,
      weeksInPhase: 9, goalPhase: 'lean_gain',
    });
    expect(again).toEqual(out);
  });

  test('sparse weigh-ins never earn the confidence dense ones do', () => {
    const sparse = weights({ fromWeek: 0, toWeek: 12, startKg: 80, kgPerWeek: 0.15, daysPerWeek: 1 });
    const out = runWeek({
      weekIndex: 8, allWeights: sparse, currentCalTarget: 2800,
      weeksInPhase: 9, goalPhase: 'lean_gain',
    });
    expect(out.trend?.confidence ?? 'low').toBe('low');
  });
});

describe('PHASE 23: a phase change resets the evidence clock (D97-7 downstream)', () => {
  // The cut starts at week 12; with phaseStartedAt now reset on a real
  // phase change, weeksInPhase re-enters the baseline period.
  const cutWeights = weights({ fromWeek: 12, toWeek: 20, startKg: 81.8, kgPerWeek: -0.4 });

  test('week one of the new phase holds even though months of the OLD phase exist', () => {
    const out = runWeek({
      weekIndex: 12, allWeights: cutWeights, currentCalTarget: 2300,
      weeksInPhase: 1, goalPhase: 'mild_cut',
    });
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });

  test('by the mature cut the coach adjusts within the same bounded envelope', () => {
    const out = runWeek({
      weekIndex: 18, allWeights: cutWeights, currentCalTarget: 2300,
      weeksInPhase: 7, goalPhase: 'mild_cut',
    });
    expect(Math.abs(out.adjustments?.calories?.change ?? 0)).toBeLessThanOrEqual(300);
  });
});

describe('PHASE 24: nutrition lapses produce conservative silence, not confident adjustment', () => {
  test('a four-week weigh-in gap drops trend confidence to low and proposes nothing confident', () => {
    // Weeks 0-7 daily, then nothing for four weeks; the check-in returns
    // at week 12.
    const gapped = weights({ fromWeek: 0, toWeek: 8, startKg: 80, kgPerWeek: 0.15 });
    const out = runWeek({
      weekIndex: 12, allWeights: gapped, currentCalTarget: 2800,
      weeksInPhase: 13, goalPhase: 'lean_gain',
    });
    expect(out.trend?.confidence ?? 'low').toBe('low');
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });

  test('weight data with no fresh rows at all still answers, holding rather than guessing', () => {
    const out = runWeek({
      weekIndex: 30, allWeights: weights({ fromWeek: 0, toWeek: 8, startKg: 80, kgPerWeek: 0.15 }),
      currentCalTarget: 2800, weeksInPhase: 31, goalPhase: 'lean_gain',
    });
    expect(out).toBeDefined();
    expect(out.adjustments?.calories?.change ?? 0).toBe(0);
  });
});

describe('PHASE 47 (nutrition half): floors never personalise downward', () => {
  test('an aggressive cut against the male floor cannot be pushed below 1,500 by any adjustment', () => {
    // Losing too slowly on a target already AT the floor: whatever the
    // trend says, the applied target arithmetic may never breach it.
    const cutWeights = weights({ fromWeek: 0, toWeek: 10, startKg: 90, kgPerWeek: -0.1 });
    const out = runWeek({
      weekIndex: 9, allWeights: cutWeights, currentCalTarget: kcalFloorForSex('male'),
      weeksInPhase: 10, goalPhase: 'mild_cut',
    });
    const change = out.adjustments?.calories?.change ?? 0;
    expect(kcalFloorForSex('male') + Math.min(change, 0)).toBeGreaterThanOrEqual(1500 - 0);
    // And the floors themselves are the sacred constants.
    expect(kcalFloorForSex('male')).toBe(1500);
    expect(kcalFloorForSex('female')).toBe(1200);
  });

  test('twenty-six weeks of successful dieting erodes no threshold: the floor is a constant, not a learned value', () => {
    // There is no code path by which history rewrites the floor - pinned
    // structurally: the floor is imported from the same constants at
    // every consumer, and the engine reads it per call.
    expect(kcalFloorForSex('female', { weeksDieting: 26 })).toBe(1200);
    expect(kcalFloorForSex('male', { streak: 999 })).toBe(1500);
  });
});
