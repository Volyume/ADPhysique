/**
 * WaterRow (D230 R4, R14 and 4.6, food level-up 2026-10-16), moved out of
 * DiaryScreen.js as a named component.
 *
 * What this suite pins, and why each pin is written to fail:
 *  - The control is the house Stepper with its 48 dp buttons (the
 *    hand-rolled ones were 36 dp): a tap moves 250 ml, a hold moves 500 ml
 *    each way (what the one-time hint teaches), and the row hands its caller
 *    the DELTA, never a total, so the database can apply it atomically.
 *  - The value reads "1.5 of 2.5 litres" (not "1.5 / 2.5 L") and is itself
 *    the control that opens the daily target picker, for a sighted tap and
 *    for a screen reader (the adjustable's activate action).
 *  - R2: the glyph is ink; the fill keeps its tint, because it is a chart.
 *  - The hint caption still renders when asked and dismisses through its
 *    caller.
 */
import { create, act } from 'react-test-renderer';

jest.mock('../../../lib/haptics', () => ({ selection: jest.fn(), press: jest.fn(), commit: jest.fn() }));

import WaterRow, { waterValueText } from '../WaterRow';
import PressableCard from '../../PressableCard';
import { colors } from '../../../styles/theme';
import { touchTarget } from '../../../styles/layout';

const ADD = 'Add 250 millilitres of water. Hold to add 500.';
const REMOVE = 'Remove 250 millilitres of water. Hold to remove 500.';

function flattenStyle(style) {
  if (!style) return {};
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle));
  return typeof style === 'object' ? style : {};
}

function render(props = {}) {
  const handlers = {
    onAdd: jest.fn(), onSub: jest.fn(), onEditTarget: jest.fn(), onDismissHint: jest.fn(),
  };
  let tree;
  act(() => {
    tree = create(<WaterRow ml={1500} targetMl={2500} {...handlers} {...props} />);
  });
  return { tree, ...handlers, ...props };
}

const pressable = (tree, label) => tree.root.findAllByType(PressableCard)
  .find((n) => n.props.accessibilityLabel === label);

describe('WaterRow: the house Stepper', () => {
  test('the value reads "1.5 of 2.5 litres"', () => {
    const { tree } = render();
    expect(JSON.stringify(tree.toJSON())).toContain('1.5 of 2.5 litres');
    expect(waterValueText(0, 3000)).toBe('0.0 of 3.0 litres');
  });

  test('both buttons are 48 dp', () => {
    const { tree } = render();
    [ADD, REMOVE].forEach((label) => {
      const style = flattenStyle(pressable(tree, label).props.style);
      expect(style.width).toBe(touchTarget.minimum);
      expect(style.height).toBe(touchTarget.minimum);
    });
    expect(touchTarget.minimum).toBe(48);
  });

  test('a tap moves 250 ml and a hold moves 500 ml, each way, as a delta', () => {
    const { tree, onAdd, onSub } = render();
    act(() => { pressable(tree, ADD).props.onPress(); });
    act(() => { pressable(tree, REMOVE).props.onPress(); });
    act(() => { pressable(tree, ADD).props.onLongPress(); });
    act(() => { pressable(tree, REMOVE).props.onLongPress(); });
    expect(onAdd.mock.calls).toEqual([[250], [500]]);
    expect(onSub.mock.calls).toEqual([[250], [500]]);
  });

  test('at zero the remove button is disabled', () => {
    const { tree } = render({ ml: 0 });
    expect(pressable(tree, REMOVE).props.disabled).toBe(true);
  });

  test('the value opens the target picker, by tap and by the screen reader\'s activate', () => {
    const { tree, onEditTarget } = render();
    const value = pressable(tree, 'Water 1.5 of 2.5 litres. Change your daily target.');
    expect(value).toBeDefined();
    expect(flattenStyle(value.props.style).minHeight).toBeGreaterThanOrEqual(touchTarget.minimum);
    act(() => { value.props.onPress(); });
    expect(onEditTarget).toHaveBeenCalledTimes(1);
    const adjustable = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'adjustable')[0];
    expect(adjustable.props.accessibilityActions.map((a) => a.name)).toContain('activate');
    act(() => { adjustable.props.onAccessibilityAction({ nativeEvent: { actionName: 'activate' } }); });
    expect(onEditTarget).toHaveBeenCalledTimes(2);
  });
});

describe('WaterRow: ink glyph, chart fill (R2)', () => {
  test('the glyph is ink and the fill keeps its tint', () => {
    const { tree } = render();
    const glyph = tree.root.findAll((n) => n.type === 'Ionicons' && n.props.name === 'water-outline')[0];
    expect(glyph.props.color).toBe(colors.textSecondary);
    const fill = tree.root.findAll((n) => typeof n.type === 'string' && n.props?.testID === 'water-fill')[0];
    expect(flattenStyle(fill.props.style).backgroundColor).toBe(colors.primary);
    expect(flattenStyle(fill.props.style).width).toBe('60%');
  });
});

describe('WaterRow: the one-time hint', () => {
  test('shows when asked and dismisses through its caller', () => {
    const { tree, onDismissHint } = render({ showHint: true });
    expect(JSON.stringify(tree.toJSON())).toContain('Hold to add 500 ml.');
    const gotIt = tree.root.findAll((n) => n.props?.accessibilityLabel === 'Got it, dismiss this hint' && typeof n.props?.onPress === 'function')[0];
    act(() => { gotIt.props.onPress(); });
    expect(onDismissHint).toHaveBeenCalledTimes(1);
    const { tree: hidden } = render();
    expect(JSON.stringify(hidden.toJSON())).not.toContain('Hold to add 500 ml.');
  });
});
