/**
 * Training Readiness — a Garmin-style "should I train hard today?" score, but
 * built ON TOP OF our existing WHOOP Recovery score (Recovery is its dominant
 * input) rather than duplicating it. It fuses Recovery with sleep, HRV, sleep
 * debt and training load.
 */

import {
  SLEEP_TRUST_LOW_COVERAGE_PCT,
  SLEEP_TRUST_LOW_SIGNAL_MIN,
  SLEEP_TRUST_MEDIUM_COVERAGE_PCT,
  SLEEP_TRUST_MEDIUM_SIGNAL_MIN,
  sleepTrustTier,
} from './sleepTrustWeight';

export type Readiness = {
  score: number; // 0..100
  label: string; // Poor / Low / Moderate / High / Prime
  confidence: 'high' | 'medium' | 'low';
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

/** ACWR → 0..100 sub-score (sweet spot 0.8–1.3 best, extremes penalised). */
function loadSubScore(acwr: number | null): number {
  if (acwr == null) return 70; // neutral when unknown
  if (acwr >= 0.8 && acwr <= 1.3) return 100;
  if (acwr < 0.8) return Math.max(40, 100 - (0.8 - acwr) * 80);
  return Math.max(10, 100 - (acwr - 1.3) * 90); // overload penalised harder
}

export function computeTrainingReadiness(input: {
  recovery: number | null; // 0..100
  sleepPerformance: number | null; // 0..100
  sleepDebtMin: number;
  hrvBalance: number | null; // 0..100 (HRV vs baseline)
  acwr: number | null;
  sleepConfidence?: 'high' | 'medium' | 'low' | null;
  sleepCoveragePct?: number | null;
  sleepSignalMin?: number | null;
}): Readiness | null {
  const { recovery, sleepPerformance, sleepDebtMin, hrvBalance, acwr, sleepConfidence = null, sleepCoveragePct = null, sleepSignalMin = null } = input;
  // Need at least recovery or sleep to say anything.
  if (recovery == null && sleepPerformance == null) return null;

  const rec = recovery ?? sleepPerformance ?? 50;
  const sleep = sleepPerformance ?? rec;
  const debtPenalty = Math.max(0, 100 - (sleepDebtMin / 120) * 100); // 2h debt → 0
  const hrv = hrvBalance ?? rec;
  const load = loadSubScore(acwr);

  const score = Math.round(
    0.35 * rec + 0.25 * sleep + 0.15 * debtPenalty + 0.1 * hrv + 0.15 * load,
  );
  const scoreCap = readinessScoreCap({ sleepConfidence, sleepCoveragePct, sleepSignalMin });
  const clamped = Math.max(1, Math.min(100, Math.min(score, scoreCap ?? 100)));
  const cappedByConfidence = scoreCap != null && clamped < Math.max(1, Math.min(100, score));

  const sleepTrust = sleepTrustContributor({ sleepConfidence, sleepCoveragePct, sleepSignalMin });
  const contributors = [
    { key: 'recovery', label: 'Recovery', value: recovery != null ? `${recovery}%` : '—', good: recovery != null ? recovery >= 60 : null },
    { key: 'sleep', label: 'Sleep', value: sleepPerformance != null ? `${sleepPerformance}%` : '—', good: sleepPerformance != null ? sleepPerformance >= 70 : null },
    sleepTrust,
    { key: 'debt', label: 'Sleep debt', value: `${Math.round(sleepDebtMin)}m`, good: sleepDebtMin < 45 },
    { key: 'hrv', label: 'HRV balance', value: hrvBalance != null ? `${hrvBalance}` : '—', good: hrvBalance != null ? hrvBalance >= 50 : null },
    { key: 'load', label: 'Training load', value: acwr != null ? acwr.toFixed(2) : '—', good: acwr != null ? acwr >= 0.8 && acwr <= 1.3 : null },
  ];
  const missingInputs = [
    recovery == null ? 'recovery' : null,
    sleepPerformance == null ? 'sleep performance' : null,
    hrvBalance == null ? 'HRV balance' : null,
    acwr == null ? 'training load' : null,
  ].filter((v): v is string => v != null);

  let confidencePct = 100;
  if (recovery == null) confidencePct -= 25;
  if (sleepPerformance == null) confidencePct -= 20;
  if (hrvBalance == null) confidencePct -= 10;
  if (acwr == null) confidencePct -= 10;
  if (sleepConfidence === 'medium') confidencePct -= 12;
  if (sleepConfidence === 'low') confidencePct -= 30;
  if (sleepPerformance != null && sleepConfidence == null) confidencePct -= 12;
  if (sleepCoveragePct != null && sleepCoveragePct < SLEEP_TRUST_LOW_COVERAGE_PCT) confidencePct -= 20;
  else if (sleepCoveragePct != null && sleepCoveragePct < SLEEP_TRUST_MEDIUM_COVERAGE_PCT) confidencePct -= 8;
  if (sleepSignalMin != null && sleepSignalMin < SLEEP_TRUST_LOW_SIGNAL_MIN) confidencePct -= 20;
  else if (sleepSignalMin != null && sleepSignalMin < SLEEP_TRUST_MEDIUM_SIGNAL_MIN) confidencePct -= 8;
  confidencePct = Math.max(20, Math.min(100, Math.round(confidencePct)));

  const confidence = confidencePct >= 80 ? 'high' : confidencePct >= 55 ? 'medium' : 'low';
  const qualityLabel =
    confidence === 'high' ? 'Strong signal' : confidence === 'medium' ? 'Usable estimate' : 'Treat cautiously';
  const qualityNote =
    missingInputs.length > 0
      ? `Readiness is using fallbacks until ${missingInputs.join(', ')} are available.`
      : sleepConfidence === 'low'
        ? 'Readiness is limited by low sleep confidence; sync more overnight data or review the sleep window.'
        : sleepConfidence === 'medium'
          ? 'Readiness is usable, but fuller sleep coverage or corroboration may refine it.'
          : 'Readiness is backed by recovery, sleep, HRV balance and recent training load.';

  return {
    score: clamped,
    label: readinessLabel(clamped),
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

function readinessScoreCap(input: {
  sleepConfidence: 'high' | 'medium' | 'low' | null;
  sleepCoveragePct: number | null;
  sleepSignalMin: number | null;
}): number | null {
  const tier = sleepTrustTier({
    confidence: input.sleepConfidence,
    coveragePct: input.sleepCoveragePct,
    signalMin: input.sleepSignalMin,
  });
  if (tier === 'low') return 65;
  if (tier === 'medium') return 86;
  return null;
}

function sleepTrustContributor(input: {
  sleepConfidence: 'high' | 'medium' | 'low' | null;
  sleepCoveragePct: number | null;
  sleepSignalMin: number | null;
}): Readiness['contributors'][number] {
  const confidence = input.sleepConfidence;
  const coverage = input.sleepCoveragePct;
  const signal = input.sleepSignalMin;
  const label = confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : confidence === 'low' ? 'Low' : '—';
  const detail =
    coverage != null
      ? `${label} · ${coverage}%`
      : signal != null
        ? `${label} · ${signal}m`
        : label;

  const tier = sleepTrustTier({ confidence, coveragePct: coverage, signalMin: signal });

  return {
    key: 'sleep_trust',
    label: 'Sleep trust',
    value: detail,
    good: confidence == null && coverage == null && signal == null ? null : tier === 'high',
  };
}
