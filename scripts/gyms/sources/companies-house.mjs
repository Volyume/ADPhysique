// Companies House Free Company Data Product, filtered to Active companies
// with SIC 93130 (fitness facilities) or 93110 (operation of sports
// facilities). GD-02: a candidate signal only — "a company is not a venue
// until a premises-like address or another source confirms it". This
// adapter therefore never feeds the normal multi-source dedupe/merge path;
// build.mjs consumes it in a separate corroboration pass
// (corroborateWithCompaniesHouse): a registered address that shares a
// postcode unit with an already-built canonical venue adds a corroborating
// source record to that venue; a premises-like address with no canonical
// match goes to the review queue as a possible independent gym; anything
// else (a registered-office-only address) is dropped. The per-row
// transform lives in lib/transforms.js, unit-tested there.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseCsvHeader } = require('../lib/csv.js');
const { transformCompaniesHouseRow } = require('../lib/transforms.js');

const CH_FILE = 'companies-house/fitness-companies.csv';

/**
 * @param {string} rawDir
 * @yields {object} candidate record (never a canonical venue on its own)
 */
export async function* readRecords(rawDir, log = console.log) {
  const filePath = path.join(rawDir, CH_FILE);
  if (!fs.existsSync(filePath)) {
    log(`companies-house: source not present (${filePath}) - skipped`);
    return;
  }

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const { parseCsvLine } = require('../lib/csv.js');

  let header = null;
  let total = 0;
  let active = 0;
  let premisesLike = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (!header) {
      header = parseCsvHeader(line);
      continue;
    }
    total += 1;
    const fields = parseCsvLine(line);
    const row = {};
    for (let i = 0; i < header.length; i += 1) row[header[i]] = fields[i] !== undefined ? fields[i] : '';

    const record = transformCompaniesHouseRow(row);
    if (!record) continue;
    active += 1;
    if (record.premises_like) premisesLike += 1;
    yield record;
  }
  log(`companies-house: ${total} rows scanned, ${active} Active, ${premisesLike} premises-like addresses`);
}
