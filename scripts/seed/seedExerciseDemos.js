#!/usr/bin/env node
/**
 * seedExerciseDemos.js
 *
 * Build-time seeder for exercise demonstration media (Phase 2). Runs ONCE
 * (and again only to refresh): pulls the exercise set from the WorkoutX REST
 * API, downloads each animated demonstration, uploads it to the EU Supabase
 * Storage bucket `exercise-demos` (migration 073), and PATCHes the matching
 * canonical row in the `exercises` table (migration 072) with the self-hosted
 * demo_url + structured form_cues. After this runs, the app serves media from
 * our own CDN with zero ongoing WorkoutX calls (offline-first preserved).
 *
 *   node scripts/seed/seedExerciseDemos.js          # skip already-populated
 *   node scripts/seed/seedExerciseDemos.js --force   # re-upload everything
 *   node scripts/seed/seedExerciseDemos.js --dry-run # match + report, no writes
 *
 * Required env vars:
 *   WORKOUTX_API_KEY            WorkoutX API key (free tier: 500 req/month)
 *   SUPABASE_URL                https://<project>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   the service_role JWT (NOT the anon key)
 * Optional:
 *   WORKOUTX_BASE_URL           default https://api.workoutxapp.com
 *   DEMOS_BUCKET                default exercise-demos
 *
 * Idempotent: storage upload uses x-upsert; the PATCH is a plain overwrite;
 * re-runs are harmless. Matches WorkoutX exercises to our canonical rows
 * (user_id IS NULL) by normalised name, falling back to aliases.
 *
 * LICENCE / ATTRIBUTION: the WorkoutX demonstration corpus derives from the
 * Everkinetic exercise library (Creative Commons Attribution-ShareAlike 3.0).
 * Redistribution therefore carries attribution + share-alike obligations,
 * surfaced verbatim in src/screens/CreditsScreen.js. A direct redistribution
 * grant has been requested from WorkoutX in parallel; see docs/rules.
 *
 * !!! The WorkoutX request/response shape below is isolated in
 *     fetchWorkoutXExercises() + mapWorkoutXExercise(). VERIFY both against
 *     the live WorkoutX API docs before the first real run — the endpoint
 *     path, auth header name, pagination, and field names are best-effort.
 */
const REQUEST_DELAY_MS = 150;
const PAGE_SIZE = 100;

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const DRY_RUN = args.has('--dry-run');

