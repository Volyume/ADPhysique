import { create, act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import ProgressScanHistoryCard from '../ProgressScanHistoryCard';

const capturedAt = new Date(2026, 2, 4, 12).getTime();

const scan = {
  id: 'scan-1',
  capturedAt,
  qualityLabel: 'good',
  deltaExplanation: {
    comparisonStatus: 'comparable',
    summary: 'Volyume Physique Score is down 4 points against the last like-for-like scan.',
    trendSummary: 'Progress Signal is positive against the last like-for-like scan.',
  },
  trendDirection: 'down',
  stats: { photoCount: 2, weightKg: 82.5, poses: ['front', 'back'] },
  signals: {
    physiqueAssessment: {
      visualLeannessScore: 72,
      leannessBandLabel: 'Lean',
      scanConfidenceLabel: 'Moderate',
      progressSignalLabel: 'Slight positive trend',
    },
  },
  assets: [
    { id: 'front', pose: 'front', photoName: 'front.jpg', uri: 'file:///front.jpg', takenAt: capturedAt },
  ],
};

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function render(props = {}) {
  let tree;
  await act(async () => {
    tree = create(<ProgressScanHistoryCard scans={[scan]} {...props} />);
  });
  return tree;
}

describe('ProgressScanHistoryCard', () => {
  test('renders detailed scan copy and callbacks in editable mode', async () => {
    const onToggleHideExact = jest.fn();
    const onDeleteScan = jest.fn();
    const onOpenPhoto = jest.fn();
    const tree = await render({ onToggleHideExact, onDeleteScan, onOpenPhoto });

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Physique Score results');
    expect(text).toContain("Volyume's private photo score");
    expect(text).toContain('not body-fat percentage');
    expect(text).toContain('Photo score');
    expect(text).toContain('Confidence: Moderate');
    expect(text).toContain('Leanness band');
    expect(text).toContain('Volyume score');
    expect(text).toContain('Slight positive trend');
    expect(text).toContain('72/100');
    expect(text).toContain('Show details');
    expect(text).toContain('Volyume Physique Score 72/100');
    expect(text).toContain('82.5 kg weight snapshot');

    const buttons = tree.root.findAllByType(TouchableOpacity);
    act(() => buttons.find((node) => node.props.accessibilityRole === 'switch').props.onPress());
    act(() => buttons.find((node) => /Delete scan/.test(node.props.accessibilityLabel)).props.onPress());
    act(() => buttons.find((node) => /Front photo/.test(node.props.accessibilityLabel)).props.onPress());
    expect(onToggleHideExact).toHaveBeenCalled();
    expect(onDeleteScan).toHaveBeenCalledWith(scan);
    expect(onOpenPhoto).toHaveBeenCalledWith('front.jpg');
  });

  test('hide-exact and suppression remove detailed score and weight copy', async () => {
    const hidden = await render({ hideExact: true });
    const hiddenText = flattenText(hidden.toJSON());
    expect(hiddenText).toContain('Trend only');
    expect(hiddenText).toContain('Lean band');
    expect(hiddenText).toContain('Volyume scoreHidden');
    expect(hiddenText).not.toContain('72/100');
    expect(hiddenText).not.toContain('82.5 kg weight snapshot');

    const suppressed = await render({ suppressed: true });
    const suppressedText = flattenText(suppressed.toJSON());
    expect(suppressedText).toContain('Scan saved privately');
    expect(suppressedText).not.toContain('82.5 kg weight snapshot');
    expect(suppressedText).not.toContain('Volyume Physique Score is down');
  });

  test('read-only mode hides delete and disables thumbnail opening', async () => {
    const onOpenPhoto = jest.fn();
    const tree = await render({ readOnly: true, onOpenPhoto });
    expect(tree.root.findAllByType(Text).map((node) => node.props.children).join('')).toContain('Physique Score results');
    expect(tree.root.findAllByType(TouchableOpacity).some((node) => /Delete scan/.test(node.props.accessibilityLabel))).toBe(false);
    const thumb = tree.root.findAllByType(TouchableOpacity).find((node) => /Front photo/.test(node.props.accessibilityLabel));
    expect(thumb.props.disabled).toBe(true);
    act(() => thumb.props.onPress?.());
    expect(onOpenPhoto).not.toHaveBeenCalled();
  });
});
