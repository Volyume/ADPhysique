/**
 * Source guard: Athlete Profile's strength-baseline no-data state should use
 * the shared EmptyState component rather than local empty-card typography.
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'AthleteProfileScreen.js'), 'utf8');

describe('AthleteProfileScreen shared empty state', () => {
  test('uses EmptyState for the strength baselines no-data state', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="barbell-outline"[\s\S]*title="Strength standards unlock with data"[\s\S]*text="Log body weight and your core compound lifts to compare estimated strength against baseline tiers\."[\s\S]*compact/,
    );
    expect(source).not.toMatch(/styles\.empty(?:Card|Title|Text)/);
  });
});
