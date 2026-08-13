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

const fs = require('fs');
const path = require('path');
const { deriveExerciseMetadata } = require('../exerciseMetadata');

/**
 * The real seeded library, parsed from seedExercises.js exactly as the
 * existing planEngineLibraryPool suite does, so the two agree on what
 * "the library" means.
 */
function buildRealLibrary() {
  const seedSrc = fs.readFileSync(path.join(__dirname, '../seedExercises.js'), 'utf8');
  const start = seedSrc.indexOf('const RAW = [');
  const end = seedSrc.indexOf('\n];', start);
  const body = seedSrc.slice(start, end);

  const smStart = seedSrc.indexOf('const SUBREGION_MAP = {');
  const smEnd = seedSrc.indexOf('\n};', smStart);
  const smBody = seedSrc.slice(smStart, smEnd);
  const subMap = {};
  for (const m of smBody.matchAll(/'([^']+)':\s*'(\w+)'/g)) subMap[m[1]] = m[2];

  const rows = [];
  const re = /\[\s*'([^']+)',\s*'([a-z_]+)',\s*\[([^\]]*)\],\s*'([a-z_]+)',\s*'([a-z_]+)',\s*(true|false),\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\s*\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    const base = {
      name: m[1],
      primaryMuscle: m[2],
      secondaryMuscles: m[3]
        .split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean),
      equipment: m[4],
      movementPattern: m[5],
      compoundIsolation: m[6] === 'true' ? 'compound' : 'isolation',
      minReps: parseInt(m[7], 10),
      maxReps: parseInt(m[8], 10),
      fatigueCost: parseInt(m[9], 10),
      stimulusToFatigueRatio: parseInt(m[10], 10),
      subregion: subMap[m[1]] ?? null,
    };
    rows.push({ id: m[1], ...base, ...deriveExerciseMetadata(base) });
  }
  return rows;
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
