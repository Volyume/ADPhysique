const fs = require('fs');
const path = require('path');

const coachOutput = fs.readFileSync(path.join(__dirname, '..', 'CoachOutputScreen.js'), 'utf8');
const heldHistory = fs.readFileSync(path.join(__dirname, '..', 'CoachHeldHistoryScreen.js'), 'utf8');
const coachReport = fs.readFileSync(path.join(__dirname, '..', '..', 'lib', 'coachReport.js'), 'utf8');

describe('Coach shipped product copy', () => {
  test('does not expose step-target coaching rows in visible coach surfaces', () => {
    expect(coachOutput).not.toMatch(/footsteps-outline/);
    expect(coachOutput).not.toMatch(/onApplySteps/);
    expect(coachOutput).not.toMatch(/stepsLabel/);
    expect(heldHistory).not.toMatch(/Daily steps raised/);
    expect(coachReport).not.toMatch(/<td>Daily steps<\/td>/);
  });
});
