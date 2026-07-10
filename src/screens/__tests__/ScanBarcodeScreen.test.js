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
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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

jest.mock('../../lib/haptics', () => ({ planReady: jest.fn(), selection: jest.fn() }));
jest.mock('../../lib/observability', () => ({ audit: jest.fn() }));
jest.mock('../../lib/errorLog', () => ({ logError: jest.fn(), logInfo: jest.fn() }));
jest.mock('../../components/Toast', () => ({ useToast: () => ({ show: mockToastShow }) }));
jest.mock('../../lib/food/waterfall', () => ({ resolveBarcode: jest.fn() }));

import useAppStore from '../../store/useAppStore';
import { resolveBarcode } from '../../lib/food/waterfall';
import { selection as hapticSelection } from '../../lib/haptics';
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

// L05-SB2 (2026-07-09 design audit): manual barcode-number entry. A damaged
// or curved barcode the camera can't read still has a printed number under
// it; this affordance must feed the typed value into the exact same
// resolveBarcode() waterfall a camera detection uses, with the same
// hit/miss routing.
describe('ScanBarcodeScreen manual barcode-number entry (L05-SB2)', () => {
  function openManualSheet(tree) {
    const link = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && n.props.accessibilityLabel === 'Enter barcode number'
      && typeof n.props.onPress === 'function')[0];
    act(() => { link.props.onPress(); });
  }

  function typeManual(tree, value) {
    const input = tree.root.findAll((n) => n.props.accessibilityLabel === 'Barcode number'
      && typeof n.props.onChangeText === 'function')[0];
    act(() => { input.props.onChangeText(value); });
  }

  function submitManualSheet(tree) {
    const submit = tree.root.findAll((n) => n.props.accessibilityLabel === 'Look up barcode number'
      && typeof n.props.onPress === 'function')[0];
    act(() => { submit.props.onPress(); });
  }

  test('the affordance is offered on the live scanning view', async () => {
    const tree = await mount(makeNav());

    const link = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && n.props.accessibilityLabel === 'Enter barcode number');
    expect(link.length).toBeGreaterThan(0);
  });

  test('a typed barcode resolves through resolveBarcode and routes to FoodSearch on a hit, exactly as a camera scan would', async () => {
    const food = { food_ref: 'off:789', source: 'off', name: 'Manual food' };
    resolveBarcode.mockResolvedValue(food);
    const nav = makeNav();
    const tree = await mount(nav, { params: { mealSlot: 'lunch', entryDate: '2026-07-09' } });

    openManualSheet(tree);
    typeManual(tree, '5000112637922');
    submitManualSheet(tree);
    await flush();

    expect(resolveBarcode).toHaveBeenCalledWith('5000112637922', 'u1');
    expect(nav.replace).toHaveBeenCalledWith('FoodSearch', {
      mealSlot: 'lunch', entryDate: '2026-07-09', scannedFood: food,
    });
  });

  test('a typed barcode with no match routes to ScanLabel with the barcode prefilled, same as a camera miss', async () => {
    resolveBarcode.mockResolvedValue(null);
    const nav = makeNav();
    const tree = await mount(nav, { params: { mealSlot: 'snack', entryDate: '2026-07-09' } });

    openManualSheet(tree);
    typeManual(tree, '9999999999999');
    submitManualSheet(tree);
    await flush();

    expect(nav.replace).toHaveBeenCalledWith('ScanLabel', {
      mealSlot: 'snack', entryDate: '2026-07-09', prefillBarcode: '9999999999999',
    });
  });

  test('non-digit characters are stripped as they are typed', async () => {
    const tree = await mount(makeNav());

    openManualSheet(tree);
    typeManual(tree, '500-011a26379bb22');

    const input = tree.root.findAll((n) => n.props.accessibilityLabel === 'Barcode number'
      && typeof n.props.onChangeText === 'function')[0];
    expect(input.props.value).toBe('5000112637922');
  });

  test('a value outside 8 to 14 digits is refused with no lookup call', async () => {
    const nav = makeNav();
    const tree = await mount(nav);

    openManualSheet(tree);
    typeManual(tree, '123');
    submitManualSheet(tree);
    await flush();

    expect(resolveBarcode).not.toHaveBeenCalled();
    expect(nav.replace).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('8 to 14 digits');
  });
});

