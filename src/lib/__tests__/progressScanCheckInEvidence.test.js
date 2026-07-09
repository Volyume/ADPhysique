/**
 * ProgressScanCheckInEvidence v2 -- classifier + receipt pins
 * (`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` §4,
 * §7, §11).
 *
 * Pins:
 *  1. Determinism: identical inputs always produce a deeply-equal packet.
 *  2. Every status path (a-e of the classifier's documented rule order) with
 *     the correct assessment + eligibleForAssessment.
 *  3. Low-confidence / withheld / non-comparable scans are RECORDED (status
 *     set, receipt present) but never count as positive or negative
 *     evidence: assessment is always 'not_used', eligible always false.
 *  4. Fewer than 3 comparable points in the trend window is always
 *     'inconclusive', NEVER 'conflicts', even with a fully divergent weight
 *     trend -- mirrors the accuracy-gate rule that no conflict is ever
 *     declared on thin data.
 *  5. supports / conflicts / visual_change_weight_stable classification
 *     against realistic weeklyCoach-shaped trend fixtures.
 *  6. Receipt copy is asserted verbatim against the exact strings in the
 *     integration plan, including the targetsChanged/targetsHeld variants.
 *  7. Tone guard: every exported string is free of banned words, em dashes
 *     and exclamation marks.
 *  8. Source guards: affectsTargets is a hard-coded false literal and the
 *     only affectsTargets assignment in the file; the module imports
 *     nothing from the engine/store/database layer; the engine layer never
 *     references this module back.
 *  9. No packet key is calorie/macro/target-named (the one permitted
 *     exception, affectsTargets, is a boolean guard literal, not a target
 *     value, and is explicitly required by the integration plan).
 */
import fs from 'fs';
import path from 'path';
import {
  PROGRESS_SCAN_EVIDENCE_STATUS,
  PROGRESS_SCAN_ASSESSMENT,
  buildScanEvidencePacket,
  buildScanEvidenceReceipt,
  composeScanEvidencePacket,
} from '../progressScanCheckInEvidence';
import { buildProgressScanCoachEvidence } from '../progressScanCoachEvidence';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../progressScanCheckInEvidence.js'), 'utf8');

const NOW = 1720000000000; // fixed epoch ms, matches baseScan.capturedAt style used elsewhere in this suite family

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

function trend(delta, overrides = {}) {
  return { ewma7: 80, delta, onTarget: false, deltaLabel: `${delta}kg this week`, rateLabel: 'losing', ...overrides };
}

describe('PROGRESS_SCAN_EVIDENCE_STATUS / PROGRESS_SCAN_ASSESSMENT enums', () => {
  test('frozen exact value sets', () => {
    expect(PROGRESS_SCAN_EVIDENCE_STATUS).toEqual([
      'no_scan_ever', 'no_recent_scan', 'valid', 'low_confidence', 'withheld', 'not_comparable', 'baseline',
    ]);
    expect(Object.isFrozen(PROGRESS_SCAN_EVIDENCE_STATUS)).toBe(true);
    expect(PROGRESS_SCAN_ASSESSMENT).toEqual([
      'supports', 'conflicts', 'visual_change_weight_stable', 'inconclusive', 'not_used', 'insufficient_data',
    ]);
    expect(Object.isFrozen(PROGRESS_SCAN_ASSESSMENT)).toBe(true);
  });
});

describe('buildScanEvidencePacket determinism', () => {
  test('identical inputs produce a deeply-equal packet on repeated calls', () => {
    const args = {
      evidence: scoredEvidence(),
      weightTrend: trend(-0.6),
      goalPhase: 'mild_cut',
      targetsChanged: true,
      heldDecisions: [],
      loadSignal: 'hold',
      nowMs: NOW,
    };
    const a = buildScanEvidencePacket(args);
    const b = buildScanEvidencePacket({ ...args });
    expect(a).toEqual(b);
  });
});

