#!/usr/bin/env node
// normalise.mjs — reads every primary source adapter, attaches a brand
// match, validates/normalises postcodes, and writes one common-schema
// JSONL file: data/gyms/_work/normalised.v1.jsonl
//
// Companies House is deliberately NOT read here — it is a candidate signal
// (GD-02) consumed separately in build.mjs's corroboration pass, never
// through the normal multi-source blocking/dedupe path. VOA is never read
// (GD-16).
//
// GD-25: after GD-18 cleanup, a name over 80 characters or 8 tokens
// (any source, not only operators — a general safety net alongside the
// operator-adapter root-cause fix in lib/transforms.js) is rejected and
// replaced with brand + town (town from the source's own address, else
// resolved from ONSPD via the postcode), flagged `name_source: 'fallback'`
// so build.mjs's display-name priority can prefer a saner name elsewhere
// in the same cluster over a fallback one. Counts of rejected names by
// source are written to data/gyms/_work/name-rejections.v1.json for
// audit.mjs.
//
// GD-26: the same GD-18 all-caps -> title-case casing (titleCaseAllCaps,
// lib/names.js) is applied here to every source's `town` and
// `address_line` too, not only `name` — a mixed-case source is left
// untouched.

import path from 'node:path';
import fs from 'node:fs';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { writeJsonl } = require('./lib/jsonl.js');
const { normalisePostcode } = require('./lib/postcode.js');
const { matchBrand, SEED_BRANDS } = require('./lib/brands.js');
const { tokenize } = require('./lib/fold.js');
const { parseCsvHeader, csvLineToRecord } = require('./lib/csv.js');
const {
  cleanDisplayName,
  buildExceptionsMap,
  brandCasingExceptions,
  saneName,
  stripTrailingOutward,
  boundName,
  titleCaseAllCaps,
} = require('./lib/names.js');

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
// GD-25: per-source counts of names rejected as insane and given a
// fallback name, for audit.mjs to report per operator/source (gitignored
// scratch file, same as OUT_FILE).
const NAME_REJECTIONS_FILE = path.join(OUT_DIR, 'name-rejections.v1.json');

const PRIMARY_SOURCES = ['active-places', 'active-places-ni', 'datamap-wales', 'operators', 'overture', 'voa'];

function log(msg) {
  console.log(`[normalise] ${msg}`);
}

function loadCsvMap(filePath, keyField) {
  const map = new Map();
  if (!fs.existsSync(filePath)) return map;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter((l) => l.trim());
  if (lines.length === 0) return map;
  const header = parseCsvHeader(lines[0]);
  for (let i = 1; i < lines.length; i += 1) {
    const row = csvLineToRecord(header, lines[i]);
    map.set(row[keyField], row);
  }
  return map;
}

/**
 * GD-25: "town from the address, else ONSPD via the postcode." A single
 * streaming pass over onspd-slim.csv restricted to the (typically tiny)
 * set of postcodes a name-sanity fallback actually needs — records whose
 * source name was rejected AND whose source carried no address town at
 * all — resolving each to its ONSPD built-up-area name, falling back to
 * its local authority name where the postcode carries no built-up area
 * (the S99999999 "none" placeholder, mainly rural Scotland).
 * @param {string} rawDir
 * @param {Set<string>} postcodes - normalised postcodes needing a town
 * @param {(msg:string)=>void} log
 * @returns {Promise<Map<string,string|null>>}
 */
async function resolveOnspdTowns(rawDir, postcodes, log) {
  const result = new Map();
  if (postcodes.size === 0) return result;
  const onspdPath = path.join(rawDir, 'postcodes/onspd-slim.csv');
  if (!fs.existsSync(onspdPath)) {
    log(`GD-25 ONSPD town fallback: ${onspdPath} not present, ${postcodes.size} postcode(s) left unresolved`);
    return result;
  }

  const buaLookup = loadCsvMap(path.join(rawDir, 'postcodes/lookups/bua-lookup.csv'), 'BUA24CD');
  const ladLookup = loadCsvMap(path.join(rawDir, 'postcodes/lookups/lad-lookup.csv'), 'LAD25CD');

  const stream = fs.createReadStream(onspdPath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvHeader(line);
      continue;
    }
    const pcds = line.slice(0, line.indexOf(','));
    if (!postcodes.has(pcds)) continue;
    const row = csvLineToRecord(header, line);
    const bua = buaLookup.get(row.bua);
    const lad = ladLookup.get(row.oslaua);
    const town = (bua && bua.BUA24NM) || (lad && lad.LAD25NM) || null;
    result.set(pcds, town);
    if (result.size === postcodes.size) break;
  }
  log(`GD-25 ONSPD town fallback: ${result.size}/${postcodes.size} postcode(s) resolved via ONSPD`);
  return result;
}

/**
 * GD-25 fallback name: "brand plus town". Either half may be missing;
 * returns null only when both are (the caller then bounds the rejected
 * name itself as an absolute last resort).
 * @param {string|null} brandName
 * @param {string|null} town
 * @returns {string|null}
 */
