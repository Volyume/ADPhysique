/**
 * Out-of-engine Physique Scan coaching resolver.
 *
 * This is deliberately NOT part of weeklyCoach or nutritionEngine. It takes the
 * already bounded photo_scan summary and turns it into a coach-facing note that
 * can sit beside the weekly read without changing any target, floor, threshold
 * or held decision.
 */
import { PHOTO_SCAN_SOURCE } from './progressScanAnalysis';
import { checkJargon } from './whyThisTemplates';

function clean(str) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const { clean: ok, violations } = checkJargon(str);
    if (!ok) {
      throw new Error(`Jargon detected in Physique Scan coach note: "${violations.join(', ')}" in: "${str}"`);
    }
    if (/[\u2013\u2014]/.test(str)) {
      throw new Error(`Em or en dash detected in Physique Scan coach note: "${str}"`);
    }
  }
  return String(str ?? '').trim();
}

function trendOnlyLabel(scan) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') return 'Your latest Physique Scan is saved, but I am not comparing it because the setup was not like-for-like.';
  if (scan?.comparisonStatus !== 'comparable') return 'Your latest Physique Scan is saved as a baseline until there is another like-for-like scan.';
  if (direction === 'down') return 'Your latest Physique Scan has a positive visual progress signal against the last like-for-like scan.';
  if (direction === 'up') return 'Your latest Physique Scan shows a visual drift to watch against the last like-for-like scan.';
  if (direction === 'steady') return 'Your latest Physique Scan is holding steady against the last like-for-like scan.';
  return 'Your latest Physique Scan is saved as a baseline until there is another like-for-like scan.';
}

function scanLabel(scan) {
  const band = scan?.leannessBandLabel || null;
  const confidence = scan?.confidence || null;
  const confidenceCopy = confidence === 'moderate' ? 'moderate confidence'
    : confidence === 'high' ? 'high confidence'
      : confidence === 'low' ? 'low confidence'
        : null;
  if (!band && !confidenceCopy) return null;
  return [band ? `${band} band` : null, confidenceCopy].filter(Boolean).join(', ');
}

function trendLine(scan, label, trendOnly = false) {
  if (trendOnly || !label) return trendOnlyLabel(scan);
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') {
    return `Your latest Physique Scan is ${label}, but I am not comparing it because the setup was not like-for-like.`;
  }
  if (scan?.comparisonStatus !== 'comparable') {
    return `Your latest Physique Scan is ${label}. This is a baseline until there is another comparable scan.`;
  }
  if (direction === 'down') {
    return `Your latest Physique Scan is ${label}, with a positive visual progress signal against the last comparable scan.`;
  }
  if (direction === 'up') {
    return `Your latest Physique Scan is ${label}, with a visual drift to watch against the last comparable scan.`;
  }
  if (direction === 'steady') {
    return `Your latest Physique Scan is ${label}. I am reading it as holding steady.`;
  }
  return `Your latest Physique Scan is ${label}. This is a baseline until there is another comparable scan.`;
}

function coachLine(scan, label, trendOnly = false) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') {
    return 'Physique Scan is saved, but I am not using it as a comparison because the setup was not like-for-like.';
  }
  if (scan?.comparisonStatus !== 'comparable') {
    return 'Physique Scan is now saved as a baseline. I will compare future scans only when the photos are like-for-like.';
  }
  const context = label && !trendOnly ? label : 'visual scan signals';
  if (direction === 'down') return `Physique Scan also has a positive signal from ${context}. I am treating that as photo context, not a reason to push the cut harder.`;
  if (direction === 'up') return `Physique Scan shows a drift to watch from ${context}. I am treating that as a check on consistency, not as a calorie trigger.`;
  if (direction === 'steady') return `Physique Scan is steady from ${context}. That supports holding the read calm unless your logged trend says otherwise.`;
  return `Physique Scan is now saved as a baseline from ${context}. I will compare future scans only when the photos are like-for-like.`;
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
  if (scan.confidence === 'not_enough') return null;
  const label = scanLabel(scan);

  const body = clean([
    trendLine(scan, label, trendOnly),
    trendOnly && label ? 'Detailed scan index and band are hidden by your preference.' : null,
    'This is a visual progress index, not a body fat estimate.',
    decisionLine(output),
  ].filter(Boolean).join(' '));

  return {
    source: PHOTO_SCAN_SOURCE,
    title: 'Physique Scan context',
    body,
    coachLine: clean(coachLine(scan, label, trendOnly)),
    trendDirection: scan.trendDirection || 'uncertain',
    confidence: scan.confidence || 'low',
    leannessBand: trendOnly ? null : (scan.leannessBand ?? null),
    leannessBandLabel: trendOnly ? null : (scan.leannessBandLabel ?? null),
    progressSignal: scan.progressSignal ?? null,
    rangeLow: null,
    rangeHigh: null,
    usedFor: 'visual_trend_context_only',
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
