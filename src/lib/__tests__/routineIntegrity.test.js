/**
 * Routine integrity guard (phase 7 step 7). Every exercise a library routine
 * references must resolve, either to a seeded exercise (seedExercises RAW) or
 * to the REQUIRED_EXERCISES auto-create net in seedRoutines. Otherwise the
 * routine silently drops that exercise at seed time (the audit's gap, e.g.
 * the "Abductor Machine" typo). This test fails the moment a new routine
 * references a name nothing provides, so the drift can't return.
 */
const fs = require('fs');
const path = require('path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('library routines reference only resolvable exercises', () => {
  const seedSrc = read('seedExercises.js');
  const routinesSrc = read('seedRoutines.js');

  // Seeded canonical exercise names: first string of each RAW tuple.
  const rawNames = new Set(
    [...seedSrc.matchAll(/^\s*\[\s*'([^']+)',/gm)].map(m => m[1]),
  );

  // REQUIRED_EXERCISES auto-create net: name: '...' inside that block.
  const reqStart = routinesSrc.indexOf('const REQUIRED_EXERCISES');
  const reqEnd = routinesSrc.indexOf('\n];', reqStart);
  const requiredNames = new Set(
    [...routinesSrc.slice(reqStart, reqEnd).matchAll(/name:\s*'([^']+)'/g)].map(m => m[1]),
  );

  // Exercise references inside routines: `{ name: '...', sets: ... }`.
  const referenced = [
    ...new Set(
      [...routinesSrc.matchAll(/\{\s*name:\s*'([^']+)',\s*sets:/g)].map(m => m[1]),
    ),
  ];

  test('there is a healthy number of routine exercise references to check', () => {
    expect(referenced.length).toBeGreaterThan(50);
  });

  test('every referenced exercise resolves to RAW or REQUIRED_EXERCISES', () => {
    const broken = referenced.filter(n => !rawNames.has(n) && !requiredNames.has(n));
    expect(broken).toEqual([]);
  });

  test('the Abductor Machine typo is fixed (canonical Abduction Machine exists)', () => {
    expect(routinesSrc).not.toContain("name: 'Abductor Machine'");
    expect(rawNames.has('Abduction Machine')).toBe(true);
  });
});
