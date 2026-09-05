/**
 * B2 — free starter micro-quiz scoring. Deterministic mapping from every
 * answer combination onto a difficulty-0 library plan that respects the
 * user's equipment. The fixture mirrors the real seedRoutines.js tags
 * verbatim for the five difficulty-0 starters, plus higher-difficulty
 * decoys with deliberately attractive tags to prove the hard filter.
 */
import {
  FREE_STARTER_STEPS,
  getFreeStarterRecommendation,
  getPlanDays,
  isStarterCandidate,
} from '../freeStarter';

// Tags copied verbatim from src/lib/seedRoutines.js LIBRARY_PLANS.
const STARTERS = [
  {
    id: 'p-bfb',
    name: 'Beginner Full Body 3×/Week',
    tags: 'beginner full_body barbell gender:all goal:build_muscle days:3 audience:beginner featured',
    difficulty: 0,
  },
  {
    id: 'p-bppl',
    name: 'Beginner Push / Pull / Legs',
    tags: 'beginner ppl gender:all goal:build_muscle days:3 audience:beginner',
    difficulty: 0,
  },
  {
    id: 'p-wfbf',
    name: "Women's Full Body Foundation",
    tags: 'beginner full_body gender:women goal:build_muscle days:3 audience:beginner featured',
    difficulty: 0,
  },
  {
    id: 'p-db',
    name: 'Dumbbell Only: Full Body',
    tags: 'full_body equipment:dumbbell gender:all goal:build_muscle days:3 beginner intermediate featured',
    difficulty: 0,
  },
  {
    id: 'p-home',
    name: 'Home: No Equipment',
    tags: 'full_body equipment:bodyweight home gender:all goal:build_muscle goal:conditioning days:3 beginner audience:beginner',
    difficulty: 0,
  },
  // F-16 REVISED (docs/final-certification-2026-09-05/07-FINDINGS.md): the
  // quiz gained "Kettlebells" and "Bands" answers, so the fixture gains the
  // difficulty-0 plans those answers must land on. Tags verbatim from
  // src/lib/seedRoutines.js and src/lib/seedRoutines.bandPlans.js.
  {
    id: 'p-kb2',
    name: 'Kettlebell Foundations: 2 Days',
    tags: 'style:kettlebell_foundations equipment:kettlebell kettlebell home full_body beginner goal:build_muscle days:2 short',
    difficulty: 0,
  },
  {
    id: 'p-kb3',
    name: 'Kettlebell Foundations: 3 Days',
    tags: 'style:kettlebell_foundations equipment:kettlebell kettlebell home full_body beginner goal:build_muscle days:3',
    difficulty: 0,
  },
  {
    id: 'p-band3',
    name: 'Full Body: Bands',
    tags: 'style:band equipment:band band home full_body gender:all goal:build_muscle days:3 beginner intermediate audience:beginner',
    difficulty: 0,
  },
];

// Decoys: tag-perfect but NOT difficulty 0. Must never be recommended.
const DECOYS = [
  {
    id: 'p-ul4',
    name: 'Upper / Lower 4×/Week',
    tags: 'upper_lower intermediate gender:all goal:build_muscle days:4 featured',
    difficulty: 1,
  },
  {
    id: 'p-power',
    name: '3-Day Power + Muscle',
    tags: 'bodybuilding strength gender:all goal:get_stronger days:3',
    difficulty: 2,
  },
  {
    id: 'p-min2',
    name: 'Minimalist 2×/Week',
    tags: 'minimalist full_body gender:all goal:build_muscle days:2 short',
    difficulty: 1,
  },
  // Tag-perfect for the two new answers, but NOT difficulty 0: the starter
  // quiz must still never hand a beginner either of these.
  {
    id: 'p-band4',
    name: 'Upper/Lower: Bands',
    tags: 'style:band equipment:band band home upper_lower gender:all goal:build_muscle days:4 intermediate',
    difficulty: 1,
  },
  {
    id: 'p-kbs3',
    name: 'Kettlebell Strength: 3 Days',
    tags: 'style:kettlebell_experienced equipment:kettlebell kettlebell home full_body intermediate advanced goal:build_muscle days:3',
    difficulty: 2,
  },
];

const ALL_PLANS = [...STARTERS, ...DECOYS];

const GOALS = FREE_STARTER_STEPS[0].options.map(o => o.key);
const EQUIPMENT = FREE_STARTER_STEPS[1].options.map(o => o.key);
const DAYS = FREE_STARTER_STEPS[2].options.map(o => o.key);

