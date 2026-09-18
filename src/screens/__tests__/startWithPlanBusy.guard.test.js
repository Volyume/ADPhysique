/**
 * D141 item 3 - "Start with a plan" must show it is working. Both
 * HomeScreen.handleStartWithPlanPress and PlansScreen.handleStartWithPlanPress
 * run prepareStartWithPlan (a DB-backed capability preflight plus a full
 * engine dry run) but, before this, the EmptyState button gave no busy or
 * disabled visual and no accessibility announcement while that ran.
 *
 * Source guard (same convention as HomeScreen.noPlanPreview.guard.test.js:
 * neither screen has a light render harness for this branch). Pins:
 *  - a `preparingPlan` state exists on both screens;
 *  - it is set true at the top of handleStartWithPlanPress and reset to
 *    false in a `finally`, alongside the existing `startWithPlanRef` guard
 *    (which stays -- it prevents double entry across renders, something a
 *    state flag alone cannot do inside one synchronous tap);
 *  - it is passed to the EmptyState as `busy`, so the visual/accessibility
 *    treatment lives once in EmptyState/Button rather than being redrawn
 *    per screen.
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');
const PLANS = fs.readFileSync(path.join(__dirname, '..', 'PlansScreen.js'), 'utf8');

function checkScreen(name, source) {
  test(`${name} declares a preparingPlan state`, () => {
    expect(source).toMatch(/const \[preparingPlan, setPreparingPlan\] = useState\(false\);/);
  });

  test(`${name} sets preparingPlan true before awaiting prepareStartWithPlan and resets it in finally`, () => {
    const start = source.indexOf('async function handleStartWithPlanPress()');
    expect(start).toBeGreaterThan(-1);
    // Bound the function body at the next top-level function declaration.
    const end = source.indexOf('\n  async function handleConfirmStartWithPlan()', start);
    expect(end).toBeGreaterThan(start);
    const body = source.slice(start, end);

    expect(body).toMatch(/if \(startWithPlanRef\.current\) return;\s*\n\s*startWithPlanRef\.current = true;\s*\n\s*setPreparingPlan\(true\);/);
    expect(body).toMatch(/finally \{\s*\n\s*startWithPlanRef\.current = false;\s*\n\s*setPreparingPlan\(false\);\s*\n\s*\}/);
  });

  test(`${name} passes preparingPlan to the no-plan EmptyState as busy`, () => {
    expect(source).toMatch(/onAction=\{handleStartWithPlanPress\}[\s\S]{0,200}busy=\{preparingPlan\}/);
  });
}

describe('HomeScreen "Start with a plan" shows it is working', () => {
  checkScreen('HomeScreen', HOME);
});

describe('PlansScreen "Start with a plan" shows it is working', () => {
  checkScreen('PlansScreen', PLANS);
});

describe('the secondary action stays enabled while preparingPlan is true', () => {
  test('neither screen guards "Browse plans" onSecondary behind preparingPlan (ruling: keep it enabled)', () => {
    // The onSecondary handlers must not reference preparingPlan at all --
    // guarding them would disable the one exit a stuck preview attempt has.
    const homeSecondary = HOME.match(/onSecondary=\{[^}]*\}/);
    const plansSecondary = PLANS.match(/onSecondary=\{[^}]*\}/);
    expect(homeSecondary).not.toBeNull();
    expect(plansSecondary).not.toBeNull();
    expect(homeSecondary[0]).not.toMatch(/preparingPlan/);
    expect(plansSecondary[0]).not.toMatch(/preparingPlan/);
  });
});
