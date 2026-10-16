/**
 * Film now on EVERY share, not only one with a workout. Founder, verbatim:
 * "The whole point is recording it during the workout. OR recording one in
 * the share screen after the same as you do with photos. This was all
 * requested already." Earlier: "the video can be added, you can import a
 * video or record one at the time, or one gets added from a workout".
 *
 * A share opened without a workout (a PR from a lift's history, a
 * milestone, the weekly recap) offered only "From your gallery". Now its
 * chooser offers Film now too. Lead ruling 2026-10-16: it opens Volyume's
 * own camera (ClipCamera, muted, no microphone) in its share-only mode,
 * never the system camera, whose iOS microphone prompt would show a line
 * saying the permission is never requested. The camera hands the file back
 * as the route param `sharedVideo`, which is used ONCE through the gallery
 * video's own path (probe, first frame, window; the title reads Share
 * video) and then cleared. Nothing is written to the workout videos store,
 * and no primer is shown (its lines say where a workout's videos are kept).
 * Calm mode or an open flag hides Film now, stops a stale tap, and ignores
 * a `sharedVideo` that arrives under it. With a workout, Film now is still
 * the in-app recorder through its primer, which keeps the video with the
 * workout.
 *
 * The last block pins the iOS microphone usage text and Android's blocked
 * RECORD_AUDIO, so neither can change silently.
 *
 * The scaffold (every mock and helper) is ShareCardScreen.videoAudit2's
 * own, with the store's saveClip added so a write would be seen. Every
 * test of the new behaviour was written to FAIL against the screen at
 * 9c81f11; the ones that pass there pin what must NOT change (Video hidden
 * under the gate, the workout's in-app recorder) and the permission keys.
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
const mockSaveClip = jest.fn(() => Promise.resolve({ id: 'saved' }));
jest.mock('../../lib/clips/store', () => ({
  getClip: (...args) => mockGetClip(...args),
  listClipsForWorkout: (...args) => mockListClips(...args),
  countClipsForWorkout: jest.fn(() => Promise.resolve(0)),
  subscribeClips: (fn) => { mockClipListeners.add(fn); return () => mockClipListeners.delete(fn); },
  saveClip: (...args) => mockSaveClip(...args),
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
const { CLIP_STRINGS } = require('../../lib/clips/rules');

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
const texts = (tree) => tree.root.findAll((n) => host(n) && n.type === 'Text').map((n) => [].concat(n.props.children).join(''));
const trimBar = (tree) => tree.root.findAll((n) => n.type === 'VideoTrimBar')[0];
const buttonTitled = (tree, title) => tree.root.findAll((n) => n.type === Button && n.props.title === title);
const lastStill = () => {
  const calls = mockDraw.mock.calls.filter((c) => !c[1].omitPhoto);
  return calls[calls.length - 1][1];
};

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

const fs = require('fs');
const path = require('path');

// Shares that arrive without a workout: a PR from a lift's history and a
// milestone (the weekly recap and the summary's cards are the same case).
const PR_ONLY = { prData: PR };
const MILESTONE = {
  milestoneData: {
    eyebrow: 'Weight lifted', title: 'Your weight lifted', heroValue: '5,400', heroUnit: 'kg lifted, this week',
    caption: 'Averaging 5,000 kg a week over the last 4 weeks.', date: 1_700_000_000_000, stats: [],
  },
};
// What ClipCamera's share-only mode merges into this screen's route.
const SHARED = { uri: 'file:///cache/Camera/filmed.mp4', durationMs: 9000, width: null, height: null };
const sheet = (tree) => tree.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Choose a video' && 'visible' in n.props)[0];
const videoSegment = (tree) => byLabel(tree, 'Video, choose a video')[0];

async function openChooser(tree) {
  await press(videoSegment(tree));
  expect(sheet(tree).props.visible).toBe(true);
}

beforeEach(() => {
  mockEngine.probeVideo.mockImplementation((uri) => Promise.resolve(
    uri === SHARED.uri ? { durationMs: 9000, width: 1080, height: 1920 } : { durationMs: rowOf(uri).durationMs, width: 1080, height: 1920 },
  ));
  mockGrab.mockImplementation((_Skia, uri, ms) => Promise.resolve(
    uri === SHARED.uri
      ? { image: mockImage(`F-filmed-${ms}`, 1080, 1920), width: 1080, height: 1920, durationMs: 9000 }
      : frameAt(rowOf(uri), ms),
  ));
});

describe('with no workout, the chooser offers Film now', () => {
  test.each([['a PR from a lift\'s history', PR_ONLY], ['a milestone', MILESTONE]])('%s: Film now beside the gallery', async (_name, params) => {
    const { tree } = await mount(params);
    await openChooser(tree);
    expect(buttonTitled(tree, 'From your gallery')).toHaveLength(1);
    expect(buttonTitled(tree, 'Film now')).toHaveLength(1);
    // There is no workout, so nothing lists a workout's videos.
    expect(mockListClips).not.toHaveBeenCalled();
  });
});

describe('Film now with no workout opens Volyume\'s camera for this share alone', () => {
  test('it opens ClipCamera in share-only mode, with no workout, no primer and never the system camera', async () => {
    const { tree, navigation } = await mount(PR_ONLY);
    await openChooser(tree);
    await press(buttonTitled(tree, 'Film now')[0]);
    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    const [name, params] = navigation.navigate.mock.calls[0];
    expect(name).toBe('ClipCamera');
    expect(params).toEqual(expect.objectContaining({ mode: 'share' }));
    expect(params.workoutId).toBeUndefined();
    expect(sheet(tree).props.visible).toBe(false);
    // The primer's lines are about a workout's videos: not shown, not marked seen.
    expect(texts(tree)).not.toContain(CLIP_STRINGS.primerTitle);
    expect(mockAsyncStore['@volyume_clip_primer_seen']).toBeUndefined();
    expect(mockPicker.requestCameraPermissionsAsync).not.toHaveBeenCalled();
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  test('the video it hands back becomes the background once, through the gallery video\'s path, and the param is cleared', async () => {
    const { tree, navigation, rerender } = await mount({ ...PR_ONLY, sharedVideo: SHARED });
    expect(mockEngine.probeVideo).toHaveBeenCalledWith(SHARED.uri);
    expect(mockGrab).toHaveBeenCalledWith(expect.anything(), SHARED.uri, 0);
    expect(lastStill().bgPhoto.name).toBe('F-filmed-0');
    expect(texts(tree)).toContain('Share video');
    expect(videoSegment(tree).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    const bar = trimBar(tree);
    expect(bar.props.uri).toBe(SHARED.uri);
    expect(bar.props.durationMs).toBe(9000);
    expect(bar.props.endMs).toBe(9000);
    expect(navigation.setParams).toHaveBeenCalledWith({ sharedVideo: undefined });
    // Once: a later render with the same param, after None, does not bring it back.
    await press(byLabel(tree, 'None, no photo')[0]);
    expect(texts(tree)).not.toContain('Share video');
    const grabs = mockGrab.mock.calls.length;
    await rerender();
    expect(mockGrab.mock.calls.length).toBe(grabs);
    expect(texts(tree)).not.toContain('Share video');
  });

  test('a recording longer than a share opens with its first 15 seconds, like any long video', async () => {
    mockEngine.probeVideo.mockImplementation(() => Promise.resolve({ durationMs: 60000, width: 1080, height: 1920 }));
    const { tree } = await mount({ ...PR_ONLY, sharedVideo: { ...SHARED, durationMs: 60000 } });
    const bar = trimBar(tree);
    expect(bar.props.durationMs).toBe(60000);
    expect(bar.props.startMs).toBe(0);
    expect(bar.props.endMs).toBe(15000);
  });

  test('nothing is written to the workout videos store', async () => {
    const { tree } = await mount({ ...PR_ONLY, sharedVideo: SHARED });
    expect(texts(tree)).toContain('Share video');
    expect(mockSaveClip).not.toHaveBeenCalled();
    const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');
    expect(SOURCE).not.toMatch(/\bsaveClip\b/);
  });

  test('a video that cannot be read once filmed says to film it again, not to pick another', async () => {
    const { tree } = await mount({ ...PR_ONLY, sharedVideo: SHARED });
    await settleTone();
    mockEngine.exportShareVideo.mockImplementation(() => Promise.reject(Object.assign(new Error('decode'), { code: 'E_DECODE' })));
    await press(buttonTitled(tree, 'Share video')[0]);
    await flush();
    expect(mockEngine.lineForExportError).toHaveBeenCalledWith('E_DECODE', { fromGallery: false });
  });

  test('the system camera is never asked to film a video from this screen', () => {
    const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');
    const calls = SOURCE.match(/launchCameraAsync\(\{[^}]*\}/g) || [];
    expect(calls.length).toBeGreaterThan(0); // the Photo button
    calls.forEach((c) => expect(c).not.toMatch(/videos/));
  });
});

describe('the safety gate', () => {
  test('under calm mode or an open flag, Video and its chooser are not offered', async () => {
    mockSuppress.value = true;
    const { tree } = await mount(PR_ONLY);
    expect(byLabel(tree, 'Video, choose a video')).toHaveLength(0);
    expect(sheet(tree).props.visible).toBe(false);
  });

  test('Film now from a chooser opened before the gate closed does nothing at all', async () => {
    const { tree, rerender, navigation } = await mount(PR_ONLY);
    await openChooser(tree);
    const film = buttonTitled(tree, 'Film now')[0].props.onPress;
    mockSuppress.value = true;
    await rerender();
    await TestRenderer.act(async () => { film(); });
    await flush();
    expect(navigation.navigate).not.toHaveBeenCalled();
    expect(sheet(tree).props.visible).toBe(false);
  });

  test('a video handed back under the gate is ignored, and does not appear once it lifts', async () => {
    mockSuppress.value = true;
    const { tree, navigation, rerender } = await mount({ ...PR_ONLY, sharedVideo: SHARED });
    expect(mockGrab).not.toHaveBeenCalled();
    expect(mockEngine.probeVideo).not.toHaveBeenCalled();
    expect(texts(tree)).not.toContain('Share video');
    expect(navigation.setParams).toHaveBeenCalledWith({ sharedVideo: undefined });
    mockSuppress.value = false;
    await rerender();
    expect(mockGrab).not.toHaveBeenCalled();
    expect(texts(tree)).not.toContain('Share video');
  });
});

describe('with a workout, Film now is unchanged', () => {
  test('it is the in-app recorder for the workout (the primer first), never share-only', async () => {
    const { tree, navigation } = await mount(SESSION);
    await openChooser(tree);
    await press(buttonTitled(tree, 'Film now')[0]);
    expect(texts(tree)).toContain(CLIP_STRINGS.primerTitle);
    expect(navigation.navigate).not.toHaveBeenCalledWith('ClipCamera', expect.anything());
    await press(buttonTitled(tree, CLIP_STRINGS.primerOpen)[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('ClipCamera', expect.objectContaining({ workoutId: 'w1', source: 'share' }));
    expect(navigation.navigate.mock.calls[0][1].mode).toBeUndefined();
    expect(mockPicker.launchCameraAsync).not.toHaveBeenCalled();
  });
});

describe('the microphone keys are never changed silently', () => {
  // Crash check, 2026-10-16. iOS: the key comes from app.json ios.infoPlist
  // (expo-image-picker and expo-av run as legacy prebuild plugins with no
  // options, and their permissions helper keeps a value already there). Its
  // text says the permission is never requested, which stays true only
  // while nothing films with sound: Volyume's camera is muted, and the
  // system camera is never used for video (above). Android: RECORD_AUDIO
  // stays blocked; the in-app camera never records sound.
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'app.json'), 'utf8')).expo;
  const MIC_TEXT = 'Volyume does not record audio. This entry is required by a bundled media library used for timer sounds and the permission is never requested.';

  test('iOS: the Info.plist carries the microphone usage text, and no plugin deletes it', () => {
    expect(app.ios.infoPlist.NSMicrophoneUsageDescription).toBe(MIC_TEXT);
    for (const entry of app.plugins || []) {
      const [name, opts] = Array.isArray(entry) ? entry : [entry, {}];
      if (['expo-image-picker', 'expo-av', 'expo-audio', 'expo-camera'].includes(name)) {
        expect(opts && opts.microphonePermission).not.toBe(false);
      }
    }
  });

  test('Android: the camera is declared and RECORD_AUDIO stays blocked', () => {
    expect(app.android.permissions).toContain('android.permission.CAMERA');
    expect(app.android.blockedPermissions || []).not.toContain('android.permission.CAMERA');
    expect(app.android.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
  });
});
