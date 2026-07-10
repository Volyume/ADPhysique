/**
 * CP-10 stage 2 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md, "Stage 2 -- Root chrome"): pins that
 * buildNavTheme / useNavTheme / useStackOptions derive EXACTLY from
 * resolveTheme() -- the same pure function the legacy boot-time
 * applyAccessibility() and the live useTheme() hook already share
 * (src/styles/theme.js, src/hooks/useTheme.js) -- across every
 * accessibility-preference combination, so the NavigationContainer chrome
 * and every Stack.Navigator's header/card colours can never drift from the
 * rest of the app's resolved palette.
 *
 * WHY THIS FILE TESTS src/navigation/navTheme.js DIRECTLY, NOT
 * RootNavigator.js: importing anything from RootNavigator.js pulls in
 * @react-navigation/bottom-tabs and @react-navigation/stack at module
 * scope, which touch native modules this jest config does not mock --
 * confirmed directly (`require('../RootNavigator')` throws "Cannot read
 * properties of undefined (reading 'getConstants')" from
 * @react-navigation/elements' HeaderBackButton). This is the same
 * constraint src/__tests__/appLockGateRouting.guard.test.js's header
 * comment documents ("RootNavigator is not importable under this jest
 * config"), which is exactly why the CP-10 stage 2 nav-theme derivation was
 * pulled into its own module with no such import (see navTheme.js's header
 * comment) -- it is the one piece of root-chrome theming this suite can
 * exercise with real hook execution instead of a source-text guard.
 */
import { create, act } from 'react-test-renderer';
import useAppStore from '../../store/useAppStore';
import { resolveTheme } from '../../styles/theme';
import { buildNavTheme, useNavTheme, useStackOptions } from '../navTheme';

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

// Every accessibility-preference combination that can change resolveTheme's
// output, mirroring the CP-10 plan's Stage 2 verification requirement
// ("nav-theme derivation parity with resolveTheme across prefs").
const PREF_COMBOS = [
  { theme: 'dark' },
  { theme: 'light' },
  { theme: 'system' },
  { theme: 'dark', higherContrast: true },
  { theme: 'light', higherContrast: true },
  { theme: 'dark', colorBlindSafe: true },
  { theme: 'light', colorBlindSafe: true },
  { theme: 'dark', largerText: true },
  { theme: 'dark', higherContrast: true, colorBlindSafe: true, largerText: true },
  { theme: 'light', higherContrast: true, colorBlindSafe: true, largerText: true },
];

describe('buildNavTheme: pure parity with resolveTheme across every preference combination', () => {
  test.each(PREF_COMBOS)('%j', (prefs) => {
    const resolved = resolveTheme(prefs);
    const navTheme = buildNavTheme(resolved);
    // Exact field-for-field mapping the CP-10 plan's Stage 2 section
    // documents (section "Stage 2 -- Root chrome" / section 2.2 "Navigation
    // theme"): primary/background/border pass through, card comes from
    // surface, text comes from textPrimary, notification reuses primary.
    expect(navTheme).toEqual({
      dark: resolved.resolvedTheme !== 'light',
      colors: {
        primary: resolved.colors.primary,
        background: resolved.colors.background,
        card: resolved.colors.surface,
        text: resolved.colors.textPrimary,
        border: resolved.colors.border,
        notification: resolved.colors.primary,
      },
    });
  });

  test('dark flag flips exactly on the light/dark boundary, independent of HC/CVD/largerText', () => {
    expect(buildNavTheme(resolveTheme({ theme: 'dark' })).dark).toBe(true);
    expect(buildNavTheme(resolveTheme({ theme: 'light' })).dark).toBe(false);
    expect(
      buildNavTheme(resolveTheme({ theme: 'light', higherContrast: true, colorBlindSafe: true })).dark,
    ).toBe(false);
  });
});

describe('useNavTheme: live hook, no remount, matches resolveTheme at every flip', () => {
  test('flips light<->dark on the same mounted instance', () => {
    setTheme('dark');
    let captured;
    function Probe() {
      captured = useNavTheme();
      return null;
    }
    let tree;
    act(() => { tree = create(<Probe />); });
    expect(captured).toEqual(buildNavTheme(resolveTheme({ theme: 'dark' })));

    setTheme('light');
    act(() => { tree.update(<Probe />); });
    expect(captured).toEqual(buildNavTheme(resolveTheme({ theme: 'light' })));
  });

  test('object identity is stable across an UNRELATED store write (CP-10 plan risk register #8)', () => {
    setTheme('dark');
    let captured;
    function Probe() {
      captured = useNavTheme();
      return null;
    }
    let tree;
    act(() => { tree = create(<Probe />); });
    const first = captured;
    // showFibre is not one of the four prefs resolveTheme reads -- a new
    // `theme` object reference here would make react-navigation re-render
    // every screen under NavigationContainer for no reason.
    act(() => {
      useAppStore.setState({
        accessibility: { ...useAppStore.getState().accessibility, showFibre: false },
      });
    });
    act(() => { tree.update(<Probe />); });
    expect(captured).toBe(first);
  });
});

describe('useStackOptions: live header/card colours, matches resolveTheme at every flip', () => {
  test('flips light<->dark on the same mounted instance', () => {
    setTheme('dark');
    let captured;
    function Probe() {
      captured = useStackOptions();
      return null;
    }
    let tree;
    act(() => { tree = create(<Probe />); });
    const darkResolved = resolveTheme({ theme: 'dark' });
    expect(captured.headerStyle.backgroundColor).toBe(darkResolved.colors.surface);
    expect(captured.headerStyle.borderBottomColor).toBe(darkResolved.colors.border);
    expect(captured.headerTintColor).toBe(darkResolved.colors.textPrimary);
    expect(captured.cardStyle.backgroundColor).toBe(darkResolved.colors.background);

    setTheme('light');
    act(() => { tree.update(<Probe />); });
    const lightResolved = resolveTheme({ theme: 'light' });
    expect(captured.headerStyle.backgroundColor).toBe(lightResolved.colors.surface);
    expect(captured.cardStyle.backgroundColor).toBe(lightResolved.colors.background);
    expect(captured.headerStyle.backgroundColor).not.toBe(darkResolved.colors.surface);
  });

  test('higher contrast changes the border colour live, matching resolveTheme', () => {
    setTheme('dark', { higherContrast: false });
    let captured;
    function Probe() {
      captured = useStackOptions();
      return null;
    }
    let tree;
    act(() => { tree = create(<Probe />); });
    const baseBorder = captured.headerStyle.borderBottomColor;

    setTheme('dark', { higherContrast: true });
    act(() => { tree.update(<Probe />); });
    const hcResolved = resolveTheme({ theme: 'dark', higherContrast: true });
    expect(captured.headerStyle.borderBottomColor).toBe(hcResolved.colors.border);
    expect(captured.headerStyle.borderBottomColor).not.toBe(baseBorder);
  });
});
