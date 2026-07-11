// Minimal lint gate (audit Phase 0). The codebase had no static analysis,
// which let two runtime bugs ship: a `no-undef` ReferenceError that aborted
// the cloud pull, and a wrong-module import that silently killed the sign-out
// telemetry flush. This config gates CI on the two rules that catch that class
// (`no-undef`, `react-hooks/rules-of-hooks`) as errors, and surfaces the
// noisier rules as warnings so the gate can go green today and the warning
// backlog can be paid down over time.

const babelParser = require('@babel/eslint-parser');
const reactHooks = require('eslint-plugin-react-hooks');
const reactPlugin = require('eslint-plugin-react');
const importPlugin = require('eslint-plugin-import');
// P9/E11 "lint line" (founder-approved dependency 2026-07-02): holds the
// screen-reader posture on new code. The plugin predates eslint 9, so it is
// installed with legacy peer resolution; its rules are plain AST checks that
// run fine under flat config.
const a11yPlugin = require('eslint-plugin-react-native-a11y');

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
      // Agent worktrees are full transient copies of the repo under .claude/;
      // linting them double-counts every file (and lints old/other branch
      // states), the same reason jest ignores this path. Not app source.
      '.claude/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'dist/**',
      'web-build/**',
      // The Next.js marketing site is a separate project with its own browser
      // env + toolchain; its source and .next/ build artifacts are not part of
      // the React Native app and must not be linted with the RN config (they
      // produced 834 phantom errors from minified bundles).
      'web/**',
      '**/.next/**',
      'public/**',
      'scripts/**',
      '*.config.js',
      // Audit scratch directories: tooling and generated output that live
      // outside the app source. They are not shipped and must not be linted
      // with the RN config (OPS-001).
      '.audit-tools/**',
      '.audit-output/**',
      '.tools/**',
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
    plugins: { 'react-hooks': reactHooks, react: reactPlugin, import: importPlugin, 'react-native-a11y': a11yPlugin },
    settings: { react: { version: '18.2' } },
    rules: {
      // Errors: the gate. These catch the bug class that already shipped.
      'no-undef': 'error',
      'react-hooks/rules-of-hooks': 'error',
      // Mark identifiers referenced only in JSX (<Foo/>) as used, so
      // no-unused-vars stops reporting every imported component as dead
      // (Tier 5 §A.1). Collapses ~1,600 false positives so genuine dead
      // code is visible.
      'react/jsx-uses-vars': 'error',
      // Registered so the existing disable-directives resolve to a known rule.
      // Resolution itself is a follow-up (RN resolver + assets).
      'import/no-unresolved': 'off',
      // P9/E11 accessibility line: malformed or contradictory a11y props are
      // errors (they break TalkBack outright); the advisory rules ride as
      // warnings so the backlog is visible without blocking the gate.
      // Descriptor coverage is a WARNING for now: 91 pre-existing touchables
      // lack any a11y props (the visible backlog, counted 2026-07-03); the
      // validity rules below pass everywhere today so they gate as errors.
      'react-native-a11y/has-valid-accessibility-descriptors': 'warn',
      'react-native-a11y/has-valid-accessibility-role': 'error',
      'react-native-a11y/has-valid-accessibility-states': 'error',
      'react-native-a11y/has-valid-accessibility-state': 'error',
      'react-native-a11y/has-valid-accessibility-component-type': 'error',
      'react-native-a11y/has-valid-accessibility-live-region': 'error',
      'react-native-a11y/no-nested-touchables': 'warn',
      'react-native-a11y/has-accessibility-hint': 'off',
      // Warnings: real signal, too noisy to block on today.
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        // Deliberately-ignored catch bindings follow the same `_` convention as
        // args and vars (catch (_) / catch (_e)). Without this they were the
        // single largest source of lint noise despite being intentional.
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', 'tests/**/*.js', '__mocks__/**/*.js'],
    languageOptions: { globals: { ...rnGlobals, ...jestGlobals } },
  },
  {
    // Design-system guards (design premium audit 2026-05-30, F6). Use theme
    // tokens (colors.*, withAlpha, the `type` roles) instead of literals.
    // The F3/F5 cleanup cleared every violation, so these are now CI errors
    // and drift is blocked. The handful of intentional large hero/display
    // numerals (e.g. the 96px Year-of-Lifts number) carry a scoped
    // eslint-disable with a reason.
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
      'no-restricted-syntax': ['error',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: 'No hardcoded hex colours in screens/components. Use a theme token (colors.*) or withAlpha().',
        },
        {
          selector: "Literal[value=/^rgba?\\(/]",
          message: 'No hardcoded rgba()/rgb() in screens/components. Use a theme token or withAlpha(colors.*, a).',
        },
        {
          // A2-047: the `colors.primary + '50'` hex-alpha concat. Slips past the
          // literal guards (the '50' is not a colour literal) but breaks the
          // moment a token becomes rgba(). Use withAlpha(token, alpha) instead.
          selector: "BinaryExpression[operator='+'] > Literal.right[value=/^[0-9a-fA-F]{2}$/]",
          message: "No hex-alpha concat (token + '50'). Use withAlpha(token, alpha) so it survives rgba() tokens.",
        },
        {
          // A2-047: the `${token}50` template form of the same hex-alpha concat.
          selector: "TemplateElement[tail=true][value.cooked=/^[0-9a-fA-F]{2}$/]",
          message: 'No hex-alpha template (`${token}50`). Use withAlpha(token, alpha).',
        },
        {
          selector: "Property[key.name='fontSize'] > Literal[raw=/^[0-9]/]",
          message: 'No raw fontSize literal. Use a type role (type.body, type.h2…) or fontSize.* token. (Intentional hero/display sizes: add a scoped eslint-disable with a reason.)',
        },
        {
          selector: "Property[key.name='fontWeight'] > Literal",
          message: 'No raw fontWeight literal. Use a type role or fontWeight.* token.',
        },
        {
          // D3 (design campaign 2026-07-09): letterSpacing stays neutral (0)
          // everywhere except two named tokens. Raw literals drifted to 7
          // different ad-hoc values on uppercase labels alone. Use
          // letterSpacing.overline for uppercase section/eyebrow micro-labels,
          // letterSpacing.wordmark for the two named brand-wordmark sites
          // (SettingsAbout app name, PRCelebration hero), or omit the
          // property entirely (0 is the RN default).
          selector: "Property[key.name='letterSpacing'] > Literal[raw=/^-?[0-9]/]",
          message: 'No raw letterSpacing literal. Use letterSpacing.overline, letterSpacing.wordmark, or omit the property (0 is the default).',
        },
        // Voice-rule copy gate (CLAUDE.md "Voice and copy" + "No AI
        // fingerprint"). Guards displayed copy the way the rules above guard
        // colour: no em dashes, no machine-tell marketing words. Strings +
        // JSX text only, so code comments are out of scope. If a flagged word
        // is ever genuinely needed in copy, add a scoped eslint-disable with a
        // reason (same escape hatch as the hero numerals).
        {
          selector: "Literal[value=/\\u2014/]",
          message: 'No em dash (—) in user-facing copy. Use a full stop, comma, or colon (CLAUDE.md voice rule).',
        },
        {
          selector: "JSXText[value=/\\u2014/]",
          message: 'No em dash (—) in user-facing copy. Use a full stop, comma, or colon (CLAUDE.md voice rule).',
        },
        {
          selector: "Literal[value=/\\b(?:delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\\b/i]",
          message: 'Machine-tell word in copy (CLAUDE.md "No AI fingerprint"). Rewrite in plain spoken voice.',
        },
        {
          selector: "JSXText[value=/\\b(?:delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\\b/i]",
          message: 'Machine-tell word in copy (CLAUDE.md "No AI fingerprint"). Rewrite in plain spoken voice.',
        },
        // Clipped-drama tails (founder rule 2026-07-11, R-campaign): copy
        // like "Yours free, always" / "No ads, ever" reads as AI-register
        // marketing, not plain British English. Ban the ", always/ever/
        // forever" tail at a sentence or string end; state the fact plainly
        // ("No ads", "What stays free") instead.
        {
          selector: "Literal[value=/,\\s*(?:always|ever|forever)(?:[.!]|\\s*$)/i]",
          message: 'Clipped-drama tail (", always" / ", ever" / ", forever") in copy. State the fact plainly (founder voice rule 2026-07-11).',
        },
        {
          selector: "JSXText[value=/,\\s*(?:always|ever|forever)(?:[.!]|\\s*$)/i]",
          message: 'Clipped-drama tail (", always" / ", ever" / ", forever") in copy. State the fact plainly (founder voice rule 2026-07-11).',
        },
      ],
    },
  },
  {
    // Ultimate audit item 10 (2026-07-08): a11y touchable-without-label.
    // eslint-plugin-react-native-a11y's has-valid-accessibility-descriptors
    // rule (registered above as a repo-wide WARN) is satisfied by ANY of
    // role/accessibilityRole/accessibilityLabel/accessibilityActions/
    // accessible, so a bare accessibilityRole="button" with no label already
    // passes it, even on an icon-only button TalkBack cannot describe. Repo-
    // wide errors were measured and rejected: forcing accessibilityLabel
    // across src/screens + src/components trips 53 pre-existing violations
    // today (counted 2026-07-08, same selector as below) and would break the
    // lint gate outright. Scoped
    // here to HomeScreen.js only, now that it is clean, so it cannot
    // regress; widen file-by-file as each screen is swept (see audit item 10
    // for the repo-wide backlog this intentionally leaves for a founder
    // decision on scope/scheduling). This block must repeat every selector
    // from the design-system guard block above (same files), because flat
    // config replaces a repeated rule key per file rather than merging it.
    files: ['src/screens/HomeScreen.js'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/]",
          message: 'No hardcoded hex colours in screens/components. Use a theme token (colors.*) or withAlpha().',
        },
        {
          selector: "Literal[value=/^rgba?\\(/]",
          message: 'No hardcoded rgba()/rgb() in screens/components. Use a theme token or withAlpha(colors.*, a).',
        },
        {
          selector: "BinaryExpression[operator='+'] > Literal.right[value=/^[0-9a-fA-F]{2}$/]",
          message: "No hex-alpha concat (token + '50'). Use withAlpha(token, alpha) so it survives rgba() tokens.",
        },
        {
          selector: "TemplateElement[tail=true][value.cooked=/^[0-9a-fA-F]{2}$/]",
          message: 'No hex-alpha template (`${token}50`). Use withAlpha(token, alpha).',
        },
        {
          selector: "Property[key.name='fontSize'] > Literal[raw=/^[0-9]/]",
          message: 'No raw fontSize literal. Use a type role (type.body, type.h2…) or fontSize.* token. (Intentional hero/display sizes: add a scoped eslint-disable with a reason.)',
        },
        {
          selector: "Property[key.name='fontWeight'] > Literal",
          message: 'No raw fontWeight literal. Use a type role or fontWeight.* token.',
        },
        {
          selector: "Property[key.name='letterSpacing'] > Literal[raw=/^-?[0-9]/]",
          message: 'No raw letterSpacing literal. Use letterSpacing.overline, letterSpacing.wordmark, or omit the property (0 is the default).',
        },
        {
          selector: "Literal[value=/\\u2014/]",
          message: 'No em dash (—) in user-facing copy. Use a full stop, comma, or colon (CLAUDE.md voice rule).',
        },
        {
          selector: "JSXText[value=/\\u2014/]",
          message: 'No em dash (—) in user-facing copy. Use a full stop, comma, or colon (CLAUDE.md voice rule).',
        },
        {
          selector: "Literal[value=/\\b(?:delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\\b/i]",
          message: 'Machine-tell word in copy (CLAUDE.md "No AI fingerprint"). Rewrite in plain spoken voice.',
        },
        {
          selector: "JSXText[value=/\\b(?:delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\\b/i]",
          message: 'Machine-tell word in copy (CLAUDE.md "No AI fingerprint"). Rewrite in plain spoken voice.',
        },
        {
          selector: "JSXOpeningElement[name.name=/^(TouchableOpacity|TouchableHighlight|TouchableWithoutFeedback|Pressable)$/]:not(:has(JSXAttribute[name.name='accessibilityLabel'])):not(:has(JSXSpreadAttribute))",
          message: 'Touchable is missing accessibilityLabel (audit item 10: TalkBack cannot describe it without one). Add one, or accessibilityRole alone only where the visible text already says everything TalkBack needs.',
        },
      ],
    },
  },
  {
    // The copy half of the gate above also applies to ShareCardScreen, which
    // is exempt from the block above only for its legitimately-literal offline
    // HTML palette. Scoped to that one file so it does not collide with the
    // block above (different files, so no-restricted-syntax does not override).
    files: ['src/screens/ShareCardScreen.js'],
    rules: {
      'no-restricted-syntax': ['error',
        {
          selector: "Literal[value=/\\u2014/]",
          message: 'No em dash (—) in user-facing copy. Use a full stop, comma, or colon (CLAUDE.md voice rule).',
        },
        {
          selector: "JSXText[value=/\\u2014/]",
          message: 'No em dash (—) in user-facing copy. Use a full stop, comma, or colon (CLAUDE.md voice rule).',
        },
        {
          selector: "Literal[value=/\\b(?:delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\\b/i]",
          message: 'Machine-tell word in copy (CLAUDE.md "No AI fingerprint"). Rewrite in plain spoken voice.',
        },
        {
          selector: "JSXText[value=/\\b(?:delve|leverage|utili[sz]e|facilitate|seamless(?:ly)?|streamlin(?:e|es|ed|ing)|robust|comprehensive)\\b/i]",
          message: 'Machine-tell word in copy (CLAUDE.md "No AI fingerprint"). Rewrite in plain spoken voice.',
        },
        // Clipped-drama tails (founder rule 2026-07-11, R-campaign): copy
        // like "Yours free, always" / "No ads, ever" reads as AI-register
        // marketing, not plain British English. Ban the ", always/ever/
        // forever" tail at a sentence or string end; state the fact plainly
        // ("No ads", "What stays free") instead.
        {
          selector: "Literal[value=/,\\s*(?:always|ever|forever)(?:[.!]|\\s*$)/i]",
          message: 'Clipped-drama tail (", always" / ", ever" / ", forever") in copy. State the fact plainly (founder voice rule 2026-07-11).',
        },
        {
          selector: "JSXText[value=/,\\s*(?:always|ever|forever)(?:[.!]|\\s*$)/i]",
          message: 'Clipped-drama tail (", always" / ", ever" / ", forever") in copy. State the fact plainly (founder voice rule 2026-07-11).',
        },
      ],
    },
  },
];
