/**
 * BodyDiagramHeatmap.recovery.test.js
 *
 * D201 (per-muscle recovery, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md section 6) added the optional `recoveryByMuscle` prop; D214 Q1 = A
 * (docs/audit/progress-recovery-consistency-audit-2026-10-01/
 * 00-AUDIT-AND-PLAN.md section 7.2 c) replaced its three traffic-light bands
 * (D201 ruling 8) with ONE hue at graded intensity. This suite pins the new
 * palette, each pin written to fail on the old one:
 *   1. The five looks, by status then percent: recovering under 50% is the
 *      `recovery` token solid; recovering 50 to 74% is it at `alpha.half`;
 *      nearly (75 to 89%) is it at `alpha.edge` with a 1 px solid outline of
 *      its own; recovered is `surface3` with the solid `border` hairline; no
 *      recent session, or no entry at all, is NO fill with a DASHED hairline,
 *      so the two quiet states differ in shape as well as tone (the surface3
 *      fill sits at 1.41:1 on the card ground in dark, so tone alone would not
 *      separate them).
 *   2. Status decides first: a `no_recent_session` entry carries
 *      recoveredPercent 100 and must never read as recovered. The boundaries
 *      (49 / 50 / 74) and a recovering entry with no usable percent are pinned.
 *   3. No red, yellow or green anywhere on the recovery figure: the ordinary
 *      state after good training is never a warning colour, and none of the
 *      status tokens (success, warning, error) is used as a fill or an outline.
 *   4. The legend, one row through LegendRow: "More to recover" [three-step
 *      ramp] "less", Recovered, No session in 14 days; every fill on the
 *      figure has a named swatch; no tooltip; none of the old words.
 *   5. The accessible image summary stays ONE sentence and now says how many
 *      muscles have no session, out of seventeen.
 *   6. The palette is live (light and colour-blind-safe change the values) and
 *      composes with the selected state (a solid ink outline over a dashed one).
 *   7. The volume path is unchanged when `recoveryByMuscle` is absent (belt and
 *      braces beside BodyDiagramHeatmap.test.js, which is its primary guard).
 *
 * react-native-svg is mocked (native-only, cannot run in the node test env).
 * `useTheme` is the real `resolveTheme` of a mutable preference object, so
 * every expected value is computed from the token tables.
 */
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import { resolveTheme, withAlpha, alpha } from '../../styles/theme';
import InfoTooltip from '../InfoTooltip';

jest.mock('react-native-svg', () => {
  const RN = require('react');
  const mk = (name) => (props) => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), G: mk('G'), Path: mk('Path'),
    default: mk('Svg'),
  };
});
let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

const BodyDiagramHeatmap = require('../BodyDiagramHeatmap').default;

const SEVENTEEN = [
  'neck', 'front_delts', 'side_delts', 'chest', 'biceps', 'forearms', 'abs', 'quads', 'adductors',
  'tibialis', 'calves', 'traps', 'rear_delts', 'back', 'triceps', 'glutes', 'hamstrings',
];

// One muscle per look, plus one given the explicit 'no_recent_session' status
// (percent 100, as the model emits it) and one left out of the map entirely.
const RECOVERY_BY_MUSCLE = {
  quads: { recoveredPercent: 37, status: 'recovering' }, // solid
  back: { recoveredPercent: 60, status: 'recovering' }, // alpha.half
  biceps: { recoveredPercent: 80, status: 'nearly' }, // alpha.edge + outline
  abs: { recoveredPercent: 96, status: 'recovered' }, // surface3 + hairline
  glutes: { recoveredPercent: 100, status: 'no_recent_session' }, // dashed
  // 'calves' deliberately absent from this map.
};

