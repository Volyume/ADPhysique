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
    summary: 'Volyume Score is down 4 points against the last comparable photo set.',
    trendSummary: 'Progress change is positive against the last comparable photo set.',
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
    const onDeleteScan = jest.fn();
    const onOpenPhoto = jest.fn();
    const tree = await render({ onDeleteScan, onOpenPhoto });

    const text = flattenText(tree.toJSON());
    expect(text).toContain('Photo results');
    expect(text).toContain('Like-for-like');
    expect(text).not.toContain('Score for this set');
    expect(text).not.toContain('Result note');
    expect(text).not.toContain('Basis: front/back outline signals plus scan quality.');
    expect(text).not.toContain('Why this result');
    expect(text).toContain('Read quality: Moderate');
    expect(text).toContain('Leanness');
    expect(text).toContain('Volyume Score');
    expect(text).toContain('Slight positive trend');
    expect(text).toContain('72/100');
    expect(text).not.toContain('Hide score');
    expect(text).not.toContain('private visual progress score for repeatable photos');
    expect(text).not.toContain('82.5 kg weight snapshot');

    const buttons = tree.root.findAllByType(TouchableOpacity);
    act(() => buttons.find((node) => /Delete photo set/.test(node.props.accessibilityLabel)).props.onPress());
    act(() => buttons.find((node) => /Front photo/.test(node.props.accessibilityLabel)).props.onPress());
    expect(onDeleteScan).toHaveBeenCalledWith(scan);
    expect(onOpenPhoto).toHaveBeenCalledWith('front.jpg');
  });

  test('hide-exact and suppression remove detailed score and weight copy', async () => {
    const hidden = await render({ hideExact: true });
    const hiddenText = flattenText(hidden.toJSON());
    expect(hiddenText).toContain('Leanness');
    expect(hiddenText).toContain('ScoreHidden');
    expect(hiddenText).not.toContain('72/100');
    expect(hiddenText).not.toContain('Score72/100');
    expect(hiddenText).not.toContain('82.5 kg weight snapshot');

    const suppressed = await render({ suppressed: true });
    const suppressedText = flattenText(suppressed.toJSON());
    expect(suppressedText).toContain('Score details are hidden');
    expect(suppressedText).not.toContain('Basis: front/back outline signals');
    expect(suppressedText).not.toContain('82.5 kg weight snapshot');
    expect(suppressedText).not.toContain('Volyume Score is down');
  });

  test('read-only mode hides delete and disables thumbnail opening', async () => {
    const onOpenPhoto = jest.fn();
    const tree = await render({ readOnly: true, onOpenPhoto });
    expect(tree.root.findAllByType(Text).map((node) => node.props.children).join('')).toContain('Photo results');
    expect(tree.root.findAllByType(TouchableOpacity).some((node) => /Delete photo set/.test(node.props.accessibilityLabel))).toBe(false);
    const thumb = tree.root.findAllByType(TouchableOpacity).find((node) => /Front photo/.test(node.props.accessibilityLabel));
    expect(thumb.props.disabled).toBe(true);
    act(() => thumb.props.onPress?.());
    expect(onOpenPhoto).not.toHaveBeenCalled();
  });

  test('model unavailable results are not presented as low-confidence photos', async () => {
    const unscored = {
      ...scan,
      id: 'scan-model-missing',
      analysisStatus: 'abstained',
      qualityLabel: 'good',
      copySummary: 'The scan was saved, but on-device analysis was not available for the required photos.',
      abstentionReasons: ['model_unavailable'],
      signals: {
        physiqueAssessment: {
          visualLeannessScore: null,
          scanConfidenceLabel: 'Low',
          progressSignalLabel: 'Inconclusive',
        },
      },
    };
    let tree;
    await act(async () => {
      tree = create(<ProgressScanHistoryCard scans={[unscored]} />);
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Read quality: Analysis unavailable');
    expect(text).toContain('ScoreNot scored');
    expect(text).not.toContain('Read quality: Low');
  });

  test('measured-only scans are not displayed as baseline scored results', async () => {
    const measuredOnly = {
      ...scan,
      id: 'scan-measured-only',
      analysisStatus: 'measured',
      qualityLabel: 'usable',
      copySummary: 'Measured, but Volyume could not create a score from this set.',
      signals: {
        physiqueAssessment: {
          visualLeannessScore: null,
          scanConfidenceLabel: 'Low',
          progressSignalLabel: 'Inconclusive',
        },
      },
    };
    let tree;
    await act(async () => {
      tree = create(<ProgressScanHistoryCard scans={[measuredOnly]} />);
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Read quality: Measured only');
    expect(text).toContain('LeannessMeasured only');
    expect(text).toContain('ChangeMeasured only');
    expect(text).toContain('ScoreNot scored');
    expect(text).not.toContain('LeannessBaseline');
    expect(text).not.toContain('Baseline scan');
  });

  test('legacy v1 scores are recalibrated before rendering', async () => {
    const legacyScan = {
      ...scan,
      id: 'legacy-scan',
      signals: {
        physiqueAssessment: {
          assessmentVersion: 'volyume_physique_scan_score_v1',
          visualLeannessScore: 37,
          leannessBandLabel: 'Athletic',
          scanConfidenceLabel: 'Moderate',
          progressSignalLabel: 'Baseline scan',
        },
      },
    };
    let tree;
    await act(async () => {
      tree = create(<ProgressScanHistoryCard scans={[legacyScan]} />);
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Score71/100');
    expect(text).not.toContain('Score37/100');
  });
});
