// Jest double for expo-linear-gradient. The real component maps its colours
// through react-native's processColor, which the test environment does not
// provide, so it throws on render. Screens only need the gradient to be a
// plain container here (WelcomeScreen's hero fade).
const React = require('react');
const { View } = require('react-native');

function LinearGradient({ colors: _colors, locations: _locations, start: _s, end: _e, ...rest }) {
  return React.createElement(View, rest);
}

module.exports = { LinearGradient, default: LinearGradient };