const host = (tree, pred) => tree.root.findAll((n) => typeof n.type === 'string' && pred(n));
const paths = (tree) => host(tree, (n) => n.type === 'Path');
const keyOf = (n) => (n.props.testID || '').replace(/^muscle-(hit-)?/, '');
const shapesOf = (tree, key) => paths(tree).filter((n) => /^muscle-(?!hit-)/.test(n.props.testID || '') && keyOf(n) === key);
const visibleShapes = (tree) => paths(tree).filter((n) => /^muscle-(?!hit-)/.test(n.props.testID || ''));
const imageLabel = (tree) => host(tree, (n) => n.props.accessibilityRole === 'image')[0].props.accessibilityLabel;
const flat = (style) => Object.assign({}, ...[].concat(style || []).flat(Infinity).filter(Boolean));
const legendGroup = (tree) => host(tree, (n) => n.props.accessible === true && String(n.props.accessibilityLabel).startsWith('Key: '))[0];
const legendTexts = (tree) => legendGroup(tree).findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
const legendSwatches = (tree) => host({ root: legendGroup(tree) }, (n) => n.props.testID === 'legend-swatch').map((s) => flat(s.props.style));

function render(props) {
  return create(<BodyDiagramHeatmap onMuscleTap={() => {}} {...props} />);
}
// The paint signature of one muscle, whichever of its shapes.
const paint = (tree, key) => {
  const { fill, stroke, strokeWidth, strokeDasharray } = shapesOf(tree, key)[0].props;
  return { fill, stroke, strokeWidth, strokeDasharray };
};

beforeEach(() => { mockPrefs = {}; });

describe('the five looks (D214 Q1 = A: one hue, graded by how much is left to recover)', () => {
  test('recovering under 50%: the recovery token, solid, with the card-ground hairline', () => {
    const t = resolveTheme({});
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'quads')).toEqual({
      fill: t.colors.recovery, stroke: t.colors.surface, strokeWidth: 0.75, strokeDasharray: undefined,
    });
  });

  test('recovering 50 to 74%: the recovery token at alpha.half', () => {
    const t = resolveTheme({});
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'back')).toEqual({
      fill: withAlpha(t.colors.recovery, alpha.half), stroke: t.colors.surface, strokeWidth: 0.75, strokeDasharray: undefined,
    });
  });

  test('nearly recovered (75 to 89%): the token at alpha.edge, held by a 1 px solid outline in the token', () => {
    const t = resolveTheme({});
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'biceps')).toEqual({
      fill: withAlpha(t.colors.recovery, alpha.edge), stroke: t.colors.recovery, strokeWidth: 1, strokeDasharray: undefined,
    });
  });

  test('recovered: the quiet surface3 fill with the solid border hairline', () => {
    const t = resolveTheme({});
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'abs')).toEqual({
      fill: t.colors.surface3, stroke: t.colors.border, strokeWidth: 0.75, strokeDasharray: undefined,
    });
  });

  test('no recent session, and no entry at all: no fill and a DASHED border hairline, identically', () => {
    const t = resolveTheme({});
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    const expected = { fill: 'transparent', stroke: t.colors.border, strokeWidth: 0.75, strokeDasharray: '3 2' };
    expect(paint(tree, 'glutes')).toEqual(expected); // explicit 'no_recent_session'
    expect(paint(tree, 'calves')).toEqual(expected); // absent from the map
    expect(paint(tree, 'neck')).toEqual(expected); // never in the map
    // Every shape of the muscle, both sides and both views.
    shapesOf(tree, 'glutes').forEach((s) => expect(s.props.strokeDasharray).toBe('3 2'));
    shapesOf(tree, 'calves').forEach((s) => expect(s.props.strokeDasharray).toBe('3 2'));
  });

  test('only the no-session look is dashed; the five looks are pairwise distinct', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    const looks = ['quads', 'back', 'biceps', 'abs', 'glutes'].map((k) => paint(tree, k));
    expect(new Set(looks.map((l) => JSON.stringify(l))).size).toBe(5);
    expect(looks.filter((l) => l.strokeDasharray).length).toBe(1);
    // The two quiet looks differ in shape (dashed or not) and in fill, not in tone alone.
    expect(looks[3].fill).not.toBe(looks[4].fill);
    expect(looks[3].strokeDasharray).toBeUndefined();
    expect(looks[4].strokeDasharray).toBe('3 2');
  });

  test('every shape of a muscle takes its look, both sides and both views', () => {
    const t = resolveTheme({});
    const tree = render({ recoveryByMuscle: { forearms: { recoveredPercent: 20, status: 'recovering' } } });
    const shapes = shapesOf(tree, 'forearms');
    expect(shapes).toHaveLength(4); // flexors and extensors, left and right
    shapes.forEach((s) => expect(s.props.fill).toBe(t.colors.recovery));
  });
});

