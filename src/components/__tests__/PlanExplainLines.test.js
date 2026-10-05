/**
 * PlanExplainLines -- D219 lane B5 (design section 6, "a one-line source
 * behind each rule, on tap").
 *
 * What this pins, and why:
 *   - every line of a plan's explanation renders as written (the sentences are
 *     computed in plan/explain.js; this component only shows them);
 *   - the source of a line is NOT on screen until it is tapped, then reads as
 *     its grade and its one-line source, and a second tap hides it again, so
 *     a long explanation stays scannable and the research is there on tap;
 *   - the toggle is a button a screen reader can operate: it says what it
 *     does, and whether the line is expanded;
 *   - with no lines (a plan without facts) it renders nothing at all, so the
 *     screens that embed it are unchanged for every plan the new planner did
 *     not build.
 */
import { create, act } from 'react-test-renderer';
import { TouchableOpacity } from 'react-native';
import PlanExplainLines from '../PlanExplainLines';

const LINES = [
  {
    id: 'structure',
    text: '4 sessions a week, alternating upper and lower.',
    source: { key: 'FREQUENCY.preferTwoExposuresFromWeekly', grade: 'CONV', gradeLabel: 'A convention Volyume chose', line: 'At equal weekly sets, training frequency does not change growth (Ochi 2018).' },
  },
  {
    id: 'ladder',
    text: 'Weeks 1 to 5 stop about 3, 2, 2, 1 and 1 reps short of failure.',
    source: { key: 'BLOCK.rirLadder', grade: 'A', gradeLabel: 'Strong evidence', line: 'Stopping one rep short of failure keeps most of the growth (Refalo 2023).' },
  },
];

function render(lines) {
  let tree;
  act(() => { tree = create(<PlanExplainLines lines={lines} />); });
  return tree;
}

function text(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return text(node.children);
}

const toggles = (tree) => tree.root.findAllByType(TouchableOpacity);

describe('PlanExplainLines', () => {
  test('every line renders as written', () => {
    const out = text(render(LINES).toJSON());
    expect(out).toContain('4 sessions a week, alternating upper and lower.');
    expect(out).toContain('Weeks 1 to 5 stop about 3, 2, 2, 1 and 1 reps short of failure.');
  });

  test('no source is shown until a line\'s source is tapped', () => {
    const out = text(render(LINES).toJSON());
    expect(out).not.toContain('Ochi 2018');
    expect(out).not.toContain('Refalo 2023');
    expect(out).not.toContain('Strong evidence');
  });

  test('tapping a line\'s source shows its grade and its one-line source, and tapping again hides it', () => {
    const tree = render(LINES);
    expect(toggles(tree)).toHaveLength(2);
    act(() => { toggles(tree)[1].props.onPress(); });
    let out = text(tree.toJSON());
    expect(out).toContain('Strong evidence. Stopping one rep short of failure keeps most of the growth (Refalo 2023).');
    expect(out).not.toContain('Ochi 2018'); // only the tapped line opens
    act(() => { toggles(tree)[1].props.onPress(); });
    out = text(tree.toJSON());
    expect(out).not.toContain('Refalo 2023');
  });

  test('the toggle says what it does and whether the line is open', () => {
    const tree = render(LINES);
    const first = () => toggles(tree)[0];
    expect(first().props.accessibilityLabel).toBe('Show the source for this line');
    expect(first().props.accessibilityState).toEqual({ expanded: false });
    act(() => { first().props.onPress(); });
    expect(first().props.accessibilityLabel).toBe('Hide the source for this line');
    expect(first().props.accessibilityState).toEqual({ expanded: true });
  });

  test('no lines, nothing rendered', () => {
    expect(render([]).toJSON()).toBeNull();
    expect(render(null).toJSON()).toBeNull();
    expect(render(undefined).toJSON()).toBeNull();
  });
});
