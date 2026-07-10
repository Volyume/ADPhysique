/**
 * CP-10 stage 2 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md, "Stage 2 -- Root chrome") -- risk
 * register #7: "resolvedTheme and colour must migrate together, not colour
 * alone. If Stage 2 (root chrome) lags behind colour going live in screens,
 * the status bar/native nav chrome could show the old scheme while card
 * backgrounds show the new one." This suite proves the fix: App.js's
 * StatusBar props, RootNavigator.js's NavigationContainer theme (via
 * src/navigation/navTheme.js), and a Stage-1-migrated primitive (Card, see
 * the "Lay the live theming foundation" commit) all read the SAME useTheme()
 * snapshot, so a single theme-preference write updates all three inside one
 * React commit -- no torn state, no staggered chrome.
 *
 * WHY A HARNESS, NOT App.js/RootNavigator.js DIRECTLY: neither module is
 * mountable in this jest config. App.js is never imported by any existing
 * test (confirmed: no test in the repo imports it); RootNavigator.js
 * (confirmed directly, and documented in
 * src/__tests__/appLockGateRouting.guard.test.js's header comment) throws
 * at require-time because @react-navigation/bottom-tabs pulls in a native
 * module this config does not mock. Rendering the real `expo-status-bar`
 * StatusBar component hits the same wall (its Android implementation calls
 * `useColorScheme` from `react-native`, which this project's RN mock does
 * not provide). None of that is theming-specific -- it is the pre-existing,
 * documented state of this test environment.
 *
 * So this harness renders the exact PROP VALUES App.js's <StatusBar>
 * receives (`t.resolvedTheme`-derived `style`, `t.colors.background`) into a
 * plain, always-mountable View instead of the real native component, next to
 * the REAL src/navigation/navTheme.js derivation (useNavTheme -- no
 * react-navigation import, genuinely mountable, see that file's header
 * comment) and a REAL Stage-1 primitive (Card). All three are driven by the
 * same useTheme() call inside one component, exactly as App.js/
 * RootNavigator.js wire it. What this proves: the shared hook mechanism
 * that makes "no torn state" possible. What it does NOT prove: that
 * `expo-status-bar`'s native module itself repaints the OS status bar on a
 * physical device -- that is the on-device manual check this task's test
 * plan calls for.
 */
import { create, act } from 'react-test-renderer';
import { View, Text, StyleSheet } from 'react-native';
import useAppStore from '../../store/useAppStore';
import useTheme from '../../hooks/useTheme';
import { useNavTheme } from '../../navigation/navTheme';
import Card from '../Card';
import * as theme from '../../styles/theme';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

function setTheme(themeName, extra = {}) {
  act(() => {
    useAppStore.setState({
      accessibility: {
        ...useAppStore.getState().accessibility,
        theme: themeName,
        higherContrast: false,
        colorBlindSafe: false,
        largerText: false,
        ...extra,
      },
    });
  });
}

function flat(node) {
  return StyleSheet.flatten(node.props.style);
}

// Card (a function component) and its rendered host View both carry
// testID='probe-card' (Card forwards it), so findAllByProps returns both the
// composite Card instance (props.style undefined -- we never pass Card a
// `style` prop, it builds its own internally) and the host node that
// actually carries the computed style. Only the host (string `type`) node is
// useful here.
function findHostByTestID(root, testID) {
  return root.findAllByProps({ testID }).find((n) => typeof n.type === 'string');
}

// Mirrors App.js's live StatusBar JSX (post CP-10 stage 2) exactly, minus the
// real native component -- see the file header for why.
function StatusBarProbe({ t }) {
  return (
    <View
      testID="statusbar-probe"
      accessibilityValue={{ text: t.resolvedTheme === 'light' ? 'dark' : 'light' }}
      style={{ backgroundColor: t.colors.background }}
    />
  );
}

// One component tree, one useTheme() call, feeding all three chrome/primitive
// consumers -- exactly App.js -> RootNavigator.js -> screen composition, just
// collapsed into one render for the test.
function AppChromeHarness() {
  const t = useTheme();
  const navTheme = useNavTheme();
  return (
    <View testID="root">
      <StatusBarProbe t={t} />
      <View testID="nav-theme-probe" accessibilityValue={{ text: JSON.stringify(navTheme) }} />
      <Card testID="probe-card">
        <Text>content</Text>
      </Card>
    </View>
  );
}

describe('CP-10 stage 2: StatusBar + nav theme + a Stage-1 primitive flip in ONE render pass', () => {
  test('a single theme-preference write updates all three together, no torn state', () => {
    setTheme('dark');
    let tree;
    act(() => { tree = create(<AppChromeHarness />); });

    const darkResolved = theme.resolveTheme({ theme: 'dark' });
    const statusBarBefore = tree.root.findByProps({ testID: 'statusbar-probe' });
    const navProbeBefore = tree.root.findByProps({ testID: 'nav-theme-probe' });
    const cardBefore = findHostByTestID(tree.root, 'probe-card');

    expect(flat(statusBarBefore).backgroundColor).toBe(darkResolved.colors.background);
    expect(statusBarBefore.props.accessibilityValue.text).toBe('light'); // dark theme -> light status-bar text
    expect(JSON.parse(navProbeBefore.props.accessibilityValue.text).dark).toBe(true);
    expect(flat(cardBefore).backgroundColor).toBe(darkResolved.colors.surface);

    // ONE theme flip, ONE act() -- this is the "one commit" the CP-10 plan's
    // risk register #7 requires: no intermediate render where one consumer
    // has already flipped and another has not.
    setTheme('light');

    const lightResolved = theme.resolveTheme({ theme: 'light' });
    const statusBarAfter = tree.root.findByProps({ testID: 'statusbar-probe' });
    const navProbeAfter = tree.root.findByProps({ testID: 'nav-theme-probe' });
    const cardAfter = findHostByTestID(tree.root, 'probe-card');

    expect(flat(statusBarAfter).backgroundColor).toBe(lightResolved.colors.background);
    expect(statusBarAfter.props.accessibilityValue.text).toBe('dark'); // light theme -> dark status-bar text
    expect(JSON.parse(navProbeAfter.props.accessibilityValue.text).dark).toBe(false);
    expect(flat(cardAfter).backgroundColor).toBe(lightResolved.colors.surface);

    // None of the three is still showing the old (dark) values -- proves the
    // flip is not staggered across consumers.
    expect(flat(statusBarAfter).backgroundColor).not.toBe(darkResolved.colors.background);
    expect(JSON.parse(navProbeAfter.props.accessibilityValue.text).colors.background)
      .not.toBe(darkResolved.colors.background);
    expect(flat(cardAfter).backgroundColor).not.toBe(darkResolved.colors.surface);

    act(() => { tree.unmount(); });
  });
});
