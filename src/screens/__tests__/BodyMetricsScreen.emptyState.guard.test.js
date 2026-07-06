import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'BodyMetricsScreen.js'), 'utf8');

describe('BodyMetricsScreen empty-state design guard', () => {
  test('uses the shared EmptyState for the no-history branch', () => {
    expect(source).toMatch(/import EmptyState from '\.\.\/components\/EmptyState';/);
    expect(source).toMatch(
      /<EmptyState[\s\S]*icon="body-outline"[\s\S]*title="No body metrics yet"[\s\S]*formatBodyWeightShort\(onboardingWeightKg, bodyWeightUnits\)[\s\S]*Log body weight or measurements when you want this trend to start\./,
    );
    expect(source).not.toMatch(/Your progress starts here/);
    expect(source).not.toMatch(/<EmptyBodyIllustration/);
    expect(source).not.toMatch(/styles\.emptyCard/);
  });
});
