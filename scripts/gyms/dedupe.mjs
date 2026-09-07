#!/usr/bin/env node
// dedupe.mjs — GD-06 multi-signal deduplication. Blocks candidate pairs
// (same postcode unit; same postcode sector + first name token; same or
// neighbouring 250m grid cell), scores each pair once (lib/dedupe.js),
// unions 'merge'-decided pairs into clusters (a union-find over record
// keys), and writes:
//   data/gyms/merge-decisions.v1.jsonl.gz — one line per resulting cluster
//   data/gyms/review-queue.v1.jsonl.gz    — GD-23 "likely" review pairs
//                                            (a name, phone or website
//                                            signal contributed) — the
//                                            moderator queue
//   data/gyms/review-weak.v1.jsonl.gz     — GD-23 "weak" review pairs
//                                            (proximity-only: postcode/
//                                            street/distance alone) — no
//                                            person is asked to work this
// 'excluded' venue_type records (GD-03) never enter blocking — they are
// never canonical venues, so there is nothing to dedupe them against.
// GD-24: both review files and the merge-decisions file are committed
// gzipped; the classified input and the parent-links side file stay under
// data/gyms/_work/ (gitignored, plain JSONL).

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readJsonl, writeJsonl, writeJsonlGz } = require('./lib/jsonl.js');
const { scorePair, decide, reviewTier, REVIEW_THRESHOLD, MERGE_THRESHOLD } = require('./lib/dedupe.js');
const { sectorCode } = require('./lib/postcode.js');
const { gridCellNeighbourKeys } = require('./lib/geo.js');

const WORK_DIR = path.join(__dirname, '../../data/gyms/_work');
const DATA_DIR = path.join(__dirname, '../../data/gyms');
const IN_FILE = path.join(WORK_DIR, 'classified.v1.jsonl');
const MERGE_OUT = path.join(DATA_DIR, 'merge-decisions.v1.jsonl.gz');
const REVIEW_OUT = path.join(DATA_DIR, 'review-queue.v1.jsonl.gz');
const REVIEW_WEAK_OUT = path.join(DATA_DIR, 'review-weak.v1.jsonl.gz');
const PARENT_LINKS_OUT = path.join(DATA_DIR, '_work', 'parent-links.v1.jsonl');
// GD-24: these uncompressed predecessors are superseded by the .gz files
// above and must not linger alongside them once a run has produced the
// gzipped versions.
const LEGACY_UNCOMPRESSED_FILES = [
  path.join(DATA_DIR, 'merge-decisions.v1.jsonl'),
  path.join(DATA_DIR, 'review-queue.v1.jsonl'),
];

function log(msg) {
  console.log(`[dedupe] ${msg}`);
}

function keyOf(rec) {
  return `${rec.source}:${rec.source_record_id}`;
}

// --- union-find -------------------------------------------------------
function makeUnionFind(n) {
  const parent = Array.from({ length: n }, (_, i) => i);
  function find(x) {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  return { find, union };
}

function addToBlock(map, key, idx) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(idx);
}

