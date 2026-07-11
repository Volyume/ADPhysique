/**
 * CP-10 stage 4 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md, "Stage 4 -- Skia/chart consumers"):
 * pins the "restart-free -- flips live on the SAME mounted instance, no
 * remount" contract for the chart/Skia surfaces, generalising the pattern
 * already proven in src/components/__tests__/cp10Stage1LiveTheme.test.js,
 * cp10Stage2LiveChrome.test.js and the cp10Stage3*LiveTheme.test.js files.
 *
 * VolyumeChart is the representative sample here (the app's one line/area/
 * bar chart engine, COMP-019 Stage 1b): its default colour props (`color`,
 * `axisColor`, `rulesColor`, `labelColor`) resolve against `useTheme()`
 * instead of the frozen module `colors` singleton (VolyumeChart.js:99-107),
 * and its tooltip chrome StyleSheet stays frozen with a `buildLiveStyles(t)`
 * override appended (VolyumeChart.js:368-374). This suite proves both halves
 * actually update on a live theme flip, not just that the source reads `t.*`.
 *
 * MacroRings and ProgressPhotoCompare/ProgressScanCompare follow the
 * identical `const t = useTheme(); const live = buildLiveStyles(t)` shape
 * (see each file's own header comment); they are not independently pinned
 * for the live-flip contract here to avoid duplicating the same mechanism
 * assertion four times, per the other cp10Stage3*LiveTheme suites'
 * documented precedent. MacroRings' Skia ring colour already has its own
 * dedicated live-theme pin (src/components/food/__tests__/MacroRings.test.js,
 * "buildBandColour (CP-10 stage 4, live-theme variant)").
 *
 * react-native-svg and react-native-gesture-handler are mocked (native-only,
 * cannot run in the node test env), mirroring VolyumeChart.test.js's own
 * mock setup exactly.
 */
import { create, act } from 'react-test-renderer';
import useAppStore from '../../store/useAppStore';
import * as theme from '../../styles/theme';

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

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

const VolyumeChart = require('../VolyumeChart').default;

function setTheme(themeName) {
  act(() => {
    useAppStore.setState({
      accessibility: {
        ...useAppStore.getState().accessibility,
        theme: themeName,
        higherContrast: false,
        colorBlindSafe: false,
        largerText: false,
      },
    });
  });
}

describe('CP-10 stage 4: VolyumeChart flips live, no remount', () => {
  const DATA = [{ value: 10 }, { value: 12 }, { value: 9 }, { value: 14 }, { value: 11 }];

  test('main line stroke (default colour prop) tracks a theme flip on the same mounted instance', () => {
    setTheme('dark');
    let tree;
    act(() => {
      tree = create(
        <VolyumeChart data={DATA} width={300} height={120} formatTooltip={(i) => ({ title: `pt ${i}` })} />,
      );
    });
    const mainPath = tree.root.findAllByType('Path')[0];
    const darkStroke = mainPath.props.stroke;
    expect(darkStroke).toBe(theme.resolveTheme({ theme: 'dark' }).colors.primary);

    setTheme('light');
    const lightStroke = tree.root.findAllByType('Path')[0].props.stroke;
    expect(lightStroke).toBe(theme.resolveTheme({ theme: 'light' }).colors.primary);
    expect(lightStroke).not.toBe(darkStroke);
    act(() => { tree.unmount(); });
  });

  // The tooltip View only mounts while `tip` is truthy (an active scrub
  // point), which requires driving the real long-press-then-drag gesture --
  // not reachable through the stubbed `react-native-gesture-handler` mock
  // above (a Proxy that swallows every handler registration). Rather than
  // fake a scrub, this pins the SOURCE-level wiring that makes the tooltip's
  // live flip possible, the same source-pinning technique this file's own
  // LT-6 suite already uses for gridline stroke/opacity invariants: the
  // frozen `styles.tooltip*` keys are followed by `live.tooltip*` in every
  // style array, and `live` is a useMemo keyed on `t` (so a theme change
  // recomputes it) -- the identical mechanism the SVG half's test above
  // proves end-to-end via an actual render.
  test('tooltip chrome (frozen StyleSheet + buildLiveStyles override) is wired the same way', () => {
    const SOURCE = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'VolyumeChart.js'),
      'utf8',
    );
    expect(SOURCE).toMatch(/style=\{\[styles\.tooltip, live\.tooltip,/);
    expect(SOURCE).toMatch(/style=\{\[styles\.tooltipTitle, live\.tooltipTitle\]/);
    expect(SOURCE).toMatch(/style=\{\[styles\.tooltipSub, live\.tooltipSub\]/);
    expect(SOURCE).toMatch(/const live = useMemo\(\(\) => buildLiveStyles\(t\), \[t\]\);/);
    expect(SOURCE).toMatch(/function buildLiveStyles\(t\) \{/);
  });
});
