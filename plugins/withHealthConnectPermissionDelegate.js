/**
 * withHealthConnectPermissionDelegate
 *
 * Expo config plugin that wires Health Connect into the Android build so the
 * system permission dialog actually launches and Volyume shows up in Health
 * Connect's "App permissions" list. It does three things, all of which are
 * required on a modern (Android 14+) device:
 *
 *   1. Registers the permission delegate in MainActivity.onCreate
 *      (HealthConnectPermissionDelegate.setPermissionDelegate(this)). Without
 *      it the lateinit requestPermission launcher is never initialised and the
 *      request throws UninitializedPropertyAccessException.
 *
 *   2. Writes a PermissionsRationaleActivity that displays Volyume's privacy
 *      policy. Health Connect requires a permissions-rationale Activity: it is
 *      the screen reached from the "privacy policy" link in the consent sheet.
 *
 *   3. Declares, in AndroidManifest.xml, the PermissionsRationaleActivity and
 *      the ViewPermissionUsageActivity activity-alias
 *      (android.intent.action.VIEW_PERMISSION_USAGE +
 *      android.intent.category.HEALTH_PERMISSIONS). On Android 14 and later
 *      Health Connect is part of the OS framework and uses that alias to
 *      decide whether an app is a valid Health Connect client. Without it the
 *      framework will not register the app, the permission request resolves
 *      with an empty grant set, and no dialog ever appears. This is the bit the
 *      library's own Expo plugin (react-native-health-connect/app.plugin.js)
 *      does NOT add: it only pushes the pre-14 ACTION_SHOW_PERMISSIONS_RATIONALE
 *      filter onto MainActivity, which is not sufficient on Android 14+.
 *
 * Why a config plugin and not a manual edit: Volyume uses Expo prebuild, and
 * `expo prebuild --clean` regenerates MainActivity and AndroidManifest.xml from
 * the template on every build, wiping manual edits. This plugin re-applies the
 * three changes on every prebuild so they are always present in the shipped APK.
 *
 * The pure string/object transforms (applyToMainActivity, addRationaleToManifest,
 * buildRationaleActivitySource) are exported separately so they can be unit
 * tested without running a prebuild. applyToMainActivity is idempotent and
 * throws loudly if the expected anchors are missing rather than silently
 * leaving the crash in place; addRationaleToManifest is idempotent too.
 *
 * Library namespace confirmed against react-native-health-connect (matinzd):
 * dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate.
 * Manifest shape confirmed against the matinzd permissions docs and the
 * official Android Health Connect "get started" guide.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

const path = require('path');
const fs = require('fs');
const {
  withMainActivity,
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require('@expo/config-plugins');

const IMPORT_PATH = 'dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const CALL_BASE = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

// Where the rationale WebView sends the user. Must match the privacy policy
// shown in the Play Console listing (Health Connect rule). Kept in sync by
// hand with src/lib/links.js privacyPolicy.
const PRIVACY_POLICY_URL = 'https://volyume.app/privacy';

const RATIONALE_ACTION = 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE';
const VIEW_PERMISSION_USAGE_ACTION = 'android.intent.action.VIEW_PERMISSION_USAGE';
const HEALTH_PERMISSIONS_CATEGORY = 'android.intent.category.HEALTH_PERMISSIONS';
const RATIONALE_ACTIVITY_NAME = '.PermissionsRationaleActivity';
const VIEW_USAGE_ALIAS_NAME = 'ViewPermissionUsageActivity';

// ─── 1. MainActivity delegate registration ───────────────────────────────

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

// ─── 2. PermissionsRationaleActivity source ───────────────────────────────

/**
 * Kotlin source for the rationale screen. Extends android.app.Activity (always
 * present, no AppCompat dependency needed) and shows the privacy policy in a
 * WebView. packageName is the app's Android package (e.g. app.volyume).
 */
