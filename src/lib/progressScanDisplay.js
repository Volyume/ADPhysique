import { normaliseStoredPhysiqueAssessment } from './progressScanAnalysis';

export function progressScanAssessmentForDisplay(scanOrAssessment = null) {
  const assessment = scanOrAssessment?.signals?.physiqueAssessment
    ?? scanOrAssessment?.physiqueAssessment
    ?? scanOrAssessment
    ?? null;
  return normaliseStoredPhysiqueAssessment(assessment);
}

export function progressScanScoreForDisplay(scanOrAssessment = null) {
  const assessment = progressScanAssessmentForDisplay(scanOrAssessment);
  const score = assessment?.visualLeannessScore;
  if (score == null || score === '') return null;
  const n = Number(score);
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function formatVolyumeScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return `${Math.round(n)}/100`;
}
