/**
 * SetTable (12-BUILD-SPEC sections 2, 3, 4 and 6, register D220, the row grid
 * redrawn on the founder's render verdict, addendum 8; redrawn with the kit in
 * kit trial 2, LOC-412). Pins: the column labels over the same grid as the rows
 * (SET, LAST, then one label per well box, no TARGET column and no joined
 * label), the weight label and its fallback, the table-level callbacks and
 * their arguments, row-level callbacks flowing through, the tick-all control,
 * the fold of three or more logged rows (copy, rules, toggle, an editing row
 * never hidden), the dividers (one under the labels, one after the fold line,
 * one after each row) and the source guard.
 *
 * The look is the kit's (src/components/ui/exercise-card-kit.tsx and set-row-kit.tsx):
 * classes resolved through NativeWind at render time and lucide icons, so these
 * tests render through the kit's real styling pipeline (src/components/ui/__tests__/
 * kitTestEnv.js) and read resolved styles, as kitTrial2Surfaces.test.js does.
 * Behaviour, callbacks and spoken labels are pinned as before; only the
 * presentation pins moved to the new look.
 */
jest.mock('react-native-svg', () => require('../../../ui/__tests__/kitTestEnv').svgMock());
jest.mock('react-native', () => require('../../../ui/__tests__/kitTestEnv').reactNativeMock());
const {
  loadNativeInteropRuntime, setUpKitStyles, setPalette, renderKit, hostNodes, normaliseColour, flatStyle,
} = require('../../../ui/__tests__/kitTestEnv');

loadNativeInteropRuntime();

// Plain requires, after loadNativeInteropRuntime(): an import would be hoisted
// above it and load the web runtime of css-interop.
const fs = require('fs');
const path = require('path');
const { act } = require('react-test-renderer');
const { resolveTheme, fontScaleCaps, spacing } = require('../../../../styles/theme');
const SetRowModule = require('../SetRow');
const SetTable = require('../SetTable').default;
const { KitThemeProvider } = require('../../../ui/kit-theme-provider');

const SetRow = SetRowModule.default;
const { SET_COLUMNS } = SetRowModule;
// The dark palette's tokens: the kit variables resolve to these.
const colors = resolveTheme({ theme: 'dark' }).colors;
const hex = (c) => normaliseColour(c).hex;

beforeAll(() => { setUpKitStyles(); setPalette({ theme: 'dark' }); }, 120000);

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
  tree = renderKit(<SetTable rows={[]} columnsLabel={{ weight: 'kg' }} {...props} />);
  return tree;
}
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n.props || {}));
const byLabel = (tree, label) => hosts(tree, (p) => p.accessibilityLabel === label);
const one = (list) => { expect(list).toHaveLength(1); return list[0]; };
const press = (node, ...args) => act(() => { node.props.onPress(...args); });
const flat = flatStyle;
// The nearest host ancestor: the kit's label parts are composites, so a Text's .parent is not a view.
const hostParent = (node) => { let n = node.parent; while (n && typeof n.type !== 'string') n = n.parent; return n; };
const icons = (tree, name) => (tree.root ?? tree).findAll((n) => n.type === 'LucideIcon' && n.props.name === name);
// The 1 dp dividers (the kit Separator: role 'presentation').
const dividers = (tree) => hostNodes(tree).filter((n) => n.props.role === 'presentation' && flat(n.props.style).height === 1);
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
  test('SET, LAST and one label per well (KG, REPS), uppercase words in muted ink at 11, centred and tracked out', () => {
    // kit trial 2 (LOC-412): the labels are the kit's SetColumnLabel (11, textMuted, tracking-widest,
    // numeral font-scale cap) instead of the type.overline role in secondary ink. The words are
    // uppercase in the source (no textTransform), so what is pinned is the drawn word itself.
    const tree = render({});
    ['SET', 'LAST', 'KG', 'REPS'].forEach((label) => {
      const host = textHost(tree, label);
      const s = flat(host.props.style);
      expect(hex(s.color)).toBe(hex(colors.textMuted));
      expect(s.fontSize).toBe(11);
      expect(s.letterSpacing).toBeGreaterThan(0);
      expect(s.textAlign).toBe('center');
      expect(host.props.numberOfLines).toBe(1);
      expect(host.props.maxFontSizeMultiplier).toBe(fontScaleCaps.numeral);
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
    // kit trial 2 (LOC-412): the widths sit on a View around each label Text (the Text no longer
    // carries them), and the check column is SET_COLUMNS.check, now 48 (was 36).
    expect(SET_COLUMNS.check).toBe(48);
    expect(flat(hostParent(textHost(tree, 'SET')).props.style).width).toBe(SET_COLUMNS.marker);
    expect(flat(hostParent(textHost(tree, 'LAST')).props.style).width).toBe(SET_COLUMNS.last);
    expect(SET_COLUMNS.marker).toBe(24);
    expect(SET_COLUMNS.last).toBe(80);
    const wells = flat(wellsLabelRow(tree).props.style);
    expect(wells.flex).toBe(1);
    expect(wells.minWidth).toBe(0);
    expect(wells.flexDirection).toBe('row');
    expect(wells.gap).toBe(8);
    ['KG', 'REPS'].forEach((label) => {
      const s = flat(hostParent(textHost(tree, label)).props.style);
      expect(s.flex).toBe(1);
      expect(s.minWidth).toBe(0);
    });
    // The label row is the kit's SetColumnsShell: a 36 dp row with an 8 dp gap and a 12 dp left
    // inset, and (kit trial 2) a Separator host sibling in place of borderBottomWidth.
    const bar = one(hosts(tree, (p) => {
      const st = flat(p.style);
      return st.minHeight === 36 && (st.gap ?? st.columnGap) === 8 && st.paddingLeft === 12;
    }));
    const s = flat(bar.props.style);
    expect(s.flexDirection).toBe('row');
    expect(s.paddingRight ?? 0).toBe(0);
    expect(s.borderBottomWidth).toBeUndefined();
    const checkCol = flat(hostParent(hostParent(textHost(render({ onLogRemaining: () => {} }), 'ALL'))).props.style);
    expect(checkCol.width).toBe(SET_COLUMNS.check);
    const rule = one(dividers(tree));
    expect(hex(flat(rule.props.style).backgroundColor)).toBe(hex(colors.borderSubtle));
    // The rule follows the label row, under the same parent.
    expect(hostParent(rule)).toBe(hostParent(bar));
    const order = hostNodes(tree);
    expect(order.indexOf(rule)).toBeGreaterThan(order.indexOf(bar));
  });
});

