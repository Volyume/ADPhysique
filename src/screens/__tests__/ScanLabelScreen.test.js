/**
 * C8 (Wave A item 8, verified 2026-07-03): skipName() only set local step
 * state, so the "skip the name step" choice was forgotten between scans.
 * This suite pins the persisted-flag contract added in ScanLabelScreen.js:
 *
 *   - tapping "Skip name" writes @volyume_scan_skip_name = 'true'
 *     (AsyncStorage, following the existing '@volyume_*' key convention)
 *   - with that flag already set, a fresh mount opens straight on the
 *     nutrition step, no front-of-pack camera step first
 *   - the nutrition step's quiet "Add a name" link returns to the front
 *     step for that scan only, and never writes/clears the flag
 *
 * Full mount at the same native/store boundary the other camera+food
 * screens use (FoodSearchScreen.test.js, MealPlanScreen.test.js): vision
 * camera, NetInfo, safe-area, navigation focus, AsyncStorage and the OCR
 * helpers are mocked so the real component tree renders under the node
 * test environment; `buttons(tree)` finds by accessibilityRole + label,
 * matching MealPlanScreen.test.js's helper.
 */
import { create, act } from 'react-test-renderer';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (cb) => { const React = require('react'); React.useEffect(() => cb(), [cb]); },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })) },
}));
jest.mock('react-native-vision-camera', () => ({
  Camera: Object.assign((_props) => null, {
    getCameraPermissionStatus: jest.fn(() => 'granted'),
    requestCameraPermission: jest.fn(() => Promise.resolve('granted')),
  }),
  useCameraDevice: jest.fn(() => ({ id: 'back' })),
}));
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
// Button pulls in expo-haptics (native), unused on the granted-permission,
// OCR-available path these tests exercise; stub it like MealPlanScreen.test.js.
jest.mock('../../components/Button', () => () => null);

import AsyncStorage from '@react-native-async-storage/async-storage';
import ScanLabelScreen, { SKIP_NAME_KEY, getInitialStep, shouldOfferAddNameLink } from '../ScanLabelScreen';

const nav = { goBack: jest.fn(), replace: jest.fn() };

function buttons(tree) {
  return tree.root.findAll((n) => n.props.accessibilityRole === 'button'
    && typeof n.props.onPress === 'function');
}

function byLabel(tree, label) {
  return buttons(tree).find((b) => b.props.accessibilityLabel === label);
}

async function flush() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

async function mount() {
  let tree;
  await act(async () => { tree = create(<ScanLabelScreen navigation={nav} route={{ params: {} }} />); });
  await flush();
  return tree;
}

beforeEach(() => {
  jest.clearAllMocks();
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue(undefined);
});

describe('getInitialStep (pure)', () => {
  test('opens on nutrition only when the remembered flag is exactly "true"', () => {
    expect(getInitialStep('true')).toBe('nutrition');
    expect(getInitialStep(null)).toBe('front');
    expect(getInitialStep(undefined)).toBe('front');
    expect(getInitialStep('false')).toBe('front');
  });
});

describe('shouldOfferAddNameLink (pure)', () => {
  test('only offers the way back on the nutrition step, when remembered, and not mid-capture', () => {
    expect(shouldOfferAddNameLink({ step: 'nutrition', skipRemembered: true, busy: false })).toBe(true);
    expect(shouldOfferAddNameLink({ step: 'front', skipRemembered: true, busy: false })).toBe(false);
    expect(shouldOfferAddNameLink({ step: 'nutrition', skipRemembered: false, busy: false })).toBe(false);
    expect(shouldOfferAddNameLink({ step: 'nutrition', skipRemembered: true, busy: true })).toBe(false);
  });
});

describe('ScanLabelScreen skip-name persistence (C8)', () => {
  test('tapping "Skip name" persists the flag and moves to the nutrition step', async () => {
    const tree = await mount();

    expect(byLabel(tree, 'Skip name')).toBeTruthy();
    expect(byLabel(tree, 'Capture front of pack')).toBeTruthy();

    await act(async () => { byLabel(tree, 'Skip name').props.onPress(); });
    await flush();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(SKIP_NAME_KEY, 'true');
    // Now on the nutrition step: the front-only controls are gone, the
    // capture button relabels, and the quiet way back appears.
    expect(byLabel(tree, 'Skip name')).toBeFalsy();
    expect(byLabel(tree, 'Capture nutrition panel')).toBeTruthy();
    expect(byLabel(tree, 'Add a name')).toBeTruthy();
  });

  test('with the flag already set, a fresh mount opens straight on the nutrition step', async () => {
    AsyncStorage.getItem.mockImplementation((key) => (
      key === SKIP_NAME_KEY ? Promise.resolve('true') : Promise.resolve(null)
    ));
    const tree = await mount();

    expect(byLabel(tree, 'Capture nutrition panel')).toBeTruthy();
    expect(byLabel(tree, 'Capture front of pack')).toBeFalsy();
    expect(byLabel(tree, 'Skip name')).toBeFalsy();
    // The remembered flag caused this skip too, so the way back is offered.
    expect(byLabel(tree, 'Add a name')).toBeTruthy();
  });

  test('"Add a name" returns to the front step for this scan, without touching the flag', async () => {
    AsyncStorage.getItem.mockImplementation((key) => (
      key === SKIP_NAME_KEY ? Promise.resolve('true') : Promise.resolve(null)
    ));
    const tree = await mount();
    expect(byLabel(tree, 'Add a name')).toBeTruthy();

    await act(async () => { byLabel(tree, 'Add a name').props.onPress(); });
    await flush();

    expect(byLabel(tree, 'Capture front of pack')).toBeTruthy();
    expect(byLabel(tree, 'Skip name')).toBeTruthy();
    expect(byLabel(tree, 'Add a name')).toBeFalsy();
    // The flag is set-only: going back never writes/clears it.
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
