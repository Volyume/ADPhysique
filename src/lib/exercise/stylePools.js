/**
 * stylePools.js — style pools for alternative library plans (EL-8, EL-11;
 * docs/exercise-library-expansion-2026-09-05/09-STYLE-PLANS.md section 1).
 *
 * Pure, no I/O, no React Native imports. A style pool is a named,
 * versioned list of canonical exercise names. It is the CANDIDATE SET a
 * style-tagged plan's generation, swap ranking and "current plan" picker
 * filter restrict themselves to, when the plan carries `style:<pool>` in
 * its tags (EL-11). No second engine: this file only decides membership.
 *
 * Two pools are HAND-CURATED (kettlebell_foundations, kettlebell_
 * experienced) per the RKC/StrongFirst competence ordering research
 * (04-ALT-PLAN-RESEARCH.md section 3): swing and get-up before one-arm
 * and overhead ballistics, ballistics only at the experienced level. Every
 * other pool is DERIVED from the corpus at import time by equipment
 * category and auto-generation tier (STAPLE or COMMON only — the same
 * "recognisable movement" bar the generator itself applies) — the corpus
 * is already in memory, so no separate build script or materialised file
 * is needed (09 section 1: "a script is only needed if the derived pools
 * must be materialised; otherwise derive at import time").
 *
 * NEVER_AUTO EXCEPTION (EL-8): the auto-generation registry
 * (canonicality.js) marks kettlebell ballistics NEVER_AUTO because they
 * are not ordinary hypertrophy work for an unprompted plan. A style pool
 * is a DELIBERATE, EXPLICIT exception to that gate — the whole point of
 * `kettlebell_experienced` is to reach ballistics for a user who chose
 * this style. KETTLEBELL_NEVER_AUTO_EXCEPTIONS below is the closed list of
 * names this file is allowed to carry despite being NEVER_AUTO; the corpus
 * guard (scripts/exercise-library/validate-corpus.mjs) fails if any pool
 * contains a NEVER_AUTO row outside this list.
 */
import { CORPUS, CORPUS_BY_NAME } from '../exerciseCorpus/index.js';
import { autoTier, AUTO_TIER } from './canonicality.js';

// ─── Pool keys ──────────────────────────────────────────────────────────────

export const STYLE_POOL_KEYS = Object.freeze({
  KETTLEBELL_FOUNDATIONS: 'kettlebell_foundations',
  KETTLEBELL_EXPERIENCED: 'kettlebell_experienced',
  CIRCUIT_DUMBBELL: 'circuit_dumbbell',
  CIRCUIT_BODYWEIGHT: 'circuit_bodyweight',
  BODYWEIGHT: 'bodyweight',
  BAND: 'band',
  SUSPENSION: 'suspension',
  MINIMAL_HOME: 'minimal_home',
});

// ─── Kettlebell: hand-curated (09 section 1 table) ────────────────────────
//
// Grind rows and the two-hand swing only — no single-arm or overhead
// ballistic work. Every name is checked against CORPUS_BY_NAME below
// (buildPool throws in dev if a name does not resolve), so a rename in the
// corpus fails loudly here rather than silently shrinking the pool.
const KETTLEBELL_FOUNDATIONS_NAMES = Object.freeze([
  'Kettlebell Goblet Squat',
  'Kettlebell Deadlift',
  'Kettlebell Sumo Deadlift',
  'Kettlebell Single-Leg Deadlift',
  'Kettlebell Romanian Deadlift',
  'Kettlebell Press (Single-Arm)',
  'Seated Kettlebell Press',
  'Kettlebell Floor Press',
  'Kettlebell Row (Single-Arm)',
  'Gorilla Row',
  "Kettlebell Farmer's Carry",
  'Kettlebell Suitcase Carry',
  'Kettlebell Rack Carry',
  'Kettlebell Halo',
  'Kettlebell Around-the-World',
  'Kettlebell Reverse Lunge (Rack Position)',
  'Get-Up to Elbow',
  'Turkish Get-Up (Half)',
  'Kettlebell Swing',
  'Kettlebell Shrug',
]);

// Ballistics and advanced grinds a foundations plan never reaches. Every
// NEVER_AUTO name here is also in KETTLEBELL_NEVER_AUTO_EXCEPTIONS below.
const KETTLEBELL_EXPERIENCED_EXTRA_NAMES = Object.freeze([
  'Kettlebell Swing (Single-Arm)',
  'Kettlebell Swing (Alternating)',
  'Double Kettlebell Swing',
  'Kettlebell Clean',
  'Double Kettlebell Clean',
  'Kettlebell Dead Clean',
  'Kettlebell Hang Clean',
  'Kettlebell Snatch',
  'Alternating Kettlebell Snatch',
  'Kettlebell Clean and Press',
  'Kettlebell Push Press',
  'Kettlebell Jerk',
  'Kettlebell High Pull',
  'Kettlebell Front Rack Squat (Single-Arm)',
  'Kettlebell Front Rack Squat (Double)',
  'Double Kettlebell Press',
  'Half-Kneeling Kettlebell Press',
  'See-Saw Kettlebell Press',
  'Bottoms-Up Kettlebell Press',
  'Bottoms-Up Kettlebell Carry',
  'Kettlebell Thruster (Double)',
  'Turkish Get-Up',
  'Kettlebell Windmill (Low)',
  'Kettlebell Windmill (High)',
  'Kettlebell Overhead Carry',
  'Kettlebell Overhead Lunge',
  'Kettlebell Forward Lunge (Rack Position)',
  'Kettlebell Renegade Row',
]);

