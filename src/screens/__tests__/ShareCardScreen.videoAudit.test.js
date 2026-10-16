/**
 * ShareCardScreen with a VIDEO: the audit of 2026-10-16 (findings 4 to 17),
 * against the frame source the native lane now provides, which is ASYNC:
 * `grabVideoFrame` resolves later with an upright SkImage, the strip's
 * thumbnails are file URIs (`videoThumbnailUri`), `probeVideo` reads the
 * upright size and real length, and `extractFrames` writes small upright
 * frames for the scrim's tone (`deleteFrames` clears them).
 *
 * Each block pins one finding and was written to FAIL against the screen as
 * it stood at 428ef8f:
 *   A  the async frame: only the latest request lands, a superseded one
 *      says nothing, a video is committed only once its first frame is
 *      here (busy on the tile and the preview meanwhile), thumbnails are
 *      file URIs asked for once per video;
 *   B  one upright size (the probe's) for the framer, the cover rect and
 *      the share (finding 6);
 *   C  moving the trim start redraws what the preview SHOWS, keeping the
 *      look and the framing (finding 9);
 *   D  Film now renders the recording flow's sheets: the privacy primer
 *      appears (finding 4; the hook is NOT mocked here);
 *   E  a photo chosen after a video replaces it outright (finding 5);
 *   F  Full screen's own shape reaches every video job (finding 7);
 *   G  the Sticker shares and saves the image, and keeps the video for
 *      another format (finding 8);
 *   H  the scrim over a video is read across the window (eight frames, the
 *      first and last included) and drawn into every overlay with a video,
 *      the bright tier until it is read (addendum 4 rules 2 and 3,
 *      finding 10);
 *   I  leaving cancels any engine job and nothing is shared after; a job
 *      still finishing says so (finding 11);
 *   J  overlay pictures and frames are deleted, old share videos swept
 *      (finding 12);
 *   K  the cache knows which typefaces were ready and the tone (finding 13);
 *   L  the safety gate closing drops the video and every video surface
 *      (finding 14);
 *   M  the chosen video's own tile does nothing; a PR set's video from the
 *      strip or the sheet opens its PR card (finding 15);
 *   N  the words a screen reader hears (findings 16 and 17).
 */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const Button = require('../../components/Button').default;

