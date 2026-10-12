/**
 * energyChoiceView.js -- D226: the screen's view of a chosen energy target.
 *
 * Pure, no I/O. Given the engine's saved record, the engine's own baseline
 * (target and macros) and the chosen kcal, returns the record the screen shows
 * and saves: macros follow the choice (energyChoice.macrosForChoice), the
 * engine's maintenance (tdee) stays, and every derived safety read is redone
 * for the chosen number so a lower pick never hides a caution:
 *   - the energy-availability caution is recomputed for the chosen target;
 *   - the engine's "raised to floor" lines and flag describe the engine's
 *     target only, so they are dropped once the person has moved off it.
 * Floors are not applied here (energyChoice.js bounds the choice already).
 */
import { macrosForChoice, choiceAtFloor, SAFE_MINIMUM_LINE } from './energyChoice';
import { energyAvailabilityCaution, KCAL_PER_KG_FAT } from './nutritionEngine';

const EA_LINE_START = 'This target is low on energy availability';
const isFloorLine = (w) => typeof w === 'string' && (w.includes('Raising to floor') || w.includes('hard gate'));

/**
 * @param {object} raw     the saved/engine record (tdee, maintenanceKcal, warnings ...)
 * @param {{targetKcal:number,proteinG:number,fatG:number,carbsG:number}} base  the engine's baseline
 * @param {number} chosenKcal
 * @param {?{sex:?string,weightKg:number,bodyFatPercent:?number,bodyFatSource:?string}} inputs
 * @param {?object} [bounds]  the slider's bounds; a choice at a lowest point a
 *   limit holds is marked floored (floorApplied and the safe-minimum line), so
 *   meal plans and coach cuts never treat the band below it as allowed
 */
export function applyChoiceToResults(raw, base, chosenKcal, inputs, bounds = null) {
  if (!raw || !base) return raw;
  if (!Number.isFinite(chosenKcal) || chosenKcal === base.targetKcal) {
    return { ...raw, targetKcal: base.targetKcal, proteinG: base.proteinG, fatG: base.fatG, carbsG: base.carbsG };
  }
  const m = macrosForChoice(chosenKcal, base);
  const maintenance = Number(raw.maintenanceKcal ?? raw.tdee);
  const out = {
    ...raw,
    targetKcal: m.targetKcal,
    proteinG: m.proteinG,
    fatG: m.fatG,
    carbsG: m.carbsG,
    floorApplied: choiceAtFloor(chosenKcal, bounds),
    warnings: (raw.warnings ?? []).filter((w) => !isFloorLine(w) && w !== SAFE_MINIMUM_LINE && !String(w).startsWith(EA_LINE_START)),
  };
  if (out.floorApplied) out.warnings.push(SAFE_MINIMUM_LINE);
  if (Number.isFinite(maintenance) && maintenance > 0) {
    out.targetRateKgPerWeek = parseFloat((((m.targetKcal - maintenance) * 7) / KCAL_PER_KG_FAT).toFixed(3));
  }
  const ea = inputs && Number.isFinite(maintenance)
    ? energyAvailabilityCaution(m.targetKcal, maintenance, inputs)
    : null;
  out.eaCaution = ea;
  if (ea) {
    const easeLine = ea.suggestedKcal
      ? ` Easing to about ${ea.suggestedKcal} kcal would keep more energy available for training and recovery.`
      : ' Easing the deficit a little would keep more energy available for training and recovery.';
    out.warnings.push(`${EA_LINE_START} (about ${ea.proxyEA} kcal per kg of lean mass, under the ${ea.cautionKcalPerKg} guideline).${easeLine}`);
  }
  return out;
}
