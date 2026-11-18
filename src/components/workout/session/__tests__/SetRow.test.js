/**
 * SetRow (12-BUILD-SPEC sections 2, 2a and 3, register D220, the row redrawn on
 * the founder's render verdict, addendum 8; redrawn again with the kit in
 * LOC-412, kit trial 2). Pins: the three row states and the editing state
 * (wells and check), the markers, the Last cell (plain, stale, pressable), the
 * record mark (a plain "PR" under the set number, no Target column, no pill),
 * the wells as separate flex 1 boxes with an 8 dp gap and no divider, the 48 dp
 * check column holding a square kit checkbox, every callback and its argument,
 * the test ids, the sizes, the accessibility labels and the token-only source
 * guard.
 *
 * Kit look (LOC-412): the row's parts are drawn by src/components/ui/
 * set-row-kit.tsx with Tailwind classes that NativeWind resolves at render
 * time, so the presentation pins here read the RESOLVED style off the host
 * nodes through the kit's real styling pipeline (kitTestEnv.js, the model is
 * kitTrial2Surfaces.test.js) in the dark palette, not inline StyleSheet values.
 * Behaviour, callbacks, test ids and spoken labels are pinned as before.
 */
jest.mock('react-native-svg', () => require('../../../ui/__tests__/kitTestEnv').svgMock());
jest.mock('react-native', () => require('../../../ui/__tests__/kitTestEnv').reactNativeMock());
import fs from 'fs';
import path from 'path';
import { act } from 'react-test-renderer';

const {
  loadNativeInteropRuntime,
  setUpKitStyles,
  setPalette,
  renderKit,
  hostNodes,
  normaliseColour,
  flatStyle,
} = require('../../../ui/__tests__/kitTestEnv');

// Before the first kit or nativewind require (an ES import would hoist above
// this call, so SetRow and the theme are required below it).
loadNativeInteropRuntime();

const { resolveTheme, fontScaleCaps, radius, spacing } = require('../../../../styles/theme');
const { default: SetRow, SET_COLUMNS } = require('../SetRow');

const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => { setUpKitStyles(); setPalette({ theme: 'dark' }); }, 120000);

const DOT = String.fromCharCode(0x00b7);
const TIMES = String.fromCharCode(0x00d7);

const BASE = {
  marker: 2,
  last: { text: `72.5 ${TIMES} 8`, stale: false },
  wells: { weight: 70, reps: 8, state: 'next' },
  check: 'next',
};

function render(props) {
  return renderKit(<SetRow {...BASE} {...props} />);
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const byId = (tree, id) => hosts(tree, (p) => p.testID === id);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node) => act(() => { node.props.onPress(); });
const flat = flatStyle;
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
// kit trial 2 (LOC-412): the check is a kit Checkbox (a host with role checkbox).
const checkOf = (tree, label) => one(byLabel(tree, label));
const hasTick = (checkbox) => checkbox.findAll((n) => n.type === 'LucideIcon' && n.props.name === 'Check').length > 0;
const edge = (box) => hex(box.borderColor);

