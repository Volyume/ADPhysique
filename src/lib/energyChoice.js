/**
 * energyChoice.js -- D226 (founder decision 2026-10-12): the person picks
 * their daily energy target inside the estimated range.
 *
 * Pure, no I/O, deterministic. Reads the engine's floors and never lowers,
 * removes or conditions any of them (CLAUDE.md Section 2, ED safety):
 *   - the slider's lowest point is the highest of the range's bottom, the
 *     1,500 / 1,200 kcal sex floor, the FFM energy floor (30 kcal/kg) and the
 *     0.8% bodyweight-a-week safe-loss line (stricter than the 1.5% hard
 *     gate, so both hold);
 *   - it never goes below the engine's own target when a floor sits above it
 *     (the engine's target stays choosable, as it is today);
 *   - under calm mode or an open ED flag the caller does not offer a choice
 *     and the engine's target applies (resolveChosenTarget with suppressed).
 * Macros follow as the engine builds them: protein and fat are set by body
 * weight, carbs take the rest (nutritionEngine calculateNutritionTargets).
 */

import {
  computeFFMFloor,
  kcalFloorForSex,
  MAX_SAFE_LOSS_RATE,
  KCAL_PER_KG_FAT,
} from './nutritionEngine';

/** The range either side of the engine's target (nutritionEngine: 0.9 to 1.1). */
export const RANGE_FRACTION = 0.1;
/** The slider moves in steps of this many kcal. */
export const ENERGY_STEP_KCAL = 25;

/** The highest point at or below `top` on the grid that starts at `min`. */
function onGridBelow(min, top) {
  return top <= min ? min : min + Math.floor((top - min) / ENERGY_STEP_KCAL) * ENERGY_STEP_KCAL;
}


/**
 * The lowest and highest target the person may choose.
 * @param {object} a
 * @param {number} a.targetKcal       the engine's target
 * @param {number} a.maintenanceKcal  the engine's maintenance (tdee)
 * @param {?string} a.sex
 * @param {number} a.weightKg
 * @param {?number} [a.bodyFatPercent]
 * @param {?string} [a.bodyFatSource]
 * @returns {{ min: number, max: number, step: number, canChoose: boolean, heldBy: ?string }}
 *   heldBy names the limit that sets the lowest point when it is above the
 *   range's bottom ('sex_floor' | 'ffm_floor' | 'safe_loss'), else null.
 */
export function energyChoiceBounds({ targetKcal, maintenanceKcal, sex = null, weightKg, bodyFatPercent = null, bodyFatSource = null }) {
  const target = Number(targetKcal);
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(weightKg) || weightKg <= 0) {
    return { min: target, max: target, step: ENERGY_STEP_KCAL, canChoose: false, heldBy: null };
  }
  const rangeLow = Math.round(target * (1 - RANGE_FRACTION));
  const rangeHigh = Math.round(target * (1 + RANGE_FRACTION));
  const limits = [
    { key: 'sex_floor', kcal: kcalFloorForSex(sex) },
    { key: 'ffm_floor', kcal: computeFFMFloor(weightKg, { bodyFatPercent, bodyFatSource, sex }).floorKcal },
  ];
  if (Number.isFinite(maintenanceKcal) && maintenanceKcal > 0) {
    limits.push({ key: 'safe_loss', kcal: Math.round(maintenanceKcal - (MAX_SAFE_LOSS_RATE * weightKg * KCAL_PER_KG_FAT) / 7) });
  }
  let low = rangeLow;
  let heldBy = null;
  for (const l of limits) {
    if (l.kcal > low) { low = l.kcal; heldBy = l.key; }
  }
  // Steps inside the bounds: the lowest step at or above the floor, the
  // highest at or below the range's top.
  let min = Math.ceil(low / ENERGY_STEP_KCAL) * ENERGY_STEP_KCAL;
  // A floor above the engine's target never takes the target itself away.
  if (min > target) { min = target; }
  // The top sits on the slider's grid, which starts at the lowest point.
  const max = onGridBelow(min, rangeHigh);
  return { min, max, step: ENERGY_STEP_KCAL, canChoose: max > min, heldBy };
}

/**
 * Where a chosen target sits in the range, kept so a recalculation lands the
 * choice in the same place: -1 is the range's bottom, 0 the engine's target,
 * 1 the top.
 */
