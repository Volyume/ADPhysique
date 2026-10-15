/**
 * How the share video module is wired into the app (D229 addendum 6: the
 * founder's dependency yes, by name, for Media3 inside
 * modules/volyume-video-export, "one file: line in package.json like the
 * three native modules already there", and nothing further without a
 * further ask).
 *
 * Pinned: the one package.json line and its lockfile entries; the full list
 * of the app's dependencies, so no other dependency arrives with this work
 * (CLAUDE.md: never add dependencies without asking); the module's own
 * declarations (Android: exactly the three named Media3 artefacts at 1.11.1,
 * with 1.10.1 named as the fallback; iOS: ExpoModulesCore only, iOS 16); the
 * one Android permission it adds (SET_WALLPAPER, a normal permission, for the
 * lock screen); and the camera purpose strings naming short workout clips
 * with the microphone still blocked (ruling 4: silent by default).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..', '..', '..');
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const app = JSON.parse(read('app.json')).expo;
const MODULE = ['modules', 'volyume-video-export'];

const DEPENDENCIES = [
  '@expo/vector-icons', '@gorhom/bottom-sheet', '@react-native-async-storage/async-storage',
  '@react-native-community/datetimepicker', '@react-native-community/netinfo',
  '@react-native-google-signin/google-signin', '@react-native-menu/menu',
  '@react-native-ml-kit/text-recognition', '@react-navigation/bottom-tabs', '@react-navigation/native',
  '@react-navigation/stack', '@sentry/react-native', '@shopify/flash-list', '@shopify/react-native-skia',
  '@supabase/supabase-js', 'date-fns', 'expo', 'expo-apple-authentication', 'expo-asset', 'expo-av',
  'expo-background-fetch', 'expo-build-properties', 'expo-camera', 'expo-constants', 'expo-crypto',
  'expo-document-picker', 'expo-file-system', 'expo-font', 'expo-haptics', 'expo-image',
  'expo-image-manipulator', 'expo-image-picker', 'expo-keep-awake', 'expo-linear-gradient',
  'expo-local-authentication', 'expo-location', 'expo-media-library', 'expo-notifications', 'expo-print',
  'expo-quick-actions', 'expo-secure-store', 'expo-sensors', 'expo-sharing', 'expo-splash-screen',
  'expo-sqlite', 'expo-status-bar', 'expo-store-review', 'expo-system-ui', 'expo-task-manager',
  'expo-updates', 'expo-web-browser', 'live-activity', 'progress-scan-image', 'promise', 'react',
  'react-native', 'react-native-android-widget', 'react-native-fast-tflite', 'react-native-gesture-handler',
  'react-native-haptic-feedback', 'react-native-iap', 'react-native-ios-context-menu',
  'react-native-ios-utilities', 'react-native-keyboard-controller', 'react-native-nitro-modules',
  'react-native-reanimated', 'react-native-safe-area-context', 'react-native-screens', 'react-native-svg',
  'react-native-url-polyfill', 'react-native-vision-camera', 'react-native-webview', 'react-native-worklets',
  'rest-timer-live', 'volyume-video-export', 'zeego', 'zustand',
];

const DEV_DEPENDENCIES = [
  '@babel/core', '@babel/eslint-parser', 'babel-jest', 'babel-plugin-transform-remove-console', 'cross-env',
  'eslint', 'eslint-plugin-import', 'eslint-plugin-react', 'eslint-plugin-react-hooks',
  'eslint-plugin-react-native-a11y', 'jest', 'jest-expo', 'typescript', 'xlsx',
];

describe('package.json', () => {
  test('carries the module as one file: line, beside the other three', () => {
    expect(pkg.dependencies['volyume-video-export']).toBe('file:./modules/volyume-video-export');
    const local = Object.entries(pkg.dependencies).filter(([, v]) => String(v).startsWith('file:')).map(([k]) => k);
    expect(local.sort()).toEqual(['live-activity', 'progress-scan-image', 'rest-timer-live', 'volyume-video-export']);
  });

  test('no other dependency was added', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual([...DEPENDENCIES].sort());
    expect(Object.keys(pkg.devDependencies).sort()).toEqual([...DEV_DEPENDENCIES].sort());
  });

  test('the lockfile links the module like the other local modules', () => {
    expect(lock.packages[''].dependencies['volyume-video-export']).toBe('file:./modules/volyume-video-export');
    expect(lock.packages['node_modules/volyume-video-export']).toEqual({ resolved: 'modules/volyume-video-export', link: true });
    expect(lock.packages['modules/volyume-video-export']).toEqual({ version: '0.1.0' });
  });
});

describe('the module', () => {
  test('package and Expo config name the module on both platforms', () => {
    const modPkg = JSON.parse(read(...MODULE, 'package.json'));
    expect(modPkg).toMatchObject({ name: 'volyume-video-export', main: 'index.js', private: true });
    expect(modPkg.dependencies).toBeUndefined();
    const config = JSON.parse(read(...MODULE, 'expo-module.config.json'));
    expect(config).toEqual({
      platforms: ['android', 'ios'],
      android: { modules: ['expo.modules.volyumevideoexport.VolyumeVideoExportModule'] },
      ios: { modules: ['VolyumeVideoExportModule'] },
    });
  });

  test('Android declares exactly the three named Media3 artefacts at 1.11.1, with 1.10.1 as the fallback', () => {
    const gradle = read(...MODULE, 'android', 'build.gradle');
    expect(gradle).toMatch(/def media3 = "1\.11\.1"/);
    expect(gradle).toMatch(/1\.10\.1/);
    const deps = gradle.split('\n').map((l) => l.trim()).filter((l) => /^(implementation|api|compileOnly|runtimeOnly)\b/.test(l));
    expect(deps).toEqual([
      'implementation "androidx.media3:media3-transformer:$media3"',
      'implementation "androidx.media3:media3-effect:$media3"',
      'implementation "androidx.media3:media3-common:$media3"',
    ]);
  });

  test('iOS adds no library: ExpoModulesCore only, iOS 16', () => {
    const podspec = read(...MODULE, 'ios', 'VolyumeVideoExport.podspec');
    const deps = podspec.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('s.dependency'));
    expect(deps).toEqual(["s.dependency 'ExpoModulesCore'"]);
    expect(podspec).toMatch(/s\.platforms\s*=\s*\{ :ios => '16\.0' \}/);
  });

  test('the Android manifest adds SET_WALLPAPER and nothing else', () => {
    const manifest = read(...MODULE, 'android', 'src', 'main', 'AndroidManifest.xml');
    const permissions = [...manifest.matchAll(/android:name="([^"]+)"/g)].map((m) => m[1]);
    expect(permissions).toEqual(['android.permission.SET_WALLPAPER']);
    expect(manifest).not.toMatch(/<(service|receiver|provider|activity)\b/);
  });
});

describe('app.json', () => {
  test('both camera purpose strings name short workout clips', () => {
    expect(app.ios.infoPlist.NSCameraUsageDescription).toMatch(/short workout clips/);
    const cameraPlugin = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-camera');
    expect(cameraPlugin[1].cameraPermission).toMatch(/short workout clips/);
  });

  test('clips stay silent: the microphone stays blocked on Android and off in expo-camera', () => {
    expect(app.android.blockedPermissions).toContain('android.permission.RECORD_AUDIO');
    const cameraPlugin = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-camera');
    expect(cameraPlugin[1].recordAudioAndroid).toBe(false);
  });
});
