#!/usr/bin/env node
// classify.mjs — applies GD-03 (lib/classify.js) to every geocoded record.
// A record's own venue_type_hint (set by an adapter with strong direct
// evidence — e.g. Overture's category mapping) is honoured as if it were
// the brand-type priority tier, ahead of the Active Places/NI/name-token
// fallbacks, since it is itself external source evidence, not a guess.

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { readJsonl, writeJsonl } = require('./lib/jsonl.js');
const { classify, VENUE_TYPES } = require('./lib/classify.js');

const WORK_DIR = path.join(__dirname, '../../data/gyms/_work');
const IN_FILE = path.join(WORK_DIR, 'geocoded.v1.jsonl');
const OUT_FILE = path.join(WORK_DIR, 'classified.v1.jsonl');

function log(msg) {
  console.log(`[classify] ${msg}`);
}

function run() {
  const records = readJsonl(IN_FILE);
  const counts = {};

  const out = records.map((r) => {
    let result;
    if (r.venue_type_hint && VENUE_TYPES.includes(r.venue_type_hint)) {
      result = { venue_type: r.venue_type_hint, reason: `source_hint:${r.source}` };
    } else {
      result = classify(r);
      // Overture's own primary category "gym" is real source evidence that
      // a venue IS a gym (see sources/overture.mjs's category map: 'gym' is
      // left as `null` = "core, classify further by brand/name" precisely
      // because it's a gym, just of unknown chain/independent status). When
      // no brand or name token gave a more specific answer, that still
      // means "unbranded gym", not "other/ambiguous fitness venue" — so it
      // defaults to independent_gym here rather than lib/classify.js's
      // generic other_fitness catch-all (which is for sources with no
      // "this is a gym" evidence at all).
      if (result.venue_type === 'other_fitness' && r.source === 'overture' && r.payload?.overture_category === 'gym') {
        result = { venue_type: 'independent_gym', reason: 'overture_gym_category_default' };
      }
    }
    counts[result.venue_type] = (counts[result.venue_type] || 0) + 1;
    return { ...r, venue_type: result.venue_type, classify_reason: result.reason };
  });

  fs.mkdirSync(WORK_DIR, { recursive: true });
  writeJsonl(OUT_FILE, out);
  log(`classified ${out.length} records: ${JSON.stringify(counts)}`);
}

run();
