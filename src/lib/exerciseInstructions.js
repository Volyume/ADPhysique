/**
 * exerciseInstructions.js — the structured instructions for a built-in
 * exercise (D151), read straight from the corpus by canonical name.
 *
 * The exercises table carries the joined `cue` paragraph for legacy
 * readers; the two surfaces that show instructions while someone is
 * standing at the rack (the active-workout exercise sheet and the
 * exercise detail screen) render the fields separately as Setup /
 * Execution / Watch, so the first visible layer reads in seconds.
 *
 * Returns null for a custom exercise or any name the corpus does not
 * know, so callers fall back to their own notes or default copy. A
 * retired name resolves to its survivor's instructions, matching how the
 * top-up already remaps those rows.
 */
import { CORPUS_BY_NAME } from './exerciseCorpus/index.js';

export function instructionsFor(exercise) {
  if (!exercise || !exercise.name) return null;
  if (exercise.isCustom === 1 || exercise.isCustom === true || exercise.is_custom === 1) return null;
  let entry = CORPUS_BY_NAME.get(exercise.name);
  if (entry?.retiredInto) entry = CORPUS_BY_NAME.get(entry.retiredInto);
  if (!entry || typeof entry.setup !== 'string' || typeof entry.execution !== 'string') return null;
  return {
    setup: entry.setup,
    execution: entry.execution,
    watch: typeof entry.watch === 'string' && entry.watch.trim() ? entry.watch : null,
  };
}
