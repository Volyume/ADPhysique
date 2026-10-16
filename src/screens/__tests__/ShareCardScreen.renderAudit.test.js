/**
 * ShareCardScreen: the render audit of 2026-10-16, lead rulings 3 and 4.
 *
 * Pinned, each written to FAIL against the screen before:
 *   3. Retry in the preview's error box is centred (Button's
 *      fullWidth={false} sets alignSelf to the start, so it sat left);
 *   4. under Sticker only what changes the sticker stays on screen, so
 *      nothing there is dead. The sticker draws what stickerContentFor
 *      (src/lib/shareCard/drawShareCard.js) reads: a session's hero (new
 *      bests, else the total lifted with "Total weight lifted" on, else
 *      working sets) and its name; a PR's weight (or reps) and lift; the
 *      weekly hero. So Top lift(s), Highlight(s), Quote, Date, Plan name
 *      and Previous best go; Total weight lifted stays only while it can
 *      change the session's hero; Weight progress and Best lift of the week
 *      only while switching them changes the weekly hero. Every value is
 *      kept, and all of it is back with any other format.
 *
 * Mock scaffold as ShareCardScreen.levelUps.test.js, with the real weekly
 * params builder and the safety gate read from a mock (open by default).
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
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
// A render that can be made to fail (the error box) or succeed.
const mockSkiaState = { snapshotOk: true };
const FAKE_IMG = { width: () => 800, height: () => 600, encodeToBase64: () => 'AAAA', dispose: () => {} };
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
    ...actual,
    drawShareCard: jest.fn(),
    cardHeight: () => 1080,
    drawSticker: jest.fn(),
    stickerHeight: () => 1080,
    sessionLiftsThatFit: jest.fn(({ lifts }) => lifts.length),
  };
});
// The real weekly params builder: which weekly toggles reach the sticker is
// worked out through it.
const mockSuppress = { value: false };
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: () => mockSuppress.value }));
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
  await flush();
}
const host = (n) => typeof n.type === 'string';
const hostsByLabel = (tree, label) => tree.root.findAll((n) => host(n) && n.props && n.props.accessibilityLabel === label);
const headings = (tree) => tree.root.findAll((n) => n.type === SectionLabel).map((n) => n.props.children);
// The toggles on screen, by their Switch's name.
const toggles = (tree) => tree.root.findAll((n) => host(n) && n.props && typeof n.props.onValueChange === 'function')
  .map((n) => n.props.accessibilityLabel);
const toggle = (tree, label) => tree.root.findAll((n) => host(n) && n.props && n.props.accessibilityLabel === label
  && typeof n.props.onValueChange === 'function')[0];
async function flip(tree, label) {
  const sw = toggle(tree, label);
  await TestRenderer.act(async () => { sw.props.onValueChange(!sw.props.value); });
  await flush();
}
const flatStyle = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));
const format = (tree, label) => press(hostsByLabel(tree, label)[0]);

const SESSION = {
  sessionData: {
    sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, prCount: 0, units: 'kg',
    planName: 'Upper Lower',
    liftOptions: [{ exerciseName: 'Bench press', weight: 80, reps: 5 }],
    highlightOptions: [{ key: 'h1', text: 'Your most volume in 4 weeks' }],
  },
  workoutId: 'w1',
};
const PR = { exerciseName: 'Back squat', weight: 140, reps: 3, previousBest: 135, units: 'kg' };
const WEEK = (goalPhase, delta) => ({
  sessionsPlanned: 4, sessionsCompleted: 4, prsThisWeek: 1, recoveryFlag: 'normal', goalPhase,
  trend: { onTarget: true, delta },
});
const BEST = { exerciseName: 'Deadlift', weight: 180, reps: 3, units: 'kg' };

beforeEach(() => {
  jest.clearAllMocks();
  mockSkiaState.snapshotOk = true;
  mockSuppress.value = false;
  mockEngine.isAvailable.mockImplementation(() => true);
  mockSharing.isAvailableAsync.mockResolvedValue(true);
});

describe('3: Retry in the error box is centred', () => {
  test('the box centres its contents and Retry is centred in it, not at the start', async () => {
    mockSkiaState.snapshotOk = false;
    const tree = await mount(SESSION);
    await waitFor(() => hostsByLabel(tree, 'Retry building the preview').length > 0);
    const retry = tree.root.findAll((n) => n.type === Button && n.props.title === 'Retry')[0];
    expect(retry.props.fullWidth).toBe(false);
    expect(flatStyle(retry.props.style).alignSelf).toBe('center');
    // What Button draws: its own alignSelf first, the caller's style after.
    const drawn = hostsByLabel(tree, 'Retry building the preview')[0];
    expect(flatStyle(drawn.props.style).alignSelf).toBe('center');
  });
});

describe('4: under Sticker, only what changes the sticker', () => {
  test('a session with new bests: Top lift, Highlight, Quote, Date, Plan name and Total weight lifted all go; the type picker and Format stay; all back, values kept, with any other format', async () => {
    const tree = await mount({ ...SESSION, sessionData: { ...SESSION.sessionData, prCount: 2 } });
    expect(headings(tree)).toEqual(expect.arrayContaining(['Top lift', 'Highlight', 'Quote or caption', 'What to include']));
    expect(toggles(tree)).toEqual(expect.arrayContaining(['Date', 'Plan name', 'Total weight lifted', 'Your most volume in 4 weeks']));
    // A value set before, to see it kept.
    await flip(tree, 'Plan name');
    expect(toggle(tree, 'Plan name').props.value).toBe(false);
    await format(tree, 'Sticker');
    for (const gone of ['Top lift', 'Top lifts', 'Highlight', 'Highlights', 'Quote or caption', 'What to include', 'Theme', 'Background']) {
      expect({ gone, shown: headings(tree).includes(gone) }).toEqual({ gone, shown: false });
    }
    expect(toggles(tree)).toEqual([]);
    expect(headings(tree)).toContain('Format');
    // The privacy line is a promise, not a control: it stays.
    expect(tree.root.findAll((n) => host(n) && n.type === 'Text'
      && [].concat(n.props.children).join('') === 'Name, bodyweight, measurements and private notes are never included.').length).toBeGreaterThan(0);
    for (const fmt of ['Story', 'Full screen', 'Feed', 'Square']) {
      // eslint-disable-next-line no-await-in-loop
      await format(tree, fmt);
      expect(headings(tree)).toEqual(expect.arrayContaining(['Top lift', 'Highlight', 'Quote or caption', 'What to include']));
      expect(toggles(tree)).toEqual(['Your most volume in 4 weeks', 'Date', 'Plan name', 'Total weight lifted']);
      expect(toggle(tree, 'Plan name').props.value).toBe(false);
      // eslint-disable-next-line no-await-in-loop
      await format(tree, 'Sticker');
    }
  });

  test('a session with no new bests and a total: Total weight lifted is the one toggle left (it makes the hero the total or the working sets), and it is the last row', async () => {
    const tree = await mount(SESSION);
    await format(tree, 'Sticker');
    expect(headings(tree)).toContain('What to include');
    expect(toggles(tree)).toEqual(['Total weight lifted']);
    const row = tree.root.findAll((n) => n.props && n.props.label === 'Total weight lifted' && 'last' in n.props)[0];
    expect(row.props.last).toBe(true);
  });

  test('a session with no total: nothing in What to include changes the sticker, so it goes', async () => {
    const tree = await mount({ ...SESSION, sessionData: { ...SESSION.sessionData, tonnage: 0 } });
    await format(tree, 'Sticker');
    expect(headings(tree)).not.toContain('What to include');
    expect(toggles(tree)).toEqual([]);
  });

  test('a PR: PR weight stays (weight or reps); Date and Previous best go, and come back', async () => {
    const tree = await mount({ prData: PR });
    expect(toggles(tree)).toEqual(['Date', 'PR weight', 'Previous best']);
    await format(tree, 'Sticker');
    expect(toggles(tree)).toEqual(['PR weight']);
    await format(tree, 'Square');
    expect(toggles(tree)).toEqual(['Date', 'PR weight', 'Previous best']);
  });

  test('a weekly cut week on target with a best lift: Weight progress changes the hero, so it stays; with progress on, Best lift of the week does not, so it goes; with progress off it does', async () => {
    const tree = await mount({ weeklyRecapData: WEEK('mild_cut', -0.6), bestLift: BEST });
    expect(toggles(tree)).toEqual(['Date', 'Weight progress', 'Best lift of the week']);
    await format(tree, 'Sticker');
    // Progress off by default: the hero is the best lift; both change it.
    expect(toggles(tree)).toEqual(['Weight progress', 'Best lift of the week']);
    await flip(tree, 'Weight progress');
    expect(toggles(tree)).toEqual(['Weight progress']);
    await format(tree, 'Story');
    expect(toggles(tree)).toEqual(['Date', 'Weight progress', 'Best lift of the week']);
    expect(toggle(tree, 'Weight progress').props.value).toBe(true);
  });

  test('a weekly bulk week: Weight progress never changes the hero, so it goes under Sticker; Best lift of the week stays', async () => {
    const tree = await mount({ weeklyRecapData: WEEK('mod_bulk', 0.3), bestLift: BEST });
    await format(tree, 'Sticker');
    expect(toggles(tree)).toEqual(['Best lift of the week']);
  });

  test('under calm mode or an open flag the weekly toggles stay off screen in every format', async () => {
    mockSuppress.value = true;
    const tree = await mount({ weeklyRecapData: WEEK('mild_cut', -0.6), bestLift: BEST });
    expect(toggles(tree)).toEqual(['Date']);
    await format(tree, 'Sticker');
    expect(toggles(tree)).toEqual([]);
  });
});
