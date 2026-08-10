/**
 * Out-of-engine progress photo coaching resolver.
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
      throw new Error(`Jargon detected in progress photo coach note: "${violations.join(', ')}" in: "${str}"`);
    }
    if (/[\u2013\u2014]/.test(str)) {
      throw new Error(`Em or en dash detected in progress photo coach note: "${str}"`);
    }
  }
  return String(str ?? '').trim();
}

function trendOnlyLabel(scan) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') return 'Your progress photos are saved. This set was not compared because the photo setup changed.';
  if (scan?.comparisonStatus !== 'comparable') return 'Your progress photos are saved as a starting point. The next set taken the same way will be compared against it.';
  if (direction === 'down') return 'Your progress photos show visible progress since your last comparable set.';
  if (direction === 'up') return 'Your progress photos show a small shift worth keeping an eye on.';
  if (direction === 'steady') return 'Your progress photos look steady since your last comparable set.';
  return 'Your progress photos are saved as a starting point. The next set taken the same way will be compared against it.';
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
    return `Your progress photos read as ${label}. This set was not compared because the photo setup changed.`;
  }
  if (scan?.comparisonStatus !== 'comparable') {
    return `Your progress photos read as ${label}. This is your starting point until another set is taken the same way.`;
  }
  if (direction === 'down') {
    return `Your progress photos read as ${label}, with visible progress since your last comparable set.`;
  }
  if (direction === 'up') {
    return `Your progress photos read as ${label}, with a small shift worth keeping an eye on.`;
  }
  if (direction === 'steady') {
    return `Your progress photos read as ${label}, holding steady since your last comparable set.`;
  }
  return `Your progress photos read as ${label}. This is your starting point until another set is taken the same way.`;
}

function coachLine(scan, label, trendOnly = false) {
  const direction = scan?.trendDirection || 'uncertain';
  if (scan?.comparisonStatus === 'not_comparable') {
    return 'Your photos are saved, but this set was not compared because the photo setup changed.';
  }
  if (scan?.comparisonStatus !== 'comparable') {
    return 'Your photos are saved as a starting point. Future sets are compared once they are taken the same way.';
  }
  // D86: the band/confidence label is deliberately not repeated here.
  // trendLine already carries it; this line's job is the ED-safe framing,
  // never a score readout.
  void label; void trendOnly;
  if (direction === 'down') return 'Your photos also show progress. That is context, not a reason to push the cut harder.';
  if (direction === 'up') return 'Your photos show a small shift. It reads as a nudge on consistency, not a reason to change your calories.';
  if (direction === 'steady') return 'Your photos look steady. That supports holding things as they are.';
  return 'Your photos are saved as a starting point. Future sets are compared once they are taken the same way.';
}

function decisionLine(output) {
  const hasWeeklyOutput = !!output;
  const primary = output?.primary?.domain ?? null;
  if (!hasWeeklyOutput) {
    return 'They stay as context until the weekly read has enough logged data beside it.';
  }
  if (primary === 'calories' || output?.adjustments?.calories) {
    return 'Your weekly targets still come from your logs, weight trend, training and recovery, not from your photos.';
  }
  return 'Photos never set your targets. Those come from your logged training, food and weight trend.';
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
    // D86: the "This is photo context from repeatable progress photos." filler
    // sentence is gone; the trend line and the targets line carry everything.
    // D94 (Campaign 3): "as you chose" was FALSE - the hide-exact
    // preference has no UI writer and defaults on for everyone, so no
    // user ever chose it. State the fact, claim no choice. Whether a
    // control should exist is a recorded founder ruling (CONTROL-GAPS).
    trendOnly && label ? 'Detailed scores stay hidden here; the trend is the steadier read.' : null,
    decisionLine(output),
  ].filter(Boolean).join(' '));

  // Wave 4 (integration blueprint §11 item 3): the used/not-used sentence
  // ("this does not change your targets", in decisionLine()'s words) already
  // ran unconditionally into `body` above. It did NOT reliably reach
  // `coachLine` -- the text folded into the coach's main interpretation via
  // applyProgressScanCoachContext -- because coachLine()'s own branches only
  // stated non-authority in some cases (e.g. the not-comparable/baseline
  // branches did not). Appending decisionLine(output) here makes EVERY
  // scan-derived render path on the coach screen (the dedicated card body,
  // and the folded interpretation line) carry the same deterministic
  // non-authority sentence, regardless of scan state. See
  // progressScanCoachIsolation.guard.test.js and progressScanCoachResolver.test.js
  // for the source + behavioural guards that pin this.
  const foldedCoachLine = clean([coachLine(scan, label, trendOnly), decisionLine(output)].filter(Boolean).join(' '));

  return {
    source: PHOTO_SCAN_SOURCE,
    title: 'Progress photos',
    body,
    coachLine: foldedCoachLine,
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
