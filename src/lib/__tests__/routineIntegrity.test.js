/**
 * Routine integrity guard (phase 7 step 7). Every exercise a library routine
 * references must resolve to a seeded (live) corpus exercise. Otherwise the
 * routine silently drops that exercise at seed time (seedRoutines.js's
 * `byName[def.name]` lookup only ever contains inserted, i.e. live, rows -
 * see the audit's gap, e.g. the "Abductor Machine" typo). This test fails
 * the moment a new routine references a name nothing provides, so the drift
 * can't return.
 *
 * Re-anchored EL-14/EL-15/EL-21 (exercise-library-expansion-2026-09-05): RAW
 * and REQUIRED_EXERCISES are both gone - every exercise, including the old
 * REQUIRED_EXERCISES rows, is now an ordinary CORPUS entry
 * (src/lib/exerciseCorpus/), so "resolvable" is just "a live CORPUS name".
 * A name that resolves only via RETIRED_ENTRIES (a retired stub) is NOT
 * treated as resolvable here: seedRoutines.js never remaps a retired name to
 * its survivor at seed time, so a routine still holding one would silently
 * drop that row exactly like the original bug this suite guards against.
 */
const fs = require('fs');
const path = require('path');
const { CORPUS, RETIRED_ENTRIES } = require('../exerciseCorpus');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

describe('library routines reference only resolvable exercises', () => {
  const routinesSrc = read('seedRoutines.js');

  // Live, seedable corpus names - exactly what seedRoutines.js's byName
  // lookup will find (built from getAllExercises(), which only ever
  // contains inserted CORPUS rows).
  const rawNames = new Set(CORPUS.map(e => e.name));
  const retiredNames = new Set(RETIRED_ENTRIES.map(e => e.name));

  // Exercise references inside routines: `{ name: '...', sets: ... }`.
  const referenced = [
    ...new Set(
      [...routinesSrc.matchAll(/\{\s*name:\s*'([^']+)',\s*sets:/g)].map(m => m[1]),
    ),
  ];

  test('there is a healthy number of routine exercise references to check', () => {
    expect(referenced.length).toBeGreaterThan(50);
  });

  test('every referenced exercise resolves to a live corpus entry', () => {
    const broken = referenced.filter(n => !rawNames.has(n));
    expect(broken).toEqual([]);
  });

  test('no routine references a retired name (it would silently drop at seed time)', () => {
    const retiredRefs = referenced.filter(n => retiredNames.has(n));
    expect(retiredRefs).toEqual([]);
  });

  test('the Abductor Machine typo is fixed (canonical Abduction Machine exists)', () => {
    expect(routinesSrc).not.toContain("name: 'Abductor Machine'");
    expect(rawNames.has('Abduction Machine')).toBe(true);
  });
});
