#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/aliases.mjs — report 4 (aliases-needed.json).
 *
 * For every row, the common alternative names a real user would type that
 * do NOT resolve to it today (the corpus has no `aliases` field yet — EL-2
 * proposes it as new). Two sources, both conservative:
 *
 * (a) SYSTEMATIC: DB/BB/KB shorthand for any row whose canonical name
 *     contains "Dumbbell"/"Barbell"/"Kettlebell" as a whole word — the most
 *     common gym shorthand there is. High confidence, generated for every
 *     row it applies to (not hand-picked).
 * (b) CURATED: real, well-known alternative names for specific movements
 *     (RDL, OHP, hex bar deadlift, British "press-up", etc.), each keyed to
 *     an exact row name and checked to exist in the seed before being
 *     included, so a rename of the canonical corpus cannot silently orphan
 *     an entry here.
 *
 * Every candidate is checked against the full name set: if the alias text
 * already matches a DIFFERENT existing canonical row, it is dropped here
 * (that is a duplicate-name issue, reported in duplicates.json, not a
 * missing alias) and logged to `skippedCollisions`.
 */
import { loadSeedRows } from '../loadSeed.mjs';
import { writeJson } from './lib.mjs';

const rows = loadSeedRows();
const nameSet = new Set(rows.map((r) => r.name));
const nameSetLower = new Map(rows.map((r) => [r.name.toLowerCase(), r.name]));

const aliasesByName = new Map(rows.map((r) => [r.name, []]));
const skippedCollisions = [];

function addAlias(canonicalName, alias, confidence, reason) {
  if (!nameSet.has(canonicalName)) {
    throw new Error(`aliases.mjs: curated entry references unknown row "${canonicalName}"`);
  }
  const collision = nameSetLower.get(alias.toLowerCase());
  if (collision && collision !== canonicalName) {
    skippedCollisions.push({ canonicalName, alias, collidesWith: collision });
    return;
  }
  // No duplicate alias text under the same canonical row.
  if (aliasesByName.get(canonicalName).some((a) => a.alias.toLowerCase() === alias.toLowerCase())) return;
  aliasesByName.get(canonicalName).push({ alias, confidence, reason });
}

// ── (a) systematic DB/BB/KB shorthand ─────────────────────────────────────
const WHOLE_WORD = (word) => new RegExp(`\\b${word}\\b`, 'i');
const SYSTEMATIC = [
  { word: 'Dumbbell', short: 'DB' },
  { word: 'Barbell', short: 'BB' },
  { word: 'Kettlebell', short: 'KB' },
];
for (const r of rows) {
  for (const { word, short } of SYSTEMATIC) {
    if (WHOLE_WORD(word).test(r.name)) {
      const alias = r.name.replace(WHOLE_WORD(word), short);
      addAlias(r.name, alias, 'high', `Standard gym shorthand: "${short}" for "${word}" is near-universal in logging apps and coaching notation.`);
    }
  }
}