export function choicePosition(chosenKcal, targetKcal) {
  const t = Number(targetKcal);
  const c = Number(chosenKcal);
  if (!Number.isFinite(t) || t <= 0 || !Number.isFinite(c)) return 0;
  const p = (c - t) / (t * RANGE_FRACTION);
  return Math.max(-1, Math.min(1, Math.round(p * 1000) / 1000));
}

/**
 * The target that applies. Suppressed (calm mode, an open ED flag, or either
 * read failing): the engine's target, whatever was chosen before.
 * @returns {number}
 */
export function resolveChosenTarget({ position, suppressed, bounds, targetKcal }) {
  const t = Number(targetKcal);
  if (suppressed || !bounds || !bounds.canChoose || !Number.isFinite(position) || position === 0) return t;
  const raw = t + position * t * RANGE_FRACTION;
  // The slider's own grid, which starts at its lowest point (a lowest point
  // held at an engine target that is not a multiple of the step keeps the
  // value saved equal to the value shown).
  const onGrid = bounds.min + Math.round((raw - bounds.min) / bounds.step) * bounds.step;
  return Math.max(bounds.min, Math.min(bounds.max, onGrid));
}

/**
 * The floor inputs, from the person's SAVED profile only (never from a form
 * being edited: an unsaved sex or weight change must not lower the floors).
 * Null when any part is missing, and the slider is then not offered.
 * @param {?object} profile  the stored user profile
 * @returns {?{ sex: string, weightKg: number, bodyFatPercent: ?number, bodyFatSource: ?string }}
 */
export function floorInputsFromProfile(profile) {
  const sex = profile?.sex ?? profile?.biologicalSex ?? null;
  const weightKg = Number(profile?.weightKg);
  if (!sex || !Number.isFinite(weightKg) || weightKg <= 0) return null;
  const bf = Number(profile?.bodyFatPercent);
  const ok = Number.isFinite(bf) && bf > 0 && bf < 60;
  return { sex, weightKg, bodyFatPercent: ok ? bf : null, bodyFatSource: ok ? (profile?.bodyFatSource ?? null) : null };
}

/** The line a target held at its lowest point carries, so every reader treats it as floored. */
export const SAFE_MINIMUM_LINE = 'This target sits at your safe minimum. Days below safe minimum are not part of the plan.';

/** True when a chosen target sits at a lowest point a limit holds (the target then counts as floored). */
export function choiceAtFloor(chosenKcal, bounds) {
  return !!bounds && bounds.heldBy != null && Number(chosenKcal) <= bounds.min;
}

/**
 * The macros for a chosen target, built as the engine builds them: protein
 * and fat grams stay, carbs take the rest (never below zero).
 * @param {number} chosenKcal
 * @param {{ proteinG: number, fatG: number }} engine  the engine's macros
 * @returns {{ targetKcal: number, proteinG: number, fatG: number, carbsG: number }}
 */
export function macrosForChoice(chosenKcal, { proteinG, fatG }) {
  const carbKcal = Math.max(chosenKcal - proteinG * 4 - fatG * 9, 0);
  // Rounded up, so the macros never add up to less than the chosen target
  // (a choice at the floor must not be saved a few kcal under it).
  const carbsG = Math.ceil(carbKcal / 4);
  return { targetKcal: Math.round(proteinG * 4 + fatG * 9 + carbsG * 4), proteinG, fatG, carbsG };
}

/**
 * The bounds held by the strictest of several input sets (the saved records
 * and the inputs the engine target was last calculated from): the lowest
 * point is the highest any of them sets, so no single set of inputs, saved
 * or calculated, can lower a floor. Null when no input set is complete.
 */
export function strictestBounds({ targetKcal, maintenanceKcal }, inputSets) {
  const sets = (inputSets || []).filter(Boolean);
  if (!sets.length) return null;
  const all = sets.map((inp) => energyChoiceBounds({ targetKcal, maintenanceKcal, ...inp }));
  const strict = all.reduce((a, b) => (b.min > a.min ? b : a));
  const max = onGridBelow(strict.min, Math.min(...all.map((b) => b.max)));
  return { ...strict, max, canChoose: max > strict.min };
}
