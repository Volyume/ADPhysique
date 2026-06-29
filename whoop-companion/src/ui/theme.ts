/**
 * Crossover theme: VOLYUME's dark surfaces, spacing and typography (docs/rules/
 * styling.md) + WHOOP's data colour language (recovery green/yellow/red, strain
 * blue, sleep teal). VOLYUME amber stays as the interactive accent.
 */

export const colors = {
  // VOLYUME surfaces
  bg: '#0D0D0D',
  card: '#1A1A1A',
  surface: '#262626',
  border: '#2D2D2D',
  inputBorder: '#374151',

  // Text
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',

  // VOLYUME accent (interactive)
  amber: '#F59E0B',
  amberDark: '#D97706',

  // WHOOP data language
  recoveryGreen: '#16C47F',
  recoveryYellow: '#FFB020',
  recoveryRed: '#FF4D4D',
  strainBlue: '#2BB3FF',
  sleepTeal: '#4FD1C5',

  // Functional
  success: '#10B981',
  danger: '#EF4444',
};

export const spacing = {
  screen: 16,
  card: 16,
  section: 24,
  item: 12,
  xs: 4,
  sm: 8,
};

export const radius = {
  card: 12,
  button: 10,
  pill: 999,
};

export const type = {
  screenTitle: { fontSize: 24, fontWeight: '700' as const, color: colors.text },
  sectionHeader: { fontSize: 18, fontWeight: '600' as const, color: colors.text },
  cardTitle: { fontSize: 16, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, fontWeight: '400' as const, color: colors.text },
  label: { fontSize: 12, fontWeight: '400' as const, color: colors.textSecondary },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
};

/** WHOOP recovery banding: >=67 green, 34-66 yellow, <=33 red. */
export function recoveryColor(score: number | null | undefined): string {
  if (score == null) return colors.textTertiary;
  if (score >= 67) return colors.recoveryGreen;
  if (score >= 34) return colors.recoveryYellow;
  return colors.recoveryRed;
}
