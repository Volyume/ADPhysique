/**
 * scripts/site/load-app-module.cjs
 *
 * Loads a module from the app's own source (src/) under plain Node, so the
 * site build can read real values (the exercise corpus, the plan library,
 * the curated meals, the training styles) instead of copying numbers by hand.
 *
 * How: app files under src/ are compiled to CommonJS with the repo's own
 * babel.config.js, the same transform Jest uses (babel-jest passes
 * supportsStaticESM: false, so babel-preset-expo converts the imports).
 * @babel/core is a direct devDependency; nothing new is installed.
 *
 * Package imports made FROM app files (React Native, Expo, AsyncStorage,
 * Sentry and the rest) are replaced with an inert stand-in, because the
 * values the site reads are plain data and never call into them while the
 * module loads. Babel's own runtime helpers are loaded for real, since the
 * compiled code needs them to spread and copy arrays. Asset requires
 * (images, fonts, the food snapshots) resolve to a number, as Metro would.
 *
 * Only this process is affected; nothing is written to disk.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'src') + path.sep;
const ASSET_EXT = /\.(png|jpe?g|gif|svg|webp|ttf|otf|mp3|mp4|wav|tflite|dat)$/i;

let installed = false;
const stubs = new Map();

/** A callable, constructible object that answers every property with itself. */
function inertStub() {
  const target = function stub() {};
  const proxy = new Proxy(target, {
    get(t, prop) {
      // Own non-configurable function properties must report their real value.
      if (prop === 'length' || prop === 'name' || prop === 'prototype') return Reflect.get(t, prop);
      if (prop === '__esModule') return true;
      if (prop === 'then') return undefined; // never look like a promise
      if (prop === Symbol.toPrimitive) return () => 0;
      if (prop === Symbol.iterator) return function* empty() {};
      if (prop === 'toString' || prop === 'valueOf') return () => '';
      return proxy;
    },
    apply() { return proxy; },
    construct() { return proxy; },
  });
  return proxy;
}

function install() {
  if (installed) return;
  installed = true;

  const babel = require('@babel/core');

  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    const fromApp = Boolean(parent && parent.filename && parent.filename.startsWith(SRC));
    if (fromApp) {
      const relative = request.startsWith('.') || path.isAbsolute(request);
      if (relative && ASSET_EXT.test(request)) return 1;
      if (!relative && !Module.isBuiltin(request) && !request.startsWith('@babel/runtime/')) {
        if (!stubs.has(request)) stubs.set(request, inertStub());
        return stubs.get(request);
      }
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  const originalJs = Module._extensions['.js'];
  Module._extensions['.js'] = function compile(module, filename) {
    if (!filename.startsWith(SRC)) return originalJs(module, filename);
    const code = fs.readFileSync(filename, 'utf8');
    const out = babel.transformSync(code, {
      filename,
      cwd: ROOT,
      root: ROOT,
      configFile: path.join(ROOT, 'babel.config.js'),
      babelrc: false,
      sourceMaps: false,
      caller: {
        name: 'babel-jest',
        supportsDynamicImport: false,
        supportsStaticESM: false,
        supportsExportNamespaceFrom: false,
        supportsTopLevelAwait: false,
      },
    });
    return module._compile(out.code, filename);
  };
}

/**
 * Require a module by its repo-relative path, e.g. 'src/lib/seedRoutines.js'.
 * @param {string} relPath
 * @returns {object} the module's exports
 */
function loadAppModule(relPath) {
  install();
  return require(path.join(ROOT, relPath));
}

module.exports = { loadAppModule, ROOT };
