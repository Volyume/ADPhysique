/**
 * RangeBar.test.js
 *
 * D214 (plan `docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md` sections 7.4 item 5 and 7.5): one bar for a count
 * against the stretch it should land in, shared by the volume heatmap rows
 * and the Consistency plan rows. This suite pins:
 *   1. The drawing: an 8 dp pill track in `surface3`; the range stretch in
 *      `textSecondary` at `alpha.mid`; the stronger band inside it at
 *      `alpha.half`; an end tick in `border`; the fill from 0 to `value` in
 *      the caller's colour and in no colour of its own that is amber.
 *   2. Position maths: every position is a share of `max`, so a count of 5 on a
 *      track of 20 fills 25%, the range 6 to 20 starts at 30% and runs to 100%.
 *   3. Clamping: a value past the end fills the whole track, a negative one
 *      fills nothing, a range that overhangs either end is cut to the track.
 *   4. Degenerate input: a bound that is not a finite number is ignored, and
 *      with no usable `max` only the empty track renders. A bad number must
 *      never throw in a list of fifteen rows, and never draw a shape that
 *      claims a position the data does not give.
 *   5. `slim`: the 6 dp variant the plan rows use, same parts, same colours.
 *   6. The bar is hidden from assistive tech (the row's text carries the
 *      figures), and the live theme drives every colour.
 *
 * `useTheme` is the real `resolveTheme` of a mutable preference object.
 */
import fs from 'fs';
import path from 'path';
import { create } from 'react-test-renderer';
import { resolveTheme, withAlpha, alpha, radius } from '../../styles/theme';

let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

const RangeBar = require('../RangeBar').default;

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'RangeBar.js'), 'utf8');

const host = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));
const part = (tree, id) => host(tree, (n) => n.props.testID === `rangebar-${id}`)[0];
const flat = (style) => Object.assign({}, ...[].concat(style || []).flat(Infinity).filter(Boolean));
const styleOf = (tree, id) => (part(tree, id) ? flat(part(tree, id).props.style) : null);

beforeEach(() => { mockPrefs = {}; });

const FULL = {
  value: 5, max: 20, rangeStart: 6, rangeEnd: 20, bandStart: 8, bandEnd: 14, fillColor: 'fill-colour',
};

describe('the drawing', () => {
  test('track, range, band, fill and end tick all render, in the token colours', () => {
    const t = resolveTheme({});
    const tree = create(<RangeBar {...FULL} />);
    expect(styleOf(tree, 'track')).toMatchObject({ height: 8, backgroundColor: t.colors.surface3, borderRadius: radius.full, overflow: 'hidden' });
    expect(styleOf(tree, 'range').backgroundColor).toBe(withAlpha(t.colors.textSecondary, alpha.mid));
    expect(styleOf(tree, 'band').backgroundColor).toBe(withAlpha(t.colors.textSecondary, alpha.half));
    expect(styleOf(tree, 'fill').backgroundColor).toBe('fill-colour');
    expect(styleOf(tree, 'tick')).toMatchObject({ backgroundColor: t.colors.border, width: 2 });
  });

  test('the fill is above the range and the band, and the tick is above all of them', () => {
    const tree = create(<RangeBar {...FULL} />);
    const track = part(tree, 'track');
    const order = track.children.map((c) => c.props.testID);
    expect(order).toEqual(['rangebar-range', 'rangebar-band', 'rangebar-fill']);
    const box = track.parent.parent || track.parent;
    const siblings = box.children.map((c) => c.props?.testID).filter(Boolean);
    expect(siblings.indexOf('rangebar-tick')).toBeGreaterThan(siblings.indexOf('rangebar-track'));
  });

  test('without a fillColor the fill is ink (textSecondary), never amber', () => {
    const t = resolveTheme({});
    const tree = create(<RangeBar {...FULL} fillColor={undefined} />);
    expect(styleOf(tree, 'fill').backgroundColor).toBe(t.colors.textSecondary);
    expect(styleOf(tree, 'fill').backgroundColor).not.toBe(t.colors.primary);
  });

  test('the optional band is not drawn when it is not given', () => {
    const tree = create(<RangeBar value={5} max={20} rangeStart={6} rangeEnd={20} fillColor="c" />);
    expect(part(tree, 'band')).toBeUndefined();
    expect(part(tree, 'range')).toBeDefined();
  });
});

describe('positions are shares of max', () => {
  test('5 of 20 fills 25%, the range 6 to 20 is 30% to 100%, the band 8 to 14 is 40% for 30%', () => {
    const tree = create(<RangeBar {...FULL} />);
    expect(styleOf(tree, 'fill')).toMatchObject({ left: 0, width: '25%' });
    expect(styleOf(tree, 'range')).toMatchObject({ left: '30%', width: '70%' });
    expect(styleOf(tree, 'band')).toMatchObject({ left: '40%', width: '30%' });
  });

  test('shares print at two decimals with no trailing zeros', () => {
    const tree = create(<RangeBar value={1} max={3} rangeStart={1} rangeEnd={2} fillColor="c" />);
    expect(styleOf(tree, 'fill').width).toBe('33.33%');
    expect(styleOf(tree, 'range')).toMatchObject({ left: '33.33%', width: '33.33%' });
  });
});

