/**
 * startWithPlan.libraryKit.test.js — final certification 2026-09-05,
 * F-16 REVISED points 1 and 3
 * (docs/final-certification-2026-09-05/07-FINDINGS.md, on evidence A2/A12 and
 * the "F-16 INVESTIGATION" appendix in 04-TRAINING-STYLES.md).
 *
 * What this suite pins and why. The investigation measured the real generator
 * against the real corpus and found it CANNOT honestly build a kettlebell-only
 * plan (zero kettlebell exercises when blended with bodyweight; `shoulders` at
 * zero planned sets when kept pure) or a differentiated band plan (every band
 * row is already inside the shipped `bodyweight` option). So answering
 * "Kettlebells" or "Bands" must install a LIBRARY plan, never generate one.
 *
 * Written to FAIL if:
 *  - the selection stops reading the real library's own tags, or stops being
 *    deterministic (a recommendation that depends on row order is a different
 *    plan on a different device);
 *  - a kit answer is ever allowed to reach a plan built for other kit;
 *  - the install stops starting a training block, which is the one thing a
 *    generated plan does that a bare copy does not;
 *  - the equipment ANSWER ('kettlebells'/'bands') is ever handed to an engine
 *    as an equipment PROFILE. planEngine.filterPool and swapEngine.rankSwaps
 *    both do a bare membership test against a closed six-value vocabulary, so
 *    an unknown string empties the pool rather than filtering it.
 */

jest.mock('../database', () => ({
  getActivePlan: jest.fn(async () => null),
  getRoutinesForPlan: jest.fn(async () => []),
  getRoutineExercisesWithDetails: jest.fn(async () => []),
  getAllPlansForUser: jest.fn(async () => []),
  getLibraryPlans: jest.fn(async () => []),
  copyPlanFromLibrary: jest.fn(async () => ({ id: 'copy-1' })),
  activatePlanWithBlock: jest.fn(async () => {}),
}));

jest.mock('../planAutoGen', () => ({
  generatePlanDryRun: jest.fn(),
  generateAndSavePlan: jest.fn(),
  thinSessionReport: jest.fn(() => []),
}));

jest.mock('../capability/preflight', () => ({
  capabilityPreflight: jest.fn(async () => ({ proceed: true })),
  offerCapabilityPreflightChoice: jest.fn(),
}));

jest.mock('../planRationale', () => ({ buildChangeReceipt: jest.fn(() => null) }));
jest.mock('../errorLog', () => ({ logError: jest.fn(), logWarn: jest.fn(), logInfo: jest.fn() }));

const { LIBRARY_PLANS } = require('../seedRoutines');
const {
  getLibraryPlans, copyPlanFromLibrary, activatePlanWithBlock,
} = require('../database');
const { generateAndSavePlan } = require('../planAutoGen');
const {
  pickLibraryPlanForKit, libraryKitForEquipment, generationEquipmentFor,
  libraryKitInstalledLine, installLibraryPlanForKit,
} = require('../startWithPlan');

// The real library, with the ids a seeded row would carry.
const SEEDED = LIBRARY_PLANS.map((p, i) => ({ ...p, id: `lib-${i}` }));

const pick = (answers) => pickLibraryPlanForKit(answers, SEEDED);

beforeEach(() => { jest.clearAllMocks(); });

describe('libraryKitForEquipment / generationEquipmentFor', () => {
  test('only the two kit answers map to a kit', () => {
    expect(libraryKitForEquipment('kettlebells')).toBe('kettlebell');
    expect(libraryKitForEquipment('bands')).toBe('band');
    for (const ordinary of ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight']) {
      expect(libraryKitForEquipment(ordinary)).toBeNull();
    }
    expect(libraryKitForEquipment(null)).toBeNull();
  });

  test('the raw answer NEVER reaches an engine as an equipment profile', () => {
    const PROFILES = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'];
    expect(PROFILES).toContain(generationEquipmentFor('kettlebells'));
    expect(PROFILES).toContain(generationEquipmentFor('bands'));
    // The profile chosen is the one that keeps the kit's own style pool
    // whole: kettlebell rows carry home_gym, band rows carry bodyweight.
    expect(generationEquipmentFor('kettlebells')).toBe('home_gym');
    expect(generationEquipmentFor('bands')).toBe('bodyweight');
  });

  test('every other answer passes straight through, unchanged', () => {
    for (const ordinary of ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight']) {
      expect(generationEquipmentFor(ordinary)).toBe(ordinary);
    }
  });
});

