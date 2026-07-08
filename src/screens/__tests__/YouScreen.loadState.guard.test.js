const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'YouScreen.js'), 'utf8');

describe('YouScreen coach hub load state', () => {
  test('coach hub load failures are visible and retryable', () => {
    expect(source).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
    expect(source).toMatch(/Promise\.allSettled\(/);
    expect(source).toMatch(/Couldn't refresh Coach/);
    expect(source).toMatch(/Tap to try again/);
    expect(source).toMatch(/setReloadKey\(\(n\) => n \+ 1\)/);
    expect(source).not.toMatch(/setSessions\(null\);[\s\S]*setLatestReview\(null\);[\s\S]*setHasCoachHistory\(false\);/);
  });

  test('coach hub does not present baseline output as a latest decision', () => {
    expect(source).toMatch(/function isCompletedCoachDecision\(output, checkin\)/);
    expect(source).toMatch(/output\.hasEnoughData === false/);
    expect(source).toMatch(/Number\(checkin\?\.weekStart\) === Number\(output\.weekStart\)/);
    expect(source).toMatch(/checkin\?\.energyScore != null/);
    expect(source).toMatch(/const latestDecision = isCompletedCoachDecision\(latest, checkin\) \? latest : null;/);
    expect(source).toContain('Weekly coach update');
    expect(source).not.toContain('Latest coaching decision');
  });

  test('coach hub groups actions by user intent instead of internal labels', () => {
    expect(source).toContain('subtitle="Weekly coaching from your logs."');
    expect(source).toMatch(/<SectionLabel>This week<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Setup<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Support<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Safety checks<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Coach actions<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Safety<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Settings<\/SectionLabel>/);
  });
});

// Audit item 3 (Coach-tab root reorder, size M, 2026-07-08): the Coach
// tab's root (YouScreen) must lead with coach content, not account chrome.
// Settings moves to a header gear (a secondary entry point, never removed),
// and the coach status card renders before the athlete-profile card so the
// latest decision/next check-in outrank profile freshness, which outranks
// setup/support/safety, which outrank nothing (Settings is header-only now).
describe('Audit item 3: Coach-tab root leads with coach content, not settings', () => {
  test('Settings moves to a header gear, not a first-class row', () => {
    // The old flat "App settings" section/NavRow is gone...
    expect(source).not.toMatch(/<SectionLabel>App settings<\/SectionLabel>/);
    expect(source).not.toMatch(/label="Settings"\s*\n\s*sub="Account, units, notifications, data, billing and privacy\."/);
    // ...replaced by a header-right gear that still reaches the same route.
    expect(source).toMatch(/accessibilityLabel="Settings"/);
    expect(source).toMatch(/name="settings-outline"/);
    expect(source).toMatch(/onPress={\(\) => navigation\.navigate\('Settings'\)}/);
  });

  test('the coach status card renders before the athlete-profile card', () => {
    const statusIdx = source.indexOf('styles.statusCard');
    const profileIdx = source.indexOf('styles.profileCard');
    expect(statusIdx).toBeGreaterThan(-1);
    expect(profileIdx).toBeGreaterThan(-1);
    expect(statusIdx).toBeLessThan(profileIdx);
  });

  test('the profile card renders before Setup/Support/Safety, which render before nothing settings-shaped', () => {
    const profileIdx = source.indexOf('styles.profileCard');
    const setupIdx = source.indexOf('<SectionLabel>Setup</SectionLabel>');
    const appSettingsIdx = source.indexOf('App settings');
    expect(profileIdx).toBeGreaterThan(-1);
    expect(setupIdx).toBeGreaterThan(-1);
    expect(profileIdx).toBeLessThan(setupIdx);
    expect(appSettingsIdx).toBe(-1);
  });
});
