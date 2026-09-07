// Small JSONL read/write helpers shared by the pipeline's orchestration
// scripts. Whole-file (not streaming) — fine at this pipeline's scale
// (tens of thousands of records); the raw per-source files are streamed by
// their own adapters instead.
//
// GD-24: the canonical file, merge decisions and both review files are
// committed gzipped (read/written through node:zlib) — readJsonlGz/
// writeJsonlGz below. The plain readJsonl/writeJsonl stay for
// data/gyms/_work/ (gitignored, never committed).

const fs = require('node:fs');
const zlib = require('node:zlib');

/**
 * @param {string} filePath
 * @returns {object[]}
 */
function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l) => JSON.parse(l));
}

/**
 * @param {string} filePath
 * @param {object[]} records
 */
function writeJsonl(filePath, records) {
  const body = records.map((r) => JSON.stringify(r)).join('\n');
  fs.writeFileSync(filePath, body.length > 0 ? `${body}\n` : '');
}

/**
 * @param {string} filePath - a `.jsonl.gz` path
 * @returns {object[]}
 */
function readJsonlGz(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = zlib.gunzipSync(fs.readFileSync(filePath)).toString('utf8');
  const lines = raw.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l) => JSON.parse(l));
}

/**
 * @param {string} filePath - a `.jsonl.gz` path
 * @param {object[]} records
 */
function writeJsonlGz(filePath, records) {
  const body = records.map((r) => JSON.stringify(r)).join('\n');
  const buf = Buffer.from(body.length > 0 ? `${body}\n` : '', 'utf8');
  fs.writeFileSync(filePath, zlib.gzipSync(buf));
}

module.exports = { readJsonl, writeJsonl, readJsonlGz, writeJsonlGz };
