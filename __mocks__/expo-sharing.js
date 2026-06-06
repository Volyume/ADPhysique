// Stub for `expo-sharing` (pulls expo-modules-core, which crashes in the node
// test env). Mapped in via package.json jest.moduleNameMapper.
module.exports = {
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  shareAsync: jest.fn().mockResolvedValue(undefined),
};
