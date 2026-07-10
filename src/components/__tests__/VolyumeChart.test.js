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
import { create } from 'react-test-renderer';

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
