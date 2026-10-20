/**
 * Pins proposal 10 F1: the two setup forms ("Update goal and phase",
 * "Adjust training plan") re-seed from the saved profile only when it changed,
 * say so in one line, and stay quiet after their own save. Without the reload a
 * form left open on one tab writes its old values back over the other tab's save.
 * Source-level guards plus the pure signature.
 */
import fs from 'fs';
import path from 'path';
import { setupFormSignature, SETUP_CHANGED_NOTICE } from '../setupFormSeed';

const read = (f) => fs.readFileSync(path.join(__dirname, '..', '..', 'screens', f), 'utf8');

describe('setupFormSignature', () => {
  test('same setup gives the same signature, a changed field changes it', () => {
    const a = { daysPerWeek: 4, equipment: 'full_gym', name: 'x' };
    expect(setupFormSignature(a)).toBe(setupFormSignature({ ...a, name: 'y' }));
    expect(setupFormSignature(a)).not.toBe(setupFormSignature({ ...a, daysPerWeek: 5 }));
    expect(setupFormSignature(null)).toBe(setupFormSignature({}));
  });
  test('weight never triggers a reseed', () => {
    expect(setupFormSignature({ weightKg: 60 })).toBe(setupFormSignature({ weightKg: 82 }));
  });
});

describe('setup screens source guards', () => {
  const goal = read('ProGoalSetupScreen.js');
  const train = read('PlanUpdateScreen.js');
  test('the notice says exactly what the owner approved', () => {
    expect(SETUP_CHANGED_NOTICE).toBe('Your setup was changed on another screen. This shows the latest.');
  });
  test.each([['ProGoalSetupScreen', goal], ['PlanUpdateScreen', train]])('%s reloads on focus and shows the notice', (_n, src) => {
    expect(src).toMatch(/useFocusEffect\(useCallback/);
    expect(src).toMatch(/setupFormSignature\(userProfile\)/);
    expect(src).toMatch(/setSetupReloaded\(true\)/);
    expect(src).toMatch(/\{SETUP_CHANGED_NOTICE\}/);
  });
  test.each([['ProGoalSetupScreen', goal], ['PlanUpdateScreen', train]])('%s does not announce its own save as a change from elsewhere', (_n, src) => {
    expect(src).toMatch(/seededSigRef\.current = setupFormSignature\(updatedProfile\)/);
  });
});
