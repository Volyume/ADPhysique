/**
 * BodyDiagramHeatmap.seams.test.js
 *
 * Lane 1 fresh-eyes review (register D214 addendum 2), the seams the figure
 * shares with the rest of the tree. What this suite pins and why:
 *   1. S4: the volume legend's five swatch fills are the SAME colours the
 *      screens resolve a status to through `buildVolumeStatusColor`
 *      (theme.js), in every palette. The legend is a hand-written list and
 *      the resolver a table; rule 3 of the plan ("every colour is named,
 *      once") rests on the two never drifting apart.
 *   2. S6: the spoken summary follows the paint. An entry with an unknown
 *      status is DRAWN as no session (recoveryBand's default) and must be
 *      SPOKEN as no session, never counted as a recent session.
 *   3. N7: the "14 days" in the recovery legend and the summary is the
 *      recovery model's own LOOKBACK_DAYS, not a literal that can drift.
 */
import { create } from 'react-test-renderer';
import { resolveTheme, buildVolumeStatusColor } from '../../styles/theme';
import { LOOKBACK_DAYS } from '../../lib/recovery/constants';

jest.mock('react-native-svg', () => {
  const React = require('react');
  const mk = (name) => (props) => React.createElement(name, props, props.children);
  return { __esModule: true, Svg: mk('Svg'), G: mk('G'), Path: mk('Path'), Ellipse: mk('Ellipse'), Rect: mk('Rect'), Line: mk('Line'), default: mk('Svg') };
});
jest.mock('@expo/vector-icons/Ionicons', () => () => null);
jest.mock('../../store/useAppStore', () => ({
  __esModule: true,
  default: (sel) => sel({ user: { id: 'u1' }, accessibility: { reduceMotion: true } }),
}));
let mockPrefs = {};
jest.mock('../../hooks/useTheme', () => () => require('../../styles/theme').resolveTheme(mockPrefs));

import BodyDiagramHeatmap from '../BodyDiagramHeatmap';

const PALETTES = [{}, { theme: 'light' }, { colorBlindSafe: true }, { theme: 'light', colorBlindSafe: true }, { higherContrast: true }];
const STATUSES = { below: 'Under the range', minimum: 'Just enough', optimal: 'In range', near_mrv: 'Near the limit', over_mrv: 'Too much' };

const flat = (style) => Object.assign({}, ...[].concat(style || []).flat(Infinity).filter(Boolean));
function legendFills(tree) {
  // Each legend item: a swatch View (testID legend-swatch) followed by its label Text.
  const items = tree.root.findAll((n) => typeof n.type === 'string' && typeof n.props?.testID === 'string' && n.props.testID.startsWith('legend-item-'));
  const out = {};
  items.forEach((item) => {
    const swatch = item.findAll((n) => typeof n.type === 'string' && n.props?.testID === 'legend-swatch')[0];
    const label = item.findAll((n) => typeof n.type === 'string' && n.type === 'Text')[0];
    const text = [].concat(label?.props?.children ?? []).join('');
    out[text] = swatch ? flat(swatch.props.style).backgroundColor : undefined;
  });
  return out;
}
const summaryOf = (tree) => tree.root.findAll((n) => typeof n.type === 'string' && n.props?.accessibilityRole === 'image')[0].props.accessibilityLabel;

beforeEach(() => { mockPrefs = {}; });

describe('S4: the volume legend names exactly the colours the resolver gives a status', () => {
  PALETTES.forEach((prefs) => {
    test(`palette ${JSON.stringify(prefs)}`, () => {
      mockPrefs = prefs;
      const t = resolveTheme(prefs);
      const resolve = buildVolumeStatusColor(t.colors);
      const tree = create(<BodyDiagramHeatmap volumeByMuscle={{}} onMuscleTap={() => {}} />);
      const fills = legendFills(tree);
      Object.entries(STATUSES).forEach(([status, label]) => {
        expect(fills[label]).toBeDefined();
        expect(fills[label]).toBe(resolve(status));
      });
    });
  });
});

