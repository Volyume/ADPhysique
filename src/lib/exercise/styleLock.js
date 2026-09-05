/**
 * styleLock.js — the ONE rule for "this plan came from the Plan Library as a
 * style plan, so Volyume must not regenerate it into a different kind of
 * plan".
 *
 * Authority: F-16 REVISED point 3 in
 * docs/final-certification-2026-09-05/07-FINDINGS.md (which absorbs F-15), on
 * the evidence of the "F-16 INVESTIGATION" appendix in
 * docs/final-certification-2026-09-05/04-TRAINING-STYLES.md. That
 * investigation measured the real generator against the real corpus: it
 * builds from six equipment profiles only, it emits no grouping at all
 * (`assignSupersets` was deliberately deleted), and it cannot produce a
 * kettlebell-only or a differentiated band plan. So a kettlebell, circuit or
 * band plan handed to the rebuild path comes back as a different kind of
 * plan entirely.
 *
 * WHY THIS FILE EXISTS. Two separate screens rebuild the active plan:
 * PlanUpdateScreen ("Adjust training") and ProGoalSetupScreen ("Update goal
 * and phase", reached from the Coach tab). A rule implemented twice is a rule
 * that drifts, and the second screen is precisely the one where the loss is
 * least expected - the athlete went there to change a GOAL. One pure module,
 * imported by both.
 *
 * Pure: tag parsing only, no I/O, no store, no database.
 */

import { styleKeyFromTags, styleLabelFor } from './stylePools';

/**
 * Resolve a plan's style lock from its `tags` string.
 *
 * Returns null for an ordinary plan (which rebuilds exactly as it always
 * has), and for a style key outside the three shipped families - an unknown
 * style must never silently disable a rebuild path.
 *
 * @param {string|null|undefined} tags a programme row's tags string
 * @returns {{key: string, collection: string, label: string}|null}
 *   `collection` is the Plan Library chip that holds the family, so a screen
 *   can route straight to it; `label` is the calm one-word name for copy.
 */
export function styleLockFromTags(tags) {
  const key = styleKeyFromTags(tags);
  if (!key) return null;
  let collection = null;
  if (key.startsWith('kettlebell')) collection = 'kettlebell';
  else if (key.startsWith('circuit')) collection = 'circuit';
  else if (key === 'band') collection = 'band';
  if (!collection) return null;
  return { key, collection, label: styleLabelFor(key) ?? collection };
}

/**
 * The notice shown where the REBUILD form would be (Adjust training): the
 * whole screen does nothing but regenerate, so it is replaced by the reason
 * and the route that can actually change the plan.
 */
export function styleLockRebuildNotice(label) {
  return `This is a ${label} plan from the Plan Library. Volyume builds adjusted plans from gym, dumbbell, home and bodyweight kit, so to change it choose another ${label} plan.`;
}

/**
 * The notice shown where the TRAINING SETUP fields would be on the goal and
 * phase screen. Different sentence because the situation is different: the
 * goal, phase, protein approach and nutrition targets all still save there.
 * Only the plan rebuild is withheld.
 */
export function styleLockGoalNotice(label) {
  return `Your ${label} plan stays as it is. Goal and nutrition targets update; to change the plan, choose another ${label} plan in the Plan Library.`;
}

/** The button that carries the athlete to the family the lock names. */
export function styleLockBrowseLabel(label) {
  return `Browse ${label} plans`;
}
