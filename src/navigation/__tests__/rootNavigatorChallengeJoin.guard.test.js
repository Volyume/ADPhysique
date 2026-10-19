/**
 * Pins where the gym challenge join screen sits (gym challenge SPEC section 2
 * steps 5 and 6): strictly AFTER the Article 9 consent gate, never before.
 *
 * - renderNavigator returns Article9ConsentStack before it can return
 *   ProOnboardingStack, so a pending code cannot put the join screen ahead of
 *   the gate.
 * - ChallengeJoin is NOT registered in Article9ConsentStack or WelcomeStack.
 * - ProOnboardingStack opens on ChallengeJoin only when a code is pending,
 *   otherwise on StartChoice.
 * - The onboarded-user effect is gated on healthConsent === true.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'RootNavigator.js'), 'utf8');

function fnBody(name) {
  const at = src.indexOf(`function ${name}(`);
  expect(at).toBeGreaterThan(-1);
  const next = src.indexOf('\nfunction ', at + 10);
  return src.slice(at, next > -1 ? next : undefined);
}

test('the consent gate returns before the onboarding stack that can show the join screen', () => {
  const render = src.slice(src.indexOf('function renderNavigator()'));
  const gate = render.indexOf('return <Article9ConsentStack />');
  const onboarding = render.indexOf('return <ProOnboardingStack />');
  expect(gate).toBeGreaterThan(-1);
  expect(onboarding).toBeGreaterThan(gate);
});

test('the join screen is not registered in the consent or welcome stacks', () => {
  expect(fnBody('Article9ConsentStack')).not.toMatch(/ChallengeJoin/);
  expect(fnBody('WelcomeStack')).not.toMatch(/ChallengeJoin/);
});

test('the onboarding stack opens on the join screen only when a code is pending', () => {
  const body = fnBody('ProOnboardingStack');
  expect(body).toMatch(/initialRouteName=\{challengePending \? 'ChallengeJoin' : 'StartChoice'\}/);
  expect(body).toMatch(/name="ChallengeJoin"/);
  expect(body).toMatch(/useContext\(ChallengePendingContext\)/);
  expect(src).toMatch(/<ChallengePendingContext\.Provider value=\{challengePending\}>/);
});

test('the onboarded-user navigation is gated on granted health consent', () => {
  expect(src).toMatch(/const challengeReady = [^;]*healthConsent === true;/);
  expect(src).toMatch(/if \(!challengeReady \|\| !challengePending\) return;/);
});
