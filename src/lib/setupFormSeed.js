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
// Option B ownership (proposal 10): "Adjust training plan" owns the training
// fields, "Update goal and phase" owns phase and protein. Each form watches only
// its own, so a save on the other screen never overwrites an unsaved edit here.
export const TRAIN_FORM_FIELDS = Object.freeze([
  'trainingGoal', 'trainingArchetype', 'planWeakPoints', 'experience',
  'daysPerWeek', 'sessionLengthMinutes', 'equipment', 'recoveryRating',
]);
export const COACH_FORM_FIELDS = Object.freeze(['trainingPhase', 'proteinApproach']);
export const SETUP_FORM_FIELDS = Object.freeze([...TRAIN_FORM_FIELDS, ...COACH_FORM_FIELDS]);

export const SETUP_CHANGED_NOTICE = 'Your setup was changed on another screen. This shows the latest.';

export function setupFormSignature(profile, fields = SETUP_FORM_FIELDS) {
  const p = profile || {};
  return JSON.stringify(fields.map((k) => p[k] ?? null));
}
