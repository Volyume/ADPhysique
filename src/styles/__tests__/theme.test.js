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
  resolvedTheme,
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
  test('overline is the shared section-label role and adds no tracking drift', () => {
    expect(type.overline).toEqual({
      fontSize: 11,
      fontWeight: '600',
      lineHeight: Math.round(11 * lineHeight.snug),
      letterSpacing: 0,
      textTransform: 'uppercase',
    });
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

describe('dark theme contrast', () => {
  function relLum(hex) {
    const h = String(hex).replace('#', '');
    const ch = (i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
  }
  function ratio(a, b) {
    const la = relLum(a);
    const lb = relLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  afterEach(() => applyAccessibility({}));

  test('text roles clear their WCAG bars on every core dark surface', () => {
    applyAccessibility({ theme: 'dark' });
    const surfaces = [
      colors.background,
      colors.surface,
      colors.surfaceElevated,
      colors.surface2,
      colors.surface3,
    ];

    for (const s of surfaces) {
      expect(ratio(colors.textPrimary, s)).toBeGreaterThanOrEqual(7);
      expect(ratio(colors.textSecondary, s)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(colors.textMuted, s)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('disabled text remains a disabled-only token, not muted body copy', () => {
    expect(colors.textDisabled).not.toBe(colors.textMuted);
    expect(ratio(colors.textDisabled, colors.background)).toBeLessThan(4.5);
    expect(ratio(colors.textMuted, colors.surface3)).toBeGreaterThanOrEqual(4.5);
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

// ─── COMP-029 light theme: contrast + composition ──────────────────────────
// The standout move (blueprint §4f): the light table's WCAG ratios are
// executable, so it can never silently drift below its bar on a future edit.
// All ratios computed with the WCAG 2.x relative-luminance formula.
describe('COMP-029 light theme', () => {
  function relLum(hex) {
    const h = String(hex).replace('#', '');
    const ch = (i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4);
  }
  function ratio(a, b) {
    const la = relLum(a);
    const lb = relLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  afterEach(() => applyAccessibility({})); // reset to dark for the rest of the file

  test('resolvedTheme reflects the chosen palette (absent => dark)', () => {
    applyAccessibility({ theme: 'light' });
    expect(resolvedTheme).toBe('light');
    expect(colors.background).toBe('#FAFAF7');
    applyAccessibility({ theme: 'dark' });
    expect(resolvedTheme).toBe('dark');
    expect(colors.background).toBe('#0D0D0D');
    applyAccessibility({});
    expect(resolvedTheme).toBe('dark'); // no theme key => dark, no user changes
  });

  test('light text roles clear their WCAG bars on every surface', () => {
    applyAccessibility({ theme: 'light' });
    const { surface, background, surface2, surface3 } = colors;
    const surfaces = [surface, background, surface2, surface3];
    // Body text AAA-ish.
    expect(ratio(colors.textPrimary, surface)).toBeGreaterThanOrEqual(7);
    expect(ratio(colors.textSecondary, surface)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(colors.textSecondary, background)).toBeGreaterThanOrEqual(4.5);
    // textMuted and the amber primary INK must clear 4.5:1 on EVERY surface.
    for (const s of surfaces) {
      expect(ratio(colors.textMuted, s)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(colors.primary, s)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('light status + trophy inks clear 4.5:1 on white', () => {
    applyAccessibility({ theme: 'light' });
    for (const role of ['success', 'warning', 'error', 'gold', 'silver', 'bronze']) {
      expect(ratio(colors[role], '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    }
    // warning stays distinct from the amber primary ink (COMP-027 separation).
    expect(colors.warning).not.toBe(colors.primary);
  });

  test('onPrimary ink clears the bright amber FILL in both themes', () => {
    applyAccessibility({ theme: 'light' });
    expect(ratio(colors.onPrimary, colors.primaryFill)).toBeGreaterThanOrEqual(4.5);
    applyAccessibility({});
    expect(ratio(colors.onPrimary, colors.primaryFill)).toBeGreaterThanOrEqual(4.5);
  });

  test('onError ink clears the error FILL in both themes (U-F-1 destructive)', () => {
    // Destructive button labels are large/bold text → WCAG 3:1 bar. White ink on
    // the dark-red light-theme fill is the fix; dark stays white (zero-diff).
    applyAccessibility({ theme: 'light' });
    expect(ratio(colors.onError, colors.error)).toBeGreaterThanOrEqual(3);
    applyAccessibility({});
    expect(ratio(colors.onError, colors.error)).toBeGreaterThanOrEqual(3);
  });

  test('light borders + chart line clear the 3:1 non-text bar', () => {
    applyAccessibility({ theme: 'light' });
    expect(ratio(colors.border, colors.surface)).toBeGreaterThanOrEqual(3);
    expect(ratio(colors.border, colors.background)).toBeGreaterThanOrEqual(3);
    expect(ratio(colors.chartLine, '#FFFFFF')).toBeGreaterThanOrEqual(3);
  });

  // Macro CATEGORY bar tints (founder decision 2026-06-29). The bars are a
  // graphical element, so each tint must clear the 3:1 non-text bar against the
  // bar track (surface2) in BOTH themes, and none may be a traffic-light state
  // colour (a macro bar must never read as adherence good/bad). This is the
  // executable contract behind the comment in theme.js.
  test('macro category tints clear 3:1 on the bar track and are never a state colour', () => {
    const macros = ['macroProtein', 'macroCarb', 'macroFat', 'macroFibre'];
    applyAccessibility({ theme: 'light' });
    for (const m of macros) expect(ratio(colors[m], colors.surface2)).toBeGreaterThanOrEqual(3);
    applyAccessibility({});
    for (const m of macros) expect(ratio(colors[m], colors.surface2)).toBeGreaterThanOrEqual(3);
    for (const m of macros) {
      expect(colors[m]).not.toBe(colors.success);
      expect(colors[m]).not.toBe(colors.warning);
      expect(colors[m]).not.toBe(colors.error);
    }
  });

  test('light + higher-contrast lifts text further (composition order)', () => {
    applyAccessibility({ theme: 'light', higherContrast: true });
    expect(colors.background).toBe('#FAFAF7'); // theme landed first
    expect(colors.textSecondary).toBe('#3D3D3B'); // then the light HC table
    expect(ratio(colors.textSecondary, colors.background)).toBeGreaterThanOrEqual(7);
  });

  test('light + colour-blind-safe uses the Okabe-Ito light hues', () => {
    applyAccessibility({ theme: 'light', colorBlindSafe: true });
    expect(colors.success).toBe('#0072B2');
    expect(colors.error).toBe('#9C4D76');
    expect(ratio(colors.success, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(ratio(colors.error, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  test('dark theme is unchanged: HC + CVD tables reproduce the prior values', () => {
    applyAccessibility({ higherContrast: true });
    expect(colors.background).toBe('#0D0D0D');
    expect(colors.textSecondary).toBe('#D0D0D0');
    expect(colors.border).toBe('#999999');
    applyAccessibility({ colorBlindSafe: true });
    expect(colors.success).toBe('#56B4E9');
    expect(colors.error).toBe('#CC79A7');
  });
});
