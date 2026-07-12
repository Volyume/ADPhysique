/**
 * EP-19/UI-08/P-07 (Codex end-user-polish audit): the "Start with a plan"
 * recovery button's failure toast printed the raw engine result after a
 * colon ("Couldn't start plan: ${result.error}"), which can surface internal
 * engine reason codes straight to the user. The cause is now logged via the
 * existing logError, and the toast shows only stable, calm copy with no
 * interpolated engine detail.
 *
 * Source guard: HomeScreen has no colocated render-test harness light enough
 * to drive this specific no-active-plan Pro recovery button in isolation
 * (the screen's existing test coverage lives in behavioural suites for other
 * concerns), so this pins the exact fixed source instead.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(
  path.join(__dirname, '..', 'HomeScreen.js'),
  'utf8',
);

describe('HomeScreen plan-generation failure toast never shows raw engine detail', () => {
  test('the toast no longer interpolates result.error', () => {
    expect(src).not.toMatch(/toast\.show\(`Couldn't start plan: \$\{result\.error\}`/);
  });

  test('the failure is logged and the toast shows calm, stable copy', () => {
    expect(src).toMatch(
      /logError\('HomeScreen\.startWithPlan', new Error\(result\.error \?\? 'plan_generation_failed'\), \{ userId: user\?\.id \}\);\s*\n\s*toast\.show\("Couldn't start your plan, try again", \{ variant: 'error', duration: 5000 \}\);/,
    );
  });
});
