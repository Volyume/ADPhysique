/**
 * food/mealPlanAssembler.js
 *
 * The deterministic day/week meal-plan assembler (deep-audit Theme G,
 * blueprint bp-meal-plan-generator §3.3). Builds a day of real curated
 * meals that lands the engine's calorie/macro target within the engine's
 * own ±10% band, then a week with training/non-training day variants and
 * seeded, reproducible variety.
 *
 * SAFETY BY CONSTRUCTION (§3.6): this module never computes a calorie
 * target. It consumes `calculateNutritionTargets` output, whose floors
 * (sex floor, FFM floor, rapid-loss compression) are already applied
 * upstream. Day variants only ever move calories BETWEEN days inside the
 * engine's published [kcalMin, kcalMax] band with the weekly total
 * preserved, and variant cycling disables itself entirely when the engine
 * raised the target to a floor. When preferences make the target
 * unreachable the day is returned flagged `withinTolerance: false` with
 * the residual: the plan never silently under-feeds to "make it fit".
 *
 * Determinism: same (target, prefs, schedule, seed) in, same plan out.
 * The seed drives a tiny ranking jitter so "regenerate" gives a
 * different-but-reproducible plan; ties break on meal id.
 */

import { CURATED_MEALS, mealItems, mealTotals } from './curatedMeals';
import { fitScore, perMealMacros, slotMatches } from './mealSuggest';
import { normalisePreferences, filterMealsByPreferences } from './planPreferences';
import { roleOf, gramRangeOf } from './foodRoles';

const KCAL_C = 4;
const KCAL_F = 9;

// Largest day-to-day calorie swing the cycle will create (round-2 item 1:
// coaching convention is a 300-600 kcal rest-day reduction; we start at the
// conservative end and the engine band clamps it further).
const MAX_CYCLE_DELTA_KCAL = 300;

const r0 = (n) => Math.round(n);
const r1 = (n) => Math.round(n * 10) / 10;

// Small deterministic PRNG (mulberry32) for the regenerate jitter.
function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function rng() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Did the engine raise this target to a safety floor? (Cycling must then
 * stay flat.) Gates on the engine's STRUCTURED `floorApplied` flag; the
 * warning-string fallback exists only for plan snapshots stored before
 * the flag shipped, and covers every floor/hard-gate warning the engine
 * actually emits (verified against nutritionEngine.js, not from memory).
 */
export function targetWasFloored(target) {
  if (target && target.floorApplied === true) return true;
  const warnings = (target && target.warnings) || [];
  return warnings.some((w) =>
    /below safe minimum|raising to floor|hard gate|raised to limit loss|rapid|capped/i.test(String(w)));
}

/**
 * Derive the training-day / rest-day variant targets from ONE engine
 * target (round-2 item 1). Protein identical on both. Carbs are the
 * lever. Fat follows prefs.fatConvention: 'equalised' (modern RP, default)
 * keeps fat constant; 'higher_rest_day' (the founder-coach convention)
 * gives ~25% of the rest-day reduction back as fat, cutting carbs deeper.
 *
 * Both variants stay inside the engine's [kcalMin, kcalMax]; the weekly
 * total is preserved exactly for the given schedule mix; and when the
 * engine floored the target (or the schedule has no mix of day types)
 * both variants equal the engine target untouched.
 */
export function dayVariantTargets(target, { trainingDays = 0, restDays = 0, fatConvention = 'equalised' } = {}) {
  const t = target || {};
  const base = {
    kcal: Number(t.targetKcal) || 0,
    proteinG: Number(t.proteinG) || 0,
    carbsG: Number(t.carbsG) || 0,
    fatG: Number(t.fatG) || 0,
  };
  const flat = { training: { ...base }, rest: { ...base }, cycleDeltaKcal: 0 };
  if (!base.kcal || trainingDays <= 0 || restDays <= 0) return flat;
  if (targetWasFloored(t)) return flat;

  const kcalMin = Number(t.kcalMin) || r0(base.kcal * 0.9);
  const kcalMax = Number(t.kcalMax) || r0(base.kcal * 1.1);

  // Rest-day reduction, clamped to the engine band; the training-day rise
  // preserves the weekly total and is clamped to the band too (which may
  // shrink the reduction in turn).
  let down = Math.min(MAX_CYCLE_DELTA_KCAL, base.kcal - kcalMin);
  let up = (down * restDays) / trainingDays;
  if (base.kcal + up > kcalMax) {
    up = kcalMax - base.kcal;
    down = (up * trainingDays) / restDays;
  }
  down = Math.max(0, Math.floor(down));
  up = Math.max(0, Math.floor((down * restDays) / trainingDays));
  // A cycle below this is presentation noise, not a carb cycle: when the
  // engine band leaves too little room (e.g. 1 training day to 6 rest
  // days), be honestly flat rather than show a fake 8 kcal "cycle".
  const MIN_MEANINGFUL_CYCLE_KCAL = 50;
  if (down < MIN_MEANINGFUL_CYCLE_KCAL || up === 0) return flat;

  const rest = { ...base, kcal: base.kcal - down };
  const training = { ...base, kcal: base.kcal + up };

  if (fatConvention === 'higher_rest_day') {
    // A quarter of the rest-day cut comes back as fat, so carbs cut deeper.
    const fatBackKcal = r0(down * 0.25);
    rest.fatG = base.fatG + r0(fatBackKcal / KCAL_F);
    rest.carbsG = Math.max(0, base.carbsG - r0((down + fatBackKcal) / KCAL_C));
  } else {
    rest.carbsG = Math.max(0, base.carbsG - r0(down / KCAL_C));
  }
  training.carbsG = base.carbsG + r0(up / KCAL_C);

  return { training, rest, cycleDeltaKcal: down };
}

