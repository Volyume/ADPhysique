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
import { fontFamily } from '../fontFamily';

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
  test('body bundles family + size + lineHeight + letterSpacing', () => {
    expect(type.body).toEqual({
      fontFamily: fontFamily.regular,
      fontSize: 16,
      lineHeight: Math.round(16 * lineHeight.normal),
      letterSpacing: letterSpacing.body,
    });
  });
  test('display stays sharp without synthetic Android weight or tracking', () => {
    expect(type.display.letterSpacing).toBe(letterSpacing.display);
    expect(type.display.fontWeight).toBeUndefined();
    expect(type.display.fontFamily).toBe(fontFamily.displayBold);
  });
  test('overline is the shared section-label role and tracks at the overline token (D3 2026-07-09)', () => {
    expect(type.overline).toEqual({
      fontFamily: fontFamily.medium,
      fontSize: 11,
      lineHeight: Math.round(11 * lineHeight.snug),
      // D3 (DECISIONS-2026-07-09): uppercase 10-12px micro-labels track
      // slightly open (letterSpacing.overline = 0.5) for legibility. Was 0
      // pre-campaign; this is the sanctioned role value, not drift.
      letterSpacing: letterSpacing.overline,
      textTransform: 'uppercase',
    });
  });

  test('core hierarchy avoids blocky synthetic bold weights on Android', () => {
    expect(type.h2.fontFamily).toBe(fontFamily.semibold);
    expect(type.h3.fontFamily).toBe(fontFamily.medium);
    expect(type.title.fontFamily).toBe(fontFamily.medium);
    expect(type.bodyStrong.fontFamily).toBe(fontFamily.medium);
    expect(type.h2.fontWeight).toBeUndefined();
    expect(type.title.fontWeight).toBeUndefined();
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
  test('letterSpacing stays neutral across type roles', () => {
    expect(letterSpacing.display).toBe(0);
    expect(letterSpacing.heading).toBe(0);
    expect(letterSpacing.body).toBe(0);
    expect(letterSpacing.label).toBe(0);
    expect(letterSpacing.caption).toBe(0);
  });
});

// ─── AY-2/D7: on-tint ink tokens ────────────────────────────────────────────
// design-usability-audit-2026-07-09/coverage-04-accessibility.md AY-2: the
// flat `success`/`error` inks fail 4.5:1 body text once composited on a real
// surface behind their own semi-transparent `successBg`/`errorBg` tint (e.g.
// AthleteProfileScreen's status pills, sitting on a Card's `surface`).
// `onSuccessBg`/`onErrorBg` are the dedicated on-tint ink, pinned here (same
// WCAG 2.x method as the rest of this file) to clear 4.5:1 against their OWN
// `*Bg` tint composited on EVERY surface-ladder step, in both themes and both
// colour-blind-safe variants, so a badge/banner is safe at any elevation.
describe('AY-2 on-tint ink tokens (successBg/errorBg text)', () => {
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
  // Composite an rgba() tint over an opaque hex surface (same maths as the
  // real renderer: alpha-blend, no gamma correction needed pre-luminance).
  function composite(rgbaStr, surfaceHex) {
    const m = rgbaStr.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,?\s*([\d.]+)?\s*\)/);
    const [, r, g, b, a = '1'] = m;
    const sh = surfaceHex.replace('#', '');
    const sr = parseInt(sh.slice(0, 2), 16);
    const sg = parseInt(sh.slice(2, 4), 16);
    const sb = parseInt(sh.slice(4, 6), 16);
    const alpha = parseFloat(a);
    const blend = (fg, bg) => Math.round(fg * alpha + bg * (1 - alpha));
    const toHex = (v) => v.toString(16).padStart(2, '0');
    return `#${toHex(blend(parseFloat(r), sr))}${toHex(blend(parseFloat(g), sg))}${toHex(blend(parseFloat(b), sb))}`;
  }

  afterEach(() => applyAccessibility({}));

  function expectInkClearsAtEveryElevation(ink, tintRgba) {
    const surfaces = [
      colors.background,
      colors.surface,
      colors.surfaceElevated,
      colors.surface2,
      colors.surface3,
    ];
    for (const s of surfaces) {
      expect(ratio(ink, composite(tintRgba, s))).toBeGreaterThanOrEqual(4.5);
    }
  }

  test('dark: onErrorBg clears 4.5:1 on errorBg at every elevation (was 4.09:1 on surface)', () => {
    applyAccessibility({ theme: 'dark' });
    expectInkClearsAtEveryElevation(colors.onErrorBg, colors.errorBg);
  });

  test('dark: onSuccessBg clears 4.5:1 on successBg at every elevation', () => {
    applyAccessibility({ theme: 'dark' });
    expectInkClearsAtEveryElevation(colors.onSuccessBg, colors.successBg);
  });

  test('light: onSuccessBg clears 4.5:1 on successBg at every elevation (was 4.36:1 on surface, failed at every step)', () => {
    applyAccessibility({ theme: 'light' });
    expectInkClearsAtEveryElevation(colors.onSuccessBg, colors.successBg);
  });

  test('light: onErrorBg clears 4.5:1 on errorBg at every elevation', () => {
    applyAccessibility({ theme: 'light' });
    expectInkClearsAtEveryElevation(colors.onErrorBg, colors.errorBg);
  });

  test('colour-blind-safe: onSuccessBg/onErrorBg are re-derived for the swapped hue, not left as the default green/red ink', () => {
    applyAccessibility({ theme: 'dark', colorBlindSafe: true });
    expect(colors.onSuccessBg).not.toBe('#77C27A');
    expect(colors.onErrorBg).not.toBe('#F88A82');
    expectInkClearsAtEveryElevation(colors.onSuccessBg, colors.successBg);
    expectInkClearsAtEveryElevation(colors.onErrorBg, colors.errorBg);

    applyAccessibility({ theme: 'light', colorBlindSafe: true });
    expect(colors.onSuccessBg).not.toBe('#266729');
    expect(colors.onErrorBg).not.toBe('#AE2323');
    expectInkClearsAtEveryElevation(colors.onSuccessBg, colors.successBg);
    expectInkClearsAtEveryElevation(colors.onErrorBg, colors.errorBg);
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

  test('onError ink clears the destructive FILL at 4.5:1 in every palette (AX-06)', () => {
    // The destructive label is 13/16px semibold, NOT WCAG "large text", so the
    // bar is 4.5:1 (not the 3:1 this test previously, wrongly, encoded). The
    // button fill is errorFill (deeper than the `error` ink) precisely so white
    // onError clears 4.5:1 in dark, light and both colour-blind palettes.
    applyAccessibility({});
    expect(ratio(colors.onError, colors.errorFill)).toBeGreaterThanOrEqual(4.5);
    applyAccessibility({ theme: 'light' });
    expect(ratio(colors.onError, colors.errorFill)).toBeGreaterThanOrEqual(4.5);
    applyAccessibility({ theme: 'dark', colorBlindSafe: true });
    expect(ratio(colors.onError, colors.errorFill)).toBeGreaterThanOrEqual(4.5);
    applyAccessibility({ theme: 'light', colorBlindSafe: true });
    expect(ratio(colors.onError, colors.errorFill)).toBeGreaterThanOrEqual(4.5);
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
