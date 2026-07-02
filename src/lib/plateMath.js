/**
 * plateMath — pure barbell plate arithmetic for the in-session plate
 * calculator (B8, audit 05 §B8; rebuilt after the original component was
 * removed as consumer-less in the Hevy-teardown P1 wave — this rebuild has
 * a real entry point in the Active Workout exercise overflow sheet).
 *
 * Gym weights are kg-only by design (UK) — see useAppStore units — so this
 * module is kg-only too; the old lbs branch is deliberately not rebuilt.
 *
 * Pure functions, no I/O, deterministic: same inputs, same answer, always.
 * Arithmetic runs in integer quarter-kilograms (the smallest standard
 * plate, 1.25 kg, is 5 quarters) so floating-point dust can never change
 * which plates are chosen.
 */

// Standard kg plate denominations, largest first (greedy order). Pairs are
// assumed — the calculator answers "per side".
export const PLATE_SET_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

// Standard Olympic barbell. The store's barWeight defaults to this; the
// calculator lets the user override per use (EZ and Smith bars vary).
export const DEFAULT_BAR_KG = 20;

const toQuarters = (kg) => Math.round(kg * 4);
const fromQuarters = (q) => q / 4;

/**
 * Work out the plate loading for a target total weight.
 *
 * @param {number} targetKg total weight wanted on the bar (bar included)
 * @param {number} barKg    bar weight (default 20)
 * @param {number[]} plateSet available denominations, any order
 * @returns {{
 *   ok: boolean,          // inputs usable (finite, target > 0, bar > 0)
 *   belowBar: boolean,    // target is below the bar itself — nothing to load
 *   perSide: {plate: number, count: number}[], // largest first, counts > 0
 *   sideKg: number,       // plate weight loaded on ONE side
 *   loadedKg: number,     // closest achievable total (bar + both sides)
 *   remainderKg: number,  // targetKg - loadedKg (0 when exact)
 * }}
 */
export function calculatePlates(targetKg, barKg = DEFAULT_BAR_KG, plateSet = PLATE_SET_KG) {
  const target = Number(targetKg);
  const bar = Number(barKg);
  if (!Number.isFinite(target) || !Number.isFinite(bar) || target <= 0 || bar <= 0) {
    return { ok: false, belowBar: false, perSide: [], sideKg: 0, loadedKg: 0, remainderKg: 0 };
  }
  if (target < bar) {
    return { ok: true, belowBar: true, perSide: [], sideKg: 0, loadedKg: bar, remainderKg: target - bar };
  }

  // Domain: quarter-kilogram multiples only. The integer arithmetic below
  // is exact for them; a denomination like 1.1 kg would snap during
  // allocation but report its real value, letting the result overshoot the
  // target. No real kg plate is finer than 1.25, so off-grid values are
  // rejected rather than approximated.
  const denoms = [...plateSet]
    .filter((p) => Number.isFinite(p) && p > 0 && Math.round(p * 4) === p * 4)
    .sort((a, b) => b - a);

  // Greedy largest-first on one side, in quarter-kg integers.
  let sideQ = Math.floor(toQuarters(target - bar) / 2);
  const perSide = [];
  for (const plate of denoms) {
    const plateQ = toQuarters(plate);
    const count = Math.floor(sideQ / plateQ);
    if (count > 0) {
      perSide.push({ plate, count });
      sideQ -= count * plateQ;
    }
  }

  const sideKg = perSide.reduce((sum, p) => sum + p.plate * p.count, 0);
  const loadedKg = bar + sideKg * 2;
  // Quarter-kg rounding keeps this exact; guard against -0 for display.
  const remainderKg = fromQuarters(toQuarters(target) - toQuarters(loadedKg)) + 0;

  return { ok: true, belowBar: false, perSide, sideKg, loadedKg, remainderKg };
}
