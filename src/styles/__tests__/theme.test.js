/**
 * Tests for the foundation token additions: withAlpha(), the scrim token,
 * and the type / lineHeight / letterSpacing roles. The type roles are
 * getters so they must reflect the larger-text fontSize swap that
 * applyAccessibility performs in place.
 */
import {
  colors,
  fontSize,
  spacing,
  radius,
  circle,
  motion,
  withAlpha,
  lineHeight,
  letterSpacing,
  type,
  num,
  applyAccessibility,
} from '../theme';

describe('withAlpha', () => {
  test('6-digit hex → rgba', () => {
    expect(withAlpha('#F59E0B', 0.5)).toBe('rgba(245, 158, 11, 0.5)');
  });
  test('3-digit hex expands then → rgba', () => {
    expect(withAlpha('#abc', 1)).toBe('rgba(170, 187, 204, 1)');
  });
  test('8-digit hex drops existing alpha', () => {
    expect(withAlpha('#F59E0BCC', 0.2)).toBe('rgba(245, 158, 11, 0.2)');
  });
  test('rgb() input gets the alpha', () => {
    expect(withAlpha('rgb(10, 20, 30)', 0.4)).toBe('rgba(10, 20, 30, 0.4)');
  });
  test('rgba() input is re-alpha-d (handles the rgba primaries)', () => {
    expect(withAlpha('rgba(245, 158, 11, 0.10)', 0.8)).toBe('rgba(245, 158, 11, 0.8)');
  });
  test('alpha is clamped to 0..1', () => {
    expect(withAlpha('#000000', 5)).toBe('rgba(0, 0, 0, 1)');
    expect(withAlpha('#000000', -2)).toBe('rgba(0, 0, 0, 0)');
  });
  test('non-string / malformed input returns input unchanged', () => {
    expect(withAlpha(null, 0.5)).toBe(null);
    expect(withAlpha('not-a-colour', 0.5)).toBe('not-a-colour');
  });
});

describe('scrim token', () => {
  test('exists and is a single backdrop value', () => {
    expect(colors.scrim).toBe('rgba(0, 0, 0, 0.55)');
  });
  test('survives an accessibility reset', () => {
    applyAccessibility({ higherContrast: true });
    expect(colors.scrim).toBe('rgba(0, 0, 0, 0.55)');
    applyAccessibility({}); // reset
  });
});

describe('type roles', () => {
  test('body bundles size + weight + lineHeight + letterSpacing', () => {
    expect(type.body).toEqual({
      fontSize: 16,
      fontWeight: '400',
      lineHeight: Math.round(16 * lineHeight.normal),
      letterSpacing: letterSpacing.body,
    });
  });
  test('display uses the tightest tracking', () => {
    expect(type.display.letterSpacing).toBe(letterSpacing.display);
    expect(type.display.fontWeight).toBe('900');
  });

  test('roles reflect the larger-text swap (getters, not snapshots)', () => {
    const baseBody = type.body.fontSize;
    applyAccessibility({ largerText: true });
    expect(type.body.fontSize).toBe(fontSize.md); // mutated md (×1.2)
    expect(type.body.fontSize).toBeGreaterThan(baseBody);
    // lineHeight scales with the bigger fontSize too
    expect(type.body.lineHeight).toBe(Math.round(fontSize.md * lineHeight.normal));
    applyAccessibility({}); // reset
    expect(type.body.fontSize).toBe(baseBody);
  });
});

describe('num() tabular-numeral helper', () => {
  test('wraps a type role with tabular-nums', () => {
    expect(num('title')).toEqual({ ...type.title, fontVariant: ['tabular-nums'] });
  });
  test('defaults to body and is reachable as type.num', () => {
    expect(num().fontVariant).toEqual(['tabular-nums']);
    expect(type.num('display').fontVariant).toEqual(['tabular-nums']);
  });
  test('unknown role falls back to body, never throws', () => {
    expect(num('nope').fontSize).toBe(type.body.fontSize);
  });
});

describe('surface elevation ladder', () => {
  test('steps get lighter from background up', () => {
    // compare the red channel as a luminance proxy
    const red = h => parseInt(h.slice(1, 3), 16);
    expect(red(colors.background)).toBeLessThan(red(colors.surface));
    expect(red(colors.surface)).toBeLessThan(red(colors.surfaceElevated));
    expect(red(colors.surfaceElevated)).toBeLessThan(red(colors.surface2));
    expect(red(colors.surface2)).toBeLessThan(red(colors.surface3));
  });
  test('new depth tokens exist', () => {
    expect(colors.surfaceElevated).toBeDefined();
    expect(colors.borderSubtle).toBeDefined();
  });
  test('accent has a deepened large-fill variant', () => {
    expect(colors.primary).toBe('#F5A623');
    expect(colors.primaryFill).toBe('#E08C0B');
  });
});

describe('spacing / radius additions', () => {
  test('spacing gained hair and xs2 steps, still ordered', () => {
    expect(spacing.hair).toBe(1);
    expect(spacing.xs2).toBe(6);
    expect(spacing.hair).toBeLessThan(spacing.xxs);
    expect(spacing.xs).toBeLessThan(spacing.xs2);
    expect(spacing.xs2).toBeLessThan(spacing.sm);
  });
  test('radius gained an xs step', () => {
    expect(radius.xs).toBe(4);
    expect(radius.xs).toBeLessThan(radius.sm);
  });
  test('circle() halves and rounds a size', () => {
    expect(circle(36)).toBe(18);
    expect(circle(56)).toBe(28);
    expect(circle(25)).toBe(13);
  });
});

describe('motion tokens', () => {
  test('durations are ordered micro < state < enter < hero', () => {
    expect(motion.micro).toBeLessThan(motion.state);
    expect(motion.state).toBeLessThan(motion.enter);
    expect(motion.enter).toBeLessThan(motion.hero);
  });
  test('easing curves are 4-point cubic-bezier arrays', () => {
    for (const c of [motion.easeStandard, motion.easeDecelerate, motion.easeAccelerate]) {
      expect(Array.isArray(c)).toBe(true);
      expect(c).toHaveLength(4);
    }
  });
  test('spring config has stiffness/damping/mass', () => {
    expect(motion.spring).toEqual({ stiffness: 150, damping: 18, mass: 1 });
  });
});

describe('lineHeight / letterSpacing scales', () => {
  test('lineHeight steps are ordered', () => {
    expect(lineHeight.tight).toBeLessThan(lineHeight.snug);
    expect(lineHeight.snug).toBeLessThan(lineHeight.normal);
    expect(lineHeight.normal).toBeLessThan(lineHeight.relaxed);
  });
  test('letterSpacing tightens for display, loosens for caption', () => {
    expect(letterSpacing.display).toBeLessThan(letterSpacing.body);
    expect(letterSpacing.caption).toBeGreaterThan(letterSpacing.body);
  });
});