function run() {
  const all = readJsonl(IN_FILE);
  const records = all.filter((r) => r.venue_type !== 'excluded');
  log(`${all.length} classified records, ${records.length} eligible for dedupe (excluding venue_type=excluded)`);

  const byPostcodeUnit = new Map();
  const byPostcodeSectorToken = new Map();
  const byGridCell = new Map();

  records.forEach((r, idx) => {
    if (r.postcode) addToBlock(byPostcodeUnit, r.postcode, idx);

    // GD-21: `r.sector` is set by geocode.mjs for BOTH postcode-derived and
    // nearest_sector (coords, no postcode) records, so a coordinate-only
    // Overture row still blocks against a postcode-carrying row in the same
    // sector — falls back to recomputing from postcode for any record from
    // a pre-GD-21 cache that doesn't carry the field yet.
    const sector = r.sector || (r.postcode ? sectorCode(r.postcode) : null);
    const firstToken = Array.isArray(r.tokens) && r.tokens.length > 0 ? r.tokens[0] : null;
    if (sector && firstToken) addToBlock(byPostcodeSectorToken, `${sector}|${firstToken}`, idx);

    if (Number.isFinite(r.lat) && Number.isFinite(r.lng)) {
      for (const cellKey of gridCellNeighbourKeys(r.lat, r.lng, 250)) {
        addToBlock(byGridCell, cellKey, idx);
      }
    }
  });

  const uf = makeUnionFind(records.length);
  const compared = new Set();
  const reviewPairs = [];
  const parentLinks = [];

  const allMergeEdges = [];

  function comparePairIfNeeded(i, j) {
    if (i === j) return;
    const pairKey = i < j ? `${i}:${j}` : `${j}:${i}`;
    if (compared.has(pairKey)) return;
    compared.add(pairKey);

    const a = records[i];
    const b = records[j];
    const scored = scorePair(a, b);

    // GD-06: "a gym inside a leisure centre stays a separate venue with a
    // parent_venue_id" — different brands at an identical address never
    // merge, regardless of score; they're linked as parent/child instead.
    const brandA = a.brand && a.brand.key;
    const brandB = b.brand && b.brand.key;
    if (brandA && brandB && brandA !== brandB && scored.sameAddress) {
      const aIsHost = a.venue_type === 'leisure_centre';
      const bIsHost = b.venue_type === 'leisure_centre';
      if (aIsHost !== bIsHost) {
        parentLinks.push({
          parent_key: keyOf(aIsHost ? a : b),
          child_key: keyOf(aIsHost ? b : a),
          score: scored.score,
          reasons: scored.reasons,
        });
      }
      return; // never merge, never review-queue this pair
    }

    const decision = decide(scored);

    if (decision === 'merge') {
      uf.union(i, j);
      allMergeEdges.push({ i, j, score: scored.score, reasons: scored.reasons });
    } else if (decision === 'review') {
      reviewPairs.push({
        kind: 'possible_duplicate',
        tier: reviewTier(scored.reasons), // GD-23: 'likely' (moderator queue) or 'weak' (proximity-only)
        a: keyOf(a),
        a_name: a.name,
        a_postcode: a.postcode,
        b: keyOf(b),
        b_name: b.name,
        b_postcode: b.postcode,
        score: scored.score,
        reasons: scored.reasons,
      });
    }
  }

  for (const idxs of byPostcodeUnit.values()) {
    if (idxs.length < 2) continue;
    for (let a = 0; a < idxs.length; a += 1)
      for (let b = a + 1; b < idxs.length; b += 1) comparePairIfNeeded(idxs[a], idxs[b]);
  }
  for (const idxs of byPostcodeSectorToken.values()) {
    if (idxs.length < 2) continue;
    for (let a = 0; a < idxs.length; a += 1)
      for (let b = a + 1; b < idxs.length; b += 1) comparePairIfNeeded(idxs[a], idxs[b]);
  }
  for (const idxs of byGridCell.values()) {
    if (idxs.length < 2) continue;
    for (let a = 0; a < idxs.length; a += 1)
      for (let b = a + 1; b < idxs.length; b += 1) comparePairIfNeeded(idxs[a], idxs[b]);
  }
  log(`${compared.size} candidate pairs scored (after blocking); ${allMergeEdges.length} merge edges, ${reviewPairs.length} review-band pairs`);

  // Group records by final union-find root -> clusters.
  const clusters = new Map();
  records.forEach((r, idx) => {
    const root = uf.find(idx);
    if (!clusters.has(root)) clusters.set(root, []);
    clusters.get(root).push(idx);
  });

  const mergeDecisions = [];
  let clusterIdCounter = 0;
  for (const [, memberIdxs] of clusters) {
    clusterIdCounter += 1;
    const memberKeys = memberIdxs.map((idx) => keyOf(records[idx]));
    const pairwise = allMergeEdges
      .filter((e) => memberIdxs.includes(e.i) && memberIdxs.includes(e.j))
      .map((e) => ({ a: keyOf(records[e.i]), b: keyOf(records[e.j]), score: e.score, reasons: e.reasons }));
    mergeDecisions.push({
      cluster_id: `c${clusterIdCounter}`,
      member_count: memberIdxs.length,
      member_keys: memberKeys,
      pairwise_merges: pairwise,
    });
  }

  // GD-23: split the review band into the moderator ("likely") queue and
  // the queue no person is asked to work ("weak" — proximity-only).
  const reviewLikely = reviewPairs.filter((p) => p.tier === 'likely');
  const reviewWeak = reviewPairs.filter((p) => p.tier === 'weak');

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.dirname(PARENT_LINKS_OUT), { recursive: true });
  writeJsonlGz(MERGE_OUT, mergeDecisions);
  writeJsonlGz(REVIEW_OUT, reviewLikely);
  writeJsonlGz(REVIEW_WEAK_OUT, reviewWeak);
  writeJsonl(PARENT_LINKS_OUT, parentLinks);
  for (const f of LEGACY_UNCOMPRESSED_FILES) {
    if (fs.existsSync(f)) fs.rmSync(f);
  }
  log(`${parentLinks.length} parent/child links found (different brand, identical address)`);

  const mergedClusterCount = mergeDecisions.filter((c) => c.member_count > 1).length;
  log(
    `${mergeDecisions.length} clusters written (${mergedClusterCount} are actual merges of 2+ records, ` +
      `${mergeDecisions.length - mergedClusterCount} singletons) -> ${MERGE_OUT}`,
  );
  log(
    `${reviewPairs.length} review-band pairs -> ${reviewLikely.length} likely (${REVIEW_OUT}), ` +
      `${reviewWeak.length} weak (${REVIEW_WEAK_OUT})`,
  );
  log(`thresholds: merge >= ${MERGE_THRESHOLD}, review ${REVIEW_THRESHOLD}-${MERGE_THRESHOLD - 1}, distinct below ${REVIEW_THRESHOLD}`);
}

run();
