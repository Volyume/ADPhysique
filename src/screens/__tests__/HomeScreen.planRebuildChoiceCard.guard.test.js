/**
 * HomeScreen.planRebuildChoiceCard.guard.test.js -- D228 item 5: the Today
 * card's "Update your plan" tap.
 *
 * PlanUpdate is registered only in the Plans stack (RootNavigator), so a bare
 * navigation.navigate('PlanUpdate') from Today is dropped silently (the F4
 * dead-tap class). The tap must go through navigateCrossTab. Source guard
 * (HomeScreen is too large to mount here).
 */
const fs = require('fs');
const path = require('path');

const HOME = fs.readFileSync(path.join(__dirname, '..', 'HomeScreen.js'), 'utf8');
const NAV = fs.readFileSync(path.join(__dirname, '..', '..', 'navigation', 'RootNavigator.js'), 'utf8');

test('the card onUpdate jumps to the Plans tab PlanUpdate screen through navigateCrossTab', () => {
  expect(HOME).toMatch(/<PlanRebuildChoiceCard[\s\S]*?onUpdate=\{\(\) => \{ haptics\.selection\(\); navigateCrossTab\(navigation, 'PlansTab', 'PlanUpdate'\); \}\}/);
  expect(HOME).not.toMatch(/navigation\.navigate\('PlanUpdate'\)/);
});

test('PlanUpdate is a Plans stack screen, which is why the jump is cross-tab', () => {
  const plansStack = NAV.slice(NAV.indexOf('function PlansStack'), NAV.indexOf('function ProgressStack'));
  expect(plansStack).toContain('name="PlanUpdate"');
});
