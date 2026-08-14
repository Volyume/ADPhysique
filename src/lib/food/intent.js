/**
 * food/intent.js — Campaign 17A job 3's canonical food-intent layer.
 *
 * The nutrition counterpart of src/lib/exercise/intent.js, and built to the
 * same laws, because the failure it prevents is the same one: before this,
 * the food domain had no way to tell apart three completely different things
 * a user does.
 *
 *   "There's no chicken in the house tonight."      -> JUST_THIS_TIME
 *   "Use turkey instead of chicken from now on."    -> PERSISTENT
 *   "Never show me chicken again."                  -> DONT_SUGGEST
 *
 * The first two left no trace beyond the edited plan, so a deliberate
 * standing preference was forgotten the moment the plan regenerated. And any
 * naive attempt to learn from swaps would have read the first as the second,
 * teaching a dislike the user never expressed.
 *
 * This module is the ONE place that decides. Screens and generators load a
 * state object once and then ask pure questions of it.
 *
 * THE LAWS THIS MODULE ENFORCES
 *
 *  - A one-off swap is not a preference. `JUST_THIS_TIME` rows are stored (a
 *    real thing happened) and are readable, but no positive or negative
 *    preference reading counts them. Ever.
 *  - Explicit intent outranks anything inferred. An exclusion beats a
 *    persistent replacement; a persistent replacement beats counted frequency.
 *  - Dislike is never INFERRED. The founder list is explicit: a one-off swap,
 *    an unlogged food, a missing diary day, a deleted mistaken entry, a
 *    planned-but-never-confirmed meal and simply not choosing something are
 *    all NOT evidence of dislike. Nothing here derives a negative from any of
 *    them; the only negatives are the two the user states outright.
 *  - Exclusion is about future SUGGESTIONS, never about history. No function
 *    here touches food_entries, a rollup or a logged day.
 *  - Ranking exposure is not evidence. This module never writes. Only a real
 *    user action creates evidence, so showing something first can never make
 *    it look more preferred next time.
 *  - No fake preference score. Evidence is reported as separate named
 *    dimensions with an explicit "not enough yet" state, exactly as the
 *    exercise layer does.
 *
 * PLANNED IS NOT EATEN (job 2) holds here too, and for free: the positive
 * frequency signal comes from `food_frequents`, which the server computes
 * from SYNCED rows, and planned rows are filtered out of the sync push. A
 * meal the user staged but never confirmed cannot teach that they like it.
 */
import { FOOD_SWAP_SCOPE } from './foodSwapScope';
import { getFoodSwaps, getFavourites, getDislikes, getFoodFrequents } from './db';

export { FOOD_SWAP_SCOPE };

/**
 * Repeated means repeated: one persistent replacement is a choice the user
 * made once, and it is honoured as a rule immediately (they said so outright).
 * This threshold is about something different - how many times the same
 * replacement has to be chosen before COUNTED behaviour, on its own, is worth
 * as much as an explicit statement.
 */
export const REPEATED_CHOICE_MIN = 3;

/** Times a food must appear in the frequents cache before it is established. */
export const ESTABLISHED_USES = 4;

/**
 * Load everything the selecting surfaces need, once.
 *
 * Fails OPEN on a read error, deliberately: a transient database failure must
 * not silently start suppressing foods the user never excluded, nor invent a
 * preference. No state means no intent, which is exactly the pre-17A
 * behaviour.
 *
 * @param {string} userId
 * @param {{excludeFoodKeys?: string[], excludeTags?: string[]}} [profilePrefs]
 *   The standing exclusions, which live on the profile rather than in a table
 *   of their own. Passed in rather than read here so this module keeps no
 *   dependency on the store.
 */
export async function loadFoodIntentState(userId, profilePrefs = {}) {
  const empty = {
    swaps: [],
    favourites: new Set(),
    dislikes: new Set(),
    frequents: new Map(),
    excludedFoodKeys: new Set(),
    excludedTags: new Set(),
  };
  const excluded = {
    excludedFoodKeys: new Set(
      (Array.isArray(profilePrefs?.excludeFoodKeys) ? profilePrefs.excludeFoodKeys : []).filter(Boolean),
    ),
    excludedTags: new Set(
      (Array.isArray(profilePrefs?.excludeTags) ? profilePrefs.excludeTags : []).filter(Boolean),
    ),
  };
  if (!userId) return { ...empty, ...excluded };
  try {
    const [swaps, favourites, dislikes, frequents] = await Promise.all([
      getFoodSwaps(userId),
      getFavourites(userId),
      getDislikes(userId),
      getFoodFrequents(userId),
    ]);
    return {
      swaps: swaps ?? [],
      favourites: new Set((favourites ?? []).map((r) => r.food_ref).filter(Boolean)),
      dislikes: new Set((dislikes ?? []).map((r) => r.food_ref).filter(Boolean)),
      frequents: new Map(
        (frequents ?? []).filter((r) => r?.food_ref).map((r) => [r.food_ref, Number(r.log_count) || 0]),
      ),
      ...excluded,
    };
  } catch (_e) {
    return { ...empty, ...excluded };
  }
}

