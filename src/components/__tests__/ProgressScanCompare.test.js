import { create, act } from 'react-test-renderer';

jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));

import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import ProgressScanCompare, {
  defaultScanPair,
  orderedScanEntries,
  scanRangeLabel,
  scanWeightLabel,
} from '../ProgressScanCompare';

const DAY = 86400000;
const base = Date.UTC(2026, 0, 1);

function scan(id, day, score = 66) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: base + day * DAY,
    analysisStatus: score == null ? 'measured' : 'complete',
    estimateBodyFatPercent: null,
    estimateRangeLow: null,
    estimateRangeHigh: null,
    qualityLabel: 'good',
    stats: { weightKg: 82 - day, photoCount: 2 },
    signals: score == null ? {} : {
      physiqueAssessment: {
        visualLeannessScore: score,
        leannessBandLabel: score >= 65 ? 'Lean' : 'Defined',
        scanConfidenceTier: 'moderate',
        scanConfidenceLabel: 'Moderate',
        progressSignal: day > 1 ? 'slight_positive' : 'baseline',
        progressSignalLabel: day > 1 ? 'Slight positive trend' : 'Baseline scan',
      },
      estimatorInputs: {
        waistToHeight: score >= 65 ? 0.18 : 0.21,
        waistToShoulder: score >= 65 ? 0.61 : 0.66,
      },
      assets: [{ pose: 'front' }, { pose: 'back' }],
    },
    deltaExplanation: {
      summary: 'Stored delta should not render for a selected scan pair.',
      trendSummary: 'Stored trend should not render for a selected scan pair.',
    },
    assets: [
      { id: `${id}-front`, pose: 'front', uri: `file:///${id}-front.jpg` },
      { id: `${id}-back`, pose: 'back', uri: `file:///${id}-back.jpg` },
    ],
  };
}

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function render(scans, props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ProgressScanCompare scans={scans} onClose={jest.fn()} {...props} />);
  });
  return tree;
}

afterEach(() => jest.clearAllMocks());

describe('ProgressScanCompare helpers', () => {
  test('orders completed scan entries oldest first and defaults earliest to latest', () => {
    const scans = [scan('new', 20), { id: 'draft', status: 'draft', assets: [] }, scan('old', 1)];
    expect(orderedScanEntries(scans).map((s) => s.id)).toEqual(['old', 'new']);
    expect(defaultScanPair(scans)).toEqual(['old', 'new']);
  });

  test('score and weight labels hide exact values on request', () => {
    const s = scan('a', 1, 66);
    expect(scanRangeLabel(s)).toBe('Lean 66/100');
    expect(scanRangeLabel(s, { hideExact: true })).toBe('Baseline scan');
    expect(scanWeightLabel(s)).toBe('81 kg');
    expect(scanWeightLabel(s, { hideExact: true })).toBeNull();
    expect(scanRangeLabel(scan('m', 2, null))).toBe('Measured only');
  });
});

describe('ProgressScanCompare component', () => {
  test('renders selected scan score/band and measured delta text', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([scan('new', 20, 66), scan('old', 1, 54)]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Compare scans');
    expect(text).toContain('Not body fat');
    expect(text).toContain('Defined 54/100');
    expect(text).toContain('Lean 66/100');
    expect(text).toContain('Volyume Score is up 12 points');
    expect(text).not.toContain('Stored delta should not render');
    expect(text).not.toMatch(/\d+-\d+%|BF est|body fat range/i);
  });

  test('hideExact switches to trend-only copy and removes score values', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([scan('new', 20, 66), scan('old', 1, 54)], { hideExact: true });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Slight positive trend');
    expect(text).toContain('Visual progress signal is positive against the last comparable photo set.');
    expect(text).not.toContain('Stored trend should not render');
    expect(text).not.toContain('54/100');
    expect(text).not.toContain('66/100');
  });

  test('suppressed renders a calm placeholder', async () => {
    usePhotoSuppression.mockReturnValue(true);
    const tree = await render([scan('new', 20), scan('old', 1)]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Volyume Score comparison is hidden for now.');
    expect(text).not.toContain('66/100');
  });

  test('legacy v1 scan labels are recalibrated before display', () => {
    const legacy = scan('legacy', 1, 37);
    legacy.signals.physiqueAssessment.assessmentVersion = 'volyume_physique_scan_score_v1';
    legacy.signals.physiqueAssessment.leannessBandLabel = 'Athletic';
    expect(scanRangeLabel(legacy)).toBe('Defined 71/100');
    expect(scanRangeLabel(legacy)).not.toContain('37');
  });
});
