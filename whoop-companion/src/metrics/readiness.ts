/**
 * Training readiness: a Garmin-style training prompt built from the evidence
 * that is actually present. Missing signals are omitted, never copied from
 * Recovery, and sparse blends are capped so one measurement cannot look like
 * a complete physiological assessment.
 */

import { sleepTrustTier } from './sleepTrustWeight';

type Confidence = 'high' | 'medium' | 'low';

export type Readiness = {
  score: number; // 0..100
  label: string; // Poor / Low / Moderate / High / Prime
  confidence: Confidence;
  confidencePct: number;
  scoreCap: number | null;
  cappedByConfidence: boolean;
  qualityLabel: string;
  qualityNote: string;
  missingInputs: string[];
  contributors: Array<{ key: string; label: string; value: string; good: boolean | null }>;
};

function readinessLabel(s: number): string {
  if (s >= 85) return 'Prime';
  if (s >= 70) return 'High';
  if (s >= 50) return 'Moderate';
  if (s >= 25) return 'Low';
  return 'Poor';
}

function finiteScore(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, value));
}

function debtScore(debtMin: number): number | null {
  if (!Number.isFinite(debtMin)) return null;
  return Math.max(0, Math.min(100, 100 - (Math.max(0, debtMin) / 120) * 100));
}

function sleepTrustContributor(input: {
  confidence: 'high' | 'medium' | 'low' | null;
  coveragePct: number | null;
  signalMin: number | null;
  included: boolean;
}): Readiness['contributors'][number] {
  const { confidence, coveragePct, signalMin, included } = input;
  const tier = sleepTrustTier({ confidence, coveragePct, signalMin });
  const label = confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : confidence === 'low' ? 'Low' : '-';
  const detail = coveragePct != null ? `${label} - ${coveragePct}%` : signalMin != null ? `${label} - ${signalMin}m` : label;
  return {
    key: 'sleep_trust',
    label: 'Sleep trust',
    value: included ? detail : `${detail} - not scored`,
    good: confidence == null && coveragePct == null && signalMin == null ? null : tier === 'high',
  };
}

export function computeTrainingReadiness(input: {
  recovery: number | null; // 0..100
  sleepPerformance: number | null; // 0..100
  sleepDebtMin: number;
  hrvBalance: number | null; // 0..100 (HRV vs baseline)
  acwr: number | null; // descriptive training-load context, not a risk score
  sleepConfidence?: 'high' | 'medium' | 'low' | null;
  sleepCoveragePct?: number | null;
  sleepSignalMin?: number | null;
}): Readiness | null {
  const {
    recovery,
    sleepPerformance,
    sleepDebtMin,
    hrvBalance,
    acwr,
    sleepConfidence = null,
    sleepCoveragePct = null,
    sleepSignalMin = null,
  } = input;

  const rec = finiteScore(recovery);
  const hrv = finiteScore(hrvBalance);
  const sleepTier = sleepTrustTier({
    confidence: sleepConfidence,
    coveragePct: sleepCoveragePct,
    signalMin: sleepSignalMin,
  });
  const sleep = sleepTier === 'low' ? null : finiteScore(sleepPerformance);
  const debt = debtScore(sleepDebtMin);

  // Recovery, sleep and HRV are the primary physiological signals. Debt is
  // supporting context and must not turn one primary signal into a score.
  const primaryCount = [rec, sleep, hrv].filter((value) => value != null).length;
  if (primaryCount < 2) return null;

  const weighted: Array<{ value: number; weight: number }> = [];
  if (rec != null) weighted.push({ value: rec, weight: 0.35 });
  if (sleep != null) weighted.push({ value: sleep, weight: 0.25 });
  if (debt != null) weighted.push({ value: debt, weight: 0.15 });
  if (hrv != null) weighted.push({ value: hrv, weight: 0.1 });
  const weightTotal = weighted.reduce((sum, contributor) => sum + contributor.weight, 0);
  const rawScore = Math.round(weighted.reduce((sum, contributor) => sum + contributor.value * contributor.weight, 0) / weightTotal);

  // Two primary signals can support a cautious prompt, but not a high score.
  // Complete, independently corroborated evidence is not capped unless a
  // sleep-trust gate requires it.
  let scoreCap: number | null = primaryCount === 2 ? 65 : null;
  if (sleepTier === 'medium') scoreCap = Math.min(scoreCap ?? 100, 75);
  if (sleepTier === 'none' && sleep != null) scoreCap = Math.min(scoreCap ?? 100, 65);
  const score = Math.max(1, Math.min(100, scoreCap == null ? rawScore : Math.min(rawScore, scoreCap)));
  const cappedByConfidence = score < Math.max(1, Math.min(100, rawScore));

  let confidencePct = primaryCount === 2 ? 48 : 78;
  if (primaryCount === 3) confidencePct = sleepTier === 'high' ? 88 : sleepTier === 'medium' ? 72 : 58;
  if (debt == null) confidencePct -= 8;
  if (sleepTier === 'medium') confidencePct -= 8;
  if (sleepTier === 'none') confidencePct -= 12;
  confidencePct = Math.max(25, Math.min(92, Math.round(confidencePct)));
  const confidence: Confidence = confidencePct >= 80 ? 'high' : confidencePct >= 55 ? 'medium' : 'low';

  const sleepTrust = sleepTrustContributor({
    confidence: sleepConfidence,
    coveragePct: sleepCoveragePct,
    signalMin: sleepSignalMin,
    included: sleep != null,
  });
  const contributors = [
    { key: 'recovery', label: 'Recovery', value: rec != null ? `${Math.round(rec)}%` : '-', good: rec != null ? rec >= 60 : null },
    { key: 'sleep', label: 'Sleep', value: sleep != null ? `${Math.round(sleep)}%` : sleepPerformance != null ? `${Math.round(sleepPerformance)}% - not scored` : '-', good: sleep != null ? sleep >= 70 : null },
    sleepTrust,
    { key: 'debt', label: 'Sleep debt', value: debt != null ? `${Math.round(Math.max(0, sleepDebtMin))}m` : '-', good: debt != null ? sleepDebtMin < 45 : null },
    { key: 'hrv', label: 'HRV balance', value: hrv != null ? `${Math.round(hrv)}` : '-', good: hrv != null ? hrv >= 50 : null },
    {
      key: 'load',
      label: 'Training load context',
      value: acwr != null && Number.isFinite(acwr) ? `ACWR ${acwr.toFixed(2)}` : '-',
      good: null,
    },
  ];
  const missingInputs = [
    rec == null ? 'recovery' : null,
    sleep == null ? 'sleep performance' : null,
    hrv == null ? 'HRV balance' : null,
  ].filter((value): value is string => value != null);

  const qualityLabel = confidence === 'high' ? 'Strongest available signal' : confidence === 'medium' ? 'Usable estimate' : 'Treat cautiously';
  const missingNote = missingInputs.length > 0
    ? `Missing or untrusted inputs are excluded: ${missingInputs.join(', ')}.`
    : 'The score uses all three primary signals available today.';
  const qualityNote = `${missingNote} Sleep debt is supporting context, and ACWR is shown for load context rather than used as an injury or optimal-range verdict.${cappedByConfidence ? ` Score capped at ${scoreCap} because the evidence is sparse or uncertain.` : ''}`;

  return {
    score,
    label: readinessLabel(score),
    confidence,
    confidencePct,
    scoreCap,
    cappedByConfidence,
    qualityLabel,
    qualityNote,
    missingInputs,
    contributors,
  };
}
