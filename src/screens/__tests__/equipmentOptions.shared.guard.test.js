/**
 * equipmentOptions.shared.guard.test.js — founder task 2026-09-11: ONE shared,
 * ordered equipment answer list for first run (ProOnboardingScreen) and
 * Adjust training (PlanUpdateScreen), with Kettlebells and Bands behaving
 * identically on both; extended the same day (D159 Q5, lead ruling on the
 * founder's delegation) to the goal and phase screen (ProGoalSetupScreen),
 * which carried its own six-answer copy and rebuilt through the generator
 * for every answer.
 *
 * What this suite pins and why. Adjust training carried its own six-answer
 * copy of the list, so a kettlebell or band owner who had the honest answer
 * at first run (F-16 REVISED, docs/final-certification-2026-09-05/
 * 07-FINDINGS.md evidence A12) lost it the moment they opened Adjust
 * training, and any later edit to one list silently drifted from the other.
 *
 * Written to FAIL if:
 *  - either screen grows a private equipment list again, or stops rendering
 *    the shared one;
 *  - the shared list loses an answer, reorders, or changes the wording;
 *  - Adjust training stores the raw 'kettlebells'/'bands' answer as the
 *    equipment PROFILE (the engines' bare membership test would empty the
 *    pool) instead of mapping it through generationEquipmentFor as first run
 *    does;
 *  - a kit answer on Adjust training reaches the generator (dry run or
 *    commit) instead of the library install first run uses;
 *  - the D139 mid-block confirm is dropped from the kit path, or the setup is
 *    saved before the plan is in place (FF-002);
 *  - the completion line is not the shared library-install line, or the
 *    pre-install line is not the shared offer line.
 *
 * Source-level guard for the two screens (they pull the SQLite/native import
 * graph); the shared list itself is pure data and is imported directly.
 */
import fs from 'fs';
import path from 'path';
import { EQUIPMENT_OPTIONS } from '../../lib/equipmentOptions';

const read = (...segs) => fs.readFileSync(path.join(__dirname, '..', ...segs), 'utf8');
const onboarding = read('ProOnboardingScreen.js');
const planUpdate = read('PlanUpdateScreen.js');
const goalSetup = read('ProGoalSetupScreen.js');
const goalSummary = read('GoalChangeSummaryScreen.js');

const EXPECTED_ORDER = [
  ['full_gym', 'Full gym'],
  ['machines_cables', 'Machines and cables'],
  ['dumbbells_only', 'Dumbbells only'],
  ['barbell_plates', 'Barbell and plates'],
  ['home_gym', 'Home gym'],
  ['bodyweight', 'Bodyweight'],
  ['kettlebells', 'Kettlebells'],
  ['bands', 'Bands'],
];

describe('the shared equipment list', () => {
  test('offers exactly the eight answers, in this order, with these labels', () => {
    expect(EQUIPMENT_OPTIONS.map(o => [o.value, o.label])).toEqual(EXPECTED_ORDER);
  });

  test('every answer carries its explanatory sub line, in British English with no em dash', () => {
    for (const o of EQUIPMENT_OPTIONS) {
      expect(typeof o.sub).toBe('string');
      expect(o.sub.length).toBeGreaterThan(0);
      for (const s of [o.label, o.sub]) {
        expect(s).not.toContain('—');
        expect(s).not.toMatch(/customize|optimize|color\b/i);
      }
    }
    expect(EQUIPMENT_OPTIONS.find(o => o.value === 'kettlebells').sub).toBe('One or two kettlebells, no other weights');
    expect(EQUIPMENT_OPTIONS.find(o => o.value === 'bands').sub).toBe('Resistance bands, no weights');
  });

  test('is frozen: no screen can reorder or edit it at runtime', () => {
    expect(Object.isFrozen(EQUIPMENT_OPTIONS)).toBe(true);
  });

  test('the two kit answers map to a library kit and a real profile; the six profiles pass through', () => {
    const { libraryKitForEquipment, generationEquipmentFor } = require('../../lib/startWithPlan');
    const profiles = EQUIPMENT_OPTIONS.slice(0, 6).map(o => o.value);
    for (const o of EQUIPMENT_OPTIONS) {
      expect(profiles).toContain(generationEquipmentFor(o.value));
    }
    expect(libraryKitForEquipment('kettlebells')).toBe('kettlebell');
    expect(libraryKitForEquipment('bands')).toBe('band');
    for (const v of profiles) expect(libraryKitForEquipment(v)).toBeNull();
  });
});

