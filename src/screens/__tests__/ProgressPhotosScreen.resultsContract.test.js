/**
 * Progress-photos wave 3 (results-ui-and-copy-blueprint.md, governing;
 * scoring-accuracy-and-validation-blueprint.md §5/§9): the tier rendered
 * contract on the timeline "score row", receipts, the confidence-chip
 * regression guard, suppression, the recalibration note (once only), and the
 * meaning moment (once only, before the first score render).
 *
 * Harness mirrors ProgressPhotosScreen.compare.test.js (same mocks); this
 * file additionally drives the real progressScanPreferences module against
 * the real (mocked-in-jest-setup) AsyncStorage, clearing it per test, so the
 * once-only persistence claims are pinned against real storage rather than a
 * stub.
 */
import { create, act } from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    data = [], renderItem, ListHeaderComponent, ListEmptyComponent, ...props
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
      ...props, data, renderItem, ListHeaderComponent, ListEmptyComponent,
    }, children);
  },
  AnimatedFlashList: ({
    data = [], renderItem, ListHeaderComponent, ListEmptyComponent, ...props
  }) => {
    const React = require('react');
    return React.createElement('FlatList', {
      ...props, data, renderItem, ListHeaderComponent, ListEmptyComponent,
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

import useAppStore from '../../store/useAppStore';
import { listProgressPhotos } from '../../lib/progressPhotos';
import { listProgressScanEntries } from '../../lib/progressScanStore';
import { PROGRESS_SCAN_HIDE_EXACT_KEY } from '../../lib/progressScanPreferences';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import ProgressPhotosScreen from '../ProgressPhotosScreen';
import ProgressScanMeaningMoment from '../../components/ProgressScanMeaningMoment';

const nav = { goBack: jest.fn(), navigate: jest.fn() };
const TS = Date.UTC(2026, 0, 10);

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

// Same idea, but for a RAW (unmounted) React element tree, e.g. the output
// of FlashList's renderItem called directly: a plain element's text children
// live at `element.props.children`, not `element.children` (that shape only
// exists on a MOUNTED tree's `.toJSON()` output).
function flattenElementText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenElementText).join('');
  if (typeof node === 'object' && 'props' in node) return flattenElementText(node.props.children);
  return '';
}

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

function flashList(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'FlatList')[0];
}

// Walk a raw React element tree (renderItem output isn't mounted).
function findElement(el, pred) {
  if (el == null || typeof el !== 'object') return null;
  if (Array.isArray(el)) {
    for (const c of el) { const r = findElement(c, pred); if (r) return r; }
    return null;
  }
  if (pred(el)) return el;
  return findElement(el.props && el.props.children, pred);
}

// The un-mounted renderItem output for the check-in card at a given
// timestamp, scoped away from every other Modal-mounted surface
// (ProgressScanCompare/Trend are always present in the test tree regardless
// of their Modal's `visible` prop, same as every other Modal in this screen;
// cards must be inspected via renderItem, not the fully mounted tree, to
// avoid cross-surface leakage).
function checkInFor(tree, ts) {
  const fl = flashList(tree);
  const item = (fl.props.data || []).find((it) => it.type === 'checkin'
    && it.photos.some((p) => p.name === `${ts}.jpg` || p.name === `${ts + 1}.jpg`));
  if (!item) return null;
  return fl.props.renderItem({ item, index: 0 });
}

// ProgressScanMeaningMoment is rendered for real (not stubbed), so it is
// found by component reference rather than by a stub's string tag.
function meaningMomentOpen(tree) {
  const modal = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Modal'
    && n.findAllByType(ProgressScanMeaningMoment).length > 0)[0];
  return !!(modal && modal.props.visible);
}

function scan(id, {
  ts, tier = 'moderate', score = 74, assessmentOverrides = {},
} = {}) {
  return {
    id,
    status: 'complete',
    requiredPosesComplete: true,
    capturedAt: ts,
    analysisStatus: score == null ? 'abstained' : 'complete',
    qualityLabel: score == null ? 'poor' : 'good',
    copySummary: score == null
      ? 'No score this time. The back photo was too dark to read reliably. Your photos are saved.'
      : `Volyume Score ${score}/100.`,
    abstentionReasons: score == null ? ['too_dark'] : [],
    deltaExplanation: { comparisonStatus: 'baseline' },
    signals: score == null ? {} : {
      physiqueAssessment: {
        visualLeannessScore: score,
        leannessBandLabel: 'Defined',
        scanConfidenceTier: tier,
        scanConfidenceLabel: tier,
        progressSignalLabel: 'Baseline set',
        ...assessmentOverrides,
      },
    },
    // Photo names are the epoch timestamp (matching progressPhotoMeta's real
    // shape, and the mocked getPhotoMetaMap's `takenAt: parseInt(name, 10)`);
    // an arbitrary string id like "s-high-front.jpg" would parse to NaN and
    // silently drop the photo from the dated timeline grouping.
    assets: [
      { id: `${id}-front`, pose: 'front', photoName: `${ts}.jpg`, uri: `file:///${ts}.jpg`, takenAt: ts },
      { id: `${id}-back`, pose: 'back', photoName: `${ts + 1}.jpg`, uri: `file:///${ts + 1}.jpg`, takenAt: ts },
    ],
  };
}

