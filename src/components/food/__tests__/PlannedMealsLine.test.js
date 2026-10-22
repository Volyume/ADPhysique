/**
 * PlannedMealsLine (D231, app layout rework batch 3): the Diary's ONE
 * planned-meals line, "3 planned meals · Mark all eaten · Clear".
 *
 * What this suite pins, and why each pin is written to fail:
 *  - The count reads "1 planned meal" for one and "N planned meals" for the
 *    rest, and the line is absent for none. (The banner it replaces read "N
 *    planned meals for this day.")
 *  - "Mark all eaten" is offered only when the caller says the day can have
 *    been eaten (`canMarkEaten`); a future day gets the count and Clear only.
 *  - Both actions are buttons at a 48 dp minimum height, each calling its own
 *    handler; "Mark all eaten" is its own spoken name with a hint that says
 *    what it does.
 *  - The middle dots are separators only: hidden from a screen reader.
 *  - Ink only: the line draws nothing in the brand amber (one amber on the
 *    Diary, the scan button).
 */
import { create, act } from 'react-test-renderer';
import PlannedMealsLine, { plannedMealsText } from '../PlannedMealsLine';
import { colors } from '../../../styles/theme';

const textOf = (node) => (typeof node === 'string' ? node : (node.children ?? []).map(textOf).join(''));
const visibleText = (tree) => tree.toJSON() == null ? '' : textOf(tree.toJSON());
const flat = (style) => Object.assign({}, ...[].concat(style).flat(Infinity).filter(Boolean));

describe('plannedMealsText', () => {
  test('"1 planned meal" for one, "N planned meals" otherwise', () => {
    expect(plannedMealsText(1)).toBe('1 planned meal');
    expect(plannedMealsText(2)).toBe('2 planned meals');
    expect(plannedMealsText(3)).toBe('3 planned meals');
  });
});

describe('PlannedMealsLine', () => {
  test('renders nothing for no planned meals', () => {
    expect(create(<PlannedMealsLine count={0} onMarkAllEaten={() => {}} onClear={() => {}} />).toJSON()).toBeNull();
  });

  test('reads "3 planned meals · Mark all eaten · Clear"', () => {
    const tree = create(<PlannedMealsLine count={3} onMarkAllEaten={() => {}} onClear={() => {}} />);
    expect(visibleText(tree)).toBe('3 planned meals·Mark all eaten·Clear');
  });

  test('a future day: the count and Clear, no "Mark all eaten"', () => {
    const tree = create(<PlannedMealsLine count={2} canMarkEaten={false} onMarkAllEaten={() => {}} onClear={() => {}} />);
    expect(visibleText(tree)).toBe('2 planned meals·Clear');
    expect(tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark all eaten')).toHaveLength(0);
  });

  test('each action is a 48 dp button that calls its own handler', () => {
    const onMarkAllEaten = jest.fn();
    const onClear = jest.fn();
    const tree = create(<PlannedMealsLine count={1} onMarkAllEaten={onMarkAllEaten} onClear={onClear} />);
    const mark = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Mark all eaten' && typeof n.props?.onPress === 'function', { deep: false })[0];
    const clear = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Clear the planned meals' && typeof n.props?.onPress === 'function', { deep: false })[0];
    [mark, clear].forEach((b) => {
      expect(b.props.accessibilityRole).toBe('button');
      expect(flat(b.props.style).minHeight).toBeGreaterThanOrEqual(48);
    });
    expect(mark.props.accessibilityHint).toBe('Marks every planned meal on this day as eaten.');
    act(() => { mark.props.onPress(); });
    expect(onMarkAllEaten).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();
    act(() => { clear.props.onPress(); });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('the dots are separators only: hidden from a screen reader', () => {
    const tree = create(<PlannedMealsLine count={2} onMarkAllEaten={() => {}} onClear={() => {}} />);
    const dots = tree.root.findAll((n) => n.type === 'Text' && [].concat(n.props.children ?? []).join('') === '·');
    expect(dots).toHaveLength(2);
    dots.forEach((d) => {
      expect(d.props.accessibilityElementsHidden).toBe(true);
      expect(d.props.importantForAccessibility).toBe('no');
    });
  });

  test('draws nothing in the brand amber', () => {
    const tree = create(<PlannedMealsLine count={2} onMarkAllEaten={() => {}} onClear={() => {}} />);
    const json = JSON.stringify(tree.toJSON());
    expect(json).not.toContain(colors.primary);
    expect(json).not.toContain(colors.primaryBg);
  });
});
