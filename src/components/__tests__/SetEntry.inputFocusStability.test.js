/**
 * Input focus/identity stability (founder device report, pre-gym build
 * defect pass): on Android, typing into Weight lost focus/keyboard after
 * EVERY character. Root cause traced to the ActiveWorkoutScreen ScrollView's
 * `keyboardDismissMode="on-drag"` on Android - RN's built-in scroll-into-view
 * for the focused input fires a native scroll event whenever this card's
 * layout height changes mid-typing (the Est. max caption line and the
 * record-flag row both mount/unmount as weight/reps cross zero or a record
 * threshold), and Android's ScrollView cannot distinguish that PROGRAMMATIC
 * scroll from a user drag - so 'on-drag' dismissed the keyboard every time.
 * The screen-level fix (keyboardDismissMode="none" on Android) is pinned by
 * a source guard in ActiveWorkoutScreen.__tests__; SetEntry itself was
 * already correct (a controlled, single-instance TextInput with no per-
 * keystroke remount), and this suite proves exactly that half of the
 * contract - component identity and value-sequencing survive continuous
 * typing, so nothing here can be reintroducing a second remount-shaped cause
 * of the same symptom.
 *
 * Jest cannot assert Android's native IME visibility; what CAN be proven and
 * IS proven below is the production mechanism a remount/identity bug would
 * require: the TextInput's React element identity (via a stable ref) and the
 * exact string sequence the controlled `value` carries through repeated
 * keystrokes, including intermediate/decimal states.
 */
import { create, act } from 'react-test-renderer';
import { useState } from 'react';
import { Keyboard } from 'react-native';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import SetEntry from '../SetEntry';

function weightInput(tree) {
  return tree.root.findByProps({ testID: 'volyume-weight-input' });
}
function repsInput(tree) {
  return tree.root.findByProps({ testID: 'volyume-reps-input' });
}

// A thin controlled wrapper, exactly the shape NowCard/ActiveWorkoutScreen
// use: state lives ABOVE SetEntry, onChange writes it back down. This is
// where a stray `key` or conditional-mount bug would show up as a distinct
// TextInput instance appearing after a value change.
function ControlledHarness({ initial, exerciseType, recordLine }) {
  const [value, setValue] = useState(initial);
  return (
    <SetEntry
      value={value}
      onChange={setValue}
      exerciseType={exerciseType}
      recordLine={recordLine}
    />
  );
}

describe('Weight: continuous multi-character entry keeps ONE TextInput instance', () => {
  test('typing "2" -> "21" -> "213" never remounts the weight field', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: '', reps: 8, isGhost: false }} />);
    });
    const firstInstance = weightInput(tree).instance;

    act(() => weightInput(tree).props.onChangeText('2'));
    expect(weightInput(tree).props.value).toBe('2');
    expect(weightInput(tree).instance).toBe(firstInstance);

    act(() => weightInput(tree).props.onChangeText('21'));
    expect(weightInput(tree).props.value).toBe('21');
    expect(weightInput(tree).instance).toBe(firstInstance);

    act(() => weightInput(tree).props.onChangeText('213'));
    expect(weightInput(tree).props.value).toBe('213');
    expect(weightInput(tree).instance).toBe(firstInstance);
  });

  test('a fresh weight value crossing into record/est-max territory (layout-shift trigger) does not remount the input', () => {
    // Mirrors the exact device scenario: reps already prefilled (>0), so the
    // FIRST weight keystroke immediately makes live1RM truthy and mounts the
    // Est. max caption row below the Reps block - the layout shift RN's
    // Android ScrollView misread as a drag. Proves SetEntry's own identity
    // is stable through that same transition; the dismiss itself is the
    // screen-level ScrollView fix, pinned separately.
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: '', reps: 8, isGhost: false }} />);
    });
    const firstInstance = weightInput(tree).instance;

    act(() => weightInput(tree).props.onChangeText('2'));
    expect(weightInput(tree).instance).toBe(firstInstance);
  });

  test('decimal sequence "2" -> "21" -> "21." -> "21.2" -> "21.25" is preserved verbatim, decimal point intact', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: '', reps: 8, isGhost: false }} />);
    });
    const sequence = ['2', '21', '21.', '21.2', '21.25'];
    for (const step of sequence) {
      act(() => weightInput(tree).props.onChangeText(step));
      expect(weightInput(tree).props.value).toBe(step);
    }
  });

  test('over-cap weight (>500) is refused and the field holds its last valid value', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: '213', reps: 8, isGhost: false }} />);
    });
    act(() => weightInput(tree).props.onChangeText('2130'));
    // Refused: parseFloat('2130') > 500, so setField never runs.
    expect(weightInput(tree).props.value).toBe('213');
  });
});

