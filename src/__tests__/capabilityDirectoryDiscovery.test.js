/**
 * Training considerations discovery pins (gap-closure Phase D).
 *
 * Pins, against SOURCE (the founder-law style for structural rules):
 *  1. GC-D1 statelessness: the discovery screen never imports a write
 *     path, a consent lane, telemetry, or storage - selecting a profile
 *     can only navigate. Nothing persists from viewing.
 *  2. CAP-19: the route is registered unguarded (free tier), beside
 *     HowYouTrain.
 *  3. The preselect contract: the screen passes a preselect param;
 *     HowYouTrain consumes it once (clears the param), resolves exercise
 *     names against the library, and still walks the user through role,
 *     dates, consent and readback (no stage is skipped past 'role').
 *  4. The OTHER path renders its route note so no search dead-ends into
 *     a medical-looking wall.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const screen = read('../screens/TrainingConsiderationsScreen.js');
const hyt = read('../screens/HowYouTrainScreen.js');
const nav = read('../navigation/RootNavigator.js');

describe('GC-D1: the discovery surface is stateless', () => {
  test('no write, consent, telemetry or storage imports', () => {
    expect(screen).not.toMatch(/createConstraints|writeConstraintRows|capabilityConsent|engineTelemetry|AsyncStorage|database'/);
    expect(screen).not.toMatch(/from '\.\.\/lib\/capability\/store'/);
  });
  test('profile taps only navigate into the existing add flow', () => {
    expect(screen).toMatch(/navigation\.navigate\('HowYouTrain', preselect \? \{ preselect \} : undefined\)/);
  });
});

describe('CAP-19: free-tier registration', () => {
  test('route registered unguarded beside HowYouTrain', () => {
    expect(nav).toMatch(/Stack\.Screen name="TrainingConsiderations" component=\{TrainingConsiderationsScreen\}/);
    expect(nav).not.toMatch(/withProGuard\(TrainingConsiderationsScreen\)/);
  });
});

describe('preselect contract', () => {
  test('HowYouTrain consumes the param exactly once and keeps every confirmation stage', () => {
    expect(hyt).toMatch(/route\.params\?\.preselect/);
    expect(hyt).toMatch(/navigation\.setParams\(\{ preselect: undefined \}\)/);
    // The preselected draft still starts at the role stage - durability,
    // dates, consent and readback are never skipped.
    expect(hyt).toMatch(/setDraft\(\{\s*role: null,\s*kind: preselect\.kind \?\? null/);
    const effect = hyt.slice(hyt.indexOf('const preselect = route.params?.preselect'));
    expect(effect.slice(0, 1200)).toMatch(/setAdding\('role'\)/);
  });
  test('exercise-name preselects wait for the library so names resolve', () => {
    expect(hyt).toMatch(/preselect\.kind === 'exercise' && !library\.length/);
  });
});

describe('the OTHER path never dead-ends', () => {
  test('screen renders the route note for the OTHER row', () => {
    expect(screen).toMatch(/routeNote/);
  });
});
