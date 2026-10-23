/**
 * scripts/paper-render/jest.config.js
 *
 * The harness's own Jest config, passed to Jest with `--config` by run.sh. It
 * is package.json's `jest` block with two changes and nothing else:
 *
 *   1. Image requires resolve to `{ testUri: <absolute path> }` through
 *      assetTransform.js instead of the number 1 (package.json's
 *      moduleNameMapper sends them all to __mocks__/asset-stub.js), so the
 *      converter can draw the real brand mark and avatars. Fonts, audio and
 *      svg keep the stub.
 *   2. testMatch finds this folder's `*.test.js`.
 *
 * Jest only auto-discovers a config in the root directory (package.json
 * there), so this file is invisible to `npm test` / `npx jest --listTests`,
 * which run.sh checks before every run.
 */
'use strict';

const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const base = require(path.join(ROOT, 'package.json')).jest;

const ASSET_MAPPER_KEY = '\\.(png|jpg|jpeg|gif|svg|webp|ttf|otf|mp3|mp4|wav|tflite)$';
if (!Object.prototype.hasOwnProperty.call(base.moduleNameMapper, ASSET_MAPPER_KEY)) {
  throw new Error('paper-render jest.config.js: package.json no longer maps assets with the expected key; update ASSET_MAPPER_KEY.');
}
const { [ASSET_MAPPER_KEY]: assetStub, ...otherMappers } = base.moduleNameMapper;

// An image inside node_modules must reach the transform too, not be skipped
// as "third-party" and then read as JavaScript: ignore a path only when it is
// NOT an image.
const IMAGE = '\\.(png|jpe?g|gif|webp)$';
const transformIgnorePatterns = base.transformIgnorePatterns.map((p) => `^(?!.*${IMAGE}).*${p}`);

module.exports = {
  ...base,
  rootDir: ROOT,
  testMatch: ['**/scripts/paper-render/*.test.js'],
  moduleNameMapper: {
    '\\.(svg|ttf|otf|mp3|mp4|wav|tflite)$': assetStub,
    ...otherMappers,
  },
  transform: {
    [IMAGE]: path.join(__dirname, 'assetTransform.js'),
    ...base.transform,
  },
  transformIgnorePatterns,
};
