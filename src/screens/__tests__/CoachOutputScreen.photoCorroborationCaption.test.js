/**
 * CoachOutputScreen photo-corroboration wiring — Campaign 23 R2 (D99,
 * founder ruling 2026-08-17; verbatim in docs/progress-audit-campaign-23-
 * 2026-08-17/FOUNDER-RULINGS-PHASE2.md; register entry D99).
 *
 * D99 SUPERSEDES the D18 render-time-only transform this suite used to pin:
 * the coarse locally-derived corroboration basis now feeds the
 * authoritative `runWeeklyCoach` call itself, the engine resolves the
 * 'supports' direction against ITS OWN emitted trend and applies its
 * one-step rule under its own senior blocked-set, and the emitted
 * `confidence` — recorded, synced and displayed — is one value. No
 * photo-derived input or source flag rides on the output
 * (photoCorroborationApplied/Blocked are retired), and nothing beyond the
 * {eligible, scanDirection} basis ever reaches the run.
 *
 * This screen cannot be safely `require`'d in Jest (see
 * progressScanCoachIsolation.guard.test.js for why), so the wiring is
 * pinned by source guard; the behavioural claims are exercised against the
 * REAL pure functions the wiring composes (`buildPhotoCorroborationBasis`,
 * `deriveCorroborationDirectionAgainstTrend`,
 * `corroborateConfidenceLevel`), never a reimplementation. The engine-side
 * run-level invariants (one-step-and-nothing-else, calm/data-hold
 * seniority, no flags on the output) are pinned through the real
 * runWeeklyCoach in progressScanSafetyFloorIsolation.test.js.
 */