describe('status decides first, then the percent inside "recovering"', () => {
  const fillFor = (entry) => {
    const t = resolveTheme({});
    const tree = render({ recoveryByMuscle: { chest: entry } });
    const f = shapesOf(tree, 'chest')[0].props;
    if (f.fill === t.colors.recovery) return 'solid';
    if (f.fill === withAlpha(t.colors.recovery, alpha.half)) return 'half';
    if (f.fill === withAlpha(t.colors.recovery, alpha.edge)) return 'edge';
    if (f.fill === t.colors.surface3) return 'recovered';
    if (f.fill === 'transparent') return 'none';
    return `unexpected ${f.fill}`;
  };

  test.each([
    [{ status: 'recovering', recoveredPercent: 0 }, 'solid'],
    [{ status: 'recovering', recoveredPercent: 49 }, 'solid'],
    [{ status: 'recovering', recoveredPercent: 49.9 }, 'solid'],
    [{ status: 'recovering', recoveredPercent: 50 }, 'half'],
    [{ status: 'recovering', recoveredPercent: 74 }, 'half'],
    [{ status: 'nearly', recoveredPercent: 75 }, 'edge'],
    [{ status: 'nearly', recoveredPercent: 89 }, 'edge'],
    [{ status: 'recovered', recoveredPercent: 90 }, 'recovered'],
    [{ status: 'recovered', recoveredPercent: 100 }, 'recovered'],
  ])('%j reads %s', (entry, expected) => {
    expect(fillFor(entry)).toBe(expected);
  });

  test('a no_recent_session entry with recoveredPercent 100 never reads as recovered', () => {
    expect(fillFor({ status: 'no_recent_session', recoveredPercent: 100 })).toBe('none');
  });

  test('a recovering entry with no usable percent takes the strongest look', () => {
    [undefined, null, NaN, 'abc'].forEach((p) => expect(fillFor({ status: 'recovering', recoveredPercent: p })).toBe('solid'));
  });

  test('an unknown or missing status is no session, never a guess', () => {
    [{}, { recoveredPercent: 80 }, { status: 'mystery', recoveredPercent: 80 }, null].forEach((e) => expect(fillFor(e)).toBe('none'));
  });
});

describe('no traffic-light colour on the recovery figure', () => {
  test('none of success, warning or error is a fill or an outline, in any palette', () => {
    [{}, { theme: 'light' }, { colorBlindSafe: true }, { higherContrast: true }].forEach((prefs) => {
      mockPrefs = prefs;
      const t = resolveTheme(prefs);
      const all = {};
      SEVENTEEN.forEach((m, i) => {
        all[m] = [
          { status: 'recovering', recoveredPercent: 10 }, { status: 'recovering', recoveredPercent: 60 },
          { status: 'nearly', recoveredPercent: 80 }, { status: 'recovered', recoveredPercent: 95 },
          { status: 'no_recent_session', recoveredPercent: 100 },
        ][i % 5];
      });
      const used = visibleShapes(render({ recoveryByMuscle: all })).flatMap((s) => [s.props.fill, s.props.stroke]);
      [t.colors.success, t.colors.warning, t.colors.error, t.colors.primary].forEach((c) => expect(used).not.toContain(c));
    });
  });
});

