/**
 * EN-4 phase-vocabulary replay corpus (Wave 3 / F10 completion,
 * founder rulings 2026-07-02):
 *   (a) recomp maps onto the −0.125 %/wk goal rate (today it aliases to
 *       maintenance and is judged at 0 %/wk);
 *   (b) the dead agg_cut / mod_cut PHASE_CONFIG rows are DELETED
 *       (coachingPhaseKey has never emitted them — verified back to the
 *       first commit — so no stored user can hold them).
 *
 * PHASE 1 (this commit): every assertion pins the CURRENT engine — the
 * BEFORE baseline. PHASE 2 (the EN-4 implementation commit) updates ONLY
 * the lines marked [expected to change] / [removed in phase 2]; the diff
 * of that commit IS the founder's delta report. Lines marked
 * [must never drift] keep their values forever — if the implementation
 * moves one of those, EN-4 has leaked beyond the two rulings.
 *
 * The load-bearing safety pin is V3: recomp is NOT a cut, before or after
 * the mapping. It must never gain the cut levers (calorie resize, refeed,
 * diet break, macro cycling), whatever entitlements the user holds.
 */
import { runWeeklyCoach } from '../weeklyCoach';
import { cutCardioTarget } from '../cardio/cardioEngine';
import { isCutPhase, phaseToCoachingKey, dayCalorieCyclingAllowed } from '../coachingGoals';

const DAY = 86400000;
const NOW = Date.UTC(2026, 5, 22, 8, 0, 0); // fixed clock (EN-5 injectable nowMs)

// 28 daily weights ending at endKg at NOW. slopeKgPerDay > 0 means losing.
function series(slopeKgPerDay, endKg = 84, count = 28) {
  return Array.from({ length: count }, (_, i) => ({
    weightKg: +(endKg + (count - 1 - i) * slopeKgPerDay).toFixed(2),
    loggedAt: NOW - (count - 1 - i) * DAY,
  }));
}

const coachInputs = (over = {}) => ({
  checkin: {
    weekStart: NOW - 7 * DAY, energyScore: 3, sorenessScore: 3, sleepHours: 7.5,
    calsAdherence: 'hit', stepsAdherence: 'hit', trainingPerformance: 'hit',
    jointPain: false, cycleOverride: false,
  },
  morningWeights: series(0),
  sessionsCompleted: 4, sessionsPlanned: 4, prsThisWeek: 1,
  goalPhase: 'maint', weeksInPhase: 5,
  consecutiveOffTargetWeeks: 3, consecutivePoorRecoveryWeeks: 0,
  lastCalAdjustmentDirection: null, lastCalAdjustmentWeeksAgo: 99,
  currentCalTarget: 2300, currentMaintenanceKcal: 2600,
  currentProteinG: 170, currentCarbsG: 200, currentFatG: 70,
  currentStepsTarget: 8000, stepsEnabled: false,
  bodyweightKg: 84, units: 'kg', sex: 'male',
  scoffPositive: false, recentWeeklyHistory: [], goalLockAdvanced: false,
  edPatternOpen: false, userTier: 'pro', hasUsedTrial: true,
  recentIntakeAvgKcal: null, recentIntakeDaysLogged: 0,
  nowMs: NOW,
  ...over,
});

// The seam the app actually uses: goal setup stores phaseToCoachingKey(phase).
const recompKey = () => phaseToCoachingKey('recomp');

describe('EN-4 replay — the recomp mapping (founder ruling a)', () => {
  test('V14 phaseToCoachingKey: recomp [expected to change]; every other phase [must never drift]', () => {
    expect(phaseToCoachingKey('recomp')).toBe('maint'); // [expected to change → 'recomp']
    expect(phaseToCoachingKey('cut')).toBe('mild_cut');          // [must never drift]
    expect(phaseToCoachingKey('maintain')).toBe('maint');        // [must never drift]
    expect(phaseToCoachingKey('lean_gain')).toBe('mild_bulk');   // [must never drift]
    expect(phaseToCoachingKey('bulk')).toBe('bulk');             // [must never drift]
    expect(phaseToCoachingKey('strength_size')).toBe('bulk');    // [must never drift]
    expect(phaseToCoachingKey('weak_point')).toBe('mild_bulk');  // [must never drift]
  });

  test('V1 recomp user holding steady: label [expected to change]; verdict, hold and steps note [must never drift]', () => {
    const out = runWeeklyCoach(coachInputs({ goalPhase: recompKey(), stepsEnabled: true }));
    expect(out.weekLabel).toBe('Week 5 · Maintenance'); // [expected to change → 'Week 5 · Hold muscle, lose fat']
    expect(out.trend.onTarget).toBe(true);              // [must never drift] flat is on-target for recomp (band floor covers −0.125)
    expect(out.adjustments.calories).toBeNull();        // [must never drift]
    expect(out.adjustments.steps).toEqual({             // [must never drift] the hold note survives the re-mapping
      target: 8000, change: 0, note: 'Steps target stays the same this week.',
    });
  });

  test('V2 recomp user losing ~0.24 %/wk: verdict [expected to change] off → on target; no resize either way', () => {
    const out = runWeeklyCoach(coachInputs({ goalPhase: recompKey(), morningWeights: series(0.029) }));
    expect(out.trend.onTarget).toBe(false); // [expected to change → true] 0.24 %/wk sits inside the recomp band, outside maintenance's
    expect(out.adjustments.calories).toBeNull(); // [must never drift] recomp never resizes calories
  });

  test('V3 [must never drift] recomp is NOT a cut: no cut lever ever fires, whatever the entitlements', () => {
    const out = runWeeklyCoach(coachInputs({
      goalPhase: recompKey(),
      morningWeights: series(-0.06), // gaining ~0.5 %/wk: maximally off-target
      goalLockAdvanced: true, trainingGoal: 'mens_physique', // every cut-lever entitlement present
      lastRefeedAt: null,
    }));
    expect(out.trend.onTarget).toBe(false);
    expect(out.adjustments.calories).toBeNull();
    expect(out.refeed ?? null).toBeNull();
    expect(out.macroCycle ?? null).toBeNull();
    expect(out.dietBreakSuggested ?? false).toBe(false);
  });
});

