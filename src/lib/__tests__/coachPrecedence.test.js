/**
 * coachPrecedence.test.js — Campaign 18 jobs 3, 11, 14 and 16.
 *
 * FOUNDER LAW (job 3): "poor body-weight progress + low calorie adherence must
 * NOT immediately mean increase calories" and "poor gym performance + poor
 * training adherence must NOT immediately mean replace exercises or rebuild
 * the programme".
 *
 * FOUNDER LAW (job 11): "do not change training AND nutrition simultaneously
 * merely because both engines found weak evidence."
 *
 * FOUNDER LAW (job 14): "Volyume must never require food logging in order for
 * training intelligence to work."
 *
 * WHAT THIS SUITE PINS. The four classifications, the ten-row conflict matrix
 * as a table, and the two laws above as named cases rather than as incidental
 * consequences of some other test passing.
 */
import { buildCoachContext, SIGNAL } from '../coachContext';
import {
  LIMITER, INTERVENTION,
  classifyNutritionLimiter, classifyTrainingLimiter,
  nutritionQualifier, chooseInterventions, conflictOutcome,
  interventionRank, smallestIntervention,
} from '../coachPrecedence';

/**
 * An athlete, described the way the founder's matrix describes them.
 * `shortfall` is +1 when they need more energy for the trend to reach intent.
 */
const athlete = ({
  sessions = 'good', weight = 'good', intake = 'good', recovery = 'good',
  progress = 'good', shortfall = 0,
} = {}) => buildCoachContext({
  training: {
    sessionsCompleted: sessions === 'good' ? 4 : sessions === 'poor' ? 1 : null,
    sessionsPlanned: sessions === 'unknown' ? null : 4,
    blockE1rmSlopePct: progress === 'good' ? 1.2 : progress === 'poor' ? -0.6 : null,
    prsThisWeek: progress === 'unknown' ? null : 0,
  },
  recovery: recovery === 'unknown'
    ? { hasCheckin: false }
    : { hasCheckin: true, energyScore: recovery === 'good' ? 4 : 2, sorenessScore: 2 },
  nutrition: intake === 'unknown'
    ? { recentIntakeDaysLogged: 1, targetKcal: 3000 }
    : {
      recentIntakeDaysLogged: 6, targetKcal: 3000,
      recentIntakeAvgKcal: intake === 'good' ? 2980 : 2300,
    },
  weight: weight === 'unknown'
    ? { ratePctPerWeek: null, weighInCount: 1 }
    : { ratePctPerWeek: 0.3, weighInCount: 10, onTarget: weight === 'good', shortfall },
  intent: { goalPhase: 'bulk' },
});

describe('THE FOUR CLASSIFICATIONS', () => {
  test('nutrition PLAN: the target was eaten and the scale still did not move', () => {
    const c = classifyNutritionLimiter(athlete({ weight: 'poor', intake: 'good', shortfall: 1 }));
    expect(c.limiter).toBe(LIMITER.PLAN);
    expect(c.onTarget).toBe(false);
  });

  test('THE HEADLINE CASE: scale not moving + they ate UNDER target = EXECUTION, not plan', () => {
    // "do not reward poor execution with an automatic target increase."
    const c = classifyNutritionLimiter(athlete({ weight: 'poor', intake: 'poor', shortfall: 1 }));
    expect(c.limiter).toBe(LIMITER.EXECUTION);
    expect(c.because).toBe('target_not_eaten');
  });

  test('but a miss in the OPPOSITE direction is still a real plan finding', () => {
    // Bulking, not gaining, and eating OVER target: maintenance really is
    // higher than we thought. The miss does not explain the outcome.
    const ctx = athlete({ weight: 'poor', shortfall: 1 });
    ctx.nutrition.intake = { signal: SIGNAL.POOR, direction: 1, source: 'food_rollups' };
    expect(classifyNutritionLimiter(ctx).limiter).toBe(LIMITER.PLAN);
  });

  test('nutrition INSUFFICIENT_EVIDENCE: off target with a diary too thin to read', () => {
    const c = classifyNutritionLimiter(athlete({ weight: 'poor', intake: 'unknown', shortfall: 1 }));
    expect(c.limiter).toBe(LIMITER.INSUFFICIENT_EVIDENCE);
    expect(c.because).toBe('intake_coverage_unknown');
  });

  test('nutrition INSUFFICIENT_EVIDENCE: no usable weight trend at all', () => {
    expect(classifyNutritionLimiter(athlete({ weight: 'unknown' })).limiter)
      .toBe(LIMITER.INSUFFICIENT_EVIDENCE);
  });

  test('THE SECOND HEADLINE CASE: a plateau on an UNRUN programme is EXECUTION', () => {
    // "poor gym performance + poor training adherence must NOT immediately
    // mean replace exercises or rebuild the programme."
    const c = classifyTrainingLimiter(athlete({ sessions: 'poor', progress: 'poor' }));
    expect(c.limiter).toBe(LIMITER.EXECUTION);
    expect(c.because).toBe('sessions_missed');
  });

  test('training RECOVERY: run, but recovery says restrain', () => {
    const c = classifyTrainingLimiter(athlete({ recovery: 'poor', progress: 'poor' }));
    expect(c.limiter).toBe(LIMITER.RECOVERY);
    expect(c.scope).toBe('systemic');
  });

  test('training PLAN: run, recovered, and still not moving', () => {
    const c = classifyTrainingLimiter(athlete({ progress: 'poor' }));
    expect(c.limiter).toBe(LIMITER.PLAN);
    expect(c.because).toBe('not_progressing_on_a_run_programme');
  });

  test('training INSUFFICIENT_EVIDENCE: nothing planned to measure against', () => {
    expect(classifyTrainingLimiter(athlete({ sessions: 'unknown' })).limiter)
      .toBe(LIMITER.INSUFFICIENT_EVIDENCE);
  });
});

