/**
 * ShareCardScreen: a video as the background (D229, addenda 5, 7, 8 and 9).
 *
 * Authority: register D229 (founder: "a completed video, inside the photo
 * flow"; "videos are only device only"; "Don't reinvent the ball, what we've
 * got with photos is very good"; addendum 9: every video of the workout is
 * offered on every card of it, the PR pairing only chooses the first card).
 *
 * Pinned, all written to FAIL against the screen before the video wiring:
 *   1. the Background row offers "Video" only with the engine, a workout and
 *      no suppression, never for the sticker; None then reads "no photo or
 *      video"; tapping Video opens the in-app camera for this workout;
 *   2. "From this workout" lists the workout's own videos, newest first, by
 *      their plain names; a tap puts the video under the card: the framer,
 *      the 15 second window on the trim bar, the hint, "Share video", and
 *      no Post to Community (a video never enters Community);
 *   3. arriving with a video id it becomes the background once, a video of
 *      a PR set leads with the PR card ("Your PR set"), and an id that no
 *      longer resolves (Undo, a delete) is "no video";
 *   4. None clears the video and the actions read "image" again;
 *   5. Share video draws the card once at the output size, hands the engine
 *      the window, the placement and the overlay, shares the file as
 *      video/mp4, and makes it once for Share then Save; a failed export
 *      shows the engine's own calm line, a cancelled one says nothing;
 *   6. under calm mode or an open flag a chosen video goes and none is
 *      offered (fail closed);
 *   7. a video picked from the phone's gallery is probed and accepted, and
 *      one that cannot be opened says so calmly.
 *
 * Mock scaffold mirrors ShareCardScreen.levelUps.test.js (non-virtual mocks
 * for installed modules; the renderer mocked so what the SCREEN hands it is
 * what is checked). The video pieces (frames, thumbnails, tone, framer, trim
 * bar, ring, engine) are stubbed so the screen's wiring is what is tested.
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
const mockScrub = jest.fn();
jest.mock('../../lib/shareVideo/useClipFrames', () => ({
  __esModule: true,
  default: () => ({ currentTime: { value: 0 }, scrub: mockScrub, image: null }),
  useClipVideo: () => null,
}));
const mockThumbs = jest.fn(() => Promise.resolve({ images: [FAKE_FRAME], times: [0] }));
jest.mock('../../lib/shareVideo/clipThumbnails', () => ({
  extractClipThumbnails: (...args) => mockThumbs(...args),
  thumbnailTimes: jest.fn(() => [0]),
}));
jest.mock('../../lib/shareVideo/clipTone', () => ({
  VIDEO_SCRIM_TIER_LUMINANCE: 131,
  sampleClipTone: jest.fn(() => ({ r: 140, g: 140, b: 140 })),
}));
const mockGetClip = jest.fn();
const mockListClips = jest.fn();
// The store's change subscription: tests fire it to play a save or a delete
// elsewhere (an Undo on the saved toast, a delete in the videos sheet).
const mockClipListeners = new Set();
const mockClipStore = {
  getClip: (...args) => mockGetClip(...args),
  listClipsForWorkout: (...args) => mockListClips(...args),
  countClipsForWorkout: jest.fn(() => Promise.resolve(0)),
  subscribeClips: (fn) => { mockClipListeners.add(fn); return () => mockClipListeners.delete(fn); },
};
jest.mock('../../lib/clips/store', () => mockClipStore);
jest.mock('../../lib/clips', () => ({
  ...jest.requireActual('../../lib/clips/rules'),
  ...mockClipStore,
}));
const mockAsyncStore = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k) => Promise.resolve(mockAsyncStore[k] ?? null)),
  setItem: jest.fn((k, v) => { mockAsyncStore[k] = v; return Promise.resolve(); }),
  removeItem: jest.fn((k) => { delete mockAsyncStore[k]; return Promise.resolve(); }),
}));
jest.mock('../../components/share/ClipFramer', () => {
  const mockReact = require('react');
  return { __esModule: true, default: (props) => mockReact.createElement('ClipFramer', props) };
});
jest.mock('../../components/share/TrimBar', () => {
  const mockReact = require('react');
  return {
    __esModule: true,
    default: (props) => mockReact.createElement('TrimBar', props),
    TRIM_BAR_HEIGHT: 44,
    mmss: (ms) => {
      const s = Math.max(0, Math.round((Number(ms) || 0) / 1000));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    },
  };
});
jest.mock('../../components/share/ProgressRing', () => {
  const mockReact = require('react');
  return { __esModule: true, default: (props) => mockReact.createElement('ProgressRing', props) };
});

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
  return {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    addListener: jest.fn(() => () => {}),
  };
}
async function mount(params, navigation = makeNavigation()) {
  let tree = null;
  const render = () => React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' }, navigation });
  await TestRenderer.act(async () => { tree = TestRenderer.create(render()); });
  await flush();
  // A re-render with the same route and navigation (a fresh element: React
  // skips an identical one).
  const rerender = async () => { await TestRenderer.act(async () => { tree.update(render()); }); await flush(); };
  return { tree, navigation, rerender };
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
// Host nodes only (the passthrough mocks render each pressable twice).
const hostsByLabel = (tree, label) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label,
);
const texts = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Text')
  .map((n) => [].concat(n.props.children).join(''));
const framers = (tree) => tree.root.findAll((n) => n.type === 'ClipFramer');
const trimBars = (tree) => tree.root.findAll((n) => n.type === 'TrimBar');
const buttonTitled = (tree, title) => tree.root.findAll((n) => n.type === Button && n.props.title === title);
const stripLabels = (tree) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props && /seconds$/.test(String(n.props.accessibilityLabel || '')),
).map((n) => n.props.accessibilityLabel);

const SESSION = {
  sessionData: {
    sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, prCount: 0, units: 'kg',
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

beforeEach(() => {
  jest.clearAllMocks();
  mockClipListeners.clear();
  Object.keys(mockAsyncStore).forEach((k) => { delete mockAsyncStore[k]; });
  mockSuppress.value = false;
  mockEngine.isAvailable.mockImplementation(() => true);
  mockEngine.exportShareVideo.mockImplementation(() => Promise.resolve({ uri: 'file:///cache/volyume-share.mp4' }));
  mockEngine.probeVideo.mockImplementation(() => Promise.resolve({ durationMs: 9000, width: 1920, height: 1080 }));
  mockThumbs.mockImplementation(() => Promise.resolve({ images: [FAKE_FRAME], times: [0] }));
  mockListClips.mockResolvedValue([CLIP_SET, CLIP_LONG]);
  mockGetClip.mockResolvedValue(null);
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockPicker.launchImageLibraryAsync.mockResolvedValue({ canceled: true });
  useAppStore.setState({ user: { id: 'u1' } });
});

describe('the Video source', () => {
  test('offered with the engine and a workout; None then reads "no photo or video"; a tap goes through the one recording flow: the privacy primer first, then the camera for this workout', async () => {
    const { tree, navigation } = await mount(SESSION);
    expect(hostsByLabel(tree, 'Video, record one now').length).toBeGreaterThan(0);
    expect(hostsByLabel(tree, 'None, no photo or video').length).toBeGreaterThan(0);
    expect(hostsByLabel(tree, 'None, no photo').length).toBe(0);
    await press(hostsByLabel(tree, 'Video, record one now')[0]);
    // Never seen the primer on this phone: it shows before the camera.
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(texts(tree)).toContain('Videos stay on this phone');
    await press(hostsByLabel(tree, 'Open camera')[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('ClipCamera', {
      workoutId: 'w1', exerciseId: null, exerciseName: null, setNumber: null, source: 'share',
    });
    // Seen now: the next tap goes straight to the camera.
    navigation.navigate.mockClear();
    await press(hostsByLabel(tree, 'Video, record one now')[0]);
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
  });

  test('without the engine nothing about video is offered and None reads as before', async () => {
    mockEngine.isAvailable.mockImplementation(() => false);
    const { tree } = await mount(SESSION);
    expect(hostsByLabel(tree, 'Video, record one now').length).toBe(0);
    expect(hostsByLabel(tree, 'None, no photo').length).toBeGreaterThan(0);
    expect(texts(tree)).not.toContain('From this workout');
  });

  test('without a workout to keep a video with, the camera is not offered', async () => {
    const { tree } = await mount({ sessionData: SESSION.sessionData });
    expect(hostsByLabel(tree, 'Video, record one now').length).toBe(0);
    expect(mockListClips).not.toHaveBeenCalled();
  });

  test('never for the sticker', async () => {
    const { tree } = await mount(SESSION);
    await press(hostsByLabel(tree, 'Sticker')[0]);
    expect(hostsByLabel(tree, 'Video, record one now').length).toBe(0);
    expect(texts(tree)).not.toContain('From this workout');
  });
});

describe('From this workout', () => {
  test("lists the workout's videos, newest first, by their plain names", async () => {
    const { tree } = await mount(SESSION);
    await waitFor(() => stripLabels(tree).length === 2);
    expect(mockListClips).toHaveBeenCalledWith('u1', 'w1');
    expect(texts(tree)).toContain('From this workout');
    expect(stripLabels(tree)).toEqual(['Bench press, set 3, 12 seconds', 'After the workout, 22 seconds']);
    expect(texts(tree)).toEqual(expect.arrayContaining(['Bench press, set 3', 'After the workout', '0:12', '0:22']));
    expect(texts(tree).join(' ')).not.toMatch(/\bclip\b/i);
  });

  test('a tap puts the video under the card: the framer, the window, the hint, "Share video", no Post to Community', async () => {
    const { tree } = await mount({ ...SESSION, prData: PR, prList: [PR] });
    await waitFor(() => stripLabels(tree).length === 2);
    expect(framers(tree).length).toBe(0);
    expect(buttonTitled(tree, 'Share image').length).toBe(1);
    expect(buttonTitled(tree, 'Post to Community').length).toBe(1);

    await press(hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0]);
    await waitFor(() => framers(tree).length === 1);
    const framer = framers(tree)[0];
    expect(framer.props.mediaWidth).toBe(1080);
    expect(framer.props.mediaHeight).toBe(1920);
    expect(framer.props.lookKey).toBeNull();
    expect(framer.props.paused).toBe(false);
    expect(hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0].props.accessibilityState).toEqual({ selected: true });

    expect(trimBars(tree).length).toBe(1);
    expect(trimBars(tree)[0].props).toMatchObject({ startMs: 0, endMs: 12000, maxWindowMs: 15000, durationMs: 12000 });
    expect(texts(tree)).toContain('Drag to move your video, pinch to resize it, and tap it to pause.');
    expect(buttonTitled(tree, 'Share video').length).toBe(1);
    expect(buttonTitled(tree, 'Share image').length).toBe(0);
    expect(buttonTitled(tree, 'Post to Community').length).toBe(0);
    expect(hostsByLabel(tree, 'Share your video to Instagram or Facebook Story').length).toBeGreaterThan(0);
  });

  test('a video longer than 15 seconds opens on its first 15, and says how to choose where it starts', async () => {
    const { tree } = await mount(SESSION);
    await waitFor(() => stripLabels(tree).length === 2);
    await press(hostsByLabel(tree, 'After the workout, 22 seconds')[0]);
    await waitFor(() => trimBars(tree).length === 1);
    expect(trimBars(tree)[0].props).toMatchObject({ startMs: 0, endMs: 15000, durationMs: 22000 });
    expect(texts(tree)).toContain('15 seconds of 22. Slide the strip to choose where it starts, or drag its ends to use less of the video.');
    // The frames: the trim bar's across the whole video, the scrim's inside the window.
    await waitFor(() => mockThumbs.mock.calls.length >= 2);
    const windows = mockThumbs.mock.calls.map((c) => c[1]);
    expect(windows.some((w) => w.fromMs === undefined)).toBe(true);
    expect(windows.some((w) => w.fromMs === 0 && w.toMs === 15000)).toBe(true);
  });

  test('moving the window re-reads the scrim frames inside it and plays from its start', async () => {
    const { tree } = await mount(SESSION);
    await waitFor(() => stripLabels(tree).length === 2);
    await press(hostsByLabel(tree, 'After the workout, 22 seconds')[0]);
    await waitFor(() => trimBars(tree).length === 1);
    await TestRenderer.act(async () => { trimBars(tree)[0].props.onPreview(4000); });
    expect(mockScrub).toHaveBeenCalledWith(4000);
    await TestRenderer.act(async () => { trimBars(tree)[0].props.onChange({ startMs: 5000, endMs: 20000 }); });
    await flush();
    expect(trimBars(tree)[0].props).toMatchObject({ startMs: 5000, endMs: 20000 });
    await waitFor(() => mockThumbs.mock.calls.some((c) => c[1].fromMs === 5000 && c[1].toMs === 20000));
  });

  test('None clears the video: the framer goes and the actions read "image" again', async () => {
    const { tree } = await mount(SESSION);
    await waitFor(() => stripLabels(tree).length === 2);
    await press(hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0]);
    await waitFor(() => framers(tree).length === 1);
    await press(hostsByLabel(tree, 'None, no photo or video')[0]);
    await waitFor(() => framers(tree).length === 0);
    expect(trimBars(tree).length).toBe(0);
    expect(buttonTitled(tree, 'Share image').length).toBe(1);
    expect(hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0].props.accessibilityState).toEqual({ selected: false });
  });
});

describe('arriving with a video', () => {
  test('the id becomes the background once, and a video of a PR set leads with the PR card', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, prData: PR, prList: [PR], clipId: 'c2' });
    await waitFor(() => framers(tree).length === 1);
    expect(mockGetClip).toHaveBeenCalledWith('u1', 'c2');
    await waitFor(() => stripLabels(tree).length === 2);
    // The PR card is up (its tile is marked), the session card one tap away.
    expect(stripLabels(tree)).toEqual(['Your PR set, Bench press, set 3, 12 seconds', 'After the workout, 22 seconds']);
    expect(texts(tree)).toContain('Your PR set');
    expect(hostsByLabel(tree, 'Session').length).toBeGreaterThan(0);
    expect(hostsByLabel(tree, 'New PR').length).toBeGreaterThan(0);
  });

  test('a video of a set that is not a PR opens on the session card as before', async () => {
    mockGetClip.mockResolvedValue({ ...CLIP_SET, setNumber: 2 });
    const { tree } = await mount({ ...SESSION, prData: PR, prList: [PR], clipId: 'c2' });
    await waitFor(() => framers(tree).length === 1);
    expect(texts(tree)).not.toContain('Your PR set');
  });

  test('an id that no longer resolves (Undo, a delete) is "no video"', async () => {
    mockGetClip.mockResolvedValue(null);
    const { tree } = await mount({ ...SESSION, clipId: 'gone' });
    await flush();
    await flush();
    expect(mockGetClip).toHaveBeenCalledWith('u1', 'gone');
    expect(framers(tree).length).toBe(0);
    expect(buttonTitled(tree, 'Share image').length).toBe(1);
  });

  test('the same id is not taken twice on a re-render', async () => {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree, rerender } = await mount({ ...SESSION, clipId: 'c2' });
    await waitFor(() => framers(tree).length === 1);
    await press(hostsByLabel(tree, 'None, no photo or video')[0]);
    await waitFor(() => framers(tree).length === 0);
    await rerender();
    expect(mockGetClip).toHaveBeenCalledTimes(1);
    expect(framers(tree).length).toBe(0);
  });
});

describe('sharing the video', () => {
  async function mountWithClip() {
    mockGetClip.mockResolvedValue(CLIP_SET);
    const out = await mount({ ...SESSION, clipId: 'c2' });
    await waitFor(() => framers(out.tree).length === 1);
    await waitFor(() => !!framers(out.tree)[0].props.overlayUri);
    return out;
  }

  test('draws the card once at the output size, hands the engine the window, the placement and the overlay, then shares video/mp4', async () => {
    const { tree } = await mountWithClip();
    mockDraw.mockClear();
    await press(hostsByLabel(tree, 'Share your video to Instagram or Facebook Story')[0]);
    await waitFor(() => mockSharing.shareAsync.mock.calls.length === 1);

    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
    const [job, onProgress] = mockEngine.exportShareVideo.mock.calls[0];
    expect(job).toMatchObject({
      sourceUri: 'file:///docs/clips/c2.mp4', startMs: 0, durationMs: 12000, matrix: null, outWidth: 1080, outHeight: 1920,
    });
    expect(typeof onProgress).toBe('function');
    expect(job.overlayPngUri).toMatch(/^file:\/\/\/cache\/volyume-overlay-\d+\.png$/);
    // The renderer's own placement rectangle (photoCoverRect): four finite numbers.
    expect(Object.values(job.rect).length).toBe(4);
    expect(Object.values(job.rect).every((v) => Number.isFinite(v))).toBe(true);
    // The card for the overlay: the data without the video, at the output size.
    const overlayDraw = mockDraw.mock.calls.find((c) => c[1].width === 1080);
    expect(overlayDraw).toBeTruthy();
    expect(overlayDraw[1].omitPhoto).toBe(true);
    expect(overlayDraw[1].bgPhoto).toBe(FAKE_FRAME);
    expect(mockFs.writeAsStringAsync).toHaveBeenCalledWith(job.overlayPngUri, 'AAAA', { encoding: 'base64' });
    expect(mockSharing.shareAsync).toHaveBeenCalledWith('file:///cache/volyume-share.mp4', {
      mimeType: 'video/mp4', UTI: 'public.mpeg-4', dialogTitle: 'Share video',
    });
  });

  test('made once for Share then Save to gallery', async () => {
    const { tree } = await mountWithClip();
    await press(hostsByLabel(tree, 'Share your video to Instagram or Facebook Story')[0]);
    await waitFor(() => mockSharing.shareAsync.mock.calls.length === 1);
    await press(hostsByLabel(tree, 'Save to gallery')[0]);
    await waitFor(() => mockMediaLibrary.saveToLibraryAsync.mock.calls.length === 1);
    expect(mockMediaLibrary.saveToLibraryAsync).toHaveBeenCalledWith('file:///cache/volyume-share.mp4');
    expect(mockEngine.exportShareVideo).toHaveBeenCalledTimes(1);
  });

  test("a failed export shows the engine's own calm line; a cancelled one says nothing", async () => {
    const { tree } = await mountWithClip();
    mockEngine.exportShareVideo.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('decode'), { code: 'decode_failed' })));
    await press(hostsByLabel(tree, 'Share your video to Instagram or Facebook Story')[0]);
    await waitFor(() => mockToastShow.mock.calls.length === 1);
    expect(mockToastShow).toHaveBeenCalledWith("Couldn't make the video. Try again.", { variant: 'error', duration: 7000 });
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();

    mockToastShow.mockClear();
    mockEngine.exportShareVideo.mockImplementationOnce(() => Promise.reject(Object.assign(new Error('cancelled'), { code: 'cancelled' })));
    await press(hostsByLabel(tree, 'Share your video to Instagram or Facebook Story')[0]);
    await flush();
    await flush();
    expect(mockToastShow).not.toHaveBeenCalled();
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });

  test('the files made here are deleted when the screen closes', async () => {
    const { tree } = await mountWithClip();
    await press(hostsByLabel(tree, 'Share your video to Instagram or Facebook Story')[0]);
    await waitFor(() => mockSharing.shareAsync.mock.calls.length === 1);
    await TestRenderer.act(async () => { tree.unmount(); });
    const deleted = mockFs.deleteAsync.mock.calls.map((c) => c[0]);
    expect(deleted).toContain('file:///cache/volyume-share.mp4');
    expect(deleted.some((u) => /volyume-overlay-\d+\.png$/.test(u))).toBe(true);
  });
});

describe('the ED gate (calm mode or an open flag)', () => {
  test('nothing about video is offered, and a chosen video goes', async () => {
    const { tree, rerender } = await mount(SESSION);
    await waitFor(() => stripLabels(tree).length === 2);
    await press(hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0]);
    await waitFor(() => framers(tree).length === 1);

    mockSuppress.value = true;
    await rerender();
    await waitFor(() => framers(tree).length === 0);
    expect(hostsByLabel(tree, 'Video, record one now').length).toBe(0);
    expect(texts(tree)).not.toContain('From this workout');
    expect(buttonTitled(tree, 'Share image').length).toBe(1);
  });

  test('an arriving video id is ignored while suppressed', async () => {
    mockSuppress.value = true;
    mockGetClip.mockResolvedValue(CLIP_SET);
    const { tree } = await mount({ ...SESSION, clipId: 'c2' });
    await flush();
    expect(mockGetClip).not.toHaveBeenCalled();
    expect(framers(tree).length).toBe(0);
  });
});

describe('a video from the phone', () => {
  test('the gallery offers videos too, probes the one chosen and puts it under the card', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false, assets: [{ uri: 'file:///phone/IMG_1.mov', type: 'video', duration: 9000 }],
    });
    const { tree } = await mount(SESSION);
    expect(hostsByLabel(tree, 'Gallery, choose a photo').length).toBe(0);
    await press(hostsByLabel(tree, 'Gallery, choose a photo or video')[0]);
    await waitFor(() => framers(tree).length === 1);
    expect(mockPicker.launchImageLibraryAsync.mock.calls[0][0]).toMatchObject({ mediaTypes: ['images', 'videos'], videoExportPreset: 0 });
    expect(mockEngine.probeVideo).toHaveBeenCalledWith('file:///phone/IMG_1.mov');
    expect(framers(tree)[0].props).toMatchObject({ mediaWidth: 1920, mediaHeight: 1080 });
    expect(trimBars(tree)[0].props).toMatchObject({ startMs: 0, endMs: 9000, durationMs: 9000 });
    // Picked from the phone: Gallery reads as the chosen source, and no tile
    // of the workout's own videos is selected.
    expect(hostsByLabel(tree, 'Gallery, choose a photo or video')[0].props.accessibilityState).toEqual({ selected: true });
    await waitFor(() => stripLabels(tree).length === 2);
    expect(hostsByLabel(tree, 'Bench press, set 3, 12 seconds')[0].props.accessibilityState).toEqual({ selected: false });
  });

  test('without the engine the gallery offers photos only', async () => {
    mockEngine.isAvailable.mockImplementation(() => false);
    const { tree } = await mount(SESSION);
    await press(hostsByLabel(tree, 'Gallery, choose a photo')[0]);
    expect(mockPicker.launchImageLibraryAsync.mock.calls[0][0]).toMatchObject({ mediaTypes: ['images'] });
  });

  test('a video that cannot be opened says so calmly', async () => {
    mockPicker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false, assets: [{ uri: 'file:///phone/broken.mp4', type: 'video' }],
    });
    mockEngine.probeVideo.mockImplementation(() => Promise.reject(new Error('bad file')));
    const { tree } = await mount(SESSION);
    await press(hostsByLabel(tree, 'Gallery, choose a photo or video')[0]);
    await waitFor(() => mockToastShow.mock.calls.length === 1);
    expect(mockToastShow).toHaveBeenCalledWith("That video couldn't be opened. You could try another one.", { variant: 'error' });
    expect(framers(tree).length).toBe(0);
  });
});
