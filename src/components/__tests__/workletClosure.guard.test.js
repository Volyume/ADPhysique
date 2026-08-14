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
import { spawnSync } from 'child_process';
import * as babel from '@babel/core';

const ROOT = path.resolve(__dirname, '..', '..', '..');

function reanimatedFiles() {
  // Invoke the repository's normal search tool directly. The former shell
  // string depended on Unix `grep` and `|| true`, so this compiler guard
  // could never run in the Windows development environment.
  const result = spawnSync('rg', [
    '-l', 'react-native-reanimated',
    'src/components', 'src/screens', 'src/lib',
    '-g', '*.js',
  ], { cwd: ROOT, encoding: 'utf8' });
  if (result.error) throw result.error;
  // ripgrep status 1 means no matches, not an execution failure.
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(result.stderr || `rg exited ${result.status}`);
  }
  const out = result.stdout ?? '';
  return out.split('\n').filter((f) => f && !f.includes('__tests__'));
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
