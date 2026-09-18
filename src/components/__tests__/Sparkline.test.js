/**
 * Item 10 (campaign 2026-07-10, CP-5 residue): VolyumeChart's
 * highlightIndices gold ring-and-dot PR marker was wired on ExerciseDetail
 * but LiftProgressScreen's row sparkline (this component, not VolyumeChart)
 * never got the same treatment. Pins the new highlightIndices prop against
 * the REAL Sparkline: same gold token, same ring(r=5, stroke)/dot(r=1.5,
 * fill) idiom as VolyumeChart.test.js's CP-5 suite, plus the data-index ->
 * point-index remap so an index survives a value that got filtered out as
 * non-finite.
 *
 * react-native-svg is mocked (native-only, cannot run in the node test env),
 * same shape as VolyumeChart.test.js's mock.
 */
import { create } from 'react-test-renderer';

jest.mock('react-native-svg', () => {
  const RN = require('react');
  const mk = (name) => (props) => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), Path: mk('Path'), Circle: mk('Circle'),
    default: mk('Svg'),
  };
});

const Sparkline = require('../Sparkline').default;
const { colors } = require('../../styles/theme');
const { plotPoints, paddedDomain } = require('../../lib/chartGeometry');

const DATA = [10, 12, 9, 14, 11, 13];
const WIDTH = 84;
const HEIGHT = 34;

function expectedPoints(values = DATA) {
  const { min, max } = paddedDomain(values, 0.12);
  const box = { left: 1, top: 2, width: WIDTH - 2, height: HEIGHT - 4 };
  return plotPoints(values, box, min, max);
}

function goldDots(tree) {
  return tree.root.findAllByType('Circle').filter((c) => c.props.fill === colors.gold);
}
function goldRings(tree) {
  return tree.root.findAllByType('Circle').filter(
    (c) => c.props.stroke === colors.gold && c.props.fill === 'none',
  );
}

describe('Sparkline -- highlightIndices PR markers (item 10)', () => {
  test('renders a gold ring-and-dot marker at exactly the highlighted indices', () => {
    const points = expectedPoints();
    const tree = create(
      <Sparkline data={DATA} width={WIDTH} height={HEIGHT} highlightIndices={[1, 3]} />,
    );
    const dots = goldDots(tree);
    expect(dots).toHaveLength(2);
    const positions = dots.map((c) => ({ x: c.props.cx, y: c.props.cy })).sort((a, b) => a.x - b.x);
    expect(positions[0]).toEqual({ x: points[1].x, y: points[1].y });
    expect(positions[1]).toEqual({ x: points[3].x, y: points[3].y });
    expect(goldRings(tree)).toHaveLength(2);
  });

  test('no markers render when highlightIndices is omitted (default behaviour unchanged)', () => {
    const tree = create(<Sparkline data={DATA} width={WIDTH} height={HEIGHT} />);
    expect(goldDots(tree)).toHaveLength(0);
  });

  test('an out-of-range highlight index is ignored (bounds safety)', () => {
    const tree = create(
      <Sparkline data={DATA} width={WIDTH} height={HEIGHT} highlightIndices={[-1, 99]} />,
    );
    expect(goldDots(tree)).toHaveLength(0);
  });

  test('an index whose value was filtered out as non-finite draws nothing', () => {
    const withGap = [10, null, 9, 14, 11, 13];
    const tree = create(
      <Sparkline data={withGap} width={WIDTH} height={HEIGHT} highlightIndices={[1]} />,
    );
    expect(goldDots(tree)).toHaveLength(0);
  });

  test('a highlight index after a filtered-out gap still maps to the right point', () => {
    const withGap = [10, null, 9, 14, 11, 13];
    const values = withGap.filter((v) => Number.isFinite(v)); // [10, 9, 14, 11, 13]
    const points = expectedPoints(values);
    // Index 3 in withGap is value 14 -> index 2 in the filtered values/points.
    const tree = create(
      <Sparkline data={withGap} width={WIDTH} height={HEIGHT} highlightIndices={[3]} />,
    );
    const dots = goldDots(tree);
    expect(dots).toHaveLength(1);
    expect({ x: dots[0].props.cx, y: dots[0].props.cy }).toEqual({ x: points[2].x, y: points[2].y });
  });

  test('unaffected: plain sparkline without highlightIndices still draws its line', () => {
    const tree = create(<Sparkline data={DATA} width={WIDTH} height={HEIGHT} />);
    expect(tree.root.findAllByType('Path')).toHaveLength(1);
  });
});

// AX-02 (launch accessibility audit): Sparkline renders visual trend/PR
// markers with no semantics at all. It stays decorative by default (a host
// that already speaks the trend in its own text needs no change); passing
// `accessibilitySummary` exposes it as one labelled node instead.
describe('Sparkline -- AX-02 accessibility summary', () => {
  test('with a summary: exposes one labelled, accessible node', () => {
    const tree = create(
      <Sparkline data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend, falling" />,
    );
    const labelled = tree.root.findAllByProps({ accessibilityLabel: 'Weight trend, falling' });
    expect(labelled.length).toBeGreaterThan(0);
    expect(labelled[0].props.accessible).toBe(true);
  });

  test('without a summary: stays decorative, no accessible node and the SVG is hidden', () => {
    const tree = create(<Sparkline data={DATA} width={WIDTH} height={HEIGHT} />);
    expect(tree.root.findAllByProps({ accessible: true })).toHaveLength(0);
    const hidden = tree.root.findAll((n) => n.props.accessibilityElementsHidden === true);
    expect(hidden.length).toBeGreaterThan(0);
    hidden.forEach((n) => expect(n.props.importantForAccessibility).toBe('no-hide-descendants'));
  });

  test('the not-enough-data placeholder follows the same summary contract', () => {
    const withSummary = create(
      <Sparkline data={[10]} width={WIDTH} height={HEIGHT} accessibilitySummary="Body fat trend" />,
    );
    const labelled = withSummary.root.findAllByProps({ accessibilityLabel: 'Body fat trend' });
    expect(labelled.length).toBeGreaterThan(0);
    expect(labelled[0].props.accessible).toBe(true);

    const without = create(<Sparkline data={[10]} width={WIDTH} height={HEIGHT} />);
    expect(without.root.findAllByProps({ accessible: true })).toHaveLength(0);
    expect(without.root.findAllByProps({ accessibilityElementsHidden: true }).length).toBeGreaterThan(0);
  });
});
