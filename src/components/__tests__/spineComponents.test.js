/**
 * The stage 1 spine, rendered — BigNumber, WeekRibbon, LedgerRow.
 *
 * `designDirectionD.guard.test.js` pins these components' SOURCE, which stops
 * a future edit quietly undoing a law. It cannot tell you the component
 * renders, so this suite does the other half: real trees, real theme tokens,
 * and the behaviour each component promises in its docblock.
 *
 * What this pins, and why each case is written to fail:
 *  - BigNumber speaks ONE accessibility string for a figure that is visually
 *    three nodes (label, value, unit). A screen reader hearing "98.5" then
 *    "kg" as separate stops is the bug this prevents.
 *  - The week ribbon always draws seven cells whatever it is handed, resolves
 *    today over trained (amber means NOW, and "now" must never be ambiguous),
 *    and collapses to one accessibility node rather than seven anonymous ones.
 *  - LedgerRow suppresses its own top rule on the first row of a block, so a
 *    list does not open with a hairline hanging above nothing, and spends
 *    amber only on the current row.
 */

import { create, act } from 'react-test-renderer';
import { Text } from 'react-native';

jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));

import BigNumber from '../BigNumber';
import WeekRibbon from '../WeekRibbon';
import LedgerRow from '../LedgerRow';
import { colors, fontSize } from '../../styles/theme';

function render(el) {
  let tree;
  act(() => { tree = create(el); });
  return tree;
}

const flat = (n) => {
  const s = n.props?.style;
  return Array.isArray(s) ? Object.assign({}, ...s.flat(Infinity).filter(Boolean)) : (s || {});
};

const texts = (tree) => tree.root.findAllByType(Text);

// RN's View/Text are components that render a host element of the same name,
// so a prop-based findAll matches BOTH. Filtering to host nodes (string type)
// counts the rendered element once, which is what these assertions mean.
const hosts = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));

describe('BigNumber', () => {
  test('renders the value, its unit and its label', () => {
    const tree = render(<BigNumber label="Bodyweight" value="98.5" unit="kg" caption="+0.4 kg this week" />);
    const shown = texts(tree).map((n) => n.props.children);
    expect(shown).toContain('Bodyweight');
    expect(shown).toContain('98.5');
    expect(shown).toContain('kg');
    expect(shown).toContain('+0.4 kg this week');
  });

  test('speaks one string, so the figure and its unit are not separate stops', () => {
    const tree = render(<BigNumber label="Bodyweight" value="98.5" unit="kg" caption="+0.4 kg this week" />);
    const spoken = texts(tree).filter((n) => n.props.accessibilityLabel);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].props.accessibilityLabel).toBe('Bodyweight, 98.5 kg, +0.4 kg this week');
  });

  test('an explicit accessibilityLabel wins over the composed one', () => {
    const tree = render(<BigNumber value="98.5" unit="kg" accessibilityLabel="Bodyweight, ninety eight point five kilograms" />);
    const spoken = texts(tree).filter((n) => n.props.accessibilityLabel);
    expect(spoken[0].props.accessibilityLabel).toBe('Bodyweight, ninety eight point five kilograms');
  });

  test('the value renders at the loud step, in tabular figures', () => {
    const tree = render(<BigNumber value="98.5" />);
    const value = texts(tree).find((n) => n.props.children === '98.5');
    const st = flat(value);
    expect(st.fontSize).toBe(fontSize.hero);
    expect(st.fontVariant).toEqual(['tabular-nums']);
  });

  test('tone "now" spends amber; the default does not', () => {
    const now = render(<BigNumber value="Upper A" tone="now" />);
    const ink = render(<BigNumber value="Upper A" />);
    expect(flat(texts(now).find((n) => n.props.children === 'Upper A')).color).toBe(colors.primary);
    expect(flat(texts(ink).find((n) => n.props.children === 'Upper A')).color).toBe(colors.textPrimary);
  });

  test('a caption, a label and a unit are each optional', () => {
    const tree = render(<BigNumber value="Upper A" />);
    expect(texts(tree)).toHaveLength(1);
  });
});

