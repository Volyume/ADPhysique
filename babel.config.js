module.exports = function (api) {
  // Config depends on NODE_ENV (we strip console.* only in production), so the
  // cache key must include it. api.cache(true) would freeze the first env's
  // result and is wrong for env-dependent config.
  api.cache.using(() => process.env.NODE_ENV);

  const isProduction = process.env.NODE_ENV === 'production';

  const plugins = [];

  // Strip console.* from production bundles. error + warn are kept so genuine
  // failures still reach the native log + Sentry breadcrumbs; only debug
  // (log/info/debug) chatter is removed. Dev and test keep everything.
  if (isProduction) {
    plugins.push(['transform-remove-console', { exclude: ['error', 'warn'] }]);
  }

  // Reanimated 4 moved its Babel worklet transform into react-native-worklets.
  // Must stay last in the plugins list.
  plugins.push('react-native-worklets/plugin');

  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
