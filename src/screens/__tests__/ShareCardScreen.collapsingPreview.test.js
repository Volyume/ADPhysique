/**
 * ShareCardScreen: the collapsing preview, brought back (founder,
 * 2026-10-16: "Ok yes I want the collapsing preview"; D229 addendum 5 item
 * 8, as rebuilt by the fresh-eyes review of 2026-10-15, should-fix 7, in
 * 161acbb, and lost when the screen was restored from 77f530b).
 *
 * The preview is ONE header above the page, the first thing on the screen,
 * and shrinks on the UI thread as the page scrolls, so nothing floats over
 * the controls. Every preview state lives in that header and shrinks with
 * it: the still image, the photo framer, the playing preview video, the
 * Play/Pause control, the "Making your preview" row, the error box and the
 * spinner.
 *
 * Pinned, written to FAIL against the restored screen (where the preview was
 * a section half way down the page):
 *   1. the header is above the scroll and the page opens on the Format row;
 *   2. the header's height and the card's scale follow the scroll position
 *      1:1 (lead ruling 2026-10-16, the standard collapsing-header layout):
 *      the header lies over the top of the page, the page's content starts
 *      with the FULL header height as its top padding, and at scroll y the
 *      header is max(small, full - y) tall, so its foot stays on the
 *      content's top edge; a pull past the top never makes it taller; driven
 *      by a shared value, an animated scroll handler and animated styles
 *      (the UI thread), never JS-thread Animated;
 *   3. every preview state renders inside the header, none in the page;
 *   4. the framer takes touches at full size and none at the small size,
 *      and a drag on it still blocks the page's scroll gesture;
 *   5. the Play/Pause control and the "Making your preview" row are HIDDEN
 *      at the small size (the small preview is one target, "Back to the
 *      preview") and back at full size; a playing video keeps playing small;
 *   6. a tap on the small preview scrolls the page back to the top, animated
 *      unless Reduce Motion is on, read as Volyume's own setting OR the
 *      phone's;
 *   6b. at the small size, while a preview or the video is made, a compact
 *      progress chip over the small card says so (no touches, a polite live
 *      region), so a greyed Share and Save always has a visible reason;
 *   7. no live Skia view in the header (Sentry VOLYUME-3M), and under calm
 *      mode or an open flag the header carries no video surface.
 *
 * Mock scaffold mirrors ShareCardScreen.video.test.js; Reanimated's scroll
 * handler and reaction are made to run here (as the 161acbb suite did), so
 * the shrink can be driven and read.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const fs = require('fs');
const path = require('path');
const SectionLabel = require('../../components/SectionLabel').default;

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn().mockResolvedValue(true), shareAsync: jest.fn() }));
jest.mock('expo-media-library', () => ({ requestPermissionsAsync: jest.fn(), saveToLibraryAsync: jest.fn() }));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(), impactAsync: jest.fn(), notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/', EncodingType: { Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined), readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(), requestMediaLibraryPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../../lib/shareCard/wordmarkImage', () => ({ loadWordmarkImage: jest.fn().mockResolvedValue(null) }));
jest.mock('react-native-safe-area-context', () => {
  const mockReact = require('react');
  const pass = (name) => mockReact.forwardRef((props, ref) => mockReact.createElement(name, { ...props, ref }, props.children));
  return {
    SafeAreaView: pass('SafeAreaView'),
    SafeAreaProvider: pass('SafeAreaProvider'),
    SafeAreaInsetsContext: mockReact.createContext({ top: 48, bottom: 24, left: 0, right: 0 }),
    useSafeAreaInsets: () => ({ top: 48, bottom: 24, left: 0, right: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  };
});
// The phone's own Reduce Motion, which the manual react-native mock lacks
// (set on the module, as Toast.test.js does).
const mockA11y = { isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)) };
require('react-native').AccessibilityInfo = mockA11y;
// A render that can be made to fail (the error box) or succeed.
const mockSkiaState = { snapshotOk: true };
const FAKE_IMG = { width: () => 800, height: () => 600, encodeToBase64: () => 'AAAA', dispose: () => {} };
const FAKE_FRAME = { width: () => 1080, height: () => 1920, encodeToBase64: () => 'BBBB', dispose: () => {} };
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Surface: {
      MakeOffscreen: () => ({
        getCanvas: () => ({ drawImageRect: () => {} }),
        flush: () => {},
        makeImageSnapshot: () => (mockSkiaState.snapshotOk ? { encodeToBase64: () => 'AAAA' } : null),
      }),
    },
    Data: { fromBase64: () => ({}) },
    Image: { MakeImageFromEncoded: () => FAKE_IMG },
    Paint: () => ({ setAntiAlias: () => {}, setColorFilter: () => {} }),
    ColorFilter: { MakeMatrix: (m) => ({ m }) },
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
  },
  matchFont: () => ({ getTypeface: () => ({}) }),
}));
jest.mock('../../lib/shareCard/drawShareCard', () => {
  const actual = jest.requireActual('../../lib/shareCard/drawShareCard');
  return {
    ...actual, drawShareCard: jest.fn(), cardHeight: (w) => (w === 1080 ? 1921 : 1080), drawSticker: jest.fn(), stickerHeight: () => 1080,
    sessionLiftsThatFit: jest.fn(({ lifts }) => lifts.length),
  };
});
jest.mock('../../lib/shareCard/greatWeek', () => ({ buildWeeklyRecapParams: () => ({}) }));
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));
const mockSuppress = { value: false };
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: () => mockSuppress.value }));
const mockEngine = {
  isAvailable: jest.fn(() => true),
  probeVideo: jest.fn(() => Promise.resolve({ durationMs: 9000, width: 1920, height: 1080 })),
  exportShareVideo: jest.fn(() => Promise.resolve({ uri: 'file:///cache/volyume-preview.mp4' })),
  cancelExport: jest.fn(() => Promise.resolve()),
  setLockScreenWallpaper: jest.fn(() => Promise.resolve()),
  lineForExportError: jest.fn(() => "Couldn't make the video. Try again."),
  EXPORT_ERROR: { UNAVAILABLE: 'unavailable', CANCELLED: 'cancelled', DECODE: 'decode_failed' },
};
jest.mock('../../lib/shareVideo/engine', () => mockEngine);
jest.mock('../../components/share/VideoTrimBar', () => {
  const mockReact = require('react');
  return { __esModule: true, default: (props) => mockReact.createElement('VideoTrimBar', props) };
});
jest.mock('expo-av', () => ({ Video: 'Video', ResizeMode: { CONTAIN: 'contain' } }));
// The frame source is ASYNC (the native lane's contract, 2026-10-16).
jest.mock('../../lib/shareVideo/videoFrame', () => ({
  grabVideoFrame: (_Skia, _uri, ms) => Promise.resolve({ image: FAKE_FRAME, width: 1080, height: 1920, durationMs: 12000, ms }),
  videoThumbnailUri: () => Promise.resolve('file:///cache/share-frames/thumb.jpg'),
  videoStripUris: (_uri, _d, count) => Promise.resolve(Array.from({ length: count }, () => null)),
}));
const mockGetClip = jest.fn();
jest.mock('../../lib/clips/store', () => ({
  getClip: (...args) => mockGetClip(...args),
  listClipsForWorkout: jest.fn(() => Promise.resolve([])),
  countClipsForWorkout: jest.fn(() => Promise.resolve(0)),
  subscribeClips: () => () => {},
}));
jest.mock('../../components/clips/useClipRecorder', () => ({
  __esModule: true,
  default: () => ({ count: 0, clips: [], refreshCount: jest.fn(), openRecorder: jest.fn(), openClips: jest.fn(), sheets: null }),
}));
// Reanimated, made to run: the scroll handler's worklet is called with the
// event, shared values are boxes kept across renders, the reaction runs after
// a render when its value changed (as on the UI thread), animated styles are
// their updater's result, and interpolate is the real clamped linear map.
// The ScrollView forwards its ref, so the scroll back to the top is seen.
jest.mock('react-native-reanimated', () => {
  const manual = jest.requireActual('../../../__mocks__/react-native-reanimated');
  const mockReact = require('react');
  const lerp = (x, [a, b], [p, q]) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return p + (q - p) * t;
  };
  const ScrollView = mockReact.forwardRef((props, ref) => mockReact.createElement('Animated.ScrollView', { ...props, ref }, props.children));
  return {
    ...manual,
    default: { ...manual.default, ScrollView },
    ScrollView,
    useSharedValue: (v) => mockReact.useRef({ value: v }).current,
    useAnimatedScrollHandler: (handlers) => (e) => handlers.onScroll(e.nativeEvent || e),
    useAnimatedReaction: (prepare, react) => {
      const prev = mockReact.useRef(undefined);
      const value = prepare();
      mockReact.useEffect(() => {
        if (value !== prev.current) { const was = prev.current; prev.current = value; react(value, was); }
      });
    },
    useAnimatedStyle: (updater) => updater(),
    interpolate: lerp,
  };
});

const ShareCardScreen = require('../ShareCardScreen').default;
const useAppStore = require('../../store/useAppStore').default;

const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');
// The header's JSX (drawn after the page, over its top) and the page's.
const HEADER_SRC = SCREEN.slice(SCREEN.indexOf('testID="share-preview-header"'), SCREEN.indexOf('{/* The top-lifts list'));
const PAGE_SRC = SCREEN.slice(SCREEN.indexOf('<GestureDetector gesture={scrollGesture}>\n      <Animated.ScrollView'), SCREEN.indexOf('</Animated.ScrollView>'));
const FULL_H = 1080; // cardHeight at the preview's width, mocked
const MINI_H = 112;
const PAD = 8; // PREVIEW_HEADER_PAD, spacing.sm, above and below the card
const HEADER_FULL = FULL_H + 2 * PAD;
const HEADER_MINI = MINI_H + 2 * PAD;
const headerAt = (y) => Math.max(HEADER_MINI, HEADER_FULL - Math.max(0, y));

// Settles every chain the screen starts: choosing a video awaits its
// frame, its probe and the frame file, each a promise resolved through the
// mocks, so several rounds are run, each ending on the macrotask queue.
async function flush() {
  for (let round = 0; round < 6; round++) {
    // eslint-disable-next-line no-await-in-loop
    await TestRenderer.act(async () => {
      for (let i = 0; i < 6; i++) await Promise.resolve();
      await new Promise((r) => setImmediate(r));
    });
  }
}
function makeNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn(), addListener: jest.fn(() => () => {}) };
}
// The screen, with a way to render it again: on the phone the UI thread
// redraws the header from the shared value as the finger moves; here a
// scroll sets the value and the next render reads it.
const rerenders = new WeakMap();
const scrollTo = jest.fn();
async function mount(params) {
  let tree = null;
  const navigation = makeNavigation();
  const render = () => React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' }, navigation });
  const createNodeMock = (el) => (el.type === 'Animated.ScrollView' ? { scrollTo } : null);
  await TestRenderer.act(async () => { tree = TestRenderer.create(render(), { createNodeMock }); });
  await flush();
  rerenders.set(tree, async () => { await TestRenderer.act(async () => { tree.update(render()); }); await flush(); });
  return tree;
}
async function waitFor(predicate, rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (predicate()) return;
    // eslint-disable-next-line no-await-in-loop
    await flush();
  }
  expect(predicate()).toBe(true);
}
async function press(node) {
  await TestRenderer.act(async () => { node.props.onPress(); });
  await flush();
}

const SESSION = {
  sessionData: { sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, prCount: 0, units: 'kg' },
  workoutId: 'w1',
};
const CLIP_SET = {
  id: 'c2', uri: 'file:///docs/clips/c2.mp4', exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3,
  durationMs: 12000, width: 1080, height: 1920, createdAt: 20, source: 'workout',
};

const host = (n) => typeof n.type === 'string';
const byTestID = (root, id) => root.findAll((n) => host(n) && n.props.testID === id);
const header = (tree) => byTestID(tree.root, 'share-preview-header')[0];
const card = (tree) => byTestID(tree.root, 'share-preview-card')[0];
const page = (tree) => tree.root.findAll((n) => n.type === 'Animated.ScrollView')[0];
const headings = (tree) => tree.root.findAll((n) => n.type === SectionLabel).map((n) => n.props.children);
const byLabel = (root, label) => root.findAll((n) => host(n) && n.props.accessibilityLabel === label);
const backButtons = (tree) => byLabel(tree.root, 'Back to the preview');
const stills = (root) => root.findAll((n) => host(n) && n.type === 'Image' && n.props.resizeMode === 'contain');
const framers = (root) => root.findAll((n) => n.type && n.type.name === 'SharePhotoFramer');
const players = (root) => root.findAll((n) => n.type === 'Video');
const flatStyle = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));
async function scroll(tree, y) {
  await TestRenderer.act(async () => { page(tree).props.onScroll({ nativeEvent: { contentOffset: { y } } }); });
  await rerenders.get(tree)();
}
async function mountWithVideo() {
  mockGetClip.mockResolvedValue(CLIP_SET);
  const tree = await mount({ ...SESSION, clipId: 'c2' });
  await waitFor(() => framers(card(tree)).length === 1);
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  scrollTo.mockClear();
  mockSkiaState.snapshotOk = true;
  mockSuppress.value = false;
  mockGetClip.mockResolvedValue(null);
  mockA11y.isReduceMotionEnabled.mockImplementation(() => Promise.resolve(false));
  mockEngine.isAvailable.mockImplementation(() => true);
  mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/volyume-preview.mp4' }));
  useAppStore.setState({ user: { id: 'u1' }, accessibility: { ...useAppStore.getState().accessibility, reduceMotion: false } });
});

describe('the preview is the header above the page, and it collapses as the page scrolls', () => {
  test('it is above the scroll, the first thing on the screen, and the page opens on the Format row', async () => {
    const tree = await mount(SESSION);
    expect(header(tree)).toBeTruthy();
    expect(page(tree).findAll((n) => host(n) && n.props.testID === 'share-preview-header')).toHaveLength(0);
    // It lies over the top of the page, which starts below it at full size.
    expect(flatStyle(header(tree).props.style)).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0 });
    expect(flatStyle(page(tree).props.contentContainerStyle).paddingTop).toBe(HEADER_FULL);
    expect(headings(tree)[0]).toBe('Format');
    expect(headings(tree)).not.toContain('Preview');
    // One preview: the still is drawn once, in the header, not in the page.
    await waitFor(() => stills(tree.root).length === 1);
    expect(stills(header(tree))).toHaveLength(1);
    expect(stills(page(tree))).toHaveLength(0);
  });

  test('the header\'s height follows the scroll 1:1: max(small, full - y), its foot on the content\'s top edge, full again at the top', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => stills(tree.root).length === 1);
    const padTop = flatStyle(page(tree).props.contentContainerStyle).paddingTop;
    expect(padTop).toBe(HEADER_FULL);
    expect(flatStyle(header(tree).props.style).height).toBe(HEADER_FULL);
    expect(flatStyle(card(tree).props.style).transform).toEqual([{ translateY: -0 }, { scale: 1 }]);
    expect(card(tree).props.pointerEvents).toBe('auto');
    expect(backButtons(tree)).toHaveLength(0);

    // 1:1 at every step: the header's foot is where the content's top edge
    // now is (padTop - y), until the header is small.
    for (const y of [1, 100, ((FULL_H - MINI_H) / 2) - 10, FULL_H - MINI_H, 2000]) {
      // eslint-disable-next-line no-await-in-loop
      await scroll(tree, y);
      const h = flatStyle(header(tree).props.style).height;
      expect({ y, h }).toEqual({ y, h: expect.closeTo(headerAt(y), 5) });
      if (y <= FULL_H - MINI_H) expect(h).toBeCloseTo(padTop - y, 5);
      // The card scales with the header.
      expect(flatStyle(card(tree).props.style).transform[1].scale).toBeCloseTo((h - 2 * PAD) / FULL_H, 5);
    }
    // Just short of half way it still takes the full-size card's touches.
    await scroll(tree, ((FULL_H - MINI_H) / 2) - 10);
    expect(card(tree).props.pointerEvents).toBe('auto');
    expect(backButtons(tree)).toHaveLength(0);

    // Past the threshold and on: the small size, and it holds.
    await scroll(tree, 5000);
    expect(flatStyle(header(tree).props.style).height).toBe(HEADER_MINI);
    const t = flatStyle(card(tree).props.style).transform;
    expect(t[1].scale).toBeCloseTo(MINI_H / FULL_H, 5);
    expect(t[0].translateY).toBeCloseTo(-(FULL_H - MINI_H) / 2, 5);
    expect(card(tree).props.pointerEvents).toBe('none');
    expect(card(tree).props.importantForAccessibility).toBe('no-hide-descendants');
    expect(backButtons(tree)).toHaveLength(1);

    await scroll(tree, 0);
    expect(flatStyle(header(tree).props.style).height).toBe(HEADER_FULL);
    expect(flatStyle(card(tree).props.style).transform).toEqual([{ translateY: -0 }, { scale: 1 }]);
    expect(card(tree).props.pointerEvents).toBe('auto');
    expect(backButtons(tree)).toHaveLength(0);
  });

  test('a pull past the top (iOS bounce) never makes the header taller than full', async () => {
    const tree = await mount(SESSION);
    await scroll(tree, -120);
    expect(flatStyle(header(tree).props.style).height).toBe(HEADER_FULL);
    expect(flatStyle(card(tree).props.style).transform).toEqual([{ translateY: -0 }, { scale: 1 }]);
  });

  test('the header is opaque (the theme\'s surface), so the page scrolling under it never shows through', async () => {
    const tree = await mount(SESSION);
    const bg = flatStyle(header(tree).props.style).backgroundColor;
    expect(typeof bg).toBe('string');
    expect(bg).toBe(require('../../styles/theme').colors.surface);
  });

  test('the shrink is driven on the UI thread by the scroll, with one named small height', () => {
    expect(SCREEN).toContain('const MINI_PREVIEW_H = 112;');
    expect(SCREEN).toMatch(/const collapse = useSharedValue\(0\);/);
    expect(SCREEN).toMatch(/useAnimatedScrollHandler\(\{\s*onScroll: \(e\) => \{\s*'worklet';/);
    expect(SCREEN).toMatch(/useAnimatedReaction\(\(\) => collapse\.value > 0\.5,/);
    expect(SCREEN).toContain('const collapseRange = Math.max(1, previewH - miniH);');
    expect(SCREEN).toContain('const headerFullH = previewH + 2 * PREVIEW_HEADER_PAD;');
    expect(SCREEN).toMatch(/height: interpolate\(collapse\.value, \[0, 1\], \[headerFullH, headerMiniH\], Extrapolation\.CLAMP\)/);
    expect(SCREEN).toContain('contentContainerStyle={[styles.content, live.content, { paddingTop: headerFullH }]}');
    expect(SCREEN).toMatch(/<Animated\.ScrollView\s+ref=\{scrollRef\}[\s\S]*?onScroll=\{scrollHandler\}\s+scrollEventThrottle=\{16\}/);
    // No JS-thread Animated here (motionFitRules.guard's frozen allowlist).
    expect(SCREEN).not.toMatch(/import\s*\{[^}]*\bAnimated\b[^}]*\}\s*from\s*['"]react-native['"]/);
    expect(SCREEN).toMatch(/import Animated, \{[\s\S]*?\} from 'react-native-reanimated';/);
  });
});

describe('every preview state is in the header and shrinks with it', () => {
  test('source: the player, the framer, the still, the error box, the spinner, Play/Pause and the making row are in the header; none is in the page', () => {
    const headerBlock = HEADER_SRC;
    const pageBlock = PAGE_SRC;
    for (const piece of [
      '<AvVideo', '<SharePhotoFramer', 'data:image/png;base64,${previewB64}', 'Retry building the preview',
      '<ActivityIndicator color={t.colors.primary} />', "'Play the video'", 'testID="share-making-preview"',
    ]) {
      expect({ piece, inHeader: headerBlock.includes(piece) }).toEqual({ piece, inHeader: true });
    }
    for (const piece of ['<AvVideo', '<SharePhotoFramer', 'data:image/png;base64,${previewB64}', 'Retry building the preview', "'Play the video'", 'share-making-preview']) {
      expect({ piece, inPage: pageBlock.includes(piece) }).toEqual({ piece, inPage: false });
    }
    // The trim bar and the hints stay in the page and scroll.
    expect(pageBlock).toContain('<VideoTrimBar');
    expect(pageBlock).toContain('Drag to move your photo. Pinch to resize it.');
    expect(headerBlock).not.toContain('<VideoTrimBar');
  });

  test('the still image shrinks with the header', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => stills(card(tree)).length === 1);
    await scroll(tree, 5000);
    expect(stills(card(tree))).toHaveLength(1);
  });

  test('the error box is in the header, its Retry works at full size, and at the small size it takes no touches', async () => {
    mockSkiaState.snapshotOk = false;
    const tree = await mount(SESSION);
    await waitFor(() => byLabel(card(tree), 'Retry building the preview').length > 0);
    expect(byLabel(page(tree), 'Retry building the preview')).toHaveLength(0);
    await scroll(tree, 5000);
    expect(byLabel(card(tree), 'Retry building the preview').length).toBeGreaterThan(0);
    expect(card(tree).props.pointerEvents).toBe('none');
    await scroll(tree, 0);
    mockSkiaState.snapshotOk = true;
    const retry = card(tree).findAll((n) => n.props && n.props.accessibilityLabel === 'Retry building the preview' && typeof n.props.onPress === 'function')[0];
    await press(retry);
    expect(byLabel(tree.root, 'Retry building the preview')).toHaveLength(0);
    expect(stills(card(tree))).toHaveLength(1);
  });

  test('the spinner while the preview is built is the header\'s card', async () => {
    // Skia absent at render time is not mockable per test; the spinner is the
    // card's last branch, so its place is pinned in the source.
    const cardBlock = SCREEN.slice(SCREEN.indexOf('testID="share-preview-card"'), SCREEN.indexOf('{previewSmall ? (\n          <TouchableOpacity'));
    expect(cardBlock).toMatch(/\) : \(\s*<View style=\{\[styles\.previewPlaceholder, live\.previewPlaceholder, \{ width: previewW, height: previewH \}\]\}>\s*<ActivityIndicator/);
  });
});

describe('the framer at full size and at the small size', () => {
  test('the framer is in the header: it takes touches at full size and none at the small size, and a drag on it blocks the page scroll', async () => {
    const tree = await mountWithVideo();
    const framer = framers(card(tree))[0];
    expect(framers(page(tree))).toHaveLength(0);
    expect(card(tree).props.pointerEvents).toBe('auto');
    expect(typeof framer.props.onChange).toBe('function');
    // It blocks the page's scroll gesture (the mocked gestures are one stub,
    // so which gesture is pinned in the source): the page is the scroll the
    // gesture system knows, and the framer is not inside it.
    expect(framer.props.blocksGesture).toBeTruthy();
    const pageDetector = tree.root.findAll((n) => host(n) && n.type === 'GestureDetector'
      && n.findAll((m) => m.type === 'Animated.ScrollView').length > 0)[0];
    expect(pageDetector).toBeTruthy();
    expect(framers(pageDetector)).toHaveLength(0);
    const headerBlock = HEADER_SRC;
    expect(headerBlock).toMatch(/<SharePhotoFramer[\s\S]*?blocksGesture=\{scrollGesture\}/);
    expect(SCREEN).toMatch(/pointerEvents=\{previewSmall \? 'none' : 'auto'\}/);

    await scroll(tree, 5000);
    expect(framers(card(tree))).toHaveLength(1);
    expect(card(tree).props.pointerEvents).toBe('none');
    await scroll(tree, 0);
    expect(card(tree).props.pointerEvents).toBe('auto');
  });
});

describe('Play/Pause and the making row at the small size: hidden, and back at full size', () => {
  test('Play is over the preview at full size, hidden at the small size, and back at the top', async () => {
    const tree = await mountWithVideo();
    expect(byLabel(card(tree), 'Play the video')).toHaveLength(1);
    await scroll(tree, 5000);
    expect(byLabel(tree.root, 'Play the video')).toHaveLength(0);
    expect(byLabel(tree.root, 'Pause the video')).toHaveLength(0);
    await scroll(tree, 0);
    expect(byLabel(card(tree), 'Play the video')).toHaveLength(1);
  });

  test('a playing video is in the header and keeps playing small; Pause is hidden there and back at the top', async () => {
    const tree = await mountWithVideo();
    await press(byLabel(card(tree), 'Play the video')[0]);
    expect(players(card(tree))).toHaveLength(1);
    expect(byLabel(card(tree), 'Pause the video')).toHaveLength(1);
    await scroll(tree, 5000);
    expect(players(card(tree))).toHaveLength(1);
    expect(byTestID(card(tree), 'share-preview-video')).toHaveLength(1);
    expect(byLabel(tree.root, 'Pause the video')).toHaveLength(0);
    expect(card(tree).props.pointerEvents).toBe('none');
    await scroll(tree, 0);
    expect(byLabel(card(tree), 'Pause the video')).toHaveLength(1);
  });

  test('the "Making your preview" row is over the preview at full size, hidden at the small size, and back at the top', async () => {
    mockEngine.exportShareVideo.mockImplementation(() => new Promise(() => {}));
    const tree = await mountWithVideo();
    await press(byLabel(card(tree), 'Play the video')[0]);
    expect(byTestID(card(tree), 'share-making-preview').length).toBeGreaterThan(0);
    await scroll(tree, 5000);
    expect(byTestID(tree.root, 'share-making-preview')).toHaveLength(0);
    await scroll(tree, 0);
    expect(byTestID(card(tree), 'share-making-preview').length).toBeGreaterThan(0);
  });
});

describe('the small preview says when something is being made', () => {
  const chip = (tree) => byTestID(header(tree), 'share-mini-progress');
  test('a preview being made: at full size the making row; small, a compact chip with the percentage, no touches, a polite live region', async () => {
    mockEngine.exportShareVideo.mockImplementation((_o, onProgress) => { onProgress(0.42); return new Promise(() => {}); });
    const tree = await mountWithVideo();
    await press(byLabel(card(tree), 'Play the video')[0]);
    expect(chip(tree)).toHaveLength(0);
    await scroll(tree, 5000);
    expect(chip(tree)).toHaveLength(1);
    const c = chip(tree)[0];
    expect(c.props.accessibilityLabel).toBe('Making your preview, 42%');
    expect(c.props.accessibilityLiveRegion).toBe('polite');
    expect(c.findAll((n) => host(n) && n.type === 'ActivityIndicator')).toHaveLength(1);
    expect(c.findAll((n) => host(n) && n.type === 'Text').map((n) => [].concat(n.props.children).join(''))).toEqual(['42%']);
    // It takes no touches: the tap is still "Back to the preview".
    const wrap = header(tree).findAll((n) => host(n) && n.props.pointerEvents === 'none' && n.findAll((m) => m === c).length > 0);
    expect(wrap.length).toBeGreaterThan(0);
    expect(backButtons(tree)).toHaveLength(1);
    // Not scaled with the card: it is outside it.
    expect(card(tree).findAll((n) => host(n) && n.props.testID === 'share-mini-progress')).toHaveLength(0);
    await scroll(tree, 0);
    expect(chip(tree)).toHaveLength(0);
    expect(byTestID(card(tree), 'share-making-preview').length).toBeGreaterThan(0);
  });

  test('the share video being made: small, the chip reads "Making your video, N%"; the full-size row and Cancel stay in the page', async () => {
    mockEngine.exportShareVideo.mockImplementation((_o, onProgress) => { onProgress(0.3); return new Promise(() => {}); });
    const tree = await mountWithVideo();
    const share = tree.root.findAll((n) => host(n) && n.props.accessibilityLabel === 'Share your video to Instagram or Facebook Story')[0];
    await press(share);
    expect(byTestID(page(tree), 'share-making-video').length).toBeGreaterThan(0);
    expect(chip(tree)).toHaveLength(0);
    await scroll(tree, 5000);
    expect(chip(tree)[0].props.accessibilityLabel).toBe('Making your video, 30%');
    expect(byTestID(page(tree), 'share-making-video').length).toBeGreaterThan(0);
  });

  test('nothing being made: no chip at the small size', async () => {
    const tree = await mountWithVideo();
    await scroll(tree, 5000);
    expect(chip(tree)).toHaveLength(0);
  });
});

describe('a tap on the small preview goes back to the top, and Reduce Motion', () => {
  test('the small preview is a button, "Back to the preview", that scrolls to the top, animated', async () => {
    const tree = await mount(SESSION);
    await scroll(tree, 5000);
    const back = backButtons(tree)[0];
    expect(back.props.accessibilityRole).toBe('button');
    expect(back.props.accessibilityHint).toBe('Scrolls up to the full-size preview');
    await press(back);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  test('Volyume\'s own Reduce Motion makes the scroll back immediate', async () => {
    useAppStore.setState({ accessibility: { ...useAppStore.getState().accessibility, reduceMotion: true } });
    const tree = await mount(SESSION);
    await scroll(tree, 5000);
    await press(backButtons(tree)[0]);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  test('the phone\'s Reduce Motion does too', async () => {
    mockA11y.isReduceMotionEnabled.mockImplementation(() => Promise.resolve(true));
    const tree = await mount(SESSION);
    await scroll(tree, 5000);
    await press(backButtons(tree)[0]);
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  });

  test('source: Reduce Motion is the phone\'s OR Volyume\'s own setting', () => {
    expect(SCREEN).toContain('const storeReduceMotion = useAppStore((st) => !!st.accessibility?.reduceMotion);');
    expect(SCREEN).toContain('const reduceMotion = osReduceMotion || storeReduceMotion;');
    expect(SCREEN).toContain('scrollRef.current?.scrollTo?.({ y: 0, animated: !reduceMotion });');
  });
});

describe('safety', () => {
  test('no live Skia view in the header, at either size (Sentry VOLYUME-3M)', async () => {
    const tree = await mountWithVideo();
    const skia = (root) => root.findAll((n) => host(n) && /Canvas|SkiaView|RNSkia/i.test(n.type));
    expect(skia(header(tree))).toHaveLength(0);
    await scroll(tree, 5000);
    expect(skia(header(tree))).toHaveLength(0);
  });

  test('under calm mode or an open flag the header carries no video surface', async () => {
    mockSuppress.value = true;
    mockGetClip.mockResolvedValue(CLIP_SET);
    const tree = await mount({ ...SESSION, clipId: 'c2' });
    expect(players(header(tree))).toHaveLength(0);
    expect(byLabel(header(tree), 'Play the video')).toHaveLength(0);
    expect(byTestID(header(tree), 'share-making-preview')).toHaveLength(0);
  });
});
