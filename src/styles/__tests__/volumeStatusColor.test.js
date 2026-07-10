/**
 * volumeStatusColor resolver tests (A2-038).
 *
 * getVolumeStatus (algorithms.js) is pure and returns only a status string.
 * The body heatmap and volume bars resolve the colour through this helper, so
 * the colour-blind-safe and high-contrast palette swaps in applyAccessibility
 * must propagate. These tests lock that contract.
 */
import { getVolumeStatus } from '../../lib/algorithms';
import { volumeStatusColor, buildVolumeStatusColor, applyAccessibility, colors, stateColors, resolveTheme } from '../theme';

afterEach(() => {
  // Reset the in-place palette mutation so tests don't leak into each other.
  applyAccessibility({});
});

describe('volumeStatusColor', () => {
  test('covers every status getVolumeStatus can return', () => {
    // Drive the real statuses out of getVolumeStatus so the map can never
    // drift from the algorithm. chest landmarks: mev 6, mav 14, mrv 22.
    const statuses = new Set([
      getVolumeStatus(0, 'chest').status,    // below
      getVolumeStatus(7, 'chest').status,    // minimum (mev..mev+2)
      getVolumeStatus(12, 'chest').status,   // optimal
      getVolumeStatus(20, 'chest').status,   // near_mrv
      getVolumeStatus(30, 'chest').status,   // over_mrv
      getVolumeStatus(5, 'not_a_muscle').status, // unknown
    ]);
    for (const status of statuses) {
      const c = volumeStatusColor(status);
      expect(typeof c).toBe('string');
      expect(c.length).toBeGreaterThan(0);
    }
  });

  test('maps the key statuses to the semantic tokens', () => {
    expect(volumeStatusColor('optimal')).toBe(colors.success);
    expect(volumeStatusColor('over_mrv')).toBe(colors.error);
    expect(volumeStatusColor('minimum')).toBe(colors.warning);
    expect(volumeStatusColor('near_mrv')).toBe(colors.warning);
    expect(volumeStatusColor('below')).toBe(colors.textMuted);
    expect(volumeStatusColor('unknown')).toBe(colors.textMuted);
  });

  test('falls back to the muted token for an unrecognised status', () => {
    expect(volumeStatusColor('nonsense')).toBe(colors.textMuted);
    expect(volumeStatusColor(undefined)).toBe(colors.textMuted);
  });

  test('follows the colour-blind-safe palette swap (the actual A2-038 bug)', () => {
    const before = volumeStatusColor('optimal');
    applyAccessibility({ colorBlindSafe: true });
    const after = volumeStatusColor('optimal');
    expect(after).toBe(colors.success); // tracks the live token
    expect(after).not.toBe(before);     // and the token actually changed
  });
});

describe('stateColors grammar (COMP-027)', () => {
  test('aliases the semantic tokens', () => {
    expect(stateColors.onTrack).toBe(colors.success);
    expect(stateColors.watch).toBe(colors.warning);
    expect(stateColors.act).toBe(colors.error);
    expect(stateColors.neutral).toBe(colors.textMuted);
  });

  test('warning is the Okabe-Ito yellow retune, not the old amber-axis hue', () => {
    expect(colors.warning).toBe('#F0E442');
    expect(stateColors.watch).toBe('#F0E442');
  });

  test('volumeStatusColor resolves through the grammar (one system, no drift)', () => {
    expect(volumeStatusColor('optimal')).toBe(stateColors.onTrack);
    expect(volumeStatusColor('minimum')).toBe(stateColors.watch);
    expect(volumeStatusColor('near_mrv')).toBe(stateColors.watch);
    expect(volumeStatusColor('over_mrv')).toBe(stateColors.act);
    expect(volumeStatusColor('below')).toBe(stateColors.neutral);
  });

  test('CVD swap propagates to onTrack and act; watch stays Okabe-Ito yellow in both palettes', () => {
    const watchBefore = stateColors.watch;
    const onTrackBefore = stateColors.onTrack;
    applyAccessibility({ colorBlindSafe: true });
    expect(stateColors.onTrack).toBe(colors.success); // tracks the swapped token
    expect(stateColors.onTrack).not.toBe(onTrackBefore);
    expect(stateColors.act).toBe(colors.error);
    expect(stateColors.watch).toBe(watchBefore); // yellow kept across palettes
  });
});

describe('buildVolumeStatusColor (CP-10 stage 3, theming FINAL batch, 2026-07-10)', () => {
  // WorkoutSummaryScreen.js's live-theme variant of volumeStatusColor above:
  // fed by a resolved `t.colors` (from useTheme()) instead of the frozen
  // module singleton, so it stays in step with a screen's own theme
  // generation. Must resolve to the SAME grammar as the legacy singleton for
  // any given colour table -- one system, no drift, just two read paths.
  test('resolves the same status -> tone mapping as the legacy singleton, for the current (dark) palette', () => {
    const resolve = buildVolumeStatusColor(colors);
    for (const status of ['unknown', 'below', 'minimum', 'optimal', 'near_mrv', 'over_mrv', 'nonsense', undefined]) {
      expect(resolve(status)).toBe(volumeStatusColor(status));
    }
  });

  test('reads off the PASSED-IN colour table, not the frozen singleton -- tracks a live theme flip', () => {
    const darkColors = resolveTheme({ theme: 'dark' }).colors;
    const lightColors = resolveTheme({ theme: 'light' }).colors;
    const resolveDark = buildVolumeStatusColor(darkColors);
    const resolveLight = buildVolumeStatusColor(lightColors);
    expect(resolveDark('optimal')).toBe(darkColors.success);
    expect(resolveLight('optimal')).toBe(lightColors.success);
    // The two tables can differ (light/dark surface family), so the two
    // resolvers must not be silently sharing one frozen answer.
    if (darkColors.success !== lightColors.success) {
      expect(resolveDark('optimal')).not.toBe(resolveLight('optimal'));
    }
  });

  test('follows the colour-blind-safe palette swap fed through its OWN colour table (not the frozen one)', () => {
    const normal = resolveTheme({ theme: 'dark', colorBlindSafe: false }).colors;
    const cvd = resolveTheme({ theme: 'dark', colorBlindSafe: true }).colors;
    const before = buildVolumeStatusColor(normal)('optimal');
    const after = buildVolumeStatusColor(cvd)('optimal');
    expect(after).toBe(cvd.success);
    expect(after).not.toBe(before);
  });

  test('falls back to the muted token for an unrecognised status, same as the legacy singleton', () => {
    const resolve = buildVolumeStatusColor(colors);
    expect(resolve('nonsense')).toBe(colors.textMuted);
    expect(resolve(undefined)).toBe(colors.textMuted);
  });
});
