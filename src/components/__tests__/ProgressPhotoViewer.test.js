/**
 * ProgressPhotoViewer (progress-photos upgrade, B1).
 *
 * Pins the viewer contract that matters for safety and correctness:
 *  - it renders the photo's date and pose chip from the loaded metadata;
 *  - the bodyweight line is shown ONLY when usePhotoSuppression() is false and
 *    is withheld entirely when it is true (the E1 numeric-over-a-body gate,
 *    fail-closed) — mocked both ways;
 *  - delete calls onDelete(name) only AFTER the confirm's destructive action
 *    fires (and behind the live-tier re-check);
 *  - changing the pose writes through upsertPhotoMeta.
 *
 * Gesture recognisers and the metadata/suppression layers are mocked: the
 * native pinch/pan/tap cannot be driven from react-test-renderer, and the DB
 * accessors belong to B0's own unit tests. This suite exercises the viewer's
 * React behaviour and the safety gate around the weight line.
 */

import { create, act } from 'react-test-renderer';

// The bodyweight line is high-risk; control the shared gate directly.
jest.mock('../../hooks/usePhotoSuppression', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

// Metadata layer is B0's; stub it so the viewer's rendering + write wiring is
// what is under test here.
jest.mock('../../lib/progressPhotoMeta', () => ({
  __esModule: true,
  getPhotoMetaMap: jest.fn(),
  upsertPhotoMeta: jest.fn(),
}));

// appAlert is a module-level singleton needing a mounted host; replace it so
// the confirm's destructive action can be driven synchronously.
const mockAppAlert = jest.fn();
jest.mock('../AppAlert', () => ({
  __esModule: true,
  appAlert: (...args) => mockAppAlert(...args),
  AppAlertHost: () => null,
}));

// gesture-handler has no global manual mock; render its pieces as inert stubs.
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const passthrough = (name) => (props) => React.createElement(name, props, props.children);
  const stub = new Proxy({}, { get: () => () => stub });
  const factory = () => stub;
  return {
    __esModule: true,
    GestureDetector: passthrough('GestureDetector'),
    GestureHandlerRootView: passthrough('GHRoot'),
    Gesture: {
      Pinch: factory, Pan: factory, Tap: factory, Fling: factory, LongPress: factory,
      Simultaneous: () => stub, Exclusive: () => stub, Race: () => stub,
    },
    Directions: {}, State: {},
  };
});

// Button (used for the actions) transitively pulls in expo-haptics.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import ProgressPhotoViewer from '../ProgressPhotoViewer';
import usePhotoSuppression from '../../hooks/usePhotoSuppression';
import { getPhotoMetaMap, upsertPhotoMeta } from '../../lib/progressPhotoMeta';
import useAppStore from '../../store/useAppStore';

const TS = new Date(2026, 6, 3, 9, 0, 0).getTime(); // 3 Jul 2026
const NAME_A = `${TS}.jpg`;
const NAME_B = `${TS - 86400000}.jpg`;
const USER_ID = 'u-viewer-1';

const PHOTOS = [
  { name: NAME_A, uri: 'file:///photos/a.jpg', ts: TS },
  { name: NAME_B, uri: 'file:///photos/b.jpg', ts: TS - 86400000 },
];

const META_MAP = {
  [NAME_A]: { name: NAME_A, takenAt: TS, pose: 'front', weightKg: 72.4, note: 'Morning light' },
  [NAME_B]: { name: NAME_B, takenAt: TS - 86400000, pose: 'side', weightKg: 73.0, note: null },
};

function baseProps(overrides = {}) {
  return {
    photos: PHOTOS,
    initialName: NAME_A,
    onClose: jest.fn(),
    onDelete: jest.fn(),
    onCompareFrom: jest.fn(),
    onSetReference: jest.fn(),
    ...overrides,
  };
}

async function mount(props) {
  let tree;
  await act(async () => {
    tree = create(<ProgressPhotoViewer {...props} />);
  });
  // Flush the getPhotoMetaMap microtasks so metadata lands.
  await act(async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  });
  return tree;
}

