/**
 * DiaryDatePicker (NAV-3, elite audit 2026-07-04): the diary's date-jump,
 * opened by tapping the date label on DiaryScreen's day pager. Wraps the
 * real `@react-native-community/datetimepicker`, the same one already wired
 * into the progress-photo flows via PhotoDatePicker — no new dependency.
 *
 * Pins:
 *   - renders nothing when not visible;
 *   - reports the chosen day as a LOCAL day-key (YYYY-MM-DD), matching
 *     DiaryScreen's selectedDate/isoDate contract;
 *   - Android: fires once, closes on both 'set' and 'dismissed', but only
 *     commits a change on 'set';
 *   - iOS: renders a spinner sheet that updates live and stays open until
 *     Done, matching PhotoDatePicker's platform split;
 *   - unlike PhotoDatePicker (PAST-only), this picker carries NO
 *     minimumDate/maximumDate — the diary already allows jumping into the
 *     future via the (unbounded) forward chevron, so the date-jump must not
 *     newly restrict that.
 *
 * The native picker is stubbed via moduleNameMapper to a locatable host
 * element carrying its props (same convention as PhotoDetailsSheet.test.js),
 * so onChange/value are driven directly here.
 */
import { create, act } from 'react-test-renderer';
import { Platform } from 'react-native';

jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ accessibility: { reduceMotion: false } }),
}));

// Button (used for the iOS sheet's Done action) transitively pulls
// expo-haptics, a native module.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import DiaryDatePicker from '../DiaryDatePicker';

function picker(tree) {
  return tree.root.findAll((n) => n.type === 'DateTimePicker')[0] || null;
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<DiaryDatePicker {...props} />); });
  return tree;
}

const ORIGINAL_OS = Platform.OS;
afterEach(() => { Platform.OS = ORIGINAL_OS; });

function baseProps(overrides = {}) {
  return {
    visible: true,
    valueIso: '2026-06-15',
    onChange: jest.fn(),
    onClose: jest.fn(),
    ...overrides,
  };
}

test('renders nothing when not visible', async () => {
  const tree = await mount(baseProps({ visible: false }));
  expect(tree.toJSON()).toBeNull();
});

describe('Android (native modal dialog)', () => {
  beforeEach(() => { Platform.OS = 'android'; });

  test('the picker is seeded with the given LOCAL day, at local midnight', async () => {
    const tree = await mount(baseProps({ valueIso: '2026-06-15' }));
    const p = picker(tree);
    expect(p).toBeTruthy();
    expect(p.props.value.getFullYear()).toBe(2026);
    expect(p.props.value.getMonth()).toBe(5); // June, 0-indexed
    expect(p.props.value.getDate()).toBe(15);
  });

  test('carries no maximumDate/minimumDate: the diary allows jumping into the future too', async () => {
    const tree = await mount(baseProps());
    const p = picker(tree);
    expect(p.props.maximumDate).toBeUndefined();
    expect(p.props.minimumDate).toBeUndefined();
  });

  test('choosing a date ("set") reports the new LOCAL day-key and closes', async () => {
    const props = baseProps();
    const tree = await mount(props);
    const p = picker(tree);

    const chosen = new Date(2026, 6, 1); // 1 Jul 2026
    await act(async () => { p.props.onChange({ type: 'set' }, chosen); });

    expect(props.onChange).toHaveBeenCalledWith('2026-07-01');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('dismissing ("dismissed") closes without reporting any change', async () => {
    const props = baseProps();
    const tree = await mount(props);
    const p = picker(tree);

    await act(async () => { p.props.onChange({ type: 'dismissed' }, undefined); });

    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('iOS (inline spinner sheet)', () => {
  beforeEach(() => { Platform.OS = 'ios'; });

  test('renders a Done button and the spinner stays open across a live change', async () => {
    const props = baseProps();
    const tree = await mount(props);
    const p = picker(tree);
    expect(p).toBeTruthy();
    expect(p.props.display).toBe('spinner');

    const chosen = new Date(2026, 11, 25); // 25 Dec 2026
    await act(async () => { p.props.onChange({ type: 'set' }, chosen); });

    // Live update: reported immediately, but the sheet is NOT auto-closed.
    expect(props.onChange).toHaveBeenCalledWith('2026-12-25');
    expect(props.onClose).not.toHaveBeenCalled();

    const done = tree.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === 'Done choosing the date' && typeof n.props.onPress === 'function',
    )[0];
    expect(done).toBeTruthy();
    await act(async () => { done.props.onPress(); });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('carries no maximumDate/minimumDate on iOS either', async () => {
    const tree = await mount(baseProps());
    const p = picker(tree);
    expect(p.props.maximumDate).toBeUndefined();
    expect(p.props.minimumDate).toBeUndefined();
  });
});
