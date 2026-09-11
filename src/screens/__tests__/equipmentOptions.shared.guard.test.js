/**
 * equipmentOptions.shared.guard.test.js — founder task 2026-09-11: ONE shared,
 * ordered equipment answer list for first run (ProOnboardingScreen) and
 * Adjust training (PlanUpdateScreen), with Kettlebells and Bands behaving
 * identically on both.
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

describe('both screens render the shared list and nothing else', () => {
  test.each([
    ['ProOnboardingScreen.js', onboarding],
    ['PlanUpdateScreen.js', planUpdate],
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
