#!/usr/bin/env node
/**
 * gap-analysis.mjs
 *
 * Deterministic, rerunnable second-lens gap analysis for the exercise
 * library expansion campaign (docs/exercise-library-expansion-2026-09-05).
 *
 * Compares every name in the open, legally-usable exercise datasets
 * (free-exercise-db, exercises-dataset, wger) against the current 552-row
 * corpus (data/seed-export.json) plus every family agent's proposed
 * candidate rows and aliases (data/inventory-*.json), and classifies every
 * dataset name that is not an exact match.
 *
 * Usage: node scripts/exercise-library/gap-analysis.mjs
 * Reads only from docs/exercise-library-expansion-2026-09-05/data/**.
 * Writes docs/exercise-library-expansion-2026-09-05/data/audit/open-dataset-gaps.json.
 *
 * No network access. No randomness. Same inputs -> same output byte-for-byte
 * (object key order and array order are stable).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CAMPAIGN_DIR = path.resolve(__dirname, '../../docs/exercise-library-expansion-2026-09-05');
const DATA_DIR = path.join(CAMPAIGN_DIR, 'data');
const OPEN_DIR = path.join(DATA_DIR, 'open-datasets');
const AUDIT_DIR = path.join(DATA_DIR, 'audit');

// ---------------------------------------------------------------------------
// 1. NORMALISATION
// ---------------------------------------------------------------------------

// Token-level abbreviation expansions (applied to whole tokens only, never
// as a substring inside a longer word).
const TOKEN_EXPANSIONS = {
  db: 'dumbbell',
  bb: 'barbell',
  kb: 'kettlebell',
  ez: 'ez bar',
  ghr: 'glute ham raise',
};

// Phrase-level expansions, applied after tokenisation on the joined,
// punctuation-stripped string (order matters: longer/more specific first).
const PHRASE_EXPANSIONS = [
  [/\bohp\b/g, 'overhead press'],
  [/\brdl\b/g, 'romanian deadlift'],
  [/\bsldl\b/g, 'romanian deadlift'],
  [/\bv\.?\s*\d+\b/g, ''], // dataset version tags e.g. "v. 2", "v2"
  [/\(male\)|\(female\)|\bmale\b|\bfemale\b/g, ''],
];

// Curated synonym table: real alternate names for movements that already
// exist in the corpus/candidates under a different label. Applied as a
// second normalisation pass; a hit here counts as classification
// `alias_of` (the dataset name is a literal synonym), not a fresh gap.
const SYNONYM_TABLE = [
  [/\blying tricep(s)? extension\b/g, 'skull crusher'],
  [/\btricep(s)? extension lying\b/g, 'skull crusher'],
  [/\bfrench press\b/g, 'skull crusher'],
  [/\bstiff leg(ged)? deadlift\b/g, 'romanian deadlift'],
  [/\bstraight leg deadlift\b/g, 'romanian deadlift'],
  [/\bmilitary press\b/g, 'overhead press'],
  [/\bstrict press\b/g, 'overhead press'],
  [/\bfarmers walk\b/g, 'farmer carry'],
  [/\bfarmer\s?'?s? walk\b/g, 'farmer carry'],
  [/\bwaiters walk\b/g, 'waiter carry'],
  [/\breverse hyperextension\b/g, 'reverse hyper'],
  [/\bhyperextension\b/g, 'back extension'],
  [/\btricep\b/g, 'triceps'],
  [/\bbicep\b/g, 'biceps'],
  [/\bbiceps curl\b/g, 'curl'],
  [/\btraps shrug\b/g, 'shrug'],
  [/\bglute ham raise\b/g, 'nordic curl'],
  [/\bpallof press\b/g, 'anti rotation press'],
  [/\bpec dec\b/g, 'pec deck'],
  [/\bpecs fly\b/g, 'chest fly'],
  [/\bchest press machine\b/g, 'machine chest press'],
];

// Filler words dropped before matching. Deliberately conservative: never
// includes a word the corpus itself uses to distinguish rows (bodyweight,
// weighted, assisted, unilateral/single-arm/single-leg, alternating).
const FILLER_WORDS = new Set([
  'exercise', 'exercises', 'a', 'an', 'the', 'with', 'using', 'of', 'for',
  'your', 'version', 'style', 'type', 'regular', 'classic', 'standard',
  'traditional', 'plain', 'basic', 'and',
]);

// Cosmetic modifier words: when a dataset name matches an existing row only
// after ONE of these is stripped, the row is a cosmetic variant under EL-2,
// not a fresh movement.
const COSMETIC_MODIFIERS = new Set([
  'standing', 'seated', 'against', 'wall', 'floor', 'ground',
]);

function stripPunctuation(s) {
  return s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[-_/,()."]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function applyPhraseTables(s, table) {
  let out = s;
  for (const [re, replacement] of table) {
    out = out.replace(re, replacement);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function tokenize(raw) {
  let s = stripPunctuation(raw);
  s = applyPhraseTables(s, PHRASE_EXPANSIONS);
  let tokens = s.split(' ').filter(Boolean);
  tokens = tokens.map((t) => TOKEN_EXPANSIONS[t] || t).flatMap((t) => t.split(' '));
  // light stemming: drop trailing plural 's' (len>3, not already ending 'ss')
  tokens = tokens.map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
  tokens = tokens.filter((t) => !FILLER_WORDS.has(t));
  return tokens;
}

function sortedKey(tokens) {
  return [...tokens].sort().join(' ');
}

function normalizeForMatch(raw) {
  const tokens = tokenize(raw);
  return { tokens, key: sortedKey(tokens) };
}

function normalizeWithSynonyms(raw) {
  let s = stripPunctuation(raw);
  s = applyPhraseTables(s, PHRASE_EXPANSIONS);
  s = applyPhraseTables(s, SYNONYM_TABLE);
  let tokens = s.split(' ').filter(Boolean);
  tokens = tokens.map((t) => TOKEN_EXPANSIONS[t] || t).flatMap((t) => t.split(' '));
  tokens = tokens.map((t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t));
  tokens = tokens.filter((t) => !FILLER_WORDS.has(t));
  return { tokens, key: sortedKey(tokens) };
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection += 1;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// 2. LOAD CORPUS + CANDIDATES + ALIASES
// ---------------------------------------------------------------------------

function loadJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const seed = loadJSON(path.join(DATA_DIR, 'seed-export.json'));

const inventoryFiles = fs
  .readdirSync(DATA_DIR)
  .filter((f) => /^inventory-.*\.json$/.test(f))
  .sort();

const knownIndex = []; // { name, origin, tokens, key }
const aliasIndex = []; // { alias, target, origin, tokens, key }

for (const row of seed) {
  const { tokens, key } = normalizeForMatch(row.name);
  knownIndex.push({ name: row.name, origin: 'corpus', tokens, key });
  if (Array.isArray(row.aliases)) {
    for (const a of row.aliases) {
      const n = normalizeForMatch(a);
      aliasIndex.push({ alias: a, target: row.name, origin: 'corpus', tokens: n.tokens, key: n.key });
    }
  }
}

for (const file of inventoryFiles) {
  const family = file.replace(/^inventory-/, '').replace(/\.json$/, '');
  const inv = loadJSON(path.join(DATA_DIR, file));
  for (const c of inv.candidates || []) {
    const { tokens, key } = normalizeForMatch(c.name);
    knownIndex.push({ name: c.name, origin: `candidate:${family}`, tokens, key });
    if (Array.isArray(c.aliases)) {
      for (const a of c.aliases) {
        const n = normalizeForMatch(a);
        aliasIndex.push({ alias: a, target: c.name, origin: `candidate:${family}`, tokens: n.tokens, key: n.key });
      }
    }
  }
  for (const ax of inv.aliasesForExisting || []) {
    for (const a of ax.aliases || []) {
      const n = normalizeForMatch(a);
      aliasIndex.push({ alias: a, target: ax.existing, origin: `candidate:${family}:aliasesForExisting`, tokens: n.tokens, key: n.key });
    }
  }
}

const knownByKey = new Map();
for (const entry of knownIndex) {
  if (!knownByKey.has(entry.key)) knownByKey.set(entry.key, []);
  knownByKey.get(entry.key).push(entry);
}
const aliasByKey = new Map();
for (const entry of aliasIndex) {
  if (!aliasByKey.has(entry.key)) aliasByKey.set(entry.key, []);
  aliasByKey.get(entry.key).push(entry);
}

const GENERIC_MOVEMENT_WORDS = new Set([
  'row', 'curl', 'press', 'squat', 'extension', 'raise', 'fly', 'pull',
  'push', 'crunch', 'plank', 'lunge', 'dip', 'thrust', 'swing', 'pulldown',
  'deadlift', 'bridge', 'carry', 'twist', 'chop', 'clean', 'snatch', 'jerk',
  'kickback', 'shrug', 'stretch',
]);

// ---------------------------------------------------------------------------
// 3. MATCHING PIPELINE
// ---------------------------------------------------------------------------

function findExact(key) {
  const hit = knownByKey.get(key);
  if (hit && hit.length) return hit[0];
  const aliasHit = aliasByKey.get(key);
  if (aliasHit && aliasHit.length) {
    const a = aliasHit[0];
    return { name: a.target, origin: a.origin, key: a.key, viaAlias: a.alias };
  }
  return null;
}

function findFuzzy(tokens) {
  let best = null;
  let bestScore = 0;
  for (const entry of knownIndex) {
    const score = jaccard(tokens, entry.tokens);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }
  for (const entry of aliasIndex) {
    const score = jaccard(tokens, entry.tokens);
    if (score > bestScore) {
      bestScore = score;
      best = { name: entry.target, origin: entry.origin, key: entry.key, viaAlias: entry.alias };
    }
  }
  if (best && bestScore >= 0.75) return { match: best, score: bestScore };
  return null;
}

function findCosmeticVariant(tokens) {
  const stripped = tokens.filter((t) => !COSMETIC_MODIFIERS.has(t));
  if (stripped.length === tokens.length) return null; // nothing was stripped
  const key = sortedKey(stripped);
  const hit = findExact(key);
  if (hit) {
    const removed = tokens.filter((t) => COSMETIC_MODIFIERS.has(t));
    return { match: hit, removed };
  }
  return null;
}

/**
 * @returns {{stage:string, target:string, origin:string, score?:number, removed?:string[], viaAlias?:string}|null}
 */
