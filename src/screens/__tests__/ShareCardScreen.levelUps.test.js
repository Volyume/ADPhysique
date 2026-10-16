/**
 * ShareCardScreen: the fit choice, Set as wallpaper, the text link on iOS,
 * the one amber action and the Background words.
 *
 * Authority: register D229 addendum 6 (founder: "the share is actually not
 * full screen on most mobiles ... Can we, like, extend it ... not wider,
 * taller"; "Is there a way to have active links on the share?") and
 * addendum 5 items 4 and 7 (the Background row reads Gallery | Photo | None,
 * "Photo look" reads "Look", Share is the one amber primary with Save to
 * gallery and Post to Community beneath it).
 *
 * Pinned, all written to FAIL against the screen before this change:
 *   1. the Format row reads Story, Full screen, Feed, Square, Sticker, in that
 *      order ("4:5" is gone; the internal key stays 'portrait');
 *   2. Full screen hands the renderer aspect 'full' with the window's own
 *      height over width and the safe areas over the window height; no other
 *      format carries them;
 *   3. under Full screen, Android offers "Set as wallpaper" when the video
 *      module says it can, and it sets the lock screen from the saved image;
 *      iOS shows "Save it, then set it from Photos." instead; no other format
 *      shows either;
 *   4. on iOS the share goes through React Native's Share with the image's
 *      file and "volyume.app" as the message; Android keeps expo-sharing;
 *   5. Share image is the one amber (emphatic) button, with Save to gallery
 *      and Post to Community beneath it as secondary buttons;
 *   6. the Background row reads Gallery, Photo, None, the chosen source shows
 *      as selected, and the look strip is headed "Look".
 *
 * Mock scaffold matches the sibling ShareCardScreen suites (non-virtual mocks
 * for installed modules; the renderer mocked so what the SCREEN hands it is
 * what is checked). The video module's wrapper (src/lib/shareVideo/engine,
 * the engine lane's file) is mocked virtually only while it does not exist
 * on disk, and by path once it does, so interception stays deterministic.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const RN = require('react-native');
const SectionLabel = require('../../components/SectionLabel').default;
const Button = require('../../components/Button').default;

const mockSharing = {
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-sharing', () => mockSharing);
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///camera.jpg' }] }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg' }] }),
}));
jest.mock('../../lib/shareCard/wordmarkImage', () => ({
  loadWordmarkImage: jest.fn().mockResolvedValue(null),
}));
// The phone's status bar and home indicator.
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
    ...actual,
    drawShareCard: jest.fn(),
    cardHeight: () => 1080,
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
const mockEngine = {
  isAvailable: jest.fn(() => true),
  setLockScreenWallpaper: jest.fn(() => Promise.resolve()),
};
jest.mock(
  '../../lib/shareVideo/engine',
  () => mockEngine,
  { virtual: !require('fs').existsSync(require('path').join(__dirname, '..', '..', 'lib', 'shareVideo', 'engine.js')) },
);

const ShareCardScreen = require('../ShareCardScreen').default;
const { drawShareCard: mockDraw } = require('../../lib/shareCard/drawShareCard');

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
async function press(node) {
  await TestRenderer.act(async () => { node.props.onPress(); });
}
// Host nodes only (the passthrough mocks render each pressable twice).
const hostsByLabel = (tree, label) => tree.root.findAll(
  (n) => typeof n.type === 'string' && n.props && n.props.accessibilityLabel === label,
);
const texts = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Text')
  .map((n) => [].concat(n.props.children).join(''));
const heading = (tree, str) => tree.root.findAll((n) => n.type === SectionLabel && n.props.children === str).length;
const lastParams = () => {
  const calls = mockDraw.mock.calls;
  return calls.length ? calls[calls.length - 1][1].params : null;
};
async function withPlatform(os, fn) {
  const was = RN.Platform.OS;
  RN.Platform.OS = os;
  try { await fn(); } finally { RN.Platform.OS = was; }
}

const SESSION = {
  sessionData: {
    sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, prCount: 0, units: 'kg',
  },
  workoutId: 'w1',
};
const FORMATS = ['Story', 'Full screen', 'Feed', 'Square', 'Sticker'];

beforeEach(() => {
  jest.clearAllMocks();
  mockEngine.isAvailable.mockImplementation(() => true);
  mockEngine.setLockScreenWallpaper.mockImplementation(() => Promise.resolve());
  mockSharing.isAvailableAsync.mockResolvedValue(true);
});

describe('the fit choice', () => {
  test('the Format row reads Story, Full screen, Feed, Square, Sticker, in that order', async () => {
    const tree = await mount(SESSION);
    const labels = tree.root.findAll((n) => typeof n.type === 'string' && FORMATS.concat('4:5').includes(n.props.accessibilityLabel))
      .map((n) => n.props.accessibilityLabel);
    expect(labels).toEqual(FORMATS);
  });

  test('Full screen hands over the phone\'s own shape and safe areas; no other format carries them', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => !!lastParams());
    expect(lastParams().aspect).toBe('story');
    expect(lastParams()).not.toHaveProperty('fullAspect');

    await press(hostsByLabel(tree, 'Full screen')[0]);
    await waitFor(() => lastParams() && lastParams().aspect === 'full');
    expect(lastParams().fullAspect).toBeCloseTo(812 / 375, 10);
    expect(lastParams().safeTopRatio).toBeCloseTo(48 / 812, 10);
    expect(lastParams().safeBottomRatio).toBeCloseTo(24 / 812, 10);
    expect(lastParams().isSquare).toBe(false);

    await press(hostsByLabel(tree, 'Feed')[0]);
    await waitFor(() => lastParams() && lastParams().aspect === 'portrait');
    expect(lastParams()).not.toHaveProperty('fullAspect');
  });
});

describe('Set as wallpaper, under Full screen', () => {
  const WALLPAPER = 'Set as your lock screen wallpaper';
  const IOS_LINE = 'Save it, then set it from Photos.';

  test('Android: offered only under Full screen when the module can, and sets the lock screen from the saved image', async () => {
    await withPlatform('android', async () => {
      const tree = await mount(SESSION);
      expect(hostsByLabel(tree, WALLPAPER)).toHaveLength(0); // Story
      await press(hostsByLabel(tree, 'Full screen')[0]);
      await waitFor(() => hostsByLabel(tree, WALLPAPER).length > 0);
      expect(texts(tree)).not.toContain(IOS_LINE);
      await press(hostsByLabel(tree, WALLPAPER)[0]);
      await waitFor(() => mockEngine.setLockScreenWallpaper.mock.calls.length > 0);
      expect(mockEngine.setLockScreenWallpaper.mock.calls[0][0]).toMatch(/^file:\/\/\/cache\/volyume-session-full-\d+\.png$/);
      await waitFor(() => mockToastShow.mock.calls.some((c) => c[0] === 'Set as your lock screen wallpaper'));
      // Gone again on another format.
      await press(hostsByLabel(tree, 'Square')[0]);
      expect(hostsByLabel(tree, WALLPAPER)).toHaveLength(0);
    });
  });

  test('Android: hidden when the module says it cannot', async () => {
    mockEngine.isAvailable.mockImplementation(() => false);
    await withPlatform('android', async () => {
      const tree = await mount(SESSION);
      await press(hostsByLabel(tree, 'Full screen')[0]);
      await flush();
      expect(hostsByLabel(tree, WALLPAPER)).toHaveLength(0);
    });
  });

  test('a failure to set it is a calm message, never a crash', async () => {
    mockEngine.setLockScreenWallpaper.mockImplementation(() => Promise.reject(new Error('denied')));
    await withPlatform('android', async () => {
      const tree = await mount(SESSION);
      await press(hostsByLabel(tree, 'Full screen')[0]);
      await waitFor(() => hostsByLabel(tree, WALLPAPER).length > 0);
      await press(hostsByLabel(tree, WALLPAPER)[0]);
      await waitFor(() => mockToastShow.mock.calls.some((c) => c[0] === "Couldn't set the wallpaper, try again"));
    });
  });

  test('iOS: no button, the line that says how, and only under Full screen', async () => {
    await withPlatform('ios', async () => {
      const tree = await mount(SESSION);
      expect(texts(tree)).not.toContain(IOS_LINE);
      await press(hostsByLabel(tree, 'Full screen')[0]);
      await waitFor(() => texts(tree).includes(IOS_LINE));
      expect(hostsByLabel(tree, WALLPAPER)).toHaveLength(0);
      expect(mockEngine.setLockScreenWallpaper).not.toHaveBeenCalled();
    });
  });
});

describe('the text link when sharing', () => {
  const SHARE = 'Share to Instagram or Facebook Story';

  test('iOS: React Native\'s Share with the image file and "volyume.app" as its message', async () => {
    await withPlatform('ios', async () => {
      const tree = await mount(SESSION);
      await press(hostsByLabel(tree, SHARE)[0]);
      await waitFor(() => RN.Share.share.mock.calls.length > 0);
      const [content] = RN.Share.share.mock.calls[RN.Share.share.mock.calls.length - 1];
      expect(content.message).toBe('volyume.app');
      expect(content.url).toMatch(/^file:\/\/\/cache\/volyume-session-story-\d+\.png$/);
      expect(mockSharing.shareAsync).not.toHaveBeenCalled();
    });
  });

  test('Android: expo-sharing with the file alone, as before', async () => {
    await withPlatform('android', async () => {
      RN.Share.share.mockClear();
      const tree = await mount(SESSION);
      await press(hostsByLabel(tree, SHARE)[0]);
      await waitFor(() => mockSharing.shareAsync.mock.calls.length > 0);
      expect(mockSharing.shareAsync.mock.calls[0][1]).toMatchObject({ mimeType: 'image/png' });
      expect(RN.Share.share).not.toHaveBeenCalled();
    });
  });
});

describe('the one amber action', () => {
  test('Share image is the one emphatic button, with Save to gallery then Post to Community beneath it as secondary', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => tree.root.findAll((n) => n.type === Button && n.props.title === 'Save to gallery').length > 0);
    const actions = tree.root.findAll((n) => n.type === Button && ['Share image', 'Save to gallery', 'Post to Community'].includes(n.props.title));
    expect(actions.map((b) => b.props.title)).toEqual(['Share image', 'Save to gallery', 'Post to Community']);
    expect(actions.map((b) => b.props.variant)).toEqual(['emphatic', 'secondary', 'secondary']);
    // Its icons and spoken name are unchanged.
    expect(actions[0].props.icon).toBe('logo-instagram');
    expect(actions[0].props.trailingIcon).toBe('logo-facebook');
    expect(actions[0].props.accessibilityLabel).toBe('Share to Instagram or Facebook Story');
    expect(tree.root.findAll((n) => n.type === Button && n.props.variant === 'emphatic')).toHaveLength(1);
  });
});

describe('the Background words', () => {
  test('the row reads Gallery, Photo, None, and the old words are gone', async () => {
    const tree = await mount(SESSION);
    const all = texts(tree);
    ['Gallery', 'Photo', 'None'].forEach((w) => expect(all).toContain(w));
    ['My photo', 'Camera', 'No photo'].forEach((w) => expect(all).not.toContain(w));
    // The spoken names start with the visible word.
    expect(hostsByLabel(tree, 'Gallery, choose a photo')).toHaveLength(1);
    expect(hostsByLabel(tree, 'Photo, take one with the camera')).toHaveLength(1);
    expect(hostsByLabel(tree, 'None, no photo')).toHaveLength(1);
  });

  test('the chosen source shows as selected, and the look strip is headed "Look"', async () => {
    const tree = await mount(SESSION);
    const selected = (label) => hostsByLabel(tree, label)[0].props.accessibilityState.selected;
    expect(selected('None, no photo')).toBe(true);

    await press(hostsByLabel(tree, 'Gallery, choose a photo')[0]);
    await waitFor(() => heading(tree, 'Look') === 1);
    expect(heading(tree, 'Photo look')).toBe(0);
    expect(selected('Gallery, choose a photo')).toBe(true);
    expect(selected('Photo, take one with the camera')).toBe(false);

    await press(hostsByLabel(tree, 'Photo, take one with the camera')[0]);
    await waitFor(() => selected('Photo, take one with the camera') === true);
    expect(selected('Gallery, choose a photo')).toBe(false);

    await press(hostsByLabel(tree, 'None, no photo')[0]);
    await waitFor(() => heading(tree, 'Look') === 0);
    expect(selected('None, no photo')).toBe(true);
  });

  // Founder rule, 2026-10-15: a person reads "video", never "clip"; the
  // video source's name is ready for it.
  test('the sources are named, so the video source joins without renaming', () => {
    const SRC = require('fs').readFileSync(require('path').join(__dirname, '..', 'ShareCardScreen.js'), 'utf8');
    expect(SRC).toMatch(/const BACKGROUND_SOURCES = Object\.freeze\(\{\s*GALLERY: 'gallery',\s*PHOTO: 'photo',\s*VIDEO: 'video',\s*NONE: 'none',\s*\}\);/);
    expect(SRC).not.toMatch(/CLIP: 'clip'/);
    // The video module is loaded only when asked for, inside try/catch.
    expect(SRC).toMatch(/function loadWallpaperEngine\(\) \{\s*try \{[\s\S]{0,120}require\('\.\.\/lib\/shareVideo\/engine'\)/);
  });
});
