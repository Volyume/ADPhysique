/**
 * withHealthConnectPermissionDelegate
 *
 * Expo config plugin that registers the Health Connect permission delegate in
 * MainActivity. react-native-health-connect (v2+) requires
 *
 *   HealthConnectPermissionDelegate.setPermissionDelegate(this)
 *
 * in MainActivity.onCreate. Without it the permission request crashes with
 * UninitializedPropertyAccessException (the lateinit requestPermission launcher
 * is never initialised), so the system permission dialog never appears. This
 * is documented in the library README under "Installation" for v2 onwards.
 *
 * Volyume uses Expo prebuild, and `expo prebuild --clean` regenerates
 * MainActivity from the template on every build, wiping any manual edit. This
 * plugin re-inserts the import and the call on every prebuild so the delegate
 * is always registered in the shipped APK.
 *
 * The string transform (applyToMainActivity) is exported separately so it can
 * be unit tested without running a prebuild. It is idempotent: running it on
 * an already-patched file is a no-op, and it throws loudly if the expected
 * anchors are missing rather than silently leaving the crash in place.
 *
 * Library namespace confirmed against react-native-health-connect (matinzd):
 * dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

const { withMainActivity } = require('@expo/config-plugins');

const IMPORT_PATH = 'dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CALL_BASE = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

function addImport(src, importLine) {
  if (src.includes(importLine)) return src;
  const pkg = src.match(/^package .*$/m);
  if (!pkg) {
    throw new Error(
      '[withHealthConnectPermissionDelegate] no package declaration found in MainActivity; cannot add the import.',
    );
  }
  return src.replace(pkg[0], `${pkg[0]}\n\n${importLine}`);
}

function addDelegateCall(src, call) {
  // Idempotent: if any setPermissionDelegate call is already present, leave it.
  if (src.includes('setPermissionDelegate(')) return src;
  const superCall = src.match(/super\.onCreate\([^)]*\)/);
  if (!superCall) {
    throw new Error(
      '[withHealthConnectPermissionDelegate] no super.onCreate(...) call found in MainActivity; cannot register the delegate.',
    );
  }
  return src.replace(superCall[0], `${superCall[0]}\n    ${call}`);
}

/**
 * Patch a MainActivity source string. language is 'java' or 'kt' (default kt).
 * Java statements take a trailing semicolon; Kotlin does not.
 */
function applyToMainActivity(contents, language) {
  const isJava = language === 'java';
  const importLine = isJava ? `import ${IMPORT_PATH};` : `import ${IMPORT_PATH}`;
  const call = isJava ? `${CALL_BASE};` : CALL_BASE;
  return addDelegateCall(addImport(contents, importLine), call);
}

const withHealthConnectPermissionDelegate = (config) =>
  withMainActivity(config, (cfg) => {
    cfg.modResults.contents = applyToMainActivity(
      cfg.modResults.contents,
      cfg.modResults.language,
    );
    return cfg;
  });

module.exports = withHealthConnectPermissionDelegate;
module.exports.applyToMainActivity = applyToMainActivity;
