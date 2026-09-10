/**
 * Eyebrow (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1).
 *
 * What this suite pins: the label text renders as given; a trailing
 * action renders its label and fires its own `onPress`, and is the only
 * interactive element the component ever produces.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import Eyebrow from '../Eyebrow';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

function render(props) {
  let tree;
  act(() => { tree = create(<Eyebrow {...props} />); });
  return tree;
}

describe('Eyebrow', () => {
  test('renders its label text', () => {
    const tree = render({ children: 'PEOPLE' });
    expect(flattenText(tree.toJSON())).toContain('PEOPLE');
  });

  test('renders no interactive element when there is no trailing action', () => {
    const tree = render({ children: 'GROUPS' });
    const buttons = tree.root.findAll((n) => n.props?.accessibilityRole === 'button');
    expect(buttons).toHaveLength(0);
  });

  test('renders its trailing action and calls its onPress', () => {
    const onPress = jest.fn();
    const tree = render({ children: 'GROUPS', trailing: { label: 'New group', onPress } });

    expect(flattenText(tree.toJSON())).toContain('New group');
    const button = tree.root.findAll((n) => n.props?.accessibilityRole === 'button')[0];
    expect(button.props.accessibilityLabel).toBe('New group');

    act(() => { button.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
