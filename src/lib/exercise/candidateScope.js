/**
 * candidateScope.js — the style + equipment narrowing for SUBSTITUTE
 * candidate sets (final-certification-2026-09-05 F-14, evidence
 * `docs/final-certification-2026-09-05/04-TRAINING-STYLES.md` A6).
 *
 * The defect this closes: serve-time capability substitution
 * (`capability/effective.js` bestEligibleSubstitute) asked only about
 * primary muscle, not-taken and eligibility, over the WHOLE catalogue —
 * so a "no overhead" rule on Dumbbell Shoulder Press inside
 * "Full-Body Circuit: Dumbbells" could serve a barbell or a machine
 * press to someone training at home with a pair of dumbbells. The
 * library CARD was already honest about the plan's style; the serve path
 * was not.
 *
 * Two narrowings, both of which the app already applies everywhere else:
 *
 *  - STYLE (EL-11, `docs/exercise-library-expansion-2026-09-05/
 *    05-DECISIONS.md`): "A style plan constrains generation and swap
 *    candidates to its pool". Generation enforces it in planEngine's
 *    filterPool; the live swap sheet enforces it by passing
 *    `stylePoolFor(styleKey)` into rankSwaps. Serve-time substitution
 *    now asks the same question, through the same `stylePools.js`.
 *  - EQUIPMENT: `equipmentReachable` (planAutoGen.js), the ONE exported
 *    equipment predicate the generator's continuity lane already uses,
 *    reading `equipmentProfiles` through poolGenerator's `parseProfiles`
 *    — the same parser planEngine's filterPool and swapEngine's
 *    equipment filter consume. It is re-exported below so a test can
 *    assert by identity that no second predicate was written here.
 *
 * Both fail OPEN, deliberately and for the reasons their own modules
 * already state: an unknown style (no `style:` tag) is no constraint,
 * and a row carrying no equipment profiles (a custom exercise the
 * athlete created) is never hidden on an absence of data.
 *
 * Pure. No I/O, no store, no database — the caller resolves the style
 * key and the equipment profile and hands them in.
 */
import { stylePoolFor } from './stylePools';
import { equipmentReachable } from '../planAutoGen';

// Re-exported so the shared-predicate claim is provable by identity
// rather than by comment (F-14 test requirement). Never re-implement it
// here: a per-site copy of one rule is how nets grow holes.
export { equipmentReachable };

/**
 * The candidate predicate for a substitute selection, or null when there
 * is nothing to narrow.
 *
 * Null is the important half of the contract: an untagged plan on a
 * user with no equipment profile recorded gets NO predicate at all, so
 * `bestEligibleSubstitute` runs byte-identically to before this change.
 * The narrowing only ever REMOVES candidates — it never admits one the
 * capability or preference lanes would refuse, because it runs before
 * (and never instead of) the injected senior eligibility question.
 *
 * @param {{styleKey?: string|null, equipment?: string|null}} scope
 *   styleKey is a style pool key or `style:<key>` tag (stylePools.js);
 *   equipment is the athlete's profile in planEngine's vocabulary
 *   ('full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates',
 *   'home_gym', 'bodyweight').
 * @returns {((exercise: object) => boolean)|null}
 */
export function substituteCandidateFilter({ styleKey = null, equipment = null } = {}) {
  const pool = stylePoolFor(styleKey);
  // An unknown or absent pool key is "no constraint", never an empty
  // pool — stylePoolFor's own stated contract.
  const poolNames = pool && pool.length ? new Set(pool) : null;
  const eq = equipment || null;
  if (!poolNames && !eq) return null;
  return (exercise) => {
    if (poolNames && !poolNames.has(exercise?.name)) return false;
    return equipmentReachable(exercise, eq);
  };
}
