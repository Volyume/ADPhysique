/**
 * setupFormSeed (proposal 10, F1): the one place the two setup forms
 * ("Update goal and phase" on the Coach tab, "Adjust training plan" on the
 * Train tab) decide whether the saved profile has moved on since they last
 * seeded their fields.
 *
 * Bottom tabs keep their stack across a tab switch, so a form can stay mounted
 * for hours while the other form saves. Each form calls
 * `setupFormSignature(profile)` on focus and re-seeds only when the signature
 * differs from the one it last seeded from, so unsaved edits survive a trip to
 * a sub-screen (nothing changed) but never overwrite a newer saved setup.
 * When it does re-seed it shows `SETUP_CHANGED_NOTICE` so the change is never
 * silent.
 *
 * Pure. No I/O. Reads no safety state and no tier.
 */
export const SETUP_FORM_FIELDS = Object.freeze([
  'trainingGoal', 'trainingArchetype', 'planWeakPoints', 'experience',
  'daysPerWeek', 'sessionLengthMinutes', 'equipment', 'recoveryRating',
  'trainingPhase', 'proteinApproach',
]);

export const SETUP_CHANGED_NOTICE = 'Your setup was changed on another screen. This shows the latest.';

export function setupFormSignature(profile) {
  const p = profile || {};
  return JSON.stringify(SETUP_FORM_FIELDS.map((k) => p[k] ?? null));
}
