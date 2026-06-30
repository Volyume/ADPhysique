/**
 * withAndroidxActivityPin
 *
 * Pins androidx.activity to a compileSdk-35-compatible version across every
 * Android module.
 *
 * Why: expo-media-library's android/build.gradle hardcodes
 * `androidx.activity:activity-ktx:1.11.0`. Gradle resolves the whole app to that
 * (it is the highest declared version). androidx.activity 1.11.0 (a) demands the
 * project compile against Android API 36, which broke the release build at
 * `:app:checkReleaseAarMetadata`, and (b) changes ComponentActivity launch-time
 * behaviour (edge-to-edge enforcement) that crashes this Expo SDK 54 / React
 * Native 0.81 app immediately after the splash screen. The last working Play
 * build predates the 1.11.0 bump and ran on compileSdk 35.
 *
 * Forcing androidx.activity back to 1.10.1 (the same 1.10.x line expo-image-picker
 * already uses in this app) removes both problems: nothing needs API 36 any more,
 * so compileSdk can stay 35, and the 1.11.0 launch behaviour is gone. This
 * restores the exact native posture the working build used.
 *
 * Implemented as a config plugin because the app uses Expo prebuild: a manual
 * edit to android/build.gradle is wiped by `expo prebuild --clean` on every
 * build. The pure string transform (pinActivityInBuildGradle) is exported for a
 * unit test and is idempotent (guarded by a marker comment).
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */

const { withProjectBuildGradle } = require('@expo/config-plugins');

const MARKER = '// withAndroidxActivityPin';
// Highest androidx.activity that still compiles against API 35. 1.11.0 is the
// first release to require API 36.
const PINNED_VERSION = '1.10.1';

/**
 * Append a resolutionStrategy that forces androidx.activity (and activity-ktx)
 * to a compileSdk-35-compatible version, for every module. Idempotent: a second
 * run (e.g. a re-prebuild) sees the marker and leaves the file unchanged.
 *
 * @param {string} contents  the root android/build.gradle source
 * @param {string} [version] the version to pin to
 * @returns {string}
 */
function pinActivityInBuildGradle(contents, version = PINNED_VERSION) {
  if (contents.includes(MARKER)) return contents;
  const block = [
    '',
    `${MARKER}: keep androidx.activity below 1.11.0, which demands compileSdk 36`,
    '// and crashes this RN 0.81 app at launch (expo-media-library pulls 1.11.0).',
    'allprojects {',
    '  configurations.all {',
    '    resolutionStrategy {',
    `      force 'androidx.activity:activity:${version}'`,
    `      force 'androidx.activity:activity-ktx:${version}'`,
    '    }',
    '  }',
    '}',
    '',
  ].join('\n');
  return `${contents}\n${block}`;
}

const withAndroidxActivityPin = (config) =>
  withProjectBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error(
        '[withAndroidxActivityPin] expected a groovy root build.gradle; got '
          + cfg.modResults.language,
      );
    }
    cfg.modResults.contents = pinActivityInBuildGradle(cfg.modResults.contents);
    return cfg;
  });

module.exports = withAndroidxActivityPin;
module.exports.pinActivityInBuildGradle = pinActivityInBuildGradle;
module.exports.PINNED_VERSION = PINNED_VERSION;
