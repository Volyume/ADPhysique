import {
  estimateWorkoutMinutes,
  generatePlan,
  GOAL_LABELS,
  SPLIT_LABELS,
} from '../planEngine';

// ─── GOAL_LABELS ──────────────────────────────────────────────────────────────

describe('GOAL_LABELS', () => {
  // Post-merge: PHYSIQUE_GOALS contains physique categories only. The
  // displaced "training methodologies" (Build Muscle / Strength + Size /
  // Bring Up a Weak Point) moved to TRAINING_PHASES.
  test('general label exists (default for non-competitive users)', () => {
    expect(GOAL_LABELS.general).toBeDefined();
  });

  test('legacy generic / strength / weak-point labels are gone', () => {
    expect(GOAL_LABELS.general_hypertrophy).toBeUndefined();
    expect(GOAL_LABELS.strength_hypertrophy).toBeUndefined();
    expect(GOAL_LABELS.weak_point_spec).toBeUndefined();
  });

  test('competitive physique labels still present', () => {
    expect(GOAL_LABELS.mens_physique).toBeDefined();
    expect(GOAL_LABELS.bodybuilding).toBeDefined();
    expect(GOAL_LABELS.bikini).toBeDefined();
  });

  test('all values are non-empty strings', () => {
    for (const [, value] of Object.entries(GOAL_LABELS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

// ─── SPLIT_LABELS ─────────────────────────────────────────────────────────────

describe('SPLIT_LABELS', () => {
  test('full_body label is defined', () => {
    expect(SPLIT_LABELS.full_body).toBe('Full Body');
  });

  test('upper_lower label is defined', () => {
    expect(SPLIT_LABELS.upper_lower).toBe('Upper / Lower');
  });

  test('ppl label is defined', () => {
    expect(SPLIT_LABELS.ppl).toBe('Push / Pull / Legs');
  });

  test('ppl_ab label is defined', () => {
    expect(SPLIT_LABELS.ppl_ab).toBe('PPL A/B (6-day)');
  });

  test('upper_lower_wp label is defined', () => {
    expect(SPLIT_LABELS.upper_lower_wp).toBe('Upper / Lower + Weak-Point Day');
  });
});

// ─── estimateWorkoutMinutes ───────────────────────────────────────────────────

describe('estimateWorkoutMinutes', () => {
  test('returns 0 for an empty exercises array', () => {
    expect(estimateWorkoutMinutes([])).toBe(0);
  });

  test('returns 0 for null input', () => {
    expect(estimateWorkoutMinutes(null)).toBe(0);
  });

  test('returns a positive number given a single isolation exercise', () => {
    const exercises = [
      { sets: 3, restSec: 75 },
    ];
    expect(estimateWorkoutMinutes(exercises)).toBeGreaterThan(0);
  });

  test('returns a positive number given a typical session with compound exercises', () => {
    const exercises = [
      { sets: 4, restSec: 180 }, // heavy compound
      { sets: 3, restSec: 150 }, // mod compound
      { sets: 3, restSec: 75  }, // isolation
    ];
    expect(estimateWorkoutMinutes(exercises)).toBeGreaterThan(0);
  });

  test('more sets means a longer estimated duration', () => {
    const short = [{ sets: 2, restSec: 75 }];
    const long  = [{ sets: 6, restSec: 75 }];
    expect(estimateWorkoutMinutes(long)).toBeGreaterThan(estimateWorkoutMinutes(short));
  });

  test('longer rest periods produce a longer estimate', () => {
    const shortRest = [{ sets: 4, restSec: 60  }];
    const longRest  = [{ sets: 4, restSec: 180 }];
    expect(estimateWorkoutMinutes(longRest)).toBeGreaterThan(estimateWorkoutMinutes(shortRest));
  });

  test('result is a whole number (ceiling applied)', () => {
    const exercises = [{ sets: 3, restSec: 90 }];
    const result = estimateWorkoutMinutes(exercises);
    expect(Number.isInteger(result)).toBe(true);
  });

  test('single isolation set produces an estimate above the 7.5-minute base overhead', () => {
    // Base overhead is 7.5 min; even one set should push total above that.
    const exercises = [{ sets: 1, restSec: 75 }];
    expect(estimateWorkoutMinutes(exercises)).toBeGreaterThan(7);
  });

  test('multiple compounds increase overhead above the base', () => {
    // Each compound beyond the first adds 1 minute overhead per the implementation.
    const oneCompound  = [{ sets: 3, restSec: 180 }];
    const twoCompounds = [{ sets: 3, restSec: 180 }, { sets: 3, restSec: 150 }];
    expect(estimateWorkoutMinutes(twoCompounds)).toBeGreaterThan(estimateWorkoutMinutes(oneCompound));
  });
});

// ─── generatePlan, shape and determinism ────────────────────────────────────

const BASE_INPUTS = {
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionLengthMinutes: 60,
  equipment: 'full_gym',
  goal: 'general',
  phase: 'lean_gain',
  weakPoints: [],
  recoveryRating: 'average',
  nutritionPhase: 'maintain',
};

describe('generatePlan, output shape', () => {
  test('returns an object with the required top-level fields', () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan).toHaveProperty('name');
    expect(plan).toHaveProperty('goal');
    expect(plan).toHaveProperty('splitType');
    expect(plan).toHaveProperty('daysPerWeek');
    expect(plan).toHaveProperty('workouts');
    expect(plan).toHaveProperty('weeklyVolumeSummary');
    expect(plan).toHaveProperty('personalisationSummary');
    expect(plan).toHaveProperty('whyThis');
    expect(plan).toHaveProperty('warnings');
  });

  test('workouts is a non-empty array', () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(Array.isArray(plan.workouts)).toBe(true);
    expect(plan.workouts.length).toBeGreaterThan(0);
  });

  test('each workout has a name, exercises array, and estimatedDurationMinutes', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const w of plan.workouts) {
      expect(typeof w.name).toBe('string');
      expect(Array.isArray(w.exercises)).toBe(true);
      expect(typeof w.estimatedDurationMinutes).toBe('number');
    }
  });

  test('each exercise has sets, repMin, repMax, restSec, and rirTarget', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        expect(typeof ex.sets).toBe('number');
        expect(typeof ex.repMin).toBe('number');
        expect(typeof ex.repMax).toBe('number');
        expect(typeof ex.restSec).toBe('number');
        expect(typeof ex.rirTarget).toBe('number');
      }
    }
  });

  test('exercise sets are at least 2 for every exercise', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        expect(ex.sets).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test('repMax is greater than or equal to repMin for every exercise', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        expect(ex.repMax).toBeGreaterThanOrEqual(ex.repMin);
      }
    }
  });

  test('estimatedDurationMinutes is a positive integer for each workout', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const w of plan.workouts) {
      expect(w.estimatedDurationMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(w.estimatedDurationMinutes)).toBe(true);
    }
  });
});

