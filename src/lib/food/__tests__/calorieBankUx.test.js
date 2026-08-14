/**
 * calorieBankUx.test.js — Campaign 17B job 6.
 *
 * FOUNDER LAW: "The user must understand what happened, not perform maths."
 *
 *   "You've moved 300 calories to Saturday. Your weekly total hasn't changed."
 *
 * And the bank must reach the FOOD: "If a user banks calories, the meal plan
 * for that day should actually reflect it." Then the four things the user must
 * not be left to assume: the safe minimum still applies, it is a one-off, it
 * does not make that weekday permanently different, and it is nothing to do
 * with training days.
 *
 * NEVER A HABIT. Campaign 17A's hard law stands underneath this one: "Do not
 * learn: Saturday is now a permanently high-calorie day." The bank is the one
 * sanctioned exception to a single daily target ONLY because it is
 * user-directed and temporary.
 *
 * WHAT THIS SUITE PINS. The comprehension copy against the REAL numbers the
 * planner produces, the food actually moving, and the fact that a bank teaches
 * nothing.
 */
import {
  planCalorieBank, deltaSum, bankedPlanDayEdits,
  bankHeadline, bankPlanLine, BANK_RULES,
  MIN_BANK_DELTA_KCAL,
} from '../calorieBank';
import { NEVER_EVIDENCE } from '../habits';
import { resolveComponent } from '../curatedFoods';
import { mealTotals } from '../curatedMeals';

const WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const baseWeek = (kcal = 2400) => Object.fromEntries(WEEK.map((d) => [d, kcal]));

/**
 * A real assembled day: `components` of curated food keys, which is what the
 * plan editor actually works on. Built through resolveComponent/mealTotals so
 * the totals are the engine's own, not numbers I chose.
 */
const PLAN_DAY = () => {
  const build = (slot, components) => {
    const items = components.map((c) => resolveComponent(c.food, c.g)).filter(Boolean);
    return { slot, components, items, totals: mealTotals(items) };
  };
  return {
    slots: [
      build('meal_1', [{ food: 'oats', g: 100 }, { food: 'chicken_breast', g: 150 }]),
      build('meal_2', [{ food: 'white_rice', g: 300 }, { food: 'chicken_breast', g: 150 }]),
    ],
  };
};
const dayKcal = (d) => d.slots.reduce((a, s) => a + s.totals.kcal, 0);

describe('the receipt says what happened, in real numbers', () => {
  test('THE FOUNDER SENTENCE, built from the planner\'s ACTUAL applied bump', () => {
    const res = planCalorieBank({
      perDayBaseKcal: baseWeek(), bigDayKey: 'sat',
      requestedBumpKcal: 300, floorKcal: 1500, bandMaxKcal: 2900,
    });
    expect(res.ok).toBe(true);
    const line = bankHeadline({
      deltaKcal: res.perDayDeltaKcal.sat,
      dayLabel: 'Saturday',
      otherDays: Object.keys(res.perDayDeltaKcal).length - 1,
    });
    expect(line).toBe('You have moved 300 calories to Saturday. Your weekly total has not changed. We have taken it from the other 6 days you chose.');
  });

  test('the "weekly total has not changed" claim is TRUE, not just copy', () => {
    const res = planCalorieBank({
      perDayBaseKcal: baseWeek(), bigDayKey: 'sat',
      requestedBumpKcal: 400, floorKcal: 1500, bandMaxKcal: 2900,
    });
    expect(deltaSum(res.perDayDeltaKcal)).toBe(0);
    expect(bankHeadline({ deltaKcal: res.perDayDeltaKcal.sat, dayLabel: 'Saturday', otherDays: 6 }))
      .toMatch(/weekly total has not changed/);
  });

  test('the number shown is what was APPLIED, not what was asked for', () => {
    // A request the floors will not allow in full must not be echoed back at
    // face value; that is the "performing maths" failure in reverse.
    const res = planCalorieBank({
      perDayBaseKcal: baseWeek(1550), bigDayKey: 'sat',
      requestedBumpKcal: 500, floorKcal: 1500, bandMaxKcal: 2900,
    });
    expect(res.ok).toBe(true);
    expect(res.appliedBumpKcal).toBeLessThan(500);
    expect(bankHeadline({ deltaKcal: res.perDayDeltaKcal.sat, dayLabel: 'Saturday', otherDays: 6 }))
      .toContain(`${res.appliedBumpKcal} calories`);
  });

  test('nothing to report means no sentence at all', () => {
    expect(bankHeadline({ deltaKcal: 0, dayLabel: 'Saturday' })).toBeNull();
    expect(bankHeadline({ deltaKcal: 300 })).toBeNull();
    expect(bankPlanLine(null)).toBeNull();
  });

  test('the food is named as having moved, not only the number', () => {
    expect(bankPlanLine('Saturday')).toMatch(/meal portions/i);
    expect(bankPlanLine('Saturday')).toMatch(/from the other days/i);
  });
});

