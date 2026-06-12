/**
 * COMP-030 — quiz-first onboarding flag + the pre-account quiz definition.
 *
 * Variant B (the founder-recommended full resequence): the Pro path runs a
 * short quiz -> a deterministic plan PREVIEW -> the "Save your plan" account
 * wall -> Article 9 consent at the first health input (unchanged). The whole
 * thing ships behind a LOCAL config flag read at WelcomeStack mount, so
 * rollback is a flag flip and the live account-first flow is byte-unchanged
 * while the flag is off (blueprint §8). Default OFF until the founder flips it
 * after the two-week baseline measurement.
 *
 * PRIVACY (the headline, §4B/§9): pre-account answers live ONLY in JS process
 * memory — never AsyncStorage, never SQLite, no device id, no network. Nothing
 * reaches Volyume's servers until an account exists, and no health data until
 * explicit consent. The quiz carries no body weight, food or screening input,
 * so it is not special-category data.
 */

// Flip to true to ship the quiz-first front door. Reversible: the existing
// account-first flow is fully intact while this is false.
export const ONBOARDING_QUIZ_FIRST = false;

// The pre-account quiz questions, in order. Options reuse the same source of
// truth the post-account wizard uses (coachingGoals.js / the equipment list),
// so nothing is re-asked or duplicated — the post-account step is MOVED here.
export const QUIZ_STEPS = Object.freeze([
  {
    key: 'training',
    title: 'How do you train?',
    fields: ['experience', 'daysPerWeek', 'sessionLengthMinutes', 'equipment'],
  },
  {
    key: 'goal',
    title: 'What are you training for?',
    // phase ('cut'/'lean gain'/'maintain') is a DPO classification question
    // (§9 Q2): if the DPO classes a phase choice as health data it moves behind
    // the consent gate. Held as a flag so that move is a one-line change.
    fields: ['trainingGoal', 'trainingPhase', 'weakPoints'],
  },
]);

// Whether the phase question is allowed pre-account. Conservative default: keep
// it (a goal preference, not a health-status statement). The DPO note rides the
// PR; flipping this to false moves the phase ask behind the Article 9 gate.
export const PHASE_PRE_ACCOUNT = true;

/** Is the quiz slice complete enough to build a preview? */
export function isQuizComplete(slice) {
  return !!(slice
    && slice.daysPerWeek
    && slice.trainingGoal
    && slice.experience);
}
