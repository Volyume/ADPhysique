/**
 * Audit item 6 (coach receipt chip, size S, 2026-07-08): a quiet
 * "Targets updated. See why" link in the Diary, shown ONLY when the coach
 * itself recently changed the calorie target, linking to the exact week's
 * real receipt (CoachOutputScreen) rather than a fabricated explanation.
 *
 * `appliedAdjustments.calories` / `.dietBreak` on a coach_outputs row is
 * written ONLY by CoachOutputScreen's confirm-then-apply handlers
 * (markApplied in coachApply.js) — never by a manual edit on
 * NutritionTargetsScreen or ProGoalSetupScreen (which also call
 * saveNutritionTargets but never touch coach_outputs). Reading THAT field,
 * rather than nutrition_targets.updatedAt, is what keeps the chip from
 * mis-attributing a self-made change to the coach. These are source guards
 * in the repo's established style (screen load effects are exercised on
 * device, not jest-mounted); each fails if the wiring drifts.
 */
const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
const DIARY = read('../DiaryScreen.js');

describe('Audit item 6: Diary coach-receipt chip', () => {
  test('reads the latest coach output, Pro-only and best-effort', () => {
    expect(DIARY).toMatch(/import \{[^}]*getLatestCoachOutput[^}]*\} from '\.\.\/lib\/database'/);
    // Pro-only: free tier never reaches CoachOutputScreen, so never has an
    // applied adjustment to point at.
    expect(DIARY).toMatch(/!readOnly \? getLatestCoachOutput\(userId\)\.catch\(\(\) => null\) : Promise\.resolve\(null\)/);
  });

  test('the visibility signal is a COACH-applied adjustment, not any targets write', () => {
    const site = DIARY.indexOf('const coachTargetsChange =');
    expect(site).toBeGreaterThan(-1);
    const window = DIARY.slice(site, site + 400);
    expect(window).toMatch(/latestCoachOutput\?\.appliedAdjustments\?\.calories/);
    expect(window).toMatch(/latestCoachOutput\?\.appliedAdjustments\?\.dietBreak/);
    // Must NOT key off nutrition_targets' own updatedAt/createdAt: that would
    // fire for a manual recalculation too, and mis-attribute it to the coach.
    expect(DIARY).not.toMatch(/targets\?\.\s*updatedAt/);
  });

  test('only recent (within the 7-day coach-banner window) applies show the chip', () => {
    expect(DIARY).toContain('const TARGETS_CHANGED_WINDOW_MS = 7 * 86400000;');
    expect(DIARY).toMatch(/const targetsChangedRecently = !readOnly\s*\n\s*&& !!coachTargetsChange\?\.appliedAt\s*\n\s*&& \(Date\.now\(\) - coachTargetsChange\.appliedAt\) < TARGETS_CHANGED_WINDOW_MS;/);
  });

  test('the chip links to the EXISTING coach receipt screen for that exact week, not a new surface', () => {
    const site = DIARY.indexOf('targetsChangedRecently ? (');
    expect(site).toBeGreaterThan(-1);
    const window = DIARY.slice(site, site + 700);
    expect(window).toMatch(/navigateCrossTab\(navigation, 'ProfileTab', 'CoachOutput', \{ weekStart: latestCoachOutput\.weekStart \}\)/);
    expect(window).toContain('Targets updated. See why');
    // No em dash in user-facing copy (repo-wide rule).
    expect(window).not.toMatch(/—/);
  });
});
