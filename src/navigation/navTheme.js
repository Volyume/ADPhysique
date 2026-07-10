/**
 * navTheme — CP-10 stage 2 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md, "Stage 2 — Root chrome").
 *
 * The two pieces of RootNavigator.js's "root chrome" the plan names for this
 * stage -- the NavigationContainer `theme` prop derivation, and the
 * module-scope `stackOptions` const every Stack.Navigator's screenOptions
 * used to spread -- live in this small standalone module instead of inline
 * in RootNavigator.js, for exactly one reason: testability. RootNavigator.js
 * itself imports @react-navigation/bottom-tabs and @react-navigation/stack
 * at module scope, which touch native modules this jest config does not
 * mock (see src/__tests__/appLockGateRouting.guard.test.js's header
 * comment: "RootNavigator is not importable under this jest config"). This
 * module has no such import -- only React + the live useTheme() hook -- so
 * its derivation can be `require`d directly and asserted against
 * resolveTheme() for every accessibility-preference combination (the CP-10
 * plan's Stage 2 verification requirement), something no test of
 * RootNavigator.js itself can do today.
 *
 * `buildNavTheme` is deliberately a plain, pure function (theme in, nav
 * theme object out) so it doubles as the test surface; `useNavTheme` and
 * `useStackOptions` are the two hooks RootNavigator.js actually calls,
 * each memoized on the live theme object's identity (itself stable unless
 * one of the four raw accessibility prefs changes, src/hooks/useTheme.js)
 * so neither recomputes on RootNavigator's frequent unrelated re-renders
 * (auth/tier/splash state) -- CP-10 plan risk register #8.
 */
import { useMemo } from 'react';
import useTheme from '../hooks/useTheme';

// Pure: React Navigation's NavigationContainer `theme` prop shape, built
// from a resolved theme object (useTheme()'s return value, or
// resolveTheme()'s direct return value -- same shape either way).
export function buildNavTheme(theme) {
  return {
    dark: theme.resolvedTheme !== 'light',
    colors: {
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      notification: theme.colors.primary,
    },
  };
}

// react-navigation treats a new `theme` reference as a reason to re-render
// every screen under NavigationContainer, so a stable reference matters here
// beyond the general memoization rule.
export function useNavTheme() {
  const theme = useTheme();
  return useMemo(() => buildNavTheme(theme), [theme]);
}

// Was a module-scope const in RootNavigator.js baked from the static
// `colors` singleton at import time (class 2, CP-10 plan section 1.4/2.2 --
// listed there by name). Now a hook every Stack.Navigator call site calls
// inline (same pattern as RootNavigator.js's pre-existing
// useStackMotionOverride()), so header/card colours follow a live theme
// change with no restart.
export function useStackOptions() {
  const t = useTheme();
  return useMemo(() => ({
    headerStyle: { backgroundColor: t.colors.surface, borderBottomColor: t.colors.border },
    headerTintColor: t.colors.textPrimary,
    headerTitleStyle: { fontWeight: '700', color: t.colors.textPrimary },
    cardStyle: { backgroundColor: t.colors.background },
    // No header sync indicator. Founder call 2026-05-31: sync is automatic and
    // failures surface in logs and Sentry, so a permanent status badge in the
    // header was noise (and its transient red "error" state was alarming).
    // Overrides the old PRODUCTION_READINESS_LOCKED.md § 1 "visible in the UI"
    // requirement; see that doc for the recorded override.
  }), [t]);
}

export default useNavTheme;
