const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

describe('CoachOutputScreen apply profile merges', () => {
  test('profile writes merge into the latest store snapshot, not the render snapshot', () => {
    expect(SCREEN).toMatch(/const latestProfile = \(\) => useAppStore\.getState\(\)\.userProfile \|\| userProfile \|\| \{\};/);
    expect(SCREEN).not.toMatch(/\.\.\.\(userProfile \|\| \{\}\)/);
    // Steps law (restored at Review A, F8): no step-target write may
    // reappear in the apply path. The cardio removal (21252dbe) trimmed
    // this pin alongside the cardio one; only the cardio pin was in scope.
    expect(SCREEN).not.toMatch(/stepsTarget: target/);
    expect(SCREEN).toMatch(/bodyProfile\?\.sex \?\? latestProfile\(\)\?\.sex \?\? null/);
    expect(SCREEN).toMatch(/saveLocalProfile\(user\.id, \{\s*\n\s*\.\.\.latestProfile\(\),\s*\n\s*macroCycle:/);
    expect(SCREEN).toMatch(/saveLocalProfile\(user\.id, \{\s*\n\s*\.\.\.latestProfile\(\),\s*\n\s*refeed:/);
  });
});
