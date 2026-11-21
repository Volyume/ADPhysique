/**
 * The trial build's identity (LOC-413, kit trial 3).
 *
 * The founder tests the React Native Reusables trial from the branch
 * `trial/rn-reusables` as a SEPARATE app that installs beside the store app,
 * never over it. app.json is static JSON and `APP_VARIANT` was declared in
 * eas.json but read by nothing (docs/release-readiness-2026-08-11/
 * SHIPPING-ARCHITECTURE.md section 6d), so every profile built `app.volyume`.
 * `app.config.js` now passes app.json through this function: with any
 * APP_VARIANT other than `trial` the config is returned UNCHANGED, which is
 * what a build from main gets.
 *
 * With APP_VARIANT=trial:
 *   - iOS bundle id and Android package become `app.volyume.trial`, so the
 *     phone treats it as a different app (own data, own icon, own permissions)
 *   - the home-screen name becomes "Volyume Trial"
 *   - the over-the-air channel becomes `trial`, which nothing ever publishes to
 *   - Associated Domains and the https App Links are dropped: they belong to
 *     `app.volyume` (apple-app-site-association / assetlinks list that id)
 *   - TRIAL_VERSION_CODE (CI run number) sets the Android versionCode, so a
 *     newer trial APK installs over an older trial APK
 *   - the trial reports nothing to the live app's error tracking (LOC-648):
 *     the Sentry config plugin is dropped, so no native build step uploads
 *     source maps or debug symbols to the live Sentry project, and
 *     `extra.appVariant` is `trial`, which src/lib/sentry.js reads to start no
 *     Sentry client even if EXPO_PUBLIC_SENTRY_DSN reached the bundle. This is
 *     done HERE, in the app's own config, because Expo's documentation does not
 *     say whether an eas.json `env` value or a variable stored on expo.dev wins
 *     when both name the same variable, and the production workflow stores the
 *     DSN and token as project secrets that a trial build on the same project
 *     could receive. A guard that does not depend on that order holds either way.
 *
 * Deliberately unchanged: slug and EAS project id (they tie the build to the
 * project), the `volyume` link scheme (the auth redirects expect it), and
 * everything else. Pure function, no I/O.
 */

const TRIAL_VARIANT = 'trial';
const TRIAL_APP_ID = 'app.volyume.trial';
const TRIAL_NAME = 'Volyume Trial';
const TRIAL_CHANNEL = 'trial';
// The Expo config plugin that adds the Sentry source-map and symbol upload to the
// native build (Gradle plugin on Android, build phases on iOS).
const SENTRY_PLUGIN = '@sentry/react-native/expo';

function applyTrialIdentity(config, env = {}) {
  if (!env || env.APP_VARIANT !== TRIAL_VARIANT) return config;

  const android = { ...(config.android || {}), package: TRIAL_APP_ID };
  if (Array.isArray(android.intentFilters)) {
    android.intentFilters = android.intentFilters.filter(
      (filter) => !(filter.data || []).some((d) => d.scheme === 'https'),
    );
  }
  const versionCode = parseInt(env.TRIAL_VERSION_CODE, 10);
  if (Number.isInteger(versionCode) && versionCode > 0) android.versionCode = versionCode;

  const { associatedDomains, ...ios } = config.ios || {}; // eslint-disable-line no-unused-vars
  ios.bundleIdentifier = TRIAL_APP_ID;

  const plugins = Array.isArray(config.plugins)
    ? config.plugins.filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== SENTRY_PLUGIN)
    : config.plugins;

  return {
    ...config,
    name: TRIAL_NAME,
    ios,
    android,
    plugins,
    extra: { ...(config.extra || {}), appVariant: TRIAL_VARIANT },
    updates: {
      ...(config.updates || {}),
      requestHeaders: {
        ...((config.updates && config.updates.requestHeaders) || {}),
        'expo-channel-name': TRIAL_CHANNEL,
      },
    },
  };
}

module.exports = {
  applyTrialIdentity, TRIAL_VARIANT, TRIAL_APP_ID, TRIAL_NAME, TRIAL_CHANNEL, SENTRY_PLUGIN,
};
