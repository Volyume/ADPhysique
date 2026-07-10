/**
 * ScreenBoundary (F8 / audit PR-7): pins the per-screen error-boundary
 * contract this feature exists for. Healthy children must render
 * untouched; a render throw must be CAUGHT (screen degrades to the calm
 * fallback, not an app-wide crash) and ALWAYS logged via logError (the
 * boundary never swallows silently); "Try again" must reset the boundary
 * so a recovered child renders; and two failed retries must surface the
 * quiet "Go to Home" escape so the user is never trapped in the
 * unrecoverable retry loop the audit found at the app root.
 */
import { Text, StyleSheet } from 'react-native';
import { create, act } from 'react-test-renderer';

jest.mock('../../lib/errorLog', () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
}));

// expo-haptics can't construct its native EventEmitter in the bare test env;
// mock it as the mount suites do (screen-mount.test.js). The boundary's
// fallback reaches it through Button -> lib/haptics (audit 03b M1).
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));


import {
  BaseNavigationContainer,
  createNavigationContainerRef,
  createNavigatorFactory,
  useNavigationBuilder,
  StackRouter,
} from '@react-navigation/core';

import ScreenBoundary, { ScreenBoundaryClass, withBoundary, withScreenBoundaries } from '../ScreenBoundary';
import { logError } from '../../lib/errorLog';
import useAppStore from '../../store/useAppStore';
import * as theme from '../../styles/theme';

// Controlled crasher: throws while `shouldThrow` is true, renders
// normally once it is flipped off (simulates a transient render fault).
let shouldThrow = false;
function Bomb() {
  if (shouldThrow) throw new Error('boom');
  return <Text>recovered</Text>;
}

function mountBoundary() {
  let tree;
  act(() => {
    tree = create(
      <ScreenBoundary screenName="TestScreen">
        <Bomb />
      </ScreenBoundary>,
    );
  });
  return tree;
}

function findButton(tree, label) {
  return tree.root
    .findAll((n) => n.props?.accessibilityLabel === label && typeof n.props?.onPress === 'function')[0];
}

function press(tree, label) {
  const btn = findButton(tree, label);
  expect(btn).toBeTruthy();
  act(() => { btn.props.onPress(); });
}

