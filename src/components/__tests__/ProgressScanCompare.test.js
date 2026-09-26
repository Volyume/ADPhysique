import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));

import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import useAppStore from '../../store/useAppStore';
import { formatBodyWeight } from '../../lib/units';
import ProgressScanCompare, {
  defaultScanPair,
  orderedScanEntries,
  scanRangeLabel,
  scanWeightLabel,
} from '../ProgressScanCompare';

const DAY = 86400000;
const base = Date.UTC(2026, 0, 1);

function scan(id, day, score = 66, { tier = 'moderate' } = {}) {
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
        scanConfidenceTier: tier,
        scanConfidenceLabel: tier,
        progressSignal: day > 1 ? 'slight_positive' : 'baseline',
        progressSignalLabel: day > 1 ? 'Slight positive trend' : 'Baseline set',
      },
      estimatorInputs: {
        waistToHeight: score >= 65 ? 0.18 : 0.21,
        waistToShoulder: score >= 65 ? 0.61 : 0.66,
      },
      // Real measured scans always persist per-pose quality metrics; the
      // comparability gate fails closed below a minimum compared-signal
      // count (audit D-F3), so fixtures carry them like real records.
      assets: [
        { pose: 'front', quality: { lightingScore: 0.9, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 } },
        { pose: 'back', quality: { lightingScore: 0.9, framingScore: 0.88, segmentationConfidence: 0.9, cameraTiltDegrees: 0 } },
      ],
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

const ORIGINAL_BODY_WEIGHT_UNITS = useAppStore.getState().bodyWeightUnits;
afterEach(() => { useAppStore.setState({ bodyWeightUnits: ORIGINAL_BODY_WEIGHT_UNITS }); });

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
    useAppStore.setState({ bodyWeightUnits: 'kg' });
    const s = scan('a', 1, 66);
    expect(scanRangeLabel(s)).toBe('Lean 66/100');
    expect(scanRangeLabel(s, { hideExact: true })).toBe('Baseline set');
    expect(scanWeightLabel(s)).toBe('81 kg');
    expect(scanWeightLabel(s, { hideExact: true })).toBeNull();
    expect(scanRangeLabel(scan('m', 2, null))).toBe('Measured only');
  });

  // S7-4 (progress-tab audit second pass, D200 item 7): scanWeightLabel used
  // to return a hard-coded `${kg} kg` regardless of the store's unit
  // preference. Tests for all three units.
  test('scanWeightLabel formats through the store bodyWeightUnits preference: kg, lbs and st', () => {
    const s = scan('a', 1, 66); // stats.weightKg = 81
    for (const units of ['kg', 'lbs', 'st']) {
      useAppStore.setState({ bodyWeightUnits: units });
      expect(scanWeightLabel(s)).toBe(formatBodyWeight(81, units));
    }
    // hideExact still wins outright, whatever the unit.
    expect(scanWeightLabel(s, { hideExact: true })).toBeNull();
  });

  // S7-3 (same audit pass): a Low-tier score used to print outright here at
  // any confidence tier; it now goes through buildScoreTierContract, same
  // as the timeline (identical 'Show anyway' wording).
  test('scanRangeLabel holds a Low-tier score behind "Show anyway" until revealed; the band still shows', () => {
    const low = scan('low', 1, 40, { tier: 'low' });
    expect(scanRangeLabel(low)).toBe('Defined Show anyway');
    expect(scanRangeLabel(low, { revealed: true })).toBe('Defined 40/100');
    // hideExact overrides the reveal state entirely (a stronger, orthogonal
    // preference): still trend-only copy, never a number.
    expect(scanRangeLabel(low, { hideExact: true, revealed: true })).toBe('Baseline set');
  });

  test('scanRangeLabel shows High/Moderate scores outright, with no reveal step', () => {
    expect(scanRangeLabel(scan('hi', 1, 90, { tier: 'high' }))).toBe('Lean 90/100');
    expect(scanRangeLabel(scan('mid', 1, 66, { tier: 'moderate' }))).toBe('Lean 66/100');
  });
});

describe('ProgressScanCompare component', () => {
  test('renders selected scan score/band and measured delta text', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([scan('new', 20, 66), scan('old', 1, 54)]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Compare photo sets');
    expect(text).toContain('matched poses');
    expect(text).not.toContain('Not body fat');
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
    expect(text).toContain('Visual progress change is positive against the last comparable photo set.');
    expect(text).not.toContain('Stored trend should not render');
    expect(text).not.toContain('54/100');
    expect(text).not.toContain('66/100');
  });

  test('suppressed renders a calm placeholder', async () => {
    usePhotoSuppression.mockReturnValue(true);
    const tree = await render([scan('new', 20), scan('old', 1)]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Score comparison is hidden for now.');
    expect(text).not.toContain('66/100');
  });

  test('legacy v1 scan labels are recalibrated before display', () => {
    const legacy = scan('legacy', 1, 37);
    legacy.signals.physiqueAssessment.assessmentVersion = 'volyume_physique_scan_score_v1';
    legacy.signals.physiqueAssessment.leannessBandLabel = 'Athletic';
    expect(scanRangeLabel(legacy)).toBe('Defined 71/100');
    expect(scanRangeLabel(legacy)).not.toContain('37');
  });

  // S7-3: a Low-tier scan pair holds its numbers behind "Show anyway" until
  // tapped, then reveals for the rest of this session (never persisted).
  test('a Low-tier pair holds both numbers behind "Show anyway", tapping one reveals only that scan', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([scan('new', 20, 66, { tier: 'low' }), scan('old', 1, 54, { tier: 'low' })]);
    let text = flattenText(tree.toJSON());
    expect(text).toContain('Lean Show anyway');
    expect(text).toContain('Defined Show anyway');
    expect(text).not.toContain('66/100');
    expect(text).not.toContain('54/100');

    // RE-ANCHORED 2026-09-26 (founder order: plain English, docs/rules/plain-english.md)
    const revealButtons = tree.root.findAllByType(TouchableOpacity).filter(
      (node) => /Score hidden until you choose Show anyway\./.test(node.props.accessibilityLabel || ''),
    );
    expect(revealButtons).toHaveLength(2);
    await act(async () => { revealButtons[0].props.onPress(); });

    text = flattenText(tree.toJSON());
    // Exactly one of the two scans is revealed; the other stays hidden.
    const revealedCount = [text.includes('66/100'), text.includes('54/100')].filter(Boolean).length;
    expect(revealedCount).toBe(1);
    expect(text).toContain('Show anyway');
  });
});