function matchName(rawName) {
  const { tokens, key } = normalizeForMatch(rawName);

  const exact = findExact(key);
  if (exact) return { stage: 'exact', target: exact.name, origin: exact.origin, viaAlias: exact.viaAlias };

  const { tokens: synTokens, key: synKey } = normalizeWithSynonyms(rawName);
  if (synKey !== key) {
    const synExact = findExact(synKey);
    if (synExact) return { stage: 'synonym', target: synExact.name, origin: synExact.origin, viaAlias: synExact.viaAlias };
  }

  const fuzzy = findFuzzy(tokens);
  if (fuzzy) return { stage: 'fuzzy', target: fuzzy.match.name, origin: fuzzy.match.origin, score: fuzzy.score, viaAlias: fuzzy.match.viaAlias };

  const synFuzzy = synKey !== key ? findFuzzy(synTokens) : null;
  if (synFuzzy) return { stage: 'synonym-fuzzy', target: synFuzzy.match.name, origin: synFuzzy.match.origin, score: synFuzzy.score, viaAlias: synFuzzy.match.viaAlias };

  const cosmetic = findCosmeticVariant(tokens);
  if (cosmetic) return { stage: 'cosmetic-variant', target: cosmetic.match.name, origin: cosmetic.match.origin, removed: cosmetic.removed };

  return null;
}

