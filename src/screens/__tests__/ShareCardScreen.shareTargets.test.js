/**
 * ShareCardScreen — share-target buttons (Save to gallery + Instagram Stories).
 *
 * Spec: docs/hevy-teardown-2026-06-29/11-sharing.md (P1 "Add explicit share
 * targets"). Pins that the two new buttons render and that the awkward paths —
 * gallery permission denied, and Instagram not installed — never crash. The
 * native modules (expo-media-library, expo-sharing, Linking, Skia, file system)
 * are mocked so the screen exercises its own logic in the node test env.
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');

// ── Native-module mocks ───────────────────────────────────────────────────────
// These are the modules ShareCardScreen require()s behind try/catch. We give
// them controllable jest fns so each test can steer the permission / deep-link
// outcome.

const mockMedia = {
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  saveToLibraryAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-media-library', () => mockMedia, { virtual: true });

const mockSharing = {
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-sharing', () => mockSharing, { virtual: true });

// expo-file-system/legacy is already mapped to a stub via jest config, but the
// screen needs writeAsStringAsync + a cacheDirectory + EncodingType, so make
// those resolve here too.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
}), { virtual: true });

// Skia is needed for the renderer to produce a base64 PNG. A minimal mock that
// returns a non-null base64 string lets the export path run end to end.
jest.mock('@shopify/react-native-skia', () => {
  const surface = {
    getCanvas: () => ({}),
    flush: () => {},
    makeImageSnapshot: () => ({ encodeToBase64: () => 'AAAA' }),
  };
  return {
    Skia: {
      Surface: { MakeOffscreen: () => surface },
      Data: { fromBase64: () => ({}) },
      Image: { MakeImageFromEncoded: () => ({}) },
    },
    matchFont: () => ({ getTypeface: () => ({}) }),
  };
}, { virtual: true });

// The renderer itself is mocked so we don't pull real Skia draw code.
jest.mock('../../lib/shareCard/drawShareCard', () => ({
  drawShareCard: jest.fn(),
  cardHeight: () => 1080,
}), { virtual: true });

jest.mock('../../lib/shareCard/greatWeek', () => ({
  buildWeeklyRecapParams: () => ({}),
}), { virtual: true });

// Toast: capture the messages so we can assert calm-handling without a crash.
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mockToastShow, hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}), { virtual: true });

// react-native Linking is steered per test.
const { Linking } = require('react-native');

const ShareCardScreen = require('../ShareCardScreen').default;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function mount(params = {}) {
  let tree = null;
  await TestRenderer.act(async () => {
    tree = TestRenderer.create(
      React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' } }),
    );
  });
  await TestRenderer.act(async () => {
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
  return tree;
}

function findByA11yLabel(tree, label) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
}

async function press(node) {
  await TestRenderer.act(async () => {
    node.props.onPress();
    for (let i = 0; i < 15; i++) await Promise.resolve();
    await new Promise((r) => setImmediate(r));
  });
}

const SESSION = {
  sessionData: {
    sessionName: 'Push Day', duration: 60, workingSets: 12,
    exerciseCount: 5, tonnage: 5400, exercises: ['Bench', 'Row'], prCount: 1,
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockMedia.requestPermissionsAsync.mockResolvedValue({ granted: true });
  mockMedia.saveToLibraryAsync.mockResolvedValue(undefined);
  mockSharing.isAvailableAsync.mockResolvedValue(true);
  mockSharing.shareAsync.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ShareCardScreen — new share-target buttons render', () => {
  test('Save to gallery and Instagram Stories buttons are present', async () => {
    const tree = await mount(SESSION);
    expect(findByA11yLabel(tree, 'Save to gallery').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Share to Instagram Stories').length).toBeGreaterThan(0);
    // The original share + PDF affordances are intact.
    expect(findByA11yLabel(tree, 'Save as PDF').length).toBeGreaterThan(0);
  });
});

describe('Save to gallery — permission paths', () => {
  test('granted permission saves to the library without crashing', async () => {
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Save to gallery');
    await press(btn);
    expect(mockMedia.requestPermissionsAsync).toHaveBeenCalled();
    expect(mockMedia.saveToLibraryAsync).toHaveBeenCalled();
  });

  test('denied permission shows a calm message and does NOT crash or save', async () => {
    mockMedia.requestPermissionsAsync.mockResolvedValue({ granted: false });
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Save to gallery');
    await expect(press(btn)).resolves.toBeUndefined();
    expect(mockMedia.saveToLibraryAsync).not.toHaveBeenCalled();
    const msgs = mockToastShow.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => /gallery access is needed/i.test(m))).toBe(true);
  });
});

describe('Share to Stories — goes straight to the OS share sheet', () => {
  // The instagram-stories:// deep link can't carry the rendered image via a
  // bare openURL (it would open an empty composer), so "Share to Stories" uses
  // the OS share sheet, which reliably hands the PNG to Instagram or any target.
  test('opens the OS share sheet with the rendered PNG, never a deep link', async () => {
    Linking.openURL = jest.fn();
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Share to Instagram Stories');
    await press(btn);
    expect(mockSharing.shareAsync).toHaveBeenCalled();
    const opts = mockSharing.shareAsync.mock.calls[0][1];
    expect(opts).toMatchObject({ mimeType: 'image/png' });
    // No reliance on a deep link that would land the user in an empty Story.
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  test('sharing unavailable: shows a calm message and does not crash', async () => {
    mockSharing.isAvailableAsync.mockResolvedValue(false);
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Share to Instagram Stories');
    await expect(press(btn)).resolves.toBeUndefined();
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
    const msgs = mockToastShow.mock.calls.map((c) => String(c[0]));
    expect(msgs.some((m) => /sharing is not available/i.test(m))).toBe(true);
  });
});