describe('every screen that asks renders the shared list and nothing else', () => {
  test.each([
    ['ProOnboardingScreen.js', onboarding],
    ['PlanUpdateScreen.js', planUpdate],
    ['ProGoalSetupScreen.js', goalSetup],
  ])('%s imports the shared list and passes it to its picker', (_file, source) => {
    expect(source).toMatch(/import \{ EQUIPMENT_OPTIONS \} from '\.\.\/lib\/equipmentOptions'/);
    expect(source).toMatch(/options=\{EQUIPMENT_OPTIONS\}/);
    // No private copy, whole or partial.
    expect(source).not.toMatch(/const EQUIPMENT_OPTIONS = \[/);
    expect(source).not.toMatch(/value: 'machines_cables'/);
    expect(source).not.toMatch(/value: 'kettlebells'/);
  });
});

describe('Adjust training treats a kit answer exactly as first run does', () => {
  const kitHandler = planUpdate.slice(
    planUpdate.indexOf('async function handleInstallKitPlan()'),
    planUpdate.indexOf('const primaryLabel = libraryKit'),
  );

  test('the kit is resolved from the answer with the shared helper', () => {
    expect(planUpdate).toMatch(/const libraryKit = libraryKitForEquipment\(equipment\);/);
  });

  test('the staged profile stores the mapped equipment PROFILE, never the raw answer', () => {
    const profileFn = planUpdate.slice(
      planUpdate.indexOf('function buildUpdatedProfile()'),
      planUpdate.indexOf('async function readCurrentPlanSummary()'),
    );
    expect(profileFn).toMatch(/equipment: generationEquipmentFor\(equipment\),/);
    expect(profileFn).not.toMatch(/^\s+equipment,\s*$/m);
  });

  test('the kit path calls the library install and never the generator', () => {
    expect(kitHandler.length).toBeGreaterThan(0);
    expect(kitHandler).toMatch(/installLibraryPlanForKit\(user\.id, \{/);
    expect(kitHandler).toMatch(/kit: libraryKit,/);
    expect(kitHandler).not.toMatch(/generateAndSavePlan|generatePlanDryRun|assessScheduleFit|capabilityPreflight/);
  });

  test('the kit path runs the D139 mid-block confirm through the install hook, and a no is silent', () => {
    expect(kitHandler).toMatch(/confirm: \(\{ planName \}\) => confirmPlanSwitchMidBlock\(user\.id, \{ newPlanName: planName \}\)/);
    expect(kitHandler).toMatch(/if \(planResult\.error === 'cancelled'\) return;/);
  });

  test('FF-002: the setup is saved only after the plan is in place', () => {
    const okCheck = kitHandler.indexOf('if (!planResult.ok) {');
    const save = kitHandler.indexOf('saveLocalProfile(user.id, updatedProfile)');
    expect(okCheck).toBeGreaterThan(-1);
    expect(save).toBeGreaterThan(okCheck);
    // The failure branch returns before the save.
    expect(kitHandler.slice(okCheck, save)).toMatch(/return;/);
  });

  test('a failed install shows the screen\'s one calm message, with the reason logged', () => {
    expect(kitHandler).toMatch(/logWarn\('PlanUpdateScreen\.installKitPlan', planResult\.error \?\? 'unknown'/);
    expect(kitHandler).toMatch(/toast\.show\(REBUILD_FAILED_MESSAGE,/);
  });

  test('the completion line is the shared library-install line first run shows', () => {
    expect(kitHandler).toMatch(/toast\.show\(libraryKitInstalledLine\(libraryKit, planResult\.planName\)/);
    expect(onboarding).toMatch(/libraryKitInstalledLine\(libraryKit, planResult\.planName\)/);
  });

  test('the form says what a kit answer does as soon as it is chosen, in the shared words', () => {
    expect(planUpdate).toMatch(/\{libraryKit \? \(\s*<Text[^>]*>\{libraryKitOfferLine\(libraryKit\)\}<\/Text>/);
    expect(planUpdate).toMatch(/from '\.\.\/lib\/startWithPlan'/);
    // No screen-local rewording of the kit copy.
    expect(planUpdate).not.toMatch(/plans built for this kit/);
  });

  test('the primary action routes by answer and names what it does', () => {
    expect(planUpdate).toMatch(/onPress=\{libraryKit \? handleInstallKitPlan : handleRebuildPress\}/);
    expect(planUpdate).toMatch(/\? `Add the \$\{libraryKitWord\(libraryKit\)\} plan`\s*: 'Review my plan changes'/);
    expect(planUpdate).toMatch(/title=\{primaryLabel\}/);
    expect(planUpdate).toMatch(/accessibilityLabel=\{primaryLabel\}/);
  });

  test('the generating path is untouched: preview, confirm and keep-block wiring stand', () => {
    expect(planUpdate).toMatch(/const dry = await generatePlanDryRun\(user\.id, updatedProfile\);/);
    expect(planUpdate).toMatch(/confirmPlanSwitchMidBlock\(user\.id, \{ mode: 'rebuild', keepBlock \}\)/);
    expect(planUpdate).toMatch(/generateAndSavePlan\(user\.id, updatedProfile, \{ keepBlock \}\)/);
  });
});

describe('the goal and phase screen treats a kit answer exactly as first run and Adjust training do', () => {
  // The kit install sits between the up-front confirm block and the first
  // line of the profile build, so this slice IS the kit path.
  const kitBlock = goalSetup.slice(
    goalSetup.indexOf('let installedPlan = null;'),
    goalSetup.indexOf('const goalPhase = phaseToCoachingKey(selectedPhase);'),
  );
  const save = goalSetup.slice(goalSetup.indexOf('async function handleSave()'));

  test('the kit is resolved from the answer with the shared helper, never under a style lock', () => {
    expect(goalSetup).toMatch(/const libraryKit = styleLock \? null : libraryKitForEquipment\(equipment\);/);
  });

  test('the saved profile stores the mapped equipment PROFILE, never the raw answer', () => {
    const profileBuild = save.slice(
      save.indexOf('const updatedProfile = {'),
      save.indexOf('// Recalculate nutrition.'),
    );
    expect(profileBuild).toMatch(/equipment: generationEquipmentFor\(equipment\),/);
    expect(profileBuild).not.toMatch(/^\s+equipment,\s*$/m);
  });

  test('the kit path calls the library install and never the generator', () => {
    expect(kitBlock.length).toBeGreaterThan(0);
    expect(kitBlock).toMatch(/if \(!styleLock && libraryKit\) \{/);
    expect(kitBlock).toMatch(/installLibraryPlanForKit\(user\?\.id, \{/);
    expect(kitBlock).toMatch(/kit: libraryKit,/);
    expect(kitBlock).not.toMatch(/prepareStartWithPlan|commitStartWithPlan|generateAndSavePlan|generatePlanDryRun|capabilityPreflight/);
  });

  test('the kit path runs the D139 mid-block confirm through the install hook, naming the plan, and a no is silent', () => {
    expect(kitBlock).toMatch(/confirm: \(\{ planName \}\) => confirmPlanSwitchMidBlock\(user\?\.id, \{ newPlanName: planName \}\)/);
    expect(kitBlock).toMatch(/if \(install\.error === 'cancelled'\) return;/);
    // The generic rebuild-worded confirm is not the kit answer's case.
    expect(save).toMatch(/if \(!styleLock && !libraryKit\) \{\s*\n\s*const proceed = await confirmPlanSwitchMidBlock\(user\?\.id, \{ mode: 'rebuild' \}\)/);
  });

  test('FF-002: the install runs BEFORE anything is written, so a no or a failure leaves everything as it was', () => {
    const installAt = save.indexOf('installLibraryPlanForKit(user?.id, {');
    expect(installAt).toBeGreaterThan(-1);
    for (const write of [
      'await AsyncStorage.setItem(NUTRITION_KEY, JSON.stringify(nextTargets));',
      'await saveNutritionTargets(user.id, nextTargets);',
      'await saveLocalProfile(user.id, updatedProfile);',
      'await setPeakWeekShowDate(user.id, trimmedShowDate || null);',
    ]) {
      const at = save.indexOf(write);
      expect(at).toBeGreaterThan(installAt);
    }
    // The failure branch returns before the profile build.
    const failAt = kitBlock.indexOf('if (!install.ok) {');
    expect(failAt).toBeGreaterThan(-1);
    expect(kitBlock.slice(failAt)).toMatch(/toast\.show\(kitInstallFailedLine\(libraryKit\), \{ variant: 'error', duration: 5000 \}\);\s*\n\s*return;/);
  });

  test('a failed install says so calmly, with the reason logged, and names the route that can add the plan', () => {
    expect(kitBlock).toMatch(/logError\('ProGoalSetupScreen\.installKitPlan', e, \{ userId: user\?\.id \}\);/);
    expect(kitBlock).toMatch(/logWarn\('ProGoalSetupScreen\.installKitPlan', install\.error \?\? 'unknown', \{ userId: user\?\.id \}\);/);
    expect(goalSetup).toMatch(/function kitInstallFailedLine\(kit\) \{\s*\n\s*return `Couldn't add the \$\{libraryKitWord\(kit\)\} plan, so nothing was changed\. Try again, or choose a \$\{libraryKitWord\(kit\)\} plan in the Plan Library\.`;/);
    expect(goalSetup).not.toMatch(/Couldn't add the [^`]*—/);
  });

  test('an installed plan reaches the plan slot as done: nothing to preview, nothing to generate', () => {
    expect(save).toMatch(/\} else if \(installedPlan\) \{\s*\n(\s*\/\/[^\n]*\n)*\s*planResult = \{ ok: true, planName: installedPlan\.planName \};/);
    const installedBranch = save.slice(
      save.indexOf('} else if (installedPlan) {'),
      save.indexOf('const prep = await prepareStartWithPlan('),
    );
    expect(installedBranch).not.toMatch(/prepareStartWithPlan|commitStartWithPlan/);
    // No failure or capability toast for the installed plan: the receipt
    // carries the line.
    expect(save).toMatch(/\} else if \(installedPlan\) \{\s*\n\s*\/\/ The summary carries the one shared line/);
  });

  test('the receipt shows the shared installed line and never claims a plan was built for them', () => {
    expect(goalSetup).toMatch(/planInstalledKit: installedPlan\?\.kit \?\? null,/);
    expect(goalSetup).toMatch(/planInstalledName: installedPlan\?\.planName \?\? null,/);
    expect(goalSummary).toMatch(/planInstalledKit = null, planInstalledName = null,/);
    expect(goalSummary).toMatch(/import \{ libraryKitInstalledLine \} from '\.\.\/lib\/startWithPlan'/);
    const installedAt = goalSummary.indexOf(': planInstalledKit');
    const rerolledAt = goalSummary.indexOf(': planRerolled');
    expect(installedAt).toBeGreaterThan(-1);
    // Read BEFORE planRerolled, which would otherwise call it "built for you".
    expect(installedAt).toBeLessThan(rerolledAt);
    const branch = goalSummary.slice(installedAt, rerolledAt);
    expect(branch).toMatch(/\$\{libraryKitInstalledLine\(planInstalledKit, planInstalledName\)\} It is now your active plan and your next session comes from it\. Review the full plan from Train\./);
    expect(branch).not.toMatch(/built for your new goal|rebuild this time|Start with a plan/);
  });

  test('the form says what a kit answer does as soon as it is chosen, in the shared words, and hides the rebuild wording', () => {
    expect(goalSetup).toMatch(/\{libraryKit \? \(\s*<Text[^>]*>\{libraryKitOfferLine\(libraryKit\)\}<\/Text>/);
    expect(goalSetup).not.toMatch(/plans built for this kit/);
    expect(goalSetup).toMatch(/\{hasCircuitGroups && !libraryKit \? \(/);
  });

  test('the primary action routes by answer, names what it does, and runs once at a time', () => {
    expect(goalSetup).toMatch(/\? `Add the \$\{libraryKitWord\(libraryKit\)\} plan`\s*: 'Review my plan changes'/);
    expect(goalSetup).toMatch(/title=\{primaryLabel\}/);
    expect(goalSetup).toMatch(/accessibilityLabel=\{primaryLabel\}/);
    expect(goalSetup).toMatch(/loading=\{saving\}/);
    expect(goalSetup).toMatch(/disabled=\{!canSave \|\| saving\}/);
    expect(save).toMatch(/if \(savingRef\.current\) return;\s*\n\s*savingRef\.current = true;/);
  });

  test('the generating path is untouched: prepare, sheet and commit stand', () => {
    expect(goalSetup).toMatch(/prepareStartWithPlan\(user\.id, updatedProfile, \{\s*\n\s*mode: 'goal',/);
    expect(goalSetup).toMatch(/confirmLabel="Confirm and rebuild"/);
    expect(goalSetup).toMatch(/planResult = await commitStartWithPlan\(user\.id, updatedProfile\);/);
  });
});
