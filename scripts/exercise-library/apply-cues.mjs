#!/usr/bin/env node
/**
 * scripts/exercise-library/apply-cues.mjs
 *
 * EL-17 cue application (07-CORPUS-FORMAT.md; exercise-library-expansion-
 * 2026-09-05 integration job 4). Reads every `data/cues-*.json` file
 * present in docs/exercise-library-expansion-2026-09-05/data/ (each one a
 * flat { "Exercise Name": "cue text" } map, authored per family by agents)
 * and writes each named entry's `cue` field into its family module under
 * src/lib/exerciseCorpus/families/.
 *
 * Idempotent: rerunning replaces the cue for any name present in a cue
 * file with that file's current text; a name absent from every cue file
 * keeps whatever cue it already has (including empty). Missing cue files
 * (e.g. the concurrent agents' `cues-new-a.json` / `cues-new-b.json`
 * before they land) are skipped silently — this script only acts on
 * `cues-*.json` files that actually exist.
 *
 * A name present in more than one cue file with different text is a
 * conflict: the file that sorts last alphabetically wins (reported, not
 * hidden). A name in a cue file that cannot be found in any family module
 * is reported and otherwise ignored (typo, retired name, or a name not
 * yet integrated).
 *
 * Run: node scripts/exercise-library/apply-cues.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DATA_DIR = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data');
const FAMILIES_DIR = join(ROOT, 'src/lib/exerciseCorpus/families');

const FAMILY_FILES = [
  'barbell', 'dumbbell', 'cable', 'machine', 'smith', 'bodyweight', 'band',
  'suspension', 'kettlebell', 'landmine', 'carries', 'power', 'specialty',
  'medicine_ball', 'sled', 'sandbag',
].map((f) => `${f}.js`);

// ── 1. Load every cues-*.json file present (skip missing ones silently) ──
const cueFiles = readdirSync(DATA_DIR).filter((f) => /^cues-.*\.json$/.test(f)).sort();
if (!cueFiles.length) {
  console.log('apply-cues: no data/cues-*.json files found, nothing to do');
  process.exit(0);
}

const cueMap = new Map(); // name -> { cue, file }
const conflicts = [];
for (const file of cueFiles) {
  let raw;
  try {
    raw = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
  } catch (e) {
    console.error(`apply-cues: could not parse ${file}: ${e.message}`);
    process.exitCode = 1;
    continue;
  }
  for (const [name, cue] of Object.entries(raw)) {
    if (typeof cue !== 'string' || !cue.trim()) continue;
    const existing = cueMap.get(name);
    if (existing && existing.cue !== cue) {
      conflicts.push(`"${name}": ${existing.file} vs ${file} (${file} wins, sorts later)`);
    }
    cueMap.set(name, { cue, file });
  }
}

console.log(`apply-cues: loaded ${cueFiles.length} cue file(s): ${cueFiles.join(', ')}`);
console.log(`apply-cues: ${cueMap.size} unique named cue(s) to apply`);
if (conflicts.length) {
  console.log(`apply-cues: ${conflicts.length} name(s) appeared in more than one file:`);
  for (const c of conflicts) console.log(`  - ${c}`);
}

// ── 2. Patch each family module: replace the `cue` field of any named ────
//    entry found in cueMap, leaving every other byte untouched. Mirrors
//    integrate-inventories.mjs's patchNamedEntry technique: entries are
//    single-object-per-line-block literals, so a plain string search for
//    the `name: "<Name>",` line locates the enclosing `{ ... },` block.
let appliedCount = 0;
const appliedNames = new Set();

for (const file of FAMILY_FILES) {
  const filePath = join(FAMILIES_DIR, file);
  let src = readFileSync(filePath, 'utf8');
  let changed = false;

  for (const [name, { cue }] of cueMap) {
    const needle = `    name: ${JSON.stringify(name)},`;
    const nameIdx = src.indexOf(needle);
    if (nameIdx === -1) continue;

    const blockStart = src.lastIndexOf('  {', nameIdx);
    const blockEnd = src.indexOf('\n  },', nameIdx) + '\n  },'.length;
    const block = src.slice(blockStart, blockEnd);

    const newCueLine = `cue: ${JSON.stringify(cue)},`;
    let newBlock;
    if (/cue: "(?:[^"\\]|\\.)*",/.test(block)) {
      newBlock = block.replace(/cue: "(?:[^"\\]|\\.)*",/, newCueLine);
    } else {
      // Defensive: every entry in this format carries a cue field, but if
      // one genuinely doesn't, add it right before the closing brace.
      newBlock = block.replace(/\n(\s*)\},\s*$/, `\n    ${newCueLine}\n$1},`);
    }

    if (newBlock !== block) {
      src = src.slice(0, blockStart) + newBlock + src.slice(blockEnd);
      changed = true;
      appliedCount++;
      appliedNames.add(name);
    }
  }

  if (changed) writeFileSync(filePath, src);
}

const notFound = [...cueMap.keys()].filter((n) => !appliedNames.has(n));
console.log(`apply-cues: applied ${appliedCount} cue(s) across the family modules`);
if (notFound.length) {
  console.log(`apply-cues: ${notFound.length} name(s) from cue files not found in any family module (typo, retired name, or not yet integrated):`);
  for (const n of notFound) console.log(`  - "${n}"`);
}

// ── 3. Report how many live corpus rows still have an empty cue ─────────
const { CORPUS } = await import(join(FAMILIES_DIR, '..', 'index.js'));
const stillEmpty = CORPUS.filter((e) => !e.cue || !e.cue.trim());
console.log(`apply-cues: ${stillEmpty.length} of ${CORPUS.length} live corpus rows still have an empty cue`);