describe('the legend: one row through LegendRow, every fill named', () => {
  test('More to recover, a three-step ramp, less; Recovered; No session in 14 days; and nothing from the old legend', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    expect(legendTexts(tree)).toEqual(['More to recover', 'less', 'Recovered', 'No session in 14 days']);
    const all = host(tree, () => true).map((n) => [].concat(n.props.children).filter((c) => typeof c === 'string').join('')).join('|');
    ['Nearly recovered', 'Recovering', 'No recent session', 'Below target', 'Good range', 'Getting close', 'Too much', 'No data', 'Under the range', 'No sets']
      .forEach((old) => expect(all).not.toContain(old));
    expect(tree.root.findAllByType(InfoTooltip)).toHaveLength(0);
  });

  test('the ramp is solid, half, edge-with-outline; Recovered is surface3 with a solid hairline; no session is a dashed hairline', () => {
    const t = resolveTheme({});
    const sw = legendSwatches(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }));
    expect(sw).toHaveLength(5);
    expect(sw[0].backgroundColor).toBe(t.colors.recovery);
    expect(sw[1].backgroundColor).toBe(withAlpha(t.colors.recovery, alpha.half));
    expect(sw[2]).toMatchObject({ backgroundColor: withAlpha(t.colors.recovery, alpha.edge), borderWidth: 1, borderColor: t.colors.recovery, borderStyle: 'solid' });
    expect(sw[3]).toMatchObject({ backgroundColor: t.colors.surface3, borderWidth: 1, borderColor: t.colors.border, borderStyle: 'solid' });
    expect(sw[4]).toMatchObject({ borderWidth: 1, borderColor: t.colors.border, borderStyle: 'dashed' });
    expect(sw[4].backgroundColor).toBeUndefined();
  });

  test('every fill on the figure is the same as a legend swatch', () => {
    const t = resolveTheme({});
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    const swatchFills = new Set(legendSwatches(tree).map((s) => s.backgroundColor).filter(Boolean));
    ['quads', 'back', 'biceps', 'abs'].forEach((k) => expect(swatchFills.has(paint(tree, k).fill)).toBe(true));
    expect(swatchFills.has(t.colors.surface3)).toBe(true);
  });

  test('the legend group is spoken as a sentence, not as colours', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    expect(legendGroup(tree).props.accessibilityLabel)
      .toBe('Key: Stronger fill, more to recover; lighter fill, less, Recovered, No session in 14 days');
  });
});

describe('the accessible image summary: one sentence, now counting the muscles with no session', () => {
  test('describes estimated recovery and counts recent-session and no-session muscles out of seventeen', () => {
    const label = imageLabel(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }));
    expect(label).toMatch(/estimated muscle recovery/i);
    // quads + back (recovering), biceps (nearly), abs (recovered) = 4 of 17 have a recent
    // session; glutes (no_recent_session) and the twelve not in the map have none.
    expect(label).toMatch(/4 of 17 muscles have a recent session/);
    expect(label).toMatch(/and 13 have no session in the last 14 days/);
    expect(label).not.toMatch(/logged sets/);
  });

  test('it stays ONE sentence', () => {
    const label = imageLabel(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }));
    expect(label.match(/[.!?]/g)).toHaveLength(1);
    expect(label.endsWith('.')).toBe(true);
    expect(label).toMatch(/the muscle list below has the full detail for each one\.$/);
  });

  test('singular and zero read correctly', () => {
    expect(imageLabel(render({ recoveryByMuscle: { abs: { status: 'recovered', recoveredPercent: 95 } } })))
      .toMatch(/1 of 17 muscles has a recent session and 16 have no session/);
    const all = {};
    SEVENTEEN.slice(1).forEach((m) => { all[m] = { status: 'recovered', recoveredPercent: 95 }; });
    expect(imageLabel(render({ recoveryByMuscle: all }))).toMatch(/16 of 17 muscles have a recent session and 1 has no session/);
    const everything = {};
    SEVENTEEN.forEach((m) => { everything[m] = { status: 'recovering', recoveredPercent: 10 }; });
    expect(imageLabel(render({ recoveryByMuscle: everything }))).toMatch(/17 of 17 muscles have a recent session and 0 have no session/);
  });

  test('an empty map (day zero) says no muscle has a recent session', () => {
    expect(imageLabel(render({ recoveryByMuscle: {} }))).toMatch(/0 of 17 muscles have a recent session and 17 have no session/);
  });
});