// ─── Standing replacements ───────────────────────────────────────────────────

/**
 * The food the user has said to use INSTEAD of this one, or null.
 *
 * Only `persistent` rows are consulted. A just-this-time swap says nothing
 * about the future and must not become a standing rule - that is the whole
 * point of the scope, and the single most important line in this module.
 *
 * The most recent statement wins: someone who said turkey last month and beef
 * last week meant beef. A replacement that has since been excluded is
 * ignored (job 6: an exclusion outranks a preference, always).
 */
export function persistentReplacementFor(state, foodKey) {
  if (!state || !foodKey) return null;
  const rows = (state.swaps ?? [])
    .filter((r) => r.fromFoodKey === foodKey && r.scope === FOOD_SWAP_SCOPE.PERSISTENT)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  const to = rows[0]?.toFoodKey ?? null;
  if (!to) return null;
  return isFoodExcluded(state, to) ? null : to;
}

/**
 * Every standing replacement, as a plain `{ fromFoodKey: toFoodKey }` map, for
 * generation paths that want to apply them in one pass. Excluded targets are
 * dropped for the same reason as above.
 */
export function persistentReplacements(state) {
  const out = {};
  const seen = new Set();
  const rows = [...(state?.swaps ?? [])]
    .filter((r) => r.scope === FOOD_SWAP_SCOPE.PERSISTENT)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  for (const r of rows) {
    if (!r.fromFoodKey || !r.toFoodKey || seen.has(r.fromFoodKey)) continue;
    seen.add(r.fromFoodKey);
    if (isFoodExcluded(state, r.toFoodKey)) continue;
    out[r.fromFoodKey] = r.toFoodKey;
  }
  return out;
}

/**
 * How often the user has substituted this food for ONE occurrence.
 *
 * Exposed separately and deliberately NEVER used as negative preference. It
 * is a real observation - "this one is often missing when they shop" - and a
 * future surface may want it, but it must never reach a suggestion decision.
 */
export function justThisTimeCount(state, foodKey) {
  return (state?.swaps ?? []).filter(
    (r) => r.fromFoodKey === foodKey && r.scope === FOOD_SWAP_SCOPE.JUST_THIS_TIME,
  ).length;
}

// ─── Exclusion (job 6's precedence starts here) ──────────────────────────────

/**
 * Is this food excluded outright?
 *
 * Two sources, both explicit statements by the user: the standing
 * "never suggest this" list on the profile, and an explicit dislike. Neither
 * is ever inferred from behaviour.
 *
 * Allergen and diet-rule exclusion is a separate, senior layer that operates
 * on TAGS and diet compatibility (planPreferences.foodAllowed); this function
 * answers only the food-key question. Callers that select food run both, and
 * job 6 pins that neither can be bypassed.
 */
export function isFoodExcluded(state, foodKey) {
  if (!state || !foodKey) return false;
  if (state.excludedFoodKeys?.has(foodKey) === true) return true;
  // Campaign 17B job 8. Dislikes are stored as food REFS (`curated:oats`,
  // `off:<barcode>`, `custom:<id>`) because they can be set on any logged
  // food, while this function is asked about a curated KEY. Checking the raw
  // key alone silently never matched a curated dislike, so a food the user
  // had told us not to suggest kept being suggested. Both forms are checked.
  if (state.dislikes?.has(foodKey) === true) return true;
  return state.dislikes?.has(`curated:${foodKey}`) === true;
}

/** The opposite question, for readability at call sites that select. */
export function isFoodEligible(state, foodKey) {
  return !isFoodExcluded(state, foodKey);
}

// ─── Evidence maturity ───────────────────────────────────────────────────────

/**
 * How established is this user's evidence about a food?
 *
 * FOUNDER LAW: "Do not declare a strong preference from one ambiguous event...
 * Generic sensible meal choice dominates early. Established personal evidence
 * can progressively dominate among valid choices."
 *
 * The levels are exposures, not a score:
 *
 *   NONE         nothing the user has said or repeatedly done. The generic
 *                judgement about what makes a sensible meal decides alone.
 *   EMERGING     real, and not yet enough to overrule the generic judgement:
 *                used once or twice, or chosen once as a replacement.
 *   ESTABLISHED  said outright (favourite, standing replacement) or used
 *                often enough that this user's own history is the better
 *                guide among otherwise-valid choices.
 *
 * The thresholds are a product heuristic and are written down as one. They are
 * not a claim about how many meals make a food "right" for someone.
 */
export const FOOD_EVIDENCE_MATURITY = Object.freeze({
  NONE: 'none',
  EMERGING: 'emerging',
  ESTABLISHED: 'established',
});

