import {
  deriveEffectiveMaintenanceMemo,
  compareEffectiveMaintenanceVersions,
  EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
  formulaContextSignature,
  resolveEffectiveMaintenance,
  semanticEvidenceSignature,
} from '../effectiveMaintenance';
import { calculateFormulaMaintenance, calculateNutritionTargets } from '../nutritionEngine';
import { normaliseMaintenanceInputs } from '../effectiveMaintenanceService';

const NOW = Date.UTC(2026, 7, 15, 12);
const context = {
  activityLevel: 'moderate', formulaMethod: 'mifflin', goalPhase: 'cut',
  sex: 'male', heightCm: 180, bodyweightKg: 80,
};
const weights = Array.from({ length: 28 }, (_, i) => ({
  loggedAt: NOW - (27 - i) * 86400000,
  weightKg: 82 - i * 0.05,
}));
const foodDays = Array.from({ length: 7 }, (_, i) => ({
  entryDate: `2026-08-${String(9 + i).padStart(2, '0')}`,
  kcalTotal: 2350 + i,
}));
const signature = semanticEvidenceSignature({ foodDays, weights, context });

function memo(overrides = {}) {
  return {
    cumulativeResidualKcal: 180,
    formulaPriorKcalAtDerivation: 2500,
    effectiveMaintenanceKcalAtDerivation: 2680,
    algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
    asOf: NOW,
    evidenceSignature: signature,
    formulaContextSignature: formulaContextSignature(context),
    bodyweightKg: 80,
    goalPhase: 'cut',
    ...overrides,
  };
}

