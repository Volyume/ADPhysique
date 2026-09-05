/**
 * ProOnboardingScreen.libraryKit.guard.test.js — final certification
 * 2026-09-05, F-16 REVISED point 1
 * (docs/final-certification-2026-09-05/07-FINDINGS.md, evidence A12 and the
 * "F-16 INVESTIGATION" appendix in 04-TRAINING-STYLES.md).
 *
 * What this suite pins and why. A kettlebell or band owner had no honest
 * answer at the equipment question and had to claim dumbbells or a home gym,
 * and was then handed a generated plan full of kit they do not own (A12). The
 * investigation then measured the generator and found it cannot build either
 * kit, so the two new answers must install a LIBRARY plan instead.
 *
 * Written to FAIL if:
 *  - either answer disappears from the equipment step;
 *  - the equipment question gains a DEFAULT (onboarding enforcement, CLAUDE.md
 *    section 2: every required field blocks progression until explicitly
 *    chosen, no defaults, no tap-through);
 *  - a kit answer ever reaches the generator;
 *  - the raw 'kettlebells'/'bands' answer is ever stored or handed to an
 *    engine as an equipment PROFILE (planEngine.filterPool and
 *    swapEngine.rankSwaps both do a bare membership test against a closed
 *    six-value vocabulary, so an unknown string empties the pool);
 *  - the completion line claims Volyume generated the plan.
 *
 * Source-level guard (the fs.readFileSync + regex pattern this repo already
 * uses for founder-locked rules): the screen pulls the whole SQLite/native
 * import graph, and what needs pinning is textual and structural.
 */
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'ProOnboardingScreen.js'), 'utf8');
const startWithPlanSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'lib', 'startWithPlan.js'), 'utf8',
);

const equipmentBlock = source.slice(
  source.indexOf('const EQUIPMENT_OPTIONS = ['),
  source.indexOf('const RECOVERY_OPTIONS = ['),
);

describe('F-16 REVISED: the equipment step offers Kettlebells and Bands', () => {
  test('both answers exist, with the copy the ruling names', () => {
    expect(equipmentBlock).toMatch(/value: 'kettlebells',\s*label: 'Kettlebells',\s*sub: 'One or two kettlebells, no other weights'/);
    expect(equipmentBlock).toMatch(/value: 'bands',\s*label: 'Bands',\s*sub: 'Resistance bands, no weights'/);
  });

  test('the six original answers are untouched', () => {
    for (const v of ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight']) {
      expect(equipmentBlock).toContain(`value: '${v}'`);
    }
  });

  test('no answer is a default: equipment starts null and blocks progression', () => {
    expect(source).toMatch(/const \[equipment, setEquipment\] = useState\(null\);/);
    expect(source).toMatch(/if \(!equipment\) errs\.equipment = 'Choose your equipment\.';/);
  });

  test('user-facing copy stays British English with no em dash', () => {
    const subs = [...equipmentBlock.matchAll(/sub: '([^']+)'/g)].map(m => m[1]);
    expect(subs.length).toBeGreaterThanOrEqual(8);
    for (const s of subs) {
      expect(s).not.toContain('—');
      expect(s).not.toMatch(/customize|optimize|color\b/i);
    }
  });
});

describe('F-16 REVISED: a kit answer installs a library plan and never generates', () => {
  test('the kit is resolved from the answer before the build', () => {
    expect(source).toMatch(/const libraryKit = libraryKitForEquipment\(equipment\);/);
  });

  test('the kit branch calls the library install, not the generator', () => {
    const branch = source.slice(
      source.indexOf('} else if (libraryKit) {'),
      source.indexOf('// CC27 (section 9.6): capability pre-flight before the first'),
    );
    expect(branch).toMatch(/installLibraryPlanForKit\(user\.id, \{/);
    expect(branch).not.toMatch(/generateAndSavePlan/);
  });

  test('the generator call sits on the ordinary else branch only', () => {
    // Every generateAndSavePlan call in the build path is inside the branch
    // that runs when libraryKit is null (or the explicit user-driven retry).
    const buildSection = source.slice(
      source.indexOf('const libraryKit = libraryKitForEquipment(equipment);'),
      source.indexOf('} catch (e) {', source.indexOf('const libraryKit = libraryKitForEquipment(equipment);')),
    );
    expect(buildSection).toMatch(/} else \{\s*\n\s*\/\/ CC27/);
  });

  test('the schedule-fit gate is skipped for a kit answer, because no plan is generated', () => {
    expect(source).toMatch(/if \(!fitAccepted && !libraryKitForEquipment\(equipment\)\) \{/);
  });
});

describe('F-16 REVISED: the answer is never stored as an equipment profile', () => {
  test('the profile handed to any engine is mapped', () => {
    expect(source).toMatch(/equipment: generationEquipmentFor\(equipment\),/);
    // Twice: the plan profile the build uses, and the persisted userProfile.
    expect((source.match(/equipment: generationEquipmentFor\(equipment\),/g) || []).length).toBe(2);
  });

  test('no bare `equipment,` shorthand survives in either of those objects', () => {
    const profileNow = source.slice(
      source.indexOf('function planProfileNow(overrides = {}) {'),
      source.indexOf('Ask the engine what it would actually build'),
    );
    expect(profileNow).not.toMatch(/^\s+equipment,\s*$/m);
  });

  test('the mapping itself only ever produces a real equipment profile', () => {
    const map = startWithPlanSource.slice(startWithPlanSource.indexOf('const LIBRARY_KIT_BY_EQUIPMENT = Object.freeze({'));
    expect(map).toMatch(/kettlebells: Object\.freeze\(\{ kit: 'kettlebell', generationEquipment: 'home_gym' \}\)/);
    expect(map).toMatch(/bands: Object\.freeze\(\{ kit: 'band', generationEquipment: 'bodyweight' \}\)/);
  });
});

describe('F-16 REVISED: one honest line, no claim of generation', () => {
  test('the completion line is the shared library-install line', () => {
    expect(source).toMatch(/appAlert\('Plan ready', libraryKitInstalledLine\(libraryKit, planResult\.planName\)\);/);
  });

  test('the generation-only shortfall notes cannot fire for a kit install', () => {
    const successBranch = source.slice(
      source.indexOf("} else if (libraryKit) {\n          // F-16 REVISED: ONE line"),
      source.indexOf('} else {\n          if (planResult.partial) {'),
    );
    expect(successBranch).not.toMatch(/planShortfallNote|capabilityBlockedNote/);
  });

  test('a failed install points at the library, not at "Start with a plan", which generates', () => {
    expect(source).toMatch(/browse the plan library and choose a \$\{libraryKit === 'kettlebell' \? 'kettlebell' : 'band'\} plan/);
  });
});
