/**
 * campaign9.closeout.test.js — closeout items 2, 3 and 4.
 *
 * The three laws these pin:
 *   - a slot with nothing valid left in it asks the user; it never
 *     silently restores an excluded exercise or quietly drops the need
 *   - keeping an excluded exercise in one chosen plan is an exception for
 *     THAT plan, never a deletion of the global exclusion
 *   - deleting an account removes every piece of exercise-intelligence
 *     state, on both erasure paths
 */
const read = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, '../../../', rel), 'utf8');
const readRepo = (rel) => require('fs').readFileSync(require('path').resolve(__dirname, '../../../../', rel), 'utf8');

// ─── Item 2: blocked slots have a real user path ─────────────────────────────

describe('a slot with no valid exercise left asks the user', () => {
  const sheet = read('components/ExerciseConflictSheet.js');

  test('the blocked mode states the situation and offers a choice', () => {
    expect(sheet).toMatch(/These slots need your choice/);
    expect(sheet).toMatch(/Choose an exercise/);
    // It says WHY the slot is empty rather than pretending nothing happened.
    expect(sheet).toMatch(/left these slots empty rather than putting back something you asked it not to suggest/);
  });

  test('the generator still refuses to fill the slot itself', () => {
    const gen = read('lib/planAutoGen.js');
    expect(gen).toMatch(/blockedSlots/);
    expect(gen).toMatch(/needsChoice/);
    // The blocked branch must `continue` rather than write the exercise.
    const from = gen.indexOf('if (blockedReason) {');
    // Window ends at the branch's own `continue;` - the write call lives
    // AFTER it, which is precisely the point being pinned.
    const blocked = gen.slice(from, gen.indexOf('continue;', from) + 'continue;'.length);
    expect(blocked).toMatch(/blockedSlots\.push\(/);
    expect(blocked).toMatch(/continue;/);
    expect(blocked).not.toMatch(/addExerciseToRoutine/);
  });

  test('picking a set-aside exercise from a conflict screen needs an explicit allow-again', () => {
    // The exclusion is never cleared as a side effect of the selection.
    expect(sheet).toMatch(/is one you set aside/);
    expect(sheet).toMatch(/Allow again/);
    expect(sheet).toMatch(/Pick something else/);
    const handler = sheet.slice(sheet.indexOf('async function handlePicked'), sheet.indexOf('return (\n    <>'));
    // clearExerciseIntent appears ONLY inside the explicit "Allow again"
    // branch, never on the plain selection path.
    expect((handler.match(/clearExerciseIntent/g) ?? []).length).toBe(1);
    expect(handler.indexOf('clearExerciseIntent')).toBeGreaterThan(handler.indexOf("text: 'Allow again'"));
  });
});

// ─── Item 3: published-plan conflict ─────────────────────────────────────────

describe('a chosen published plan that contains a set-aside exercise', () => {
  const sheet = read('components/ExerciseConflictSheet.js');
  const screen = read('screens/PlanLibraryScreen.js');

  test('both copy paths surface the conflict before leaving the screen', () => {
    expect((screen.match(/await surfaceConflicts\(copy\.id\)/g) ?? []).length).toBe(2);
    expect(screen).toMatch(/findPlanIntentConflicts/);
  });

  test('it offers replacement AND keeping, and says both facts stand', () => {
    expect(sheet).toMatch(/This plan includes exercises you set aside/);
    expect(sheet).toMatch(/Choose replacement/);
    expect(sheet).toMatch(/Keep it in this plan/);
    expect(sheet).toMatch(/You chose this plan, and Volyume also remembers/);
  });

  // THE LOAD-BEARING ONE: keeping is not un-excluding.
  test('KEEPING does not clear the global exclusion', () => {
    const keepBtn = sheet.slice(sheet.indexOf('title="Keep it in this plan"'), sheet.indexOf('title="Keep it in this plan"') + 400);
    expect(keepBtn).not.toMatch(/clearExerciseIntent/);
    expect(keepBtn).toMatch(/onKeep\?\.\(c\)/);
    // And the screen's onKeep does nothing to the intent either.
    const onKeep = screen.slice(screen.indexOf('onKeep={'), screen.indexOf('onKeep={') + 250);
    expect(onKeep).not.toMatch(/clearExerciseIntent|setExerciseIntent/);
    // The sheet says so to the user, in plain words.
    expect(sheet).toMatch(/does not change what Volyume suggests elsewhere/);
    expect(sheet).toMatch(/stays set aside until you allow it again/);
  });

  test('replacing edits THIS plan only, never the published original', () => {
    const from = screen.indexOf('async function handleConflictReplacement');
    const fn = screen.slice(from, screen.indexOf('\n  }', from));
    expect(fn).toMatch(/updateRoutineExerciseExercise\(conflict\.routineExerciseId, picked\.id\)/);
    // It edits the user's COPY. Nothing here touches the published plan.
    expect(fn).not.toMatch(/copyPlanFromLibrary|getLibraryPlans/);
  });
});

// ─── Item 4: account deletion ────────────────────────────────────────────────

describe('account deletion removes every piece of exercise-intelligence state', () => {
  test('the local wipe list covers all three tables', () => {
    const { WIPE_DIRECT_TABLES } = require('../../database');
    expect(WIPE_DIRECT_TABLES).toEqual(expect.arrayContaining([
      'exercise_intent', 'exercise_swaps', 'exercise_slot_defaults',
    ]));
  });

  test('the cloud RPC fallback deletes them too', () => {
    const sql = readRepo('supabase/migrate_136_exercise_intent.sql');
    const rpc = sql.slice(sql.indexOf('CREATE OR REPLACE FUNCTION delete_user_data()'));
    for (const table of ['exercise_intent', 'exercise_swaps', 'exercise_slot_defaults']) {
      expect(rpc).toMatch(new RegExp(`DELETE FROM ${table}\\s+WHERE user_id = uid`));
    }
    // users_profile stays last: it is the load-bearing delete.
    expect(rpc.indexOf('DELETE FROM users_profile')).toBeGreaterThan(rpc.indexOf('DELETE FROM exercise_intent'));
  });

  test('the Edge Function path is covered by cascade, not by luck', () => {
    const sql = readRepo('supabase/migrate_136_exercise_intent.sql');
    expect((sql.match(/ON DELETE CASCADE/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  test('migration 136 is still marked UNAPPLIED', () => {
    const sql = readRepo('supabase/migrate_136_exercise_intent.sql');
    expect(sql).toMatch(/Applied remotely:\s+NO/);
    expect(sql).not.toMatch(/Applied remotely:\s+YES/);
  });
});
