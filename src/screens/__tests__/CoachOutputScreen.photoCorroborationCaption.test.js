/**
 * CoachOutputScreen render-time confidence-caption transform
 * (D18, founder decision 2026-07-09; docs/ux-world-class-audit-2026-07-09/
 * DECISIONS-2026-07-09.md D18; plan-F §4.4 fork, delegated to the lead --
 * ruling registered in docs/ux-world-class-audit-2026-07-09/
 * _HANDOVER-AND-RESUME.md "PLAN-F FORKS").
 *
 * The lead ruling: corroboration is RENDER-TIME ONLY. `runWeeklyCoach` is
 * still always called with photoCorroboration absent/null (the persisted/
 * synced coach output stays byte-identical); the screen separately derives
 * a photo-corroboration signal from the device-local v2 evidence packet
 * (via the ONE shared derivation, `derivePhotoCorroborationSignal`,
 * progressScanCheckInEvidence.js) and feeds it through the engine's own
 * pure `corroborateConfidenceLevel` (weeklyCoach.js) purely to choose which
 * caption word is shown on THIS load. Nothing here writes back to `output`,
 * `saveCoachOutput`, or any synced field.
 *
 * This screen cannot be safely `require`'d in Jest (see
 * progressScanCoachIsolation.guard.test.js / CoachOutputScreen.
 * progressScanAssessment.test.js for why), so the wiring itself is pinned by
 * source guard, exactly like those suites. The behavioural claims (base vs.
 * one-step-raised vs. fail-to-base) are exercised directly against the two
 * REAL, pure, exported functions the screen composes at that exact site
 * (`derivePhotoCorroborationSignal` + `corroborateConfidenceLevel`), so the
 * assertions are against real engine/evidence-layer behaviour, not a
 * reimplementation of it.
 */
const fs = require('fs');
const path = require('path');
const { corroborateConfidenceLevel } = require('../../lib/weeklyCoach');
const {
  derivePhotoCorroborationSignal,
  buildScanEvidencePacket,
} = require('../../lib/progressScanCheckInEvidence');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

function matchingParenSlice(source, openParenIndex) {
  let depth = 0;
  let i = openParenIndex;
  for (; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) break;
    }
  }
  expect(depth).toBe(0);
  return source.slice(openParenIndex, i + 1);
}

function callBlocks(source, callName) {
  const blocks = [];
  let offset = 0;
  while (offset < source.length) {
    const start = source.indexOf(`${callName}(`, offset);
    if (start === -1) break;
    const block = matchingParenSlice(source, start + callName.length);
    blocks.push(block);
    offset = start + block.length + callName.length;
  }
  return blocks;
}

const NOW = 1720000000000;

function scoredEvidence(overrides = {}) {
  return {
    source: 'photo_scan',
    scanId: null,
    capturedAt: NOW - 2 * 86400000,
    score: 66,
    band: 'Lean',
    confidenceTier: 'moderate',
    validityStatus: 'scored',
    withholdReasons: [],
    captureQuality: { lighting: null, blur: null, framing: null, pose: null, segmentation: null, tiltDegrees: null },
    baselineScanId: null,
    trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3.2, comparableOnly: true },
    setupFindings: [],
    usedFor: 'visual_trend_context_only',
    affectsTargets: false,
    ...overrides,
  };
}

function trend(deltaKg) {
  return { delta: deltaKg };
}