describe('clamping', () => {
  test('a value past the end fills the whole track', () => {
    expect(styleOf(create(<RangeBar {...FULL} value={50} />), 'fill').width).toBe('100%');
  });

  test('a negative value, or zero, draws no fill', () => {
    expect(part(create(<RangeBar {...FULL} value={-3} />), 'fill')).toBeUndefined();
    expect(part(create(<RangeBar {...FULL} value={0} />), 'fill')).toBeUndefined();
  });

  test('a range that overhangs either end is cut to the track', () => {
    const tree = create(<RangeBar {...FULL} rangeStart={-4} rangeEnd={99} bandStart={-1} bandEnd={30} />);
    expect(styleOf(tree, 'range')).toMatchObject({ left: '0%', width: '100%' });
    expect(styleOf(tree, 'band')).toMatchObject({ left: '0%', width: '100%' });
  });

  test('a stretch that ends before it starts, or is empty, is not drawn', () => {
    const inverted = create(<RangeBar {...FULL} rangeStart={12} rangeEnd={6} bandStart={10} bandEnd={10} />);
    expect(part(inverted, 'range')).toBeUndefined();
    expect(part(inverted, 'band')).toBeUndefined();
    // Both ends clamp to the same point: nothing to shade.
    const collapsed = create(<RangeBar {...FULL} rangeStart={40} rangeEnd={90} />);
    expect(part(collapsed, 'range')).toBeUndefined();
  });
});

describe('non-finite inputs', () => {
  const BAD = [NaN, Infinity, -Infinity, undefined, null, '12', {}];

  test.each(BAD.map((v) => [String(v), v]))('max %s renders the empty track only', (_label, bad) => {
    const tree = create(<RangeBar {...FULL} max={bad} />);
    expect(part(tree, 'track')).toBeDefined();
    ['range', 'band', 'fill', 'tick'].forEach((id) => expect(part(tree, id)).toBeUndefined());
  });

  test('a max of zero or below renders the empty track only', () => {
    [0, -5].forEach((max) => {
      const tree = create(<RangeBar {...FULL} max={max} />);
      ['range', 'band', 'fill', 'tick'].forEach((id) => expect(part(tree, id)).toBeUndefined());
    });
  });

  test.each(BAD.map((v) => [String(v), v]))('value %s draws no fill, and everything else still draws', (_label, bad) => {
    const tree = create(<RangeBar {...FULL} value={bad} />);
    expect(part(tree, 'fill')).toBeUndefined();
    expect(part(tree, 'range')).toBeDefined();
    expect(part(tree, 'tick')).toBeDefined();
  });

  test('a non-finite range or band bound drops only that stretch', () => {
    const tree = create(<RangeBar {...FULL} rangeEnd={NaN} bandStart={Infinity} />);
    expect(part(tree, 'range')).toBeUndefined();
    expect(part(tree, 'band')).toBeUndefined();
    expect(part(tree, 'fill')).toBeDefined();
  });

  test('every input bad at once: an empty track, no throw', () => {
    expect(() => create(<RangeBar value={NaN} max={NaN} rangeStart={NaN} rangeEnd={NaN} bandStart={NaN} bandEnd={NaN} />)).not.toThrow();
    const tree = create(<RangeBar />);
    expect(part(tree, 'track')).toBeDefined();
    ['range', 'band', 'fill', 'tick'].forEach((id) => expect(part(tree, id)).toBeUndefined());
  });
});

describe('slim', () => {
  test('is a 6 dp track in a 10 dp box with the same parts and colours', () => {
    const t = resolveTheme({});
    const slim = create(<RangeBar {...FULL} slim />);
    const normal = create(<RangeBar {...FULL} />);
    expect(styleOf(slim, 'track')).toMatchObject({ height: 6, top: 2, backgroundColor: t.colors.surface3 });
    expect(styleOf(normal, 'track')).toMatchObject({ height: 8, top: 3 });
    expect(styleOf(slim, 'tick').height).toBe(10);
    expect(styleOf(normal, 'tick').height).toBe(14);
    ['range', 'band', 'fill', 'tick'].forEach((id) => expect(part(slim, id)).toBeDefined());
    const box = host(slim, (n) => n.props.accessibilityElementsHidden === true)[0];
    expect(flat(box.props.style).height).toBe(10);
  });
});

describe('accessibility', () => {
  test('the whole bar is hidden from assistive tech: the row text carries the figures', () => {
    const tree = create(<RangeBar {...FULL} />);
    const hidden = host(tree, (n) => n.props.accessibilityElementsHidden === true);
    expect(hidden).toHaveLength(1);
    expect(hidden[0].props.importantForAccessibility).toBe('no-hide-descendants');
    // And nothing inside it is focusable.
    expect(host(tree, (n) => n.props.accessible === true)).toHaveLength(0);
  });
});

describe('the colours are live, never frozen', () => {
  test('a light theme changes the track, the range and the tick', () => {
    mockPrefs = { theme: 'light' };
    const light = resolveTheme(mockPrefs);
    const tree = create(<RangeBar {...FULL} />);
    expect(styleOf(tree, 'track').backgroundColor).toBe(light.colors.surface3);
    expect(styleOf(tree, 'range').backgroundColor).toBe(withAlpha(light.colors.textSecondary, alpha.mid));
    expect(styleOf(tree, 'tick').backgroundColor).toBe(light.colors.border);
  });
});

describe('source guards', () => {
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  test('no raw hex or rgba literal, and no amber', () => {
    expect(code).not.toMatch(/['"`]#[0-9a-fA-F]{3,8}['"`]/);
    expect(code).not.toMatch(/rgba?\(/);
    expect(code).not.toMatch(/colors\.primary|\.primary\b|primaryFill|primaryBg/);
  });

  test('the named alpha stops, not invented values', () => {
    expect(code).toMatch(/alpha\.mid/);
    expect(code).toMatch(/alpha\.half/);
  });
});
