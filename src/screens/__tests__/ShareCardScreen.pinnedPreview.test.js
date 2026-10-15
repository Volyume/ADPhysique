/**
 * ShareCardScreen: the preview at the top, and the small pinned live preview
 * under the header once it has scrolled away (D229 addendum 5 item 8: "the
 * top of the share screen, collapsing to a small pinned live preview under
 * the header as the person scrolls to the controls, for photos and clips").
 *
 * Pinned, written to FAIL against the screen before this change:
 *   1. Preview is the first section of the screen, before Format;
 *   2. nothing is pinned until more than 60% of the preview's card has
 *      scrolled off; then a small copy appears, showing the SAME preview
 *      (the same rendered image for a plain card), and it goes when the
 *      person scrolls back up;
 *   3. the copy takes no gestures of its own; a tap on it scrolls back to
 *      the preview;
 *   4. (source) with a photo or a video the copy is the same framer fed the
 *      same crop, frames and overlay, so the two can never disagree.
 *
 * Mock scaffold mirrors ShareCardScreen.levelUps.test.js.
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

const ShareCardScreen = require('../ShareCardScreen').default;

const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');

async function flush() {
  await TestRenderer.act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}
async function mount(params) {
  let tree = null;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' } }));
  });
  await flush();
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
// The page's own scroll view (the only one with a scroll read); its first
// node is the composite, whose props are the screen's own.
const scrollView = (tree) => tree.root.findAll((n) => n.props && n.props.scrollEventThrottle === 32 && typeof n.props.onScroll === 'function')[0];
const previewSection = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'View' && n.props.onLayout
  && n.props.style && [].concat(n.props.style).some((st) => st && st.gap))[0];
const minis = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.props.accessibilityLabel === 'Back to the preview');
const bigImages = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Image' && n.props.resizeMode === 'contain');
async function scrollTo(tree, y) {
  await TestRenderer.act(async () => { scrollView(tree).props.onScroll({ nativeEvent: { contentOffset: { y } } }); });
  await flush();
}

describe('the preview at the top', () => {
  test('Preview is the first section, before Format', async () => {
    const tree = await mount(SESSION);
    const h = headings(tree);
    expect(h[0]).toBe('Preview');
    expect(h.indexOf('Format')).toBeGreaterThan(0);
  });
});

describe('the pinned live preview', () => {
  test('appears once more than 60% of the card has scrolled off, shows the same preview, and goes on the way back up', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => bigImages(tree).length === 1);
    expect(minis(tree).length).toBe(0);
    // The preview section sits 16 dp into the content; the card is 1080 tall (cardHeight is mocked).
    await TestRenderer.act(async () => { previewSection(tree).props.onLayout({ nativeEvent: { layout: { y: 16, height: 1140 } } }); });

    await scrollTo(tree, 16 + 1080 * 0.5);
    expect(minis(tree).length).toBe(0);
    await scrollTo(tree, 16 + 1080 * 0.6 + 1);
    expect(minis(tree).length).toBe(1);
    const images = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Image');
    expect(images.length).toBe(2);
    expect(images[1].props.source).toEqual(images[0].props.source);
    // Small, and never taller than the pinned height.
    expect(images[1].props.style.height).toBe(112);
    expect(images[1].props.style.width).toBeLessThan(images[1].props.style.height);

    await scrollTo(tree, 100);
    expect(minis(tree).length).toBe(0);
  });

  test('a tap on it scrolls back to the preview; the copy itself takes no gestures', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => bigImages(tree).length === 1);
    await TestRenderer.act(async () => { previewSection(tree).props.onLayout({ nativeEvent: { layout: { y: 16, height: 1140 } } }); });
    await scrollTo(tree, 900);
    const mini = minis(tree)[0];
    expect(mini.props.accessibilityRole).toBe('button');
    const inner = mini.findAll((n) => typeof n.type === 'string' && n.props.pointerEvents === 'none');
    expect(inner.length).toBeGreaterThan(0);
    await TestRenderer.act(async () => { mini.props.onPress(); });
  });
});

describe('the copy is the same live preview (source)', () => {
  test('with a video: the same frames, placement, look and overlay as the big framer, no gestures', () => {
    const mini = SCREEN.slice(SCREEN.indexOf('let miniBody = null;'), SCREEN.indexOf('const miniPreview ='));
    expect(mini).toMatch(/<ClipFramer\s+clip=\{clipFrames\}[\s\S]*?crop=\{photoCrop\}[\s\S]*?lookKey=\{photoLook !== 'none' \? photoLook : null\}[\s\S]*?lookStrength=\{photoLookStrength\}[\s\S]*?overlayUri=\{clipOverlay\}[\s\S]*?paused=\{clipPaused \|\| makingVideo\}[\s\S]*?onTogglePause=\{noop\}\s+onChange=\{noop\}/);
    expect(mini).toMatch(/<SharePhotoFramer[\s\S]*?photoUri=\{framerPhoto\.uri\}[\s\S]*?crop=\{photoCrop\}[\s\S]*?overlayUri=\{framerOverlay\}[\s\S]*?onChange=\{noop\}/);
    expect(mini).not.toContain('blocksGesture');
    expect(SCREEN).toContain('<View pointerEvents="none" style={{ width: miniW, height: miniH }}>{miniBody}</View>');
  });

  test('the threshold is one named number, and the copy is sized from the big preview', () => {
    expect(SCREEN).toContain('const MINI_PREVIEW_H = 112;');
    expect(SCREEN).toContain('const MINI_SHOWS_AFTER = 0.6;');
    expect(SCREEN).toContain('const next = y > previewTopRef.current + previewH * MINI_SHOWS_AFTER;');
    expect(SCREEN).toContain('const miniW = previewH > 0 ? Math.max(1, Math.round((miniH * previewW) / previewH)) : miniH;');
    // Scroll positions are read by hand: no JS-thread Animated here (motionFitRules.guard).
    expect(SCREEN).not.toMatch(/import\s*\{[^}]*\bAnimated\b[^}]*\}\s*from\s*['"]react-native['"]/);
  });
});
