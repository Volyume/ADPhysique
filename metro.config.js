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
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });
for (const ext of ['dat', 'tflite']) {
  if (!config.resolver.assetExts.includes(ext)) {
    config.resolver.assetExts.push(ext);
  }
}

module.exports = config;
