// Stub for `expo-apple-authentication` (iOS-only native module; pulls
// expo-modules-core, which crashes in the node test env). Mapped in via
// package.json jest.moduleNameMapper. Provides the enums, the native button
// component, and async APIs the auth code + OAuthButtons rely on.
const React = require('react');
const { TouchableOpacity, Text } = require('react-native');

function AppleAuthenticationButton(props) {
  return React.createElement(
    TouchableOpacity,
    {
      onPress: props.onPress,
      accessibilityRole: 'button',
      accessibilityLabel: 'Continue with Apple',
    },
    React.createElement(Text, null, 'Continue with Apple'),
  );
}

const AppleAuthenticationButtonType = { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 };
const AppleAuthenticationButtonStyle = { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 };
const AppleAuthenticationScope = { FULL_NAME: 0, EMAIL: 1 };

module.exports = {
  AppleAuthenticationButton,
  AppleAuthenticationButtonType,
  AppleAuthenticationButtonStyle,
  AppleAuthenticationScope,
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  signInAsync: jest.fn().mockResolvedValue({ identityToken: 'test-apple-id-token' }),
};
