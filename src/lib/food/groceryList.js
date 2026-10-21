// Auto grocery list (ULTIMATE-NUT-02). A pure, deterministic aggregation that
// turns a stored week meal-plan into a grouped shopping list — same grams the
// plan already holds, summed per ingredient across the whole week. No new data,
// no network, no write-back; aggregation + grouping only.
//
// Founder-decided resolutions (2026-06-14), grounded in code:
//  - NA-nutrition-4 (aisle taxonomy): there is NO approved UK supermarket-aisle
//    map and the register forbids inventing one, so sections key off the
//    existing macro roles (roleOf, foodRoles.js) — Proteins / Carbs / Veg /
//    Fats / Other, exactly the blueprint's LOADED STATE.
//  - NA-nutrition-5 (which weight), SUPERSEDED for paired foods by the
//    founder ruling of 2026-10-19: a curated food with a CoFID raw/cooked pair
//    (cookYield.js) is listed at its supermarket weight, raw or dry, with the
//    cooked weight beside it ("Chicken breast fillet, 595 g raw (445 g
//    cooked)"), or the other way round for meal prep. Every ratio is CoFID
//    data; a food with no pair keeps the plan's stored grams and its curated
//    name exactly as before, and no converted figure is ever invented for it.
//  - Repeat (same ruling): a one-day plan can be bought for 1, 3, 5 or 7 days
//    of eating it; the totals scale and the share text says how many days.
//  - Grams are kitchen-rounded (gramSolve.kitchenRound).
//
// Plan shape consumed (mealPlanAssembler.js): plan.days[] -> day.slots[] ->
// each slot { name, items: [{ foodRef, name, quantityG }] | null,
// components: [{ food, g }] | null }. Curated slots carry both (items are the
// resolved components); saved-meal slots carry neither.

import { CURATED_FOODS } from './curatedFoods';
import { roleOf } from './foodRoles';
import { hasCookToggle, nativeState, convertCookGrams, uncookedWord, weighAsListed } from './cookYield';
import { kitchenRound } from './gramSolve';

// Macro role -> quiet section label. 'free' and any unknown role fall to Other.
const ROLE_SECTION = {
  protein: 'Proteins',
  carb: 'Carbs',
  veg: 'Veg',
  fat: 'Fats',
  free: 'Other',
};
const SECTION_ORDER = ['Proteins', 'Carbs', 'Veg', 'Fats', 'Other'];

// The repeat choices for a one-day plan.
export const GROCERY_REPEAT_DAYS = Object.freeze([1, 3, 5, 7]);

const COOK_STATE_SUFFIX = /\s*\((cooked|boiled|baked|dry)\)\s*$/i;

const foodKeyFromRef = (ref) =>
  (typeof ref === 'string' && ref.startsWith('curated:')) ? ref.slice(8) : null;

/**
 * Aggregate a stored meal-plan into a grouped grocery list.
 *
 * @param {{ days?: Array }} plan  the active plan object (record.plan)
 * @param {{ basis?: 'shop'|'prep', repeat?: number }} [opts]  basis 'shop'
 *   (the default) lists paired foods at their raw or dry weight, 'prep' at
 *   their cooked weight; `repeat` multiplies the totals (one-day plans).
 * @returns {{
 *   sections: Array<{ label: string, items: Array<{
 *     name: string, grams?: number, count?: number,
 *     state?: 'raw'|'dry'|'cooked', alt?: { grams: number, state: string } }> }>,
 *   dayCount: number,
 *   repeat: number,
 *   basis: 'shop'|'prep',
 *   isEmpty: boolean,
 * }}
 */
