/**
 * ProgressPhotosScreen integration invariants (progress-photos upgrade, B5).
 *
 * The neutral-copy ban and the three comparison modes now live in the
 * extracted ProgressPhotoCompare component and are pinned by its own colocated
 * test (ProgressPhotoCompare.test.js) — the SAME regex the legacy inline modal
 * was held to. This suite pins the SCREEN's wiring and the safety invariants
 * that stay the screen's responsibility after the timeline rewrite:
 *   - the dated, pose-typed timeline (month headers, per-tile dates) built from
 *     getPhotoMetaMap, newest-first;
 *   - a tap opens the full-size VIEWER (not delete); delete flows through the
 *     viewer's onDelete → deleteProgressPhoto + deletePhotoMeta + refresh, with
 *     a live-tier re-check;
 *   - the Compare entry opens ProgressPhotoCompare AND is withheld (hidden)
 *     under the shared fail-closed suppression gate — a double guard with the
 *     component's own self-suppression;
 *   - the Share entry is Pro-gated AND withheld under suppression;
 *   - the calm-mode wellbeing note is byte-identical to the pre-upgrade wording
 *     (the base screen's raw fail-closed read must not be weakened);
 *   - the E10 read-only (free-tier) rules: no add, tiles inert (no editable
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
import { deletePhotoMeta } from '../../lib/progressPhotoMeta';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import ProgressPhotosScreen from '../ProgressPhotosScreen';

// Same formatter the screen uses, so the expected labels track the ICU data.
const fmt = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const mk = (y, m, d) => {
  const ts = new Date(y, m - 1, d).getTime();
  return { name: `${ts}.jpg`, uri: `file:///photos/${ts}.jpg`, ts };
};
const OLD = mk(2026, 1, 5);
const MID = mk(2026, 3, 10);
const NEW = mk(2026, 6, 20);

const nav = { goBack: jest.fn() };

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
  mode = 'unspecified', reduceMotion = false, tier = 'pro', suppressed = false,
} = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion }, tier }));
  useAppStore.getState = () => ({ tier, user: { id: 'u-test' } });
  usePhotoSuppression.mockReturnValue(suppressed);
  // The screen reads the wellbeing flag RAW via AsyncStorage (fail-closed
  // sweep, 2026-07-03) rather than through the getWellbeingMode() helper.
  await AsyncStorage.setItem(WELLBEING_KEY, mode);
  listProgressPhotos.mockResolvedValue(photos); // newest first, like the lib
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

// The tile TouchableOpacity for a photo, produced by renderItem on its row.
function tileFor(tree, photo) {
  const fl = flashList(tree);
  const rowItem = (fl.props.data || []).find(
    (it) => it.type === 'row' && it.photos.some((p) => p.name === photo.name),
  );
  if (!rowItem) return null;
  const el = fl.props.renderItem({ item: rowItem, index: 0 });
  return findElement(el, (n) => typeof n.props?.accessibilityLabel === 'string'
    && n.props.accessibilityLabel.startsWith(`Photo from ${fmt(photo.ts)}`));
}

async function pressTile(tree, photo) {
  const tile = tileFor(tree, photo);
  if (!tile) throw new Error(`No tile for ${photo.name}`);
  await act(async () => { tile.props.onPress(); });
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
  test('builds a newest-first dated timeline with month headers and per-tile dates', async () => {
    const tree = await render();
    const data = flashList(tree).props.data;
    // Three photos in three different months => three headers + three rows,
    // newest month first.
    const headers = data.filter((d) => d.type === 'header').map((d) => d.label);
    expect(headers).toEqual(['June 2026', 'March 2026', 'January 2026']);
    // Each tile shows its date.
    const el = tileFor(tree, NEW);
    expect(el).toBeTruthy();
    const dateText = findElement(el, (n) => n.props && n.props.children === fmt(NEW.ts));
    expect(dateText).toBeTruthy();
  });

  test('empty state still renders (mount safety)', async () => {
    const tree = await render([]);
    expect(flattenText(tree.toJSON())).toContain('No photos yet. Tap + to add one.');
  });
});

describe('ProgressPhotosScreen tap opens the viewer, not delete', () => {
  test('a plain tap opens the full-size viewer and never the delete dialog', async () => {
    const tree = await render();
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeUndefined();
    await pressTile(tree, NEW);
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeDefined();
    expect(appAlert).not.toHaveBeenCalled();
  });

  test('viewer onDelete removes the file AND its meta, then refreshes (live-tier checked)', async () => {
    const tree = await render();
    await pressTile(tree, OLD);
    const viewer = hostNode(tree, 'ProgressPhotoViewer');
    listProgressPhotos.mockClear();
    await act(async () => { await viewer.props.onDelete(OLD.name); });
    expect(deleteProgressPhoto).toHaveBeenCalledWith(OLD.uri);
    expect(deletePhotoMeta).toHaveBeenCalledWith(OLD.name);
    expect(listProgressPhotos).toHaveBeenCalled(); // refresh ran
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

  test('Share is Pro-gated: never offered on the free plan even when unsuppressed', async () => {
    const tree = await render([NEW, MID, OLD], { suppressed: false, tier: 'free' });
    expect(findPressable(tree, 'Share progress')).toBeUndefined();
  });
});

describe('ProgressPhotosScreen wellbeing gate unchanged', () => {
  test('calm-mode note keeps its exact pre-upgrade wording, with the feature present', async () => {
    const tree = await render([NEW, OLD], { mode: 'calm' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(
      'Private to this device. Not synced, not shared. Use these only if they help you, and skip them if they do not.',
    );
    // Compare stays reachable in calm mode when NOT otherwise suppressed (the
    // suppression hook is the single gate; here it reports false).
    expect(findPressable(tree, 'Compare two photos')).toBeDefined();
  });

  test('normal mode keeps the short privacy note', async () => {
    const tree = await render([NEW, OLD], { mode: 'normal' });
    expect(flattenText(tree.toJSON())).toContain('Private to this device. Not synced, not shared.');
  });
});

// E10 read-only lapse views (founder decision 2026-07-02, "view yes, log no"):
// a free user with photos sees the timeline and Compare, but no add, no
// editable viewer and no delete. Pinned against the real screen with tier free.
describe('ProgressPhotosScreen read-only lapse state (E10)', () => {
  test('free tier hides the add button and says the state plainly', async () => {
    const tree = await render([NEW, OLD], { tier: 'free' });
    expect(findPressable(tree, 'Add a photo')).toBeUndefined();
    expect(flattenText(tree.toJSON())).toContain('View-only on the free plan.');
  });

  test('free tier: a tile is inert (no editable viewer, no delete path)', async () => {
    const tree = await render([NEW, OLD], { tier: 'free' });
    const tile = tileFor(tree, NEW);
    expect(tile.props.onPress).toBeUndefined();
    expect(tile.props.disabled).toBe(true);
    expect(tile.props.accessibilityLabel).not.toContain('Tap to open');
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
    expect(findPressable(tree, 'Add a photo')).toBeDefined();
    await pressTile(tree, NEW);
    expect(hostNode(tree, 'ProgressPhotoViewer')).toBeDefined();
  });
});
