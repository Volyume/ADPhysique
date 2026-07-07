/**
 * ProgressPhotosScreen integration invariants (progress-photos upgrade, B5).
 *
 * The neutral-copy ban and the three comparison modes now live in the
 * extracted ProgressPhotoCompare component and are pinned by its own colocated
 * test (ProgressPhotoCompare.test.js) — the SAME regex the legacy inline modal
 * was held to. This suite pins the SCREEN's wiring and the safety invariants
 * that stay the screen's responsibility after the timeline rewrite:
 *   - the dated, pose-typed photo-set timeline (month headers, card dates) built from
 *     getPhotoMetaMap, newest-first;
 *   - a tap opens the full-size VIEWER (not delete); delete flows through the
 *     viewer's onDelete → deleteProgressPhoto + deletePhotoMeta + refresh, with
 *     a live-tier re-check;
 *   - the Compare entry opens ProgressPhotoCompare AND is withheld (hidden)
 *     under the shared fail-closed suppression gate — a double guard with the
 *     component's own self-suppression;
 *   - the Share entry is Pro-gated AND withheld under suppression;
 *   - the suppression copy stays neutral and does not show analysis pressure;
 *   - the E10 read-only (free-tier) rules: no add, cards inert (no editable
 *     viewer, no delete), Compare still available (pure viewing).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../components/AppAlert', () => ({ appAlert: jest.fn() }));
// Button's primary variant fires the haptic vocabulary; expo-haptics has no
// global mock, so stub the vocabulary module itself.
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
const mockDetachProgressScanPhoto = jest.fn(async () => true);
jest.mock('../../lib/progressScanStore', () => ({
  addProgressScanAsset: jest.fn(async () => true),
  createProgressScanSession: jest.fn(async () => ({ id: 'scan-test' })),
  detachProgressScanPhoto: (...args) => mockDetachProgressScanPhoto(...args),
  deleteProgressScanSession: jest.fn(async () => true),
  finishProgressScanSession: jest.fn(async () => true),
  listProgressScanEntries: jest.fn(async () => []),
}));
// The shared ED-safety gate is driven directly here; its own logic is unit-
// tested in usePhotoSuppression.test.js.
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));

// The four wired surfaces are their own components with their own tests; stub
// them to inert hosts so this suite pins only the screen's wiring around them.
const stub = (name) => ({ __esModule: true, default: (props) => {
  const React = require('react');
  return React.createElement(name, props);
} });
jest.mock('../../components/ProgressPhotoViewer', () => stub('ProgressPhotoViewer'));
jest.mock('../../components/ProgressPhotoCompare', () => stub('ProgressPhotoCompare'));
jest.mock('../../components/ProgressGhostCapture', () => stub('ProgressGhostCapture'));
jest.mock('../../components/BeforeAfterShareSheet', () => stub('BeforeAfterShareSheet'));

import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../../store/useAppStore';
import { appAlert } from '../../components/AppAlert';
import { WELLBEING_KEY } from '../../lib/wellbeing';
import { listProgressPhotos, deleteProgressPhoto } from '../../lib/progressPhotos';
import { deletePhotoMeta, getPhotoMetaMap } from '../../lib/progressPhotoMeta';
import { deleteProgressScanSession, listProgressScanEntries } from '../../lib/progressScanStore';
import { PROGRESS_SCAN_HIDE_EXACT_KEY } from '../../lib/progressScanPreferences';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import ProgressPhotosScreen, { filterAndSort } from '../ProgressPhotosScreen';
import PhotoDateRangeSheet from '../../components/PhotoDateRangeSheet';

// Same formatter the screen uses, so the expected labels track the ICU data.
const fmt = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const mk = (y, m, d) => {
  const ts = new Date(y, m - 1, d).getTime();
  return { name: `${ts}.jpg`, uri: `file:///photos/${ts}.jpg`, ts };
};
const OLD = mk(2026, 1, 5);
const MID = mk(2026, 3, 10);
const NEW = mk(2026, 6, 20);

const nav = { goBack: jest.fn(), navigate: jest.fn() };

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
}

async function render(photos = [NEW, MID, OLD], {
  mode = 'unspecified', reduceMotion = false, tier = 'pro', suppressed = false, scans = [],
} = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion }, tier, user: { id: 'u-test' } }));
  useAppStore.getState = () => ({ tier, user: { id: 'u-test' } });
  usePhotoSuppression.mockReturnValue(suppressed);
  await AsyncStorage.setItem(WELLBEING_KEY, mode);
  await AsyncStorage.setItem(PROGRESS_SCAN_HIDE_EXACT_KEY, 'false');
  listProgressPhotos.mockResolvedValue(photos); // newest first, like the lib
  listProgressScanEntries.mockResolvedValue(scans);
  let tree;
  await act(async () => { tree = create(<ProgressPhotosScreen navigation={nav} />); });
  await flush();
  return tree;
}

// Host nodes with an onPress and the given accessibility label.
function findPressable(tree, label) {
  return tree.root.findAll((n) => typeof n.type === 'string'
    && n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

async function press(tree, label) {
  const node = findPressable(tree, label);
  if (!node) throw new Error(`No pressable labelled "${label}"`);
  await act(async () => { node.props.onPress(); });
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

// The photo-set TouchableOpacity for a photo, produced by renderItem.
function checkInFor(tree, photo) {
  const fl = flashList(tree);
  const checkInItem = (fl.props.data || []).find(
    (it) => it.type === 'checkin' && it.photos.some((p) => p.name === photo.name),
  );
  if (!checkInItem) return null;
  const el = fl.props.renderItem({ item: checkInItem, index: 0 });
  return findElement(el, (n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith(`Photos from ${fmt(photo.ts)}`));
}

async function pressCheckIn(tree, photo) {
  const checkIn = checkInFor(tree, photo);
  if (!checkIn) throw new Error(`No photo set for ${photo.name}`);
  await act(async () => { checkIn.props.onPress(); });
}

function hostNode(tree, name) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.type === name)[0];
}

// Whether the Modal wrapping a given child surface is visible (compare/capture/
// share are each rendered inside their own Modal).
function surfaceOpen(tree, childName) {
  const modal = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Modal'
    && n.findAll((c) => typeof c.type === 'string' && c.type === childName).length > 0)[0];
  return !!(modal && modal.props.visible);
}

afterEach(() => jest.clearAllMocks());

describe('ProgressPhotosScreen timeline', () => {
  test('builds a newest-first dated timeline with month headers and photo-set dates', async () => {
    const tree = await render();
    const data = flashList(tree).props.data;
    // Three photos in three different months => three headers + three photo sets,
    // newest month first.
    const headers = data.filter((d) => d.type === 'header').map((d) => d.label);
    expect(headers).toEqual(['June 2026', 'March 2026', 'January 2026']);
    expect(data.filter((d) => d.type === 'checkin')).toHaveLength(3);
    // Each card shows its date.
    const el = checkInFor(tree, NEW);
    expect(el).toBeTruthy();
    const dateText = findElement(el, (n) => n.props && n.props.children === fmt(NEW.ts));
    expect(dateText).toBeTruthy();
  });

  test('partial progress photo cards show setup quality and can add the next missing pose', async () => {
    const tree = await render([NEW]);
    const card = checkInFor(tree, NEW);
    const quality = findElement(card, (n) => n.props && n.props.children === 'Partial setup');
    const complete = findElement(card, (n) => n.props?.accessibilityLabel === 'Add a Front photo for this date');

    expect(quality).toBeTruthy();
    expect(complete).toBeTruthy();
    await act(async () => { complete.props.onPress(); });
    expect(surfaceOpen(tree, 'ProgressGhostCapture')).toBe(true);
    expect(hostNode(tree, 'ProgressGhostCapture').props.pose).toBe('front');
  });

  test('partial-set prompt guides the user to add a missing pose to the latest photo set', async () => {
    const tree = await render([NEW]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Partial setup');
    expect(text).toContain('Add front photo');
    await press(tree, 'Add a Front photo for this date');
    expect(surfaceOpen(tree, 'ProgressGhostCapture')).toBe(true);
    expect(hostNode(tree, 'ProgressGhostCapture').props.pose).toBe('front');
  });

  test('empty state renders the explainer and an add affordance (mount safety)', async () => {
    const tree = await render([]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Progress Photos');
    expect(text).toContain('Private by default');
    expect(text).toContain('Nothing is shared or exported unless you choose it.');
    expect(text).toContain('private progress index for like-for-like comparisons');
    expect(text).not.toContain('Latest result');
    expect(text).not.toContain('What the Volyume Score means');
    expect(text).toContain('No saved photos yet');
    expect(text).toContain('Add photo set');
    expect(text).toContain('Your first set can be new photos or older photos from your phone.');
    expect(text).not.toContain('Suggested next step');
  });
});

// Sort + date-range navigation (NAV-4). Neutral controls that compose with the
// pose filter; no cadence, no streak, no comparison forcing. The photo-set
// timeline groups by contiguous month, so oldest-first simply reverses sections.
describe('ProgressPhotosScreen timeline sort toggle', () => {
  const headers = (tree) => flashList(tree).props.data
    .filter((d) => d.type === 'header').map((d) => d.label);

  test('defaults to newest-first, and the Oldest toggle reverses the order', async () => {
    const tree = await render();
    expect(headers(tree)).toEqual(['June 2026', 'March 2026', 'January 2026']);
    await press(tree, 'Sort oldest first');
    expect(headers(tree)).toEqual(['January 2026', 'March 2026', 'June 2026']);
    // First photo set is now the OLDEST photo.
    const first = flashList(tree).props.data.find((d) => d.type === 'checkin');
    expect(first.cover.name).toBe(OLD.name);
    // Toggling back restores newest-first.
    await press(tree, 'Sort newest first');
    expect(headers(tree)).toEqual(['June 2026', 'March 2026', 'January 2026']);
  });
});

describe('ProgressPhotosScreen date-range filter', () => {
  const headers = (tree) => flashList(tree).props.data
    .filter((d) => d.type === 'header').map((d) => d.label);
  const rangeSheet = (tree) => tree.root.findAllByType(PhotoDateRangeSheet)[0];

  test('applying a From bound narrows the timeline to photos on or after it', async () => {
    const tree = await render(); // OLD (Jan), MID (Mar), NEW (Jun)
    expect(headers(tree)).toEqual(['June 2026', 'March 2026', 'January 2026']);
    // Apply "from 1 March 2026" (drops January's OLD photo). The sheet hands the
    // screen day-bounded ms; drive it directly to exercise the screen wiring.
    const fromMs = new Date(2026, 2, 1).getTime();
    await act(async () => { rangeSheet(tree).props.onApply({ fromMs, toMs: null }); });
    expect(headers(tree)).toEqual(['June 2026', 'March 2026']);
    expect(flashList(tree).props.data.some((d) => d.type === 'header' && d.label === 'January 2026')).toBe(false);
    // Clearing the range restores the full timeline.
    await press(tree, 'Clear the date filter');
    expect(headers(tree)).toEqual(['June 2026', 'March 2026', 'January 2026']);
  });
});

describe('filterAndSort (pure)', () => {
  const items = [
    { name: 'a', takenAt: 100, pose: 'front' },
    { name: 'b', takenAt: 200, pose: 'side' },
    { name: 'c', takenAt: 300, pose: 'front' },
  ];

  test('newest-first by default, oldest-first when asked', () => {
    expect(filterAndSort(items).map((p) => p.name)).toEqual(['c', 'b', 'a']);
    expect(filterAndSort(items, { sortOrder: 'oldest' }).map((p) => p.name)).toEqual(['a', 'b', 'c']);
  });

  test('a date range narrows the list to the inclusive bounds', () => {
    expect(filterAndSort(items, { rangeFrom: 150, rangeTo: 250 }).map((p) => p.name)).toEqual(['b']);
    expect(filterAndSort(items, { rangeFrom: 200 }).map((p) => p.name)).toEqual(['c', 'b']);
    expect(filterAndSort(items, { rangeTo: 200 }).map((p) => p.name)).toEqual(['b', 'a']);
  });

  test('pose, range and sort compose', () => {
    expect(filterAndSort(items, { poseFilter: 'front', rangeFrom: 150, sortOrder: 'oldest' }).map((p) => p.name))
      .toEqual(['c']);
  });
});

describe('ProgressPhotosScreen tap opens the viewer, not delete', () => {
  test('a plain tap opens the full-size viewer and never the delete dialog', async () => {
    const tree = await render();
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeUndefined();
    await pressCheckIn(tree, NEW);
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeDefined();
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('viewer onDelete removes the file AND its meta, then refreshes (live-tier checked)', async () => {
    const tree = await render();
    await pressCheckIn(tree, OLD);
    const viewer = hostNode(tree, 'ProgressPhotoViewer');
    listProgressPhotos.mockClear();
    await act(async () => { await viewer.props.onDelete(OLD.name); });
    expect(mockDetachProgressScanPhoto).toHaveBeenCalledWith('u-test', OLD.name);
    expect(deletePhotoMeta).toHaveBeenCalledWith('u-test', OLD.name);
    expect(deleteProgressPhoto).toHaveBeenCalledWith('u-test', OLD.uri);
    expect(listProgressPhotos).toHaveBeenCalled(); // refresh ran
  });

  test('viewer onDelete removes the whole scored photo set in one action', async () => {
    const scan = {
      id: 'scan-1',
      status: 'complete',
      requiredPosesComplete: true,
      capturedAt: NEW.ts,
      assets: [
        { id: 'front', pose: 'front', photoName: NEW.name, uri: NEW.uri, takenAt: NEW.ts },
        { id: 'back', pose: 'back', photoName: MID.name, uri: MID.uri, takenAt: NEW.ts },
        { id: 'side', pose: 'side', photoName: OLD.name, uri: OLD.uri, takenAt: NEW.ts },
      ],
    };
    const tree = await render([NEW, MID, OLD], { scans: [scan] });
    await pressCheckIn(tree, NEW);
    const viewer = hostNode(tree, 'ProgressPhotoViewer');
    expect(viewer.props.deleteModeForPhoto(NEW.name)).toBe('scan-set');
    expect(viewer.props.deleteModeForPhoto('standalone.jpg')).toBe('photo');

    listProgressPhotos.mockClear();
    await act(async () => { await viewer.props.onDelete(NEW.name); });

    expect(deleteProgressScanSession).toHaveBeenCalledWith('u-test', 'scan-1', { deleteFiles: true });
    expect(mockDetachProgressScanPhoto).not.toHaveBeenCalled();
    expect(deletePhotoMeta).not.toHaveBeenCalled();
    expect(deleteProgressPhoto).not.toHaveBeenCalled();
    expect(listProgressPhotos).toHaveBeenCalled();
  });

  test('viewer onDelete removes every photo in an ordinary same-day photo set', async () => {
    const side = { name: `${NEW.ts + 1}.jpg`, uri: `file:///photos/${NEW.ts + 1}.jpg`, ts: NEW.ts + 1 };
    const back = { name: `${NEW.ts + 2}.jpg`, uri: `file:///photos/${NEW.ts + 2}.jpg`, ts: NEW.ts + 2 };
    getPhotoMetaMap.mockResolvedValueOnce({
      [NEW.name]: { name: NEW.name, takenAt: NEW.ts, pose: 'front', weightKg: 82.4, note: null },
      [side.name]: { name: side.name, takenAt: NEW.ts, pose: 'side', weightKg: 82.4, note: null },
      [back.name]: { name: back.name, takenAt: NEW.ts, pose: 'back', weightKg: 82.4, note: null },
    });
    const tree = await render([NEW, side, back]);
    await pressCheckIn(tree, NEW);
    const viewer = hostNode(tree, 'ProgressPhotoViewer');
    expect(viewer.props.deleteModeForPhoto(NEW.name)).toBe('photo-set');

    listProgressPhotos.mockClear();
    await act(async () => { await viewer.props.onDelete(NEW.name); });

    expect(deleteProgressScanSession).not.toHaveBeenCalled();
    expect(mockDetachProgressScanPhoto).toHaveBeenCalledTimes(3);
    expect(deletePhotoMeta).toHaveBeenCalledTimes(3);
    expect(deleteProgressPhoto).toHaveBeenCalledTimes(3);
    expect(deletePhotoMeta).toHaveBeenCalledWith('u-test', NEW.name);
    expect(deletePhotoMeta).toHaveBeenCalledWith('u-test', side.name);
    expect(deletePhotoMeta).toHaveBeenCalledWith('u-test', back.name);
    expect(deleteProgressPhoto).toHaveBeenCalledWith('u-test', NEW.uri);
    expect(deleteProgressPhoto).toHaveBeenCalledWith('u-test', side.uri);
    expect(deleteProgressPhoto).toHaveBeenCalledWith('u-test', back.uri);
    expect(listProgressPhotos).toHaveBeenCalled();
  });
});

describe('ProgressPhotosScreen compare entry', () => {
  test('hidden with zero or one photo, shown with two or more (not suppressed)', async () => {
    expect(findPressable(await render([]), 'Compare two photos')).toBeUndefined();
    expect(findPressable(await render([NEW]), 'Compare two photos')).toBeUndefined();
    expect(findPressable(await render([NEW, OLD]), 'Compare two photos')).toBeDefined();
  });

  test('pressing Compare opens the ProgressPhotoCompare surface', async () => {
    const tree = await render();
    expect(surfaceOpen(tree, 'ProgressPhotoCompare')).toBe(false);
    await press(tree, 'Compare two photos');
    expect(surfaceOpen(tree, 'ProgressPhotoCompare')).toBe(true);
  });

  test('Volyume Score comparison stays in the main Compare button instead of a duplicate prompt card', async () => {
    const newBack = { name: `${NEW.ts + 1}.jpg`, uri: `file:///photos/${NEW.ts + 1}.jpg`, ts: NEW.ts + 1 };
    const newSide = { name: `${NEW.ts + 2}.jpg`, uri: `file:///photos/${NEW.ts + 2}.jpg`, ts: NEW.ts + 2 };
    const oldBack = { name: `${OLD.ts + 1}.jpg`, uri: `file:///photos/${OLD.ts + 1}.jpg`, ts: OLD.ts + 1 };
    const oldSide = { name: `${OLD.ts + 2}.jpg`, uri: `file:///photos/${OLD.ts + 2}.jpg`, ts: OLD.ts + 2 };
    getPhotoMetaMap.mockResolvedValueOnce({
      [NEW.name]: { name: NEW.name, takenAt: NEW.ts, pose: 'front', weightKg: null, note: null },
      [newBack.name]: { name: newBack.name, takenAt: NEW.ts, pose: 'back', weightKg: null, note: null },
      [newSide.name]: { name: newSide.name, takenAt: NEW.ts, pose: 'side', weightKg: null, note: null },
      [OLD.name]: { name: OLD.name, takenAt: OLD.ts, pose: 'front', weightKg: null, note: null },
      [oldBack.name]: { name: oldBack.name, takenAt: OLD.ts, pose: 'back', weightKg: null, note: null },
      [oldSide.name]: { name: oldSide.name, takenAt: OLD.ts, pose: 'side', weightKg: null, note: null },
    });
    const scans = [
      { id: 'scan-old', status: 'complete', requiredPosesComplete: true, capturedAt: OLD.ts, signals: { physiqueAssessment: { visualLeannessScore: 42 } }, assets: [{ id: 'old-front', pose: 'front', photoName: OLD.name, uri: OLD.uri, takenAt: OLD.ts }, { id: 'old-back', pose: 'back', photoName: oldBack.name, uri: oldBack.uri, takenAt: OLD.ts }] },
      { id: 'scan-new', status: 'complete', requiredPosesComplete: true, capturedAt: NEW.ts, signals: { physiqueAssessment: { visualLeannessScore: 49 } }, assets: [{ id: 'new-front', pose: 'front', photoName: NEW.name, uri: NEW.uri, takenAt: NEW.ts }, { id: 'new-back', pose: 'back', photoName: newBack.name, uri: newBack.uri, takenAt: NEW.ts }] },
    ];
    const tree = await render([newSide, newBack, NEW, oldSide, oldBack, OLD], { scans });
    const text = flattenText(tree.toJSON());

    expect(findPressable(tree, 'Compare two Volyume Score entries')).toBeDefined();
    expect(text).not.toContain('Latest set needs another angle');
    expect(text).not.toContain('Compare Volyume Scores');
  });

  test('same-day photo sets show the score from the scan that owns the cover photo', async () => {
    const day = new Date(2026, 5, 20).getTime();
    const early = { name: `${day + 3600000}.jpg`, uri: `file:///photos/${day + 3600000}.jpg`, ts: day + 3600000 };
    const late = { name: `${day + 7200000}.jpg`, uri: `file:///photos/${day + 7200000}.jpg`, ts: day + 7200000 };
    getPhotoMetaMap.mockResolvedValueOnce({
      [early.name]: { name: early.name, takenAt: early.ts, pose: 'front', weightKg: null, note: null },
      [late.name]: { name: late.name, takenAt: late.ts, pose: 'front', weightKg: null, note: null },
    });
    const scans = [
      { id: 'scan-early', status: 'complete', requiredPosesComplete: true, capturedAt: early.ts, signals: { physiqueAssessment: { visualLeannessScore: 22 } }, assets: [{ id: 'early-front', pose: 'front', photoName: early.name, uri: early.uri, takenAt: early.ts }] },
      { id: 'scan-late', status: 'complete', requiredPosesComplete: true, capturedAt: late.ts, signals: { physiqueAssessment: { visualLeannessScore: 88 } }, assets: [{ id: 'late-front', pose: 'front', photoName: late.name, uri: late.uri, takenAt: late.ts }] },
    ];
    const tree = await render([late, early], { scans });
    const cardText = JSON.stringify(checkInFor(tree, late));

    expect(cardText).toContain('Score 88');
    expect(cardText).not.toContain('Score 22');
  });

  test('withheld-score photo sets fall back to normal photo comparison', async () => {
    const scans = [
      { id: 'scan-old', status: 'complete', requiredPosesComplete: true, capturedAt: OLD.ts, assets: [{ id: 'old-front', pose: 'front', photoName: OLD.name, uri: OLD.uri, takenAt: OLD.ts }] },
      { id: 'scan-new', status: 'complete', requiredPosesComplete: true, capturedAt: NEW.ts, assets: [{ id: 'new-front', pose: 'front', photoName: NEW.name, uri: NEW.uri, takenAt: NEW.ts }] },
    ];
    const tree = await render([NEW, OLD], { scans });
    expect(findPressable(tree, 'Compare two Volyume Score entries')).toBeUndefined();
    expect(findPressable(tree, 'Compare two photos')).toBeDefined();
  });

  test('the compare surface honours reduce motion on its wrapping modal', async () => {
    const still = await render([NEW, OLD], { reduceMotion: true });
    const stillModal = still.root.findAll((n) => typeof n.type === 'string' && n.type === 'Modal'
      && n.findAll((c) => typeof c.type === 'string' && c.type === 'ProgressPhotoCompare').length > 0)[0];
    expect(stillModal.props.animationType).toBe('none');
    const moving = await render([NEW, OLD], { reduceMotion: false });
    const movingModal = moving.root.findAll((n) => typeof n.type === 'string' && n.type === 'Modal'
      && n.findAll((c) => typeof c.type === 'string' && c.type === 'ProgressPhotoCompare').length > 0)[0];
    expect(movingModal.props.animationType).toBe('fade');
  });
});

describe('ProgressPhotosScreen ED-safety suppression gate', () => {
  test('under suppression the Compare and Share entries are withheld (fail-closed double guard)', async () => {
    const tree = await render([NEW, MID, OLD], { suppressed: true });
    expect(findPressable(tree, 'Compare two photos')).toBeUndefined();
    expect(findPressable(tree, 'Share progress')).toBeUndefined();
    // Viewing the dated timeline stays available.
    expect(flashList(tree).props.data.length).toBeGreaterThan(0);
  });

  test('not suppressed and Pro: both Compare and Share are offered', async () => {
    const tree = await render([NEW, MID, OLD], { suppressed: false, tier: 'pro' });
    expect(findPressable(tree, 'Compare two photos')).toBeDefined();
    expect(findPressable(tree, 'Share progress')).toBeDefined();
  });

  test('share sheet can preview the progress card with Partners', async () => {
    const tree = await render([NEW, MID, OLD], { suppressed: false, tier: 'pro' });
    await press(tree, 'Share progress');
    const sheet = hostNode(tree, 'BeforeAfterShareSheet');
    expect(sheet.props.onPreviewForPartner).toEqual(expect.any(Function));
    const progressCardSharePayload = {
      label: 'Progress Photos card',
      dateRange: '5 Jan 2026 to 20 Jun 2026',
      format: 'Square',
      includesWeight: false,
      includesScanScore: true,
    };
    await act(async () => { sheet.props.onPreviewForPartner(progressCardSharePayload); });
    expect(nav.navigate).toHaveBeenCalledWith('Partner', {
      source: 'progress_photos_share',
      shareWinType: 'progress_card',
      progressCardSharePayload,
    });
  });

  test('Share is Pro-gated: never offered on the free plan even when unsuppressed', async () => {
    const tree = await render([NEW, MID, OLD], { suppressed: false, tier: 'free' });
    expect(findPressable(tree, 'Share progress')).toBeUndefined();
  });
});

describe('ProgressPhotosScreen suppression copy', () => {
  test('suppressed mode keeps the calm guidance and hides analysis pressure', async () => {
    const tree = await render([NEW, OLD], { mode: 'calm' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Private by default');
    expect(text).not.toContain('Latest result');
    expect(findPressable(tree, 'Compare two photos')).toBeUndefined();
  });

  test('normal mode keeps the reworded privacy note (no "not shared" contradiction)', async () => {
    const tree = await render([NEW, OLD]);
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Private by default');
    expect(text).toContain('Nothing is shared or exported unless you choose it.');
    expect(text).not.toContain('Not synced, not shared');
  });
});

// E10 read-only lapse views (founder decision 2026-07-02, "view yes, log no"):
// a free user with photos sees the timeline and Compare, but no add, no
// editable viewer and no delete. Pinned against the real screen with tier free.
describe('ProgressPhotosScreen read-only lapse state (E10)', () => {
  test('free tier hides the add button and says the state plainly', async () => {
    const tree = await render([NEW, OLD], { tier: 'free' });
    expect(findPressable(tree, 'Add photo set')).toBeUndefined();
    expect(flattenText(tree.toJSON())).toContain('View-only on the free plan.');
  });

  test('free tier: a progress photo card is inert (no editable viewer, no delete path)', async () => {
    const tree = await render([NEW, OLD], { tier: 'free' });
    const checkIn = checkInFor(tree, NEW);
    expect(checkIn.props.onPress).toBeUndefined();
    expect(checkIn.props.disabled).toBe(true);
    expect(checkIn.props.accessibilityLabel).not.toContain('Tap to open');
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeUndefined();
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('free tier keeps Compare available (viewing is not a write)', async () => {
    const tree = await render([NEW, OLD], { tier: 'free' });
    expect(findPressable(tree, 'Compare two photos')).toBeDefined();
    await press(tree, 'Compare two photos');
    expect(surfaceOpen(tree, 'ProgressPhotoCompare')).toBe(true);
  });

  test('pro tier is unchanged: add button present, tap opens the viewer', async () => {
    const tree = await render([NEW, OLD], { tier: 'pro' });
    expect(findPressable(tree, 'Add photo set')).toBeDefined();
    await pressCheckIn(tree, NEW);
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeDefined();
  });
});
