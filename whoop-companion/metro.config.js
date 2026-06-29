// Metro config — keeps VOLYUME Pulse fully self-contained.
//
// This app lives in a subfolder of the VOLYUME repo. Without this, Metro's
// hierarchical module lookup would walk UP the tree and resolve VOLYUME's
// node_modules / source, pulling the wrong app ("tried to do Volyume") into the
// bundle. We pin the project root here, disable upward lookup, and restrict
// module resolution to this folder's own node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

config.projectRoot = projectRoot;
config.watchFolders = [projectRoot];
config.resolver = config.resolver || {};
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
