/**
 * Form-tip coverage: EVERY exercise in the library must have a coaching note,
 * or the active-workout sheet falls back to "No coaching notes yet for this
 * exercise" (founder, 2026-06-20). This reads the source files directly so a
 * newly added exercise without a tip fails the build until one is written.
 */
const fs = require('fs');
const path = require('path');

function libraryExerciseNames() {
  const raw = fs.readFileSync(path.join(__dirname, '../seedExercises.js'), 'utf8');
  const block = raw.slice(raw.indexOf('const RAW'));
  const names = [...block.matchAll(/^\s*\['([^']+)'/gm)].map((m) => m[1]);
  return [...new Set(names)];
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
  const missing = names.filter((n) => !keys.has(n));
  expect(missing).toEqual([]);
});
