/**
 * Source guard: Article 9 and Nutrition Targets should share the consent
 * checkbox primitive. These screens own the legal/body-data copy and state;
 * the component owns checkbox presentation and accessibility.
 */
const fs = require('fs');
const path = require('path');

const article9 = fs.readFileSync(path.join(__dirname, '..', 'Article9ConsentScreen.js'), 'utf8');
const nutritionTargets = fs.readFileSync(path.join(__dirname, '..', 'NutritionTargetsScreen.js'), 'utf8');

describe('shared consent checkbox rows', () => {
  test('Article 9 uses the shared consent row for explicit health-data consent', () => {
    expect(article9).toMatch(/import ConsentCheckboxRow from '\.\.\/components\/ConsentCheckboxRow';/);
    expect(article9).toMatch(
      /<ConsentCheckboxRow[\s\S]*checked=\{agreed\}[\s\S]*onPress=\{\(\) => setAgreed\(v => !v\)\}[\s\S]*variant="card"[\s\S]*size="md"/,
    );
    expect(article9).not.toMatch(/styles\.checkbox|styles\.checkboxChecked|accessibilityRole="checkbox"/);
  });

  test('Article 9 secondary actions are contained rows, not underlined text links', () => {
    expect(article9).toMatch(/<Ionicons name="document-text-outline" size=\{16\} color=\{colors\.textSecondary\} \/>/);
    expect(article9).toMatch(/<Ionicons name="help-circle-outline" size=\{16\} color=\{colors\.textSecondary\} \/>/);
    expect(article9).toMatch(/ctaGhost: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface/);
    expect(article9).toMatch(/declineLink: \{[\s\S]*minHeight: 44,[\s\S]*borderColor: colors\.border,[\s\S]*backgroundColor: colors\.surface/);
    expect(article9).toMatch(/declineAction: \{[\s\S]*minHeight: 44,[\s\S]*backgroundColor: colors\.surface2/);
    expect(article9).not.toMatch(/ctaGhostText: \{[\s\S]*textDecorationLine: 'underline'/);
    expect(article9).not.toMatch(/declineLinkText: \{[\s\S]*textDecorationLine: 'underline'/);
  });

  test('Nutrition Targets uses the shared row in both body-data consent placements', () => {
    expect(nutritionTargets).toMatch(/import ConsentCheckboxRow from '\.\.\/components\/ConsentCheckboxRow';/);
    const uses = nutritionTargets.match(/<ConsentCheckboxRow[\s\S]*?accessibilityLabel="I consent to storing this data on my device"[\s\S]*?\/>/g) || [];
    expect(uses).toHaveLength(2);
    expect(nutritionTargets).not.toMatch(/styles\.checkbox|styles\.checkboxChecked|styles\.consentRow|styles\.consentCheckLabel/);
  });
});