describe('status path a: no_scan_ever / no_recent_scan', () => {
  test('null evidence -> no_scan_ever, insufficient_data, not eligible', () => {
    const packet = buildScanEvidencePacket({ evidence: null, nowMs: NOW });
    expect(packet.status).toBe('no_scan_ever');
    expect(packet.assessment).toBe('insufficient_data');
    expect(packet.eligibleForAssessment).toBe(false);
    expect(packet.conflictSource).toBeNull();
  });

  test('evidence older than the window -> no_recent_scan, not_used, not eligible', () => {
    const stale = scoredEvidence({ capturedAt: NOW - 20 * 86400000 });
    const packet = buildScanEvidencePacket({ evidence: stale, nowMs: NOW, windowDays: 10 });
    expect(packet.status).toBe('no_recent_scan');
    expect(packet.assessment).toBe('not_used');
    expect(packet.eligibleForAssessment).toBe(false);
  });

  test('evidence with unreadable capturedAt fails closed to no_recent_scan', () => {
    const broken = scoredEvidence({ capturedAt: null });
    const packet = buildScanEvidencePacket({ evidence: broken, nowMs: NOW });
    expect(packet.status).toBe('no_recent_scan');
    expect(packet.assessment).toBe('not_used');
  });

  test('evidence captured AFTER nowMs fails closed to no_recent_scan (negative age never slips into the window)', () => {
    // Guards the anchor semantics: a caller anchoring nowMs in the past, or
    // a device clock skew, must not let a later scan classify against an
    // earlier decision window.
    const future = scoredEvidence({ capturedAt: NOW + 2 * 86400000 });
    const packet = buildScanEvidencePacket({ evidence: future, nowMs: NOW, weightTrend: trend(-2), goalPhase: 'mild_cut' });
    expect(packet.status).toBe('no_recent_scan');
    expect(packet.assessment).toBe('not_used');
    expect(packet.eligibleForAssessment).toBe(false);
  });
});

describe('status path b: withheld', () => {
  // Not reachable via the real v1 producer chain today (see module header);
  // exercised here via a constructed fixture for contract completeness.
  test('validityStatus withheld -> withheld, not_used, not eligible, never supports/conflicts', () => {
    const withheld = scoredEvidence({ validityStatus: 'withheld' });
    const packet = buildScanEvidencePacket({ evidence: withheld, nowMs: NOW, weightTrend: trend(-2), goalPhase: 'mild_cut' });
    expect(packet.status).toBe('withheld');
    expect(packet.assessment).toBe('not_used');
    expect(packet.eligibleForAssessment).toBe(false);
    expect(packet.assessment).not.toBe('supports');
    expect(packet.assessment).not.toBe('conflicts');
  });
});

describe('status path c: low_confidence', () => {
  test.each(['low', 'not_enough', 'unknown', undefined, null])(
    'confidenceTier %p -> low_confidence, not_used, not eligible',
    (tier) => {
      const evidence = scoredEvidence({ confidenceTier: tier });
      const packet = buildScanEvidencePacket({ evidence, nowMs: NOW, weightTrend: trend(-2), goalPhase: 'mild_cut' });
      expect(packet.status).toBe('low_confidence');
      expect(packet.assessment).toBe('not_used');
      expect(packet.eligibleForAssessment).toBe(false);
      expect(packet.assessment).not.toBe('supports');
      expect(packet.assessment).not.toBe('conflicts');
    },
  );

  test.each(['high', 'moderate'])('confidenceTier %p is NOT low_confidence', (tier) => {
    const evidence = scoredEvidence({ confidenceTier: tier });
    const packet = buildScanEvidencePacket({ evidence, nowMs: NOW, weightTrend: trend(-0.6), goalPhase: 'mild_cut' });
    expect(packet.status).not.toBe('low_confidence');
  });
});

