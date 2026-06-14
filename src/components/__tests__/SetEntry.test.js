/**
 * Invariant tests for SetEntry's keyboard-completes-the-set behaviour
 * (ULTIMATE-WR-1): the reps field's Done key logs the set directly when a
 * handler is supplied, and stays non-breaking (dismiss only) when it is not.
 */
import { create, act } from 'react-test-renderer';
import { Keyboard } from 'react-native';

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the mount suites do (screen-mount.test.js).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import SetEntry from '../SetEntry';

const VALUE = { weight: 60, reps: 8, isGhost: false };

function repsInput(tree) {
  return tree.root.findByProps({ testID: 'volyume-reps-input' });
}
function weightInput(tree) {
  return tree.root.findByProps({ testID: 'volyume-weight-input' });
}

describe('SetEntry — keyboard-completes-the-set', () => {
  test('reps Done key calls onSubmitComplete when provided', () => {
    const onSubmitComplete = jest.fn();
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    let tree;
    act(() => {
      tree = create(<SetEntry value={VALUE} onChange={() => {}} onSubmitComplete={onSubmitComplete} />);
    });
    act(() => repsInput(tree).props.onSubmitEditing());
    expect(onSubmitComplete).toHaveBeenCalledTimes(1);
    // When a handler logs the set, it owns dismissal; we do not also call it.
    expect(dismiss).not.toHaveBeenCalled();
    dismiss.mockRestore();
  });

  test('reps Done key falls back to dismissing the keyboard when no handler is supplied', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    let tree;
    act(() => {
      tree = create(<SetEntry value={VALUE} onChange={() => {}} />);
    });
    // Must not throw for call sites that do not wire the new prop.
    expect(() => act(() => repsInput(tree).props.onSubmitEditing())).not.toThrow();
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });

  test('field contract: reps completes (Done), weight still chains forward (next)', () => {
    let tree;
    act(() => {
      tree = create(<SetEntry value={VALUE} onChange={() => {}} onSubmitComplete={() => {}} />);
    });
    expect(repsInput(tree).props.returnKeyType).toBe('done');
    // Wiring completion to reps must not turn the weight field into a submit;
    // it keeps focusing reps so reps stays the last field in the sequence.
    expect(weightInput(tree).props.returnKeyType).toBe('next');
  });
});
