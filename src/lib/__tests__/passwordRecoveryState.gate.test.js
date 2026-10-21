/**
 * Pins when the set-new-password screen may open: signed in, onboarded and
 * past the Article 9 gate (unchanged), and not during an active workout.
 * Also pins that RootNavigator routes through this predicate.
 */
const fs = require('fs');
const path = require('path');
const { canOpenPasswordRecovery } = require('../passwordRecoveryState');

const ready = { user: { id: 'u' }, firstRunComplete: true, healthConsent: true, workoutActive: false };

test('opens when signed in, onboarded, consented and idle', () => {
  expect(canOpenPasswordRecovery(ready)).toBe(true);
});
test('waits while a workout is active', () => {
  expect(canOpenPasswordRecovery({ ...ready, workoutActive: true })).toBe(false);
});
test.each([
  [{ user: null }],
  [{ user: { id: 'u', isLocal: true } }],
  [{ firstRunComplete: false }],
  [{ healthConsent: false }],
  [{ healthConsent: null }],
])('consent and onboarding conditions still hold %j', (patch) => {
  expect(canOpenPasswordRecovery({ ...ready, ...patch })).toBe(false);
});
test('RootNavigator uses the predicate with the active-workout state', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../../navigation/RootNavigator.js'), 'utf8');
  expect(src).toMatch(/canOpenPasswordRecovery\(\{[^}]*workoutActive/);
  expect(src).toMatch(/workoutActive = useAppStore\(s => !!s\.activeWorkout\)/);
});
