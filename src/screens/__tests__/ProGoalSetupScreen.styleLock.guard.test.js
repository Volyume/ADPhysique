/**
 * ProGoalSetupScreen.styleLock.guard.test.js — final certification
 * 2026-09-05, F-16 REVISED point 3 (which absorbs F-15), from
 * docs/final-certification-2026-09-05/07-FINDINGS.md on evidence A3.
 *
 * What this suite pins and why. "Update goal and phase" (Coach tab,
 * YouScreen.js) calls the same generation the rebuild screen does, on SAVE.
 * So a kettlebell, circuit or band library-plan user who came here to change
 * a goal had their style plan silently replaced by a generated gym plan, and
 * the only wording anywhere was the mid-block confirm's "rebuild". This is
 * the second half of the PlanUpdateScreen lock, and the more dangerous half
 * because the loss is not what the athlete came here for.
 *
 * Written to FAIL if:
 *  - the lock rule is re-derived here instead of shared;
 *  - a style-locked save still reaches the generator, or still runs the
 *    block-replacing confirm that has nothing to replace;
 *  - goal, phase, protein or nutrition saving is made conditional on the lock
 *    (they must keep working exactly as they do now);
 *  - the training-setup fields stay on screen for a locked plan;
 *  - the F-15 circuit disclosure is missing on the paths that DO rebuild;
 *  - the change summary reports a deliberately kept plan as a failed rebuild.
 *
 * Source-level guard (the fs.readFileSync + regex pattern this repo already
 * uses for founder-locked rules): these screens pull the whole SQLite/native
 * import graph, and what needs pinning is textual and structural.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'ProGoalSetupScreen.js'), 'utf8');
const summarySource = fs.readFileSync(path.join(__dirname, '..', 'GoalChangeSummaryScreen.js'), 'utf8');
const lockSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'exercise', 'styleLock.js'), 'utf8',
);

const goalNotice = (label) => String(
  (lockSource.match(/return `(Your \$\{label\} plan stays as it is[^`]+)`;/) || [])[1],
).replace(/\$\{label\}/g, label);

describe('F-16 REVISED point 3: a goal change never regenerates a style plan', () => {
  test('the lock comes from the shared module, not a second copy of the rule', () => {
    expect(source).toMatch(/from '\.\.\/lib\/exercise\/styleLock'/);
    expect(source).not.toMatch(/function styleLockFromTags/);
  });

  test('the active plan is read on entry and its style tag resolved', () => {
    expect(source).toMatch(/getActivePlan\(user\.id\)/);
    expect(source).toMatch(/styleLockFromTags\(active\?\.tags\)/);
  });

  test('a locked plan skips the generator entirely', () => {
    const save = source.slice(source.indexOf('async function handleSave()'));
    expect(save).toMatch(/if \(styleLock\) \{[\s\S]*?planResult = \{ ok: false, error: 'style_locked' \};/);
    // The preview + commit pair is the generation path; it sits on the else.
    const lockedBranch = save.slice(save.indexOf("error: 'style_locked'"), save.indexOf('} else {'));
    expect(lockedBranch).not.toMatch(/prepareStartWithPlan|commitStartWithPlan/);
  });

  test('the block-replacing confirm is skipped, because nothing is replaced', () => {
    expect(source).toMatch(/if \(!styleLock\) \{\s*\n\s*const proceed = await confirmPlanSwitchMidBlock/);
  });

  test('goal, phase, protein and nutrition still save, unconditionally', () => {
    const save = source.slice(source.indexOf('async function handleSave()'));
    // None of these writes sits behind a styleLock condition.
    for (const call of [
      'await saveLocalProfile(user.id, updatedProfile);',
      'await saveNutritionTargets(user.id, nextTargets);',
      'await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nextTargets));',
    ]) {
      const at = save.indexOf(call);
      expect(at).toBeGreaterThan(-1);
      // Every one of them happens before the plan decision is even reached.
      expect(at).toBeLessThan(save.indexOf("planResult = { ok: false, error: 'style_locked' }"));
    }
  });

  test('the training-setup fields are withheld and the reason takes their place', () => {
    expect(source).toMatch(/\{kindChecked && styleLock \? \(/);
    expect(source).toMatch(/\{kindChecked && !styleLock \? \(/);
    expect(source).toMatch(/\{styleLockGoalNotice\(styleLock\.label\)\}/);
    // The five fields all sit inside the !styleLock branch.
    const shown = source.slice(
      source.indexOf('{kindChecked && !styleLock ? ('),
      source.indexOf('{/* ── Protein target ── */}'),
    );
    for (const setter of ['setExperience', 'setDaysPerWeek', 'setSessionLengthMinutes', 'setEquipment', 'setRecoveryRating']) {
      expect(shown).toContain(setter);
    }
  });

  test('the notice says what still updates and what does not, in British English', () => {
    for (const label of ['kettlebell', 'circuit', 'band']) {
      expect(goalNotice(label)).toBe(
        `Your ${label} plan stays as it is. Goal and nutrition targets update; to change the plan, choose another ${label} plan in the Plan Library.`,
      );
      expect(goalNotice(label)).not.toContain('—');
    }
  });

  test('it routes to the Plan Library filtered to the same style', () => {
    // Final pass S3: ProGoalSetup sits in ProfileStack and PlanLibrary in
    // PlansStack, so a plain navigate was a dead route. The jump crosses tabs.
    expect(source).toMatch(/navigateCrossTab\(navigation, 'PlansTab', 'PlanLibrary', \{ initialCollection: styleLock\.collection \}\)/);
  });

  test('a locked save shows no failure toast: this is the intended outcome', () => {
    const save = source.slice(source.indexOf('async function handleSave()'));
    expect(save).toMatch(/if \(styleLock\) \{\s*\n\s*\/\/ Nothing to say beyond the summary/);
  });
});

