#!/usr/bin/env node
/**
 * scripts/exercise-library/audit/duplicates.mjs — report 2 (duplicates.json).
 *
 * (1) EXACT duplicate names: the RAW parser (loadSeed.mjs) already throws on
 *     an exact-string duplicate name, so this checks for the only exact
 *     duplicates that could still exist — same name differing only by case
 *     or whitespace, which the parser would NOT catch (it keys on ===).
 * (2) NEAR duplicates by (a) normalised name (case, punctuation, DB/BB/KB
 *     expansion, word order removed).
 * (3) NEAR duplicates by (b) identical (primaryMuscle, equipmentCategory,
 *     movementPattern, subregion, laterality) tuple whose names differ by a
 *     small, plausibly-cosmetic token set (Jaccard >= 0.55 on tokens, or a
 *     symmetric token difference of <= 2 total tokens).
 *
 * Every (a)/(b) pair is classified `likely_same_stimulus` or
 * `legitimately_distinct` under EL-2 (05-DECISIONS.md): implement family,
 * loading vector/pulley height, laterality, support, grip, range/depth
 * class, ballistic-vs-grind differing => distinct; spelling, abbreviation,
 * word order, brand name, cosmetic descriptor, "with straps/belt" => same
 * stimulus (alias candidate, never a rename).
 */
import { loadSeedRows } from '../loadSeed.mjs';
import {
  writeJson, normalizeNameForDupeCheck, normalizeNameCaseOnly, tokenize, jaccard, symmetricDiff,
} from './lib.mjs';

const rows = loadSeedRows();
const byName = new Map(rows.map((r) => [r.name, r]));

// ── (1) exact duplicates (case/whitespace only) ───────────────────────────
const exactGroups = new Map();
for (const r of rows) {
  const k = normalizeNameCaseOnly(r.name);
  if (!exactGroups.has(k)) exactGroups.set(k, []);
  exactGroups.get(k).push(r.name);
}
const exactDuplicates = [...exactGroups.entries()]
  .filter(([, names]) => names.length > 1)
  .map(([norm, names]) => ({ normalized: norm, names }));

// ── (2) near-duplicates by normalised name ────────────────────────────────
// CAUTION (found while building this script): naive word-order-independent
// folding wrongly merges pulley-DIRECTION pairs — "Cable Fly (Low to High)"
// vs "Cable Fly (High to Low)" sort to the same bag of words, but EL-2 names
// "loading vector or pulley height (high/mid/low...)" as an explicit
// DISTINGUISHING dimension, and the app itself carries both as separate
// STAPLE/COMMON entries (canonicality.js). So: when a candidate pair's token
// set contains a direction word pair (high/low, up/down), word order is
// treated as MEANINGFUL and the pair is routed to `legitimately_distinct`
// instead of merged.
const DIRECTION_WORDS = new Set(['high', 'low', 'up', 'down']);
function rawOrderedTokens(name) {
  return tokenize(name).filter((t) => t !== 'to');
}
const normGroups = new Map();
for (const r of rows) {
  const k = normalizeNameForDupeCheck(r.name);
  if (!normGroups.has(k)) normGroups.set(k, []);
  normGroups.get(k).push(r.name);
}
const nearByNormalizedName = [];
for (const [norm, names] of normGroups.entries()) {
  if (names.length < 2) continue;
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]; const b = names[j];
      const ta = rawOrderedTokens(a);
      const tb = rawOrderedTokens(b);
      const hasDirectionPair = ta.some((t) => DIRECTION_WORDS.has(t)) && tb.some((t) => DIRECTION_WORDS.has(t));
      const orderMatches = ta.join(' ') === tb.join(' ');
      if (hasDirectionPair && !orderMatches) {
        nearByNormalizedName.push({
          normalized: norm,
          pair: [a, b],
          classification: 'legitimately_distinct',
          reason: 'Bag-of-words identical but the pulley direction (high-to-low vs low-to-high) reverses — EL-2 names loading vector/pulley height as a distinguishing dimension, and both forms are already separate registry entries in canonicality.js.',
        });
      } else {
        nearByNormalizedName.push({
          normalized: norm,
          pair: [a, b],
          classification: 'likely_same_stimulus',
          reason: 'Identical after case/punctuation folding, DB->dumbbell/BB->barbell/KB->kettlebell expansion and word-order removal, with no direction-word reversal — spelling/abbreviation/word-order, EL-2\'s explicit non-distinguishing list.',
        });
      }
    }
  }
}

