/**
 * CC33 D112 R6 (injury/disability audit W4, 2026-08-28) - closes audit
 * T2-28b: install-time capability replacement (the plan-conflict flow)
 * wrote NO exercise_swaps row, so that provenance was invisible to the
 * swap history and never counted anywhere swap-cause is read from.
 *
 * Source-level guard (fs.readFileSync + regex), matching this screen's
 * existing convention (see PlanLibraryScreen.emptyState.guard.test.js).
 *
 * Pins:
 *  - handleConflictReplacement calls recordExerciseSwap beside
 *    updateRoutineExerciseExercise, scope PROGRAMME, explicit true.
 *  - cause is NOT passed explicitly - it derives centrally inside
 *    recordExerciseSwap (database.js), never guessed at the call site.
 *  - the existing best-effort/try-catch shape is preserved (a swap-record
 *    failure must never block the user's own replacement choice).
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'PlanLibraryScreen.js'), 'utf8');

describe('T2-28b: install-time replacement records a provenance row', () => {
  const site = SRC.indexOf('async function handleConflictReplacement(');
  const block = SRC.slice(site, SRC.indexOf('\n  }', site));

  test('reads the real function', () => {
    expect(site).toBeGreaterThan(-1);
    expect(block).toContain('await updateRoutineExerciseExercise(conflict.routineExerciseId, picked.id);');
  });

  test('recordExerciseSwap is called beside updateRoutineExerciseExercise, scope PROGRAMME', () => {
    expect(block).toContain('await recordExerciseSwap(user.id, conflict.exerciseId, picked.id, {');
    expect(block).toContain('routineId: conflict.routineId ?? null,');
    expect(block).toContain('explicit: true,');
    expect(block).toContain('scope: SWAP_SCOPE.PROGRAMME,');
  });

  test('no cause is passed at the call site - it derives centrally in recordExerciseSwap', () => {
    expect(block).not.toMatch(/cause\s*:/);
  });

  test('the swap record is best-effort and cannot throw into the replacement flow', () => {
    const recordSite = block.indexOf('await recordExerciseSwap(');
    const afterCall = block.slice(recordSite, recordSite + 400);
    expect(afterCall).toMatch(/\.catch\(\(\) => \{ \/\* best effort \*\/ \}\);/);
  });

  test('both writes still sit inside the outer try/catch (a total failure stays best-effort)', () => {
    expect(block).toMatch(/try \{[\s\S]*await updateRoutineExerciseExercise[\s\S]*await recordExerciseSwap[\s\S]*\} catch \(_\) \{ \/\* best effort \*\/ \}/);
  });
});

describe('imports backing the fix', () => {
  test('recordExerciseSwap is imported from lib/database', () => {
    expect(SRC).toMatch(/import \{[^}]*recordExerciseSwap[^}]*\} from '\.\.\/lib\/database';/);
  });

  test('SWAP_SCOPE is imported from lib/exercise/swapScope', () => {
    expect(SRC).toContain("import { SWAP_SCOPE } from '../lib/exercise/swapScope';");
  });
});
