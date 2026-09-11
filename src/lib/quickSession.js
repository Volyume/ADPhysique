/**
 * quickSession.js - Quick full-body session from what you have to hand
 * (D156, docs/quick-session-equipment-2026-09-11/10-SPEC.md sections 1-2;
 * ranking and drop-classification REVISED after the fresh-eyes review of
 * the first landing, 2026-09-11 - see the amendment paragraph on D156 in
 * docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md).
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
 * RANKING ORDER (replaces the first landing's 5-part tuple; a stable total
 * order, lower sorts first - see rankTuple()). Rules 3 and 4 were swapped
 * from the first revision of this order (fresh-eyes review, 2026-09-11,
 * second pass): compound-vs-isolation is a real preference and decides
 * before movement-pattern reuse is even consulted, not after - the pattern
 * rule is a tiebreak among otherwise-equal candidates, never a veto on a
 * second push (a shoulder press after a chest press is ordinary full-body
 * programming):
 *   0. a row admitted ONLY through the kettlebell NEVER_AUTO exception
 *      (isEligibleForKit's second branch) sorts LAST, after every
 *      ordinarily-eligible row - `!isAutoEligible(name)` is a sufficient
 *      test here because a candidate that fails it can only have reached
 *      the list via that exception in the first place.
 *   1. kit equipment before bodyweight, whenever the kit is non-empty.
 *   1b. a rep-based row before a timed hold (exerciseType 'duration': a
 *      carry, a plank): a quick session is logged by reps, so a hold is
 *      only ever the fallback for a slot the kit cannot fill otherwise.
 *   2. tier rank - NOT canonicality.js's own tierRank(): a LOCAL mapping
 *      (see QUICK_SESSION_TIER_ORDER below) that ranks SPECIALIST last,
 *      after NICHE, the opposite of canonicality.js's own STAPLE, COMMON,
 *      SPECIALIST, NICHE order. Rationale, not a disagreement with
 *      canonicality.js: that order is right for automatic PLAN generation,
 *      where SPECIALIST earns its place with a programming reason (a
 *      thin equipment profile, a stated goal). A quick session has no such
 *      reason available to it - it is a single ad-hoc bodyweight-or-
 *      whatever session, not a programme - so a SPECIALIST movement
 *      (style-specific, or needing skill/apparatus most people lack, by
 *      the tier's own definition in canonicality.js) is the wrong DEFAULT
 *      here even where a NICHE one would do: someone with nothing but
 *      their bodyweight should be handed a single-leg RDL, not a Nordic
 *      curl. canonicality.js and tierRank() are never touched; every OTHER
 *      consumer keeps the global order unchanged.
 *   3. compound before isolation, on quads, hamstrings, chest, back AND
 *      the shoulders slot (no preference on biceps, triceps, abs).
 *   4. a movement pattern already used by an EARLIER chosen slot sorts
 *      after an unused one (`row.movementPattern`; a row with no pattern
 *      is treated as unused, never as colliding with another pattern-less
 *      row) - reached only when two candidates already tie on tier AND on
 *      the compound preference.
 *   5. difficulty ascending (`Number.isFinite(difficulty) ? difficulty :
 *      Infinity`, null/non-finite last).
 *   6. `String(name ?? '')` ascending.
 *   7. `String(id ?? '')` ascending - the final tiebreak, so the order is
 *      total even across two rows that could otherwise tie on everything
 *      above (a corpus row's name is unique in practice, but this module
 *      also has to sort caller-supplied library rows it cannot vouch for).
 *
 * The GROUP slot (shoulders) pools every eligible, unclaimed candidate
 * across ALL of its muscles (side_delts, front_delts, rear_delts) into one
 * list and ranks across that whole pool at once - never "first muscle
 * that has any candidate wins, rank only within it" (the first landing's
 * approach, which could hand a weak side_delts isolation row the slot
 * over a materially better front_delts compound press). The winning row's
 * own `primaryMuscle` becomes the output item's `slot` (honest labelling);
 * `slotKey` stays 'shoulders' regardless of which muscle won.
 *
 * The first candidate wins and its name is excluded from every later slot
 * (a defence against a custom exercise's name colliding with an
 * already-chosen one, since corpus names cannot collide with each other in
 * the first place); its movement pattern (if any) is also recorded so a
 * later slot's ranking can deprioritise reusing it. A slot with no
 * eligible candidate across any of its muscles is left unfilled and
 * reported, never padded with an off-kit move.
 */