// Deterministic shuffle (fixed seed) to prove input-order independence.
function shuffled(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

describe('FREE_STARTER_STEPS', () => {
  test('asks exactly three plain questions: goal, equipment, days', () => {
    expect(FREE_STARTER_STEPS.map(s => s.key)).toEqual(['goal', 'equipment', 'days']);
  });

  test('no jargon in any user-facing string', () => {
    const blob = JSON.stringify(FREE_STARTER_STEPS);
    expect(blob).not.toMatch(/MEV|MRV|RIR|hypertrophy|mesocycle|deload|tonnage/i);
  });
});

describe('getPlanDays', () => {
  test('reads days:N from tags', () => {
    expect(getPlanDays(STARTERS[0])).toBe(3);
    expect(getPlanDays(DECOYS[2])).toBe(2);
  });
  test('null when missing', () => {
    expect(getPlanDays({ tags: 'beginner full_body' })).toBeNull();
    expect(getPlanDays({})).toBeNull();
    expect(getPlanDays(null)).toBeNull();
  });
});

describe('isStarterCandidate', () => {
  test('rejects anything above difficulty 0 regardless of equipment', () => {
    for (const decoy of DECOYS) {
      for (const equipment of EQUIPMENT) {
        expect(isStarterCandidate(decoy, equipment)).toBe(false);
      }
    }
  });

  test('home users only get bodyweight plans', () => {
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-home'), 'home')).toBe(true);
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-bfb'), 'home')).toBe(false);
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-db'), 'home')).toBe(false);
  });

  test('dumbbell users get dumbbell plans, bodyweight as fallback, never gym-only', () => {
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-db'), 'dumbbell')).toBe(true);
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-home'), 'dumbbell')).toBe(true);
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-bfb'), 'dumbbell')).toBe(false);
    expect(isStarterCandidate(STARTERS.find(p => p.id === 'p-bppl'), 'dumbbell')).toBe(false);
  });

  test('full gym users can run any starter plan', () => {
    for (const p of STARTERS) {
      expect(isStarterCandidate(p, 'full_gym')).toBe(true);
    }
  });
});

// ─── F-16 REVISED: the two kit answers ───────────────────────────────────────
//
// Authority: the F-16 REVISED ruling in
// docs/final-certification-2026-09-05/07-FINDINGS.md, on evidence A2/A12 in
// 04-TRAINING-STYLES.md. Written to FAIL if either answer is dropped, if
// either is made a default, or if a kit answer is ever allowed to fall back
// onto kit the athlete does not own.
describe('F-16 REVISED: kettlebell and band answers', () => {
  test('the equipment step offers both, and neither is a default', () => {
    const step = FREE_STARTER_STEPS.find(s => s.key === 'equipment');
    const keys = step.options.map(o => o.key);
    expect(keys).toContain('kettlebell');
    expect(keys).toContain('band');
    // No answer on any step is preselected: the quiz has no default, no
    // `selected` flag and no initial answers object anywhere in its shape.
    for (const s of FREE_STARTER_STEPS) {
      for (const o of s.options) {
        expect(Object.keys(o).sort()).toEqual(['icon', 'key', 'label']);
      }
      expect(s.defaultKey).toBeUndefined();
    }
  });

  test('a band answer picks a band plan, never a bodyweight or dumbbell one', () => {
    for (const days of DAYS) {
      const pick = getFreeStarterRecommendation({ goal: 'build_muscle', equipment: 'band', days }, ALL_PLANS);
      expect(pick).not.toBeNull();
      expect(pick.name).toBe('Full Body: Bands');
      expect(pick.difficulty).toBe(0);
    }
  });

  test('a kettlebell answer picks a kettlebell plan, and the difficulty-0 one', () => {
    const two = getFreeStarterRecommendation({ goal: 'build_muscle', equipment: 'kettlebell', days: 2 }, ALL_PLANS);
    expect(two.tags).toContain('equipment:kettlebell');
    expect(two.difficulty).toBe(0);
    const three = getFreeStarterRecommendation({ goal: 'build_muscle', equipment: 'kettlebell', days: 3 }, ALL_PLANS);
    expect(three.name).toBe('Kettlebell Foundations: 3 Days');
  });

  test('neither answer can reach a plan built for other kit', () => {
    for (const equipment of ['kettlebell', 'band']) {
      for (const days of DAYS) {
        const pick = getFreeStarterRecommendation({ goal: 'general_fitness', equipment, days }, ALL_PLANS);
        expect(pick.tags).toContain(`equipment:${equipment}`);
      }
    }
  });
});

describe('getFreeStarterRecommendation — every answer combination', () => {
  for (const goal of GOALS) {
    for (const equipment of EQUIPMENT) {
      for (const days of DAYS) {
        const label = `${goal} / ${equipment} / ${days} days`;

        test(`${label}: returns a difficulty-0 plan that respects equipment`, () => {
          const pick = getFreeStarterRecommendation({ goal, equipment, days }, ALL_PLANS);
          expect(pick).not.toBeNull();
          expect(pick.difficulty).toBe(0);
          if (equipment === 'home') {
            expect(pick.tags).toContain('equipment:bodyweight');
          }
          if (equipment === 'dumbbell') {
            expect(
              pick.tags.includes('equipment:dumbbell') || pick.tags.includes('equipment:bodyweight'),
            ).toBe(true);
          }
          // F-16 REVISED: kit that will not do the job is never a fallback.
          if (equipment === 'kettlebell') {
            expect(pick.tags).toContain('equipment:kettlebell');
          }
          if (equipment === 'band') {
            expect(pick.tags).toContain('equipment:band');
          }
        });

        test(`${label}: deterministic and input-order independent`, () => {
          const answers = { goal, equipment, days };
          const first = getFreeStarterRecommendation(answers, ALL_PLANS);
          const second = getFreeStarterRecommendation(answers, ALL_PLANS);
          expect(second.id).toBe(first.id);
          for (const seed of [1, 7, 42]) {
            const reshuffled = getFreeStarterRecommendation(answers, shuffled(ALL_PLANS, seed));
            expect(reshuffled.id).toBe(first.id);
          }
        });
      }
    }
  }
});

describe('getFreeStarterRecommendation — specific mappings', () => {
  test('build muscle + full gym -> Beginner Full Body 3×/Week', () => {
    const pick = getFreeStarterRecommendation(
      { goal: 'build_muscle', equipment: 'full_gym', days: 3 }, ALL_PLANS,
    );
    expect(pick.id).toBe('p-bfb');
  });

  test('get stronger + full gym -> the barbell starter, never the difficulty-2 strength plan', () => {
    const pick = getFreeStarterRecommendation(
      { goal: 'get_stronger', equipment: 'full_gym', days: 3 }, ALL_PLANS,
    );
    expect(pick.id).toBe('p-bfb');
    expect(pick.id).not.toBe('p-power');
  });

  test('any goal + dumbbells -> Dumbbell Only: Full Body', () => {
    for (const goal of GOALS) {
      const pick = getFreeStarterRecommendation(
        { goal, equipment: 'dumbbell', days: 3 }, ALL_PLANS,
      );
      expect(pick.id).toBe('p-db');
    }
  });

  test('any goal + no equipment -> Home: No Equipment', () => {
    for (const goal of GOALS) {
      for (const days of DAYS) {
        const pick = getFreeStarterRecommendation(
          { goal, equipment: 'home', days }, ALL_PLANS,
        );
        expect(pick.id).toBe('p-home');
      }
    }
  });
});

describe('getFreeStarterRecommendation — edges', () => {
  test('null on empty library', () => {
    expect(getFreeStarterRecommendation({ goal: 'build_muscle', equipment: 'full_gym', days: 3 }, [])).toBeNull();
  });

  test('null on bad inputs', () => {
    expect(getFreeStarterRecommendation(null, ALL_PLANS)).toBeNull();
    expect(getFreeStarterRecommendation({ goal: 'build_muscle' }, null)).toBeNull();
  });

  test('null when only higher-difficulty plans exist (never falls upward)', () => {
    expect(
      getFreeStarterRecommendation({ goal: 'build_muscle', equipment: 'full_gym', days: 3 }, DECOYS),
    ).toBeNull();
  });

  test('tolerates plans with missing tags or difficulty', () => {
    const messy = [...ALL_PLANS, { id: 'p-x', name: 'X' }, { id: 'p-y', name: 'Y', tags: null, difficulty: 0 }];
    const pick = getFreeStarterRecommendation({ goal: 'build_muscle', equipment: 'full_gym', days: 3 }, messy);
    expect(pick.id).toBe('p-bfb');
  });
});
