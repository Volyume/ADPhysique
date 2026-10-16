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
 *   - iOS: renders a spinner sheet that HOLDS the wheel's value and reports
 *     it once, on Done (food Diary audit 2026-10-16, item 5; it used to
 *     report every wheel change, which closed the picker mid-choice);
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

  // Food Diary audit 2026-10-16, item 5: the spinner reports on every wheel
  // movement and the caller closes the picker on each report, so the first
  // flick shut it. The wheel's value is held here and reported once, on Done.
  const doneOf = (tree) => tree.root.findAll(
    (n) => n.props && n.props.accessibilityLabel === 'Done choosing the time' && typeof n.props.onPress === 'function',
  )[0];

  test('a wheel change is held, not reported, and the sheet stays open', async () => {
    const props = baseProps();
    const tree = await mount(props);
    const p = picker(tree);
    expect(p).toBeTruthy();
    expect(p.props.display).toBe('spinner');
    expect(p.props.mode).toBe('time');

    await act(async () => { p.props.onChange({ type: 'set' }, new Date(2026, 6, 10, 21, 0)); });
    await act(async () => { picker(tree).props.onChange({ type: 'set' }, new Date(2026, 6, 10, 21, 15)); });

    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    // The wheel shows what is being chosen.
    expect(picker(tree).props.value.getMinutes()).toBe(15);
  });

  test('Done reports the last wheel value once, then closes', async () => {
    const props = baseProps();
    const tree = await mount(props);
    await act(async () => { picker(tree).props.onChange({ type: 'set' }, new Date(2026, 6, 10, 21, 0)); });
    const chosen = new Date(2026, 6, 10, 21, 15);
    await act(async () => { picker(tree).props.onChange({ type: 'set' }, chosen); });
    await act(async () => { doneOf(tree).props.onPress(); });
    expect(props.onChange).toHaveBeenCalledTimes(1);
    expect(props.onChange).toHaveBeenCalledWith(chosen);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('Done with the wheel untouched closes without a change', async () => {
    const props = baseProps();
    const tree = await mount(props);
    await act(async () => { doneOf(tree).props.onPress(); });
    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('closing the sheet (back gesture) never reports the held value', async () => {
    const props = baseProps();
    const tree = await mount(props);
    await act(async () => { picker(tree).props.onChange({ type: 'set' }, new Date(2026, 6, 10, 21, 0)); });
    const modal = tree.root.findAll((n) => typeof n.props?.onRequestClose === 'function')[0];
    await act(async () => { modal.props.onRequestClose(); });
    expect(props.onChange).not.toHaveBeenCalled();
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('the spinner follows the app theme, not the phone (themeVariant)', async () => {
    const tree = await mount(baseProps());
    expect(['dark', 'light']).toContain(picker(tree).props.themeVariant);
  });
});
