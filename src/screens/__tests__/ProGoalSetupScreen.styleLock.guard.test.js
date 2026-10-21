/**
 * ProGoalSetupScreen.styleLock.guard.test.js, item 10 (Option B) ownership.
 *
 * History: final certification 2026-09-05, F-16 REVISED point 3 (absorbing
 * F-15) found that "Update goal and phase" regenerated a kettlebell, circuit
 * or band library plan on save. Under Option B the Coach form no longer edits
 * or rebuilds anything about the plan (the phase is not a plan-builder input;
 * Adjust training plan owns the training fields), so the protection is now
 * structural: the Coach form has no path to the generator, and the lock rule,
 * the withheld fields and the circuit disclosure live on Adjust training plan.
 *
 * Written to FAIL if:
 *  - the Coach form can reach the generator, the kit install or the
 *    plan-replacing confirm again;
 *  - goal, phase, protein or nutrition saving is made conditional on a plan
 *    state (they must keep working for every plan);
 *  - Adjust training plan loses the shared lock rule, the withheld form for a
 *    locked plan, or the circuit disclosure answered before anything is written;
 *  - the change summary reports a plan that was left alone as a failed rebuild.
 *
 * Source-level guard (these screens pull the whole SQLite/native import graph).
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'ProGoalSetupScreen.js'), 'utf8');
const train = fs.readFileSync(path.join(__dirname, '..', 'PlanUpdateScreen.js'), 'utf8');
const summarySource = fs.readFileSync(path.join(__dirname, '..', 'GoalChangeSummaryScreen.js'), 'utf8');
const lockSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'exercise', 'styleLock.js'), 'utf8',
);

const goalNotice = (label) => String(
  (lockSource.match(/return `(Your \$\{label\} plan stays as it is[^`]+)`;/) || [])[1],
).replace(/\$\{label\}/g, label);

describe('a goal or phase change never regenerates a style plan (structurally)', () => {
  test('the Coach form has no plan reads or writes at all', () => {
    expect(source).not.toMatch(/getActivePlan|styleLock|activePlanHasCircuitGroups|CIRCUIT_FLATTEN_NOTICE/);
    expect(source).not.toMatch(/from '\.\.\/lib\/(planAutoGen|startWithPlan)'/);
  });

  test('goal, phase, protein and nutrition save unconditionally', () => {
    const save = source.slice(source.indexOf('async function handleSave()'));
    for (const call of [
      'await saveLocalProfile(user.id, updatedProfile);',
      'await saveNutritionTargets(user.id, nextTargets);',
      'await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nextTargets));',
    ]) {
      expect(save).toContain(call);
    }
  });
});

describe('Adjust training plan owns the lock and the circuit disclosure', () => {
  test('the lock comes from the shared module, not a second copy of the rule', () => {
    expect(train).toMatch(/from '\.\.\/lib\/exercise\/styleLock'/);
    expect(train).toMatch(/styleLockFromTags\(active\?\.tags\)/);
    expect(train).not.toMatch(/function styleLockFromTags/);
  });

  test('a locked plan replaces the form with the reason', () => {
    expect(train).toMatch(/\{kindChecked && styleLock \? \(/);
    expect(train).toMatch(/\{kindChecked && !styleLock \? \(/);
  });

  test('the circuit disclosure is answered before anything is written', () => {
    const confirm = train.slice(train.indexOf('async function handleConfirmRebuild()'));
    const disclosureAt = confirm.indexOf('CIRCUIT_FLATTEN_NOTICE');
    const writeAt = confirm.indexOf('await saveLocalProfile(user.id, updatedProfile);');
    expect(disclosureAt).toBeGreaterThan(-1);
    expect(disclosureAt).toBeLessThan(writeAt);
    expect(confirm).toMatch(/if \(!acceptsFlatten\) \{ setSaving\(false\); return; \}/);
  });

  test('the shared notices stay in British English with no em dash', () => {
    for (const label of ['kettlebell', 'circuit', 'band']) {
      expect(goalNotice(label)).toBe(
        `Your ${label} plan stays as it is. Goal and nutrition targets update; to change the plan, choose another ${label} plan in the Plan Library.`,
      );
      expect(goalNotice(label)).not.toContain('\u2014');
    }
  });
});

describe('the change summary never overclaims', () => {
  test('the Coach form tells the summary the plan is set on Train, so it is never reported as a failed rebuild', () => {
    expect(source).toMatch(/planKeptReason: 'training_on_train',/);
    expect(summarySource).toMatch(/const planOnTrain = planKeptReason === 'training_on_train';/);
    expect(summarySource).toMatch(/\{planOnTrain\s*\n\s*\? 'Your training plan stays as it is\./);
  });

  test('the summary reads them and says the plan was kept, not that it failed', () => {
    expect(summarySource).toMatch(/planKeptReason = null, planStyleLabel = null,/);
    expect(summarySource).toMatch(/const planKeptOnPurpose = planKeptReason === 'style_lock';/);
    expect(summarySource).toMatch(/: planKeptOnPurpose\s*\n\s*\? `Your \$\{planStyleLabel \?\? 'library'\} plan stays as it is/);
  });

  test('the kept branch never carries the failure retry, which would generate', () => {
    const branch = summarySource.slice(
      summarySource.indexOf(': planKeptOnPurpose'),
      summarySource.indexOf(': planRerolled'),
    );
    expect(branch).not.toMatch(/rebuild this time|Start with a plan/);
  });

  test('the rebuilt and failed branches are untouched', () => {
    expect(summarySource).toContain('A fresh plan has been built for your new goal and is now your active plan.');
    expect(summarySource).toMatch(/but the training plan didn\\'t rebuild this time\./);
  });
});
