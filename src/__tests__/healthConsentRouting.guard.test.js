/**
 * A2-014 regression guard. The sign-in health-consent check has two
 * transient-failure paths: a cloud read that returns { error } and a thrown
 * exception (outer catch). The error branch correctly resolved to null
 * (unresolved), but the catch resolved to false. renderNavigator only routes
 * to the (un-skippable) Article 9 consent stack when healthConsent === false,
 * so the catch could bounce an already-consented user back into the gate just
 * because a read threw or the network blipped.
 *
 * Both transient paths must resolve to null. The only legitimate
 * setHealthConsent(false) is the explicit user-withdrawal in SettingsScreen,
 * a different file. RootNavigator is not importable under this jest config
 * (no native-module mocks), so this is a scoped source guard in the same
 * style as the App.js sync/auth guards.
 */

const fs = require('fs');
const path = require('path');

const NAV = fs.readFileSync(
  path.resolve(__dirname, '../navigation/RootNavigator.js'),
  'utf8',
);

// Scope to the consent block: from the "Article 9 health-data consent check"
// comment to the bulkUploadLocalData push that follows it.
const blockStart = NAV.indexOf('Article 9 health-data consent check');
const blockEnd = NAV.indexOf('Push any local-only edits', blockStart);
const consentBlock = NAV.slice(blockStart, blockEnd);

describe('A2-014 sign-in consent check resolves transient failures to null', () => {
  test('the consent block is located', () => {
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
  });

  test('no transient path hard-codes setHealthConsent(false)', () => {
    // false would re-fire the Article 9 gate for a consented user. The only
    // valid false is the explicit withdrawal in SettingsScreen.
    expect(consentBlock).not.toMatch(/setHealthConsent\(\s*false/);
  });

  test('both the error branch and the catch resolve to null', () => {
    const nullResolutions = consentBlock.match(/setHealthConsent\(\s*null\s*,/g) || [];
    expect(nullResolutions.length).toBeGreaterThanOrEqual(2);
  });

  test('an explicit cloud value still resolves through the granted path', () => {
    // The successful-read branch must keep deciding from the cloud value,
    // not be flattened to null. Guards against an over-correction.
    expect(consentBlock).toMatch(/setHealthConsent\(\s*granted\s*,/);
  });
});
