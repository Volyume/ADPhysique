/**
 * ShareCardScreen — photo looks, look strength and the share theme.
 *
 * Founder orders 2026-09-27: "Can we add an option of a tint or filter to
 * the images added as well with options that fit in well to enhance
 * bodybuilding gym pictures and look well with our theme? ... So the photos
 * can look better without messing about", "Almost like Instagram filters
 * but a select group of them that enhance the look ... Maybe even the
 * option to up and down the filter", "different share themes (light and
 * dark)". The lead ruled the look set and its per-look starting strength
 * (photoLooks.js: startStrengthFor -- 100% for the two black-and-white
 * looks, 80% for the rest); this suite pins the SCREEN's wiring of those
 * decisions, because drawShareCard is mocked here and cannot itself prove
 * what the screen handed it.
 *
 * Pinned:
 *   1. the photo-look strip shows only once a photo exists, never on the
 *      transparent sticker format, and offers all eight looks with a role,
 *      selected state and "<Name>: <description>" label each;
 *   2. choosing a look reaches params.photoLook, and resets the strength to
 *      that look's own start (100% for Iron/Chalk, 80% for the rest);
 *   3. the strength slider's COMMITTED value reaches params.photoLookStrength;
 *   4. Dark is the default theme, and choosing Light reaches params.theme;
 *   5. the Background control's third option now reads "No photo" (renamed
 *      because Dark now names a share theme) and still clears the photo.
 *
 * Written to FAIL on the pre-feature screen: none of photoLook,
 * photoLookStrength or theme existed in its params, there was no look strip
 * or slider, and the Background control's third option still read "Dark".
 *
 * Mock scaffold matches the sibling ShareCardScreen test files (shareTargets
 * .test.js, segmentAccessibilityState.test.js): non-virtual mocks for
 * installed native modules so interception is deterministic across Jest
 * workers, and drawShareCard/greatWeek mocked so the screen's own logic runs
 * without pulling in real Skia draw code.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');
const SectionLabel = require('../../components/SectionLabel').default;

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
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
  launchCameraAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg' }] }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///photo.jpg' }] }),
}));
// The wordmark loader is real elsewhere in the suite (no expo-asset mock is
// needed for that -- see segmentAccessibilityState.test.js); mocked here
// purely so these photo/look tests settle deterministically without waiting
// on its own fallback chain.
jest.mock('../../lib/shareCard/wordmarkImage', () => ({
  loadWordmarkImage: jest.fn().mockResolvedValue(null),
}));

// One small fake decoded photo (well under every downscale threshold in the
// screen, so boundPhotoForCanvas/makeFramerPhoto never need their own
// offscreen redraw UNLESS a look applies -- exactly the behaviour under
// test). `encodeToBase64` covers the no-look-applied path, where the
// original decoded image is encoded directly with no surface in between.
const FAKE_IMG = {
  width: () => 800,
  height: () => 600,
  encodeToBase64: () => 'AAAA',
  dispose: () => {},
};
const fakeSurface = () => ({
  getCanvas: () => ({ drawImageRect: () => {} }),
  flush: () => {},
  makeImageSnapshot: () => ({ encodeToBase64: () => 'AAAA' }),
});
jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Surface: { MakeOffscreen: () => fakeSurface() },
    Data: { fromBase64: () => ({}) },
    Image: { MakeImageFromEncoded: () => FAKE_IMG },
    Paint: () => ({ setAntiAlias: () => {}, setColorFilter: () => {} }),
    ColorFilter: { MakeMatrix: (m) => ({ m }) },
    XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
  },
  matchFont: () => ({ getTypeface: () => ({}) }),
}));
// The renderer is mocked (this suite checks what the SCREEN hands it, not
// its own drawing), but SharePhotoFramer's live preview transitively needs
// this same module's PURE geometry/palette exports (photoFraming.js reads
// photoZoomRange etc. straight from it) -- carried over from the real
// module with jest.requireActual, same as the sibling screen test files'
// scaffold, extended rather than narrowed. drawShareCard.js has exactly one
// import of its own (./photoLooks) and no Skia import at module scope, so
// requiring it here for those exports is Jest-safe.
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
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));

const ShareCardScreen = require('../ShareCardScreen').default;
const { drawShareCard: mockDraw } = require('../../lib/shareCard/drawShareCard');

async function flush() {
  await TestRenderer.act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}

async function mount(params = {}) {
  let tree = null;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' } }),
    );
  });
  await flush();
  return tree;
}

function findByA11yLabel(tree, label) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
}
// The slider's own composite props (as ShareCardScreen passes them in) do
// NOT include accessibilityRole/onAccessibilityAction -- only its internal
// View does -- so a lookup by role is the one that is guaranteed to land on
// the element that actually carries the action handlers.
function adjustableByLabel(tree, label) {
  return tree.root.findAll(
    (n) => n.props && n.props.accessibilityRole === 'adjustable' && n.props.accessibilityLabel === label,
  )[0];
}
function heading(tree, str) {
  return tree.root.findAll((n) => n.type === SectionLabel && n.props.children === str).length;
}
async function press(node) {
  await TestRenderer.act(async () => { node.props.onPress(); });
}
async function waitFor(predicate, rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (predicate()) return;
    // eslint-disable-next-line no-await-in-loop
    await flush();
  }
  expect(predicate()).toBe(true);
}
async function addPhoto(tree) {
  const [btn] = findByA11yLabel(tree, 'My photo');
  await press(btn);
  await waitFor(() => heading(tree, 'Photo look') === 1);
}

// The renderer is mocked, so this is the only window onto what the screen
// actually built for it: the most recent drawShareCard call's params.
function lastParams() {
  const calls = mockDraw.mock.calls;
  return calls.length ? calls[calls.length - 1][1].params : null;
}

const SESSION = {
  sessionData: {
    sessionName: 'Push Day', duration: 60, workingSets: 12,
    exerciseCount: 5, tonnage: 5400, exercises: [], prCount: 0,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the photo look strip', () => {
  test('is absent with no photo', async () => {
    const tree = await mount(SESSION);
    expect(heading(tree, 'Photo look')).toBe(0);
  });

  test('appears once a photo is chosen, offering all eight looks with role, selection and a full label', async () => {
    const tree = await mount(SESSION);
    await addPhoto(tree);
    expect(heading(tree, 'Photo look')).toBe(1);

    const none = findByA11yLabel(tree, 'None: Your photo as it is')[0];
    expect(none.props.accessibilityRole).toBe('button');
    expect(none.props.accessibilityState).toEqual({ selected: true });
    expect(findByA11yLabel(tree, 'Iron: Black and white with strong contrast').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Chalk: Soft, warm black and white').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Stage: Crisp contrast in neutral light, like on stage').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Forge: Warm and moody').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Steel: Cool and moody').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Gold: Warm golden tones').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Pump: Bold, vivid colour').length).toBeGreaterThan(0);
  });

  test('is hidden again on the transparent sticker format, even with a photo', async () => {
    const tree = await mount(SESSION);
    await addPhoto(tree);
    const [sticker] = findByA11yLabel(tree, 'Sticker');
    await press(sticker);
    expect(heading(tree, 'Photo look')).toBe(0);
  });
});

describe('choosing a look', () => {
  test("reaches params.photoLook and resets the strength to that look's own start (lead order 2026-09-27)", async () => {
    const tree = await mount(SESSION);
    await addPhoto(tree);

    // A black-and-white look starts at 100%, never the usual 80%.
    const [iron] = findByA11yLabel(tree, 'Iron: Black and white with strong contrast');
    await press(iron);
    await waitFor(() => lastParams() && lastParams().photoLook === 'iron');
    expect(lastParams().photoLookStrength).toBe(1);
    expect(adjustableByLabel(tree, 'Look strength').props.accessibilityValue.now).toBe(100);

    const [chalk] = findByA11yLabel(tree, 'Chalk: Soft, warm black and white');
    await press(chalk);
    await waitFor(() => lastParams() && lastParams().photoLook === 'chalk');
    expect(lastParams().photoLookStrength).toBe(1);

    // Every other look starts at the usual 80%.
    const [gold] = findByA11yLabel(tree, 'Gold: Warm golden tones');
    await press(gold);
    await waitFor(() => lastParams() && lastParams().photoLook === 'gold');
    expect(lastParams().photoLookStrength).toBeCloseTo(0.8, 10);
    expect(adjustableByLabel(tree, 'Look strength').props.accessibilityValue.now).toBe(80);
  });

  test('None shows no strength row or slider', async () => {
    const tree = await mount(SESSION);
    await addPhoto(tree);
    expect(adjustableByLabel(tree, 'Look strength')).toBeUndefined();
  });

  test('a new photo resets the look back to None', async () => {
    const tree = await mount(SESSION);
    await addPhoto(tree);
    const [iron] = findByA11yLabel(tree, 'Iron: Black and white with strong contrast');
    await press(iron);
    await waitFor(() => lastParams() && lastParams().photoLook === 'iron');

    await addPhoto(tree); // picking "My photo" again, a second time
    await waitFor(() => lastParams() && lastParams().photoLook === 'none');
  });
});

describe('the strength slider', () => {
  test('a committed change (a discrete accessibility action) reaches params.photoLookStrength', async () => {
    const tree = await mount(SESSION);
    await addPhoto(tree);
    const [gold] = findByA11yLabel(tree, 'Gold: Warm golden tones');
    await press(gold);
    await waitFor(() => lastParams() && lastParams().photoLook === 'gold');
    expect(lastParams().photoLookStrength).toBeCloseTo(0.8, 10);

    const slider = adjustableByLabel(tree, 'Look strength');
    await TestRenderer.act(async () => {
      slider.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    });
    await waitFor(() => lastParams() && Math.abs(lastParams().photoLookStrength - 0.9) < 1e-9);
    expect(adjustableByLabel(tree, 'Look strength').props.accessibilityValue.now).toBe(90);
  });
});

describe('share theme', () => {
  test('Dark is the default, and Light reaches params.theme', async () => {
    const tree = await mount(SESSION);
    await waitFor(() => !!lastParams());
    expect(lastParams().theme).toBe('dark');

    const [light] = findByA11yLabel(tree, 'Light');
    await press(light);
    await waitFor(() => lastParams() && lastParams().theme === 'light');
  });

  test('the Theme section is hidden on the sticker format', async () => {
    const tree = await mount(SESSION);
    const [sticker] = findByA11yLabel(tree, 'Sticker');
    await press(sticker);
    expect(heading(tree, 'Theme')).toBe(0);
  });
});

describe('the Background control (renamed 2026-09-27)', () => {
  test('its third option now reads "No photo", not "Dark" (Dark now names a share theme), and still clears the photo', async () => {
    const tree = await mount(SESSION);
    // The ONLY "Dark" label left on the screen is the Theme segment.
    expect(findByA11yLabel(tree, 'Dark').length).toBeGreaterThan(0);

    await addPhoto(tree);
    expect(heading(tree, 'Photo look')).toBe(1);

    const [noPhoto] = findByA11yLabel(tree, 'No photo');
    expect(noPhoto).toBeTruthy();
    await press(noPhoto);
    await waitFor(() => heading(tree, 'Photo look') === 0);
  });
});
