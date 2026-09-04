/**
 * D141 item 4 (2026-09-04): deleting a saved workout never fails silently.
 *
 * The handler had no try/catch at all (its sibling "Delete folder" did), so
 * a thrown softDeleteRoutine became an unhandled rejection and the workout
 * simply failed to disappear with nothing said. Source guard, matching how
 * this screen's other founder-locked handlers are pinned.
 */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.resolve(__dirname, '..', 'PlansScreen.js'), 'utf8');

test('the saved-workout delete logs and tells the user on failure, in calm copy', () => {
  const at = src.indexOf("'Delete saved workout?'");
  expect(at).toBeGreaterThan(-1);
  const body = src.slice(at, at + 1200);
  expect(body).toMatch(/try \{\s*await softDeleteRoutine\(routine\.id\);\s*await loadData\(\);\s*\} catch \(e\) \{/);
  expect(body).toMatch(/logError\('PlansScreen\.handleDeleteRoutine', e, \{ userId: user\?\.id, routineId: routine\?\.id \}\)/);
  expect(body).toMatch(/Couldn't delete that workout, try again/);
  expect(body).not.toMatch(/toast\.show\(e\?\.message/);
});