const KETTLEBELL_EXPERIENCED_NAMES = Object.freeze([
  ...KETTLEBELL_FOUNDATIONS_NAMES,
  ...KETTLEBELL_EXPERIENCED_EXTRA_NAMES,
]);

/**
 * The closed list of NEVER_AUTO names any style pool is allowed to carry
 * (EL-8: ballistics enter ONLY through the kettlebell style pool). Used by
 * the corpus guard; exported so the guard script and this module's own
 * dev-time assertion below can never drift apart.
 */
export const KETTLEBELL_NEVER_AUTO_EXCEPTIONS = Object.freeze(
  KETTLEBELL_EXPERIENCED_NAMES.filter((n) => autoTier(n) === AUTO_TIER.NEVER_AUTO),
);

// ─── Derived pools (equipment + tier, computed at import time) ────────────

const RECOGNISABLE_TIERS = new Set([AUTO_TIER.STAPLE, AUTO_TIER.COMMON]);

/** STAPLE/COMMON corpus rows whose equipment matches one of `categories`. */
function deriveByEquipment(categories) {
  const set = new Set(categories);
  return Object.freeze(
    CORPUS
      .filter((e) => set.has(e.equipment) && RECOGNISABLE_TIERS.has(autoTier(e.name)))
      .map((e) => e.name),
  );
}

const CIRCUIT_DUMBBELL_NAMES = deriveByEquipment(['dumbbell', 'bodyweight']);
const CIRCUIT_BODYWEIGHT_NAMES = deriveByEquipment(['bodyweight']);
const BODYWEIGHT_NAMES = deriveByEquipment(['bodyweight']);
const BAND_NAMES = deriveByEquipment(['band']);
const SUSPENSION_NAMES = deriveByEquipment(['suspension']);
const MINIMAL_HOME_NAMES = deriveByEquipment(['bodyweight', 'band', 'suspension', 'dumbbell']);

// ─── Assembled registry ─────────────────────────────────────────────────────

export const STYLE_POOLS = Object.freeze({
  [STYLE_POOL_KEYS.KETTLEBELL_FOUNDATIONS]: KETTLEBELL_FOUNDATIONS_NAMES,
  [STYLE_POOL_KEYS.KETTLEBELL_EXPERIENCED]: KETTLEBELL_EXPERIENCED_NAMES,
  [STYLE_POOL_KEYS.CIRCUIT_DUMBBELL]: CIRCUIT_DUMBBELL_NAMES,
  [STYLE_POOL_KEYS.CIRCUIT_BODYWEIGHT]: CIRCUIT_BODYWEIGHT_NAMES,
  [STYLE_POOL_KEYS.BODYWEIGHT]: BODYWEIGHT_NAMES,
  [STYLE_POOL_KEYS.BAND]: BAND_NAMES,
  [STYLE_POOL_KEYS.SUSPENSION]: SUSPENSION_NAMES,
  [STYLE_POOL_KEYS.MINIMAL_HOME]: MINIMAL_HOME_NAMES,
});

// Dev-time integrity check for the two hand-curated pools: every name must
// resolve in the live corpus (never a retired stub), so a family rename
// fails here immediately rather than silently shrinking a pool. Guards
// only the curated pools — the derived ones can only ever contain corpus
// names by construction.
if (process.env.NODE_ENV !== 'production') {
  for (const name of [...KETTLEBELL_FOUNDATIONS_NAMES, ...KETTLEBELL_EXPERIENCED_EXTRA_NAMES]) {
    const entry = CORPUS_BY_NAME.get(name);
    if (!entry || entry.retiredInto) {
      throw new Error(`stylePools: curated kettlebell name "${name}" does not resolve in CORPUS_BY_NAME`);
    }
  }
}

/**
 * The style pool tag on a plan's `tags` string, e.g. "style:
 * kettlebell_foundations" → "kettlebell_foundations". Null when the tags
 * string carries no style tag.
 */
export function styleKeyFromTags(tagsString) {
  const m = /(?:^|\s)style:(\S+)/.exec(typeof tagsString === 'string' ? tagsString : '');
  return m ? m[1] : null;
}

/**
 * Resolve a style pool from either a bare key ("kettlebell_foundations")
 * or a full tag ("style:kettlebell_foundations"). Returns the frozen name
 * array, or null when the key is unknown/absent — callers treat null as
 * "no constraint", never as an empty pool.
 */
export function stylePoolFor(tag) {
  if (!tag) return null;
  const key = String(tag).startsWith('style:') ? String(tag).slice('style:'.length) : String(tag);
  return STYLE_POOLS[key] ?? null;
}

/** Is `name` a member of the named style pool? False for an unknown pool. */
export function isInStylePool(poolKey, name) {
  const pool = stylePoolFor(poolKey);
  return !!pool && pool.includes(name);
}

// Short, calm, user-facing word for the swap sheet's "Showing <label>
// exercises" line (EL-11). Not a full label registry - just enough to name
// the two families of style pool this campaign ships.
export function styleLabelFor(key) {
  if (!key) return null;
  if (key.startsWith('kettlebell')) return 'kettlebell';
  if (key.startsWith('circuit')) return 'circuit';
  return key.replace(/_/g, ' ');
}
