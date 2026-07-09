/**
 * ProgressScanCoachEvidence v1 -- shape-pin + honesty guards (integration
 * blueprint §8, §9 test 9). Pins:
 *  1. the exact key set of the v1 interface;
 *  2. `affectsTargets` is a hard-coded `false` literal in source, never a
 *     variable or expression (so flipping it requires editing this test);
 *  3. `usedFor` can only ever be the single approved enum value in source;
 *  4. null/absent scan or note (suppressed, withheld, low-confidence, or no
 *     scan at all) produces null evidence -- never a half-filled object;
 *  5. the documented gaps (scanId, baselineScanId, captureQuality) stay
 *     honestly null rather than fabricated;
 *  6. trendOnly hiding carries through from the note into score/band.
 */
import fs from 'fs';
import path from 'path';
import {
  buildProgressScanCoachEvidence,
  PROGRESS_SCAN_COACH_EVIDENCE_USED_FOR_VALUES,
} from '../progressScanCoachEvidence';
import { resolveProgressScanCoachNote } from '../progressScanCoachResolver';

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../progressScanCoachEvidence.js'), 'utf8');

const baseScan = {
  source: 'photo_scan',
  confidence: 'moderate',
  capturedAt: 1720000000000,
  visualLeannessScore: 66,
  leannessBand: 'lean',
  leannessBandLabel: 'Lean',
  trendDirection: 'down',
  trendMagnitudePctPoints: 3.2,
  comparisonStatus: 'comparable',
  comparableCount: 3,
  limitations: [
    'photo_scan_visual_context_only',
    'not_body_fat_estimate',
    'not_dexa_equivalent',
    'not_target_setting_input',
    'never_authoritative_for_safety_floors',
    'large_body',
  ],
};

describe('ProgressScanCoachEvidence v1 shape', () => {
  test('null scan or null note produces null evidence (never half-filled)', () => {
    const note = resolveProgressScanCoachNote({ scan: baseScan });
    expect(buildProgressScanCoachEvidence({ scan: null, note })).toBeNull();
    expect(buildProgressScanCoachEvidence({ scan: baseScan, note: null })).toBeNull();
    expect(buildProgressScanCoachEvidence({})).toBeNull();
  });

  test('a suppressed/withheld/low-confidence scan (null note upstream) produces null evidence', () => {
    const suppressedNote = resolveProgressScanCoachNote({ scan: baseScan, suppressed: true });
    const lowConfNote = resolveProgressScanCoachNote({ scan: { ...baseScan, confidence: 'not_enough' } });
    expect(suppressedNote).toBeNull();
    expect(lowConfNote).toBeNull();
    expect(buildProgressScanCoachEvidence({ scan: baseScan, note: suppressedNote })).toBeNull();
    expect(buildProgressScanCoachEvidence({ scan: baseScan, note: lowConfNote })).toBeNull();
  });

  test('exact key set of the v1 interface (blueprint §8)', () => {
    const note = resolveProgressScanCoachNote({ scan: baseScan });
    const evidence = buildProgressScanCoachEvidence({ scan: baseScan, note });
    expect(Object.keys(evidence).sort()).toEqual([
      'affectsTargets',
      'band',
      'baselineScanId',
      'captureQuality',
      'capturedAt',
      'confidenceTier',
      'scanId',
      'score',
      'setupFindings',
      'source',
      'trendWindow',
      'usedFor',
      'validityStatus',
      'withholdReasons',
    ].sort());
    expect(Object.keys(evidence.captureQuality).sort()).toEqual([
      'blur', 'framing', 'lighting', 'pose', 'segmentation', 'tiltDegrees',
    ].sort());
    expect(Object.keys(evidence.trendWindow).sort()).toEqual([
      'comparableOnly', 'count', 'direction', 'magnitudePoints', 'spanDays',
    ].sort());
  });

  test('populates what the resolver already has; never fabricates the documented gaps', () => {
    const note = resolveProgressScanCoachNote({ scan: baseScan });
    const evidence = buildProgressScanCoachEvidence({ scan: baseScan, note });
    expect(evidence).toMatchObject({
      source: 'photo_scan',
      capturedAt: baseScan.capturedAt,
      score: 66,
      band: 'Lean',
      confidenceTier: 'moderate',
      validityStatus: 'scored',
      withholdReasons: [],
      usedFor: 'visual_trend_context_only',
      affectsTargets: false,
      trendWindow: {
        count: 3,
        spanDays: null,
        direction: 'down',
        magnitudePoints: 3.2,
        comparableOnly: true,
      },
    });
    // Documented gaps: honestly null, not invented.
    expect(evidence.scanId).toBeNull();
    expect(evidence.baselineScanId).toBeNull();
    expect(evidence.captureQuality).toEqual({
      lighting: null, blur: null, framing: null, pose: null, segmentation: null, tiltDegrees: null,
    });
    // Bias-flag-style setup findings survive; the five static safety
    // disclaimers coachSummaryFromScan always prepends do not.
    expect(evidence.setupFindings).toEqual(['large_body']);
  });

  test('trendOnly hiding on the note carries through to score/band', () => {
    const trendOnlyNote = resolveProgressScanCoachNote({ scan: baseScan, trendOnly: true });
    const evidence = buildProgressScanCoachEvidence({ scan: baseScan, note: trendOnlyNote });
    expect(evidence.score).toBeNull();
    expect(evidence.band).toBeNull();
  });

  test('not-comparable and baseline scans resolve validityStatus without ever claiming "scored"', () => {
    const notComparableScan = { ...baseScan, comparisonStatus: 'not_comparable' };
    const baselineScan = { ...baseScan, comparisonStatus: 'baseline' };
    const notComparableEvidence = buildProgressScanCoachEvidence({
      scan: notComparableScan,
      note: resolveProgressScanCoachNote({ scan: notComparableScan }),
    });
    const baselineEvidence = buildProgressScanCoachEvidence({
      scan: baselineScan,
      note: resolveProgressScanCoachNote({ scan: baselineScan }),
    });
    expect(notComparableEvidence.validityStatus).toBe('not_comparable');
    expect(baselineEvidence.validityStatus).toBe('baseline');
  });
});

describe('ProgressScanCoachEvidence v1 interface honesty (source guard)', () => {
  test('affectsTargets is a hard-coded false literal, never a variable', () => {
    expect(SOURCE).toMatch(/affectsTargets:\s*false,/);
    expect(SOURCE).not.toMatch(/affectsTargets:\s*(?!false,)[a-zA-Z]/);
  });

  test('usedFor can only ever resolve to the single approved enum value', () => {
    expect(PROGRESS_SCAN_COACH_EVIDENCE_USED_FOR_VALUES).toEqual(['visual_trend_context_only']);
    // The only literal ever assigned to usedFor in source is the approved
    // value (as a fallback) or a pass-through of the resolver's own
    // `note.usedFor`, which is itself pinned to the same single value
    // (progressScanCoachResolver.test.js / progressScanCoachIsolation.guard.test.js).
    const usedForAssignments = [...SOURCE.matchAll(/usedFor:\s*([^\n,]+)/g)].map((m) => m[1].trim());
    for (const assignment of usedForAssignments) {
      expect(assignment).toMatch(/note\.usedFor \?\? 'visual_trend_context_only'/);
    }
  });
});
