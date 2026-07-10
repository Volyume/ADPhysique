// Manual mock for react-native-keyboard-controller (campaign item 14, D25).
// Automatically applied by Jest for any test that imports it, directly or
// transitively (real installed package, node_modules-relative __mocks__
// folder — same convention as react-native-reanimated.js and
// react-native-haptic-feedback.js in this directory).
//
// The library ships its own official jest mock
// (node_modules/react-native-keyboard-controller/jest/index.js, wired via
// its own jest preset for consumers who use one) — this file just re-exports
// it so our config (which doesn't use that preset) picks it up the same way
// every other native mock in this folder is picked up. KeyboardProvider,
// KeyboardGestureArea etc. resolve to plain string host-component names in
// that upstream mock, matching how this repo already renders other native
// views it doesn't animate in tests (see react-native-reanimated.js).

module.exports = require('react-native-keyboard-controller/jest');
