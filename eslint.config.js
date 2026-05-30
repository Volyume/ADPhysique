// Minimal lint gate (audit Phase 0). The codebase had no static analysis,
// which let two runtime bugs ship: a `no-undef` ReferenceError that aborted
// the cloud pull, and a wrong-module import that silently killed the sign-out
// telemetry flush. This config gates CI on the two rules that catch that class
// (`no-undef`, `react-hooks/rules-of-hooks`) as errors, and surfaces the
// noisier rules as warnings so the gate can go green today and the warning
// backlog can be paid down over time.

const babelParser = require('@babel/eslint-parser');
const reactHooks = require('eslint-plugin-react-hooks');
const importPlugin = require('eslint-plugin-import');

// React Native / Hermes runtime globals, so `no-undef` does not fire on them.
const rnGlobals = {
  __DEV__: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  setImmediate: 'readonly',
  clearImmediate: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  requestIdleCallback: 'readonly',
  cancelIdleCallback: 'readonly',
  queueMicrotask: 'readonly',
  // CommonJS, used by config-style and lazy-require modules.
  global: 'readonly',
  process: 'readonly',
  module: 'writable',
  require: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
  exports: 'writable',
  // Web / fetch APIs polyfilled in RN.
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  FormData: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  WebSocket: 'readonly',
  XMLHttpRequest: 'readonly',
  navigator: 'readonly',
  alert: 'readonly',
  btoa: 'readonly',
  atob: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  performance: 'readonly',
  structuredClone: 'readonly',
};

const jestGlobals = {
  describe: 'readonly',
  it: 'readonly',
  test: 'readonly',
  expect: 'readonly',
  beforeEach: 'readonly',
  afterEach: 'readonly',
  beforeAll: 'readonly',
  afterAll: 'readonly',
  jest: 'readonly',
  xit: 'readonly',
  xdescribe: 'readonly',
  fit: 'readonly',
  fdescribe: 'readonly',
};

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'dist/**',
      'web-build/**',
      'public/**',
      'scripts/**',
      '*.config.js',
    ],
  },
  {
    files: ['**/*.js'],
    // The codebase carries `// eslint-disable-next-line import/no-unresolved`
    // at its optional-native-require sites. Import resolution is not turned on
    // yet (it needs an RN-aware resolver + asset handling to avoid flooding;
    // that is a follow-up), so those directives would otherwise reference an
    // unknown rule. Turning the directive reporter off keeps them silent until
    // import resolution lands.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: { presets: ['babel-preset-expo'] },
        ecmaFeatures: { jsx: true },
      },
      globals: rnGlobals,
    },
    plugins: { 'react-hooks': reactHooks, import: importPlugin },
    rules: {
      // Errors: the gate. These catch the bug class that already shipped.
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      // Registered so the existing disable-directives resolve to a known rule.
      // Resolution itself is a follow-up (RN resolver + assets).
      'import/no-unresolved': 'off',
      // Warnings: real signal, too noisy to block on today.
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', 'tests/**/*.js', '__mocks__/**/*.js'],
    languageOptions: { globals: { ...rnGlobals, ...jestGlobals } },
  },
  {
    // Design-system guards (design premium audit 2026-05-30, F6). Flag the
    // drift the audit found: hardcoded hex/rgba colours and raw fontSize /
    // fontWeight literals in screens and components. Use theme tokens
    // (colors.*, withAlpha, the `type` roles) instead. Warnings for now,
    // matching the "green today, pay down the backlog" posture; promote to
    // error once F3/F5 clear the existing violations.
    files: ['src/screens/**/*.js', 'src/components/**/*.js'],
    ignores: [
      '**/__tests__/**',
      '**/*.test.js',
      // ShareCardScreen builds an offline HTML canvas that cannot read RN
      // styles, so its palette is legitimately literal; theme.js is the
      // token source itself.
      'src/screens/ShareCardScreen.js',
    ],
    rules: {
      'no-restricted-syntax': ['warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: 'No hardcoded hex colours in screens/components. Use a theme token (colors.*) or withAlpha().',
        },
        {
          selector: "Literal[value=/^rgba?\\(/]",
          message: 'No hardcoded rgba()/rgb() in screens/components. Use a theme token or withAlpha(colors.*, a).',
        },
        {
          selector: "Property[key.name='fontSize'] > Literal[raw=/^[0-9]/]",
          message: 'No raw fontSize literal. Use a type role (type.body, type.h2…) or fontSize.* token.',
        },
        {
          selector: "Property[key.name='fontWeight'] > Literal",
          message: 'No raw fontWeight literal. Use a type role or fontWeight.* token.',
        },
      ],
    },
  },
];
