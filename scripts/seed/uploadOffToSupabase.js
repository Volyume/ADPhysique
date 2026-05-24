#!/usr/bin/env node
/**
 * uploadOffToSupabase.js
 *
 * Reads assets/seed/off_uk_snapshot.json (produced by
 * buildOffSnapshot.js) and upserts every row into the Supabase
 * cloud `foods` table via service-role REST API. The cloud table
 * is the source of truth for the client-side delta puller
 * (src/lib/food/libraryDelta.js).
 *
 * Run after buildOffSnapshot.js. The bundled GitHub Actions
 * workflow does both in sequence.
 *
 * Required env vars (set as GitHub Actions secrets):
 *   SUPABASE_URL                 https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY    the service_role JWT (NOT the anon key)
 *
 * Idempotent: upsert with onConflict=(source,source_id) keeps re-
 * runs harmless and reflects any OFF updates back into cloud.
 *
 * Free: Supabase free tier + GitHub Actions free tier cover this
 * indefinitely for our scale. No paid services.
 */
const fs = require('node:fs');
const path = require('node:path');

const SNAPSHOT_PATH = path.resolve(__dirname, '..', '..', 'assets', 'seed', 'off_uk_snapshot.json');
const CHUNK_SIZE = 500;
const REQUEST_DELAY_MS = 200;

function log(...args) {
  // eslint-disable-next-line no-console
  console.log('[off-upload]', ...args);
}
function warn(...args) {
  // eslint-disable-next-line no-console
  console.warn('[off-upload]', ...args);
}
function err(...args) {
  // eslint-disable-next-line no-console
  console.error('[off-upload]', ...args);
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function cryptoUuid() {
  // Node 14.17+ has crypto.randomUUID; we depend on it via the
  // workflow's actions/setup-node@v4 (Node 20 default).
  // eslint-disable-next-line global-require
  return require('node:crypto').randomUUID();
}

async function upsertChunk(supabaseUrl, serviceRoleKey, rows) {
  const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/foods?on_conflict=source,source_id`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`upsert chunk failed: ${res.status} ${text.slice(0, 200)}`);
  }
}

(async function main() {
  const t0 = Date.now();
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    err('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
    process.exit(1);
  }

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    err(`snapshot not found at ${SNAPSHOT_PATH}; run buildOffSnapshot.js first`);
    process.exit(1);
  }

  const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  log(`source: ${SNAPSHOT_PATH}`);
  log(`rows: ${rows.length}`);
  log(`generatedAt: ${parsed?._meta?.generatedAt ?? 'unknown'}`);

  if (rows.length === 0) {
    log('placeholder snapshot (rowCount=0), nothing to upload');
    return;
  }

  const now = new Date().toISOString();
  const cloudRows = rows
    .filter(r => r && r.ean && r.name
      && r.kcal_100g != null && r.protein_100g != null
      && r.carbs_100g != null && r.fat_100g != null)
    .map(r => ({
      id: cryptoUuid(),
      source: 'off',
      source_id: r.ean,
      barcode_ean: r.ean,
      name: r.name,
      brand: r.brand ?? null,
      serving_g: r.serving_g ?? 100,
      serving_label: r.serving_label ?? null,
      kcal_100g: r.kcal_100g,
      protein_100g: r.protein_100g,
      carbs_100g: r.carbs_100g,
      fat_100g: r.fat_100g,
      fibre_100g: r.fibre_100g ?? null,
      sodium_100g: r.sodium_100g ?? null,
      sugar_100g: r.sugar_100g ?? null,
      verified: false,
      fetched_at: now,
      created_at: now,
      updated_at: now,
    }));

  log(`uploading ${cloudRows.length} rows in chunks of ${CHUNK_SIZE}`);

  let chunksOk = 0;
  let chunksFailed = 0;
  for (let i = 0; i < cloudRows.length; i += CHUNK_SIZE) {
    const chunk = cloudRows.slice(i, i + CHUNK_SIZE);
    try {
      await upsertChunk(supabaseUrl, serviceRoleKey, chunk);
      chunksOk++;
      log(`chunk ${chunksOk}/${Math.ceil(cloudRows.length / CHUNK_SIZE)} ok (rows ${i}-${i + chunk.length - 1})`);
    } catch (e) {
      chunksFailed++;
      warn(`chunk starting at ${i} failed: ${e.message}`);
      // Continue with the rest -- partial progress is still useful.
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const ms = Date.now() - t0;
  log(`done. ok=${chunksOk} failed=${chunksFailed} ms=${ms}`);
  if (chunksFailed > 0 && chunksOk === 0) {
    err('all chunks failed; treating as fatal');
    process.exit(1);
  }
})().catch((e) => {
  err('fatal:', e.message);
  process.exit(1);
});