const mockSharing = {
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-sharing', () => mockSharing);
const mockMediaLibrary = {
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-media-library', () => mockMediaLibrary);
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
const mockFs = {
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn(),
  getInfoAsync: jest.fn(),
};
jest.mock('expo-file-system/legacy', () => mockFs);
const mockPicker = {
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
};
jest.mock('expo-image-picker', () => mockPicker);
jest.mock('../../lib/shareCard/wordmarkImage', () => ({
  loadWordmarkImage: jest.fn().mockResolvedValue(null),
}));
// The app's typefaces, held back until a test lets them arrive (K).
const mockFaces = { resolve: null };
jest.mock('../../lib/shareCard/cardTypefaces', () => ({
  loadCardTypefaces: jest.fn(() => new Promise((r) => { mockFaces.resolve = r; })),
}));
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
// An SkImage stand-in whose pixels are named, so what the preview shows can
// be told apart: an offscreen surface's snapshot is named after the last
// image drawn into it.
const mockImage = (name, w, h) => ({ name, width: () => w, height: () => h, encodeToBase64: () => name, dispose: jest.fn() });
const mockPhoto = mockImage('PHOTO', 800, 600);
const mockToneImg = () => mockImage('TONEFRAME', 90, 160);
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Surface: {
      MakeOffscreen: () => {
        let drawn = null;
        return {
          getCanvas: () => ({ drawImageRect: (img) => { drawn = img; } }),
          flush: () => {},
          makeImageSnapshot: () => ({ encodeToBase64: () => (drawn ? `S-${drawn.encodeToBase64()}` : 'AAAA') }),
        };
      },
    },
    Data: { fromBase64: (b64) => ({ b64 }) },
    Image: { MakeImageFromEncoded: (data) => (data && data.b64 === 'JPEG' ? mockToneImg() : mockPhoto) },
    Paint: () => ({ setAntiAlias: () => {}, setColorFilter: () => {} }),
    ColorFilter: { MakeMatrix: (m) => ({ m }) },
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
  },
  matchFont: () => ({ getTypeface: () => ({}) }),
}));
// The tone the photo way reads from one frame (clipTone samples each frame
// through it): a bright video.
const BRIGHT_READING = { r: 240, g: 230, b: 220, luminance: 200, topLuminance: 210 };
jest.mock('../../lib/shareCard/drawShareCard', () => {
  const actual = jest.requireActual('../../lib/shareCard/drawShareCard');
  return {
    ...actual,
    drawShareCard: jest.fn(),
    // Full screen's height depends on the phone's shape; the screen must
    // pass it (finding 7). Odd at the output size: the screen must even it.
    cardHeight: (w, _sq, aspect, fullAspect) => {
      if (aspect === 'full') return fullAspect ? 2001 : 999;
      return w === 1080 ? 1921 : 1080;
    },
    drawSticker: jest.fn(),
    stickerHeight: () => 1080,
    sessionLiftsThatFit: jest.fn(({ lifts }) => lifts.length),
    sampleAverageTone: jest.fn(() => ({ r: 240, g: 230, b: 220, luminance: 200, topLuminance: 210 })),
  };
});
jest.mock('../../lib/shareCard/greatWeek', () => ({ buildWeeklyRecapParams: () => ({}) }));
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mockToastShow, hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));
const mockSuppress = { value: false };
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: () => mockSuppress.value }));
const mockEngine = {
  MAX_CLIP_MS: 15000,
  isAvailable: jest.fn(() => true),
  probeVideo: jest.fn(),
  extractFrames: jest.fn(),
  deleteFrames: jest.fn(() => Promise.resolve()),
  exportShareVideo: jest.fn(),
  cancelExport: jest.fn(() => Promise.resolve()),
  setLockScreenWallpaper: jest.fn(() => Promise.resolve()),
  // As the real wrapper: nothing to say for a cancel or a busy engine.
  lineForExportError: jest.fn((code) => (code === 'E_CANCELLED' || code === 'E_BUSY' ? null : 'The video could not be made on this phone this time.')),
  EXPORT_ERROR: { UNAVAILABLE: 'E_UNAVAILABLE', CANCELLED: 'E_CANCELLED', BUSY: 'E_BUSY', DECODE: 'E_DECODE' },
};
jest.mock('../../lib/shareVideo/engine', () => mockEngine);
jest.mock('../../components/share/VideoTrimBar', () => {
  const mockReact = require('react');
  return { __esModule: true, default: (props) => mockReact.createElement('VideoTrimBar', props) };
});
jest.mock('expo-av', () => ({ Video: 'Video', ResizeMode: { CONTAIN: 'contain' } }));
const mockGrab = jest.fn();
const mockThumb = jest.fn();
jest.mock('../../lib/shareVideo/videoFrame', () => ({
  grabVideoFrame: (...args) => mockGrab(...args),
  videoThumbnailUri: (...args) => mockThumb(...args),
  videoStripUris: (_uri, _d, count) => Promise.resolve(Array.from({ length: count }, () => null)),
}));
const mockGetClip = jest.fn();
const mockListClips = jest.fn();
const mockClipListeners = new Set();
jest.mock('../../lib/clips/store', () => ({
  getClip: (...args) => mockGetClip(...args),
  listClipsForWorkout: (...args) => mockListClips(...args),
  countClipsForWorkout: jest.fn(() => Promise.resolve(0)),
  subscribeClips: (fn) => { mockClipListeners.add(fn); return () => mockClipListeners.delete(fn); },
  deleteClip: jest.fn(() => Promise.resolve()),
  setClipKept: jest.fn(() => Promise.resolve()),
  getClipsStorage: jest.fn(() => Promise.resolve({ count: 0, bytes: 0 })),
  getKeepDays: jest.fn(() => Promise.resolve(7)),
  isClipPastWindow: jest.fn(() => Promise.resolve(false)),
}));
// NOT mocked: useClipRecorder, so its sheets are real (D).
const mockAsyncStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockAsyncStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockAsyncStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn((k) => { delete mockAsyncStore[k]; return Promise.resolve(); }),
}));