// ── (3) near-duplicates by identical mechanical tuple + close names ──────
// Cosmetic tokens that, alone, never establish a distinct training stimulus
// under EL-2 (word-order noise, generic descriptors, brand words already
// covered by (2) or genuinely interchangeable in this corpus's own naming).
// Deliberately narrow: filler/stopwords only. Anything with real semantic
// content defaults to "distinguishing" below (the safer default — see
// UNRESOLVED handling), never assumed cosmetic without a reason on record.
const COSMETIC_TOKENS = new Set([
  'the', 'a', 'an', 'of', 'for', 'with', 'style', 'variation', 'version',
  'standard', 'classic', 'traditional', 'basic', 'regular',
]);
// Tokens that DO establish a distinct stimulus under EL-2 even in a
// close-name pair: implement, loading vector/pulley height, laterality,
// support, grip/attachment, range/depth class, ballistic-vs-grind, OR a
// named-variant word that (verified against canonicality.js) the app
// already carries as its OWN separate registry entry alongside its
// close-named sibling — evidence that the product itself treats the
// distinction as real, not cosmetic.
const DISTINGUISHING_TOKENS = new Set([
  // Implement family
  'barbell', 'dumbbell', 'kettlebell', 'cable', 'band', 'machine', 'smith',
  'landmine', 'suspension', 'trx', 'bodyweight', 'ez', 'plate', 'plateloaded',
  'selectorised', 'hammer', 'trap', 'hex', 'safety', 'cambered', 'medicine',
  'ball', 'sled', 'prowler', 'tyre',
  // Loading vector / pulley height / plane
  'high', 'low', 'mid', 'incline', 'flat', 'decline', 'overhead', 'behind',
  'over', 'bent', 'front', 'back', 'reverse',
  // Laterality
  'single', 'double', 'unilateral', 'bilateral', 'alternating', 'onearm',
  'oneleg', 'singleleg', 'singlearm',
  // Support / posture
  'seated', 'standing', 'lying', 'kneeling', 'chestsupported', 'supported',
  'unsupported', 'prone', 'leaning',
  // Grip / attachment (verified: STAPLE lists 'Tricep Pushdown (Rope)' AND
  // 'Tricep Pushdown (Bar)' as separate entries — canonicality.js:122-123)
  'wide', 'close', 'neutral', 'pronated', 'supinated', 'underhand',
  'overhand', 'rope', 'bar',
  // Range / depth / tempo class
  'deficit', 'paused', 'pause', 'pin', 'partial', 'full', 'weighted',
  // Character
  'ballistic', 'swing', 'grind', 'jump', 'bicycle', 'preacher', 'donkey',
  'zercher', 'anderson', 'hatfield', 'jefferson', 'ssb', 'cyclist', 'spanish',
  'sumo', 'conventional', 'box', 'goblet', 'hack', 'belt', 'pendulum',
  'bulgarian', 'cossack', 'curtsy', 'skater', 'shrimp', 'split', 'meadows',
  'kroc', 'helms', 'batwing', 'renegade', 'pendlay', 'snatch', 'clean',
  'guillotine', 'spider', 'zottman', 'waiter', 'drag', 'jm', 'tate', 'svend',
  'bradford', 'cuban', 'arnold', 'bayesian',
  // Movement identity (a differing verb is a different exercise, not a
  // cosmetic label)
  'curl', 'extension', 'press', 'row', 'raise', 'fly', 'crunch', 'thrust',
  'pull', 'push', 'shrug', 'kickback', 'squat', 'deadlift', 'lunge',
  'bridge', 'dip', 'chop', 'twist', 'rotation', 'pulldown', 'pullover',
  'walk', 'carry', 'hold', 'wheel', 'rollout', 'stance', 'narrow',
  'hanging', 'ring', 'wall', 'slant', 'heel', 'toe', 'sit',
  // Single-letter movement-shape identifiers: Y/T/W/V/L-raise-or-sit are
  // each a different arm angle or shape, never interchangeable (verified:
  // Prone Incline Y-Raise, Prone Incline T-Raise and W-Raise/YTW all appear
  // as distinct NICHE entries, canonicality.js NICHE list).
  'y', 'w', 'v', 'l',
]);

function tupleKey(r) {
  return [r.primaryMuscle, r.equipmentCategory, r.movementPattern, r.subregion, r.laterality].join('|');
}

const tupleGroups = new Map();
for (const r of rows) {
  const k = tupleKey(r);
  if (!tupleGroups.has(k)) tupleGroups.set(k, []);
  tupleGroups.get(k).push(r);
}

