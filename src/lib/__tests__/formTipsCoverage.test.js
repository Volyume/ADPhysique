/**
 * Form-tip coverage: EVERY exercise in the library must have a coaching note,
 * or the active-workout sheet falls back to "No coaching notes yet for this
 * exercise" (founder, 2026-06-20). This reads the source files directly so a
 * newly added exercise without a tip fails the build until one is written.
 */
const fs = require('fs');
const path = require('path');

// Re-anchored EL-14/EL-17 (exercise-library-expansion-2026-09-05): the
// library is the corpus module, and every live row carries a cue, so the
// contract is "a hand-written tip OR a non-empty cue" for every row.
function libraryExerciseNames() {
  // eslint-disable-next-line global-require
  const { CORPUS } = require('../exerciseCorpus');
  return CORPUS.filter((e) => !e.retiredInto).map((e) => e.name);
}

function corpusCueNames() {
  // eslint-disable-next-line global-require
  const { CORPUS } = require('../exerciseCorpus');
  return new Set(CORPUS.filter((e) => !e.retiredInto && typeof e.cue === 'string' && e.cue.trim()).map((e) => e.name));
}

function formTipKeys() {
  const tips = fs.readFileSync(path.join(__dirname, '../formTips.js'), 'utf8');
  // keys are single-quoted, may contain escaped apostrophes (\')
  const keys = [...tips.matchAll(/^\s*'((?:[^'\\]|\\.)*)':/gm)].map((m) => m[1].replace(/\\'/g, "'"));
  return new Set(keys);
}

test('every library exercise has a form tip', () => {
  const names = libraryExerciseNames();
  const keys = formTipKeys();
  expect(names.length).toBeGreaterThan(400); // sanity: the library actually parsed
  const cued = corpusCueNames();
  const missing = names.filter((n) => !keys.has(n) && !cued.has(n));
  expect(missing).toEqual([]);
});
