// Stub for `expo-location` (pulls expo-modules-core, which crashes in the
// node test env). Mapped in via package.json jest.moduleNameMapper. Only
// `src/lib/deviceLocation.js` requires this module in the app; tests that
// exercise its "armed" branches override these jest.fn()s per test.
module.exports = {
  Accuracy: {
    Lowest: 1, Low: 2, Balanced: 3, High: 4, Highest: 5, BestForNavigation: 6,
  },
  requestForegroundPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getCurrentPositionAsync: jest.fn().mockResolvedValue({
    coords: { latitude: 0, longitude: 0 },
  }),
};
