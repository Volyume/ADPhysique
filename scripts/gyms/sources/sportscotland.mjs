// Scotland — sportscotland Sports Facilities register, Spatial Hub
// (data.spatialhub.scot), OGL v3. GD-02's reserved Scottish canonical
// slot; GD-27 rules the layers, school-site and hotel handling (see
// docs/gym-database-2026-09-06/20-BLUEPRINT.md GD-27 and the analysis at
// docs/community-product-audit-2026-09-07/11-sportscotland-register.md).
//
// Three layers feed the pipeline (GD-27): fitness suites (`pub_spffs`,
// canonical — the only layer with "this site has a countable fitness
// facility" evidence), sports halls (`pub_spfsh`) and swimming pools
// (`pub_spfsp`), the latter two corroboration-only for a site that already
// has a fitness suite; they never create a venue on their own. Access is
// gated behind a free Spatial Hub account/authkey (docs/gym-database-
// 2026-09-06/02-sources-scotland-wales-ni.md Section 1): the endpoint
// returns HTTP 403 unauthenticated.
//
// The GD-04 site collapse (union-find over all three layers by folded
// site_name + postcode-or-100m) and the GD-27 field mapping both live in
// lib/transforms.js (collapseSportscotlandFacilities,
// transformSportscotlandSite), unit-tested there — Jest in this repo
// cannot dynamic-import a real ESM .mjs adapter (no
// --experimental-vm-modules), same reason every other adapter's per-row
// transform is factored out. The SPF_AUTHKEY guard below is, for the same
// reason, factored into lib/sportscotlandAuth.js (requireSpfAuthkey) and
// unit-tested there rather than by importing this file. This file itself
// is a thin I/O wrapper: fetch (given a key) or read from disk, then hand
// the raw features to those functions.
//
// Credential handling (GD-27's Access ruling, verbatim): "The Spatial Hub
// key is a credential: read from the environment (SPF_AUTHKEY) by the
// adapter at run time, never written to the repo, never logged." Enforced
// here: the key is read from process.env.SPF_AUTHKEY only (via
// requireSpfAuthkey), appears only inside the URLSearchParams object passed
// straight to fetch(), and is never interpolated into a log line, a
// written file, or an Error message.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { collapseSportscotlandFacilities, transformSportscotlandSite } = require('../lib/transforms.js');
const { requireSpfAuthkey } = require('../lib/sportscotlandAuth.js');

