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
    // R9 (D70), 2026-07-11: the hand-rolled milestoneCtaButton TouchableOpacity
    // + text pair was replaced by the shared Button primitive (variant=
    // "outline"), so the old style-pair pin no longer matches. The pin's
    // INTENT survives unchanged: every "Create share image" CTA is still a
    // contained, bordered control with neutral textPrimary ink, never a loose
    // amber text link -- Button.js's own outline variant IS that contract
    // (buildVariants: outline = { bg: c.surface, fg: c.textPrimary, border:
    // c.border }), just resolved by the primitive instead of a screen-local
    // StyleSheet pair. Re-anchored to the Button call sites; the deleted
    // milestoneCtaButton/milestoneCta StyleSheet keys must stay gone.
    const ctaMatches = analytics.match(/<Button\s+variant="outline"[\s\S]{0,220}?title="Create share image"/g);
    expect(ctaMatches?.length).toBeGreaterThanOrEqual(5);
    expect(analytics).toContain('style={styles.trainingLoadCtaRow}');
    expect(analytics).not.toMatch(/milestoneCtaButton:\s*\{/);
    expect(analytics).not.toMatch(/milestoneCta:\s*\{/);
  });

  test('Analytics recent sessions link uses contained neutral chrome', () => {
    const analytics = read('AnalyticsScreen.js');
    // R9 (D70), 2026-07-11: seeAllButton -> shared Button primitive (variant=
    // "outline"); the icon now renders through Button's own `icon` prop
    // (tinted to the variant's ink, textPrimary), rather than a standalone
    // Ionicons at textSecondary. The pin's intent -- a contained, neutral,
    // non-amber control -- is unchanged and is guaranteed by Button.js's own
    // outline variant contract; re-anchored to the Button call site, and the
    // deleted seeAllButton/seeAll StyleSheet keys must stay gone.
    expect(analytics).toMatch(/<Button\s+variant="outline"[\s\S]{0,220}?icon="list-outline"[\s\S]{0,220}?title="All sessions"/);
    expect(analytics).not.toMatch(/seeAllButton:\s*\{/);
    expect(analytics).not.toMatch(/seeAll:\s*\{/);
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

    // CP-10 batch G lane 1: legalButton gained its live-theme override
    // (style={[styles.legalButton, live.legalButton, ...]}); the contract --
    // at least three legal links render through the contained legalButton
    // chrome -- is unchanged, so the pattern accepts the live-array spelling.
    expect(paywall.match(/style=\{\[styles\.legalButton, live\.legalButton/g)?.length).toBeGreaterThanOrEqual(3);
    expect(paywall).toContain('style={[styles.legalButton, live.legalButton, busy && styles.legalButtonDisabled]}');
    expect(paywall).toMatch(/legalButton: \{[\s\S]*minHeight: 40,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface2/);
    expect(paywall).not.toContain("textDecorationLine: 'underline'");
    expect(paywall).not.toContain('legalDot');
  });
});
