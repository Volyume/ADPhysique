#!/usr/bin/env node
/**
 * buildCofidSnapshot.js
 *
 * Downloads McCance and Widdowson's Composition of Foods Integrated
 * Dataset (CoFID), 7th edition (2021), from gov.uk and converts the
 * "1.3 Proximates" sheet into assets/seed/cofid_uk.dat — the bundled
 * snapshot of ~3,300 generic UK foods.
 *
 * CoFID is static. The 7th edition has not changed since 2021 and is
 * unlikely to. This script exists for reproducibility, not for a
 * weekly cron. Run once when adding the data, again only if OHID
 * publishes a new edition.
 *
 *   node scripts/seed/buildCofidSnapshot.js
 *
 * Output:
 *   assets/seed/cofid_uk.dat — JSON document with _meta + rows array.
 *   Each row has the same shape as the OFF snapshot rows
 *   (ean is reused to carry the CoFID food code so source_id stays
 *   meaningful in the local cache).
 *
 * Licence: Open Government Licence v3.0. Attribution required in the
 * app's Credits screen: "Contains public sector information licensed
 * under the Open Government Licence v3.0."
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');

let XLSX;
try {
  // eslint-disable-next-line global-require
  XLSX = require('xlsx');
} catch (_) {
  console.error('[cofid] missing dependency: xlsx. Run: npm install --save-dev xlsx');
  process.exit(1);
}

const SOURCE_URL = 'https://assets.publishing.service.gov.uk/media/60538b91e90e07527df82ae4/McCance_Widdowsons_Composition_of_Foods_Integrated_Dataset_2021..xlsx';
const USER_AGENT = 'Volyume-Cofid-Builder/1.0 (https://volyume.app)';
const SHEET_NAME = '1.3 Proximates';
const OUT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'cofid_uk.dat');
const TMP_XLSX = path.join(require('node:os').tmpdir(), 'cofid-mw-2021.xlsx');

// 0-indexed column positions in sheet "1.3 Proximates".
const COL = {
  code:    0,    // "13-145"
  name:    1,    // "Ackee, canned, drained"
  desc:    2,    // free-text description / sample count
  group:   3,    // "DG" etc.
  protein: 9,    // per 100g
  fat:     10,
  carbs:   11,
  kcal:    12,
  sugar:   16,   // Total sugars
  fibre:   24,   // Englyst fibre (col 25 is AOAC, but 24 is more widely populated)
};

function log(...args) { console.log('[cofid]', ...args); }
function warn(...args) { console.warn('[cofid]', ...args); }
function err(...args) { console.error('[cofid]', ...args); }

// CoFID values can be "Tr" (trace, treat as 0), "N" (not measured,
// treat as null), or a number / numeric string.
function num(v) {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s === '' || s === 'N' || s === 'n/a') return null;
  if (s === 'Tr' || s === 'tr') return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function downloadXlsx(url, destPath) {
  return new Promise((resolve, reject) => {
    log(`downloading ${url}`);
    const t0 = Date.now();
    const file = fs.createWriteStream(destPath);
    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) { /* tolerate */ }
        return downloadXlsx(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(destPath); } catch (_) { /* tolerate */ }
        return reject(new Error(`CoFID download returned HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close((closeErr) => {
          if (closeErr) return reject(closeErr);
          const ms = Date.now() - t0;
          const mb = (fs.statSync(destPath).size / 1024 / 1024).toFixed(2);
          log(`download complete: ${mb} MB in ${(ms / 1000).toFixed(1)}s`);
          resolve();
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(60_000, () => req.destroy(new Error('download timed out')));
  });
}

(async function main() {
  const t0 = Date.now();
  log(`output: ${OUT_PATH}`);

  if (!fs.existsSync(TMP_XLSX)) {
    await downloadXlsx(SOURCE_URL, TMP_XLSX);
  } else {
    log(`using cached download: ${TMP_XLSX}`);
  }

  log(`parsing sheet "${SHEET_NAME}"`);
  const wb = XLSX.readFile(TMP_XLSX);
  const ws = wb.Sheets[SHEET_NAME];
  if (!ws) {
    err(`sheet "${SHEET_NAME}" not found. Available: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  log(`total grid rows: ${grid.length}`);

  // First 3 rows are headers (long names / short codes / short labels).
  // Data rows start at index 3.
  const rows = [];
  const seenCode = new Set();
  let skipped = 0;
  for (let i = 3; i < grid.length; i++) {
    const r = grid[i];
    if (!Array.isArray(r)) { skipped++; continue; }
    const code = r[COL.code];
    const name = r[COL.name];
    if (!code || !name || typeof name !== 'string') { skipped++; continue; }
    if (seenCode.has(code)) { skipped++; continue; }
    const kcal = num(r[COL.kcal]);
    const protein = num(r[COL.protein]);
    const carbs = num(r[COL.carbs]);
    const fat = num(r[COL.fat]);
    if (kcal == null || protein == null || carbs == null || fat == null) {
      skipped++;
      continue;
    }
    seenCode.add(code);
    rows.push({
      ean: String(code),
      name: name.trim(),
      brand: null,
      serving_g: 100,
      serving_label: null,
      kcal_100g: kcal,
      protein_100g: protein,
      carbs_100g: carbs,
      fat_100g: fat,
      fibre_100g: num(r[COL.fibre]),
      sodium_100g: null,
      sugar_100g: num(r[COL.sugar]),
    });
  }

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'cofid-uk-snapshot',
      version: 1,
      generatedAt: new Date().toISOString(),
      rowCount: rows.length,
      sourceUrl: SOURCE_URL,
      source: 'McCance and Widdowson\'s Composition of Foods Integrated Dataset (CoFID), 7th edition, 2021',
      sourceLicense: 'Open Government Licence v3.0',
      attribution: 'Contains public sector information licensed under the Open Government Licence v3.0.',
      buildMs: ms,
      skippedRows: skipped,
    },
    rows,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const bytes = fs.statSync(OUT_PATH).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  log(`wrote ${rows.length.toLocaleString()} rows (${mb} MB) in ${ms}ms`);
  log(`skipped ${skipped} rows (missing fields, duplicates, or non-data)`);
  log('done.');
})().catch((e) => {
  err('fatal:', e.message);
  err(e.stack);
  process.exit(1);
});
