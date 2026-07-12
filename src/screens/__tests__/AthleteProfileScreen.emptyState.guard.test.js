/**
 * Source guard: Athlete Profile's strength-baseline no-data state should use
 * the shared EmptyState component rather than local empty-card typography.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');

describe('AthleteProfileScreen shared empty state', () => {
  test('uses EmptyState for the strength baselines no-data state', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="barbell-outline"[\s\S]*title="Add lifts for strength standards"[\s\S]*text="Log body weight and your main lifts to compare against baseline standards\."[\s\S]*compact/,
    );
    expect(source).not.toMatch(/styles\.empty(?:Card|Title|Text)/);
  });

  test('profile load failures show a retry state instead of silent empty data', () => {
    expect(source).toMatch(/const \[loadError, setLoadError\] = useState\(false\);/);
    expect(source).toMatch(/Promise\.allSettled\(/);
    expect(source).toMatch(/Couldn't refresh profile data/);
    expect(source).toMatch(/Tap to try again/);
    expect(source).toMatch(/setReloadKey\(\(n\) => n \+ 1\)/);
  });

  // P-16 (Codex end-user-polish audit): a missing native module (no
  // ImagePicker, or the pre-first-sync moment before user?.id resolves) used
  // to read as "this app build is incomplete", which is alarming and wrong --
  // it's a device/build-time capability gap, not a broken install.
  test('missing image-picker copy reads as a device limitation, not an incomplete build', () => {
    expect(source).toMatch(/Profile pictures aren't available on your device\./);
    expect(source).not.toMatch(/Profile pictures aren't available in this version/);
  });
});