describe('status path d: not_comparable / baseline', () => {
  test('validityStatus not_comparable -> not_comparable, not_used, not eligible', () => {
    const evidence = scoredEvidence({ validityStatus: 'not_comparable' });
    const packet = buildScanEvidencePacket({ evidence, nowMs: NOW });
    expect(packet.status).toBe('not_comparable');
    expect(packet.assessment).toBe('not_used');
    expect(packet.eligibleForAssessment).toBe(false);
  });

  test('validityStatus baseline -> baseline, inconclusive, not eligible (first set is a reference, never direction)', () => {
    const evidence = scoredEvidence({ validityStatus: 'baseline' });
    const packet = buildScanEvidencePacket({ evidence, nowMs: NOW });
    expect(packet.status).toBe('baseline');
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.eligibleForAssessment).toBe(false);
  });
});

describe('status path e: thin trend-window data never conflicts', () => {
  test('count 2 -> inconclusive, never conflicts, even with a fully divergent weight trend', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 2, spanDays: null, direction: 'down', magnitudePoints: 9, comparableOnly: true } });
    // Scan says clearly leaner; weight trend says clearly gaining -- a
    // maximally divergent pairing that would be 'conflicts' with >=3 points.
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(2.5), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.status).toBe('valid');
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.assessment).not.toBe('conflicts');
    expect(packet.eligibleForAssessment).toBe(false);
  });

  test('comparableOnly false -> inconclusive, never conflicts', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 5, spanDays: null, direction: 'up', magnitudePoints: 4, comparableOnly: false } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-2.5), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.eligibleForAssessment).toBe(false);
  });

  test('direction uncertain -> inconclusive, never conflicts', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 5, spanDays: null, direction: 'uncertain', magnitudePoints: null, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-2.5), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.eligibleForAssessment).toBe(false);
  });

  test('direction missing -> inconclusive, never conflicts', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 5, spanDays: null, direction: null, magnitudePoints: null, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-2.5), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.eligibleForAssessment).toBe(false);
  });
});

describe('status path f: full classification (supports / conflicts / visual_change_weight_stable)', () => {
  test('cut goal, weight losing, scan leaner -> supports', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.status).toBe('valid');
    expect(packet.assessment).toBe('supports');
    expect(packet.eligibleForAssessment).toBe(true);
    expect(packet.conflictSource).toBeNull();
  });

  test('cut goal, weight gaining, scan leaner -> conflicts, conflictSource scale', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('conflicts');
    expect(packet.conflictSource).toBe('scale');
    expect(packet.eligibleForAssessment).toBe(true);
  });

  test('cut goal, weight losing, scan fuller (up) -> conflicts, conflictSource scale', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('conflicts');
    expect(packet.conflictSource).toBe('scale');
  });

  test('bulk goal, weight gaining, scan fuller -> supports', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0.5), goalPhase: 'mild_bulk', nowMs: NOW });
    expect(packet.assessment).toBe('supports');
  });

  test('bulk alias goal ("bulk" -> mod_bulk), weight gaining, scan fuller -> supports', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0.5), goalPhase: 'bulk', nowMs: NOW });
    expect(packet.assessment).toBe('supports');
  });

  test('cut goal, weight flat, scan leaner -> visual_change_weight_stable (recomposition-during-a-cut read)', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0.05), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('visual_change_weight_stable');
    expect(packet.conflictSource).toBeNull();
  });

  test('recomp goal, weight flat, scan leaner -> visual_change_weight_stable', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0), goalPhase: 'recomp', nowMs: NOW });
    expect(packet.assessment).toBe('visual_change_weight_stable');
  });

  test('recomp goal, weight losing, scan leaner -> supports (recomp expects a small deficit)', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-0.4), goalPhase: 'recomp', nowMs: NOW });
    expect(packet.assessment).toBe('supports');
  });

  test('maintenance goal, weight flat, scan stable -> supports', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'steady', magnitudePoints: 0, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0.05), goalPhase: 'maint', nowMs: NOW });
    expect(packet.assessment).toBe('supports');
  });

  test('bulk goal, weight flat, scan fuller -> visual_change_weight_stable', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(0.1), goalPhase: 'mild_bulk', nowMs: NOW });
    expect(packet.assessment).toBe('visual_change_weight_stable');
  });

  test('weight trend entirely unknown (no morning weights logged) -> inconclusive, not conflicts', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: null, goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.conflictSource).toBeNull();
    expect(packet.eligibleForAssessment).toBe(true);
  });

  test('cut goal, weight losing, scan stable -> inconclusive (no photo confirmation either way)', () => {
    const evidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'steady', magnitudePoints: 0, comparableOnly: true } });
    const packet = buildScanEvidencePacket({ evidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(packet.assessment).toBe('inconclusive');
    expect(packet.conflictSource).toBeNull();
  });
});

