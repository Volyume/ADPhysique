/**
 * AvatarStack (communities revamp 2026-09-10:
 * `docs/communities-revamp-2026-09-10/21-PHASE1-SPEC.md` section 1).
 *
 * What this suite pins: a "+N" caption appears once `people` runs past
 * `max` and never otherwise; the stack is hidden from the accessibility
 * tree ("Nothing interactive; the row is the target"); `stackWidth`'s
 * overlap arithmetic, which `CohortRow`/`GroupRow` rely on for their
 * hairline inset.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import AvatarStack, { stackWidth } from '../AvatarStack';
import { spacing } from '../../../styles/theme';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

function render(props) {
  let tree;
  act(() => { tree = create(<AvatarStack {...props} />); });
  return tree;
}

function person(id) {
  return { user_id: `u${id}`, display_name: `Person ${id}`, avatar_preset: null };
}

describe('AvatarStack', () => {
  test('shows "+N" when there are more people than max', () => {
    const people = [1, 2, 3, 4, 5].map(person);
    const tree = render({ people, max: 3 });
    expect(flattenText(tree.toJSON())).toContain('+2');
  });

  test('shows no "+N" when people fit within max', () => {
    const people = [1, 2].map(person);
    const tree = render({ people, max: 3 });
    expect(flattenText(tree.toJSON())).not.toMatch(/\+\d/);
  });

  test('an empty list renders with no crash and no "+N"', () => {
    const tree = render({ people: [] });
    expect(flattenText(tree.toJSON())).not.toMatch(/\+\d/);
  });

  test('is hidden from the accessibility tree: the row is the target', () => {
    const tree = render({ people: [person(1)] });
    const hidden = tree.root.findAll((n) => n.props?.accessibilityElementsHidden === true);
    expect(hidden.length).toBeGreaterThan(0);
  });
});

describe('stackWidth', () => {
  test('zero people is zero width', () => {
    expect(stackWidth(0)).toBe(0);
  });

  test('one avatar is exactly `size` wide', () => {
    expect(stackWidth(1, 24)).toBe(24);
  });

  test('each additional avatar (up to max) adds size minus the spacing.sm overlap', () => {
    expect(stackWidth(3, 24, 3)).toBe(24 + 2 * (24 - spacing.sm));
  });

  test('caps at max regardless of how many more people there are', () => {
    expect(stackWidth(99, 24, 3)).toBe(stackWidth(3, 24, 3));
  });
});
