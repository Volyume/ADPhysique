#!/usr/bin/env node
/**
 * buildOffSnapshot.js
 *
 * Generates assets/seed/off_uk_snapshot.json from the OpenFoodFacts
 * daily JSONL dump. Streams the gzipped dump (~10 GB compressed,
 * ~40 GB uncompressed JSONL) line by line, decodes each product
 * record, keeps the ones tagged country=united-kingdom with usable
 * macros, and writes them to the bundled snapshot file.
 *
 * The output file is bundled into the APK and imported into the
 * local foods cache by src/lib/food/seed.js on first launch.
 *
 * Run this BEFORE each EAS build (or let the weekly GitHub Actions
 * workflow do it):
 *
 *   node scripts/seed/buildOffSnapshot.js
 *
 * Memory: streaming parse, constant ~50 MB regardless of dump size.
 * Disk: ~10 GB scratch for the .gz; deleted at end of run.
 * Runtime: ~10-20 minutes on GitHub Actions ubuntu-latest.
 *
 * Source: OpenFoodFacts daily dump, JSONL.gz format, ODbL 1.0.
 *   https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz
 */
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const zlib = require('node:zlib');
const readline = require('node:readline');
const os = require('node:os');

const DUMP_URL = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
const USER_AGENT = 'Volyume-Snapshot-Builder/2.0 (https://volyume.app)';
const UK_TAG = 'en:united-kingdom';
const OUT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'off_uk_snapshot.json');
const TMP_GZ_PATH = path.join(os.tmpdir(), 'off-products.jsonl.gz');
const PROGRESS_EVERY_LINES = 100_000;

function log(...args) { console.log('[off-snapshot]', ...args); }
function warn(...args) { console.warn('[off-snapshot]', ...args); }
function err(...args) { console.error('[off-snapshot]', ...args); }

function num(v) {
  if (v == null) return null;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function isUkProduct(product) {
  const tags = product?.countries_tags;
  if (!Array.isArray(tags) || tags.length === 0) return false;
  return tags.includes(UK_TAG);
}

function toRow(product) {
  if (!product) return null;
  const n = product.nutriments || {};
  const kcal = num(n['energy-kcal_100g'])
    ?? (num(n.energy_100g) != null ? num(n.energy_100g) / 4.184 : null);
  const row = {
    ean: product.code || null,
    name: product.product_name || product.product_name_en || product.generic_name || null,
    brand: product.brands || null,
    serving_g: num(product.serving_quantity),
    serving_label: product.serving_size || null,
    kcal_100g: kcal,
    protein_100g: num(n.proteins_100g),
    carbs_100g: num(n.carbohydrates_100g),
    fat_100g: num(n.fat_100g),
    fibre_100g: num(n.fiber_100g),
    sodium_100g: num(n.sodium_100g),
    sugar_100g: num(n.sugars_100g),
  };
  if (!row.ean || !row.name) return null;
  if (row.kcal_100g == null || row.protein_100g == null
      || row.carbs_100g == null || row.fat_100g == null) {
    return null;
  }
  return row;
}

function downloadDump(url, destPath) {
  return new Promise((resolve, reject) => {
    log(`downloading ${url}`);
    log(`destination: ${destPath}`);
    const t0 = Date.now();
    let bytes = 0;
    let lastProgressBytes = 0;

    const file = fs.createWriteStream(destPath);
    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Encoding': 'identity' },
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadDump(res.headers.location, destPath).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        return reject(new Error(`dump download returned HTTP ${res.statusCode}`));
      }
      const totalLen = parseInt(res.headers['content-length'], 10) || 0;
      res.on('data', (chunk) => {
        bytes += chunk.length;
        if (bytes - lastProgressBytes >= 500 * 1024 * 1024) {
          const mb = (bytes / 1024 / 1024).toFixed(0);
          const totalMb = totalLen ? (totalLen / 1024 / 1024).toFixed(0) : '?';
          log(`downloaded ${mb} MB / ${totalMb} MB`);
          lastProgressBytes = bytes;
        }
      });
      res.pipe(file);
      file.on('finish', () => {
        file.close((closeErr) => {
          if (closeErr) return reject(closeErr);
          const ms = Date.now() - t0;
          const mb = (bytes / 1024 / 1024).toFixed(1);
          log(`download complete: ${mb} MB in ${(ms / 1000).toFixed(1)}s`);
          resolve();
        });
      });
    });
    req.on('error', (e) => {
      file.close();
      try { fs.unlinkSync(destPath); } catch (_) { /* tolerate */ }
      reject(e);
    });
    req.setTimeout(15 * 60 * 1000, () => {
      req.destroy(new Error('download timed out after 15 minutes'));
    });
  });
}

