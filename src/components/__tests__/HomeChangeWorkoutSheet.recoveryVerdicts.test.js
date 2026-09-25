/**
 * HomeChangeWorkoutSheet.recoveryVerdicts.test.js -- per-muscle recovery,
 * next-workout aware (register D201, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md sections 4.3 and 6). Pins: each row shows its matching
 * perSession entry's calm `line` verbatim under the exercise count; a row
 * with no matching entry (resolved this week, or recovery data absent)
 * renders exactly as it did before this feature existed; the row's own name
 * is never re-derived from the recovery line.
 *
 * LANE R-G additions (Opus review finding 25, spec section 9; D201 addendum
 * 4 ruling 7, addendum 6 ruling 14): the recovery line's Text wraps to two
 * lines; the row's accessibilityLabel speaks that same line with "percent"
 * spelled out and carries no "%"; the "Next up" badge always marks
 * nextWorkout.idx, never the row a selectedWorkoutOverride merely
 * highlights.
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

describe('D201 addendum 4 ruling 7: the recovery line wraps to two lines', () => {
  test('the Text carries numberOfLines={2}, so "ready by <day>" is never cut off', () => {
    const line = 'Quads are estimated 64% recovered, ready by Thursday.';
    const { tree } = render({ recoveryPerSession: [{ routineId: 'legs', line }] });
    const textNode = tree.root.findAll((n) => {
      if (n.type !== 'Text') return false;
      const kids = n.props.children;
      return kids === line || (Array.isArray(kids) && kids.join('') === line);
    })[0];
    expect(textNode).toBeTruthy();
    expect(textNode.props.numberOfLines).toBe(2);
  });
});

describe('the row speaks its recovery line with "percent" spelled out (spec section 6 accessibility)', () => {
  test('accessibilityLabel is "Day <n>, <name>. <line with % replaced>" and contains no %', () => {
    const recoveryPerSession = [
      { routineId: 'legs', line: 'Quads are estimated 64% recovered, ready by Thursday.' },
    ];
    const { tree } = render({ recoveryPerSession });
    const row = tree.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Day 1, Legs'),
    )[0];
    expect(row).toBeTruthy();
    expect(row.props.accessibilityLabel).toBe(
      'Day 1, Legs. Quads are estimated 64 percent recovered, ready by Thursday.',
    );
    expect(row.props.accessibilityLabel).not.toMatch(/%/);
  });
});

describe('D201 addendum 6 ruling 14: "Next up" always marks programme order; the override is what is selected', () => {
  test('the badge stays on nextWorkout.idx and the highlighted row is the override\'s row', () => {
    const { tree } = render({
      nextWorkout: { idx: 0 },
      selectedWorkoutOverride: { routine: { id: 'push' }, total: 2, idx: 1 },
    });
    // accessibilityState is forwarded from TouchableOpacity down onto its
    // own rendered host node too, so a bare 'accessibilityState' in n.props
    // search over-matches; accessibilityLabel plus a real onPress function
    // (same idiom as HomeChangeWorkoutSheet.test.js's pressByLabel) isolates
    // the one TouchableOpacity instance per row.
    const rowByLabel = (label) => tree.root.findAll(
      (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
    )[0];
    const row0 = rowByLabel('Day 1, Legs');
    const row1 = rowByLabel('Day 2, Push');
    expect(row0).toBeTruthy();
    expect(row1).toBeTruthy();
    expect(row0.props.accessibilityState).toEqual({ selected: false });
    expect(row1.props.accessibilityState).toEqual({ selected: true });

    const hasNextBadge = (row) => row.findAll((c) => c.type === 'Text').some((t) => {
      const kids = t.props.children;
      return kids === 'Next up' || (Array.isArray(kids) && kids.join('') === 'Next up');
    });
    expect(hasNextBadge(row0)).toBe(true);
    expect(hasNextBadge(row1)).toBe(false);
  });
});
