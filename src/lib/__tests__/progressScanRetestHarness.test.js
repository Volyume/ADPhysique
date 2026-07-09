/**
 * Tier 1 test-retest harness (scoring-accuracy-and-validation-blueprint.md
 * §10 Tier 1 item 2), wave 5.
 *
 * The founder-run test-retest study (>= 10 volunteers, 3 repeat captures
 * under nominally identical conditions, across >= 3 phone models) needs a
 * way to feed its exported repeat-capture data through the REAL scoring
 * engine and see the resulting score spread per confidence tier — the
 * acceptance line is "High-tier repeat scores within +/-3 points; if not,
 * tiers/thresholds are retuned until true" (blueprint §10.2). This file is
 * that harness: it scores each repeat with the same engine functions the
 * calibration corpus uses (`analyseProgressScan` / `estimateBodyFatFromScanAssets`,
 * never re-implemented), and reports the spread.
 *
 * There is no real volunteer data yet, so the built-in fixture below is a
 * SMOKE fixture only (synthetic, near-identical repeats) — it proves the
 * harness's parsing/scoring/aggregation is correct, not that the product
 * meets the +/-3-point acceptance bar on real people. That bar is evaluated
 * against real data via PROGRESS_SCAN_RETEST_FILE (see
 * scripts/run-progress-scan-retest-report.cjs and
 * docs/progress-scan-validation.md), never against this smoke fixture.
 *
 * Fixture format (also documented in docs/progress-scan-validation.md):
 * [
 *   {
 *     "subjectId": "s1",
 *     "label": "free text, e.g. phone model + condition",
 *     "sex": "male" | "female",
 *     "heightCm": number,
 *     "weightKg": number,
 *     "includeSide": boolean (optional, default false),
 *     "repeats": [
 *       { "repeatId": "r1", "ratios": {...}, "quality": {...}, "poseRatios": {...} (optional) },
 *       ...
 *     ]
 *   },
 *   ...
 * ]
 * `ratios`/`quality`/`poseRatios` use the exact same shape as
 * progressScanCalibrationCorpus.test.js's case fixtures.
 */
import fs from 'fs';
import path from 'path';
import {
  analyseProgressScan,
  estimateBodyFatFromScanAssets,
} from '../progressScanAnalysis';

function assetForRepeat(repeat, pose) {
  const qualityOverrides = repeat.quality || {};
  const ratios = { ...repeat.ratios, ...(repeat.poseRatios?.[pose] || {}) };
  const quality = {
    segmentationConfidence: qualityOverrides.segmentationConfidence ?? 0.9,
    framingScore: qualityOverrides.framingScore ?? 0.9,
    blurScore: qualityOverrides.blurScore ?? 0.9,
    lightingScore: qualityOverrides.lightingScore ?? 0.9,
    poseConfidence: qualityOverrides.poseConfidence ?? 0.9,
    backgroundSeparation: qualityOverrides.backgroundSeparation ?? 0.9,
    cameraTiltDegrees: qualityOverrides.cameraTiltDegrees ?? 0,
  };
  return {
    pose,
    qualityScore: qualityOverrides.qualityScore ?? 0.9,
    segmentationConfidence: quality.segmentationConfidence,
    framingScore: quality.framingScore,
    blurScore: quality.blurScore,
    lightingScore: quality.lightingScore,
    landmarkConfidence: quality.poseConfidence,
    cameraTiltDegrees: quality.cameraTiltDegrees,
    signals: {
      modelBacked: true,
      engine: 'retest_harness_fixture',
      modelVersion: 'retest_harness_fixture_v1',
      quality,
      bodyBox: {
        width: ratios.bboxWidthRatio ?? 0.34, height: ratios.bboxHeightRatio ?? 0.74, centerX: 0.5, centerY: 0.5,
      },
      silhouetteRatios: ratios,
      abstentionReasons: [],
    },
  };
}

function scoreRepeat(session, repeat) {
  const assets = [assetForRepeat(repeat, 'front'), assetForRepeat(repeat, 'back')];
  if (session.includeSide) assets.push(assetForRepeat(repeat, 'side'));
  const modelEstimate = estimateBodyFatFromScanAssets({
    assets, sex: session.sex, heightCm: session.heightCm, weightKg: session.weightKg,
  });
  const out = analyseProgressScan({
    assets, modelEstimate, sex: session.sex, heightCm: session.heightCm, weightKg: session.weightKg,
  });
  return {
    repeatId: repeat.repeatId ?? null,
    analysisStatus: out.analysisStatus,
    score: out.physiqueAssessment?.visualLeannessScore ?? null,
    confidenceTier: out.physiqueAssessment?.scanConfidenceTier ?? null,
  };
}

