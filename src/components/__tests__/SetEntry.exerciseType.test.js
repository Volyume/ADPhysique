/**
 * Exercise TYPE axis invariant tests (Hevy teardown 03-exercise-library.md, R3).
 *
 * THE CRITICAL INVARIANT: the weight_reps schema renders and behaves EXACTLY as
 * before the type axis existed — weight field + reps field, weight chains to
 * reps (returnKeyType "next"), reps completes the set (returnKeyType "done"),
 * and the reps Done key still fires onSubmitComplete. weighted_bodyweight must
 * render the same two fields (it is the safe drop-in for loaded bodyweight work).
 *
 * Plus: a duration exercise renders a time field that stores total SECONDS in
 * the reps slot, and a reps_only exercise hides the weight field while keeping
 * the reps field working.
 */
import { create, act } from 'react-test-renderer';
import { Keyboard } from 'react-native';

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the other SetEntry suite does.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

import SetEntry from '../SetEntry';

const WR_VALUE = { weight: 60, reps: 8, isGhost: false };

// findAllByProps returns BOTH the composite TextInput (type is an object) and
// its host instance (type is the string 'TextInput') for the same testID under
// this renderer. Filter to host instances (string type) for a true element count.
function byId(tree, id) {
  return tree.root
    .findAllByProps({ testID: id })
    .filter(node => typeof node.type === 'string');
}

describe('SetEntry — exercise type axis', () => {
  describe('weight_reps invariant (must be byte-for-byte unchanged)', () => {
    function mount(props = {}) {
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={WR_VALUE} onChange={() => {}} onSubmitComplete={() => {}} {...props} />,
        );
      });
      return tree;
    }

    test('default (no exerciseType prop) renders weight + reps, no time field', () => {
      const tree = mount();
      expect(byId(tree, 'volyume-weight-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-reps-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-duration-input')).toHaveLength(0);
      expect(byId(tree, 'volyume-distance-input')).toHaveLength(0);
    });

    test('explicit weight_reps is identical to the default layout', () => {
      const tree = mount({ exerciseType: 'weight_reps' });
      expect(byId(tree, 'volyume-weight-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-reps-input')).toHaveLength(1);
    });

    test('field contract preserved: weight chains (next), reps completes (done)', () => {
      const tree = mount({ exerciseType: 'weight_reps' });
      expect(tree.root.findByProps({ testID: 'volyume-weight-input' }).props.returnKeyType).toBe('next');
      expect(tree.root.findByProps({ testID: 'volyume-reps-input' }).props.returnKeyType).toBe('done');
    });

    test('reps Done key still fires onSubmitComplete', () => {
      const onSubmitComplete = jest.fn();
      const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
      const tree = mount({ exerciseType: 'weight_reps', onSubmitComplete });
      act(() => tree.root.findByProps({ testID: 'volyume-reps-input' }).props.onSubmitEditing());
      expect(onSubmitComplete).toHaveBeenCalledTimes(1);
      expect(dismiss).not.toHaveBeenCalled();
      dismiss.mockRestore();
    });

    test('weighted_bodyweight renders the SAME weight + reps fields', () => {
      const tree = mount({ exerciseType: 'weighted_bodyweight' });
      expect(byId(tree, 'volyume-weight-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-reps-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-duration-input')).toHaveLength(0);
    });

    test('typing weight stores the raw string unchanged (decimal entry preserved)', () => {
      const onChange = jest.fn();
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={{ weight: '', reps: 8, isGhost: false }} onChange={onChange} />,
        );
      });
      act(() => tree.root.findByProps({ testID: 'volyume-weight-input' }).props.onChangeText('21.'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ weight: '21.' }));
    });
  });

  describe('duration schema', () => {
    test('renders a time field and no weight field', () => {
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={{ weight: '', reps: 90, isGhost: false }} onChange={() => {}} exerciseType="duration" />,
        );
      });
      expect(byId(tree, 'volyume-weight-input')).toHaveLength(0);
      expect(byId(tree, 'volyume-reps-input')).toHaveLength(0);
      expect(byId(tree, 'volyume-duration-input')).toHaveLength(1);
    });

    test('shows seconds formatted as mm:ss', () => {
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={{ weight: '', reps: 90, isGhost: false }} onChange={() => {}} exerciseType="duration" />,
        );
      });
      expect(tree.root.findByProps({ testID: 'volyume-duration-input' }).props.value).toBe('1:30');
    });

    test('typing mm:ss stores total SECONDS in the reps slot', () => {
      const onChange = jest.fn();
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={{ weight: '', reps: '', isGhost: false }} onChange={onChange} exerciseType="duration" />,
        );
      });
      act(() => tree.root.findByProps({ testID: 'volyume-duration-input' }).props.onChangeText('2:05'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ reps: 125 }));
    });

    test('duration Done key completes the set', () => {
      const onSubmitComplete = jest.fn();
      let tree;
      act(() => {
        tree = create(
          <SetEntry
            value={{ weight: '', reps: 60, isGhost: false }}
            onChange={() => {}}
            onSubmitComplete={onSubmitComplete}
            exerciseType="duration"
          />,
        );
      });
      act(() => tree.root.findByProps({ testID: 'volyume-duration-input' }).props.onSubmitEditing());
      expect(onSubmitComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('reps_only schema', () => {
    test('hides the weight field but keeps the reps field', () => {
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={{ weight: '', reps: 12, isGhost: false }} onChange={() => {}} exerciseType="reps_only" />,
        );
      });
      expect(byId(tree, 'volyume-weight-input')).toHaveLength(0);
      expect(byId(tree, 'volyume-reps-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-duration-input')).toHaveLength(0);
    });

    test('reps field still logs reps and completes the set', () => {
      const onChange = jest.fn();
      const onSubmitComplete = jest.fn();
      let tree;
      act(() => {
        tree = create(
          <SetEntry
            value={{ weight: '', reps: '', isGhost: false }}
            onChange={onChange}
            onSubmitComplete={onSubmitComplete}
            exerciseType="reps_only"
          />,
        );
      });
      const repsInput = tree.root.findByProps({ testID: 'volyume-reps-input' });
      act(() => repsInput.props.onChangeText('15'));
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ reps: 15 }));
      act(() => repsInput.props.onSubmitEditing());
      expect(onSubmitComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('distance schema', () => {
    test('renders distance + time fields, no plain weight/reps fields', () => {
      let tree;
      act(() => {
        tree = create(
          <SetEntry value={{ weight: 400, reps: 90, isGhost: false }} onChange={() => {}} exerciseType="distance" />,
        );
      });
      expect(byId(tree, 'volyume-distance-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-distance-time-input')).toHaveLength(1);
      expect(byId(tree, 'volyume-weight-input')).toHaveLength(0);
      expect(byId(tree, 'volyume-reps-input')).toHaveLength(0);
    });
  });
});
