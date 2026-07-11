import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('BodyMetricsScreen empty-state design guard', () => {
  test('uses the shared EmptyState for the no-history branch', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="body-outline"[\s\S]*title="No body metrics yet"[\s\S]*formatBodyWeightShort\(onboardingWeightKg, bodyWeightUnits\)[\s\S]*Log body weight or measurements when you want this trend to start\./,
    );
    expect(source).not.toMatch(/Your progress starts here/);
    expect(source).not.toMatch(/<EmptyBodyIllustration/);
    expect(source).not.toMatch(/styles\.emptyCard/);
  });

  test('read-only and recomposition CTAs are contained controls, not loose amber text', () => {
    // CP-10 batch G lane 1: readOnlyCtaButton gained its live-theme override
    // and both icons' ink now resolves from the live theme; the contained-
    // neutral-chrome contract is unchanged.
    expect(source).toContain('style={[styles.readOnlyCtaButton, live.readOnlyCtaButton]}');
    expect(source).toContain('<Ionicons name="lock-open-outline" size={16} color={t.colors.textSecondary} />');
    expect(source).toContain('<Ionicons name="image-outline" size={16} color={t.colors.textSecondary} />');
    expect(source).toMatch(/readOnlyCtaButton: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(source).toMatch(/recompCtaRow: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(source).toContain('readOnlyCta: { ...type.label, color: colors.textPrimary }');
    expect(source).toContain('recompCta: { ...type.label, color: colors.textPrimary }');
    expect(source).not.toMatch(/readOnlyCta: \{ fontSize: fontSize\.sm,[\s\S]*color: colors\.primary/);
    expect(source).not.toMatch(/recompCta: \{ fontSize: fontSize\.sm,[\s\S]*color: colors\.primary/);
  });
});
