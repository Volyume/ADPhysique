#!/usr/bin/env node
// normalise.mjs — reads every primary source adapter, attaches a brand
// match, validates/normalises postcodes, and writes one common-schema
// JSONL file: data/gyms/_work/normalised.v1.jsonl
//
// Companies House is deliberately NOT read here — it is a candidate signal
// (GD-02) consumed separately in build.mjs's corroboration pass, never
// through the normal multi-source blocking/dedupe path. VOA is never read
// (GD-16).

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { writeJsonl } = require('./lib/jsonl.js');
const { normalisePostcode } = require('./lib/postcode.js');
const { matchBrand, SEED_BRANDS } = require('./lib/brands.js');
const { tokenize } = require('./lib/fold.js');
const { cleanDisplayName, buildExceptionsMap, brandCasingExceptions } = require('./lib/names.js');

// GD-18: decode HTML entities, strip a baked-in status suffix ("(CLOSED)",
// "- CLOSED", "(TEMPORARILY CLOSED)"), title-case an all-caps name
// (honouring the exceptions list plus brand casing), and turn a trailing
// bracket qualifier into a plain suffix. Applied to every source's `name`
// here so classify.js's name-token fallback and dedupe's name comparison
// both see the cleaned form. Operator branch names are ALSO composed
// brand + branch at this point (GD-22) — that composition happens inside
// transforms.js's transformOperatorBranch itself (run before this record
// ever reaches here), so re-running cleanDisplayName on an already-clean
// mixed-case name is a safe no-op.
const NAME_EXCEPTIONS_MAP = buildExceptionsMap(brandCasingExceptions(SEED_BRANDS));

const DEFAULT_RAW_DIR =
  '/tmp/claude-0/-home-user-ADPhysique/8a1da388-bf6f-50f3-8ac9-99853301c7d5/scratchpad/gyms/raw';
const RAW_DIR = process.env.RAW_DIR || process.argv[2] || DEFAULT_RAW_DIR;
const OUT_DIR = path.join(__dirname, '../../data/gyms/_work');
const OUT_FILE = path.join(OUT_DIR, 'normalised.v1.jsonl');

const PRIMARY_SOURCES = ['active-places', 'active-places-ni', 'datamap-wales', 'operators', 'overture', 'voa'];

function log(msg) {
  console.log(`[normalise] ${msg}`);
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = [];
  let invalidPostcodeButKept = 0;
  let statusSuffixStripped = 0;
  let nameCleaned = 0;

  for (const moduleName of PRIMARY_SOURCES) {
    const mod = await import(`./sources/${moduleName}.mjs`);
    let count = 0;
    for await (const rec of mod.readRecords(RAW_DIR, log)) {
      count += 1;

      const brand = rec.brand || matchBrand(rec.name) || (rec.brand_guess ? matchBrand(rec.brand_guess) : null);
      const pc = rec.postcode ? normalisePostcode(rec.postcode) : null;
      if (rec.postcode && !pc) invalidPostcodeButKept += 1;

      const { name: cleanedName, statusHint } = cleanDisplayName(rec.name, { exceptionsMap: NAME_EXCEPTIONS_MAP });
      if (statusHint) statusSuffixStripped += 1;
      if (cleanedName !== rec.name) nameCleaned += 1;

      out.push({
        ...rec,
        name: cleanedName,
        name_raw: cleanedName !== rec.name ? rec.name : undefined,
        brand,
        postcode: pc ? pc.normalised : null,
        postcode_raw: pc ? undefined : rec.postcode || null,
        tokens: tokenize(cleanedName || ''),
      });
    }
    log(`${moduleName}: ${count} records normalised`);
  }

  writeJsonl(OUT_FILE, out);
  log(
    `wrote ${out.length} normalised records to ${OUT_FILE} (${invalidPostcodeButKept} had an unrecognised postcode, ` +
      `kept with postcode=null; GD-18: ${nameCleaned} names cleaned, ${statusSuffixStripped} had a status suffix stripped)`,
  );
}

run().catch((e) => {
  console.error('[normalise] FATAL', e);
  process.exit(1);
});
