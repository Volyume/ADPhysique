/**
 * ShareCardScreen — preview error state (EP-17/UI-05, Codex end-user-polish
 * audit, native app only).
 *
 * Before this fix, `previewB64 === null` meant BOTH "still rendering" and
 * "permanently failed" (a Skia surface/encode failure, e.g. from a corrupt
 * background photo or a build without the native module), so the
 * ActivityIndicator placeholder spun forever with no way out and no Retry.
 * This suite forces `renderCardBase64` to fail (Skia's makeImageSnapshot
 * returns null, matching a real encode failure) and pins that the screen
 * renders a compact, labelled Retry action instead of an endless spinner,
 * and that pressing Retry re-attempts the render and can recover.
 *
 * Reuses the native-module mock scaffold from ShareCardScreen.shareTargets.
 * test.js / ShareCardScreen.segmentAccessibilityState.test.js (non-virtual
 * mocks for installed modules, see those files for why).
 */

const React = require('react');
const TestRenderer = require('react-test-renderer');

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

// makeImageSnapshot starts out returning null (an offscreen-encode failure,
// matching a real Skia render fault), controllable per-test so a later
// attempt (Retry) can succeed.
let mockSnapshotSucceeds = false;
jest.mock('@shopify/react-native-skia', () => {
  const surface = {
    getCanvas: () => ({}),
    flush: () => {},
    makeImageSnapshot: () => (mockSnapshotSucceeds ? { encodeToBase64: () => 'AAAA' } : null),
  };
  return {
    Skia: {
      Surface: { MakeOffscreen: () => surface },
      Data: { fromBase64: () => ({}) },
      Image: { MakeImageFromEncoded: () => ({}) },
    },
    matchFont: () => ({ getTypeface: () => ({}) }),
  };
});
jest.mock('../../lib/shareCard/drawShareCard', () => ({
  drawShareCard: jest.fn(),
  cardHeight: () => 1080,
}));
jest.mock('../../lib/shareCard/greatWeek', () => ({
  buildWeeklyRecapParams: () => ({}),
}));
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ show: jest.fn(), hide: jest.fn() }),
  ToastProvider: ({ children }) => children,
}));

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
    tree = TestRenderer.create(
      React.createElement(ShareCardScreen, { route: { params, name: 'ShareCard' } }),
    );
  });
  await flush();
  return tree;
}

function findByAccessibilityLabel(tree, label) {
  return tree.root.findAll((n) => n.props && n.props.accessibilityLabel === label);
}

function findAllText(tree) {
  return tree.root.findAll((n) => n.type === 'Text').map((n) => {
    const kids = n.props.children;
    return Array.isArray(kids) ? kids.join('') : kids;
  });
}

beforeEach(() => {
  mockSnapshotSucceeds = false;
});

describe('ShareCardScreen preview error state (EP-17/UI-05)', () => {
  test('a permanent render failure shows a labelled Retry action, not an endless spinner', async () => {
    const tree = await mount({
      sessionData: { sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, exercises: [], prCount: 0 },
    });

    const retry = findByAccessibilityLabel(tree, 'Retry building the preview');
    expect(retry.length).toBeGreaterThan(0);
    expect(findAllText(tree)).toContain("Couldn't build the preview.");
  });

  test('pressing Retry re-attempts the render and recovers once it can succeed', async () => {
    const tree = await mount({
      sessionData: { sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, exercises: [], prCount: 0 },
    });

    expect(findByAccessibilityLabel(tree, 'Retry building the preview').length).toBeGreaterThan(0);

    // The build now succeeds; pressing Retry should clear the error state.
    mockSnapshotSucceeds = true;
    const retryBtn = tree.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === 'Retry building the preview' && typeof n.props.onPress === 'function',
    )[0];
    await TestRenderer.act(async () => { retryBtn.props.onPress(); });
    await flush();

    expect(findByAccessibilityLabel(tree, 'Retry building the preview').length).toBe(0);
    expect(findAllText(tree)).not.toContain("Couldn't build the preview.");
  });
});
