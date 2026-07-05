/**
 * Source guard: ProUpgrade must use the shared OAuthButtons surface so the
 * upgrade path follows the same platform/auth rules as Login and Pro onboarding.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ProUpgradeScreen.js'), 'utf8');

describe('ProUpgrade shared OAuth surface', () => {
  test('wires account creation through OAuthButtons', () => {
    expect(source).toMatch(/import OAuthButtons from '\.\.\/components\/auth\/OAuthButtons';/);
    expect(source).toMatch(
      /<OAuthButtons[\s\S]*onApple=\{\(\) => handleOAuth\('apple'\)\}[\s\S]*onGoogle=\{\(\) => handleOAuth\('google'\)\}[\s\S]*disabled=\{busy\}[\s\S]*\/>/,
    );
  });

  test('does not carry a bespoke social button stack', () => {
    expect(source).not.toMatch(/styles\.oauth(?:Block|Btn|BtnText|BtnApple|BtnAppleText|Divider)/);
    expect(source).not.toMatch(/accessibilityLabel="Continue with (?:Google|Apple)"/);
  });
});
