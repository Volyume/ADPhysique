/**
 * quickSession.js - Quick full-body session from what you have to hand
 * (D156, docs/quick-session-equipment-2026-09-11/10-SPEC.md sections 1-2).
 *
 * Pure, deterministic, no I/O: takes the library rows the screen already
 * has (ideally after the intent filter) and an equipment kit (an array of
 * QUICK_KIT_KINDS ids), and picks one exercise per fixed full-body slot.
 * Never emits a bare name to be matched later against a library - every
 * output item carries the actual row object the caller passed in, by
 * reference, so the screen builds a workout entry from it exactly as it
 * does for a manually added exercise.
 *
 * Replaces src/lib/travelMode.js's hand-authored equipment pools (retired
 * with this landing): the candidate set is now the real corpus, restricted
 * to what the person said they have today, not a fixed three-way equipment
 * switch with its own disconnected exercise lists.
 *
 * Ranking is a stable total order per slot (ruling 4): kit equipment before
 * bodyweight whenever the kit is non-empty; compound before isolation on
 * the four big muscles (no preference on the other four); tier rank
 * (canonicality.js); difficulty ascending, null last; name ascending. The
 * first candidate wins and its name is excluded from every later slot (a
 * defence against a custom exercise's name colliding with an
 * already-chosen one, since corpus names cannot collide with each other in
 * the first place). A slot with no eligible candidate is left unfilled and
 * reported, never padded with an off-kit move.
 */
import { isAutoEligible, tierRank } from './exercise/canonicality';
import { KETTLEBELL_NEVER_AUTO_EXCEPTIONS } from './exercise/stylePools';
import { deriveEquipmentCategory } from './exerciseMetadata';

// --- Equipment kinds (ruling 2) --------------------------------------------
// Ordered for the sheet's multi-select. `categories` are the corpus's own
// derived equipmentCategory values (exerciseMetadata.js) each kind reaches.
// Bodyweight is never listed as a kind here: ruling 1 ("you always have
// your body") adds it to every candidate set unconditionally, regardless of
// which kinds are chosen.
export const QUICK_KIT_KINDS = Object.freeze([
  { id: 'dumbbells', label: 'Dumbbells', icon: 'barbell-outline', categories: Object.freeze(['dumbbell']) },
  { id: 'kettlebells', label: 'Kettlebells', icon: 'fitness-outline', categories: Object.freeze(['kettlebell']) },
  { id: 'bands', label: 'Bands', icon: 'git-commit-outline', categories: Object.freeze(['band']) },
  // Lead ruling 2026-09-11: disc-outline (a plate) rather than
  // barbell-outline, so dumbbells and barbell no longer share an icon.
  // Verified present in the installed Ionicons glyph map, same check as
  // every other icon here.
  { id: 'barbell', label: 'Barbell and plates', icon: 'disc-outline', categories: Object.freeze(['barbell', 'landmine']) },
  { id: 'cables_machines', label: 'Cables and machines', icon: 'hardware-chip-outline', categories: Object.freeze(['cable', 'machine_selectorised', 'machine_plate_loaded', 'smith']) },
  { id: 'suspension', label: 'Suspension trainer', icon: 'link-outline', categories: Object.freeze(['suspension']) },
]);

const KIND_BY_ID = new Map(QUICK_KIT_KINDS.map((k) => [k.id, k]));

// --- Presets (ruling 2) -----------------------------------------------------
export const KIT_PRESETS = Object.freeze([
  { id: 'full_gym', label: 'Full gym', kit: Object.freeze(QUICK_KIT_KINDS.map((k) => k.id)) },
  { id: 'bodyweight_only', label: 'Nothing, bodyweight only', kit: Object.freeze([]) },
]);

// --- Slots (ruling 4, shoulders group per lead ruling 2026-09-11) ----------
// Fixed order: travel mode's own full-body coverage, kept. A slot is either
// a single muscle (a string) or an ORDERED muscle group (an array) - the
// shoulders slot is the one group: the corpus has no bodyweight, kettlebell
// or suspension row with side_delts as its primary muscle (a lateral raise
// needs external resistance; verified: no row in
// src/lib/exerciseCorpus/families/{bodyweight,kettlebell,suspension}.js has
// primaryMuscle "side_delts"), so a single fixed muscle left that slot
// genuinely unfillable for those three kits. Falling through to front_delts
// then rear_delts gives every kit a real shoulder movement without padding
// with an off-kit move: side_delts still wins whenever it has one (full gym,
// dumbbells, bands, barbell, cables/machines all do), the other two kinds
// only ever fall through when side_delts has nothing to offer.
export const QUICK_SESSION_SLOTS = Object.freeze([
  'quads', 'hamstrings', 'chest', 'back',
  Object.freeze(['side_delts', 'front_delts', 'rear_delts']),
  'biceps', 'triceps', 'abs',
]);

