// Foursquare Open Source Places — STUB. GD-02 lists this as a canonical
// source once pulled, but as of this run raw/foursquare/ is empty (the
// Overture adapter already carries Foursquare-sourced rows that were
// conflated into Overture Places, per overture/manifest.json's
// row_level_source_dataset_and_licence_found). No-ops with a logged
// message when the folder has no data; wire in a real reader (matching the
// field names in docs/gym-database-2026-09-06/01, 03, 04) once a direct
// Foursquare extract lands under raw/foursquare/.

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} rawDir
 * @yields {object}
 */
export async function* readRecords(rawDir, log = console.log) {
  const dir = path.join(rawDir, 'foursquare');
  const hasFiles = fs.existsSync(dir) && fs.readdirSync(dir).some((f) => !f.startsWith('.'));
  if (!hasFiles) {
    log(`foursquare: source not present (${dir}) - skipped`);
    return;
  }
  log(`foursquare: files found under ${dir} but no reader is implemented yet - skipped (STOP and report)`);
}