function buildRationaleActivitySource(packageName, url = PRIVACY_POLICY_URL) {
  return `package ${packageName}

import android.app.Activity
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * Health Connect permissions rationale. Reached from the "privacy policy"
 * link in the Health Connect consent sheet, and required on Android 14+ via
 * the ViewPermissionUsageActivity alias for the app to register as a valid
 * Health Connect client. Generated by plugins/withHealthConnectPermissionDelegate.js.
 */
class PermissionsRationaleActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val webView = WebView(this)
    webView.webViewClient = object : WebViewClient() {
      override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean = false
    }
    webView.loadUrl("${url}")
    setContentView(webView)
  }
}
`;
}

function writeRationaleActivity(projectRoot, packageName) {
  const pkgPath = packageName.replace(/\./g, path.sep);
  const dir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', pkgPath);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'PermissionsRationaleActivity.kt');
  fs.writeFileSync(file, buildRationaleActivitySource(packageName), 'utf8');
  return file;
}

// ─── 3. Manifest: rationale activity + Android 14 usage alias ──────────────

function hasActivity(application, name) {
  return (application.activity || []).some((a) => a?.$?.['android:name'] === name);
}

function hasAlias(application, name) {
  return (application['activity-alias'] || []).some((a) => a?.$?.['android:name'] === name);
}

/**
 * Add the PermissionsRationaleActivity and the ViewPermissionUsageActivity
 * alias to a parsed AndroidManifest (the object shape used by
 * @expo/config-plugins withAndroidManifest). Idempotent: re-running leaves a
 * single copy of each. Returns the same manifest object for chaining.
 */
function addRationaleToManifest(androidManifest) {
  const application = androidManifest.manifest.application?.[0];
  if (!application) {
    throw new Error(
      '[withHealthConnectPermissionDelegate] no <application> in AndroidManifest; cannot add the rationale activity.',
    );
  }

  if (!hasActivity(application, RATIONALE_ACTIVITY_NAME)) {
    application.activity = application.activity || [];
    application.activity.push({
      $: {
        'android:name': RATIONALE_ACTIVITY_NAME,
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': RATIONALE_ACTION } }],
        },
      ],
    });
  }

  if (!hasAlias(application, VIEW_USAGE_ALIAS_NAME)) {
    application['activity-alias'] = application['activity-alias'] || [];
    application['activity-alias'].push({
      $: {
        'android:name': VIEW_USAGE_ALIAS_NAME,
        'android:exported': 'true',
        'android:targetActivity': RATIONALE_ACTIVITY_NAME,
        'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
      },
      'intent-filter': [
        {
          action: [{ $: { 'android:name': VIEW_PERMISSION_USAGE_ACTION } }],
          category: [{ $: { 'android:name': HEALTH_PERMISSIONS_CATEGORY } }],
        },
      ],
    });
  }

  return androidManifest;
}

// ─── Plugin wiring ─────────────────────────────────────────────────────────

const withHealthConnectPermissionDelegate = (config) => {
  let next = withMainActivity(config, (cfg) => {
    cfg.modResults.contents = applyToMainActivity(
      cfg.modResults.contents,
      cfg.modResults.language,
    );
    return cfg;
  });

  next = withAndroidManifest(next, (cfg) => {
    addRationaleToManifest(cfg.modResults);
    return cfg;
  });

  next = withDangerousMod(next, [
    'android',
    (cfg) => {
      const packageName =
        AndroidConfig.Package.getPackage(cfg) || cfg.android?.package;
      if (!packageName) {
        throw new Error(
          '[withHealthConnectPermissionDelegate] no Android package name resolved; cannot write PermissionsRationaleActivity.',
        );
      }
      writeRationaleActivity(cfg.modRequest.projectRoot, packageName);
      return cfg;
    },
  ]);

  return next;
};

module.exports = withHealthConnectPermissionDelegate;
module.exports.applyToMainActivity = applyToMainActivity;
module.exports.addRationaleToManifest = addRationaleToManifest;
module.exports.buildRationaleActivitySource = buildRationaleActivitySource;
