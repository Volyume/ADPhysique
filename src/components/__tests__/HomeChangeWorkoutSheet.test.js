/**
 * HomeChangeWorkoutSheet reachability (D36a item 17 modal tails, 2026-07-10).
 *
 * Pins that the sheet migrated cleanly off a hand-rolled Modal onto the
 * shared BottomSheet (src/components/BottomSheet.js): it still opens on
 * `visible`, still renders its content (workout options / picker rows), and
 * "Cancel" still calls onClose. Reduce-motion is forced via the store mock
 * so BottomSheet mounts/unmounts synchronously (same convention as
 * CancelReasonSheet.test.js).
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../store/useAppStore', () => {
  const fn = (selector) => selector({ accessibility: { reduceMotion: true } });
  return { __esModule: true, default: fn };
});

import HomeChangeWorkoutSheet from '../HomeChangeWorkoutSheet';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function pressByLabel(tree, label) {
  const node = tree.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
  expect(node).toBeTruthy();
  act(() => node.props.onPress());
}

function render(props = {}) {
  const merged = {
    visible: true,
    onClose: jest.fn(),
    activePlan: { name: 'Push Pull Legs' },
    displayWorkout: { routine: { id: 'r1', name: 'Push day' } },
    planAllWorkouts: [
      { id: 'r1', name: 'Push day' },
      { id: 'r2', name: 'Pull day' },
    ],
    nextWorkout: { idx: 0 },
    exerciseCounts: { r1: 5, r2: 6 },
    selectedWorkoutOverride: null,
    onSelectOverride: jest.fn(),
    navigation: { navigate: jest.fn() },
    ...props,
  };
  let tree;
  act(() => {
    tree = create(<HomeChangeWorkoutSheet {...merged} />);
  });
  return { tree, props: merged };
}

describe('HomeChangeWorkoutSheet', () => {
  test('renders its content when visible', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Workout options');
    expect(text).toContain('Push Pull Legs');
    expect(text).toContain('View workout');
    expect(text).toContain('Blank workout');
    expect(text).toContain('Pull day');
  });

  test('stays unreachable while not visible', () => {
    const { tree } = render({ visible: false });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Workout options');
  });

  test('Cancel calls onClose', () => {
    const { tree, props } = render();
    pressByLabel(tree, 'Cancel');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('picking a day calls onSelectOverride and onClose', () => {
    const { tree, props } = render();
    pressByLabel(tree, 'Day 2, Pull day');
    expect(props.onSelectOverride).toHaveBeenCalledWith({ routine: props.planAllWorkouts[1], total: 2, idx: 1 });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

// Founder device order 2026-09-08: the standalone "Skip this workout this
// time" text link under the Home hero's buttons read badly on its own; it
// now lives here as one more workout option, gated exactly the way the old
// standalone link was (HomeScreen.js passes onSkip only when there is a
// genuinely outstanding required session to skip).
describe('the skip option (moved here from a standalone Home hero link)', () => {
  test('absent when onSkip is not supplied (no outstanding session to skip)', () => {
    const { tree } = render();
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Skip this workout');
  });

  test('present when onSkip is supplied, and calls it then onClose', () => {
    const onSkip = jest.fn();
    const { tree, props } = render({ onSkip, skipAccessibilityLabel: 'Skip Upper A this time' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Skip this workout');
    pressByLabel(tree, 'Skip Upper A this time');
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
