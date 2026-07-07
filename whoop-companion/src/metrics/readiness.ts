/**
 * Training Readiness — a Garmin-style "should I train hard today?" score, but
 * built ON TOP OF our existing WHOOP Recovery score (Recovery is its dominant
 * input) rather than duplicating it. It fuses Recovery with sleep, HRV, sleep
 * debt and training load.
 */

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

  const contributors = [
    { key: 'recovery', label: 'Recovery', value: recovery != null ? `${recovery}%` : '—', good: recovery != null ? recovery >= 60 : null },
    { key: 'sleep', label: 'Sleep', value: sleepPerformance != null ? `${sleepPerformance}%` : '—', good: sleepPerformance != null ? sleepPerformance >= 70 : null },
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
  if (sleepCoveragePct != null && sleepCoveragePct < 60) confidencePct -= 20;
  else if (sleepCoveragePct != null && sleepCoveragePct < 80) confidencePct -= 8;
  if (sleepSignalMin != null && sleepSignalMin < 150) confidencePct -= 20;
  else if (sleepSignalMin != null && sleepSignalMin < 240) confidencePct -= 8;
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
          ? 'Readiness is usable, but more complete sleep coverage may refine it.'
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
  if (input.sleepConfidence === 'high') return null;
  const coverage = input.sleepCoveragePct ?? 100;
  const signal = input.sleepSignalMin ?? 999;
  if (input.sleepConfidence === 'low' || coverage < 60 || signal < 150) return 65;
  if (input.sleepConfidence === 'medium' || coverage < 80 || signal < 240) return 86;
  return null;
}
