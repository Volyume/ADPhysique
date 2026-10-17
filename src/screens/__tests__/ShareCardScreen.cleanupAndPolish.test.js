/**
 * ShareCardScreen: the audit of 2026-10-17 (files left in the cache, the
 * pickers, the preview's failure, a cache that was cleared, and the small
 * lines under Background, Sticker and Film now). Each block was written to
 * FAIL against the screen as it stood before:
 *   E1  the sweep also clears the card pictures older than an hour; leaving
 *       deletes the made videos, previews and card pictures; a video that
 *       goes deletes its files; a gallery or camera copy goes with its video;
 *       a saved card picture is deleted at once;
 *   E4  a denied library permission still tries the picker (the permission
 *       line only if the picker cannot open);
 *   E5  saving asks for write-only access;
 *   E6  a preview that cannot play goes back to the still, says so, and is
 *       made again on the next Play;
 *   E7  a made video whose file is gone is made again;
 *   E8  a failed share or save is logged;
 *   E13 the Video segment's place is held while the safety check is read,
 *       and a calm or flagged person never gets the segment;
 *   U4 U5 U7 U9 U10 U11 U12  the small lines and the stacking at large text.
 * The harness is the video audit's (ShareCardScreen.videoAudit.test.js).
 */
/* eslint-disable no-unused-vars -- the harness is shared with the video audit; not every helper is used here */
const React = require('react');
const TestRenderer = require('react-test-renderer');
const Button = require('../../components/Button').default;

const mockLogError = jest.fn();
jest.mock('../../lib/errorLog', () => ({ logError: (...a) => mockLogError(...a), logWarn: jest.fn(), logInfo: jest.fn() }));
const mockKeepAwake = require('expo-keep-awake');

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
// Re-pinned 2026-10-16 (audit item 1): Share and Save with a video wait
// for the scrim's tone for the window and then run by themselves; these
// blocks pin what happens once they run, so they are pressed once the tone
// is read, as a person meets them a moment after the window settles. A
// press before the tone is pinned in ShareCardScreen.videoAudit2.test.js.
async function press(node) {
  if (node && (node.props.title === 'Share video' || node.props.title === 'Save to gallery')) await settleTone();
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
  mockFs.getInfoAsync.mockImplementation(() => Promise.resolve({ exists: true }));
  mockListClips.mockResolvedValue([CLIP_SET, CLIP_LONG]);
  mockGetClip.mockImplementation((_u, id) => Promise.resolve([CLIP_SET, CLIP_LONG].find((c) => c.id === id) || null));
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  useAppStore.setState({ user: { id: 'u1' } });
});


const OUT = 'file:///cache/share-video/out.mp4';
const deleted = () => mockFs.deleteAsync.mock.calls.map((c) => c[0]);
const chooseBench = async (tree) => { await press(byLabelStart(tree, 'Use video: Bench press')[0]); await settleTone(); };
const players = (tree) => tree.root.findAll((n) => n.type === 'Video');
const unmount = async (tree) => { await TestRenderer.act(async () => { tree.unmount(); }); await flush(); };

