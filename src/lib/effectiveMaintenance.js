/**
 * Canonical effective-maintenance authority.
 *
 * "Effective maintenance" is the daily logged intake associated with
 * approximate weight maintenance inside the athlete's logging history. It is
 * an engineering estimate, not a claim to measure physiological TDEE.
 *
 * The durable value is a residual against the current formula prior. Keeping
 * the residual (rather than a copied absolute TDEE) lets ordinary body-weight
 * changes move the prior without discarding what the athlete's own history has
 * taught us. This module is deliberately pure; persistence and sync live in
 * database.js and sync/tables/effectiveMaintenance.js.
 */

export const EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION = 1;
export const EFFECTIVE_MAINTENANCE_STALE_DAYS = 14;
export const MATERIAL_BODYWEIGHT_CHANGE_FRACTION = 0.05;
export const RESIDUAL_REVALIDATION_FRACTION = 0.20;

export const EFFECTIVE_MAINTENANCE_SOURCE = Object.freeze({
  FORMULA: 'formula_prior',
  HISTORY: 'athlete_history',
  HELD_HISTORY: 'held_athlete_history',
});

export const EFFECTIVE_MAINTENANCE_STATUS = Object.freeze({
  FORMULA: 'formula_prior',
  CURRENT: 'current',
  HELD: 'held',
  REVALIDATING: 'revalidating',
  INVALID: 'invalid',
});

const DAY_MS = 86400000;

