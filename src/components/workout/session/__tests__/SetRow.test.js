/**
 * SetRow (12-BUILD-SPEC sections 2, 2a and 3, register D220, the row redrawn on
 * the founder's render verdict, addendum 8). Pins: the three row states and the
 * editing state (wells and check), the markers, the Last cell (plain, stale,
 * pressable), the record mark (a plain "PR" under the set number, no Target
 * column, no pill), the wells as separate flex 1 boxes with an 8 dp gap and no
 * divider, the 28 dp check, every callback and its argument, the test ids, the
 * sizes, the accessibility labels and the token-only source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { alpha, colors, radius, spacing, type, withAlpha } from '../../../../styles/theme';
import SetRow, { SET_COLUMNS } from '../SetRow';

const DOT = String.fromCharCode(0x00b7);
const TIMES = String.fromCharCode(0x00d7);

const BASE = {
  marker: 2,
  last: { text: `72.5 ${TIMES} 8`, stale: false },
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
const wellsRow = (tree) => one(hosts(tree, (p) => {
  const s = flat(p.style);
  return s.flex === 1 && s.flexDirection === 'row' && s.gap === 8;
}));
const boxOf = (tree, label) => flat(one(byLabel(tree, label)).props.style);
const circleOf = (touchable) => touchable.findAll((n) => n.type === 'View')[0];
const tickOf = (touchable) => touchable.findAll((n) => n.type === 'Ionicons')[0];

describe('SetRow wells', () => {
  test('the wells container shares the remaining width: flex 1, row, an 8 dp gap between the boxes', () => {
    const s = flat(wellsRow(render({})).props.style);
    expect(s.flex).toBe(1);
    expect(s.minWidth).toBe(0);
    expect(s.flexDirection).toBe('row');
    expect(s.gap).toBe(spacing.sm);
  });

  test.each([['logged'], ['next']])('%s: two separate boxes in the house field (surface2, 1.5 border, radius md, 44 dp, flex 1), primary-ink values at the regular numeric face', (state) => {
    const tree = render({ wells: { weight: 70, reps: 8, state }, check: state });
    ['Set 2 weight', 'Set 2 reps'].forEach((label) => {
      const box = flat(one(byLabel(tree, label)).props.style);
      expect(box.backgroundColor).toBe(colors.surface2);
      expect(box.borderColor).toBe(colors.border);
      expect(box.borderWidth).toBe(1.5);
      expect(box.borderRadius).toBe(radius.md);
      expect(box.height).toBe(44);
      expect(box.flex).toBe(1);
      expect(box.minWidth).toBe(0);
      expect(box.width).toBeUndefined();
    });
    const s = wellText(tree, 'Set 2 weight');
    expect(s.color).toBe(colors.textPrimary);
    expect(s.fontFamily).toBe(type.num('bodyStrong').fontFamily);
    expect(s.fontFamily).not.toBe(type.w(type.num('bodyStrong'), 'semibold').fontFamily);
    expect(s.fontSize).toBe(type.bodyStrong.fontSize);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textPrimary);
  });

  test('the two wells are separate boxes with no divider between them', () => {
    const tree = render({});
    const weight = flat(one(byLabel(tree, 'Set 2 weight')).props.style);
    const reps = flat(one(byLabel(tree, 'Set 2 reps')).props.style);
    [weight, reps].forEach((s) => {
      expect(s.borderLeftWidth).toBeUndefined();
      expect(s.borderLeftColor).toBeUndefined();
      expect(s.borderWidth).toBe(1.5);
    });
    expect(one(byLabel(tree, 'Set 2 weight'))).not.toBe(one(byLabel(tree, 'Set 2 reps')));
  });

  test('pending: placeholder ink, the regular numeric face', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'pending' }, check: 'pending' });
    const s = wellText(tree, 'Set 2 weight');
    expect(s.color).toBe(colors.textMuted);
    expect(s.fontFamily).toBe(type.bodyStrong.fontFamily);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textMuted);
  });

  test('editing weight: only the weight box takes the primary-tint edge, both values stay primary ink', () => {
    const tree = render({ wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    expect(boxOf(tree, 'Set 2 weight').borderColor).toBe(withAlpha(colors.primary, alpha.strong));
    expect(boxOf(tree, 'Set 2 reps').borderColor).toBe(colors.border);
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.textPrimary);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textPrimary);
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityState.selected).toBe(true);
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityState.selected).toBe(false);
  });

  test('editing reps: only the reps box takes the edge, the reverse selection, no amber text on either value', () => {
    const tree = render({ wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'reps' } });
    expect(boxOf(tree, 'Set 2 reps').borderColor).toBe(withAlpha(colors.primary, alpha.strong));
    expect(boxOf(tree, 'Set 2 weight').borderColor).toBe(colors.border);
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.textPrimary);
    expect(wellText(tree, 'Set 2 reps').color).toBe(colors.textPrimary);
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityState.selected).toBe(true);
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityState.selected).toBe(false);
  });

  test('outside editing every box edge is the border colour', () => {
    const tree = render({});
    expect(boxOf(tree, 'Set 2 weight').borderColor).toBe(colors.border);
    expect(boxOf(tree, 'Set 2 reps').borderColor).toBe(colors.border);
  });

  test('values are read out; zero is a value, empty is empty', () => {
    const tree = render({ wells: { weight: 0, reps: '', state: 'next' } });
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityValue).toEqual({ text: '0' });
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityValue).toEqual({ text: 'empty' });
  });

  test('each box is 44 dp tall with a 2 dp slop for a 48 dp reach, one line, never fit-scaled', () => {
    // D220 addendum 22: on the founder's iPhone every fit-scaled text on the
    // row being typed into collapsed far below its declared floor, so no text
    // on the row carries adjustsFontSizeToFit; the columns fit their content.
    const cell = one(byLabel(render({}), 'Set 2 weight'));
    expect(cell.props.hitSlop).toEqual({ top: 2, bottom: 2, left: 0, right: 0 });
    expect(flat(cell.props.style).height).toBe(44);
    const text = textIn(cell);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    expect(text.props.minimumFontScale).toBeUndefined();
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
  test('logged: the app\'s done mark, a 28 dp checkmark-circle in success, no ring view', () => {
    const tree = render({ check: 'logged' });
    const touch = one(byLabel(tree, 'Set 2 logged'));
    const icon = tickOf(touch);
    expect(icon.props.name).toBe('checkmark-circle');
    expect(icon.props.size).toBe(28);
    expect(icon.props.color).toBe(colors.success);
    expect(touch.findAll((n) => flat(n.props.style).backgroundColor !== undefined)).toHaveLength(0);
    expect(touch.findAll((n) => flat(n.props.style).borderWidth !== undefined)).toHaveLength(0);
  });

  test('next: a 28 dp ring (1.5 dp) in primary with no fill, and a 16 dp primary checkmark', () => {
    const tree = render({ check: 'next' });
    const touch = one(byLabel(tree, 'Log set 2'));
    const s = flat(circleOf(touch).props.style);
    expect(s.width).toBe(28);
    expect(s.borderWidth).toBe(1.5);
    expect(s.borderColor).toBe(colors.primary);
    expect(s.backgroundColor).toBeUndefined();
    expect(tickOf(touch).props.name).toBe('checkmark');
    expect(tickOf(touch).props.size).toBe(16);
    expect(tickOf(touch).props.color).toBe(colors.primary);
  });

  test('pending: the same 28 dp ring (1.5 dp) in borderSubtle with no glyph and no fill', () => {
    const tree = render({ check: 'pending' });
    const touch = one(byLabel(tree, 'Set 2 not logged yet'));
    const s = flat(circleOf(touch).props.style);
    expect(s.width).toBe(28);
    expect(s.borderWidth).toBe(1.5);
    expect(s.borderColor).toBe(colors.borderSubtle);
    expect(s.backgroundColor).toBeUndefined();
    expect(tickOf(touch)).toBeUndefined();
  });

  test('a 28 dp circle in a 36 by 48 target with a 6 dp side slop (48 dp reach)', () => {
    const touch = one(byLabel(render({}), 'Log set 2'));
    const s = flat(circleOf(touch).props.style);
    expect(s.width).toBe(28);
    expect(s.height).toBe(28);
    expect(s.borderRadius).toBe(14);
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
    // D220 addendum 28: the typed sets' letters are named.
    expect(byLabel(render({ marker: 'D' }), 'Log drop set')).toHaveLength(1);
    expect(byLabel(render({ marker: 'M' }), 'Log myo-reps set')).toHaveLength(1);
    expect(byLabel(render({ marker: 'R' }), 'Log rest-pause set')).toHaveLength(1);
    expect(byLabel(render({ marker: 'A' }), 'Log AMRAP set')).toHaveLength(1);
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

  test('W is a 24 dp pill badge: primary tint, primary glyph, caption strong', () => {
    const tree = render({ marker: 'W' });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === 'W'));
    const s = flat(text.props.style);
    expect(s.color).toBe(colors.primary);
    expect(s.fontSize).toBe(type.captionStrong.fontSize);
    // The badge, not the 24 dp marker column it sits in: the one with a height.
    const badge = one(hosts(tree, (p) => flat(p.style).width === 24 && flat(p.style).height === 24));
    const b = flat(badge.props.style);
    expect(b.height).toBe(24);
    expect(b.backgroundColor).toBe(colors.primaryBg);
    expect(b.borderRadius).toBe(radius.full);
  });

  test('F is a pill in the error tint with the error glyph', () => {
    const tree = render({ marker: 'F' });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === 'F'));
    expect(flat(text.props.style).color).toBe(colors.error);
    const badge = flat(one(hosts(tree, (p) => flat(p.style).width === 24 && flat(p.style).height === 24)).props.style);
    expect(badge.backgroundColor).toBe(colors.errorBg);
    expect(badge.borderRadius).toBe(radius.full);
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
    expect(s.fontSize).toBe(type.bodySm.fontSize);
    expect(s.fontFamily).toBe(type.num('bodySm').fontFamily);
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

describe('SetRow record mark', () => {
  test('no mark unless record is set', () => {
    expect(byLabel(render({}), 'Personal record')).toHaveLength(0);
    expect(words(render({}).toJSON())).not.toContain('PR');
  });

  test('record: a plain amber "PR" under the set number inside the marker column, no pill', () => {
    const tree = render({ record: true, testIDs: { marker: 'm' } });
    const tag = one(byLabel(tree, 'Personal record'));
    expect(tag.props.accessible).toBe(true);
    expect(words(tag).join('')).toBe('PR');
    const s = flat(tag.props.style);
    expect(s.color).toBe(colors.primary);
    expect(s.fontSize).toBe(type.captionStrong.fontSize);
    expect(s.fontFamily).toBe(type.captionStrong.fontFamily);
    expect(s.backgroundColor).toBeUndefined();
    expect(s.minHeight).toBeUndefined();
    expect(s.borderRadius).toBeUndefined();
    // Inside the marker column, after the set number (document order).
    const texts = one(byId(tree, 'm')).findAll((n) => n.type === 'Text').map((n) => words(n).join(''));
    expect(texts.indexOf('2')).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf('PR')).toBeGreaterThan(texts.indexOf('2'));
    expect(tree.root.findAll((n) => flat(n.props.style).backgroundColor === colors.primaryBg)).toHaveLength(0);
  });

  test('record leaves the entry area alone: Last and the wells read the same', () => {
    const tree = render({ record: true, testIDs: { last: 'l' } });
    expect(words(one(byId(tree, 'l')))).toEqual([`72.5 ${TIMES} 8`]);
    expect(words(one(byLabel(tree, 'Set 2 weight'))).join('')).toBe('70');
    expect(words(one(byLabel(tree, 'Set 2 reps'))).join('')).toBe('8');
  });
});

describe('SetRow frame', () => {
  test('64 dp minimum, hairline below, a row gap of 8 between every column, the drawing\'s column grid', () => {
    const root = render({ testIDs: { row: 'r' } });
    const row = one(byId(root, 'r'));
    const s = flat(row.props.style);
    expect(s.minHeight).toBe(64);
    expect(s.flexDirection).toBe('row');
    expect(s.alignItems).toBe('center');
    expect(s.borderBottomWidth).toBe(1);
    expect(s.borderBottomColor).toBe(colors.borderSubtle);
    // The card grid (D220 addendum 8): 12/8 dp padding and an 8 dp gap between
    // marker, Last, the wells and the check, so nothing touches.
    expect(s.paddingLeft).toBe(12);
    expect(s.paddingRight).toBe(8);
    expect(s.gap).toBe(8);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    // Last is 80 so "· 137.5 × 15" (76.7 dp at bodySm in Inter) fits with no
    // font fitting (D220 addendum 22).
    expect(SET_COLUMNS).toEqual({ marker: 24, last: 80, check: 36 });
  });

  test('cell text never widens a column: the Last cell is one line and never fit-scaled', () => {
    const longText = `1000.25 ${TIMES} 100`;
    const t2 = render({ last: { text: longText, stale: false } });
    const text = one(t2.root.findAll((n) => n.type === 'Text' && words(n).join('') === longText));
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.adjustsFontSizeToFit).toBeUndefined();
    expect(text.props.minimumFontScale).toBeUndefined();
  });

  test('no text on the row fit-scales at runtime (source guard, D220 addendum 22)', () => {
    const src = require('fs').readFileSync(require.resolve('../SetRow.js'), 'utf8');
    expect(src).not.toMatch(/^\s*adjustsFontSizeToFit/m);
    expect(src).not.toMatch(/minimumFontScale=/);
  });
});

describe('SetRow exercise kinds', () => {
  const wellButtons = (tree) => wellsRow(tree).findAll((n) => typeof n.type === 'string' && n.props.accessibilityRole === 'button');
  const shown = (tree, label) => words(one(byLabel(tree, label))).join('');

  test('weight_reps and weighted_bodyweight render two separate boxes, weight then reps', () => {
    ['weight_reps', 'weighted_bodyweight', undefined].forEach((kind) => {
      const tree = render({ kind });
      expect(wellButtons(tree)).toHaveLength(2);
      expect(wellButtons(tree).map((b) => b.props.accessibilityLabel)).toEqual(['Set 2 weight', 'Set 2 reps']);
      expect(shown(tree, 'Set 2 weight')).toBe('70');
      expect(shown(tree, 'Set 2 reps')).toBe('8');
    });
  });

  test('reps_only: one reps box, flex 1 of the wells width, spoken as reps', () => {
    const onPressWell = jest.fn();
    const tree = render({ kind: 'reps_only', onPressWell, wells: { weight: 99, reps: 8, state: 'next' } });
    const buttons = wellButtons(tree);
    expect(buttons).toHaveLength(1);
    expect(buttons[0].props.accessibilityLabel).toBe('Set 2 reps');
    expect(buttons[0].props.accessibilityValue).toEqual({ text: '8' });
    expect(words(tree.toJSON())).not.toContain('99');
    expect(flat(buttons[0].props.style).flex).toBe(1);
    press(buttons[0]);
    expect(onPressWell).toHaveBeenCalledWith('reps');
  });

  test('duration: one box of m:ss over the reps field, spoken in minutes and seconds', () => {
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

  test('distance: two separate boxes, the distance then the time, field keys weight and reps', () => {
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
    '%s: placeholder ink while pending; primary ink and the tinted edge while editing',
    (kind, label) => {
      const pending = render({ kind, wells: { weight: 10, reps: 60, state: 'pending' }, check: 'pending' });
      expect(wellText(pending, `Set 2 ${label}`).color).toBe(colors.textMuted);
      const editing = render({ kind, wells: { weight: 10, reps: 60, state: 'editing', editingField: 'reps' } });
      expect(wellText(editing, `Set 2 ${label}`).color).toBe(colors.textPrimary);
      expect(flat(one(byLabel(editing, `Set 2 ${label}`)).props.style).borderColor).toBe(withAlpha(colors.primary, alpha.strong));
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

  test('primary editing ink wins over ghost on the field being edited only', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'editing', editingField: 'weight', ghost: true } });
    expect(wellText(tree, 'Set 2 weight').color).toBe(colors.textPrimary);
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

  test('the return key and the accessory id pass through as given, undefined included (D220 addendum 23)', () => {
    // An iOS number pad has no return key; the screen leaves returnKeyType
    // unset there so the system draws no return-key capsule, and names the
    // keyboard bar as the input's accessory. The row must not substitute a
    // default of its own.
    const bare = { ...field(), returnKeyType: undefined, inputAccessoryViewID: undefined };
    const t1 = render({ inputField: bare, wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    expect(one(inputs(t1)).props.returnKeyType).toBeUndefined();
    expect(one(inputs(t1)).props.inputAccessoryViewID).toBeUndefined();
    const named = { ...field(), returnKeyType: 'next', inputAccessoryViewID: 'volyume-logger-keyboard-bar' };
    const t2 = render({ inputField: named, wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    expect(one(inputs(t2)).props.returnKeyType).toBe('next');
    expect(one(inputs(t2)).props.inputAccessoryViewID).toBe('volyume-logger-keyboard-bar');
  });

  test('while editing, the named well is a TextInput with the house props', () => {
    const input = field();
    const tree = render({ inputField: input, wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    const box = one(inputs(tree));
    expect(box.props.testID).toBe('volyume-input-weight');
    expect(box.props.accessibilityLabel).toBe('Set 2 weight');
    expect(box.props.value).toBe('72.5');
    expect(box.props.keyboardType).toBe('decimal-pad');
    expect(box.props.returnKeyType).toBe(input.returnKeyType);
    expect(box.props.selectTextOnFocus).toBe(true);
    // Focus goes through the input's focus method on mount, never autoFocus
    // (2026-10-09 audit E1: autoFocus skips selectTextOnFocus on Fabric);
    // the return key submits without blurring, so Next never drops the keyboard.
    expect(box.props.autoFocus).toBeUndefined();
    expect(box.props.submitBehavior).toBe('submit');
    expect(box.props.onSubmitEditing).toBe(input.onSubmitEditing);
    // The box around the field is a plain View (not a button) carrying the editing edge.
    const wrap = one(hosts(tree, (p) => flat(p.style).borderWidth === 1.5 && flat(p.style).borderColor === withAlpha(colors.primary, alpha.strong)));
    expect(flat(wrap.props.style).borderColor).toBe(withAlpha(colors.primary, alpha.strong));
    expect(flat(wrap.props.style).flex).toBe(1);
    expect(wrap.props.accessibilityRole).toBeUndefined();
    act(() => { box.props.onChangeText('80'); });
    expect(input.onChangeText).toHaveBeenCalledWith('80');
    const s = flat(box.props.style);
    expect(s.color).toBe(colors.textPrimary);
    expect(s.fontFamily).toBe(type.num('bodyStrong').fontFamily);
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
