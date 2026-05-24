/**
 * Tests for coachingGoals — pure mappings and small helpers consumed by
 * planAutoGen, weeklyCoach, and the Pro onboarding wizard.
 */
import {
  PHYSIQUE_GOALS,
  TRAINING_PHASES,
  GOAL_LABELS,
  PHASE_LABELS,
  GOALS_WITH_WEAK_POINTS,
  phaseToNutritionKey,
  phaseToCoachingKey,
  daysToActivityLevel,
  getTrainingNote,
  migrateProfileGoals,
} from '../coachingGoals';

describe('PHYSIQUE_GOALS catalogue', () => {
  test('has at least the general default and competitive physique categories', () => {
    const values = PHYSIQUE_GOALS.map(g => g.value);
    expect(values).toContain('general');     // default for non-competitive users
    expect(values).toContain('wellness');
    expect(values).toContain('bodybuilding');
    // Post-merge: these moved to TRAINING_PHASES (strength_size / weak_point)
    expect(values).not.toContain('general_hypertrophy');
    expect(values).not.toContain('strength_hypertrophy');
    expect(values).not.toContain('weak_point_spec');
  });

  test('every goal has value + label + group', () => {
    for (const g of PHYSIQUE_GOALS) {
      expect(typeof g.value).toBe('string');
      expect(typeof g.label).toBe('string');
      expect(['General', 'Male', 'Female']).toContain(g.group);
    }
  });

  test('GOAL_LABELS is a value→label dictionary', () => {
    for (const g of PHYSIQUE_GOALS) {
      expect(GOAL_LABELS[g.value]).toBe(g.label);
    }
  });

  test('GOALS_WITH_WEAK_POINTS is a subset of PHYSIQUE_GOALS', () => {
    const values = new Set(PHYSIQUE_GOALS.map(g => g.value));
    for (const v of GOALS_WITH_WEAK_POINTS) {
      expect(values.has(v)).toBe(true);
    }
  });
});

describe('TRAINING_PHASES catalogue', () => {
  test('has the canonical phases including the post-merge additions', () => {
    const values = TRAINING_PHASES.map(p => p.value);
    expect(values).toContain('cut');
    expect(values).toContain('maintain');
    expect(values).toContain('bulk');
    expect(values).toContain('lean_gain');
    expect(values).toContain('recomp');
    // Post-merge — these absorbed the misplaced "physique goals":
    expect(values).toContain('strength_size');
    expect(values).toContain('weak_point');
  });

  test('every phase maps to a non-empty nutritionKey and coachingPhaseKey', () => {
    for (const p of TRAINING_PHASES) {
      expect(typeof p.nutritionKey).toBe('string');
      expect(p.nutritionKey.length).toBeGreaterThan(0);
      expect(typeof p.coachingPhaseKey).toBe('string');
      expect(p.coachingPhaseKey.length).toBeGreaterThan(0);
    }
  });

  test('PHASE_LABELS covers every phase', () => {
    for (const p of TRAINING_PHASES) {
      expect(PHASE_LABELS[p.value]).toBe(p.label);
    }
  });
});

describe('phaseToNutritionKey', () => {
  test('returns the configured key for known phases', () => {
    expect(phaseToNutritionKey('cut')).toBe('mild_cut');
    expect(phaseToNutritionKey('bulk')).toBe('build');
    expect(phaseToNutritionKey('maintain')).toBe('maintain');
  });

  test('returns fallback "maintain" for unknown phases (does not throw)', () => {
    expect(phaseToNutritionKey('not_a_phase')).toBe('maintain');
    expect(phaseToNutritionKey(undefined)).toBe('maintain');
    expect(phaseToNutritionKey(null)).toBe('maintain');
  });
});

describe('phaseToCoachingKey', () => {
  test('returns the configured coach key for known phases', () => {
    expect(phaseToCoachingKey('cut')).toBe('mild_cut');
    expect(phaseToCoachingKey('maintain')).toBe('maint');
  });

  test('returns fallback "maint" for unknown phases', () => {
    expect(phaseToCoachingKey('not_a_phase')).toBe('maint');
    expect(phaseToCoachingKey(null)).toBe('maint');
  });
});

describe('daysToActivityLevel', () => {
  test('1–2 days → light', () => {
    expect(daysToActivityLevel(1)).toBe('light');
    expect(daysToActivityLevel(2)).toBe('light');
  });
  test('3–4 days → moderate', () => {
    expect(daysToActivityLevel(3)).toBe('moderate');
    expect(daysToActivityLevel(4)).toBe('moderate');
  });
  test('5+ days → more active', () => {
    const v = daysToActivityLevel(5);
    expect(['very', 'extra', 'very_active', 'extra_active', 'active']).toEqual(
      expect.arrayContaining([v]),
    );
  });
  test('handles undefined / null without throwing', () => {
    expect(() => daysToActivityLevel(undefined)).not.toThrow();
    expect(() => daysToActivityLevel(null)).not.toThrow();
  });
});

describe('getTrainingNote', () => {
  test('returns a non-empty string for a real goal/signal combination', () => {
    const note = getTrainingNote('build_muscle', 'on_target', 'hold', false);
    expect(typeof note).toBe('string');
    expect(note.length).toBeGreaterThan(0);
  });

  test('does not throw for unknown goal / signal', () => {
    expect(() => getTrainingNote('made_up_goal', 'whatever', 'something', false)).not.toThrow();
  });
});

describe('migrateProfileGoals', () => {
  test('general_hypertrophy → general (trainingGoal only)', () => {
    const out = migrateProfileGoals({ trainingGoal: 'general_hypertrophy', trainingPhase: 'cut' });
    expect(out.trainingGoal).toBe('general');
    expect(out.trainingPhase).toBe('cut'); // user-set phase preserved
  });

  test('strength_hypertrophy → general + strength_size phase (when phase was bulk)', () => {
    const out = migrateProfileGoals({ trainingGoal: 'strength_hypertrophy', trainingPhase: 'bulk' });
    expect(out.trainingGoal).toBe('general');
    expect(out.trainingPhase).toBe('strength_size');
  });

  test('strength_hypertrophy + user-set cut → trainingGoal becomes general, phase stays cut', () => {
    const out = migrateProfileGoals({ trainingGoal: 'strength_hypertrophy', trainingPhase: 'cut' });
    expect(out.trainingGoal).toBe('general');
    expect(out.trainingPhase).toBe('cut');
  });

  test('weak_point_spec → general + weak_point phase', () => {
    const out = migrateProfileGoals({ trainingGoal: 'weak_point_spec', trainingPhase: 'lean_gain' });
    expect(out.trainingGoal).toBe('general');
    expect(out.trainingPhase).toBe('weak_point');
  });

  test('physique categories are untouched', () => {
    const out = migrateProfileGoals({ trainingGoal: 'mens_physique', trainingPhase: 'bulk' });
    expect(out.trainingGoal).toBe('mens_physique');
    expect(out.trainingPhase).toBe('bulk');
  });

  test('handles null / undefined input safely', () => {
    expect(migrateProfileGoals(null)).toBe(null);
    expect(migrateProfileGoals(undefined)).toBe(undefined);
    expect(() => migrateProfileGoals({})).not.toThrow();
  });
});
