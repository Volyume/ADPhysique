/**
 * scripts/paper-render/assetTransform.js
 *
 * A Jest transform for image files, used ONLY by this harness's own Jest
 * config (jest.config.js in this folder).
 *
 * Why it exists: package.json's jest.moduleNameMapper sends every image
 * require to __mocks__/asset-stub.js, which exports the number 1, so
 * `require('../../assets/volyume-v-compact.png')` is `1` under the real test
 * suite and the file it named is lost. A paper render has to draw the real
 * brand mark and avatars, so here an image require is the react-native
 * preset's own shape, `{ testUri: <path> }` (node_modules/react-native/jest/
 * assetFileTransformer.js), except that the path is ABSOLUTE so treeToHtml.js
 * can read the file without guessing a base directory.
 *
 * Nothing under package.json's jest block is changed: `npm test` still maps
 * images to 1.
 */
'use strict';

const createCacheKeyFunction = require('@jest/create-cache-key-function').default;

module.exports = {
  process: (_src, filename) => ({
    code: `module.exports = { testUri: ${JSON.stringify(filename.replace(/\\/g, '/'))} };`,
  }),
  getCacheKey: createCacheKeyFunction([__filename]),
};