const ShareCardScreen = require('../ShareCardScreen').default;
const useAppStore = require('../../store/useAppStore').default;
const { drawShareCard: mockDraw, photoCoverRect } = require('../../lib/shareCard/drawShareCard');
const { CLIP_STRINGS } = require('../../lib/clips/rules');
const { VIDEO_SCRIM_TIER_LUMINANCE } = require('../../lib/shareVideo/clipTone');

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
// The tone is read a moment after the window settles (debounced).
async function settleTone() {
  await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 450)); });
  await flush();
}
function deferred() {
  let resolve; let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
function makeNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn(), addListener: jest.fn(() => () => {}) };
}
function element(params, navigation) {
  return React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' }, navigation });
}
// Every screen a test opens is closed after it, so no timer of one test
// (the tone's debounce) runs inside the next.
const mockOpenTrees = [];
async function mount(params, navigation = makeNavigation()) {
  let tree = null;
  await TestRenderer.act(async () => { tree = TestRenderer.create(element(params, navigation)); });
  mockOpenTrees.push(tree);
  await flush();
  return { tree, navigation, rerender: async () => { await TestRenderer.act(async () => { tree.update(element(params, navigation)); }); await flush(); } };
}
async function press(node) {
  await TestRenderer.act(async () => { node.props.onPress(); });
  await flush();
}
const host = (n) => typeof n.type === 'string';
const byLabel = (tree, label) => tree.root.findAll((n) => host(n) && n.props && n.props.accessibilityLabel === label);
const byLabelStart = (tree, prefix) => tree.root.findAll((n) => host(n) && n.props && String(n.props.accessibilityLabel || '').startsWith(prefix));
const byTestID = (tree, id) => tree.root.findAll((n) => host(n) && n.props && n.props.testID === id);
const texts = (tree) => tree.root.findAll((n) => host(n) && n.type === 'Text').map((n) => [].concat(n.props.children).join(''));
const trimBar = (tree) => tree.root.findAll((n) => n.type === 'VideoTrimBar')[0];
const framer = (tree) => tree.root.findAll((n) => n.type && n.type.name === 'SharePhotoFramer')[0];
const buttonTitled = (tree, title) => tree.root.findAll((n) => n.type === Button && n.props.title === title);
const lastStill = () => {
  const calls = mockDraw.mock.calls.filter((c) => !c[1].omitPhoto);
  return calls[calls.length - 1][1];
};
const overlayDraws = (width) => mockDraw.mock.calls.filter((c) => c[1].omitPhoto === true && c[1].width === width).map((c) => c[1]);

const SESSION = {
  sessionData: {
    sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, prCount: 0, units: 'kg',
    topSet: { exerciseName: 'Bench press', weight: 80, reps: 5 },
  },
  workoutId: 'w1',
};
const PR = {
  type: 'e1rm', exerciseId: 'e1', exerciseName: 'Bench press', weight: 80, reps: 5, value: 90,
  label: 'New estimated max', units: 'kg', setId: 's3', setNumber: 3,
};
const CLIP_SET = {
  id: 'c2', uri: 'file:///docs/clips/c2.mp4', exerciseId: 'e1', exerciseName: 'Bench press', setNumber: 3,
  durationMs: 12000, width: 1080, height: 1920, createdAt: 20, source: 'workout',
};
const CLIP_LONG = {
  id: 'c1', uri: 'file:///docs/clips/c1.mp4', exerciseId: null, exerciseName: null, setNumber: null,
  durationMs: 22000, width: null, height: null, createdAt: 10, source: 'summary',
};
// A frame of `row` at `ms`: upright, named after the video and the moment.
const frameAt = (row, ms) => ({ image: mockImage(`F-${row.id}-${ms}`, 1080, 1920), width: 1080, height: 1920, durationMs: row.durationMs });
const rowOf = (uri) => [CLIP_SET, CLIP_LONG].find((c) => c.uri === uri) || CLIP_SET;
const BUSY_LINE = 'A video is still being made. Try again in a moment.';

afterEach(async () => {
  while (mockOpenTrees.length) {
    const tree = mockOpenTrees.pop();
    try { await TestRenderer.act(async () => { tree.unmount(); }); } catch (_e) { /* already closed by the test */ }
  }
});

