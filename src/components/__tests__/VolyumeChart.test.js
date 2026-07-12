/**
 * VolyumeChart — the app's one line/area/bar chart engine. Pins two
 * scorecard fixes from docs/ux-world-class-audit-2026-07-09/DECISIONS-
 * 2026-07-09.md, D14 Group A:
 *
 *   LT-6 (gridline contrast)  — the gridline stroke must carry no extra
 *                               opacity multiplier on top of the border
 *                               token; theme.border alone already clears
 *                               the WCAG 1.4.11 3:1 non-text bar against
 *                               both the card surface and the plain
 *                               background, in both themes (computed
 *                               below). Regression: commit 9c44e2d
 *                               already removed the stray `opacity={0.5}`
 *                               this suite guards against reappearing.
 *   CP-5 (PR markers)         — the line variant renders a small gold
 *                               ring-and-dot marker at each index named in
 *                               `highlightIndices`, out-of-range indices
 *                               are ignored (bounds safety), and the scrub
 *                               announcement folds in "Personal best" for
 *                               a highlighted point.
 *
 * The derivation of WHICH sessions are PR sessions (CP-5's third pin, the
 * per-exercise trend screen wiring) is colocated with the pure function it
 * tests, ExerciseDetailScreen.js's `derivePRSessionDates`, in
 * src/screens/__tests__/ExerciseDetailScreen.logic.test.js — not here.
 *
 * react-native-svg and react-native-gesture-handler are mocked (native-only,
 * cannot run in the node test env); react-native-reanimated is auto-mocked
 * globally via __mocks__/react-native-reanimated.js.
 */
import fs from 'fs';
import path from 'path';
import { create, act } from 'react-test-renderer';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'VolyumeChart.js'), 'utf8');