describe('F-15 here too: circuit rounds are not flattened silently', () => {
  test('the screen reads whether the active plan has circuit groups', () => {
    expect(source).toMatch(/activePlanHasCircuitGroups/);
  });

  test('the disclosure is on screen and answered before anything is written', () => {
    const save = source.slice(source.indexOf('async function handleSave()'));
    const disclosureAt = save.indexOf('CIRCUIT_FLATTEN_NOTICE');
    const writeAt = save.indexOf('await saveLocalProfile(user.id, updatedProfile);');
    expect(disclosureAt).toBeGreaterThan(-1);
    expect(disclosureAt).toBeLessThan(writeAt);
    expect(save).toMatch(/if \(!acceptsFlatten\) return;/);
    expect(source).toMatch(/\{hasCircuitGroups \? \(/);
  });
});

describe('F-16 REVISED point 3(d): the change summary never overclaims', () => {
  test('the reason a plan was kept travels to the summary', () => {
    expect(source).toMatch(/planKeptReason: styleLock \? 'style_lock' : null,/);
    expect(source).toMatch(/planStyleLabel: styleLock\?\.label \?\? null,/);
  });

  test('the summary reads them and says the plan was kept, not that it failed', () => {
    expect(summarySource).toMatch(/planKeptReason = null, planStyleLabel = null,/);
    expect(summarySource).toMatch(/const planKeptOnPurpose = planKeptReason === 'style_lock';/);
    expect(summarySource).toMatch(/\{planKeptOnPurpose\s*\n\s*\? `Your \$\{planStyleLabel \?\? 'library'\} plan stays as it is/);
  });

  test('the kept branch never carries the failure retry, which would generate', () => {
    const branch = summarySource.slice(
      summarySource.indexOf('{planKeptOnPurpose'),
      summarySource.indexOf(': planRerolled'),
    );
    expect(branch).not.toMatch(/rebuild this time|Start with a plan/);
  });

  test('the rebuilt and failed branches are untouched', () => {
    expect(summarySource).toContain('A fresh plan has been built for your new goal and is now your active plan.');
    expect(summarySource).toMatch(/but the training plan didn\\'t rebuild this time\./);
  });
});
