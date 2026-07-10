/**
 * LT-3 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, D17):
 * the Materials Policy (src/styles/theme.js) says light theme uses shadow as
 * the PRIMARY elevation cue while dark theme carries elevation via the
 * surface ladder alone. The shared Card primitive had no shadow in either
 * theme. This pins the fix: Card gains `shadow.card` ONLY when the resolved
 * theme is 'light'; dark theme's base style must stay byte-identical to
 * before this change.
 *
 * CP-10 stage 1 (docs/ux-world-class-audit-2026-07-09/
 * CP-10-restart-free-theming-plan.md): Card was migrated from the static,
 * boot-frozen `colors`/`shadow`/`resolvedTheme` imports to the live
 * `useTheme()` hook (src/hooks/useTheme.js), which derives from
 * useAppStore's accessibility slice instead of theme.js's module-scope
 * singletons. So this file now drives the STORE (useAppStore.setState) to
 * pick a theme, rather than isolateModules + theme.applyAccessibility +
 * re-require — Card no longer freezes at import time, which is the whole
 * point of the fix. `theme.applyAccessibility` is still called alongside
 * (with the same prefs) purely so `theme.colors`/`theme.shadow` are
 * available as independently-computed "expected" values for the assertions
 * below, and so this test also pins that the live and legacy systems agree
 * (CP-10 coexistence requirement) — Card itself no longer reads that path.
 */
import { create, act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import useAppStore from '../../store/useAppStore';
import Card from '../Card';
import * as theme from '../../styles/theme';

function renderCardStyle(themeName) {
  const prefs = themeName ? { theme: themeName } : {};
  act(() => {
    // Keeps the legacy singleton in sync so `theme.colors`/`theme.shadow`
    // below reflect the same prefs the store now drives Card with (belt and
    // braces — Card itself only reads the store via useTheme()).
    theme.applyAccessibility(prefs);
    useAppStore.setState({
      accessibility: {
        ...useAppStore.getState().accessibility,
        theme: prefs.theme ?? 'dark',
        higherContrast: false,
        colorBlindSafe: false,
        largerText: false,
      },
    });
  });
  let tree;
  act(() => {
    tree = create(<Card><Text>content</Text></Card>);
  });
  const json = tree.toJSON();
  return { flat: StyleSheet.flatten(json.props.style), tree };
}

describe('LT-3: Card light-theme-only shadow elevation', () => {
  test('dark theme: base style carries no shadow/elevation keys (byte-identical to before)', () => {
    const { flat } = renderCardStyle('dark');
    expect(theme.resolvedTheme).toBe('dark');
    expect(flat.shadowColor).toBeUndefined();
    expect(flat.shadowOffset).toBeUndefined();
    expect(flat.shadowOpacity).toBeUndefined();
    expect(flat.shadowRadius).toBeUndefined();
    expect(flat.elevation).toBeUndefined();
    // Unaffected fields still present as before.
    expect(flat.borderWidth).toBe(1);
    expect(flat.borderColor).toBe(theme.colors.borderSubtle);
  });

  test('no-theme-preference (defaults to dark) also carries no shadow', () => {
    const { flat } = renderCardStyle(undefined);
    expect(theme.resolvedTheme).toBe('dark');
    expect(flat.shadowColor).toBeUndefined();
    expect(flat.elevation).toBeUndefined();
  });

  test('light theme: base style carries the shadow.card token verbatim', () => {
    const { flat } = renderCardStyle('light');
    expect(theme.resolvedTheme).toBe('light');
    expect(flat.shadowColor).toBe(theme.shadow.card.shadowColor);
    expect(flat.shadowOffset).toEqual(theme.shadow.card.shadowOffset);
    expect(flat.shadowOpacity).toBe(theme.shadow.card.shadowOpacity);
    expect(flat.shadowRadius).toBe(theme.shadow.card.shadowRadius);
    expect(flat.elevation).toBe(theme.shadow.card.elevation);
  });

  test('shadow.card is soft and low-elevation (calm, not a heavy card shadow)', () => {
    renderCardStyle('light');
    expect(theme.shadow.card.shadowOpacity).toBeLessThanOrEqual(0.12);
    expect(theme.shadow.card.shadowRadius).toBeLessThanOrEqual(6);
    expect(theme.shadow.card.elevation).toBeLessThanOrEqual(2);
  });
});

describe('CP-10 stage 1: Card is restart-free — flips live on the SAME mounted instance', () => {
  test('toggling the store theme preference re-renders the already-mounted Card with no remount', () => {
    act(() => {
      useAppStore.setState({
        accessibility: {
          ...useAppStore.getState().accessibility,
          theme: 'dark', higherContrast: false, colorBlindSafe: false, largerText: false,
        },
      });
    });
    let tree;
    act(() => { tree = create(<Card><Text>content</Text></Card>); });
    let flat = StyleSheet.flatten(tree.toJSON().props.style);
    expect(flat.shadowOpacity).toBeUndefined();
    const darkBg = flat.backgroundColor;

    // Flip the SAME store, without unmounting/re-requiring anything.
    act(() => {
      useAppStore.setState({ accessibility: { ...useAppStore.getState().accessibility, theme: 'light' } });
    });
    flat = StyleSheet.flatten(tree.toJSON().props.style);
    expect(flat.backgroundColor).not.toBe(darkBg);
    expect(flat.shadowOpacity).toBe(theme.shadow.card.shadowOpacity);
    expect(flat.shadowColor).toBe(theme.shadow.card.shadowColor);
    expect(flat.shadowRadius).toBe(theme.shadow.card.shadowRadius);
  });

  test('higher contrast toggling live changes Card border colour with no remount', () => {
    act(() => {
      useAppStore.setState({
        accessibility: {
          ...useAppStore.getState().accessibility,
          theme: 'dark', higherContrast: false, colorBlindSafe: false, largerText: false,
        },
      });
    });
    let tree;
    act(() => { tree = create(<Card tone="neutral"><Text>content</Text></Card>); });
    const before = StyleSheet.flatten(tree.toJSON().props.style).borderColor;

    act(() => {
      useAppStore.setState({ accessibility: { ...useAppStore.getState().accessibility, higherContrast: true } });
    });
    const after = StyleSheet.flatten(tree.toJSON().props.style).borderColor;
    // tone="neutral" borders on colors.border, which the HC table changes.
    expect(after).not.toBe(before);
  });
});
