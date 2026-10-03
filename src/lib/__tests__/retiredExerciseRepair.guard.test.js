/**
 * D217 wiring guards: the retired-id map is applied at every entry point and
 * the launch repair runs every launch, after the survivors are seeded.
 */
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');

function fnBody(src, decl) {
  const start = src.indexOf(decl);
  if (start === -1) throw new Error(`not found: ${decl}`);
  const rest = src.slice(start + decl.length);
  const next = rest.search(/\nexport (async )?function /);
  return next === -1 ? src.slice(start) : src.slice(start, start + decl.length + next);
}

describe('seedExercises.runExerciseSeedChain', () => {
  const SRC = read('seedExercises.js');
  test('runs the repair every launch, after the top-up and before the routine seed is released', () => {
    const chain = SRC.slice(SRC.indexOf('export function runExerciseSeedChain('));
    const topUp = chain.indexOf('await topUpNewExercisesIfNeeded();');
    const repair = chain.indexOf('await repairRetiredExerciseReferences();');
    const release = chain.indexOf('markRows();');
    expect(topUp).toBeGreaterThan(-1);
    expect(repair).toBeGreaterThan(topUp);
    expect(release).toBeGreaterThan(repair);
    // Not behind the top-up's version flag: the repair is its own call.
    expect(chain.slice(topUp, repair)).not.toMatch(/LIBRARY_VERSION_KEY/);
  });
});

describe('database.js entry points', () => {
  const SRC = read('database.js');
  test('both pull writers resolve the survivor id before the name heal, and the heal tries the survivor name', () => {
    for (const decl of ['export async function insertRoutineExerciseFromCloud(', 'export async function insertWorkoutSetFromCloud(']) {
      const body = fnBody(SRC, decl);
      const resolve = body.search(/let exerciseId = survivorExerciseId\((re|s)\.exercise_id\);/);
      const heal = body.indexOf("WHERE LOWER(name) = LOWER(?) OR LOWER(name) = LOWER(?)");
      expect(resolve).toBeGreaterThan(-1);
      expect(heal).toBeGreaterThan(resolve);
      expect(body).toMatch(/survivorExerciseName\(exerciseName\)/);
    }
  });
  test('a pulled set with no name is named after the exercise it resolves to', () => {
    const body = fnBody(SRC, 'export async function insertWorkoutSetFromCloud(');
    expect(body).toMatch(/if \(!exerciseName && exerciseId\) \{[\s\S]*?SELECT name FROM exercises WHERE id = \?/);
  });
  test('createWorkoutSet resolves the id before anything else reads it', () => {
    const body = fnBody(SRC, 'export async function createWorkoutSet(');
    expect(body).toMatch(/const data = input\?\.exerciseId \? \{ \.\.\.input, exerciseId: survivorExerciseId\(input\.exerciseId\) \} : input;/);
  });
  test('getExerciseById answers a retired id with the survivor, and falls back to the retired row', () => {
    const body = fnBody(SRC, 'export async function getExerciseById(');
    expect(body).toMatch(/const survivor = survivorExerciseId\(id\);/);
    expect(body).toMatch(/if \(!row && survivor !== id\)/);
  });
  test('mergeExerciseIdInto and the repair stamp the synced rows they re-point', () => {
    const merge = fnBody(SRC, 'export async function mergeExerciseIdInto(');
    expect(merge).toMatch(/UPDATE routine_exercises SET exercise_id = \?, updated_at = \? WHERE exercise_id = \?/);
    expect(merge).toMatch(/UPDATE workout_sets SET exercise_id = \?, updated_at = \? WHERE exercise_id = \?/);
    const repair = fnBody(SRC, 'export async function repairRetiredExerciseReferences(');
    expect(repair).toMatch(/UPDATE routine_exercises SET exercise_id = \?, updated_at = \? WHERE exercise_id = \?/);
    expect(repair).toMatch(/UPDATE workout_sets SET exercise_id = \?, updated_at = \? WHERE exercise_id = \?/);
    expect(repair).toMatch(/remapExerciseIdInIntentTables\(d, from, survivorOf\.get\(from\)\)/);
    expect(repair).toMatch(/catch \(e\) \{\s*logError\('database\.repairRetiredExerciseReferences'/);
  });
});
