// expo-asset native module stub: the jest env has no expo-modules-core
// runtime (same reason as the other expo-* mocks here). Asset.fromModule
// returns a resolved-enough object so DemoCard's VideoLoop can request a uri
// without touching the filesystem; tests assert the render branch, not playback.
const Asset = {
  fromModule: (mod) => ({
    localUri: `mock-asset://${String(mod)}`,
    uri: `mock-asset://${String(mod)}`,
    downloadAsync: async () => {},
  }),
};

module.exports = { Asset };
