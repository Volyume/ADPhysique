// Wales — DataMapWales leisure centres GeoJSON, OGL v3.
// NOTE (evidence over the acquisition doc's summary): the acquisition
// record 06 states these coordinates are "WGS84 (via WFS)", but the raw
// geometry values (e.g. [333761, 350419] for a Wrexham feature) are in
// fact OSGB36 National Grid easting/northing — converting them with
// osgb36ToWgs84() lands within ~100m of Wrexham/Pembroke's real-world
// location, while treating them as WGS84 degrees would place every venue
// in the middle of the Atlantic. Converted here accordingly (the per-
// feature field transform itself lives in lib/transforms.js, unit-tested
// there).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { osgb36ToWgs84 } = require('../lib/osgb.js');
const { transformWalesFeature } = require('../lib/transforms.js');

const WALES_FILE = 'wales/leisure-centres-wales.geojson';

/**
 * @param {string} rawDir
 * @yields {object} common record
 */
export async function* readRecords(rawDir, log = console.log) {
  const filePath = path.join(rawDir, WALES_FILE);
  if (!fs.existsSync(filePath)) {
    log(`datamap-wales: source not present (${filePath}) - skipped`);
    return;
  }

  const geojson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const features = geojson.features || [];
  let emitted = 0;

  for (const feature of features) {
    const record = transformWalesFeature(feature);
    if (!record) continue;

    const coords = feature.geometry?.coordinates;
    const firstPair = Array.isArray(coords) ? coords[0] : null;
    if (Array.isArray(firstPair) && Number.isFinite(firstPair[0]) && Number.isFinite(firstPair[1])) {
      const latLng = osgb36ToWgs84(firstPair[0], firstPair[1]);
      record.lat = latLng.lat;
      record.lng = latLng.lng;
      record.coord_source = 'source';
    }

    emitted += 1;
    yield record;
  }
  log(`datamap-wales: ${features.length} features scanned, ${emitted} emitted`);
}
