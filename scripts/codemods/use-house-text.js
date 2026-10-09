#!/usr/bin/env node
'use strict';

/*
 * use-house-text.js
 *
 * Codemod: every shipped source file that imports Text and/or TextInput from
 * 'react-native' imports them from the house primitives instead:
 *
 *   import Text from '<relative>/components/Text';
 *   import TextInput from '<relative>/components/TextInput';
 *
 * WHY (docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md D104-1,
 * docs/responsive-display-campaign-27-2026-08-17/PROPOSAL.md Pillar B, phase
 * 2b stage 2): React 19's runtime dropped Text.defaultProps, so the reading
 * cap (fontScaleCaps.reading) can only be applied app-wide by routing every
 * Text and TextInput through src/components/Text.js and
 * src/components/TextInput.js, which carry the cap by default.
 *
 * SCOPE RULES:
 *  - Only plain (non-aliased) `import { Text, TextInput } from 'react-native'`
 *    specifiers are rewritten. The other names in the import stay exactly as
 *    they are; the react-native import is removed only if nothing else is
 *    left in it. The new import line(s) go directly after the react-native
 *    import.
 *  - Aliased specifiers (`Text as RNText`) are never touched; they are listed
 *    in the summary so a human can decide.
 *  - Files whose react-native import carries a comment, a default or a
 *    namespace binding next to Text/TextInput, or that read Text/TextInput
 *    through require('react-native'), are NOT rewritten; they are listed as
 *    "manual" so nothing is silently skipped.
 *  - Files that wrap Text/TextInput in Animated.createAnimatedComponent are
 *    rewritten like any other (the primitives are forwardRef components) and
 *    are listed in the summary for a second look.
 *  - Any static other than TextInput.State read off Text/TextInput is listed
 *    in the summary (the primitive copies State only).
 *  - Never touched: any path with a __tests__ or __mocks__ segment, the
 *    two primitives themselves (src/components/Text.js, TextInput.js) and
 *    src/styles/fonts.js (it patches React Native's own Text/TextInput
 *    defaultProps, so it must keep the real ones).
 *
 * IMPLEMENTATION: AST-guided (@babel/parser + @babel/traverse, already in
 * node_modules as part of the Expo/babel toolchain; no dependency added).
 * Edits are exact-position splices of the import declaration only; nothing
 * else in the file is reprinted.
 *
 * Idempotent: once a file no longer imports Text/TextInput from
 * 'react-native', a second pass makes zero edits.
 *
 * USAGE:
 *   node scripts/codemods/use-house-text.js [options] <glob> [<glob> ...]
 *
 * OPTIONS:
 *   --check              Dry run: report what would change, write nothing.
 *                         Exits 1 if any file needs an edit (or needs manual
 *                         attention), 0 if clean.
 *   --exclude=<glob>      Repeatable. Files matching are skipped.
 *
 * Glob syntax (hand-rolled, as in add-max-font-multiplier.js): '*' and '**'.
 *
 * EXAMPLE:
 *   node scripts/codemods/use-house-text.js --check 'src/**\/*.js'
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const REPO_ROOT = process.cwd();
const COMPONENTS_DIR = path.join(REPO_ROOT, 'src', 'components');
const TARGETS = ['Text', 'TextInput'];
const PRIMITIVE_FILES = new Set([
  path.join(COMPONENTS_DIR, 'Text.js'),
  path.join(COMPONENTS_DIR, 'TextInput.js'),
  // src/styles/fonts.js patches React Native's own Text/TextInput
  // (defaultProps), so it must keep importing the real ones.
  path.join(REPO_ROOT, 'src', 'styles', 'fonts.js'),
]);

const PARSER_PLUGINS = [
  'jsx',
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'objectRestSpread',
  'optionalChaining',
  'nullishCoalescingOperator',
  'optionalCatchBinding',
  'dynamicImport',
  'exportDefaultFrom',
  'exportNamespaceFrom',
  'numericSeparator',
  'logicalAssignment',
  'topLevelAwait',
];

// ---------------------------------------------------------------------------
// Minimal glob support (no new dependency). Supports '*' and '**' segments.
// ---------------------------------------------------------------------------

function segmentToRegExp(segment) {
  const escaped = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function globWalk(baseDir, segments, idx, results) {
  if (idx === segments.length) return;
  const seg = segments[idx];
  const isLast = idx === segments.length - 1;

  if (seg === '**') {
    globWalk(baseDir, segments, idx + 1, results);
    let entries;
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) globWalk(path.join(baseDir, entry.name), segments, idx, results);
    }
    return;
  }

  const regex = segmentToRegExp(seg);
  let entries;
  try {
    entries = fs.readdirSync(baseDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!regex.test(entry.name)) continue;
    const full = path.join(baseDir, entry.name);
    if (isLast) {
      if (entry.isFile()) results.push(full);
    } else if (entry.isDirectory()) {
      globWalk(full, segments, idx + 1, results);
    }
  }
}

function expandGlob(pattern) {
  const abs = path.isAbsolute(pattern) ? pattern : path.join(REPO_ROOT, pattern);
  if (!pattern.includes('*')) return fs.existsSync(abs) ? [abs] : [];
  const relFromRoot = path.isAbsolute(pattern) ? path.relative(REPO_ROOT, pattern) : pattern;
  const results = [];
  globWalk(REPO_ROOT, relFromRoot.split('/'), 0, results);
  return results;
}

function isAlwaysExcluded(absPath) {
  const rel = path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
  return (
    /(^|\/)__tests__(\/|$)/.test(rel) ||
    /(^|\/)__mocks__(\/|$)/.test(rel) ||
    PRIMITIVE_FILES.has(absPath)
  );
}

// ---------------------------------------------------------------------------
// Per-file transform
// ---------------------------------------------------------------------------

function importPathFor(absPath, name) {
  const target = path.join(COMPONENTS_DIR, name);
  let rel = path.relative(path.dirname(absPath), target).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function processFile(absPath) {
  const rel = path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
  const source = fs.readFileSync(absPath, 'utf8');

  // Cheap pre-filter: nothing to do unless react-native and Text appear.
  if (!/react-native/.test(source) || !/\bText(Input)?\b/.test(source)) {
    return { rel, imports: 0, edits: [] };
  }

  let ast;
  try {
    ast = parse(source, { sourceType: 'module', plugins: PARSER_PLUGINS, allowReturnOutsideFunction: true });
  } catch (e) {
    return { rel, parseError: e.message };
  }

  const result = {
    rel,
    imports: 0, // import lines touched
    aliased: [], // 'Text as RNText' specifiers left alone
    manual: [], // reasons a file could not be rewritten safely
    animated: [], // createAnimatedComponent(Text|TextInput) sites
    statics: [], // other statics read off Text/TextInput
    edits: [],
  };

  const localToTarget = new Map(); // local name -> 'Text' | 'TextInput' (rewritten)

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== 'react-native') continue;
    if (node.importKind === 'type' || node.importKind === 'typeof') continue;

    const hits = [];
    for (const spec of node.specifiers) {
      if (spec.type !== 'ImportSpecifier') continue;
      const importedName = spec.imported.name || spec.imported.value;
      if (!TARGETS.includes(importedName)) continue;
      if (spec.local.name !== importedName) {
        result.aliased.push(`${importedName} as ${spec.local.name}`);
        continue;
      }
      hits.push(spec);
    }
    if (hits.length === 0) continue;

    const declText = source.slice(node.start, node.end);
    if (/\/\/|\/\*/.test(declText)) {
      result.manual.push(`react-native import carries a comment (line ${node.loc.start.line})`);
      continue;
    }
    if (node.specifiers.some((s) => s.type !== 'ImportSpecifier')) {
      result.manual.push(`react-native import has a default or namespace binding (line ${node.loc.start.line})`);
      continue;
    }

    const quote = source[node.source.start];
    const semi = declText.trimEnd().endsWith(';') ? ';' : '';
    const multiline = declText.includes('\n');
    const lineStart = source.lastIndexOf('\n', node.start - 1) + 1;
    const indent = source.slice(lineStart, node.start).match(/^\s*/)[0];
    const eol = source.includes('\r\n') ? '\r\n' : '\n';

    const kept = node.specifiers.filter((s) => !hits.includes(s));
    const keptTexts = kept.map((s) => source.slice(s.start, s.end));

    const lines = [];
    if (kept.length > 0) {
      if (multiline) {
        // Remove only the Text/TextInput specifiers in place so the rest of
        // the import keeps its exact layout.
        let decl = declText;
        const base = node.start;
        for (const spec of [...hits].sort((a, b) => b.start - a.start)) {
          const a = spec.start - base;
          const b = spec.end - base;
          const right = /^\s*,[ \t]*/.exec(decl.slice(b));
          if (right) {
            decl = decl.slice(0, a) + decl.slice(b + right[0].length);
          } else {
            const left = /,\s*$/.exec(decl.slice(0, a));
            decl = decl.slice(0, a - (left ? left[0].length : 0)) + decl.slice(b);
          }
        }
        decl = decl.replace(/[ \t]+(\r?\n)/g, '$1').replace(/(\r?\n)[ \t]*(?=\r?\n)/g, '');
        lines.push(decl);
      } else {
        lines.push(`import { ${keptTexts.join(', ')} } from ${quote}react-native${quote}${semi}`);
      }
    }
    for (const name of TARGETS) {
      if (hits.some((s) => s.local.name === name)) {
        lines.push(`import ${name} from ${quote}${importPathFor(absPath, name)}${quote}${semi}`);
        localToTarget.set(name, name);
      }
    }

    result.edits.push({
      start: node.start,
      end: node.end,
      text: lines.join(`${eol}${indent}`),
    });
    result.imports++;
  }

  if (localToTarget.size > 0 || result.aliased.length > 0) {
    // Record createAnimatedComponent wrappers and other statics, for review.
    traverse(ast, {
      CallExpression(p) {
        const callee = p.node.callee;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'createAnimatedComponent'
        ) {
          const arg = p.node.arguments[0];
          if (arg && arg.type === 'Identifier' && localToTarget.has(arg.name)) {
            result.animated.push(`${arg.name} (line ${p.node.loc.start.line})`);
          }
        }
      },
      MemberExpression(p) {
        const o = p.node.object;
        if (o.type === 'Identifier' && localToTarget.has(o.name) && !p.node.computed) {
          const prop = p.node.property.name;
          if (prop !== 'State') result.statics.push(`${o.name}.${prop} (line ${p.node.loc.start.line})`);
        }
      },
    });
  }

  // require('react-native') destructuring of Text/TextInput: report only.
  if (/(?:const|let|var)\s*\{[^}]*\bText(?:Input)?\b[^}]*\}\s*=\s*require\(\s*['"]react-native['"]\s*\)/.test(source)) {
    result.manual.push("reads Text/TextInput through require('react-native')");
  }

  if (result.edits.length > 0) {
    let out = source;
    for (const e of [...result.edits].sort((a, b) => b.start - a.start)) {
      out = out.slice(0, e.start) + e.text + out.slice(e.end);
    }
    result.newSource = out;
  }
  return result;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const check = argv.includes('--check');
  const excludeGlobs = [];
  const patterns = [];
  for (const arg of argv) {
    if (arg === '--check') continue;
    if (arg.startsWith('--exclude=')) excludeGlobs.push(arg.slice('--exclude='.length));
    else patterns.push(arg);
  }
  if (patterns.length === 0) {
    process.stderr.write('Usage: node use-house-text.js [--check] [--exclude=<glob>]... <glob> [<glob> ...]\n');
    process.exit(2);
  }

  const excludeAbs = new Set();
  for (const g of excludeGlobs) for (const f of expandGlob(g)) excludeAbs.add(f);
  const fileSet = new Set();
  for (const p of patterns) for (const f of expandGlob(p)) fileSet.add(f);

  const files = [...fileSet]
    .filter((f) => f.endsWith('.js'))
    .filter((f) => !isAlwaysExcluded(f))
    .filter((f) => !excludeAbs.has(f))
    .sort();

  let filesChanged = 0;
  let importLines = 0;
  const aliased = [];
  const manual = [];
  const animated = [];
  const statics = [];
  const parseErrors = [];

  for (const absPath of files) {
    const r = processFile(absPath);
    if (r.parseError) {
      parseErrors.push({ rel: r.rel, error: r.parseError });
      continue;
    }
    if (r.aliased && r.aliased.length) aliased.push(`${r.rel}: ${r.aliased.join(', ')}`);
    if (r.manual && r.manual.length) manual.push(`${r.rel}: ${r.manual.join('; ')}`);
    if (r.animated && r.animated.length) animated.push(`${r.rel}: ${r.animated.join(', ')}`);
    if (r.statics && r.statics.length) statics.push(`${r.rel}: ${r.statics.join(', ')}`);
    if (r.edits.length > 0) {
      filesChanged++;
      importLines += r.imports;
      if (check) {
        console.log(`[would change] ${r.rel} (${r.imports} import line${r.imports === 1 ? '' : 's'})`);
      } else {
        fs.writeFileSync(absPath, r.newSource, 'utf8');
        console.log(`[changed] ${r.rel} (${r.imports} import line${r.imports === 1 ? '' : 's'})`);
      }
    }
  }

  console.log('');
  console.log('=== use-house-text summary ===');
  console.log(`Files scanned:        ${files.length}`);
  console.log(`Files changed:        ${filesChanged}`);
  console.log(`Import lines touched: ${importLines}`);
  const section = (title, list) => {
    console.log(`${title}: ${list.length}`);
    for (const l of list) console.log(`    ${l}`);
  };
  section('Aliased imports left alone', aliased);
  section('createAnimatedComponent sites', animated);
  section('Statics other than State', statics);
  section('Manual attention needed', manual);
  section('Parse errors', parseErrors.map((p) => `${p.rel}: ${p.error}`));

  const pending = filesChanged > 0 || manual.length > 0 || parseErrors.length > 0;
  if (check) process.exit(pending ? 1 : 0);
  if (manual.length > 0 || parseErrors.length > 0) process.exit(1);
}

main();