beforeEach(() => {
  jest.clearAllMocks();
  mockClipListeners.clear();
  Object.keys(mockAsyncStore).forEach((k) => { delete mockAsyncStore[k]; });
  mockSuppress.value = false;
  mockFaces.resolve = null;
  mockEngine.isAvailable.mockImplementation(() => true);
  mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/share-video/out.mp4' }));
  mockEngine.probeVideo.mockImplementation((uri) => Promise.resolve({ durationMs: rowOf(uri).durationMs, width: 1080, height: 1920 }));
  mockEngine.extractFrames.mockImplementation((_uri, times) => Promise.resolve(times.map((t) => ({ uri: `file:///cache/share-frames/${t}.jpg`, width: 90, height: 160, timeMs: t }))));
  mockGrab.mockImplementation((_Skia, uri, ms) => Promise.resolve(frameAt(rowOf(uri), ms)));
  mockThumb.mockImplementation((uri) => Promise.resolve(`file:///cache/share-frames/thumb-${uri.split('/').pop()}.jpg`));
  mockFs.readAsStringAsync.mockImplementation((uri) => Promise.resolve(String(uri).includes('share-frames') ? 'JPEG' : 'PHOTO'));
  mockFs.readDirectoryAsync.mockImplementation(() => Promise.resolve([]));
  mockFs.getInfoAsync.mockImplementation(() => Promise.resolve({ exists: false }));
  mockListClips.mockResolvedValue([CLIP_SET, CLIP_LONG]);
  mockGetClip.mockImplementation((_u, id) => Promise.resolve([CLIP_SET, CLIP_LONG].find((c) => c.id === id) || null));
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  useAppStore.setState({ user: { id: 'u1' } });
});

describe('A: the frame arrives later, and only the latest is ever applied', () => {
  test('a video is committed only once its first frame is here; meanwhile its tile and the preview say so', async () => {
    const first = deferred();
    mockGrab.mockImplementation(() => first.promise);
    const { tree } = await mount(SESSION);
    await press(byLabelStart(tree, 'Use video: Bench press')[0]);
    expect(byTestID(tree, 'share-video-tile-busy')).toHaveLength(1);
    expect(byTestID(tree, 'share-preview-busy')).toHaveLength(1);
    expect(texts(tree)).toContain('Share image');
    expect(trimBar(tree)).toBeUndefined();
    await TestRenderer.act(async () => { first.resolve(frameAt(CLIP_SET, 0)); });
    await flush();
    expect(byTestID(tree, 'share-video-tile-busy')).toHaveLength(0);
    expect(byTestID(tree, 'share-preview-busy')).toHaveLength(0);
    expect(texts(tree)).toContain('Share video');
    expect(lastStill().bgPhoto.name).toBe('F-c2-0');
  });

  test('choosing another video before the first frame lands: the later choice wins, the earlier is released, and its failure says nothing', async () => {
    const slow = deferred();
    mockGrab.mockImplementation((_S, uri, ms) => (uri === CLIP_SET.uri ? slow.promise : Promise.resolve(frameAt(CLIP_LONG, ms))));
    const { tree } = await mount(SESSION);
    await press(byLabelStart(tree, 'Use video: Bench press')[0]);
    await press(byLabelStart(tree, 'Use video: After the workout')[0]);
    expect(lastStill().bgPhoto.name).toBe('F-c1-0');
    await TestRenderer.act(async () => { slow.resolve(null); });
    await flush();
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(lastStill().bgPhoto.name).toBe('F-c1-0');
    expect(trimBar(tree).props.uri).toBe(CLIP_LONG.uri);
    expect(byLabelStart(tree, 'Use video: After the workout')[0].props.accessibilityState).toEqual({ selected: true });
  });

  test('a late frame for a video the person moved on from is released, never shown', async () => {
    const slow = deferred();
    mockGrab.mockImplementation((_S, uri, ms) => (uri === CLIP_SET.uri ? slow.promise : Promise.resolve(frameAt(CLIP_LONG, ms))));
    const { tree } = await mount(SESSION);
    await press(byLabelStart(tree, 'Use video: Bench press')[0]);
    await press(byLabelStart(tree, 'Use video: After the workout')[0]);
    const late = frameAt(CLIP_SET, 0);
    await TestRenderer.act(async () => { slow.resolve(late); });
    await flush();
    expect(late.image.dispose).toHaveBeenCalled();
    expect(lastStill().bgPhoto.name).toBe('F-c1-0');
    expect(tree.root.findAll((n) => n.type === 'VideoTrimBar')).toHaveLength(1);
  });

  test('the trim moved twice: the still for the LATEST start is shown even when the earlier one arrives last', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    const early = deferred();
    mockGrab.mockImplementation((_S, uri, ms) => (ms === 2000 ? early.promise : Promise.resolve(frameAt(CLIP_LONG, ms))));
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 2000, endMs: 14000 }); });
    await flush();
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 5000, endMs: 17000 }); });
    await flush();
    await TestRenderer.act(async () => { early.resolve(frameAt(CLIP_LONG, 2000)); });
    await flush();
    expect(lastStill().bgPhoto.name).toBe('F-c1-5000');
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('thumbnails are file URIs from the native source, asked for once per video, even when the list is read again', async () => {
    const { tree } = await mount(SESSION);
    const uris = tree.root.findAll((n) => n.type === 'Image').map((n) => n.props.source?.uri);
    expect(uris).toEqual(expect.arrayContaining(['file:///cache/share-frames/thumb-c2.mp4.jpg', 'file:///cache/share-frames/thumb-c1.mp4.jpg']));
    expect(mockThumb).toHaveBeenCalledTimes(2);
    await TestRenderer.act(async () => { mockClipListeners.forEach((fn) => fn()); });
    await flush();
    expect(mockThumb).toHaveBeenCalledTimes(2);
  });
});

