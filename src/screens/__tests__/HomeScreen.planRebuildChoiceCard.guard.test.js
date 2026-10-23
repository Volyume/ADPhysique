/**
 * HomeScreen.planRebuildChoiceCard.guard.test.js -- D228 item 5: the Today
 * card's "Update your plan" tap (D231: now the Today line's plan update occupant).
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

// RE-POINTED (D231, app layout rework batch 1): the "Your plan can be updated"
// card is now an occupant of the Today line. The pinned rule is unchanged: the
// tap goes to the Plans tab PlanUpdate screen through navigateCrossTab, never a
// bare navigate, and "Not now" is the same stored dismissal.
test('the Today line occupant jumps to the Plans tab PlanUpdate screen through navigateCrossTab', () => {
  expect(HOME).toMatch(/planChoice: \{[\s\S]*?onPress: \(\) => \{ haptics\.selection\(\); navigateCrossTab\(navigation, 'PlansTab', 'PlanUpdate'\); \},/);
  expect(HOME).not.toMatch(/navigation\.navigate\('PlanUpdate'\)/);
  expect(HOME).not.toMatch(/<PlanRebuildChoiceCard/);
});

test('"Not now" writes the same stored dismissal the card did, for the plan the choice was read for', () => {
  expect(HOME).toMatch(/onDismiss: dismissPlanChoice,/);
  const at = HOME.indexOf('function dismissPlanChoice()');
  expect(at).toBeGreaterThan(-1);
  const body = HOME.slice(at, HOME.indexOf('\n  }\n', at));
  expect(body).toMatch(/dismissPlanRebuildChoice\(user\?\.id, programmeId\)/);
  expect(body).toMatch(/setPlanChoiceProgrammeId\(null\)/);
});

test('PlanUpdate is a Plans stack screen, which is why the jump is cross-tab', () => {
  const plansStack = NAV.slice(NAV.indexOf('function PlansStack'), NAV.indexOf('function ProfileStack'));
  expect(plansStack).toContain('name="PlanUpdate"');
});