// ─── generatePlan, split selection ──────────────────────────────────────────

describe('generatePlan, split selection', () => {
  test('intermediate lifter, 4 days → upper_lower split', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'intermediate', daysPerWeek: 4 });
    expect(plan.splitType).toBe('upper_lower');
  });

  test('beginner lifter, 3 days → full_body split', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'beginner', daysPerWeek: 3 });
    expect(plan.splitType).toBe('full_body');
  });

  test('advanced lifter, 3 days → ppl split', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'advanced', daysPerWeek: 3 });
    expect(plan.splitType).toBe('ppl');
  });

  test('6 days → ppl_ab split', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'intermediate', daysPerWeek: 6 });
    expect(plan.splitType).toBe('ppl_ab');
  });

  test('5 days, weak_point phase → upper_lower_wp split', () => {
    // weak_point used to be a "goal" (weak_point_spec) before the merge
    // now it's a phase. Engine maps it back to the legacy split internally.
    const plan = generatePlan({
      ...BASE_INPUTS,
      daysPerWeek: 5,
      phase: 'weak_point',
      weakPoints: ['Side Delts'],
    });
    expect(plan.splitType).toBe('upper_lower_wp');
  });

  test('5 days, general goal → ppl split', () => {
    const plan = generatePlan({ ...BASE_INPUTS, daysPerWeek: 5 });
    expect(plan.splitType).toBe('ppl');
  });
});