describe('TRAINING NEVER DEPENDS ON FOOD LOGGING (job 14)', () => {
  test('an athlete who has never opened the diary still gets a full training answer', () => {
    const never = athlete({ intake: 'unknown', progress: 'poor' });
    const t = classifyTrainingLimiter(never);
    expect(t.limiter).toBe(LIMITER.PLAN);
    expect(t.because).toBe('not_progressing_on_a_run_programme');
  });

  test('and the training answer is IDENTICAL with and without the diary', () => {
    const withDiary = classifyTrainingLimiter(athlete({ intake: 'good', progress: 'poor' }));
    const without = classifyTrainingLimiter(athlete({ intake: 'unknown', progress: 'poor' }));
    expect(without).toEqual(withDiary);
  });

  test('the training classifier reads NO nutrition field at all', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../coachPrecedence.js'), 'utf8',
    );
    const start = src.indexOf('export function classifyTrainingLimiter');
    const body = src.slice(start, src.indexOf('export function classifyLimiters'));
    const code = body.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/nutrition|intake|protein|calorie/i);
  });

  test('a poor diary never becomes a stated CAUSE of a training outcome', () => {
    const q = nutritionQualifier(athlete({ intake: 'unknown' }));
    expect(q.state).toBe('unknown');
    expect(q.because).toBe('not_enough_logged_days');
  });

  test('a genuinely covered diary MAY qualify the interpretation', () => {
    expect(nutritionQualifier(athlete({ intake: 'good' })).state).toBe('supports');
    const q = nutritionQualifier(athlete({ intake: 'poor' }));
    expect(q.state).toBe('qualifies');
    expect(q.direction).toBe(-1);
  });
});

describe('MINIMUM EFFECTIVE INTERVENTION (job 11)', () => {
  test('the ladder is ordered smallest first', () => {
    expect(interventionRank(INTERVENTION.NONE)).toBeLessThan(interventionRank(INTERVENTION.EXPLAIN));
    expect(interventionRank(INTERVENTION.EXERCISE)).toBeLessThan(interventionRank(INTERVENTION.NUTRITION_TARGET));
    expect(interventionRank(INTERVENTION.NUTRITION_TARGET)).toBeLessThan(interventionRank(INTERVENTION.STRUCTURE));
    expect(smallestIntervention([INTERVENTION.STRUCTURE, INTERVENTION.EXPLAIN])).toBe(INTERVENTION.EXPLAIN);
    expect(smallestIntervention(['nonsense'])).toBe(INTERVENTION.NONE);
  });

  test('everything good: KEEP. No change is the supported answer', () => {
    const p = chooseInterventions(athlete({}));
    expect(p.nutrition).toBe(INTERVENTION.NONE);
    expect(p.training).toBe(INTERVENTION.NONE);
    expect(p.both).toBe(false);
  });

  test('THE LAW: two WEAK readings never add up to two changes', () => {
    // Weight off target with a thin diary, and a stall on an unrun block.
    // Both engines have something to be unhappy about; neither may act.
    const weak = athlete({ weight: 'poor', intake: 'unknown', sessions: 'poor', progress: 'poor', shortfall: 1 });
    const p = chooseInterventions(weak);
    expect(p.both).toBe(false);
    expect(p.nutrition).toBe(INTERVENTION.NONE);
    expect(p.training).toBe(INTERVENTION.EXPLAIN);
    expect(p.holds.map((h) => h.domain).sort()).toEqual(['nutrition', 'training']);
  });

  test('but two INDEPENDENTLY STRONG readings may both change', () => {
    const strong = athlete({ weight: 'poor', intake: 'good', progress: 'poor', shortfall: 1 });
    const p = chooseInterventions(strong);
    expect(p.nutrition).toBe(INTERVENTION.NUTRITION_TARGET);
    expect(p.training).toBe(INTERVENTION.EXERCISE);
    expect(p.both).toBe(true);
  });

  test('an EXECUTION problem yields an explanation, never a change', () => {
    const p = chooseInterventions(athlete({ weight: 'poor', intake: 'poor', shortfall: 1 }));
    expect(p.nutrition).toBe(INTERVENTION.EXPLAIN);
    expect(p.holds).toContainEqual({ domain: 'nutrition', reason: 'target_not_eaten' });
  });

  test('poor recovery restrains VOLUME, which is smaller than swapping exercises', () => {
    const p = chooseInterventions(athlete({ recovery: 'poor', progress: 'poor' }));
    expect(p.training).toBe(INTERVENTION.VOLUME);
    expect(interventionRank(INTERVENTION.VOLUME)).toBeLessThan(interventionRank(INTERVENTION.NUTRITION_TARGET));
  });

  test('nothing on this ladder can ever reach a structural rebuild by itself', () => {
    const every = [
      athlete({}), athlete({ weight: 'poor', shortfall: 1 }), athlete({ sessions: 'poor' }),
      athlete({ recovery: 'poor' }), athlete({ progress: 'poor' }), athlete({ weight: 'unknown' }),
      athlete({ intake: 'unknown' }), athlete({ sessions: 'unknown' }),
    ];
    for (const ctx of every) {
      const p = chooseInterventions(ctx);
      expect(p.nutrition).not.toBe(INTERVENTION.STRUCTURE);
      expect(p.training).not.toBe(INTERVENTION.STRUCTURE);
    }
  });
});

