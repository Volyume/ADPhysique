#!/usr/bin/env node
/**
 * E3 search measurement harness (approved plan, part 3).
 *
 * Loads the REAL bundled corpora (assets/seed/off_uk_snapshot.dat 25,965 rows
 * + assets/seed/cofid_uk.dat 2,852 rows) into an in-memory SQLite
 * (node:sqlite, FTS5 compiled in, matching the shipped SQLCipher build) and
 * runs the fixed query set against BOTH local-search implementations:
 *
 *   - LIKE:  the pre-E3 searchLocalByName SQL (prefix-then-substring);
 *   - FTS5:  the E3 index (porter unicode61, prefix='2 3 4') + query, the
 *            same DDL src/lib/database.js#ensureFoodSearchIndex creates.
 *
 * The SQL here mirrors src/lib/food/sources/localCache.js (_searchLike /
 * _searchFts, globals only — customs are per-user and empty on a fresh
 * corpus). If those queries change, re-run this harness; the end-to-end
 * correctness of the shipped SQL is pinned separately by
 * src/lib/food/__tests__/localCacheFts.test.js against the real module.
 *
 * Node-side timings are a PROXY for on-device latency (order-of-magnitude,
 * same SQLite algorithms, faster CPU); the report pairs them with device-run
 * steps. Usage: node scripts/e3-search-harness.cjs
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');

function loadRows() {
  const off = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/seed/off_uk_snapshot.dat'), 'utf8'));
  const cofid = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/seed/cofid_uk.dat'), 'utf8'));
  return { off: off.rows, cofid: cofid.rows, offMeta: off._meta, cofidMeta: cofid._meta };
}

function buildDb(rows) {
  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE foods (
    id TEXT PRIMARY KEY, source TEXT, name TEXT, brand TEXT, verified INTEGER DEFAULT 0)`);
  const ins = db.prepare('INSERT INTO foods (id, source, name, brand, verified) VALUES (?, ?, ?, ?, ?)');
  let i = 0;
  for (const r of rows.off) ins.run(`off-${i++}`, 'off', r.name ?? 'Unknown', r.brand ?? null, 0);
  for (const r of rows.cofid) ins.run(`cofid-${i++}`, 'cofid', r.name ?? 'Unknown', null, 1);
  return db;
}

function buildFts(db) {
  const t0 = performance.now();
  db.exec(`CREATE VIRTUAL TABLE foods_fts USING fts5(
    name, brand, content='foods', content_rowid='rowid',
    tokenize='porter unicode61', prefix='2 3 4')`);
  db.exec(`INSERT INTO foods_fts(foods_fts) VALUES('rebuild')`);
  return performance.now() - t0;
}

// Mirrors localCache._searchLike (globals arm).
function searchLike(db, q, limit = 25) {
  return db.prepare(
    `SELECT name, brand,
       CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM foods WHERE lower(name) LIKE ?
     ORDER BY rank, verified DESC, lower(name) LIMIT ?`
  ).all(`${q}%`, `%${q}%`, limit);
}

// Mirrors localCache.toFtsMatch + _searchFts (globals arm).
function toFtsMatch(query) {
  const tokens = String(query || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `"${t.replace(/"/g, '')}"*`).join(' ');
}
function searchFts(db, q, limit = 25) {
  const match = toFtsMatch(q);
  if (!match) return [];
  return db.prepare(
    `SELECT f.name, f.brand,
       CASE WHEN lower(f.name) LIKE ? THEN 0 ELSE 1 END AS rank
     FROM foods_fts JOIN foods f ON f.rowid = foods_fts.rowid
     WHERE foods_fts MATCH ?
     ORDER BY rank, f.verified DESC, bm25(foods_fts) LIMIT ?`
  ).all(`${q}%`, match, limit);
}

// Fixed query set from the approved plan: misspellings, brand names,
// partials, multi-word — plus a relevance needle each result is checked
// against (case-insensitive substring over "name brand").
const QUERIES = [
  { q: 'chicken breast', needle: 'chicken breast', kind: 'exact multi-word' },
  { q: 'chick brea', needle: 'chicken breast', kind: 'partial multi-word' },
  { q: 'greek yog 0', needle: 'greek', kind: 'partial + noise token' },
  { q: 'whole br', needle: 'wholemeal', kind: 'partial words' },
  { q: 'porridge oats', needle: 'porridge', kind: 'multi-word' },
  { q: 'peanut butter smooth', needle: 'peanut butter', kind: 'three words' },
  { q: 'hovis', needle: 'hovis', kind: 'brand only' },
  { q: 'warburtons', needle: 'warburtons', kind: 'brand only' },
  { q: 'cadbury', needle: 'cadbury', kind: 'brand only' },
  { q: 'semi skimmed milk', needle: 'semi', kind: 'multi-word' },
  { q: 'baked beans', needle: 'baked beans', kind: 'multi-word' },
  { q: 'eggs', needle: 'egg', kind: 'plural stem' },
  { q: 'chiken', needle: 'chicken', kind: 'misspelling' },
  { q: 'brocolli', needle: 'broccoli', kind: 'misspelling' },
  { q: 'yougurt', needle: 'yoghurt', kind: 'misspelling' },
];

function relevantAt(rows, needle) {
  const idx = rows.findIndex((r) => `${r.name ?? ''} ${r.brand ?? ''}`.toLowerCase().includes(needle));
  return idx === -1 ? null : idx + 1; // 1-based position, null = not in top 25
}

function timeIt(fn, runs = 15) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(times.length / 2)]; // median
}

function main() {
  const rows = loadRows();
  console.log(`corpus: OFF ${rows.off.length} rows (${rows.offMeta.generatedAt}), CoFID ${rows.cofid.length} rows`);
  const db = buildDb(rows);
  const ftsBuildMs = buildFts(db);
  console.log(`FTS index build (full rebuild over ${rows.off.length + rows.cofid.length} rows): ${ftsBuildMs.toFixed(0)} ms\n`);

  console.log('| query | kind | LIKE hits | LIKE hit@ | LIKE ms | FTS hits | FTS hit@ | FTS ms |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const { q, needle, kind } of QUERIES) {
    const likeRows = searchLike(db, q.toLowerCase());
    const ftsRows = searchFts(db, q);
    const likeMs = timeIt(() => searchLike(db, q.toLowerCase()));
    const ftsMs = timeIt(() => searchFts(db, q));
    const fmt = (p) => (p == null ? 'miss' : `#${p}`);
    console.log(`| ${q} | ${kind} | ${likeRows.length} | ${fmt(relevantAt(likeRows, needle))} | ${likeMs.toFixed(1)} | ${ftsRows.length} | ${fmt(relevantAt(ftsRows, needle))} | ${ftsMs.toFixed(1)} |`);
  }
}

main();
