/**
 * Item 10 (Option B, owner answers): "Update goal and phase" (Coach) owns goal,
 * phase, protein target, show date and the calorie and macro targets;
 * "Adjust training plan" (Train) owns every training field and the only plan
 * rebuild. This replaces the D139 pin that the Coach save previews and
 * rebuilds the plan.
 *
 * Why the Coach save no longer rebuilds: the phase is not an input to the plan
 * builder. planAutoGen.buildPlanInputs computes `phase`, but the live builder
 * (STRUCTURE_ENGINE = true, structure/release.js) is fed only by
 * structure/adapt.structureArgs, which reads goal, days, session length,
 * equipment, experience, weak points and style. A phase-only save would have
 * rebuilt an identical plan and restarted the block for nothing.
 *
 * Written to FAIL if the Coach form regenerates, previews, installs a kit or
 * writes a training field again, or if the Train form loses its save order
 * (plan first, profile after) or its keep-the-block rule.
 */
import fs from 'fs';
import path from 'path';

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const lib = (...p) => fs.readFileSync(path.join(__dirname, '..', '..', 'lib', ...p), 'utf8');
const coach = read('ProGoalSetupScreen.js');
const train = read('PlanUpdateScreen.js');

describe('the plan builder does not read the phase', () => {
  test('structureArgs carries no phase, and the structure engine is the live builder', () => {
    const args = lib('structure', 'adapt.js');
    const fn = args.slice(args.indexOf('export function structureArgs'), args.indexOf('// The category in words'));
    expect(fn).not.toMatch(/phase/i);
    expect(lib('structure', 'release.js')).toMatch(/export const STRUCTURE_ENGINE = true;/);
  });
});

describe('the Coach form never rebuilds the plan', () => {
  test('no generation, preview, kit install or plan-switch confirm remains', () => {
    expect(coach).not.toMatch(/prepareStartWithPlan|commitStartWithPlan|generateAndSavePlan|installLibraryPlanForKit|PlanPreviewSheet|confirmPlanSwitchMidBlock|libraryKit|EQUIPMENT_OPTIONS|styleLockFromTags/);
  });

  test('the saved profile carries only the fields this screen owns', () => {
    const block = coach.slice(coach.indexOf('const updatedProfile = {'), coach.indexOf('goalStartDate,\n    };'));
    expect(block).toMatch(/useAppStore\.getState\(\)\.userProfile/);
    for (const k of ['trainingGoal', 'daysPerWeek', 'experience', 'equipment', 'recoveryRating', 'planWeakPoints', 'trainingArchetype', 'sessionLengthMinutes']) {
      expect(block).not.toMatch(new RegExp('\\b' + k + ':'));
    }
  });

  test('goal, phase, protein and targets still save, and the button says what it does', () => {
    for (const call of [
      'await saveLocalProfile(user.id, updatedProfile);',
      'await saveNutritionTargets(user.id, nextTargets);',
      'await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nextTargets));',
    ]) expect(coach).toContain(call);
    expect(coach).toMatch(/const primaryLabel = 'Review and save';/);
  });

  test('the calm-mode aggressive-cut gate is not touched here (it lives on Nutrition targets)', () => {
    expect(coach).not.toMatch(/aggressive_cut/);
    expect(fs.readFileSync(path.join(__dirname, '..', 'NutritionTargetsScreen.js'), 'utf8')).toMatch(/!\(calm && g\.key === 'aggressive_cut'\)/);
  });
});

describe('the two screens link to each other with the owner\'s words', () => {
  test('Coach shows the training read-out and the Adjust training plan link', () => {
    expect(coach).toMatch(/Your category, training style, experience, days, equipment and recovery are set on the Train tab\./);
    expect(coach).toMatch(/title="Adjust training plan"/);
    expect(coach).toMatch(/navigateCrossTab\(navigation, 'PlansTab', 'PlanUpdate'\)/);
  });

  test('Train points at the Coach form and says what it owns', () => {
    expect(train).toMatch(/Your goal, phase, protein target and calorie and macro targets are set on the Coach tab\./);
    expect(train).toMatch(/title="Update goal and phase"/);
    expect(train).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'ProGoalSetup'\)/);
  });

  test('a days or experience change on Train keeps the targets and offers Update now', () => {
    expect(train).toMatch(/targetsMayBeOutOfStep = daysPerWeek !== \(userProfile\?\.daysPerWeek \?\? 4\)\s*\n\s*\|\| experience !== \(userProfile\?\.experience \?\? 'intermediate'\)/);
    expect(train).toMatch(/Your coach will update them at your next check-in on \$\{nextCheckinLabel\}\./);
    expect(train).toMatch(/title="Update now"/);
    // Train never recalculates targets.
    expect(train).not.toMatch(/calculateNutritionTargets|saveNutritionTargets/);
  });
});

describe('the Train form keeps its save order and block rule', () => {
  const confirm = train.slice(train.indexOf('async function handleConfirmRebuild()'), train.indexOf('async function handleInstallKitPlan()'));
  test('plan first, profile after; a failed build saves nothing and keeps the sheet open to retry', () => {
    const planAt = confirm.indexOf('generateAndSavePlan(user.id, updatedProfile');
    const failAt = confirm.indexOf('if (!planResult.ok) {');
    const saveAt = confirm.indexOf('await saveLocalProfile(user.id, updatedProfile);');
    expect(planAt).toBeGreaterThan(-1);
    expect(failAt).toBeGreaterThan(planAt);
    expect(saveAt).toBeGreaterThan(failAt);
    const failBranch = confirm.slice(failAt, saveAt);
    expect(failBranch).toMatch(/toast\.show\(REBUILD_FAILED_MESSAGE/);
    expect(failBranch).toMatch(/return;/);
    expect(failBranch).not.toMatch(/setStaged\(null\)/);
  });
  test('the block is kept whenever the exercises did not change', () => {
    expect(confirm).toMatch(/keepsBlockOnRebuild\(\{ diff, receipt: staged\.receipt \?\? null, blockStatus: blockStatusNow \}\)/);
  });
});