function allText(tree) {
  return JSON.stringify(tree.toJSON());
}

function findByLabel(tree, label) {
  return tree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  usePhotoSuppression.mockReturnValue(false);
  getPhotoMetaMap.mockResolvedValue(META_MAP);
  upsertPhotoMeta.mockResolvedValue({ name: NAME_A, takenAt: TS, pose: 'side', weightKg: 72.4, note: 'Morning light' });
  act(() => {
    useAppStore.setState({
      user: { id: USER_ID },
      tier: 'pro',
      bodyWeightUnits: 'kg',
      accessibility: { reduceMotion: false },
    });
  });
});

test('renders the photo date and pose chip from the metadata', async () => {
  const tree = await mount(baseProps());
  const text = allText(tree);
  expect(text).toContain('Jul'); // 3 Jul 2026, British format
  expect(text).toContain('Front'); // pose chip + selector label
  expect(text).toContain('Pose');
  expect(text).toContain('Stored on this device');
  expect(text).toContain('Export anything you want to keep before uninstalling');
});

test('shows the bodyweight line when suppression is off', async () => {
  usePhotoSuppression.mockReturnValue(false);
  const tree = await mount(baseProps());
  expect(allText(tree)).toContain('72.4');
});

test('withholds the bodyweight line entirely when suppressed (fail-closed gate)', async () => {
  usePhotoSuppression.mockReturnValue(true);
  const tree = await mount(baseProps());
  expect(allText(tree)).not.toContain('72.4');
});

test('withholds the bodyweight line when the parent scan context hides exact numbers', async () => {
  usePhotoSuppression.mockReturnValue(false);
  const tree = await mount(baseProps({ hideWeight: true }));
  expect(allText(tree)).not.toContain('72.4');
});

test('delete calls onDelete only after the destructive confirm fires', async () => {
  const props = baseProps();
  // appAlert immediately drives the destructive button's onPress.
  mockAppAlert.mockImplementation((title, message, buttons) => {
    const del = buttons.find((b) => b.style === 'destructive');
    del?.onPress?.();
  });
  const tree = await mount(props);

  expect(props.onDelete).not.toHaveBeenCalled();
  const [delBtn] = findByLabel(tree, 'Remove this photo');
  await act(async () => { delBtn.props.onPress(); });

  expect(mockAppAlert).toHaveBeenCalledTimes(1);
  expect(props.onDelete).toHaveBeenCalledWith(NAME_A);
});

test('scan-set delete copy explains that the whole photo set is removed', async () => {
  const props = baseProps({ deleteModeForPhoto: jest.fn(() => 'scan-set') });
  mockAppAlert.mockImplementation((title, message, buttons) => {
    const del = buttons.find((b) => b.style === 'destructive');
    del?.onPress?.();
  });
  const tree = await mount(props);

  expect(allText(tree)).toContain('Delete set');
  const [delBtn] = findByLabel(tree, 'Remove this photo set');
  await act(async () => { delBtn.props.onPress(); });

  const [, message, buttons] = mockAppAlert.mock.calls[0];
  expect(message).toContain('Delete this full photo set from your device');
  expect(message).toContain('every photo in the set');
  expect(message).toContain('saved Physique Score');
  expect(buttons.find((b) => b.style === 'destructive').text).toBe('Delete set');
  expect(props.onDelete).toHaveBeenCalledWith(NAME_A);
});

test('delete is blocked when the live tier is no longer pro', async () => {
  const props = baseProps();
  mockAppAlert.mockImplementation((title, message, buttons) => {
    const del = buttons.find((b) => b.style === 'destructive');
    del?.onPress?.();
  });
  const tree = await mount(props);
  act(() => { useAppStore.setState({ tier: 'free' }); });

  const [delBtn] = findByLabel(tree, 'Remove this photo');
  await act(async () => { delBtn.props.onPress(); });

  expect(props.onDelete).not.toHaveBeenCalled();
});

