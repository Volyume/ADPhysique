/**
 * CohortRow (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1).
 *
 * What this suite pins: the title and count line render; the row carries
 * one accessible button that opens the cohort on press; the avatar stack
 * embeds the given `people`.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import CohortRow from '../CohortRow';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

function render(props) {
  let tree;
  act(() => { tree = create(<CohortRow {...props} />); });
  return tree;
}

const PEOPLE = [
  { user_id: 'u1', display_name: 'Sam Rees', avatar_preset: null },
  { user_id: 'u2', display_name: 'Priya K', avatar_preset: null },
];

describe('CohortRow', () => {
  test('renders the title and the count line', () => {
    const tree = render({ title: 'Your gym', line: '4 trained today · 23 members', people: PEOPLE });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Your gym');
    expect(text).toContain('4 trained today · 23 members');
  });

  test('is one accessible button carrying both lines', () => {
    const tree = render({ title: 'Strength', line: '8 members', people: [] });
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(button.props.accessibilityLabel).toBe('Strength. 8 members');
  });

  test('opens the cohort on press', () => {
    const onPress = jest.fn();
    const tree = render({
      title: 'Your gym', line: '23 members', people: PEOPLE, onPress,
    });
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('renders the given people in the stack (no "+N" with only two, under the default max of three)', () => {
    const tree = render({ title: 'Your gym', line: '2 members', people: PEOPLE });
    expect(flattenText(tree.toJSON())).not.toMatch(/\+\d/);
  });
});
