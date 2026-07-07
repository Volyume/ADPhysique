import { colors } from './theme';

export type SleepConfidence = 'high' | 'medium' | 'low' | null | undefined;

export function sleepConfidenceLabel(confidence: SleepConfidence): string {
  if (confidence === 'high') return 'High';
  if (confidence === 'medium') return 'Medium';
  if (confidence === 'low') return 'Low';
  return '-';
}

export function sleepConfidenceColor(confidence: SleepConfidence): string {
  if (confidence === 'high') return colors.recoveryGreen;
  if (confidence === 'medium') return colors.recoveryYellow;
  if (confidence === 'low') return colors.recoveryRed;
  return colors.textTertiary;
}

export function sleepCoverageColor(coveragePct: number | null | undefined): string {
  if (coveragePct == null) return colors.textTertiary;
  if (coveragePct >= 80) return colors.recoveryGreen;
  if (coveragePct >= 60) return colors.recoveryYellow;
  return colors.recoveryRed;
}