describe('E1: nothing a share makes is left in the cache', () => {
  test('the sweep also clears card pictures (volyume-*.png) older than an hour from the cache root, and only those', async () => {
    const nowS = Date.now() / 1000;
    mockFs.readDirectoryAsync.mockImplementation((dir) => Promise.resolve(
      dir === 'file:///cache/' ? ['volyume-story-story-1.png', 'volyume-overlay-1080-2.png', 'volyume-new-3.png', 'other.png', 'notes.txt'] : [],
    ));
    mockFs.getInfoAsync.mockImplementation((uri) => Promise.resolve({
      exists: true, modificationTime: uri.endsWith('new-3.png') ? nowS - 60 : nowS - 7200,
    }));
    await mount(SESSION);
    expect(deleted()).toContain('file:///cache/volyume-story-story-1.png');
    expect(deleted()).toContain('file:///cache/volyume-overlay-1080-2.png');
    expect(deleted()).not.toContain('file:///cache/volyume-new-3.png');
    expect(deleted()).not.toContain('file:///cache/other.png');
    expect(deleted()).not.toContain('file:///cache/notes.txt');
  });

  test('a shared video stays for the share sheet, then leaving deletes it', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockSharing.shareAsync).toHaveBeenCalledWith(OUT, expect.anything());
    expect(deleted()).not.toContain(OUT);
    await unmount(tree);
    expect(deleted()).toContain(OUT);
  });

  test('a preview that was made goes with the screen too', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/share-video/preview.mp4' }));
    await press(byTestID(tree, 'share-play-control')[0]);
    expect(players(tree)).toHaveLength(1);
    await unmount(tree);
    expect(deleted()).toContain('file:///cache/share-video/preview.mp4');
  });

  test('a video that goes (None) deletes the files it forgets', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    await press(byTestID(tree, 'share-play-control')[0]);
    expect(deleted()).not.toContain(OUT);
    await press(byLabelStart(tree, 'None, no photo')[0]);
    expect(deleted()).toContain(OUT);
  });

  test('a saved card picture is deleted as soon as the gallery has it', async () => {
    const { tree } = await mount(SESSION);
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockMediaLibrary.saveToLibraryAsync).toHaveBeenCalledTimes(1);
    const png = mockMediaLibrary.saveToLibraryAsync.mock.calls[0][0];
    expect(png).toMatch(/^file:\/\/\/cache\/volyume-.*\.png$/);
    expect(deleted()).toContain(png);
  });

  test('a shared card picture is left for the share sheet, then deleted when the screen goes', async () => {
    const { tree } = await mount(SESSION);
    await press(buttonTitled(tree, 'Share image')[0]);
    expect(mockSharing.shareAsync).toHaveBeenCalledTimes(1);
    const png = mockSharing.shareAsync.mock.calls[0][0];
    expect(deleted()).not.toContain(png);
    await unmount(tree);
    expect(deleted()).toContain(png);
  });

  test('a gallery copy of a video goes with the screen; a stored workout video never does', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///cache/ImagePicker/g.mp4', duration: 9000 }] });
    const { tree } = await mount(SESSION);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await press(buttonTitled(tree, 'From your gallery')[0]);
    await settleTone();
    await unmount(tree);
    expect(deleted()).toContain('file:///cache/ImagePicker/g.mp4');
    expect(deleted()).not.toContain('file:///docs/clips/c2.mp4');
  });

  test('a stored workout video chosen and left is never deleted', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    await unmount(tree);
    expect(deleted().filter((u) => u.includes('/docs/clips/'))).toEqual([]);
  });
});

describe('E4: a denied library permission still tries the picker', () => {
  test('video: the picker opens anyway; the permission line only if it cannot', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const { tree } = await mount(SESSION);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await press(buttonTitled(tree, 'From your gallery')[0]);
    expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
    expect(mockToastShow).not.toHaveBeenCalled();
    mockPicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('no access'));
    await press(buttonTitled(tree, 'From your gallery')[0]);
    expect(mockToastShow).toHaveBeenCalledWith('Photo access is needed to choose a video.', { variant: 'warning' });
  });

  test('photo: the picker opens anyway; the permission line only if it cannot', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const { tree } = await mount(SESSION);
    await press(byLabel(tree, 'Gallery, choose a photo')[0]);
    expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
    expect(mockToastShow).not.toHaveBeenCalled();
    mockPicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('no access'));
    await press(byLabel(tree, 'Gallery, choose a photo')[0]);
    expect(mockToastShow).toHaveBeenCalledWith('Photo access is needed to choose a background', { variant: 'warning' });
  });

  test('a granted permission that then fails to open keeps the old line', async () => {
    mockPicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
    mockPicker.launchImageLibraryAsync.mockRejectedValueOnce(new Error('boom'));
    const { tree } = await mount(SESSION);
    await press(byLabel(tree, 'Gallery, choose a photo')[0]);
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't open your photos, try again", { variant: 'error' });
  });
});

