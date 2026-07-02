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
// NOT virtual: expo-media-library is an installed, resolvable module, so a
// virtual mock intercepts only nondeterministically across Jest workers. When it
// missed in CI, the screen's real require threw, MediaLibrary stayed undefined,
// and the "Save to gallery" button (gated on MediaLibrary) never rendered —
// failing these tests. A plain mock intercepts by resolved path every time.
jest.mock('expo-media-library', () => mockMedia);

const mockSharing = {
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-sharing', () => mockSharing); // installed module: non-virtual (see above)

// expo-file-system/legacy is already mapped to a stub via jest config, but the
// screen needs writeAsStringAsync + a cacheDirectory + EncodingType, so make
// those resolve here too.
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
}));

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
}); // installed module: non-virtual (see expo-media-library note above)

// The renderer itself is mocked so we don't pull real Skia draw code. These are
// REAL modules on disk, so the mock must NOT be virtual: a virtual mock on a
// resolvable module intercepts only nondeterministically across Jest workers,
// which let the real drawShareCard run in CI and crash on the minimal Skia mock
// (it has no Shader). A plain (non-virtual) mock intercepts by resolved path
// every time.
jest.mock('../../lib/shareCard/drawShareCard', () => ({
  drawShareCard: jest.fn(),
  cardHeight: () => 1080,
}));

jest.mock('../../lib/shareCard/greatWeek', () => ({
  buildWeeklyRecapParams: () => ({}),
}));

// Toast: capture the messages so we can assert calm-handling without a crash.
const mockToastShow = jest.fn();
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: mockToastShow, hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));

// react-native Linking is steered per test.
const { Linking } = require('react-native');

const ShareCardScreen = require('../ShareCardScreen').default;

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  // The share-target buttons render only after the card preview finishes its
  // async render. Poll until they appear (bounded) instead of waiting a fixed
  // number of ticks: on a slower CI event loop the fixed wait raced the async
  // render and the buttons were absent, failing the assertions nondeterministically.
  for (let round = 0; round < 40; round++) {
    if (findByA11yLabel(tree, 'Save to gallery').length > 0) break;
    // eslint-disable-next-line no-await-in-loop
    await flush();
  }
  return tree;
}

function findByA11yLabel(tree, label) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
}

// Deterministic wait-for-effect (the fix that un-quarantined the press
// suites below): flush the event loop in bounded rounds until the observed
// side effect appears, instead of awaiting a FIXED number of ticks. The
// fixed-tick wait was the recorded CI flake — a slower event loop hadn't
// settled the permission -> render -> write -> save/share chain when the
// assertions ran. Polling on the effect itself is speed-independent; the
// final expect fails loudly with the real condition if it never arrives.
async function waitFor(predicate, rounds = 40) {
  for (let i = 0; i < rounds; i++) {
    if (predicate()) return;
    // eslint-disable-next-line no-await-in-loop
    await flush();
  }
  expect(predicate()).toBe(true);
}

async function pressAndWaitFor(node, predicate) {
  await TestRenderer.act(async () => {
    node.props.onPress();
  });
  await waitFor(predicate);
}

const toastMessages = () => mockToastShow.mock.calls.map((c) => String(c[0]));

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

describe('ShareCardScreen — share-target buttons render', () => {
  test('Save to gallery + Share to Story present; Save as PDF removed (founder 2026-06-30)', async () => {
    const tree = await mount(SESSION);
    expect(findByA11yLabel(tree, 'Save to gallery').length).toBeGreaterThan(0);
    // Founder 2026-06-30: the single Instagram-Stories button became a Story
    // share covering Instagram + Facebook via the system share sheet.
    expect(findByA11yLabel(tree, 'Share to Instagram or Facebook Story').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Share to Instagram Stories').length).toBe(0);
    // 'Save as PDF' was removed (unused).
    expect(findByA11yLabel(tree, 'Save as PDF').length).toBe(0);
  });
});

describe('ShareCardScreen — PR selector (founder 2026-07-01)', () => {
  const TWO_PRS = {
    prData: { exerciseName: 'Bench Press', weight: '100', reps: '1', units: 'kg' },
    prList: [
      { exerciseName: 'Bench Press', weight: '100', reps: '1', units: 'kg' },
      { exerciseName: 'Back Squat', weight: '140', reps: '1', units: 'kg' },
    ],
  };

  test('multiple PRs render a selectable chip per PR', async () => {
    const tree = await mount(TWO_PRS);
    expect(findByA11yLabel(tree, 'Feature Bench Press').length).toBeGreaterThan(0);
    expect(findByA11yLabel(tree, 'Feature Back Squat').length).toBeGreaterThan(0);
  });

  test('a single PR shows NO selector (nothing to choose)', async () => {
    const tree = await mount({
      prData: { exerciseName: 'Bench Press', weight: '100', reps: '1', units: 'kg' },
    });
    expect(findByA11yLabel(tree, 'Feature Bench Press').length).toBe(0);
  });
});

// Un-quarantined (2026-07-02): the 2026-06-30 CI flake was the fixed-tick
// press() wait racing the async handler chain. Every press now waits on the
// handler's own terminal side effect (mock call or toast) via the bounded
// waitFor above, so the assertions are event-loop-speed independent. The
// stale 'Share to Instagram Stories' label was also updated to the current
// 'Share to Instagram or Facebook Story' (founder 2026-06-30 rename).
describe('Save to gallery — permission paths', () => {
  test('granted permission saves to the library and confirms with a toast', async () => {
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Save to gallery');
    await pressAndWaitFor(btn, () =>
      toastMessages().some((m) => /saved to your gallery/i.test(m)));
    expect(mockMedia.requestPermissionsAsync).toHaveBeenCalled();
    expect(mockMedia.saveToLibraryAsync).toHaveBeenCalled();
  });

  test('denied permission shows a calm message and does NOT save', async () => {
    mockMedia.requestPermissionsAsync.mockResolvedValue({ granted: false });
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Save to gallery');
    // The denial toast is the handler's terminal effect; once it has shown,
    // the negative assertion below observes the settled chain, not a race.
    await pressAndWaitFor(btn, () =>
      toastMessages().some((m) => /gallery access is needed/i.test(m)));
    expect(mockMedia.saveToLibraryAsync).not.toHaveBeenCalled();
  });
});

describe('Share to Story — goes straight to the OS share sheet', () => {
  // A direct composer intent needs a native dependency plus a Facebook App
  // ID (see the founder-decision comment in handleShareToStories), so the
  // Story share deliberately uses the OS share sheet, which reliably hands
  // the PNG to Instagram, Facebook or any target — never a bare deep link
  // that would open an empty composer.
  test('opens the OS share sheet with the rendered PNG, never a deep link', async () => {
    Linking.openURL = jest.fn();
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Share to Instagram or Facebook Story');
    await pressAndWaitFor(btn, () => mockSharing.shareAsync.mock.calls.length > 0);
    const opts = mockSharing.shareAsync.mock.calls[0][1];
    expect(opts).toMatchObject({ mimeType: 'image/png' });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  test('sharing unavailable: shows a calm message and does not crash', async () => {
    mockSharing.isAvailableAsync.mockResolvedValue(false);
    const tree = await mount(SESSION);
    const [btn] = findByA11yLabel(tree, 'Share to Instagram or Facebook Story');
    await pressAndWaitFor(btn, () =>
      toastMessages().some((m) => /sharing is not available/i.test(m)));
    expect(mockSharing.shareAsync).not.toHaveBeenCalled();
  });
});