// The single conceptual key for a slot, group or not - used for `unfilled`
// entries and the output item's `slotKey` (ruling: "the item also carries
// slotKey: 'shoulders' for the group slot"). Hard-coded to the one group
// this ruling defines rather than a generic derivation, since there is
// exactly one.
const GROUP_SLOT_KEY = 'shoulders';
function slotKeyFor(slotDef) {
  return Array.isArray(slotDef) ? GROUP_SLOT_KEY : slotDef;
}

// The four big muscles where compound work is preferred ahead of isolation
// (ruling 4b). The other four slots (shoulders, biceps, triceps, abs)
// carry no compound/isolation preference - unchanged from side_delts's own
// prior standing as one of "the other four".
const COMPOUND_PREFERRED_SLOTS = new Set(['quads', 'hamstrings', 'chest', 'back']);

// --- Prescription (ruling 5) -------------------------------------------------
const PRESCRIPTION = Object.freeze({
  compound: Object.freeze({ sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }),
  isolation: Object.freeze({ sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 }),
});

function prescriptionFor(row) {
  return row?.compoundIsolation === 'compound' ? PRESCRIPTION.compound : PRESCRIPTION.isolation;
}

/**
 * The equipmentCategory set a kit (array of QUICK_KIT_KINDS ids) reaches,
 * always including 'bodyweight' (ruling 1). Unknown kind ids are ignored
 * rather than thrown on, matching this module's pure, never-throw contract
 * for malformed input.
 */
function kitCategoriesFor(kit) {
  const categories = new Set(['bodyweight']);
  if (Array.isArray(kit)) {
    for (const id of kit) {
      const kind = KIND_BY_ID.get(id);
      if (!kind) continue;
      for (const c of kind.categories) categories.add(c);
    }
  }
  return categories;
}

/**
 * A row's equipmentCategory, deriving it when the row does not already
 * carry one (spec section 2: getAllExercises() rows and the corpus-mapped
 * seed-row shape both carry equipmentCategory already; this is a defensive
 * derive for whatever caller does not, e.g. a not-yet-backfilled custom
 * row, never the common path).
 */
function categoryOf(row) {
  return row?.equipmentCategory ?? deriveEquipmentCategory(row?.name, row?.equipment);
}

/**
 * Auto-eligible for THIS kit: the ordinary canonicality gate, plus the
 * closed kettlebell-ballistics exception, admitted only when the person
 * said they have a kettlebell today (ruling 4) - never a NEVER_AUTO row
 * otherwise.
 */
function isEligibleForKit(name, kitHasKettlebells) {
  if (isAutoEligible(name)) return true;
  return kitHasKettlebells && KETTLEBELL_NEVER_AUTO_EXCEPTIONS.includes(name);
}

/**
 * Ruling 4's stable total order, as a comparable tuple (lower sorts
 * first): (a) kit equipment before bodyweight when the kit carries any
 * non-bodyweight category; (b) compound before isolation, on the slots
 * where that is a preference; (c) tier rank; (d) difficulty ascending,
 * null last; (e) name ascending.
 */
function rankTuple(row, { kitIsNonEmpty, preferCompound }) {
  const category = categoryOf(row);
  const kitBeforeBodyweight = kitIsNonEmpty ? (category === 'bodyweight' ? 1 : 0) : 0;
  const compoundFirst = preferCompound ? (row.compoundIsolation === 'compound' ? 0 : 1) : 0;
  const tier = tierRank(row.name);
  const difficulty = row.difficulty == null ? Infinity : row.difficulty;
  return [kitBeforeBodyweight, compoundFirst, tier, difficulty, row.name];
}

function compareRows(a, b, ctx) {
  const ta = rankTuple(a, ctx);
  const tb = rankTuple(b, ctx);
  for (let i = 0; i < ta.length; i++) {
    if (ta[i] < tb[i]) return -1;
    if (ta[i] > tb[i]) return 1;
  }
  return 0;
}

/** The eligible-and-unclaimed candidates in `rows` for one specific muscle
 *  (never a group) - the exact filter ruling 4 specifies, factored out so
 *  the group slot can apply it per muscle in order. */
function candidatesForMuscle(rows, muscle, { categories, chosenNames, kitHasKettlebells }) {
  return rows.filter((row) => (
    row
    && row.primaryMuscle === muscle
    && !row.retiredInto
    && categories.has(categoryOf(row))
    && !chosenNames.has(row.name)
    && isEligibleForKit(row.name, kitHasKettlebells)
  ));
}

