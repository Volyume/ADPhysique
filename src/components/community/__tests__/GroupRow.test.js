/**
 * GroupRow (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1: "Same
 * anatomy as `CohortRow`").
 *
 * What this suite pins: the title comes from `group.name` (falling back
 * to "Group" with no name); the count line renders as given, in either
 * of the two forms section 5 names ("8 members · invite only" today,
 * "3 trained today · 8 members" once phase 2 can say who trained); the
 * row opens the group on press.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import GroupRow from '../GroupRow';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

function render(props) {
  let tree;
  act(() => { tree = create(<GroupRow {...props} />); });
  return tree;
}

describe('GroupRow', () => {
  test('renders the group name as the title', () => {
    const tree = render({ group: { id: 'g1', name: 'Leeds Powerlifters' }, line: '8 members · invite only' });
    expect(flattenText(tree.toJSON())).toContain('Leeds Powerlifters');
  });

  test('falls back to "Group" when the group carries no name', () => {
    const tree = render({ group: { id: 'g1' }, line: '8 members · invite only' });
    expect(flattenText(tree.toJSON())).toContain('Group');
  });

  test('renders the pre-phase-2 line as given', () => {
    const tree = render({ group: { id: 'g1', name: 'Leeds Powerlifters' }, line: '8 members · invite only' });
    expect(flattenText(tree.toJSON())).toContain('8 members · invite only');
  });

  test('renders the phase-2 trained-today line as given, unchanged', () => {
    const tree = render({ group: { id: 'g1', name: 'Leeds Powerlifters' }, line: '3 trained today · 8 members' });
    expect(flattenText(tree.toJSON())).toContain('3 trained today · 8 members');
  });

  test('opens the group on press', () => {
    const onPress = jest.fn();
    const tree = render({
      group: { id: 'g1', name: 'Leeds Powerlifters' }, line: '8 members · invite only', onPress,
    });
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
