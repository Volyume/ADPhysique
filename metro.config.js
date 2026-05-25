// Metro bundler config.
//
// Adds `dat` to assetExts so files matching *.dat are bundled as
// runtime assets (numeric registry IDs that Asset.fromModule resolves)
// instead of being inlined as parsed source. The bundled OpenFoodFacts
// UK snapshot at assets/seed/off_uk_snapshot.dat uses this so it loads
// via expo-asset + FileSystem at runtime, not at JS bundle parse time.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
if (!config.resolver.assetExts.includes('dat')) {
  config.resolver.assetExts.push('dat');
}

module.exports = config;
