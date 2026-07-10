#!/usr/bin/env node
'use strict';

/*
 * add-max-font-multiplier.js
 *
 * Codemod: adds an explicit maxFontSizeMultiplier={1.3} to every raw
 * <Text> / <TextInput> JSX element (imported from 'react-native') that does
 * not already carry the prop.
 *
 * WHY (see docs/ux-world-class-audit-2026-07-09/DECISIONS-2026-07-09.md,
 * founder ruling D30, campaign item 6): React 19's automatic JSX runtime
 * silently drops Text.defaultProps, so a single global default no longer
 * works under RN 0.81 + React 19. Every font-scale cap must now be an
 * explicit, grep-able prop on each element. House cap value = 1.3 (the
 * precedent set by Chip.js / SetEntry.js / ActiveWorkoutScreen.js /
 * WorkoutHistoryScreen.js / MealPlanScreen.js).
 *
 * SCOPE RULES (D30 + campaign item 6):
 *  - Only elements whose JSX tag name resolves, via THAT FILE'S OWN
 *    `import ... from 'react-native'` declarations, to Text or TextInput.
 *    Aliased local names (`import { Text as RNText } from 'react-native'`)
 *    are followed. A `Text` (or similar) imported from any other module
 *    (react-native-svg, @shopify/react-native-skia, etc.) is never touched,
 *    because it is never in that file's react-native import map.
 *  - Elements that already carry a maxFontSizeMultiplier prop (any value)
 *    are left byte-for-byte untouched (RollingNumber's pass-through,
 *    RestTimer's 1.15 outlier, Chip's overridable default, etc).
 *  - Animated.Text / Animated.TextInput JSX usage, and
 *    Animated.createAnimatedComponent(Text|TextInput) wrapper declarations,
 *    are never touched — only counted and listed in the summary, because
 *    they are not literal Text/TextInput elements.
 *  - The prop is inserted immediately after the tag name, BEFORE any
 *    existing props/spreads, so a later explicit prop or spread can still
 *    override it (matches Chip.js's overridable-default precedent).
 *
 * IMPLEMENTATION: AST-guided (via @babel/parser + @babel/traverse, already
 * present in node_modules as part of the Expo/babel toolchain - no new
 * dependency is added or declared). Edits are computed as exact-position
 * text splices and applied to the ORIGINAL source string; nothing is
 * reprinted, so formatting is untouched everywhere except the inserted
 * prop text itself.
 *
 * Idempotent: running twice makes zero further edits on the second pass.
 *
 * Permanent safety default: any path containing a `__tests__` or
 * `__mocks__` directory segment is always skipped, regardless of the globs
 * passed in - this codemod targets shipped UI, not test fixtures/mocks.
 *
 * USAGE:
 *   node scripts/codemods/add-max-font-multiplier.js [options] <glob> [<glob> ...]
 *
 * OPTIONS:
 *   --check              Dry run: report what would change, write nothing.
 *                         Exits 1 if any file needs an edit, 0 if clean.
 *   --exclude=<glob>      Repeatable. Files matching any --exclude glob are
 *                         skipped (in addition to the permanent __tests__/
 *                         __mocks__ skip above).
 *
 * Glob syntax supported (hand-rolled, no new dependency): '*' (any run of
 * characters except '/') and '**' (any number of path segments, including
 * zero). Plain literal paths (no '*') are also accepted directly.
 *
 * EXAMPLE (this run, campaign item 6 sweep, lane files owned by a
 * concurrent agent excluded):
 *   node scripts/codemods/add-max-font-multiplier.js \
 *     --exclude=src/navigation/RootNavigator.js \
 *     --exclude=src/screens/ProgressPhotosScreen.js \
 *     --exclude=src/components/ProgressPhotoViewer.js \
 *     --exclude=src/screens/ExerciseDetailScreen.js \
 *     --exclude=src/components/RollingNumber.js \
 *     'src/**\/*.js'
 */

