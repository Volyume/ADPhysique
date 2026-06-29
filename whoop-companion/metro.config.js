// Metro config — keeps VOLYUME Pulse self-contained while still resolving
// Expo's nested dependencies correctly.
//
// This app lives in a subfolder of the VOLYUME repo. We must NOT let Metro pull
// in VOLYUME's node_modules / source, but we MUST allow normal hierarchical
// resolution so packages that npm installs nested (e.g. expo/node_modules/
// expo-asset, which npm does not hoist) are found. Disabling hierarchical
// lookup entirely broke that. Instead we: pin the project root + watch folder
// to this app, and blocklist the PARENT repo's node_modules so resolution can
// never escape into VOLYUME — but nested lookups within this app still work.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
// Allow hierarchical lookup (default) so nested deps resolve...
config.resolver.disableHierarchicalLookup = false;
// ...but never resolve into the parent (VOLYUME) repo's node_modules.
const parentModules = path.resolve(projectRoot, '..', 'node_modules');
const escaped = parentModules.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`^${escaped}/.*`)];

module.exports = config;
