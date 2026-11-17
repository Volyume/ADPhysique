// Metro bundler config.
//
// Wrapped with Sentry's Expo metro config (bundle cut 1,
// docs/e8-vitals-and-bundle-2026-07-03.md): `includeWebReplay: false` resolves
// the web-only `@sentry-internal/replay` surface to an empty module on native
// platforms, and the Sentry serializer adds debug IDs so release source maps
// keep symbolicating. SDK behaviour at runtime is unchanged (the app never
// used session replay; it is a browser feature).
//
// Adds binary runtime assets so they are bundled as numeric registry IDs that
// Asset.fromModule resolves, instead of being inlined as parsed source:
//   - *.dat    OpenFoodFacts UK snapshot
//   - *.tflite Progress Scan on-device segmentation model
//
// Wrapped last with NativeWind (React Native Reusables kit trial, LOC-411):
// compiles global.css with tailwind.config.js for the kit's className styles.
// Only src/components/ui/kit-theme-provider.tsx imports global.css, and only
// the kit's files compile with NativeWind's JSX runtime (babel.config.js), so
// no existing screen's styles change. inlineRem 16 is the kit's own setting.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });
for (const ext of ['dat', 'tflite']) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

// Exported for scripts/compile-kit-styles.cjs, so the kit's Jest tests compile
// with exactly the options a device bundle uses.
const KIT_NATIVEWIND_OPTIONS = Object.freeze({ input: './global.css', inlineRem: 16 });

module.exports = withNativeWind(config, { ...KIT_NATIVEWIND_OPTIONS });
module.exports.KIT_NATIVEWIND_OPTIONS = KIT_NATIVEWIND_OPTIONS;
