const POSE_LABEL = { front: 'Front', side: 'Side', back: 'Back' };

export function trendOnlyScanCopy(scan) {
  const assessment = scan?.signals?.physiqueAssessment || null;
  if (assessment?.progressSignalLabel) return `Progress Signal: ${assessment.progressSignalLabel}.`;
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.deltaExplanation?.comparisonStatus === 'not_comparable') return 'Trend context: saved, but not compared because the setup was not like-for-like.';
  if (direction === 'down') return 'Progress Signal: positive against the last like-for-like scan.';
  if (direction === 'up') return 'Progress Signal: drift to watch against the last like-for-like scan.';
  if (direction === 'steady') return 'Progress Signal: holding steady.';
  return 'Trend context: baseline photo set saved.';
}

export function scanReadCopy(scan, { suppressed = false, hideExact = false } = {}) {
  if (suppressed) return 'Photo set saved privately. Score details are hidden right now.';
  const assessment = scan?.signals?.physiqueAssessment || null;
  if (assessment?.visualLeannessScore != null) {
    const score = `Volyume Physique Score ${Math.round(Number(assessment.visualLeannessScore))}/100`;
    const band = assessment.leannessBandLabel ? `${assessment.leannessBandLabel} band` : 'No band';
    const confidence = assessment.scanConfidenceLabel ? `Scan Confidence: ${assessment.scanConfidenceLabel}` : null;
    if (hideExact) {
      return `${assessment.leannessBandLabel ? `${band}. ` : ''}${trendOnlyScanCopy(scan)} Detailed score is hidden. This is not a body fat percentage.`;
    }
    return [score, band, confidence, `Progress Signal: ${assessment.progressSignalLabel || 'Baseline scan'}`, 'This is a visual progress score, not a body fat percentage.']
      .filter(Boolean)
      .join('. ');
  }
  if (scan?.analysisStatus === 'complete' || scan?.analysisStatus === 'measured') {
    return hideExact
      ? trendOnlyScanCopy(scan)
      : (scan?.copySummary || 'Photo set measured and saved. Volyume could not produce a useful score from it yet.');
  }
  return scan?.copySummary || 'Saved as a photo set. Analysis is withheld until the photos and profile data are reliable enough.';
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