describe('B: one upright size for the framer, the cover rect and the share (finding 6)', () => {
  test('the probe\'s upright size drives the framer and the share\'s placement', async () => {
    mockEngine.probeVideo.mockImplementation(() => Promise.resolve({ durationMs: 12000, width: 720, height: 1280 }));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(framer(tree).props).toMatchObject({ photoWidth: 720, photoHeight: 1280 });
    await press(buttonTitled(tree, 'Share video')[0]);
    const opts = mockEngine.exportShareVideo.mock.calls[0][0];
    expect(opts.rect).toEqual(photoCoverRect(720, 1280, 1080, 1920, null));
  });

  test('with no probe, the frame\'s own upright size', async () => {
    mockEngine.probeVideo.mockImplementation(() => Promise.reject(Object.assign(new Error('x'), { code: 'E_UNAVAILABLE' })));
    mockGrab.mockImplementation(() => Promise.resolve({ image: mockImage('F', 1080, 1920), width: 1080, height: 1920 }));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(framer(tree).props).toMatchObject({ photoWidth: 1080, photoHeight: 1920 });
    // The length is the store's when the engine cannot say.
    expect(trimBar(tree).props.durationMs).toBe(12000);
  });
});

describe('C: moving the trim start changes what the preview shows (finding 9)', () => {
  test('the framer is redrawn from the new start, with the look and the framing kept', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    expect(framer(tree).props.photoUri).toContain('F-c1-0');
    await press(byLabelStart(tree, 'Iron: ')[0]);
    const crop = { zoom: 1.4, cx: 0.45, cy: 0.5 };
    await TestRenderer.act(async () => { framer(tree).props.onChange(crop); });
    await flush();
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 4000, endMs: 16000 }); });
    await flush();
    expect(framer(tree).props.photoUri).toContain('F-c1-4000');
    expect(framer(tree).props.crop).toEqual(crop);
    expect(byLabelStart(tree, 'Iron: ')[0].props.accessibilityState).toEqual({ selected: true });
  });
});

