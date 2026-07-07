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
