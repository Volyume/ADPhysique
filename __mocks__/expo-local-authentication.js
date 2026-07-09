// Stub for `expo-local-authentication` (native module; pulls
// expo-modules-core, which crashes in the node test env). Placed adjacent to
// node_modules per Jest's manual-mock convention (same as expo-secure-store,
// expo-apple-authentication here) -- no moduleNameMapper entry needed.
module.exports = {
  AuthenticationType: { FINGERPRINT: 1, FACIAL_RECOGNITION: 2, IRIS: 3 },
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC: 2 },
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1]),
  getEnrolledLevelAsync: jest.fn().mockResolvedValue(2),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  cancelAuthenticate: jest.fn().mockResolvedValue(undefined),
};