function scoreSession(session) {
  const repeatResults = (session.repeats || []).map((repeat) => scoreRepeat(session, repeat));
  const scored = repeatResults.filter((r) => Number.isFinite(r.score));
  const scores = scored.map((r) => r.score);
  const spread = scores.length >= 2 ? Math.max(...scores) - Math.min(...scores) : null;
  return {
    subjectId: session.subjectId ?? null,
    label: session.label ?? null,
    repeatCount: repeatResults.length,
    scoredCount: scored.length,
    repeats: repeatResults,
    spread,
  };
}

// Groups every scored repeat across ALL sessions by the confidence tier it
// achieved, and reports the max within-subject same-tier spread per tier —
// the "measured score noise floor per confidence tier" the blueprint asks
// for. Comparing across different subjects would conflate real physique
// differences with noise, so spreads are only computed within one subject's
// own repeats that landed on the same tier.
function noiseFloorByTier(sessionResults) {
  const byTier = {};
  for (const session of sessionResults) {
    const byTierForSubject = {};
    for (const r of session.repeats) {
      if (!Number.isFinite(r.score) || !r.confidenceTier) continue;
      (byTierForSubject[r.confidenceTier] ||= []).push(r.score);
    }
    for (const [tier, scores] of Object.entries(byTierForSubject)) {
      if (scores.length < 2) continue;
      const spread = Math.max(...scores) - Math.min(...scores);
      (byTier[tier] ||= []).push(spread);
    }
  }
  const summary = {};
  for (const [tier, spreads] of Object.entries(byTier)) {
    summary[tier] = {
      subjectsCompared: spreads.length,
      maxSpread: Math.max(...spreads),
      meanSpread: Math.round((spreads.reduce((a, b) => a + b, 0) / spreads.length) * 10) / 10,
    };
  }
  return summary;
}

// Smoke fixture: 2 synthetic subjects x 3 near-identical repeats. Ratios
// vary by a tiny, deliberately bounded jitter to emulate "same subject,
// same setup, natural capture-to-capture noise" without any real people.
function jitter(value, amount, seed) {
  return Math.round((value + ((seed % 5) - 2) * amount) * 1000) / 1000;
}

function builtinSession(subjectId, label, base, seedOffset) {
  const repeats = [0, 1, 2].map((i) => {
    const seed = seedOffset + i;
    return {
      repeatId: `${subjectId}_r${i + 1}`,
      ratios: {
        waistToShoulder: jitter(base.ratios.waistToShoulder, 0.004, seed),
        waistToHip: jitter(base.ratios.waistToHip, 0.004, seed),
        waistToHeight: jitter(base.ratios.waistToHeight, 0.003, seed),
        bodyAreaRatio: jitter(base.ratios.bodyAreaRatio, 0.003, seed),
        frontBackWaistSpread: base.ratios.frontBackWaistSpread,
        bboxHeightRatio: base.ratios.bboxHeightRatio,
        bboxWidthRatio: base.ratios.bboxWidthRatio,
      },
      quality: { qualityScore: 0.88, segmentationConfidence: 0.88, framingScore: 0.88, blurScore: 0.86, lightingScore: 0.88, poseConfidence: 0.88, backgroundSeparation: 0.88 },
    };
  });
  return {
    subjectId, label, sex: base.sex, heightCm: base.heightCm, weightKg: base.weightKg, repeats,
  };
}

const BUILTIN_SESSIONS = [
  builtinSession('smoke_subject_1', 'Smoke fixture, athletic male', {
    sex: 'male',
    heightCm: 178,
    weightKg: 82,
    ratios: {
      waistToShoulder: 0.63, waistToHip: 0.78, waistToHeight: 0.19, bodyAreaRatio: 0.30, frontBackWaistSpread: 0.01, bboxHeightRatio: 0.74, bboxWidthRatio: 0.34,
    },
  }, 1),
  builtinSession('smoke_subject_2', 'Smoke fixture, athletic female', {
    sex: 'female',
    heightCm: 166,
    weightKg: 63,
    ratios: {
      waistToShoulder: 0.68, waistToHip: 0.72, waistToHeight: 0.23, bodyAreaRatio: 0.33, frontBackWaistSpread: 0.012, bboxHeightRatio: 0.74, bboxWidthRatio: 0.34,
    },
  }, 11),
];