describe('performance conflictSource is never produced (documented omission)', () => {
  test('conflictSource is always scale or null, regardless of loadSignal', () => {
    const conflictEvidence = scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } });
    for (const loadSignal of ['reduce', 'hold', 'progress', undefined, 'anything']) {
      const packet = buildScanEvidencePacket({
        evidence: conflictEvidence, weightTrend: trend(-0.6), goalPhase: 'mild_cut', loadSignal, nowMs: NOW,
      });
      expect(['scale', null]).toContain(packet.conflictSource);
      expect(packet.conflictSource).not.toBe('performance');
    }
  });
});

describe('receipt copy (verbatim, integration-plan.md §7)', () => {
  function receiptFor(status, assessment, extra = {}) {
    return buildScanEvidenceReceipt({ status, assessment }, extra);
  }

  test('supports', () => {
    const r = receiptFor('valid', 'supports');
    expect(r.headline).toBe('Your photo trend points the same way as your weight trend.');
    expect(r.detail).toBe('Targets are set from your logged data.');
    expect(r.usedSentence).toBeTruthy();
  });

  test('supports with targetsChanged true -> targets-changed detail (pattern 7)', () => {
    // A user who sees targets change right after a supportive scan could
    // infer the scan drove it; the detail must attribute the change to
    // Coach rules over logged data explicitly.
    const r = receiptFor('valid', 'supports', { targetsChanged: true });
    expect(r.headline).toBe('Your photo trend points the same way as your weight trend.');
    expect(r.detail).toBe('Your scan was considered as context. Targets changed because of your logged trend, not the scan.');
  });

  test('supports with heldDecisions calories -> targets-held detail (pattern 8)', () => {
    const r = receiptFor('valid', 'supports', { heldDecisions: [{ type: 'calories', reason: 'Calories held. Trend is on target.' }] });
    expect(r.detail).toBe('Your scan was considered as context. Targets were held based on your logged data, for the reasons above.');
  });

  test('visual_change_weight_stable with targetsChanged false -> targets-held detail (pattern 8)', () => {
    const r = receiptFor('valid', 'visual_change_weight_stable', { targetsChanged: false });
    expect(r.headline).toBe('Your scale trend is steady while your photos suggest visual change. That can happen during recomposition.');
    expect(r.detail).toBe('Your scan was considered as context. Targets were held based on your logged data, for the reasons above.');
  });

  test('conflicts (scale)', () => {
    const r = receiptFor('valid', 'conflicts');
    expect(r.headline).toBe('Your photo trend and scale trend disagree this week.');
    expect(r.detail).toBe('The coach used weight and intake for the decision and kept the scan as context.');
  });

  test('conflicts keeps its hierarchy sentence even when targets context is supplied', () => {
    // The conflict detail already attributes the decision to weight and
    // intake; it is never replaced by the changed/held wording.
    const r = receiptFor('valid', 'conflicts', { targetsChanged: true });
    expect(r.detail).toBe('The coach used weight and intake for the decision and kept the scan as context.');
  });

  test('low confidence', () => {
    const r = receiptFor('low_confidence', 'not_used');
    expect(r.headline).toBe('Your recent photo set could not be read with confidence, so it was not used.');
    expect(r.detail).toBe('Your plan comes from your logs as usual.');
  });

  test('withheld', () => {
    const r = receiptFor('withheld', 'not_used');
    expect(r.headline).toBe('No usable photo read this week.');
    expect(r.detail).toBe('Your plan comes from your logs as usual.');
  });

  test('no recent / none comparable (no_scan_ever and no_recent_scan share the same copy)', () => {
    const a = receiptFor('no_scan_ever', 'insufficient_data');
    const b = receiptFor('no_recent_scan', 'not_used');
    expect(a.headline).toBe('No comparable photo set this period.');
    expect(a.detail).toBe('The coach worked from your logged data.');
    expect(b).toEqual(a);
  });

  test('visual change, stable weight', () => {
    const r = receiptFor('valid', 'visual_change_weight_stable');
    expect(r.headline).toBe('Your scale trend is steady while your photos suggest visual change. That can happen during recomposition.');
    expect(r.detail).toBe('Targets are set from your logged data.');
  });

  test('inconclusive, no targets context supplied', () => {
    const r = receiptFor('valid', 'inconclusive');
    expect(r.headline).toBe('The photo read was inconclusive this week, so it was set aside.');
    expect(r.detail).toBeNull();
  });

  test('inconclusive with targetsChanged true -> targets-changed detail', () => {
    const r = receiptFor('valid', 'inconclusive', { targetsChanged: true });
    expect(r.headline).toBe('The photo read was inconclusive this week, so it was set aside.');
    expect(r.detail).toBe('Your scan was considered as context. Targets changed because of your logged trend, not the scan.');
  });

  test('inconclusive with targetsChanged false -> targets-held detail', () => {
    const r = receiptFor('valid', 'inconclusive', { targetsChanged: false });
    expect(r.detail).toBe('Your scan was considered as context. Targets were held based on your logged data, for the reasons above.');
  });

  test('inconclusive derives targets-held from heldDecisions when targetsChanged is not supplied', () => {
    const r = receiptFor('valid', 'inconclusive', { heldDecisions: [{ type: 'calories', reason: 'Calories held. Trend is on target.' }] });
    expect(r.detail).toBe('Your scan was considered as context. Targets were held based on your logged data, for the reasons above.');
  });

  test('non-comparable', () => {
    const r = receiptFor('not_comparable', 'not_used');
    expect(r.headline).toBe('This photo set was not comparable with your earlier sets, so it was kept as a record rather than evidence.');
  });

  test('baseline', () => {
    const r = receiptFor('baseline', 'inconclusive');
    expect(r.headline).toBe('This is your reference set. Future comparable sets will show change against it.');
  });

  test('usedSentence is present and identical (non-authority) on every receipt state', () => {
    const states = [
      ['no_scan_ever', 'insufficient_data'],
      ['no_recent_scan', 'not_used'],
      ['withheld', 'not_used'],
      ['low_confidence', 'not_used'],
      ['not_comparable', 'not_used'],
      ['baseline', 'inconclusive'],
      ['valid', 'supports'],
      ['valid', 'conflicts'],
      ['valid', 'visual_change_weight_stable'],
      ['valid', 'inconclusive'],
    ];
    const sentences = states.map(([status, assessment]) => receiptFor(status, assessment).usedSentence);
    expect(sentences.every((s) => typeof s === 'string' && s.length > 0)).toBe(true);
    expect(new Set(sentences).size).toBe(1);
    expect(sentences[0].toLowerCase()).toMatch(/target/);
  });

  test('a full packet always carries a receipt object with all three fields', () => {
    const packet = buildScanEvidencePacket({ evidence: null, nowMs: NOW });
    expect(packet.receipt).toEqual({
      headline: expect.any(String),
      detail: expect.any(String),
      usedSentence: expect.any(String),
    });
  });
});