test('changing the pose writes through upsertPhotoMeta', async () => {
  const tree = await mount(baseProps());
  const [sideBtn] = findByLabel(tree, 'Set pose to Side');
  await act(async () => { sideBtn.props.onPress(); });

  expect(upsertPhotoMeta).toHaveBeenCalledWith(USER_ID, NAME_A, { pose: 'side' });
});

test('editing the date writes through upsertPhotoMeta with the chosen day, re-snapshotting weight', async () => {
  const tree = await mount(baseProps());
  // Open the real date picker.
  const [editBtn] = findByLabel(tree, 'Edit the date');
  await act(async () => { editBtn.props.onPress(); });

  const dtp = tree.root.findAll((n) => n.type === 'DateTimePicker')[0];
  expect(dtp).toBeTruthy();
  // Past-only at the native level.
  expect(dtp.props.maximumDate.getTime()).toBeLessThanOrEqual(Date.now() + 1000);

  // Choose 1 Jun 2026; the viewer preserves the photo's original 09:00 time.
  const chosen = new Date(2026, 5, 1);
  await act(async () => { dtp.props.onChange({ type: 'set' }, chosen); });

  const expected = new Date(2026, 5, 1, 9, 0, 0, 0).getTime();
  expect(upsertPhotoMeta).toHaveBeenCalledWith(USER_ID, NAME_A, { takenAt: expected });
});

test('a future date cannot be committed even if the picker reports one (clamped)', async () => {
  const tree = await mount(baseProps());
  const [editBtn] = findByLabel(tree, 'Edit the date');
  await act(async () => { editBtn.props.onPress(); });
  const dtp = tree.root.findAll((n) => n.type === 'DateTimePicker')[0];

  const future = new Date(Date.now() + 40 * 86400000);
  await act(async () => { dtp.props.onChange({ type: 'set' }, future); });

  const call = upsertPhotoMeta.mock.calls.find((c) => c[2] && 'takenAt' in c[2]);
  expect(call).toBeTruthy();
  expect(call[2].takenAt).toBeLessThanOrEqual(Date.now() + 1000);
});

test('backfill: a photo with no weight snapshot lazily upserts once for its takenAt', async () => {
  // Both photos come back with a null weight snapshot (added before the meta
  // layer). Opening the viewer should backfill the CURRENT photo exactly once.
  getPhotoMetaMap.mockResolvedValue({
    [NAME_A]: { name: NAME_A, takenAt: TS, pose: 'front', weightKg: null, note: null },
    [NAME_B]: { name: NAME_B, takenAt: TS - 86400000, pose: 'side', weightKg: null, note: null },
  });
  upsertPhotoMeta.mockResolvedValue({ name: NAME_A, takenAt: TS, pose: 'front', weightKg: 80.2, note: null });

  await mount(baseProps());

  const backfillCalls = upsertPhotoMeta.mock.calls.filter(
    (c) => c[1] === NAME_A && c[2] && 'takenAt' in c[2] && !('pose' in c[2]),
  );
  expect(backfillCalls.length).toBe(1);
  expect(backfillCalls[0]).toEqual([USER_ID, NAME_A, { takenAt: TS }]);
});

test('backfill: does NOT fire when a weight snapshot already exists (never overwrites)', async () => {
  // META_MAP has a real weight for NAME_A, so no backfill upsert must run.
  await mount(baseProps());
  const backfillCalls = upsertPhotoMeta.mock.calls.filter(
    (c) => c[1] === NAME_A && c[2] && 'takenAt' in c[2] && !('pose' in c[2]),
  );
  expect(backfillCalls.length).toBe(0);
});

test('set-as-reference and compare-from-here call their callbacks with the photo name', async () => {
  const props = baseProps();
  const tree = await mount(props);

  const [refBtn] = findByLabel(tree, 'Set as reference photo');
  await act(async () => { refBtn.props.onPress(); });
  expect(props.onSetReference).toHaveBeenCalledWith(NAME_A);

  const [cmpBtn] = findByLabel(tree, 'Compare from here');
  await act(async () => { cmpBtn.props.onPress(); });
  expect(props.onCompareFrom).toHaveBeenCalledWith(NAME_A);
});
