/**
 * Contract guard for the custom-exercise cloud restore.
 *
 * The whole app resolves an exercise by id against the local `exercises`
 * table (getAllExercises, routine/workout joins, getExerciseById) and creates
 * custom exercises there with is_custom=1. The local `custom_exercises` table
 * is an orphaned mirror nothing reads for display or resolution. So the cloud
 * restore MUST land custom exercises in `exercises` (is_custom=1), not the
 * orphaned table, or they vanish from the UI after a reinstall / device swap.
 *
 * This grep-guard locks _pullCustomExercises onto the correct path.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.resolve(__dirname, '../sync.js'), 'utf8');

function pullCustomBody() {
  const start = SRC.indexOf('async function _pullCustomExercises');
  expect(start).toBeGreaterThan(-1);
  // up to the next top-level `async function` after it
  const rest = SRC.slice(start + 1);
  const next = rest.indexOf('\nasync function ');
  return next === -1 ? SRC.slice(start) : SRC.slice(start, start + 1 + next);
}

describe('custom-exercise cloud restore lands in the exercises table', () => {
  test('_pullCustomExercises restores via insertOrUpdateExerciseFromCloud with is_custom', () => {
    const body = pullCustomBody();
    expect(body).toMatch(/insertOrUpdateExerciseFromCloud\(\s*\{\s*\.\.\.row,\s*is_custom:\s*1\s*\}/);
  });

  test('it does NOT restore into the orphaned local custom_exercises mirror', () => {
    const body = pullCustomBody();
    expect(body).not.toMatch(/insertOrUpdateCustomExerciseFromCloud/);
  });

  test('it skips soft-deleted custom exercises so they do not reappear', () => {
    const body = pullCustomBody();
    expect(body).toMatch(/row\?\.deleted_at\)\s*continue/);
  });
});