// ─── Candidate preparation ──────────────────────────────────────────────

function curatedCandidate(meal) {
  const items = mealItems(meal);
  return {
    id: meal.id,
    name: meal.name,
    slots: meal.slots,
    components: meal.components,
    items,
    totals: mealTotals(items),
    source: 'curated',
  };
}

function savedCandidate(meal) {
  return {
    id: meal.id,
    name: meal.name,
    slots: meal.slots || [],
    components: null, // fixed block: no per-food rescale available
    items: null,
    totals: {
      kcal: r0(meal.totals?.kcal || 0),
      protein: r1(meal.totals?.protein || 0),
      carbs: r1(meal.totals?.carbs || 0),
      fat: r1(meal.totals?.fat || 0),
    },
    source: 'saved',
  };
}

// How much of a candidate's role-dominant foods sit inside the user's
// 3-3-3 rotation pool (0..1); a soft score bonus, never a hard filter.
function poolAffinity(candidate, rotationPool) {
  if (!rotationPool || !candidate.components) return 0;
  const all = [
    ...(rotationPool.protein || []),
    ...(rotationPool.carb || []),
    ...(rotationPool.fat || []),
  ];
  if (!all.length) return 0;
  const keys = candidate.components.map((c) => c.food);
  const inPool = keys.filter((k) => all.includes(k)).length;
  return keys.length ? inPool / keys.length : 0;
}

// ─── Slot structure ─────────────────────────────────────────────────────

/**
 * The day's slot list. Numbered meals (the diary's flexible model), plus
 * pre/post-workout slots on training days when enabled. Intra-workout is
 * deliberately NOT a default slot (round-2 item 2): it earns a place only
 * for fasted or very long sessions, which is a presentation-layer add-on,
 * never assembled food.
 */
export function buildSlotList({ mealsPerDay, periWorkout = false, variant = 'rest' }) {
  const slots = [];
  for (let i = 1; i <= mealsPerDay; i += 1) slots.push({ key: `meal_${i}`, kind: 'meal' });
  if (periWorkout && variant === 'training') {
    slots.splice(Math.max(1, mealsPerDay - 2), 0, { key: 'pre_workout', kind: 'pre_workout' });
    slots.splice(Math.max(2, mealsPerDay - 1), 0, { key: 'post_workout', kind: 'post_workout' });
  }
  return slots;
}

// Unfilled slots after index `idx` that a pin has already claimed: the
// greedy share divisor must not count slots a pin will not leave open.
function countPinnedAfter(slots, idx, pinnedTaken) {
  let n = 0;
  for (let i = idx + 1; i < slots.length; i += 1) {
    if (pinnedTaken.has(slots[i].key)) n += 1;
  }
  return n;
}

/**
 * Position-derived slot character (rethink 2026-06-12, founder directive):
 * the plan keeps the bodybuilder numbered-meal model — "Meal 1..N" labels,
 * 3-6 meals, pre/post-workout positions — and each position carries a food
 * character the matcher enforces instead of a breakfast/lunch/dinner label:
 *   - Meal 1 places a BREAKFAST meal (the curry-for-breakfast fix);
 *   - the final meal is a cooked MAIN (lunch/dinner-tagged);
 *   - middle meals draw mains + snack-shaped meals (the per-slot macro share
 *     naturally pulls snack-sized meals on 5-6 meal days). Breakfast-ONLY
 *     meals never appear mid-day; dual-tagged bowls still can via 'snack'.
 * Workout slots keep their kind-based scoring (null = no character filter).
 * Legacy named slot strings pass through for the diary's suggestion path.
 */
