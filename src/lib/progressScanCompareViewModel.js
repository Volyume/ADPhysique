import { explainMeasuredScanDelta } from './progressScanAnalysis';

const POSES = ['front', 'back', 'side'];

function finiteNumber(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function orderedScanEntries(scans = []) {
  return (Array.isArray(scans) ? scans : [])
    .filter((scan) => scan?.id && scan?.status !== 'draft' && scan?.requiredPosesComplete && Array.isArray(scan.assets))
    .sort((a, b) => (finiteNumber(a.capturedAt) ?? 0) - (finiteNumber(b.capturedAt) ?? 0));
}

export function defaultScanPair(scans = []) {
  const ordered = orderedScanEntries(scans);
  if (ordered.length === 0) return [];
  if (ordered.length === 1) return [ordered[0].id];
  return [ordered[0].id, ordered[ordered.length - 1].id];
}

export function normaliseScanCompareSelection(previousSelection = [], entries = []) {
  const live = (Array.isArray(previousSelection) ? previousSelection : [])
    .filter((id) => entries.some((scan) => scan.id === id));
  if (live.length === 2) return live;
  return defaultScanPair(entries);
}

export function nextScanCompareSelection(previousSelection = [], id) {
  const prev = Array.isArray(previousSelection) ? previousSelection : [];
  if (prev.includes(id)) return prev.filter((current) => current !== id);
  if (prev.length < 2) return [...prev, id];
  return [prev[1], id];
}

function assetForPose(scan, pose) {
  return (scan?.assets || []).find((asset) => asset?.pose === pose && asset?.uri) || null;
}

export function poseRowsForPair(earlier, later) {
  return POSES
    .map((pose) => ({ pose, earlier: assetForPose(earlier, pose), later: assetForPose(later, pose) }))
    .filter((row) => row.earlier || row.later);
}

export function resolveScanComparePair(entries = [], selected = []) {
  return (Array.isArray(selected) ? selected : [])
    .map((id) => entries.find((scan) => scan.id === id))
    .filter(Boolean)
    .sort((a, b) => (finiteNumber(a.capturedAt) ?? 0) - (finiteNumber(b.capturedAt) ?? 0));
}

export function buildProgressScanCompareModel(entries = [], selected = []) {
  const pair = resolveScanComparePair(entries, selected);
  const earlier = pair[0] || null;
  const later = pair[1] || null;
  const rows = earlier && later ? poseRowsForPair(earlier, later) : [];
  const delta = earlier && later ? explainMeasuredScanDelta({ currentScan: later, previousScan: earlier }) : null;
  return {
    pair,
    earlier,
    later,
    rows,
    delta,
  };
}
