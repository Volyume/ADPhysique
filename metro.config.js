// Metro bundler config.
//
// Wrapped with Sentry's Expo metro config (bundle cut 1,
// docs/e8-vitals-and-bundle-2026-07-03.md): `includeWebReplay: false` resolves
// the web-only `@sentry-internal/replay` surface to an empty module on native
// platforms, and the Sentry serializer adds debug IDs so release source maps
// keep symbolicating. SDK behaviour at runtime is unchanged (the app never
// used session replay; it is a browser feature).
//
// Adds `dat` to assetExts so files matching *.dat are bundled as
// runtime assets (numeric registry IDs that Asset.fromModule resolves)
// instead of being inlined as parsed source. The bundled OpenFoodFacts
// UK snapshot at assets/seed/off_uk_snapshot.dat uses this so it loads
// via expo-asset + FileSystem at runtime, not at JS bundle parse time.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname, { includeWebReplay: false });
if (!config.resolver.assetExts.includes('dat')) {
  config.resolver.assetExts.push('dat');
}

module.exports = config;