jest.mock('react-native-svg', () => {
  const RN = require('react');
  const mk = (name) => (props) => RN.createElement(name, props, props.children);
  return {
    __esModule: true,
    Svg: mk('Svg'), Path: mk('Path'), G: mk('G'), Circle: mk('Circle'),
    Rect: mk('Rect'), Line: mk('Line'), Text: mk('Text'), Defs: mk('Defs'),
    LinearGradient: mk('LinearGradient'), Stop: mk('Stop'), ClipPath: mk('ClipPath'),
    default: mk('Svg'),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const RN = require('react');
  const passthrough = (name) => (props) => RN.createElement(name, props, props.children);
  const gestureStub = new Proxy({}, { get: () => () => gestureStub });
  return {
    GestureHandlerRootView: passthrough('GHRoot'),
    GestureDetector: passthrough('GestureDetector'),
    Gesture: { Pan: () => gestureStub, Tap: () => gestureStub, LongPress: () => gestureStub },
    State: {},
    Directions: {},
  };
});

// VolyumeChart's scrub haptic pulls in expo-haptics transitively (via
// ../lib/haptics), which needs a native EventEmitter unavailable in the node
// test env. Not exercised by these (non-interactive) render tests either way.
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const VolyumeChart = require('../VolyumeChart').default;
const { colors, applyAccessibility } = require('../../styles/theme');
const { plotPoints, paddedDomain } = require('../../lib/chartGeometry');

afterEach(() => applyAccessibility({}));

describe('LT-6: gridline contrast', () => {
  // CP-10 stage 4 (theming, Skia/chart consumers, 2026-07-10): `rulesColor`
  // is resolved to `resolvedRulesColor` inside the component body now (a
  // live-theme fallback, see the class below), instead of being read
  // directly as a default-parameter prop. Same identifier renamed at both
  // the render site and the default-resolution site; no behaviour change.
  test('the gridline stroke carries no opacity multiplier on top of the border token', () => {
    const gridline = SOURCE.match(/<Line x1=\{box\.left\} y1=\{y\}[\s\S]{0,140}?\/>/);
    expect(gridline).toBeTruthy();
    expect(gridline[0]).toMatch(/stroke=\{resolvedRulesColor\}/);
    expect(gridline[0]).not.toMatch(/opacity/);
  });

  test('rulesColor still defaults to the border token (the intended gridline token)', () => {
    expect(SOURCE).toMatch(/resolvedRulesColor = rulesColor \?\? t\.colors\.border;/);
  });

  // Relative-luminance WCAG contrast, same formula theme.test.js uses inline
  // (no shared export exists to import instead).
  function relLum(hex) {
    const c = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
    const lin = (v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function ratio(a, b) {
    const la = relLum(a);
    const lb = relLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  test('dark: theme.border clears the 3:1 non-text bar against surface AND background', () => {
    applyAccessibility({ theme: 'dark' });
    const r1 = ratio(colors.border, colors.surface);
    const r2 = ratio(colors.border, colors.background);
    expect(r1).toBeGreaterThanOrEqual(3);
    expect(r2).toBeGreaterThanOrEqual(3);
    // Pin the computed values so a token change is a deliberate, visible diff.
    expect(r1).toBeCloseTo(3.45, 1);
    expect(r2).toBeCloseTo(3.81, 1);
  });

  test('light: theme.border clears the 3:1 non-text bar against surface AND background', () => {
    applyAccessibility({ theme: 'light' });
    const r1 = ratio(colors.border, colors.surface);
    const r2 = ratio(colors.border, colors.background);
    expect(r1).toBeGreaterThanOrEqual(3);
    expect(r2).toBeGreaterThanOrEqual(3);
    expect(r1).toBeCloseTo(3.25, 1);
    expect(r2).toBeCloseTo(3.10, 1);
  });

  test('regression guard: a 0.5 opacity stack on the border token would fail 3:1 in both themes', () => {
    // Documents WHY the fix matters: blending border at 0.5 alpha over its
    // own surface (what the removed `opacity={0.5}` effectively did) lands
    // far below the bar, in both themes.
    function blend(fgHex, alpha, bgHex) {
      const fg = fgHex.replace('#', '');
      const bg = bgHex.replace('#', '');
      const [fr, fgc, fb] = [0, 2, 4].map((i) => parseInt(fg.slice(i, i + 2), 16));
      const [br, bgc, bb] = [0, 2, 4].map((i) => parseInt(bg.slice(i, i + 2), 16));
      const mix = (f, b) => Math.round(f * alpha + b * (1 - alpha));
      const r = mix(fr, br).toString(16).padStart(2, '0');
      const g = mix(fgc, bgc).toString(16).padStart(2, '0');
      const b2 = mix(fb, bb).toString(16).padStart(2, '0');
      return `#${r}${g}${b2}`;
    }
    applyAccessibility({ theme: 'dark' });
    const darkBlended = blend(colors.border, 0.5, colors.surface);
    expect(ratio(darkBlended, colors.surface)).toBeLessThan(3);
    applyAccessibility({ theme: 'light' });
    const lightBlended = blend(colors.border, 0.5, colors.surface);
    expect(ratio(lightBlended, colors.surface)).toBeLessThan(3);
  });
});

describe('CP-5: highlightIndices PR markers', () => {
  const DATA = [{ value: 10 }, { value: 12 }, { value: 9 }, { value: 14 }, { value: 11 }];
  const WIDTH = 300;
  const HEIGHT = 120;

  function expectedPoints() {
    const values = DATA.map((d) => d.value);
    const { min, max } = paddedDomain(values);
    // No y-axis labels (sections=0) and no x labels in this fixture, so the
    // box matches VolyumeChart's own leftPad=0/bottomPad=0/topPad=4/rightPad=6.
    const box = { left: 0, top: 4, width: WIDTH - 6, height: HEIGHT - 4 };
    return plotPoints(values, box, min, max);
  }

  function goldDots(tree) {
    return tree.root.findAllByType('Circle').filter((c) => c.props.fill === colors.gold);
  }

  test('renders a gold ring-and-dot marker at exactly the highlighted indices', () => {
    const points = expectedPoints();
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} highlightIndices={[1, 3]} />);
    const dots = goldDots(tree);
    expect(dots).toHaveLength(2);
    const positions = dots.map((c) => ({ x: c.props.cx, y: c.props.cy })).sort((a, b) => a.x - b.x);
    expect(positions[0]).toEqual({ x: points[1].x, y: points[1].y });
    expect(positions[1]).toEqual({ x: points[3].x, y: points[3].y });

    // A ring (stroke, no fill) accompanies each dot.
    const rings = tree.root.findAllByType('Circle').filter(
      (c) => c.props.stroke === colors.gold && c.props.fill === 'none',
    );
    expect(rings).toHaveLength(2);
  });

  test('no markers render when highlightIndices is omitted (default behaviour unchanged)', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} />);
    expect(goldDots(tree)).toHaveLength(0);
  });

  test('an out-of-range highlight index is ignored (bounds safety)', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} highlightIndices={[-1, 99]} />);
    expect(goldDots(tree)).toHaveLength(0);
  });

  test('the scrub announcement mechanism folds in "Personal best" for a highlighted point (source-level)', () => {
    expect(SOURCE).toMatch(/const isPR = Array\.isArray\(highlightIndices\) && highlightIndices\.includes\(idx\);/);
    expect(SOURCE).toMatch(/isPR \? ', Personal best' : ''/);
  });
});

