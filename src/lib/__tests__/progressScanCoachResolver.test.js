import fs from 'fs';
import path from 'path';
import {
  applyProgressScanCoachContext,
  resolveProgressScanCoachNote,
} from '../progressScanCoachResolver';

const RESOLVER_SOURCE = fs.readFileSync(path.resolve(__dirname, '../progressScanCoachResolver.js'), 'utf8');

const scan = {
  source: 'photo_scan',
  confidence: 'moderate',
  visualLeannessScore: 66,
  leannessBand: 'lean',
  leannessBandLabel: 'Lean',
  progressSignal: 'slight_positive',
  progressSignalLabel: 'Slight positive trend',
  trendDirection: 'down',
  comparisonStatus: 'comparable',
};

describe('Progress Scan out-of-engine coach resolver', () => {
  test('suppression and non-photo sources return null', () => {
    expect(resolveProgressScanCoachNote({ scan, suppressed: true })).toBeNull();
    expect(resolveProgressScanCoachNote({ scan: { ...scan, source: 'dexa' } })).toBeNull();
  });

  test('visual context never requires or exposes a body fat range', () => {
    expect(resolveProgressScanCoachNote({ scan })).toMatchObject({
      rangeLow: null,
      rangeHigh: null,
      affectsTargets: false,
      usedFor: 'visual_trend_context_only',
      leannessBandLabel: 'Lean',
    });
  });

  test('trend-only preference hides score and band without ever showing ranges', () => {
    const ranged = { ...scan, rangeLow: 10, rangeHigh: 23.6 };
    const visible = resolveProgressScanCoachNote({ scan: ranged, trendOnly: false });
    const hidden = resolveProgressScanCoachNote({ scan: ranged, trendOnly: true });

    expect(visible.body).toMatch(/Lean band/i);
    expect(visible.body).not.toMatch(/10-23.6%/);
    expect(visible.rangeLow).toBeNull();
    expect(visible.rangeHigh).toBeNull();
    expect(hidden.body).not.toMatch(/10-23.6%/);
    expect(hidden.leannessBandLabel).toBeNull();
    expect(hidden.rangeLow).toBeNull();
    expect(hidden.rangeHigh).toBeNull();
  });


  test('trend direction changes coach copy without creating target authority', () => {
    const down = resolveProgressScanCoachNote({ scan, output: { primary: { domain: 'calories' }, adjustments: { calories: { change: -150 } } } });
    const up = resolveProgressScanCoachNote({ scan: { ...scan, trendDirection: 'up' }, output: { primary: { domain: null }, adjustments: {} } });

    expect(down.coachLine).toMatch(/photo context/i);
    expect(down.body).toMatch(/not from this scan/i);
    expect(up.coachLine).toMatch(/check on consistency/i);
    expect(up.affectsTargets).toBe(false);
    expect(JSON.stringify(up)).not.toMatch(/floorKcal|ffm|katch|deeper cut/i);
  });

  test('direction is ignored when the scan comparison is not comparable', () => {
    const note = resolveProgressScanCoachNote({
      scan: { ...scan, trendDirection: 'down', comparisonStatus: 'baseline', rangeLow: 10, rangeHigh: 22 },
    });
    expect(note.body).toMatch(/baseline/i);
    expect(note.body).not.toMatch(/points lower/i);
    expect(note.coachLine).toMatch(/baseline/i);
    expect(note.coachLine).not.toMatch(/supporting trend context/i);
  });

  test('applyProgressScanCoachContext folds scan context into the main coach read', () => {
    const note = resolveProgressScanCoachNote({ scan });
    const response = applyProgressScanCoachContext(
      { acknowledgement: 'All 4 sessions trained.', interpretation: 'Your 7-day average is level with last week.' },
      note,
    );

    expect(response.interpretation).toContain('Your 7-day average is level with last week.');
    expect(response.interpretation).toContain('Progress photos also show positive change');
    expect(response.progressScanContext).toEqual({
      usedFor: 'visual_trend_context_only',
      affectsTargets: false,
    });
  });

  // Wave 4 (integration blueprint §9, guard tests 2-5): guarded groundwork
  // for future coach/check-in integration. These pin behavioural properties
  // that must hold BEFORE any new integration surface is ever built.
  const DECISION_LINE_STRINGS = [
    'I will keep it as photo context until the weekly read has enough logged data beside it.',
    'The weekly target still comes from your logs, weight trend, training and recovery, not from this scan.',
    'It sits beside the weekly read as a low-confidence cross-check, not as a target-setting trigger.',
  ];

  function includesADecisionLineSentence(text) {
    return DECISION_LINE_STRINGS.some((sentence) => text.includes(sentence));
  }

  describe('guard 2: low-confidence scan is ignored beyond its own receipt', () => {
    test('a low-confidence note only ever ADDS text; every other coachResponse field is untouched', () => {
      const lowConfNote = resolveProgressScanCoachNote({ scan: { ...scan, confidence: 'low' } });
      const base = {
        acknowledgement: 'All 4 sessions trained.',
        interpretation: 'Your 7-day average is level with last week.',
        commitmentAnswer: 'Yes, sticking with the plan.',
      };
      const withoutScan = applyProgressScanCoachContext(base, null);
      const withLowConf = applyProgressScanCoachContext(base, lowConfNote);

      expect(withLowConf.acknowledgement).toBe(withoutScan.acknowledgement);
      expect(withLowConf.commitmentAnswer).toBe(withoutScan.commitmentAnswer);
      expect(lowConfNote.affectsTargets).toBe(false);
      expect(lowConfNote.rangeLow).toBeNull();
      expect(lowConfNote.rangeHigh).toBeNull();
      // The only difference is the interpretation text growing by the
      // receipt itself (never a change to the OTHER fields above).
      expect(withLowConf.interpretation).not.toBe(withoutScan.interpretation);
      expect(withLowConf.interpretation.startsWith(withoutScan.interpretation)).toBe(true);
    });
  });

  describe('guard 3: withheld scan is identical to absent', () => {
    test('confidence "not_enough" (withheld) resolves to null, same as no scan at all', () => {
      const withheldNote = resolveProgressScanCoachNote({ scan: { ...scan, confidence: 'not_enough' } });
      const absentNote = resolveProgressScanCoachNote({ scan: null });
      expect(withheldNote).toBeNull();
      expect(absentNote).toBeNull();

      const base = { acknowledgement: 'Ack.', interpretation: 'Interp.' };
      expect(applyProgressScanCoachContext(base, withheldNote)).toEqual(applyProgressScanCoachContext(base, absentNote));
    });
  });

  describe('guard 4: a conflict-shaped scan/output cannot change targets or the decision caption', () => {
    test('unrecognised conflict-style properties on scan/output are silently ignored, not acted on', () => {
      const conflictScan = {
        ...scan,
        scanWeightConflict: true,
        weightTrendDisagrees: true,
        conflictOverridesDecision: true,
      };
      const conflictOutput = {
        primary: { domain: null },
        adjustments: {},
        scanWeightConflict: true,
        conflictOverridesDecision: true,
      };
      const plainOutput = { primary: { domain: null }, adjustments: {} };

      const withConflictFlags = resolveProgressScanCoachNote({ scan: conflictScan, output: conflictOutput });
      const withoutConflictFlags = resolveProgressScanCoachNote({ scan, output: plainOutput });

      expect(withConflictFlags.body).toBe(withoutConflictFlags.body);
      expect(withConflictFlags.coachLine).toBe(withoutConflictFlags.coachLine);
      expect(withConflictFlags.affectsTargets).toBe(false);
      expect(withConflictFlags.usedFor).toBe('visual_trend_context_only');
    });
  });

  describe('guard 5 (source): both render paths call decisionLine() unconditionally', () => {
    test('the body array and the folded coachLine both concatenate decisionLine(output) unfiltered', () => {
      // `body`'s array always includes decisionLine(output) as its final,
      // unfiltered element (never behind a ternary/condition).
      expect(RESOLVER_SOURCE).toMatch(/const body = clean\(\[[\s\S]*?decisionLine\(output\),\s*\]\.filter\(Boolean\)\.join\(' '\)\);/);
      // The folded coachLine appends decisionLine(output) unconditionally too.
      expect(RESOLVER_SOURCE).toMatch(/const foldedCoachLine = clean\(\[coachLine\(scan, label, trendOnly\), decisionLine\(output\)\]\.filter\(Boolean\)\.join\(' '\)\);/);
      // decisionLine() itself never returns null/empty for any branch, so
      // "unfiltered" above is not defeated by decisionLine silently opting
      // out for some state.
      expect(RESOLVER_SOURCE).not.toMatch(/function decisionLine\([^)]*\)\s*\{\s*(?:\/\/[^\n]*\n\s*)*return null/);
    });
  });

  describe('guard 5: every scan-derived render path states the used/not-used sentence', () => {
    const comparisonStatuses = ['comparable', 'baseline', 'not_comparable', undefined];
    const trendDirections = ['down', 'up', 'steady', 'uncertain'];
    const outputs = [
      null,
      { primary: { domain: null }, adjustments: {} },
      { primary: { domain: 'calories' }, adjustments: { calories: { change: -150 } } },
    ];

    for (const comparisonStatus of comparisonStatuses) {
      for (const trendDirection of trendDirections) {
        for (const output of outputs) {
          test(`comparisonStatus=${comparisonStatus} trendDirection=${trendDirection} output=${output ? (output.adjustments.calories ? 'calorie-adjustment' : 'present') : 'null'}`, () => {
            const note = resolveProgressScanCoachNote({
              scan: { ...scan, comparisonStatus, trendDirection },
              output,
            });
            expect(includesADecisionLineSentence(note.body)).toBe(true);
            expect(includesADecisionLineSentence(note.coachLine)).toBe(true);
          });
        }
      }
    }
  });
});