describe('pickLibraryPlanForKit: days x experience -> plan name', () => {
  // The contract, stated as a table against the REAL library tags.
  const CASES = [
    // kettlebells, beginner -> the foundations pool
    { kit: 'kettlebell', experience: 'beginner', daysPerWeek: 2, name: 'Kettlebell Foundations: 2 Days' },
    { kit: 'kettlebell', experience: 'beginner', daysPerWeek: 3, name: 'Kettlebell Foundations: 3 Days' },
    { kit: 'kettlebell', experience: 'beginner', daysPerWeek: 4, name: 'Kettlebell Foundations: 3 Days' },
    { kit: 'kettlebell', experience: 'beginner', daysPerWeek: 6, name: 'Kettlebell Foundations: 3 Days' },
    // kettlebells, anyone else -> the experienced pool
    { kit: 'kettlebell', experience: 'intermediate', daysPerWeek: 2, name: 'Kettlebell Strength: 3 Days' },
    { kit: 'kettlebell', experience: 'intermediate', daysPerWeek: 3, name: 'Kettlebell Strength: 3 Days' },
    { kit: 'kettlebell', experience: 'intermediate', daysPerWeek: 4, name: 'Kettlebell Strength: 4 Days' },
    { kit: 'kettlebell', experience: 'advanced', daysPerWeek: 5, name: 'Kettlebell Strength: 4 Days' },
    { kit: 'kettlebell', experience: 'competitive', daysPerWeek: 6, name: 'Kettlebell Strength: 4 Days' },
    // bands -> Full Body for three days or fewer, Upper/Lower for four or more
    { kit: 'band', experience: 'beginner', daysPerWeek: 2, name: 'Full Body: Bands' },
    { kit: 'band', experience: 'beginner', daysPerWeek: 3, name: 'Full Body: Bands' },
    { kit: 'band', experience: 'intermediate', daysPerWeek: 3, name: 'Full Body: Bands' },
    { kit: 'band', experience: 'beginner', daysPerWeek: 4, name: 'Upper/Lower: Bands' },
    { kit: 'band', experience: 'advanced', daysPerWeek: 6, name: 'Upper/Lower: Bands' },
  ];

  for (const c of CASES) {
    test(`${c.kit} / ${c.experience} / ${c.daysPerWeek} days -> ${c.name}`, () => {
      expect(pick(c)?.name).toBe(c.name);
    });
  }

  test('a circuit plan is never installed by an onboarding answer', () => {
    for (const experience of ['beginner', 'intermediate', 'advanced', 'competitive']) {
      for (const daysPerWeek of [2, 3, 4, 5, 6]) {
        for (const kit of ['kettlebell', 'band']) {
          const p = pick({ kit, experience, daysPerWeek });
          expect(String(p.tags)).not.toMatch(/(^|\s)circuit(\s|$)/);
        }
      }
    }
  });

  test('the pick always carries the kit it was asked for', () => {
    for (const kit of ['kettlebell', 'band']) {
      for (const daysPerWeek of [2, 3, 4, 5, 6]) {
        expect(pick({ kit, experience: 'beginner', daysPerWeek }).tags).toContain(`equipment:${kit}`);
      }
    }
  });

  test('deterministic: the answer never depends on library row order', () => {
    const shuffled = [...SEEDED].reverse();
    for (const kit of ['kettlebell', 'band']) {
      for (const experience of ['beginner', 'intermediate']) {
        for (const daysPerWeek of [2, 3, 4, 5, 6]) {
          const answers = { kit, experience, daysPerWeek };
          expect(pickLibraryPlanForKit(answers, shuffled).name)
            .toBe(pickLibraryPlanForKit(answers, SEEDED).name);
        }
      }
    }
  });

  test('no kit, no plans, or a kit the library has nothing for: null, never a guess', () => {
    expect(pickLibraryPlanForKit({ kit: null, daysPerWeek: 3 }, SEEDED)).toBeNull();
    expect(pickLibraryPlanForKit({ kit: 'kettlebell', daysPerWeek: 3 }, [])).toBeNull();
    expect(pickLibraryPlanForKit({ kit: 'suspension', daysPerWeek: 3 }, SEEDED)).toBeNull();
  });
});

