/**
 * planEngineSecondaryMuscle.test.js
 *
 * D46 (founder, 2026-07-11): the full secondary-muscle model. Diagnosed by
 * the founder ("maybe it's not counting secondary muscles") after a leg+abs
 * day gave every individual leg muscle its own exercise: the engine's
 * `entry.secondary` reporting hook existed but NO POOL entry populated it,
 * and the only synergist credit was the hardcoded biceps<-back /
 * triceps<-chest weekly trims. So a leg day stacked dedicated glute
 * isolation (hip thrust + step-up) on top of squats and RDLs that already
 * train the glutes hard.
 *
 * The model, both halves, pinned behaviourally against the REAL engine:
 *  - Half A: POOL entries carry seed-mirrored `secondary` tags, so the
 *    weekly summary's indirectSets (RP half-set convention) is finally live.
 *  - Half B: the weekly synergist trim is generalised to the lower body
 *    (glutes <- quads 0.3, glutes <- hamstrings 0.4). A division-de-emphasised
 *    structural muscle (overlay < 1.0) owes its maintenance floor
 *    EFFECTIVELY (direct + indirect) and keeps a minimum of ONE honest
 *    3-set direct entry; judged/neutral muscles keep the MEV + 2 direct
 *    floor untouched; bikini/wellness glutes are exempt outright (their
 *    glute volume IS the division signature); weak points are never trimmed.
 */
import { generatePlan } from '../planEngine';

const BASE = {
  experience: 'intermediate',
  sessionLengthMinutes: 75,
  equipment: 'full_gym',
  phase: 'lean_gain',
  weakPoints: [],
  recoveryRating: 'average',
  nutritionPhase: 'maintain',
};

const GLUTE_POOL_NAMES = [
  'Barbell Hip Thrust', 'Smith Machine Hip Thrust', 'Dumbbell Hip Thrust',
  'Cable Pull-Through', 'Glute Bridge', 'Step-Up (Dumbbell)',
  'Abductor Machine', 'Cable Hip Abduction',
];
const gluteExercisesIn = (w) =>
  w.exercises.filter((e) => GLUTE_POOL_NAMES.includes(e.exerciseName)).length;

describe('D46 half A: indirect (secondary-muscle) volume reporting is live', () => {
  test('a squat + hinge week reports non-zero indirect glute and biceps volume', () => {
    const plan = generatePlan({
      ...BASE, experience: 'advanced', daysPerWeek: 6, goal: 'classic_physique',
    });
    const s = plan.weeklyVolumeSummary;
    expect(s.glutes.indirectSets).toBeGreaterThan(0);
    expect(s.biceps.indirectSets).toBeGreaterThan(0);
    expect(s.triceps.indirectSets).toBeGreaterThan(0);
  });
});

