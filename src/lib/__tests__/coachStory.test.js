/**
 * coachStory.test.js — Campaign 18 jobs 10, 12, 18 and 20.
 *
 * FOUNDER LAW (job 10): "The weekly experience should not feel like five
 * engines independently giving advice... Every sentence must be traceable to
 * actual evidence. No causal claims such as 'because you ate too little'
 * unless the evidence genuinely supports that."
 *
 * FOUNDER LAW (job 12): "No vague 'We've optimised your plan.' State exactly
 * what changed."
 *
 * WHAT THIS SUITE PINS. The founder's two worked examples reproduced word for
 * word from real contexts, the traceability of every line, the ban on
 * cross-domain causation, and the fact that the screen renders it.
 */
import { buildCoachContext } from '../coachContext';
import { classifyLimiters } from '../coachPrecedence';
import { buildWeeklyStory, storyLines, BANNED_TERMS } from '../coachStory';

const ctxOf = (o) => buildCoachContext(o);
const storyOf = (o, changes = {}) => {
  const context = ctxOf(o);
  return buildWeeklyStory({ context, limiters: classifyLimiters(context), changes });
};

/** The founder's first example: everything working, nothing to change. */
const GOING_WELL = {
  training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: 1.1 },
  recovery: { hasCheckin: true, energyScore: 4, sorenessScore: 2 },
  nutrition: { recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2980, targetKcal: 3000 },
  weight: { ratePctPerWeek: 0.3, weighInCount: 12, onTarget: true, shortfall: 0 },
};

/** The founder's second example: training fine, food logging too thin to read. */
const NOT_ENOUGH_FOOD_DATA = {
  training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: 1.1 },
  recovery: { hasCheckin: true, energyScore: 4, sorenessScore: 2 },
  nutrition: { recentIntakeDaysLogged: 2, targetKcal: 3000 },
  weight: { ratePctPerWeek: 0.3, weighInCount: 12, onTarget: true, shortfall: 0 },
};

describe('THE FOUNDER\'S FIRST EXAMPLE', () => {
  const story = storyOf(GOING_WELL);

  test('it says the weight is moving as intended and the lifts are progressing', () => {
    const text = storyLines(story).join(' ');
    expect(text).toMatch(/weight is moving the way we intended/i);
    expect(text).toMatch(/main lifts are still moving up/i);
  });

  test('it says the food target stays the same', () => {
    expect(story.staying.map((l) => l.text)).toContain('Your daily food target stays the same.');
  });

  test('nothing changes, and the story knows it is a quiet week', () => {
    expect(story.changing).toEqual([]);
    expect(story.isQuietWeek).toBe(true);
  });
});

describe('THE FOUNDER\'S SECOND EXAMPLE: not enough food logging', () => {
  const story = storyOf(NOT_ENOUGH_FOOD_DATA);

  test('it SAYS SO rather than guessing or going quiet', () => {
    const text = storyLines(story).join(' ');
    expect(text).toMatch(/not enough food logging this week to judge your intake/i);
  });

  test('the training is still described normally: no punishment for not logging', () => {
    const text = storyLines(story).join(' ');
    expect(text).toMatch(/main lifts are still moving up/i);
    expect(text).toMatch(/You trained 4 of 4 sessions/);
  });

  test('BOTH are left alone, and both are named', () => {
    const staying = story.staying.map((l) => l.text);
    expect(staying).toContain('Your daily food target stays the same.');
    expect(staying).toContain('Your programme and your exercises stay as they are.');
    expect(story.changing).toEqual([]);
  });

  test('and it names what would let us read it', () => {
    expect(story.watching.text).toMatch(/few more logged days/i);
  });
});