describe('E5, E8: saving asks write-only; a failed share or save is logged', () => {
  test('Save to gallery asks for write-only access', async () => {
    const { tree } = await mount(SESSION);
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockMediaLibrary.requestPermissionsAsync).toHaveBeenCalledWith(true);
  });

  test('a save that throws is logged as ShareCardScreen.save', async () => {
    mockMediaLibrary.saveToLibraryAsync.mockRejectedValueOnce(new Error('disk'));
    const { tree } = await mount(SESSION);
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockLogError).toHaveBeenCalledWith('ShareCardScreen.save', expect.any(Error), expect.anything());
    expect(mockToastShow).toHaveBeenCalledWith('The image could not be saved. Try again.', { variant: 'error' });
  });

  test('a share that throws is logged as ShareCardScreen.share', async () => {
    mockSharing.shareAsync.mockRejectedValueOnce(new Error('sheet'));
    const { tree } = await mount(SESSION);
    await press(buttonTitled(tree, 'Share image')[0]);
    expect(mockLogError).toHaveBeenCalledWith('ShareCardScreen.share', expect.any(Error), expect.anything());
  });
});

describe('E6, E7: a preview that cannot play, and a cache the phone cleared', () => {
  test('the player failing goes back to the still, says so, and the next Play makes it again', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    await press(byTestID(tree, 'share-play-control')[0]);
    expect(players(tree)).toHaveLength(1);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => { players(tree)[0].props.onError('decoder'); });
    await flush();
    expect(players(tree)).toHaveLength(0);
    expect(mockToastShow).toHaveBeenCalledWith('The preview could not be played. Try again.', { variant: 'error' });
    expect(deleted()).toContain(OUT);
    await press(byTestID(tree, 'share-play-control')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
    expect(players(tree)).toHaveLength(1);
  });

  test('a made video whose file is gone is made again, not shared from a missing path', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    await press(buttonTitled(tree, 'Share video')[0]);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    mockFs.getInfoAsync.mockImplementation((uri) => Promise.resolve({ exists: uri !== OUT }));
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
  });

  test('a preview file the phone cleared is made again on Play', async () => {
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    await press(byTestID(tree, 'share-play-control')[0]);
    await press(byTestID(tree, 'share-preview-video')[0]); // Pause
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    mockFs.getInfoAsync.mockImplementation((uri) => Promise.resolve({ exists: uri !== OUT }));
    await press(byTestID(tree, 'share-play-control')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
  });
});

describe('E13: the Video segment\'s place is held while the safety check is read', () => {
  test('held (empty, hidden from a screen reader) while the check is closed, then gone; the segment is never offered under calm or a flag', async () => {
    mockSuppress.value = true;
    const { tree } = await mount(SESSION);
    expect(byTestID(tree, 'share-video-slot-held')).toHaveLength(1);
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(0);
    await TestRenderer.act(async () => { await new Promise((r) => setTimeout(r, 1000)); });
    expect(byTestID(tree, 'share-video-slot-held')).toHaveLength(0);
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(0);
  });

  test('with the check lifted the real segment is there and no held place', async () => {
    const { tree } = await mount(SESSION);
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(1);
    expect(byTestID(tree, 'share-video-slot-held')).toHaveLength(0);
  });
});