// ─── generatePlan, beginner day cap ─────────────────────────────────────────

describe('generatePlan, beginner day cap', () => {
  test('beginner requesting 6 days is capped to 4 days', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'beginner', daysPerWeek: 6 });
    expect(plan.daysPerWeek).toBe(4);
  });

  test('intermediate requesting 6 days is not capped', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'intermediate', daysPerWeek: 6 });
    expect(plan.daysPerWeek).toBe(6);
  });

  test('warning is included when beginner days are reduced', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'beginner', daysPerWeek: 6 });
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.warnings.some(w => /beginner/i.test(w))).toBe(true);
  });
});

// ─── generatePlan, workout count matches effective days ──────────────────────

describe('generatePlan, workout count', () => {
  test('4-day upper_lower plan produces 4 workouts', () => {
    const plan = generatePlan({ ...BASE_INPUTS, daysPerWeek: 4 });
    expect(plan.workouts.length).toBe(4);
  });

  test('3-day ppl plan produces 3 workouts', () => {
    const plan = generatePlan({ ...BASE_INPUTS, experience: 'advanced', daysPerWeek: 3 });
    expect(plan.workouts.length).toBe(3);
  });

  test('5-day upper_lower_wp plan produces 5 workouts', () => {
    const plan = generatePlan({
      ...BASE_INPUTS,
      daysPerWeek: 5,
      phase: 'weak_point',
      weakPoints: ['Biceps'],
    });
    expect(plan.workouts.length).toBe(5);
  });
});

// ─── generatePlan, determinism ───────────────────────────────────────────────

describe('generatePlan, determinism', () => {
  test('identical inputs produce identical exercise names', () => {
    const planA = generatePlan(BASE_INPUTS);
    const planB = generatePlan(BASE_INPUTS);
    const namesA = planA.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    const namesB = planB.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    expect(namesA).toEqual(namesB);
  });

  test('identical inputs produce identical set counts', () => {
    const planA = generatePlan(BASE_INPUTS);
    const planB = generatePlan(BASE_INPUTS);
    const setsA = planA.workouts.flatMap(w => w.exercises.map(e => e.sets));
    const setsB = planB.workouts.flatMap(w => w.exercises.map(e => e.sets));
    expect(setsA).toEqual(setsB);
  });
});

// ─── generatePlan, strength_size phase ──────────────────────────────────────
// Was the strength_hypertrophy "goal" before the merge. Now it's a phase
// (current-block emphasis), not a body shape. Engine maps phase===strength_size
// back to the legacy strength_hypertrophy internalGoal so heavy-compound rep
// ranges and rest periods still apply.

describe('generatePlan, strength_size phase', () => {
  test('compound exercises have repMax ≤ 8 (lower-rep strength range)', () => {
    const plan = generatePlan({ ...BASE_INPUTS, phase: 'strength_size' });
    for (const w of plan.workouts) {
      for (const ex of w.exercises) {
        // heavy_compound rest ≥ 210s in strength mode; check only those
        if (ex.restSec >= 180) {
          expect(ex.repMax).toBeLessThanOrEqual(8);
        }
      }
    }
  });

  test('compound exercises have notes about adding weight', () => {
    const plan = generatePlan({ ...BASE_INPUTS, phase: 'strength_size' });
    const compoundExercises = plan.workouts
      .flatMap(w => w.exercises)
      .filter(ex => ex.restSec >= 150);
    const withNotes = compoundExercises.filter(ex => ex.notes !== null);
    expect(withNotes.length).toBeGreaterThan(0);
  });
});

// ─── generatePlan, nutrition phase influence on RIR ─────────────────────────

describe('generatePlan, nutrition phase and RIR', () => {
  test('cut phase (aggressive_cut) produces higher rirTarget than surplus (lean_gain) for intermediate', () => {
    const cutPlan     = generatePlan({ ...BASE_INPUTS, nutritionPhase: 'aggressive_cut' });
    const surplusPlan = generatePlan({ ...BASE_INPUTS, nutritionPhase: 'lean_gain' });

    // Collect all rir targets across all workouts
    const avgRir = (plan) => {
      const rirs = plan.workouts.flatMap(w => w.exercises.map(e => e.rirTarget));
      return rirs.reduce((a, b) => a + b, 0) / rirs.length;
    };

    // Cut phases add +1 to RIR so the average should be higher
    expect(avgRir(cutPlan)).toBeGreaterThan(avgRir(surplusPlan));
  });
});