// ---------------------------------------------------------------------------
// 4. OUT-OF-SCOPE / JUNK CLASSIFICATION
// ---------------------------------------------------------------------------

const OUT_OF_SCOPE_CATEGORY_VALUES = new Set(['cardio', 'stretching']);

const OUT_OF_SCOPE_EQUIPMENT_VALUES = new Set([
  'stationary bike', 'exercise bike', 'elliptical machine',
  'upper body ergometer', 'skierg machine', 'stepmill machine',
  'treadmill', 'rowing machine', 'spin bike', 'cardio machine',
]);

const OUT_OF_SCOPE_KEYWORDS = [
  'stretch', 'mobility', 'yoga', 'foam roll', 'myofascial', 'warm up',
  'warmup', 'cool down', 'cooldown', 'treadmill', 'jog', 'sprint',
  'elliptical', 'jump rope', 'jumping jack', 'burpee', 'mountain climber',
  'shuttle run', 'agility ladder', 'cone drill', 'suicide run', 'high knee',
  'butt kick', 'box drill', 'hula hoop', 'zumba', 'aerobic', 'spin class',
  'stairmaster', 'stepmill', 'pilates',
];

const RESISTANCE_OVERRIDE_WORDS = [
  'sled', 'farmer', 'suitcase', 'waiter', 'yoke', 'trap bar', 'weighted',
  'loaded', 'barbell', 'dumbbell', 'kettlebell', 'band', 'cable', 'plate',
  'medicine ball', 'landmine',
];