async function streamFilter(gzPath) {
  const t0 = Date.now();
  const seenEan = new Set();
  const rows = [];
  let lines = 0;
  let parsed = 0;
  let ukMatched = 0;
  let kept = 0;
  let parseErrors = 0;

  const gz = fs.createReadStream(gzPath);
  const gunzip = zlib.createGunzip();
  const rl = readline.createInterface({
    input: gz.pipe(gunzip),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    lines++;
    if (lines % PROGRESS_EVERY_LINES === 0) {
      log(`lines=${lines.toLocaleString()} ukMatched=${ukMatched.toLocaleString()} kept=${kept.toLocaleString()}`);
    }
    if (!line) continue;
    let product;
    try {
      product = JSON.parse(line);
      parsed++;
    } catch (_) {
      parseErrors++;
      continue;
    }
    if (!isUkProduct(product)) continue;
    ukMatched++;
    const row = toRow(product);
    if (!row) continue;
    if (seenEan.has(row.ean)) continue;
    seenEan.add(row.ean);
    rows.push(row);
    kept++;
  }

  const ms = Date.now() - t0;
  log(`stream complete: lines=${lines.toLocaleString()} parsed=${parsed.toLocaleString()} ukMatched=${ukMatched.toLocaleString()} kept=${kept.toLocaleString()} parseErrors=${parseErrors} ms=${ms}`);
  return { rows, lines, parsed, ukMatched, parseErrors, streamMs: ms };
}

(async function main() {
  const t0 = Date.now();
  log('starting full-dump UK snapshot build');
  log(`output: ${OUT_PATH}`);

  let downloadAttempt = 0;
  const MAX_DOWNLOAD_ATTEMPTS = 3;
  while (true) {
    downloadAttempt++;
    try {
      await downloadDump(DUMP_URL, TMP_GZ_PATH);
      break;
    } catch (e) {
      warn(`download attempt ${downloadAttempt} failed: ${e.message}`);
      if (downloadAttempt >= MAX_DOWNLOAD_ATTEMPTS) {
        err('all download attempts exhausted');
        process.exit(1);
      }
      const backoff = 10_000 * downloadAttempt;
      log(`retrying in ${backoff / 1000}s`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  const stats = await streamFilter(TMP_GZ_PATH);

  try { fs.unlinkSync(TMP_GZ_PATH); } catch (_) { /* tolerate */ }

  const ms = Date.now() - t0;
  const out = {
    _meta: {
      format: 'off-uk-snapshot',
      version: 2,
      generatedAt: new Date().toISOString(),
      rowCount: stats.rows.length,
      source: 'openfoodfacts.org full JSONL dump, filtered to countries_tags contains en:united-kingdom',
      sourceLicense: 'Open Database License (ODbL) 1.0',
      buildMs: ms,
      linesScanned: stats.lines,
      ukMatched: stats.ukMatched,
      parseErrors: stats.parseErrors,
    },
    rows: stats.rows,
  };

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const bytes = fs.statSync(OUT_PATH).size;
  const mb = (bytes / 1024 / 1024).toFixed(2);
  log(`wrote ${stats.rows.length.toLocaleString()} rows (${mb} MB) in ${ms}ms`);
  log('done. commit assets/seed/off_uk_snapshot.json + push.');
})().catch((e) => {
  err('fatal:', e.message);
  err(e.stack);
  process.exit(1);
});
