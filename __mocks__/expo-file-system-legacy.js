// Stub for `expo-file-system/legacy`. The real module imports expo-modules-core,
// which (SDK 54) eagerly sets up a native JS logger and crashes in the node test
// env ("ExpoModulesCoreJSLogger ... reading 'get'"). Suites only need the import
// to resolve and the calls to no-op; the CSV/backup formatting under test is pure.
// Mapped in via package.json jest.moduleNameMapper.
module.exports = {
  cacheDirectory: '/tmp/volyume-cache/',
  documentDirectory: '/tmp/volyume-docs/',
  EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  moveAsync: jest.fn().mockResolvedValue(undefined),
};
