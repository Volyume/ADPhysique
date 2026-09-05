#!/usr/bin/env node
/**
 * Adapted-setup coverage audit (reconciliation 2026-08-21, area 6).
 *
 * Classifies EVERY canonical seed exercise: which supported contexts
 * (adaptedSetup SETUP_CONTEXT) materially change how you would set up
 * THIS exercise, versus rows where no adapted-setup text is owed and
 * why (the adaptation is a different library exercise, the station is
 * inherently adapted, the base works from any position, or eligibility
 * rather than setup governs). Compares the materially-needing set with
 * the shipped ADAPTED_SETUP entries and writes
 * docs/capability-campaign-25-2026-08-20/ADAPTED-SETUP-COVERAGE.md.
 *
 * The law behind the split (GC-D9): adaptation-as-DIFFERENT-exercise
 * lives in the library and is routed by eligibility/swaps; only
 * adaptation-as-SETUP-of-the-same-exercise belongs in adaptedSetup.
 *
 * Deterministic; reads only repo files; writes only the report.
 * Run: node scripts/adapted-setup-coverage.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { deriveDemandMetadata } = await import(join(root, 'src/lib/capability/demands.js'));
const { ADAPTED_SETUP, SETUP_CONTEXT, CLASS_TEXT, materialContextsFor } = await import(join(root, 'src/lib/exercise/adaptedSetup.js'));

// EL-14 (exercise-library-expansion-2026-09-05): re-anchored onto the
// structured corpus instead of parsing seedExercises.js's RAW text — RAW
// no longer exists (the format migration replaced it). Retired stub
// entries are already excluded from CORPUS.
const { CORPUS } = await import(join(root, 'src/lib/exerciseCorpus/index.js'));
const rows = CORPUS.map((entry) => ({
  name: entry.name,
  primaryMuscle: entry.primaryMuscle,
  secondaryMuscles: entry.secondaryMuscles ?? [],
  equipment: entry.equipment,
  movementPattern: entry.movementPattern,
  isCompound: entry.compound,
}));

const names = new Set(rows.map((r) => r.name));
const lower = [...names].map((n) => n.toLowerCase());

function classify(r) {
  const d = deriveDemandMetadata({ name: r.name, primaryMuscle: r.primaryMuscle, equipment: r.equipment, movementPattern: r.movementPattern });
  // The SAME classifier the app uses (src/lib/exercise/adaptedSetup.js)
  // decides material contexts - rules live once.
  const needs = materialContextsFor({ ...r, ...d });
  const n = r.name.toLowerCase();
  const whyNot = [];

  if (needs.length === 0) {
    const isMachine = r.equipment === 'machine';
    const isBodyweight = r.equipment === 'bodyweight';
    const alreadySingleSided = /single-arm|single-leg|one-arm|one-leg|\(single|unilateral|pistol|b-stance|kroc|meadows|suitcase|concentration/.test(n);
    const alreadySeatedOrLying = d.position === 'seated' || d.position === 'lying' || /seated|lying|chest-supported|prone/.test(n);
    if (d.impact === true) whyNot.push('impact class: eligibility, not setup, governs');
    else if (alreadySingleSided) whyNot.push('inherently single-sided; the per-side nature is the exercise itself');
    else if (isMachine && alreadySeatedOrLying) whyNot.push('machine station is inherently seated/supported; its own adjustments are the setup (flagship stations carry wheelchair-positioning text as enrichment)');
    else if (isMachine) whyNot.push('machine arm/leg independence varies per model; adaptation guidance would be per-gym, not per-exercise');
    else if (isBodyweight && (d.floorAccess === true || d.position === 'lying')) whyNot.push('floor class: floor-access eligibility and library variants govern');
    else if (d.weightBearingHands === true && isBodyweight) whyNot.push('hand-loading class: the weight-through-hands axis and library variants govern');
    else if (alreadySeatedOrLying) whyNot.push('already seated/supported by design');
    else if (!r.isCompound && ['dumbbell', 'cable', 'band', 'plate'].includes(r.equipment)) whyNot.push('free-implement isolation usable from any base without setup change');
    else whyNot.push('no supported context changes this setup; base instructions suffice');
  }

  return { ...r, needs, whyNot };
}

const classified = rows.map(classify);
const needing = classified.filter((c) => c.needs.length > 0);

// With CLASS_TEXT in the module, every material context resolves to a
// line: the specific entry where one exists, the class default
// otherwise. Verify that invariant here rather than asserting it.
const unresolved = [];
const perContext = {};
let specificLines = 0;
let classLines = 0;
for (const c of needing) {
  const entry = ADAPTED_SETUP[c.name] ?? {};
  for (const ctx of c.needs) {
    perContext[ctx] = (perContext[ctx] ?? 0) + 1;
    if (entry[ctx]) specificLines += 1;
    else if (CLASS_TEXT[ctx]) classLines += 1;
    else unresolved.push(`${c.name} / ${ctx}`);
  }
}
const withSpecific = needing.filter((c) => ADAPTED_SETUP[c.name]).length;

const reasonCounts = {};
for (const c of classified.filter((x) => x.needs.length === 0)) {
  const r = c.whyNot[0];
  reasonCounts[r] = (reasonCounts[r] ?? 0) + 1;
}

const pct = (a, b) => (b === 0 ? '100%' : `${Math.round((a / b) * 100)}%`);
const coveredNeeds = specificLines + classLines;
const totalNeeds = coveredNeeds + unresolved.length;

let md = `# ADAPTED-SETUP COVERAGE (generated by scripts/adapted-setup-coverage.mjs)\n\n`;
md += `Classification of all ${rows.length} canonical exercises: which\n`;
md += `supported contexts materially change THIS exercise's setup (strap/\n`;
md += `cuff, one-arm same-station, seated same-equipment, supported,\n`;
md += `reduced range), versus rows where the adaptation is a different\n`;
md += `library exercise or no setup change exists. The classifier lives\n`;
md += `ONCE in src/lib/exercise/adaptedSetup.js (materialContextsFor) and\n`;
md += `is what the exercise screen renders from: class-level default text\n`;
md += `per context (GC-D11) with the richer per-exercise entries\n`;
md += `overriding it. The split follows GC-D9: setup text only where the\n`;
md += `SAME exercise changes setup; different-exercise adaptations live in\n`;
md += `the library and are routed by eligibility and swaps.\n\n`;
md += `## Headline\n\n`;
md += `- Materially need adapted-setup text: **${needing.length}** of ${rows.length} exercises (${pct(needing.length, rows.length)})\n`;
md += `- Context needs across those rows: **${totalNeeds}** (an exercise can need several)\n`;
md += `- Resolved by a rich per-exercise entry: **${specificLines}**\n`;
md += `- Resolved by the class default line: **${classLines}**\n`;
md += `- Unresolved: **${unresolved.length}**${unresolved.length ? ' - LIST BELOW, THIS IS A DEFECT' : ' (coverage of the materially-needing set: 100%)'}\n`;
md += `- Exercises carrying a rich entry: ${withSpecific} of ${needing.length} needing rows (plus enrichment entries below)\n\n`;
md += `## Needs by context\n\n`;
for (const [ctx, count] of Object.entries(perContext).sort((a, b) => b[1] - a[1])) {
  md += `- ${ctx}: ${count} exercises\n`;
}
if (unresolved.length) {
  md += `\n## UNRESOLVED (defects)\n\n`;
  for (const u of unresolved) md += `- ${u}\n`;
}
md += `\n## Rows needing no adapted-setup text (${rows.length - needing.length}), by reason\n\n`;
for (const [reason, count] of Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])) {
  md += `- ${count}: ${reason}\n`;
}
md += `\n## Recorded boundary (not a gap)\n\n`;
md += `Machine one-arm/one-leg use depends on whether the specific gym's\n`;
md += `station has independent arms, converging handles or a fixed yoke -\n`;
md += `per-model knowledge no exercise database can honestly claim. The\n`;
md += `picker's capability questions and per-user allowances carry those\n`;
md += `cases; flagship machine stations carry wheelchair-positioning text\n`;
md += `as enrichment entries.\n\n`;
md += `## Rich per-exercise entries beyond the class rules (enrichment, kept)\n\n`;
const extra = Object.keys(ADAPTED_SETUP).filter((n) => !needing.some((c) => c.name === n));
md += extra.length ? extra.map((n) => `- ${n}`).join('\n') + '\n' : '(none)\n';

writeFileSync(join(root, 'docs/capability-campaign-25-2026-08-20/ADAPTED-SETUP-COVERAGE.md'), md);
console.log(`rows=${rows.length} needing=${needing.length} contextNeeds=${totalNeeds} specific=${specificLines} class=${classLines} unresolved=${unresolved.length}`);
if (unresolved.length) process.exitCode = 1;