function log(...a) { console.log('[demos]', ...a); }       // eslint-disable-line no-console
function warn(...a) { console.warn('[demos]', ...a); }     // eslint-disable-line no-console
function err(...a) { console.error('[demos]', ...a); }     // eslint-disable-line no-console
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// Normalise an exercise name for fuzzy matching across the two datasets:
// lowercase, strip anything non-alphanumeric, collapse to bare tokens.
function normaliseName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// ── WorkoutX adapter (VERIFY against live API docs) ──────────────────
async function fetchWorkoutXExercises(baseUrl, apiKey) {
  const out = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const url = `${baseUrl.replace(/\/$/, '')}/exercises?limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'x-api-key': apiKey, Accept: 'application/json' } });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`WorkoutX fetch failed: ${res.status} ${t.slice(0, 200)}`);
    }
    const body = await res.json();
    // Accept either a bare array or { data: [...] } envelope.
    const page = Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []);
    out.push(...page);
    log(`workoutx: fetched ${page.length} (offset ${offset}, total ${out.length})`);
    if (page.length < PAGE_SIZE) break;
    await sleep(REQUEST_DELAY_MS);
  }
  return out;
}

// Map one raw WorkoutX record to the fields we store. Tolerant of field-name
// variants; returns null if there is no usable media URL.
function mapWorkoutXExercise(raw) {
  const name = raw?.name ?? raw?.exercise ?? raw?.title ?? null;
  const gifUrl = raw?.gifUrl ?? raw?.gif_url ?? raw?.gif ?? raw?.imageUrl ?? null;
  if (!name || !gifUrl) return null;
  const steps = Array.isArray(raw?.instructions) ? raw.instructions
    : Array.isArray(raw?.steps) ? raw.steps
      : (typeof raw?.instructions === 'string' ? raw.instructions.split(/\r?\n/).filter(Boolean) : []);
  const mistakes = Array.isArray(raw?.commonMistakes) ? raw.commonMistakes
    : Array.isArray(raw?.common_mistakes) ? raw.common_mistakes : null;
  return {
    name,
    gifUrl,
    formCues: { setup: [], execution: steps, cues: [] },
    commonMistakes: mistakes,
  };
}

// ── Supabase REST helpers (service-role) ─────────────────────────────
async function fetchCanonicalExercises(supabaseUrl, key) {
  const url = `${supabaseUrl}/rest/v1/exercises?user_id=is.null&select=id,name,aliases,demo_url&limit=10000`;
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`canonical fetch failed: ${res.status} ${await res.text().catch(() => '')}`);
  return res.json();
}

async function uploadMedia(supabaseUrl, key, bucket, path, bytes, contentType) {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  });
  if (!res.ok) throw new Error(`upload ${path} failed: ${res.status} ${await res.text().catch(() => '')}`);
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

async function patchExercise(supabaseUrl, key, id, patch) {
  const res = await fetch(`${supabaseUrl}/rest/v1/exercises?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patch ${id} failed: ${res.status} ${await res.text().catch(() => '')}`);
}

(async function main() {
  const t0 = Date.now();
  const apiKey = process.env.WORKOUTX_API_KEY;
  const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const baseUrl = process.env.WORKOUTX_BASE_URL || 'https://api.workoutxapp.com';
  const bucket = process.env.DEMOS_BUCKET || 'exercise-demos';

  if (!supabaseUrl || !serviceRoleKey) { err('missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
  if (!apiKey && !DRY_RUN) { err('missing WORKOUTX_API_KEY'); process.exit(1); }

  // Index our canonical exercises by normalised name + aliases.
  const canonical = await fetchCanonicalExercises(supabaseUrl, serviceRoleKey);
  log(`canonical exercises: ${canonical.length}`);
  const byName = new Map();
  for (const ex of canonical) {
    byName.set(normaliseName(ex.name), ex);
    for (const a of (ex.aliases || [])) byName.set(normaliseName(a), ex);
  }

  const workoutx = apiKey ? await fetchWorkoutXExercises(baseUrl, apiKey) : [];
  log(`workoutx exercises: ${workoutx.length}`);

  let matched = 0; let uploaded = 0; let skipped = 0; let unmatched = 0; let failed = 0;

  for (const raw of workoutx) {
    const m = mapWorkoutXExercise(raw);
    if (!m) continue;
    const target = byName.get(normaliseName(m.name));
    if (!target) { unmatched++; continue; }
    matched++;

    if (target.demo_url && !FORCE) { skipped++; continue; }
    if (DRY_RUN) { log(`would seed: ${m.name} -> ${target.id}`); continue; }

    try {
      const gifRes = await fetch(m.gifUrl);
      if (!gifRes.ok) throw new Error(`gif download ${gifRes.status}`);
      const contentType = gifRes.headers.get('content-type') || 'image/gif';
      const ext = contentType.includes('webp') ? 'webp' : 'gif';
      const bytes = Buffer.from(await gifRes.arrayBuffer());
      const path = `exercises/${target.id}.${ext}`;
      const publicUrl = await uploadMedia(supabaseUrl, serviceRoleKey, bucket, path, bytes, contentType);
      await patchExercise(supabaseUrl, serviceRoleKey, target.id, {
        demo_url: publicUrl,
        form_cues: m.formCues,
        common_mistakes: m.commonMistakes,
      });
      uploaded++;
      log(`seeded ${m.name} (${(bytes.length / 1024).toFixed(0)} KB)`);
    } catch (e) {
      failed++;
      warn(`failed ${m.name}: ${e.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s — matched=${matched} uploaded=${uploaded} skipped=${skipped} unmatched=${unmatched} failed=${failed}`);
  log('reminder: CC BY-SA 3.0 attribution is surfaced in CreditsScreen — keep it.');
})().catch((e) => { err('fatal:', e.message); process.exit(1); });
