/**
 * SetRow (12-BUILD-SPEC sections 2, 2a, 2b and 3, register D220). Pins: the
 * three row states and the editing state (wells and check), the markers, the
 * Last cell (plain, stale, pressable), the Target cell (value, rule, the record
 * tag, the record target), every callback and its argument, the test ids, the
 * sizes, the accessibility labels and the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
import SetRow, { SET_COLUMNS } from '../SetRow';

const DOT = String.fromCharCode(0x00b7);
const TIMES = String.fromCharCode(0x00d7);

const BASE = {
  marker: 2,
  last: { text: `72.5 ${TIMES} 8`, stale: false },
  target: { value: `70 ${TIMES} 6-10`, rule: '+2.5 at 10' },
  wells: { weight: 70, reps: 8, state: 'next' },
  check: 'next',
};

function render(props) {
  let tree;
  act(() => { tree = create(<SetRow {...BASE} {...props} />); });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const byId = (tree, id) => hosts(tree, (p) => p.testID === id);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node) => act(() => { node.props.onPress(); });
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));
function words(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(words);
  return words(node.children);
}
const textIn = (node) => node.findAll((n) => n.type === 'Text')[0];
const wellText = (tree, label) => flat(textIn(one(byLabel(tree, label))).props.style);
const wellsBox = (tree) => one(hosts(tree, (p) => flat(p.style).width === 98));
const circleOf = (touchable) => touchable.findAll((n) => n.type === 'View')[0];
const tickOf = (touchable) => touchable.findAll((n) => n.type === 'Ionicons')[0];

describe('SetRow wells', () => {
  test.each([['logged'], ['next']])('%s: white semibold values on the page colour inside a hairline', (state) => {
    const tree = render({ wells: { weight: 70, reps: 8, state }, check: state });
    const box = flat(wellsBox(tree).props.style);
    expect(box.backgroundColor).toBe(colors.background);
    expect(box.borderColor).toBe(colors.borderSubtle);
    expect(box.borderWidth).toBe(1);
    expect(box.height).toBe(44);
    expect(box.width).toBe(98);
    const s = wellText(tree, 'Set 2 weight');
    expect(s.color).toBe(colors.textPrimary);
    expect(s.fontFamily).toBe(type.w(type.num('bodyStrong'), 'semibold').fontFamily);
    expect(s.fontSize).toBe(type.bodyStrong.fontSize);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textPrimary);
  });

  test('pending: placeholder ink, the regular numeric face', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'pending' }, check: 'pending' });
    const s = wellText(tree, 'Set 2 weight');
    expect(s.color).toBe(colors.textDisabled);
    expect(s.fontFamily).toBe(type.bodyStrong.fontFamily);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textDisabled);
  });

  test('editing weight: amber edge, the weight in amber, reps in white', () => {
    const tree = render({ wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    expect(flat(wellsBox(tree).props.style).borderColor).toBe(colors.primary);
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.primary);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textPrimary);
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityState.selected).toBe(true);
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityState.selected).toBe(false);
  });

  test('editing reps: the reverse', () => {
    const tree = render({ wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'reps' } });
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.textPrimary);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.primary);
  });

  test('outside editing the edge is the hairline', () => {
    expect(flat(wellsBox(render({})).props.style).borderColor).toBe(colors.borderSubtle);
  });

  test('values are read out; zero is a value, empty is empty', () => {
    const tree = render({ wells: { weight: 0, reps: '', state: 'next' } });
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityValue).toEqual({ text: '0' });
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityValue).toEqual({ text: 'empty' });
  });

  test('each cell is 44 dp tall with a 2 dp slop for a 48 dp reach, one line, shrinks before it clips', () => {
    const cell = one(byLabel(render({}), 'Set 2 weight'));
    expect(cell.props.hitSlop).toEqual({ top: 2, bottom: 2, left: 0, right: 0 });
    const text = textIn(cell);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
  });

  test('onPressWell is called with the field', () => {
    const onPressWell = jest.fn();
    const tree = render({ onPressWell });
    press(one(byLabel(tree, 'Set 2 weight')));
    press(one(byLabel(tree, 'Set 2 reps')));
    expect(onPressWell.mock.calls).toEqual([['weight'], ['reps']]);
  });

  test('without onPressWell the wells are disabled, not dead buttons', () => {
    const cell = one(byLabel(render({}), 'Set 2 weight'));
    expect(cell.props.disabled).toBe(true);
    expect(cell.props.accessibilityState.disabled).toBe(true);
  });
});

describe('SetRow check', () => {
  test('logged: amber fill, onPrimary tick', () => {
    const tree = render({ check: 'logged' });
    const touch = one(byLabel(tree, 'Set 2 logged'));
    expect(flat(circleOf(touch).props.style).backgroundColor).toBe(colors.primary);
    expect(tickOf(touch).props.color).toBe(colors.onPrimary);
    expect(tickOf(touch).props.name).toBe('checkmark');
  });

  test('next: a 1.5 dp amber ring with no fill, amber tick', () => {
    const tree = render({ check: 'next' });
    const touch = one(byLabel(tree, 'Log set 2'));
    const s = flat(circleOf(touch).props.style);
    expect(s.borderWidth).toBe(1.5);
    expect(s.borderColor).toBe(colors.primary);
    expect(s.backgroundColor).toBeUndefined();
    expect(tickOf(touch).props.color).toBe(colors.primary);
  });

  test('pending: raised grey fill, disabled-ink tick', () => {
    const tree = render({ check: 'pending' });
    const touch = one(byLabel(tree, 'Set 2 not logged yet'));
    expect(flat(circleOf(touch).props.style).backgroundColor).toBe(colors.surface3);
    expect(tickOf(touch).props.color).toBe(colors.textDisabled);
  });

  test('a 32 dp circle in a 36 by 48 target with a 6 dp side slop (48 dp reach)', () => {
    const touch = one(byLabel(render({}), 'Log set 2'));
    const s = flat(circleOf(touch).props.style);
    expect(s.width).toBe(32);
    expect(s.height).toBe(32);
    expect(s.borderRadius).toBe(16);
    const box = flat(touch.props.style);
    expect(box.width).toBe(SET_COLUMNS.check);
    expect(box.height).toBe(48);
    expect(touch.props.hitSlop).toEqual({ top: 0, bottom: 0, left: 6, right: 6 });
  });

  test('onCheck is called with no arguments', () => {
    const onCheck = jest.fn();
    const tree = render({ onCheck });
    press(one(byLabel(tree, 'Log set 2')));
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onCheck).toHaveBeenCalledWith();
  });

  test('labels name the set kind', () => {
    expect(byLabel(render({ marker: 'W' }), 'Log warm-up')).toHaveLength(1);
    expect(byLabel(render({ marker: 'F' }), 'Log failure set')).toHaveLength(1);
  });
});

describe('SetRow test ids', () => {
  test('the next row carries volyume-btn-complete-set on its check by default', () => {
    const tree = render({ check: 'next' });
    expect(one(byId(tree, 'volyume-btn-complete-set')).props.accessibilityLabel).toBe('Log set 2');
  });
  test('logged and pending rows do not', () => {
    expect(byId(render({ check: 'logged' }), 'volyume-btn-complete-set')).toHaveLength(0);
    expect(byId(render({ check: 'pending' }), 'volyume-btn-complete-set')).toHaveLength(0);
  });
  test('testIDs map onto the row parts and override the default', () => {
    const testIDs = { row: 'r', marker: 'm', last: 'l', weight: 'w', reps: 'p', check: 'c' };
    const tree = render({ testIDs, onPressMarker: () => {}, onPressLast: () => {} });
    Object.values(testIDs).forEach((id) => one(byId(tree, id)));
    expect(byId(tree, 'volyume-btn-complete-set')).toHaveLength(0);
    expect(one(byId(tree, 'w')).props.accessibilityLabel).toBe('Set 2 weight');
    expect(one(byId(tree, 'p')).props.accessibilityLabel).toBe('Set 2 reps');
  });
});

describe('SetRow marker', () => {
  test('a number is secondary ink at the numeric label role', () => {
    const tree = render({ marker: 3 });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === '3'));
    const s = flat(text.props.style);
    expect(s.color).toBe(colors.textSecondary);
    expect(s.fontSize).toBe(type.label.fontSize);
    expect(s.fontVariant).toEqual(['tabular-nums']);
  });

  test('W is a 24 dp badge: primary tint, primary glyph, caption strong', () => {
    const tree = render({ marker: 'W' });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === 'W'));
    const s = flat(text.props.style);
    expect(s.color).toBe(colors.primary);
    expect(s.fontSize).toBe(type.captionStrong.fontSize);
    const badge = one(hosts(tree, (p) => flat(p.style).width === 24));
    const b = flat(badge.props.style);
    expect(b.height).toBe(24);
    expect(b.backgroundColor).toBe(colors.primaryBg);
    expect(b.borderRadius).toBe(6);
  });

  test('F is the error tint with the error glyph', () => {
    const tree = render({ marker: 'F' });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === 'F'));
    expect(flat(text.props.style).color).toBe(colors.error);
    expect(flat(one(hosts(tree, (p) => flat(p.style).width === 24)).props.style).backgroundColor).toBe(colors.errorBg);
  });

  test('not a control without onPressMarker; a button with it, called with no arguments', () => {
    expect(byLabel(render({}), 'Set type for set 2')).toHaveLength(0);
    const onPressMarker = jest.fn();
    const tree = render({ onPressMarker });
    const button = one(byLabel(tree, 'Set type for set 2'));
    expect(button.props.accessibilityRole).toBe('button');
    press(button);
    expect(onPressMarker).toHaveBeenCalledTimes(1);
  });
});

describe('SetRow Last cell (2a)', () => {
  const lastText = (tree, text) => flat(one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === text)).props.style);

  test('plain: the set in secondary ink (history, not the live number), one line', () => {
    // Founder device verdict 2026-10-08: a bold white Last value read as the
    // live number beside the wells; history is quiet.
    const text = `72.5 ${TIMES} 8`;
    const tree = render({});
    const s = lastText(tree, text);
    expect(s.color).toBe(colors.textSecondary);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === text)).props.numberOfLines).toBe(1);
  });

  test('stale: muted ink with a leading middle dot', () => {
    const tree = render({ last: { text: `40 ${TIMES} 10`, stale: true } });
    const shown = `${DOT} 40 ${TIMES} 10`;
    expect(lastText(tree, shown).color).toBe(colors.textMuted);
  });

  test('without onPressLast it is not a control', () => {
    expect(byLabel(render({}), "Use last session's set")).toHaveLength(0);
  });

  test("with onPressLast it is a 48 dp button, \"Use last session's set\", and the press has no arguments", () => {
    const onPressLast = jest.fn();
    const tree = render({ onPressLast });
    const button = one(byLabel(tree, "Use last session's set"));
    expect(button.props.accessibilityRole).toBe('button');
    expect(flat(button.props.style).minHeight).toBe(48);
    expect(flat(button.props.style).width).toBe(SET_COLUMNS.last);
    expect(button.props.accessibilityValue).toEqual({ text: `72.5 ${TIMES} 8` });
    press(button);
    expect(onPressLast).toHaveBeenCalledTimes(1);
    expect(onPressLast).toHaveBeenCalledWith();
  });

  test('a stale value says so when spoken', () => {
    const tree = render({ onPressLast: () => {}, last: { text: `40 ${TIMES} 10`, stale: true } });
    expect(one(byLabel(tree, "Use last session's set")).props.accessibilityValue.text)
      .toBe(`40 ${TIMES} 10, from an earlier session`);
  });

  test('no last: an empty cell that keeps its width and is not a control', () => {
    const tree = render({ last: null, onPressLast: () => {}, testIDs: { last: 'l' } });
    expect(byLabel(tree, "Use last session's set")).toHaveLength(0);
    expect(flat(one(byId(tree, 'l')).props.style).width).toBe(SET_COLUMNS.last);
  });
});

describe('SetRow Target cell', () => {
  const targetText = (tree, text) => one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === text));

  test('the value over the rule; the rule is secondary ink at the numeric label role', () => {
    const tree = render({});
    const rule = targetText(tree, '+2.5 at 10');
    const s = flat(rule.props.style);
    expect(s.color).toBe(colors.textSecondary);
    expect(s.fontSize).toBe(type.label.fontSize);
    expect(rule.props.numberOfLines).toBe(1);
    expect(flat(targetText(tree, `70 ${TIMES} 6-10`).props.style).color).toBe(colors.textPrimary);
  });

  test('pending rows: values drop to secondary ink at the regular weight (spec table)', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'pending' }, check: 'pending' });
    const s = flat(targetText(tree, `70 ${TIMES} 6-10`).props.style);
    expect(s.color).toBe(colors.textSecondary);
    expect(s.fontFamily).toBe(type.body.fontFamily);
    const last = flat(targetText(tree, `72.5 ${TIMES} 8`).props.style);
    expect(last.color).toBe(colors.textSecondary);
    expect(last.fontFamily).toBe(type.body.fontFamily);
  });

  test('no tag unless record is set', () => {
    expect(byLabel(render({}), 'Personal record')).toHaveLength(0);
  });

  test('record: a PR tag after the value, 18 dp, primary tint, primary caption strong', () => {
    const tree = render({ record: true });
    const tag = one(byLabel(tree, 'Personal record'));
    expect(tag.props.accessible).toBe(true);
    const s = flat(tag.props.style);
    expect(s.minHeight).toBe(18);
    expect(s.paddingHorizontal).toBe(4);
    expect(s.borderRadius).toBe(6);
    expect(s.backgroundColor).toBe(colors.primaryBg);
    const text = flat(textIn(tag).props.style);
    expect(words(tag).join('')).toBe('PR');
    expect(text.color).toBe(colors.primary);
    expect(text.fontSize).toBe(type.captionStrong.fontSize);
  });

  test('prTarget: the PR tag then the set on the second line, replacing the rule', () => {
    const tree = render({ prTarget: { weight: 70, reps: 9 } });
    const group = one(byLabel(tree, 'A record at 70 kilograms is 9 reps'));
    expect(group.props.accessible).toBe(true);
    expect(words(group).join('')).toBe(`PR70 ${TIMES} 9`);
    const set = one(group.findAll((n) => n.type === 'Text' && words(n).join('') === `70 ${TIMES} 9`));
    const s = flat(set.props.style);
    expect(s.color).toBe(colors.textPrimary);
    expect(s.fontSize).toBe(type.label.fontSize);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(set.props.numberOfLines).toBe(1);
    const tag = flat(one(group.findAll((n) => n.type === 'View' && flat(n.props.style).minHeight === 18)).props.style);
    expect(tag.backgroundColor).toBe(colors.primaryBg);
    expect(words(tree.toJSON())).not.toContain('+2.5 at 10');
  });

  test('prTarget speaks one rep in the singular', () => {
    expect(byLabel(render({ prTarget: { weight: 75, reps: 1 } }), 'A record at 75 kilograms is 1 rep')).toHaveLength(1);
  });

  test('prTarget null shows the rule as before; record and prTarget are independent', () => {
    const tree = render({ prTarget: null, record: true });
    expect(words(tree.toJSON())).toContain('+2.5 at 10');
    expect(byLabel(tree, 'Personal record')).toHaveLength(1);
  });

  test('no target at all leaves an empty cell', () => {
    expect(() => render({ target: null })).not.toThrow();
  });
});

describe('SetRow frame', () => {
  test('64 dp minimum, hairline below, the drawing\'s column grid', () => {
    const root = render({ testIDs: { row: 'r' } });
    const row = one(byId(root, 'r'));
    const s = flat(row.props.style);
    expect(s.minHeight).toBe(64);
    expect(s.borderBottomWidth).toBe(1);
    expect(s.borderBottomColor).toBe(colors.borderSubtle);
    expect(s.paddingLeft).toBe(16);
    expect(s.paddingRight).toBe(12);
    expect(s.gap).toBe(6);
    expect(SET_COLUMNS).toEqual({ marker: 30, last: 72, wells: 98, check: 36 });
  });

  test('cell text never widens a column: one line, shrinkable', () => {
    const tree = render({ onPressLast: () => {}, record: true });
    const longText = `1000.25 ${TIMES} 100`;
    const t2 = render({ last: { text: longText, stale: false } });
    const text = one(t2.root.findAll((n) => n.type === 'Text' && words(n).join('') === longText));
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBe(true);
    const value = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === `70 ${TIMES} 6-10`));
    expect(flat(value.props.style).flexShrink).toBe(1);
    expect(value.props.numberOfLines).toBe(1);
  });
});

describe('SetRow exercise kinds', () => {
  const kindWells = (tree) => one(hosts(tree, (p) => flat(p.style).width === 98));
  const wellButtons = (tree) => kindWells(tree).findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
  const shown = (tree, label) => words(one(byLabel(tree, label))).join('');

  test('weight_reps and weighted_bodyweight render the weight and reps wells', () => {
    ['weight_reps', 'weighted_bodyweight', undefined].forEach((kind) => {
      const tree = render({ kind });
      expect(wellButtons(tree)).toHaveLength(2);
      expect(shown(tree, 'Set 2 weight')).toBe('70');
      expect(shown(tree, 'Set 2 reps')).toBe('8');
    });
  });

  test('reps_only: one reps well the full wells width, spoken as reps', () => {
    const onPressWell = jest.fn();
    const tree = render({ kind: 'reps_only', onPressWell, wells: { weight: 99, reps: 8, state: 'next' } });
    const buttons = wellButtons(tree);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('Set 2 reps');
    expect(buttons[0].props.accessibilityValue).toEqual({ text: '8' });
    expect(words(tree.toJSON())).not.toContain('99');
    expect(flat(buttons[0].props.style).borderLeftWidth).toBeUndefined();
    press(buttons[0]);
    expect(onPressWell).toHaveBeenCalledWith('reps');
  });

  test('duration: one well of m:ss over the reps field, spoken in minutes and seconds', () => {
    const onPressWell = jest.fn();
    const tree = render({ kind: 'duration', onPressWell, wells: { weight: '', reps: 90, state: 'next' } });
    const buttons = wellButtons(tree);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('Set 2 time');
    expect(words(buttons[0]).join('')).toBe('1:30');
    expect(buttons[0].props.accessibilityValue).toEqual({ text: '1 minute 30 seconds' });
    press(buttons[0]);
    expect(onPressWell).toHaveBeenCalledWith('reps');
  });

  test.each([[60, '1:00', '1 minute'], [120, '2:00', '2 minutes'], [45, '0:45', '45 seconds'], [61, '1:01', '1 minute 1 second']])(
    'duration %s seconds reads %s and is spoken as %s',
    (seconds, shownText, spoken) => {
      const tree = render({ kind: 'duration', wells: { reps: seconds, state: 'next' } });
      expect(words(one(byLabel(tree, 'Set 2 time'))).join('')).toBe(shownText);
      expect(one(byLabel(tree, 'Set 2 time')).props.accessibilityValue.text).toBe(spoken);
    },
  );

  test('an empty time well shows nothing, not 0:00, and is spoken as empty', () => {
    ['', null, undefined, 0].forEach((reps) => {
      const tree = render({ kind: 'duration', wells: { reps, state: 'next' } });
      expect(words(one(byLabel(tree, 'Set 2 time'))).join('')).toBe('');
      expect(one(byLabel(tree, 'Set 2 time')).props.accessibilityValue).toEqual({ text: 'empty' });
    });
  });

  test('distance: the distance well then the time well, field keys weight and reps', () => {
    const onPressWell = jest.fn();
    const tree = render({ kind: 'distance', onPressWell, wells: { weight: 400, reps: 95, state: 'next' } });
    expect(wellButtons(tree)).toHaveLength(2);
    expect(words(one(byLabel(tree, 'Set 2 distance'))).join('')).toBe('400');
    expect(words(one(byLabel(tree, 'Set 2 time'))).join('')).toBe('1:35');
    expect(one(byLabel(tree, 'Set 2 distance')).props.accessibilityValue).toEqual({ text: '400 metres' });
    expect(one(byLabel(tree, 'Set 2 time')).props.accessibilityValue).toEqual({ text: '1 minute 35 seconds' });
    press(one(byLabel(tree, 'Set 2 distance')));
    press(one(byLabel(tree, 'Set 2 time')));
    expect(onPressWell.mock.calls).toEqual([['weight'], ['reps']]);
  });

  test('distance is spoken in yards unless the units are kg', () => {
    const tree = render({ kind: 'distance', units: 'lb', wells: { weight: 440, reps: 60, state: 'next' } });
    expect(one(byLabel(tree, 'Set 2 distance')).props.accessibilityValue).toEqual({ text: '440 yards' });
    const one1 = render({ kind: 'distance', units: 'kg', wells: { weight: 1, reps: 60, state: 'next' } });
    expect(one(byLabel(one1, 'Set 2 distance')).props.accessibilityValue).toEqual({ text: '1 metre' });
  });

  test('an empty distance is empty; kg is the default units', () => {
    const tree = render({ kind: 'distance', wells: { weight: '', reps: '', state: 'next' } });
    expect(one(byLabel(tree, 'Set 2 distance')).props.accessibilityValue).toEqual({ text: 'empty' });
    expect(one(byLabel(tree, 'Set 2 time')).props.accessibilityValue).toEqual({ text: 'empty' });
    const full = render({ kind: 'distance', wells: { weight: 200, reps: 60, state: 'next' } });
    expect(one(byLabel(full, 'Set 2 distance')).props.accessibilityValue.text).toBe('200 metres');
  });

  test.each([['reps_only', 'reps'], ['duration', 'time'], ['distance', 'time']])(
    '%s: pending ink and the amber editing ink are unchanged',
    (kind, label) => {
      const pending = render({ kind, wells: { weight: 10, reps: 60, state: 'pending' }, check: 'pending' });
      expect(wellText(pending, `Set 2 ${label}`).color).toBe(colors.textDisabled);
      const editing = render({ kind, wells: { weight: 10, reps: 60, state: 'editing', editingField: 'reps' } });
      expect(wellText(editing, `Set 2 ${label}`).color).toBe(colors.primary);
      expect(flat(wellsBox(editing).props.style).borderColor).toBe(colors.primary);
    },
  );
});

describe('SetRow ghost seed', () => {
  test('ghost values read in secondary ink, not primary', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'next', ghost: true } });
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.textSecondary);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textSecondary);
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityValue).toEqual({ text: '70' });
  });

  test('without ghost, or with ghost false, the values stay primary', () => {
    expect(wellText(render({}), 'Set 2 weight').color).toBe(colors.textPrimary);
    expect(wellText(render({ wells: { weight: 70, reps: 8, state: 'next', ghost: false } }), 'Set 2 weight').color)
      .toBe(colors.textPrimary);
  });

  test('amber editing ink wins over ghost on the field being edited only', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'editing', editingField: 'weight', ghost: true } });
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.primary);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textSecondary);
  });

  test('ghost applies to every kind', () => {
    const tree = render({ kind: 'duration', wells: { reps: 60, state: 'next', ghost: true } });
    expect(wellText(tree, 'Set 2 time').color).toBe(colors.textSecondary);
  });
});

describe('SetRow long press and check name', () => {
  const rowPressable = (tree) => tree.root.findAll((n) => typeof n.type !== 'string' && n.props.onLongPress && n.props.delayLongPress)[0];

  test('without onLongPressRow the row has no long press and no hint', () => {
    const tree = render({ onPressMarker: () => {} });
    expect(rowPressable(tree)).toBeUndefined();
    expect(one(byLabel(tree, 'Set type for set 2')).props.accessibilityHint).toBeUndefined();
  });

  test('with it, a 300 ms hold on the row calls it with no arguments', () => {
    const onLongPressRow = jest.fn();
    const tree = render({ onLongPressRow, testIDs: { row: 'r' } });
    const pressable = rowPressable(tree);
    expect(pressable.props.delayLongPress).toBe(300);
    expect(pressable.props.onPress).toBeUndefined();
    expect(pressable.props.accessible).toBe(false);
    expect(one(byId(tree, 'r'))).toBeTruthy();
    act(() => { pressable.props.onLongPress(); });
    expect(onLongPressRow).toHaveBeenCalledTimes(1);
    expect(onLongPressRow).toHaveBeenCalledWith();
  });

  test('the hold hint sits on the check (and on a marker that is not a button); a screen reader reaches the overflow as an action on the check', () => {
    const onLongPressRow = jest.fn();
    const withButton = render({ onLongPressRow, onPressMarker: () => {} });
    // A marker that opens the set-type sheet must not promise a hold.
    expect(one(byLabel(withButton, 'Set type for set 2')).props.accessibilityHint).toBeUndefined();
    const check = one(byLabel(withButton, 'Log set 2'));
    expect(check.props.accessibilityHint).toBe('Hold for more options');
    expect(check.props.accessibilityActions).toEqual([{ name: 'longpress', label: 'More options' }]);
    act(() => { check.props.onAccessibilityAction({ nativeEvent: { actionName: 'longpress' } }); });
    expect(onLongPressRow).toHaveBeenCalledTimes(1);
    const without = render({ onLongPressRow: () => {} });
    expect(one(byLabel(without, 'Set 2')).props.accessibilityHint).toBe('Hold for more options');
  });

  test('a plain press on a well or the check still reaches its own handler', () => {
    const onPressWell = jest.fn();
    const onCheck = jest.fn();
    const onLongPressRow = jest.fn();
    const tree = render({ onLongPressRow, onPressWell, onCheck });
    press(one(byLabel(tree, 'Set 2 reps')));
    press(one(byLabel(tree, 'Log set 2')));
    expect(onPressWell).toHaveBeenCalledWith('reps');
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onLongPressRow).not.toHaveBeenCalled();
  });

  test('checkLabel replaces the check\'s spoken name in every state', () => {
    ['logged', 'next', 'pending'].forEach((check) => {
      const tree = render({ check, checkLabel: 'Log other side' });
      expect(byLabel(tree, 'Log other side')).toHaveLength(1);
      expect(byLabel(tree, 'Log set 2')).toHaveLength(0);
    });
  });

  test('the default check name stays "Log set n"', () => {
    expect(byLabel(render({}), 'Log set 2')).toHaveLength(1);
  });
});

describe('SetRow phone-keyboard path', () => {
  const field = (extra = {}) => ({
    field: 'weight', value: '72.5', onChangeText: jest.fn(), keyboardType: 'decimal-pad', testID: 'volyume-input-weight', onSubmitEditing: jest.fn(), ...extra,
  });
  const inputs = (tree) => tree.root.findAll((n) => n.type === 'TextInput');

  test('while editing, the named well is a TextInput with the house props', () => {
    const input = field();
    const tree = render({ inputField: input, wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    const box = one(inputs(tree));
    expect(box.props.testID).toBe('volyume-input-weight');
    expect(box.props.accessibilityLabel).toBe('Set 2 weight');
    expect(box.props.value).toBe('72.5');
    expect(box.props.keyboardType).toBe('decimal-pad');
    expect(box.props.returnKeyType).toBe('done');
    expect(box.props.selectTextOnFocus).toBe(true);
    expect(box.props.autoFocus).toBe(true);
    expect(box.props.onSubmitEditing).toBe(input.onSubmitEditing);
    act(() => { box.props.onChangeText('80'); });
    expect(input.onChangeText).toHaveBeenCalledWith('80');
    const s = flat(box.props.style);
    expect(s.color).toBe(colors.primary);
    expect(s.fontFamily).toBe(type.w(type.num('bodyStrong'), 'semibold').fontFamily);
    expect(s.fontSize).toBe(type.bodyStrong.fontSize);
    expect(s.fontVariant).toEqual(['tabular-nums']);
  });

  test('the other well stays a pressable value', () => {
    const onPressWell = jest.fn();
    const tree = render({ onPressWell, inputField: field(), wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    // The field is its own element, not a button wrapping the input.
    expect(byLabel(tree, 'Set 2 weight').filter((n) => n.props.accessibilityRole === 'button')).toHaveLength(0);
    press(one(byLabel(tree, 'Set 2 reps')));
    expect(onPressWell).toHaveBeenCalledWith('reps');
  });

  test('the reps field takes the input in the reps well', () => {
    const tree = render({ inputField: field({ field: 'reps', value: '8', testID: 'volyume-input-reps' }), wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'reps' } });
    expect(one(inputs(tree)).props.accessibilityLabel).toBe('Set 2 reps');
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityRole).toBe('button');
  });

  test('kinds name the field in their own words', () => {
    const tree = render({ kind: 'duration', inputField: field({ field: 'reps', value: '90' }), wells: { reps: 90, state: 'editing', editingField: 'reps' } });
    expect(one(inputs(tree)).props.accessibilityLabel).toBe('Set 2 time');
  });

  test.each(['next', 'logged', 'pending'])('no TextInput while the row is %s', (state) => {
    const tree = render({ inputField: field(), wells: { weight: 72.5, reps: 8, state } });
    expect(inputs(tree)).toHaveLength(0);
  });

  test('no TextInput without inputField, or when it is null', () => {
    const wells = { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' };
    expect(inputs(render({ wells }))).toHaveLength(0);
    expect(inputs(render({ wells, inputField: null }))).toHaveLength(0);
  });
});

describe('SetRow source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'SetRow.js'), 'utf8');
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
  test('no estimated max, plate readout, RPE, RIR or trophy', () => {
    expect(SRC).not.toMatch(/\b(e1rm|1rm|est\.? ?max|plate|rpe|rir|trophy)\b/i);
  });
});
