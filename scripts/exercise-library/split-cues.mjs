#!/usr/bin/env node
/**
 * scripts/exercise-library/split-cues.mjs
 *
 * One-off format migration (D151, instruction contract): turns each corpus
 * entry's single `cue` string (EL-17: "setup, execution, the one thing that
 * goes wrong", in that order) into the structured fields the detail
 * surfaces now render:
 *
 *   setup:     the first sentence
 *   execution: the second sentence
 *   watch:     the third sentence, when there is one (omitted otherwise)
 *
 * Purely mechanical and idempotent: an entry that already carries `setup`
 * is left alone; an entry whose cue does not split into two or three
 * sentences is reported and left alone for a hand pass. Run with --check
 * to report without writing. The family files keep their formatting; only
 * the `cue:` line is replaced.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'src/lib/exerciseCorpus/families');
const check = process.argv.includes('--check');

function splitSentences(text) {
  return text
    .split(/(?<=\.)\s+(?=[A-Z0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// JS string literal (double-quoted, as the generated families use) -> text.
function unquote(lit) {
  return JSON.parse(lit);
}
function quote(text) {
  return JSON.stringify(text);
}

let converted = 0;
const skipped = [];
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.js'))) {
  const path = join(DIR, file);
  const src = readFileSync(path, 'utf8');
  let out = src;
  const re = /^(\s*)cue: ("(?:[^"\\]|\\.)*"),?\n/gm;
  out = src.replace(re, (whole, indent, lit) => {
    const cue = unquote(lit);
    const parts = splitSentences(cue);
    if (parts.length < 2 || parts.length > 3) {
      skipped.push(`${file}: ${cue.slice(0, 60)}... (${parts.length} sentences)`);
      return whole;
    }
    converted++;
    const lines = [
      `${indent}setup: ${quote(parts[0])},`,
      `${indent}execution: ${quote(parts[1])},`,
    ];
    if (parts[2]) lines.push(`${indent}watch: ${quote(parts[2])},`);
    return lines.join('\n') + '\n';
  });
  if (!check && out !== src) writeFileSync(path, out);
}
console.log(`${check ? 'would convert' : 'converted'} ${converted} cue(s)`);
if (skipped.length) {
  console.log(`left alone (${skipped.length}):`);
  for (const s of skipped) console.log('  ' + s);
}
