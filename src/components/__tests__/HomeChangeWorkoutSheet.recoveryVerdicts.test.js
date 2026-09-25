/**
 * HomeChangeWorkoutSheet.recoveryVerdicts.test.js -- per-muscle recovery,
 * next-workout aware (register D201, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md sections 4.3 and 6). Pins: each row shows its matching
 * perSession entry's calm `line` verbatim under the exercise count; a row
 * with no matching entry (resolved this week, or recovery data absent)
 * renders exactly as it did before this feature existed; the row's own name
 * is never re-derived from the recovery line.
 *
 * Same mount pattern as HomeChangeWorkoutSheet.test.js (react-test-renderer,
 * reduce-motion forced via the store mock so BottomSheet mounts
 * synchronously).
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

function render(props = {}) {
  const merged = {
    visible: true,
    onClose: jest.fn(),
    activePlan: { name: 'Push Pull Legs' },
    displayWorkout: { routine: { id: 'legs', name: 'Legs' } },
    planAllWorkouts: [
      { id: 'legs', name: 'Legs' },
      { id: 'push', name: 'Push' },
    ],
    nextWorkout: { idx: 0 },
    exerciseCounts: { legs: 5, push: 6 },
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

describe('the change-workout sheet renders each outstanding session\'s verdict line', () => {
  test('a row with a matching perSession entry shows its line under the exercise count', () => {
    const recoveryPerSession = [
      { routineId: 'legs', line: 'Quads are estimated 64% recovered, ready by Thursday.' },
      { routineId: 'push', line: 'Ready now.' },
    ];
    const { tree } = render({ recoveryPerSession });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Quads are estimated 64% recovered, ready by Thursday.');
    expect(text).toContain('Ready now.');
  });

  test('a row with no matching entry (resolved this week) renders exactly as before', () => {
    const recoveryPerSession = [{ routineId: 'legs', line: 'Ready now.' }];
    const { tree } = render({ recoveryPerSession });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Ready now.');
    // "Push" has no perSession entry -- its row shows the plain exercise
    // count and nothing else, unchanged from before this feature existed.
    expect(text).toContain('Push');
    expect(text).toContain('6 exercises');
  });

  test('recoveryPerSession absent (loading/unavailable): every row renders exactly as before', () => {
    const { tree } = render({ recoveryPerSession: null });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('5 exercises');
    expect(text).toContain('6 exercises');
    expect(text).not.toMatch(/recovered|Ready now/);
  });

  test('an empty recoveryPerSession array behaves the same as absent', () => {
    const { tree } = render({ recoveryPerSession: [] });
    const text = flattenText(tree.toJSON());
    expect(text).not.toMatch(/recovered|Ready now/);
  });
});
