/**
 * ShareCardScreen — segmented-control accessibility state (AY-6).
 *
 * Spec: docs/ux-world-class-audit-2026-07-09/SCORECARD.md "Share cards" row
 * ("the share-target segmented control still never announces which segment
 * ... is selected to a screen reader"). The card-type / format / background
 * segmented rows all render through the shared SegmentBtn, which previously
 * carried accessibilityRole="button" with no accessibilityState at all, so a
 * screen reader had no way to tell which segment was currently active.
 *
 * Fix mirrors the in-repo pattern already used for the "which PR" chips a
 * few lines below in the same file, and for the Settings body-weight-unit
 * segmented control (SettingsWorkoutScreen.js): accessibilityState={{
 * selected: active }} alongside the existing accessibilityRole.
 *
 * Reuses the native-module mock scaffold from ShareCardScreen.shareTargets.
 * test.js (same reasons documented there: non-virtual mocks for installed
 * modules so interception is deterministic across Jest workers).
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

// Finds the segmented-control button (TouchableOpacity, accessibilityRole
// "button") whose rendered label text matches, so the assertion holds
// regardless of internal structure.
function segmentByLabel(tree, label) {
  const candidates = tree.root.findAll(
    (n) => n.props && n.props.accessibilityRole === 'button' && 'accessibilityState' in n.props,
  );
  return candidates.find((n) => {
    let texts;
    try {
      texts = n.findAll((c) => c.type === 'Text');
    } catch (_) {
      return false;
    }
    return texts.some((t) => {
      const kids = t.props.children;
      return kids === label || (Array.isArray(kids) && kids.join('') === label);
    });
  });
}

describe('ShareCardScreen — card-type segmented control announces selection (AY-6)', () => {
  test('the active segment carries accessibilityState.selected = true, the inactive one false', async () => {
    const tree = await mount({
      sessionData: { sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, exercises: [], prCount: 0 },
      prData: { exerciseName: 'Bench Press', weight: '100', reps: '1', units: 'kg' },
    });

    // sessionData is present, so cardType initialises to 'session' (session
    // leads whenever both are supplied).
    const sessionSeg = segmentByLabel(tree, 'Session');
    const prSeg = segmentByLabel(tree, 'New PR');
    expect(sessionSeg).toBeTruthy();
    expect(prSeg).toBeTruthy();
    expect(sessionSeg.props.accessibilityState).toEqual({ selected: true });
    expect(prSeg.props.accessibilityState).toEqual({ selected: false });
  });

  test('switching the segment moves the announced selection', async () => {
    const tree = await mount({
      sessionData: { sessionName: 'Push Day', duration: 60, workingSets: 12, exerciseCount: 5, tonnage: 5400, exercises: [], prCount: 0 },
      prData: { exerciseName: 'Bench Press', weight: '100', reps: '1', units: 'kg' },
    });

    await TestRenderer.act(async () => {
      segmentByLabel(tree, 'New PR').props.onPress();
    });
    await flush();

    expect(segmentByLabel(tree, 'Session').props.accessibilityState).toEqual({ selected: false });
    expect(segmentByLabel(tree, 'New PR').props.accessibilityState).toEqual({ selected: true });
  });
});
