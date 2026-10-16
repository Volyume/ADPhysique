/**
 * ScanLabelScreen: a failed capture is never silent (D230 R18, food level-up
 * 2026-10-16). When the shutter or the on-device read threw, the screen routed
 * on (the name step advances with no name; the panel step opens the form for
 * typing, so the person is never stuck) but said and kept nothing: the cause
 * was dropped. It now logs the cause and the step with logError first, and
 * still routes on exactly as before. Also pins the new title, "Scan the
 * label" (it was "Snap label"), and the heading role on the arrival card.
 *
 * Full mount at the same boundary as ScanLabelScreen.test.js, with a camera
 * mock that exposes a takePhoto the test can make fail.
 */
import { create, act } from 'react-test-renderer';

const mockTakePhoto = jest.fn();

jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: ({ children }) => children }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })) },
}));
jest.mock('react-native-vision-camera', () => {
  const React = require('react');
  const Camera = React.forwardRef((_props, ref) => {
    React.useImperativeHandle(ref, () => ({ takePhoto: (...args) => mockTakePhoto(...args) }));
    return null;
  });
  Camera.getCameraPermissionStatus = jest.fn(() => 'granted');
  Camera.requestCameraPermission = jest.fn(() => Promise.resolve('granted'));
  return { Camera, useCameraDevice: jest.fn(() => ({ id: 'back' })) };
});
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../lib/food/ocr', () => ({
  isOcrConfigured: jest.fn(() => true),
  recogniseText: jest.fn(() => Promise.resolve('')),
  recogniseBlocks: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../../lib/food/ocrParser', () => ({ parseNutritionLabel: jest.fn(() => null) }));
jest.mock('../../lib/food/labelName', () => ({ pickProductName: jest.fn(() => null) }));
jest.mock('../../components/Button', () => () => null);
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn() }));

import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScanLabelScreen, { SKIP_NAME_KEY } from '../ScanLabelScreen';
import { logError } from '../../lib/errorLog';

const nav = { goBack: jest.fn(), replace: jest.fn() };

function byLabel(tree, label) {
  return tree.root.findAll((n) => n.props.accessibilityRole === 'button'
    && typeof n.props.onPress === 'function'
    && n.props.accessibilityLabel === label)[0];
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

async function mount(params = {}) {
  let tree;
  await act(async () => { tree = create(<ScanLabelScreen navigation={nav} route={{ params }} />); });
  await flush();
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue(undefined);
  mockTakePhoto.mockRejectedValue(new Error('camera busy'));
});

describe('ScanLabelScreen capture failure (R18)', () => {
  test('on the front step the failure is logged with its step, and the scan moves on to the panel', async () => {
    const tree = await mount();
    await act(async () => { await byLabel(tree, 'Capture front of pack').props.onPress(); });
    await flush();

    expect(logError).toHaveBeenCalledWith('ScanLabel.capture', expect.any(Error), { step: 'front', hadBarcode: false });
    expect(byLabel(tree, 'Capture nutrition panel')).toBeTruthy();
    expect(nav.replace).not.toHaveBeenCalled();
  });

  test('on the panel step the failure is logged and the form opens to type into', async () => {
    AsyncStorage.getItem.mockImplementation((key) => (key === SKIP_NAME_KEY ? Promise.resolve('true') : Promise.resolve(null)));
    const tree = await mount({ mealSlot: 'lunch', entryDate: '2026-10-16', prefillBarcode: '5000000000017' });
    await act(async () => { await byLabel(tree, 'Capture nutrition panel').props.onPress(); });
    await flush();

    expect(logError).toHaveBeenCalledWith('ScanLabel.capture', expect.any(Error), { step: 'nutrition', hadBarcode: true });
    expect(nav.replace).toHaveBeenCalledWith('AddCustomFood', expect.objectContaining({
      mealSlot: 'lunch', entryDate: '2026-10-16', prefillBarcode: '5000000000017',
    }));
  });

  test('the log context carries a step and a flag, never a barcode or a food', async () => {
    const tree = await mount({ prefillBarcode: '5000000000017' });
    await act(async () => { await byLabel(tree, 'Capture front of pack').props.onPress(); });
    await flush();
    const ctx = logError.mock.calls.find((c) => c[0] === 'ScanLabel.capture')[2];
    expect(Object.keys(ctx).sort()).toEqual(['hadBarcode', 'step']);
  });

  test('a failed connectivity check on a barcode miss is logged, and the arrival choice still shows', async () => {
    NetInfo.fetch.mockRejectedValueOnce(new Error('netinfo down'));
    const tree = await mount({ prefillBarcode: '5000000000017' });
    expect(logError).toHaveBeenCalledWith('ScanLabel.netInfo', expect.any(Error));
    expect(JSON.stringify(tree.toJSON())).toContain('Not in the food library yet');
  });
});

describe('ScanLabelScreen words (R15, R16)', () => {
  test('the header reads "Scan the label"', async () => {
    const tree = await mount();
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Scan the label');
    expect(text).not.toContain('Snap label');
  });

  test('the arrival card\'s title is a heading, and the offline line is a full sentence', async () => {
    NetInfo.fetch.mockResolvedValueOnce({ isConnected: false, isInternetReachable: false });
    const tree = await mount({ prefillBarcode: '5000000000017' });
    const heading = tree.root.findAll((n) => n.props?.accessibilityRole === 'header');
    expect(heading.map((n) => n.props.children)).toContain('The full food library could not be checked');
  });
});
