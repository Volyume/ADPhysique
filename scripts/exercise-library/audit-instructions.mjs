#!/usr/bin/env node
/**
 * scripts/exercise-library/audit-instructions.mjs
 *
 * The instruction-quality audit (D151). Runs every live corpus row through
 * the shared contract (src/lib/exerciseCorpus/instructionContract.js) and
 * reports violations grouped by family and by rule, plus the coverage
 * figures a reviewer wants at a glance (rows, rows with a watch line,
 * length medians). Read-only; writes the JSON report to
 * docs/exercise-library-expansion-2026-09-05/data/instruction-audit.json
 * unless --no-write is passed. Exit code is 0 either way: the build gate
 * is validate-corpus.mjs, this is the reviewer's view of the same rule.
 *
 * Run: node scripts/exercise-library/audit-instructions.mjs [--family=barbell] [--no-write]
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { CORPUS, FAMILY_NAMES } = await import(join(ROOT, 'src/lib/exerciseCorpus/index.js'));
const { validateInstructions } = await import(join(ROOT, 'src/lib/exerciseCorpus/instructionContract.js'));

const familyArg = process.argv.find((a) => a.startsWith('--family='))?.slice('--family='.length);
const noWrite = process.argv.includes('--no-write');

// Family of a row = the module it came from; the index concatenates in
// FAMILY_NAMES order, so recover it by walking the modules.
const familyOf = new Map();
for (const family of FAMILY_NAMES) {
  const mod = (await import(join(ROOT, `src/lib/exerciseCorpus/families/${family}.js`))).default;
  for (const e of mod) if (!e.retiredInto) familyOf.set(e.name, family);
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

const report = { generatedAt: new Date().toISOString(), families: {}, byRule: {}, totals: {} };
let totalRows = 0;
let totalViolations = 0;
for (const entry of CORPUS) {
  const family = familyOf.get(entry.name) ?? 'unknown';
  if (familyArg && family !== familyArg) continue;
  const f = (report.families[family] ??= { rows: 0, withWatch: 0, setupLens: [], executionLens: [], violations: [] });
  f.rows++;
  totalRows++;
  if (entry.watch) f.withWatch++;
  f.setupLens.push((entry.setup ?? '').length);
  f.executionLens.push((entry.execution ?? '').length);
  for (const v of validateInstructions(entry, entry.name)) {
    f.violations.push(v);
    totalViolations++;
    const rule = v.replace(/^[^:]+: /, '').replace(/"[^"]*"/g, '"…"').replace(/\d+/g, 'N');
    report.byRule[rule] = (report.byRule[rule] ?? 0) + 1;
  }
}

for (const [family, f] of Object.entries(report.families)) {
  f.setupMedian = median(f.setupLens);
  f.executionMedian = median(f.executionLens);
  delete f.setupLens;
  delete f.executionLens;
  console.log(`${family.padEnd(14)} rows ${String(f.rows).padStart(4)}  watch ${String(f.withWatch).padStart(4)}  setup~${f.setupMedian}  exec~${f.executionMedian}  violations ${f.violations.length}`);
}
report.totals = { rows: totalRows, violations: totalViolations };
console.log(`\nrules hit:`);
for (const [rule, n] of Object.entries(report.byRule).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${rule}`);
console.log(`\ntotal rows ${totalRows}, violations ${totalViolations}`);

if (!noWrite && !familyArg) {
  const out = join(ROOT, 'docs/exercise-library-expansion-2026-09-05/data/instruction-audit.json');
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(`wrote ${out}`);
}