describe('D: Film now shows the recording flow\'s sheets (finding 4)', () => {
  test('the privacy primer appears from the share screen before the camera ever opens', async () => {
    const { tree, navigation } = await mount(SESSION);
    expect(texts(tree)).not.toContain(CLIP_STRINGS.primerTitle);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await press(buttonTitled(tree, 'Film now')[0]);
    expect(texts(tree)).toContain(CLIP_STRINGS.primerTitle);
    expect(navigation.navigate).not.toHaveBeenCalledWith('ClipCamera', expect.anything());
    await press(buttonTitled(tree, CLIP_STRINGS.primerOpen)[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('ClipCamera', expect.objectContaining({ workoutId: 'w1', source: 'share' }));
  });
});

describe('E: a photo chosen after a video replaces it (finding 5)', () => {
  test('Gallery after a video: the video, its window and its preview go, and Share shares the image', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photos/p.jpg' }] });
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(texts(tree)).toContain('Share video');
    await press(byLabel(tree, 'Gallery, choose a photo')[0]);
    expect(texts(tree)).toContain('Share image');
    expect(trimBar(tree)).toBeUndefined();
    expect(byLabel(tree, 'Gallery, choose a photo')[0].props.accessibilityState).toEqual({ selected: true });
    expect(byLabel(tree, 'Video, choose a video')[0].props.accessibilityState).toEqual({ selected: false });
    expect(lastStill().bgPhoto).toBe(mockPhoto);
    await press(buttonTitled(tree, 'Share image')[0]);
    expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), expect.objectContaining({ mimeType: 'image/png' }));
  });

  test('a photo chosen while a video\'s first frame is on its way: the video never lands', async () => {
    const slow = deferred();
    mockGrab.mockImplementation(() => slow.promise);
    mockPicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photos/cam.jpg' }] });
    const { tree } = await mount(SESSION);
    await press(byLabelStart(tree, 'Use video: Bench press')[0]);
    await press(byLabel(tree, 'Photo, take one with the camera')[0]);
    expect(byTestID(tree, 'share-preview-busy')).toHaveLength(0);
    await TestRenderer.act(async () => { slow.resolve(frameAt(CLIP_SET, 0)); });
    await flush();
    expect(texts(tree)).toContain('Share image');
    expect(lastStill().bgPhoto).toBe(mockPhoto);
  });
});

describe('F: Full screen\'s own shape reaches every video job (finding 7)', () => {
  test('the share and the preview are made at the phone\'s shape, evened', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(byLabel(tree, 'Full screen')[0]);
    await press(byLabel(tree, 'Play the video')[0]);
    await press(byLabel(tree, 'Pause the video')[0]);
    await press(buttonTitled(tree, 'Share video')[0]);
    const heights = mockEngine.exportShareVideo.mock.calls.map((c) => c[0].outHeight);
    expect(heights).toEqual([2000, 2000]);
  });
});

describe('G: the Sticker is an image, and keeps the video for later (finding 8)', () => {
  test('Share and Save take the image path under the Sticker; another format brings the video back', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(byLabel(tree, 'Sticker')[0]);
    expect(texts(tree)).toContain('Share image');
    expect(texts(tree)).not.toContain('Share video');
    await press(buttonTitled(tree, 'Share image')[0]);
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(expect.stringMatching(/volyume-session-sticker-\d+\.png$/), expect.objectContaining({ mimeType: 'image/png' }));
    expect(mockMediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith(expect.stringMatching(/\.png$/));
    await press(byLabel(tree, 'Story')[0]);
    expect(texts(tree)).toContain('Share video');
    expect(trimBar(tree).props.uri).toBe(CLIP_SET.uri);
  });
});