describe('tone guard: no banned words, em dashes or exclamation marks in any exported string', () => {
  const BANNED_WORDS = ['failed', 'bad', 'fell off', 'perfect', 'behind', 'streak', 'shame', 'guilt'];

  function collectStrings(value, acc = []) {
    if (typeof value === 'string') acc.push(value);
    else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, acc));
    else if (value && typeof value === 'object') Object.values(value).forEach((v) => collectStrings(v, acc));
    return acc;
  }

  test('every receipt string across every reachable state is clean', () => {
    const goalPhases = ['mild_cut', 'recomp', 'maint', 'mild_bulk', 'mod_bulk', 'bulk'];
    const evidenceVariants = [
      null,
      scoredEvidence({ capturedAt: NOW - 20 * 86400000 }),
      scoredEvidence({ validityStatus: 'withheld' }),
      scoredEvidence({ confidenceTier: 'low' }),
      scoredEvidence({ validityStatus: 'not_comparable' }),
      scoredEvidence({ validityStatus: 'baseline' }),
      scoredEvidence({ trendWindow: { count: 1, spanDays: null, direction: 'down', magnitudePoints: 1, comparableOnly: true } }),
      scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'down', magnitudePoints: 3, comparableOnly: true } }),
      scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'up', magnitudePoints: 3, comparableOnly: true } }),
      scoredEvidence({ trendWindow: { count: 4, spanDays: null, direction: 'steady', magnitudePoints: 0, comparableOnly: true } }),
    ];
    const weightVariants = [null, trend(-2), trend(-0.6), trend(0), trend(0.6), trend(2)];
    const allStrings = [];
    for (const evidence of evidenceVariants) {
      for (const goalPhase of goalPhases) {
        for (const weightTrend of weightVariants) {
          for (const targetsChanged of [true, false, undefined]) {
            const packet = buildScanEvidencePacket({ evidence, weightTrend, goalPhase, targetsChanged, nowMs: NOW });
            collectStrings(packet, allStrings);
          }
        }
      }
    }
    expect(allStrings.length).toBeGreaterThan(0);
    for (const str of allStrings) {
      expect(str).not.toMatch(/—/); // em dash
      expect(str).not.toMatch(/!/);
      for (const word of BANNED_WORDS) {
        expect(str.toLowerCase()).not.toContain(word);
      }
    }
  });
});