function finitePositive(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function stableStringify(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

// Two independent FNV-1a passes make a compact deterministic semantic key.
// This is an identity checksum, not a security primitive.
function fnv1a(text, seed) {
  let hash = seed >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** One deterministic weight observation per UTC day, independent of row order. */
export function canonicalWeightEvidence(weights = []) {
  const byDay = new Map();
  for (const row of weights || []) {
    const loggedAt = Number(row?.loggedAt ?? new Date(row?.date ?? NaN).getTime());
    const weightKg = finitePositive(row?.weightKg);
    if (!Number.isFinite(loggedAt) || !weightKg) continue;
    const day = new Date(loggedAt).toISOString().slice(0, 10);
    const candidate = { loggedAt, weightKg };
    const current = byDay.get(day);
    // A same-day retry/duplicate cannot inflate coverage. If two devices made
    // distinct same-day observations, the later timestamp wins; an exact-time
    // conflict converges on the greater numeric value independent of arrival.
    if (!current || loggedAt > current.loggedAt
      || (loggedAt === current.loggedAt && weightKg > current.weightKg)) {
      byDay.set(day, candidate);
    }
  }
  return [...byDay.values()].sort((a, b) => a.loggedAt - b.loggedAt || a.weightKg - b.weightKg);
}

export function semanticEvidenceSignature({ foodDays = [], weights = [], context = {}, window = {} } = {}) {
  const food = (foodDays || [])
    .map(row => ({
      day: String(row?.entryDate ?? row?.day ?? '').slice(0, 10),
      kcal: Math.round(Number(row?.kcalTotal ?? row?.kcal ?? 0)),
    }))
    .filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.day) && row.kcal > 0)
    .sort((a, b) => a.day.localeCompare(b.day));
  const weight = canonicalWeightEvidence(weights).map(row => ({
    at: row.loggedAt,
    kg: Math.round(row.weightKg * 1000) / 1000,
  }));
  const payload = stableStringify({
    algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
    food,
    weight,
    window: {
      foodStart: window?.foodStart ?? food[0]?.day ?? null,
      foodEnd: window?.foodEnd ?? food[food.length - 1]?.day ?? null,
      weightStart: window?.weightStart ?? weight[0]?.at ?? null,
      weightEnd: window?.weightEnd ?? weight[weight.length - 1]?.at ?? null,
    },
    context: {
      activityLevel: context?.activityLevel ?? null,
      formulaMethod: context?.formulaMethod ?? null,
      goalPhase: context?.goalPhase ?? null,
    },
  });
  return `em1_${fnv1a(payload, 2166136261)}${fnv1a(payload, 3339675911)}`;
}

export function formulaContextSignature(context = {}) {
  const identity = {
    activityLevel: context?.activityLevel ?? null,
    formulaMethod: context?.formulaMethod ?? null,
    sex: context?.sex ?? null,
    heightCm: finitePositive(context?.heightCm),
    bodyFatPercent: context?.bodyFatPercent != null && context.bodyFatPercent !== ''
      && Number.isFinite(Number(context.bodyFatPercent))
      ? Math.round(Number(context.bodyFatPercent) * 10) / 10 : null,
    bodyFatSource: context?.bodyFatSource ?? null,
  };
  // Date of birth is stable across natural birthdays but changes when the
  // athlete corrects a formula-driving age input. Omit it when unavailable so
  // baseline memos that never had the field keep their exact identity.
  if (typeof context?.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(context.dateOfBirth)) {
    identity.dateOfBirth = context.dateOfBirth;
  }
  const payload = stableStringify(identity);
  return `fc1_${fnv1a(payload, 2166136261)}${fnv1a(payload, 3339675911)}`;
}

export function effectiveMaintenanceVersionKey(memo = {}) {
  const identity = {
    algorithmVersion: memo.algorithmVersion,
    asOf: memo.asOf,
    cumulativeResidualKcal: memo.cumulativeResidualKcal,
    formulaPriorKcalAtDerivation: memo.formulaPriorKcalAtDerivation,
    effectiveMaintenanceKcalAtDerivation: memo.effectiveMaintenanceKcalAtDerivation,
    evidenceSignature: memo.evidenceSignature,
    formulaContextSignature: memo.formulaContextSignature,
    foodDaysLogged: memo.foodDaysLogged,
    weightPoints: memo.weightPoints,
    bodyweightKg: memo.bodyweightKg,
    goalPhase: memo.goalPhase,
    activityLevel: memo.activityLevel,
    formulaMethod: memo.formulaMethod,
    source: memo.source,
    status: memo.status,
    reason: memo.reason,
    largeDivergence: !!memo.largeDivergence,
  };
  // Omit absent marker fields so memos produced by the baseline Campaign 19
  // build keep their exact version identity. Only an actual revalidation
  // marker extends the key.
  if (memo.revalidationStartedAt != null || memo.revalidationContextSignature != null) {
    identity.revalidationStartedAt = memo.revalidationStartedAt ?? null;
    identity.revalidationContextSignature = memo.revalidationContextSignature ?? null;
  }
  const payload = stableStringify(identity);
  return `emv1_${fnv1a(payload, 2166136261)}${fnv1a(payload, 3339675911)}`;
}

export function revalidationContextSignature(context = {}) {
  const payload = stableStringify({
    algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
    formulaContextSignature: formulaContextSignature(context),
  });
  return `rv1_${fnv1a(payload, 2166136261)}${fnv1a(payload, 3339675911)}`;
}

/** Fail closed before any stored residual is allowed to become authority. */
export function isValidEffectiveMaintenanceMemo(memo) {
  if (!memo || typeof memo !== 'object') return false;
  const requiredNumbers = [
    memo.cumulativeResidualKcal, memo.formulaPriorKcalAtDerivation,
    memo.effectiveMaintenanceKcalAtDerivation, memo.algorithmVersion,
    memo.asOf, memo.foodDaysLogged, memo.weightPoints,
  ];
  if (requiredNumbers.some(value => value == null || value === '')) return false;
  const residual = Number(memo.cumulativeResidualKcal);
  const prior = Number(memo.formulaPriorKcalAtDerivation);
  const effective = Number(memo.effectiveMaintenanceKcalAtDerivation);
  const algorithm = Number(memo.algorithmVersion);
  const asOf = Number(memo.asOf);
  const foodDays = Number(memo.foodDaysLogged);
  const weightPoints = Number(memo.weightPoints);
  if (![residual, prior, effective, algorithm, asOf, foodDays, weightPoints].every(Number.isFinite)) return false;
  if (![residual, prior, effective, algorithm, asOf, foodDays, weightPoints].every(Number.isInteger)) return false;
  if (prior <= 0 || effective <= 0 || algorithm <= 0 || asOf <= 0 || foodDays < 5 || weightPoints < 14) return false;
  if (prior + residual !== effective) return false;
  if (!Object.values(EFFECTIVE_MAINTENANCE_SOURCE).filter(source => source !== EFFECTIVE_MAINTENANCE_SOURCE.FORMULA).includes(memo.source)) return false;
  if (![EFFECTIVE_MAINTENANCE_STATUS.CURRENT, EFFECTIVE_MAINTENANCE_STATUS.HELD, EFFECTIVE_MAINTENANCE_STATUS.REVALIDATING].includes(memo.status)) return false;
  if (![memo.reason, memo.evidenceSignature, memo.formulaContextSignature, memo.versionKey]
    .every(value => typeof value === 'string' && value.length > 0)) return false;
  if (memo.bodyweightKg != null && !finitePositive(memo.bodyweightKg)) return false;
  const markerAt = memo.revalidationStartedAt;
  const markerSignature = memo.revalidationContextSignature;
  if ((markerAt == null) !== (markerSignature == null)) return false;
  if (markerAt != null && (!Number.isFinite(Number(markerAt)) || Number(markerAt) <= 0
    || typeof markerSignature !== 'string' || !markerSignature)) return false;
  return memo.versionKey === effectiveMaintenanceVersionKey(memo);
}

export function compareEffectiveMaintenanceVersions(a, b) {
  const timestamp = row => {
    const value = row?.updatedAt ?? row?.updated_at;
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const timeDiff = timestamp(a) - timestamp(b);
  if (timeDiff) return Math.sign(timeDiff);
  const aKey = String(a?.versionKey ?? a?.version_key ?? '');
  const bKey = String(b?.versionKey ?? b?.version_key ?? '');
  return aKey === bKey ? 0 : (aKey > bKey ? 1 : -1);
}

/** Resolve the one maintenance value every downstream consumer must use. */
export function resolveEffectiveMaintenance({
  formulaPriorKcal,
  memo = null,
  context = {},
  evidenceSignature = null,
  nowMs = Date.now(),
} = {}) {
  const formulaPrior = finitePositive(formulaPriorKcal);
  if (!formulaPrior) {
    return {
      effectiveMaintenanceKcal: null,
      formulaPriorKcal: null,
      cumulativeResidualKcal: 0,
      appliedResidualKcal: 0,
      source: EFFECTIVE_MAINTENANCE_SOURCE.FORMULA,
      status: EFFECTIVE_MAINTENANCE_STATUS.INVALID,
      reason: 'formula_prior_unavailable',
      algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
      asOf: null,
      evidenceSignature: null,
    };
  }

  const base = {
    effectiveMaintenanceKcal: Math.round(formulaPrior),
    formulaPriorKcal: Math.round(formulaPrior),
    cumulativeResidualKcal: 0,
    appliedResidualKcal: 0,
    source: EFFECTIVE_MAINTENANCE_SOURCE.FORMULA,
    status: EFFECTIVE_MAINTENANCE_STATUS.FORMULA,
    reason: memo ? 'memo_invalid' : 'no_validated_history',
    algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
    asOf: null,
    evidenceSignature: null,
    largeDivergence: false,
  };
  if (!memo) return base;

  if (!isValidEffectiveMaintenanceMemo(memo)) return base;
  const residual = Number(memo.cumulativeResidualKcal);
  const asOf = Number(memo.asOf);

  const remembered = {
    ...base,
    cumulativeResidualKcal: Math.round(residual),
    asOf,
    evidenceSignature: memo.evidenceSignature,
    largeDivergence: !!memo.largeDivergence,
    revalidationStartedAt: memo.revalidationStartedAt ?? null,
    revalidationContextSignature: memo.revalidationContextSignature ?? null,
  };
  const versionMismatch = Number(memo.algorithmVersion) !== EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION;
  const formulaContextChanged = memo.formulaContextSignature
    && memo.formulaContextSignature !== formulaContextSignature(context);
  if (versionMismatch || formulaContextChanged) {
    return {
      ...remembered,
      status: EFFECTIVE_MAINTENANCE_STATUS.REVALIDATING,
      reason: versionMismatch ? 'algorithm_version_changed' : 'formula_context_changed',
    };
  }

  const learnedWeight = finitePositive(memo.bodyweightKg);
  const currentWeight = finitePositive(context?.bodyweightKg);
  const materialWeightChange = learnedWeight && currentWeight
    ? Math.abs(currentWeight - learnedWeight) / learnedWeight >= MATERIAL_BODYWEIGHT_CHANGE_FRACTION
    : false;
  const goalChanged = memo.goalPhase && context?.goalPhase && memo.goalPhase !== context.goalPhase;
  const evidenceChanged = evidenceSignature && evidenceSignature !== memo.evidenceSignature;
  const stale = nowMs - asOf > EFFECTIVE_MAINTENANCE_STALE_DAYS * DAY_MS;

  const effective = Math.round(formulaPrior + residual);
  if (!Number.isFinite(effective) || effective <= 0) return base;

  let status = EFFECTIVE_MAINTENANCE_STATUS.CURRENT;
  let reason = 'validated_history';
  if (materialWeightChange) {
    status = EFFECTIVE_MAINTENANCE_STATUS.REVALIDATING;
    reason = 'material_bodyweight_change';
  } else if (goalChanged) {
    status = EFFECTIVE_MAINTENANCE_STATUS.REVALIDATING;
    reason = 'goal_phase_changed';
  } else if (evidenceChanged) {
    status = EFFECTIVE_MAINTENANCE_STATUS.REVALIDATING;
    reason = 'evidence_changed';
  } else if (stale) {
    status = EFFECTIVE_MAINTENANCE_STATUS.HELD;
    reason = 'evidence_stale';
  }

  return {
    ...remembered,
    effectiveMaintenanceKcal: effective,
    appliedResidualKcal: Math.round(residual),
    source: status === EFFECTIVE_MAINTENANCE_STATUS.CURRENT
      ? EFFECTIVE_MAINTENANCE_SOURCE.HISTORY
      : EFFECTIVE_MAINTENANCE_SOURCE.HELD_HISTORY,
    status,
    reason,
  };
}

/**
 * Convert a judgeable adaptive observation into the next durable memo.
 * Safety can still veto a target change elsewhere; it must not rewrite this
 * observational result. `adjustedTDEE` is therefore used, never the
 * safety-clamped `adjustmentKcal`.
 */
export function deriveEffectiveMaintenanceMemo({
  formulaPriorKcal,
  resolved,
  adaptiveObservation,
  actualIntakeKcal,
  foodDaysLogged,
  evidenceSignature,
  weights = [],
  context = {},
  weightEvidenceFresh = false,
  confounded = false,
  nowMs = Date.now(),
} = {}) {
  const formulaPrior = finitePositive(formulaPriorKcal);
  const actual = finitePositive(actualIntakeKcal);
  const validWeights = canonicalWeightEvidence(weights);
  const hold = reason => ({ updated: false, reason, memo: null });

  if (!formulaPrior) return hold('formula_prior_unavailable');
  if (!actual || Number(foodDaysLogged) < 5) return hold('actual_intake_coverage_insufficient');
  if (!evidenceSignature) return hold('evidence_signature_unavailable');
  if (
    resolved?.status === EFFECTIVE_MAINTENANCE_STATUS.CURRENT
    && resolved?.evidenceSignature === evidenceSignature
  ) return hold('evidence_already_consumed');
  if (!weightEvidenceFresh || validWeights.length < 14) return hold('weight_evidence_insufficient_or_stale');
  const newestWeightAt = validWeights.reduce((latest, row) => Math.max(
    latest,
    Number(row?.loggedAt ?? new Date(row?.date ?? NaN).getTime()) || 0,
  ), 0);
  if (resolved?.status === EFFECTIVE_MAINTENANCE_STATUS.REVALIDATING) {
    if (['formula_context_changed', 'algorithm_version_changed'].includes(resolved?.reason)) {
      const markerAt = Number(resolved?.revalidationStartedAt);
      const markerMatches = resolved?.revalidationContextSignature === revalidationContextSignature(context);
      const freshWeightDays = new Set(validWeights
        .filter(row => Number(row?.loggedAt ?? new Date(row?.date ?? NaN).getTime()) > markerAt)
        .map(row => new Date(Number(row?.loggedAt ?? new Date(row?.date ?? NaN).getTime())).toISOString().slice(0, 10)))
        .size;
      if (!Number.isFinite(markerAt) || !markerMatches || freshWeightDays < 14) {
        return hold('fresh_context_evidence_required');
      }
    } else if (['goal_phase_changed', 'material_bodyweight_change'].includes(resolved?.reason)
      && newestWeightAt <= Number(resolved?.asOf)) {
      return hold('fresh_context_evidence_required');
    }
  }
  if (confounded) return hold('evidence_confounded');
  if (adaptiveObservation?.confidence !== 'high') return hold('adaptive_evidence_not_judgeable');

  const candidate = finitePositive(adaptiveObservation?.adjustedTDEE);
  if (!candidate) return hold('adaptive_candidate_unavailable');
  const residual = Math.round(candidate - formulaPrior);
  const effective = Math.round(formulaPrior + residual);
  const newestWeight = validWeights.slice().sort((a, b) =>
    Number(a?.loggedAt ?? new Date(a?.date).getTime()) - Number(b?.loggedAt ?? new Date(b?.date).getTime()),
  ).at(-1);
  const memo = {
    cumulativeResidualKcal: residual,
    formulaPriorKcalAtDerivation: Math.round(formulaPrior),
    effectiveMaintenanceKcalAtDerivation: effective,
    source: EFFECTIVE_MAINTENANCE_SOURCE.HISTORY,
    status: EFFECTIVE_MAINTENANCE_STATUS.CURRENT,
    reason: 'judgeable_actual_intake_and_weight_history',
    algorithmVersion: EFFECTIVE_MAINTENANCE_ALGORITHM_VERSION,
    asOf: nowMs,
    evidenceSignature,
    foodDaysLogged: Math.round(Number(foodDaysLogged)),
    weightPoints: validWeights.length,
    bodyweightKg: Number(newestWeight?.weightKg) || context?.bodyweightKg || null,
    goalPhase: context?.goalPhase ?? null,
    activityLevel: context?.activityLevel ?? null,
    formulaMethod: context?.formulaMethod ?? null,
    formulaContextSignature: formulaContextSignature(context),
    largeDivergence: Math.abs(residual) / formulaPrior > RESIDUAL_REVALIDATION_FRACTION,
    revalidationStartedAt: null,
    revalidationContextSignature: null,
  };
  memo.versionKey = effectiveMaintenanceVersionKey(memo);
  return { updated: true, reason: 'validated', memo, resolvedBefore: resolved ?? null };
}

export function effectiveMaintenanceReceipt(resolved) {
  if (!resolved) return null;
  return {
    source: resolved.source,
    effectiveMaintenanceKcal: resolved.effectiveMaintenanceKcal,
    formulaPriorKcal: resolved.formulaPriorKcal,
    cumulativeResidualKcal: resolved.cumulativeResidualKcal,
    algorithmVersion: resolved.algorithmVersion,
    asOf: resolved.asOf,
    evidenceSignature: resolved.evidenceSignature,
    status: resolved.status,
    reason: resolved.reason,
    revalidationStartedAt: resolved.revalidationStartedAt ?? null,
    revalidationContextSignature: resolved.revalidationContextSignature ?? null,
  };
}
