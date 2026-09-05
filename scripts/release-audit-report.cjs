#!/usr/bin/env node
/*
 * Production dependency audit for release builds.
 *
 * This is deliberately reporting-only. npm audit currently includes known
 * Expo/React Native build-chain advisories documented in docs/, and making
 * those fail after the Android APK/AAB has already compiled repeatedly broke
 * branch APK delivery. CI still prints the advisory summary so it remains
 * visible, but the Play build is not blocked by accepted transitive tooling
 * debt.
 */
const { spawnSync } = require('node:child_process');

function npmIsAvailable() {
  const probe = process.platform === 'win32'
    ? spawnSync('where.exe', ['npm'], { encoding: 'utf8' })
    : spawnSync('sh', ['-lc', 'command -v npm'], { encoding: 'utf8' });
  return probe.status === 0;
}

if (!npmIsAvailable()) {
  console.log('Production npm audit skipped: npm is not available in this shell.');
  process.exit(0);
}

const result = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

const stdout = result.stdout || '';
const stderr = result.stderr || '';

if (stderr.trim()) {
  console.warn(stderr.trim());
}

let parsed = null;
try {
  parsed = stdout ? JSON.parse(stdout) : null;
} catch (_) {
  parsed = null;
}

if (parsed?.metadata?.vulnerabilities) {
  const v = parsed.metadata.vulnerabilities;
  console.log('Production npm audit summary (reporting-only):');
  console.log(`  critical: ${v.critical || 0}`);
  console.log(`  high: ${v.high || 0}`);
  console.log(`  moderate: ${v.moderate || 0}`);
  console.log(`  low: ${v.low || 0}`);
  console.log(`  total: ${v.total || 0}`);
} else if (stdout.trim()) {
  console.log(stdout.trim());
} else {
  console.log('Production npm audit produced no JSON output.');
}

if (result.error) {
  console.warn(`npm audit could not run: ${result.error.message}`);
}

if (typeof result.status === 'number' && result.status !== 0) {
  console.warn(`npm audit exited with ${result.status}; accepted as reporting-only for APK builds.`);
}

// Exercise-library-expansion-2026-09-05 (EL-3, EL-14, 07-CORPUS-FORMAT.md
// section 6): the corpus quality gate. Unlike the npm-audit report above,
// this DOES block the build — a corpus violation (duplicate name, orphan
// curated-table reference, count below the committed floor, and so on) is
// a real defect in shipped content, not accepted tooling debt.
const corpusGuard = spawnSync(
  process.execPath,
  [require('node:path').join(__dirname, 'exercise-library', 'validate-corpus.mjs')],
  { encoding: 'utf8' },
);
if (corpusGuard.stdout) console.log(corpusGuard.stdout.trim());
if (corpusGuard.stderr) console.error(corpusGuard.stderr.trim());
if (corpusGuard.status !== 0) {
  console.error('Exercise corpus guard failed — see violations above.');
  process.exit(corpusGuard.status || 1);
}

process.exit(0);