// ─── generatePlan, weeklyVolumeSummary ──────────────────────────────────────

describe('generatePlan, weeklyVolumeSummary', () => {
  test('returns plannedSets for standard muscle groups', () => {
    const plan = generatePlan(BASE_INPUTS);
    const summary = plan.weeklyVolumeSummary;
    expect(summary).toHaveProperty('chest');
    expect(summary).toHaveProperty('back');
    expect(summary).toHaveProperty('shoulders');
    expect(summary).toHaveProperty('quads');
    expect(summary).toHaveProperty('hamstrings');
  });

  test('each muscle group entry has plannedSets and isWeakPoint fields', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const [, entry] of Object.entries(plan.weeklyVolumeSummary)) {
      expect(typeof entry.plannedSets).toBe('number');
      expect(typeof entry.isWeakPoint).toBe('boolean');
    }
  });

  test('isWeakPoint is true for the targeted weak point muscle group', () => {
    const plan = generatePlan({
      ...BASE_INPUTS,
      weakPoints: ['Side Delts'],
    });
    // Side delts map to the shoulders group in the external summary
    expect(plan.weeklyVolumeSummary.shoulders.isWeakPoint).toBe(true);
  });

  test('isWeakPoint is false for non-targeted muscle groups', () => {
    const plan = generatePlan(BASE_INPUTS);
    for (const [, entry] of Object.entries(plan.weeklyVolumeSummary)) {
      expect(entry.isWeakPoint).toBe(false);
    }
  });
});

// ─── generatePlan, personalisationSummary ───────────────────────────────────

describe('generatePlan, personalisationSummary', () => {
  test('returns an object with experience and daysPerWeek fields', () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan.personalisationSummary).toHaveProperty('experience');
    expect(plan.personalisationSummary).toHaveProperty('daysPerWeek');
  });

  test('experience field is a descriptive string, not a raw key', () => {
    const plan = generatePlan(BASE_INPUTS);
    const exp = plan.personalisationSummary.experience;
    expect(typeof exp).toBe('string');
    // Should be human-readable, not just 'intermediate'
    expect(exp.length).toBeGreaterThan('intermediate'.length);
  });
});

// ─── generatePlan, equipment filtering ──────────────────────────────────────

describe('generatePlan, equipment filtering', () => {
  test('bodyweight-only plan contains no barbell exercises', () => {
    const plan = generatePlan({ ...BASE_INPUTS, equipment: 'bodyweight' });
    const names = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    const barbellExercises = names.filter(n => /barbell/i.test(n));
    expect(barbellExercises).toHaveLength(0);
  });

  test('dumbbells_only plan contains no barbell bench press', () => {
    const plan = generatePlan({ ...BASE_INPUTS, equipment: 'dumbbells_only' });
    const names = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    expect(names).not.toContain('Barbell Bench Press');
  });

  test('full_gym plan can include barbell exercises', () => {
    const plan = generatePlan({ ...BASE_INPUTS, equipment: 'full_gym' });
    const names = plan.workouts.flatMap(w => w.exercises.map(e => e.exerciseName));
    const barbellExercises = names.filter(n => /barbell/i.test(n));
    expect(barbellExercises.length).toBeGreaterThan(0);
  });
});

// ─── generatePlan, plan name ─────────────────────────────────────────────────

describe('generatePlan, plan name', () => {
  test('name is a non-empty string', () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(typeof plan.name).toBe('string');
    expect(plan.name.length).toBeGreaterThan(0);
  });

  test('name includes the days per week', () => {
    const plan = generatePlan(BASE_INPUTS);
    expect(plan.name).toMatch(/4/);
  });

  test('name reflects the goal', () => {
    const plan = generatePlan({ ...BASE_INPUTS, goal: 'general' });
    expect(plan.name).toMatch(/Build Muscle/);
  });
});