describe('the palette is live and composes with the selected state', () => {
  test('light and colour-blind-safe values come from the live theme', () => {
    mockPrefs = { theme: 'light' };
    const light = resolveTheme(mockPrefs);
    expect(light.colors.recovery).not.toBe(resolveTheme({}).colors.recovery);
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'quads').fill).toBe(light.colors.recovery);
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'abs').fill).toBe(light.colors.surface3);
    mockPrefs = { colorBlindSafe: true };
    const cvd = resolveTheme(mockPrefs);
    // Intensity, not hue, carries the reading, so the CVD tables keep the token.
    expect(paint(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }), 'quads').fill).toBe(cvd.colors.recovery);
    expect(legendSwatches(render({ recoveryByMuscle: RECOVERY_BY_MUSCLE }))[0].backgroundColor).toBe(cvd.colors.recovery);
  });

  test('a selected no-session muscle swaps its dashed hairline for the solid ink outline', () => {
    const t = resolveTheme({});
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE, selectedMuscle: 'glutes' });
    shapesOf(tree, 'glutes').forEach((s) => {
      expect(s.props.stroke).toBe(t.colors.textPrimary);
      expect(s.props.strokeWidth).toBe(1.5);
      expect(s.props.strokeDasharray).toBeUndefined();
      expect(s.props.fill).toBe('transparent');
    });
    // Its neighbours keep their own looks.
    expect(paint(tree, 'calves').strokeDasharray).toBe('3 2');
  });

  test('a selected recovering muscle keeps its fill under the outline', () => {
    const t = resolveTheme({});
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE, selectedMuscle: 'quads' });
    shapesOf(tree, 'quads').forEach((s) => {
      expect(s.props.fill).toBe(t.colors.recovery);
      expect(s.props.stroke).toBe(t.colors.textPrimary);
    });
  });
});

describe('the volume path is unchanged when recoveryByMuscle is absent (regression sanity)', () => {
  const VOLUME_BY_MUSCLE = {
    chest: { workingSets: 10, status: 'optimal', color: resolveTheme({}).colors.success, label: 'Good range' },
  };

  test('the volume legend and its tooltip are present, with no recovery wording', () => {
    const tree = render({ volumeByMuscle: VOLUME_BY_MUSCLE });
    expect(legendTexts(tree)).toEqual(['Under the range', 'Just enough', 'In range', 'Near the limit', 'Too much', 'No sets']);
    expect(tree.root.findAllByType(InfoTooltip).length).toBeGreaterThan(0);
    const all = host(tree, () => true).map((n) => [].concat(n.props.children).filter((c) => typeof c === 'string').join('')).join('|');
    ['More to recover', 'Recovered', 'No session in 14 days', 'No recent session'].forEach((w) => expect(all).not.toContain(w));
  });

  test('the accessible image summary still describes training volume', () => {
    const label = imageLabel(render({ volumeByMuscle: VOLUME_BY_MUSCLE }));
    expect(label).toMatch(/weekly training volume/i);
    expect(label).toMatch(/logged sets this window/);
    expect(label).not.toMatch(/recovery/i);
  });

  test('a region fill still comes from the volume entry, not the recovery palette', () => {
    const t = resolveTheme({});
    const tree = render({ volumeByMuscle: VOLUME_BY_MUSCLE });
    const chest = shapesOf(tree, 'chest');
    expect(chest).toHaveLength(2);
    chest.forEach((s) => expect(s.props.fill).toBe(t.colors.success));
    expect(shapesOf(tree, 'abs')[0].props.strokeDasharray).toBeUndefined();
  });
});