function composeFallbackName(brandName, town) {
  const parts = [brandName, town].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const out = [];
  let invalidPostcodeButKept = 0;
  let statusSuffixStripped = 0;
  let nameCleaned = 0;
  let nameRejected = 0;
  let townCased = 0;
  let addressLineCased = 0;
  const nameRejectionsBySource = {};
  // GD-25: a rejected name whose source carried no address town at all
  // needs an ONSPD lookup before its brand+town fallback can be composed
  // — collected here and resolved in one pass after every source has run.
  const pendingTownFallback = [];

  for (const moduleName of PRIMARY_SOURCES) {
    const mod = await import(`./sources/${moduleName}.mjs`);
    let count = 0;
    for await (const rec of mod.readRecords(RAW_DIR, log)) {
      count += 1;

      const brand = rec.brand || matchBrand(rec.name) || (rec.brand_guess ? matchBrand(rec.brand_guess) : null);
      const pc = rec.postcode ? normalisePostcode(rec.postcode) : null;
      if (rec.postcode && !pc) invalidPostcodeButKept += 1;

      const { name: cleanedName0, statusHint } = cleanDisplayName(rec.name, { exceptionsMap: NAME_EXCEPTIONS_MAP });
      if (statusHint) statusSuffixStripped += 1;
      const cleanedName = stripTrailingOutward(cleanedName0, pc ? pc.outward : null);
      if (cleanedName !== rec.name) nameCleaned += 1;

      // GD-26: town/address_line get the same GD-18 casing as the name
      // (mixed-case sources pass through titleCaseAllCaps untouched).
      const cleanedTown = rec.town ? titleCaseAllCaps(rec.town, NAME_EXCEPTIONS_MAP) : rec.town;
      const cleanedAddressLine = rec.address_line ? titleCaseAllCaps(rec.address_line, NAME_EXCEPTIONS_MAP) : rec.address_line;
      if (cleanedTown !== rec.town) townCased += 1;
      if (cleanedAddressLine !== rec.address_line) addressLineCased += 1;

      // GD-25: a source name over 80 characters or 8 tokens is rejected
      // rather than shown as a venue name (the Third Space/Better GLL
      // "whole club page as name" defect, and anything else like it from
      // any source) — the record falls back to brand + town instead.
      let finalName = cleanedName;
      let nameSource;
      if (!saneName(cleanedName)) {
        nameRejected += 1;
        nameRejectionsBySource[rec.source] = (nameRejectionsBySource[rec.source] || 0) + 1;
        nameSource = 'fallback';
        const brandName = brand ? brand.name : null;
        const addressTown = rec.town || null;
        if (addressTown) {
          finalName = composeFallbackName(brandName, addressTown) || boundName(cleanedName);
        } else {
          finalName = null; // resolved below once ONSPD town lookup has run, or bound as a last resort
        }
      }

      const outRec = {
        ...rec,
        name: finalName,
        name_raw: cleanedName !== rec.name ? rec.name : undefined,
        name_source: nameSource,
        brand,
        postcode: pc ? pc.normalised : null,
        postcode_raw: pc ? undefined : rec.postcode || null,
        tokens: finalName !== null ? tokenize(finalName || '') : undefined,
        town: cleanedTown,
        address_line: cleanedAddressLine,
      };
      out.push(outRec);

      if (nameSource === 'fallback' && finalName === null) {
        pendingTownFallback.push({
          rec: outRec,
          brandName: brand ? brand.name : null,
          postcode: pc ? pc.normalised : null,
          cleanedName,
        });
      }
    }
    log(`${moduleName}: ${count} records normalised`);
  }

  if (pendingTownFallback.length > 0) {
    const neededPostcodes = new Set(pendingTownFallback.filter((p) => p.postcode).map((p) => p.postcode));
    const onspdTowns = await resolveOnspdTowns(RAW_DIR, neededPostcodes, log);
    for (const p of pendingTownFallback) {
      const town = p.postcode ? onspdTowns.get(p.postcode) : null;
      const finalName =
        composeFallbackName(p.brandName, town) || boundName(p.cleanedName) || p.brandName || 'Unnamed venue';
      p.rec.name = finalName;
      p.rec.tokens = tokenize(finalName);
    }
  }

  writeJsonl(OUT_FILE, out);
  fs.writeFileSync(
    NAME_REJECTIONS_FILE,
    `${JSON.stringify({ total: nameRejected, by_source: nameRejectionsBySource }, null, 2)}\n`,
  );
  log(
    `wrote ${out.length} normalised records to ${OUT_FILE} (${invalidPostcodeButKept} had an unrecognised postcode, ` +
      `kept with postcode=null; GD-18: ${nameCleaned} names cleaned, ${statusSuffixStripped} had a status suffix stripped; ` +
      `GD-25: ${nameRejected} name(s) rejected as insane and given a brand+town fallback name; ` +
      `GD-26: ${townCased} town(s) and ${addressLineCased} address_line(s) cased from all-caps)`,
  );
}

run().catch((e) => {
  console.error('[normalise] FATAL', e);
  process.exit(1);
});
