// expo-speech native module stub: the jest env has no expo-modules-core
// runtime (same reason as the other expo-* mocks here). Spoken cues are a
// side effect only; tests assert behaviour around them, never audio itself.
module.exports = {
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn(async () => false),
};
