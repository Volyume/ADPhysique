// Stub for `expo-document-picker` (pulls expo-modules-core, which crashes in the
// node test env). Mapped in via package.json jest.moduleNameMapper.
module.exports = {
  getDocumentAsync: jest.fn().mockResolvedValue({ canceled: true, assets: null }),
  types: { allFiles: '*/*' },
};
