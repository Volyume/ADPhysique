import {
  applyProgressScanCoachContext,
  resolveProgressScanCoachNote,
} from '../progressScanCoachResolver';

const scan = {
  source: 'photo_scan',
  confidence: 'low',
  trendDirection: 'down',
  comparisonStatus: 'comparable',
};

describe('Progress Scan out-of-engine coach resolver', () => {
  test('suppression and non-photo sources return null', () => {
    expect(resolveProgressScanCoachNote({ scan, suppressed: true })).toBeNull();
    expect(resolveProgressScanCoachNote({ scan: { ...scan, source: 'dexa' } })).toBeNull();
  });

  test('measured-only context does not require a body-fat range', () => {
    expect(resolveProgressScanCoachNote({ scan })).toMatchObject({
      rangeLow: null,
      rangeHigh: null,
      affectsTargets: false,
      usedFor: 'trend_context_only',
    });
  });

  test('trend direction changes coach copy without creating target authority', () => {
    const down = resolveProgressScanCoachNote({ scan, output: { primary: { domain: 'calories' }, adjustments: { calories: { change: -150 } } } });
    const up = resolveProgressScanCoachNote({ scan: { ...scan, trendDirection: 'up' }, output: { primary: { domain: null }, adjustments: {} } });

    expect(down.coachLine).toMatch(/supporting trend context/i);
    expect(down.body).toMatch(/not from this scan/i);
    expect(up.coachLine).toMatch(/check to watch consistency/i);
    expect(up.affectsTargets).toBe(false);
    expect(JSON.stringify(up)).not.toMatch(/floorKcal|ffm|katch|deeper cut/i);
  });

  test('applyProgressScanCoachContext folds scan context into the main coach read', () => {
    const note = resolveProgressScanCoachNote({ scan });
    const response = applyProgressScanCoachContext(
      { acknowledgement: 'All 4 sessions trained.', interpretation: 'Your 7-day average is level with last week.' },
      note,
    );

    expect(response.interpretation).toContain('Your 7-day average is level with last week.');
    expect(response.interpretation).toContain('Progress Scan also points lower');
    expect(response.progressScanContext).toEqual({
      usedFor: 'trend_context_only',
      affectsTargets: false,
    });
  });
});
