import { loadSeedRows } from './loadSeed.mjs';
import { writeFileSync } from 'node:fs';
const rows = loadSeedRows();
const barbell = rows.filter(r => r.equipment === 'barbell');
const dumbbell = rows.filter(r => r.equipment === 'dumbbell');
writeFileSync('/tmp/claude-0/-home-user-ADPhysique/88f761ad-94a9-51c1-aab2-70031927be33/scratchpad/barbell.json', JSON.stringify(barbell, null, 2));
writeFileSync('/tmp/claude-0/-home-user-ADPhysique/88f761ad-94a9-51c1-aab2-70031927be33/scratchpad/dumbbell.json', JSON.stringify(dumbbell, null, 2));
console.log('barbell', barbell.length, 'dumbbell', dumbbell.length);
// also dump subregions per muscle
const subByMuscle = {};
for (const r of rows) {
  if (!subByMuscle[r.primaryMuscle]) subByMuscle[r.primaryMuscle] = new Set();
  if (r.subregion) subByMuscle[r.primaryMuscle].add(r.subregion);
}
const out = {};
for (const k in subByMuscle) out[k] = [...subByMuscle[k]].sort();
writeFileSync('/tmp/claude-0/-home-user-ADPhysique/88f761ad-94a9-51c1-aab2-70031927be33/scratchpad/subregions.json', JSON.stringify(out, null, 2));
