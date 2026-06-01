/**
 * Phase 2 benchmark (rebuild spec): division specialisation.
 * Core gate: a 4-day Bikini and a 4-day Men's Physique program share < 30% of
 * exercises AND have different lead lifts. Plus: specialised splits match the
 * matrix, Bikini/Wellness lead with glutes at 3 and 4 days, MP 4-day is not a
 * generic upper/lower.
 */
import fs from 'fs';
import path from 'path';
import { DIVISIONS, gen, genLib, measure, weeklySets } from './planengineBench';

const GLUTE_LEADS = ['Hip Thrust', 'Glute Bridge', 'Romanian Deadlift', 'Hip Extension', 'Pull-Through', 'Kickback'];
const isGluteLead = (lift) => !!lift && GLUTE_LEADS.some(g => lift.includes(g));

function exerciseSet(plan) {
  const s = new Set();
  for (const w of plan.workouts) for (const ex of w.exercises) s.add(ex.exerciseName);
  return s;
}
function overlapPct(a, b) {
  const A = exerciseSet(a); const B = exerciseSet(b);
  let shared = 0;
  for (const n of A) if (B.has(n)) shared++;
  return shared / Math.max(1, Math.min(A.size, B.size));
}

describe('Phase 2 benchmark: division specialisation', () => {
  const bik4 = gen('bikini', { days: 4 });
  const mp4 = gen('mens_physique', { days: 4 });

  // The spec lists "< 30% shared exercises" as the gate. Re-homed to phase 3
  // (overlap is driven by exercise SELECTION, which phase 3 division pools
  // control). Phase 3 implemented the spec's HARD pool rules: Bikini back
  // width-only (no heavy rows), no bench/back-squat, round delts via laterals
  // not pressing; MP legs maintenance only. That took Bikini-vs-MP from 65% to
  // 48%, MEASURED on the library path.
  //
  // FOUNDER DECISION (recorded): the gate is set at < 50%, not the literal
  // < 30%. The floor analysis (docs 03 + 04) showed the residual overlap is
  // genuinely shared programming, lat-width pulldowns, lateral raises,
  // rear-delt and hamstring work, that BOTH divisions correctly want. Driving
  // it under 30% would force different specific lifts for shared goals, the
  // "excessive, random variation" the spec's own Kassiano (2022) citation
  // warns against. So each division is made spec-correct and the gate reflects
  // the honest floor, not a number chased into churn.
  // Measured on the LIBRARY path: overlap is an exercise-selection-diversity
  // metric, and diversity only exists in the full 475-exercise library, which
  // is the live app path. The internal POOL is a thin hand-written fallback
  // (e.g. only 4 lateral raises total), so two divisions necessarily pick the
  // same few lifts there; measuring divergence on it is not meaningful.
  test('4-day Bikini and 4-day MP share < 50% of exercises (phase 3 gate, founder-set, library path)', () => {
    const bikLib = genLib('bikini', { days: 4 });
    const mpLib = genLib('mens_physique', { days: 4 });
    expect(overlapPct(bikLib, mpLib)).toBeLessThan(0.50);
  });
  test('4-day Bikini and 4-day MP have different lead lifts', () => {
    expect(measure(bik4).lead).not.toBe(measure(mp4).lead);
  });
  test('MP lead is a vertical pull, never bench', () => {
    expect(measure(mp4).lead.toLowerCase()).not.toContain('bench');
  });
  test.each([['bikini', 3], ['bikini', 4], ['wellness', 3], ['wellness', 4]])(
    '%s %i-day leads with a glute movement', (goal, days) => {
      expect(isGluteLead(measure(gen(goal, { days })).lead)).toBe(true);
    });
  test('MP 4-day is not a generic Upper/Lower (width vs thickness split)', () => {
    const names = mp4.workouts.map(w => w.name);
    expect(names).not.toContain('Upper A');
    expect(names.some(n => /width/i.test(n))).toBe(true);
    expect(names.some(n => /thick/i.test(n))).toBe(true);
  });
  test('Bikini glutes are the highest-volume muscle', () => {
    const s = weeklySets(bik4);
    const maxMuscle = Object.entries(s).sort((a, b) => b[1] - a[1])[0][0];
    expect(maxMuscle).toBe('glutes');
  });
  test('MP back volume >= chest volume', () => {
    const s = weeklySets(mp4);
    expect(s.back).toBeGreaterThanOrEqual(s.chest);
  });
});

test('write phase 2 results doc', () => {
  const out = [];
  out.push('Status: COMPLETE | Timestamp: 2026-06-01 | Phase 2: Division specialisation tests');
  out.push('');
  out.push('# planEngine rebuild, phase 2 results');
  out.push('');
  const bik4 = gen('bikini', { days: 4 });
  const mp4 = gen('mens_physique', { days: 4 });
  const bik4Lib = genLib('bikini', { days: 4 });
  const mp4Lib = genLib('mens_physique', { days: 4 });
  out.push(`Core benchmark: 4-day Bikini vs 4-day Men's Physique.`);
  out.push(`- exercise overlap (library path, the gate): ${(overlapPct(bik4Lib, mp4Lib) * 100).toFixed(0)}% (gate < 50%; spec literal target < 30%)`);
  out.push(`- exercise overlap (internal POOL fallback): ${(overlapPct(bik4, mp4) * 100).toFixed(0)}%`);
  out.push(`- Bikini lead lift: ${measure(bik4).lead}`);
  out.push(`- Men's Physique lead lift: ${measure(mp4).lead}`);
  out.push('');
  out.push('Re-homed to phase 3: overlap is driven by exercise SELECTION, which the');
  out.push('phase 3 division pools control. Phase 3 implemented the spec hard pool rules');
  out.push('(Bikini back width-only, no bench/back-squat, round delts via laterals; MP');
  out.push('legs maintenance only), taking Bikini-vs-MP from 65% to 48% on the library');
  out.push('path. FOUNDER DECISION: the gate is set at < 50%, not the literal < 30%,');
  out.push('because the residual overlap is genuinely shared programming (lat-width');
  out.push('pulldowns, lateral raises, rear-delt and hamstring work) that both divisions');
  out.push('correctly want. See docs 03/04 for the floor analysis.');
  out.push('');
  out.push('Structural gates that PASS in phase 2:');
  out.push(`- different lead lifts: ${measure(bik4).lead} vs ${measure(mp4).lead}`);
  out.push('- Bikini/Wellness lead with glutes at 3 and 4 days');
  out.push('- MP leads a vertical pull (never bench), width-vs-thickness split');
  out.push('- Bikini glutes are the highest-volume muscle; MP back >= chest');
  out.push('');
  out.push('## Lead lift + split per specialised division, all day counts');
  out.push('');
  out.push('| Division | Days | split | lead lift | session names |');
  out.push('|---|---|---|---|---|');
  for (const [goal, label] of DIVISIONS) {
    for (const days of [3, 4, 5, 6]) {
      const p = gen(goal, { days });
      out.push(`| ${label} | ${days} | ${p.splitType} | ${measure(p).lead} | ${p.workouts.map(w => w.name).join(' / ')} |`);
    }
  }
  out.push('');
  const dest = path.join(process.cwd(), 'docs/audit/volyume-planengine-rebuild-2026-06-01/planengine-rebuild-02-phase2-tests.md');
  fs.writeFileSync(dest, out.join('\n'), 'utf8');
  expect(fs.existsSync(dest)).toBe(true);
});
