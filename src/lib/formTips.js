/**
 * formTips.js — the plain-text instructions for an exercise.
 *
 * History: this file carried a 545-entry hand-written FORM_TIPS map that
 * took precedence over the corpus cue on the active-workout sheet and the
 * exercise detail screen. Those paragraphs were longer, older, used en
 * dashes and safety wording, and left the other ~380 exercises on a
 * different register. D151 (2026-09-05) retired the map: every built-in
 * exercise's instructions now live ONLY in the corpus as structured
 * setup/execution/watch fields (src/lib/exerciseCorpus/families/*.js,
 * contract in instructionContract.js), rendered by
 * src/lib/exerciseInstructions.js's instructionsFor(). The exercises
 * table's `cue` column carries the joined paragraph, which is what this
 * function returns for any caller that wants a single string.
 */
export function formTipFor(exercise) {
  if (!exercise) return null;
  const cue = exercise.cue;
  return typeof cue === 'string' && cue.trim() ? cue : null;
}
