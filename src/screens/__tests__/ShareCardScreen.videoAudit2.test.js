/**
 * ShareCardScreen with a VIDEO: the second audit of 2026-10-16 (items 1, 2,
 * 6, 8, 9, 10 and 11; item 3 is pinned in ShareCardScreen.collapsingPreview,
 * item 4 in src/lib/shareVideo, item 5 in VideoTrimBar.test). The scaffold
 * (every mock and helper) is ShareCardScreen.videoAudit.test.js's own, so
 * the two suites pin one screen the same way. The auditor's reproductions
 * (Play before the tone, a theme change during a share, None during a save)
 * are folded in as blocks 1 and 2.
 *
 * Each block was written to FAIL against the screen at f5c11ad:
 *   1  Play, Share and Save with a video wait for the scrim's tone for the
 *      window (a spinner and "Getting your video ready" on Play), then run
 *      by themselves, so the video is made with the final tone and a
 *      finished preview is never thrown away; a preview that lands after
 *      something changed is kept and the person told; a tone read that
 *      never answers is given up (15 s) and the bright tier stands;
 *   2  while the share's video is made, every control that changes what is
 *      shared is disabled, looks it and says so (Cancel is the way out),
 *      and a share or save whose inputs changed anyway is never handed on;
 *   6  a still that cannot be read after a trim move keeps the window and
 *      says the preview could not show that moment, never "could not be
 *      opened"; its busy label is "Showing that moment";
 *   8  the safety gate closes the video chooser, and Film now and the
 *      gallery do nothing under it;
 *   9  the framer's spoken words name a video as a video;
 *   10 the same line is never queued again while it is still on screen;
 *   11 a still that is replaced is released, and the last one on leaving.
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
const { drawShareCard: mockDraw } = require('../../lib/shareCard/drawShareCard');
const { CLIP_STRINGS, clipDisplayName, formatClipDuration } = require('../../lib/clips/rules');
const secondsWordsOf = (ms) => { const n = Math.max(0, Math.round((Number(ms) || 0) / 1000)); return `${n} ${n === 1 ? 'second' : 'seconds'}`; };
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
  mockFs.getInfoAsync.mockImplementation(() => Promise.resolve({ exists: true }));
  mockListClips.mockResolvedValue([CLIP_SET, CLIP_LONG]);
  mockGetClip.mockImplementation((_u, id) => Promise.resolve([CLIP_SET, CLIP_LONG].find((c) => c.id === id) || null));
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  useAppStore.setState({ user: { id: 'u1' } });
});


const { PHOTO_LOOKS } = require('../../lib/shareCard/photoLooks');

const SHARE_CHANGED_LINE = 'Your share changed while the video was being made. Tap Share again.';
const PREVIEW_CHANGED_LINE = 'Your video changed while the preview was being made. Tap play to see it now.';
const MOMENT_FAILED_LINE = "The preview could not show that moment. Your share will still start there.";
const flatStyle = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));
// Re-pinned 2026-10-16 (render audit, lead ruling 1): Play is now a
// secondary button under the preview, off the card, whose visible label is
// "Play with your look"; its accessible name is that label (the name holds
// the visible words), so it is found by that name. Pause keeps "Pause the
// video" (the visible "Pause" is in it).
const playControl = (tree) => byTestID(tree, 'share-play-control')[0];
const toastLines = () => mockToastShow.mock.calls.map((c) => c[0]);
const players = (tree) => tree.root.findAll((n) => n.type === 'Video');
const sheet = (tree) => tree.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Choose a video' && 'visible' in n.props)[0];

// A session with lifts and a highlight to choose, and a PR, so every
// control that changes what is shared is on screen; the video is c1 (no
// PR set), so the session card stays.
const RICH = {
  sessionData: {
    ...SESSION.sessionData,
    liftOptions: [
      { exerciseName: 'Bench press', weight: 80, reps: 5 },
      { exerciseName: 'Squat', weight: 120, reps: 3 },
    ],
    highlightOptions: [{ key: 'h1', text: 'Your most volume in 4 weeks' }],
  },
  prData: PR,
  workoutId: 'w1',
};

describe('1: Play, Share and Save wait for the tone, and nothing finished is thrown away', () => {
  test('Play before the tone: a spinner and "Getting your video ready"; a press waits, then plays by itself with the read tone (auditor reproduction 1)', async () => {
    const d = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => d.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    const waiting = playControl(tree);
    expect(waiting.props.accessibilityLabel).toBe('Getting your video ready');
    expect(waiting.props.accessibilityState).toEqual({ disabled: false, busy: true });
    expect(byTestID(tree, 'share-play-waiting')).toHaveLength(1);
    // Pressed straight away, before the reading: it waits.
    await press(waiting);
    expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
    await settleTone();
    // The reading landed: it played by itself, made with the read tone.
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    expect(overlayDraws(540).pop().toneOverride).toEqual({ ...BRIGHT_READING });
    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/p.mp4' }); });
    await flush();
    expect(players(tree)).toHaveLength(1);
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('once the tone is read, Play reads "Play with your look" with no spinner', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await settleTone();
    expect(playControl(tree).props.accessibilityLabel).toBe('Play with your look');
    expect(byTestID(tree, 'share-play-waiting')).toHaveLength(0);
  });

  test('Save before the tone waits and saves by itself, made with the read tone', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
    expect(buttonTitled(tree, 'Save to gallery')[0].props.loading).toBe(true);
    await settleTone();
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    expect(overlayDraws(1080).pop().toneOverride).toEqual({ ...BRIGHT_READING });
    expect(mockMediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///cache/share-video/out.mp4');
  });

  test('a preview that lands after something changed is kept and the person told; with that change undone, Play is instant', async () => {
    const d = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => d.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await settleTone();
    await press(playControl(tree));
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    // The controls stay open while a PREVIEW is made: the theme changes.
    await press(byLabel(tree, 'Light')[0]);
    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/p.mp4' }); });
    await flush();
    expect(players(tree)).toHaveLength(0);
    expect(toastLines()).toContain(PREVIEW_CHANGED_LINE);
    // Back to Dark: what was made is what is on screen again, so Play uses it.
    await press(byLabel(tree, 'Dark')[0]);
    await press(playControl(tree));
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    expect(players(tree)).toHaveLength(1);
  });

  test('a tone read that never answers is given up after 15 s: the bright tier stands and a waiting Play plays', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'] });
    try {
      mockEngine.extractFrames.mockImplementation(() => new Promise(() => {}));
      const { tree } = await mount({ ...SESSION, clipId: 'c2' });
      await press(playControl(tree));
      await TestRenderer.act(async () => { jest.advanceTimersByTime(400); });
      await flush();
      expect(mockEngine.extractFrames).toHaveBeenCalledTimes(1);
      // Item 4: the tone asks for the nearest quick frames, small.
      expect(mockEngine.extractFrames.mock.calls[0][2]).toEqual({ maxEdge: 160, exact: false });
      await TestRenderer.act(async () => { jest.advanceTimersByTime(14000); });
      await flush();
      expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
      await TestRenderer.act(async () => { jest.advanceTimersByTime(1100); });
      await flush();
      expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
      expect(overlayDraws(540).pop().toneOverride.luminance).toBe(VIDEO_SCRIM_TIER_LUMINANCE);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('2: while the share\'s video is made, nothing that changes it can be changed', () => {
  const lockedLabels = (look) => [
    'Story', 'Full screen', 'Feed', 'Square', 'Sticker', 'Dark', 'Light',
    'Gallery, choose a photo', 'Photo, take one with the camera', 'Video, choose a video', 'None, no photo',
    'Session', 'New PR', 'Reset the video to the centre', `${look.name}: ${look.description}`,
  ];
  const lockedPrefixes = ['Top lift', 'Quote or caption:', 'Use video:'];
  const switches = ['Date', 'Plan name', 'Total weight lifted', 'Your most volume in 4 weeks'];

  async function makingWithEverything(d) {
    mockEngine.exportShareVideo.mockImplementation(() => d.promise);
    const m = await mount({ ...RICH, clipId: 'c1' });
    const { tree } = m;
    // A framing off the centre (Reset shows) and a look (Strength shows).
    await TestRenderer.act(async () => { framer(tree).props.onChange({ zoom: 1.5, cx: 0.4, cy: 0.5 }); });
    await flush();
    const look = PHOTO_LOOKS.find((l) => l.key !== 'none');
    await press(byLabel(tree, `${look.name}: ${look.description}`)[0]);
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    return { ...m, look };
  }

  test('every such control is disabled, looks it (0.5) and says so; Cancel is the way out; all back once made', async () => {
    const d = deferred();
    const { tree, look } = await makingWithEverything(d);
    const check = (node, name) => {
      expect({ name, disabled: node.props.disabled }).toEqual({ name, disabled: true });
      expect({ name, state: node.props.accessibilityState && node.props.accessibilityState.disabled }).toEqual({ name, state: true });
    };
    for (const label of lockedLabels(look)) {
      const nodes = byLabel(tree, label);
      expect({ label, found: nodes.length > 0 }).toEqual({ label, found: true });
      check(nodes[0], label);
      expect({ label, opacity: flatStyle(nodes[0].props.style).opacity }).toEqual({ label, opacity: 0.5 });
    }
    for (const prefix of lockedPrefixes) {
      const nodes = byLabelStart(tree, prefix);
      expect({ prefix, found: nodes.length > 0 }).toEqual({ prefix, found: true });
      nodes.forEach((n) => check(n, prefix));
    }
    for (const label of switches) {
      const sw = tree.root.findAll((n) => host(n) && n.type === 'Switch' && n.props.accessibilityLabel === label);
      expect({ label, found: sw.length }).toEqual({ label, found: 1 });
      expect({ label, disabled: sw[0].props.disabled }).toEqual({ label, disabled: true });
    }
    // The look's strength, the framer and the trim bar.
    const slider = byLabel(tree, 'Look strength')[0];
    expect(slider.props.accessibilityState).toEqual({ disabled: true });
    expect(slider.props.accessibilityActions).toEqual([]);
    expect(framer(tree).props.disabled).toBe(true);
    const frame = byLabel(tree, 'Your video on the share image')[0];
    expect(frame.props.accessibilityState).toEqual({ disabled: true });
    expect(frame.props.accessibilityActions).toEqual([]);
    expect(trimBar(tree).props.disabled).toBe(true);
    // The way out.
    expect(byLabel(tree, 'Cancel making the video')).toHaveLength(1);

    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/s.mp4' }); });
    await flush();
    expect(mockSharing.shareAsync).toHaveBeenCalledWith('file:///cache/share-video/s.mp4', expect.anything());
    for (const label of lockedLabels(look)) {
      const n = byLabel(tree, label)[0];
      expect({ label, disabled: !!n.props.disabled }).toEqual({ label, disabled: false });
    }
    expect(framer(tree).props.disabled).toBe(false);
    expect(byLabel(tree, 'Look strength')[0].props.accessibilityState).toBeUndefined();
  });

  test('Which PR and the PR toggles are locked too', async () => {
    const d = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => d.promise);
    const PR2 = { ...PR, exerciseId: 'e2', exerciseName: 'Squat', weight: 120, setId: 's9', setNumber: 2 };
    const { tree } = await mount({ prData: PR, prList: [PR, PR2], workoutId: 'w1', clipId: 'c1' });
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    const which = byLabelStart(tree, 'Personal record:')[0];
    expect(which.props.disabled).toBe(true);
    expect(which.props.accessibilityState).toEqual({ disabled: true });
    for (const label of ['PR weight', 'Previous best', 'Date']) {
      const sw = tree.root.findAll((n) => host(n) && n.type === 'Switch' && n.props.accessibilityLabel === label)[0];
      expect({ label, disabled: sw.props.disabled }).toEqual({ label, disabled: true });
    }
    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/s.mp4' }); });
    await flush();
  });

  test('the theme cannot be changed while the share is made, so the share is the theme on screen (auditor reproduction 2)', async () => {
    const d = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => d.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    const light = byLabel(tree, 'Light')[0];
    expect(light.props.disabled).toBe(true);
    expect(light.props.accessibilityState).toEqual({ selected: false, disabled: true });
    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/s.mp4' }); });
    await flush();
    expect(overlayDraws(1080).map((o) => o.params.theme)).toEqual(['dark']);
    expect(mockSharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(mockSharing.shareAsync.mock.calls[0][0]).toBe('file:///cache/share-video/s.mp4');
  });

  test('None cannot be pressed while a save is made (auditor reproduction 3); a video removed meanwhile is never saved', async () => {
    const d = deferred();
    mockEngine.exportShareVideo.mockImplementation(() => d.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    await settleTone();
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(byLabel(tree, 'None, no photo')[0].props.disabled).toBe(true);
    // The video goes from the store anyway (deleted elsewhere).
    mockListClips.mockResolvedValue([CLIP_SET]);
    await TestRenderer.act(async () => { mockClipListeners.forEach((fn) => fn()); });
    await flush();
    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/n.mp4' }); });
    await flush();
    expect(mockMediaLibrary.saveToLibraryAsync).not.toHaveBeenCalled();
    expect(toastLines()).not.toContain('Saved to your gallery.');
  });

  test('a share whose inputs changed anyway (the app\'s typefaces arriving) is never handed on, and says so; Share again shares the new one', async () => {
    const d = deferred();
    mockEngine.exportShareVideo.mockImplementationOnce(() => d.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    await TestRenderer.act(async () => { mockFaces.resolve({ bold: { id: 'interBold' }, regular: { id: 'interRegular' } }); });
    await flush();
    await TestRenderer.act(async () => { d.resolve({ uri: 'file:///cache/share-video/old.mp4' }); });
    await flush();
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
    expect(toastLines()).toContain(SHARE_CHANGED_LINE);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
    expect(mockSharing.shareAsync).toHaveBeenCalledTimes(1);
    expect(mockSharing.shareAsync.mock.calls[0][0]).toBe('file:///cache/share-video/out.mp4');
  });
});

describe('6: a still that cannot be read after a trim move', () => {
  test('keeps the window, says the preview could not show that moment (never "could not be opened"), and its busy label says so', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    await settleTone();
    const still = deferred();
    mockGrab.mockImplementation(() => still.promise);
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 3000, endMs: 13000 }); });
    await flush();
    const busy = byTestID(tree, 'share-preview-busy')[0];
    expect(busy.props.accessibilityLabel).toBe('Showing that moment');
    await TestRenderer.act(async () => { still.resolve(null); });
    await flush();
    expect(byTestID(tree, 'share-preview-busy')).toHaveLength(0);
    expect(toastLines()).toContain(MOMENT_FAILED_LINE);
    expect(toastLines()).not.toContain(CLIP_STRINGS.shareVideoCannotOpen);
    expect(trimBar(tree).props).toMatchObject({ startMs: 3000, endMs: 13000 });
    await settleTone();
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo.mock.calls[0][0]).toMatchObject({ startMs: 3000, durationMs: 10000 });
  });

  test('opening a video still says "Opening your video" while its first frame comes', async () => {
    const first = deferred();
    mockGrab.mockImplementation(() => first.promise);
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    expect(byTestID(tree, 'share-preview-busy')[0].props.accessibilityLabel).toBe('Opening your video');
    await TestRenderer.act(async () => { first.resolve(frameAt(CLIP_LONG, 0)); });
    await flush();
  });
});

describe('8: the safety gate and the video chooser', () => {
  test('the chooser closes when the gate closes, with no video chosen, and stays closed after', async () => {
    const { tree, rerender } = await mount(SESSION);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    expect(sheet(tree).props.visible).toBe(true);
    mockSuppress.value = true;
    await rerender();
    expect(sheet(tree).props.visible).toBe(false);
    mockSuppress.value = false;
    await rerender();
    expect(sheet(tree).props.visible).toBe(false);
  });

  test('Film now and the gallery do nothing under the gate, even from a chooser opened before it closed', async () => {
    const { tree, rerender, navigation } = await mount(SESSION);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    const gallery = buttonTitled(tree, 'From your gallery')[0].props.onPress;
    const film = buttonTitled(tree, 'Film now')[0].props.onPress;
    mockSuppress.value = true;
    await rerender();
    await TestRenderer.act(async () => { await gallery(); film(); });
    await flush();
    expect(mockPicker.requestMediaLibraryPermissionsAsync).not.toHaveBeenCalled();
    expect(mockPicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(texts(tree)).not.toContain(CLIP_STRINGS.primerTitle);
  });
});

// Render audit 2026-10-16, lead ruling 5: at the largest text size the
// chooser cut names to one line. Written to FAIL against numberOfLines={1}.
describe('the chooser\'s rows at a large text size', () => {
  test('a name wraps to two lines, the row grows to fit (a floor, never a fixed height), and the duration stays on the right', async () => {
    const { tree } = await mount(SESSION);
    await press(byLabel(tree, 'Video, choose a video')[0]);
    const s = sheet(tree);
    for (const row of [CLIP_SET, CLIP_LONG]) {
      const label = `${clipDisplayName(row)}, ${secondsWordsOf(row.durationMs)}`;
      const r = s.findAll((n) => host(n) && n.props.accessibilityLabel === label)[0];
      expect(r).toBeTruthy();
      const parts = r.findAll((n) => host(n) && n.type === 'Text');
      const name = parts.find((n) => [].concat(n.props.children).join('') === clipDisplayName(row));
      expect(name.props.numberOfLines).toBe(2);
      const style = flatStyle(r.props.style);
      expect(style.height).toBeUndefined();
      expect(style.flexDirection).toBe('row');
      // The duration is the row's last words, after the name.
      expect([].concat(parts[parts.length - 1].props.children).join('')).toBe(formatClipDuration(row.durationMs));
      expect(parts.indexOf(name)).toBeLessThan(parts.length - 1);
    }
  });
});

describe('9: the framer names what is under the card', () => {
  test('a video is "your video", and every move names the video; a photo stays "your photo"', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    const v = byLabel(tree, 'Your video on the share image')[0];
    expect(v.props.accessibilityHint).toBe('Drag to move your video. Pinch to make it bigger or smaller.');
    expect(v.props.accessibilityActions.map((a) => a.label)).toEqual(['Zoom in', 'Zoom out', 'Move video up', 'Move video down', 'Move video left', 'Move video right']);
    expect(byLabel(tree, 'Your photo on the share image')).toHaveLength(0);
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photos/p.jpg' }] });
    await press(byLabel(tree, 'Gallery, choose a photo')[0]);
    const p = byLabel(tree, 'Your photo on the share image')[0];
    expect(p.props.accessibilityHint).toBe('Drag to move your photo. Pinch to make it bigger or smaller.');
    expect(p.props.accessibilityActions.map((a) => a.label)).toEqual(['Zoom in', 'Zoom out', 'Move photo up', 'Move photo down', 'Move photo left', 'Move photo right']);
  });
});

describe('10: the same line is not queued again while it is still on screen', () => {
  test('three quick taps say the line once; once it has gone, a tap says it again', async () => {
    let now = 1_000_000;
    const spy = jest.spyOn(Date, 'now').mockImplementation(() => now);
    try {
      const { tree } = await mount({ ...SESSION, clipId: 'c2' });
      await settleTone();
      mockEngine.isAvailable.mockImplementation(() => false);
      const share = () => press(buttonTitled(tree, 'Share video')[0]);
      await share();
      await share();
      await share();
      const line = mockEngine.lineForExportError('E_UNAVAILABLE');
      expect(toastLines().filter((x) => x === line)).toHaveLength(1);
      now += 6001; // the line's own 6 s on screen
      await share();
      expect(toastLines().filter((x) => x === line)).toHaveLength(2);
      // Toasts queue: a line behind another is on screen later, so it is
      // held back until that one would have gone too.
      mockToastShow.mockClear();
      now += 60000;
      await share(); // the unavailable line, 6 s
      mockEngine.isAvailable.mockImplementation(() => true);
      mockEngine.exportShareVideo.mockImplementation(() => Promise.reject(Object.assign(new Error('busy'), { code: 'E_BUSY' })));
      await share(); // the busy line, 5 s, queued behind it: on until +11 s
      now += 8000;
      await share();
      expect(toastLines().filter((x) => x === BUSY_LINE)).toHaveLength(1);
      now += 3001;
      await share();
      expect(toastLines().filter((x) => x === BUSY_LINE)).toHaveLength(2);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('11: a still that is replaced is released', () => {
  test('a trim move releases the previous still once the new one is shown; leaving releases the last', async () => {
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    const first = lastStill().bgPhoto;
    expect(first.name).toBe('F-c1-0');
    expect(first.dispose).not.toHaveBeenCalled();
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 3000, endMs: 13000 }); });
    await flush();
    const second = lastStill().bgPhoto;
    expect(second.name).toBe('F-c1-3000');
    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.dispose).not.toHaveBeenCalled();
    await TestRenderer.act(async () => { tree.unmount(); });
    expect(second.dispose).toHaveBeenCalledTimes(1);
  });
});
