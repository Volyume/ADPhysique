/**
 * ProgressPhotoCompare (B2) invariants. Pins, against the real component:
 *   - the calm DEFAULT is the two-up side-by-side view, rendering the pair
 *     OLDER-LEFT / NEWER-RIGHT with their date labels;
 *   - the ED-safety copy contract holds across ALL THREE modes and the
 *     selection bar: the only body-adjacent words are the neutral labels
 *     "Earlier" / "Later" plus dates, and NONE of the banned vocabulary
 *     (before, after, change, gained, lost, weight, kg, lbs, cm, delta,
 *     leaner, bigger, smaller, a percent sign, or an em dash) appears
 *     anywhere. This is the SAME regex the legacy inline compare modal is
 *     held to (ProgressPhotosScreen.compare.test.js), extended to this
 *     component so the contract cannot be lost in the migration;
 *   - the slider mode exposes an adjustable a11y control;
 *   - when usePhotoSuppression() is true the surface is a calm placeholder,
 *     never a comparison (the fail-closed double-guard, E1 PART 2).
 */
import { create, act } from 'react-test-renderer';

// Skia is a native canvas; stub it so the overlay mode mounts in node.
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Image: 'SkiaImage',
  useImage: () => null,
}));

// gesture-handler's native recogniser cannot be driven from react-test-
// renderer; a light stub lets the GestureDetector children render and the
// Gesture builders chain without a native bridge.
jest.mock('react-native-gesture-handler', () => {
  const makeGesture = () => {
    const g = {};
    ['onStart', 'onUpdate', 'onEnd', 'onChange', 'enabled'].forEach((k) => { g[k] = () => g; });
    return g;
  };
  return {
    GestureDetector: ({ children }) => children,
    Gesture: { Pan: makeGesture, Pinch: makeGesture, Fling: makeGesture, Simultaneous: () => makeGesture() },
  };
});

jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));
jest.mock('../../lib/progressPhotoMeta', () => ({
  getPhotoMetaMap: jest.fn(async (names) => {
    const map = {};
    for (const n of names) map[n] = { name: n, takenAt: parseInt(n, 10), pose: null, weightKg: null, note: null };
    return map;
  }),
}));

import useAppStore from '../../store/useAppStore';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import { getPhotoMetaMap } from '../../lib/progressPhotoMeta';
import ProgressPhotoCompare from '../ProgressPhotoCompare';

// The exact ban the legacy compare modal is held to (A1 section 3).
const BANNED = /\b(before|after|change[ds]?|progress made|gained?|lost|weight|kg|lbs?|cm|delta|leaner|bigger|smaller)\b|%|—/i;

const fmt = (ts) => new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

const mk = (y, m, d) => {
  const ts = new Date(y, m - 1, d).getTime();
  return { name: `${ts}.jpg`, uri: `file:///photos/${ts}.jpg`, ts };
};
// getPhotoMetaMap parses takenAt from the filename via parseInt, so takenAt
// equals ts here; the component orders by takenAt.
const OLD = mk(2026, 1, 5);
const MID = mk(2026, 3, 10);
const NEW = mk(2026, 6, 20);

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}

async function render(photos = [NEW, MID, OLD], { reduceMotion = false, suppressed = false } = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion } }));
  usePhotoSuppression.mockReturnValue(suppressed);
  let tree;
  await act(async () => { tree = create(<ProgressPhotoCompare photos={photos} onClose={jest.fn()} />); });
  await flush();
  return tree;
}

function findByLabel(tree, label) {
  return tree.root.findAll((n) => typeof n.type === 'string'
    && n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function')[0];
}

async function press(tree, label) {
  const node = findByLabel(tree, label);
  if (!node) throw new Error(`No pressable labelled "${label}"`);
  await act(async () => { node.props.onPress(); });
}

function allTexts(tree) {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((t) => flattenText(t.props.children));
}

function allLabels(tree) {
  return tree.root
    .findAll((n) => typeof n.props?.accessibilityLabel === 'string')
    .map((n) => n.props.accessibilityLabel);
}

function paneImages(tree) {
  return tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Image'
    && typeof n.props?.accessibilityLabel === 'string'
    && /photo, /.test(n.props.accessibilityLabel));
}

beforeEach(() => {
  getPhotoMetaMap.mockImplementation(async (names) => {
    const map = {};
    for (const n of names) map[n] = { name: n, takenAt: parseInt(n, 10), pose: null, weightKg: null, note: null };
    return map;
  });
});

afterEach(() => jest.clearAllMocks());

