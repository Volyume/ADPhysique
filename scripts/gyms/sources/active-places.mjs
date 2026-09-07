// England — Sport England Active Places Power (site + health-and-fitness
// facility layers), joined by siteid (GD-04: site, not facility).
// Licence: CC BY 4.0, "Contains Data © Sport England".
//
// The per-row transform (transformActivePlacesSite) lives in lib/transforms.js
// so it is unit-testable under Jest; this file only streams/joins the raw
// files.

import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { transformActivePlacesSite } = require('../lib/transforms.js');

const SITES_FILE = 'england/sites.ndjson';
const HF_FILE = 'england/health_and_fitness_facilities.ndjson';

async function* readLines(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) yield line;
  }
}

/**
 * @param {string} rawDir
 * @yields {object} common record
 */
export async function* readRecords(rawDir, log = console.log) {
  const sitesPath = path.join(rawDir, SITES_FILE);
  const hfPath = path.join(rawDir, HF_FILE);

  if (!fs.existsSync(sitesPath) || !fs.existsSync(hfPath)) {
    log(`active-places: source not present (${sitesPath}) - skipped`);
    return;
  }

  // Pass 1: group health-and-fitness facilities by siteid.
  const bySite = new Map();
  let hfCount = 0;
  for await (const line of readLines(hfPath)) {
    hfCount += 1;
    let facility;
    try {
      facility = JSON.parse(line);
    } catch {
      continue;
    }
    const siteId = facility.siteid;
    if (siteId === null || siteId === undefined) continue;
    if (!bySite.has(siteId)) bySite.set(siteId, []);
    bySite.get(siteId).push(facility);
  }
  log(`active-places: ${hfCount} health-and-fitness facility rows across ${bySite.size} sites`);

  // Pass 2: stream sites, emit one record per site that has >=1 HF facility.
  let siteCount = 0;
  let emitted = 0;
  for await (const line of readLines(sitesPath)) {
    siteCount += 1;
    let site;
    try {
      site = JSON.parse(line);
    } catch {
      continue;
    }
    const facilities = bySite.get(site.siteid);
    if (!facilities || facilities.length === 0) continue;

    const record = transformActivePlacesSite(site, facilities);
    if (!record) continue;
    emitted += 1;
    yield record;
  }
  log(`active-places: ${siteCount} sites scanned, ${emitted} emitted as health-and-fitness venues`);
}