describe('libraryKitInstalledLine', () => {
  test('says the plan is one Volyume already has, and never claims it was generated', () => {
    const line = libraryKitInstalledLine('kettlebell', 'Kettlebell Foundations: 3 Days');
    expect(line).toBe('Volyume has kettlebell plans built for this kit. Kettlebell Foundations: 3 Days fits your week.');
    expect(line).not.toMatch(/built you|generated|created for you/i);
    expect(libraryKitInstalledLine('band', 'Full Body: Bands'))
      .toBe('Volyume has band plans built for this kit. Full Body: Bands fits your week.');
  });

  test('British English, and no em dash in user-facing copy', () => {
    for (const kit of ['kettlebell', 'band']) {
      const line = libraryKitInstalledLine(kit, 'Plan');
      expect(line).not.toContain('—');
      expect(line).not.toMatch(/customize|program\b|optimize/i);
    }
  });
});

describe('installLibraryPlanForKit', () => {
  test('copies the library plan AND starts a block, exactly as generation would', async () => {
    getLibraryPlans.mockResolvedValueOnce(SEEDED);
    const res = await installLibraryPlanForKit('u1', { kit: 'band', daysPerWeek: 4, experience: 'intermediate' });
    expect(res.ok).toBe(true);
    expect(res.planName).toBe('Upper/Lower: Bands');
    expect(res.programmeId).toBe('copy-1');
    const [libId, userId] = copyPlanFromLibrary.mock.calls[0];
    expect(userId).toBe('u1');
    expect(SEEDED.find(p => p.id === libId).name).toBe('Upper/Lower: Bands');
    // The block is what a bare copy would leave out.
    expect(activatePlanWithBlock).toHaveBeenCalledWith('u1', 'copy-1', 'Upper/Lower: Bands');
  });

  test('the generator is never called for a kit answer', async () => {
    getLibraryPlans.mockResolvedValueOnce(SEEDED);
    await installLibraryPlanForKit('u1', { kit: 'kettlebell', daysPerWeek: 3, experience: 'beginner' });
    expect(generateAndSavePlan).not.toHaveBeenCalled();
  });

  test('a library with no plan for the kit refuses rather than installing something else', async () => {
    getLibraryPlans.mockResolvedValueOnce([]);
    const res = await installLibraryPlanForKit('u1', { kit: 'kettlebell', daysPerWeek: 3, experience: 'beginner' });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('no_library_plan_for_kit');
    expect(copyPlanFromLibrary).not.toHaveBeenCalled();
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  });

  test('a failed copy never activates anything', async () => {
    getLibraryPlans.mockResolvedValueOnce(SEEDED);
    copyPlanFromLibrary.mockResolvedValueOnce(null);
    const res = await installLibraryPlanForKit('u1', { kit: 'band', daysPerWeek: 3, experience: 'beginner' });
    expect(res.ok).toBe(false);
    expect(activatePlanWithBlock).not.toHaveBeenCalled();
  });

  test('no user and no kit are refusals, not silent no-ops that report success', async () => {
    expect((await installLibraryPlanForKit(null, { kit: 'band' })).ok).toBe(false);
    expect((await installLibraryPlanForKit('u1', {})).ok).toBe(false);
  });
});
