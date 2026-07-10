/**
 * EatenTimePicker (Ultimate-Audit item 15, D22 15b): the food-entry edit
 * sheet's optional "what time did you eat this" field. Mirrors
 * DiaryDatePicker.test.js exactly (same moduleNameMapper stub for
 * `@react-native-community/datetimepicker`, same platform split), since
 * EatenTimePicker is DiaryDatePicker's mode="time" sibling.
 *
 * Pins:
 *   - renders nothing when not visible;
 *   - Android: fires once, closes on both 'set' and 'dismissed', but only
 *     commits a change on 'set';
 *   - iOS: renders a spinner sheet that updates live and stays open until
 *     Done;
 *   - mode is "time" (not "date") -- the one real difference from
 *     DiaryDatePicker.
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

import EatenTimePicker from '../EatenTimePicker';

function picker(tree) {
  return tree.root.findAll((n) => n.type === 'DateTimePicker')[0] || null;
}

async function mount(props) {
  let tree;
  await act(async () => { tree = create(<EatenTimePicker {...props} />); });
  return tree;
}

const ORIGINAL_OS = Platform.OS;
afterEach(() => { Platform.OS = ORIGINAL_OS; });

function baseProps(overrides = {}) {
  return {
    visible: true,
    value: new Date(2026, 6, 10, 13, 30),
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

  test('mode is "time", not "date"', async () => {
    const tree = await mount(baseProps());
    expect(picker(tree).props.mode).toBe('time');
  });

  test('the picker is seeded with the given time', async () => {
    const tree = await mount(baseProps({ value: new Date(2026, 6, 10, 8, 5) }));
    const p = picker(tree);
    expect(p.props.value.getHours()).toBe(8);
    expect(p.props.value.getMinutes()).toBe(5);
  });

  test('choosing a time ("set") reports the chosen Date and closes', async () => {
    const props = baseProps();
    const tree = await mount(props);
    const p = picker(tree);

    const chosen = new Date(2026, 6, 10, 19, 45);
    await act(async () => { p.props.onChange({ type: 'set' }, chosen); });

    expect(props.onChange).toHaveBeenCalledWith(chosen);
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
    expect(p.props.mode).toBe('time');

    const chosen = new Date(2026, 6, 10, 21, 0);
    await act(async () => { p.props.onChange({ type: 'set' }, chosen); });

    // Live update: reported immediately, but the sheet is NOT auto-closed.
    expect(props.onChange).toHaveBeenCalledWith(chosen);
    expect(props.onClose).not.toHaveBeenCalled();

    const done = tree.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === 'Done choosing the time' && typeof n.props.onPress === 'function',
    )[0];
    expect(done).toBeTruthy();
    await act(async () => { done.props.onPress(); });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
