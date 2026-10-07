/**
 * Keypad (12-BUILD-SPEC sections 1.5, 2 and 3, register D220). Pins: the keys
 * and what each reports (digits, point on weight only, backspace, signed
 * steps), Next on weight and Done on reps, Clear and the keyboard toggle,
 * the tabs, the value-driven disabled states, the spoken labels and the
 * keyboardkey role, the sizes, the bottom inset, and the token-only source
 * guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
import Keypad, { KEY_BACKSPACE } from '../Keypad';

const MINUS = String.fromCharCode(0x2212);

function render(props) {
  let tree;
  act(() => {
    tree = create(<Keypad field="weight" value="72.5" step={2.5} unit="kg" {...props} />);
  });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const key = (tree, label) => one(byLabel(tree, label));
const press = (node) => act(() => { node.props.onPress(); });
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));
function words(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(words);
  return words(node.children);
}
const textHost = (tree, content) => one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === content));

describe('Keypad digits, point and backspace', () => {
  test.each(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])('digit %s calls onKey with it', (d) => {
    const onKey = jest.fn();
    press(key(render({ onKey }), d));
    expect(onKey).toHaveBeenCalledTimes(1);
    expect(onKey).toHaveBeenCalledWith(d);
  });

  test('the point reports "." on weight', () => {
    const onKey = jest.fn();
    press(key(render({ onKey, value: '72' }), 'Decimal point'));
    expect(onKey).toHaveBeenCalledWith('.');
  });

  test('backspace reports the exported KEY_BACKSPACE', () => {
    const onKey = jest.fn();
    press(key(render({ onKey }), 'Delete'));
    expect(onKey).toHaveBeenCalledWith(KEY_BACKSPACE);
    expect(KEY_BACKSPACE).toBe('backspace');
  });

  test('reps has no point key and keeps an empty, hidden cell so the grid does not move', () => {
    const tree = render({ field: 'reps', value: '8', step: 1 });
    expect(byLabel(tree, 'Decimal point')).toHaveLength(0);
    const gap = hosts(tree, (p) => p.importantForAccessibility === 'no-hide-descendants');
    expect(gap).toHaveLength(1);
    expect(flat(gap[0].props.style).height).toBe(52);
  });

  test('pressing a key with no handler does not throw', () => {
    const tree = render({ onKey: undefined, onStep: undefined });
    expect(() => { press(key(tree, '5')); press(key(tree, 'Delete')); press(key(tree, `Add 2.5 kilograms`)); }).not.toThrow();
  });
});

describe('Keypad step keys', () => {
  test('weight: labelled with the step, spoken in kilograms, called with the signed step', () => {
    const onStep = jest.fn();
    const tree = render({ onStep });
    expect(words(tree.toJSON())).toEqual(expect.arrayContaining([`${MINUS}2.5`, '+2.5']));
    press(key(tree, 'Remove 2.5 kilograms'));
    press(key(tree, 'Add 2.5 kilograms'));
    expect(onStep.mock.calls).toEqual([[-2.5], [2.5]]);
  });

  test('reps: a step of 1 reads in reps and is spoken in the singular', () => {
    const onStep = jest.fn();
    const tree = render({ field: 'reps', value: '8', step: 1, onStep });
    expect(words(tree.toJSON())).toEqual(expect.arrayContaining([`${MINUS}1`, '+1']));
    press(key(tree, 'Remove 1 rep'));
    press(key(tree, 'Add 1 rep'));
    expect(onStep.mock.calls).toEqual([[-1], [1]]);
    expect(byLabel(render({ field: 'reps', value: '8', step: 5 }), 'Add 5 reps')).toHaveLength(1);
  });

  test('the unit is spoken in words', () => {
    expect(byLabel(render({ unit: 'lb', step: 5 }), 'Add 5 pounds')).toHaveLength(1);
  });

  test('step keys are primary ink; digits are not', () => {
    const tree = render({});
    expect(flat(textHost(tree, '+2.5').props.style).color).toBe(colors.primary);
    expect(flat(textHost(tree, `${MINUS}2.5`).props.style).color).toBe(colors.primary);
    const digit = flat(textHost(tree, '7').props.style);
    expect(digit.color).toBe(colors.textPrimary);
    expect(digit.fontSize).toBe(type.h3.fontSize);
    expect(digit.fontFamily).toBe(type.w(type.num('h3'), 'semibold').fontFamily);
    expect(digit.fontVariant).toEqual(['tabular-nums']);
  });
});

describe('Keypad Next and Done', () => {
  test('weight: the key reads Next and calls onNext, never onDone', () => {
    const onNext = jest.fn();
    const onDone = jest.fn();
    const tree = render({ onNext, onDone });
    expect(byLabel(tree, 'Done')).toHaveLength(0);
    const next = key(tree, 'Next');
    expect(next.props.accessibilityHint).toBe('Moves to reps');
    press(next);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledWith();
    expect(onDone).not.toHaveBeenCalled();
  });

  test('reps: the same key reads Done and calls onDone, never onNext', () => {
    const onNext = jest.fn();
    const onDone = jest.fn();
    const tree = render({ field: 'reps', value: '8', step: 1, onNext, onDone });
    expect(byLabel(tree, 'Next')).toHaveLength(0);
    const done = key(tree, 'Done');
    expect(done.props.accessibilityHint).toBe('Closes the keypad');
    press(done);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledWith();
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe('Keypad top row', () => {
  test('Clear calls onClear; the keyboard toggle calls onSystemKeyboard', () => {
    const onClear = jest.fn();
    const onSystemKeyboard = jest.fn();
    const tree = render({ onClear, onSystemKeyboard });
    press(key(tree, 'Clear'));
    press(key(tree, 'Use the phone keyboard'));
    expect(onClear).toHaveBeenCalledWith();
    expect(onSystemKeyboard).toHaveBeenCalledWith();
    expect(key(tree, 'Clear').props.accessibilityRole).toBe('button');
    expect(key(tree, 'Use the phone keyboard').props.accessibilityRole).toBe('button');
  });

  test('both are wells with a 48 dp reach', () => {
    const tree = render({});
    ['Clear', 'Use the phone keyboard'].forEach((label) => {
      const node = key(tree, label);
      const s = flat(node.props.style);
      expect(s.backgroundColor).toBe(colors.background);
      expect(s.borderColor).toBe(colors.borderSubtle);
      expect(s.borderRadius).toBe(10);
      expect(node.props.hitSlop).toEqual({ top: 4, bottom: 4, left: 2, right: 2 });
    });
    expect(flat(key(tree, 'Use the phone keyboard').props.style)).toMatchObject({ width: 44, height: 40 });
  });

  test('tabs: the unit and Reps, the field being edited in primary ink, the other muted', () => {
    const weight = render({});
    expect(flat(textHost(weight, 'kg').props.style).color).toBe(colors.textPrimary);
    expect(flat(textHost(weight, 'Reps').props.style).color).toBe(colors.textMuted);
    expect(flat(textHost(weight, 'kg').props.style).fontSize).toBe(type.bodyStrong.fontSize);
    const reps = render({ field: 'reps', value: '8', step: 1 });
    expect(flat(textHost(reps, 'kg').props.style).color).toBe(colors.textMuted);
    expect(flat(textHost(reps, 'Reps').props.style).color).toBe(colors.textPrimary);
  });

  test('the tabs speak what is being edited and its value, and are not controls', () => {
    const tree = render({});
    const tabs = one(byLabel(tree, 'Editing weight, 72.5 kilograms'));
    expect(tabs.props.accessible).toBe(true);
    expect(tabs.props.onPress).toBeUndefined();
    expect(byLabel(render({ value: '' }), 'Editing weight, empty')).toHaveLength(1);
    expect(byLabel(render({ field: 'reps', value: 1, step: 1 }), 'Editing reps, 1 rep')).toHaveLength(1);
    expect(byLabel(render({ field: 'reps', value: 12, step: 1 }), 'Editing reps, 12 reps')).toHaveLength(1);
  });
});

describe('Keypad value-driven states', () => {
  test('the point greys out once the value holds one', () => {
    const node = key(render({ value: '72.5' }), 'Decimal point');
    expect(node.props.disabled).toBe(true);
    expect(node.props.accessibilityState).toEqual({ disabled: true });
    expect(key(render({ value: '72' }), 'Decimal point').props.disabled).toBe(false);
  });

  test('Clear and backspace grey out while the value is empty', () => {
    [undefined, null, ''].forEach((value) => {
      const tree = render({ value });
      expect(key(tree, 'Clear').props.disabled).toBe(true);
      expect(key(tree, 'Delete').props.disabled).toBe(true);
    });
    const tree = render({ value: 0 });
    expect(key(tree, 'Clear').props.disabled).toBe(false);
    expect(key(tree, 'Delete').props.disabled).toBe(false);
  });

  test('digits, steps and Next are never disabled', () => {
    const tree = render({ value: '' });
    ['5', 'Next', 'Add 2.5 kilograms', 'Remove 2.5 kilograms'].forEach((label) => {
      expect(key(tree, label).props.disabled).toBe(false);
    });
  });
});

describe('Keypad accessibility and sizes', () => {
  test('every key on the pad is a keyboardkey; each has a label', () => {
    const tree = render({});
    const keys = hosts(tree, (p) => p.accessibilityRole === 'keyboardkey');
    expect(keys).toHaveLength(15);
    keys.forEach((k) => expect(typeof k.props.accessibilityLabel).toBe('string'));
  });

  test('keys are 52 dp wells on the page colour with a hairline, radius md', () => {
    const s = flat(key(render({}), '1').props.style);
    expect(s.height).toBe(52);
    expect(s.backgroundColor).toBe(colors.background);
    expect(s.borderColor).toBe(colors.borderSubtle);
    expect(s.borderWidth).toBe(1);
    expect(s.borderRadius).toBe(10);
  });

  test('the panel is the section colour under a top hairline', () => {
    const s = flat(render({}).toJSON().props.style);
    expect(s.backgroundColor).toBe(colors.surface);
    expect(s.borderTopWidth).toBe(1);
    expect(s.borderTopColor).toBe(colors.borderSubtle);
  });

  test('the bottom inset is added under the keys, never less than the base padding', () => {
    expect(flat(render({}).toJSON().props.style).paddingBottom).toBe(12);
    expect(flat(render({ safeBottom: 24 }).toJSON().props.style).paddingBottom).toBe(32);
    expect(flat(render({ safeBottom: 2 }).toJSON().props.style).paddingBottom).toBe(12);
  });

  test('the keyboard toggle glyph is Ionicons (no keyboard glyph exists) and the backspace glyph is 22 dp', () => {
    const tree = render({});
    const toggle = key(tree, 'Use the phone keyboard').findAll((n) => n.type === 'Ionicons')[0];
    expect(toggle.props.name).toBe('keypad-outline');
    const back = key(tree, 'Delete').findAll((n) => n.type === 'Ionicons')[0];
    expect(back.props.name).toBe('backspace-outline');
    expect(back.props.size).toBe(22);
  });
});

describe('Keypad time mode', () => {
  const time = (props) => render({ mode: 'time', field: 'reps', value: '1:30', step: 1, ...props });

  test('the step keys read -5 s and +5 s, are spoken in seconds, and call onStep with -5 and 5 whatever step says', () => {
    [1, 2.5, 10].forEach((step) => {
      const onStep = jest.fn();
      const tree = time({ step, onStep });
      expect(words(tree.toJSON())).toEqual(expect.arrayContaining([`${MINUS}5 s`, '+5 s']));
      press(key(tree, 'Remove 5 seconds'));
      press(key(tree, 'Add 5 seconds'));
      expect(onStep.mock.calls).toEqual([[-5], [5]]);
    });
  });

  test('the step keys stay primary ink', () => {
    const tree = time({});
    expect(flat(textHost(tree, '+5 s').props.style).color).toBe(colors.primary);
    expect(flat(textHost(tree, `${MINUS}5 s`).props.style).color).toBe(colors.primary);
  });

  test('there is no decimal point key and the slot stays an empty, hidden cell', () => {
    [time({}), time({ field: 'weight' })].forEach((tree) => {
      expect(byLabel(tree, 'Decimal point')).toHaveLength(0);
      const gap = hosts(tree, (p) => p.importantForAccessibility === 'no-hide-descendants');
      expect(gap).toHaveLength(1);
      expect(flat(gap[0].props.style).height).toBe(52);
      expect(hosts(tree, (p) => p.accessibilityRole === 'keyboardkey')).toHaveLength(14);
    });
  });

  test('digits, Clear, backspace and Done behave as in number mode', () => {
    const onKey = jest.fn();
    const onClear = jest.fn();
    const onDone = jest.fn();
    const tree = time({ onKey, onClear, onDone });
    press(key(tree, '7'));
    press(key(tree, 'Delete'));
    press(key(tree, 'Clear'));
    press(key(tree, 'Done'));
    expect(onKey.mock.calls).toEqual([['7'], [KEY_BACKSPACE]]);
    expect(onClear).toHaveBeenCalledWith();
    expect(onDone).toHaveBeenCalledWith();
  });

  test('Clear and backspace grey out on an empty display string', () => {
    const tree = time({ value: '' });
    expect(key(tree, 'Clear').props.disabled).toBe(true);
    expect(key(tree, 'Delete').props.disabled).toBe(true);
    expect(key(time({ value: '0:05' }), 'Clear').props.disabled).toBe(false);
  });

  test('the displayed time is spoken as typed, with no unit appended', () => {
    expect(byLabel(time({ fieldLabel: 'Time' }), 'Editing Time, 1:30')).toHaveLength(1);
    expect(byLabel(time({ fieldLabel: 'Time', value: '' }), 'Editing Time, empty')).toHaveLength(1);
  });
});

describe('Keypad fieldLabel', () => {
  test('the active tab reads the label instead of Reps, and it is spoken', () => {
    const tree = render({ mode: 'time', field: 'reps', value: '0:45', step: 1, fieldLabel: 'Time' });
    expect(flat(textHost(tree, 'Time').props.style).color).toBe(colors.textPrimary);
    expect(flat(textHost(tree, 'kg').props.style).color).toBe(colors.textMuted);
    expect(words(tree.toJSON())).not.toContain('Reps');
    expect(byLabel(tree, 'Editing Time, 0:45')).toHaveLength(1);
  });

  test('on the weight field the label replaces the unit (Distance)', () => {
    const tree = render({ fieldLabel: 'Distance', unit: 'm', value: '400' });
    expect(flat(textHost(tree, 'Distance').props.style).color).toBe(colors.textPrimary);
    expect(flat(textHost(tree, 'Reps').props.style).color).toBe(colors.textMuted);
    expect(words(tree.toJSON())).not.toContain('m');
    expect(byLabel(tree, 'Editing Distance, 400 m')).toHaveLength(1);
  });

  test('without a label, or with an empty one, the tabs and speech are exactly as before', () => {
    [undefined, ''].forEach((fieldLabel) => {
      const tree = render({ fieldLabel });
      expect(textHost(tree, 'kg')).toBeTruthy();
      expect(textHost(tree, 'Reps')).toBeTruthy();
      expect(byLabel(tree, 'Editing weight, 72.5 kilograms')).toHaveLength(1);
    });
  });

  test('number mode is the default and keeps its point key and step labels', () => {
    const tree = render({ mode: 'number' });
    expect(byLabel(tree, 'Decimal point')).toHaveLength(1);
    expect(byLabel(tree, 'Add 2.5 kilograms')).toHaveLength(1);
    expect(hosts(tree, (p) => p.accessibilityRole === 'keyboardkey')).toHaveLength(15);
  });
});

describe('Keypad test ids', () => {
  const byId = (tree, id) => hosts(tree, (p) => p.testID === id);
  const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const OTHERS = [
    'volyume-key-backspace', 'volyume-key-step-down', 'volyume-key-step-up',
    'volyume-key-action', 'volyume-key-clear', 'volyume-key-keyboard',
  ];

  test('number mode on the weight field carries every id exactly once', () => {
    const tree = render({});
    [...DIGITS.map((d) => `volyume-key-${d}`), 'volyume-key-point', ...OTHERS].forEach((id) => {
      expect(byId(tree, id)).toHaveLength(1);
    });
  });

  test('each id drives the control it names', () => {
    const onKey = jest.fn();
    const onStep = jest.fn();
    const onNext = jest.fn();
    const onClear = jest.fn();
    const onSystemKeyboard = jest.fn();
    const tree = render({ onKey, onStep, onNext, onClear, onSystemKeyboard });
    const tap = (id) => press(one(byId(tree, id)));
    tap('volyume-key-7');
    tap('volyume-key-point');
    tap('volyume-key-backspace');
    tap('volyume-key-step-down');
    tap('volyume-key-step-up');
    tap('volyume-key-action');
    tap('volyume-key-clear');
    tap('volyume-key-keyboard');
    expect(onKey.mock.calls).toEqual([['7'], ['.'], [KEY_BACKSPACE]]);
    expect(onStep.mock.calls).toEqual([[-2.5], [2.5]]);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onSystemKeyboard).toHaveBeenCalledTimes(1);
  });

  test('the point id is absent in time mode and on reps; the rest stay', () => {
    [render({ mode: 'time', field: 'reps', value: '1:30', step: 1 }), render({ field: 'reps', value: '8', step: 1 })].forEach((tree) => {
      expect(byId(tree, 'volyume-key-point')).toHaveLength(0);
      [...DIGITS.map((d) => `volyume-key-${d}`), ...OTHERS].forEach((id) => {
        expect(byId(tree, id)).toHaveLength(1);
      });
    });
  });
});

describe('Keypad source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'Keypad.js'), 'utf8');
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
  test('no estimated max, plate readout, RPE or RIR', () => {
    expect(SRC).not.toMatch(/\b(e1rm|1rm|est\.? ?max|plate|rpe|rir)\b/i);
  });
});
