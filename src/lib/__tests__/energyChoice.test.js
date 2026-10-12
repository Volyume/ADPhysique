/**
 * energyChoice (D226): the slider's bounds and macros, against the REAL
 * nutritionEngine. Pins the ED-safety contract: the lowest choosable target
 * is never below the 1,500 / 1,200 kcal sex floor, the FFM energy floor
 * (30 kcal/kg) or the 0.8%/week loss line, never above the range's top; the
 * engine's own target is always choosable; the position round-trips; a
 * suppressed state returns the engine's target; macros keep protein and fat
 * and carbs absorb the change.
 */
import { calculateNutritionTargets, computeFFMFloor, kcalFloorForSex, MAX_SAFE_LOSS_RATE, KCAL_PER_KG_FAT } from '../nutritionEngine';
import { energyChoiceBounds, choicePosition, resolveChosenTarget, macrosForChoice, ENERGY_STEP_KCAL } from '../energyChoice';

const people = [];
for (const sex of ['male', 'female']) {
  for (const weightKg of [48, 62, 80, 110]) {
    for (const goal of ['aggressive_cut', 'mild_cut', 'maintain', 'lean_gain', 'build']) {
      people.push({ sex, weightKg, goal });
    }
  }
}
function engine({ sex, weightKg, goal }) {
  const t = calculateNutritionTargets({
    sex, ageYears: 30, heightCm: sex === 'male' ? 178 : 165, weightKg, bodyFatPercent: 18, bodyFatSource: 'dexa',
    activityLevel: 'moderate', goal, experienceLevel: 'intermediate', proteinApproach: 'optimised',
  });
  const bounds = energyChoiceBounds({
    targetKcal: t.targetKcal, maintenanceKcal: t.maintenanceKcal, sex, weightKg, bodyFatPercent: 18, bodyFatSource: 'dexa',
  });
  return { t, bounds };
}

describe('energyChoiceBounds against the real engine', () => {
  test.each(people)('%j: never below any floor, never above the top, engine target choosable', (p) => {
    const { t, bounds } = engine(p);
    const sexFloor = kcalFloorForSex(p.sex);
    const ffm = computeFFMFloor(p.weightKg, { bodyFatPercent: 18, bodyFatSource: 'dexa', sex: p.sex }).floorKcal;
    const lossLine = Math.round(t.maintenanceKcal - (MAX_SAFE_LOSS_RATE * p.weightKg * KCAL_PER_KG_FAT) / 7);
    const top = Math.round(t.targetKcal * 1.1);
    expect(bounds.max).toBeLessThanOrEqual(Math.max(top, bounds.min));
    // The lowest point holds every floor, except where the engine's own
    // target already sits below one: then the target itself is the minimum.
    const floors = Math.max(sexFloor, ffm, lossLine);
    if (t.targetKcal >= floors) expect(bounds.min).toBeGreaterThanOrEqual(floors);
    else expect(bounds.min).toBe(t.targetKcal);
    expect(bounds.min).toBeLessThanOrEqual(t.targetKcal);
    expect(bounds.max === bounds.min || bounds.max >= t.targetKcal - ENERGY_STEP_KCAL).toBe(true);
    // every choosable value, whatever the position, stays in [min, max]
    for (const position of [-1, -0.5, 0, 0.5, 1]) {
      const v = resolveChosenTarget({ position, suppressed: false, bounds, targetKcal: t.targetKcal });
      expect(v).toBeGreaterThanOrEqual(bounds.min);
      expect(v).toBeLessThanOrEqual(bounds.max);
    }
  });

  test('a floor above the range bottom sets the lowest point and is named', () => {
    const b = energyChoiceBounds({ targetKcal: 1500, maintenanceKcal: 1700, sex: 'male', weightKg: 60, bodyFatPercent: 15, bodyFatSource: 'dexa' });
    expect(b.min).toBeGreaterThanOrEqual(1500);
    expect(b.heldBy).toMatch(/_floor$/);
  });

  test('the 0.8%/week line holds a hard cut', () => {
    const b = energyChoiceBounds({ targetKcal: 2400, maintenanceKcal: 3000, sex: 'male', weightKg: 80, bodyFatPercent: 15, bodyFatSource: 'dexa' });
    const line = 3000 - (MAX_SAFE_LOSS_RATE * 80 * KCAL_PER_KG_FAT) / 7;
    expect(b.min).toBeGreaterThanOrEqual(Math.round(line));
  });

  test('unusable input offers no choice', () => {
    expect(energyChoiceBounds({ targetKcal: 0, maintenanceKcal: 2000, sex: 'male', weightKg: 80 }).canChoose).toBe(false);
    expect(energyChoiceBounds({ targetKcal: 2500, maintenanceKcal: 2500, sex: 'male', weightKg: NaN }).canChoose).toBe(false);
  });
});

describe('position, suppression and macros', () => {
  const bounds = { min: 3675, max: 4475, step: 25, canChoose: true, heldBy: null };
  test('position round trip lands on the same step', () => {
    for (const kcal of [3675, 3800, 4075, 4250, 4475]) {
      const p = choicePosition(kcal, 4077);
      expect(resolveChosenTarget({ position: p, suppressed: false, bounds, targetKcal: 4077 })).toBe(kcal);
    }
  });
  test('suppressed returns the engine target whatever the position', () => {
    expect(resolveChosenTarget({ position: 1, suppressed: true, bounds, targetKcal: 4077 })).toBe(4077);
    expect(resolveChosenTarget({ position: -1, suppressed: true, bounds, targetKcal: 4077 })).toBe(4077);
  });
  test('macros keep protein and fat, carbs absorb the change', () => {
    const m = macrosForChoice(4300, { proteinG: 180, fatG: 90 });
    expect(m.proteinG).toBe(180);
    expect(m.fatG).toBe(90);
    expect(m.carbsG).toBe(Math.round((4300 - 720 - 810) / 4));
    expect(Math.abs(m.targetKcal - 4300)).toBeLessThanOrEqual(2);
    expect(macrosForChoice(900, { proteinG: 180, fatG: 90 }).carbsG).toBe(0);
  });
});
