#!/usr/bin/env node
/**
 * Make the Android expo-sqlite build compile SQLCipher, unconditionally.
 *
 * Incident 2026-09-04: app.json asks for SQLCipher (expo-sqlite plugin,
 * useSQLCipher: true) and prebuild writes expo.sqlite.useSQLCipher=true into
 * android/gradle.properties, yet the packaged libexpo-sqlite.so in builds
 * 3559 to 3563 carried no codec (verified by scripts/verify-android-sqlcipher.cjs),
 * so every fresh install aborted at "Couldn't open your data". The module's
 * build.gradle switches the codec on with
 *   USE_SQLCIPHER = findProperty('expo.sqlite.useSQLCipher') == 'true'
 * and that expression evaluated false in CI. Rather than depend on property
 * plumbing that has now failed five builds in a row, this pins the switch to
 * true in the module's build script after npm ci. The post-build binary gate
 * still proves the result.
 *
 * Idempotent; fails loudly if the line it expects is not there (a future
 * expo-sqlite may move it, and a silent no-op would reintroduce the outage).
 */
const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'node_modules', 'expo-sqlite', 'android', 'build.gradle');
if (!fs.existsSync(file)) { console.error(`::error::${file} not found`); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
const pinned = "USE_SQLCIPHER = true // pinned by scripts/force-sqlcipher-android.cjs (incident 2026-09-04)";
if (src.includes(pinned)) { console.log('ok: expo-sqlite build.gradle already pins USE_SQLCIPHER=true'); process.exit(0); }
const original = "USE_SQLCIPHER = findProperty('expo.sqlite.useSQLCipher') == 'true'";
if (!src.includes(original)) {
  console.error(`::error::expo-sqlite build.gradle no longer contains the expected line: ${original}. Update scripts/force-sqlcipher-android.cjs before building.`);
  process.exit(1);
}
src = src.replace(original, pinned);
fs.writeFileSync(file, src);
console.log('ok: pinned USE_SQLCIPHER=true in node_modules/expo-sqlite/android/build.gradle');
