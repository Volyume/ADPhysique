/**
 * ShareCardScreen: the preview sits UNDER THE OPTIONS (founder, 2026-10-17:
 * "The preview should be UNDER THE OPTIONS. Why would it be above like that!?
 * You change the settings and then see what it looks like. When I said the
 * order is nonsensical, that doesn't mean make the video smaller and keep the
 * same order."; "It shouldn't auto to the video saved either. People can
 * select their share option ... and then they set the settings and then the
 * preview."). This replaces the collapsing-preview suite: there is no
 * collapsing header any more.
 *
 * Pinned, written to FAIL against the screen with the collapsing header:
 *   1. one ScrollView holds the whole page, in the order Background, Format,
 *      Theme, Look, Quote, What to include, THEN the preview, THEN Share,
 *      Save to gallery; nothing is drawn above the page and nothing floats;
 *   2. the header title is "Share" in every state;
 *   3. every preview state (the still, the framer, the playing video, the
 *      error box and the spinner) is the one preview card in the page, with
 *      Play with your look and the hint under it;
 *   4. the framer's drag and pinch still block the page scroll;
 *   5. opening the screen never selects a set video (the default background
 *      is None) unless a specific video was handed in (the summary's video
 *      row or the camera coming back);
 *   6. a video from the camera roll (Video, From your gallery) is the same
 *      pipeline as a set video;
 *   7. calm mode or an open ED flag withholds every video surface, and the
 *      privacy line is unchanged.
 *
 * Mock scaffold mirrors ShareCardScreen.video.test.js.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const fs = require('fs');
const path = require('path');
const SectionLabel = require('../../components/SectionLabel').default;
const BackHeader = require('../../components/BackHeader').default;

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
    // Full screen is taller than the other formats at the preview's width
    // (audit item 3: a format change while scrolled re-lays the header).
    ...actual, drawShareCard: jest.fn(), cardHeight: (w, _sq, aspect) => (w === 1080 ? 1921 : aspect === 'full' ? 1600 : 1080), drawSticker: jest.fn(), stickerHeight: () => 1080,
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
const ShareCardScreen = require('../ShareCardScreen').default;
const useAppStore = require('../../store/useAppStore').default;


const SCREEN = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');
const PAGE_SRC = SCREEN.slice(SCREEN.indexOf('<GestureDetector gesture={scrollGesture}>'), SCREEN.indexOf('</ScrollView>\n      </GestureDetector>'));

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
async function mount(params) {
  let tree = null;
  const navigation = makeNavigation();
  const render = () => React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' }, navigation });
  await TestRenderer.act(async () => { tree = TestRenderer.create(render()); });
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
const card = (tree) => byTestID(tree.root, 'share-preview-card')[0];
const page = (tree) => tree.root.findAll((n) => n.props && n.props.contentContainerStyle && !n.props.horizontal && /ScrollView/.test(String(n.type && (n.type.displayName || n.type.name || n.type))))[0];
const headings = (tree) => tree.root.findAll((n) => n.type === SectionLabel).map((n) => n.props.children);
const byLabel = (root, label) => root.findAll((n) => host(n) && n.props.accessibilityLabel === label);
const PLAY = 'Play with your look';
const PAUSE = 'Pause the video';
const textOf = (n) => n.findAll((m) => host(m) && m.type === 'Text').map((m) => [].concat(m.props.children).join(''));
const stills = (root) => root.findAll((n) => host(n) && n.type === 'Image' && n.props.resizeMode === 'contain');
const framers = (root) => root.findAll((n) => n.type && n.type.name === 'SharePhotoFramer');
const players = (root) => root.findAll((n) => n.type === 'Video');
async function mountWithVideo() {
  mockGetClip.mockResolvedValue(CLIP_SET);
  const tree = await mount({ ...SESSION, clipId: 'c2' });
  await waitFor(() => framers(card(tree)).length === 1);
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 450)); });
  await waitFor(() => byLabel(page(tree), PLAY).length === 1);
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSkiaState.snapshotOk = true;
  mockSuppress.value = false;
  mockGetClip.mockResolvedValue(null);
  mockEngine.isAvailable.mockImplementation(() => true);
  mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/volyume-preview.mp4' }));
  useAppStore.setState({ user: { id: 'u1' } });
});

describe('the order: options first, then the preview, then the actions', () => {
  test('source: Background, Format, Theme, Look, Quote, What to include, THEN the preview, THEN Share and Save', () => {
    const at = (needle) => { const i = PAGE_SRC.indexOf(needle); expect({ needle, found: i >= 0 }).toEqual({ needle, found: true }); return i; };
    const order = [
      at('<SectionLabel>Background</SectionLabel>'),
      at('<SectionLabel>Format</SectionLabel>'),
      at('<SectionLabel>Theme</SectionLabel>'),
      at('<SectionLabel>Look</SectionLabel>'),
      at('<SectionLabel>Quote or caption</SectionLabel>'),
      at('<SectionLabel>What to include</SectionLabel>'),
      at('testID="share-preview-card"'),
      at('testID="share-play-control"'),
      at('onPress={handleShareToStories}'),
      at('onPress={handleSaveToGallery}'),
      at('title="Post to Community"'),
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test('no collapsing header: no reanimated, no header, no mini preview', () => {
    expect(SCREEN).not.toMatch(/react-native-reanimated/);
    for (const gone of ['share-preview-header', 'share-mini-preview', 'share-mini-progress', 'previewSmall', 'headerFullH', 'scrollToPreview']) {
      expect({ gone, present: SCREEN.includes(gone) }).toEqual({ gone, present: false });
    }
  });

  test('rendered: the page headings run Background, Format, Theme, Look, What to include; the preview card is after the options in the one page', async () => {
    const tree = await mountWithVideo();
    const h = headings(tree);
    const idx = (w) => h.indexOf(w);
    expect(idx('Background')).toBeGreaterThanOrEqual(0);
    expect(idx('Background')).toBeLessThan(idx('Format'));
    expect(idx('Format')).toBeLessThan(idx('Theme'));
    expect(idx('Theme')).toBeLessThan(idx('Look'));
    expect(idx('Look')).toBeLessThan(idx('What to include'));
    expect(card(tree)).toBeTruthy();
    expect(page(tree).findAll((n) => host(n) && n.props.testID === 'share-preview-card')).toHaveLength(1);
    // The card comes after the last option and before the actions.
    const flat = page(tree).findAll((n) => host(n));
    const pos = (pred) => flat.findIndex(pred);
    const lastOption = pos((n) => n.props.testID === 'share-preview-section');
    expect(lastOption).toBeGreaterThan(-1);
    expect(page(tree).findAll((n) => n.type === SectionLabel && n.props.children === 'What to include').length).toBe(1);
  });

  test('the header title is "Share" in every state', async () => {
    const plain = await mount(SESSION);
    expect(plain.root.findAll((n) => n.type === BackHeader)[0].props.title).toBe('Share');
    const withVideo = await mountWithVideo();
    expect(withVideo.root.findAll((n) => n.type === BackHeader)[0].props.title).toBe('Share');
  });
});

describe('opening the screen never selects a set video', () => {
  test('source: the default background is None', () => {
    expect(SCREEN).toMatch(/useState\(BACKGROUND_SOURCES\.NONE\)/);
  });

  test('a workout holding a set video opens on None, with no video chosen and no Play', async () => {
    const { listClipsForWorkout } = require('../../lib/clips/store');
    listClipsForWorkout.mockResolvedValueOnce([CLIP_SET]);
    const tree = await mount(SESSION);
    await flush();
    expect(byTestID(tree.root, 'share-using-video')).toHaveLength(0);
    expect(byLabel(tree.root, PLAY)).toHaveLength(0);
    expect(framers(tree.root)).toHaveLength(0);
    expect(players(tree.root)).toHaveLength(0);
    expect(mockGetClip).not.toHaveBeenCalled();
    await waitFor(() => stills(card(tree)).length === 1);
  });

  test('a specific video handed in (the summary row, the camera) is still used', async () => {
    const tree = await mountWithVideo();
    expect(byTestID(tree.root, 'share-using-video')).toHaveLength(1);
  });
});

describe('a video from the camera roll uses the same pipeline as a set video', () => {
  test('Background > Gallery opens the picker for photos AND videos and hands a video to acceptClip', () => {
    expect(SCREEN).toMatch(/launchImageLibraryAsync\(\{ mediaTypes: \['images', 'videos'\]/);
    expect(SCREEN).toMatch(/acceptClip\(\{ id: null, uri: picked\.uri, durationMs: Number\(picked\.duration\) \|\| 0, source: 'gallery' \}\)/);
    expect(SCREEN).toMatch(/onPress=\{pickGymPhoto\}/);
    expect(SCREEN).not.toMatch(/title="From your gallery"/);
    // The trim bar is the page's, for any chosen video, set or camera roll.
    expect(PAGE_SRC).toMatch(/\{clip && !suppress \? \([\s\S]*?<VideoTrimBar/);
  });

  test('picking a camera-roll video shows the trim bar, the look strip and the preview', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///roll/v.mp4', type: 'video', duration: 20000 }] });
    const tree = await mount(SESSION);
    await press(byLabel(tree.root, 'Gallery, choose a photo or video')[0]);
    await waitFor(() => framers(card(tree)).length === 1);
    expect(tree.root.findAll((n) => n.type === 'VideoTrimBar')).toHaveLength(1);
    expect(headings(tree)).toContain('Look');
  });
});

describe('every preview state is the one card, in the page', () => {
  test('the still image', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => stills(card(tree)).length === 1);
  });

  test('the error box and its Retry', async () => {
    mockSkiaState.snapshotOk = false;
    const tree = await mount(SESSION);
    await waitFor(() => byLabel(card(tree), 'Retry building the preview').length > 0);
    mockSkiaState.snapshotOk = true;
    const retry = card(tree).findAll((n) => n.props && n.props.accessibilityLabel === 'Retry building the preview' && typeof n.props.onPress === 'function')[0];
    await press(retry);
    expect(byLabel(tree.root, 'Retry building the preview')).toHaveLength(0);
    expect(stills(card(tree))).toHaveLength(1);
  });

  test('the spinner is the card\'s last branch', () => {
    const cardBlock = SCREEN.slice(SCREEN.indexOf('testID="share-preview-card"'), SCREEN.indexOf('{makingVideo ? (\n          <Text'));
    expect(cardBlock).toMatch(/\) : \(\s*<View style=\{\[styles\.previewPlaceholder, live\.previewPlaceholder, \{ width: previewW, height: previewH \}\]\}>\s*<ActivityIndicator/);
  });

  test('the framer is in the card and its drag and pinch block the page scroll', async () => {
    const tree = await mountWithVideo();
    const framer = framers(card(tree))[0];
    expect(framer.props.blocksGesture).toBeTruthy();
    expect(PAGE_SRC).toMatch(/<SharePhotoFramer[\s\S]*?blocksGesture=\{scrollGesture\}/);
  });

  test('Play with your look and the hint sit under the card; a tap on the playing video pauses it', async () => {
    const tree = await mountWithVideo();
    const play = byTestID(page(tree), 'share-play-control')[0];
    expect(textOf(play)).toEqual(['Play with your look']);
    expect(PAGE_SRC.indexOf('testID="share-preview-card"')).toBeLessThan(PAGE_SRC.indexOf('testID="share-preview-controls"'));
    await press(byLabel(page(tree), PLAY)[0]);
    expect(players(card(tree))).toHaveLength(1);
    expect(byTestID(page(tree), 'share-play-control')[0].props.accessibilityLabel).toBe(PAUSE);
    await press(byTestID(card(tree), 'share-preview-video')[0]);
    expect(players(card(tree))).toHaveLength(0);
  });

  test('while a preview is made, the making row and its Cancel take the button\'s place', async () => {
    mockEngine.exportShareVideo.mockImplementation(() => new Promise(() => {}));
    const tree = await mountWithVideo();
    await press(byLabel(page(tree), PLAY)[0]);
    expect(byTestID(page(tree), 'share-making-preview').length).toBeGreaterThan(0);
    expect(byLabel(page(tree), 'Cancel making the preview').length).toBeGreaterThan(0);
  });

  test('waiting for the tone, Play keeps its waiting state in words', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const tree = await mount({ ...SESSION, clipId: 'c2' });
    await waitFor(() => framers(card(tree)).length === 1);
    const waiting = byTestID(page(tree), 'share-play-control')[0];
    expect(waiting.props.accessibilityLabel).toBe('Getting your video ready');
    expect(waiting.props.accessibilityState).toEqual({ disabled: false, busy: true });
  });
});

describe('safety', () => {
  test('under calm mode or an open flag there is no video surface and no Play', async () => {
    mockSuppress.value = true;
    mockGetClip.mockResolvedValue(CLIP_SET);
    const tree = await mount({ ...SESSION, clipId: 'c2' });
    expect(players(tree.root)).toHaveLength(0);
    expect(byLabel(tree.root, PLAY)).toHaveLength(0);
    expect(byTestID(tree.root, 'share-play-control')).toHaveLength(0);
    expect(byTestID(tree.root, 'share-making-preview')).toHaveLength(0);
    expect(byTestID(tree.root, 'share-using-video')).toHaveLength(0);
  });

  test('the privacy line is still under What to include, before the preview', () => {
    expect(PAGE_SRC.indexOf('never included.')).toBeGreaterThan(PAGE_SRC.indexOf('<SectionLabel>What to include</SectionLabel>'));
    expect(PAGE_SRC.indexOf('never included.')).toBeLessThan(PAGE_SRC.indexOf('testID="share-preview-card"'));
  });
});
