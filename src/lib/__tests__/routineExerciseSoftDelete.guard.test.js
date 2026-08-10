// Routine-exercise deletion must be a syncing SOFT delete, not a hard DELETE
// (founder-reported on the first iOS build, 2026-07-19: deleting an exercise
// from a routine did not stick — it reappeared after the next pullFromCloud,
// because the hard delete left the cloud row alive with no tombstone).
//
// The fix is the app's standard soft-delete-with-tombstone shape, needing no
// cloud migration (routine_exercises.deleted_at exists in both schemas):
//   1. removeExerciseFromRoutine sets deleted_at + schedules a sync;
//   2. the sync push map sends deleted_at so the cloud row is tombstoned;
//   3. reads already filter deleted_at IS NULL, the pull already honours a
//      cloud deleted_at, and the push source already includes deleted rows.
// This suite pins (1) and (2) so a future edit cannot regress to a hard,
// non-syncing delete.
import fs from 'fs';
import path from 'path';

const DATABASE = fs.readFileSync(path.join(__dirname, '..', 'database.js'), 'utf8');
const SYNC = fs.readFileSync(path.join(__dirname, '..', 'sync.js'), 'utf8');

describe('routine-exercise deletion is a syncing soft delete', () => {
  test('removeExerciseFromRoutine soft-deletes (deleted_at) and schedules a sync, not a hard DELETE', () => {
    const fn = DATABASE.match(/export async function removeExerciseFromRoutine[\s\S]*?\n\}/)?.[0] ?? '';
    expect(fn).toContain('UPDATE routine_exercises SET deleted_at = ?');
    expect(fn).toContain('_scheduleSync()');
    expect(fn).not.toContain('DELETE FROM routine_exercises');
  });

  test('the read path still excludes tombstoned routine_exercises', () => {
    const read = DATABASE.match(/export async function getRoutineExercisesWithDetails[\s\S]*?\n\}/)?.[0] ?? '';
    expect(read).toContain('deleted_at IS NULL');
  });

  test('the push source includes deleted rows so tombstones can propagate', () => {
    const src = DATABASE.match(/export async function getAllRoutineExercisesForUser[\s\S]*?\n\}/)?.[0] ?? '';
    // Joins via routines with NO deleted_at filter on routine_exercises.
    expect(src).toContain('FROM routine_exercises re');
    expect(src).not.toMatch(/re\.deleted_at IS NULL/);
  });

  test('the sync push map sends deleted_at for routine_exercises', () => {
    expect(SYNC).toContain('deleted_at: re.deletedAt ? new Date(re.deletedAt).toISOString() : null,');
  });

  test('the pull honours a cloud deleted_at when inserting locally', () => {
    const ins = DATABASE.match(/export async function insertRoutineExerciseFromCloud[\s\S]*?\n\}/)?.[0] ?? '';
    expect(ins).toContain('re.deleted_at ? new Date(re.deleted_at).getTime() : null');
  });

  // Campaign 1 P0-8 D3 added a second write branch to that applier (the
  // last-write-wins UPDATE that reconciles an existing local row instead
  // of clobbering it). A tombstone arriving for a row this device already
  // holds takes that branch, so it has to carry deleted_at too or a
  // delete made on another device would never stick here.
  test('the last-write-wins UPDATE branch also applies the cloud deleted_at', () => {
    const ins = DATABASE.match(/export async function insertRoutineExerciseFromCloud[\s\S]*?\n\}/)?.[0] ?? '';
    const update = ins.match(/UPDATE routine_exercises SET[\s\S]*?WHERE id = \?/)?.[0] ?? '';
    expect(update).toContain('deleted_at = ?');
  });
});
