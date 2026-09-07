// Overture Maps Foundation Places (gym/fitness categories), pipeline-only
// DuckDB read approved by the founder 2026-09-07 (GD-02). Permissive
// licence per row (CDLA-Permissive-2.0 for Overture/meta/Microsoft-sourced
// rows, Apache-2.0 for Foursquare-sourced rows) — both attributions carried
// through to ATTRIBUTION.md via each record's payload.overture_sources.
// The per-row transform lives in lib/transforms.js, unit-tested there;
// this file only streams the file and applies the country/bounds filter.

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isWithinGbNiBounds } = require('../lib/geo.js');
const { transformOvertureRow } = require('../lib/transforms.js');

const OVERTURE_FILE = 'overture/uk-gyms.ndjson';

/**
 * @param {string} rawDir
 * @yields {object} common record
 */
export async function* readRecords(rawDir, log = console.log) {
  const filePath = path.join(rawDir, OVERTURE_FILE);
  if (!fs.existsSync(filePath)) {
    log(`overture: source not present (${filePath}) - skipped`);
    return;
  }

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let total = 0;
  let keptCountry = 0;
  let excluded = 0;
  let emitted = 0;
  let lowConfidence = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    total += 1;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }

    const address = Array.isArray(row.addresses) && row.addresses.length > 0 ? row.addresses[0] : null;
    const country = address?.country || null;
    const inGb = country ? country === 'GB' : isWithinGbNiBounds(row.lat, row.lng);
    if (!inGb) continue;
    keptCountry += 1;

    const record = transformOvertureRow(row, true);
    if (!record) {
      excluded += 1;
      continue;
    }
    emitted += 1;
    if (record.low_confidence) lowConfidence += 1;
    yield record;
  }
  log(
    `overture: ${total} rows scanned, ${keptCountry} GB/NI-located, ${excluded} excluded (category or no name), ` +
      `${emitted} emitted (${lowConfidence} flagged low_confidence <0.3)`,
  );
}