describe('U4, U5, U9: the lines under Background, Sticker and Film now', () => {
  test('U4: "Using: Bench press, 12 seconds" under Background, or "your video" with no exercise name', async () => {
    const { tree } = await mount(SESSION);
    expect(byTestID(tree, 'share-using-video')).toHaveLength(0);
    await chooseBench(tree);
    expect(texts(tree)).toContain('Using: Bench press, 12 seconds');
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await press(byLabelStart(tree, 'Use video: ')[byLabelStart(tree, 'Use video: ').length - 1]);
    await settleTone();
    expect(texts(tree).some((t) => /^Using: .+, \d+ seconds$/.test(t))).toBe(true);
  });

  test('U5: under the Sticker with a video chosen, the video is said not to be used', async () => {
    const { tree } = await mount(SESSION);
    await press(byLabel(tree, 'Sticker')[0]);
    expect(byTestID(tree, 'share-sticker-video-hint')).toHaveLength(0);
    await press(byLabel(tree, 'Story')[0]);
    await chooseBench(tree);
    await press(byLabel(tree, 'Sticker')[0]);
    expect(texts(tree)).toContain('Your video is not used on a sticker. Switch format to bring it back.');
    await press(byLabel(tree, 'Story')[0]);
    expect(byTestID(tree, 'share-sticker-video-hint')).toHaveLength(0);
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(1);
  });

  test('U9: the keep window sits quietly under Film now', async () => {
    const { settingsKeepSub } = require('../../lib/clips/rules');
    const { tree } = await mount(SESSION);
    expect(byTestID(tree, 'share-film-keep-line')).toHaveLength(0);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    await flush();
    expect(texts(tree)).toContain(settingsKeepSub(7));
  });
});

describe('U10: the largest text stacks the Background row as the Format row does', () => {
  const RN = require('react-native');
  const gallery = (tree) => byLabel(tree, 'Gallery, choose a photo')[0];
  const flatStyle = (node) => Object.assign({}, ...[].concat(node.props.style).flat(Infinity).filter(Boolean));
  let spy;
  afterEach(() => { if (spy) spy.mockRestore(); spy = null; });
  const withFontScale = (fontScale) => {
    if (spy) spy.mockRestore();
    spy = jest.spyOn(RN, 'useWindowDimensions').mockReturnValue({ width: 375, height: 812, scale: 2, fontScale });
  };

  test('at normal text the four sit side by side; at a large font scale icon over word', async () => {
    withFontScale(1);
    const normal = await mount(SESSION);
    expect(flatStyle(gallery(normal.tree)).flexDirection).toBe('row');
    withFontScale(2);
    const large = await mount(SESSION);
    expect(flatStyle(gallery(large.tree)).flexDirection).toBe('column');
    expect(flatStyle(byLabel(large.tree, 'None, no photo')[0]).flexDirection).toBe('column');
    expect(flatStyle(byLabel(large.tree, 'Video, choose a video')[0]).flexDirection).toBe('column');
  });
});

describe('U11, U12: while a video is made', () => {
  test('the "Making your video…" line is near the top as well as by Share, and the phone stays awake until it is done', async () => {
    const job = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => job.promise);
    const { tree } = await mount(SESSION);
    await chooseBench(tree);
    mockKeepAwake.activateKeepAwakeAsync.mockClear();
    mockKeepAwake.deactivateKeepAwake.mockClear();
    await settleTone();
    await TestRenderer.act(async () => { buttonTitled(tree, 'Share video')[0].props.onPress(); });
    await flush();
    expect(byTestID(tree, 'share-making-video')).toHaveLength(1);
    expect(byTestID(tree, 'share-making-video-top')).toHaveLength(1);
    expect(texts(tree)).toContain('Making your video… Keep Volyume open.');
    expect(mockKeepAwake.activateKeepAwakeAsync).toHaveBeenCalledWith('volyume-share-video');
    expect(mockKeepAwake.deactivateKeepAwake).not.toHaveBeenCalled();
    await TestRenderer.act(async () => { job.resolve({ uri: OUT }); });
    await flush();
    expect(byTestID(tree, 'share-making-video-top')).toHaveLength(0);
    expect(mockKeepAwake.deactivateKeepAwake).toHaveBeenCalledWith('volyume-share-video');
  });
});