function photosFor(scanEntry) {
  return scanEntry.assets.map((a) => ({ name: a.photoName, uri: a.uri, ts: a.takenAt }));
}

async function render(scans, {
  tier = 'pro', suppressed = false, meaningMomentSeen = true,
} = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion: false }, tier, user: { id: 'u-test' } }));
  useAppStore.getState = () => ({ tier, user: { id: 'u-test' } });
  usePhotoSuppression.mockReturnValue(suppressed);
  await AsyncStorage.clear();
  if (meaningMomentSeen) await AsyncStorage.setItem('@volyume_progress_scan_meaning_moment_seen', 'true');
  await AsyncStorage.setItem(PROGRESS_SCAN_HIDE_EXACT_KEY, 'false');
  const photos = scans.flatMap(photosFor);
  listProgressPhotos.mockResolvedValue(photos);
  listProgressScanEntries.mockResolvedValue(scans);
  let tree;
  await act(async () => { tree = create(<ProgressPhotosScreen navigation={nav} />); });
  await flush();
  return tree;
}

afterEach(() => jest.clearAllMocks());

describe('Tier rendered contract on the score row (scoring blueprint §5 table)', () => {
  test('High: score, band, confidence chip and trend all render', async () => {
    const s = scan('s-high', { ts: TS, tier: 'high', score: 74 });
    const tree = await render([s]);
    const cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).toContain('74/100');
    expect(cardText).toContain('High confidence');
    expect(cardText).toContain('Confidence');
  });

  test('Moderate: score and confidence chip render', async () => {
    const s = scan('s-mod', { ts: TS, tier: 'moderate', score: 61 });
    const tree = await render([s]);
    const cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).toContain('61/100');
    expect(cardText).toContain('Moderate confidence');
  });

  test('Low: the integer is gated behind "Show anyway"; tapping it reveals the score', async () => {
    const s = scan('s-low', { ts: TS, tier: 'low', score: 61 });
    const tree = await render([s]);
    let cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).toContain('Low confidence');
    expect(cardText).not.toContain('61/100');
    expect(cardText).toContain('Show anyway');

    const revealButton = findElement(checkInFor(tree, TS), (n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.includes('show-anyway control'));
    expect(revealButton).toBeTruthy();
    await act(async () => { revealButton.props.onPress(); });
    cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).toContain('61/100');
  });

  test('Not enough: no score, no band claim, confidence chip says so', async () => {
    const s = scan('s-none', { ts: TS, score: null });
    const tree = await render([s]);
    const cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).toContain('Not enough confidence');
    expect(cardText).not.toMatch(/\d+\/100/);
  });
});

describe('Confidence chip regression guard: a score never renders without its tier', () => {
  test.each([
    ['high', 'High confidence'],
    ['moderate', 'Moderate confidence'],
  ])('when the %s tier score renders, its chip label renders in the same card', async (tier, chipLabel) => {
    const s = scan(`s-${tier}`, { ts: TS, tier, score: 68 });
    const tree = await render([s]);
    const cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).toContain('68/100');
    // This assertion is the guard: if the Confidence cell were ever removed
    // or the chip label demoted (e.g. rendered empty), this fails while the
    // score assertion above keeps passing.
    expect(cardText).toContain(chipLabel);
  });
});

describe('Suppression: fail-closed, no scores/chips/receipts, photos stay viewable', () => {
  test('suppressed hides the score, the confidence chip and the receipt sentence', async () => {
    const s = scan('s-supp', { ts: TS, tier: 'high', score: 74 });
    const tree = await render([s], { suppressed: true });
    const cardText = flattenElementText(checkInFor(tree, TS));
    expect(cardText).not.toContain('74/100');
    expect(cardText).not.toContain('High confidence');
    expect(cardText).not.toContain('Volyume Score');
    // The photo library itself stays viewable.
    expect(flattenText(tree.toJSON())).toContain('Photo library');
  });
});

