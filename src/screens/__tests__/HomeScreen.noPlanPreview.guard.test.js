/**
 * D139 - "Start with a plan" on Today shows what it would build before it
 * builds it. It used to generate, activate and archive on one tap, with the
 * first thing the user saw being a plan that already existed.
 *
 * Source guard (HomeScreen has no light render harness for this branch; same
 * convention as HomeScreen.planGenErrorCopy.guard.test.js, whose pinned
 * failure copy this must not disturb).
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');

describe('HomeScreen no-plan empty state previews before it commits', () => {
  test('the action prepares a preview and opens the shared sheet', () => {
    expect(HOME).toMatch(/import \{ prepareStartWithPlan, commitStartWithPlan \} from '\.\.\/lib\/startWithPlan'/);
    expect(HOME).toMatch(/onAction=\{handleStartWithPlanPress\}/);
    expect(HOME).toMatch(/prepareStartWithPlan\(user\.id, userProfile, \{ mode: 'first' \}\)/);
    expect(HOME).toMatch(/setPlanPreview\(\{ preview: prep\.preview, otherPlansCount: prep\.otherPlansCount \}\)/);
    expect(HOME).toMatch(/confirmLabel="Start this plan"/);
  });

  test('nothing is generated until the sheet is confirmed', () => {
    const prepareIdx = HOME.indexOf('async function handleStartWithPlanPress()');
    const commitIdx = HOME.indexOf('async function handleConfirmStartWithPlan()');
    expect(prepareIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(prepareIdx);
    // The preview step may not reach the committing generator.
    const prepareBody = HOME.slice(prepareIdx, commitIdx);
    expect(prepareBody).not.toMatch(/commitStartWithPlan|generateAndSavePlan/);
  });

  test('the double-tap guard is kept on the prepare step', () => {
    expect(HOME).toMatch(/if \(startWithPlanRef\.current\) return;\s*\n\s*startWithPlanRef\.current = true;/);
    expect(HOME).toMatch(/startWithPlanRef\.current = false;/);
  });

  test('the empty state offers the library as a real second action', () => {
    expect(HOME).toMatch(/secondaryLabel="Browse plans"/);
    expect(HOME).toMatch(/navigateCrossTab\(navigation, 'PlansTab', 'PlanLibrary'\)/);
  });
});
