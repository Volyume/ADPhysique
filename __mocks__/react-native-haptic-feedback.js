// react-native-haptic-feedback needs its native TurboModule at call time; the
// node test environment has none, so any suite that reaches the D17 iOS-only
// richer-curve path in src/lib/haptics.js would throw. Mirrors the real
// surface as jest.fn() stubs (same pattern as expo-sqlite / expo-secure-store
// in this folder). Tests opt in with jest.mock('react-native-haptic-feedback').
const RNHapticFeedback = {
  trigger: jest.fn(),
  stop: jest.fn(),
  isSupported: jest.fn(() => true),
  triggerPattern: jest.fn(),
  impact: jest.fn(),
  playAHAP: jest.fn(() => Promise.resolve()),
  getSystemHapticStatus: jest.fn(() => Promise.resolve({ vibrationEnabled: true, ringerMode: 'normal' })),
  setEnabled: jest.fn(),
  isEnabled: jest.fn(() => true),
};

module.exports = RNHapticFeedback;
module.exports.default = RNHapticFeedback;
