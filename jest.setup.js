/* global jest */

// Globals the React Native / Expo runtime injects on device but the custom node
// test env does not. Before the SDK 54 / RN 0.81 upgrade nothing in the import
// graph read these at load time; SDK 54's expo-modules-core does, so suites that
// transitively import an expo module now throw "__DEV__ is not defined" at
// require time. Defining them here (a jest setupFile, runs before any test
// module loads) matches the on-device runtime.
global.__DEV__ = true;
// Jest cannot parse Expo's generated ESM virtual env module in the node runner.
jest.mock('expo/virtual/env', () => ({ env: process.env }));
// react-test-renderer / React 19 expects this flag set so act() warnings behave.
global.IS_REACT_ACT_ENVIRONMENT = true;

// Kit trial (LOC-412): screens render parts of the React Native Reusables kit
// (src/components/ui). This repo's Jest config has no React Native preset, so
// react-native-css-interop would resolve its WEB runtime, which crashes on
// load here and turns className into `$$css` markers. Point its four
// platform-split modules at their `.native.js` builds, the files Metro bundles
// for Android and iOS, for every suite. Suites that never import the kit do
// not load them. src/components/ui/__tests__/kitTestEnv.js does the same for
// the kit's own suites and stays compatible with this.
for (const mod of [
  'react-native-css-interop/dist/runtime/api',
  'react-native-css-interop/dist/runtime/index',
  'react-native-css-interop/dist/runtime/third-party-libs/react-native-safe-area-context',
  'react-native-css-interop/dist/doctor',
]) {
  let nativePath = null;
  try { nativePath = require.resolve(`${mod}.native.js`); } catch { nativePath = null; }
  if (nativePath) jest.doMock(mod, () => jest.requireActual(nativePath));
}