function loadExternalRetestSessions(envVarName = 'PROGRESS_SCAN_RETEST_FILE') {
  const file = process.env[envVarName];
  if (!file) return [];
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    throw new Error(`${envVarName} was set but does not exist: ${resolved}`);
  }
  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8').replace(/^﻿/, ''));
  if (!Array.isArray(parsed)) {
    throw new Error(`${envVarName} must contain an array of test-retest sessions.`);
  }
  return parsed;
}

const SHOULD_REPORT = process.env.PROGRESS_SCAN_RETEST_REPORT === '1';
const ALL_SESSIONS = [...BUILTIN_SESSIONS, ...loadExternalRetestSessions()];

describe('Progress Scan test-retest harness (Tier 1 item 2)', () => {
  const sessionResults = ALL_SESSIONS.map(scoreSession);

  afterAll(() => {
    if (!SHOULD_REPORT) return;
    // eslint-disable-next-line no-console
    console.info(JSON.stringify({
      generatedAt: new Date().toISOString(),
      sessionCount: sessionResults.length,
      sessions: sessionResults,
      noiseFloorByTier: noiseFloorByTier(sessionResults),
    }, null, 2));
  });

  test('every built-in session parses and scores every repeat', () => {
    expect(sessionResults.length).toBeGreaterThanOrEqual(2);
    for (const session of sessionResults) {
      expect(session.repeatCount).toBeGreaterThanOrEqual(2);
      expect(session.scoredCount).toBe(session.repeatCount);
    }
  });

  test('near-identical repeat captures produce a small score spread (harness math smoke check)', () => {
    for (const session of sessionResults) {
      expect(session.spread).not.toBeNull();
      expect(session.spread).toBeLessThanOrEqual(3);
    }
  });

  test('noiseFloorByTier groups same-subject repeats by the tier they actually achieved', () => {
    const summary = noiseFloorByTier(sessionResults);
    for (const tier of Object.keys(summary)) {
      expect(summary[tier].subjectsCompared).toBeGreaterThan(0);
      expect(summary[tier].maxSpread).toBeGreaterThanOrEqual(0);
    }
  });

  test('an external PROGRESS_SCAN_RETEST_FILE fixture is parsed and merged in (loader smoke test)', () => {
    const tmpFile = path.join(require('os').tmpdir(), `progress-scan-retest-smoke-${Date.now()}.json`);
    const externalSession = [{
      subjectId: 'external_smoke',
      label: 'External loader smoke test',
      sex: 'male',
      heightCm: 180,
      weightKg: 80,
      repeats: [
        { repeatId: 'ext_r1', ratios: { waistToShoulder: 0.65, waistToHip: 0.80, waistToHeight: 0.20, bodyAreaRatio: 0.31, frontBackWaistSpread: 0.01, bboxHeightRatio: 0.74, bboxWidthRatio: 0.34 } },
        { repeatId: 'ext_r2', ratios: { waistToShoulder: 0.652, waistToHip: 0.802, waistToHeight: 0.201, bodyAreaRatio: 0.311, frontBackWaistSpread: 0.01, bboxHeightRatio: 0.74, bboxWidthRatio: 0.34 } },
      ],
    }];
    fs.writeFileSync(tmpFile, JSON.stringify(externalSession));
    try {
      process.env.PROGRESS_SCAN_RETEST_FILE = tmpFile;
      const loaded = loadExternalRetestSessions();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].subjectId).toBe('external_smoke');
      const scored = scoreSession(loaded[0]);
      expect(scored.scoredCount).toBe(2);
    } finally {
      delete process.env.PROGRESS_SCAN_RETEST_FILE;
      fs.unlinkSync(tmpFile);
    }
  });

  test('a missing PROGRESS_SCAN_RETEST_FILE path throws a clear error rather than silently skipping data', () => {
    process.env.PROGRESS_SCAN_RETEST_FILE = '/definitely/not/a/real/path.json';
    try {
      expect(() => loadExternalRetestSessions()).toThrow(/does not exist/);
    } finally {
      delete process.env.PROGRESS_SCAN_RETEST_FILE;
    }
  });
});
