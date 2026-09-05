/**
 * campaign16.helpers.js — the shared rig for every Campaign 16 suite.
 *
 * Not a test file. It exists so that every plan-quality suite in this
 * campaign judges the SAME thing the user gets: the real seeded exercise
 * library, built the way the seed builds it, fed to the real engine.
 *
 * The alternative - each suite hand-rolling a small fake library - is how
 * a generator ends up passing its tests while shipping plans nobody would
 * recognise, because the fake library never contains the obscure exercise
 * that actually reaches real users.
 */

const { deriveExerciseMetadata } = require('../exerciseMetadata');
const { CORPUS } = require('../exerciseCorpus');

/**
 * The real seeded library, built from the structured corpus
 * (src/lib/exerciseCorpus/) exactly the way corpusEntryToSeedRow's base
 * fields are derived, so every plan-quality suite in this campaign judges
 * the SAME thing the seed actually inserts.
 *
 * Re-anchored EL-14/EL-21 (exercise-library-expansion-2026-09-05): this
 * used to regex-parse seedExercises.js's RAW tuple text directly (the same
 * approach the pre-campaign coverage scripts used, including their
 * Farmer's Walk quote-blind-spot). RAW no longer exists — the corpus is
 * the source of truth and retired stub entries ({ name, retiredInto }) are
 * excluded from CORPUS already, so this shape is unaffected by them.
 * `id` stays the exercise NAME (not a canonical hash) to match this rig's
 * pre-existing convention — callers key off it as a map key, not a real DB
 * id (see BY_NAME below).
 */
function buildRealLibrary() {
  return CORPUS.map((entry) => {
    const base = {
      name: entry.name,
      primaryMuscle: entry.primaryMuscle,
      secondaryMuscles: entry.secondaryMuscles ?? [],
      equipment: entry.equipment,
      movementPattern: entry.movementPattern,
      compoundIsolation: entry.compound ? 'compound' : 'isolation',
      minReps: entry.repMin,
      maxReps: entry.repMax,
      fatigueCost: entry.fatigueCost,
      stimulusToFatigueRatio: entry.sfr,
      subregion: entry.subregion ?? null,
    };
    return { id: entry.name, ...base, ...deriveExerciseMetadata(base) };
  });
}

const LIBRARY = buildRealLibrary();
const LIBRARY_NAMES = new Set(LIBRARY.map(e => e.name));
const BY_NAME = new Map(LIBRARY.map(e => [e.name, e]));

/** The inputs shape buildPlanInputs produces, with sane defaults. */
const BASE_INPUTS = {
  experience: 'intermediate',
  daysPerWeek: 4,
  sessionLengthMinutes: 60,
  equipment: 'full_gym',
  goal: 'general',
  phase: 'lean_gain',
  weakPoints: [],
  recoveryRating: 'average',
  nutritionPhase: 'maintain',
};

const inputs = (over = {}) => ({ ...BASE_INPUTS, ...over });

/** Every exercise name in a plan, in session order. */
function planExerciseNames(plan) {
  return (plan?.workouts ?? []).flatMap(w => w.exercises.map(e => e.exerciseName));
}

/** Flat list of { workout, index, ...exercise } for assertions. */
function planExercises(plan) {
  const out = [];
  for (const w of plan?.workouts ?? []) {
    w.exercises.forEach((e, i) => out.push({ workout: w.name, index: i, ...e }));
  }
  return out;
}

/** The library row behind a generated exercise, or null if it did not resolve. */
const libraryEntry = name => BY_NAME.get(name) ?? null;

module.exports = {
  LIBRARY, LIBRARY_NAMES, BY_NAME,
  BASE_INPUTS, inputs,
  planExerciseNames, planExercises, libraryEntry,
  buildRealLibrary,
};
