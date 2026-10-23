/**
 * D231 (app layout rework, 2026-10-22): the Athlete profile is retired and its
 * Volyume Score "goes to Progress photos" (owner answer, verbatim: "Retire it,
 * move its parts (Recommended)"). The screen already carries the score for
 * every photo set (Score, Leanness, Change, Confidence on each card, newest
 * first by default) and the persistent "how this works" tooltip on the Photo
 * library title, so nothing was duplicated onto it; this suite pins that the
 * part lives here with the rule the profile tile carried (D228 item 2, Wave 4
 * suppression unification): under calm mode, an open ED flag or a failed read
 * (usePhotoSuppression, plus the screen's own raw wellbeing read) NO score, band,
 * change or confidence prints and NO body composition figure prints in its
 * place. The old tile's fall-through to a logged body fat percentage has no
 * counterpart here: this screen never reads body composition at all.
 * It is a score from the person's own photos, never described as a body fat
 * measurement (the glossary line says so).
 *
 * Same render scaffold as ProgressPhotosScreen.checkInValueLine.test.js.
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

const fs = require('fs');
const path = require('path');
const { GLOSSARY } = require('../../lib/coachGlossary');

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ProgressPhotosScreen.js'), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

function tooltips(tree) {
  return tree.root.findAll((n) => n.props && n.props.text === GLOSSARY.volyumeScore);
}

describe('D231: the Volyume Score lives on Progress photos, with its show rule', () => {
  test('the newest set card prints Score, Leanness, Change and Confidence from the scan', async () => {
    const scans = [eligibleScan('scan-new', NEW)];
    const tree = await render([NEW, OLD], { scans });
    const card = JSON.stringify(checkInFor(tree, NEW));
    expect(card).toContain('66/100');
    expect(card).toContain('Lean');
    for (const label of ['Score', 'Leanness', 'Change', 'Confidence']) expect(card).toContain(`"${label}"`);
    expect(card).not.toContain('Hidden');
  });

  test('the persistent "how this works" tooltip carries the Volyume Score line, which says it is not a body fat measurement', async () => {
    const tree = await render([NEW, OLD], { scans: [eligibleScan('scan-new', NEW)] });
    expect(tooltips(tree).length).toBeGreaterThan(0);
    expect(GLOSSARY.volyumeScore).toMatch(/not a body fat measurement/);
  });

  test('under photo suppression (calm mode, an open flag, a failed read) every score cell reads Hidden and no figure prints', async () => {
    const tree = await render([NEW, OLD], { scans: [eligibleScan('scan-new', NEW)], suppressed: true });
    const card = JSON.stringify(checkInFor(tree, NEW));
    expect(card).not.toContain('66/100');
    expect(card).not.toContain('"Lean"');
    expect((card.match(/Hidden/g) || []).length).toBeGreaterThanOrEqual(4);
    expect(card).not.toMatch(/body fat/i);
  });

  test('under the screen\'s own raw calm read alone (hook says not suppressed) the cells are Hidden too: the stricter of the two wins', async () => {
    const scans = [eligibleScan('scan-new', NEW)];
    useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion: false }, tier: 'pro', user: { id: 'u-test' } }));
    usePhotoSuppression.mockReturnValue(false);
    await AsyncStorage.setItem(WELLBEING_KEY, 'calm');
    await AsyncStorage.setItem(PROGRESS_SCAN_HIDE_EXACT_KEY, 'false');
    listProgressPhotos.mockResolvedValue([NEW, OLD]);
    listProgressScanEntries.mockResolvedValue(scans);
    let tree;
    await act(async () => { tree = create(<ProgressPhotosScreen navigation={nav} />); });
    await flush();
    const card = JSON.stringify(checkInFor(tree, NEW));
    expect(card).not.toContain('66/100');
    expect((card.match(/Hidden/g) || []).length).toBeGreaterThanOrEqual(4);
  });

  test('this screen never reads or prints a body fat percentage (the old tile\'s fall-through has no counterpart)', () => {
    const src = code(SOURCE);
    expect(src).not.toMatch(/getLatestBodyComposition|bodyFatPercent|bodyFatLoggedAt/);
  });

  test('the show rule is the shared fail-closed one: the hook, then the screen\'s own calm read', () => {
    expect(SOURCE).toMatch(/import usePhotoSuppression from '\.\.\/hooks\/usePhotoSuppression'/);
    expect(SOURCE).toMatch(/const photoSuppressed = usePhotoSuppression\(userId\);/);
    expect(SOURCE).toMatch(/const suppressed = photoSuppressed \|\| calm;/);
    expect(SOURCE).toMatch(/const scoreValue = suppressed \? 'Hidden'/);
    expect(SOURCE).toMatch(/const signalValue = suppressed\s*\?\s*'Hidden'/);
    expect(SOURCE).toMatch(/const confidenceValue = suppressed \? 'Hidden'/);
  });
});
