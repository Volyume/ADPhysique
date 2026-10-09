/**
 * TextField `well` (D221 visual law V9, lane 2B). Pins: the well is a
 * `background` fill, a 1 dp `borderSubtle` edge, `radius.md`, 44 dp tall, and
 * a 1 dp `primary` ring while focused; absent the prop, the field is
 * unchanged for every other caller (surface2, 1.5 dp `border`, 50 dp).
 */
import { create, act } from 'react-test-renderer';
// D104-1 phase 2b (2026-10-09): Text/TextInput are the house primitives
import TextInput from '../TextInput';

import TextField from '../TextField';
import ComposerInput from '../community/ComposerInput';
import { colors, radius } from '../../styles/theme';

function render(el) {
  let tree;
  act(() => { tree = create(el); });
  return tree;
}
const flat = (style) => [].concat(style).flat(3).filter(Boolean).reduce((a, s) => ({ ...a, ...s }), {});

describe('the well', () => {
  test('is background fill, a 1 dp subtle edge, radius.md and 44 dp tall', () => {
    const tree = render(<TextField well value="" onChangeText={() => {}} accessibilityLabel="x" />);
    const style = flat(tree.root.findByType(TextInput).parent.props.style);
    expect(style.backgroundColor).toBe(colors.background);
    expect(style.borderColor).toBe(colors.borderSubtle);
    expect(style.borderWidth).toBe(1);
    expect(style.borderRadius).toBe(radius.md);
    expect(style.minHeight).toBe(44);
  });

  test('shows a 1 dp primary ring while focused', () => {
    const tree = render(<TextField well value="" onChangeText={() => {}} accessibilityLabel="x" />);
    act(() => { tree.root.findByType(TextInput).props.onFocus({}); });
    const style = flat(tree.root.findByType(TextInput).parent.props.style);
    expect(style.borderColor).toBe(colors.primary);
    expect(style.borderWidth).toBe(1);
  });

  test('without the prop the field is as it was', () => {
    const tree = render(<TextField value="" onChangeText={() => {}} accessibilityLabel="x" />);
    const style = flat(tree.root.findByType(TextInput).parent.props.style);
    expect(style.backgroundColor).toBe(colors.surface2);
    expect(style.borderWidth).toBe(1.5);
    expect(style.minHeight).toBe(50);
  });

  test('ComposerInput passes it through', () => {
    const tree = render(<ComposerInput well value="" onChangeText={() => {}} accessibilityLabel="Message" />);
    const style = flat(tree.root.findByType(TextInput).parent.props.style);
    expect(style.backgroundColor).toBe(colors.background);
  });
});
