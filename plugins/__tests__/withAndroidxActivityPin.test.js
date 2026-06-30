/**
 * withAndroidxActivityPin.pinActivityInBuildGradle
 *
 * The plugin forces androidx.activity below 1.11.0 so the app keeps compiling
 * against API 35 and stops crashing at launch. These tests cover the string
 * transform directly (no prebuild).
 */

const { pinActivityInBuildGradle, PINNED_VERSION } = require('../withAndroidxActivityPin');

const ROOT_GRADLE = `buildscript {
  ext { kotlinVersion = '1.9.0' }
}
allprojects {
  repositories {
    google()
  }
}
`;

describe('pinActivityInBuildGradle', () => {
  test('appends a resolutionStrategy forcing androidx.activity + activity-ktx', () => {
    const out = pinActivityInBuildGradle(ROOT_GRADLE);
    expect(out).toContain(`force 'androidx.activity:activity:${PINNED_VERSION}'`);
    expect(out).toContain(`force 'androidx.activity:activity-ktx:${PINNED_VERSION}'`);
    expect(out).toContain('resolutionStrategy');
    // The pinned version must be a 1.10.x (API-35-compatible), never 1.11.x.
    expect(PINNED_VERSION.startsWith('1.10.')).toBe(true);
  });

  test('keeps the original build.gradle content intact', () => {
    const out = pinActivityInBuildGradle(ROOT_GRADLE);
    expect(out).toContain(ROOT_GRADLE.trim());
  });

  test('is idempotent: a second run does not add the block twice', () => {
    const once = pinActivityInBuildGradle(ROOT_GRADLE);
    const twice = pinActivityInBuildGradle(once);
    expect(twice).toBe(once);
    expect(twice.match(/resolutionStrategy/g)).toHaveLength(1);
  });
});
