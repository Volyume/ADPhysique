/**
 * NavRow.test.js
 *
 * What this suite pins and why (register D214, build lane 5 of the Progress
 * elevation): NavRow and NavGroup were YouScreen's local components. They moved
 * verbatim into src/components/NavRow.js so the Volume heatmap's "Volume
 * targets" door (and the Progress doors) read the same row. A move is only safe
 * if the behaviour every consumer leans on survives it, so this pins exactly
 * that: the row's label is its spoken label, a tap fires the house selection
 * haptic and then the caller's handler (R9, D70), the sub line is optional, and
 * a row with no handler stays inert rather than throwing.
 */
import { create, act } from 'react-test-renderer';
import { NavRow, NavGroup } from '../NavRow';
import * as haptics from '../../lib/haptics';

jest.mock('@expo/vector-icons/Ionicons', () => 'Ionicons');
// PressableCard animates on the UI thread (Reanimated); here it is a host node
// so the props NavRow hands it (the spoken label, the press handler) can be read.
jest.mock('../PressableCard', () => ({ __esModule: true, default: 'PressableCard' }));
jest.mock('../../lib/haptics', () => ({ selection: jest.fn() }));

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  return flattenText(node.children);
}

function render(element) {
  let tree;
  act(() => { tree = create(element); });
  return tree;
}

beforeEach(() => { jest.clearAllMocks(); });

describe('NavRow (shared from YouScreen, D214 lane 5)', () => {
  test('the label is the spoken label, and the sub line prints under it', () => {
    const tree = render(
      <NavGroup>
        <NavRow icon="stats-chart-outline" label="Volume targets" sub="How many sets each muscle gets each week." onPress={() => {}} />
      </NavGroup>,
    );
    const card = tree.root.findByType('PressableCard');
    // RE-ANCHORED (lead, D214 rule 3 landing fix): the spoken label carries the
    // sub line too, so a gate such as "N sessions to go" is read aloud.
    expect(card.props.accessibilityLabel).toBe('Volume targets. How many sets each muscle gets each week.');
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Volume targets');
    expect(text).toContain('How many sets each muscle gets each week.');
  });

  test('a tap fires the selection haptic, then the handler', () => {
    const onPress = jest.fn();
    const order = [];
    haptics.selection.mockImplementation(() => order.push('haptic'));
    onPress.mockImplementation(() => order.push('press'));
    const tree = render(<NavRow icon="barbell-outline" label="Open" onPress={onPress} />);
    act(() => { tree.root.findByType('PressableCard').props.onPress(); });
    expect(order).toEqual(['haptic', 'press']);
  });

  test('the sub line is optional', () => {
    const tree = render(<NavRow icon="barbell-outline" label="Only a label" onPress={() => {}} />);
    expect(flattenText(tree.toJSON())).toBe('Only a label');
  });

  test('a row with no handler is inert, never a throw and never a haptic', () => {
    const tree = render(<NavRow icon="barbell-outline" label="Inert" />);
    const card = tree.root.findByType('PressableCard');
    expect(card.props.onPress).toBeUndefined();
    expect(haptics.selection).not.toHaveBeenCalled();
  });
});
