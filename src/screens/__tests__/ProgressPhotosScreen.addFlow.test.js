/**
 * ProgressPhotosScreen — the ADD flow with the "Photo details" step
 * (progress-photos DATING upgrade).
 *
 * Pins the core new behaviour: picking an image no longer saves silently at
 * file-time. It opens the calm Photo details step, and only on confirm does it
 * saveProgressPhoto(uri, undefined, userId) THEN upsertPhotoMeta(userId, name, { takenAt, pose }),
 * which snapshots the weigh-in nearest the CHOSEN date. This is what makes the
 * founder's target scenario work: add last week's photo today, set the date to
 * last week, and it indexes under last week with last week's weight.
 *
 * The four heavy child surfaces are stubbed to inert hosts; PhotoDetailsSheet is
 * REAL so the date/pose collection is exercised end to end. The native date
 * picker is stubbed via moduleNameMapper.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({
    data = [],
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
    ...props
  }) => {
    const React = require('react');
    const renderComponent = (Component, key) => {
      if (!Component) return null;
      if (typeof Component === 'function') return React.createElement(Component, { key });
      return React.cloneElement(Component, { key });
    };
    const children = [
      renderComponent(ListHeaderComponent, 'header'),
      ...(data.length
        ? data.map((item, index) => React.createElement(React.Fragment, { key: item.key || index }, renderItem({ item, index })))
        : [renderComponent(ListEmptyComponent, 'empty')]),
    ].filter(Boolean);
    return React.createElement('FlatList', {
      ...props,
      data,
      renderItem,
      ListHeaderComponent,
      ListEmptyComponent,
    }, children);
  },
}));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: jest.fn() }) }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));
jest.mock('../../lib/wellbeing', () => ({
  WELLBEING_KEY: jest.requireActual('../../lib/wellbeing').WELLBEING_KEY,
  isCalm: (m) => m === 'calm',
}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// AppAlert is driven so we can pick "Choose from photos".
const mockAppAlert = jest.fn();
jest.mock('../../components/AppAlert', () => ({ appAlert: (...a) => mockAppAlert(...a) }));

// The image picker (native): granted permission, one asset.
const mockLaunchLibrary = jest.fn(async () => ({ canceled: false, assets: [{ uri: 'file:///picked.jpg' }] }));
jest.mock('expo-image-picker', () => ({
  __esModule: true,
  MediaTypeOptions: { Images: 'Images' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true })),
  launchImageLibraryAsync: (...a) => mockLaunchLibrary(...a),
}));

jest.mock('../../lib/progressPhotos', () => ({
  listProgressPhotos: jest.fn(async () => []),
  saveProgressPhoto: jest.fn(async () => ({ name: '1700000000000.jpg', uri: 'file:///photos/1700000000000.jpg', ts: 1700000000000 })),
  deleteProgressPhoto: jest.fn(async () => true),
  markPhotosOwner: jest.fn(),
}));
jest.mock('../../lib/progressPhotoMeta', () => ({
  getPhotoMetaMap: jest.fn(async () => ({})),
  deletePhotoMeta: jest.fn(async () => true),
  upsertPhotoMeta: jest.fn(async () => ({})),
}));
jest.mock('../../lib/progressScanStore', () => ({
  createProgressScanSession: jest.fn(async (_userId, opts = {}) => ({ id: 'scan-1', capturedAt: opts.capturedAt })),
  addProgressScanAsset: jest.fn(async () => ({ id: 'asset-1' })),
  detachProgressScanPhoto: jest.fn(async () => true),
  deleteProgressScanSession: jest.fn(async () => true),
  finishProgressScanSession: jest.fn(async () => ({ id: 'scan-1' })),
  listProgressScanEntries: jest.fn(async () => []),
}));
jest.mock('../../lib/progressScanVision', () => ({
  analyseProgressScanPhoto: jest.fn(async () => ({ ok: true })),
  assetFieldsFromVisionResult: jest.fn(() => ({
    qualityScore: 0.9,
    lightingScore: 0.9,
    blurScore: 0.9,
    framingScore: 0.9,
    segmentationConfidence: 0.9,
    signals: { modelBacked: true, quality: { lightingScore: 0.9, framingScore: 0.9 } },
  })),
  retakeCopyForVisionResult: jest.fn(() => null),
}));
jest.mock('../../lib/progressScanPreferences', () => ({
  getProgressScanCapturePreferences: jest.fn(async () => ({ timerSeconds: 10 })),
  getProgressScanHideExactPreference: jest.fn(async () => false),
  setProgressScanHideExactPreference: jest.fn(async () => {}),
}));
jest.mock('../../lib/database', () => ({
  getUserBodyProfile: jest.fn(async () => null),
}));
jest.mock('../../hooks/usePhotoSuppression', () => ({ __esModule: true, default: jest.fn(() => false) }));

const stub = (name) => ({ __esModule: true, default: (props) => {
  const React = require('react');
  return React.createElement(name, props);
} });
jest.mock('../../components/ProgressPhotoViewer', () => stub('ProgressPhotoViewer'));
jest.mock('../../components/ProgressPhotoCompare', () => stub('ProgressPhotoCompare'));
jest.mock('../../components/ProgressGhostCapture', () => stub('ProgressGhostCapture'));
jest.mock('../../components/BeforeAfterShareSheet', () => stub('BeforeAfterShareSheet'));

import useAppStore from '../../store/useAppStore';
import { saveProgressPhoto } from '../../lib/progressPhotos';
import { upsertPhotoMeta } from '../../lib/progressPhotoMeta';
import { createProgressScanSession, addProgressScanAsset } from '../../lib/progressScanStore';
import { analyseProgressScanPhoto } from '../../lib/progressScanVision';
import ProgressPhotosScreen from '../ProgressPhotosScreen';

const USER_ID = 'u-add-1';
const nav = { goBack: jest.fn() };

async function flush() {
  await act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });
}

async function render({ tier = 'pro' } = {}) {
  useAppStore.mockImplementation((sel) => sel({ accessibility: { reduceMotion: false }, tier, user: { id: USER_ID } }));
  useAppStore.getState = () => ({ tier, user: { id: USER_ID } });
  let tree;
  await act(async () => { tree = create(<ProgressPhotosScreen navigation={nav} />); });
  await flush();
  return tree;
}

function pressLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  if (!node) throw new Error(`No pressable labelled "${label}"`);
  return act(async () => { node.props.onPress(); });
}

function hasPressableLabel(tree, label) {
  return tree.root.findAll(
    (n) => typeof n.type === 'string' && n.props?.accessibilityLabel === label && typeof n.props.onPress === 'function',
  ).length > 0;
}

function allTexts(tree) {
  return tree.root
    .findAll((n) => typeof n.type === 'string' && n.type === 'Text')
    .map((t) => {
      const walk = (node) => {
        if (node == null) return '';
        if (typeof node === 'string' || typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(walk).join('');
        return walk(node.children);
      };
      return walk(t.props.children);
    });
}

async function openImportScanDateStep(tree) {
  await pressLabel(tree, 'Add photos');
  await flush();
  await pressLabel(tree, 'Import photos to scan');
}

async function importFrontScanPhoto(tree) {
  await openImportScanDateStep(tree);
  await flush();
  await pressLabel(tree, 'Import photos for this scan');
}

beforeEach(() => jest.clearAllMocks());

test('add photos sheet presents guided capture and import as the two scan paths', async () => {
  mockAppAlert.mockImplementation(() => {});
  const tree = await render();
  await pressLabel(tree, 'Add photos');

  expect(mockAppAlert).not.toHaveBeenCalled();
  const copy = allTexts(tree).join(' ');
  expect(copy).toContain('Add photos');
  expect(copy).toContain('Choose guided capture or import existing photos.');
  expect(copy).toContain('Guided physique scan');
  expect(copy).toContain('Import photos to scan');
  expect(copy).toContain('Choose the front relaxed photo');
  expect(copy).toContain('Photos stay on this phone unless you share or export them.');
  expect(hasPressableLabel(tree, 'Start guided scan')).toBe(true);
  expect(hasPressableLabel(tree, 'Import photos to scan')).toBe(true);
  expect(hasPressableLabel(tree, 'Choose from photos')).toBe(false);
});

test('importing photos asks for the scan date before touching the library', async () => {
  mockAppAlert.mockImplementation(() => {});
  const tree = await render();
  await openImportScanDateStep(tree);
  await flush();
  const importAction = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Import photos for this scan');
  expect(importAction.length).toBeGreaterThan(0);
  expect(createProgressScanSession).not.toHaveBeenCalled();
  expect(saveProgressPhoto).not.toHaveBeenCalled();
  expect(upsertPhotoMeta).not.toHaveBeenCalled();
});

test('confirming the scan date imports the first photo into the scan pipeline', async () => {
  mockAppAlert.mockImplementation((title, _message, buttons = []) => {
    if (title === 'Use this photo?') buttons.find((b) => b.text === 'Use photo')?.onPress?.();
  });
  const tree = await render();
  await importFrontScanPhoto(tree);
  await flush();

  expect(createProgressScanSession).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ capturedAt: expect.any(Number) }));
  expect(saveProgressPhoto).toHaveBeenCalledWith('file:///picked.jpg', undefined, USER_ID);
  expect(upsertPhotoMeta).toHaveBeenCalledTimes(1);
  const [uid, name, patch] = upsertPhotoMeta.mock.calls[0];
  expect(uid).toBe(USER_ID);
  expect(name).toBe('1700000000000.jpg');
  expect(patch.pose).toBe('front');
  // Today by default.
  const startOfToday = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  expect(patch.takenAt).toBeGreaterThanOrEqual(startOfToday);
  expect(analyseProgressScanPhoto).toHaveBeenCalledWith({ uri: 'file:///photos/1700000000000.jpg', pose: 'front' });
  expect(addProgressScanAsset).toHaveBeenCalledWith(USER_ID, 'scan-1', expect.objectContaining({
    pose: 'front',
    photoName: '1700000000000.jpg',
    takenAt: patch.takenAt,
  }));
});

test('setting the imported scan date to the past indexes the set under that day', async () => {
  mockAppAlert.mockImplementation((title, _message, buttons = []) => {
    if (title === 'Use this photo?') buttons.find((b) => b.text === 'Use photo')?.onPress?.();
  });
  const tree = await render();
  await openImportScanDateStep(tree);
  await flush();

  const field = tree.root.findAll(
    (n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Change scan date')
      && typeof n.props.onPress === 'function',
  )[0];
  await act(async () => { field.props.onPress(); });

  const dtp = tree.root.findAll((n) => n.type === 'DateTimePicker')[0];
  const wk = new Date();
  wk.setDate(wk.getDate() - 7);
  const pastDay = new Date(wk.getFullYear(), wk.getMonth(), wk.getDate()).getTime();
  await act(async () => { dtp.props.onChange({ type: 'set' }, new Date(pastDay)); });

  await pressLabel(tree, 'Import photos for this scan');
  await flush();

  expect(createProgressScanSession).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ capturedAt: pastDay }));
  const patch = upsertPhotoMeta.mock.calls[0][2];
  expect(patch.takenAt).toBe(pastDay);
});

test('a pro-to-free flip with the scan date sheet open blocks the import', async () => {
  mockAppAlert.mockImplementation(() => {});
  const tree = await render();
  await openImportScanDateStep(tree);
  await flush();

  // Tier lapses while the sheet is open.
  useAppStore.getState = () => ({ tier: 'free', user: { id: USER_ID } });

  await pressLabel(tree, 'Import photos for this scan');
  await flush();

  expect(createProgressScanSession).not.toHaveBeenCalled();
  expect(saveProgressPhoto).not.toHaveBeenCalled();
  expect(upsertPhotoMeta).not.toHaveBeenCalled();
});