// ── (b) curated, real alternative names ───────────────────────────────────
// [canonicalName, alias, confidence, reason]
const CURATED = [
  ['Barbell Bench Press', 'Bench Press', 'high', 'Barbell is the default/implied implement when someone says just "bench press".'],
  ['Incline Barbell Bench Press', 'Incline Bench Press', 'high', 'Barbell is the implied default for an unqualified "incline bench press".'],
  ['Decline Barbell Bench Press', 'Decline Bench Press', 'high', 'Barbell is the implied default for an unqualified "decline bench press".'],
  ['Push-Up', 'Press-Up', 'high', 'British English term for the same movement (the corpus is British-English-first).'],
  ['Cable Crossover (High to Low)', 'Cable Crossover', 'high', 'Common shorthand omitting the pulley direction, which is usually implied by "crossover".'],
  ['Pec Deck (Machine Fly)', 'Pec Deck', 'high', 'The machine\'s common name, used far more often than the full label.'],
  ['Pec Deck (Machine Fly)', 'Butterfly Machine', 'medium', 'Common older/UK gym-floor name for the same station.'],
  ['Seated Cable Row', 'Cable Row', 'high', 'Seated is the default/implied form of a cable row.'],
  ['Trap Bar Deadlift', 'Hex Bar Deadlift', 'high', '"Hex bar" and "trap bar" name the same implement; both terms are in everyday gym use.'],
  ['Conventional Deadlift', 'Deadlift', 'high', 'Conventional stance is the default/implied form of an unqualified "deadlift".'],
  ['Romanian Deadlift', 'RDL', 'high', 'Near-universal lifting-community abbreviation.'],
  ['Stiff-Leg Deadlift', 'SLDL', 'medium', 'Common lifting-community abbreviation, less universal than RDL.'],
  ['Good Morning (Barbell)', 'Good Morning', 'high', 'Barbell is the default/implied implement.'],
  ['Barbell Overhead Press', 'OHP', 'high', 'Near-universal lifting-community abbreviation.'],
  ['Barbell Overhead Press', 'Military Press', 'high', 'Long-standing common name for the standing barbell overhead press.'],
  ['EZ Bar Curl', 'EZ Curl', 'high', 'Common shorthand dropping "Bar".'],
  ['EZ Bar Skull Crusher', 'Skull Crusher', 'high', 'The colloquial name for the lying triceps extension; EZ bar is the most common default implement for it.'],
  ['EZ Bar Skull Crusher', 'Lying Triceps Extension', 'medium', 'Formal/coaching name for the same movement family; kept medium since barbell and dumbbell versions are separate rows and could equally be meant.'],
  ['Close-Grip Bench Press', 'CGBP', 'medium', 'Lifting-forum shorthand, less universal than RDL/OHP.'],
  ['Barbell Back Squat', 'Back Squat', 'high', 'Barbell is the default/implied implement.'],
  ['Barbell Front Squat', 'Front Squat', 'high', 'Barbell is the default/implied implement.'],
  ['Hack Squat Machine', 'Hack Squat', 'high', 'Common shorthand dropping "Machine".'],
  ['Bulgarian Split Squat', 'BSS', 'medium', 'Lifting-community abbreviation, less universal than RDL/OHP.'],
  ['Glute Ham Raise', 'GHR', 'high', 'Near-universal strength-coaching abbreviation.'],
  ['Barbell Hip Thrust', 'Hip Thrust', 'high', 'Barbell is the default/implied loaded version.'],
  ['Turkish Get-Up', 'TGU', 'high', 'Near-universal kettlebell-community abbreviation.'],
  ['Toe-to-Bar', 'T2B', 'medium', 'Common CrossFit/gymnastics-conditioning shorthand.'],
  ["Farmer's Walk", 'Farmer Carry', 'high', 'Equally common phrasing for the same movement ("carry" vs "walk").'],
  ['Barbell Row (Bent Over)', 'Bent-Over Row', 'high', 'Barbell is the default/implied implement for an unqualified "bent-over row".'],
  ['Lat Pulldown (Wide Grip)', 'Lat Pulldown', 'medium', 'Wide grip is the most common default when a grip is not specified, but the corpus also seeds neutral/close-grip rows under the same base name, so this is not certain.'],
  ['Hammer Strength Chest Press', 'Plate-Loaded Chest Press', 'medium', 'Generic equivalent of the brand name (EL-2: brand names with identical mechanics become aliases) — note this exact string is ALSO a separate canonical row already (Plate-Loaded Chest Press), so this is a consolidation candidate, not a fresh alias; see duplicates.json.'],
];
for (const [canonicalName, alias, confidence, reason] of CURATED) {
  addAlias(canonicalName, alias, confidence, reason);
}

// ── assemble per-row output, every row present ────────────────────────────
const perRow = [];
let totalAliases = 0;
let highCount = 0;
let mediumCount = 0;
for (const r of rows) {
  const list = aliasesByName.get(r.name);
  if (list.length) {
    perRow.push({ name: r.name, aliases: list });
    totalAliases += list.length;
    for (const a of list) {
      if (a.confidence === 'high') highCount++;
      else if (a.confidence === 'medium') mediumCount++;
    }
  }
}
// Rows with zero suggested aliases, listed for completeness ("for every row").
const rowsWithNoAliasSuggested = rows
  .map((r) => r.name)
  .filter((n) => aliasesByName.get(n).length === 0);

const out = {
  totalRows: rows.length,
  rowsWithAtLeastOneAliasCount: perRow.length,
  rowsWithNoAliasSuggestedCount: rowsWithNoAliasSuggested.length,
  totalAliasCount: totalAliases,
  highConfidenceCount: highCount,
  mediumConfidenceCount: mediumCount,
  skippedCollisionsCount: skippedCollisions.length,
  skippedCollisions,
  perRow,
  rowsWithNoAliasSuggested,
};

const path = writeJson('aliases-needed.json', out);
console.log(`aliases-needed.json written: ${path}`);
console.log(`Rows with >=1 alias: ${perRow.length}/${rows.length}; total aliases: ${totalAliases} (high ${highCount}, medium ${mediumCount})`);
console.log(`Skipped collisions (alias already a distinct row name — see duplicates.json): ${skippedCollisions.length}`);
