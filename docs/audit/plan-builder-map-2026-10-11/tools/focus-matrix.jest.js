/* global test */
/**
 * focus-matrix.jest.js -- the R39 to R45 matrix (register D222): every
 * category, day count, kit and experience level at 60 minutes, built plain
 * and with each focus pick, and from every start in the rotation. Writes one
 * JSON summary per run to MATRIX_OUT.
 *
 * How to run: MATRIX_CATS=general,bikini MATRIX_OUT=/path/out.json npx jest
 *   --roots=docs/audit/plan-builder-map-2026-10-11/tools
 *   --testMatch='**' '/focus-matrix.jest.js' (one pattern, no space).
 * It calls the real engine with the real seeded library; nothing is edited.
 */
const fs = require('fs');
const { buildStructurePlan } = require('../../../../src/lib/structure/engine');
const { CATEGORIES, DAY_COUNTS, TIERS } = require('../../../../src/lib/structure/rulebook');
const { checkPlan, checkFocusAgainstBaseline } = require('../../../../src/lib/structure/checker');
const { senseCheck } = require('../../../../src/lib/structure/sense');
const { LIBRARY } = require('../../../../src/lib/__tests__/campaign16.helpers');

const KITS = ['full_gym', 'machines_cables', 'dumbbells_only', 'barbell_plates', 'home_gym', 'bodyweight'];
const sig = (plan) => plan.sessions.map((s) => `${s.key}:${s.exercises.map((ex) => `${ex.name}x${ex.peak}@${ex.restSec}${ex.nextDayException ? 'L' : ''}`).join(',')}`).join('|');

test('matrix', () => {
  const cats = (process.env.MATRIX_CATS || CATEGORIES.join(',')).split(',');
  const out = {
    plain: 0, plainRefused: 0, focusBuilds: 0, focusRefusedWherePlainBuilt: [], c5: [], failing: [], unmet: {},
    rotation: [], standIns: [], added: {}, noGain: [], rollbacks: [], took: {}, tookBelowTypical: 0,
  };
  for (const goal of cats) {
    const picks = Object.keys(TIERS).filter((m) => TIERS[m][goal] && TIERS[m][goal] !== 'I');
    const p = picks.filter((m) => TIERS[m][goal] === 'P');
    const focusSets = [...picks.map((m) => [m]), ...(p.length >= 2 ? [p.slice(0, 2)] : [])];
    for (const days of DAY_COUNTS) {
      for (const equipment of KITS) {
        for (const experience of ['beginner', 'intermediate', 'advanced']) {
          const args = { library: LIBRARY, goal, days, equipment, experience, lengthMinutes: 60, focus: [] };
          const base = buildStructurePlan(args);
          out.plain += 1;
          const tag = `${goal} ${days}d ${equipment} ${experience}`;
          if (!base.ok) { out.plainRefused += 1; continue; }
          if (['full_gym', 'machines_cables'].includes(equipment)) {
            for (const s of base.plan.sessions) for (const ex of s.exercises) {
              if (/TRX|Slider|Seated .*Lateral Raise|Straight-Arm Dumbbell Pullover|Reverse Crunch/.test(ex.name)) out.standIns.push(`${tag}: ${ex.name}`);
            }
          }
          if (experience === 'intermediate') {
            const s0 = base.plan.sessions;
            for (let start = 1; start < days; start += 1) {
              const r = buildStructurePlan({ ...args, startIndex: start });
              const turned = s0.map((_, i) => s0[(i + start) % days]);
              if (!r.ok || sig(r.plan) !== sig({ sessions: turned })) out.rotation.push(`${tag} start ${start}`);
            }
          }
          for (const focus of focusSets) {
            const r = buildStructurePlan({ ...args, focus });
            out.focusBuilds += 1;
            const ft = `${tag} focus ${focus.join('+')}`;
            if (!r.ok) { out.focusRefusedWherePlainBuilt.push(`${ft}: ${r.refusal.reason} ${r.refusal.detail}`); continue; }
            const c5 = checkFocusAgainstBaseline(r.plan, base.plan);
            if (!c5.ok) out.c5.push(`${ft}: ${c5.failures.map((f) => f.detail).join('; ')}`);
            const c = checkPlan(r.plan);
            const sc = senseCheck(r.plan);
            if (!c.ok || !sc.ok) out.failing.push(`${ft}: ${[...c.failures, ...sc.failures].map((f) => f.code).join(',')}`);
            for (const f of r.report.focusUnmet || []) out.unmet[f.reason] = (out.unmet[f.reason] || 0) + 1;
            for (const m of focus) {
              const gain = Math.round(2 * (r.report.weekly[m].sets - base.report.weekly[m].sets)) / 2;
              const key = gain >= 4 ? '4+' : String(gain);
              out.added[key] = (out.added[key] || 0) + 1;
              if (gain <= 0) out.noGain.push(`${ft} ${m}: ${base.report.weekly[m].sets} of ${r.report.weekly[m].target}`);
            }
            for (const x of r.report.focusTook || []) {
              out.took[x.muscle] = (out.took[x.muscle] || 0) + 1;
              if (x.to < r.report.weekly[x.muscle].typical) out.tookBelowTypical += 1;
            }
            for (const f of r.report.focusUnmet || []) if (['checks', 'pull_balance'].includes(f.reason)) out.rollbacks.push(`${ft} ${f.muscle} ${f.reason}: ${f.sets} of ${f.target}`);
          }
        }
      }
    }
  }
  fs.writeFileSync(process.env.MATRIX_OUT || '/dev/stdout', JSON.stringify(out, null, 1));
});
