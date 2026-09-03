/**
 * D139 - a goal or phase change rebuilds the plan and restarts the block. It
 * used to say so only AFTER the write (GoalChangeSummary). It now previews
 * first, in the same shared sheet the other three generation moments use.
 *
 * What this pins, and deliberately does NOT change: every nutrition-target
 * side effect stays exactly where it was. Only the plan rebuild waits on the
 * preview - the goal and the recalculated targets are saved either way,
 * exactly as they were when a capability hold skipped the rebuild.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'ProGoalSetupScreen.js'), 'utf8');

describe('ProGoalSetupScreen previews the rebuild', () => {
  test('the rebuild goes through the shared prepare / sheet / commit steps', () => {
    expect(source).toMatch(/import \{ prepareStartWithPlan, commitStartWithPlan \} from '\.\.\/lib\/startWithPlan'/);
    expect(source).toMatch(/prepareStartWithPlan\(user\.id, updatedProfile, \{\s*\n\s*mode: 'goal',/);
    expect(source).toMatch(/<PlanPreviewSheet/);
    expect(source).toMatch(/confirmLabel="Confirm and rebuild"/);
    expect(source).toMatch(/commitStartWithPlan\(user\.id, updatedProfile\)/);
  });

  test('the commit runs only after an explicit confirm from the sheet', () => {
    const confirmIdx = source.indexOf('const confirmed = await new Promise((resolve) => {');
    const commitIdx = source.indexOf('planResult = await commitStartWithPlan(user.id, updatedProfile);');
    expect(confirmIdx).toBeGreaterThan(-1);
    expect(commitIdx).toBeGreaterThan(confirmIdx);
    expect(source).toMatch(/if \(!confirmed\) \{\s*\n\s*previewDeclined = true;/);
  });

  test('the mid-block confirm this screen already ran is untouched', () => {
    expect(source).toMatch(/confirmPlanSwitchMidBlock\(user\?\.id, \{ mode: 'rebuild' \}\)/);
    expect(source).toMatch(/if \(!proceed\) return;/);
  });

  test('every nutrition-target side effect still runs before the plan step, regardless of the answer', () => {
    const targetsIdx = source.indexOf('await saveNutritionTargets(user.id, nextTargets);');
    const profileIdx = source.indexOf('await saveLocalProfile(user.id, updatedProfile);');
    const previewIdx = source.indexOf('prepareStartWithPlan(user.id, updatedProfile');
    expect(targetsIdx).toBeGreaterThan(-1);
    expect(targetsIdx).toBeLessThan(previewIdx);
    expect(profileIdx).toBeLessThan(previewIdx);
    // Declining the rebuild is a valid answer and is not scolded.
    expect(source).toMatch(/planResult = \{ ok: false, error: 'plan_preview_declined' \};/);
  });
});