describe('H: the scrim over a video is read across its window (addendum 4, finding 10)', () => {
  test('eight frames through the window, small, the first and the last included; the bright tier until read; then the read tone in the framer, the preview and the share', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    // Before the reading lands: the bright tier (rule 3's safe side).
    const before = overlayDraws(640).pop();
    expect(before.toneOverride).toEqual(expect.objectContaining({ luminance: VIDEO_SCRIM_TIER_LUMINANCE }));
    await settleTone();
    expect(mockEngine.extractFrames).toHaveBeenCalledTimes(1);
    const [uri, times, opts] = mockEngine.extractFrames.mock.calls[0];
    expect(uri).toBe(CLIP_LONG.uri);
    expect(times).toHaveLength(8);
    expect(times[0]).toBe(0);
    expect(times[7]).toBe(14999);
    expect(opts.maxEdge).toBeLessThanOrEqual(256);
    const read = { ...BRIGHT_READING };
    expect(overlayDraws(640).pop().toneOverride).toEqual(read);
    mockDraw.mockClear();
    await press(byLabel(tree, 'Play the video')[0]);
    expect(overlayDraws(540).pop().toneOverride).toEqual(read);
    await press(byLabel(tree, 'Pause the video')[0]);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(overlayDraws(1080).pop().toneOverride).toEqual(read);
  });

  test('moving the window reads the new window again; a dark video is held on the bright tier', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    await settleTone();
    const { sampleAverageTone } = require('../../lib/shareCard/drawShareCard');
    sampleAverageTone.mockImplementation(() => ({ r: 5, g: 5, b: 5, luminance: 8, topLuminance: 8 }));
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 3000, endMs: 13000 }); });
    await flush();
    // Straight after the move, until the new reading: the bright tier.
    expect(overlayDraws(640).pop().toneOverride.luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
    await settleTone();
    expect(mockEngine.extractFrames).toHaveBeenCalledTimes(2);
    const times = mockEngine.extractFrames.mock.calls[1][1];
    expect([times[0], times[7]]).toEqual([3000, 12999]);
    expect(overlayDraws(640).pop().toneOverride).toEqual({ r: 5, g: 5, b: 5, luminance: VIDEO_SCRIM_TIER_LUMINANCE, topLuminance: VIDEO_SCRIM_TIER_LUMINANCE });
    sampleAverageTone.mockImplementation(() => ({ ...BRIGHT_READING }));
  });

  test('frames the engine cannot read leave the bright tier, never a lighter one', async () => {
    mockEngine.extractFrames.mockImplementation(() => Promise.reject(Object.assign(new Error('x'), { code: 'E_DECODE' })));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(overlayDraws(1080).pop().toneOverride.luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
  });
});

