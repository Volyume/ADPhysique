/**
 * habits.test.js — Campaign 17B job 4.
 *
 * FOUNDER LAW: "Build only conservative, useful habit intelligence."
 *
 * MAY learn from confirmed actual behaviour. Must NOT learn from a missing
 * log, a planned-but-not-eaten row, a deleted mistake, a single temporary
 * swap, one unusual day, or a calorie-bank day.
 *
 * STATED VS OBSERVED: "Do not silently overwrite user preferences." A user who
 * chose four meals and consistently logs three is ASKED, and confirms or
 * declines. And: "Do not infer this from incomplete days."
 *
 * WHAT THIS SUITE PINS. Every refusal, because the refusals are the product:
 * an over-eager habit engine that decides someone eats one meal a day because
 * they logged a coffee and stopped is worse than no habit engine at all.
 */
import {
  DAY_COMPLETE_FRACTION,
  MIN_COMPLETE_DAYS,
  MIN_MEAL_KCAL,
  NEVER_EVIDENCE,
  splitByCompleteness,
  meaningfulMealCount,
  observedMealCount,
  mealCountObservation,
  mealCountCopy,
  commonMealsBySlot,
} from '../habits';

const TARGET = 2400;
/** A day carrying `n` real meals, logged to `fraction` of target. */
const day = (date, n, fraction = 1) => ({
  date,
  targetKcal: TARGET,
  slots: Array.from({ length: n }, (_, i) => ({
    slot: `meal_${i + 1}`,
    kcal: Math.round((TARGET * fraction) / n),
    foodRef: `curated:food_${i}`,
    name: `Food ${i}`,
  })),
});

const days = (count, n, fraction = 1) =>
  Array.from({ length: count }, (_, i) => day(`2026-08-${String(i + 1).padStart(2, '0')}`, n, fraction));

describe('only COMPLETE days are evidence', () => {
  test('a fully logged day counts', () => {
    const { complete } = splitByCompleteness(days(3, 3, 1));
    expect(complete.length).toBe(3);
  });

  test('a day logged to just under the threshold does NOT count', () => {
    const { complete, incomplete } = splitByCompleteness(days(3, 3, DAY_COMPLETE_FRACTION - 0.05));
    expect(complete.length).toBe(0);
    expect(incomplete.length).toBe(3);
  });

  test('THE CASE THAT MATTERS: a coffee and nothing else teaches nothing', () => {
    // Someone who logged one small item and stopped has not told us they eat
    // one meal a day. Counting that day is how an engine invents a habit out
    // of a gap in the diary.
    const coffeeOnly = {
      date: '2026-08-01', targetKcal: TARGET,
      slots: [{ slot: 'meal_1', kcal: 20, foodRef: 'curated:coffee', name: 'Coffee' }],
    };
    const { complete } = splitByCompleteness([coffeeOnly]);
    expect(complete.length).toBe(0);
    expect(observedMealCount([coffeeOnly, coffeeOnly, coffeeOnly, coffeeOnly])).toBeNull();
  });

  test('a day with no target at all is not evidence either', () => {
    const { complete } = splitByCompleteness([{ date: 'x', targetKcal: 0, slots: [{ kcal: 900 }] }]);
    expect(complete.length).toBe(0);
  });

  test('a tiny entry is not a MEAL', () => {
    const d = {
      date: '2026-08-01', targetKcal: TARGET,
      slots: [
        { slot: 'meal_1', kcal: 800 }, { slot: 'meal_2', kcal: 900 },
        { slot: 'meal_3', kcal: 700 }, { slot: 'meal_4', kcal: MIN_MEAL_KCAL - 1 },
      ],
    };
    expect(meaningfulMealCount(d)).toBe(3);
  });
});

describe('the observation needs enough agreeing days, or it says nothing', () => {
  test('below the minimum, silence', () => {
    expect(observedMealCount(days(MIN_COMPLETE_DAYS - 1, 3))).toBeNull();
  });

  test('at the minimum, with agreement, an observation', () => {
    const o = observedMealCount(days(MIN_COMPLETE_DAYS, 3));
    expect(o.count).toBe(3);
    expect(o.completeDays).toBe(MIN_COMPLETE_DAYS);
  });

  test('AMBIGUITY IS SILENCE: a split week is not a habit', () => {
    // Three days at four meals and three at three is a person with a varied
    // week, not someone who eats three meals.
    const mixed = [...days(3, 3), ...days(3, 4).map((d, i) => ({ ...d, date: `2026-09-0${i + 1}` }))];
    expect(observedMealCount(mixed)).toBeNull();
  });

  test('a clear majority IS a habit', () => {
    const mostly = [...days(5, 3), ...days(1, 5).map((d) => ({ ...d, date: '2026-09-09' }))];
    expect(observedMealCount(mostly).count).toBe(3);
  });

  test('ONE UNUSUAL DAY cannot move the answer', () => {
    const withOddity = [...days(6, 3), { ...day('2026-09-09', 7), targetKcal: TARGET }];
    expect(observedMealCount(withOddity).count).toBe(3);
  });
});

