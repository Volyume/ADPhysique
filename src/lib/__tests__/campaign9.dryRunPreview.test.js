/**
 * campaign9.dryRunPreview.test.js — Campaign 9 cosmetic patch.
 *
 * The dry run keeps blocked entries inside its raw positional plan on
 * purpose: the plan-diff indices come from that structure. What it must
 * NOT do is show the user a set-aside exercise as though Volyume were
 * about to prescribe it. This is a presentation fix, and these tests pin
 * that the data underneath is untouched.
 */
import { summariseProspectivePlan, summariseCurrentPlan, diffPlans } from '../planDiff';

const plan = {
  splitType: 'upper_lower',
  workouts: [
    { name: 'Upper', exercises: [
      { exerciseName: 'Flat Barbell Bench' },
      { exerciseName: 'Barbell Row' },
    ] },
    { name: 'Lower', exercises: [
      { exerciseName: 'Back Squat' },
    ] },
  ],
};
const blockedSlots = [{ exerciseName: 'Flat Barbell Bench', reason: 'excluded', position: 0 }];

describe('a blocked dry-run slot is never shown as the proposed prescription', () => {
  test('the set-aside exercise does not appear in the preview moves', () => {
    const summary = summariseProspectivePlan(plan, 60, { blockedSlots });
    expect(summary.moves).not.toContain('Flat Barbell Bench');
    expect(summary.moves).toEqual(['Back Squat', 'Barbell Row']);
    expect(summary.blockedCount).toBe(1);
  });

  test('it is not shown as an ADDED move in the diff either', () => {
    const before = summariseCurrentPlan([{ splitType: 'upper_lower', exercises: [{ name: 'Barbell Row' }] }], 60);
    const after = summariseProspectivePlan(plan, 60, { blockedSlots });
    const d = diffPlans(before, after);
    expect(d.movesAdded).not.toContain('Flat Barbell Bench');
    expect(d.movesAdded).toContain('Back Squat');
  });

  test('matching is case-insensitive, so a casing difference cannot leak the name', () => {
    const summary = summariseProspectivePlan(plan, 60, {
      blockedSlots: [{ exerciseName: 'flat barbell BENCH' }],
    });
    expect(summary.moves).not.toContain('Flat Barbell Bench');
    expect(summary.blockedCount).toBe(1);
  });
});

describe('unblocked behaviour is unchanged', () => {
  test('no blocked slots gives byte-identical output to the old call', () => {
    const withNothing = summariseProspectivePlan(plan, 60);
    const withEmpty = summariseProspectivePlan(plan, 60, { blockedSlots: [] });
    const withNull = summariseProspectivePlan(plan, 60, { blockedSlots: null });
    expect(withNothing.moves).toEqual(['Back Squat', 'Barbell Row', 'Flat Barbell Bench']);
    expect(withEmpty).toEqual(withNothing);
    expect(withNull).toEqual(withNothing);
    expect(withNothing.blockedCount).toBe(0);
  });

  test('days, split and session length are untouched by the patch', () => {
    const a = summariseProspectivePlan(plan, 75);
    const b = summariseProspectivePlan(plan, 75, { blockedSlots });
    expect(b.days).toBe(a.days);
    expect(b.split).toBe(a.split);
    expect(b.sessionLengthMinutes).toBe(a.sessionLengthMinutes);
  });
});

describe('the raw positional structure the diff relies on is not mutated', () => {
  test('summarising does not touch the plan object', () => {
    const snapshot = JSON.parse(JSON.stringify(plan));
    summariseProspectivePlan(plan, 60, { blockedSlots });
    expect(plan).toEqual(snapshot);
    // The blocked entry is still at its original index, so every
    // position-derived read downstream is unaffected.
    expect(plan.workouts[0].exercises[0].exerciseName).toBe('Flat Barbell Bench');
    expect(plan.workouts[0].exercises).toHaveLength(2);
  });

  test('generation, ranking and persistence are untouched by this patch', () => {
    const read = (p) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', p), 'utf8');
    // The fix lives in the summariser and the screen. The generator still
    // collects blockedSlots exactly as before.
    const gen = read('lib/planAutoGen.js');
    expect(gen).toMatch(/blockedSlots\.push\(/);
    const diffSrc = read('lib/planDiff.js');
    expect(diffSrc).not.toMatch(/addExerciseToRoutine|clearExerciseIntent|setExerciseIntent/);
  });
});

describe('resolving the conflict still writes the correct plan', () => {
  test('the preview summariser is not on the commit path at all', () => {
    const read = (p) => require('fs').readFileSync(require('path').resolve(__dirname, '../../', p), 'utf8');
    const gen = read('lib/planAutoGen.js');
    // generateAndSavePlan writes the plan; it never consults planDiff, so
    // nothing in this patch can change what is actually persisted.
    expect(gen).not.toMatch(/summariseProspectivePlan/);
    const commit = gen.slice(gen.indexOf('export async function generateAndSavePlan'), gen.indexOf('export async function generatePlanDryRun'));
    expect(commit).toMatch(/addExerciseToRoutine/);
    expect(commit).not.toMatch(/planDiff/);
  });

  test('once nothing is blocked, every exercise is written and previewed alike', () => {
    // The user resolved the conflict, so the dry run reports no blocked
    // slots: the preview shows the full list again, unchanged.
    const summary = summariseProspectivePlan(plan, 60, { blockedSlots: [] });
    expect(summary.moves).toEqual(['Back Squat', 'Barbell Row', 'Flat Barbell Bench']);
    expect(summary.blockedCount).toBe(0);
  });
});

describe('the preview states the blocked slot honestly', () => {
  const screen = require('fs').readFileSync(
    require('path').resolve(__dirname, '../../screens/PlanUpdateScreen.js'), 'utf8');
  // RE-ANCHORED (D139): the preview sheet itself is now the shared
  // components/PlanPreviewSheet.js, rendered by all four generation moments
  // instead of only Adjust training. The copy contract is unchanged and moved
  // with the JSX; the SCREEN still owns the dry run that feeds it, which is
  // what the second test below pins.
  const sheet = require('fs').readFileSync(
    require('path').resolve(__dirname, '../../components/PlanPreviewSheet.js'), 'utf8');

  test('it says a choice is needed and why, without naming a prescription', () => {
    // CC27 (section 9.5 / CC-D25) split the single "Exercise choice
    // needed" line by LANE: set-aside slots and capability-blocked slots
    // are different facts and each is named in its own words. The
    // campaign 9 contract stands - the preview states why a slot is
    // empty, and never shows a set-aside exercise as the prescription.
    expect(sheet).toMatch(/would normally use exercises you have set aside/);
    expect(sheet).toMatch(/no match inside how you train/);
  });

  test('the screen passes the dry run\'s own blocked list to the summariser', () => {
    expect(screen).toMatch(/blockedSlots: dry\.blockedSlots \?\? null/);
  });

  test('it neither chooses a replacement nor restores an exclusion', () => {
    const anchor = sheet.indexOf('no match inside how you train');
    const block = sheet.slice(anchor - 900, anchor + 500);
    expect(block).not.toMatch(/clearExerciseIntent|setExerciseIntent|updateRoutineExerciseExercise/);
  });
});
