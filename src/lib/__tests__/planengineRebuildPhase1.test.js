/**
 * Phase 1 benchmark (rebuild spec): volume integrity.
 * Across 9 divisions x {beginner, intermediate, advanced} at 4 days, no program
 * may produce a structural/judged muscle at 0, any muscle over MRV, or any
 * sub-3-set entry. Also writes the measured results doc.
 */
import {
  DIVISIONS, EXPERIENCE_LEVELS, gen, measure,
} from './planengineBench';

const cells = [];
for (const [goal, label] of DIVISIONS) {
  for (const exp of EXPERIENCE_LEVELS) {
    cells.push({ goal, label, exp, m: measure(gen(goal, { days: 4, experience: exp })) });
  }
}

describe('Phase 1 benchmark: volume integrity (27 programs, 4 days)', () => {
  test.each(cells)('$label / $exp: no structural-or-judged muscle at zero', ({ m }) => {
    expect(m.zeros).toEqual([]);
  });
  test.each(cells)('$label / $exp: no muscle over MRV', ({ m }) => {
    expect(m.overMRV).toEqual([]);
  });
  test.each(cells)('$label / $exp: no sub-3-set entry', ({ m }) => {
    expect(m.fragments).toEqual([]);
  });
});