describe('EN-4 replay — live phases [must never drift]', () => {
  test('V5 mild_cut on-target: hold with a calories-held receipt', () => {
    const out = runWeeklyCoach(coachInputs({ goalPhase: 'mild_cut', morningWeights: series(0.045) }));
    expect(out.weekLabel).toBe('Week 5 · Mild cut');
    expect(out.trend.onTarget).toBe(true);
    expect(out.adjustments.calories).toBeNull();
    expect((out.heldDecisions ?? []).some(d => d.type === 'calories')).toBe(true);
  });

  test('V6 maintenance flat: on-target, no change, steps hold note', () => {
    const out = runWeeklyCoach(coachInputs({ stepsEnabled: true }));
    expect(out.weekLabel).toBe('Week 5 · Maintenance');
    expect(out.trend.onTarget).toBe(true);
    expect(out.adjustments.calories).toBeNull();
    expect(out.adjustments.steps?.note).toBe('Steps target stays the same this week.');
  });

  test('V7 mild_bulk gaining on-target: hold', () => {
    const out = runWeeklyCoach(coachInputs({
      goalPhase: 'mild_bulk', morningWeights: series(-0.021, 80), bodyweightKg: 80, currentCalTarget: 2900,
    }));
    expect(out.weekLabel).toBe('Week 5 · Lean bulk');
    expect(out.trend.onTarget).toBe(true);
    expect(out.adjustments.calories).toBeNull();
  });

  test("V8 the 'bulk' alias still coaches as a real bulk", () => {
    const out = runWeeklyCoach(coachInputs({
      goalPhase: 'bulk', morningWeights: series(-0.043, 80), bodyweightKg: 80, currentCalTarget: 3000,
    }));
    expect(out.weekLabel).toBe('Week 5 · Lean bulk');
    expect(out.trend.onTarget).toBe(true);
  });

  test('V9 competition-goal cut keeps the weekly refeed', () => {
    const out = runWeeklyCoach(coachInputs({
      goalPhase: 'mild_cut', trainingGoal: 'bikini', morningWeights: series(0.045),
      currentCalTarget: 2000, currentMaintenanceKcal: 2600, currentProteinG: 170, currentFatG: 60,
      lastRefeedAt: null,
    }));
    expect(out.refeed).toBeTruthy();
    expect(out.refeed.frequencyWeeks).toBe(1);
  });
});

describe('EN-4 replay — dead vocabulary (founder ruling b) [removed in phase 2]', () => {
  test('V10 direct agg_cut input: today a real config with a fortnightly refeed; after deletion it falls back to maintenance', () => {
    const out = runWeeklyCoach(coachInputs({
      goalPhase: 'agg_cut', morningWeights: series(0.12),
      currentCalTarget: 2000, currentMaintenanceKcal: 2600, currentProteinG: 170, currentFatG: 60,
      lastRefeedAt: null,
    }));
    expect(out.weekLabel).toBe('Week 5 · Aggressive cut'); // [phase 2 → 'Week 5 · Maintenance' fallback]
    expect(out.refeed?.frequencyWeeks).toBe(2);            // [phase 2 → refeed null: the non-competition refeed dies with agg_cut]
  });

  test('V11 direct mod_cut input: today a real config; after deletion it falls back to maintenance', () => {
    const out = runWeeklyCoach(coachInputs({ goalPhase: 'mod_cut', morningWeights: series(0.075) }));
    expect(out.weekLabel).toBe('Week 5 · Moderate cut'); // [phase 2 → 'Week 5 · Maintenance' fallback]
  });

  test('V12 cardio: the agg_cut interval boost exists today; the base dose never drifts', () => {
    expect(cutCardioTarget(5, 'agg_cut').includesInterval).toBe(true); // [phase 2 → branch deleted with the vocabulary]
    const base = cutCardioTarget(0, 'mild_cut'); // [phase 2 → cutCardioTarget(), same shape]
    expect(base.includesInterval).toBe(false);   // [must never drift]
    expect(base.sessionsPerWeek).toBe(3);        // [must never drift]
  });

  test('V13 cut-phase truth table: mild_cut is a cut [must never drift]; recomp NEVER becomes one', () => {
    expect(['agg_cut', 'mod_cut', 'mild_cut'].every(isCutPhase)).toBe(true); // [phase 2 → only mild_cut remains a cut]
    expect(['recomp', 'maint', 'mild_bulk', 'mod_bulk', 'bulk'].some(isCutPhase)).toBe(false); // [must never drift]
    expect(dayCalorieCyclingAllowed({ goalPhase: 'mild_cut', goalLockAdvanced: true })).toBe(true); // [must never drift]
    expect(dayCalorieCyclingAllowed({ goalPhase: 'recomp', goalLockAdvanced: true, trainingGoal: 'mens_physique' })).toBe(false); // [must never drift]
  });
});
