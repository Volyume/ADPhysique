/**
 * ScreenBoundary (F8 / audit PR-7)
 *
 * Per-screen error boundary. Before this, the only boundary was the
 * app-root ErrorBoundary in App.js: a deterministic render throw in any
 * one screen felled the whole app into the crash screen, whose Retry
 * re-rendered the identical tree (an unrecoverable loop). Wrapping each
 * registered screen means a throw degrades to THAT screen's calm
 * fallback while the tab bar, navigation state and every other screen
 * keep working.
 *
 * This is a CLASS component: React only exposes componentDidCatch /
 * getDerivedStateFromError on classes, so this is the one sanctioned
 * exception to the function-components-only convention (CLAUDE.md § 3).
 *
 * Behaviour:
 * - Healthy children render untouched.
 * - A caught error is ALWAYS logged (logError with the screen's scope
 *   and component stack); the boundary never swallows silently.
 * - "Try again" resets the boundary so the screen re-renders. Retries
 *   are counted; after 2 failed retries a quiet "Go to Home" escape
 *   appears so the user is never trapped in a retry loop.
 * - "Go to Home" only NAVIGATES. It can never skip a gate:
 *   RootNavigator re-evaluates auth, Article 9 consent, first-run and
 *   tier on every render, and while the consent gate (or any other
 *   stack without a HomeTab route) is mounted the navigate is unhandled
 *   and becomes a no-op, leaving the gate in place.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing } from '../styles/theme';
import Button from './Button';
import { logError } from '../lib/errorLog';

// After this many failed "Try again" presses the Home escape appears.
const MAX_QUIET_RETRIES = 2;

export default class ScreenBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Never silent: every caught render throw is logged with the screen
    // scope so it ships to the debug log + Sentry like any other fault.
    try {
      logError(`ScreenBoundary.${this.props.screenName || 'Unknown'}`, error, {
        componentStack: errorInfo?.componentStack?.slice(0, 1200),
      });
    } catch (_) { /* logging must never re-crash the fallback */ }
  }

  handleRetry = () => {
    this.setState((s) => ({ hasError: false, retryCount: s.retryCount + 1 }));
  };

  handleGoHome = () => {
    try {
      // Lazy require: RootNavigator imports this file, so a top-level
      // import here would be a cycle (matches the lib lazy-require idiom).
      // eslint-disable-next-line global-require
      const { navigationRef } = require('../navigation/RootNavigator');
      if (navigationRef?.isReady?.()) {
        // initial: false is a no-op here (Home IS the tab root) but keeps
        // every cross-tab nested navigate on the one rule the F6b guard
        // pins, so lazy tabs can never strand a tab root.
        navigationRef.navigate('HomeTab', { screen: 'Home', initial: false });
      }
    } catch (_) { /* best-effort escape; the fallback stays up */ }
    this.setState({ hasError: false, retryCount: 0 });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const showHomeEscape = this.state.retryCount >= MAX_QUIET_RETRIES;
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>This screen hit a problem.</Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.body}>Your data is safe. Try again, or come back in a moment.</Text>
        <Button
          title="Try again"
          onPress={this.handleRetry}
          fullWidth={false}
          style={styles.retry}
        />
        {showHomeEscape ? (
          <Button
            title="Go to Home"
            variant="tertiary"
            onPress={this.handleGoHome}
            fullWidth={false}
          />
        ) : null}
      </View>
    );
  }
}

/**
 * withBoundary(Component, screenName)
 *
 * HOC used at screen registration (RootNavigator) so every registered
 * screen renders inside its own ScreenBoundary, scoped by route name.
 */
export function withBoundary(Component, screenName) {
  function Bounded(props) {
    return (
      <ScreenBoundary screenName={screenName}>
        <Component {...props} />
      </ScreenBoundary>
    );
  }
  Bounded.displayName = `withBoundary(${screenName || Component.displayName || Component.name || 'Screen'})`;
  return Bounded;
}

/**
 * withScreenBoundaries(navigator)
 *
 * The wiring seam for React Navigation v6 (RootNavigator). v6 has no
 * `screenLayout` prop (that arrived in v7), so this wraps the object a
 * navigator factory returns (createStackNavigator() /
 * createBottomTabNavigator()): the replacement Navigator clones each
 * registered <Screen> child and swaps its `component` for a
 * withBoundary-wrapped version scoped by route name. One wrap point per
 * factory covers every screen in every stack.
 *
 * Safety notes:
 * - cloneElement preserves the child element's TYPE (the navigator's
 *   Screen), so react-navigation's "only Screen/Group/Fragment" child
 *   validation still passes; only the `component` prop is replaced.
 * - Wrapped components are cached per (route name, component) so their
 *   identity is stable across re-renders and screens never remount.
 * - Children without a `component` prop (nulls from conditional JSX,
 *   render-callback screens) pass through untouched.
 */
export function withScreenBoundaries(navigator) {
  const cache = new Map(); // route name -> Map(component -> bounded component)
  function bounded(name, component) {
    let byComponent = cache.get(name);
    if (!byComponent) {
      byComponent = new Map();
      cache.set(name, byComponent);
    }
    let Bounded = byComponent.get(component);
    if (!Bounded) {
      Bounded = withBoundary(component, name);
      byComponent.set(component, Bounded);
    }
    return Bounded;
  }
  function Navigator({ children, ...rest }) {
    return (
      <navigator.Navigator {...rest}>
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child) || !child.props?.component) return child;
          return React.cloneElement(child, {
            component: bounded(child.props.name, child.props.component),
          });
        })}
      </navigator.Navigator>
    );
  }
  return { ...navigator, Navigator };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  body: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  retry: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
});
