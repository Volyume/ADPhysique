/**
 * food/calorieBank.js — Calorie banking, CB-1 ("Plan a bigger day").
 * Source: docs/ultimate-audit-2026-06-13/pass4-blueprint-calorie-banking.md.
 *
 * Pure, deterministic redistribution of the week's calories: bump ONE chosen
 * day up and spread an equal reduction across the other days, holding the
 * WEEKLY TOTAL constant (sum of deltas === 0). Because the weekly total is
 * unchanged, the coach's 7-day rolling average, the rapid-loss gate and the
 * ED-pattern detector see identical inputs to a flat week
 * (weeklyCoach.js:828-834,:677).
 *
 * SAFETY BY CONSTRUCTION (blueprint EDGE CASES):
 *  - No day may fall below the user's safe floor (the caller passes
 *    floorKcal = max(sex floor 1500/1200 nutritionEngine.js:792, FFM floor
 *    nutritionEngine.js:597)). If the requested bump cannot be spread without a
 *    day breaching the floor, we reduce it; if even the minimum meaningful bump
 *    cannot clear, we REFUSE and write nothing.
 *  - The big day stays within the engine's band max (room-to-band-max cap),
 *    mirroring how dayVariantTargets clamps a cycle to the band.
 *  - This module is MATHS ONLY. The caller enforces the ED-pattern / calm-mode /
 *    floored-or-compressed-target carve-out (banking disabled, no-op) BEFORE
 *    calling, exactly as the assembler/coach gate on targetWasFloored /
 *    edPatternOpen (mealPlanAssembler.js:88; weeklyCoach.js:426).
 *
 * Determinism: same inputs in, same delta map out.
 */

import { applyMacroDeltaToPlan } from './planEdit';

// A bump below this is presentation noise, not a banked day — refuse rather than
// show a fake "bigger day" (mirrors MIN_MEANINGFUL_CYCLE_KCAL in the assembler).
export const MIN_BANK_DELTA_KCAL = 50;
// Hard ceiling on how much a single day can be bumped, regardless of room. The
// band-max cap usually binds first; this is a belt-and-braces upper bound.
// Founder-confirmed value (2026-06-16).
export const MAX_BANK_DELTA_KCAL = 500;

const isNum = (n) => typeof n === 'number' && isFinite(n);

/**
 * @param {Object} args
 * @param {Object<string,number>} args.perDayBaseKcal  base kcal per day key (>=2 days)
 * @param {string} args.bigDayKey                       the day to bump up
 * @param {number} args.requestedBumpKcal               kcal to add to the big day
 * @param {number} args.floorKcal                       safe floor (max of sex/FFM floor)
 * @param {number} args.bandMaxKcal                     engine band max for the big day
 * @param {number} [args.maxBankDelta]                  hard ceiling on the bump
 * @returns {{ok:boolean, reason:string, appliedBumpKcal:number, perDayDeltaKcal:Object<string,number>}}
 *   reason ∈ 'ok' | 'invalid_input' | 'no_room' | 'floor' | 'too_small'.
 *   On failure perDayDeltaKcal is {} and appliedBumpKcal is 0 (write nothing).
 */
export function planCalorieBank({
  perDayBaseKcal,
  bigDayKey,
  requestedBumpKcal,
  floorKcal,
  bandMaxKcal,
  maxBankDelta = MAX_BANK_DELTA_KCAL,
} = {}) {
  const fail = (reason) => ({ ok: false, reason, appliedBumpKcal: 0, perDayDeltaKcal: {} });

  if (!perDayBaseKcal || typeof perDayBaseKcal !== 'object') return fail('invalid_input');
  const keys = Object.keys(perDayBaseKcal);
  if (keys.length < 2 || !keys.includes(bigDayKey)) return fail('invalid_input');
  if (!isNum(floorKcal) || !isNum(bandMaxKcal) || !isNum(maxBankDelta)) return fail('invalid_input');
  if (keys.some((k) => !isNum(perDayBaseKcal[k]))) return fail('invalid_input');
  if (!isNum(requestedBumpKcal) || requestedBumpKcal <= 0) return fail('too_small');

  const others = keys.filter((k) => k !== bigDayKey);
  const n = others.length;

  const roomUp = bandMaxKcal - perDayBaseKcal[bigDayKey];
  // The most we can pull from the others evenly without any one breaching the floor.
  const roomDownMin = Math.min(...others.map((k) => perDayBaseKcal[k] - floorKcal));
  const maxSpread = roomDownMin * n;

  // Distinguish why a bump is impossible so the UI can speak plainly.
  if (roomUp < MIN_BANK_DELTA_KCAL) return fail('no_room');
  if (maxSpread < MIN_BANK_DELTA_KCAL) return fail('floor');

  const bump = Math.floor(Math.min(requestedBumpKcal, maxBankDelta, roomUp, maxSpread));
  if (bump < MIN_BANK_DELTA_KCAL) return fail('too_small');

  // Integer reductions across the others that sum to EXACTLY `bump`, so the
  // delta map sums to zero after rounding. The first `remainder` others take one
  // extra kcal; every reduction stays <= roomDownMin, so no day breaches.
  const baseCut = Math.floor(bump / n);
  const remainder = bump - baseCut * n;
  const perDayDeltaKcal = { [bigDayKey]: bump };
  others.forEach((k, i) => {
    perDayDeltaKcal[k] = -(baseCut + (i < remainder ? 1 : 0));
  });

  return { ok: true, reason: 'ok', appliedBumpKcal: bump, perDayDeltaKcal };
}

