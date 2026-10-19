/**
 * trainingArchetypes.js: the training style choice a not-competing person
 * makes (founder ruling 2026-10-19). The rulebook (structure/rulebook.js
 * ARCHETYPES) owns what each style does to the plan; this module owns only
 * how it is shown: its name, one plain line about the training (never about
 * a look the person will get), and which muscles its card's muscle map
 * fills, read from the rulebook's own tiers so the picture can never promise
 * what the plan does not do.
 *
 * Pure.
 */
import { ARCHETYPES, TIERS, archetypeCategory, rulebookCategory } from './structure/rulebook';

export const ARCHETYPE_OPTIONS = Object.freeze([
  Object.freeze({ value: 'balanced', label: 'Balanced', description: 'Every muscle trained evenly. The all-round plan.' }),
  Object.freeze({ value: 'v_taper', label: 'V-taper', description: 'More back and shoulder work for width, with one leg day a week.' }),
  Object.freeze({ value: 'x_frame', label: 'X-frame', description: 'Shoulders, back and legs all at priority, for proportion top to bottom.' }),
  Object.freeze({ value: 'upper_density', label: 'Upper-body density', description: 'Chest and back trained two or three times a week, with one leg day.' }),
  Object.freeze({ value: 'powerbuilder', label: 'Powerbuilder', description: 'Squat, bench, deadlift and rows heavy at 3 to 6 reps, with size work around them.' }),
  Object.freeze({ value: 'minimalist', label: 'Minimalist', description: 'Each muscle at its weekly minimum, for shorter sessions.' }),
]);

/** True when the training style applies: the person is not competing. */
export function archetypeApplies(trainingGoal) {
  return rulebookCategory(trainingGoal) === 'general';
}

/** A stored value as a known style key, else null (never guessed). */
export function normaliseArchetype(value) {
  return typeof value === 'string' && ARCHETYPES[value] ? value : null;
}

// The muscle map draws lats and upper back as one back, both glutes as one.
const DIAGRAM_KEY = Object.freeze({ lats: 'back', upper_back: 'back', glute_max: 'glutes', glute_med: 'glutes' });
const RANK = Object.freeze({ P: 3, S: 2, M: 1, I: 0 });

/**
 * Which muscles the card fills: 'priority' for a P muscle, 'maintenance' for
 * an M muscle, nothing for S or indirect-only. Balanced and minimalist share
 * the general tiers (no priority muscles); a merged region takes its higher
 * tier. Returns { [diagramMuscle]: 'priority' | 'maintenance' }.
 */
export function archetypeEmphasis(archetype) {
  if (!ARCHETYPES[archetype]) return {};
  const category = archetypeCategory(archetype);
  const best = {};
  for (const [m, byCategory] of Object.entries(TIERS)) {
    const t = byCategory[category];
    const key = DIAGRAM_KEY[m] || m;
    if (best[key] == null || RANK[t] > RANK[best[key]]) best[key] = t;
  }
  const out = {};
  for (const [key, t] of Object.entries(best)) {
    if (t === 'P') out[key] = 'priority';
    else if (t === 'M') out[key] = 'maintenance';
  }
  return out;
}

const WORDS = Object.freeze({
  chest: 'chest', back: 'back', side_delts: 'side shoulders', rear_delts: 'rear shoulders', biceps: 'biceps',
  triceps: 'triceps', quads: 'quads', hamstrings: 'hamstrings', glutes: 'glutes', calves: 'calves', abs: 'abs',
});
const list = (xs) => (xs.length <= 1 ? (xs[0] || '') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The muscle map in words, for a screen reader. */
export function archetypeEmphasisLabel(archetype) {
  const e = archetypeEmphasis(archetype);
  const priority = Object.keys(e).filter((k) => e[k] === 'priority').map((k) => WORDS[k] || k);
  const lighter = Object.keys(e).filter((k) => e[k] === 'maintenance').map((k) => WORDS[k] || k);
  if (!priority.length && !lighter.length) return 'Muscle map: every muscle trained evenly.';
  return [
    priority.length ? `Muscle map: more work for ${list(priority)}.` : 'Muscle map:',
    lighter.length ? `Lighter work for ${list(lighter)}.` : '',
  ].filter(Boolean).join(' ');
}