import { isAutoEligible, autoTier, AUTO_TIER } from './exercise/canonicality';
import { deriveEquipmentCategory } from './exerciseMetadata';

// Quick-session-LOCAL tier order (lead ruling 2026-09-11, ranking order
// item 2 in the module header): SPECIALIST sorts LAST, after NICHE - the
// reverse of canonicality.js's own TIER_RANK (STAPLE, COMMON, SPECIALIST,
// NICHE), which is correct for automatic PLAN generation but not for a
// single ad-hoc quick session (see the header comment for the full
// rationale). Built from `autoTier()`'s tier NAME, never from tierRank()
// or any edit to canonicality.js itself - every other consumer of that
// module keeps the global STAPLE/COMMON/SPECIALIST/NICHE order unchanged.
const QUICK_SESSION_TIER_ORDER = Object.freeze({
  [AUTO_TIER.STAPLE]: 0,
  [AUTO_TIER.COMMON]: 1,
  [AUTO_TIER.NICHE]: 2,
  [AUTO_TIER.SPECIALIST]: 3,
  [AUTO_TIER.NEVER_AUTO]: 4,
});
function quickSessionTierRank(name) {
  return QUICK_SESSION_TIER_ORDER[autoTier(name)] ?? 4;
}

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
// genuinely unfillable for those three kits. Pooling side_delts, front_delts
// and rear_delts together (see the ranking order above) gives every kit a
// real shoulder movement, and the best-ranked one available, without padding
// with an off-kit move.
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

// The slots where compound work is preferred ahead of isolation (ranking
// order item 4) - the four big muscles PLUS the shoulders group (lead
// ruling 2026-09-11 widened this from "the four big muscles" only). No
// preference on biceps, triceps, abs.
const COMPOUND_PREFERRED_SLOTS = new Set(['quads', 'hamstrings', 'chest', 'back', GROUP_SLOT_KEY]);

// --- Prescription (ruling 5, duration rows per lead ruling 2026-09-11) ----
const PRESCRIPTION = Object.freeze({
  compound: Object.freeze({ sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90 }),
  isolation: Object.freeze({ sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60 }),
});