const fs = require('fs');
const path = require('path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const REPO_ROOT = process.cwd();
const CAP_VALUE = '1.3';
const CAP_PROP_TEXT = ` maxFontSizeMultiplier={${CAP_VALUE}}`;
const TARGET_COMPONENTS = new Set(['Text', 'TextInput']);
const ANIMATED_WRAPPABLE = new Set(['Text', 'TextInput']);

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
  if (idx === segments.length) {
    return;
  }
  const seg = segments[idx];
  const isLast = idx === segments.length - 1;

  if (seg === '**') {
    // Zero directories consumed: try the rest of the pattern here too.
    globWalk(baseDir, segments, idx + 1, results);
    let entries;
    try {
      entries = fs.readdirSync(baseDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        globWalk(path.join(baseDir, entry.name), segments, idx, results);
      }
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
  if (!pattern.includes('*')) {
    return fs.existsSync(abs) ? [abs] : [];
  }
  const relFromRoot = path.isAbsolute(pattern) ? path.relative(REPO_ROOT, pattern) : pattern;
  const segments = relFromRoot.split('/');
  const results = [];
  globWalk(REPO_ROOT, segments, 0, results);
  return results;
}

function isAlwaysExcluded(absPath) {
  const rel = path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
  return /(^|\/)__tests__(\/|$)/.test(rel) || /(^|\/)__mocks__(\/|$)/.test(rel);
}

// ---------------------------------------------------------------------------
// Per-file transform
// ---------------------------------------------------------------------------

function processFile(absPath) {
  const rel = path.relative(REPO_ROOT, absPath).split(path.sep).join('/');
  const source = fs.readFileSync(absPath, 'utf8');

  let ast;
  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: PARSER_PLUGINS,
      allowReturnOutsideFunction: true,
    });
  } catch (e) {
    return { rel, parseError: e.message };
  }

  // Resolve, for THIS file only, which local names are bound to react-native's
  // Text / TextInput / Animated via that file's own import declarations.
  const targetLocalNames = new Map(); // localName -> 'Text' | 'TextInput'
  const animatedLocalNames = new Set(); // local names bound to react-native's Animated

  for (const node of ast.program.body) {
    if (node.type !== 'ImportDeclaration' || node.source.value !== 'react-native') continue;
    for (const spec of node.specifiers) {
      if (spec.type !== 'ImportSpecifier') continue;
      const importedName = spec.imported.name || spec.imported.value;
      if (TARGET_COMPONENTS.has(importedName)) {
        targetLocalNames.set(spec.local.name, importedName);
      } else if (importedName === 'Animated') {
        animatedLocalNames.add(spec.local.name);
      }
    }
  }

  const result = {
    rel,
    capped: 0,
    alreadyCapped: 0,
    spreadCarrying: [],
    animatedSites: [], // { line, kind: 'Animated.Text JSX' | 'createAnimatedComponent wrapper' }
    edits: [],
  };

  if (targetLocalNames.size === 0 && animatedLocalNames.size === 0) {
    return result; // File never imports Text/TextInput/Animated from react-native.
  }

  traverse(ast, {
    JSXOpeningElement(pathNode) {
      const nameNode = pathNode.node.name;
      let componentLabel = null;

      if (nameNode.type === 'JSXIdentifier' && targetLocalNames.has(nameNode.name)) {
        componentLabel = targetLocalNames.get(nameNode.name);
      } else if (
        nameNode.type === 'JSXMemberExpression' &&
        nameNode.object.type === 'JSXIdentifier' &&
        animatedLocalNames.has(nameNode.object.name) &&
        ANIMATED_WRAPPABLE.has(nameNode.property.name)
      ) {
        // Animated.Text / Animated.TextInput - reported, never edited.
        result.animatedSites.push({
          line: pathNode.node.loc ? pathNode.node.loc.start.line : null,
          kind: `Animated.${nameNode.property.name} JSX`,
        });
        return;
      }

      if (!componentLabel) return;

      const hasCap = pathNode.node.attributes.some(
        (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'maxFontSizeMultiplier'
      );
      if (hasCap) {
        result.alreadyCapped++;
        return;
      }

      const hasSpread = pathNode.node.attributes.some((attr) => attr.type === 'JSXSpreadAttribute');
      if (hasSpread) {
        result.spreadCarrying.push(pathNode.node.loc ? pathNode.node.loc.start.line : null);
      }

      result.edits.push({ pos: nameNode.end, text: CAP_PROP_TEXT });
      result.capped++;
    },

    CallExpression(pathNode) {
      const callee = pathNode.node.callee;
      if (
        callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        animatedLocalNames.has(callee.object.name) &&
        callee.property.type === 'Identifier' &&
        callee.property.name === 'createAnimatedComponent'
      ) {
        const arg = pathNode.node.arguments[0];
        if (arg && arg.type === 'Identifier' && targetLocalNames.has(arg.name)) {
          result.animatedSites.push({
            line: pathNode.node.loc ? pathNode.node.loc.start.line : null,
            kind: `Animated.createAnimatedComponent(${arg.name}) wrapper`,
          });
        }
      }
    },
  });

  if (result.edits.length > 0) {
    const sorted = [...result.edits].sort((a, b) => a.pos - b.pos);
    let newSource = source;
    let offset = 0;
    for (const edit of sorted) {
      const insertAt = edit.pos + offset;
      newSource = newSource.slice(0, insertAt) + edit.text + newSource.slice(insertAt);
      offset += edit.text.length;
    }
    result.newSource = newSource;
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
    if (arg.startsWith('--exclude=')) {
      excludeGlobs.push(arg.slice('--exclude='.length));
      continue;
    }
    patterns.push(arg);
  }

  if (patterns.length === 0) {
    process.stderr.write('Usage: node add-max-font-multiplier.js [--check] [--exclude=<glob>]... <glob> [<glob> ...]\n');
    process.exit(2);
  }

  const excludeAbs = new Set();
  for (const g of excludeGlobs) {
    for (const f of expandGlob(g)) excludeAbs.add(f);
  }

  const fileSet = new Set();
  for (const p of patterns) {
    for (const f of expandGlob(p)) fileSet.add(f);
  }

  const files = [...fileSet]
    .filter((f) => f.endsWith('.js'))
    .filter((f) => !isAlwaysExcluded(f))
    .filter((f) => !excludeAbs.has(f))
    .sort();

  let filesChanged = 0;
  let elementsCapped = 0;
  let elementsAlreadyCapped = 0;
  let parseErrors = [];
  let animatedSitesTotal = 0;
  let spreadCarryingFiles = [];
  let animatedSitesByFile = [];
  let pendingChanges = false;

  for (const absPath of files) {
    const result = processFile(absPath);

    if (result.parseError) {
      parseErrors.push({ rel: result.rel, error: result.parseError });
      continue;
    }

    if (result.animatedSites.length > 0) {
      animatedSitesTotal += result.animatedSites.length;
      animatedSitesByFile.push({ rel: result.rel, sites: result.animatedSites });
    }
    if (result.spreadCarrying.length > 0) {
      spreadCarryingFiles.push({ rel: result.rel, lines: result.spreadCarrying });
    }

    elementsAlreadyCapped += result.alreadyCapped;

    if (result.edits.length > 0) {
      pendingChanges = true;
      elementsCapped += result.capped;
      filesChanged++;
      if (check) {
        console.log(`[would change] ${result.rel} (+${result.capped} caps)`);
      } else {
        fs.writeFileSync(absPath, result.newSource, 'utf8');
        console.log(`[changed] ${result.rel} (+${result.capped} caps)`);
      }
    }
  }

  console.log('');
  console.log('=== add-max-font-multiplier summary ===');
  console.log(`Files scanned:            ${files.length}`);
  console.log(`Files changed:            ${filesChanged}`);
  console.log(`Elements capped:          ${elementsCapped}`);
  console.log(`Elements already capped:  ${elementsAlreadyCapped}`);
  console.log(`Animated.* sites (n/a):   ${animatedSitesTotal}`);
  if (animatedSitesByFile.length > 0) {
    console.log('  Animated sites by file:');
    for (const { rel, sites } of animatedSitesByFile) {
      for (const s of sites) {
        console.log(`    ${rel}:${s.line} - ${s.kind}`);
      }
    }
  }
  if (spreadCarryingFiles.length > 0) {
    console.log(`Elements with spreads (cap inserted before spread, overridable):`);
    for (const { rel, lines } of spreadCarryingFiles) {
      console.log(`    ${rel}: lines ${lines.join(', ')}`);
    }
  }
  if (parseErrors.length > 0) {
    console.log(`Parse errors: ${parseErrors.length}`);
    for (const { rel, error } of parseErrors) {
      console.log(`    ${rel}: ${error}`);
    }
  }

  if (check) {
    process.exit(pendingChanges || parseErrors.length > 0 ? 1 : 0);
  }
  if (parseErrors.length > 0) {
    process.exit(1);
  }
}

main();
