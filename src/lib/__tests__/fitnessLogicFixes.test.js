/**
 * Regression tests for the fitness-logic audit fixes (2026-06-03).
 *
 * Each block pins a specific defect from the audit so it can't silently
 * return.
 */
import {
  detectPlateau,
  calculateWeeklyVolume,
  allocateExerciseVolume,
} from '../algorithms';
import {
  computeWeeklyWeightChange,
  shouldSuggestDietBreak,
  calculateNutritionTargets,
  PROTEIN_CUSTOM_MAX_GKGBW,
  PROTEIN_APPROACHES,
} from '../nutritionEngine';
// Campaign 20 Phase 2 Stage 12: computeSetTargets and getProgressionSuggestion
// were RETIRED (algorithms.js's own retirement comment). The P4 jump-cap law
// migrates onto resolveLoadIncrement below (the cap maths lives there now,
// exported, and is the ONE increment source every resolver caller shares -
// design §10.2). The P1 describe that followed this block in the original
// file compared getProgressionSuggestion's RIR-gated hold against
// computeSetTargets' - both functions and the per-set RIR contract itself
// are gone (FQ-3/D96 replaced per-set RIR with session-level difficulty
// throughout), so that comparison has no surviving subject and was deleted
// outright, not migrated.
import { resolveLoadIncrement } from '../livePrescription';

// ── P4: the 5% session-over-session jump cap must apply on light loads ──
describe('resolveLoadIncrement jump cap (P4, migrated from computeSetTargets)', () => {
  test('a 5 kg isolation increment is a small step, not the full increment', () => {
    const inc = resolveLoadIncrement(5, { units: 'kg', category: 'isolation' });
    // 5% of 5 = 0.25; the previous code disabled the cap below 10 units and
    // would have jumped the full ~0.5 isolation increment (a ~10% jump).
    expect(5 + inc).toBeGreaterThan(5);
    expect(5 + inc).toBeLessThanOrEqual(5.5);
  });

  test('a heavy compound increment is still bounded at ~5%', () => {
    const inc = resolveLoadIncrement(100, { units: 'kg', category: 'compound' });
    expect(100 + inc).toBeGreaterThan(100);
    expect(100 + inc).toBeLessThanOrEqual(105);
  });
});

// ── P10: the "3+ stalls -> swap exercise" resolution must be reachable ──
describe('detectPlateau swap-exercise branch (P10)', () => {
  // C12 job 2: a plateau must now also span real local calendar time, so
  // these fixtures carry weekly dates (newest-first). The timing is valid in
  // both cases, so each test still checks exactly what it was written for:
  // the stall count and the resolution split.
  const PLATEAU_WEEK = 7 * 24 * 60 * 60 * 1000;
  const PLATEAU_T0 = new Date(2026, 4, 20, 18, 0, 0).getTime();
  const flatSession = (i = 0) =>
    [{ weight: 100, actualReps: 8, createdAt: PLATEAU_T0 - i * PLATEAU_WEEK }];

  test('three consecutive stalls (4 sessions) resolves to swap_exercise', () => {
    const sessions = [flatSession(0), flatSession(1), flatSession(2), flatSession(3)];
    const r = detectPlateau(sessions, 6, 12);
    expect(r.plateau).toBe(true);
    expect(r.consecutiveStalls).toBeGreaterThanOrEqual(3);
    expect(r.resolution).toBe('swap_exercise');
  });

  test('two stalls (3 sessions) still resolves to change_rep_range', () => {
    const sessions = [flatSession(0), flatSession(1), flatSession(2)];
    const r = detectPlateau(sessions, 6, 12);
    expect(r.plateau).toBe(true);
    expect(r.consecutiveStalls).toBe(2);
    expect(r.resolution).toBe('change_rep_range');
  });
});

// ── P3.1: an explicit secondary contribution of 0 must survive ──
describe('calculateWeeklyVolume secondary contribution (P3.1)', () => {
  const sets = [{ exerciseId: 'e1', actualReps: 10, weight: 50, setType: 'straight' }];

  test('contribution: 0 is honoured (not overridden to 0.5)', () => {
    const map = {
      e1: {
        primaryMuscle: 'chest',
        secondaryMuscles: [{ muscle: 'triceps', contribution: 0 }],
      },
    };
    const v = calculateWeeklyVolume(sets, map);
    expect(v.chest.workingSets).toBe(1);
    expect(v.triceps.workingSets).toBe(0);
  });

  test('a bare string secondary still defaults to 0.5', () => {
    const map = { e1: { primaryMuscle: 'chest', secondaryMuscles: ['triceps'] } };
    const v = calculateWeeklyVolume(sets, map);
    expect(v.triceps.workingSets).toBe(0.5);
  });
});