describe('I: leaving stops every engine job; nothing fires after (finding 11)', () => {
  test('leaving while the SHARE is being made cancels it, and no share sheet or line follows', async () => {
    const job = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => job.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.cancelExport).not.toHaveBeenCalled();
    await TestRenderer.act(async () => { tree.unmount(); });
    expect(mockEngine.cancelExport).toHaveBeenCalled();
    mockToastShow.mockClear();
    await TestRenderer.act(async () => { job.resolve({ uri: 'file:///cache/share-video/late.mp4' }); });
    await flush();
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('leaving while SAVING: nothing is saved and nothing is said', async () => {
    const job = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => job.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    await TestRenderer.act(async () => { tree.unmount(); });
    mockToastShow.mockClear();
    await TestRenderer.act(async () => { job.reject(Object.assign(new Error('stopped'), { code: 'E_CANCELLED' })); });
    await flush();
    expect(mockMediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('coming back while the last video is still finishing says so, never a dead tap', async () => {
    mockEngine.exportShareVideo.mockImplementation(() => Promise.reject(Object.assign(new Error('busy'), { code: 'E_BUSY' })));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockToastShow).toHaveBeenCalledWith(BUSY_LINE, expect.objectContaining({ variant: 'info' }));
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('J: the files this screen makes are cleared (finding 12)', () => {
  test('each overlay picture is deleted after its job; leaving clears the frames', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    const overlay = mockEngine.exportShareVideo.mock.calls[0][0].overlayPngUri;
    expect(mockFs.deleteAsync).toHaveBeenCalledWith(overlay, { idempotent: true });
    expect(mockEngine.deleteFrames).not.toHaveBeenCalled();
    await TestRenderer.act(async () => { tree.unmount(); });
    expect(mockEngine.deleteFrames).toHaveBeenCalled();
  });

  test('opening the screen clears finished videos older than an hour, and only those', async () => {
    const nowS = Date.now() / 1000;
    mockFs.readDirectoryAsync.mockImplementation(() => Promise.resolve(['old.mp4', 'new.mp4', 'note.txt']));
    mockFs.getInfoAsync.mockImplementation((uri) => Promise.resolve({
      exists: true, modificationTime: uri.endsWith('old.mp4') ? nowS - 7200 : nowS - 60,
    }));
    await mount(SESSION);
    expect(mockFs.readDirectoryAsync).toHaveBeenCalledWith('file:///cache/share-video/');
    expect(mockFs.deleteAsync).toHaveBeenCalledWith('file:///cache/share-video/old.mp4', { idempotent: true });
    expect(mockFs.deleteAsync).not.toHaveBeenCalledWith('file:///cache/share-video/new.mp4', expect.anything());
    expect(mockFs.deleteAsync).not.toHaveBeenCalledWith('file:///cache/share-video/note.txt', expect.anything());
  });
});

describe('K: a made video is reused only when nothing that went into it changed (finding 13)', () => {
  test('the app\'s typefaces arriving between two shares makes the video again', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => { mockFaces.resolve({ bold: { id: 'interBold' }, regular: { id: 'interRegular' } }); });
    await flush();
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
  });

  test('the scrim\'s tone arriving between two shares makes the video again', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
  });
});

describe('L: the safety gate closing drops the video (finding 14)', () => {
  test('every video surface goes, the trim bar included, and the share is the image', async () => {
    const { tree, rerender } = await mount({ ...SESSION, clipId: 'c2' });
    expect(trimBar(tree)).toBeDefined();
    mockSuppress.value = true;
    await rerender();
    expect(trimBar(tree)).toBeUndefined();
    expect(texts(tree)).toContain('Share image');
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(0);
    expect(byLabel(tree, 'Play the video')).toHaveLength(0);
    expect(texts(tree)).not.toContain('Your videos from this workout');
    await press(buttonTitled(tree, 'Share image')[0]);
    expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
  });

  test('a video share that finishes after the gate closed is never handed on', async () => {
    const job = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => job.promise);
    const { rerender, tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    mockSuppress.value = true;
    await rerender();
    expect(mockEngine.cancelExport).toHaveBeenCalled();
    await TestRenderer.act(async () => { job.resolve({ uri: 'file:///cache/share-video/late.mp4' }); });
    await flush();
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });
});

describe('M: the chosen video\'s own tile does nothing; a PR set\'s video opens its card (finding 15)', () => {
  test('tapping the selected tile or row keeps the look, the framing and the window', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    await press(byLabelStart(tree, 'Iron: ')[0]);
    const crop = { zoom: 1.3, cx: 0.4, cy: 0.5 };
    await TestRenderer.act(async () => { framer(tree).props.onChange(crop); });
    await flush();
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 3000, endMs: 12000 }); });
    await flush();
    const grabs = mockGrab.mock.calls.length;
    await press(byLabelStart(tree, 'Use video: After the workout')[0]);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await press(byLabel(tree, 'After the workout, 22 seconds')[0]);
    expect(mockGrab.mock.calls.length).toBe(grabs);
    expect(byLabelStart(tree, 'Iron: ')[0].props.accessibilityState).toEqual({ selected: true });
    expect(framer(tree).props.crop).toEqual(crop);
    expect(trimBar(tree).props).toMatchObject({ startMs: 3000, endMs: 12000 });
  });

  test('a PR set\'s video chosen from the strip opens that PR\'s card', async () => {
    const { tree } = await mount({ ...SESSION, prList: [PR] });
    expect(lastStill().params.cardType).toBe('session');
    await press(byLabelStart(tree, 'Use video: Bench press')[0]);
    expect(lastStill().params.cardType).toBe('pr');
  });

  test('a PR set\'s video chosen from the sheet opens that PR\'s card', async () => {
    const { tree } = await mount({ ...SESSION, prList: [PR] });
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await press(byLabel(tree, 'Bench press, set 3, 12 seconds')[0]);
    expect(lastStill().params.cardType).toBe('pr');
  });
});

describe('N: what a screen reader hears (findings 16 and 17)', () => {
  test('Video is named like its siblings; Reset names the video; lengths are spoken in seconds and shown as the trim bar shows them', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(1);
    await TestRenderer.act(async () => { framer(tree).props.onChange({ zoom: 1.5, cx: 0.4, cy: 0.5 }); });
    await flush();
    expect(byLabel(tree, 'Reset the video to the centre')).toHaveLength(1);
    expect(byLabel(tree, 'Reset the photo to the centre')).toHaveLength(0);
    expect(byLabel(tree, 'Use video: Bench press, set 3, 12 seconds')).toHaveLength(1);
    const all = texts(tree);
    expect(all).toContain('0:12');
    expect(all).toContain('0:22');
    expect(all.some((x) => /^\d+ s$/.test(x))).toBe(false);
  });
});
