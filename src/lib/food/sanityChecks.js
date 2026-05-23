/**
 * Sanity checks for food data before it enters Precision Coaching's
 * intake calculations. Catches gross errors (typos, mis-entered
 * macros, label OCR misreads) that would otherwise contaminate the
 * 7-day intake average and skew the FFM-floor calculation.
 *
 * Each check returns { valid, reason } where reason is a plain
 * English explanation suitable for a soft warning in the UI.
 *
 * Locked in FOOD_DATA_STRATEGY_LOCKED.md.
 */

/**
 * Energy plausibility: kcal/100g should be within physical bounds.
 * Anything above 900 kcal/100g is implausible (pure fat is 900);
 * anything negative is impossible.
 */
export function checkKcalPlausible(kcal100g) {
  if (typeof kcal100g !== 'number' || !isFinite(kcal100g)) {
    return { valid: false, reason: 'Calories per 100g is missing or not a number.' };
  }
  if (kcal100g < 0) {
    return { valid: false, reason: 'Calories per 100g is negative.' };
  }
  if (kcal100g > 900) {
    return { valid: false, reason: 'Calories per 100g is higher than pure fat (900). Check the label again.' };
  }
  return { valid: true };
}

/**
 * Macro mass coherence: protein + carbs + fat in grams should not
 * exceed 110% of 100g (10% slack for fibre, sodium, water, rounding).
 */
export function checkMacroMass(protein100g, carbs100g, fat100g) {
  const p = Number(protein100g) || 0;
  const c = Number(carbs100g) || 0;
  const f = Number(fat100g) || 0;
  if (p < 0 || c < 0 || f < 0) {
    return { valid: false, reason: 'A macro value is negative.' };
  }
  const total = p + c + f;
  if (total > 110) {
    return {
      valid: false,
      reason: `Protein, carbs, and fat add up to more than 100g per 100g of food. Something is off.`,
    };
  }
  return { valid: true };
}

/**
 * Energy vs macro coherence: the label kcal should be within 20% of
 * the macro-derived estimate (4*protein + 4*carbs + 9*fat). If it's
 * far off, the label or the macros were mistyped.
 */
export function checkKcalMatchesMacros(kcal100g, protein100g, carbs100g, fat100g) {
  const p = Number(protein100g) || 0;
  const c = Number(carbs100g) || 0;
  const f = Number(fat100g) || 0;
  const k = Number(kcal100g) || 0;
  const derived = 4 * p + 4 * c + 9 * f;
  if (derived === 0 && k === 0) return { valid: true };
  if (derived === 0) {
    return {
      valid: false,
      reason: `Calories say ${Math.round(k)} but the macros total zero. Check that protein, carbs, and fat are entered.`,
    };
  }
  const drift = Math.abs(k - derived) / derived;
  if (drift > 0.2) {
    return {
      valid: false,
      reason: `Calories don't quite match the macros: ${Math.round(k)} kcal labelled, ${Math.round(derived)} kcal from the macros. Worth checking the label again.`,
    };
  }
  return { valid: true };
}

/**
 * Run every sanity check against a food. Returns the first failure
 * if any, otherwise valid. Used to gate insert into custom_foods.
 */
export function checkFoodSanity(food) {
  const checks = [
    checkKcalPlausible(food.kcal100g),
    checkMacroMass(food.protein100g, food.carbs100g, food.fat100g),
    checkKcalMatchesMacros(food.kcal100g, food.protein100g, food.carbs100g, food.fat100g),
  ];
  const failure = checks.find(c => !c.valid);
  return failure ?? { valid: true };
}