describe('the four things the user must not be left to assume', () => {
  test('the safe minimum still applies', () => {
    expect(BANK_RULES.some((r) => /safe minimum still applies/i.test(r))).toBe(true);
  });

  test('it is a one-off, not a new routine', () => {
    expect(BANK_RULES.some((r) => /one-off/i.test(r) && /not a new routine/i.test(r))).toBe(true);
  });

  test('THE 17A LAW, said out loud: it does not make that weekday different from now on', () => {
    expect(BANK_RULES.some((r) => /does not make that day of the week different/i.test(r))).toBe(true);
  });

  test('and it has nothing to do with training days', () => {
    expect(BANK_RULES.some((r) => /nothing to do with which days you train/i.test(r))).toBe(true);
  });

  test('the copy is plain: no maths for the user to do', () => {
    const all = [...BANK_RULES, bankPlanLine('Saturday'), bankHeadline({ deltaKcal: 300, dayLabel: 'Saturday', otherDays: 6 })];
    for (const line of all) {
      expect(line).not.toContain('—');
      expect(line).not.toMatch(/deficit|surplus|TDEE|kcal\b|redistribut|amortis|net weekly/i);
      expect(line).not.toMatch(/cheat|treat day|earn|burn it off|make up for/i);
    }
  });
});

describe('the bank reaches the FOOD, on every day it touched', () => {
  // A floor well below the day's own total, so the CUT path is genuinely
  // exercised: with no floor a cut is a hold, which would pass this test
  // without the food ever moving.
  const FLOOR = 800;
  const res = () => planCalorieBank({
    perDayBaseKcal: baseWeek(dayKcal(PLAN_DAY())), bigDayKey: 'sat',
    requestedBumpKcal: 180, floorKcal: FLOOR, bandMaxKcal: dayKcal(PLAN_DAY()) + 400,
  });

  test('the big day gets more food and the other days get less', () => {
    const plan = res();
    expect(plan.ok).toBe(true);
    const edits = bankedPlanDayEdits({
      planDays: WEEK.map(() => PLAN_DAY()), dayKeys: WEEK,
      perDayDeltaKcal: plan.perDayDeltaKcal, floorKcal: FLOOR,
    });
    // Every day carrying a delta is edited: no target-only days pretending.
    expect(edits.map((e) => e.dayKey).sort()).toEqual([...WEEK].sort());
    const big = edits.find((e) => e.dayKey === 'sat');
    const other = edits.find((e) => e.dayKey === 'mon');
    expect(dayKcal(big.editedDay)).toBeGreaterThan(dayKcal(PLAN_DAY()));
    expect(dayKcal(other.editedDay)).toBeLessThan(dayKcal(PLAN_DAY()));
  });

  test('the grams on the plate actually changed, not just a header number', () => {
    const plan = res();
    const [first] = bankedPlanDayEdits({
      planDays: [PLAN_DAY()], dayKeys: ['sat'],
      perDayDeltaKcal: plan.perDayDeltaKcal, floorKcal: FLOOR,
    });
    const before = PLAN_DAY().slots.flatMap((s) => s.components).map((c) => c.g);
    const after = first.editedDay.slots.flatMap((s) => s.components).map((c) => c.g);
    expect(after).not.toEqual(before);
    for (const g of after) expect(Number.isInteger(g)).toBe(true);
  });

  test('a day with no delta is left alone entirely', () => {
    const edits = bankedPlanDayEdits({
      planDays: [PLAN_DAY(), PLAN_DAY()], dayKeys: ['mon', 'tue'],
      perDayDeltaKcal: { mon: 120 }, floorKcal: FLOOR,
    });
    expect(edits).toHaveLength(1);
    expect(edits[0].dayKey).toBe('mon');
  });
});

