/**
 * KeyboardBar (register D220, addenda 18 and 21). Pins: the four actions and
 * their test ids (step down, step up, Next only when onNext is given, and the
 * last action), the step labels and their spoken forms (number mode and the
 * fixed 5 s of time mode), the signed values handed to onStep, Next and the
 * last action each calling their callback once, the Log / Done label and its
 * spoken form (Log set / Done), the 20 dp glyphs in primary ink, the 48 dp
 * unboxed action rows, the bar's own hairline, fill and padding, and the
 * token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, iconSize, spacing } from '../../../../styles/theme';
import { touchTarget } from '../../../../styles/layout';
import KeyboardBar from '../KeyboardBar';

function render(props) {
  let tree;
  act(() => { tree = create(<KeyboardBar {...props} />); });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byId = (tree, id) => hosts(tree, (p) => p.testID === id);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node, ...args) => act(() => { node.props.onPress(...args); });
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));
function words(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(words);
  return words(node.children);
}
const labelOf = (node) => node.findAll((n) => n.type === 'Text').map((n) => words(n).join('')).join('');
const glyphOf = (node) => one(node.findAll((n) => n.type === 'Ionicons'));
// The bar is the host that carries the hairline.
const barOf = (tree) => one(hosts(tree, (p) => flat(p.style).borderTopWidth === 1));

describe('KeyboardBar actions', () => {
  test('without onStep no step key is drawn: the reps well has nothing to step (D220 addendum 24)', () => {
    const tree = render({ onDone: jest.fn() });
    expect(byId(tree, 'volyume-bar-step-down')).toHaveLength(0);
    expect(byId(tree, 'volyume-bar-step-up')).toHaveLength(0);
    one(byId(tree, 'volyume-bar-done'));
  });

  test('step down, step up and the last action are drawn with onStep; Next only when onNext is given', () => {
    const without = render({ onStep: jest.fn(), onDone: jest.fn() });
    one(byId(without, 'volyume-bar-step-down'));
    one(byId(without, 'volyume-bar-step-up'));
    one(byId(without, 'volyume-bar-done'));
    expect(byId(without, 'volyume-bar-next')).toHaveLength(0);

    const withNext = render({ onStep: jest.fn(), onNext: jest.fn(), onDone: jest.fn() });
    one(byId(withNext, 'volyume-bar-next'));
    one(byId(withNext, 'volyume-bar-done'));
  });

  test('number mode: the step reads "2.5" on both keys and is spoken with its unit', () => {
    const tree = render({ step: 2.5, unit: 'kg', onStep: jest.fn(), onDone: jest.fn() });
    const down = one(byId(tree, 'volyume-bar-step-down'));
    const up = one(byId(tree, 'volyume-bar-step-up'));
    expect(labelOf(down)).toBe('2.5');
    expect(labelOf(up)).toBe('2.5');
    expect(down.props.accessibilityLabel).toBe('Remove 2.5 kilograms');
    expect(up.props.accessibilityLabel).toBe('Add 2.5 kilograms');
  });

  test('number mode: stepDown is its own key: label, spoken and the signed delta (D220 addendum 37)', () => {
    const onStep = jest.fn();
    const tree = render({ step: 4, stepDown: 2, unit: 'kg', onStep, onDone: jest.fn() });
    const down = one(byId(tree, 'volyume-bar-step-down'));
    const up = one(byId(tree, 'volyume-bar-step-up'));
    expect(labelOf(down)).toBe('2');
    expect(labelOf(up)).toBe('4');
    expect(down.props.accessibilityLabel).toBe('Remove 2 kilograms');
    press(down);
    press(up);
    expect(onStep).toHaveBeenNthCalledWith(1, -2);
    expect(onStep).toHaveBeenNthCalledWith(2, 4);
  });

  test('number mode: onStep gets -step and +step', () => {
    const onStep = jest.fn();
    const tree = render({ step: 2.5, unit: 'kg', onStep, onDone: jest.fn() });
    press(one(byId(tree, 'volyume-bar-step-down')));
    press(one(byId(tree, 'volyume-bar-step-up')));
    expect(onStep).toHaveBeenCalledTimes(2);
    expect(onStep).toHaveBeenNthCalledWith(1, -2.5);
    expect(onStep).toHaveBeenNthCalledWith(2, 2.5);
  });

  test('time mode: the keys read "5 s" and step by -5 and 5 whatever step says', () => {
    const onStep = jest.fn();
    const tree = render({ mode: 'time', step: 2.5, unit: 'kg', onStep, onDone: jest.fn() });
    const down = one(byId(tree, 'volyume-bar-step-down'));
    const up = one(byId(tree, 'volyume-bar-step-up'));
    expect(labelOf(down)).toBe('5 s');
    expect(labelOf(up)).toBe('5 s');
    expect(down.props.accessibilityLabel).toBe('Remove 5 seconds');
    expect(up.props.accessibilityLabel).toBe('Add 5 seconds');
    press(down);
    press(up);
    expect(onStep).toHaveBeenNthCalledWith(1, -5);
    expect(onStep).toHaveBeenNthCalledWith(2, 5);
  });

  test('Next and the last action each call their callback once', () => {
    const onNext = jest.fn();
    const onDone = jest.fn();
    const tree = render({ onStep: jest.fn(), onNext, onDone });
    press(one(byId(tree, 'volyume-bar-next')));
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onDone).not.toHaveBeenCalled();
    press(one(byId(tree, 'volyume-bar-done')));
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test('Next reads "Next" and is spoken "Next"', () => {
    const tree = render({ onStep: jest.fn(), onNext: jest.fn(), onDone: jest.fn() });
    const next = one(byId(tree, 'volyume-bar-next'));
    expect(labelOf(next)).toBe('Next');
    expect(next.props.accessibilityLabel).toBe('Next');
  });

  test('doneLabel "Log" reads "Log" and is spoken "Log set"', () => {
    const tree = render({ doneLabel: 'Log', onStep: jest.fn(), onDone: jest.fn() });
    const done = one(byId(tree, 'volyume-bar-done'));
    expect(labelOf(done)).toBe('Log');
    expect(done.props.accessibilityLabel).toBe('Log set');
  });

  test('by default the last action reads "Done" and is spoken "Done"', () => {
    const tree = render({ onStep: jest.fn(), onDone: jest.fn() });
    const done = one(byId(tree, 'volyume-bar-done'));
    expect(labelOf(done)).toBe('Done');
    expect(done.props.accessibilityLabel).toBe('Done');
  });
});

describe('KeyboardBar look', () => {
  const GLYPHS = [
    ['volyume-bar-step-down', 'remove'],
    ['volyume-bar-step-up', 'add'],
    ['volyume-bar-next', 'arrow-forward'],
    ['volyume-bar-done', 'checkmark'],
  ];

  test('the glyphs are remove, add, arrow-forward and checkmark, 20 dp, in primary ink', () => {
    const tree = render({ onStep: jest.fn(), onNext: jest.fn(), onDone: jest.fn() });
    GLYPHS.forEach(([id, name]) => {
      const glyph = glyphOf(one(byId(tree, id)));
      expect(glyph.props.name).toBe(name);
      expect(glyph.props.size).toBe(iconSize.md);
      expect(glyph.props.size).toBe(20);
      expect(glyph.props.color).toBe(colors.textPrimary);
    });
  });

  test('each action is a 48 dp minimum-height button row with no fill or border', () => {
    const tree = render({ onStep: jest.fn(), onNext: jest.fn(), onDone: jest.fn() });
    GLYPHS.forEach(([id]) => {
      const action = one(byId(tree, id));
      const s = flat(action.props.style);
      expect(s.minHeight).toBe(touchTarget.minimum);
      expect(s.minHeight).toBe(48);
      expect(s.flexDirection).toBe('row');
      expect(s.alignItems).toBe('center');
      expect(s.backgroundColor).toBeUndefined();
      expect(s.borderWidth).toBeUndefined();
      expect(s.borderColor).toBeUndefined();
      expect(s.borderRadius).toBeUndefined();
      expect(action.props.accessibilityRole).toBe('button');
    });
  });

  test('the bar: a 1 dp top border in borderSubtle, the background fill, 16 dp left and 8 dp right padding', () => {
    const s = flat(barOf(render({ onStep: jest.fn(), onDone: jest.fn() })).props.style);
    expect(s.borderTopWidth).toBe(1);
    expect(s.borderTopColor).toBe(colors.borderSubtle);
    expect(s.backgroundColor).toBe(colors.background);
    expect(s.paddingLeft).toBe(spacing.lg);
    expect(s.paddingLeft).toBe(16);
    expect(s.paddingRight).toBe(spacing.sm);
    expect(s.paddingRight).toBe(8);
    expect(s.flexDirection).toBe('row');
    expect(s.minHeight).toBe(touchTarget.minimum);
  });

  test('paddingBottom is safeBottom: 0 by default, the given inset when passed', () => {
    expect(flat(barOf(render({ onStep: jest.fn(), onDone: jest.fn() })).props.style).paddingBottom).toBe(0);
    expect(flat(barOf(render({ safeBottom: 34, onStep: jest.fn(), onDone: jest.fn() })).props.style).paddingBottom).toBe(34);
  });
});

describe('KeyboardBar source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'KeyboardBar.js'), 'utf8');
  test('no hex or rgb literal', () => {
    expect(SRC).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(SRC).not.toMatch(/rgba?\(/);
  });
  test('no fontSize or fontWeight literal', () => {
    expect(SRC).not.toMatch(/fontSize\s*:/);
    expect(SRC).not.toMatch(/fontWeight\s*:/);
  });
  test('no em dash', () => {
    expect(SRC).not.toContain(String.fromCharCode(0x2014));
  });
});
