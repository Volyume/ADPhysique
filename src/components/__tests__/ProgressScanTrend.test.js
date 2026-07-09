// Wave 3 (results-ui-and-copy-blueprint.md §4). Render tests for the score
// trend view: comparable-only connections, the empty state, suppression
// (fail-closed like every other score surface), and focusable per-point
// accessibility labels that always carry the tier with the score.
import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';

jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));

import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import ProgressScanTrend from '../ProgressScanTrend';

const DAY = 86400000;
const base = Date.UTC(2026, 0, 1);

function scan(id, day, { score = 66, tier = 'moderate', lightingScore = 0.7 } = {}) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: base + day * DAY,
    analysisStatus: score == null ? 'abstained' : 'complete',
    qualityLabel: score == null ? 'poor' : 'good',
    signals: score == null ? {} : {
      physiqueAssessment: {
        visualLeannessScore: score,
        leannessBandLabel: 'Defined',
        scanConfidenceTier: tier,
        scanConfidenceLabel: tier,
        progressSignalLabel: 'Slight positive trend',
      },
    },
    assets: [{ pose: 'front', lightingScore }, { pose: 'back', lightingScore }],
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
    tree = create(<ProgressScanTrend scans={scans} onClose={jest.fn()} {...props} />);
  });
  return tree;
}

afterEach(() => jest.clearAllMocks());

describe('ProgressScanTrend', () => {
  test('empty scan list shows the exact results-blueprint §7 empty state', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([]);
    expect(flattenText(tree.toJSON())).toContain('Trends appear after three comparable photo sets.');
  });

  test('suppressed renders a calm placeholder, never scores or trend language', async () => {
    usePhotoSuppression.mockReturnValue(true);
    const tree = await render([scan('a', 1), scan('b', 10)]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Trend view is hidden for now.');
    expect(text).not.toContain('66/100');
    expect(text).not.toContain('Moderate confidence');
  });

  test('plots only comparable points; a setup break renders as an unconnected, tappable gap with a reason', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const scans = [
      scan('a', 1, { lightingScore: 0.7 }),
      scan('b', 9, { lightingScore: 0.68 }),
      scan('c', 17, { lightingScore: 0.1 }), // hard lighting drift vs b: not comparable
    ];
    const tree = await render(scans);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('66/100');
    // 3 total scans, but only the a-b pair is comparable (b-c broke on lighting):
    // chain length is 1 (baseline) + 1 comparable = 2 => "An early read", not "A trend".
    expect(text).toContain('An early read');

    // Tap the third (non-comparable) point open and check the gap reason renders.
    const buttons = tree.root.findAllByType(TouchableOpacity);
    const thirdPoint = buttons.find((n) => typeof n.props.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.includes('Not connected to the previous set.'));
    expect(thirdPoint).toBeTruthy();
    await act(async () => { thirdPoint.props.onPress(); });
    const expandedText = flattenText(tree.toJSON());
    expect(expandedText).toMatch(/setup changed too much/i);
  });

  test('confidence is legible from the accessibility label, never colour alone', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([scan('a', 1, { tier: 'high' }), scan('b', 10, { tier: 'low' })]);
    const labels = tree.root.findAllByType(TouchableOpacity).map((n) => n.props.accessibilityLabel).filter(Boolean);
    expect(labels.some((l) => l.includes('High confidence'))).toBe(true);
    expect(labels.some((l) => l.includes('Low confidence'))).toBe(true);
    // The Low-tier point's label never contains the (hidden) numeric score.
    expect(labels.find((l) => l.includes('Low confidence'))).not.toMatch(/\d+\/100/);
  });

  test('a withheld/unscored scan renders with no numeric score and no crash', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const tree = await render([scan('a', 1), scan('b', 10, { score: null })]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Not enough confidence');
  });

  test('the close button fires onClose', async () => {
    usePhotoSuppression.mockReturnValue(false);
    const onClose = jest.fn();
    const tree = await render([scan('a', 1)], { onClose });
    const closeBtn = tree.root.findAllByType(TouchableOpacity)
      .find((n) => n.props.accessibilityLabel === 'Close score trend');
    await act(async () => { closeBtn.props.onPress(); });
    expect(onClose).toHaveBeenCalled();
  });
});