describe('CoachOutputScreen wiring: render-time confidence-caption transform (source guard)', () => {
  test('imports corroborateConfidenceLevel from weeklyCoach and derivePhotoCorroborationSignal from the evidence layer', () => {
    expect(SCREEN).toMatch(/import \{ runWeeklyCoach, mapCalsAdherence, corroborateConfidenceLevel \} from '\.\.\/lib\/weeklyCoach';/);
    expect(SCREEN).toMatch(/import \{ composeScanEvidencePacket, derivePhotoCorroborationSignal \} from '\.\.\/lib\/progressScanCheckInEvidence';/);
  });

  test('the signal is derived from scanAssessmentPacket (the same device-local packet the receipt card renders), not re-derived from raw scan data', () => {
    expect(SCREEN).toMatch(/const photoCorroborationSignal = derivePhotoCorroborationSignal\(scanAssessmentPacket\);/);
  });

  test('fail-to-base gate: suppressed is true whenever photoCorroborationBlocked is not explicitly false (blocked OR absent on an older output)', () => {
    expect(SCREEN).toMatch(/const photoCorroborationRenderSuppressed = output\.photoCorroborationBlocked !== false;/);
  });

  test('displayConfidence composes the engine\'s own pure rule against the real base confidence and the derived signal', () => {
    expect(SCREEN).toMatch(
      /const displayConfidence = corroborateConfidenceLevel\(\s*\n\s*confidence,\s*\n\s*photoCorroborationSignal,\s*\n\s*\{ suppressed: photoCorroborationRenderSuppressed \},\s*\n\s*\);/,
    );
  });

  test('the caption renders displayConfidence, never confidence directly', () => {
    expect(SCREEN).toMatch(/CONFIDENCE_CAPTIONS\[displayConfidence\]/);
    expect(SCREEN).not.toMatch(/CONFIDENCE_CAPTIONS\[confidence\]/);
  });

  test('the weigh-in-count disclosure stays keyed off the real logged-data confidence, never the display transform (a raised caption must never hide genuine data thinness)', () => {
    expect(SCREEN).toMatch(/confidence !== 'high' && weighInsThisWeek != null && weighInsThisWeek < 4/);
    expect(SCREEN).not.toMatch(/displayConfidence !== 'high'/);
  });

  test('runWeeklyCoach is still always called with no photoCorroboration argument (persisted/synced output stays byte-identical)', () => {
    const start = SCREEN.indexOf('runWeeklyCoach(');
    expect(start).toBeGreaterThan(-1);
    const body = matchingParenSlice(SCREEN, start + 'runWeeklyCoach'.length);
    expect(body).not.toMatch(/photoCorroboration/);
  });

  test('no token from the render-time transform reaches any saveCoachOutput or setOutput call (nothing photo-derived is persisted or synced)', () => {
    for (const callName of ['saveCoachOutput', 'setOutput']) {
      const bodies = callBlocks(SCREEN, callName);
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) {
        expect(body).not.toMatch(/displayConfidence|photoCorroborationSignal|photoCorroborationRenderSuppressed/);
      }
    }
  });
});

describe('CoachOutputScreen render-time transform: behavioural pins against the real composed functions', () => {
  test('base caption when the signal is absent (no packet -- no scan, or suppressed and nulled upstream)', () => {
    const signal = derivePhotoCorroborationSignal(null);
    const display = corroborateConfidenceLevel('medium', signal, { suppressed: false });
    expect(display).toBe('medium');
  });

  test('base caption when the packet classifies as conflicts (a strong disagreeing scan never lowers or originates a raise)', () => {
    const conflictEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence: conflictEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('conflicts');
    const signal = derivePhotoCorroborationSignal(packet);
    const display = corroborateConfidenceLevel('medium', signal, { suppressed: false });
    expect(display).toBe('medium');
  });

  test('base caption when photoCorroborationBlocked is true this run (an active safety hold), even with an eligible supporting scan', () => {
    const supportsEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence: supportsEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('supports');
    const signal = derivePhotoCorroborationSignal(packet);
    const photoCorroborationBlocked = true; // e.g. FFM floor hold this week
    const display = corroborateConfidenceLevel('medium', signal, { suppressed: photoCorroborationBlocked !== false });
    expect(display).toBe('medium');
  });

  test('one-step-raised caption when eligible + supports + not blocked', () => {
    const supportsEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence: supportsEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('supports');
    expect(packet.eligibleForAssessment).toBe(true);
    const signal = derivePhotoCorroborationSignal(packet);
    const photoCorroborationBlocked = false; // this run positively cleared every hold
    const display = corroborateConfidenceLevel('medium', signal, { suppressed: photoCorroborationBlocked !== false });
    expect(display).toBe('high');
  });

  test('a data_hold base level is never moved, even when eligible + supports + not blocked (a data hold is a safety hold)', () => {
    const supportsEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence: supportsEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    const signal = derivePhotoCorroborationSignal(packet);
    const display = corroborateConfidenceLevel('data_hold', signal, { suppressed: false });
    expect(display).toBe('data_hold');
  });

  test('older stored outputs without photoCorroborationBlocked (undefined, pre-D18) render base, never raised', () => {
    const supportsEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence: supportsEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    const signal = derivePhotoCorroborationSignal(packet);
    const olderStoredOutput = { confidence: 'medium' }; // photoCorroborationBlocked key absent entirely
    const suppressed = olderStoredOutput.photoCorroborationBlocked !== false;
    expect(suppressed).toBe(true);
    const display = corroborateConfidenceLevel(olderStoredOutput.confidence, signal, { suppressed });
    expect(display).toBe('medium');
  });

  test('clamped at high: an already-high base level stays high under an eligible supporting scan', () => {
    const supportsEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence: supportsEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    const signal = derivePhotoCorroborationSignal(packet);
    const display = corroborateConfidenceLevel('high', signal, { suppressed: false });
    expect(display).toBe('high');
  });
});