const SCOTLAND_DIR = 'scotland';
const LAYER_FILES = {
  fs: path.join(SCOTLAND_DIR, 'pub_spffs.geojson'), // fitness suites
  sh: path.join(SCOTLAND_DIR, 'pub_spfsh.geojson'), // sports halls
  sp: path.join(SCOTLAND_DIR, 'pub_spfsp.geojson'), // swimming pools
};
// docs/gym-database-2026-09-06/02-sources-scotland-wales-ni.md Section 1:
// "Endpoint pattern: https://geo.spatialhub.scot/geoserver/ext_spf/wfs?
// service=wfs&typeName=ext_spf:pub_spffs" — confirmed live (403
// unauthenticated); the `authkey` parameter name below is the Spatial Hub
// platform's documented convention and is [UNVERIFIED] against a live
// authenticated call, since this adapter never makes one (task bound: no
// network fetch in this lane). Report this as an open item, not a fact.
const WFS_BASE_URL = 'https://geo.spatialhub.scot/geoserver/ext_spf/wfs';
const WFS_TYPE_NAMES = {
  fs: 'ext_spf:pub_spffs',
  sh: 'ext_spf:pub_spfsh',
  sp: 'ext_spf:pub_spfsp',
};
const POLITE_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetches the three sportscotland WFS layers into `rawDir`, GeoJSON in
 * EPSG:4326 (WFS `srsName` requested explicitly rather than assumed), and
 * writes a manifest.json provenance record alongside them — same pattern
 * as the other sources' acquisition (source, licence, attribution, fetch
 * timestamps, per-layer feature counts). Refuses to run without
 * SPF_AUTHKEY. Never invoked by readRecords or by any test in this repo
 * (this lane's task bound: no network calls) — a separate, explicit run.
 * @param {string} rawDir
 * @param {(msg:string)=>void} [log]
 * @returns {Promise<void>}
 */
export async function fetchSportscotlandLayers(rawDir, log = console.log) {
  const authkey = requireSpfAuthkey(process.env);

  const outDir = path.join(rawDir, SCOTLAND_DIR);
  fs.mkdirSync(outDir, { recursive: true });

  const counts = {};
  const layerKeys = Object.keys(LAYER_FILES);
  for (let i = 0; i < layerKeys.length; i += 1) {
    const layer = layerKeys[i];
    const typeName = WFS_TYPE_NAMES[layer];
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName,
      outputFormat: 'json',
      srsName: 'EPSG:4326',
      authkey,
    });
    const url = `${WFS_BASE_URL}?${params.toString()}`;

    // Polite fetch: a descriptive User-Agent, sequential (not parallel)
    // requests, a delay between them - never the key in a log line.
    // eslint-disable-next-line no-await-in-loop
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Volyume gym-directory pipeline (contact via app support)' },
    });
    if (!res.ok) {
      throw new Error(`sportscotland: ${typeName} fetch failed with HTTP ${res.status}`);
    }
    // eslint-disable-next-line no-await-in-loop
    const body = await res.text();
    const outFile = path.join(rawDir, LAYER_FILES[layer]);
    fs.writeFileSync(outFile, body);
    let featureCount = null;
    try {
      featureCount = JSON.parse(body).features?.length ?? null;
    } catch {
      featureCount = null;
    }
    counts[layer] = featureCount;
    log(`sportscotland: fetched ${typeName} -> ${LAYER_FILES[layer]} (${featureCount ?? 'unknown'} features)`);

    if (i < layerKeys.length - 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(POLITE_DELAY_MS);
    }
  }

  const manifest = {
    source: 'sportscotland',
    source_name: 'sportscotland Sports Facilities (Spatial Hub)',
    dataset_landing_page: 'https://data.spatialhub.scot/dataset/sports_facilities-unknown',
    licence: 'Open Government Licence v3.0',
    attribution: 'sportscotland, via Spatial Hub (data.spatialhub.scot)',
    layers: LAYER_FILES,
    feature_counts: counts,
    fetched_at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  log(`sportscotland: wrote ${path.join(SCOTLAND_DIR, 'manifest.json')}`);
}

function readGeojsonFeatures(rawDir, relFile, log) {
  const filePath = path.join(rawDir, relFile);
  if (!fs.existsSync(filePath)) {
    log(`sportscotland: source not present (${filePath}) - skipped`);
    return [];
  }
  const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return geojson.features || [];
}

/**
 * @param {string} rawDir
 * @yields {object} common record
 */
export async function* readRecords(rawDir, log = console.log) {
  const fsFeatures = readGeojsonFeatures(rawDir, LAYER_FILES.fs, log);
  const shFeatures = readGeojsonFeatures(rawDir, LAYER_FILES.sh, log);
  const spFeatures = readGeojsonFeatures(rawDir, LAYER_FILES.sp, log);
  if (fsFeatures.length === 0 && shFeatures.length === 0 && spFeatures.length === 0) return;

  const sites = collapseSportscotlandFacilities(fsFeatures, shFeatures, spFeatures);
  let emitted = 0;
  let droppedNoFitnessSuite = 0;
  for (const site of sites) {
    if (!site.some((f) => f.layer === 'fs')) {
      droppedNoFitnessSuite += 1;
      continue;
    }
    const record = transformSportscotlandSite(site);
    if (!record) continue;
    emitted += 1;
    yield record;
  }
  log(
    `sportscotland: ${fsFeatures.length} fitness suite / ${shFeatures.length} sports hall / ${spFeatures.length} ` +
      `swimming pool features scanned, ${sites.length} sites collapsed, ${emitted} venue(s) emitted ` +
      `(${droppedNoFitnessSuite} site(s) had no fitness suite - corroboration only, not emitted)`,
  );
}
