const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'YouScreen.js'), 'utf8');

describe('YouScreen coach hub load state', () => {
  test('coach hub load failures are visible and retryable', () => {
    expect(source).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
    expect(source).toMatch(/Promise\.allSettled\(/);
    expect(source).toMatch(/Couldn&apos;t refresh Coach/);
    expect(source).toMatch(/Tap to try again/);
    expect(source).toMatch(/setReloadKey\(\(n\) => n \+ 1\)/);
    expect(source).not.toMatch(/setSessions\(null\);[\s\S]*setLatestReview\(null\);[\s\S]*setHasCoachHistory\(false\);/);
  });
});
