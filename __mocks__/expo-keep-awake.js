// expo-keep-awake needs the native ExpoKeepAwake module at call time; the
// node test environment has none, so suites mounting ActiveWorkoutScreen
// would throw. Mirrors the real surface as no-ops (mapped in package.json
// moduleNameMapper, same pattern as expo-sharing / expo-document-picker).
module.exports = {
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
  useKeepAwake: jest.fn(),
};
