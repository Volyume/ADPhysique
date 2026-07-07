const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

describe('CoachOutputScreen apply profile merges', () => {
  test('profile writes merge into the latest store snapshot, not the render snapshot', () => {
    expect(SCREEN).toMatch(/const latestProfile = \(\) => useAppStore\.getState\(\)\.userProfile \|\| userProfile \|\| \{\};/);
    expect(SCREEN).not.toMatch(/\.\.\.\(userProfile \|\| \{\}\)/);
    expect(SCREEN).not.toMatch(/stepsTarget: target/);
    expect(SCREEN).toMatch(/saveLocalProfile\(user\.id, \{\s*\n\s*\.\.\.latestProfile\(\),\s*\n\s*cardioPrescription: prescription,/);
    expect(SCREEN).toMatch(/bodyProfile\?\.sex \?\? latestProfile\(\)\?\.sex \?\? null/);
    expect(SCREEN).toMatch(/saveLocalProfile\(user\.id, \{\s*\n\s*\.\.\.latestProfile\(\),\s*\n\s*macroCycle:/);
    expect(SCREEN).toMatch(/saveLocalProfile\(user\.id, \{\s*\n\s*\.\.\.latestProfile\(\),\s*\n\s*refeed:/);
  });
});
