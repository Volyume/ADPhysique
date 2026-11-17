#!/usr/bin/env node
/**
 * Compile the React Native Reusables kit's stylesheet (LOC-411 kit trial)
 * exactly the way NativeWind's Metro plugin does for a device bundle, and
 * write the resulting React Native style data as JSON.
 *
 *   node scripts/compile-kit-styles.cjs <out.json> [android|ios]
 *
 * Steps, each one NativeWind's own code with NativeWind's own settings:
 *   1. NativeWind's Tailwind CLI child (nativewind/dist/metro/tailwind/v3/
 *      child.js), forked with the environment its Metro plugin gives it
 *      (input, platform, browserslist), so platform variants resolve as on a
 *      device and Tailwind finds tailwind.config.js the way Metro does;
 *   2. react-native-css-interop's CSS-to-React-Native compiler with the
 *      options withNativeWind() passes it: NativeWind's common options plus
 *      the input and inlineRem metro.config.js sets (KIT_NATIVEWIND_OPTIONS).
 * Output: { css, data }.
 *
 * Used by the kit's Jest tests (src/components/ui/__tests__/kitTestEnv.js),
 * which run it as a plain Node child process: inside Jest's module sandbox
 * the same compile took over a minute.
 */
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// nativewind/dist/metro/index.js withNativeWind() defaults for the two
// options metro.config.js does not set.
const BROWSERSLIST = 'last 1 version';
const BROWSERSLIST_ENV = 'native';

function tailwindCss(input, platform) {
  return new Promise((resolve, reject) => {
    const child = fork(require.resolve('nativewind/dist/metro/tailwind/v3/child.js'), {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
      env: {
        ...process.env,
        NATIVEWIND_INPUT: input,
        NATIVEWIND_OS: platform,
        NATIVEWIND_WATCH: 'false',
        BROWSERSLIST,
        BROWSERSLIST_ENV,
      },
    });
    let stderr = '';
    let css;
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    child.on('message', (m) => {
      css = m.toString();
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0 && typeof css === 'string') resolve(css);
      else reject(new Error(`NativeWind Tailwind CLI exited ${code}:\n${stderr}`));
    });
  });
}

async function main() {
  const out = process.argv[2];
  const platform = process.argv[3] || 'android';
  if (!out) throw new Error('usage: node scripts/compile-kit-styles.cjs <out.json> [android|ios]');
  process.chdir(ROOT); // Tailwind resolves tailwind.config.js and `content` from the project root
  const { KIT_NATIVEWIND_OPTIONS } = require(path.join(ROOT, 'metro.config.js'));
  const { input, ...metroOptions } = KIT_NATIVEWIND_OPTIONS;
  const css = await tailwindCss(path.resolve(ROOT, input), platform);
  const { cssToReactNativeRuntime } = require('react-native-css-interop/dist/css-to-rn');
  const { cssToReactNativeRuntimeOptions } = require('nativewind/dist/metro/common');
  const data = cssToReactNativeRuntime(css, { ...cssToReactNativeRuntimeOptions, ...metroOptions });
  // Write then rename, so a parallel reader never sees a half-written file.
  const tmp = `${out}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ platform, css, data }));
  fs.renameSync(tmp, out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
