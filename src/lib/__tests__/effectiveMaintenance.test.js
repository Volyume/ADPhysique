import {
  canonicalWeightEvidence,
  deriveEffectiveMaintenanceMemo,
  compareEffectiveMaintenanceVersions,
  EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
  effectiveMaintenanceVersionKey,
  formulaContextSignature,
  isValidEffectiveMaintenanceMemo,
  revalidationContextSignature,
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
  const prior = overrides.formulaPriorKcalAtDerivation ?? 2500;
  const residual = overrides.cumulativeResidualKcal ?? 180;
  const candidate = {
    cumulativeResidualKcal: residual,
    formulaPriorKcalAtDerivation: prior,
    effectiveMaintenanceKcalAtDerivation: Object.prototype.hasOwnProperty.call(overrides, 'effectiveMaintenanceKcalAtDerivation')
      ? overrides.effectiveMaintenanceKcalAtDerivation : Math.round(prior + residual),
    source: 'athlete_history',
    status: 'current',
    reason: 'judgeable_actual_intake_and_weight_history',
    algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
    asOf: NOW,
    evidenceSignature: signature,
    foodDaysLogged: 7,
    weightPoints: 28,
    formulaContextSignature: formulaContextSignature(context),
    bodyweightKg: 80,
    goalPhase: 'cut',
    activityLevel: 'moderate',
    formulaMethod: 'mifflin',
    largeDivergence: false,
    ...overrides,
  };
  candidate.versionKey = Object.prototype.hasOwnProperty.call(overrides, 'versionKey')
    ? overrides.versionKey : effectiveMaintenanceVersionKey(candidate);
  return candidate;
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

  test('stores the cumulative residual after an incremental update, including sign and prior changes', () => {
    const cases = [
      { prior: 2500, residual: 150, increment: 75, candidate: 2725, nextResidual: 225 },
      { prior: 2500, residual: -150, increment: 75, candidate: 2425, nextResidual: -75 },
      { prior: 2500, residual: 150, increment: -75, candidate: 2575, nextResidual: 75 },
      { prior: 2600, residual: 150, increment: 75, candidate: 2825, nextResidual: 225 },
      { prior: 2500, residual: 150, increment: 0, candidate: 2650, nextResidual: 150 },
    ];
    for (const c of cases) {
      const stored = memo({
        cumulativeResidualKcal: c.residual,
        formulaPriorKcalAtDerivation: 2500,
        effectiveMaintenanceKcalAtDerivation: 2500 + c.residual,
      });
      const changedSignature = `${signature}_${c.prior}_${c.increment}`;
      const resolved = resolveEffectiveMaintenance({
        formulaPriorKcal: c.prior, memo: stored, context,
        evidenceSignature: changedSignature, nowMs: NOW,
      });
      expect(resolved.effectiveMaintenanceKcal + c.increment).toBe(c.candidate);
      const learned = deriveEffectiveMaintenanceMemo({
        formulaPriorKcal: c.prior,
        resolved,
        adaptiveObservation: { confidence: 'high', adjustedTDEE: c.candidate },
        actualIntakeKcal: 2350,
        foodDaysLogged: 7,
        evidenceSignature: changedSignature,
        weights,
        context,
        weightEvidenceFresh: true,
        nowMs: NOW + 1000,
      });
      expect(learned.memo).toMatchObject({
        cumulativeResidualKcal: c.nextResidual,
        effectiveMaintenanceKcalAtDerivation: c.candidate,
      });
    }
  });

  test('rounding is applied once at the candidate-to-residual boundary', () => {
    const learned = deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2500,
      resolved: resolveEffectiveMaintenance({ formulaPriorKcal: 2500, context, nowMs: NOW }),
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2725.5 },
      actualIntakeKcal: 2350, foodDaysLogged: 7, evidenceSignature: signature,
      weights, context, weightEvidenceFresh: true, nowMs: NOW,
    });
    expect(learned.memo).toMatchObject({ cumulativeResidualKcal: 226, effectiveMaintenanceKcalAtDerivation: 2726 });
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

  test('a corrected birth date revalidates while a natural birthday keeps the same context identity', () => {
    const original = { ...context, dateOfBirth: '1990-06-15' };
    const corrected = { ...context, dateOfBirth: '1980-06-15' };
    expect(formulaContextSignature({ ...original, ageYears: 35 }))
      .toBe(formulaContextSignature({ ...original, ageYears: 36 }));
    const stored = memo({ formulaContextSignature: formulaContextSignature(original) });
    const result = resolveEffectiveMaintenance({
      formulaPriorKcal: 2450, memo: stored, context: corrected, nowMs: NOW,
    });
    expect(result).toMatchObject({
      effectiveMaintenanceKcal: 2450,
      cumulativeResidualKcal: 180,
      appliedResidualKcal: 0,
      reason: 'formula_context_changed',
    });
  });

  test('an algorithm-version change retains memory but does not apply it blindly', () => {
    const result = resolveEffectiveMaintenance({
        formulaPriorKcal: 2500, memo: memo({ algorithmVersion: 2 }), context, nowMs: NOW,
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

  test('corrupt or partial memo provenance cannot create learned authority', () => {
    const corrupt = [
      memo({ source: 'mystery_source' }),
      memo({ status: 'mystery_status' }),
      memo({ formulaContextSignature: null }),
      memo({ versionKey: null }),
      memo({ cumulativeResidualKcal: null, effectiveMaintenanceKcalAtDerivation: 2500 }),
      memo({ cumulativeResidualKcal: 180.5, effectiveMaintenanceKcalAtDerivation: 2680.5 }),
      memo({ effectiveMaintenanceKcalAtDerivation: 9999 }),
      memo({ bodyweightKg: -80 }),
    ];
    for (const stored of corrupt) {
      expect(isValidEffectiveMaintenanceMemo(stored)).toBe(false);
      expect(resolveEffectiveMaintenance({
        formulaPriorKcal: 2500, memo: stored, context, evidenceSignature: signature, nowMs: NOW,
      })).toMatchObject({
        effectiveMaintenanceKcal: 2500,
        appliedResidualKcal: 0,
        source: 'formula_prior',
        reason: 'memo_invalid',
      });
    }
  });

  test('formula-context revalidation requires a durable marker and 14 fresh post-change days', () => {
    const changedContext = { ...context, activityLevel: 'very_active' };
    const markerAt = NOW + 1000;
    const marker = memo({
      status: 'revalidating',
      reason: 'formula_context_changed',
      revalidationStartedAt: markerAt,
      revalidationContextSignature: revalidationContextSignature(changedContext),
    });
    marker.versionKey = effectiveMaintenanceVersionKey(marker);
    const resolved = resolveEffectiveMaintenance({
      formulaPriorKcal: 2800, memo: marker, context: changedContext,
      evidenceSignature: `${signature}_new_context`, nowMs: markerAt,
    });
    const derive = freshWeights => deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2800,
      resolved,
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2875 },
      actualIntakeKcal: 2600,
      foodDaysLogged: 7,
      evidenceSignature: `${signature}_new_context`,
      weights: [...weights, ...freshWeights],
      context: changedContext,
      weightEvidenceFresh: true,
      nowMs: markerAt + 20 * 86400000,
    });
    expect(derive([{ loggedAt: markerAt + 86400000, weightKg: 80 }]))
      .toMatchObject({ updated: false, reason: 'fresh_context_evidence_required' });
    const fresh = Array.from({ length: 14 }, (_, i) => ({
      loggedAt: markerAt + (i + 1) * 86400000,
      weightKg: 80 + i * 0.01,
    }));
    expect(derive(fresh).memo).toMatchObject({
      cumulativeResidualKcal: 75,
      effectiveMaintenanceKcalAtDerivation: 2875,
      revalidationStartedAt: null,
      revalidationContextSignature: null,
    });
  });

  test('adding absent revalidation fields does not invalidate baseline memo identity', () => {
    const baseline = memo();
    expect(effectiveMaintenanceVersionKey({ ...baseline, revalidationStartedAt: null, revalidationContextSignature: null }))
      .toBe(baseline.versionKey);
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

  test('duplicate and same-day weight rows cannot inflate or destabilise evidence', () => {
    const duplicated = [
      ...weights,
      { ...weights[5], id: 'same-semantic-row-from-another-device' },
      { loggedAt: weights[5].loggedAt - 1000, weightKg: weights[5].weightKg + 9 },
    ];
    expect(canonicalWeightEvidence(duplicated)).toHaveLength(weights.length);
    expect(semanticEvidenceSignature({ foodDays, weights: duplicated, context })).toBe(signature);

    const oneDay = Array.from({ length: 20 }, (_, i) => ({
      loggedAt: NOW - 10000 + i,
      weightKg: 80 + i / 100,
    }));
    const result = deriveEffectiveMaintenanceMemo({
      formulaPriorKcal: 2500,
      adaptiveObservation: { confidence: 'high', adjustedTDEE: 2650 },
      actualIntakeKcal: 2350, foodDaysLogged: 7, evidenceSignature: 'em1_one_day',
      weights: oneDay, context, weightEvidenceFresh: true, nowMs: NOW,
    });
    expect(result).toMatchObject({ updated: false, reason: 'weight_evidence_insufficient_or_stale' });
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