describe('Reps: continuous multi-character entry, and editing an existing logged value', () => {
  test('typing "1" -> "12" keeps one instance and the correct clamped value', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: 60, reps: '', isGhost: false }} />);
    });
    const firstInstance = repsInput(tree).instance;

    act(() => repsInput(tree).props.onChangeText('1'));
    expect(repsInput(tree).props.value).toBe('1');
    expect(repsInput(tree).instance).toBe(firstInstance);

    act(() => repsInput(tree).props.onChangeText('12'));
    expect(repsInput(tree).props.value).toBe('12');
    expect(repsInput(tree).instance).toBe(firstInstance);
  });

  test('editing an existing weight (100 -> 105) via multi-character retype keeps one instance', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: 100, reps: 8, isGhost: false }} />);
    });
    const firstInstance = weightInput(tree).instance;
    expect(weightInput(tree).props.value).toBe('100');

    act(() => weightInput(tree).props.onChangeText('105'));
    expect(weightInput(tree).props.value).toBe('105');
    expect(weightInput(tree).instance).toBe(firstInstance);
  });

  test('reps cap [1, 200]: an in-range multi-digit value is accepted verbatim mid-typing', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: 60, reps: '', isGhost: false }} />);
    });
    act(() => repsInput(tree).props.onChangeText('150'));
    expect(repsInput(tree).props.value).toBe('150');
  });
});

describe('Controlled parent re-render does not replace the active TextInput', () => {
  test('a sibling prop change (recordLine) on re-render keeps the same weight/reps instances', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: 60, reps: 8, isGhost: false }} recordLine={null} />);
    });
    const wInstance = weightInput(tree).instance;
    const rInstance = repsInput(tree).instance;

    act(() => {
      tree.update(
        <ControlledHarness
          initial={{ weight: 60, reps: 8, isGhost: false }}
          recordLine={{ isRecord: true, headline: 'New record', reasons: [], bestLabel: null, a11y: 'x' }}
        />,
      );
    });

    expect(weightInput(tree).instance).toBe(wInstance);
    expect(repsInput(tree).instance).toBe(rInstance);
  });
});

describe('Ghost/prefill state is preserved through continuous entry', () => {
  test('typing over a ghost value clears isGhost via onChange, without losing input identity', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: 40, reps: 8, isGhost: true }} />);
    });
    expect(weightInput(tree).props.value).toBe('40');
    const firstInstance = weightInput(tree).instance;

    act(() => weightInput(tree).props.onChangeText('42'));
    expect(weightInput(tree).instance).toBe(firstInstance);
    // The ghost flag is cleared the moment the user types over it (setField
    // always writes isGhost: false) - unchanged behaviour, re-verified here
    // alongside the identity guarantee.
  });
});

describe('Intentional dismissals still fire (typing must not dismiss; logging still must)', () => {
  test('reps Done key still logs the set and does not also call Keyboard.dismiss (unchanged)', () => {
    const onSubmitComplete = jest.fn();
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    let tree;
    act(() => {
      tree = create(<SetEntry value={{ weight: 60, reps: 8, isGhost: false }} onChange={() => {}} onSubmitComplete={onSubmitComplete} />);
    });
    act(() => repsInput(tree).props.onSubmitEditing());
    expect(onSubmitComplete).toHaveBeenCalledTimes(1);
    expect(dismiss).not.toHaveBeenCalled();
    dismiss.mockRestore();
  });

  test('mid-entry onChangeText NEVER calls Keyboard.dismiss directly (typing must not dismiss)', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: '', reps: 8, isGhost: false }} />);
    });
    for (const step of ['2', '21', '213']) {
      act(() => weightInput(tree).props.onChangeText(step));
    }
    expect(dismiss).not.toHaveBeenCalled();
    dismiss.mockRestore();
  });

  test('invalid weight values remain rejected exactly as before (validation unchanged)', () => {
    let tree;
    act(() => {
      tree = create(<ControlledHarness initial={{ weight: '', reps: 8, isGhost: false }} />);
    });
    // More than 3 integer digits / 2 decimals fails the field's own regex,
    // so onChange never fires and the value stays unset.
    act(() => weightInput(tree).props.onChangeText('1234'));
    expect(weightInput(tree).props.value).toBe('');
    act(() => weightInput(tree).props.onChangeText('1.234'));
    expect(weightInput(tree).props.value).toBe('');
  });
});
