/**
 * Locks the share-card palette to the app's design tokens (src/styles/theme.js).
 *
 * The renderer is import-free (the Node harness evaluates it directly), so it
 * mirrors the theme colours rather than importing them. This test fails if either
 * side drifts — there is ONE visual language, not a separate set of styles for
 * the share cards.
 */
import { PALETTE } from '../drawShareCard';
import { colors } from '../../../styles/theme';

describe('share-card palette mirrors theme.js (single design language)', () => {
  test('every card colour resolves to its app token', () => {
    expect(PALETTE.bg).toBe(colors.background);
    expect(PALETTE.surface).toBe(colors.surface);
    expect(PALETTE.surfaceElevated).toBe(colors.surfaceElevated);
    expect(PALETTE.surface2).toBe(colors.surface2);
    expect(PALETTE.border).toBe(colors.border);
    expect(PALETTE.borderSubtle).toBe(colors.borderSubtle);
    expect(PALETTE.accent).toBe(colors.primary);
    expect(PALETTE.gold).toBe(colors.gold);
    expect(PALETTE.text).toBe(colors.textPrimary);
    expect(PALETTE.textSecondary).toBe(colors.textSecondary);
    expect(PALETTE.textMuted).toBe(colors.textMuted);
  });

  test('no gradient/bgN keys linger (styling.md: no gradients)', () => {
    expect(PALETTE.bg0).toBeUndefined();
    expect(PALETTE.bg1).toBeUndefined();
    expect(PALETTE.divider).toBeUndefined();
  });
});
