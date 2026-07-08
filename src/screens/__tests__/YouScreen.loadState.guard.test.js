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
  });

  test('coach hub groups actions by user intent instead of internal labels', () => {
    expect(source).toContain('subtitle="Weekly coaching from your logs."');
    expect(source).toMatch(/<SectionLabel>This week<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Setup<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Support<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>Safety checks<\/SectionLabel>/);
    expect(source).toMatch(/<SectionLabel>App settings<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Coach actions<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Safety<\/SectionLabel>/);
    expect(source).not.toMatch(/<SectionLabel>Settings<\/SectionLabel>/);
  });
});