describe('packet shape: no calorie/macro/target-named key beyond the mandated affectsTargets literal', () => {
  test('exact key set', () => {
    const packet = buildScanEvidencePacket({ evidence: scoredEvidence(), weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW });
    expect(Object.keys(packet).sort()).toEqual([
      'affectsTargets',
      'assessment',
      'band',
      'capturedAt',
      'confidenceTier',
      'conflictSource',
      'eligibleForAssessment',
      'receipt',
      'score',
      'status',
      'trendWindow',
      'usedFor',
      'validityStatus',
      'version',
      'withholdReasons',
    ].sort());
  });

  test('no key name references calorie/macro/kcal/protein/carbs/fat -- affectsTargets is the one mandated exception (a boolean guard literal, not a target value)', () => {
    const packet = buildScanEvidencePacket({ evidence: scoredEvidence(), nowMs: NOW });
    const keys = Object.keys(packet).filter((k) => k !== 'affectsTargets');
    for (const key of keys) {
      expect(key.toLowerCase()).not.toMatch(/calorie|kcal|macro|protein|carb|\bfat\b/);
    }
    expect(packet.affectsTargets).toBe(false);
  });
});

describe('composeScanEvidencePacket (integration-plan.md §3 "Small lib addition")', () => {
  // v1 bounded-summary/note fixtures, matching what
  // getProgressScanCoachSummary/resolveProgressScanCoachNote actually
  // produce (see progressScanCoachEvidence.js and progressScanCoachEvidence.test.js
  // for the same shapes).
  function fixtureScan(overrides = {}) {
    return {
      scanId: 'scan-1',
      capturedAt: NOW - 2 * 86400000,
      visualLeannessScore: 66,
      leannessBandLabel: 'Lean',
      comparableCount: 4,
      trendMagnitudePctPoints: 3.2,
      comparisonStatus: 'comparable',
      limitations: [],
      ...overrides,
    };
  }
  function fixtureNote(overrides = {}) {
    return {
      leannessBand: 'lean',
      leannessBandLabel: 'Lean',
      confidence: 'moderate',
      trendDirection: 'down',
      usedFor: 'visual_trend_context_only',
      ...overrides,
    };
  }

  test('matches the manual buildProgressScanCoachEvidence -> buildScanEvidencePacket composition', () => {
    const scan = fixtureScan();
    const note = fixtureNote();
    const args = { weightTrend: trend(-0.6), goalPhase: 'mild_cut', targetsChanged: true, nowMs: NOW };
    const manual = buildScanEvidencePacket({ evidence: buildProgressScanCoachEvidence({ scan, note }), ...args });
    const composed = composeScanEvidencePacket({ scan, note, ...args });
    expect(composed).toEqual(manual);
    expect(composed.status).toBe('valid');
    expect(composed.assessment).toBe('supports');
  });

  test('null scan and null note compose to no_scan_ever, same as evidence: null', () => {
    const composed = composeScanEvidencePacket({ scan: null, note: null, nowMs: NOW });
    expect(composed).toEqual(buildScanEvidencePacket({ evidence: null, nowMs: NOW }));
    expect(composed.status).toBe('no_scan_ever');
  });

  test('a scan with no note (suppressed/low-confidence upstream) composes to no_scan_ever, matching the v1 null-note contract', () => {
    const composed = composeScanEvidencePacket({ scan: fixtureScan(), note: null, nowMs: NOW });
    expect(composed.status).toBe('no_scan_ever');
  });

  test('deterministic: identical inputs produce a deeply-equal packet on repeated calls', () => {
    const scan = fixtureScan();
    const note = fixtureNote();
    const args = { scan, note, weightTrend: trend(-0.6), goalPhase: 'mild_cut', nowMs: NOW };
    expect(composeScanEvidencePacket(args)).toEqual(composeScanEvidencePacket({ ...args }));
  });

  test('carries targetsChanged/heldDecisions through to the receipt, exactly like buildScanEvidencePacket', () => {
    const heldDecisions = [{ type: 'calories', reason: 'Calories held. Trend is on target.' }];
    const composed = composeScanEvidencePacket({
      scan: fixtureScan(), note: fixtureNote(), weightTrend: trend(-0.6), goalPhase: 'mild_cut', heldDecisions, nowMs: NOW,
    });
    expect(composed.receipt.detail).toBe('Your scan was considered as context. Targets were held based on your logged data, for the reasons above.');
  });
});

