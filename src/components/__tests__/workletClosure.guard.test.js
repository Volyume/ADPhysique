/**
 * VOLYUME-2A root cause guard (compiler-level, 2026-07-13).
 *
 * The photo viewer's `settle` helper compiled as a PLAIN function captured
 * into the gesture worklets' closures; every pan release / pinch end /
 * double-tap called it synchronously on the UI thread, and the worklets
 * runtime throws for that -- a fatal C++ jsi::JSError on the new
 * architecture. The app died on photo swipes.
 *
 * This guard compiles every reanimated-using source file with the project's
 * real babel pipeline and fails if any worklet body calls a captured local
 * function that was NOT workletised. It reproduces the exact compiler
 * output the device runs, so the defect class cannot ship again.
 */
import fs from 'fs';
import path from 'path';
import * as babel from '@babel/core';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const SEARCH_ROOTS = ['src/components', 'src/screens', 'src/lib'];

function reanimatedFiles() {
  // Walk the tree in Node rather than shelling out. The first version piped
  // Unix `grep`, which could not run in the Windows development environment;
  // the second called `rg`, which is not on the GitHub Actions image, so
  // spawnSync returned ENOENT and this guard threw before it checked a single
  // file - red CI on every commit, and the VOLYUME-2A defect class unguarded
  // the whole time. fs has no such dependency and behaves the same everywhere.
  const found = [];
  const walk = (rel) => {
    const abs = path.join(ROOT, rel);
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) { walk(child); continue; }
      if (!entry.name.endsWith('.js')) continue;
      if (child.includes('__tests__')) continue;
      if (fs.readFileSync(path.join(ROOT, child), 'utf8').includes('react-native-reanimated')) {
        found.push(child);
      }
    }
  };
  SEARCH_ROOTS.forEach(walk);
  return found;
}

function suspectsIn(file) {
  const abs = path.join(ROOT, file);
  const compiled = babel.transformSync(fs.readFileSync(abs, 'utf8'), {
    cwd: ROOT,
    filename: abs,
    presets: ['babel-preset-expo'],
  }).code;
  const workletised = new Set(
    [...compiled.matchAll(/var (\w+)=function \w+Factory\(/g)].map((m) => m[1]),
  );
  const suspicious = new Set();
  for (const m of compiled.matchAll(/init_data=\{code:"(.*?)",location/gs)) {
    const body = m[1];
    const closureMatch = body.match(/\{([^}]*)\}=this\.__closure/);
    if (!closureMatch) continue;
    for (const rawName of closureMatch[1].split(',')) {
      const name = rawName.trim();
      if (!name) continue;
      if (!new RegExp(`[^.\\w]${name}\\(`).test(body)) continue;
      const declaredPlain = new RegExp(`var ${name}=function ${name}\\(`).test(compiled)
        || new RegExp(`function ${name}\\(`).test(compiled);
      const isWorklet = new RegExp(`${name}\\.__workletHash`).test(compiled)
        || workletised.has(name);
      if (declaredPlain && !isWorklet) suspicious.add(name);
    }
  }
  return [...suspicious];
}

describe('no worklet may call a captured non-worklet local function (VOLYUME-2A class)', () => {
  jest.setTimeout(120000);

  test('every reanimated-using file compiles with fully workletised closures', () => {
    const failures = {};
    for (const file of reanimatedFiles()) {
      const suspects = suspectsIn(file);
      if (suspects.length) failures[file] = suspects;
    }
    expect(failures).toEqual({});
  });

  test('the fixed settle helper is genuinely workletised (regression pin)', () => {
    const abs = path.join(ROOT, 'src/components/ProgressPhotoViewer.js');
    const compiled = babel.transformSync(fs.readFileSync(abs, 'utf8'), {
      cwd: ROOT,
      filename: abs,
      presets: ['babel-preset-expo'],
    }).code;
    // settle compiles to a worklet factory whose closure carries only data
    // and reanimated's own workletised withSpring.
    expect(compiled).toMatch(/var settle=function \w+Factory\(/);
  });
});