describe('SetRow wells', () => {
  test('the wells container shares the remaining width: flex 1, row, an 8 dp gap between the boxes', () => {
    const s = flat(wellsRow(render({})).props.style);
    expect(s.flex).toBe(1);
    expect(s.minWidth).toBe(0);
    expect(s.flexDirection).toBe('row');
    expect(s.gap).toBe(spacing.sm);
  });

  // kit trial 2 (LOC-412): the wells are outlined boxes drawn by the kit (page
  // ground, 48 dp tall, flex 1, radius md, 1 dp field edge; a logged set's edge
  // drops to the hairline), the value in Inter SemiBold 20 on a 32 line,
  // tabular; the old surface2 fill, 1.5 dp edge and 44 dp height are gone.
  test.each([['logged'], ['next']])('%s: two separate outlined boxes (page ground, 1 dp edge, radius md, 48 dp, flex 1), tabular numerals', (state) => {
    const tree = render({ wells: { weight: 70, reps: 8, state }, check: state });
    ['Set 2 weight', 'Set 2 reps'].forEach((label) => {
      const box = flat(one(byLabel(tree, label)).props.style);
      expect(hex(box.backgroundColor)).toBe(hex(colors.background));
      expect(hex(box.borderColor)).toBe(hex(state === 'logged' ? colors.borderSubtle : colors.border));
      expect(box.borderWidth).toBe(1);
      expect(box.borderRadius).toBe(radius.md);
      expect(box.height).toBe(48);
      expect(box.flexGrow).toBe(1);
      expect(box.flexShrink).toBe(1);
      expect(box.flexBasis).toBe('0%');
      expect(box.minWidth).toBe(0);
      expect(box.width).toBeUndefined();
    });
    const s = wellText(tree, 'Set 2 weight');
    // Ink: primary on the set you are on, the muted step once it is logged.
    const ink = state === 'logged' ? colors.textMuted : colors.textPrimary;
    expect(hex(s.color)).toBe(hex(ink));
    expect(s.fontFamily).toBe('Inter-SemiBold');
    expect(s.fontSize).toBe(20);
    expect(s.lineHeight).toBe(32);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(hex(wellText(tree, 'Set 2 reps').color)).toBe(hex(ink));
  });

  test('the two wells are separate boxes with no divider between them', () => {
    const tree = render({});
    const weight = flat(one(byLabel(tree, 'Set 2 weight')).props.style);
    const reps = flat(one(byLabel(tree, 'Set 2 reps')).props.style);
    [weight, reps].forEach((s) => {
      expect(s.borderLeftWidth).toBeUndefined();
      expect(s.borderLeftColor).toBeUndefined();
      expect(s.borderWidth).toBe(1); // kit trial 2 (LOC-412): the idle edge is 1 dp (was 1.5)
    });
    expect(one(byLabel(tree, 'Set 2 weight'))).not.toBe(one(byLabel(tree, 'Set 2 reps')));
  });

  test('pending: placeholder (muted) ink, the same numeric face', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'pending' }, check: 'pending' });
    const s = wellText(tree, 'Set 2 weight');
    expect(hex(s.color)).toBe(hex(colors.textMuted));
    expect(s.fontFamily).toBe('Inter-SemiBold'); // kit trial 2 (LOC-412): one numeral face on every state
    expect(hex(wellText(tree, 'Set 2 reps').color)).toBe(hex(colors.textMuted));
  });

  // kit trial 2 (LOC-412): the edited box takes the amber ring (border-ring,
  // 2 dp) instead of the primary-tint 1.5 dp edge; amber is for the field being
  // edited only, so no value text is amber.
  test('editing weight: only the weight box takes the amber ring, both values stay primary ink', () => {
    const tree = render({ wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    expect(edge(boxOf(tree, 'Set 2 weight'))).toBe(hex(colors.primary));
    expect(boxOf(tree, 'Set 2 weight').borderWidth).toBe(2);
    expect(edge(boxOf(tree, 'Set 2 reps'))).toBe(hex(colors.border));
    expect(boxOf(tree, 'Set 2 reps').borderWidth).toBe(1);
    expect(hex(wellText(tree, 'Set 2 weight').color)).toBe(hex(colors.textPrimary));
    expect(hex(wellText(tree, 'Set 2 reps').color)).toBe(hex(colors.textPrimary));
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityState.selected).toBe(true);
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityState.selected).toBe(false);
  });

  test('editing reps: only the reps box takes the ring, the reverse selection, no amber text on either value', () => {
    const tree = render({ wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'reps' } });
    expect(edge(boxOf(tree, 'Set 2 reps'))).toBe(hex(colors.primary));
    expect(boxOf(tree, 'Set 2 reps').borderWidth).toBe(2);
    expect(edge(boxOf(tree, 'Set 2 weight'))).toBe(hex(colors.border));
    ['Set 2 weight', 'Set 2 reps'].forEach((label) => {
      expect(hex(wellText(tree, label).color)).toBe(hex(colors.textPrimary));
      expect(hex(wellText(tree, label).color)).not.toBe(hex(colors.primary));
    });
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityState.selected).toBe(true);
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityState.selected).toBe(false);
  });

  test('outside editing every box edge is the field edge colour', () => {
    const tree = render({});
    expect(edge(boxOf(tree, 'Set 2 weight'))).toBe(hex(colors.border));
    expect(edge(boxOf(tree, 'Set 2 reps'))).toBe(hex(colors.border));
  });

  test('values are read out; zero is a value, empty is empty', () => {
    const tree = render({ wells: { weight: 0, reps: '', state: 'next' } });
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityValue).toEqual({ text: '0' });
    expect(one(byLabel(tree, 'Set 2 reps')).props.accessibilityValue).toEqual({ text: 'empty' });
  });

  test('each box is 48 dp tall with a 2 dp slop, one line, numeral-capped, never fit-scaled', () => {
    // D220 addendum 22: on the founder's iPhone every fit-scaled text on the
    // row being typed into collapsed far below its declared floor, so no text
    // on the row carries adjustsFontSizeToFit; the columns fit their content.
    // Sideways each box reaches half the gap to the other (founder report
    // 2026-10-11, pinned in the hold block below).
    const cell = one(byLabel(render({}), 'Set 2 weight'));
    expect(cell.props.hitSlop).toEqual({ top: 2, bottom: 2, left: spacing.sm / 2, right: spacing.sm / 2 });
    expect(flat(cell.props.style).height).toBe(48); // kit trial 2 (LOC-412): the box is 48 dp tall (was 44 plus slop)
    const text = textIn(cell);
    expect(text.props.numberOfLines).toBe(1);
    expect(text.props.maxFontSizeMultiplier).toBe(fontScaleCaps.numeral);
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
  // kit trial 2 (LOC-412): the check is a kit Checkbox, a plain square (32 dp,
  // radius 6, 2 dp edge, page ground) in a 48 by 48 dp layout box with a 8 dp
  // slop, so the touch area is 48 by 48. The old Ionicons checkmark-circle and
  // amber ring are dropped on purpose: amber means "act here" only, and the
  // tick is a plain square. The state is carried by the edge ink and the tick.
  const squareOf = (checkbox) => flat(checkbox.props.style);

  test('logged: a checked checkbox in the muted edge ink with the kit tick inside', () => {
    const tree = render({ check: 'logged' });
    const box = checkOf(tree, 'Set 2 logged');
    expect(box.props.role).toBe('checkbox');
    expect(box.props['aria-checked']).toBe(true);
    expect(edge(squareOf(box))).toBe(hex(colors.textMuted));
    expect(hasTick(box)).toBe(true);
  });

  test('next: an unchecked square in the primary ink edge, no tick, no amber', () => {
    const tree = render({ check: 'next' });
    const box = checkOf(tree, 'Log set 2');
    expect(box.props.role).toBe('checkbox');
    expect(box.props['aria-checked']).toBe(false);
    expect(edge(squareOf(box))).toBe(hex(colors.textPrimary));
    expect(edge(squareOf(box))).not.toBe(hex(colors.primary));
    expect(hasTick(box)).toBe(false);
  });

  test('pending: the same square in the field edge colour with no tick', () => {
    const tree = render({ check: 'pending' });
    const box = checkOf(tree, 'Set 2 not logged yet');
    expect(box.props['aria-checked']).toBe(false);
    expect(edge(squareOf(box))).toBe(hex(colors.border));
    expect(hasTick(box)).toBe(false);
  });

  test('a 32 dp square (radius 6, 2 dp edge) in a 48 by 48 target with 8 dp slop (48 dp reach)', () => {
    ['logged', 'next', 'pending'].forEach((check) => {
      const tree = render({ check });
      const box = hosts(tree, (p) => p.role === 'checkbox')[0];
      const s = squareOf(box);
      expect(s.width).toBe(32);
      expect(s.height).toBe(32);
      expect(s.borderRadius).toBe(6);
      expect(s.borderWidth).toBe(2);
      expect(hex(s.backgroundColor)).toBe(hex(colors.background));
      expect(box.props.hitSlop).toBe(8);
      expect(s.width + 2 * box.props.hitSlop).toBe(48);
      const target = hostNodes(tree).find((n) => {
        const t = flat(n.props.style);
        return t.width === 48 && t.height === 48 && n.findAll((m) => m === box).length > 0;
      });
      expect(target).toBeTruthy();
    });
    expect(SET_COLUMNS.check).toBe(48);
  });

  test('onCheck is called with no arguments', () => {
    const onCheck = jest.fn();
    const tree = render({ onCheck });
    press(one(byLabel(tree, 'Log set 2')));
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(onCheck).toHaveBeenCalledWith();
  });

  test('busy or no onCheck: the check is disabled, speaks it, and a press does nothing', () => {
    // The old suite had no busy pin; this keeps the component's documented
    // contract (busy: the check is disabled and speaks busy) under the new check.
    const onCheck = jest.fn();
    const busy = render({ onCheck, busy: true });
    const box = checkOf(busy, 'Log set 2');
    expect(box.props.accessibilityState).toEqual({ checked: false, disabled: true, busy: true });
    expect(box.props['aria-disabled']).toBe(true);
    act(() => { box.props.onPress?.(); });
    expect(onCheck).not.toHaveBeenCalled();
    const idle = checkOf(render({ onCheck }), 'Log set 2');
    expect(idle.props.accessibilityState).toEqual({ checked: false, disabled: false, busy: false });
    const none = checkOf(render({}), 'Log set 2');
    expect(none.props.accessibilityState.disabled).toBe(true);
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
  // kit trial 2 (LOC-412): marker text is the kit's muted ink in Inter Medium
  // 11 (was secondary ink at the label role); the letters sit on a 24 dp round
  // badge, the failure badge on the destructive fill with its own ink.
  const badgeOf = (tree) => one(hosts(tree, (p) => flat(p.style).width === 24 && flat(p.style).height === 24));

  test('a number is muted ink in Inter Medium 11, tabular', () => {
    const tree = render({ marker: 3 });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === '3'));
    const s = flat(text.props.style);
    expect(hex(s.color)).toBe(hex(colors.textMuted));
    expect(s.fontFamily).toBe('Inter-Medium');
    expect(s.fontSize).toBe(11);
    expect(s.fontVariant).toEqual(['tabular-nums']);
  });

  test('W is a 24 dp round badge: quiet surface2 fill, the same muted ink', () => {
    const tree = render({ marker: 'W' });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === 'W'));
    const s = flat(text.props.style);
    // D220 addendum 30 (audit D2): no amber on a warm-up; the W sits on the
    // quiet badge (kit trial 2: in the muted ink, fontSize 11, Inter Medium).
    expect(hex(s.color)).toBe(hex(colors.textMuted));
    expect(s.fontSize).toBe(11);
    expect(s.fontFamily).toBe('Inter-Medium');
    // The badge, not the 24 dp marker column it sits in: the one with a height.
    const b = flat(badgeOf(tree).props.style);
    expect(b.height).toBe(24);
    expect(hex(b.backgroundColor)).toBe(hex(colors.surface2));
    expect(b.borderRadius).toBe(999);
  });

  test('typed letters wear the same quiet badge as W', () => {
    ['D', 'M', 'R', 'A'].forEach((marker) => {
      const tree = render({ marker });
      expect(hex(flat(badgeOf(tree).props.style).backgroundColor)).toBe(hex(colors.surface2));
    });
  });

  test('F is a round badge on the destructive fill with its on-error ink', () => {
    const tree = render({ marker: 'F' });
    const text = one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === 'F'));
    expect(hex(flat(text.props.style).color)).toBe(hex(colors.onError));
    const badge = flat(badgeOf(tree).props.style);
    expect(hex(badge.backgroundColor)).toBe(hex(colors.errorFill));
    expect(badge.borderRadius).toBe(999);
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

  // kit trial 2 (LOC-412): Last is the muted ink at 13 in Inter Medium.
  test('plain: the set in muted ink (history, not the live number), one line', () => {
    // Founder device verdict 2026-10-08: a bold white Last value read as the
    // live number beside the wells; history is quiet.
    const text = `72.5 ${TIMES} 8`;
    const tree = render({});
    const s = lastText(tree, text);
    expect(hex(s.color)).toBe(hex(colors.textMuted));
    expect(s.fontSize).toBe(13);
    expect(s.fontFamily).toBe('Inter-Medium');
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === text)).props.numberOfLines).toBe(1);
  });

  test('stale: the leading middle dot, in the same muted ink as a plain Last', () => {
    // kit trial 2 (LOC-412): stale is no longer a different colour; only the
    // leading dot marks it.
    const tree = render({ last: { text: `40 ${TIMES} 10`, stale: true } });
    const shown = `${DOT} 40 ${TIMES} 10`;
    expect(hex(lastText(tree, shown).color)).toBe(hex(colors.textMuted));
    expect(words(tree.toJSON())).toContain(shown);
    expect(words(render({}).toJSON())).not.toContain(DOT);
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

  // kit trial 2 (LOC-412): PR is plain bold primary ink, not amber (amber is
  // reserved for the field being edited).
  test('record: a plain "PR" in primary ink under the set number inside the marker column, no pill', () => {
    const tree = render({ record: true, testIDs: { marker: 'm' } });
    const tag = one(byLabel(tree, 'Personal record'));
    expect(tag.props.accessible).toBe(true);
    expect(words(tag).join('')).toBe('PR');
    const s = flat(tag.props.style);
    expect(hex(s.color)).toBe(hex(colors.textPrimary));
    expect(hex(s.color)).not.toBe(hex(colors.primary));
    expect(s.fontWeight).toBe('700');
    expect(s.backgroundColor).toBeUndefined();
    expect(s.minHeight).toBeUndefined();
    expect(s.borderRadius).toBeUndefined();
    // Inside the marker column, after the set number (document order).
    const texts = one(byId(tree, 'm')).findAll((n) => n.type === 'Text').map((n) => words(n).join(''));
    expect(texts.indexOf('2')).toBeGreaterThanOrEqual(0);
    expect(texts.indexOf('PR')).toBeGreaterThan(texts.indexOf('2'));
    expect(tree.root.findAll((n) => flat(n.props.style).backgroundColor !== undefined && hex(flat(n.props.style).backgroundColor) === hex(colors.primaryBg))).toHaveLength(0);
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
    // kit trial 2 (LOC-412): the hairline is a separate Separator host right
    // after the row (role presentation, 1 dp, borderSubtle) instead of a
    // borderBottom on the row.
    expect(s.borderBottomWidth).toBeUndefined();
    const all = hostNodes(root);
    const rule = all[all.indexOf(row) + all.slice(all.indexOf(row)).findIndex((n) => n.props.role === 'presentation')];
    expect(rule.props.role).toBe('presentation');
    expect(flat(rule.props.style).height).toBe(1);
    expect(hex(flat(rule.props.style).backgroundColor)).toBe(hex(colors.borderSubtle));
    expect(row.findAll((n) => n === rule)).toHaveLength(0); // a sibling after the row, not inside it
    // The card grid (D220 addendum 8): 12 dp left padding, the check column
    // flush to the card edge (0 right padding; kit trial 2), and an 8 dp gap
    // between marker, Last, the wells and the check, so nothing touches.
    expect(s.paddingLeft).toBe(12);
    expect(s.paddingRight).toBe(0);
    expect(s.gap ?? s.rowGap).toBe(8);
    expect(s.columnGap ?? s.gap).toBe(8);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(12);
    // Last is 80 so "· 137.5 × 15" (76.7 dp at bodySm in Inter) fits with no
    // font fitting (D220 addendum 22); the check column is 48 (the tick's target).
    expect(SET_COLUMNS).toEqual({ marker: 24, last: 80, check: 48 });
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
    expect(flat(buttons[0].props.style).flexGrow).toBe(1); // kit trial 2 (LOC-412): flex-1 resolves to grow 1 / shrink 1 / basis 0%
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
    '%s: placeholder ink while pending; primary ink and the amber ring while editing',
    (kind, label) => {
      const pending = render({ kind, wells: { weight: 10, reps: 60, state: 'pending' }, check: 'pending' });
      expect(hex(wellText(pending, `Set 2 ${label}`).color)).toBe(hex(colors.textMuted));
      const editing = render({ kind, wells: { weight: 10, reps: 60, state: 'editing', editingField: 'reps' } });
      expect(hex(wellText(editing, `Set 2 ${label}`).color)).toBe(hex(colors.textPrimary));
      // kit trial 2 (LOC-412): the edge is the amber ring (2 dp), not the primary tint.
      const box = flat(one(byLabel(editing, `Set 2 ${label}`)).props.style);
      expect(hex(box.borderColor)).toBe(hex(colors.primary));
      expect(box.borderWidth).toBe(2);
    },
  );
});

describe('SetRow ghost seed', () => {
  // kit trial 2 (LOC-412): ghost values fade to the muted ink (was secondary).
  test('ghost values read in muted ink, not primary', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'next', ghost: true } });
    expect(hex(wellText(tree, 'Set 2 weight').color)).toBe(hex(colors.textMuted));
    expect(hex(wellText(tree, 'Set 2 reps').color)).toBe(hex(colors.textMuted));
    expect(one(byLabel(tree, 'Set 2 weight')).props.accessibilityValue).toEqual({ text: '70' });
  });

  test('without ghost, or with ghost false, the values stay primary', () => {
    expect(hex(wellText(render({}), 'Set 2 weight').color)).toBe(hex(colors.textPrimary));
    expect(hex(wellText(render({ wells: { weight: 70, reps: 8, state: 'next', ghost: false } }), 'Set 2 weight').color))
      .toBe(hex(colors.textPrimary));
  });

  test('primary editing ink wins over ghost on the field being edited only', () => {
    const tree = render({ wells: { weight: 70, reps: 8, state: 'editing', editingField: 'weight', ghost: true } });
    expect(hex(wellText(tree, 'Set 2 weight').color)).toBe(hex(colors.textPrimary));
    expect(hex(wellText(tree, 'Set 2 reps').color)).toBe(hex(colors.textMuted));
  });

  test('ghost applies to every kind', () => {
    const tree = render({ kind: 'duration', wells: { reps: 60, state: 'next', ghost: true } });
    expect(hex(wellText(tree, 'Set 2 time').color)).toBe(hex(colors.textMuted));
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

  // Founder report 2026-10-11: "It's when I click a blank area to get the
  // keyboard down ... stop Notes pop up when clicking blank area." A
  // Pressable claims every touch on it, so the row's blank space never let
  // the scroll view put the keyboard away, and a rested finger opened the
  // sheet. While the keyboard is up the row is disabled: it claims nothing.
  test('holdOff: the row claims no touch while the keyboard is up, stays mounted, and its controls keep their presses', () => {
    const onLongPressRow = jest.fn();
    const onPressWell = jest.fn();
    const off = render({ onLongPressRow, onPressWell, holdOff: true });
    const row = rowPressable(off);
    expect(row).toBeTruthy(); // same element: the field being typed into is never remounted
    expect(row.props.disabled).toBe(true);
    press(one(byLabel(off, 'Set 2 reps')));
    expect(onPressWell).toHaveBeenCalledWith('reps');
    const on = render({ onLongPressRow });
    expect(rowPressable(on).props.disabled).toBe(false);
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
    // The box around the field is a plain View (not a button) carrying the
    // editing edge (kit trial 2, LOC-412: the 2 dp amber ring, flex 1).
    const wrap = one(hosts(tree, (p) => flat(p.style).borderWidth === 2 && flat(p.style).borderColor !== undefined && hex(flat(p.style).borderColor) === hex(colors.primary)));
    expect(flat(wrap.props.style).flexGrow).toBe(1);
    expect(flat(wrap.props.style).height).toBe(48);
    expect(wrap.props.accessibilityRole).toBeUndefined();
    act(() => { box.props.onChangeText('80'); });
    expect(input.onChangeText).toHaveBeenCalledWith('80');
    const s = flat(box.props.style);
    expect(hex(s.color)).toBe(hex(colors.textPrimary));
    expect(s.fontFamily).toBe('Inter-SemiBold');
    expect(s.fontSize).toBe(20);
    expect(s.fontVariant).toEqual(['tabular-nums']);
    expect(box.props.maxFontSizeMultiplier).toBe(fontScaleCaps.numeral);
  });

  // Founder report 2026-10-11: "This note thing keeps popping up when I
  // select a box to enter weight or rep not when pressing note button." The
  // field was sized to its one line of text inside the 44 dp box, so a touch
  // on the box's top or bottom band, or in the gap between the two boxes,
  // reached the row, whose 300 ms hold opens the set sheet. Every point of
  // both boxes, and the gap between them, must belong to a box.
  test('while editing, the field fills its whole box and keeps the box reach, so the row hold never takes a tap on it', () => {
    const tree = render({ onLongPressRow: jest.fn(), inputField: field(), wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    const input = one(inputs(tree));
    const s = flat(input.props.style);
    expect(s.flexGrow).toBe(1);
    expect(s.alignSelf).toBe('stretch');
    // kit trial 2 (LOC-412): the centring is set as style props on the kit Input
    // (textAlign and textAlignVertical), as before; the box is now filled by a
    // full-height field (height 100% of the 48 dp box, no padding).
    expect(s.textAlignVertical).toBe('center');
    // NativeWind moves a TextInput's textAlign from the style onto the host's
    // textAlign prop, which is where React Native reads it.
    expect(input.props.textAlign).toBe('center');
    expect(s.height).toBe('100%');
    expect(s.padding).toBe(0);
    expect(input.props.hitSlop).toEqual(one(byLabel(tree, 'Set 2 reps')).props.hitSlop);
  });

  test('the two boxes meet in the middle of the gap between them, at rest and while editing', () => {
    const resting = render({ onLongPressRow: jest.fn() });
    const gap = flat(hosts(resting, (p) => flat(p.style).flexDirection === 'row' && flat(p.style).gap === spacing.sm && flat(p.style).flex === 1)[0].props.style).gap;
    const w = one(byLabel(resting, 'Set 2 weight')).props.hitSlop;
    const r = one(byLabel(resting, 'Set 2 reps')).props.hitSlop;
    expect(w.right + r.left).toBe(gap);
    const editing = render({ onLongPressRow: jest.fn(), inputField: field(), wells: { weight: 72.5, reps: 8, state: 'editing', editingField: 'weight' } });
    expect(one(inputs(editing)).props.hitSlop.right + one(byLabel(editing, 'Set 2 reps')).props.hitSlop.left).toBe(gap);
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