describe('source guards', () => {
  test('affectsTargets:false is a hard-coded literal, and the only affectsTargets assignment', () => {
    expect(SOURCE).toMatch(/affectsTargets:\s*false,/);
    expect(SOURCE).not.toMatch(/affectsTargets:\s*(?!false,)[a-zA-Z]/);
  });

  test('imports nothing from the mutable engine/store/database layer (pure layer)', () => {
    const forbidden = [
      'database.js', 'progressScanStore', 'weeklyCoach', 'coachApply', 'nutritionEngine', 'planEngine',
    ];
    const importLines = SOURCE.split('\n').filter((line) => /^\s*import\s/.test(line));
    for (const line of importLines) {
      for (const name of forbidden) {
        expect(line).not.toMatch(new RegExp(name.replace('.js', '\\.js')));
      }
    }
  });

  test('the module performs no I/O and never calls Date.now (outside of doc comments)', () => {
    // Strip // and /* */ comments before checking for a real Date.now()
    // call -- the module's own JSDoc header explicitly documents that it
    // never calls Date.now(), which would otherwise self-trigger this guard.
    const withoutComments = SOURCE
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(withoutComments).not.toMatch(/Date\.now\(\)/);
    expect(withoutComments).not.toMatch(/require\(['"]expo-sqlite['"]\)/);
    expect(withoutComments).not.toMatch(/fetch\(/);
  });

  test('the deterministic engine never references this module back', () => {
    const engineFiles = ['weeklyCoach.js', 'coachApply.js', 'nutritionEngine.js', 'planEngine.js'];
    for (const file of engineFiles) {
      const engineSource = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
      expect(engineSource).not.toMatch(/progressScanCheckInEvidence/);
    }
  });
});