describe('THE CONFLICT MATRIX (job 16), as a table', () => {
  // The founder's ten dangerous combinations, each with what may change, what
  // must hold, and what must stay unknown.
  const ROWS = [
    {
      n: 1, name: 'weight good, training good, nutrition good',
      ctx: () => athlete({}),
      mayChange: [], mustHold: [],
    },
    {
      n: 2, name: 'weight poor, training good, nutrition adherence poor',
      ctx: () => athlete({ weight: 'poor', intake: 'poor', shortfall: 1 }),
      mayChange: [], mustHold: ['nutrition'],
    },
    {
      n: 3, name: 'weight poor, training poor, nutrition adherence good',
      ctx: () => athlete({ weight: 'poor', intake: 'good', progress: 'poor', shortfall: 1 }),
      mayChange: ['nutrition_target', 'exercise'], mustHold: [],
    },
    {
      n: 4, name: 'weight poor, training poor, nutrition unknown',
      ctx: () => athlete({ weight: 'poor', intake: 'unknown', progress: 'poor', shortfall: 1 }),
      mayChange: ['exercise'], mustHold: ['nutrition'],
    },
    {
      n: 5, name: 'weight good, training poor, recovery poor',
      ctx: () => athlete({ progress: 'poor', recovery: 'poor' }),
      mayChange: ['volume'], mustHold: [],
    },
    {
      n: 6, name: 'weight good, training plateau, recovery good',
      ctx: () => athlete({ progress: 'poor' }),
      mayChange: ['exercise'], mustHold: [],
    },
    {
      n: 7, name: 'weight unknown, training good',
      ctx: () => athlete({ weight: 'unknown' }),
      mayChange: [], mustHold: ['nutrition'],
    },
    {
      n: 8, name: 'weight unknown, training poor',
      ctx: () => athlete({ weight: 'unknown', progress: 'poor' }),
      mayChange: ['exercise'], mustHold: ['nutrition'],
    },
    {
      n: 9, name: 'nutrition good, training evidence insufficient',
      ctx: () => athlete({ sessions: 'unknown' }),
      mayChange: [], mustHold: ['training'],
    },
    {
      n: 10, name: 'training good, nutrition evidence insufficient',
      ctx: () => athlete({ intake: 'unknown', weight: 'poor', shortfall: 1 }),
      mayChange: [], mustHold: ['nutrition'],
    },
  ];

  test.each(ROWS)('row $n: $name', ({ ctx, mayChange, mustHold }) => {
    const out = conflictOutcome(ctx());
    expect(out.mayChange.sort()).toEqual([...mayChange].sort());
    expect(out.mustHold.sort()).toEqual([...mustHold].sort());
  });

  test('rows 7 and 8 keep the weight direction UNKNOWN rather than calling it flat', () => {
    for (const row of [7, 8]) {
      const out = conflictOutcome(ROWS.find((r) => r.n === row).ctx());
      expect(out.mustRemainUnknown).toContain('weight_direction');
      expect(out.mayClaim).not.toContain('weight_direction');
    }
  });

  test('rows 4 and 10 keep the nutrition interpretation UNKNOWN', () => {
    for (const row of [4, 10]) {
      const out = conflictOutcome(ROWS.find((r) => r.n === row).ctx());
      expect(out.mustRemainUnknown).toContain('nutrition_interpretation');
    }
  });

  test('NO ROW MAY EVER CLAIM CAUSATION ACROSS DOMAINS', () => {
    for (const row of ROWS) {
      const out = conflictOutcome(row.ctx());
      expect(out.neverClaim).toContain('nutrition_caused_training_outcome');
      expect(out.mayClaim).not.toContain('nutrition_caused_training_outcome');
    }
  });

  test('row 3 is the ONLY row where both domains change, and each has its own reason', () => {
    const both = ROWS.filter((r) => conflictOutcome(r.ctx()).mayChange.length > 1);
    expect(both.map((r) => r.n)).toEqual([3]);
    const out = conflictOutcome(ROWS[2].ctx());
    expect(out.limiters.nutrition.limiter).toBe(LIMITER.PLAN);
    expect(out.limiters.training.limiter).toBe(LIMITER.PLAN);
  });
});