describe('effective maintenance canonical authority', () => {
  test('cold start uses only the formula prior', () => {
    expect(resolveEffectiveMaintenance({ formulaPriorKcal: 2500, context, nowMs: NOW }))
      .toMatchObject({ effectiveMaintenanceKcal: 2500, source: 'formula_prior', cumulativeResidualKcal: 0 });
  });

  test('missing biology stays unavailable instead of coercing nulls into minimum formula inputs', () => {
    const normalised = normaliseMaintenanceInputs({
      sex: 'male', ageYears: null, heightCm: null, weightKg: null, activityLevel: 'moderate',
    }, NOW);
    expect(normalised).toMatchObject({ ageYears: null, heightCm: null, weightKg: null });
    expect(calculateFormulaMaintenance(normalised)).toBeNull();
  });

  test('applies the cumulative residual exactly once', () => {
    const result = resolveEffectiveMaintenance({ formulaPriorKcal: 2550, memo: memo(), context, evidenceSignature: signature, nowMs: NOW });
    expect(result.effectiveMaintenanceKcal).toBe(2730);
    expect(result.appliedResidualKcal).toBe(180);
  });

  test('target generation uses the resolved residual before existing phase maths', () => {
    const inputs = {
      sex: 'male', ageYears: 35, heightCm: 180, weightKg: 80,
      activityLevel: 'moderate', goal: 'mild_cut',
    };
    const formula = calculateNutritionTargets(inputs);
    const learned = calculateNutritionTargets({ ...inputs, effectiveMaintenanceResidualKcal: 180 });
    expect(learned.formulaMaintenanceKcal).toBe(formula.formulaMaintenanceKcal);
    expect(learned.maintenanceKcal).toBe(formula.maintenanceKcal + 180);
    expect(learned.effectiveMaintenanceResidualKcal).toBe(180);
  });

  test('goal changes retain history and mark it for revalidation', () => {
    const result = resolveEffectiveMaintenance({
      formulaPriorKcal: 2550, memo: memo(), context: { ...context, goalPhase: 'gain' }, nowMs: NOW,
    });
    expect(result).toMatchObject({ effectiveMaintenanceKcal: 2730, status: 'revalidating', reason: 'goal_phase_changed' });
  });

  test('context revalidation will not recycle only pre-change evidence', () => {
    const resolved = resolveEffectiveMaintenance({
      formulaPriorKcal: 2550, memo: memo(), context: { ...context, goalPhase: 'gain' }, nowMs: NOW,
    });
    const result = deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2550, resolved,
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2700 },
      actualIntakeKcal: 2400, foodDaysLogged: 7,
      evidenceSignature: semanticEvidenceSignature({ foodDays, weights, context: { ...context, goalPhase: 'gain' } }),
      weights, context: { ...context, goalPhase: 'gain' }, weightEvidenceFresh: true, nowMs: NOW,
    });
    expect(result).toMatchObject({ updated: false, reason: 'fresh_context_evidence_required' });
  });

  test('plan, routine and manual-target choices are irrelevant to observation authority', () => {
    const a = resolveEffectiveMaintenance({
      formulaPriorKcal: 2500, memo: memo(), context: { ...context, planId: 'a', routineId: 'r1', manualTargetKcal: 1900 },
      evidenceSignature: signature, nowMs: NOW,
    });
    const b = resolveEffectiveMaintenance({
      formulaPriorKcal: 2500, memo: memo(), context: { ...context, planId: 'b', routineId: 'r2', manualTargetKcal: 3200 },
      evidenceSignature: signature, nowMs: NOW,
    });
    expect(b).toEqual(a);
  });

  test('ordinary bodyweight movement carries history; a material move marks revalidation', () => {
    const ordinary = resolveEffectiveMaintenance({
      formulaPriorKcal: 2520, memo: memo(), context: { ...context, bodyweightKg: 83.9 },
      evidenceSignature: signature, nowMs: NOW,
    });
    const material = resolveEffectiveMaintenance({
      formulaPriorKcal: 2550, memo: memo(), context: { ...context, bodyweightKg: 84 },
      evidenceSignature: signature, nowMs: NOW,
    });
    expect(ordinary).toMatchObject({ effectiveMaintenanceKcal: 2700, status: 'current' });
    expect(material).toMatchObject({ effectiveMaintenanceKcal: 2730, status: 'revalidating', reason: 'material_bodyweight_change' });
  });

  test('formula-driving context changes retain memory but do not blindly apply it', () => {
    const result = resolveEffectiveMaintenance({
      formulaPriorKcal: 2800, memo: memo(), context: { ...context, activityLevel: 'very_active' }, nowMs: NOW,
    });
    expect(result).toMatchObject({ effectiveMaintenanceKcal: 2800, cumulativeResidualKcal: 180, appliedResidualKcal: 0, reason: 'formula_context_changed' });
  });

  test('an algorithm-version change retains memory but does not apply it blindly', () => {
    const result = resolveEffectiveMaintenance({
      formulaPriorKcal: 2500, memo: memo({ algorithmVersion: 0 }), context, nowMs: NOW,
    });
    expect(result).toMatchObject({
      effectiveMaintenanceKcal: 2500, cumulativeResidualKcal: 180,
      appliedResidualKcal: 0, reason: 'algorithm_version_changed',
    });
  });

  test('staleness holds history without decay or a new update', () => {
    const old = memo({ asOf: NOW - 30 * 86400000 });
    const result = resolveEffectiveMaintenance({ formulaPriorKcal: 2500, memo: old, context, nowMs: NOW });
    expect(result).toMatchObject({ effectiveMaintenanceKcal: 2680, cumulativeResidualKcal: 180, status: 'held', reason: 'evidence_stale' });
  });

  test('food evidence signature is semantic and order-independent', () => {
    const reordered = foodDays.slice().reverse();
    expect(semanticEvidenceSignature({ foodDays: reordered, weights: weights.slice().reverse(), context }))
      .toBe(signature);
  });

  test('database row ids and sync timestamps cannot change the semantic signature', () => {
    const decorated = foodDays.map((row, i) => ({ ...row, id: `row-${i}`, updatedAt: NOW + i }));
    expect(semanticEvidenceSignature({ foodDays: decorated, weights, context })).toBe(signature);
  });

  test('a food edit invalidates the current evidence signature', () => {
    const edited = foodDays.map((row, i) => i === 2 ? { ...row, kcalTotal: row.kcalTotal + 50 } : row);
    const changed = semanticEvidenceSignature({ foodDays: edited, weights, context });
    expect(changed).not.toBe(signature);
    expect(resolveEffectiveMaintenance({ formulaPriorKcal: 2500, memo: memo(), context, evidenceSignature: changed, nowMs: NOW }))
      .toMatchObject({ status: 'revalidating', reason: 'evidence_changed' });
  });

  test('durable learning requires actual intake and judgeable fresh weights', () => {
    const base = {
      formulaPriorKcal: 2500,
      resolved: resolveEffectiveMaintenance({ formulaPriorKcal: 2500, context, nowMs: NOW }),
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2640, adjustmentKcal: 0 },
      foodDaysLogged: 7, evidenceSignature: signature, weights, context,
      weightEvidenceFresh: true, nowMs: NOW,
    };
    expect(deriveEffectiveMaintenanceMemo({ ...base, actualIntakeKcal: null })).toMatchObject({ updated: false });
    expect(deriveEffectiveMaintenanceMemo({ ...base, actualIntakeKcal: 2350, foodDaysLogged: 4 }))
      .toMatchObject({ updated: false, reason: 'actual_intake_coverage_insufficient' });
    expect(deriveEffectiveMaintenanceMemo({ ...base, actualIntakeKcal: 2350, weightEvidenceFresh: false })).toMatchObject({ updated: false });
    expect(deriveEffectiveMaintenanceMemo({ ...base, actualIntakeKcal: 2350 }).memo)
      .toMatchObject({ cumulativeResidualKcal: 140, effectiveMaintenanceKcalAtDerivation: 2640 });
  });

  test('observational candidate survives an intervention safety clamp', () => {
    const learned = deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2500,
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2650, adjustmentKcal: 0, safetyClamp: 'ffm_floor' },
      actualIntakeKcal: 2350, foodDaysLogged: 7, evidenceSignature: signature,
      weights, context, weightEvidenceFresh: true, nowMs: NOW,
    });
    expect(learned.memo.cumulativeResidualKcal).toBe(150);
  });

  test('the same evidence can update at most once, preventing iterative drift', () => {
    const resolved = resolveEffectiveMaintenance({
      formulaPriorKcal: 2500, memo: memo(), context, evidenceSignature: signature, nowMs: NOW,
    });
    const replay = deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2500, resolved,
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2740 },
      actualIntakeKcal: 2350, foodDaysLogged: 7, evidenceSignature: signature,
      weights, context, weightEvidenceFresh: true, nowMs: NOW + 1000,
    });
    expect(replay).toMatchObject({ updated: false, reason: 'evidence_already_consumed' });
  });

  test('large divergence is diagnostic, not a clamp', () => {
    const learned = deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2000,
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2500 },
      actualIntakeKcal: 2400, foodDaysLogged: 7, evidenceSignature: signature,
      weights, context, weightEvidenceFresh: true, nowMs: NOW,
    });
    expect(learned.memo).toMatchObject({ cumulativeResidualKcal: 500, largeDivergence: true });
  });

  test('sync convergence is arrival-order independent and retry-idempotent', () => {
    const older = { updatedAt: 1000, versionKey: 'z' };
    const newer = { updatedAt: 2000, versionKey: 'a' };
    const tiedLow = { updatedAt: 2000, versionKey: 'a' };
    const tiedHigh = { updatedAt: 2000, versionKey: 'b' };
    expect(compareEffectiveMaintenanceVersions(newer, older)).toBe(1);
    expect(compareEffectiveMaintenanceVersions(older, newer)).toBe(-1);
    expect(compareEffectiveMaintenanceVersions(newer, newer)).toBe(0);
    expect(compareEffectiveMaintenanceVersions(tiedHigh, tiedLow)).toBe(1);
  });

  test('finite valid inputs never produce NaN and repeated resolution is idempotent', () => {
    for (let residual = -600; residual <= 600; residual += 25) {
      const stored = memo({ cumulativeResidualKcal: residual });
      const first = resolveEffectiveMaintenance({
        formulaPriorKcal: 2500, memo: stored, context, evidenceSignature: signature, nowMs: NOW,
      });
      const second = resolveEffectiveMaintenance({
        formulaPriorKcal: 2500, memo: stored, context, evidenceSignature: signature, nowMs: NOW,
      });
      expect(Number.isNaN(first.effectiveMaintenanceKcal)).toBe(false);
      expect(second).toEqual(first);
    }
  });
});
