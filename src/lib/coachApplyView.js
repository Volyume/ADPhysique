/**
 * coachApplyView.js — pure DISPLAY helpers for the CoachOutput Apply rows
 * (A1 verdict screen; audit/02-ux-audit.md NU-3, NU-4, NU-6).
 *
 * Policy lives in coachApply.js and is READ-ONLY: these helpers only CALL the
 * real compute functions and the exported kcalFloorForSex value to say, before
 * the tap, what the tap would actually write. Nothing here recomputes a floor,
 * threshold or split of its own.
 *
 * Row outcomes:
 *   'ok'          the tap applies exactly what the row label implies
 *   'floor_clamp' the tap applies, but LESS than the label implies, because
 *                 the sacred sex calorie floor catches it part-way (NU-3:
 *                 the row must say so, not pretend the full change landed)
 *   'floor_hold'  the floor blocks the change entirely (the compute function
 *                 returns null) — the row explains the hold instead of
 *                 offering a button whose tap would silently do nothing
 *   'unavailable' nothing to compute against (no current target, or the
 *                 engine suggestion no longer fits the current targets)
 *   'none'        no change proposed
 *
 * Strings render through formatEnergy/energyUnitLabel so the kJ display
 * preference is honoured (NU-6). All stored and engine values stay kcal;
 * the conversion is display-only.
 */
import { computeCalorieTargets, computeMacroCycle, kcalFloorForSex } from './coachApply';
import { formatEnergy, energyUnitLabel } from './format';

/**
 * Classify what applying a calorie change to the CURRENT targets would do.
 *
 * @param {object|null} nutrition current nutrition_targets row (targetKcal…)
 * @param {number} change kcal delta the coach proposed
 * @param {string|null} sex drives the sacred floor via kcalFloorForSex
 * @returns {{ kind: string, floorKcal: number, newKcal?: number }}
 */
export function classifyCalorieApply(nutrition, change, sex) {
  const floorKcal = kcalFloorForSex(sex);
  const current = nutrition?.targetKcal ?? null;
  if (!change) return { kind: 'none', floorKcal };
  const computed = computeCalorieTargets(nutrition, change, sex);
  if (!computed) {
    // computeCalorieTargets nulls for two reasons: nothing to scale from
    // (no current target), or the floor clamps a cut straight back to the
    // current value. Attribute the hold to the floor only when it IS the
    // floor; anything else is a plain "nothing to apply".
    if (current && change < 0 && current <= floorKcal) {
      return { kind: 'floor_hold', floorKcal };
    }
    return { kind: 'unavailable', floorKcal };
  }
  if (computed.newKcal !== current + change) {
    return { kind: 'floor_clamp', floorKcal, newKcal: computed.newKcal };
  }
  return { kind: 'ok', floorKcal, newKcal: computed.newKcal };
}

/**
 * Classify what applying the carb cycle to the CURRENT targets would do.
 *
 * Distinguishes "the sacred floor blocks the cycle" from a structurally
 * impossible cycle WITHOUT recomputing the split maths: re-run the same
 * real function with the target lifted far above any floor. If the cycle
 * works up there, the floor was the only thing stopping it down here.
 *
 * @returns {{ kind: 'ok'|'floor_hold'|'unavailable', floorKcal: number, split?: object }}
 */
export function classifyMacroCycleApply(nutrition, trainingDaysPerWeek, sex) {
  const floorKcal = kcalFloorForSex(sex);
  const split = computeMacroCycle(nutrition, trainingDaysPerWeek, { sex });
  if (split) return { kind: 'ok', floorKcal, split };
  const target = nutrition?.targetKcal;
  if (target) {
    const lifted = computeMacroCycle(
      { ...nutrition, targetKcal: target + 100000 },
      trainingDaysPerWeek,
      { sex },
    );
    if (lifted) return { kind: 'floor_hold', floorKcal };
  }
  return { kind: 'unavailable', floorKcal };
}

// ── Row strings (NU-3 / NU-4) ────────────────────────────────────────────────
// Calm, plain register; no em dash (lint-enforced); energy figures honour the
// kJ display preference.

/** The floor blocked the change entirely: rendered instead of the button. */
export function floorHoldLine(floorKcal, energyUnit = 'kcal') {
  return `Held at your safe minimum of ${formatEnergy(floorKcal, energyUnit)} ${energyUnitLabel(energyUnit)}.`;
}

/** The floor caught the change part-way: the applied row must say so. */
export function floorClampLine(newKcal, energyUnit = 'kcal') {
  return `Applied to your safe minimum, ${formatEnergy(newKcal, energyUnit)} ${energyUnitLabel(energyUnit)}.`;
}

/**
 * The floor blocked the CARB CYCLE: attribute the hold correctly. The weekly
 * target is not itself held at the floor; the cycle's rest-day serving is
 * what would dip below it, so the generic "Held at your safe minimum" line
 * misstates where the floor bit.
 */
export function macroCycleHoldLine(floorKcal, energyUnit = 'kcal') {
  return `Held: a rest day would fall below your safe minimum of ${formatEnergy(floorKcal, energyUnit)} ${energyUnitLabel(energyUnit)}.`;
}

/**
 * NU-4: the pre-tap absolute + duration for an indefinite target write.
 * "Until your next check-in" is when the target is next reviewed; the write
 * itself has no expiry, so no "next week" framing.
 */
export function preTapTargetLine(newKcal, energyUnit = 'kcal', { clampedToFloor = false } = {}) {
  const base = `→ ${formatEnergy(newKcal, energyUnit)} ${energyUnitLabel(energyUnit)}/day, stays until your next check-in.`;
  return clampedToFloor ? `${base} That is your safe minimum.` : base;
}

/** Signed change figure for the row label ("+150 kcal" / "-628 kJ"). */
export function signedEnergyChange(change, energyUnit = 'kcal') {
  const sign = change > 0 ? '+' : '-';
  return `${sign}${formatEnergy(Math.abs(change), energyUnit)} ${energyUnitLabel(energyUnit)}`;
}
