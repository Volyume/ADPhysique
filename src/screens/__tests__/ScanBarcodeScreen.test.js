/**
 * ST-2 (whole-app failure register, 2026-07-04): a barcode scan that fails on
 * lookup/network error failed SILENTLY, catch logged the error, cleared the
 * scan lock and reset `resolving`, but showed the user nothing. The camera
 * just went back to "Point at a barcode" with no way to tell a miss (handled
 * fine already, routes to ScanLabel with the barcode prefilled) from a lookup
 * that never got an answer.
 *
 * This suite pins the fix in ScanBarcodeScreen.js's onCodeScanned catch:
 *   - resolveBarcode() throwing shows a calm error toast and resets the
 *     scanner (scanLock cleared, resolving cleared), same as before
 *   - the toast wording distinguishes "you're offline" (NetInfo reports not
 *     connected/reachable) from a generic "couldn't reach the food database"
 *     when the connectivity check itself says the device is online
 *   - the existing happy paths (hit -> FoodSearch, miss -> ScanLabel) are
 *     untouched: resolveBarcode resolving (even to null) never shows a toast
 *
 * Mounted at the same native/store boundary as ScanLabelScreen.test.js:
 * vision-camera, NetInfo, safe-area and navigation focus are mocked so the
 * real component tree renders under the node test environment.
 * useCodeScanner is captured so the test can call onCodeScanned directly,
 * exactly as a real camera frame detection would.
 */
import { create, act } from 'react-test-renderer';

const mockToastShow = jest.fn();

jest.mock('../../store/useAppStore', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (fn) => fn }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));

const mockNetInfoFetch = jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true }));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: (...args) => mockNetInfoFetch(...args) },
}));

let capturedScanner = null;
jest.mock('react-native-vision-camera', () => ({
  Camera: Object.assign((_props) => null, {
    getCameraPermissionStatus: jest.fn(() => 'granted'),
    requestCameraPermission: jest.fn(() => Promise.resolve('granted')),
  }),
  useCameraDevice: jest.fn(() => ({ id: 'back' })),
  useCodeScanner: jest.fn((cfg) => { capturedScanner = cfg; return cfg; }),
}));

jest.mock('../../lib/haptics', () => ({ planReady: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/food/waterfall', () => ({ resolveBarcode: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import { resolveBarcode } from '../../lib/food/waterfall';
import ScanBarcodeScreen from '../ScanBarcodeScreen';

const store = { user: { id: 'u1' } };

function makeNav() {
  return { navigate: jest.fn(), goBack: jest.fn(), replace: jest.fn() };
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

async function mount(nav, route = { params: {} }) {
  let tree;
  await act(async () => { tree = create(<ScanBarcodeScreen navigation={nav} route={route} />); });
  await flush();
  return tree;
}

async function scan(value = '5000112637922') {
  await act(async () => {
    await capturedScanner.onCodeScanned([{ value, type: 'ean-13' }]);
  });
  await flush();
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedScanner = null;
  useAppStore.mockImplementation((selector) => selector(store));
  mockNetInfoFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true });
});

describe('ScanBarcodeScreen lookup failure (ST-2)', () => {
  test('live camera close button is labelled', async () => {
    const nav = makeNav();
    const tree = await mount(nav);

    const close = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && n.props.accessibilityLabel === 'Close'
      && typeof n.props.onPress === 'function');
    expect(close.length).toBeGreaterThan(0);
  });

  test('a thrown lookup shows a "couldn\'t reach" error toast and resets the scanner while online', async () => {
    resolveBarcode.mockRejectedValue(new Error('boom'));
    const nav = makeNav();
    const tree = await mount(nav);

    await scan();

    expect(mockToastShow).toHaveBeenCalledWith(
      "Couldn't reach the food database. Try again.",
      expect.objectContaining({ variant: 'error' }),
    );
    expect(nav.replace).not.toHaveBeenCalled();
    // Camera resets: the "Looking it up" badge only shows while resolving.
    expect(JSON.stringify(tree.toJSON())).not.toContain('Looking it up');
  });

  test('a thrown lookup while offline shows a distinct "you\'re offline" toast', async () => {
    resolveBarcode.mockRejectedValue(new Error('Network request failed'));
    mockNetInfoFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false });
    const nav = makeNav();
    await mount(nav);

    await scan();

    expect(mockToastShow).toHaveBeenCalledWith(
      "You're offline. Check your connection and try again.",
      expect.objectContaining({ variant: 'error' }),
    );
  });

  test('a genuine miss (resolveBarcode resolves to null) routes to ScanLabel and shows no toast', async () => {
    resolveBarcode.mockResolvedValue(null);
    const nav = makeNav();
    await mount(nav, { params: { mealSlot: 'snack', entryDate: '2026-07-04' } });

    await scan('9999999999999');

    expect(nav.replace).toHaveBeenCalledWith('ScanLabel', {
      mealSlot: 'snack', entryDate: '2026-07-04', prefillBarcode: '9999999999999',
    });
    expect(mockToastShow).not.toHaveBeenCalled();
  });

  test('a hit routes to FoodSearch and shows no toast', async () => {
    const food = { food_ref: 'off:123', source: 'off', name: 'Test food' };
    resolveBarcode.mockResolvedValue(food);
    const nav = makeNav();
    await mount(nav, { params: { mealSlot: 'breakfast', entryDate: '2026-07-04' } });

    await scan('1111111111111');

    expect(nav.replace).toHaveBeenCalledWith('FoodSearch', {
      mealSlot: 'breakfast', entryDate: '2026-07-04', scannedFood: food,
    });
    expect(mockToastShow).not.toHaveBeenCalled();
  });
});