export function slotCharacterFor(slotKey, mealsPerDay) {
  if (slotKey === 'pre_workout' || slotKey === 'post_workout') return null;
  const m = /^meal_(\d+)$/.exec(String(slotKey || ''));
  if (!m) return slotKey || null;
  const i = Number(m[1]);
  const n = Math.max(1, Math.round(Number(mealsPerDay) || 0));
  if (i === 1) return ['breakfast'];
  if (i >= n && n >= 2) return ['lunch', 'dinner'];
  return ['lunch', 'dinner', 'snack'];
}

// ─── The day assembler ──────────────────────────────────────────────────

/**
 * Assemble one day variant. Returns:
 * { variant, target, slots: [{ slot, mealId, name, source, items, totals }],
 *   totals, residual, withinTolerance, seed }
 *
 * @param target  ONE day-variant target { kcal, proteinG, carbsG, fatG }
 *                plus band { kcalMin, kcalMax } taken from the engine
 *                target via the band ratio (passed in `band`).
 */
export function assembleDayPlan({
  target,
  band,
  prefs: rawPrefs,
  variant = 'rest',
  seed = 1,
  recentlyUsed = new Map(),
  savedMeals = [],
} = {}) {
  const prefs = normalisePreferences(rawPrefs);
  const rng = mulberry32(seed);

  const pool = [
    ...filterMealsByPreferences(prefs, CURATED_MEALS).map(curatedCandidate),
    ...savedMeals.filter(Boolean).map(savedCandidate),
  ];

  const slots = buildSlotList({
    mealsPerDay: prefs.mealsPerDay,
    periWorkout: prefs.periWorkoutSlots,
    variant,
  });

  const want = {
    kcal: Number(target.kcal) || 0,
    protein: Number(target.proteinG) || 0,
    carbs: Number(target.carbsG) || 0,
    fat: Number(target.fatG) || 0,
  };

  const placed = [];
  const usedIds = new Set();
  let consumed = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

  const remaining = () => ({
    kcal: Math.max(0, want.kcal - consumed.kcal),
    protein: Math.max(0, want.protein - consumed.protein),
    carbs: Math.max(0, want.carbs - consumed.carbs),
    fat: Math.max(0, want.fat - consumed.fat),
  });

  // Pinned meals are placed FIRST (blueprint §3.3 step 2): "keep my oats
  // breakfast" claims its slot before the greedy fill, and its macros are
  // subtracted so the fill only chases what remains. Pin order is the
  // user's order; each pin takes the earliest unfilled compatible slot.
  const pinnedTaken = new Set(); // slot keys already claimed by a pin
  (prefs.pinnedMealIds || []).forEach((pinId) => {
    const cand = pool.find((c) => c.id === pinId && !usedIds.has(c.id));
    if (!cand) return; // pin no longer exists / excluded by diet: skip
    // A pin is explicit user intent: tagged meals take the earliest slot whose
    // character they fit; untagged (saved) meals pass any character.
    const slot = slots.find((s) => !pinnedTaken.has(s.key)
      && slotMatches(cand.slots, slotCharacterFor(s.key, prefs.mealsPerDay)));
    if (!slot) return;
    pinnedTaken.add(slot.key);
    usedIds.add(cand.id);
    placed.push({ slot: slot.key, mealId: cand.id, name: cand.name, source: cand.source, items: cand.items, totals: cand.totals, components: cand.components, pinned: true });
    consumed = {
      kcal: consumed.kcal + cand.totals.kcal,
      protein: consumed.protein + cand.totals.protein,
      carbs: consumed.carbs + cand.totals.carbs,
      fat: consumed.fat + cand.totals.fat,
    };
  });

  slots.forEach((slot, idx) => {
    if (pinnedTaken.has(slot.key)) return; // already filled by a pin
    const slotsLeft = slots.length - idx;
    const share = perMealMacros(remaining(), Math.max(1, slotsLeft - countPinnedAfter(slots, idx, pinnedTaken)));
    const matchKind = slotCharacterFor(slot.key, prefs.mealsPerDay);
    // Per-slot repetition policy (rethink §3.1, breakfast-variety evidence):
    // Meal 1 tolerates repetition across the week (most people happily repeat
    // a breakfast), so its variety penalty is heavily discounted; other slots
    // keep the full dial.
    const varietyScale = slot.key === 'meal_1' ? 0.25 : 1;

    const pickBest = (enforceCharacter) => {
      let best = null;
      let bestScore = -Infinity;
      pool.forEach((cand) => {
        if (usedIds.has(cand.id)) return;
        if (enforceCharacter && matchKind) {
          // The greedy fill needs POSITIVE evidence for a character slot: a
          // candidate must carry a matching tag. Untagged (saved) meals do
          // not slip into Meal 1 just because they claim nothing.
          if (Array.isArray(matchKind)) {
            if (!Array.isArray(cand.slots) || cand.slots.length === 0) return;
          }
          if (!slotMatches(cand.slots, matchKind)) return;
        }

        let score = fitScore(share, cand.totals);
        // Variety: penalise meals used recently across the week; the dial
        // scales the penalty (0 = repeat freely for meal-prep).
        const lastUsed = recentlyUsed.get(cand.id);
        if (lastUsed !== undefined && prefs.variety > 0) {
          score -= varietyScale * prefs.variety * (0.6 / Math.max(1, lastUsed));
        }
        // 3-3-3 rotation pool: a soft pull toward the user's chosen staples.
        score += 0.15 * poolAffinity(cand, prefs.rotationPool);
        // Peri-workout slot character: low fat going in; protein + carbs out.
        if (slot.kind === 'pre_workout') score -= (cand.totals.fat / 100);
        if (slot.kind === 'post_workout') score += (cand.totals.protein / 200);
        // Seeded jitter: small enough never to outrank a clearly better fit,
        // large enough that regeneration reshuffles near-ties.
        score += (rng() - 0.5) * 0.08;

        if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && best && cand.id < best.id)) {
          best = cand;
          bestScore = score;
        }
      });
      return best;
    };

    // Character first; if a diet/exclusion combo empties the character pool,
    // relax rather than leave the slot unfilled (a plan with a hole is worse
    // than a plan with an off-character meal).
    let best = pickBest(true);
    if (!best && matchKind) best = pickBest(false);

    if (best) {
      usedIds.add(best.id);
      placed.push({ slot: slot.key, mealId: best.id, name: best.name, source: best.source, items: best.items, totals: best.totals, components: best.components });
      consumed = {
        kcal: consumed.kcal + best.totals.kcal,
        protein: consumed.protein + best.totals.protein,
        carbs: consumed.carbs + best.totals.carbs,
        fat: consumed.fat + best.totals.fat,
      };
    }
  });

  // Pins were pushed first; restore day order for the close-out + output.
  const slotOrderIndex = new Map(slots.map((s, i) => [s.key, i]));
  placed.sort((a, b) => (slotOrderIndex.get(a.slot) ?? 99) - (slotOrderIndex.get(b.slot) ?? 99));

  // ── Tolerance close-out: iterative macro-preserving rescales across the
  // day's staples until the day lands in the engine band — exactly what a
  // coach does when sizing a printed plan to a bigger or smaller eater.
  // Carb staples first, then fat, then protein staples ONLY while protein
  // is under-delivered; every portion clamps to the food's sane range and
  // rounds to 5 g. Saved meals are fixed blocks and are never rescaled.
  const kcalMin = Number(band?.kcalMin) || r0(want.kcal * 0.9);
  const kcalMax = Number(band?.kcalMax) || r0(want.kcal * 1.1);

  // One nudge on one staple of the role. Tries every untouched staple of
  // the role, largest portion first, and succeeds on the first that can
  // actually move (a staple already at its clamp is marked touched and
  // skipped, NOT allowed to abandon the role — the give-up-early bug the
  // engine review caught). Returns true when any staple moved.
  const rescaleOne = (role, touched) => {
    const candidates = [];
    placed.forEach((p, pi) => {
      if (!p.components) return;
      p.components.forEach((c, ci) => {
        if (roleOf(c.food) !== role) return;
        const id = `${pi}:${ci}`;
        if (touched.has(id)) return;
        candidates.push({ p, c, ci, pi, id });
      });
    });
    candidates.sort((a, b) => (b.c.g - a.c.g) || (a.id < b.id ? -1 : 1));

    for (const cand of candidates) {
      const { p, c, ci, pi, id } = cand;
      touched.add(id);
      const item = p.items[ci];
      const per100 = {
        kcal: (item.kcal / c.g) * 100,
        protein: (item.proteinG / c.g) * 100,
        carbs: (item.carbsG / c.g) * 100,
        fat: (item.fatG / c.g) * 100,
      };
      if (per100.kcal <= 0) continue;
      const kcalResidual = want.kcal - consumed.kcal;
      let gDelta = (kcalResidual / per100.kcal) * 100;
      const [lo, hi] = gramRangeOf(c.food);
      const newG = Math.round(Math.min(Math.max(c.g + gDelta, lo), hi) / 5) * 5;
      gDelta = newG - c.g;
      if (gDelta === 0) continue; // at its clamp: try the next staple
      const f = gDelta / 100;
      consumed = {
        kcal: r0(consumed.kcal + per100.kcal * f),
        protein: r1(consumed.protein + per100.protein * f),
        carbs: r1(consumed.carbs + per100.carbs * f),
        fat: r1(consumed.fat + per100.fat * f),
      };
      const newItems = p.items.map((it, i) => (i === ci ? {
        ...it,
        quantityG: newG,
        kcal: r0(per100.kcal * (newG / 100)),
        proteinG: r1(per100.protein * (newG / 100)),
        carbsG: r1(per100.carbs * (newG / 100)),
        fatG: r1(per100.fat * (newG / 100)),
      } : it));
      placed[pi] = {
        ...p,
        items: newItems,
        components: p.components.map((cc, i) => (i === ci ? { ...cc, g: newG } : cc)),
        totals: mealTotals(newItems),
      };
      return true;
    }
    return false;
  };

  const touched = new Set();
  let guard = 0;
  while ((consumed.kcal < kcalMin || consumed.kcal > kcalMax) && guard < 20) {
    guard += 1;
    if (rescaleOne('carb', touched)) continue;
    if (rescaleOne('fat', touched)) continue;
    // Protein staples grow only while protein itself is short — a portion
    // size decision, never a way to pad calories with protein.
    if (consumed.kcal < kcalMin
      && consumed.protein < want.protein
      && rescaleOne('protein', touched)) continue;
    break;
  }

  const residual = {
    kcal: r0(want.kcal - consumed.kcal),
    protein: r1(want.protein - consumed.protein),
    carbs: r1(want.carbs - consumed.carbs),
    fat: r1(want.fat - consumed.fat),
  };
  const withinTolerance = consumed.kcal >= kcalMin
    && consumed.kcal <= kcalMax
    && consumed.protein >= want.protein * 0.85;

  return {
    variant,
    target: want,
    slots: placed,
    totals: {
      kcal: r0(consumed.kcal),
      protein: r1(consumed.protein),
      carbs: r1(consumed.carbs),
      fat: r1(consumed.fat),
    },
    residual,
    withinTolerance,
    seed,
  };
}