// A plank, hold or carry is measured in seconds, not reps - keep the row's
// own duration range (defaultRepMin/Max double as seconds for a
// `exerciseType: 'duration'` row, same column the rest of the app already
// reads that way) rather than handing it the isolation rep scheme. Falls
// back to a sensible 20-60s range as ONE pair (not independently per field)
// when either default is missing or not a finite number, so a partially
// malformed row never produces an inverted or nonsensical range.
function prescriptionFor(row) {
  if (row?.exerciseType === 'duration') {
    const bothFinite = Number.isFinite(row.defaultRepMin) && Number.isFinite(row.defaultRepMax);
    return bothFinite
      ? { sets: 3, repsMin: row.defaultRepMin, repsMax: row.defaultRepMax, restSeconds: 60 }
      : { sets: 3, repsMin: 20, repsMax: 60, restSeconds: 60 };
  }
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

// Lazy, memoised (lead ruling 2026-09-11): stylePools.js imports the whole
// CORPUS at its own module top (it derives several pools from it at import
// time), so a static top-level import of KETTLEBELL_NEVER_AUTO_EXCEPTIONS
// here would pull all 918 corpus rows into memory on every static importer
// of THIS module - including BuildWorkoutScreen.js, on every app screen
// that ever mounts it - just to read one small exception list that is only
// ever consulted once the person has actually chosen Kettlebells. Required
// lazily, and cached after the first read so repeated calls (one per
// candidate row, potentially) do not re-run the require machinery.
let _kettlebellNeverAutoExceptions = null;
function kettlebellNeverAutoExceptions() {
  if (_kettlebellNeverAutoExceptions === null) {
    // eslint-disable-next-line global-require
    _kettlebellNeverAutoExceptions = require('./exercise/stylePools').KETTLEBELL_NEVER_AUTO_EXCEPTIONS;
  }
  return _kettlebellNeverAutoExceptions;
}

/**
 * Auto-eligible for THIS kit: the ordinary canonicality gate, plus the
 * closed kettlebell-ballistics exception, admitted only when the person
 * said they have a kettlebell today (ruling 4) - never a NEVER_AUTO row
 * otherwise.
 */
function isEligibleForKit(name, kitHasKettlebells) {
  if (isAutoEligible(name)) return true;
  return kitHasKettlebells && kettlebellNeverAutoExceptions().includes(name);
}

/**
 * The ranking order's comparable tuple for one candidate row (lower sorts
 * first) - see the module header for what each position means.
 */
function rankTuple(row, { kitIsNonEmpty, preferCompound, usedPatterns }) {
  // A candidate that failed the ordinary canonicality gate can only be in
  // this list via the kettlebell NEVER_AUTO exception - isEligibleForKit
  // is the only path that admits such a row at all.
  const exceptionAdmitted = isAutoEligible(row.name) ? 0 : 1;
  const category = categoryOf(row);
  const kitBeforeBodyweight = kitIsNonEmpty ? (category === 'bodyweight' ? 1 : 0) : 0;
  // Lead ruling 2026-09-11 (after the review's final report): a rep-based
  // row before a timed hold. A quick session is logged by reps; a carry
  // or a plank is the exception, chosen only when the kit offers nothing
  // rep-based for the slot (a kettlebell shoulders slot picks a press, not
  // an overhead carry that happened to sit on a better tier).
  const timedHold = row.exerciseType === 'duration' ? 1 : 0;
  const tier = quickSessionTierRank(row.name);
  const compoundFirst = preferCompound ? (row.compoundIsolation === 'compound' ? 0 : 1) : 0;
  const pattern = row.movementPattern;
  const patternUsed = (pattern && usedPatterns.has(pattern)) ? 1 : 0;
  const difficulty = Number.isFinite(row.difficulty) ? row.difficulty : Infinity;
  const name = String(row.name ?? '');
  const id = String(row.id ?? '');
  return [exceptionAdmitted, kitBeforeBodyweight, timedHold, tier, compoundFirst, patternUsed, difficulty, name, id];
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

/** The eligible-and-unclaimed candidates in `rows` for one specific muscle -
 *  the exact filter ruling 4 specifies. Called once per muscle in a slot's
 *  group (or once, for a single-muscle slot) and pooled by the caller. */
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
 * movementPattern, difficulty, exerciseType, defaultRepMin, defaultRepMax,
 * retiredInto on a row; everything else on the matched row passes through
 * untouched in `items[].exercise` for the caller to build a workout entry
 * from.
 *
 * The group slot (shoulders) pools every eligible, unclaimed candidate
 * across ALL of its muscles and ranks across that whole pool - see the
 * module header.
 *
 * @param {{ library: Array<object>, kit: string[] }} args
 * @returns {{ items: Array<{ slot: string, slotKey: string, exercise:
 *   object, sets: number, repsMin: number, repsMax: number,
 *   restSeconds: number, restSuggested: true }>, unfilled: string[] }}
 *   `slot` is the muscle actually used (the winning row's own
 *   primaryMuscle, always a single muscle, honest on the row it names);
 *   `slotKey` is the slot's own identity ('shoulders' for the group slot,
 *   the same value as `slot` for every other one).
 */
export function buildQuickSession({ library, kit } = {}) {
  const rows = Array.isArray(library) ? library : [];
  const categories = kitCategoriesFor(kit);
  const kitIsNonEmpty = Array.isArray(kit) && kit.length > 0;
  const kitHasKettlebells = Array.isArray(kit) && kit.includes('kettlebells');

  const chosenNames = new Set();
  const usedPatterns = new Set();
  const items = [];
  const unfilled = [];

  for (const slotDef of QUICK_SESSION_SLOTS) {
    const slotKey = slotKeyFor(slotDef);
    const muscles = Array.isArray(slotDef) ? slotDef : [slotDef];
    const preferCompound = COMPOUND_PREFERRED_SLOTS.has(slotKey);

    // Pool every eligible, unclaimed candidate across every muscle in the
    // slot into ONE list and rank across the whole pool - never "first
    // muscle with any candidate wins, rank only within it".
    const candidates = [];
    for (const muscle of muscles) {
      candidates.push(...candidatesForMuscle(rows, muscle, { categories, chosenNames, kitHasKettlebells }));
    }

    if (!candidates.length) {
      unfilled.push(slotKey);
      continue;
    }
    candidates.sort((a, b) => compareRows(a, b, { kitIsNonEmpty, preferCompound, usedPatterns }));
    const winner = candidates[0];
    chosenNames.add(winner.name);
    if (winner.movementPattern) usedPatterns.add(winner.movementPattern);
    const p = prescriptionFor(winner);
    items.push({
      slot: winner.primaryMuscle,
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
 * this exact exercise ROW (by id) still reachable anywhere in the
 * intent-filtered library? If not, the filter removed it, and it is
 * classified via capabilityBlockReason exactly as the screen did before
 * this landing - the classifier call is wrapped in try/catch, and a throw
 * (a malformed capability state, an unavailable module) counts as a
 * preference drop, matching the screen's own prior fail-safe default.
 *
 * REVISED 2026-09-11 (lead ruling; revised a second time same day after
 * the fresh-eyes review): the first version of this function ran the
 * generator a second time over the filtered library and compared, PER
 * SLOT, whether the two runs picked the same winner - "different winner"
 * was taken to mean "the unfiltered winner was filtered out". That
 * reasoning had a hole: the chosen-name exclusion cascades. If one slot's
 * unfiltered winner is filtered out, that slot's new winner in the
 * filtered run can be a row that would otherwise have won a LATER slot
 * (freed up because the row that used to block it, by name, in
 * chosenNames, never got that chance this run) - so the later slot's own
 * winner changes too even though nothing in that later slot's own
 * candidate pool was filtered, and a per-slot comparison over-counts that
 * knock-on reshuffle as a second drop.
 *
 * The immediate fix checked library membership by NAME instead, with no
 * second generator run - but the fresh-eyes review caught that this is
 * still wrong whenever a CUSTOM exercise shares its display name with a
 * canonical one (real, reachable: local exercise creation is free-text):
 * removing the canonical row by id would leave its NAME still present via
 * the custom row, silently swallowing a genuine drop. Rows are matched by
 * `id` here for exactly that reason - ids are unique per row by
 * construction; names are not.
 *
 * @param {{ all: Array<object>, filtered: Array<object>, kit: string[],
 *   capabilityState: object|null }} args
 * @returns {{ capabilityDrops: number, preferenceDrops: number }}
 */
export function explainQuickSessionDrops({ all, filtered, kit, capabilityState } = {}) {
  const unfilteredResult = buildQuickSession({ library: all, kit });
  const filteredIds = new Set((Array.isArray(filtered) ? filtered : []).map((row) => row?.id));

  let capabilityDrops = 0;
  let preferenceDrops = 0;

  for (const item of unfilteredResult.items) {
    if (filteredIds.has(item.exercise.id)) continue;
    try {
      // eslint-disable-next-line global-require -- lazy require, as the screen did before this landing.
      const { capabilityBlockReason } = require('./capability/resolve');
      // Capability checked first, matching generationBlockReason's own
      // precedence (section 4.1): a movement that fails both reads as the
      // capability reason and is never double counted.
      if (capabilityBlockReason(capabilityState, item.exercise)) capabilityDrops += 1;
      else preferenceDrops += 1;
    } catch (_e) {
      preferenceDrops += 1;
    }
  }

  return { capabilityDrops, preferenceDrops };
}