const nearByTuple = [];
for (const [tuple, group] of tupleGroups.entries()) {
  if (group.length < 2) continue;
  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const a = group[i]; const b = group[j];
      const ta = tokenize(a.name);
      const tb = tokenize(b.name);
      const sim = jaccard(ta, tb);
      const { onlyA, onlyB } = symmetricDiff(ta, tb);
      const totalDiff = onlyA.length + onlyB.length;
      if (sim < 0.4 && totalDiff > 2) continue; // too different to be a naming near-miss
      if (totalDiff === 0) continue; // identical tokens, different order -> already caught in (2)
      const diffTokens = [...onlyA, ...onlyB].map((t) => t.replace(/[^a-z0-9]/g, ''));
      const hasDistinguishing = diffTokens.some((t) => DISTINGUISHING_TOKENS.has(t));
      const allCosmetic = diffTokens.every((t) => COSMETIC_TOKENS.has(t));
      const unresolved = diffTokens.filter((t) => !DISTINGUISHING_TOKENS.has(t) && !COSMETIC_TOKENS.has(t));
      let classification;
      let confidence;
      let reason;
      if (hasDistinguishing) {
        classification = 'legitimately_distinct';
        confidence = 'high';
        reason = `Same primary muscle/equipment-category/pattern/subregion/laterality, but the differing token(s) (${[...new Set(diffTokens.filter((t) => DISTINGUISHING_TOKENS.has(t)))].join(', ')}) fall in an EL-2 distinguishing dimension (implement/loading vector/support/grip/range/ballistic character/movement identity), so they are not interchangeable even though the 5-tuple matches.`;
      } else if (allCosmetic) {
        classification = 'likely_same_stimulus';
        confidence = 'high';
        reason = `Same 5-tuple; differing token(s) (${diffTokens.join(', ') || '(word order)'}) are cosmetic descriptors under EL-2 with no mechanical distinction.`;
      } else {
        // Safer default (mirrors the tier registry's "unlisted defaults to
        // the safer/more conservative class" philosophy, canonicality.js:42-46):
        // an unrecognised token is treated as a real distinction rather than
        // silently merged, but flagged medium-confidence for lead review.
        classification = 'legitimately_distinct';
        confidence = 'medium';
        reason = `Same 5-tuple; differing token(s) (${unresolved.join(', ')}) are not on the reviewed cosmetic OR distinguishing list — defaulted to distinct (safer default) and flagged for lead confirmation.`;
      }
      nearByTuple.push({
        tuple: { primaryMuscle: a.primaryMuscle, equipmentCategory: a.equipmentCategory, movementPattern: a.movementPattern, subregion: a.subregion, laterality: a.laterality },
        pair: [a.name, b.name],
        jaccard: Number(sim.toFixed(2)),
        diffTokens,
        classification,
        confidence,
        reason,
      });
    }
  }
}
// Sort by classification (likely_same_stimulus first — the actionable ones) then by name.
const order = { likely_same_stimulus: 0, legitimately_distinct: 1 };
nearByTuple.sort((a, b) => (order[a.classification] - order[b.classification]) || a.pair[0].localeCompare(b.pair[0]));

// Every pair a human should actually look at: all likely_same_stimulus
// (consolidation candidates) plus every medium-confidence legitimately_distinct
// call (the safer-default cases above).
const flaggedForLeadReview = nearByTuple.filter(
  (p) => p.classification === 'likely_same_stimulus' || p.confidence === 'medium',
);

const out = {
  exactDuplicateCount: exactDuplicates.length,
  exactDuplicates,
  nearDuplicatesByNormalizedNamePairCount: nearByNormalizedName.length,
  nearDuplicatesByNormalizedNameBreakdown: countByClassification(nearByNormalizedName),
  nearDuplicatesByNormalizedName: nearByNormalizedName,
  nearDuplicatesByTupleCount: nearByTuple.length,
  nearDuplicatesByTupleBreakdown: countByClassification(nearByTuple),
  nearDuplicatesByTupleFlaggedForLeadReviewCount: flaggedForLeadReview.length,
  nearDuplicatesByTupleFlaggedForLeadReview: flaggedForLeadReview,
  nearDuplicatesByTuple: nearByTuple,
};

function countByClassification(list) {
  const c = {};
  for (const item of list) c[item.classification] = (c[item.classification] ?? 0) + 1;
  return c;
}

const path = writeJson('duplicates.json', out);
console.log(`duplicates.json written: ${path}`);
console.log(`Exact (case/whitespace) duplicates: ${exactDuplicates.length}`);
console.log(`Near-dup by normalized name pairs: ${nearByNormalizedName.length}`, out.nearDuplicatesByNormalizedNameBreakdown);
console.log(`Near-dup by tuple pairs: ${nearByTuple.length}`, out.nearDuplicatesByTupleBreakdown);