// ─── The week assembler ─────────────────────────────────────────────────

/**
 * Assemble a week: TD/NTD variant targets from the engine target + the
 * training schedule, per-day seeded assembly, anti-repetition shared
 * across the week (scaled by the variety dial; variety 0 repeats one day
 * per variant — the meal-prep mode elite competitors actually run).
 *
 * @param engineTarget the calculateNutritionTargets output, verbatim
 * @param schedule     seven entries: 'training' | 'rest'
 */
export function assembleWeekPlan({ engineTarget, prefs: rawPrefs, schedule, seed = 1, savedMeals = [] } = {}) {
  const prefs = normalisePreferences(rawPrefs);
  const week = Array.isArray(schedule) && schedule.length === 7
    ? schedule.map((d) => (d === 'training' ? 'training' : 'rest'))
    : ['training', 'rest', 'training', 'rest', 'training', 'rest', 'rest'];

  const trainingDays = week.filter((d) => d === 'training').length;
  const restDays = 7 - trainingDays;
  const variants = dayVariantTargets(engineTarget, {
    trainingDays,
    restDays,
    fatConvention: prefs.fatConvention,
  });
  const band = { kcalMin: engineTarget?.kcalMin, kcalMax: engineTarget?.kcalMax };

  const days = [];
  if (prefs.variety === 0) {
    // Meal-prep repeat: one assembled day per variant, reused.
    const byVariant = {};
    ['training', 'rest'].forEach((v, i) => {
      byVariant[v] = assembleDayPlan({
        target: variants[v], band, prefs, variant: v, seed: seed + i, savedMeals,
      });
    });
    week.forEach((v) => days.push(byVariant[v]));
  } else {
    const recentlyUsed = new Map(); // mealId -> days since used
    week.forEach((v, i) => {
      const day = assembleDayPlan({
        target: variants[v], band, prefs, variant: v, seed: seed + i * 7919, recentlyUsed, savedMeals,
      });
      days.push(day);
      recentlyUsed.forEach((age, id) => recentlyUsed.set(id, age + 1));
      day.slots.forEach((s) => recentlyUsed.set(s.mealId, 1));
    });
  }

  return {
    days,
    schedule: week,
    variants,
    cycleDeltaKcal: variants.cycleDeltaKcal,
    seed,
    withinTolerance: days.every((d) => d.withinTolerance),
  };
}
