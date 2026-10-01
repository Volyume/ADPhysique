/**
 * LegendRow.test.js
 *
 * D214 (Progress, recovery heatmap and Consistency elevation; plan
 * `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 7.0 rule 3 and 7.5): ONE legend style for
 * the body figure's two palettes, the Progress strip and the training-days
 * grid. This suite pins what makes it one style, and why each pin is here:
 *   1. The swatch is 12 dp with `radius.xs`, the label is `captionTight` in
 *      `textSecondary`. A second legend look is the drift rule 3 exists to
 *      stop.
 *   2. A state with no fill still has a swatch: `outline: 'solid'` and
 *      `'dashed'` draw a 1 dp `border` hairline (the figure's "No sets" and
 *      "No session in 14 days" are told apart from a missing swatch by the
 *      hairline, and from each other by its shape); `'none'` or no outline
 *      draws nothing.
 *   3. A ramp reads label, swatches in order, end label ("More to recover"
 *      ... "less"); an entry can carry its own solid outline (the recovery
 *      ramp's third step).
 *   4. The entries are ONE accessible group whose label joins them, and the
 *      trailing node (an InfoTooltip) is OUTSIDE that group: nested in it,
 *      iOS VoiceOver could not reach the tooltip.
 *   5. Nothing renders for no items, so a caller can hand over a list that
 *      has not loaded.
 *   6. The colours are live (a light theme changes them), and the file holds
 *      no raw hex and no amber token (a legend names a state, it is never the
 *      thing to do).
 *
 * `useTheme` is mocked to the real `resolveTheme` of a mutable preference
 * object, so a test can ask for the dark, light or colour-blind-safe palette
 * and compute every expected value from the token tables.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { resolveTheme, radius } from '../../styles/theme';

let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

const LegendRow = require('../LegendRow').default;

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'LegendRow.js'), 'utf8');

// Host nodes only: the forwardRef composites in the react-native mock would
// otherwise match every query twice.
const host = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));
const flat = (style) => Object.assign({}, ...[].concat(style || []).flat(Infinity).filter(Boolean));
const swatches = (tree) => host(tree, (n) => n.props.testID === 'legend-swatch');
const labelTexts = (tree) => tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));

beforeEach(() => { mockPrefs = {}; });

describe('the swatch and the label are one style', () => {
  const items = [
    { key: 'a', label: 'Under the range', swatch: { fill: 'tomato' } },
    { key: 'b', label: 'In range', swatch: { fill: 'seagreen' } },
  ];

  test('every swatch is 12 dp with radius.xs, and carries its fill', () => {
    const tree = create(<LegendRow items={items} />);
    const found = swatches(tree);
    expect(found).toHaveLength(2);
    found.forEach((s) => {
      const style = flat(s.props.style);
      expect(style.width).toBe(12);
      expect(style.height).toBe(12);
      expect(style.borderRadius).toBe(radius.xs);
    });
    expect(flat(found[0].props.style).backgroundColor).toBe('tomato');
    expect(flat(found[1].props.style).backgroundColor).toBe('seagreen');
  });

  test('the labels are captionTight in textSecondary, in the order given', () => {
    const t = resolveTheme({});
    const tree = create(<LegendRow items={items} />);
    expect(labelTexts(tree)).toEqual(['Under the range', 'In range']);
    tree.root.findAllByType(Text).forEach((n) => {
      const style = flat(n.props.style);
      expect(style.fontSize).toBe(t.type.captionTight.fontSize);
      expect(style.lineHeight).toBe(t.type.captionTight.lineHeight);
      expect(style.color).toBe(t.colors.textSecondary);
    });
  });
});

describe('a state with no fill is told by its hairline', () => {
  test('solid and dashed outlines draw a 1 dp border hairline of that shape; none and absent draw nothing', () => {
    const t = resolveTheme({});
    const tree = create(
      <LegendRow
        items={[
          { key: 'solid', label: 'Recovered', swatch: { fill: t.colors.surface3, outline: 'solid' } },
          { key: 'dashed', label: 'No session in 14 days', swatch: { outline: 'dashed' } },
          { key: 'none', label: 'Plain', swatch: { fill: 'tomato', outline: 'none' } },
          { key: 'bare', label: 'Bare', swatch: { fill: 'tomato' } },
        ]}
      />,
    );
    const [solid, dashed, none, bare] = swatches(tree).map((s) => flat(s.props.style));
    expect(solid).toMatchObject({ borderWidth: 1, borderColor: t.colors.border, borderStyle: 'solid', backgroundColor: t.colors.surface3 });
    expect(dashed).toMatchObject({ borderWidth: 1, borderColor: t.colors.border, borderStyle: 'dashed' });
    // The empty state has no fill at all: its hairline is its whole swatch.
    expect(dashed.backgroundColor).toBeUndefined();
    expect(none.borderWidth).toBeUndefined();
    expect(bare.borderWidth).toBeUndefined();
  });
});

describe('a ramp is one item: label, swatches in order, end label', () => {
  const RAMP = {
    key: 'ramp',
    label: 'More to recover',
    endLabel: 'less',
    swatch: { ramp: ['solid-fill', 'half-fill', { fill: 'edge-fill', borderColor: 'edge-outline' }] },
  };

  test('reads label, then three swatches, then the end label', () => {
    const tree = create(<LegendRow items={[RAMP, { key: 'r', label: 'Recovered', swatch: { outline: 'solid' } }]} />);
    const item = host(tree, (n) => n.props.testID === 'legend-item-ramp')[0];
    // Document order inside the item: [label Text, ramp group, end-label Text].
    const order = host({ root: item }, (n) => n.type === 'Text' || n.props.testID === 'legend-ramp')
      .map((n) => (n.type === 'Text' ? 'Text' : n.props.testID));
    expect(order).toEqual(['Text', 'legend-ramp', 'Text']);
    const ramp = host(tree, (n) => n.props.testID === 'legend-ramp')[0];
    const steps = host({ root: ramp }, (n) => n.props.testID === 'legend-swatch').map((s) => flat(s.props.style));
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.backgroundColor)).toEqual(['solid-fill', 'half-fill', 'edge-fill']);
    // Only the third step carries an outline, and in its own colour.
    expect(steps[0].borderWidth).toBeUndefined();
    expect(steps[1].borderWidth).toBeUndefined();
    expect(steps[2]).toMatchObject({ borderWidth: 1, borderColor: 'edge-outline', borderStyle: 'solid' });
    expect(labelTexts(tree)).toEqual(['More to recover', 'less', 'Recovered']);
  });
});

describe('accessibility: one group, the trailing node outside it', () => {
  const items = [
    { key: 'a', label: 'Under the range', swatch: { fill: 'x' } },
    { key: 'b', label: 'Just enough', swatch: { fill: 'y' } },
    { key: 'c', label: 'No sets', swatch: { outline: 'solid' } },
  ];

  test('the entries are one accessible group whose label joins them', () => {
    const tree = create(<LegendRow items={items} />);
    const groups = host(tree, (n) => n.props.accessible === true);
    expect(groups).toHaveLength(1);
    expect(groups[0].props.accessibilityLabel).toBe('Key: Under the range, Just enough, No sets');
    // No swatch or label is separately focusable.
    host(tree, (n) => n.props.testID === 'legend-swatch').forEach((s) => {
      expect(s.props.accessible).toBeUndefined();
    });
  });

  test('an end label is spoken as "to", and spokenLabel overrides the printed words', () => {
    const tree = create(
      <LegendRow
        items={[
          { key: 'r', label: 'More to recover', endLabel: 'less', swatch: { ramp: ['a', 'b'] } },
          { key: 's', label: 'Recovered', swatch: { outline: 'solid' }, spokenLabel: 'Recovered, shown with a solid outline' },
        ]}
      />,
    );
    const group = host(tree, (n) => n.props.accessible === true)[0];
    expect(group.props.accessibilityLabel).toBe('Key: More to recover to less, Recovered, shown with a solid outline');
  });

  test('the trailing node renders after the group and is not inside it', () => {
    const Marker = () => <View testID="trailing-marker" />;
    const tree = create(<LegendRow items={items} trailing={<Marker />} />);
    const group = host(tree, (n) => n.props.accessible === true)[0];
    const insideGroup = host({ root: group }, (n) => n.props.testID === 'trailing-marker');
    expect(insideGroup).toHaveLength(0);
    expect(host(tree, (n) => n.props.testID === 'trailing-marker')).toHaveLength(1);
  });
});

describe('degenerate input', () => {
  test.each([[undefined], [null], [[]], ['not a list'], [[null, { key: 'x' }]]])('items %p render nothing', (items) => {
    const tree = create(<LegendRow items={items} />);
    expect(tree.toJSON()).toBeNull();
  });
});

describe('the colours are live, never frozen', () => {
  test('a light theme changes the label and the hairline colours', () => {
    const items = [{ key: 'a', label: 'No sets', swatch: { outline: 'solid' } }];
    const dark = resolveTheme({});
    mockPrefs = { theme: 'light' };
    const light = resolveTheme(mockPrefs);
    expect(light.colors.textSecondary).not.toBe(dark.colors.textSecondary);
    const tree = create(<LegendRow items={items} />);
    expect(flat(tree.root.findAllByType(Text)[0].props.style).color).toBe(light.colors.textSecondary);
    expect(flat(swatches(tree)[0].props.style).borderColor).toBe(light.colors.border);
  });
});

describe('source guards', () => {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('no raw hex or rgba literal', () => {
    expect(code).not.toMatch(/['"`]#[0-9a-fA-F]{3,8}['"`]/);
    expect(code).not.toMatch(/rgba?\(/);
  });

  test('no amber: a legend names a state, it is never the thing to do', () => {
    expect(code).not.toMatch(/colors\.primary|\.primary\b|primaryFill|primaryBg/);
  });

  test('radius and spacing come from the tokens, not literals', () => {
    expect(code).toMatch(/radius\.xs/);
    expect(code).toMatch(/spacing\.md/);
  });
});
