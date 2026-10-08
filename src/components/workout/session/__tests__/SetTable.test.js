/**
 * SetTable (12-BUILD-SPEC sections 2, 3, 4 and 6, register D220, the row grid
 * redrawn on the founder's render verdict, addendum 8). Pins: the column labels
 * over the same grid as the rows (SET, LAST, then one label per well box, no
 * TARGET column and no joined label), the weight label and its fallback, the
 * table-level callbacks and their arguments, row-level callbacks
 * flowing through, the tick-all control, the fold of three or more logged rows
 * (copy, rules, toggle, an editing row never hidden), and the token-only
 * source guard.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';
import { colors, type } from '../../../../styles/theme';
import SetRow, { SET_COLUMNS } from '../SetRow';
import SetTable from '../SetTable';

const DOT = String.fromCharCode(0x00b7);

function row(id, marker, check, extra = {}) {
  return {
    id,
    marker,
    last: { text: '72.5 x 8', stale: false },
    wells: { weight: 70, reps: 8, state: check === 'logged' ? 'logged' : check },
    check,
    ...extra,
  };
}
const THREE_LOGGED = [
  row('a', 'W', 'logged'),
  row('b', 1, 'logged'),
  row('c', 2, 'logged'),
  row('d', 3, 'next'),
  row('e', 4, 'pending'),
];

function render(props) {
  let tree;
  act(() => { tree = create(<SetTable rows={[]} columnsLabel={{ weight: 'kg' }} {...props} />); });
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node, ...args) => act(() => { node.props.onPress(...args); });
const flat = (style) => Object.assign({}, ...[].concat(style).filter(Boolean).map((s) => (Array.isArray(s) ? flat(s) : s)));
function words(node) {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(words);
  return words(node.children);
}
const rowsShown = (tree) => tree.root.findAllByType(SetRow);
const markersShown = (tree) => rowsShown(tree).map((r) => r.props.marker);
const wellsLabelRow = (tree) => one(hosts(tree, (p) => {
  const s = flat(p.style);
  return s.flex === 1 && s.minWidth === 0 && s.flexDirection === 'row' && s.gap === 8;
}));
// The well labels in order, as drawn (uppercased), read from the label row.
const wellLabelsOf = (tree) => wellsLabelRow(tree).findAll((n) => n.type === 'Text').map((n) => words(n).join(''));
const textHost = (tree, content) => one(tree.root.findAll((n) => n.type === 'Text' && words(n).join('') === content));

describe('SetTable column labels', () => {
  test('SET, LAST and one label per well (KG, REPS), uppercase at the overline role in secondary ink, centred', () => {
    const tree = render({});
    ['SET', 'LAST', 'KG', 'REPS'].forEach((label) => {
      const s = flat(textHost(tree, label).props.style);
      expect(s.color).toBe(colors.textSecondary);
      expect(s.fontSize).toBe(type.overline.fontSize);
      expect(s.fontFamily).toBe(type.overline.fontFamily);
      expect(s.textTransform).toBe('uppercase');
      expect(s.textAlign).toBe('center');
    });
  });

  test('there is no TARGET label and no joined "KG . REPS" label', () => {
    const shown = words(render({}).toJSON());
    expect(shown).not.toContain('TARGET');
    expect(shown).not.toContain(`KG ${DOT} REPS`);
    expect(shown).not.toContain(`LB ${DOT} REPS`);
  });

  test('the labels follow the unit, and fall back to kg over REPS without one', () => {
    expect(wellLabelsOf(render({ columnsLabel: { weight: 'lb' } }))).toEqual(['LB', 'REPS']);
    expect(wellLabelsOf(render({ columnsLabel: {} }))).toEqual(['KG', 'REPS']);
    expect(wellLabelsOf(render({ columnsLabel: undefined }))).toEqual(['KG', 'REPS']);
  });

  test('the labels sit on the row grid: same widths, an 8 dp gap, the same padding, a hairline below', () => {
    const tree = render({});
    expect(flat(textHost(tree, 'SET').props.style).width).toBe(SET_COLUMNS.marker);
    expect(flat(textHost(tree, 'LAST').props.style).width).toBe(SET_COLUMNS.last);
    const wells = flat(wellsLabelRow(tree).props.style);
    expect(wells.flex).toBe(1);
    expect(wells.minWidth).toBe(0);
    expect(wells.flexDirection).toBe('row');
    expect(wells.gap).toBe(8);
    ['KG', 'REPS'].forEach((label) => {
      const s = flat(textHost(tree, label).props.style);
      expect(s.flex).toBe(1);
      expect(s.minWidth).toBe(0);
    });
    const bar = one(hosts(tree, (p) => flat(p.style).minHeight === 36 && flat(p.style).borderBottomWidth === 1));
    const s = flat(bar.props.style);
    expect(s.gap).toBe(8);
    expect(s.paddingLeft).toBe(12);
    expect(s.paddingRight).toBe(8);
    expect(s.borderBottomColor).toBe(colors.borderSubtle);
  });
});

describe('SetTable tick-all', () => {
  test('without onLogRemaining the check column is empty: no glyph, no word, no control', () => {
    const tree = render({});
    expect(byLabel(tree, 'Log remaining sets')).toHaveLength(0);
    expect(tree.root.findAll((n) => n.type === 'Ionicons')).toHaveLength(0);
    expect(words(tree.toJSON())).not.toContain('ALL');
  });

  test('with onLogRemaining it is the word ALL in the column label style, a button that calls it with no arguments', () => {
    const onLogRemaining = jest.fn();
    const tree = render({ onLogRemaining });
    const button = one(byLabel(tree, 'Log remaining sets'));
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 6, right: 6 });
    expect(tree.root.findAll((n) => n.type === 'Ionicons')).toHaveLength(0);
    const all = flat(textHost(tree, 'ALL').props.style);
    expect(all.color).toBe(colors.textSecondary);
    expect(all.fontSize).toBe(type.overline.fontSize);
    expect(all.fontFamily).toBe(type.overline.fontFamily);
    expect(all.textTransform).toBe('uppercase');
    expect(all.textAlign).toBe('center');
    press(button);
    expect(onLogRemaining).toHaveBeenCalledTimes(1);
    expect(onLogRemaining).toHaveBeenCalledWith();
  });
});

describe('SetTable rows and callbacks', () => {
  test('renders one SetRow per row in order', () => {
    const tree = render({ rows: [row('a', 1, 'logged'), row('b', 2, 'next'), row('c', 3, 'pending')] });
    expect(markersShown(tree)).toEqual([1, 2, 3]);
  });

  test('empty or missing rows render only the labels', () => {
    expect(markersShown(render({ rows: [] }))).toEqual([]);
    expect(markersShown(render({ rows: undefined }))).toEqual([]);
  });

  test('table-level onCheck gets the row id; onPressWell gets the id and the field', () => {
    const onCheck = jest.fn();
    const onPressWell = jest.fn();
    const tree = render({ rows: [row('r1', 1, 'logged'), row('r2', 2, 'next')], onCheck, onPressWell });
    press(one(byLabel(tree, 'Log set 2')));
    press(one(byLabel(tree, 'Set 1 weight')));
    press(one(byLabel(tree, 'Set 2 reps')));
    expect(onCheck.mock.calls).toEqual([['r2']]);
    expect(onPressWell.mock.calls).toEqual([['r1', 'weight'], ['r2', 'reps']]);
  });

  test('the next row keeps volyume-btn-complete-set through the table', () => {
    const tree = render({ rows: [row('r1', 1, 'logged'), row('r2', 2, 'next')], onCheck: () => {} });
    expect(hosts(tree, (p) => p.testID === 'volyume-btn-complete-set')).toHaveLength(1);
  });

  test('row-level callbacks are used when the table gives none, and onPressLast always flows through', () => {
    const rowCheck = jest.fn();
    const rowWell = jest.fn();
    const onPressLast = jest.fn();
    const tree = render({ rows: [row('r2', 2, 'next', { onCheck: rowCheck, onPressWell: rowWell, onPressLast })] });
    press(one(byLabel(tree, 'Log set 2')));
    press(one(byLabel(tree, 'Set 2 weight')));
    press(one(byLabel(tree, "Use last session's set")));
    expect(rowCheck).toHaveBeenCalledTimes(1);
    expect(rowWell).toHaveBeenCalledWith('weight');
    expect(onPressLast).toHaveBeenCalledTimes(1);
  });

  test('a table-level callback wins over the row\'s own', () => {
    const rowCheck = jest.fn();
    const onCheck = jest.fn();
    const tree = render({ rows: [row('r2', 2, 'next', { onCheck: rowCheck })], onCheck });
    press(one(byLabel(tree, 'Log set 2')));
    expect(onCheck).toHaveBeenCalledWith('r2');
    expect(rowCheck).not.toHaveBeenCalled();
  });
});

describe('SetTable fold', () => {
  test('under three logged rows nothing folds', () => {
    const tree = render({ rows: [row('a', 'W', 'logged'), row('b', 1, 'logged'), row('c', 2, 'next')] });
    expect(markersShown(tree)).toEqual(['W', 1, 2]);
    expect(words(tree.toJSON()).join(' ')).not.toMatch(/earlier/);
  });

  test('three logged rows fold behind one line; the latest logged row and the unlogged rows stay', () => {
    const tree = render({ rows: THREE_LOGGED });
    expect(markersShown(tree)).toEqual([2, 3, 4]);
    expect(words(tree.toJSON())).toContain('2 earlier sets logged');
    const toggle = one(byLabel(tree, 'Show 2 earlier logged sets'));
    expect(toggle.props.accessibilityRole).toBe('button');
    expect(toggle.props.accessibilityState).toEqual({ expanded: false });
    const s = flat(textHost(tree, '2 earlier sets logged').props.style);
    expect(s.color).toBe(colors.textSecondary);
    expect(s.fontSize).toBe(type.label.fontSize);
  });

  test('the toggle opens and closes the fold', () => {
    const tree = render({ rows: THREE_LOGGED });
    press(one(byLabel(tree, 'Show 2 earlier logged sets')));
    expect(markersShown(tree)).toEqual(['W', 1, 2, 3, 4]);
    expect(words(tree.toJSON())).toContain('Hide earlier sets');
    const open = one(byLabel(tree, 'Hide earlier logged sets'));
    expect(open.props.accessibilityState).toEqual({ expanded: true });
    press(open);
    expect(markersShown(tree)).toEqual([2, 3, 4]);
  });

  test('the fold line has a 48 dp reach: 36 dp tall plus a 6 dp slop top and bottom', () => {
    const toggle = one(byLabel(render({ rows: THREE_LOGGED }), 'Show 2 earlier logged sets'));
    expect(flat(toggle.props.style).minHeight).toBe(36);
    expect(toggle.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
  });

  test('the fold line pads 12 dp each side', () => {
    const toggle = one(byLabel(render({ rows: THREE_LOGGED }), 'Show 2 earlier logged sets'));
    expect(flat(toggle.props.style).paddingHorizontal).toBe(12);
  });

  test('a row being edited is never hidden, and the count is singular when one hides', () => {
    const rows = [
      row('a', 'W', 'logged'),
      row('b', 1, 'logged', { wells: { weight: 70, reps: 8, state: 'editing', editingField: 'weight' } }),
      row('c', 2, 'logged'),
      row('d', 3, 'next'),
    ];
    const tree = render({ rows });
    expect(markersShown(tree)).toEqual([1, 2, 3]);
    expect(words(tree.toJSON())).toContain('1 earlier set logged');
    expect(byLabel(tree, 'Show 1 earlier logged set')).toHaveLength(1);
  });

  test('the fold appears as the third set is logged, and an opened fold stays open as more are logged', () => {
    let tree;
    const props = { columnsLabel: { weight: 'kg' } };
    act(() => { tree = create(<SetTable {...props} rows={THREE_LOGGED.slice(0, 2)} />); });
    expect(markersShown(tree)).toEqual(['W', 1]);
    act(() => { tree.update(<SetTable {...props} rows={THREE_LOGGED} />); });
    expect(markersShown(tree)).toEqual([2, 3, 4]);
    press(one(byLabel(tree, 'Show 2 earlier logged sets')));
    const more = [...THREE_LOGGED.slice(0, 3), row('d', 3, 'logged'), row('e', 4, 'next')];
    act(() => { tree.update(<SetTable {...props} rows={more} />); });
    expect(markersShown(tree)).toEqual(['W', 1, 2, 3, 4]);
  });
});

describe('SetTable kinds (column labels and row pass-through)', () => {
  test.each([
    ['weight_reps', { weight: 'kg' }, 'kg', ['KG', 'REPS']],
    [undefined, { weight: 'lb' }, 'lb', ['LB', 'REPS']],
    ['reps_only', { weight: 'kg' }, 'kg', ['REPS']],
    ['duration', { weight: 'kg' }, 'kg', ['TIME']],
    ['distance', { weight: 'kg' }, 'kg', ['M', 'TIME']],
    ['distance', { weight: 'lb' }, 'lb', ['YD', 'TIME']],
  ])('kind %s with %j and units %s labels the wells %j, one label per box', (kind, columnsLabel, units, expected) => {
    const tree = render({ kind, columnsLabel, units });
    expect(wellLabelsOf(tree)).toEqual(expected);
    expect(words(tree.toJSON())).not.toContain('TARGET');
    wellsLabelRow(tree).findAll((n) => n.type === 'Text').forEach((n) => {
      expect(flat(n.props.style).flex).toBe(1);
    });
  });

  test('units default to kg for the distance label', () => {
    expect(wellLabelsOf(render({ kind: 'distance' }))).toEqual(['M', 'TIME']);
  });

  test('kind, units, inputField, onLongPressRow and checkLabel reach every SetRow', () => {
    const inputField = { field: 'weight', value: '70', onChangeText: () => {}, keyboardType: 'decimal-pad', testID: 'in' };
    const onLongPressRow = () => {};
    const rows = [row('a', 1, 'next', { kind: 'distance', units: 'lb', inputField, onLongPressRow, checkLabel: 'Start cluster' })];
    const tree = render({ rows });
    const p = rowsShown(tree)[0].props;
    expect(p.kind).toBe('distance');
    expect(p.units).toBe('lb');
    expect(p.inputField).toBe(inputField);
    expect(p.onLongPressRow).toBe(onLongPressRow);
    expect(p.checkLabel).toBe('Start cluster');
    expect(byLabel(tree, 'Start cluster')).toHaveLength(1);
  });

  test('rows take the table kind and units unless they name their own', () => {
    const tree = render({
      kind: 'duration',
      units: 'lb',
      rows: [row('a', 1, 'next'), row('b', 2, 'pending', { kind: 'reps_only' })],
    });
    const [a, b] = rowsShown(tree).map((r) => r.props);
    expect(a.kind).toBe('duration');
    expect(b.kind).toBe('reps_only');
    expect(a.units).toBe('lb');
  });

  test('the tick-all control carries volyume-btn-log-remaining', () => {
    const tree = render({ onLogRemaining: () => {} });
    expect(one(byLabel(tree, 'Log remaining sets')).props.testID).toBe('volyume-btn-log-remaining');
  });
});

describe('SetTable source guard (tokens only)', () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, '..', 'SetTable.js'), 'utf8');
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