describe('STATED VS OBSERVED: we ask, we never change', () => {
  test('when observed matches stated, there is nothing to say', () => {
    expect(mealCountObservation({ statedMealsPerDay: 3, days: days(6, 3) })).toBeNull();
  });

  test('when they disagree with established evidence, we ask', () => {
    const ask = mealCountObservation({ statedMealsPerDay: 4, days: days(6, 3) });
    expect(ask).toBeTruthy();
    expect(ask.observedCount).toBe(3);
    expect(ask.statedCount).toBe(4);
    expect(ask.question).toBe('You usually log three main meals. Want future meal plans built that way?');
  });

  test('the copy promises that nothing changes until they say so', () => {
    const ask = mealCountObservation({ statedMealsPerDay: 4, days: days(6, 3) });
    expect(ask.detail).toMatch(/stay as they are until you say so/i);
  });

  test('a DECLINED question is an answer and is not asked again', () => {
    const ask = mealCountObservation({
      statedMealsPerDay: 4, days: days(6, 3), dismissedForCount: 3,
    });
    expect(ask).toBeNull();
  });

  test('but a DIFFERENT observation later may still be raised', () => {
    const ask = mealCountObservation({
      statedMealsPerDay: 4, days: days(6, 5), dismissedForCount: 3,
    });
    expect(ask?.observedCount).toBe(5);
  });

  test('this module changes NOTHING: it has no writer at all', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../habits.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // No SQL, no persistence call, no store write. (The word "deleted" does
    // appear - inside NEVER_EVIDENCE, which is a list of things this module
    // refuses to read - so the check is on statements, not on the substring.)
    expect(code).not.toMatch(/\b(INSERT INTO|UPDATE |DELETE FROM)\b/i);
    expect(code).not.toMatch(/setMealPlanPrefs|saveLocalProfile|AsyncStorage/);
    expect(code).not.toMatch(/require\(|from '\.\.\/database'|from '\.\/db'/);
  });

  test('the copy is plain: no confidence, no score, no jargon', () => {
    const c = mealCountCopy(3);
    for (const line of [c.question, c.detail]) {
      expect(line).not.toMatch(/confidence|score|provenance|adherence|phenotype|optimis/i);
      expect(line).not.toContain('—');
    }
  });
});

describe('"your usual" is only claimable on established evidence', () => {
  test('a food eaten once at a slot is not "your usual"', () => {
    const d = [
      { date: '1', targetKcal: TARGET, slots: [{ slot: 'meal_1', kcal: 2400, foodRef: 'curated:oats', name: 'Oats' }] },
      ...days(MIN_COMPLETE_DAYS, 1).map((x, i) => ({
        ...x, date: `x${i}`,
        slots: [{ slot: 'meal_1', kcal: 2400, foodRef: `curated:other_${i}`, name: `Other ${i}` }],
      })),
    ];
    const { usual } = commonMealsBySlot(d);
    expect(usual.get('meal_1')).toBeUndefined();
  });

  test('a food eaten repeatedly at the same slot IS "your usual"', () => {
    const d = days(6, 1).map((x) => ({
      ...x,
      slots: [{ slot: 'meal_1', kcal: 2400, foodRef: 'curated:oats', name: 'Porridge oats' }],
    }));
    const { usual } = commonMealsBySlot(d);
    expect(usual.get('meal_1')?.ref).toBe('curated:oats');
    expect(usual.get('meal_1')?.count).toBe(6);
  });

  test('incomplete days never contribute to "your usual" either', () => {
    const d = days(10, 1, 0.2).map((x) => ({
      ...x,
      slots: [{ slot: 'meal_1', kcal: 200, foodRef: 'curated:oats', name: 'Oats' }],
    }));
    expect(commonMealsBySlot(d).usual.size).toBe(0);
  });
});

describe('the explicit NON-evidence list', () => {
  test('every item the founder named is recorded', () => {
    expect(NEVER_EVIDENCE).toEqual([
      'missing_log', 'planned_not_eaten', 'deleted_entry',
      'single_swap', 'one_unusual_day', 'calorie_bank_day',
    ]);
  });

  test('a missing day is simply absent, and absence is never a signal', () => {
    // The API takes only the days that EXIST. There is no channel through
    // which "they did not log Tuesday" could reach a conclusion.
    const withGap = [day('2026-08-01', 3), day('2026-08-05', 3), day('2026-08-06', 3), day('2026-08-09', 3)];
    expect(observedMealCount(withGap).count).toBe(3);
  });

  test('the live screen feeds it CONFIRMED intake only', () => {
    // getFoodEntriesForRange excludes planned rows (17A job 2), so a staged
    // meal plan cannot teach a habit. Pinned at the call site.
    // eslint-disable-next-line global-require
    const SCREEN = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../../../screens/MealPlanScreen.js'), 'utf8',
    );
    expect(SCREEN).toMatch(/getFoodEntriesForRange\(user\.id, start, end\)/);
    expect(SCREEN).toMatch(/mealCountObservation\(\{/);
  });

  test('the live screen ASKS rather than changing anything by itself', () => {
    // eslint-disable-next-line global-require
    const SCREEN = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../../../screens/MealPlanScreen.js'), 'utf8',
    );
    // Two buttons, and the accept path is an explicit user tap.
    expect(SCREEN).toMatch(/title=\{`Use \$\{mealCountAsk\.observedCount\} meals`\}/);
    expect(SCREEN).toMatch(/title="No, keep mine"/);
    const start = SCREEN.indexOf('const handleAcceptMealCount');
    const body = SCREEN.slice(start, SCREEN.indexOf('const handleDismissMealCount', start));
    expect(body).toMatch(/handleSetPref\(\{ mealPlanMealsPerDay: count \}\)/);
  });
});
