/**
 * Exercise-library-expansion-2026-09-05 (EL-18, 05-DECISIONS.md EL-18):
 * pins the custom-exercise delete affordance at the SOURCE level (same
 * fs.readFileSync + regex style as ExercisePickerModal's source guards -
 * a full render of this screen needs a much heavier mock surface than the
 * delete-specific behaviour warrants, and the destructive database
 * behaviour itself - soft delete, not a hard DELETE - has direct
 * coverage in database.deleteExercise.test.js).
 */
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'ExerciseDetailScreen.js'), 'utf8');

describe('ExerciseDetailScreen — EL-18 custom exercise delete', () => {
  test('imports deleteExercise and getRoutinesReferencingExercise from database.js', () => {
    expect(source).toMatch(/deleteExercise, getRoutinesReferencingExercise/);
  });

  test('the delete Button is reachable ONLY for a custom exercise, never a canonical row', () => {
    expect(source).toMatch(/\{exercise\?\.isCustom \? \(/);
    expect(source).toMatch(/title="Delete exercise"/);
    expect(source).toMatch(/variant="destructive"/);
  });

  test('the handler bails out if the exercise is somehow not custom (defence in depth)', () => {
    expect(source).toMatch(/async function handleDeleteExercise\(\) \{\s*\n\s*if \(!exercise\?\.isCustom\) return;/);
  });

  test('confirms through AppAlert with Cancel and a destructive Delete before deleting anything', () => {
    expect(source).toMatch(/appAlert\(\s*\n\s*`Delete \$\{exercise\.name\}\?`,/);
    expect(source).toMatch(/\{ text: 'Cancel', style: 'cancel' \}/);
    expect(source).toMatch(/text: 'Delete',\s*\n\s*style: 'destructive',/);
  });

  test('checks routine usage first and discloses it in the confirm copy, rather than silently blocking or stripping the routine', () => {
    expect(source).toMatch(/getRoutinesReferencingExercise\(user\.id, exercise\.id\)\.catch\(\(\) => \[\]\)/);
    expect(source).toMatch(/you will not be able to add it to a routine again/);
  });

  test('history is explicitly named as unaffected, matching the soft-delete/snapshot design', () => {
    expect(source).toMatch(/Your past workout history is not affected/);
  });

  test('a successful delete shows a confirmation toast and navigates back', () => {
    expect(source).toMatch(/toast\.show\(`\$\{exercise\.name\} deleted`, \{ variant: 'success' \}\)/);
    expect(source).toMatch(/navigation\.goBack\(\)/);
  });

  test('a failed delete logs the error and shows a calm error toast, never a crash', () => {
    expect(source).toMatch(/logError\('ExerciseDetailScreen\.deleteExercise', e, \{ exerciseId: exercise\.id \}\)/);
    expect(source).toMatch(/Couldn't delete that exercise\. Try again\./);
  });
});
