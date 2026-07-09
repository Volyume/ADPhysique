/**
 * ProgressPhotosScreen post-scan check-in value line
 * (`.volyume-audit/progress-scan-coach-worldclass/integration-plan.md` §8).
 *
 * After a scan completes and is check-in-eligible (buildScanReceipt's
 * 'scored' outcome -- comparable, High/Moderate confidence, never
 * downgraded/baseline/not-comparable/withheld), the most recent scan's card
 * gains one value line: "If you check in this week, the coach can use this
 * as context." Conditions: the LATEST scan only (never every eligible scan
 * in the library), Pro tier only (check-ins are a Pro feature; this line
 * must never advertise Pro to a free/read-only viewer), and photo
 * suppression not active (buildScanReceipt already returns null under
 * suppression, so the line is naturally absent there too).
 *
 * Reuses the render/mock scaffold from ProgressPhotosScreen.compare.test.js
 * (the screen has real transitive dependencies -- Reanimated, the live
 * store -- so every existing test for it renders through this same mock
 * set, never a bare `require`).
 */
import { act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data = [],
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
    ...props
  }) => {
    const React = require('react');
    const renderComponent = (Component, key) => {
      if (!Component) return null;
      if (typeof Component === 'function') return React.createElement(Component, { key });
      return React.cloneElement(Component, { key });
    };
    const children = [
      renderComponent(ListHeaderComponent, 'header'),
      ...(data.length
        ? data.map((item, index) => React.createElement(React.Fragment, { key: item.key || index }, renderItem({ item, index })))
        : [renderComponent(ListEmptyComponent, 'empty')]),
    ].filter(Boolean);
    return React.createElement('FlatList', {
      ...props,
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
    }, children);
  },
  AnimatedFlashList: ({
    data = [],
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
    ...props
  }) => {
    const React = require('react');
    return React.createElement('FlatList', {
      ...props,
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
    });
  },
}));
jest.mock('../../lib/wellbeing', () => ({
  WELLBEING_KEY: jest.requireActual('../../lib/wellbeing').WELLBEING_KEY,
  isCalm: (m) => m === 'calm',
}));
jest.mock('../../lib/progressPhotos', () => ({
  listProgressPhotos: jest.fn(),
  saveProgressPhoto: jest.fn(),
  deleteProgressPhoto: jest.fn(async () => true),
  markPhotosOwner: jest.fn(),
}));
jest.mock('../../lib/progressPhotoMeta', () => ({
  getPhotoMetaMap: jest.fn(async (names) => {
    const m = {};
    for (const n of names) m[n] = { name: n, takenAt: parseInt(n, 10), pose: null, weightKg: null, note: null };
    return m;
  }),
  deletePhotoMeta: jest.fn(async () => true),
}));
jest.mock('../../lib/progressScanStore', () => ({
  addProgressScanAsset: jest.fn(async () => true),
  createProgressScanSession: jest.fn(async () => ({ id: 'scan-test' })),
  detachProgressScanPhoto: jest.fn(async () => true),
  deleteProgressScanSession: jest.fn(async () => true),
  finishProgressScanSession: jest.fn(async () => true),
  listProgressScanEntries: jest.fn(async () => []),
}));
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));

const stub = (name) => ({ __esModule: true, default: (props) => {
  const React = require('react');
  return React.createElement(name, props);
} });
jest.mock('../../components/ProgressPhotoViewer', () => stub('ProgressPhotoViewer'));
jest.mock('../../components/ProgressPhotoCompare', () => stub('ProgressPhotoCompare'));
jest.mock('../../components/ProgressGhostCapture', () => stub('ProgressGhostCapture'));
jest.mock('../../components/BeforeAfterShareSheet', () => stub('BeforeAfterShareSheet'));

import { create } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import { WELLBEING_KEY } from '../../lib/wellbeing';
import { listProgressPhotos } from '../../lib/progressPhotos';
import { listProgressScanEntries } from '../../lib/progressScanStore';
import { PROGRESS_SCAN_HIDE_EXACT_KEY } from '../../lib/progressScanPreferences';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import ProgressPhotosScreen from '../ProgressPhotosScreen';

const mk = (y, m, d) => {
  const ts = new Date(y, m - 1, d).getTime();
  return { name: `${ts}.jpg`, uri: `file:///photos/${ts}.jpg`, ts };
};
const OLD = mk(2026, 1, 5);
const NEW = mk(2026, 6, 20);
const nav = { goBack: jest.fn(), navigate: jest.fn() };
const VALUE_LINE = 'If you check in this week, the coach can use this as context.';