export function buildGroceryList(plan, { basis = 'shop', repeat = 1 } = {}) {
  const times = GROCERY_REPEAT_DAYS.includes(repeat) ? repeat : 1;
  const view = basis === 'prep' ? 'prep' : 'shop';
  const empty = { sections: [], dayCount: 0, repeat: times, basis: view, isEmpty: true };
  if (!plan || !Array.isArray(plan.days) || plan.days.length === 0) return empty;

  // Curated foods aggregate by key (grams sum); everything without a known
  // curated breakdown (saved meals, unknown keys) aggregates by name under Other.
  const curated = new Map();   // key -> { name, role, grams }
  const other = new Map();     // name -> { name, count }

  const addCurated = (key, grams) => {
    const food = CURATED_FOODS[key];
    if (!food) { addOther(key); return; }   // unknown key: list by key under Other
    const g = Number(grams) || 0;
    if (g <= 0) return;
    const row = curated.get(key)
      || { key, name: food.name, role: roleOf(key), grams: 0 };
    row.grams += g;
    curated.set(key, row);
  };
  const addOther = (name) => {
    const label = (typeof name === 'string' && name.trim()) ? name.trim() : 'Item';
    const row = other.get(label) || { name: label, count: 0 };
    row.count += 1;
    other.set(label, row);
  };

  for (const day of plan.days) {
    const slots = Array.isArray(day?.slots) ? day.slots : [];
    for (const slot of slots) {
      if (Array.isArray(slot?.components) && slot.components.length) {
        for (const c of slot.components) addCurated(c?.food, c?.g);
      } else if (Array.isArray(slot?.items) && slot.items.length) {
        for (const it of slot.items) {
          const key = foodKeyFromRef(it?.foodRef);
          if (key) addCurated(key, it?.quantityG);
          else addOther(it?.name);
        }
      } else if (slot?.name) {
        // Saved-meal / fixed block: no per-food grams available.
        addOther(slot.name);
      }
    }
  }

  // Group curated foods into their role sections.
  const bySection = {};
  for (const row of curated.values()) {
    const label = ROLE_SECTION[row.role] || 'Other';
    const grams = row.grams * times;
    const native = hasCookToggle(row.key) ? nativeState(row.key) : null;
    if (!native) {
      // Item 27: a food named cooked or dry with no pair is weighed as listed.
      (bySection[label] ||= []).push({
        name: row.name,
        grams: kitchenRound(grams),
        ...(weighAsListed(row.key, row.name) ? { asListed: true } : {}),
      });
      continue;
    }
    const raw = native === 'raw' ? grams : convertCookGrams(row.key, grams, 'cooked', 'raw');
    const cooked = native === 'cooked' ? grams : convertCookGrams(row.key, grams, 'raw', 'cooked');
    const rawItem = { grams: kitchenRound(raw), state: uncookedWord(row.key) };
    const cookedItem = { grams: kitchenRound(cooked), state: 'cooked' };
    const [main, alt] = view === 'prep' ? [cookedItem, rawItem] : [rawItem, cookedItem];
    (bySection[label] ||= []).push({
      name: row.name.replace(COOK_STATE_SUFFIX, ''),
      grams: main.grams,
      state: main.state,
      alt,
    });
  }
  for (const row of other.values()) {
    const count = row.count * times;
    (bySection.Other ||= []).push({
      name: row.name,
      ...(count > 1 ? { count } : {}),
    });
  }

  // Deterministic order: grams desc (gram-less rows last), then name asc.
  const sections = [];
  for (const label of SECTION_ORDER) {
    const items = bySection[label];
    if (!items || items.length === 0) continue;
    items.sort((a, b) => (b.grams || 0) - (a.grams || 0) || a.name.localeCompare(b.name));
    sections.push({ label, items });
  }

  return { sections, dayCount: plan.days.length, repeat: times, basis: view, isEmpty: sections.length === 0 };
}

/** "595 g raw (445 g cooked)", or "120 g" for a food with no pair ("120 g as listed" when its name says cooked or dry). */
export function groceryQuantityText(item) {
  if (item?.grams == null) return '';
  if (!item.state) return item.asListed ? `${item.grams} g as listed` : `${item.grams} g`;
  return `${item.grams} g ${item.state}${item.alt ? ` (${item.alt.grams} g ${item.alt.state})` : ''}`;
}

/**
 * Format a built grocery list (buildGroceryList's output) as plain text for
 * the native share sheet (audit §15 item 6, grocery-list export polish).
 * Same sections, grouping and order the list already computed; this only
 * lays them out as calm, plain lines. No new data and no aisle taxonomy
 * (still forbidden, see the header note above) — grams are shown exactly
 * as the list holds them. Pure. Returns '' for an empty/malformed list so a
 * caller can skip opening the share sheet on nothing.
 */
export function formatGroceryListForShare(list) {
  if (!list || list.isEmpty || !Array.isArray(list.sections) || list.sections.length === 0) {
    return '';
  }
  const days = (list.dayCount || 0) * (list.repeat || 1);
  const heading = days === 1 ? 'Shopping list, 1 day' : `Shopping list, ${days} days`;
  const lines = [heading];
  list.sections.forEach((section) => {
    lines.push('', section.label);
    section.items.forEach((item) => {
      const qty = item.grams != null ? groceryQuantityText(item) : (item.count > 1 ? `x${item.count}` : '');
      lines.push(qty ? `- ${item.name}, ${qty}` : `- ${item.name}`);
    });
  });
  return lines.join('\n');
}