describe('WeekRibbon', () => {
  const cells = (tree) => tree.root
    .findAll((n) => typeof n.type === 'string' && flat(n).flex === 1 && flat(n).height != null);

  test('draws seven cells for a full week', () => {
    const tree = render(<WeekRibbon days={['mon', 'wed', 'fri']} todayKey="thu" />);
    expect(cells(tree)).toHaveLength(7);
  });

  test('still draws seven cells for an empty week, and for rubbish input', () => {
    expect(cells(render(<WeekRibbon days={[]} todayKey={null} />))).toHaveLength(7);
    expect(cells(render(<WeekRibbon days={null} todayKey={null} />))).toHaveLength(7);
  });

  // RE-ANCHORED (D191, 2026-09-17): today trained = amber FILL, today not
  // yet trained = amber OUTLINE. Either way exactly one cell is amber, and
  // a filled cell always means a session.
  test('today, once trained, is the one amber fill and wins over trained', () => {
    const tree = render(<WeekRibbon days={['mon', 'wed']} todayKey="wed" />);
    const amber = cells(tree).filter((c) => flat(c).backgroundColor === colors.primary);
    expect(amber).toHaveLength(1);
    expect(cells(tree).filter((c) => flat(c).borderColor === colors.primary)).toHaveLength(0);
  });

  test('today, before training, is an amber outline on the quiet fill, never a slab', () => {
    const tree = render(<WeekRibbon days={['mon']} todayKey="thu" />);
    const outlined = cells(tree).filter((c) => flat(c).borderColor === colors.primary);
    expect(outlined).toHaveLength(1);
    expect(flat(outlined[0]).backgroundColor).toBe(colors.surface);
    expect(cells(tree).filter((c) => flat(c).backgroundColor === colors.primary)).toHaveLength(0);
  });

  test('a trained day that is not today reads as trained, not as now', () => {
    const tree = render(<WeekRibbon days={['mon']} todayKey="thu" />);
    const fills = cells(tree).map((c) => flat(c).backgroundColor);
    expect(fills.filter((c) => c === colors.borderLight)).toHaveLength(1);
    expect(fills.filter((c) => c === colors.primary)).toHaveLength(0);
  });

  test('the whole band is one accessibility node, naming the days in full', () => {
    const tree = render(<WeekRibbon days={['mon', 'wed', 'fri']} todayKey="thu" />);
    const spoken = hosts(tree, (n) => n.props?.accessible === true);
    expect(spoken).toHaveLength(1);
    expect(spoken[0].props.accessibilityLabel).toBe('This week: trained Monday, Wednesday, Friday.');
  });

  test('a quiet week says so plainly, with no shame and no broken state', () => {
    const tree = render(<WeekRibbon days={[]} todayKey="thu" />);
    const spoken = hosts(tree, (n) => n.props?.accessible === true)[0];
    expect(spoken.props.accessibilityLabel).toBe('This week: no sessions yet.');
  });

  test('the column initials are hidden from the screen reader, not read twice', () => {
    const tree = render(<WeekRibbon days={['mon']} todayKey="mon" />);
    const hidden = hosts(tree, (n) => n.props?.importantForAccessibility === 'no-hide-descendants');
    expect(hidden).toHaveLength(1);
    expect(texts(tree).map((n) => n.props.children)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });
});

// RE-ANCHORED 2026-09-18 (D192, one unit format): the fixture figure below
// reads "100 kg × 8" (space before the unit, × not x) everywhere in this
// block, matching the one format the app now prints for a logged set.
// LedgerRow itself does not format anything -- it renders whatever `primary`
// string it is given -- so the fixture's exact text is incidental to every
// assertion here (index/secondary rendering, the hairline rule, current-row
// amber ink, the 48 dp minimum, no gutter of its own); intent kept unchanged.
describe('LedgerRow', () => {
  const rowNode = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && flat(n).flexDirection === 'row')[0];

  test('renders the index, the figure and its trailing fact', () => {
    const tree = render(<LedgerRow index="3" primary="100 kg × 8" secondary="est. 1RM 125 kg" />);
    expect(texts(tree).map((n) => n.props.children)).toEqual(['3', '100 kg × 8', 'est. 1RM 125 kg']);
  });

  test('the first row of a block draws no rule above it', () => {
    const first = render(<LedgerRow primary="100 kg × 8" first />);
    const later = render(<LedgerRow primary="100 kg × 8" />);
    expect(flat(rowNode(first)).borderTopWidth).toBeUndefined();
    expect(flat(rowNode(later)).borderTopWidth).toBeGreaterThan(0);
  });

  test('the rule is the hairline token, never the bright control edge', () => {
    const tree = render(<LedgerRow primary="100 kg × 8" />);
    expect(flat(rowNode(tree)).borderTopColor).toBe(colors.borderSubtle);
    expect(flat(rowNode(tree)).borderTopColor).not.toBe(colors.border);
  });

  test('the current row is amber ink; done and upcoming are not', () => {
    const cur = render(<LedgerRow index="3" primary="100 kg × 8" state="current" />);
    const done = render(<LedgerRow index="2" primary="100 kg × 8" state="done" />);
    const next = render(<LedgerRow index="4" primary="100 kg × 8" state="upcoming" />);
    const colourOf = (t) => flat(texts(t).find((n) => n.props.children === '100 kg × 8')).color;
    expect(colourOf(cur)).toBe(colors.primary);
    expect(colourOf(done)).toBe(colors.textPrimary);
    expect(colourOf(next)).toBe(colors.textMuted);
  });

  test('amber is ink on the current row, never a fill behind it', () => {
    const tree = render(<LedgerRow index="3" primary="100 kg × 8" state="current" />);
    expect(flat(rowNode(tree)).backgroundColor).toBeUndefined();
  });

  test('a row clears the 48 dp minimum, so it can carry a control', () => {
    const tree = render(<LedgerRow primary="100 kg × 8" trailing={<Text>x</Text>} />);
    expect(flat(rowNode(tree)).minHeight).toBeGreaterThanOrEqual(48);
  });

  test('the row pays no gutter of its own, so the page keeps one left edge', () => {
    const tree = render(<LedgerRow primary="100 kg × 8" />);
    const st = flat(rowNode(tree));
    expect(st.paddingHorizontal).toBeUndefined();
    expect(st.paddingLeft).toBeUndefined();
  });
});