function eligibleScan(id, photo, overrides = {}) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: photo.ts,
    signals: {
      physiqueAssessment: { visualLeannessScore: 66, scanConfidenceTier: 'moderate', leannessBandLabel: 'Lean' },
    },
    deltaExplanation: { comparisonStatus: 'comparable' },
    assets: [{ id: `${id}-front`, pose: 'front', photoName: photo.name, uri: photo.uri, takenAt: photo.ts }],
    ...overrides,
  };
}

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

async function render(photos, { tier = 'pro', suppressed = false, scans = [] } = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion: false }, tier, user: { id: 'u-test' } }));
  useAppStore.getState = () => ({ tier, user: { id: 'u-test' } });
  usePhotoSuppression.mockReturnValue(suppressed);
  await AsyncStorage.setItem(WELLBEING_KEY, 'unspecified');
  await AsyncStorage.setItem(PROGRESS_SCAN_HIDE_EXACT_KEY, 'false');
  listProgressPhotos.mockResolvedValue(photos);
  listProgressScanEntries.mockResolvedValue(scans);
  let tree;
  await act(async () => { tree = create(<ProgressPhotosScreen navigation={nav} />); });
  await flush();
  return tree;
}

function flashList(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'FlatList')[0];
}

function checkInFor(tree, photo) {
  const fl = flashList(tree);
  const checkInItem = (fl.props.data || []).find(
    (it) => it.type === 'checkin' && it.photos.some((p) => p.name === photo.name),
  );
  if (!checkInItem) return null;
  return fl.props.renderItem({ item: checkInItem, index: 0 });
}

afterEach(() => jest.clearAllMocks());

describe('ProgressPhotosScreen check-in value line', () => {
  test('present on the latest scan card when scored + moderate confidence + pro + unsuppressed', async () => {
    const scans = [eligibleScan('scan-new', NEW)];
    const tree = await render([NEW, OLD], { scans });
    const cardText = JSON.stringify(checkInFor(tree, NEW));
    expect(cardText).toContain(VALUE_LINE);
  });

  test('present when the latest scan is High tier too', async () => {
    const scans = [eligibleScan('scan-new', NEW, {
      signals: { physiqueAssessment: { visualLeannessScore: 80, scanConfidenceTier: 'high', leannessBandLabel: 'Very lean' } },
    })];
    const tree = await render([NEW, OLD], { scans });
    expect(JSON.stringify(checkInFor(tree, NEW))).toContain(VALUE_LINE);
  });

  test('absent for Low confidence (scored_downgraded), even on the latest card', async () => {
    const scans = [eligibleScan('scan-new', NEW, {
      signals: { physiqueAssessment: { visualLeannessScore: 60, scanConfidenceTier: 'low', leannessBandLabel: 'Lean' } },
    })];
    const tree = await render([NEW, OLD], { scans });
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });

  test('absent for a baseline scan (no prior comparable set)', async () => {
    const scans = [eligibleScan('scan-new', NEW, { deltaExplanation: { comparisonStatus: 'baseline' } })];
    const tree = await render([NEW], { scans });
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });

  test('absent for a not-comparable scan (setup drift)', async () => {
    const scans = [eligibleScan('scan-new', NEW, {
      deltaExplanation: { comparisonStatus: 'not_comparable', summary: 'This scan is saved, but the setup changed too much for a fair comparison.' },
    })];
    const tree = await render([NEW, OLD], { scans });
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });

  test('absent on the free/read-only tier, even when the latest scan is eligible (check-ins are a Pro feature)', async () => {
    const scans = [eligibleScan('scan-new', NEW)];
    const tree = await render([NEW, OLD], { scans, tier: 'free' });
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });

  test('absent under photo suppression (the receipt itself is withheld, fail-closed)', async () => {
    const scans = [eligibleScan('scan-new', NEW)];
    const tree = await render([NEW, OLD], { scans, suppressed: true });
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });

  test('only on the LATEST scan card: an older eligible scan does not carry the line', async () => {
    const scans = [
      eligibleScan('scan-old', OLD),
      // The newer scan is present but not comparable (e.g. setup drift), so
      // it is not eligible -- the line must not fall back to the older,
      // otherwise-eligible scan.
      eligibleScan('scan-new', NEW, { deltaExplanation: { comparisonStatus: 'not_comparable', summary: 'Setup changed.' } }),
    ];
    const tree = await render([NEW, OLD], { scans });
    expect(JSON.stringify(checkInFor(tree, OLD))).not.toContain(VALUE_LINE);
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });

  test('absent entirely when there is no scan for a photo set (plain photos, no score)', async () => {
    const tree = await render([NEW, OLD], { scans: [] });
    expect(JSON.stringify(checkInFor(tree, NEW))).not.toContain(VALUE_LINE);
  });
});