describe('D46 half B: de-emphasised glutes are credited for squat/hinge work', () => {
  test('the founder case: a Men\'s Physique leg day carries at most ONE glute-pool exercise', () => {
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const plan = generatePlan({ ...BASE, daysPerWeek, goal: 'mens_physique' });
      for (const w of plan.workouts) {
        expect(gluteExercisesIn(w)).toBeLessThanOrEqual(1);
      }
    }
  });

  test('effective glute volume (direct + indirect) never falls below the maintenance floor, on EVERY equipment', () => {
    // Equipment matters: the adversarial review caught the first cut of this
    // trim crediting indirect glute work that a thin pool (bodyweight quads =
    // sissy squats; machine-only hamstrings = leg curls) cannot deliver. The
    // trim now requires each driver's equipment-filtered pool to offer a
    // glute-tagged compound, so this must hold everywhere - not just full_gym.
    // C16 CLOSURE: 3-6 days. The invariant's premise is that glutes are
    // carried indirectly by the squat and hinge work around them, and that
    // premise needs those compounds to BE in the week. Two sessions with
    // bodyweight or machines-only equipment may not contain them at all,
    // and the plan says so - it returns USER_DECISION_REQUIRED rather than
    // quietly under-delivering. That case is pinned as its own test below
    // rather than asserted here, where it would be asserting a floor the
    // equipment cannot reach.
    for (const equipment of ['full_gym', 'barbell_plates', 'dumbbells_only', 'home_gym', 'machines_cables', 'bodyweight'])
    for (const goal of ['general', 'mens_physique', 'classic_physique', 'bodybuilding', 'bikini', 'wellness'])
    for (const daysPerWeek of [3, 4, 5, 6])
    for (const experience of ['beginner', 'intermediate', 'advanced']) {
      const plan = generatePlan({ ...BASE, equipment, experience, daysPerWeek, goal });
      const g = plan.weeklyVolumeSummary.glutes;
      const maint = daysPerWeek <= 3 ? 4 : 6;
      expect(g.plannedSets + g.indirectSets).toBeGreaterThanOrEqual(maint);
    }
  });

  test('thin-equipment regression pin: bodyweight / machine-only Men\'s Physique keeps its full direct glute floor', () => {
    // The exact review reproduction: these pools have no glute-tagged
    // compound on one or both drivers, so the trim must not fire at all and
    // DIRECT delivery alone must reach the maintenance floor, as it did
    // before D46.
    for (const equipment of ['bodyweight', 'machines_cables'])
    for (const daysPerWeek of [4, 5]) {
      const plan = generatePlan({
        ...BASE, experience: 'beginner', daysPerWeek, goal: 'mens_physique',
        equipment, sessionLengthMinutes: 60,
      });
      const maint = daysPerWeek <= 3 ? 4 : 6;
      expect(plan.weeklyVolumeSummary.glutes.plannedSets).toBeGreaterThanOrEqual(maint);
    }
  });

  test('trimmed glutes always keep one honest direct entry (never a 1-2 set sliver, never zero)', () => {
    for (const goal of ['mens_physique', 'classic_physique', 'general'])
    for (const daysPerWeek of [2, 3, 4, 5, 6]) {
      const plan = generatePlan({ ...BASE, daysPerWeek, goal });
      expect(plan.weeklyVolumeSummary.glutes.plannedSets).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('D46 at TWO days: the premise does not hold, and the plan says so', () => {
  // C16 CLOSURE. Two-day support is new, so this combination has never been
  // generated before. Where a thin pool leaves a two-day plan unable to
  // reach the glute maintenance floor, the contract is that it must NOT
  // pretend otherwise: the plan carries USER_DECISION_REQUIRED, which is
  // the founder's structured constraint result, and the user is offered a
  // real choice rather than a silently thinner plan.
  test('a two-day plan that cannot reach the floor reports the constraint', () => {
    const cases = [
      { equipment: 'bodyweight', goal: 'classic_physique', experience: 'intermediate' },
      { equipment: 'bodyweight', goal: 'bodybuilding', experience: 'intermediate' },
      { equipment: 'machines_cables', goal: 'mens_physique', experience: 'beginner' },
    ];
    for (const c of cases) {
      const plan = generatePlan({ ...BASE, daysPerWeek: 2, ...c });
      const g = plan.weeklyVolumeSummary.glutes;
      const short = (g.plannedSets + g.indirectSets) < 4;
      if (short) {
        expect({ ...c, status: plan.timeConstraint.status })
          .toEqual({ ...c, status: 'user_decision_required' });
      }
      // And never zero: a muscle the plan trains is always trained.
      expect(g.plannedSets).toBeGreaterThan(0);
    }
  });

  test('a two-day plan with real equipment DOES reach the floor', () => {
    for (const equipment of ['full_gym', 'dumbbells_only', 'home_gym', 'barbell_plates']) {
      for (const goal of ['general', 'mens_physique', 'classic_physique', 'bodybuilding']) {
        const plan = generatePlan({ ...BASE, daysPerWeek: 2, goal, equipment });
        const g = plan.weeklyVolumeSummary.glutes;
        expect({ equipment, goal, ok: (g.plannedSets + g.indirectSets) >= 4 })
          .toEqual({ equipment, goal, ok: true });
      }
    }
  });
});

describe('D46 exemptions', () => {
  test('glute-emphasised divisions (overlay >= 1.2) are never discounted (division signature)', () => {
    for (const goal of ['bikini', 'wellness'])
    for (const daysPerWeek of [3, 4, 5, 6]) {
      const plan = generatePlan({ ...BASE, daysPerWeek, goal });
      // Heavy direct glute work stays: far above any trimmed level.
      expect(plan.weeklyVolumeSummary.glutes.plannedSets).toBeGreaterThanOrEqual(12);
    }
    // Figure (1.25) and Women's Physique (1.20) are exempt by the same
    // overlay rule: delivery stays ABOVE the MEV + 2 trim floor (8), which
    // it could not if the trim had bitten. (coachDivisions.test.js pins
    // figure's exact stage-2b threshold.)
    for (const goal of ['figure', 'womens_physique']) {
      const plan = generatePlan({ ...BASE, daysPerWeek: 5, goal });
      expect(plan.weeklyVolumeSummary.glutes.plannedSets).toBeGreaterThan(8);
    }
  });

  test('a glutes weak point is never trimmed: direct volume at least matches the un-weak-pointed plan', () => {
    for (const goal of ['mens_physique', 'general'])
    for (const daysPerWeek of [4, 5]) {
      const plain = generatePlan({ ...BASE, daysPerWeek, goal });
      const boosted = generatePlan({ ...BASE, daysPerWeek, goal, weakPoints: ['Glutes'] });
      expect(boosted.weeklyVolumeSummary.glutes.plannedSets)
        .toBeGreaterThanOrEqual(plain.weeklyVolumeSummary.glutes.plannedSets);
      expect(boosted.weeklyVolumeSummary.glutes.isWeakPoint).toBe(true);
    }
  });

  test('judged and neutral divisions keep their direct glute programming (no behaviour change)', () => {
    // classic_physique glutes (overlay 1.05, judged) and general (no overlay,
    // neutral) sit at/below the MEV + 2 trim floor, so the trim must not move
    // them - pinned so a future rate change cannot silently reach them.
    for (const goal of ['classic_physique', 'general']) {
      const plan = generatePlan({ ...BASE, experience: 'advanced', daysPerWeek: 6, goal });
      expect(plan.weeklyVolumeSummary.glutes.plannedSets).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('D46 stays within the engine\'s standing guarantees', () => {
  test('D45 session caps still hold across the sweep', () => {
    for (const goal of ['general', 'mens_physique', 'classic_physique', 'bikini', 'bodybuilding'])
    for (const daysPerWeek of [2, 4, 6]) {
      const plan = generatePlan({ ...BASE, daysPerWeek, goal });
      for (const w of plan.workouts) {
        expect(w.exercises.length).toBeLessThanOrEqual(8);
        expect(w.exercises.reduce((s, e) => s + e.sets, 0)).toBeLessThanOrEqual(25);
      }
    }
  });

  test('determinism holds with the secondary-muscle model in place', () => {
    const inputs = { ...BASE, daysPerWeek: 5, goal: 'mens_physique' };
    expect(JSON.stringify(generatePlan(inputs))).toBe(JSON.stringify(generatePlan(inputs)));
  });
});
