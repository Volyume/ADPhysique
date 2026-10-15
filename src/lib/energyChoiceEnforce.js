/**
 * energyChoiceEnforce.js -- D226 (review fix, 2026-10-12): calm mode or an
 * open ED flag puts the engine's own target back everywhere, not only while
 * Nutrition targets is open.
 *
 * The chosen place in the range is kept in one record (ENERGY_CHOICE_KEY):
 * { position, appliedPosition, chosenKcal, base: { targetKcal, proteinG,
 * fatG, carbsG, floorApplied } }. It holds numbers only (no sex, weight or
 * body fat) and follows the person across devices through the prefs sync, so
 * every device can tell a chosen target from the engine's.
 *
 * enforceEnergyChoice runs when the app comes to the foreground, when calm
 * mode is switched on, when an ED flag is raised, and when Nutrition targets
 * gains focus. Suppressed (calm, an open flag, or either read failing): if the
 * saved target is the chosen one, the engine's target and macros are saved
 * back. A target changed elsewhere (a coach adjustment) is the coach's, not a
 * choice, and is left as it is. Never lowers anything: the engine's target is
 * the higher-safety number by construction (the slider is hidden under
 * suppression, so nothing new can be chosen).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAFE_MINIMUM_LINE } from './energyChoice';

export const ENERGY_CHOICE_KEY = '@volyume_energy_choice';
const NUTRITION_TARGETS_KEY = '@volyume_nutrition_targets';

/** The choice record, or null. */
export async function readChoiceRecord() {
  try {
    const raw = await AsyncStorage.getItem(ENERGY_CHOICE_KEY);
    const rec = raw ? JSON.parse(raw) : null;
    return rec && typeof rec === 'object' && rec.base ? rec : null;
  } catch (_) { return null; }
}

/** Save the choice record; only numbers are kept. */
export async function writeChoiceRecord({ position, appliedPosition, chosenKcal, base }) {
  const clean = {
    position: Number(position) || 0,
    appliedPosition: Number(appliedPosition) || 0,
    chosenKcal: Number(chosenKcal),
    base: {
      targetKcal: Number(base.targetKcal),
      proteinG: Number(base.proteinG),
      fatG: Number(base.fatG),
      carbsG: Number(base.carbsG),
      floorApplied: base.floorApplied === true,
    },
  };
  await AsyncStorage.setItem(ENERGY_CHOICE_KEY, JSON.stringify(clean));
}

/**
 * Fail-closed: true when calm mode is on, an ED flag is open, or either read
 * fails. D228 item 2: reads through the one composition
 * (src/lib/safetyState.js); a missing user is the unknown, suppressed state.
 */
export async function isEnergyChoiceSuppressed(userId) {
  try {
    // eslint-disable-next-line global-require
    const { readSafetyState } = require('./safetyState');
    const s = await readSafetyState(userId);
    return s.suppressed;
  } catch (_) {
    return true;
  }
}

/**
 * Put the engine's target back when suppressed and the saved target is a choice.
 * @returns {Promise<'not_suppressed'|'no_choice'|'nothing_to_revert'|'reverted'|'failed'>}
 */
export async function enforceEnergyChoice(userId) {
  if (!userId) return 'no_choice';
  if (!(await isEnergyChoiceSuppressed(userId))) return 'not_suppressed';
  const rec = await readChoiceRecord();
  if (!rec) return 'no_choice';
  try {
    // eslint-disable-next-line global-require
    const { getNutritionTargets, saveNutritionTargets } = require('./database');
    const saved = await getNutritionTargets(userId);
    const chosen = Number(rec.chosenKcal);
    if (!saved || Number(saved.targetKcal) !== chosen || chosen === Number(rec.base.targetKcal)) return 'nothing_to_revert';
    const engine = {
      ...saved,
      targetKcal: rec.base.targetKcal,
      proteinG: rec.base.proteinG,
      fatG: rec.base.fatG,
      carbsG: rec.base.carbsG,
      warnings: (Array.isArray(saved.warnings) ? saved.warnings : []).filter((w) => w !== SAFE_MINIMUM_LINE),
      floorApplied: rec.base.floorApplied === true,
    };
    await saveNutritionTargets(userId, { ...engine, gdprConsented: true });
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_TARGETS_KEY);
      const mirror = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(NUTRITION_TARGETS_KEY, JSON.stringify({ ...mirror, ...engine }));
    } catch (_) { /* the database row is the source every reader uses; the mirror is a cache */ }
    await writeChoiceRecord({ ...rec, appliedPosition: 0, chosenKcal: rec.base.targetKcal });
    return 'reverted';
  } catch (e) {
    // eslint-disable-next-line global-require
    try { require('./errorLog').logError('energyChoice.enforce', e); } catch (_) {}
    return 'failed';
  }
}