const fs = require('fs');
const path = require('path');
const { corroborateConfidenceLevel } = require('../../lib/weeklyCoach');
const {
  buildPhotoCorroborationBasis,
  deriveCorroborationDirectionAgainstTrend,
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

// A bounded coach summary exactly as getProgressScanCoachSummary shapes it
// (the basis builder's real input): source, capturedAt, comparisonStatus,
// confidence tier, trendDirection, comparableCount.
function scoredSummary(overrides = {}) {
  return {
    source: 'photo_scan',
    capturedAt: NOW - 2 * 86400000,
    comparisonStatus: 'comparable',
    confidence: 'moderate',
    trendDirection: 'down',
    comparableCount: 4,
    ...overrides,
  };
}

describe('CoachOutputScreen wiring: run-time corroboration (D99 source guard)', () => {
  test('imports buildPhotoCorroborationBasis from the evidence layer; the retired render-time derivation is gone', () => {
    expect(SCREEN).toMatch(/import \{ composeScanEvidencePacket, buildPhotoCorroborationBasis \} from '\.\.\/lib\/progressScanCheckInEvidence';/);
    expect(SCREEN).not.toMatch(/derivePhotoCorroborationSignal/);
    expect(SCREEN).not.toMatch(/corroborateConfidenceLevel/);
  });

  test('the basis is built pre-run from the suppression-aware bounded summary and fed into runWeeklyCoach', () => {
    expect(SCREEN).toMatch(/const photoCorroborationBasis = buildPhotoCorroborationBasis\(scanCoachSummary, \{ nowMs: Date\.now\(\) \}\);/);
    const start = SCREEN.indexOf('runWeeklyCoach(');
    expect(start).toBeGreaterThan(-1);
    const body = matchingParenSlice(SCREEN, start + 'runWeeklyCoach'.length);
    expect(body).toMatch(/photoCorroborationBasis,/);
    // Only the coarse basis — never a packet, signal, score or estimate.
    expect(body).not.toMatch(/scanAssessmentPacket|composeScanEvidencePacket|visualLeannessScore|estimateBodyFat|scanId/);
  });

  test('the displayed confidence IS the recorded confidence — no render-time transform survives', () => {
    expect(SCREEN).toMatch(/const displayConfidence = confidence;/);
    expect(SCREEN).not.toMatch(/photoCorroborationSignal/);
    expect(SCREEN).not.toMatch(/photoCorroborationRenderSuppressed/);
    expect(SCREEN).not.toMatch(/photoCorroborationBlocked/);
  });

  test('the caption renders displayConfidence and the weigh-in-thinness disclosure keys off the observable count, never the caption', () => {
    expect(SCREEN).toMatch(/CONFIDENCE_CAPTIONS\[displayConfidence\]/);
    // D99 port of the D18 honesty rule ("a raised caption must never hide
    // genuine data thinness"): the disclosure is keyed to the weigh-in
    // count fact alone, so a corroboration-raised week still discloses.
    expect(SCREEN).toMatch(/\{weighInsThisWeek != null && weighInsThisWeek < 4\n/);
    expect(SCREEN).not.toMatch(/confidence !== 'high' && weighInsThisWeek/);
  });

  test('nothing photo-derived reaches any saveCoachOutput or setOutput call', () => {
    for (const callName of ['saveCoachOutput', 'setOutput']) {
      const bodies = callBlocks(SCREEN, callName);
      expect(bodies.length).toBeGreaterThan(0);
      for (const body of bodies) {
        expect(body).not.toMatch(/photoCorroboration|displayConfidence|scanAssessmentPacket|visualLeannessScore/);
      }
    }
  });
});

describe('buildPhotoCorroborationBasis: the coarse pre-run gate (real function)', () => {
  test('a scored, in-window, Moderate+ summary with 3+ comparable points and a definite direction is eligible', () => {
    expect(buildPhotoCorroborationBasis(scoredSummary(), { nowMs: NOW }))
      .toEqual({ eligible: true, scanDirection: 'down' });
  });

  test('the basis carries ONLY {eligible, scanDirection} — never a score, band, estimate or id', () => {
    const basis = buildPhotoCorroborationBasis(scoredSummary({ visualLeannessScore: 66, leannessBandLabel: 'Lean' }), { nowMs: NOW });
    expect(Object.keys(basis).sort()).toEqual(['eligible', 'scanDirection']);
  });

  test.each([
    ['no scan', null, {}],
    ['wrong source', scoredSummary({ source: 'manual' }), {}],
    ['out of window (11 days old)', scoredSummary({ capturedAt: NOW - 11 * 86400000 }), {}],
    ['future capturedAt fails closed (clock skew)', scoredSummary({ capturedAt: NOW + 86400000 }), {}],
    ['missing capturedAt', scoredSummary({ capturedAt: null }), {}],
    ['baseline scan (first set is a reference, never direction evidence)', scoredSummary({ comparisonStatus: 'baseline' }), {}],
    ['not comparable', scoredSummary({ comparisonStatus: 'not_comparable' }), {}],
    ['low confidence tier', scoredSummary({ confidence: 'low' }), {}],
    ['thin data (2 comparable points)', scoredSummary({ comparableCount: 2 }), {}],
    ['uncertain direction', scoredSummary({ trendDirection: 'uncertain' }), {}],
  ])('%s is ineligible', (_label, scan) => {
    expect(buildPhotoCorroborationBasis(scan, { nowMs: NOW }))
      .toEqual({ eligible: false, scanDirection: null });
  });
});

describe('deriveCorroborationDirectionAgainstTrend + corroborateConfidenceLevel: the engine composition (real functions)', () => {
  test('a leaner-trending scan against a losing trend on a cut classifies supports and raises one step', () => {
    const direction = deriveCorroborationDirectionAgainstTrend({
      scanDirection: 'down', weightTrend: { delta: -0.6 }, goalPhase: 'mild_cut',
    });
    expect(direction).toBe('supports');
    expect(corroborateConfidenceLevel('medium', { eligible: true, direction }, { suppressed: false })).toBe('high');
  });

  test('a leaner-trending scan against a gaining trend is a direct contradiction: conflicts, never moves the level', () => {
    const direction = deriveCorroborationDirectionAgainstTrend({
      scanDirection: 'down', weightTrend: { delta: 0.6 }, goalPhase: 'mild_cut',
    });
    expect(direction).toBe('conflicts');
    expect(corroborateConfidenceLevel('medium', { eligible: true, direction }, { suppressed: false })).toBe('medium');
  });

  test('an uncertain or absent scan direction derives null and is inert', () => {
    expect(deriveCorroborationDirectionAgainstTrend({ scanDirection: 'uncertain', weightTrend: { delta: -0.6 }, goalPhase: 'mild_cut' })).toBeNull();
    expect(deriveCorroborationDirectionAgainstTrend({ scanDirection: null, weightTrend: { delta: -0.6 }, goalPhase: 'mild_cut' })).toBeNull();
    expect(corroborateConfidenceLevel('medium', { eligible: true, direction: null }, { suppressed: false })).toBe('medium');
  });

  test('suppression is senior: an eligible supporting signal never raises under a hold', () => {
    expect(corroborateConfidenceLevel('medium', { eligible: true, direction: 'supports' }, { suppressed: true })).toBe('medium');
  });

  test('a data_hold base level is never moved (a data hold is a safety hold)', () => {
    expect(corroborateConfidenceLevel('data_hold', { eligible: true, direction: 'supports' }, { suppressed: false })).toBe('data_hold');
  });

  test('clamped at high: an already-high level stays high', () => {
    expect(corroborateConfidenceLevel('high', { eligible: true, direction: 'supports' }, { suppressed: false })).toBe('high');
  });
});