/**
 * Build one full-body quick session from `library` (the rows the screen
 * already has, ideally after the intent filter) restricted to `kit` (an
 * array of QUICK_KIT_KINDS ids).
 *
 * Reads only id, name, primaryMuscle, equipmentCategory, compoundIsolation,
 * difficulty, retiredInto on a row (spec section 2); everything else on the
 * matched row passes through untouched in `items[].exercise` for the caller
 * to build a workout entry from.
 *
 * A group slot (currently only shoulders) resolves to whichever of its
 * muscles, in order, is the FIRST to have at least one eligible candidate
 * for this kit - eligibility and the kit filter exactly as a single-muscle
 * slot - then ranks within that one muscle exactly as today. It never
 * mixes candidates from two muscles in the same call.
 *
 * @param {{ library: Array<object>, kit: string[] }} args
 * @returns {{ items: Array<{ slot: string, slotKey: string, exercise:
 *   object, sets: number, repsMin: number, repsMax: number,
 *   restSeconds: number, restSuggested: true }>, unfilled: string[] }}
 *   `slot` is the muscle actually used (always a single muscle, honest on
 *   the row it names); `slotKey` is the slot's own identity ('shoulders'
 *   for the group slot, the same value as `slot` for every other one).
 */
export function buildQuickSession({ library, kit } = {}) {
  const rows = Array.isArray(library) ? library : [];
  const categories = kitCategoriesFor(kit);
  const kitIsNonEmpty = Array.isArray(kit) && kit.length > 0;
  const kitHasKettlebells = Array.isArray(kit) && kit.includes('kettlebells');

  const chosenNames = new Set();
  const items = [];
  const unfilled = [];

  for (const slotDef of QUICK_SESSION_SLOTS) {
    const slotKey = slotKeyFor(slotDef);
    const muscles = Array.isArray(slotDef) ? slotDef : [slotDef];
    const preferCompound = COMPOUND_PREFERRED_SLOTS.has(slotKey);

    // First muscle in the group (or the sole muscle, for a single-muscle
    // slot) with at least one eligible candidate wins the slot outright;
    // later muscles in the group are never consulted once one has any
    // candidate at all, and never mixed with it.
    let winningMuscle = null;
    let candidates = [];
    for (const muscle of muscles) {
      const found = candidatesForMuscle(rows, muscle, { categories, chosenNames, kitHasKettlebells });
      if (found.length) { winningMuscle = muscle; candidates = found; break; }
    }

    if (!candidates.length) {
      unfilled.push(slotKey);
      continue;
    }
    candidates.sort((a, b) => compareRows(a, b, { kitIsNonEmpty, preferCompound }));
    const winner = candidates[0];
    chosenNames.add(winner.name);
    const p = prescriptionFor(winner);
    items.push({
      slot: winningMuscle,
      slotKey,
      exercise: winner,
      sets: p.sets,
      repsMin: p.repsMin,
      repsMax: p.repsMax,
      restSeconds: p.restSeconds,
      restSuggested: true,
    });
  }

  return { items, unfilled };
}

/**
 * Named, not silent (ruling 6, T1-23 preserved). For every item the
 * generator would place from the FULL catalogue, one honest question: is
 * this exact exercise NAME still reachable anywhere in the intent-filtered
 * library? If not, the filter removed it, and it is classified via
 * capabilityBlockReason exactly as the screen did before this landing.
 *
 * REVISED 2026-09-11 (lead ruling): the previous version ran the generator
 * a second time over the filtered library and compared, PER SLOT, whether
 * the two runs picked the same winner - "different winner" was taken to
 * mean "the unfiltered winner was filtered out". That reasoning has a
 * hole: the chosen-name exclusion cascades. If one slot's unfiltered
 * winner is filtered out, that slot's new winner in the filtered run can
 * be a row that would otherwise have won a LATER slot (freed up because
 * the row that used to block it, by name, in chosenNames, never got that
 * chance this run) - so the later slot's own winner changes too even
 * though nothing in that later slot's own candidate pool was filtered,
 * and a per-slot comparison over-counts that knock-on reshuffle as a
 * second drop. Checking library membership by name has no such hole: it
 * does not matter which slot ends up with which row in the filtered run,
 * only whether the name the person would have seen is still reachable at
 * all - so this only ever runs the generator ONCE, over `all`.
 *
 * @param {{ all: Array<object>, filtered: Array<object>, kit: string[],
 *   capabilityState: object|null }} args
 * @returns {{ capabilityDrops: number, preferenceDrops: number }}
 */
export function explainQuickSessionDrops({ all, filtered, kit, capabilityState } = {}) {
  const unfilteredResult = buildQuickSession({ library: all, kit });
  const filteredNames = new Set((Array.isArray(filtered) ? filtered : []).map((row) => row?.name));

  let capabilityDrops = 0;
  let preferenceDrops = 0;
  // eslint-disable-next-line global-require -- lazy require, as the screen did before this landing.
  const { capabilityBlockReason } = require('./capability/resolve');

  for (const item of unfilteredResult.items) {
    if (filteredNames.has(item.exercise.name)) continue;
    // Capability checked first, matching generationBlockReason's own
    // precedence (section 4.1): a movement that fails both reads as the
    // capability reason and is never double counted.
    if (capabilityBlockReason(capabilityState, item.exercise)) capabilityDrops += 1;
    else preferenceDrops += 1;
  }

  return { capabilityDrops, preferenceDrops };
}
