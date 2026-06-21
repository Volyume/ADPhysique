#!/usr/bin/env node
/**
 * check-imports.cjs — dependency-free import/export integrity gate.
 *
 * Catches the hallucination class that tsc and ESLint do NOT here (checkJs is
 * off; import/no-unresolved is off because eslint's resolver isn't RN-aware):
 *
 *   1. a RELATIVE import whose target file does not exist, and
 *   2. a NAMED import of a symbol the target module does not export
 *      (e.g. `import { getLatestBodyWeight } from './x'` where x exports no such
 *      name — which evaluates to `undefined` at runtime).
 *
 * It only inspects relative imports (package imports are skipped, so no RN/asset
 * resolver is needed → near-zero false positives). Comments are stripped first
 * so inline `//` notes inside an import's braces don't masquerade as names.
 *
 * Exit 1 (with a list) on any violation; exit 0 when clean. Wired into
 * release:check. Run directly: `node scripts/check-imports.cjs`.
 */
const fs = require('fs');
const path = require('path');

const exts = ['.js', '.jsx', '.ts', '.tsx', '.cjs', '.json'];
const ROOT = path.resolve(__dirname, '..');

// Strip ONLY line comments (the `:` guard leaves `://` in URLs intact). Block
// comments are deliberately NOT stripped: a stray/unbalanced `/*` inside a
// string or a `//` line would otherwise let a greedy strip devour real code
// (e.g. AppAlert.js, whose export line vanished). Leaving block comments in is
// harmless here — `export function NAME` / `import { ... }` regexes don't match
// inside JSDoc prose, and the only comments that appear *inside* import braces
// are line comments, which this does strip.
function stripComments(src) {
  return src.replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function resolveFile(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const e of exts) if (fs.existsSync(base + e)) return base + e;
  if (fs.existsSync(base)) {
    const st = fs.statSync(base);
    if (st.isFile()) return base;
    if (st.isDirectory()) for (const e of exts) {
      const idx = path.join(base, 'index' + e);
      if (fs.existsSync(idx)) return idx;
    }
  }
  return null;
}

// The set of names a module exports, or the sentinel '*' when names can't be
// fully enumerated (export *, CommonJS module.exports) — in which case we don't
// flag named imports from it.
const exportCache = new Map();
function namedExports(file) {
  if (exportCache.has(file)) return exportCache.get(file);
  if (/\.json$/.test(file)) { exportCache.set(file, new Set(['*'])); return exportCache.get(file); }
  const s = stripComments(fs.readFileSync(file, 'utf8'));
  const set = new Set();
  if (/export\s+\*\s+from/.test(s) || /module\.exports/.test(s) || /\bexports\.[A-Za-z0-9_$]+\s*=/.test(s)) set.add('*');
  if (/export\s+default/.test(s)) set.add('default');
  let m;
  const reDecl = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g;
  while ((m = reDecl.exec(s))) set.add(m[1]);
  const reList = /export\s*\{([^}]*)\}/g;
  while ((m = reList.exec(s))) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const as = t.split(/\s+as\s+/);
      const name = (as[1] || as[0]).trim();
      if (name) set.add(name);
    }
  }
  exportCache.set(file, set);
  return set;
}

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (f !== 'node_modules') walk(p, out); }
    else if (/\.(js|jsx|ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

const files = walk(path.join(ROOT, 'src'))
  .concat(['App.js', 'index.js'].map((f) => path.join(ROOT, f)).filter(fs.existsSync));

const problems = [];
// Real imports are statements at line start; a `require(...)`/dynamic `import(...)`
// is real only when preceded by code (assignment, call, etc.) — never the same
// token sitting inside a string literal or prose. These anchors keep mentions of
// "import from '../x'" in a JSDoc line, or `require("../x")` inside a describe()
// string, from being mistaken for dependencies.
const patterns = [
  /^\s*import\b[^'"\n]*\bfrom\s*['"](\.[^'"]+)['"]/gm,     // import X from './y'
  /^\s*import\s*['"](\.[^'"]+)['"]/gm,                      // import './y' (side-effect)
  /^\s*export\b[^'"\n]*\bfrom\s*['"](\.[^'"]+)['"]/gm,      // export { x } from './y'
  /(?:^\s*|[=(,?:[]\s*|\bawait\s+)require\(\s*['"](\.[^'"]+)['"]/gm, // = require('./y')
  /(?:[=(,?:[]\s*|\bawait\s+)import\(\s*['"](\.[^'"]+)['"]/gm,       // await import('./y')
];
for (const f of files) {
  const s = stripComments(fs.readFileSync(f, 'utf8'));
  let m;
  const seen = new Set();
  for (const re of patterns) {
    re.lastIndex = 0;
    while ((m = re.exec(s))) {
      const key = m[1] + '@' + m.index;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!resolveFile(f, m[1])) problems.push(`UNRESOLVED  ${path.relative(ROOT, f)}  ->  ${m[1]}`);
    }
  }
  // Named import of a missing export (relative targets only).
  const reNamed = /^\s*import\s*(?:[A-Za-z0-9_$]+\s*,\s*)?\{([^}]*)\}\s*from\s*['"](\.[^'"]+)['"]/gm;
  while ((m = reNamed.exec(s))) {
    const tgt = resolveFile(f, m[2]);
    if (!tgt) continue;
    const exp = namedExports(tgt);
    if (exp.has('*')) continue;
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t || t === 'type') continue;
      const name = t.split(/\s+as\s+/)[0].trim();
      if (name && !exp.has(name)) {
        problems.push(`MISSING EXPORT  ${name}\n     in ${path.relative(ROOT, f)}\n     from ${path.relative(ROOT, tgt)}`);
      }
    }
  }
}

if (problems.length) {
  console.error(`\ncheck-imports: ${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error('  ' + p);
  console.error('\nA relative import points at a missing file or a non-exported name.');
  process.exit(1);
}
console.log(`check-imports: OK (${files.length} files, no unresolved imports or missing named exports).`);
