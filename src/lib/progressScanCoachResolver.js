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
  if (scan?.comparisonStatus === 'not_comparable') return 'Your latest progress photos are saved, but I am not comparing them because the setup changed too much.';
  if (scan?.comparisonStatus !== 'comparable') return 'Your latest progress photos are saved as a baseline until there is another comparable photo set.';
  if (direction === 'down') return 'Your latest progress photos have a positive visual progress signal against the last comparable photo set.';
  if (direction === 'up') return 'Your latest progress photos show a visual drift to watch against the last comparable photo set.';
  if (direction === 'steady') return 'Your latest progress photos are holding steady against the last comparable photo set.';
  return 'Your latest progress photos are saved as a baseline until there is another comparable photo set.';
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
    return `Your latest progress photos are ${label}, but I am not comparing them because the setup changed too much.`;
  }
  if (scan?.comparisonStatus !== 'comparable') {
    return `Your latest progress photos are ${label}. This is a baseline until there is another comparable photo set.`;
  }
  if (direction === 'down') {
    return `Your latest progress photos are ${label}, with a positive visual progress signal against the last comparable photo set.`;
  }
  if (direction === 'up') {
    return `Your latest progress photos are ${label}, with a visual drift to watch against the last comparable photo set.`;
  }
  if (direction === 'steady') {
    return `Your latest progress photos are ${label}. I am reading them as holding steady.`;
  }
  return `Your latest progress photos are ${label}. This is a baseline until there is another comparable photo set.`;
}

function coachLine(scan, label, trendOnly = false) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') {
    return 'Progress photos are saved, but I am not using them as a comparison because the setup changed too much.';
  }
  if (scan?.comparisonStatus !== 'comparable') {
    return 'Progress photos are now saved as a baseline. I will compare future photo sets only when the setup is comparable.';
  }
  const context = label && !trendOnly ? label : 'visual scan signals';
  if (direction === 'down') return `Progress photos also have a positive signal from ${context}. I am treating that as photo context, not a reason to push the cut harder.`;
  if (direction === 'up') return `Progress photos show a drift to watch from ${context}. I am treating that as a check on consistency, not as a calorie trigger.`;
  if (direction === 'steady') return `Progress photos are steady from ${context}. That supports holding the read calm unless your logged trend says otherwise.`;
  return `Progress photos are now saved as a baseline from ${context}. I will compare future photo sets only when the setup is comparable.`;
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
    trendOnly && label ? 'Detailed score and band are hidden by your preference.' : null,
    'This is a visual progress score from repeatable photos.',
    decisionLine(output),
  ].filter(Boolean).join(' '));

  return {
    source: PHOTO_SCAN_SOURCE,
    title: 'Progress photo context',
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
