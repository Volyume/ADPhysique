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
    // C2 (2026-07-11): the handlers gained a funnel-telemetry tick before
    // handleOAuth; the pinned rule is unchanged - account creation still
    // routes exclusively through OAuthButtons/handleOAuth with the shared
    // disabled state.
    expect(source).toMatch(
      /<OAuthButtons[\s\S]*onApple=\{\(\) => \{ trackCta\('create_account', \{ provider: 'apple' \}\); handleOAuth\('apple'\); \}\}[\s\S]*onGoogle=\{\(\) => \{ trackCta\('create_account', \{ provider: 'google' \}\); handleOAuth\('google'\); \}\}[\s\S]*disabled=\{busy\}[\s\S]*\/>/,
    );
  });

  test('does not carry a bespoke social button stack', () => {
    expect(source).not.toMatch(/styles\.oauth(?:Block|Btn|BtnText|BtnApple|BtnAppleText|Divider)/);
    expect(source).not.toMatch(/accessibilityLabel="Continue with (?:Google|Apple)"/);
  });
});
