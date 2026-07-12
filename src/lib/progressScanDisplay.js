import { normaliseStoredPhysiqueAssessment } from './progressScanAnalysis';

export function progressScanAssessmentForDisplay(scanOrAssessment = null) {
  const assessment = scanOrAssessment?.signals?.physiqueAssessment
    ?? scanOrAssessment?.physiqueAssessment
    ?? scanOrAssessment
    ?? null;
  return normaliseStoredPhysiqueAssessment(assessment);
}

// Display re-clamps to [0, 100] (audit E-F2): the engine can only produce
// in-range scores, but a corrupt STORED value (e.g. 900 from a bad write)
// previously rendered as "900/100". The display layer never trusts storage.
function clampedDisplayScore(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function progressScanScoreForDisplay(scanOrAssessment = null) {
  const assessment = progressScanAssessmentForDisplay(scanOrAssessment);
  return clampedDisplayScore(assessment?.visualLeannessScore);
}

export function formatVolyumeScore(value) {
  const n = clampedDisplayScore(value);
  return n == null ? null : `${n}/100`;
}