describe('S6: the spoken summary follows the paint', () => {
  test('an unknown status is spoken as no session, exactly as it is drawn', () => {
    const map = { quads: { status: 'recovering', recoveredPercent: 40 }, back: { status: 'mystery', recoveredPercent: 10 } };
    const label = summaryOf(create(<BodyDiagramHeatmap recoveryByMuscle={map} onMuscleTap={() => {}} />));
    expect(label).toMatch(/1 of 17 muscles has a recent session and 16 have no session/);
  });

  test('a recovered, a nearly and a recovering muscle each count as a recent session', () => {
    const map = {
      quads: { status: 'recovering', recoveredPercent: 40 },
      chest: { status: 'nearly', recoveredPercent: 80 },
      back: { status: 'recovered', recoveredPercent: 95 },
      abs: { status: 'no_recent_session', recoveredPercent: 100 },
    };
    const label = summaryOf(create(<BodyDiagramHeatmap recoveryByMuscle={map} onMuscleTap={() => {}} />));
    expect(label).toMatch(/3 of 17 muscles have a recent session and 14 have no session/);
  });
});

describe('N7: the lookback window is the recovery model\'s own', () => {
  test('the legend and the summary say LOOKBACK_DAYS days', () => {
    const tree = create(<BodyDiagramHeatmap recoveryByMuscle={{}} onMuscleTap={() => {}} />);
    const texts = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Text')
      .map((n) => [].concat(n.props.children ?? []).join(''));
    expect(texts).toContain(`No session in ${LOOKBACK_DAYS} days`);
    expect(summaryOf(tree)).toContain(`no session in the last ${LOOKBACK_DAYS} days`);
    expect(LOOKBACK_DAYS).toBe(14);
  });
});

describe('neutralVolume (D214 addendum 2, a recovery week on the Volume heatmap): no verdict on the figure', () => {
  const pathsOf = (tree) => tree.root.findAll((n) => n.type === 'Path' && /^muscle-(?!hit-)/.test(n.props.testID || ''));
  test('a trained muscle takes the quiet surface3 fill with the border hairline; an untrained one no fill', () => {
    const t = resolveTheme({});
    const map = { quads: { workingSets: 6, color: t.colors.success }, chest: { workingSets: 2 }, back: { workingSets: 0 } };
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={map} neutralVolume onMuscleTap={() => {}} />);
    const quad = pathsOf(tree).find((n) => n.props.testID === 'muscle-quads');
    const chest = pathsOf(tree).find((n) => n.props.testID === 'muscle-chest');
    const back = pathsOf(tree).find((n) => n.props.testID === 'muscle-back');
    expect(quad.props).toMatchObject({ fill: t.colors.surface3, stroke: t.colors.border });
    expect(chest.props).toMatchObject({ fill: t.colors.surface3, stroke: t.colors.border });
    expect(back.props).toMatchObject({ fill: 'transparent', stroke: t.colors.border });
    // No band colour anywhere on the figure.
    const fills = pathsOf(tree).map((n) => n.props.fill);
    [t.colors.success, t.colors.warning, t.colors.error, t.colors.volumeMinimum, t.colors.textMuted].forEach((c) => expect(fills).not.toContain(c));
  });

  test('the legend names only Trained and No sets, with no band words and no (i)', () => {
    const tree = create(<BodyDiagramHeatmap volumeByMuscle={{ quads: { workingSets: 6 } }} neutralVolume onMuscleTap={() => {}} />);
    const fills = legendFills(tree);
    expect(Object.keys(fills)).toEqual(['Trained', 'No sets']);
    const texts = tree.root.findAll((n) => typeof n.type === 'string' && n.type === 'Text').map((n) => [].concat(n.props.children ?? []).join(''));
    ['Under the range', 'Just enough', 'In range', 'Near the limit', 'Too much'].forEach((w) => expect(texts).not.toContain(w));
  });

  test('neutralVolume is ignored when the recovery palette is in use', () => {
    const t = resolveTheme({});
    const tree = create(<BodyDiagramHeatmap recoveryByMuscle={{ quads: { status: 'recovering', recoveredPercent: 40 } }} neutralVolume onMuscleTap={() => {}} />);
    const quad = pathsOf(tree).find((n) => n.props.testID === 'muscle-quads');
    expect(quad.props.fill).toBe(t.colors.recovery);
  });
});