// ── §1/P1.1: one shared allocator so tile and trend can't diverge ──
describe('allocateExerciseVolume shared model (P1.1)', () => {
  test('primary 1.0 + each secondary 0.5, with legacy shoulder split', () => {
    const out = allocateExerciseVolume({
      primaryMuscle: 'shoulders',
      secondaryMuscles: ['triceps', 'shoulders'],
    });
    expect(out).toEqual([
      { muscle: 'side_delts', sets: 1, role: 'primary' },
      { muscle: 'triceps', sets: 0.5, role: 'secondary' },
      { muscle: 'front_delts', sets: 0.5, role: 'secondary' },
    ]);
  });

  test('parses a secondary_muscles JSON string and honours contribution 0', () => {
    const out = allocateExerciseVolume({
      primary_muscle: 'chest',
      secondary_muscles: JSON.stringify([{ muscle: 'triceps', contribution: 0 }]),
    });
    expect(out).toEqual([
      { muscle: 'chest', sets: 1, role: 'primary' },
      { muscle: 'triceps', sets: 0, role: 'secondary' },
    ]);
  });

  test('calculateWeeklyVolume credits reps/tonnage to the primary only', () => {
    const sets = [{ exerciseId: 'e1', actualReps: 10, weight: 60, setType: 'straight' }];
    const map = { e1: { primaryMuscle: 'chest', secondaryMuscles: ['triceps'] } };
    const v = calculateWeeklyVolume(sets, map);
    expect(v.chest).toEqual({ workingSets: 1, reps: 10, tonnage: 600 });
    expect(v.triceps).toEqual({ workingSets: 0.5, reps: 0, tonnage: 0 });
  });
});

// ── §10/P2: the weekly weight rate must be date-based, not index-based ──
describe('computeWeeklyWeightChange is frequency-independent (P2)', () => {
  // Build a 7-day series rising 3.5 kg, logged `perDay` times per day.
  function series(perDay) {
    const out = [];
    const base = Date.UTC(2026, 0, 1);
    for (let day = 0; day <= 7; day++) {
      for (let k = 0; k < perDay; k++) {
        out.push({
          date: new Date(base + day * 86400000 + k * 3600000).toISOString(),
          ewma: 75 + day * 0.5, // 0.5/day -> 3.5 over 7 days
        });
      }
    }
    return out;
  }

  test('daily logging reads ~3.5 kg/week', () => {
    expect(computeWeeklyWeightChange(series(1))).toBeCloseTo(3.5, 1);
  });

  test('logging 3x/day reads the same ~3.5 kg/week (not ~3x faster)', () => {
    const rate = computeWeeklyWeightChange(series(3));
    expect(rate).toBeGreaterThan(2.9);
    expect(rate).toBeLessThan(4.1);
  });

  test('falls back to the index window when entries carry no date', () => {
    const data = Array.from({ length: 8 }, (_, i) => ({ ewma: 80 + i * 0.1 }));
    expect(computeWeeklyWeightChange(data)).toBeCloseTo(0.7, 5);
  });
});

// ── §13: a null deficit start date must not fire a diet break ──
describe('shouldSuggestDietBreak null guard (§13)', () => {
  test('null start date does not suggest a break', () => {
    expect(shouldSuggestDietBreak(null)).toEqual({ suggest: false, weeksInDeficit: 0 });
  });
  test('undefined and unparseable dates are safe too', () => {
    expect(shouldSuggestDietBreak(undefined).suggest).toBe(false);
    expect(shouldSuggestDietBreak('not a date').suggest).toBe(false);
  });
  test('a genuinely old deficit still suggests', () => {
    const tenWeeksAgo = new Date(Date.now() - 10 * 7 * 86400000);
    expect(shouldSuggestDietBreak(tenWeeksAgo).suggest).toBe(true);
  });
});

// ── P18: custom protein must be clamped to a sane ceiling ──
describe('custom protein ceiling (P18)', () => {
  const base = {
    sex: 'male', ageYears: 30, heightCm: 178, weightKg: 82,
    activityLevel: 'moderately_active', goal: 'build',
  };

  test('a fat-fingered 10 g/kg is clamped to the ceiling', () => {
    const t = calculateNutritionTargets({
      ...base, proteinApproach: 'custom', customProteinGPerKg: 10,
    });
    expect(t.proteinG).toBeLessThanOrEqual(PROTEIN_CUSTOM_MAX_GKGBW * base.weightKg + 0.5);
    expect(t.proteinG).toBeGreaterThan(0);
  });

  test('a reasonable custom rate passes through', () => {
    const t = calculateNutritionTargets({
      ...base, proteinApproach: 'custom', customProteinGPerKg: 2.0,
    });
    expect(t.proteinG).toBeCloseTo(2.0 * base.weightKg, 0);
  });
});

// ── P15: the displayed protein range must bracket what's delivered ──
describe('protein range labels are honest (P15)', () => {
  const base = {
    sex: 'male', ageYears: 30, heightCm: 178, weightKg: 82,
    activityLevel: 'moderately_active', goal: 'maintain', // common no-BF% goal
  };
  // "2.2–3.0 g/kg" -> [2.2, 3.0]
  const parse = (s) => s.replace(/[^\d.–-]/g, '').split(/[–-]/).map(Number);

  for (const key of ['standard', 'optimised', 'advanced']) {
    test(`${key}: a no-BF% user's delivered g/kg sits within the shown range`, () => {
      const [lo, hi] = parse(PROTEIN_APPROACHES[key].range);
      const t = calculateNutritionTargets({ ...base, proteinApproach: key });
      const delivered = t.proteinG / base.weightKg; // g/kg bodyweight
      expect(delivered).toBeGreaterThanOrEqual(lo - 0.05);
      expect(delivered).toBeLessThanOrEqual(hi + 0.05);
    });
  }
});
