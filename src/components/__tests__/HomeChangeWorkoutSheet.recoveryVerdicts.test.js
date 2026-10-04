/**
 * HomeChangeWorkoutSheet.recoveryVerdicts.test.js -- the change-workout sheet
 * is a PLAIN choice: no readiness verdict, no readiness line, no ranking
 * (register D219, founder 2026-10-04: "Next workout should be planned as the
 * plan builds it we shouldn't be having users to view the plan and see a
 * recommendation and change order"; Q2 answered "Keep a plain choice": people
 * can still pick another session from the plan's list, with no suggestions,
 * no ranking and no readiness badges, the plan's next session the default).
 *
 * RE-PINNED under D219 lane A6. The suite used to pin the per-row recovery
 * line (D201, spec 00-SPEC.md sections 4.3 and 6): each row showed its
 * matching perSession entry's calm `line` ("Quads are estimated 64%
 * recovered, ready by Thursday.") under the exercise count, wrapped to two
 * lines, and spoke it in the row's accessibilityLabel with "percent" spelled
 * out. Those cases now pin the opposite: even a caller that still hands the
 * old `recoveryPerSession` prop gets no readiness line, no second meta line
 * and no percent in any row. What the plain choice keeps is pinned too:
 * every session of the plan in the plan's order, each with its exercise
 * count, the "Next up" badge that always marks the plan's own next session
 * (D201 addendum 6 ruling 14, kept), "View workout", "Blank workout" and
 * "Skip this workout".
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

const rowByLabel = (tree, label) => tree.root.findAll(
  (n) => n.props && n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
)[0];

// What the pre-D219 module handed the sheet: one calm line per session.
const OLD_PER_SESSION = [
  { routineId: 'legs', line: 'Quads are estimated 64% recovered, ready by Thursday.' },
  { routineId: 'push', line: 'Estimated ready now.' },
];

describe('the change-workout sheet renders no readiness line (D219 A6, Q2 = plain choice)', () => {
  test('handed the old per-session readiness lines, no row shows one', () => {
    const { tree } = render({ recoveryPerSession: OLD_PER_SESSION });
    const text = flattenText(tree.toJSON());
    expect(text).not.toContain('Quads are estimated 64% recovered, ready by Thursday.');
    expect(text).not.toContain('Estimated ready now.');
    expect(text).not.toMatch(/recovered|estimated|ready now|ready by|%/i);
    // The rows are still there, with their exercise counts.
    expect(text).toContain('Legs');
    expect(text).toContain('Push');
    expect(text).toContain('5 exercises');
    expect(text).toContain('6 exercises');
  });

  test('with no readiness handed in at all, the rows read exactly the same', () => {
    const withLines = flattenText(render({ recoveryPerSession: OLD_PER_SESSION }).tree.toJSON());
    const without = flattenText(render({ recoveryPerSession: null }).tree.toJSON());
    expect(withLines).toBe(without);
    expect(without).not.toMatch(/recovered|Ready now/);
  });

  test('a row carries nothing under its exercise count: no second meta line wraps to two lines', () => {
    const { tree } = render({ recoveryPerSession: OLD_PER_SESSION });
    const twoLine = tree.root.findAll((n) => n.type === 'Text' && n.props.numberOfLines === 2);
    expect(twoLine).toHaveLength(0);
  });

  test('a row\'s spoken label is "Day <n>, <name>" and never carries a readiness or a percent', () => {
    const { tree } = render({ recoveryPerSession: OLD_PER_SESSION });
    const row = rowByLabel(tree, 'Day 1, Legs');
    expect(row).toBeTruthy();
    expect(row.props.accessibilityLabel).toBe('Day 1, Legs');
    expect(rowByLabel(tree, 'Day 2, Push').props.accessibilityLabel).toBe('Day 2, Push');
    const labels = tree.root.findAll((n) => typeof n.props?.accessibilityLabel === 'string')
      .map((n) => n.props.accessibilityLabel);
    for (const label of labels) expect(label).not.toMatch(/percent|%|recovered|estimated/i);
  });

  test('no row is ranked or badged by readiness: the only badge anywhere is "Next up", once, on the plan\'s own next session', () => {
    const { tree } = render({ recoveryPerSession: OLD_PER_SESSION, nextWorkout: { idx: 1 } });
    const badges = tree.root.findAll((c) => c.type === 'Text').filter((t) => {
      const kids = [].concat(t.props.children).join('');
      return kids === 'Next up';
    });
    expect(badges).toHaveLength(1);
    const withBadge = (row) => row.findAll((c) => c.type === 'Text').some((t) => [].concat(t.props.children).join('') === 'Next up');
    expect(withBadge(rowByLabel(tree, 'Day 2, Push'))).toBe(true);
    expect(withBadge(rowByLabel(tree, 'Day 1, Legs'))).toBe(false);
  });

  test('the list is the plan\'s own order, whatever the old per-session array said', () => {
    const { tree } = render({
      recoveryPerSession: [...OLD_PER_SESSION].reverse(),
      planAllWorkouts: [
        { id: 'legs', name: 'Legs' }, { id: 'push', name: 'Push' }, { id: 'pull', name: 'Pull' },
      ],
      exerciseCounts: { legs: 5, push: 6, pull: 4 },
    });
    // A touchable shows up as both its component and its host node, so the
    // labels are de-duplicated (first occurrence kept, order preserved).
    const labels = tree.root.findAll(
      (n) => typeof n.props?.accessibilityLabel === 'string' && /^Day \d+, /.test(n.props.accessibilityLabel)
        && typeof n.props.onPress === 'function',
    ).map((n) => n.props.accessibilityLabel);
    expect(Array.from(new Set(labels))).toEqual(['Day 1, Legs', 'Day 2, Push', 'Day 3, Pull']);
  });
});

describe('what the plain choice keeps (D219 A6)', () => {
  test('View workout, Blank workout, Skip this workout, the plan\'s list and Cancel are all still there', () => {
    const onSkip = jest.fn();
    const { tree, props } = render({ onSkip, skipAccessibilityLabel: 'Skip Legs this time' });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Workout options');
    expect(text).toContain('Push Pull Legs');
    expect(text).toContain('View workout');
    expect(text).toContain('Blank workout');
    expect(text).toContain('Skip this workout');
    expect(text).toContain('Just this once, not the whole plan.');
    expect(text).toContain('Choose a different workout');
    expect(text).toContain('Next up');
    expect(text).toContain('Cancel');
    act(() => rowByLabel(tree, 'Skip Legs this time').props.onPress());
    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  test('picking another session is the person\'s own choice: it hands that session to onSelectOverride; the plan\'s next row clears it', () => {
    const { tree, props } = render({ nextWorkout: { idx: 0 } });
    act(() => rowByLabel(tree, 'Day 2, Push').props.onPress());
    expect(props.onSelectOverride).toHaveBeenLastCalledWith({ routine: props.planAllWorkouts[1], total: 2, idx: 1 });
    act(() => rowByLabel(tree, 'Day 1, Legs').props.onPress());
    expect(props.onSelectOverride).toHaveBeenLastCalledWith(null);
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
    const row0 = rowByLabel(tree, 'Day 1, Legs');
    const row1 = rowByLabel(tree, 'Day 2, Push');
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