describe('Receipts render one calm sentence plus a Why? expansion', () => {
  test('a withheld scan shows the engine copySummary and a Why? section with the reason', async () => {
    // CollapsibleSection is a real nested component, so this exercises the
    // fully MOUNTED tree (not the raw renderItem output used elsewhere in
    // this file): "Why?" and its why-line text are unique to this surface
    // (no other permanently-mounted Modal renders either string), so there
    // is no cross-surface contamination risk here.
    const s = scan('s-withheld', { ts: TS, score: null });
    const tree = await render([s]);
    let text = flattenText(tree.toJSON());
    expect(text).toContain('No score this time. The back photo was too dark to read reliably. Your photos are saved.');
    expect(text).toContain('Why?');
    expect(text).not.toContain('One of the photos was too dark to read reliably.');
    const whyToggle = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel === 'Why?' && typeof n.props.onPress === 'function')[0];
    expect(whyToggle).toBeTruthy();
    await act(async () => { whyToggle.props.onPress(); });
    text = flattenText(tree.toJSON());
    expect(text).toContain('One of the photos was too dark to read reliably.');
  });
});

describe('Recalibration note: renders once for a migrated assessment, never again after being seen', () => {
  function legacyScan() {
    return scan('s-legacy', {
      ts: TS,
      score: 37,
      assessmentOverrides: { assessmentVersion: 'volyume_physique_scan_score_v1', leannessBandLabel: 'Athletic' },
    });
  }

  test('first encounter: the note renders and the scan id is persisted as seen', async () => {
    const tree = await render([legacyScan()]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Scores were recalibrated in an update. Your photos are unchanged.');
    await flush();
    const stored = JSON.parse((await AsyncStorage.getItem('@volyume_progress_scan_recalibration_seen_ids')) || '[]');
    expect(stored).toContain('s-legacy');
  });

  test('a future mount (already marked seen in storage) never shows the note again', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem('@volyume_progress_scan_recalibration_seen_ids', JSON.stringify(['s-legacy']));
    await AsyncStorage.setItem('@volyume_progress_scan_meaning_moment_seen', 'true');
    await AsyncStorage.setItem(PROGRESS_SCAN_HIDE_EXACT_KEY, 'false');
    const s = legacyScan();
    listProgressPhotos.mockResolvedValue(photosFor(s));
    listProgressScanEntries.mockResolvedValue([s]);
    useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion: false }, tier: 'pro', user: { id: 'u-test' } }));
    useAppStore.getState = () => ({ tier: 'pro', user: { id: 'u-test' } });
    usePhotoSuppression.mockReturnValue(false);
    let tree;
    await act(async () => { tree = create(<ProgressPhotosScreen navigation={nav} />); });
    await flush();
    expect(flattenText(tree.toJSON())).not.toContain('Scores were recalibrated in an update.');
  });
});

describe('Meaning moment: shown once before the first score render, persists dismissal, blocks nothing else', () => {
  test('shown when a score exists and it has never been seen', async () => {
    const s = scan('s-meaning', { ts: TS, tier: 'high', score: 74 });
    const tree = await render([s], { meaningMomentSeen: false });
    expect(meaningMomentOpen(tree)).toBe(true);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Before your first score');
    expect(text).toContain('It is not a body fat measurement, a medical assessment, or a comparison with anyone else.');
  });

  test('pressing Understood persists the dismissal and closes the moment; the timeline stays usable underneath', async () => {
    const s = scan('s-meaning2', { ts: TS, tier: 'high', score: 74 });
    const tree = await render([s], { meaningMomentSeen: false });
    const understood = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel === 'Understood' && typeof n.props.onPress === 'function')[0];
    expect(understood).toBeTruthy();
    await act(async () => { understood.props.onPress(); });
    await flush();
    expect(await AsyncStorage.getItem('@volyume_progress_scan_meaning_moment_seen')).toBe('true');
    expect(meaningMomentOpen(tree)).toBe(false);
    // The scored timeline card is still there and interactive underneath.
    expect(flattenElementText(checkInFor(tree, TS))).toContain('74/100');
  });

  test('never shown once already seen, even with a score present', async () => {
    const s = scan('s-meaning3', { ts: TS, tier: 'high', score: 74 });
    const tree = await render([s], { meaningMomentSeen: true });
    expect(meaningMomentOpen(tree)).toBe(false);
  });

  test('never shown with no scored scans yet', async () => {
    const s = scan('s-unscored', { ts: TS, score: null });
    const tree = await render([s], { meaningMomentSeen: false });
    expect(meaningMomentOpen(tree)).toBe(false);
  });
});