/** Sum of a delta map (should always be 0 for a successful plan). */
export function deltaSum(perDayDeltaKcal = {}) {
  return Object.values(perDayDeltaKcal).reduce((a, n) => a + (Number(n) || 0), 0);
}

// kcal per gram of carbohydrate. Banking moves its delta through CARBS — the
// lever — holding protein and fat, mirroring the engine's protein-protected
// day cycle (dayVariantTargets).
const KCAL_PER_G_CARB = 4;

/** The banked kcal delta for one day key (0 when no bank applies to it). */
export function bankedDeltaForDay(calorieBank, dayKey) {
  const map = calorieBank && calorieBank.perDayDeltaKcal;
  if (!map || !(dayKey in map)) return 0;
  const v = Number(map[dayKey]);
  return isFinite(v) ? v : 0;
}

/** The per-day sex floor: 1500 kcal male, 1200 otherwise (nutritionEngine.js:792). */
export function sexFloorKcal(sex) {
  return sex === 'male' ? 1500 : 1200;
}

/**
 * The safe per-day floor banking must never breach: max(sex floor, FFM floor)
 * per the blueprint (line 90). The caller computes the FFM floor kcal via the
 * engine's computeFFMFloor and passes it in; when it is unknown we fall back to
 * the sex floor alone.
 */
export function safeDayFloorKcal({ sex, ffmFloorKcal = null } = {}) {
  const sf = sexFloorKcal(sex);
  const ffm = Number(ffmFloorKcal);
  return isFinite(ffm) && ffm > sf ? Math.round(ffm) : sf;
}

/**
 * The banked delta to actually DISPLAY for a day: zero unless banking is
 * currently allowed (every safety carve-out clear), EVEN IF a bank is still
 * persisted. This stops a stale bank from applying after a carb cycle / refeed
 * starts, the target gets floored, or an ED-pattern flag opens.
 */
export function displayBankedDelta({ bankingAvailable, calorieBank, dayKey }) {
  return bankingAvailable ? bankedDeltaForDay(calorieBank, dayKey) : 0;
}

/**
 * CB-1b: bring each planned day's FOOD in line with its banked target, not just
 * the target number (founder 2026-06-16). For each plan day whose date carries a
 * non-zero banked delta, route that delta through the coach's food-level editor
 * (applyMacroDeltaToPlan: carbs-first lever, protein protected, double
 * floor-clamp) so the meals on a lower-calorie day are trimmed and a
 * higher-calorie day is topped up, holding the weekly total.
 *
 * Pure: the caller supplies the parallel `dayKeys` (the calendar date each plan
 * day is scheduled to, e.g. today + i) so no date library is needed here, and
 * the floor it must never breach. Returns one entry per ADJUSTED day:
 *   { dayIndex, dayKey, editedDay, change }
 * where `change` is the planEdit record the UI narrates per day. Days with no
 * banked delta are left untouched and omitted (no food change, target-only).
 *
 * @param {Array}  planDays         assembled plan days (slots/items/totals)
 * @param {Array<string>} dayKeys   date key for each planDays[i] (same length/order)
 * @param {Object} perDayDeltaKcal  bank delta map keyed by date
 * @param {number} floorKcal        the hard per-day floor (max sex/FFM floor)
 */
export function bankedPlanDayEdits({ planDays = [], dayKeys = [], perDayDeltaKcal = {}, floorKcal = 0 } = {}) {
  const out = [];
  if (!Array.isArray(planDays) || !Array.isArray(dayKeys)) return out;
  const n = Math.min(planDays.length, dayKeys.length);
  for (let i = 0; i < n; i += 1) {
    const dayKey = dayKeys[i];
    const delta = Number(perDayDeltaKcal?.[dayKey]) || 0;
    if (!delta) continue;
    const { plan: editedDay, change } = applyMacroDeltaToPlan({
      plan: planDays[i], adjustmentKcal: delta, floorKcal,
    });
    out.push({ dayIndex: i, dayKey, editedDay, change });
  }
  return out;
}

/**
 * Apply a banked kcal delta to a day's target for DISPLAY: shift kcal and carry
 * the change in carbs; protein and fat are untouched. Returns the target
 * unchanged when there is no delta.
 */
export function applyBankToTarget(targets, deltaKcal) {
  if (!targets || !deltaKcal) return targets;
  return {
    ...targets,
    targetKcal: Math.round((Number(targets.targetKcal) || 0) + deltaKcal),
    carbsG: Math.max(0, Math.round((Number(targets.carbsG) || 0) + deltaKcal / KCAL_PER_G_CARB)),
  };
}
