/**
 * Progress-photo comparison (enhancement B6) invariants. Pins, against the
 * real screen:
 *   - the Compare affordance exists only when two or more photos exist;
 *   - selection mode picks EXACTLY two: a tap on a third photo replaces the
 *     EARLIEST choice (the pinned behaviour), a tap on a chosen photo
 *     unchooses it, and the compare view cannot open with fewer than two;
 *   - selection taps never open the delete dialog (and normal taps still do);
 *   - the compare view renders both photos OLDER-LEFT / NEWER-RIGHT with
 *     their date labels, and its copy is dates + neutral labels ONLY: no
 *     deltas, measurements, "before/after" framing or judgement words (this
 *     screen is body-image adjacent; CLAUDE.md ED-safety rules);
 *   - both panes decode at explicit bounded view dimensions with
 *     resizeMethod="resize" (the audit's named memory risk), never unbounded;
 *   - reduce motion collapses the modal animation to none;
 *   - the calm-mode wellbeing note is byte-identical to the pre-compare
 *     screen (the gate around this screen must not be weakened by B6);
 *   - a photo that fails to load logs via ProgressPhotos.compare and shows a
 *     calm fallback instead of crashing.
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
  getWellbeingMode: jest.fn(),
  isCalm: (m) => m === 'calm',
}));
jest.mock('../../lib/progressPhotos', () => ({
  listProgressPhotos: jest.fn(),
  saveProgressPhoto: jest.fn(),
  deleteProgressPhoto: jest.fn(),
}));

import useAppStore from '../../store/useAppStore';
import { appAlert } from '../../components/AppAlert';
import { logError } from '../../lib/errorLog';
import { getWellbeingMode } from '../../lib/wellbeing';
import { listProgressPhotos } from '../../lib/progressPhotos';
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

async function render(photos = [NEW, MID, OLD], { mode = 'unspecified', reduceMotion = false } = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion } }));
  getWellbeingMode.mockResolvedValue(mode);
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

// The jest react-native mock's FlatList does not render rows, so grid tiles
// are driven through renderItem, which closes over the live selection state.
function tileEl(tree, item) {
  const fl = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'FlatList')[0];
  return fl.props.renderItem({ item });
}

async function pressTile(tree, item) {
  const el = tileEl(tree, item);
  await act(async () => { el.props.onPress(); });
}

function tileSelected(tree, item) {
  return tileEl(tree, item).props.accessibilityState?.selected === true;
}

function modalNode(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Modal')[0];
}

function modalTexts(tree) {
  return modalNode(tree)
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((t) => flattenText(t.props.children));
}

function modalImages(tree) {
  return modalNode(tree).findAll((n) => typeof n.type === 'string' && n.type === 'Image');
}

const flatStyle = (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {});

async function enterSelection(tree) {
  await press(tree, 'Compare two photos');
}

async function openCompare(tree) {
  await press(tree, 'Compare the chosen photos');
}

afterEach(() => jest.clearAllMocks());

describe('ProgressPhotosScreen compare, entry affordance', () => {
  test('hidden with zero or one photo, shown with two or more', async () => {
    expect(findPressable(await render([]), 'Compare two photos')).toBeUndefined();
    expect(findPressable(await render([NEW]), 'Compare two photos')).toBeUndefined();
    expect(findPressable(await render([NEW, OLD]), 'Compare two photos')).toBeDefined();
  });

  test('empty state still renders (mount safety)', async () => {
    const tree = await render([]);
    expect(flattenText(tree.toJSON())).toContain('No photos yet. Tap + to add one.');
  });
});

describe('ProgressPhotosScreen compare, selection mode', () => {
  test('picks exactly two; a third tap replaces the earliest choice (pinned)', async () => {
    const tree = await render();
    await enterSelection(tree);

    await pressTile(tree, OLD);
    await pressTile(tree, MID);
    expect(tileSelected(tree, OLD)).toBe(true);
    expect(tileSelected(tree, MID)).toBe(true);
    expect(tileSelected(tree, NEW)).toBe(false);

    // Third tap: OLD (earliest choice) drops, MID and NEW remain.
    await pressTile(tree, NEW);
    expect(tileSelected(tree, OLD)).toBe(false);
    expect(tileSelected(tree, MID)).toBe(true);
    expect(tileSelected(tree, NEW)).toBe(true);
    const chosen = [OLD, MID, NEW].filter((p) => tileSelected(tree, p));
    expect(chosen).toHaveLength(2);
  });

  test('tapping a chosen photo unchooses it, and compare cannot open with fewer than two', async () => {
    const tree = await render();
    await enterSelection(tree);

    await pressTile(tree, OLD);
    expect(tileSelected(tree, OLD)).toBe(true);
    await pressTile(tree, OLD);
    expect(tileSelected(tree, OLD)).toBe(false);

    await openCompare(tree); // one (zero) chosen: the guard must refuse
    expect(modalNode(tree).props.visible).toBe(false);
  });

  test('selection taps never open the delete dialog; normal taps still do', async () => {
    const tree = await render();
    await enterSelection(tree);
    await pressTile(tree, OLD);
    await pressTile(tree, MID);
    expect(appAlert).not.toHaveBeenCalled();

    await press(tree, 'Cancel comparing');
    await pressTile(tree, OLD);
    expect(appAlert).toHaveBeenCalledTimes(1);
    expect(appAlert).toHaveBeenCalledWith(
      fmt(OLD.ts), 'Remove this photo from your device?', expect.any(Array),
    );
  });
});

describe('ProgressPhotosScreen compare, the comparison view', () => {
  test('renders both photos older-left newer-right with date labels, and nothing else', async () => {
    const tree = await render();
    await enterSelection(tree);
    // Tap order deliberately newest-first: display order must not follow it.
    await pressTile(tree, NEW);
    await pressTile(tree, OLD);
    await openCompare(tree);

    expect(modalNode(tree).props.visible).toBe(true);

    // The complete rendered copy of the compare view, in render order. This
    // is an ALLOWLIST: any extra string (a delta, a percentage, a judgement)
    // fails the test.
    expect(modalTexts(tree)).toEqual(['Compare', 'Earlier', fmt(OLD.ts), 'Later', fmt(NEW.ts)]);

    const imgs = modalImages(tree);
    expect(imgs.map((i) => i.props.source.uri)).toEqual([OLD.uri, NEW.uri]);
    expect(imgs.map((i) => i.props.accessibilityLabel)).toEqual([
      `Earlier photo, ${fmt(OLD.ts)}`,
      `Later photo, ${fmt(NEW.ts)}`,
    ]);
    expect(findPressable(tree, 'Close compare')).toBeDefined();
  });

  test('carries no measurement, delta or before/after vocabulary anywhere', async () => {
    const tree = await render();
    await enterSelection(tree);
    await pressTile(tree, OLD);
    await pressTile(tree, NEW);
    await openCompare(tree);

    const labels = modalNode(tree)
      .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel);
    const copy = [...modalTexts(tree), ...labels].join(' ');
    expect(copy).not.toMatch(
      /\b(before|after|change[ds]?|progress made|gained?|lost|weight|kg|lbs?|cm|delta|leaner|bigger|smaller)\b|%|—/i,
    );
  });

  test('the SELECTION BAR copy is equally neutral (review gap: it sits outside the modal)', async () => {
    const tree = await render();
    await enterSelection(tree);
    await pressTile(tree, OLD);

    // Every Text and accessibility label rendered anywhere on the screen in
    // selection mode — the bar's hints included — against the same banned
    // vocabulary the modal is held to.
    const allTexts = tree.root
      .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
      .map((t) => flattenText(t.props.children));
    const allLabels = tree.root
      .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel);
    const copy = [...allTexts, ...allLabels].join(' ');
    expect(copy).not.toMatch(
      /\b(before|after|change[ds]?|progress made|gained?|lost|weight|kg|lbs?|cm|delta|leaner|bigger|smaller)\b|%|—/i,
    );
  });

  test('panes decode at explicit bounded dimensions with resize downscaling', async () => {
    const tree = await render();
    await enterSelection(tree);
    await pressTile(tree, OLD);
    await pressTile(tree, NEW);
    await openCompare(tree);

    const imgs = modalImages(tree);
    expect(imgs).toHaveLength(2);
    for (const img of imgs) {
      const s = flatStyle(img.props.style);
      // Bounded numbers, never unbounded/percentage: the mock window is
      // 375x812, so each half-width pane must sit inside it.
      expect(Number.isFinite(s.width)).toBe(true);
      expect(Number.isFinite(s.height)).toBe(true);
      expect(s.width).toBeGreaterThan(0);
      expect(s.width).toBeLessThanOrEqual(375 / 2);
      expect(s.height).toBeLessThanOrEqual(812 * 0.6);
      expect(img.props.resizeMode).toBe('contain');
      expect(img.props.resizeMethod).toBe('resize');
    }
  });

  test('a failed photo load logs ProgressPhotos.compare and shows the calm fallback', async () => {
    const tree = await render();
    await enterSelection(tree);
    await pressTile(tree, OLD);
    await pressTile(tree, NEW);
    await openCompare(tree);

    const [older] = modalImages(tree);
    await act(async () => { older.props.onError(); });

    expect(logError).toHaveBeenCalledWith(
      'ProgressPhotos.compare', expect.any(Error), { name: OLD.name },
    );
    expect(modalTexts(tree)).toContain('Could not load this photo.');
    expect(modalImages(tree)).toHaveLength(1); // the later photo still shows
  });

  test('reduce motion collapses the modal animation', async () => {
    const still = await render([NEW, OLD], { reduceMotion: true });
    expect(modalNode(still).props.animationType).toBe('none');
    const moving = await render([NEW, OLD], { reduceMotion: false });
    expect(moving && modalNode(moving).props.animationType).toBe('fade');
  });
});

describe('ProgressPhotosScreen compare, wellbeing gate unchanged', () => {
  test('calm-mode note keeps its exact pre-compare wording, with the feature present', async () => {
    const tree = await render([NEW, OLD], { mode: 'calm' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain(
      'Private to this device. Not synced, not shared. Use these only if they help you, and skip them if they do not.',
    );
    expect(findPressable(tree, 'Compare two photos')).toBeDefined();
  });

  test('normal mode keeps the short privacy note', async () => {
    const tree = await render([NEW, OLD], { mode: 'normal' });
    expect(flattenText(tree.toJSON())).toContain('Private to this device. Not synced, not shared.');
  });
});
