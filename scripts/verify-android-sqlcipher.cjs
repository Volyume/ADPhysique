#!/usr/bin/env node
/**
 * Fails the Android build unless the packaged expo-sqlite native library was
 * compiled WITH SQLCipher.
 *
 * Why this exists (incident 2026-09-04): app.json asks expo-sqlite for
 * SQLCipher (useSQLCipher: true, since 2026-08-30) and the database open
 * fails CLOSED on a fresh install when the codec is absent (dbCrypto,
 * 2026-09-01). Builds 3559-3561 shipped a library without the codec, so
 * every fresh install aborted with "Couldn't open your data". Nothing in
 * the pipeline checked the binary; this does.
 *
 * Usage: node scripts/verify-android-sqlcipher.cjs <apk-or-aab> [...]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(msg) { console.error(`::error::${msg}`); process.exit(1); }

function extractZip(file) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sqlcipher-verify-'));
  const r = spawnSync('unzip', ['-qq', file, '-d', tmp], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`Could not unzip ${file}: ${r.stderr || r.stdout || 'unzip failed'}`);
  return tmp;
}
function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

// Byte-level markers that exist only in a SQLCipher-compiled sqlite3.
// "sqlcipher_extra_init" is the SQLITE_EXTRA_INIT hook expo-sqlite passes in
// its build flags; "PRAGMA cipher_version" copy lives in SQLCipher's own
// codec source. A plain SQLite build contains neither.
const MARKERS = ['sqlcipher_extra_init', 'cipher_version'];

const inputs = process.argv.slice(2);
if (inputs.length === 0) fail('usage: verify-android-sqlcipher.cjs <apk-or-aab> [...]');

let checked = 0;
for (const input of inputs) {
  if (!fs.existsSync(input)) fail(`${input} does not exist`);
  const tmp = extractZip(input);
  const libs = walk(tmp).filter((p) => /libexpo-sqlite\.so$/.test(p));
  if (libs.length === 0) fail(`${input}: no libexpo-sqlite.so packaged at all`);
  for (const lib of libs) {
    const buf = fs.readFileSync(lib);
    const missing = MARKERS.filter((m) => buf.indexOf(Buffer.from(m, 'ascii')) === -1);
    const abi = path.basename(path.dirname(lib));
    if (missing.length) {
      fail(`${input}: ${abi}/libexpo-sqlite.so was built WITHOUT SQLCipher (missing markers: ${missing.join(', ')}). ` +
        'expo.sqlite.useSQLCipher=true did not reach the Gradle build. Refusing to ship a build whose fresh installs cannot open their database.');
    }
    console.log(`ok: ${input}: ${abi}/libexpo-sqlite.so carries SQLCipher (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
    checked += 1;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
if (checked === 0) fail('no libexpo-sqlite.so verified');
console.log(`SQLCipher verified in ${checked} native librar${checked === 1 ? 'y' : 'ies'}.`);