describe('EVERY SENTENCE IS TRACEABLE (job 10, job 20 question 1)', () => {
  const CASES = [
    ['going well', GOING_WELL, {}],
    ['thin diary', NOT_ENOUGH_FOOD_DATA, {}],
    ['target untested', {
      ...GOING_WELL,
      nutrition: { recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2400, targetKcal: 3000 },
      weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false, shortfall: 1 },
    }, {}],
    ['both change', {
      ...GOING_WELL,
      training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: -0.7 },
      weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false, shortfall: 1 },
    }, { calorieKcal: 100, exerciseChanges: [{ name: 'Bench press' }] }],
    ['no evidence at all', {}, {}],
  ];

  test.each(CASES)('%s: no line exists without a fact behind it', (_n, input, changes) => {
    const story = storyOf(input, changes);
    const keys = [
      ...story.happened, ...story.means, ...story.staying,
      ...(story.watching ? [story.watching] : []),
    ].map((l) => l.from);
    for (const k of keys) {
      expect(k).toMatch(/^(training|recovery|nutrition|weight)\./);
    }
    for (const c of story.changing) {
      expect(c.from).toMatch(/^(training|recovery|nutrition|weight)\./);
    }
  });

  test('an athlete with NO evidence gets an honest story, not an empty one', () => {
    const story = storyOf({});
    const text = storyLines(story).join(' ');
    expect(story.changing).toEqual([]);
    expect(text).toMatch(/not enough weigh-ins/i);
    expect(text).toMatch(/not enough food logging/i);
  });
});

describe('NO CAUSAL CLAIMS ACROSS DOMAINS (job 10, job 20 question 3)', () => {
  const everyStory = () => [
    storyOf(GOING_WELL),
    storyOf(NOT_ENOUGH_FOOD_DATA),
    storyOf({}),
    storyOf({
      ...GOING_WELL,
      nutrition: { recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2400, targetKcal: 3000 },
      weight: { ratePctPerWeek: 0.0, weighInCount: 12, onTarget: false, shortfall: 1 },
    }),
    storyOf({
      ...GOING_WELL,
      training: { sessionsCompleted: 1, sessionsPlanned: 4 },
      recovery: { hasCheckin: true, energyScore: 2, sorenessScore: 4 },
    }),
    storyOf(GOING_WELL, { calorieKcal: 100, exerciseChanges: [{ name: 'Row' }], volumeNote: 'Chest holds.' }),
  ];

  test('nothing blames food for a training outcome, or training for the scale', () => {
    for (const story of everyStory()) {
      for (const l of storyLines(story)) {
        expect(l).not.toMatch(/because you ate|due to your (intake|eating|diet)|caused by (your )?(food|training)/i);
        expect(l).not.toMatch(/under-?eating (caused|is why)|your training is why/i);
      }
    }
  });

  test('nothing shames, and nothing nags', () => {
    for (const story of everyStory()) {
      for (const l of storyLines(story)) {
        expect(l).not.toMatch(/you failed|you should have|lazy|excuse|no excuse|discipline|cheat/i);
        expect(l).not.toMatch(/you must log|start logging|log more/i);
      }
    }
  });

  test('PLAIN ENGLISH: none of the banned vocabulary reaches the user', () => {
    for (const story of everyStory()) {
      for (const l of storyLines(story)) {
        for (const term of BANNED_TERMS) expect(l.toLowerCase()).not.toContain(term);
        expect(l).not.toContain('—');
      }
    }
  });

  test('and no vague sweep: "optimised" is never said', () => {
    for (const story of everyStory()) {
      for (const l of storyLines(story)) {
        expect(l).not.toMatch(/optimis|we have improved your plan|fine-?tuned/i);
      }
    }
  });
});

