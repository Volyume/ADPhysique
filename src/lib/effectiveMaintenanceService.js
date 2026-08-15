/** I/O orchestration around the pure effective-maintenance authority. */
import {
  getEffectiveMaintenanceMemo,
  getMorningWeights,
  saveEffectiveMaintenanceMemo,
} from './database';
import { getRecentIntakeSummary } from './food/db';
import { calculateFormulaMaintenance } from './nutritionEngine';
import {
  deriveEffectiveMaintenanceMemo,
  resolveEffectiveMaintenance,
  semanticEvidenceSignature,
} from './effectiveMaintenance';

function ageFromDateOfBirth(value, nowMs) {
  const born = value ? new Date(value) : null;
  if (!born || !Number.isFinite(born.getTime())) return null;
  return Math.max(13, Math.floor((nowMs - born.getTime()) / (365.2425 * 86400000)));
}

function optionalFiniteNumber(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function normaliseMaintenanceInputs(inputs = {}, nowMs = Date.now()) {
  const suppliedAge = optionalFiniteNumber(inputs.ageYears);
  const ageYears = suppliedAge ?? ageFromDateOfBirth(inputs.dateOfBirth, nowMs);
  return {
    sex: inputs.sex ?? null,
    ageYears,
    heightCm: optionalFiniteNumber(inputs.heightCm),
    weightKg: optionalFiniteNumber(inputs.weightKg ?? inputs.bodyweightKg),
    bodyFatPercent: inputs.bodyFatPercent ?? inputs.bodyFatPct ?? null,
    bodyFatSource: inputs.bodyFatSource ?? null,
    activityLevel: inputs.activityLevel ?? null,
    goalPhase: inputs.goalPhase ?? inputs.goal ?? inputs.phase ?? null,
  };
}

export async function resolveEffectiveMaintenanceForUser(userId, inputs, {
  weights: suppliedWeights = null,
  intake: suppliedIntake = null,
  nowMs = Date.now(),
} = {}) {
  let canonical = normaliseMaintenanceInputs(inputs, nowMs);
  const [memo, weights, intake] = await Promise.all([
    getEffectiveMaintenanceMemo(userId).catch(() => null),
    suppliedWeights ?? getMorningWeights(userId, 90).catch(() => []),
    suppliedIntake ?? getRecentIntakeSummary(userId).catch(() => ({ avgKcal: null, daysLogged: 0, days: [] })),
  ]);
  // One canonical evidence-window contract on every consumer. Callers may
  // fetch wider histories for their own charts, but maintenance identity uses
  // the same latest 60 valid weigh-ins the weekly coach consumes.
  const evidenceWeights = (weights || [])
    .filter(row => Number(row?.weightKg) > 0 && Number.isFinite(Number(row?.loggedAt)))
    .slice().sort((a, b) => Number(a.loggedAt) - Number(b.loggedAt))
    .slice(-60);
  if (!Number.isFinite(canonical.weightKg) && evidenceWeights.length) {
    canonical = { ...canonical, weightKg: Number(evidenceWeights[evidenceWeights.length - 1].weightKg) };
  }
  const formula = calculateFormulaMaintenance(canonical);
  const context = {
    ...canonical,
    bodyweightKg: canonical.weightKg,
    formulaMethod: formula?.formulaMethod ?? null,
  };
  const evidenceSignature = semanticEvidenceSignature({
    foodDays: intake?.days || [], weights: evidenceWeights, context,
  });
  const resolved = resolveEffectiveMaintenance({
    formulaPriorKcal: formula?.formulaPriorKcal,
    memo,
    context,
    evidenceSignature,
    nowMs,
  });
  return { resolved, formula, memo, weights: evidenceWeights, intake, context, evidenceSignature };
}

export async function learnEffectiveMaintenanceForUser(userId, authority, adaptiveObservation, {
  confounded = false,
  nowMs = Date.now(),
} = {}) {
  if (!authority) return { updated: false, reason: 'authority_unavailable', memo: null };
  const newest = (authority.weights || []).reduce(
    (max, row) => Math.max(max, Number(row?.loggedAt) || 0), 0,
  );
  const derivation = deriveEffectiveMaintenanceMemo({
    formulaPriorKcal: authority.formula?.formulaPriorKcal,
    resolved: authority.resolved,
    adaptiveObservation,
    actualIntakeKcal: authority.intake?.avgKcal,
    foodDaysLogged: authority.intake?.daysLogged,
    evidenceSignature: authority.evidenceSignature,
    weights: authority.weights,
    context: authority.context,
    weightEvidenceFresh: newest >= nowMs - 14 * 86400000,
    confounded,
    nowMs,
  });
  if (derivation.updated) await saveEffectiveMaintenanceMemo(userId, derivation.memo);
  return derivation;
}