describe('SAFETY: the floors are not negotiable, banked or not', () => {
  test('a week already at the floor cannot fund a bank at all', () => {
    const res = planCalorieBank({
      perDayBaseKcal: baseWeek(1500), bigDayKey: 'sat',
      requestedBumpKcal: 300, floorKcal: 1500, bandMaxKcal: 2900,
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('floor');
    expect(res.perDayDeltaKcal).toEqual({});
  });

  test('no other day is ever pushed below the floor to fund the big one', () => {
    const res = planCalorieBank({
      perDayBaseKcal: baseWeek(1560), bigDayKey: 'sat',
      requestedBumpKcal: 500, floorKcal: 1500, bandMaxKcal: 3000,
    });
    expect(res.ok).toBe(true);
    for (const k of WEEK) {
      if (k === 'sat') continue;
      expect(1560 + res.perDayDeltaKcal[k]).toBeGreaterThanOrEqual(1500);
    }
  });

  test('a bump too small to be worth applying is refused rather than fudged', () => {
    const res = planCalorieBank({
      perDayBaseKcal: baseWeek(), bigDayKey: 'sat',
      requestedBumpKcal: MIN_BANK_DELTA_KCAL - 1, floorKcal: 1500, bandMaxKcal: 2900,
    });
    expect(res.ok).toBe(false);
  });
});

describe('A BANK TEACHES NOTHING', () => {
  test('the habit layer names a banked day as non-evidence', () => {
    expect(NEVER_EVIDENCE).toContain('calorie_bank_day');
  });

  test('no weekday reaches the bank at all: it is keyed by DATE, never by day name', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../calorieBank.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/getDay\(\)|weekday|dayOfWeek|Monday|Saturday/i);
    // And it writes no preference of any kind.
    expect(code).not.toMatch(/setMealPlanPrefs|saveLocalProfile|AsyncStorage|INSERT INTO|UPDATE /i);
  });

  test('the daily target has ONE base, and the bank is its only lever', () => {
    // eslint-disable-next-line global-require
    const src = require('fs').readFileSync(
      // eslint-disable-next-line global-require
      require('path').resolve(__dirname, '../effectiveTargets.js'), 'utf8',
    );
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/trainingDay|restDay|refeed|macroCycle|dayVariant/i);
    expect(code).toMatch(/bankedDelta/);
  });
});

describe('the user actually SEES it', () => {
  // eslint-disable-next-line global-require
  const read = (p) => require('fs').readFileSync(
    // eslint-disable-next-line global-require
    require('path').resolve(__dirname, p), 'utf8',
  );

  test('the four rules are rendered on the sheet where the choice is made', () => {
    const SHEET = read('../../../components/food/CalorieBankSheet.js');
    expect(SHEET).toMatch(/BANK_RULES/);
    expect(SHEET).toMatch(/BANK_RULES\.map\(\(line\) =>/);
  });

  test('the receipt is what the user reads after banking', () => {
    const DIARY = read('../../../screens/DiaryScreen.js');
    expect(DIARY).toMatch(/bankHeadline\(\{/);
    expect(DIARY).toMatch(/bankPlanLine\(bigLabel\)/);
    // Real values, from the plan that was actually applied.
    expect(DIARY).toMatch(/deltaKcal: bank\?\.perDayDeltaKcal\?\.\[bank\?\.bigDayKey\]/);
  });

  test('and it is shown even when there is no per-day food narration to add', () => {
    const DIARY = read('../../../screens/DiaryScreen.js');
    expect(DIARY).toMatch(/\} else if \(headline\) \{/);
  });
});