function isOutOfScope({ name, category, bodyPart, equipment }) {
  const lowerCat = (category || '').toLowerCase();
  const lowerBody = (bodyPart || '').toLowerCase();
  if (OUT_OF_SCOPE_CATEGORY_VALUES.has(lowerCat) || OUT_OF_SCOPE_CATEGORY_VALUES.has(lowerBody)) return true;

  const equipList = Array.isArray(equipment) ? equipment : [equipment].filter(Boolean);
  for (const e of equipList) {
    if (e && OUT_OF_SCOPE_EQUIPMENT_VALUES.has(String(e).toLowerCase())) return true;
  }

  const lowerName = name.toLowerCase();
  const hasOverride = RESISTANCE_OVERRIDE_WORDS.some((w) => lowerName.includes(w));
  if (hasOverride) return false;
  return OUT_OF_SCOPE_KEYWORDS.some((kw) => lowerName.includes(kw));
}

function isJunk(tokens) {
  if (tokens.length === 0) return true;
  if (tokens.length === 1 && GENERIC_MOVEMENT_WORDS.has(tokens[0])) return true;
  return false;
}

// ---------------------------------------------------------------------------
// 5. RESISTANCE-MISSING FIELD DERIVATION
// ---------------------------------------------------------------------------

const EQUIPMENT_MAP = [
  [/kettlebell/i, 'kettlebell'],
  [/dumbbell/i, 'dumbbell'],
  [/(^|\s)ez\b|e-z curl bar|ez barbell/i, 'ez_bar'],
  [/trap bar|olympic barbell|barbell/i, 'barbell'],
  [/smith/i, 'smith_machine'],
  [/cable/i, 'cable'],
  [/leverage machine|machine|sled machine|hammer/i, 'machine'],
  [/resistance band|^band$|bands/i, 'band'],
  [/suspension|trx/i, 'suspension'],
  [/landmine/i, 'landmine'],
  [/medicine ball/i, 'medicine_ball'],
  [/sled|tire|prowler/i, 'sled'],
  [/body ?weight|body only|none \(bodyweight/i, 'bodyweight'],
];

function mapEquipment(rawEquipmentValues, name) {
  const candidates = [name, ...rawEquipmentValues.filter(Boolean)].join(' ');
  for (const [re, val] of EQUIPMENT_MAP) {
    if (re.test(candidates)) return val;
  }
  return 'bodyweight';
}

const MUSCLE_MAP = [
  [/chest|pector/i, 'chest'],
  [/lat(s|issimus)?\b|upper back|mid back|^back$/i, 'back'],
  [/hamstring/i, 'hamstrings'],
  [/front delt|anterior delt/i, 'front_delts'],
  [/side delt|lateral delt/i, 'side_delts'],
  [/rear delt|posterior delt|deltoid|shoulder/i, 'rear_delts'],
  [/bicep/i, 'biceps'],
  [/tricep/i, 'triceps'],
  [/quad/i, 'quads'],
  [/glute/i, 'glutes'],
  [/calv|calf|soleus|gastrocnemius/i, 'calves'],
  [/tibialis|shin/i, 'tibialis'],
  [/abdomin|^abs$|waist|oblique|rectus abdominis/i, 'abs'],
  [/trapezius|traps/i, 'traps'],
  [/forearm/i, 'forearms'],
  [/neck|levator scapulae/i, 'neck'],
  [/adductor|groin/i, 'adductors'],
];

function mapMuscle(rawMuscleValues) {
  const joined = rawMuscleValues.filter(Boolean).join(' ');
  for (const [re, val] of MUSCLE_MAP) {
    if (re.test(joined)) return val;
  }
  return null;
}

const PATTERN_MAP = [
  [/clean|snatch|jerk/i, 'power'],
  [/jump|bound|hop|throw|slam/i, 'plyometric'],
  [/carry|walk/i, 'carry'],
  [/crunch|sit.?up|plank|leg raise|hollow|dead bug|anti.?rotation|twist|chop|rotation/i, 'core'],
  [/squat/i, 'squat'],
  [/lunge|split squat|step.?up/i, 'lunge'],
  [/deadlift|hinge|swing|good morning|hip thrust|bridge/i, 'hinge'],
  [/press|push.?up|dip|push down|bench/i, 'push'],
  [/row|pull.?up|chin.?up|pulldown|pull.?over/i, 'pull'],
  [/curl|extension|raise|fly|lateral raise|shrug|kickback|calf raise/i, 'isolation'],
];

function mapMovementPattern(name) {
  for (const [re, val] of PATTERN_MAP) {
    if (re.test(name)) return val;
  }
  return 'isolation';
}

function titleCase(s) {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length <= 2 && w === w.toUpperCase() ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

function proposeCanonicalName(rawName, equipment) {
  const cleaned = stripPunctuation(rawName)
    .split(' ')
    .filter((w) => !['v', 'version'].includes(w))
    .join(' ');
  const implementWord = {
    barbell: 'Barbell', dumbbell: 'Dumbbell', cable: 'Cable', machine: 'Machine',
    bodyweight: 'Bodyweight', smith_machine: 'Smith Machine', ez_bar: 'EZ Bar',
    kettlebell: 'Kettlebell', band: 'Band', suspension: 'Suspension',
    landmine: 'Landmine', medicine_ball: 'Medicine Ball', sled: 'Sled',
  }[equipment];
  const title = titleCase(cleaned);
  if (implementWord && !title.toLowerCase().includes(implementWord.toLowerCase())) {
    return `${implementWord} ${title}`;
  }
  return title;
}

// ---------------------------------------------------------------------------
// 6. RUN OVER EACH DATASET
// ---------------------------------------------------------------------------

function loadDataset(file) {
  return loadJSON(path.join(OPEN_DIR, file));
}

const datasets = [
  {
    key: 'free-exercise-db',
    file: 'free-exercise-db.json',
    getName: (r) => r.name,
    getCategory: (r) => r.category,
    getBodyPart: () => null,
    getEquipment: (r) => [r.equipment],
    getMuscles: (r) => [...(r.primaryMuscles || []), ...(r.secondaryMuscles || [])],
  },
  {
    key: 'exercises-dataset',
    file: 'exercises-dataset.json',
    getName: (r) => r.name,
    getCategory: (r) => r.category,
    getBodyPart: (r) => r.body_part,
    getEquipment: (r) => [r.equipment],
    getMuscles: (r) => [r.muscle_group, r.target, ...(r.secondary_muscles || [])],
  },
  {
    key: 'wger',
    file: 'wger.json',
    getName: (r) => r.name,
    getCategory: (r) => r.category,
    getBodyPart: () => null,
    getEquipment: (r) => r.equipment || [],
    getMuscles: (r) => [...(r.primaryMuscles || []), ...(r.secondaryMuscles || [])],
  },
];

const gaps = [];
const summary = {};

for (const ds of datasets) {
  const raw = loadDataset(ds.file);
  const rows = raw.names;
  const counts = { total: rows.length, matched: 0, alias_of: 0, out_of_scope: 0, variant_not_distinct: 0, resistance_missing: 0, junk: 0 };

  for (const row of rows) {
    const name = ds.getName(row);
    if (!name || !name.trim()) continue;
    const category = ds.getCategory(row);
    const bodyPart = ds.getBodyPart(row);
    const equipment = ds.getEquipment(row);
    const muscles = ds.getMuscles(row);

    const match = matchName(name);
    if (match && (match.stage === 'exact' || match.stage === 'synonym')) {
      if (match.stage === 'synonym') {
        counts.alias_of += 1;
        gaps.push({
          name,
          dataset: ds.key,
          datasetCategory: category || null,
          datasetEquipment: equipment.filter(Boolean),
          datasetMuscle: muscles.filter(Boolean),
          classification: 'alias_of',
          alias_of: [match.target],
          matchStage: match.stage,
          matchOrigin: match.origin,
        });
      } else {
        counts.matched += 1;
      }
      continue;
    }

    if (match && (match.stage === 'fuzzy' || match.stage === 'synonym-fuzzy')) {
      counts.alias_of += 1;
      gaps.push({
        name,
        dataset: ds.key,
        datasetCategory: category || null,
        datasetEquipment: equipment.filter(Boolean),
        datasetMuscle: muscles.filter(Boolean),
        classification: 'alias_of',
        alias_of: [match.target],
        matchStage: match.stage,
        matchOrigin: match.origin,
        jaccardScore: match.score,
      });
      continue;
    }

    if (match && match.stage === 'cosmetic-variant') {
      counts.variant_not_distinct += 1;
      gaps.push({
        name,
        dataset: ds.key,
        datasetCategory: category || null,
        datasetEquipment: equipment.filter(Boolean),
        datasetMuscle: muscles.filter(Boolean),
        classification: 'variant_not_distinct',
        alias_of: [match.target],
        cosmeticModifiersRemoved: match.removed,
      });
      continue;
    }

    // No match at all.
    if (isOutOfScope({ name, category, bodyPart, equipment })) {
      counts.out_of_scope += 1;
      gaps.push({
        name,
        dataset: ds.key,
        datasetCategory: category || null,
        datasetEquipment: equipment.filter(Boolean),
        datasetMuscle: muscles.filter(Boolean),
        classification: 'out_of_scope',
      });
      continue;
    }

    const { tokens } = normalizeForMatch(name);
    if (isJunk(tokens)) {
      counts.junk += 1;
      gaps.push({
        name,
        dataset: ds.key,
        datasetCategory: category || null,
        datasetEquipment: equipment.filter(Boolean),
        datasetMuscle: muscles.filter(Boolean),
        classification: 'junk',
        reason: 'single generic movement word with no implement/qualifier; not a distinct row',
      });
      continue;
    }

    // resistance_missing
    counts.resistance_missing += 1;
    const eq = mapEquipment(equipment.filter(Boolean), name);
    const primaryMuscle = mapMuscle(muscles.filter(Boolean).concat(category ? [category] : []));
    const movementPattern = mapMovementPattern(name);
    const proposedCanonicalName = proposeCanonicalName(name, eq);
    gaps.push({
      name,
      dataset: ds.key,
      datasetCategory: category || null,
      datasetEquipment: equipment.filter(Boolean),
      datasetMuscle: muscles.filter(Boolean),
      classification: 'resistance_missing',
      proposedCanonicalName,
      primaryMuscle,
      equipment: eq,
      movementPattern,
      why_distinct: `Not found in corpus or candidates by exact, fuzzy (Jaccard>=0.75) or curated-synonym match against ${knownIndex.length} known names and ${aliasIndex.length} known aliases; appears in ${ds.key} as a real, named ${eq.replace('_', ' ')} resistance movement.`,
    });
  }

  summary[ds.key] = {
    total: counts.total,
    matched: counts.matched,
    matchedPct: pct(counts.matched, counts.total),
    alias_of: counts.alias_of,
    alias_ofPct: pct(counts.alias_of, counts.total),
    out_of_scope: counts.out_of_scope,
    out_of_scopePct: pct(counts.out_of_scope, counts.total),
    variant_not_distinct: counts.variant_not_distinct,
    variant_not_distinctPct: pct(counts.variant_not_distinct, counts.total),
    resistance_missing: counts.resistance_missing,
    resistance_missingPct: pct(counts.resistance_missing, counts.total),
    junk: counts.junk,
    junkPct: pct(counts.junk, counts.total),
  };
}

function pct(n, total) {
  return total === 0 ? 0 : Math.round((n / total) * 1000) / 10;
}

// Sort gaps deterministically: dataset, then classification, then name.
gaps.sort((a, b) => {
  if (a.dataset !== b.dataset) return a.dataset < b.dataset ? -1 : 1;
  if (a.classification !== b.classification) return a.classification < b.classification ? -1 : 1;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
});

// De-duplicate resistance_missing candidates that are the same movement
// reported by more than one dataset under (near-)identical names, keeping
// each occurrence in the output (per-dataset provenance matters) but adding
// a crossDatasetKey so the markdown report can count distinct movements.
const seenResistanceKeys = new Map();
for (const g of gaps) {
  if (g.classification !== 'resistance_missing') continue;
  const key = sortedKey(normalizeForMatch(g.name).tokens);
  if (!seenResistanceKeys.has(key)) seenResistanceKeys.set(key, []);
  seenResistanceKeys.get(key).push(g);
}
for (const [key, group] of seenResistanceKeys) {
  if (group.length > 1) {
    for (const g of group) g.crossDatasetDuplicateOf = key;
  }
}

const distinctResistanceMissing = seenResistanceKeys.size;

const output = {
  generatedAt: '2026-09-05',
  generatedBy: 'scripts/exercise-library/gap-analysis.mjs',
  corpusRowCount: seed.length,
  candidateRowCount: knownIndex.length - seed.length,
  aliasCount: aliasIndex.length,
  summary,
  distinctResistanceMissingMovements: distinctResistanceMissing,
  gaps,
};

fs.mkdirSync(AUDIT_DIR, { recursive: true });
fs.writeFileSync(path.join(AUDIT_DIR, 'open-dataset-gaps.json'), JSON.stringify(output, null, 2) + '\n');

console.log('Gap analysis complete.');
console.log(JSON.stringify(summary, null, 2));
console.log('Distinct resistance_missing movements (deduped across datasets):', distinctResistanceMissing);
console.log('Total gap rows written:', gaps.length);
