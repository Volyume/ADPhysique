module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 moved its Babel worklet transform into react-native-worklets.
    // Must stay last in the plugins list.
    plugins: ['react-native-worklets/plugin'],
  };
};
