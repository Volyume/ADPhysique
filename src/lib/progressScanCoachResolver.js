/**
 * Out-of-engine Progress Scan coaching resolver.
 *
 * This is deliberately NOT part of weeklyCoach or nutritionEngine. It takes the
 * already bounded photo_scan summary and turns it into a coach-facing note that
 * can sit beside the weekly read without changing any target, floor, threshold
 * or held decision.
 */
import { PHOTO_SCAN_SOURCE } from './progressScanAnalysis';
import { checkJargon } from './whyThisTemplates';

function finiteNumber(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function clean(str) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const { clean: ok, violations } = checkJargon(str);
    if (!ok) {
      throw new Error(`Jargon detected in Progress Scan coach note: "${violations.join(', ')}" in: "${str}"`);
    }
    if (/[\u2013\u2014]/.test(str)) {
      throw new Error(`Em or en dash detected in Progress Scan coach note: "${str}"`);
    }
  }
  return String(str ?? '').trim();
}

function rangeLabel(scan) {
  const low = finiteNumber(scan?.rangeLow ?? scan?.estimateRangeLow);
  const high = finiteNumber(scan?.rangeHigh ?? scan?.estimateRangeHigh);
  if (low == null || high == null || high < low) return null;
  return `${low}-${high}%`;
}

function trendOnlyLabel(scan) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') return 'Your latest Progress Scan is saved, but I am not comparing it because the setup was not like-for-like.';
  if (direction === 'down') return 'Your latest Progress Scan measured signals point lower than the last like-for-like scan.';
  if (direction === 'up') return 'Your latest Progress Scan measured signals point higher than the last like-for-like scan.';
  if (direction === 'steady') return 'Your latest Progress Scan measured signals are broadly steady against the last like-for-like scan.';
  return 'Your latest Progress Scan is saved as a baseline until there is another like-for-like scan.';
}

function trendLine(scan, label, trendOnly = false) {
  if (trendOnly || !label) return trendOnlyLabel(scan);
  const direction = scan?.trendDirection || 'uncertain';
  if (direction === 'down') {
    return `Your latest Progress Scan range is ${label} and points lower than the last comparable scan.`;
  }
  if (direction === 'up') {
    return `Your latest Progress Scan range is ${label} and points higher than the last comparable scan.`;
  }
  if (direction === 'steady') {
    return `Your latest Progress Scan range is ${label}. The movement is inside the scan range, so I am reading it as steady.`;
  }
  return `Your latest Progress Scan range is ${label}. This is a baseline until there is another comparable scan.`;
}

function coachLine(scan, label, trendOnly = false) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') {
    return 'Progress Scan is saved, but I am not using it as a comparison because the setup was not like-for-like.';
  }
  const range = label && !trendOnly ? `range ${label}` : 'measured outline signals only';
  if (direction === 'down') return `Progress Scan also points lower from ${range}. I am treating that as supporting trend context, not a reason to push the cut harder.`;
  if (direction === 'up') return `Progress Scan points higher from ${range}. I am treating that as a check to watch consistency, not as a calorie trigger.`;
  if (direction === 'steady') return `Progress Scan is steady from ${range}. That supports holding the read calm unless your logged trend says otherwise.`;
  return `Progress Scan is now saved as a baseline from ${range}. I will compare future scans only when the photos are like-for-like.`;
}

function decisionLine(output) {
  const hasWeeklyOutput = !!output;
  const primary = output?.primary?.domain ?? null;
  if (!hasWeeklyOutput) {
    return 'I will keep it as photo context until the weekly read has enough logged data beside it.';
  }
  if (primary === 'calories' || output?.adjustments?.calories) {
    return 'The weekly target still comes from your logs, weight trend, training and recovery, not from this scan.';
  }
  return 'It sits beside the weekly read as a low-confidence cross-check, not as a target-setting signal.';
}

export function resolveProgressScanCoachNote({
  scan = null,
  output = null,
  suppressed = false,
  trendOnly = false,
} = {}) {
  if (suppressed || !scan || scan.source !== PHOTO_SCAN_SOURCE) return null;
  if (scan.confidence && scan.confidence !== 'low') return null;
  const label = rangeLabel(scan);

  const body = clean([
    trendLine(scan, label, trendOnly),
    trendOnly && label ? 'Exact scan ranges are hidden by your preference.' : null,
    label ? 'The estimate is provisional and still calibrating for your body type.' : 'This is measured outline context only, not a body-fat estimate.',
    decisionLine(output),
  ].filter(Boolean).join(' '));

  return {
    source: PHOTO_SCAN_SOURCE,
    title: 'Progress Scan context',
    body,
    coachLine: clean(coachLine(scan, label, trendOnly)),
    trendDirection: scan.trendDirection || 'uncertain',
    confidence: 'low',
    rangeLow: trendOnly ? null : finiteNumber(scan.rangeLow ?? scan.estimateRangeLow),
    rangeHigh: trendOnly ? null : finiteNumber(scan.rangeHigh ?? scan.estimateRangeHigh),
    usedFor: 'trend_context_only',
    affectsTargets: false,
  };
}

export function applyProgressScanCoachContext(coachResponse = {}, scanNote = null) {
  if (!scanNote?.coachLine) return coachResponse;
  const interpretation = [coachResponse.interpretation, scanNote.coachLine]
    .filter(Boolean)
    .join(' ');
  return {
    ...coachResponse,
    interpretation: interpretation || null,
    progressScanContext: {
      usedFor: scanNote.usedFor,
      affectsTargets: false,
    },
  };
}
