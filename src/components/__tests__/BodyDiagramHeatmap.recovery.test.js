/**
 * BodyDiagramHeatmap.recovery.test.js
 *
 * D201 (per-muscle recovery, spec docs/recovery-programme-2026-09-25/
 * 00-SPEC.md section 6, F3 RULED): the additive, optional
 * `recoveryByMuscle` prop. Pins:
 *   1. Each status band's fill: recovered -> success, nearly -> warning,
 *      recovering -> error (solid, lead review), no_recent_session
 *      (or no entry at all) -> the same neutral "no data" fill the volume
 *      path already uses.
 *   2. The legend swaps to Recovered/Nearly recovered/Recovering/No recent session,
 *      and the volume-jargon tooltip is absent.
 *   3. The accessible image summary describes estimated recovery instead
 *      of training volume.
 *   4. The volume path (fills, legend, tooltip, summary label) is BYTE
 *      IDENTICAL when `recoveryByMuscle` is omitted -- the existing suite
 *      (BodyDiagramHeatmap.test.js) is the primary guard for this; the one
 *      check here is a belt-and-braces sanity check in the same file as
 *      the new palette so a future edit sees both sides at once.
 *
 * react-native-svg is mocked (native-only, cannot run in the node test
 * env), the same shape BodyDiagramHeatmap.test.js already uses. useTheme is
 * mocked to the plain static theme exports so every expected fill can be
 * computed directly from `colors`/`withAlpha`/`alpha` rather than chasing
 * the real store's resolved theme -- the two are otherwise expected to
 * agree, but this keeps the assertions independent of that resolution.
 */
import { create } from 'react-test-renderer';
import { Text } from 'react-native';
import { colors } from '../../styles/theme';
import InfoTooltip from '../InfoTooltip';

jest.mock('react-native-svg', () => {
  const RN = require('react');
  const mk = (name) => (props) => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), G: mk('G'), Ellipse: mk('Ellipse'), Rect: mk('Rect'),
    Path: mk('Path'), Line: mk('Line'),
    default: mk('Svg'),
  };
});
jest.mock('../../hooks/useTheme', () => {
  const theme = require('../../styles/theme');
  return () => ({
    colors: theme.colors, fontSize: theme.fontSize, shadow: theme.shadow, resolvedTheme: 'dark', type: theme.type,
  });
});

const BodyDiagramHeatmap = require('../BodyDiagramHeatmap').default;

// One easily-located, UNIQUE single shape per status, plus one muscle left
// out entirely (the "no entry at all" path) and one given the explicit
// 'no_recent_session' status -- both must land on the identical neutral
// fill. abs (a single Rect) and traps/back (single, textually-unique
// Paths) avoid the bilateral Ellipse pairs every other muscle draws.
const RECOVERY_BY_MUSCLE = {
  abs: { recoveredPercent: 96, status: 'recovered' },
  traps: { recoveredPercent: 80, status: 'nearly' },
  back: { recoveredPercent: 40, status: 'recovering' },
  glutes: { recoveredPercent: 100, status: 'no_recent_session' },
  // 'calves' deliberately absent from this map.
};

function render(props) {
  return create(<BodyDiagramHeatmap onMuscleTap={() => {}} {...props} />);
}

function findRect(tree, x) {
  return tree.root.findAllByType('Rect').find((r) => r.props.x === x);
}
function findPath(tree, snippet) {
  return tree.root.findAllByType('Path').find((p) => (p.props.d || '').includes(snippet));
}
function texts(tree) {
  return tree.root.findAllByType(Text).map((n) => [].concat(n.props.children).join(''));
}
function imageLabel(tree) {
  return tree.root.findAll((n) => n.props.accessibilityRole === 'image' && typeof n.type === 'string')[0]
    .props.accessibilityLabel;
}

describe('BodyDiagramHeatmap recovery palette (D201, F3 RULED)', () => {
  test('recovered fills with the success colour', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    expect(findRect(tree, 70).props.fill).toBe(colors.success);
  });

  test('nearly fills with the warning colour', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    expect(findPath(tree, 'M 66 52').props.fill).toBe(colors.warning);
  });

  test('recovering fills with the solid error colour (lead review: a tinted fill read as "no data")', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    expect(findPath(tree, 'M 60 76').props.fill).toBe(colors.error);
  });

  test('no_recent_session and an absent entry share the exact "no data" neutral fill', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    const glutesRects = tree.root.findAllByType('Rect').filter((r) => r.props.y === 150);
    expect(glutesRects.length).toBeGreaterThan(0);
    for (const r of glutesRects) expect(r.props.fill).toBe(colors.surface2);

    const calvesEllipses = tree.root.findAllByType('Ellipse').filter((e) => e.props.cy === 266);
    expect(calvesEllipses.length).toBeGreaterThan(0);
    for (const e of calvesEllipses) expect(e.props.fill).toBe(colors.surface2);
  });

  test('the legend reads Recovered / Nearly recovered / Recovering / No recent session, and the volume tooltip is gone', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    const all = texts(tree);
    expect(all).toContain('Recovered');
    expect(all).toContain('Nearly recovered');
    expect(all).toContain('Recovering');
    expect(all).toContain('No recent session');
    expect(all).not.toContain('Below target');
    expect(all).not.toContain('Good range');
    expect(all).not.toContain('Getting close');
    expect(all).not.toContain('Too much');
    expect(all).not.toContain('No data');
    expect(tree.root.findAllByType(InfoTooltip)).toHaveLength(0);
  });

  test('the accessible image summary describes estimated recovery and counts recent-session muscles', () => {
    const tree = render({ recoveryByMuscle: RECOVERY_BY_MUSCLE });
    const label = imageLabel(tree);
    expect(label).toMatch(/estimated muscle recovery/i);
    // abs (recovered) + traps (nearly) + back (recovering) = 3 of the 14
    // drawn muscle keys have a recent session; glutes (no_recent_session)
    // and calves (absent) do not.
    expect(label).toMatch(/3 of 14 muscles have a recent session/);
    expect(label).not.toMatch(/logged sets/);
  });
});

describe('BodyDiagramHeatmap volume path unchanged when recoveryByMuscle is absent (regression sanity)', () => {
  const VOLUME_BY_MUSCLE = {
    chest: { workingSets: 10, status: 'optimal', color: colors.success, label: 'Good range' },
  };

  test('the volume legend and its tooltip are present, with no recovery-band label', () => {
    const tree = render({ volumeByMuscle: VOLUME_BY_MUSCLE });
    const all = texts(tree);
    expect(all).toContain('Below target');
    expect(all).toContain('Good range');
    expect(all).toContain('Too much');
    expect(all).toContain('No data');
    expect(all).not.toContain('Recovering');
    expect(all).not.toContain('No recent session');
    expect(tree.root.findAllByType(InfoTooltip).length).toBeGreaterThan(0);
  });

  test('the accessible image summary still describes training volume', () => {
    const tree = render({ volumeByMuscle: VOLUME_BY_MUSCLE });
    expect(imageLabel(tree)).toMatch(/weekly training volume/i);
    expect(imageLabel(tree)).toMatch(/logged sets this window/);
  });

  test('a region fill still comes from the volume entry, not the recovery palette', () => {
    const tree = render({ volumeByMuscle: VOLUME_BY_MUSCLE });
    const chestEllipses = tree.root.findAllByType('Ellipse').filter((e) => e.props.cy === 82 && (e.props.cx === 66 || e.props.cx === 94));
    expect(chestEllipses.length).toBe(2);
    for (const e of chestEllipses) expect(e.props.fill).toBe(colors.success);
  });
});
