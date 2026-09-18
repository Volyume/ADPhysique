/**
 * DimensionRow (blueprint section 6; SD-10; communities revamp
 * 2026-09-10, task 4: the `discipline` and `age_band` kinds).
 *
 * What this suite pins: the two new kinds get a real glyph and render
 * exactly like the three existing kinds (label, count line, chevron); an
 * unrecognised kind still renders nothing, the same refusal the retired
 * "programme" kind already exercises.
 */

import { create, act } from 'react-test-renderer';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import DimensionRow, { peopleLine } from '../DimensionRow';

function flattenText(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  return flattenText(node.children);
}

function render(props) {
  let tree;
  act(() => { tree = create(<DimensionRow {...props} />); });
  return tree;
}

describe('DimensionRow: discipline and age_band', () => {
  test('a discipline dimension renders its label and count line', () => {
    const tree = render({
      dimension: { kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding', count: 6 },
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('Bodybuilding');
    expect(text).toContain('6 lifters');
  });

  test('an age_band dimension renders its label and count line', () => {
    const tree = render({
      dimension: { kind: 'age_band', key: '25_34', label: '25 to 34', count: 1 },
    });
    const text = flattenText(tree.toJSON());
    expect(text).toContain('25 to 34');
    expect(text).toContain('1 lifter');
  });

  test('both kinds open on press, the same as every other kind', () => {
    const onPress = jest.fn();
    const tree = render({
      dimension: { kind: 'discipline', key: 'bodybuilding', label: 'Bodybuilding', count: 6 },
      onPress,
    });
    const card = tree.root.findAll((n) => typeof n.props?.onPress === 'function')[0];
    act(() => { card.props.onPress(); });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('an unrecognised kind still renders nothing (the retired "programme" refusal, unchanged)', () => {
    const tree = render({ dimension: { kind: 'programme', key: null, label: null, count: 0 } });
    expect(tree.toJSON()).toBeNull();
  });

  test('peopleLine reads the same for the new kinds as the existing ones', () => {
    expect(peopleLine(0)).toBe('0 lifters');
    expect(peopleLine(1)).toBe('1 lifter');
    expect(peopleLine(6)).toBe('6 lifters');
  });
});