describe('SetTable tick-all', () => {
  test('without onLogRemaining the check column is empty: no glyph, no word, no control', () => {
    const tree = render({});
    expect(byLabel(tree, 'Log remaining sets')).toHaveLength(0);
    expect(tree.root.findAll((n) => n.type === 'LucideIcon')).toHaveLength(0);
    expect(words(tree.toJSON())).not.toContain('ALL');
  });

  test('with onLogRemaining it is the word ALL in the column label style, a button that calls it with no arguments', () => {
    const onLogRemaining = jest.fn();
    const tree = render({ onLogRemaining });
    const button = one(byLabel(tree, 'Log remaining sets'));
    expect(button.props.accessibilityRole).toBe('button');
    // kit trial 2 (LOC-412): the check column is 48 wide, so the hit area is 48 by 36 plus a 6 dp
    // slop top and bottom (48 by 48) and no sideways slop; it was 36 wide with 6 dp slop all round.
    expect(button.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    expect(button.type).toBe('TouchableOpacity');
    const buttonStyle = flat(button.props.style);
    expect(buttonStyle.width).toBe(SET_COLUMNS.check);
    expect(buttonStyle.minHeight).toBe(36);
    expect(tree.root.findAll((n) => n.type === 'LucideIcon')).toHaveLength(0);
    const allHost = textHost(tree, 'ALL');
    const all = flat(allHost.props.style);
    // The kit column label in its chrome form: 11, muted, centred, the chrome font-scale cap.
    expect(hex(all.color)).toBe(hex(colors.textMuted));
    expect(all.fontSize).toBe(11);
    expect(all.textAlign).toBe('center');
    expect(allHost.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
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
    // kit trial 2 (LOC-412): the fold label is the kit's SetFoldLabel (muted ink, small text, a
    // chevron-down while folded) rather than secondary ink at the label role.
    const labelHost = textHost(tree, '2 earlier sets logged');
    const s = flat(labelHost.props.style);
    expect(hex(s.color)).toBe(hex(colors.textMuted));
    expect(s.fontSize).toBeLessThanOrEqual(14);
    expect(labelHost.props.maxFontSizeMultiplier).toBe(fontScaleCaps.chrome);
    expect(icons(toggle, 'ChevronDown')).toHaveLength(1);
    expect(icons(toggle, 'ChevronUp')).toHaveLength(0);
  });

  test('the toggle opens and closes the fold', () => {
    const tree = render({ rows: THREE_LOGGED });
    press(one(byLabel(tree, 'Show 2 earlier logged sets')));
    expect(markersShown(tree)).toEqual(['W', 1, 2, 3, 4]);
    expect(words(tree.toJSON())).toContain('Hide earlier sets');
    const open = one(byLabel(tree, 'Hide earlier logged sets'));
    expect(open.props.accessibilityState).toEqual({ expanded: true });
    // kit trial 2 (LOC-412): the open fold line draws the chevron-up.
    expect(icons(open, 'ChevronUp')).toHaveLength(1);
    expect(icons(open, 'ChevronDown')).toHaveLength(0);
    press(open);
    expect(markersShown(tree)).toEqual([2, 3, 4]);
  });

  test('the fold line has a 48 dp reach: 36 dp tall plus a 6 dp slop top and bottom', () => {
    const toggle = one(byLabel(render({ rows: THREE_LOGGED }), 'Show 2 earlier logged sets'));
    expect(toggle.type).toBe('TouchableOpacity');
    // kit trial 2 (LOC-412): the 36 dp is the kit's SetFoldLabel View inside the toggle (the
    // toggle itself no longer carries a style); the slop is unchanged.
    const label = one(toggle.findAll((n) => typeof n.type === 'string' && flat(n.props.style).minHeight === 36));
    expect(flat(label.props.style).minHeight).toBe(36);
    expect(toggle.props.hitSlop).toEqual({ top: 6, bottom: 6, left: 0, right: 0 });
    expect(toggle.props.hitSlop).toEqual({ top: spacing.xs2, bottom: spacing.xs2, left: 0, right: 0 });
  });

  test('the fold line pads 12 dp each side', () => {
    const toggle = one(byLabel(render({ rows: THREE_LOGGED }), 'Show 2 earlier logged sets'));
    // kit trial 2 (LOC-412): the padding is on the SetFoldLabel View (px-3), not the toggle.
    const label = flat(one(toggle.findAll((n) => typeof n.type === 'string' && flat(n.props.style).minHeight === 36)).props.style);
    expect(label.paddingHorizontal ?? label.paddingLeft).toBe(12);
    expect(label.paddingHorizontal ?? label.paddingRight).toBe(12);
  });

  test('dividers: one under the column labels, one after the fold line, one after each shown row', () => {
    // kit trial 2 (LOC-412): the hairlines are Separator hosts (role presentation, 1 dp, borderSubtle).
    expect(dividers(render({}))).toHaveLength(1);
    expect(dividers(render({ rows: [row('a', 1, 'logged'), row('b', 2, 'next')] }))).toHaveLength(3);
    const folded = render({ rows: THREE_LOGGED });
    // labels + fold line + the three rows that stay visible.
    expect(dividers(folded)).toHaveLength(5);
    for (const d of dividers(folded)) expect(hex(flat(d.props.style).backgroundColor)).toBe(hex(colors.borderSubtle));
    // The fold line is followed by its divider, in render order: toggle, then a divider.
    const order = hostNodes(folded);
    const toggle = one(byLabel(folded, 'Show 2 earlier logged sets'));
    const after = order.slice(order.indexOf(toggle) + 1).find((n) => n.props.role === 'presentation');
    expect(after).toBe(dividers(folded)[1]);
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
    // kit trial 2 (LOC-412): mounted under the same KitThemeProvider root as renderKit, so the
    // updates below keep the tree (and the fold's open state).
    const mount = (rows) => (<KitThemeProvider><SetTable {...props} rows={rows} /></KitThemeProvider>);
    act(() => { tree = require('react-test-renderer').create(mount(THREE_LOGGED.slice(0, 2))); });
    expect(markersShown(tree)).toEqual(['W', 1]);
    act(() => { tree.update(mount(THREE_LOGGED)); });
    expect(markersShown(tree)).toEqual([2, 3, 4]);
    press(one(byLabel(tree, 'Show 2 earlier logged sets')));
    const more = [...THREE_LOGGED.slice(0, 3), row('d', 3, 'logged'), row('e', 4, 'next')];
    act(() => { tree.update(mount(more)); });
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
    // kit trial 2 (LOC-412): the flex sits on the View around each label (the Text is the kit label).
    wellsLabelRow(tree).findAll((n) => n.type === 'Text').forEach((n) => {
      expect(flat(hostParent(n).props.style).flex).toBe(1);
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
  // kit trial 2 (LOC-412): the source legitimately changed to draw the labels, fold line and
  // dividers with the kit parts, so the guard also pins that (no Ionicons, no border or colour
  // styles of its own: the hairlines are Separators).
  test('draws with the kit parts, not Ionicons, inline colours or its own borders', () => {
    expect(SRC).toMatch(/from '\.\.\/\.\.\/ui\/exercise-card-kit'/);
    expect(SRC).not.toMatch(/Ionicons/);
    expect(SRC).not.toMatch(/border(Bottom)?Width/);
    expect(SRC).not.toMatch(/colors\./);
  });
});
