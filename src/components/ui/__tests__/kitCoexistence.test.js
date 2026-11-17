/**
 * Kit coexistence (LOC-411 kit trial; parent LOC-409).
 *
 * Pins the trial rule that adding the React Native Reusables kit changes
 * nothing for the app's existing StyleSheet screens, and that the repo's
 * guards still reach the kit's TypeScript files:
 *   - only the kit's own files (and the @rn-primitives packages they render
 *     through) compile with NativeWind's JSX runtime; every other file in the
 *     app compiles with React's, exactly as before;
 *   - Tailwind scans only the kit folder, and only the kit's provider loads
 *     the kit stylesheet;
 *   - ESLint lints the kit's .ts/.tsx with every rule the JavaScript gets,
 *     including the raw hex / rgb() colour ban, with no-undef the one rule
 *     left to the TypeScript compiler.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.resolve(__dirname, '../../../..');
const { KIT_JSX_PATHS } = require(path.join(ROOT, 'babel.config.js'));

const SAMPLE = "import { View } from 'react-native';\nexport const X = () => <View />;\n";

function compiledJsxSource(relPath) {
  const filename = path.join(ROOT, relPath);
  const { code } = babel.transformSync(SAMPLE, { filename, cwd: ROOT, root: ROOT });
  const m = code.match(/require\("([^"]*jsx-(?:dev-)?runtime)"\)|from "([^"]*jsx-(?:dev-)?runtime)"/);
  return m ? m[1] || m[2] : null;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const isKitJsx = (file) => KIT_JSX_PATHS.some((re) => re.test(file));

describe('Babel: NativeWind JSX is scoped to the kit', () => {
  test.each([
    ['src/screens/HomeScreen.js', 'react/jsx-runtime'],
    ['src/components/Button.js', 'react/jsx-runtime'],
    ['App.js', 'react/jsx-runtime'],
    ['src/components/ui/__tests__/kitCard.test.js', 'react/jsx-runtime'],
    ['src/components/ui/button.tsx', 'nativewind/jsx-runtime'],
    ['node_modules/@rn-primitives/checkbox/dist/checkbox.js', 'nativewind/jsx-runtime'],
  ])('%s compiles JSX with %s', (rel, expected) => {
    expect(compiledJsxSource(rel)).toBe(expected);
  });

  test('no app file outside src/components/ui matches the kit scope', () => {
    const appFiles = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.js'), path.join(ROOT, 'index.js')]
      .filter((f) => !f.includes(`${path.sep}src${path.sep}components${path.sep}ui${path.sep}`));
    expect(appFiles.length).toBeGreaterThan(100);
    expect(appFiles.filter(isKitJsx)).toEqual([]);
  });

  test('every kit part matches the kit scope', () => {
    const kitFiles = fs
      .readdirSync(path.join(ROOT, 'src/components/ui'))
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .map((f) => path.join(ROOT, 'src/components/ui', f));
    expect(kitFiles.length).toBeGreaterThanOrEqual(11);
    expect(kitFiles.filter((f) => !isKitJsx(f))).toEqual([]);
  });
});

describe('Styles: the kit stylesheet stays with the kit', () => {
  test('Tailwind scans only the kit folder', () => {
    const config = fs.readFileSync(path.join(ROOT, 'tailwind.config.js'), 'utf8');
    expect(config).toMatch(/content: \['\.\/src\/components\/ui\/\*\*\/\*\.\{js,jsx,ts,tsx\}'\]/);
  });

  test('only KitThemeProvider imports global.css', () => {
    const files = [...walk(path.join(ROOT, 'src')), path.join(ROOT, 'App.js'), path.join(ROOT, 'index.js')];
    const importers = files
      .filter((f) => /import\s+['"][^'"]*global\.css['"]/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(ROOT, f));
    expect(importers).toEqual(['src/components/ui/kit-theme-provider.tsx']);
  });
});

describe('ESLint reaches the kit TypeScript', () => {
  // ESLint loads its flat config with a dynamic import, which Jest's module
  // sandbox refuses, so it runs as the plain CLI `npm run lint` uses.
  const { spawnSync } = require('child_process');
  const ESLINT = path.join(ROOT, 'node_modules/eslint/bin/eslint.js');

  function eslint(args, input) {
    const r = spawnSync(process.execPath, [ESLINT, ...args], { cwd: ROOT, input, encoding: 'utf8' });
    if (r.error) throw r.error;
    return r.stdout;
  }

  function ruleIds(code, rel) {
    const out = eslint(['--format', 'json', '--stdin', '--stdin-filename', path.join(ROOT, rel)], code);
    return JSON.parse(out)[0].messages.map((m) => m.ruleId);
  }

  function ruleLevel(rel, rule) {
    const level = JSON.parse(eslint(['--print-config', path.join(ROOT, rel)])).rules[rule];
    return Array.isArray(level) ? level[0] : level;
  }

  test('raw hex and rgb() colours are errors in a kit .tsx', () => {
    const code =
      "import { View } from 'react-native';\n" +
      "export function Bad() {\n  return <View style={{ backgroundColor: '#FF0000', borderColor: 'rgba(0,0,0,0.5)' }} />;\n}\n";
    expect(ruleIds(code, 'src/components/ui/zz-probe.tsx')).toEqual([
      'no-restricted-syntax',
      'no-restricted-syntax',
    ]);
  }, 60000);

  test('the hooks rule and unused-variable warnings apply to kit .ts/.tsx', () => {
    const code =
      "import { useState } from 'react';\n" +
      'export function Bad(props: { on: boolean }) {\n  if (props.on) { useState(0); }\n  const unused = 1;\n  return null;\n}\n';
    const ids = ruleIds(code, 'src/components/ui/zz-probe.ts');
    expect(ids).toContain('react-hooks/rules-of-hooks');
    expect(ids).toContain('no-unused-vars');
  }, 60000);

  test('no-undef is off only for the kit TypeScript, not for JavaScript', () => {
    expect(ruleLevel('src/components/ui/button.tsx', 'no-undef')).toBe(0);
    expect(ruleLevel('src/components/Button.js', 'no-undef')).toBe(2);
    expect(ruleLevel('src/components/ui/__tests__/kitCard.test.js', 'no-undef')).toBe(2);
  }, 60000);
});
