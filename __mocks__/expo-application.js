// Manual mock for expo-application (ESM in node_modules is not transformed by
// jest). Mirrors the named exports the app reads: the native app version and
// build number. Values match the expo-constants mock for consistency.
module.exports = {
  __esModule: true,
  nativeApplicationVersion: '1.1.0',
  nativeBuildVersion: '2',
  applicationId: 'app.volyume',
  applicationName: 'Volyume',
  getInstallationTimeAsync: async () => new Date(0),
};
