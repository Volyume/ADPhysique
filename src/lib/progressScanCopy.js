import { formatVolyumeScore, progressScanAssessmentForDisplay } from './progressScanDisplay';

const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

export function trendOnlyScanCopy(scan) {
  const assessment = progressScanAssessmentForDisplay(scan);
  if (assessment?.progressSignalLabel) return `Progress change: ${assessment.progressSignalLabel}.`;
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.deltaExplanation?.comparisonStatus === 'not_comparable') return 'Saved, but not compared because the setup changed too much.';
  if (direction === 'down') return 'Progress change: positive against the last comparable photo set.';
  if (direction === 'up') return 'Progress change: drift to watch against the last comparable photo set.';
  if (direction === 'steady') return 'Progress change: holding steady.';
  return 'Baseline photo set saved.';
}

export function scanReadCopy(scan, { suppressed = false, hideExact = false } = {}) {
  if (suppressed) return 'Photo set saved privately. Score details are hidden right now.';
  const assessment = progressScanAssessmentForDisplay(scan);
  if (assessment?.visualLeannessScore != null) {
    const score = `Volyume Score ${formatVolyumeScore(assessment.visualLeannessScore)}`;
    const band = assessment.leannessBandLabel ? `${assessment.leannessBandLabel} band` : 'No band';
    const confidence = assessment.scanConfidenceLabel ? `Result confidence: ${assessment.scanConfidenceLabel}` : null;
    if (hideExact) {
      return `${assessment.leannessBandLabel ? `${band}. ` : ''}${trendOnlyScanCopy(scan)} Detailed score is hidden.`;
    }
    return [score, band, confidence, `Progress change: ${assessment.progressSignalLabel || 'Baseline set'}`, 'Private visual progress score from repeatable photos.']
      .filter(Boolean)
      .join('. ');
  }
  if (scan?.analysisStatus === 'complete' || scan?.analysisStatus === 'measured') {
    return hideExact
      ? trendOnlyScanCopy(scan)
      : (scan?.copySummary || 'Photo set measured and saved. Volyume could not create a useful score from it yet.');
  }
  return scan?.copySummary || 'Saved as a photo set. A score will appear when the photos and profile data are reliable enough.';
}

export function scanStatsCopy(scan, { suppressed = false, hideExact = false } = {}) {
  const stats = scan?.stats || {};
  const parts = [];
  if (Number.isFinite(stats.photoCount)) parts.push(`${stats.photoCount} photo${stats.photoCount === 1 ? '' : 's'}`);
  if (!suppressed && !hideExact && Number.isFinite(stats.weightKg)) parts.push(`${stats.weightKg} kg weight snapshot`);
  if (Array.isArray(stats.poses) && stats.poses.length) {
    parts.push(stats.poses.map((p) => POSE_LABEL[p] || p).join(', '));
  }
  return parts.length ? parts.join(' | ') : 'Stored photo set';
}