describe('ProgressPhotoCompare, calm default', () => {
  test('defaults to the two-up view, older-left / newer-right with dates', async () => {
    const tree = await render();
    const imgs = paneImages(tree);
    expect(imgs).toHaveLength(2);
    // Older on the left, newer on the right, regardless of input order.
    expect(imgs.map((i) => i.props.source.uri)).toEqual([OLD.uri, NEW.uri]);
    expect(imgs.map((i) => i.props.accessibilityLabel)).toEqual([
      `Earlier photo, ${fmt(OLD.ts)}`,
      `Later photo, ${fmt(NEW.ts)}`,
    ]);
    // The dates and neutral role labels are on screen.
    const texts = allTexts(tree);
    expect(texts).toContain('Earlier');
    expect(texts).toContain('Later');
    expect(texts).toContain(fmt(OLD.ts));
    expect(texts).toContain(fmt(NEW.ts));
  });

  test('panes decode at explicit bounded dimensions with resize downscaling', async () => {
    const tree = await render();
    for (const img of paneImages(tree)) {
      const s = Array.isArray(img.props.style)
        ? Object.assign({}, ...img.props.style.filter(Boolean))
        : img.props.style;
      expect(Number.isFinite(s.width)).toBe(true);
      expect(Number.isFinite(s.height)).toBe(true);
      expect(s.width).toBeGreaterThan(0);
      expect(s.width).toBeLessThanOrEqual(375 / 2);
      expect(s.height).toBeLessThanOrEqual(812 * 0.6);
      expect(img.props.resizeMode).toBe('contain');
      expect(img.props.resizeMethod).toBe('resize');
    }
  });

  test('surfaces a neutral setup status for same-pose pairs', async () => {
    getPhotoMetaMap.mockImplementation(async (names) => {
      const map = {};
      for (const n of names) {
        const ts = parseInt(n, 10);
        map[n] = { name: n, takenAt: ts, pose: n === MID.name ? 'side' : 'front', weightKg: null, note: null };
      }
      return map;
    });
    const tree = await render();
    const texts = allTexts(tree);
    expect(texts).toContain('Pose match');
    expect(texts).toContain('Front photos on both dates. Alignment is easier to read.');
  });
});

describe('ProgressPhotoCompare, ED-safety copy ban', () => {
  test('no banned vocabulary in the two-up default (with the selection bar)', async () => {
    const tree = await render();
    const copy = [...allTexts(tree), ...allLabels(tree)].join(' ');
    expect(copy).not.toMatch(BANNED);
  });

  test('no banned vocabulary in slider mode', async () => {
    const tree = await render();
    await press(tree, 'Slider');
    const copy = [...allTexts(tree), ...allLabels(tree)].join(' ');
    expect(copy).not.toMatch(BANNED);
  });

  test('no banned vocabulary in overlay mode', async () => {
    const tree = await render();
    await press(tree, 'Overlay');
    const copy = [...allTexts(tree), ...allLabels(tree)].join(' ');
    expect(copy).not.toMatch(BANNED);
  });

  test('the quick actions and pose filter carry no banned vocabulary', async () => {
    const tree = await render();
    const labels = allLabels(tree).join(' ');
    // Sanity: the neutral time-relative action exists and is still clean.
    expect(labels).toMatch(/Latest and \d+ weeks? back/);
    expect(labels).toContain('Earliest and latest');
    expect(labels).not.toMatch(BANNED);
  });
});

describe('ProgressPhotoCompare, slider accessibility', () => {
  test('slider mode exposes an adjustable control', async () => {
    const tree = await render();
    await press(tree, 'Slider');
    const adjustable = tree.root.findAll((n) => n.props?.accessibilityRole === 'adjustable');
    expect(adjustable.length).toBeGreaterThanOrEqual(1);
    const handle = tree.root.findAll((n) => n.props?.accessibilityRole === 'adjustable'
      && n.props?.accessibilityLabel === 'Reveal slider')[0];
    expect(handle).toBeDefined();
    expect(handle.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 50 });
  });
});

describe('ProgressPhotoCompare, suppression self-guard', () => {
  test('suppressed renders a calm placeholder, never a comparison', async () => {
    const tree = await render([NEW, MID, OLD], { suppressed: true });
    expect(flattenText(tree.toJSON())).toContain('Comparing is resting for now.');
    // No comparison surface: no pane images, no mode switch, no adjustable.
    expect(paneImages(tree)).toHaveLength(0);
    expect(findByLabel(tree, 'Slider')).toBeUndefined();
    expect(tree.root.findAll((n) => n.props?.accessibilityRole === 'adjustable')).toHaveLength(0);
    // The copy ban holds on the placeholder too.
    expect([...allTexts(tree), ...allLabels(tree)].join(' ')).not.toMatch(BANNED);
  });

  test('the close affordance is present in both states', async () => {
    const open = await render();
    expect(findByLabel(open, 'Close compare')).toBeDefined();
    const guarded = await render([NEW, OLD], { suppressed: true });
    expect(findByLabel(guarded, 'Close compare')).toBeDefined();
  });
});
