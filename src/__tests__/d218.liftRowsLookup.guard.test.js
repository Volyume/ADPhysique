/**
 * D218 (founder order 2026-10-03), adversarial review item 4: every screen
 * that builds lift rows from logged sets (buildLiftProgressRows) reads the
 * shared, unfiltered exercise lookup (database.getExerciseLookup), never the
 * filtered library (getAllExercises, which leaves out a soft-deleted custom
 * exercise). Lift Progress was moved in the D218 landing; the athlete profile
 * and the body metrics strength line still read the filtered list, so one lift
 * on a since-deleted custom exercise was named, typed and loaded one way on
 * Lift Progress and another on those two screens. The lookup's own behaviour
 * is pinned against the real database in src/lib/__tests__/
 * d218.reportingReaders.test.js; this guard pins that each caller uses it.
 */
import fs from 'fs';
import path from 'path';

const read = (name) => fs.readFileSync(path.join(__dirname, '..', 'screens', name), 'utf8');

describe.each([
  ['LiftProgressScreen.js'],
  ['AthleteProfileScreen.js'],
  ['BodyMetricsScreen.js'],
])('%s: lift rows read the shared exercise lookup', (file) => {
  const src = read(file);

  test('reads getExerciseLookup and never the filtered library', () => {
    expect(src).toMatch(/getExerciseLookup\(\)/);
    expect(src).not.toMatch(/getAllExercises\(/);
  });
});
