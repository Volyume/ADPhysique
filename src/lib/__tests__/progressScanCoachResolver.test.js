import {
  applyProgressScanCoachContext,
  resolveProgressScanCoachNote,
} from '../progressScanCoachResolver';

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
});