// AX-02 (launch accessibility audit, docs/... d1cd0033-launchaccessibility.md):
// native charts had no adjustable role/actions/value and no text alternative,
// so VoiceOver/TalkBack users could not explore a chart's points at all. This
// suite pins the fix against the REAL component: an adjustable control whose
// accessibilityValue carries the actual date/value/series-name/Personal-best
// text (not a bare number), increment/decrement move the same selection the
// pan scrub already used, the raw SVG is marked decorative once that data is
// represented, and the "View data" list is the required text alternative.
describe('AX-02: adjustable chart, accessibilityValue and "View data" list', () => {
  const DATA = [
    { value: 80.2, label: '1 Jan' },
    { value: 79.8, label: '' },
    { value: 79.1, label: '10 Jan' },
  ];
  const WIDTH = 300;
  const HEIGHT = 120;

  function adjustable(tree) {
    return tree.root.findAll((n) => n.props.accessibilityRole === 'adjustable')[0];
  }
  function hiddenSvgWrappers(tree) {
    return tree.root.findAll((n) => n.props.accessibilityElementsHidden === true);
  }
  const Button = require('../Button').default;

  test('exposes an adjustable role with a stable increment/decrement action pair', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    const chart = adjustable(tree);
    expect(chart).toBeTruthy();
    expect(chart.props.accessibilityActions).toEqual([
      { name: 'increment', label: 'Next point' },
      { name: 'decrement', label: 'Previous point' },
    ]);
    expect(typeof chart.props.onAccessibilityAction).toBe('function');
  });

  test('an explicit accessibilityLabel always wins over accessibilitySummary (existing hosts unchanged)', () => {
    const tree = create(
      <VolyumeChart
        data={DATA} width={WIDTH} height={HEIGHT}
        accessibilityLabel="Explicit label" accessibilitySummary="Fallback summary"
      />,
    );
    expect(adjustable(tree).props.accessibilityLabel).toBe('Explicit label');
  });

  test('accessibilityValue defaults to the most recent point, folding in the series name', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    expect(adjustable(tree).props.accessibilityValue).toEqual({ text: 'Weight trend chart. 10 Jan, 79.1' });
  });

  test('a Personal best point folds into accessibilityValue', () => {
    const tree = create(
      <VolyumeChart
        data={DATA} width={WIDTH} height={HEIGHT}
        accessibilitySummary="Weight trend chart" highlightIndices={[2]}
      />,
    );
    expect(adjustable(tree).props.accessibilityValue.text).toBe('Weight trend chart. 10 Jan, 79.1, Personal best');
  });

  test('decrement moves the selection backwards and updates accessibilityValue', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    act(() => {
      adjustable(tree).props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } });
    });
    expect(adjustable(tree).props.accessibilityValue.text).toBe('Weight trend chart. 79.8');
  });

  test('increment clamps at the last point (does not run past the end)', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    act(() => {
      adjustable(tree).props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } });
    });
    expect(adjustable(tree).props.accessibilityValue.text).toBe('Weight trend chart. 10 Jan, 79.1');
  });

  test('an unrecognised action name is ignored', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    act(() => {
      adjustable(tree).props.onAccessibilityAction({ nativeEvent: { actionName: 'magicTap' } });
    });
    expect(adjustable(tree).props.accessibilityValue.text).toBe('Weight trend chart. 10 Jan, 79.1');
  });

  test('a host-provided formatTooltip is preferred over the raw point for accessibilityValue', () => {
    const tree = create(
      <VolyumeChart
        data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart"
        formatTooltip={(i) => ({ title: `${DATA[i].value} kg`, sub: 'custom sub' })}
      />,
    );
    expect(adjustable(tree).props.accessibilityValue.text).toBe('Weight trend chart. 79.1 kg, custom sub');
  });

  test('the "View data" toggle is collapsed by default and reveals a readable row per point', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    expect(tree.root.findAllByProps({ accessibilityRole: 'list' })).toHaveLength(0);

    const toggle = tree.root.findByType(Button);
    expect(toggle.props.title).toBe('View data');
    act(() => { toggle.props.onPress(); });

    const list = tree.root.findByProps({ accessibilityRole: 'list' });
    // findAllByProps matches both the composite <Text> and its rendered host
    // node (both carry accessibilityRole), so de-duplicate by text content.
    const rowTexts = [...new Set(
      list.findAllByProps({ accessibilityRole: 'text' }).map((r) => r.props.children),
    )];
    expect(rowTexts).toEqual([
      '1 Jan, 80.2',
      '79.8',
      '10 Jan, 79.1',
    ]);

    // Toggling again hides it (collapsed by default, on request only).
    act(() => { tree.root.findByType(Button).props.onPress(); });
    expect(tree.root.findAllByProps({ accessibilityRole: 'list' })).toHaveLength(0);
  });

  test('the raw SVG is marked decorative now its data is represented elsewhere', () => {
    const tree = create(<VolyumeChart data={DATA} width={WIDTH} height={HEIGHT} accessibilitySummary="Weight trend chart" />);
    const hidden = hiddenSvgWrappers(tree);
    expect(hidden.length).toBeGreaterThan(0);
    hidden.forEach((n) => expect(n.props.importantForAccessibility).toBe('no-hide-descendants'));
    // The Svg itself is still rendered underneath (visual output unchanged).
    expect(hidden.some((n) => n.findAllByType('Svg').length === 1)).toBe(true);
  });

  test('the bar variant marks its SVG decorative but does not (yet) get an adjustable role (follow-on host)', () => {
    const barData = [{ value: 3 }, { value: 5 }, { value: 2 }];
    const tree = create(<VolyumeChart data={barData} variant="bar" width={100} height={24} accessibilityLabel="Chest volume" />);
    expect(tree.root.findAll((n) => n.props.accessibilityRole === 'adjustable')).toHaveLength(0);
    const hidden = hiddenSvgWrappers(tree);
    expect(hidden.length).toBeGreaterThan(0);
  });
});
