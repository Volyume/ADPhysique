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