// Item 16 / D26 (2026-07-10, MLKit code-scanner pass): `codeScanner` fed to
// vision-camera's `useCodeScanner` is already the native MLKit-backed
// detector on Android (app.json's `enableCodeScanner: true` bundles the
// Google ML Kit barcode dependency -- see the ScanBarcodeScreen.js header
// comment). These tests pin what item 16 actually needed pinning: the
// symbology set is unchanged (code-128 stays -- it's a marketed capability,
// not an oversight), the existing scan-lock still swallows a second
// detection while the first is resolving, the camera still pauses while the
// manual-entry sheet is open, and the torch toggle now carries the app's
// haptics.selection() vocabulary and only that surface does.
describe('ScanBarcodeScreen item 16 / D26 (MLKit scanner pass)', () => {
  test('codeTypes is the retail set plus code-128 for weighed-deli labels, unchanged by item 16', async () => {
    await mount(makeNav());

    expect(capturedScanner.codeTypes).toEqual(['ean-13', 'ean-8', 'upc-a', 'upc-e', 'code-128']);
  });

  test('a second code detected while the first is still resolving does not trigger a second lookup', async () => {
    let resolveLookup;
    resolveBarcode.mockReturnValue(new Promise((res) => { resolveLookup = res; }));
    const nav = makeNav();
    await mount(nav);

    await act(async () => {
      capturedScanner.onCodeScanned([{ value: '5000112637922', type: 'ean-13' }]);
    });
    // A second frame detection arrives before the first lookup settles
    // (the same code re-read, or a different code drifting into frame) --
    // the scan lock must swallow it, not start a second lookup.
    await act(async () => {
      capturedScanner.onCodeScanned([{ value: '9999999999999', type: 'ean-13' }]);
    });

    expect(resolveBarcode).toHaveBeenCalledTimes(1);
    expect(resolveBarcode).toHaveBeenCalledWith('5000112637922', 'u1');

    await act(async () => { resolveLookup({ food_ref: 'off:1', source: 'off', name: 'X' }); });
    await flush();

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith('FoodSearch', expect.objectContaining({
      scannedFood: expect.objectContaining({ food_ref: 'off:1' }),
    }));
  });

  test('the camera pauses (isActive false) while the manual-entry sheet is open, so nothing can scan underneath it', async () => {
    const tree = await mount(makeNav());

    const cameraBefore = tree.root.findAll((n) => n.props.codeScanner !== undefined)[0];
    expect(cameraBefore.props.isActive).toBe(true);

    const link = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && n.props.accessibilityLabel === 'Enter barcode number'
      && typeof n.props.onPress === 'function')[0];
    act(() => { link.props.onPress(); });

    const cameraAfter = tree.root.findAll((n) => n.props.codeScanner !== undefined)[0];
    expect(cameraAfter.props.isActive).toBe(false);
  });

  test('the torch toggle exists and fires haptics.selection() on press, nothing else does on mount', async () => {
    const tree = await mount(makeNav());

    expect(hapticSelection).not.toHaveBeenCalled();

    const torch = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && (n.props.accessibilityLabel === 'Torch off' || n.props.accessibilityLabel === 'Torch on')
      && typeof n.props.onPress === 'function')[0];
    expect(torch).toBeTruthy();

    act(() => { torch.props.onPress(); });

    expect(hapticSelection).toHaveBeenCalledTimes(1);
  });

  test('haptics.selection() does not fire on a scan hit or a scan miss', async () => {
    resolveBarcode.mockResolvedValue(null);
    await mount(makeNav());

    await scan('9999999999999');

    expect(hapticSelection).not.toHaveBeenCalled();
  });

  test('haptics.selection() does not fire when opening the manual-entry sheet', async () => {
    const tree = await mount(makeNav());

    const link = tree.root.findAll((n) => n.props.accessibilityRole === 'button'
      && n.props.accessibilityLabel === 'Enter barcode number'
      && typeof n.props.onPress === 'function')[0];
    act(() => { link.props.onPress(); });

    expect(hapticSelection).not.toHaveBeenCalled();
  });
});
