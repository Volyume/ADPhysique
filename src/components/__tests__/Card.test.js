/**
 * LT-3 (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md, D17):
 * the Materials Policy (src/styles/theme.js) says light theme uses shadow as
 * the PRIMARY elevation cue while dark theme carries elevation via the
 * surface ladder alone. The shared Card primitive had no shadow in either
 * theme. This pins the fix: Card gains `shadow.card` ONLY when the theme
 * resolved at boot (theme.js `resolvedTheme`) is 'light'; dark theme's base
 * style must stay byte-identical to before this change.
 *
 * `resolvedTheme` and the Card module's StyleSheet.create() both resolve at
 * import time (the same boot-then-reload pattern colors.* already uses, see
 * theme.js header comment), so each theme is tested in its own fresh module
 * registry: reset modules, call applyAccessibility() for that theme, THEN
 * require Card so its styles bake in against the right resolvedTheme.
 */
import { create, act } from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';

function renderCardStyle(theme) {
  let CardModule;
  let themeModule;
  jest.isolateModules(() => {
    themeModule = require('../../styles/theme');
    themeModule.applyAccessibility(theme ? { theme } : {});
    CardModule = require('../Card').default;
  });
  const Card = CardModule;
  let tree;
  act(() => {
    tree = create(<Card><Text>content</Text></Card>);
  });
  const json = tree.toJSON();
  return { flat: StyleSheet.flatten(json.props.style), theme: themeModule };
}

describe('LT-3: Card light-theme-only shadow elevation', () => {
  test('dark theme: base style carries no shadow/elevation keys (byte-identical to before)', () => {
    const { flat, theme } = renderCardStyle('dark');
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
    const { flat, theme } = renderCardStyle(undefined);
    expect(theme.resolvedTheme).toBe('dark');
    expect(flat.shadowColor).toBeUndefined();
    expect(flat.elevation).toBeUndefined();
  });

  test('light theme: base style carries the shadow.card token verbatim', () => {
    const { flat, theme } = renderCardStyle('light');
    expect(theme.resolvedTheme).toBe('light');
    expect(flat.shadowColor).toBe(theme.shadow.card.shadowColor);
    expect(flat.shadowOffset).toEqual(theme.shadow.card.shadowOffset);
    expect(flat.shadowOpacity).toBe(theme.shadow.card.shadowOpacity);
    expect(flat.shadowRadius).toBe(theme.shadow.card.shadowRadius);
    expect(flat.elevation).toBe(theme.shadow.card.elevation);
  });

  test('shadow.card is soft and low-elevation (calm, not a heavy card shadow)', () => {
    const { theme } = renderCardStyle('light');
    expect(theme.shadow.card.shadowOpacity).toBeLessThanOrEqual(0.12);
    expect(theme.shadow.card.shadowRadius).toBeLessThanOrEqual(6);
    expect(theme.shadow.card.elevation).toBeLessThanOrEqual(2);
  });
});
