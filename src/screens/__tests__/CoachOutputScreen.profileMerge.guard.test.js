const fs = require('fs');
const path = require('path');

const SCREEN = fs.readFileSync(path.resolve(__dirname, '../CoachOutputScreen.js'), 'utf8');

/**
 * What this suite pins, and why.
 *
 * The apply path used to write two fields onto the LOCAL PROFILE - the carb
 * cycle (userProfile.macroCycle) and the scheduled refeed (userProfile.refeed)
 * - and the hazard was that a write built from the RENDER snapshot of the
 * profile would silently drop any field changed since the render. The pin was
 * "merge into the latest store snapshot".
 *
 * Under the one-daily-truth law (Campaign 17A) both of those writes are gone,
 * and with them the only local-profile write this screen ever made. So the pin
 * is now the stronger one: the coach output screen writes NO profile field at
 * all, which is why the merge hazard cannot recur. If a profile write is ever
 * added back, this suite fails and the merge discipline has to be argued
 * again on purpose.
 */
describe('CoachOutputScreen apply profile writes', () => {
  test('ONE DAILY TRUTH: no carb-cycle or refeed field is written to the profile', () => {
    expect(SCREEN).not.toMatch(/macroCycle:/);
    expect(SCREEN).not.toMatch(/refeed:/);
  });

  test('the screen makes no local-profile write at all, so there is no stale-merge hazard', () => {
    expect(SCREEN).not.toMatch(/saveLocalProfile\(/);
    expect(SCREEN).not.toMatch(/\.\.\.\(userProfile \|\| \{\}\)/);
  });

  test('Steps law (Review A, F8): no step-target write may reappear in the apply path', () => {
    expect(SCREEN).not.toMatch(/stepsTarget: target/);
  });

  test('sex still resolves body profile first, profile second, for the floor reads', () => {
    expect(SCREEN).toMatch(/bodyProfile\?\.sex \?\? userProfile\?\.sex \?\? null/);
  });
});
