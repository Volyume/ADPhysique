// Northern Ireland — Active Places NI (Sport NI), OGL. FITNESS=Yes rows
// only. Coordinates are Irish Grid (TM75) easting/northing, converted here
// (the per-row field transform itself lives in lib/transforms.js, unit-
// tested there; this file adds the Irish Grid -> WGS84 conversion, which
// needs the numeric EASTING/NORTHING that transforms.js doesn't parse).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseCsvHeader, csvLineToRecord } = require('../lib/csv.js');
const { irishGridToWgs84 } = require('../lib/osgb.js');
const { transformNiRow } = require('../lib/transforms.js');

const NI_FILE = 'ni/active-places-ni.csv';

/**
 * @param {string} rawDir
 * @yields {object} common record
 */
export async function* readRecords(rawDir, log = console.log) {
  const filePath = path.join(rawDir, NI_FILE);
  if (!fs.existsSync(filePath)) {
    log(`active-places-ni: source not present (${filePath}) - skipped`);
    return;
  }

  // latin-1 (ISO-8859-1) encoded per acquisition record 06.
  const raw = fs.readFileSync(filePath, 'latin1');
  const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return;

  const header = parseCsvHeader(lines[0]);
  let total = 0;
  let fitnessCount = 0;

  for (let i = 1; i < lines.length; i += 1) {
    total += 1;
    const row = csvLineToRecord(header, lines[i]);
    const record = transformNiRow(row);
    if (!record) continue;
    fitnessCount += 1;

    const easting = Number(row.EASTING);
    const northing = Number(row.NORTHING);
    if (Number.isFinite(easting) && Number.isFinite(northing) && easting > 0 && northing > 0) {
      const coords = irishGridToWgs84(easting, northing);
      record.lat = coords.lat;
      record.lng = coords.lng;
      record.coord_source = 'source';
    }

    yield record;
  }
  log(`active-places-ni: ${total} rows scanned, ${fitnessCount} FITNESS=Yes emitted`);
}