describe('THE CROSS-DOMAIN RECEIPT (job 12)', () => {
  test('TRAINING ONLY: the food target is explicitly named as unchanged', () => {
    const story = storyOf(GOING_WELL, { exerciseChanges: [{ name: 'Bench press' }] });
    expect(story.changing.map((c) => c.domain)).toEqual(['training']);
    expect(story.staying.map((l) => l.text)).toContain('Your daily food target stays the same.');
  });

  test('NUTRITION ONLY: the programme is explicitly named as unchanged', () => {
    const story = storyOf(GOING_WELL, { calorieKcal: 100 });
    expect(story.changing.map((c) => c.domain)).toEqual(['nutrition']);
    expect(story.changing[0].text).toBe('Your daily calorie target goes up by 100.');
    expect(story.staying.map((l) => l.text)).toContain('Your programme and your exercises stay as they are.');
  });

  test('BOTH: each change carries its OWN reason, not one shared one', () => {
    const story = storyOf(GOING_WELL, {
      calorieKcal: 100, exerciseChanges: [{ name: 'Bench press', why: 'Your numbers on it have stopped moving.' }],
    });
    expect(story.changing).toHaveLength(2);
    const [nutrition, training] = story.changing;
    expect(nutrition.why).not.toBe(training.why);
    expect(nutrition.from).not.toBe(training.from);
    expect(story.staying).toEqual([]);
  });

  test('a change states the exact number, never a direction alone', () => {
    expect(storyOf(GOING_WELL, { calorieKcal: -125 }).changing[0].text)
      .toBe('Your daily calorie target comes down by 125.');
  });
});

describe('A NUTRITION CO-OBSERVATION IS NOT A CAUSE (job 5)', () => {
  const stalled = (nutrition) => storyOf({
    ...GOING_WELL,
    training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: -0.6 },
    nutrition,
  });

  test('with real coverage and a real miss, it is mentioned - as a co-observation', () => {
    const text = storyLines(stalled({ recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2400, targetKcal: 3000 }))
      .join(' ');
    expect(text).toMatch(/logged intake was away from your target this week as well/i);
    expect(text).toMatch(/not something we can call the reason/i);
  });

  test('THE GUARD: with a thin diary it is SILENT, not hedged', () => {
    const text = storyLines(stalled({ recentIntakeDaysLogged: 2, targetKcal: 3000 })).join(' ');
    expect(text).not.toMatch(/logged intake was away/i);
    // And no insinuation in its place.
    expect(text).not.toMatch(/we do not know what you ate|your food might/i);
  });

  test('and when they DID eat the target, nothing is implied at all', () => {
    const text = storyLines(stalled({ recentIntakeDaysLogged: 6, recentIntakeAvgKcal: 2980, targetKcal: 3000 }))
      .join(' ');
    expect(text).not.toMatch(/logged intake was away/i);
  });
});

describe('RECOVERY SCOPE IS TRUTHFUL (job 6)', () => {
  test('a systemic recovery hold says it is about recovery OVERALL', () => {
    const story = storyOf({
      ...GOING_WELL,
      recovery: { hasCheckin: true, energyScore: 2, sorenessScore: 4 },
      training: { sessionsCompleted: 4, sessionsPlanned: 4, blockE1rmSlopePct: -0.5 },
    });
    const text = storyLines(story).join(' ');
    expect(text).toMatch(/Recovery overall is the thing to respect/);
    // And it explicitly does NOT condemn the exercises.
    expect(text).toMatch(/rather than the exercises themselves/);
  });
});

describe('THE USER ACTUALLY SEES IT', () => {
  // eslint-disable-next-line global-require
  const SCREEN = require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, '../../screens/CoachOutputScreen.js'), 'utf8',
  );

  test('the screen builds the story from the ENGINE\'s own context, not a second read', () => {
    expect(SCREEN).toMatch(/context: coachCtx,\s*\n\s*limiters: coachLimiters,/);
    expect(SCREEN).toMatch(/const weeklyStory = buildWeeklyStory\(\{/);
  });

  test('the changes it reports are the ones the engine actually made', () => {
    expect(SCREEN).toMatch(/calorieKcal: adjustments\?\.calories\?\.change \?\? 0/);
  });

  test('all five parts are rendered', () => {
    expect(SCREEN).toMatch(/weeklyStory\.happened\.map/);
    expect(SCREEN).toMatch(/weeklyStory\.means\.map/);
    expect(SCREEN).toMatch(/weeklyStory\.changing\.map/);
    expect(SCREEN).toMatch(/weeklyStory\.staying\.map/);
    expect(SCREEN).toMatch(/\{weeklyStory\.watching\.text\}/);
  });

  test('each change renders its own why beside it', () => {
    expect(SCREEN).toMatch(/\{c\.text\}<\/Text>\s*\n\s*<Text style=\{\[styles\.storyWhy/);
  });
});
