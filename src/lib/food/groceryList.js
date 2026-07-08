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
//  - NA-nutrition-5 (which weight): the raw/cooked toggle (NUT-01) is blocked —
//    there is no cooked->raw conversion factor in code — so the list shows the
//    plan's STORED grams as-is and never fabricates a converted figure. Foods
//    the plan stores as cooked weight already say so in their curated name
//    (e.g. "White rice (cooked)", "Potato (boiled)"), so the shopper is told the
//    figure is a cooked weight without any added label or invented conversion.
//
// Plan shape consumed (mealPlanAssembler.js): plan.days[] -> day.slots[] ->
// each slot { name, items: [{ foodRef, name, quantityG }] | null,
// components: [{ food, g }] | null }. Curated slots carry both (items are the
// resolved components); saved-meal slots carry neither.

import { CURATED_FOODS } from './curatedFoods';
import { roleOf } from './foodRoles';

// Macro role -> quiet section label. 'free' and any unknown role fall to Other.
const ROLE_SECTION = {
  protein: 'Proteins',
  carb: 'Carbs',
  veg: 'Veg',
  fat: 'Fats',
  free: 'Other',
};
const SECTION_ORDER = ['Proteins', 'Carbs', 'Veg', 'Fats', 'Other'];

const foodKeyFromRef = (ref) =>
  (typeof ref === 'string' && ref.startsWith('curated:')) ? ref.slice(8) : null;

/**
 * Aggregate a stored meal-plan into a grouped grocery list.
 *
 * @param {{ days?: Array }} plan  the active plan object (record.plan)
 * @returns {{
 *   sections: Array<{ label: string, items: Array<{
 *     name: string, grams?: number, count?: number }> }>,
 *   dayCount: number,
 *   isEmpty: boolean,
 * }}
 */
export function buildGroceryList(plan) {
  const empty = { sections: [], dayCount: 0, isEmpty: true };
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
      || { name: food.name, role: roleOf(key), grams: 0 };
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
    (bySection[label] ||= []).push({
      name: row.name,
      grams: Math.round(row.grams),
    });
  }
  for (const row of other.values()) {
    (bySection.Other ||= []).push({
      name: row.name,
      ...(row.count > 1 ? { count: row.count } : {}),
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

  return { sections, dayCount: plan.days.length, isEmpty: sections.length === 0 };
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
  const heading = list.dayCount === 1 ? 'Shopping list, 1 day' : `Shopping list, ${list.dayCount} days`;
  const lines = [heading];
  list.sections.forEach((section) => {
    lines.push('', section.label);
    section.items.forEach((item) => {
      const qty = item.grams != null ? `${item.grams} g` : (item.count > 1 ? `x${item.count}` : '');
      lines.push(qty ? `- ${item.name}, ${qty}` : `- ${item.name}`);
    });
  });
  return lines.join('\n');
}
