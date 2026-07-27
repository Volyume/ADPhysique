/**
 * TextField.numericAccessory.test.js
 *
 * Pins A1 (pre-release sweep 2026-07-27, LANE A -- "Centralise the numeric
 * Done bar in TextField", RULED: DO IT): iOS number-pad/decimal-pad
 * keyboards have no Return key, so ~30 numeric fields app-wide had no way
 * to dismiss the keyboard. TextField now auto-renders SetEntry.js's
 * InputAccessoryView "Done" bar whenever keyboardType is number-pad or
 * decimal-pad, iOS only -- Android has its own back gesture and must render
 * byte-for-byte unchanged, per the ruling.
 *
 * Also pins the `noAccessory` opt-out for a caller that already supplies
 * its own bar, so a field never gets two.
 */
import { create, act } from 'react-test-renderer';
import { Platform, InputAccessoryView, TextInput } from 'react-native';

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as SetEntry.test.js does (the Done bar's tap fires haptics.selection()).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import TextField from '../TextField';

const ORIGINAL_OS = Platform.OS;
afterAll(() => { Platform.OS = ORIGINAL_OS; });

describe('TextField numeric Done bar (A1)', () => {
  test('iOS + number-pad renders an InputAccessoryView Done bar wired to the input', () => {
    Platform.OS = 'ios';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Reps" value="" onChangeText={() => {}} keyboardType="number-pad" />,
      );
    });
    const accessories = tree.root.findAllByType(InputAccessoryView);
    expect(accessories.length).toBe(1);
    const input = tree.root.findByType(TextInput);
    expect(input.props.inputAccessoryViewID).toBe(accessories[0].props.nativeID);
  });

  test('iOS + decimal-pad also renders the Done bar', () => {
    Platform.OS = 'ios';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Weight" value="" onChangeText={() => {}} keyboardType="decimal-pad" />,
      );
    });
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(1);
  });

  test('Android + number-pad renders NO accessory and the input carries no inputAccessoryViewID -- byte-for-byte unchanged', () => {
    Platform.OS = 'android';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Reps" value="" onChangeText={() => {}} keyboardType="number-pad" />,
      );
    });
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(0);
    const input = tree.root.findByType(TextInput);
    expect(input.props.inputAccessoryViewID).toBeUndefined();
  });

  test('Android + decimal-pad also renders no accessory', () => {
    Platform.OS = 'android';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Weight" value="" onChangeText={() => {}} keyboardType="decimal-pad" />,
      );
    });
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(0);
  });

  test('a non-numeric keyboard (e.g. text default) never gets the bar, even on iOS', () => {
    Platform.OS = 'ios';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Name" value="" onChangeText={() => {}} />,
      );
    });
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(0);
  });

  test('noAccessory opts a caller with its own bar out, even on iOS with a numeric keyboard', () => {
    Platform.OS = 'ios';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Weight" value="" onChangeText={() => {}} keyboardType="decimal-pad" noAccessory />,
      );
    });
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(0);
    const input = tree.root.findByType(TextInput);
    expect(input.props.inputAccessoryViewID).toBeUndefined();
  });

  test('tapping Done dismisses the keyboard', () => {
    Platform.OS = 'ios';
    const { Keyboard } = require('react-native');
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    let tree;
    act(() => {
      tree = create(
        <TextField label="Reps" value="" onChangeText={() => {}} keyboardType="number-pad" />,
      );
    });
    const doneBtn = tree.root.findByProps({ accessibilityLabel: 'Done, close keyboard' });
    act(() => doneBtn.props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });
});

describe('TextField numeric Done bar "Next" affordance (A4)', () => {
  // A4 (pre-release sweep 2026-07-27): iOS number-pad/decimal-pad keyboards
  // have no Return key, so a numeric sibling chain (feet -> inches,
  // MEV -> MAV -> MRV, ...) has no native returnKeyType/onSubmitEditing way
  // to advance focus (that dead-prop pattern was removed at A3). A caller
  // that wires onAccessoryNext gets a leading "Next" button sharing the same
  // bar; every existing caller omits it, so A1's contract above stays
  // byte-for-byte unchanged.
  test('onAccessoryNext adds a Next button that calls it, alongside the unchanged Done button', () => {
    Platform.OS = 'ios';
    const onNext = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <TextField label="Feet" value="" onChangeText={() => {}} keyboardType="number-pad" onAccessoryNext={onNext} />,
      );
    });
    // Still exactly one accessory bar (A1's contract is unaffected).
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(1);

    const nextBtn = tree.root.findByProps({ accessibilityLabel: 'Next field' });
    act(() => nextBtn.props.onPress());
    expect(onNext).toHaveBeenCalledTimes(1);

    // Done is still there and still dismisses, unaffected by Next existing.
    const { Keyboard } = require('react-native');
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    const doneBtn = tree.root.findByProps({ accessibilityLabel: 'Done, close keyboard' });
    act(() => doneBtn.props.onPress());
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });

  test('without onAccessoryNext there is no Next button (every pre-existing caller)', () => {
    Platform.OS = 'ios';
    let tree;
    act(() => {
      tree = create(
        <TextField label="Reps" value="" onChangeText={() => {}} keyboardType="number-pad" />,
      );
    });
    expect(tree.root.findAll((n) => n.props && n.props.accessibilityLabel === 'Next field').length).toBe(0);
  });

  test('onAccessoryNext on Android renders no accessory at all (Android is unchanged, per A1)', () => {
    Platform.OS = 'android';
    const onNext = jest.fn();
    let tree;
    act(() => {
      tree = create(
        <TextField label="Feet" value="" onChangeText={() => {}} keyboardType="number-pad" onAccessoryNext={onNext} />,
      );
    });
    expect(tree.root.findAllByType(InputAccessoryView).length).toBe(0);
  });
});