beforeEach(() => {
  shouldThrow = false;
  logError.mockClear();
  // React logs every boundary-caught error to console.error; keep the
  // test output clean without hiding assertion failures.
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

test('renders children untouched when healthy, no logging', () => {
  const tree = mountBoundary();
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('recovered');
  expect(json).not.toContain('This screen hit a problem.');
  expect(logError).not.toHaveBeenCalled();
});

test('catches a throwing child: fallback shown, logError called with screen scope', () => {
  shouldThrow = true;
  const tree = mountBoundary();
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('This screen hit a problem.');
  expect(json).toContain('Your data is safe.');
  expect(json).not.toContain('recovered');
  expect(logError).toHaveBeenCalledWith(
    'ScreenBoundary.TestScreen',
    expect.objectContaining({ message: 'boom' }),
    expect.objectContaining({ componentStack: expect.any(String) }),
  );
});

test('Try again resets the boundary and re-renders a recovered child', () => {
  shouldThrow = true;
  const tree = mountBoundary();
  expect(JSON.stringify(tree.toJSON())).toContain('This screen hit a problem.');

  shouldThrow = false;
  press(tree, 'Try again');

  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('recovered');
  expect(json).not.toContain('This screen hit a problem.');
});

test('Go to Home escape stays hidden until two retries have failed', () => {
  shouldThrow = true;
  const tree = mountBoundary();

  // First catch: quiet fallback only, no Home escape yet.
  expect(findButton(tree, 'Go to Home')).toBeUndefined();

  // Retry 1 fails (child still throws): still no escape.
  press(tree, 'Try again');
  expect(JSON.stringify(tree.toJSON())).toContain('This screen hit a problem.');
  expect(findButton(tree, 'Go to Home')).toBeUndefined();

  // Retry 2 fails: the quiet Home escape appears alongside Try again.
  press(tree, 'Try again');
  expect(JSON.stringify(tree.toJSON())).toContain('This screen hit a problem.');
  expect(findButton(tree, 'Go to Home')).toBeTruthy();
  expect(findButton(tree, 'Try again')).toBeTruthy();

  // Every catch was logged; the boundary never swallowed one silently.
  expect(logError).toHaveBeenCalledTimes(3);
});

test('withBoundary wraps a screen component and scopes the log by name', () => {
  shouldThrow = true;
  const Wrapped = withBoundary(Bomb, 'Diary');
  let tree;
  act(() => { tree = create(<Wrapped someProp="x" />); });
  expect(JSON.stringify(tree.toJSON())).toContain('This screen hit a problem.');
  expect(logError).toHaveBeenCalledWith(
    'ScreenBoundary.Diary',
    expect.objectContaining({ message: 'boom' }),
    expect.anything(),
  );
});

test('withBoundary passes props through to a healthy screen', () => {
  const Probe = (props) => <Text>{`probe:${props.someProp}`}</Text>;
  const Wrapped = withBoundary(Probe, 'Probe');
  let tree;
  act(() => { tree = create(<Wrapped someProp="x" />); });
  expect(JSON.stringify(tree.toJSON())).toContain('probe:x');
});

// Integration: the withScreenBoundaries seam against the REAL installed
// @react-navigation/core (6.4.17, the engine under the stack and tab
// navigators RootNavigator wraps). The stack/tab VIEW layers pull web/DOM
// internals under jest's node environment, so this uses a minimal
// navigator built on the real useNavigationBuilder + StackRouter — the
// exact code path that validates children ("A navigator can only contain
// 'Screen'...") and reads the `component` prop the seam swaps via
// cloneElement. Pins that cloned <Screen> children still register, that a
// healthy screen renders through its boundary, and that a screen which
// throws degrades to its OWN fallback (scoped by route name) while the
// navigator and the other screen keep working.
function TestNavigatorImpl({ children, initialRouteName }) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(StackRouter, {
    children,
    initialRouteName,
  });
  return <NavigationContent>{descriptors[state.routes[state.index].key].render()}</NavigationContent>;
}
const createTestNavigator = createNavigatorFactory(TestNavigatorImpl);

test('withScreenBoundaries: real navigator registration; a crashing screen degrades to its own fallback', () => {
  const Stack = withScreenBoundaries(createTestNavigator());
  const navRef = createNavigationContainerRef();
  const Healthy = () => <Text>healthy-screen</Text>;
  shouldThrow = true;

  let tree;
  act(() => {
    tree = create(
      <BaseNavigationContainer ref={navRef}>
        <Stack.Navigator initialRouteName="Healthy">
          <Stack.Screen name="Healthy" component={Healthy} />
          <Stack.Screen name="Broken" component={Bomb} />
        </Stack.Navigator>
      </BaseNavigationContainer>,
    );
  });

  // Healthy screen renders untouched through its boundary.
  expect(JSON.stringify(tree.toJSON())).toContain('healthy-screen');
  expect(logError).not.toHaveBeenCalled();

  // Navigating to the broken screen shows ITS fallback, scoped by route
  // name; the throw is caught by that screen's boundary, not the app root.
  act(() => { navRef.navigate('Broken'); });
  const json = JSON.stringify(tree.toJSON());
  expect(json).toContain('This screen hit a problem.');
  expect(logError).toHaveBeenCalledWith(
    'ScreenBoundary.Broken',
    expect.objectContaining({ message: 'boom' }),
    expect.anything(),
  );

  // Recovery: navigating back to the healthy screen still works.
  act(() => { navRef.goBack(); });
  expect(JSON.stringify(tree.toJSON())).toContain('healthy-screen');
});

// D39 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md:671-683):
// the class error boundary can't consume useTheme itself, so a functional
// wrapper reads it and hands the resolved tokens down as a `theme` prop,
// with the class falling back to the frozen static tokens whenever that
// prop is missing. These two tests are the proof: the wrapper's fallback UI
// is genuinely live (flips with no remount), and the class alone -- given
// no theme prop at all -- renders the exact byte-equivalent fallback the
// pre-D39 boundary always rendered.
describe('D39: ScreenBoundary theme wiring', () => {
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

  function flat(node) {
    return StyleSheet.flatten(node.props.style);
  }

  test('wrapper: fallback colours flip light<->dark on the same mounted instance, no remount', () => {
    setTheme('dark');
    shouldThrow = true;
    const tree = mountBoundary();
    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'This screen hit a problem.');
    const darkColor = flat(title).color;
    expect(darkColor).toBe(theme.resolveTheme({ theme: 'dark' }).colors.textPrimary);

    setTheme('light');
    const lightColor = flat(title).color;
    expect(lightColor).toBe(theme.resolveTheme({ theme: 'light' }).colors.textPrimary);
    expect(lightColor).not.toBe(darkColor);
  });

  test('class alone (no theme prop): fallback renders byte-equivalent to the frozen static tokens', () => {
    shouldThrow = true;
    let tree;
    act(() => {
      tree = create(
        <ScreenBoundaryClass screenName="NoThemeProp">
          <Bomb />
        </ScreenBoundaryClass>,
      );
    });
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('This screen hit a problem.');

    const title = tree.root.findAllByType(Text).find((n) => n.props.children === 'This screen hit a problem.');
    const body = tree.root.findAllByType(Text).find((n) => n.props.children === 'Your data is safe. Try again, or come back in a moment.');
    // Falls back to the module's static `colors`/`fontSize` singleton
    // exactly as the pre-D39 boundary always did -- no theme prop, no crash.
    expect(flat(title).color).toBe(theme.colors.textPrimary);
    expect(flat(title).fontSize).toBe(theme.fontSize.lg);
    expect(flat(body).color).toBe(theme.colors.textSecondary);
    expect(flat(body).fontSize).toBe(theme.fontSize.sm);
  });
});
