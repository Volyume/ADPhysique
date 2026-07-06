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

async function chooseLibraryOnAdd(tree) {
  await pressLabel(tree, 'Add progress photos');
  await flush();
  await pressLabel(tree, 'Choose from photos');
}

beforeEach(() => jest.clearAllMocks());

test('add progress photos sheet keeps Physique Scan as a separate main action', async () => {
  mockAppAlert.mockImplementation(() => {});
  const tree = await render();
  await pressLabel(tree, 'Add progress photos');

  expect(mockAppAlert).not.toHaveBeenCalled();
  const copy = allTexts(tree).join(' ');
  expect(copy).toContain('Add progress photos');
  expect(copy).toContain('Choose how to add progress photos. Use Physique Scan from the main screen when you want the guided scan.');
  expect(copy).toContain('Guided single photo');
  expect(copy).toContain('Take a quick photo');
  expect(copy).toContain('Import from photos');
  expect(copy).toContain('Set the real capture date');
  expect(copy).toContain('Photos are stored on this phone unless you share or export them.');
  expect(copy).toContain('Export anything you want to keep before uninstalling the app');
  expect(copy).not.toContain('Front relaxed');
  expect(copy).not.toContain('Back relaxed');
  expect(hasPressableLabel(tree, 'Open guided photo camera')).toBe(true);
  expect(hasPressableLabel(tree, 'Take photo')).toBe(true);
  expect(hasPressableLabel(tree, 'Choose from photos')).toBe(true);
});

test('picking an image opens the details step and does NOT save before confirm', async () => {
  const tree = await render();
  await chooseLibraryOnAdd(tree);
  await flush();
  // Details sheet is up (its Save button exists); nothing saved yet.
  const save = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityLabel === 'Save the progress photo');
  expect(save.length).toBeGreaterThan(0);
  expect(saveProgressPhoto).not.toHaveBeenCalled();
  expect(upsertPhotoMeta).not.toHaveBeenCalled();
});

test('confirming with the default date saves then snapshots weight for today', async () => {
  const tree = await render();
  await chooseLibraryOnAdd(tree);
  await flush();

  await pressLabel(tree, 'Save the progress photo');
  await flush();

  expect(saveProgressPhoto).toHaveBeenCalledWith('file:///picked.jpg', undefined, USER_ID);
  expect(upsertPhotoMeta).toHaveBeenCalledTimes(1);
  const [uid, name, patch] = upsertPhotoMeta.mock.calls[0];
  expect(uid).toBe(USER_ID);
  expect(name).toBe('1700000000000.jpg');
  expect(patch.pose).toBeNull();
  // Today by default.
  const startOfToday = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); })();
  expect(patch.takenAt).toBeGreaterThanOrEqual(startOfToday);
});

test('setting the date to the past indexes the photo under that past day (the founder scenario)', async () => {
  const tree = await render();
  await chooseLibraryOnAdd(tree);
  await flush();

  // Open the picker in the details sheet and choose a week ago.
  const field = tree.root.findAll(
    (n) => typeof n.props?.accessibilityLabel === 'string'
      && n.props.accessibilityLabel.startsWith('Change the date')
      && typeof n.props.onPress === 'function',
  )[0];
  await act(async () => { field.props.onPress(); });

  const dtp = tree.root.findAll((n) => n.type === 'DateTimePicker')[0];
  const wk = new Date();
  wk.setDate(wk.getDate() - 7);
  const pastDay = new Date(wk.getFullYear(), wk.getMonth(), wk.getDate()).getTime();
  await act(async () => { dtp.props.onChange({ type: 'set' }, new Date(pastDay)); });

  await pressLabel(tree, 'Save the progress photo');
  await flush();

  expect(saveProgressPhoto).toHaveBeenCalledWith('file:///picked.jpg', undefined, USER_ID);
  const patch = upsertPhotoMeta.mock.calls[0][2];
  expect(patch.takenAt).toBe(pastDay);
});

test('a pro-to-free flip with the details sheet open blocks the save (live-tier re-check)', async () => {
  const tree = await render();
  await chooseLibraryOnAdd(tree);
  await flush();

  // Tier lapses while the sheet is open.
  useAppStore.getState = () => ({ tier: 'free', user: { id: USER_ID } });

  await pressLabel(tree, 'Save the progress photo');
  await flush();

  expect(saveProgressPhoto).not.toHaveBeenCalled();
  expect(upsertPhotoMeta).not.toHaveBeenCalled();
});
