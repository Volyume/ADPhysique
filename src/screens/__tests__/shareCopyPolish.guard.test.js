import fs from 'fs';
import path from 'path';

const read = (name) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

describe('share copy polish', () => {
  test('share CTAs say what happens instead of using card jargon', () => {
    const analytics = read('AnalyticsScreen.js');
    const bodyMetrics = read('BodyMetricsScreen.js');
    const yearOfLifts = read('YearOfLiftsScreen.js');
    const subscriptionPolicy = read('SubscriptionPolicyScreen.js');
    const workoutSummary = read('WorkoutSummaryScreen.js');
    const combined = `${analytics}\n${bodyMetrics}\n${yearOfLifts}\n${subscriptionPolicy}\n${workoutSummary}`;

    expect(combined).toContain('Create share image');
    expect(combined).toContain('accessibilityLabel="Share session"');
    expect(combined).toContain('shareable review of your training year');
    expect(combined).toContain('accessibilityLabel="Previous slide"');
    expect(combined).toContain('accessibilityLabel="Next slide"');
    expect(combined).not.toContain('accessibilityLabel="Make a card"');
    expect(combined).not.toContain('>Make a card<');
    expect(combined).not.toContain('your training year in one card');
    expect(combined).not.toContain('accessibilityLabel="Previous card"');
    expect(combined).not.toContain('accessibilityLabel="Next card"');
    expect(combined).not.toContain('Share session card');
  });

  test('Analytics share CTAs are contained controls, not loose amber text links', () => {
    const analytics = read('AnalyticsScreen.js');
    expect(analytics.match(/style=\{styles\.milestoneCtaButton\}/g)?.length).toBeGreaterThanOrEqual(4);
    expect(analytics).toContain('style={[styles.trainingLoadCtaRow, styles.milestoneCtaButton]}');
    expect(analytics).toMatch(/milestoneCtaButton: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(analytics).toContain('milestoneCta: { ...type.label, color: colors.textPrimary }');
    expect(analytics).not.toMatch(/milestoneCta: \{ fontSize: fontSize\.sm,[\s\S]*color: colors\.primary/);
  });

  test('Analytics recent sessions link uses contained neutral chrome', () => {
    const analytics = read('AnalyticsScreen.js');
    expect(analytics).toContain('style={styles.seeAllButton}');
    expect(analytics).toContain('Ionicons name="list-outline" size={14} color={colors.textSecondary}');
    expect(analytics).toMatch(/seeAllButton: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(analytics).toContain('seeAll:      { ...type.label, color: colors.textPrimary }');
    expect(analytics).not.toContain('seeAll:      { ...type.label, color: colors.primary }');
  });

  test('entry and purchase trust links use contained neutral chrome', () => {
    const welcome = read('WelcomeScreen.js');
    const upgrade = read('ProUpgradeScreen.js');
    const credits = read('CreditsScreen.js');
    const paywall = read('PaywallScreen.js');

    expect(welcome).toMatch(/signInLink: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(welcome).toContain('signInAction: { ...type.label, color: colors.textPrimary }');
    expect(welcome).not.toContain('signInAction: { ...type.label, color: colors.primary }');

    expect(upgrade).toContain('title="Skip for now"');
    expect(upgrade).toContain('variant="outline"');
    expect(upgrade).toMatch(/policyLink: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(upgrade).toContain('policyLinkText: { ...type.caption, color: colors.textSecondary }');
    expect(upgrade).not.toContain('secondaryLinkText');
    expect(upgrade).not.toContain("textDecorationLine: 'underline'");

    // CP-10 batch D, 2026-07-10: CreditsScreen is live-themed, so the three
    // trust links now carry the style-array form [styles.linkButton,
    // live.linkButton]. Same pin (three contained links), new shape.
    expect(credits.match(/style=\{\[styles\.linkButton, live\.linkButton\]\}/g)?.length).toBe(3);
    expect(credits).toMatch(/linkButton: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(credits).toContain('link: {\n    ...type.label,\n    color: colors.textPrimary,');
    expect(credits).not.toMatch(/link: \{[\s\S]*color: colors\.primary/);

    expect(paywall.match(/style=\{styles\.legalButton\}/g)?.length).toBeGreaterThanOrEqual(2);
    expect(paywall).toContain('style={[styles.legalButton, busy && styles.legalButtonDisabled]}');
    expect(paywall).toMatch(/legalButton: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(paywall).not.toContain("textDecorationLine: 'underline'");
    expect(paywall).not.toContain('legalDot');
  });
});
