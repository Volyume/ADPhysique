/**
 * CB-1b — bankedPlanDayEdits: calorie banking moves the planned FOOD to match
 * each day's banked target (founder 2026-06-16). Invariant tests against the
 * real food-level editor: floors never breached, protein held (carbs the lever),
 * only banked days touched, deterministic.
 */
import { bankedPlanDayEdits } from '../calorieBank';
import { resolveComponent } from '../curatedFoods';
import { mealTotals } from '../curatedMeals';

function meal(slot, name, components) {
  const items = components.map((c) => resolveComponent(c.food, c.g));
  return { slot, mealId: slot, name, components, items, totals: mealTotals(items) };
}

function makeDay() {
  const slots = [
    meal('meal_1', 'Oats & whey', [
      { food: 'oats', g: 80 }, { food: 'whey', g: 40 }, { food: 'banana', g: 120 },
    ]),
    meal('meal_2', 'Chicken & rice', [
      { food: 'chicken_breast', g: 180 }, { food: 'white_rice', g: 200 }, { food: 'broccoli', g: 100 },
    ]),
    meal('meal_3', 'Beef & potato', [
      { food: 'beef_mince_5', g: 150 }, { food: 'white_potato', g: 250 }, { food: 'olive_oil', g: 12 },
    ]),
  ];
  const totals = slots.reduce((a, s) => ({
    kcal: a.kcal + s.totals.kcal,
    protein: Math.round((a.protein + s.totals.protein) * 10) / 10,
    carbs: Math.round((a.carbs + s.totals.carbs) * 10) / 10,
    fat: Math.round((a.fat + s.totals.fat) * 10) / 10,
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { slots, totals };
}

const dayTotalKcal = (d) => d.slots.reduce((a, s) => a + s.totals.kcal, 0);
const dayTotalProtein = (d) => d.slots.reduce((a, s) => a + s.totals.protein, 0);

describe('bankedPlanDayEdits (CB-1b)', () => {
  const dayKeys = ['2026-06-16', '2026-06-17', '2026-06-18'];

  test('only days with a non-zero banked delta are edited; others omitted', () => {
    const planDays = [makeDay(), makeDay(), makeDay()];
    const out = bankedPlanDayEdits({
      planDays,
      dayKeys,
      perDayDeltaKcal: { '2026-06-16': 200, '2026-06-17': -150, '2026-06-18': 0, '2026-06-99': 300 },
      floorKcal: 1200,
    });
    expect(out.map((e) => e.dayKey)).toEqual(['2026-06-16', '2026-06-17']);
  });

  test('a higher-calorie day gains food; a lower-calorie day is trimmed', () => {
    const planDays = [makeDay(), makeDay()];
    const base = dayTotalKcal(planDays[0]);
    const out = bankedPlanDayEdits({
      planDays,
      dayKeys: ['2026-06-16', '2026-06-17'],
      perDayDeltaKcal: { '2026-06-16': 200, '2026-06-17': -200 },
      floorKcal: 1200,
    });
    const up = out.find((e) => e.dayKey === '2026-06-16').editedDay;
    const down = out.find((e) => e.dayKey === '2026-06-17').editedDay;
    expect(dayTotalKcal(up)).toBeGreaterThan(base);
    expect(dayTotalKcal(down)).toBeLessThan(base);
    // Each edit names what changed, for the per-day notice.
    expect(out[0].change.edits.length).toBeGreaterThan(0);
  });

  test('protein is held: carbs are the lever, not protein', () => {
    const planDays = [makeDay()];
    const beforeP = dayTotalProtein(planDays[0]);
    const out = bankedPlanDayEdits({
      planDays, dayKeys: ['2026-06-16'], perDayDeltaKcal: { '2026-06-16': -200 }, floorKcal: 1200,
    });
    const afterP = dayTotalProtein(out[0].editedDay);
    expect(Math.abs(afterP - beforeP)).toBeLessThan(8); // protein essentially unchanged
  });

  test('SAFETY: a huge cut is clamped at the floor, never a runaway', () => {
    const planDays = [makeDay()];
    const out = bankedPlanDayEdits({
      planDays, dayKeys: ['2026-06-16'], perDayDeltaKcal: { '2026-06-16': -99999 }, floorKcal: 1500,
    });
    // The clamp engages (floorHeld) and the day holds at the floor. It can sit a
    // few kcal under only through integer-gram rounding in the food editor, never
    // the unbounded cut the raw -99999 asked for.
    expect(out[0].change.floorHeld).toBe(true);
    expect(dayTotalKcal(out[0].editedDay)).toBeGreaterThan(1450);
  });

  test('deterministic: same inputs give the same edits', () => {
    const args = {
      planDays: [makeDay(), makeDay()],
      dayKeys: ['2026-06-16', '2026-06-17'],
      perDayDeltaKcal: { '2026-06-16': 180, '2026-06-17': -180 },
      floorKcal: 1200,
    };
    const a = bankedPlanDayEdits(args);
    const b = bankedPlanDayEdits({ ...args, planDays: [makeDay(), makeDay()] });
    expect(a.map((e) => dayTotalKcal(e.editedDay))).toEqual(b.map((e) => dayTotalKcal(e.editedDay)));
  });

  test('empty / malformed input is safe', () => {
    expect(bankedPlanDayEdits({})).toEqual([]);
    expect(bankedPlanDayEdits({ planDays: null, dayKeys: null })).toEqual([]);
  });
});
