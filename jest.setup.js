/* global jest */

// Globals the React Native / Expo runtime injects on device but the custom node
// test env does not. Before the SDK 54 / RN 0.81 upgrade nothing in the import
// graph read these at load time; SDK 54's expo-modules-core does, so suites that
// transitively import an expo module now throw "__DEV__ is not defined" at
// require time. Defining them here (a jest setupFile, runs before any test
// module loads) matches the on-device runtime.
global.__DEV__ = true;
// Jest cannot parse Expo's generated ESM virtual env module in the node runner.
jest.mock('expo/virtual/env', () => ({ env: process.env }));
// react-test-renderer / React 19 expects this flag set so act() warnings behave.
global.IS_REACT_ACT_ENVIRONMENT = true;
