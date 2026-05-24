// Coach report — one-tap PDF of the last 4 weeks for an external coach.
//
// Renders a dark-themed HTML document and converts it to a PDF via
// expo-print, then hands it to the OS share sheet via expo-sharing.
// The bodyweight trend is drawn as an inline SVG polyline (deterministic,
// no Skia capture needed, robust inside the print renderer).
//
// The app stores nutrition *targets* but never logged intake, so a true
// adherence percentage cannot be computed. We surface the configured
// targets instead — and only when nutrition consent was given.

import {
  getCompletedWorkoutSets,
  getAllWorkouts,
  getAllExercises,
  getAllMesocycles,
  getBodyMetricLog,
  getNutritionTargets,
} from './database';
import {
  calculate1RM,
  calculateWeeklyVolume,
  VOLUME_LANDMARKS,
  MUSCLE_DISPLAY_NAMES,
} from './algorithms';

let Print;
let Sharing;
try { Print = require('expo-print'); } catch (_) {}
try { Sharing = require('expo-sharing'); } catch (_) {}

const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildBodyweightSVG(points) {
  if (points.length < 2) return '';
  const W = 480;
  const H = 120;
  const PAD = 8;
  const xs = points.map((_, i) => i);
  const ys = points.map(p => p.w);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const spanX = xs.length - 1 || 1;
  const coords = points.map((p, i) => {
    const x = PAD + (i / spanX) * (W - PAD * 2);
    const y = PAD + (1 - (p.w - minY) / spanY) * (H - PAD * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const dots = coords.map(c => {
    const [x, y] = c.split(',');
    return `<circle cx="${x}" cy="${y}" r="2.5" fill="#F59E0B" />`;
  }).join('');
  return `
    <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none">
      <polyline points="${coords.join(' ')}" fill="none" stroke="#F59E0B" stroke-width="2" />
      ${dots}
    </svg>`;
}

function topPRs(sets, exerciseMap, limit = 5) {
  const byExercise = {};
  for (const s of sets) {
    const ex = exerciseMap[s.exerciseId];
    if (!ex) continue;
    (byExercise[ex.name] ||= []).push(s);
  }
  const prs = [];
  for (const [name, exSets] of Object.entries(byExercise)) {
    let best = null;
    for (const s of exSets) {
      const est = calculate1RM(s.weight || 0, s.actualReps || 0);
      if (est > (best?.est || 0)) {
        best = { est, weight: s.weight, reps: s.actualReps, when: s.createdAt };
      }
    }
    if (best) prs.push({ name, ...best });
  }
  prs.sort((a, b) => b.est - a.est);
  return prs.slice(0, limit);
}

function buildHTML(model) {
  const {
    generatedAt, mesoName, weeksCompleted, sessionCount, prs,
    volumeRows, bwSVG, bwLatest, nutrition, units,
  } = model;

  const prRows = prs.length
    ? prs.map(p => `
      <tr>
        <td>${esc(p.name)}</td>
        <td class="num">${Math.round(p.est)} ${esc(units)}</td>
        <td class="num">${p.weight ?? '-'} ${esc(units)} × ${p.reps ?? '-'}</td>
        <td>${fmtDate(p.when)}</td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="muted">No completed sets in this window.</td></tr>';

  const volRows = volumeRows.length
    ? volumeRows.map(v => `
      <tr>
        <td>${esc(v.label)}</td>
        <td class="num">${v.weekly}</td>
        <td class="num muted">${v.min} / ${v.target} / ${v.max}</td>
        <td><span class="pill" style="background:${v.color}1f;color:${v.color}">${esc(v.status)}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="4" class="muted">Not enough sets logged.</td></tr>';

  const nutritionBlock = nutrition
    ? `<div class="card">
         <h2>Nutrition targets</h2>
         <div class="macros">
           <div><span class="mv">${Math.round(nutrition.targetKcal ?? 0)}</span><span class="ml">kcal</span></div>
           <div><span class="mv">${Math.round(nutrition.proteinG ?? 0)}g</span><span class="ml">protein</span></div>
           <div><span class="mv">${Math.round(nutrition.carbsG ?? 0)}g</span><span class="ml">carbs</span></div>
           <div><span class="mv">${Math.round(nutrition.fatG ?? 0)}g</span><span class="ml">fat</span></div>
         </div>
         ${nutrition.phase ? `<p class="muted">Phase: ${esc(nutrition.phase)}</p>` : ''}
       </div>`
    : `<div class="card"><h2>Nutrition targets</h2><p class="muted">Not shared. Nutrition sharing is not enabled.</p></div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background:#0D0D0D; color:#FFFFFF; font-family:-apple-system,Roboto,Helvetica,sans-serif; padding:28px; }
    h1 { font-size:24px; color:#F59E0B; letter-spacing:0.5px; }
    h2 { font-size:15px; color:#F59E0B; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px; }
    .sub { color:#9E9E9E; font-size:12px; margin-top:4px; }
    .card { background:#1A1A1A; border:1px solid #333; border-radius:12px; padding:18px; margin-top:18px; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { text-align:left; color:#616161; font-weight:600; padding:6px 8px; border-bottom:1px solid #333; text-transform:uppercase; font-size:10px; }
    td { padding:7px 8px; border-bottom:1px solid #242424; color:#E0E0E0; }
    td.num { font-variant-numeric:tabular-nums; }
    .muted { color:#616161; }
    .pill { padding:2px 8px; border-radius:999px; font-size:10px; font-weight:700; }
    .stats { display:flex; gap:24px; margin-top:14px; }
    .stat .v { font-size:22px; font-weight:800; color:#FFD700; }
    .stat .l { font-size:11px; color:#9E9E9E; }
    .macros { display:flex; gap:20px; }
    .macros .mv { font-size:18px; font-weight:700; color:#F59E0B; display:block; }
    .macros .ml { font-size:11px; color:#616161; }
    .foot { margin-top:24px; color:#616161; font-size:10px; text-align:center; }
  </style></head><body>
    <h1>Volyume Coach Report</h1>
    <div class="sub">Last 4 weeks · Generated ${esc(generatedAt)}</div>

    <div class="card">
      <h2>Block</h2>
      <p>${esc(mesoName || 'No active training block')}</p>
      <div class="stats">
        <div class="stat"><div class="v">${weeksCompleted}</div><div class="l">weeks in block</div></div>
        <div class="stat"><div class="v">${sessionCount}</div><div class="l">sessions (4 wks)</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Top personal records</h2>
      <table>
        <tr><th>Exercise</th><th>Est. 1RM</th><th>Best set</th><th>Achieved</th></tr>
        ${prRows}
      </table>
    </div>

    <div class="card">
      <h2>Weekly volume per muscle</h2>
      <table>
        <tr><th>Muscle</th><th>Sets/wk</th><th>Min / Target / Max</th><th>Status</th></tr>
        ${volRows}
      </table>
    </div>

    <div class="card">
      <h2>Bodyweight trend ${bwLatest ? `· ${bwLatest} ${esc(units)}` : ''}</h2>
      ${bwSVG || '<p class="muted">Fewer than two weigh-ins logged.</p>'}
    </div>

    ${nutritionBlock}

    <div class="foot">Generated by Volyume · Private by design · Data never leaves the athlete's device except via this export.</div>
  </body></html>`;
}

/**
 * exportCoachReport — builds and shares a 4-week PDF report.
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function exportCoachReport(userId, opts = {}) {
  if (!userId) return { ok: false, reason: 'no-user' };
  if (!Print || !Sharing) return { ok: false, reason: 'unavailable' };

  const units = opts.units || 'kg';
  const nutritionConsented = !!opts.nutritionConsented;
  const now = Date.now();
  const since = now - FOUR_WEEKS_MS;

  const [allSets, workouts, exercises, mesocycles, bodyLog, nutritionRaw] = await Promise.all([
    getCompletedWorkoutSets(userId),
    getAllWorkouts(userId),
    getAllExercises(),
    getAllMesocycles(userId),
    getBodyMetricLog(userId, 90).catch(() => []),
    nutritionConsented ? getNutritionTargets(userId).catch(() => null) : Promise.resolve(null),
  ]);

  const exerciseMap = Object.fromEntries(exercises.map(e => [e.id, e]));
  const recentSets = allSets.filter(s => (s.createdAt ?? 0) >= since);

  // Sessions in window
  const sessionCount = workouts.filter(w =>
    (w.isCompleted ?? w.is_completed) && (w.startedAt ?? w.createdAt ?? 0) >= since,
  ).length;

  // Active block + weeks completed
  const activeMeso = mesocycles.find(m => m.isActive ?? m.is_active) || null;
  let weeksCompleted = 0;
  if (activeMeso?.startDate) {
    const start = new Date(activeMeso.startDate).getTime();
    if (!isNaN(start) && start <= now) {
      weeksCompleted = Math.min(
        activeMeso.durationWeeks || 99,
        Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1,
      );
    }
  }

  // Weekly volume per muscle (4-week total ÷ 4)
  const vol = calculateWeeklyVolume(recentSets, exerciseMap);
  const volumeRows = [];
  for (const [muscle, lm] of Object.entries(VOLUME_LANDMARKS)) {
    const total = vol[muscle]?.workingSets || 0;
    const weekly = Math.round((total / 4) * 10) / 10;
    if (weekly <= 0) continue;
    let status = 'On target';
    let color = '#4CAF50';
    if (weekly < lm.mev) { status = 'Below min'; color = '#616161'; }
    else if (weekly <= lm.mev + 2) { status = 'Minimum'; color = '#FFC107'; }
    else if (weekly <= lm.mav) { status = 'Optimal'; color = '#4CAF50'; }
    else if (weekly <= lm.mrv) { status = 'Near max'; color = '#FFC107'; }
    else { status = 'Over max'; color = '#F44336'; }
    volumeRows.push({
      label: MUSCLE_DISPLAY_NAMES[muscle] || muscle,
      weekly, min: lm.mev, target: lm.mav, max: lm.mrv, status, color,
    });
  }
  volumeRows.sort((a, b) => b.weekly - a.weekly);

  // Bodyweight trend (oldest → newest, last 12 within range)
  const bwPoints = bodyLog
    .filter(r => r.weightKg != null)
    .map(r => ({ w: r.weightKg, t: r.loggedAt ?? r.createdAt ?? 0 }))
    .sort((a, b) => a.t - b.t)
    .slice(-12);
  const bwSVG = buildBodyweightSVG(bwPoints);
  const bwLatest = bwPoints.length ? bwPoints[bwPoints.length - 1].w : null;

  const model = {
    generatedAt: new Date(now).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    mesoName: activeMeso?.name,
    weeksCompleted,
    sessionCount,
    prs: topPRs(recentSets, exerciseMap, 5),
    volumeRows,
    bwSVG,
    bwLatest,
    nutrition: nutritionRaw,
    units,
  };

  const html = buildHTML(model);
  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) return { ok: false, reason: 'no-share', uri };
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Send report to your coach',
    UTI: 'com.adobe.pdf',
  });
  return { ok: true };
}
