import fs from 'fs';
import path from 'path';

const SOURCE = fs.readFileSync(path.join(__dirname, '..', 'WorkoutSummaryScreen.js'), 'utf8');

describe('WorkoutSummaryScreen feedback controls', () => {
  test('uses stable rating values and wrap-safe rows after workout completion', () => {
    expect(SOURCE).toContain("const values = field === 'jointDiscomfort'");
    expect(SOURCE).toContain('? [0, 1, 2, 3]');
    expect(SOURCE).toContain(': Array.from({ length: max }, (_, i) => i + 1);');
    expect(SOURCE).toMatch(/ratingBtns: \{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing\.xs \}/);
  });
});
