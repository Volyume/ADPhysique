/**
 * ShareCardScreen: the preview's header, which shrinks to a small live
 * preview as the page scrolls (D229 addendum 5 item 8: "the top of the share
 * screen, collapsing to a small pinned live preview under the header as the
 * person scrolls to the controls, for photos and clips").
 *
 * Rebuilt after the fresh-eyes review of 2026-10-15 (should-fix 7): the first
 * build pinned a SECOND copy of the preview over the page's trailing edge,
 * where it took the taps of the controls beneath it. Now there is one
 * preview, in a header above the page, scaled down on the UI thread as the
 * page scrolls; nothing floats over the controls.
 *
 * Pinned, written to FAIL against the screen before this change:
 *   1. the preview is the header above the page (not a section of it), and
 *      the page's first section is the Format row;
 *   2. the header's height and the card's scale follow the scroll on the UI
 *      thread (a shared value, an animated scroll handler, animated styles),
 *      from the full height to the small height, and it is the SAME preview
 *      (the one framer, the one image), never a second copy;
 *   3. once more than half way, the small preview is a button, "Back to the
 *      preview", that scrolls to the top, and the card under it takes no
 *      gestures; the trim bar and the hints stay in the page and scroll;
 *   4. while a video is being made the page does not scroll and the ring sits
 *      over the header, unscaled.
 *
 * Mock scaffold mirrors ShareCardScreen.levelUps.test.js; Reanimated's scroll
 * handler and reaction are made to run here, so the shrink can be driven.
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
const FAKE_IMG = { width: () => 800, height: () => 600, encodeToBase64: () => 'AAAA', dispose: () => {} };
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Surface: {
      MakeOffscreen: () => ({
        getCanvas: () => ({ drawImageRect: () => {} }),
        flush: () => {},
        makeImageSnapshot: () => ({ encodeToBase64: () => 'AAAA' }),
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
    ...actual, drawShareCard: jest.fn(), cardHeight: () => 1080, drawSticker: jest.fn(), stickerHeight: () => 1080,
    sessionLiftsThatFit: jest.fn(({ lifts }) => lifts.length),
  };
});
jest.mock('../../lib/shareCard/greatWeek', () => ({ buildWeeklyRecapParams: () => ({}) }));
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));
jest.mock('../../lib/shareVideo/engine', () => ({ isAvailable: () => false, setLockScreenWallpaper: jest.fn() }));
jest.mock('../../lib/clips/store', () => ({
  getClip: jest.fn(() => Promise.resolve(null)),
  listClipsForWorkout: jest.fn(() => Promise.resolve([])),
  countClipsForWorkout: jest.fn(() => Promise.resolve(0)),
  subscribeClips: () => () => {},
}));
// Reanimated, made to run: the scroll handler's worklet is called with the
// event, shared values are plain boxes, the reaction runs on every render,
// and interpolate is the real linear map, so the header's shrink can be
// driven and read here.
jest.mock('react-native-reanimated', () => {
  const manual = jest.requireActual('../../../__mocks__/react-native-reanimated');
  const lerp = (x, [a, b], [p, q]) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return p + (q - p) * t;
  };
  return {
    ...manual,
    // A shared value keeps its box across renders (the manual mock makes a
    // new one each render, which would lose the scroll).
    useSharedValue: (v) => {
      const mockReact = require('react');
      return mockReact.useRef({ value: v }).current;
    },
    useAnimatedScrollHandler: (handlers) => (e) => handlers.onScroll(e.nativeEvent || e),
    // The reaction fires after a render, only when its value changed (as on
    // the UI thread), so a state change it makes never loops the render.
    useAnimatedReaction: (prepare, react) => {
      const mockReact = require('react');
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

const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');

async function flush() {
  await TestRenderer.act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}
function makeNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn(), addListener: jest.fn(() => () => {}) };
}
// The screen, with a way to render it again: on the phone the UI thread
// redraws the header from the shared value as the finger moves; here a scroll
// sets the value and the next render reads it.
const rerenders = new WeakMap();
async function mount(params) {
  let tree = null;
  const navigation = makeNavigation();
  const render = () => React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' }, navigation });
  await TestRenderer.act(async () => { tree = TestRenderer.create(render()); });
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
const SESSION = {
  sessionData: { sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, prCount: 0, units: 'kg' },
  workoutId: 'w1',
};
const headings = (tree) => tree.root.findAll((n) => n.type === SectionLabel).map((n) => n.props.children);
const header = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'share-preview-header')[0];
const scrollView = (tree) => tree.root.findAll((n) => n.props && n.props.scrollEventThrottle === 16 && typeof n.props.onScroll === 'function')[0];
const backButtons = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Back to the preview');
const previewImages = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Image' && n.props.resizeMode === 'contain');
const flatStyle = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));
async function scrollTo(tree, y) {
  await TestRenderer.act(async () => { scrollView(tree).props.onScroll({ nativeEvent: { contentOffset: { y } } }); });
  await rerenders.get(tree)();
}

describe('the preview is the header above the page', () => {
  test('it is above the scroll, and the page opens on the Format row', async () => {
    const tree = await mount(SESSION);
    expect(header(tree)).toBeTruthy();
    expect(headings(tree)[0]).toBe('Format');
    // One preview: the image is drawn once, in the header, not again in the page.
    await waitFor(() => previewImages(tree).length === 1);
    const inHeader = header(tree).findAll((n) => typeof n.type === 'string' && n.type === 'Image');
    expect(inHeader.length).toBe(1);
  });

  test('its height and the card\'s scale follow the scroll, from full size to the small size, on the UI thread', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => previewImages(tree).length === 1);
    // cardHeight is mocked at 1080 for the preview width.
    expect(flatStyle(header(tree).props.style).height).toBe(1080);
    const card = () => header(tree).children[0];
    expect(flatStyle(card().props.style).transform).toEqual([{ translateY: -0 }, { scale: 1 }]);

    await scrollTo(tree, (1080 - 112) / 2);
    expect(flatStyle(header(tree).props.style).height).toBeCloseTo(596, 0);
    expect(backButtons(tree).length).toBe(0);

    await scrollTo(tree, 5000);
    expect(flatStyle(header(tree).props.style).height).toBe(112);
    const t = flatStyle(card().props.style).transform;
    expect(t[1].scale).toBeCloseTo(112 / 1080, 5);
    expect(t[0].translateY).toBeCloseTo(-(1080 - 112) / 2, 5);
    expect(backButtons(tree).length).toBe(1);
    expect(card().props.pointerEvents).toBe('none');

    await scrollTo(tree, 0);
    expect(flatStyle(header(tree).props.style).height).toBe(1080);
    expect(backButtons(tree).length).toBe(0);
    expect(card().props.pointerEvents).toBe('auto');
  });

  test('at the small size a tap goes back to the preview', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => previewImages(tree).length === 1);
    await scrollTo(tree, 5000);
    const back = backButtons(tree)[0];
    expect(back.props.accessibilityRole).toBe('button');
    await TestRenderer.act(async () => { back.props.onPress(); });
  });
});

describe('the header is the one live preview (source)', () => {
  test('the framers live in the header; the trim bar and the hints stay in the page', () => {
    const headerBlock = SCREEN.slice(SCREEN.indexOf('testID="share-preview-header"'), SCREEN.indexOf('<GestureDetector gesture={scrollGesture}>'));
    expect(headerBlock).toContain('<ClipFramer');
    expect(headerBlock).toContain('<SharePhotoFramer');
    expect(headerBlock).toContain('<ProgressRing');
    expect(headerBlock).not.toContain('<TrimBar');
    const page = SCREEN.slice(SCREEN.indexOf('<GestureDetector gesture={scrollGesture}>'));
    expect(page).toContain('<TrimBar');
    expect(page).not.toContain('<ClipFramer');
    expect(page).not.toContain('<SharePhotoFramer');
  });

  test('the shrink is driven on the UI thread by the scroll, with one named small height', () => {
    expect(SCREEN).toContain('const MINI_PREVIEW_H = 112;');
    expect(SCREEN).toMatch(/const collapse = useSharedValue\(0\);/);
    expect(SCREEN).toMatch(/useAnimatedScrollHandler\(\{\s*onScroll: \(e\) => \{\s*'worklet';/);
    expect(SCREEN).toMatch(/height: interpolate\(collapse\.value, \[0, 1\], \[previewH, MINI_PREVIEW_H\], Extrapolation\.CLAMP\)/);
    expect(SCREEN).toContain("<Animated.ScrollView");
    expect(SCREEN).toContain('scrollEnabled={!makingVideo}');
    // No JS-thread Animated here (motionFitRules.guard).
    expect(SCREEN).not.toMatch(/import\s*\{[^}]*\bAnimated\b[^}]*\}\s*from\s*['"]react-native['"]/);
  });
});
