/**
 * ShareCardScreen with a VIDEO (D229 addendum 17, the founder's reversal of
 * 2026-10-16: "I wanted the video as an option within the share screen we
 * had"). expo modules, the clip store and the engine are mocked; the screen's
 * own behaviour is what is pinned:
 *   - the share screen is the one screen with every option, and a video is
 *     ONE MORE BACKGROUND beside the photo: Format, Theme, Background, the
 *     looks, Top lifts, Highlights, Quote, Which PR and What to include all
 *     stay on screen with a video chosen;
 *   - the preview is the frame at the chosen start, decoded offscreen through
 *     the photo path (the looks and the framing work on it), and NO live Skia
 *     view is mounted anywhere (Sentry VOLYUME-3M: the live canvases crashed
 *     inside RNSkia's redraw);
 *   - "Video" opens a chooser: this workout's videos, the gallery, Film now;
 *   - every video gets the trim bar (a share is 15 s at most), both ends;
 *   - Play makes a 540 wide preview through the engine and plays it in an
 *     expo-av Video in place of the framer; Pause, a tap, or any change
 *     brings the still framer back; one engine job at a time (founder
 *     follow-up 2026-10-16);
 *   - Share and Save hand the video, the window, the look's matrix, the
 *     framing rectangle and the card drawn without its photo to the engine,
 *     and share or save the finished mp4;
 *   - "No photo" drops the video; under calm mode or an open flag the Video
 *     source is not offered; a PR set's video opens the PR card.
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
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-file-system/legacy', () => mockFs);
const mockPicker = {
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  VideoExportPreset: { Passthrough: 0 },
};
jest.mock('expo-image-picker', () => mockPicker);
jest.mock('../../lib/shareCard/wordmarkImage', () => ({
  loadWordmarkImage: jest.fn().mockResolvedValue(null),
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
const FAKE_IMG = { width: () => 800, height: () => 600, encodeToBase64: () => 'AAAA', dispose: () => {} };
// A frame of the video, upright, the phone's own shape.
const FAKE_FRAME = { width: () => 1080, height: () => 1920, encodeToBase64: () => 'BBBB', dispose: () => {} };
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
    ...actual,
    drawShareCard: jest.fn(),
    cardHeight: (w) => (w === 1080 ? 1921 : 1080), // odd at the output size: the screen must even it
    drawSticker: jest.fn(),
    stickerHeight: () => 1080,
    sessionLiftsThatFit: jest.fn(({ lifts }) => lifts.length),
  };
});
jest.mock('../../lib/shareCard/greatWeek', () => ({
  buildWeeklyRecapParams: () => ({}),
}));
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mockToastShow, hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));
const mockSuppress = { value: false };
jest.mock('../../hooks/usePhotoSuppression', () => ({
  __esModule: true,
  default: () => mockSuppress.value,
}));
const mockEngine = {
  isAvailable: jest.fn(() => true),
  probeVideo: jest.fn(() => Promise.resolve({ durationMs: 9000, width: 1920, height: 1080 })),
  exportShareVideo: jest.fn(() => Promise.resolve({ uri: 'file:///cache/volyume-share.mp4' })),
  cancelExport: jest.fn(() => Promise.resolve()),
  setLockScreenWallpaper: jest.fn(() => Promise.resolve()),
  lineForExportError: jest.fn((code) => (code === 'cancelled' ? null : "Couldn't make the video. Try again.")),
  EXPORT_ERROR: { UNAVAILABLE: 'unavailable', CANCELLED: 'cancelled', DECODE: 'decode_failed' },
};
jest.mock('../../lib/shareVideo/engine', () => mockEngine);

// The trim bar is another lane's component: a plain host view exposing its props.
jest.mock('../../components/share/VideoTrimBar', () => {
  const mockReact = require('react');
  return { __esModule: true, default: (props) => mockReact.createElement('VideoTrimBar', props) };
}, { virtual: true });
// expo-av's player as a host component.
jest.mock('expo-av', () => ({ Video: 'Video', ResizeMode: { CONTAIN: 'contain' } }));

const mockGrab = jest.fn();
jest.mock('../../lib/shareVideo/videoFrame', () => ({
  grabVideoFrame: (...args) => mockGrab(...args),
  videoThumbnailBase64: () => 'CCCC',
}));
const mockGetClip = jest.fn();
const mockListClips = jest.fn();
const mockClipListeners = new Set();
const mockClipStore = {
  getClip: (...args) => mockGetClip(...args),
  listClipsForWorkout: (...args) => mockListClips(...args),
  countClipsForWorkout: jest.fn(() => Promise.resolve(0)),
  subscribeClips: (fn) => { mockClipListeners.add(fn); return () => mockClipListeners.delete(fn); },
};
jest.mock('../../lib/clips/store', () => mockClipStore);
const mockOpenRecorder = jest.fn();
jest.mock('../../components/clips/useClipRecorder', () => ({
  __esModule: true,
  default: () => ({ count: 0, clips: [], refreshCount: jest.fn(), openRecorder: mockOpenRecorder, openClips: jest.fn(), sheets: null }),
}));
const mockAsyncStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockAsyncStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockAsyncStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn((k) => { delete mockAsyncStore[k]; return Promise.resolve(); }),
}));

const fs = require('fs');
const path = require('path');
const ShareCardScreen = require('../ShareCardScreen').default;
const useAppStore = require('../../store/useAppStore').default;
const { drawShareCard: mockDraw } = require('../../lib/shareCard/drawShareCard');

async function flush() {
  await TestRenderer.act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}
function makeNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn(), setParams: jest.fn(), addListener: jest.fn(() => () => {}) };
}
async function mount(params, navigation = makeNavigation()) {
  let tree = null;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' }, navigation }));
  });
  await flush();
  return { tree, navigation };
}
async function press(node) {
  await TestRenderer.act(async () => { node.props.onPress(); });
  await flush();
}
const hostsByLabelStart = (tree, prefix) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props && String(n.props.accessibilityLabel || '').startsWith(prefix),
);
const hostsByLabel = (tree, label) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label,
);
const texts = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Text')
  .map((n) => [].concat(n.props.children).join(''));
const trimBar = (tree) => tree.root.findAll((n) => n.type === 'VideoTrimBar')[0];
const buttonTitled = (tree, title) => tree.root.findAll((n) => n.type === Button && n.props.title === title);

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
const frameOf = (row, ms) => ({ image: FAKE_FRAME, width: 1080, height: 1920, durationMs: row.durationMs, ms });

beforeEach(() => {
  jest.clearAllMocks();
  mockClipListeners.clear();
  Object.keys(mockAsyncStore).forEach((k) => { delete mockAsyncStore[k]; });
  mockSuppress.value = false;
  mockEngine.isAvailable.mockImplementation(() => true);
  mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/volyume-share.mp4' }));
  mockGrab.mockImplementation((_Skia, uri, ms) => frameOf([CLIP_SET, CLIP_LONG].find((c) => c.uri === uri) || CLIP_SET, ms));
  mockListClips.mockResolvedValue([CLIP_SET, CLIP_LONG]);
  mockGetClip.mockResolvedValue(null);
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  useAppStore.setState({ user: { id: 'u1' } });
});

const SECTIONS = ['Format', 'Theme', 'Background', 'Photo look', 'Top lift', 'Quote or caption', 'What to include'];

describe('a video is one more background on the one share screen', () => {
  test('with no video: the screen is the image screen, with Video offered beside My photo, Camera and No photo', async () => {
    const { tree } = await mount(SESSION);
    const all = texts(tree);
    expect(all).toContain('Share image');
    for (const label of ['My photo', 'Camera', 'Video', 'No photo']) expect(all).toContain(label);
    for (const s of ['Format', 'Theme', 'Background', 'Quote or caption', 'What to include']) expect(all).toContain(s);
  });

  test('arriving with a video (the summary\'s row): the frame at its start is the background, the title reads Share video, and EVERY option stays', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(mockGetClip).toHaveBeenCalledWith('u1', 'c2');
    expect(mockGrab).toHaveBeenCalledWith(expect.anything(), CLIP_SET.uri, 0);
    const all = texts(tree);
    expect(all).toContain('Share video');
    for (const s of SECTIONS) expect(all.some((x) => x.startsWith(s))).toBe(true);
    // The preview is drawn through the photo path, with the frame as the photo.
    const last = mockDraw.mock.calls[mockDraw.mock.calls.length - 1][1];
    expect(last.bgPhoto).toBe(FAKE_FRAME);
    // Re-pinned (founder follow-up 2026-10-16): the hint now mentions Play.
    expect(all).toContain('Drag to move your video. Pinch to resize it. Press play to watch it with your look.');
  });

  test('no live Skia view anywhere on the screen, the player or the videos sheet (Sentry VOLYUME-3M)', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(tree.root.findAll((n) => typeof n.type === 'string' && /Canvas|SkiaView|RNSkia/i.test(n.type))).toHaveLength(0);
    for (const rel of ['screens/ShareCardScreen.js', 'components/clips/ClipPlayer.js', 'components/clips/ClipsSheet.js', 'components/clips/ClipPrimerSheet.js']) {
      const src = fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
      expect({ rel, canvas: /<Canvas\b/.test(src) || /import \{[^}]*\bCanvas\b[^}]*\} from '@shopify\/react-native-skia'/.test(src) }).toEqual({ rel, canvas: false });
    }
  });
});

describe('choosing a video', () => {
  test('this workout\'s videos are on the screen itself, each with a thumbnail; a tap makes that video the background, and under suppression the strip is not there', async () => {
    const { tree } = await mount(SESSION);
    expect(texts(tree)).toContain('Your videos from this workout');
    const tiles = tree.root.findAll((n) => typeof n.type === 'string' && /^Use video: /.test(n.props?.accessibilityLabel || ''));
    expect(tiles.map((n) => n.props.accessibilityLabel)).toEqual([
      'Use video: Bench press, set 3, 12 seconds',
      'Use video: After the workout, 22 seconds',
    ]);
    expect(tree.root.findAll((n) => n.type === 'Image' && /^data:image\/png;base64,/.test(n.props?.source?.uri || ''))).not.toHaveLength(0);
    await press(tiles[1]);
    expect(mockGrab).toHaveBeenCalledWith(expect.anything(), CLIP_LONG.uri, 0);
    expect(texts(tree)).toContain('Share video');
    expect(tiles[1].props.accessibilityState).toEqual({ selected: true });
    mockSuppress.value = true;
    const second = await mount(SESSION);
    expect(texts(second.tree)).not.toContain('Your videos from this workout');
  });

  test('"Video" opens the chooser with this workout\'s videos, the gallery and Film now; a tap makes that video the background', async () => {
    const { tree } = await mount(SESSION);
    const videoBtn = hostsByLabel(tree, 'Video')[0];
    expect(videoBtn).toBeDefined();
    await press(videoBtn);
    const all = texts(tree);
    expect(all).toContain('Choose a video');
    expect(all).toContain('Bench press, set 3');
    expect(buttonTitled(tree, 'From your gallery').length).toBeGreaterThan(0);
    expect(buttonTitled(tree, 'Film now').length).toBeGreaterThan(0);
    const row = hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0];
    await press(row);
    expect(mockGrab).toHaveBeenCalledWith(expect.anything(), CLIP_SET.uri, 0);
    expect(texts(tree)).toContain('Share video');
  });

  test('Film now goes through the one recording flow, from this screen', async () => {
    const { tree } = await mount(SESSION);
    await press(hostsByLabel(tree, 'Video')[0]);
    await press(buttonTitled(tree, 'Film now')[0]);
    expect(mockOpenRecorder).toHaveBeenCalledWith({ source: 'share' });
  });

  test('a gallery video is picked with the system picker and its length probed', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///gallery/v.mp4', duration: 30000 }] });
    mockEngine.probeVideo.mockResolvedValue({ durationMs: 30000, width: 1920, height: 1080 });
    mockGrab.mockImplementation((_S, uri, ms) => ({ image: FAKE_FRAME, width: 1920, height: 1080, durationMs: 30000, ms }));
    const { tree } = await mount(SESSION);
    await press(hostsByLabel(tree, 'Video')[0]);
    await press(buttonTitled(tree, 'From your gallery')[0]);
    expect(mockPicker.launchImageLibraryAsync).toHaveBeenCalledWith({ mediaTypes: ['videos'] });
    expect(mockEngine.probeVideo).toHaveBeenCalledWith('file:///gallery/v.mp4');
    expect(mockGrab).toHaveBeenCalledWith(expect.anything(), 'file:///gallery/v.mp4', 0);
    expect(texts(tree)).toContain('Share video');
  });

  // Re-pinned (founder follow-up 2026-10-16): the "Start at" stepper is
  // replaced by the trim bar, both ends, for every video.
  test('a long video gets the trim bar; moving the window re-grabs the still at the start and the share exports that window', async () => {
    mockGetClip.mockResolvedValue(CLIP_LONG);
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    expect(texts(tree)).toContain('A share is 15 seconds at the longest. Slide the window to the part you want, or drag its ends to make it shorter.');
    const bar = trimBar(tree);
    expect(bar.props).toMatchObject({ uri: CLIP_LONG.uri, durationMs: 22000, startMs: 0, endMs: 15000, maxWindowMs: 15000, minWindowMs: 1000 });
    await TestRenderer.act(async () => { bar.props.onChange({ startMs: 2000, endMs: 14000 }); });
    await flush();
    expect(mockGrab).toHaveBeenLastCalledWith(expect.anything(), CLIP_LONG.uri, 2000);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo.mock.calls[0][0]).toMatchObject({ startMs: 2000, durationMs: 12000, outWidth: 1080 });
  });

  test('a short video gets the trim bar too, ending at its length', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(trimBar(tree).props).toMatchObject({ durationMs: 12000, startMs: 0, endMs: 12000 });
  });

  test('"No photo" drops the video and the screen is the image screen again', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(hostsByLabel(tree, 'No photo')[0]);
    expect(texts(tree)).toContain('Share image');
    expect(texts(tree)).not.toContain('Share video');
  });

  test('a frame that cannot be decoded says so and the background is unchanged', async () => {
    mockGrab.mockReturnValue(null);
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(mockToastShow).toHaveBeenCalledWith('That video could not be opened. Try another.', { variant: 'error' });
    expect(texts(tree)).toContain('Share image');
  });

  test('under calm mode or an open flag the Video source is not offered (fail closed)', async () => {
    mockSuppress.value = true;
    const { tree } = await mount(SESSION);
    expect(hostsByLabel(tree, 'Video')).toHaveLength(0);
  });

  test('a PR set\'s video opens the PR card with that PR chosen', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    await mount({ ...SESSION, prList: [PR], clipId: 'c2' });
    const last = mockDraw.mock.calls[mockDraw.mock.calls.length - 1][1];
    expect(last.params.cardType).toBe('pr');
  });
});

describe('sharing and saving the finished video', () => {
  test('Share video: the card drawn without its photo goes over the video through the engine, and the mp4 is shared', async () => {
    mockGetClip.mockResolvedValue(CLIP_LONG);
    const { tree } = await mount({ ...SESSION, clipId: 'c1' });
    // Re-pinned: the window moves on the trim bar now, not a stepper.
    await TestRenderer.act(async () => { trimBar(tree).props.onChange({ startMs: 2000, endMs: 17000 }); });
    await flush();
    mockDraw.mockClear();
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockDraw.mock.calls.some((c) => c[1].omitPhoto === true)).toBe(true);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    const opts = mockEngine.exportShareVideo.mock.calls[0][0];
    expect(opts).toMatchObject({ sourceUri: CLIP_LONG.uri, startMs: 2000, durationMs: 15000, outWidth: 1080 });
    expect(opts.outHeight % 2).toBe(0);
    expect(opts.overlayPngUri).toMatch(/^file:\/\/\/cache\/volyume-overlay-/);
    expect(opts.rect).toEqual(expect.objectContaining({ w: expect.any(Number), h: expect.any(Number) }));
    expect(mockSharing.shareAsync).toHaveBeenCalledWith('file:///cache/volyume-share.mp4', expect.objectContaining({ mimeType: 'video/mp4' }));
  });

  test('a short video is shared whole; the window never exceeds 15 seconds', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo.mock.calls[0][0]).toMatchObject({ startMs: 0, durationMs: 12000 });
  });

  test('Save to gallery saves the mp4 and says so; a refused gallery says it is the video', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockMediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///cache/volyume-share.mp4');
    expect(mockToastShow).toHaveBeenCalledWith('Saved to your gallery.', { variant: 'success' });
    mockMediaLibrary.requestPermissionsAsync.mockResolvedValueOnce({ granted: false });
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockToastShow).toHaveBeenLastCalledWith('Gallery access is needed to save the video. You can still use Share.', { variant: 'warning', duration: 5000 });
  });

  test('the look\'s matrix rides with the export when a look is chosen', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    // The look tiles are labelled "<name>: <description>"; Iron is one of
    // them. A missing tile fails the test rather than skipping it.
    const iron = hostsByLabelStart(tree, 'Iron: ')[0];
    expect(iron).toBeDefined();
    await press(iron);
    await press(buttonTitled(tree, 'Share video')[0]);
    const { matrix } = mockEngine.exportShareVideo.mock.calls[0][0];
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix).toHaveLength(20);
  });

  test('an engine that is not on this device says so, and nothing is shared', async () => {
    mockEngine.isAvailable.mockImplementation(() => false);
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).not.toHaveBeenCalled();
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
    expect(mockToastShow).toHaveBeenCalled();
  });

  test('the same video, start and look export once: Share then Save reuse the file', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    await press(buttonTitled(tree, 'Save to gallery')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
  });
});

describe('playing the video in the preview (founder follow-up 2026-10-16)', () => {
  const PREVIEW_URI = 'file:///cache/volyume-preview.mp4';
  const framers = (tree) => tree.root.findAll((n) => n.type && n.type.name === 'SharePhotoFramer');
  const players = (tree) => tree.root.findAll((n) => n.type === 'Video');
  async function playing() {
    mockGetClip.mockResolvedValue(CLIP_SET);
    mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: PREVIEW_URI }));
    const m = await mount({ ...SESSION, clipId: 'c2' });
    await press(hostsByLabel(m.tree, 'Play the video')[0]);
    return m;
  }

  test('Play makes a 540 wide preview through the engine with the omitPhoto overlay, then plays it looping and muted in place of the framer', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: PREVIEW_URI }));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    expect(framers(tree)).toHaveLength(1);
    mockDraw.mockClear();
    await press(hostsByLabel(tree, 'Play the video')[0]);
    const opts = mockEngine.exportShareVideo.mock.calls[0][0];
    expect(opts).toMatchObject({ outWidth: 540, bitrate: 2000000, startMs: 0, durationMs: 12000 });
    expect(opts.outHeight % 2).toBe(0);
    expect(mockDraw.mock.calls.some((c) => c[1].omitPhoto === true && c[1].width === 540)).toBe(true);
    const v = players(tree);
    expect(v).toHaveLength(1);
    expect(v[0].props).toMatchObject({ source: { uri: PREVIEW_URI }, isLooping: true, isMuted: true, shouldPlay: true });
    expect(framers(tree)).toHaveLength(0);
  });

  test('Pause, and a tap on the video, bring the framer back; Play again with nothing changed is instant', async () => {
    const { tree } = await playing();
    await press(hostsByLabel(tree, 'Pause the video')[0]);
    expect(players(tree)).toHaveLength(0);
    expect(framers(tree)).toHaveLength(1);
    await press(hostsByLabel(tree, 'Play the video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    expect(players(tree)).toHaveLength(1);
    await press(tree.root.find((n) => typeof n.type === 'string' && n.props.testID === 'share-preview-video'));
    expect(players(tree)).toHaveLength(0);
    expect(framers(tree)).toHaveLength(1);
  });

  test('changing the look while playing pauses back to the still', async () => {
    const { tree } = await playing();
    expect(players(tree)).toHaveLength(1);
    const notNone = tree.root.findAll((n) => typeof n.type === 'string' && /^Iron: /.test(String(n.props?.accessibilityLabel || '')))[0];
    expect(notNone).toBeDefined();
    await press(notNone);
    expect(players(tree)).toHaveLength(0);
    expect(framers(tree)).toHaveLength(1);
  });

  test('Play is disabled while the share is being made (one engine job at a time)', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    let finish;
    mockEngine.exportShareVideo.mockImplementation(() => new Promise((r) => { finish = r; }));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(buttonTitled(tree, 'Share video')[0]);
    const play = hostsByLabel(tree, 'Play the video')[0];
    expect(play.props.accessibilityState).toEqual({ disabled: true });
    await press(play);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    await TestRenderer.act(async () => { finish({ uri: 'file:///cache/volyume-share.mp4' }); });
    await flush();
  });

  test('a failed preview render says the calm line and stays on the still', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    mockEngine.exportShareVideo.mockImplementation(() => Promise.reject(Object.assign(new Error('x'), { code: 'E_ENCODE' })));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(hostsByLabel(tree, 'Play the video')[0]);
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't make the video. Try again.", { variant: 'error', duration: 7000 });
    expect(players(tree)).toHaveLength(0);
    expect(framers(tree)).toHaveLength(1);
  });

  test('the 1080 share is made on its own: a preview having been made is never shared', async () => {
    const { tree } = await playing();
    mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/volyume-share.mp4' }));
    await press(hostsByLabel(tree, 'Pause the video')[0]);
    await press(buttonTitled(tree, 'Share video')[0]);
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(2);
    const share = mockEngine.exportShareVideo.mock.calls[1][0];
    expect(share.outWidth).toBe(1080);
    expect(share.bitrate).toBeUndefined();
    expect(mockSharing.shareAsync).toHaveBeenCalledWith('file:///cache/volyume-share.mp4', expect.anything());
  });

  test('leaving the screen cancels a preview still being made', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    mockEngine.exportShareVideo.mockImplementation(() => new Promise(() => {}));
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await press(hostsByLabel(tree, 'Play the video')[0]);
    expect(tree.root.findAll((n) => typeof n.type === 'string' && n.props.testID === 'share-making-preview')).not.toHaveLength(0);
    expect(mockEngine.cancelExport).not.toHaveBeenCalled();
    await TestRenderer.act(async () => { tree.unmount(); });
    expect(mockEngine.cancelExport).toHaveBeenCalled();
  });
});