export function foodEvidenceMaturity({ uses = 0, repeatedChoice = 0, stated = false } = {}) {
  // An explicit statement IS established evidence. The user did not need to
  // do anything four times to mean it.
  if (stated) return FOOD_EVIDENCE_MATURITY.ESTABLISHED;
  if (uses >= ESTABLISHED_USES || repeatedChoice >= REPEATED_CHOICE_MIN) {
    return FOOD_EVIDENCE_MATURITY.ESTABLISHED;
  }
  if (uses >= 1 || repeatedChoice >= 1) return FOOD_EVIDENCE_MATURITY.EMERGING;
  return FOOD_EVIDENCE_MATURITY.NONE;
}

/**
 * How much weight personal evidence may carry at this maturity.
 *
 * Zero at NONE is the point: with no exposures there is nothing personal to
 * weigh, so the generic judgement about what makes a sensible meal decides on
 * its own.
 */
export const FOOD_MATURITY_WEIGHT = Object.freeze({
  [FOOD_EVIDENCE_MATURITY.NONE]: 0,
  [FOOD_EVIDENCE_MATURITY.EMERGING]: 0.5,
  [FOOD_EVIDENCE_MATURITY.ESTABLISHED]: 1,
});

export function foodMaturityWeight(maturity) {
  return FOOD_MATURITY_WEIGHT[maturity] ?? 0;
}

/**
 * Separate, named, observable dimensions for one food. NOT a score.
 *
 * Deliberately absent: any "fit %", any inferred dislike, and any reading of
 * the founder's non-evidence list (a one-off swap, an unlogged food, a
 * missing day, a deleted entry, an unconfirmed planned meal, or simply not
 * being chosen). None of those appear as an input anywhere below.
 *
 * @returns {{
 *   favourite: boolean, disliked: boolean, excluded: boolean,
 *   uses: number, standingReplacement: string|null, repeatedChoice: number,
 *   justThisTimeSwaps: number, maturity: string, weight: number,
 * }}
 */
export function foodEvidence(state, foodKey) {
  const favourite = state?.favourites?.has(foodKey) === true;
  const uses = Number(state?.frequents?.get(foodKey) ?? 0) || 0;
  // How often this food has been chosen as a PERSISTENT replacement for
  // something else. Choosing something is a positive signal; one-off swaps
  // are excluded here as everywhere.
  const repeatedChoice = (state?.swaps ?? []).filter(
    (r) => r.toFoodKey === foodKey && r.scope === FOOD_SWAP_SCOPE.PERSISTENT,
  ).length;
  const stated = favourite || repeatedChoice > 0;
  const maturity = foodEvidenceMaturity({ uses, repeatedChoice, stated });
  return {
    favourite,
    disliked: state?.dislikes?.has(foodKey) === true,
    excluded: isFoodExcluded(state, foodKey),
    uses,
    standingReplacement: persistentReplacementFor(state, foodKey),
    repeatedChoice,
    justThisTimeSwaps: justThisTimeCount(state, foodKey),
    maturity,
    weight: foodMaturityWeight(maturity),
  };
}

/**
 * A bounded personal-preference bonus for one food, for generators that rank
 * candidates.
 *
 * Bounded ON PURPOSE, and small: the founder posture is that generic sensible
 * meal choice dominates early and personal evidence "can progressively
 * dominate AMONG VALID CHOICES". It is a nudge between foods that are already
 * allowed, never a route around allergen, diet or exclusion rules - those are
 * hard filters applied before anything is ranked.
 *
 * Never negative. There is no inferred dislike in this app; a food the user
 * has said no to is filtered out entirely, not down-ranked.
 */
export const MAX_PREFERENCE_BONUS = 0.5;

export function preferenceBonus(state, foodKey) {
  if (!state || !foodKey) return 0;
  if (isFoodExcluded(state, foodKey)) return 0;
  const ev = foodEvidence(state, foodKey);
  if (ev.maturity === FOOD_EVIDENCE_MATURITY.NONE) return 0;
  // One base unit for "the user has said or shown something", scaled by how
  // established that is. An explicit favourite and a food eaten twenty times
  // both land at the cap; there is no runaway.
  return MAX_PREFERENCE_BONUS * ev.weight;
}

// ─── Plain English ───────────────────────────────────────────────────────────

/**
 * What the user reads about a standing replacement, in the app's voice.
 *
 * The everyday test applies: someone who cooks and shops, and has never read
 * a nutrition paper, understands it immediately. No "preference confidence",
 * no "evidence maturity", no percentages.
 */
export function replacementCopy(fromName, toName) {
  if (!fromName || !toName) return null;
  return `We will use ${toName} instead of ${fromName} in your future plans.`;
}

/** The one-off case, said plainly so the user knows nothing was learned. */
export function justThisTimeCopy(toName) {
  if (!toName) return null;
  return `Swapped to ${toName} for this meal only. Nothing else changes.`;
}

/**
 * "We have not seen enough yet." The founder's own example of good copy, for
 * surfaces that explain why a suggestion has not shifted toward a user's
 * habits.
 */
export function earlyEvidenceCopy() {
  return 'We have not seen enough yet to change what we normally suggest.';
}
