/**
 * coachReport — the exportable coach handover report (B5, audit 05 §B5).
 *
 * A PDF of training history, weight trend, current targets and every
 * coaching decision with its persisted written reason over a period, for
 * the user to hand to a human coach, physio or GP.
 *
 * Artefact class (important distinction): share cards are public, outbound
 * social artefacts and are data-minimised by rule — never name, bodyweight,
 * measurements or private notes (CLAUDE.md; enforced in shareCard/greatWeek
 * and locked by its tests). This report is the opposite class: the user's
 * OWN complete data, generated on-device, and it leaves the device only
 * through the user's explicit share action — the same "your data is always
 * yours" guarantee as the CSV export and the diary PDF, whose plumbing this
 * module mirrors (src/lib/food/csvExport.js exportDiaryPdf).
 *
 * ED-safety (audit constraint: "ED-flagged users get the neutral variant —
 * no rate/weight emphasis"): under an open ED-pattern flag, calm mode, or a
 * FAILED read of either (fail closed, the same wiring the differential
 * banner pins in its guard test), the report drops the weight-trend section,
 * every calorie-change row, the phase line, and ALL persisted prose notes —
 * the engine's written reasons legitimately discuss weight rates, so prose
 * is dropped wholesale rather than filtered. Bodyweight rows are not even
 * read from the database on the neutral path. The flag's existence is NEVER
 * mentioned in the artefact: the user hands this PDF to another person, and
 * it must not disclose inferred health data about them.
 *
 * The decisions rendered here are the persisted output_json written by the
 * deterministic engine at coach-run time — nothing is recomputed, so the
 * report shows what the user was actually told, week by week.
 */
import * as Sharing from 'expo-sharing';
import {
  getRecapData,
  getCoachOutputHistory,
  getMorningWeights,
  getNutritionTargets,
  getOpenEdPatternFlag,
} from './database';
import { getWellbeingMode, isCalm } from './wellbeing';
import { robustEwma } from './robustTrend';

const DAY_MS = 24 * 60 * 60 * 1000;

function htmlEscape(v) {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(ms) {
  if (!Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const fmtInt = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-GB') : '');

// Signal words for the neutral variant: decision FACTS without the persisted
// prose (prose can embed weight-rate language).
const TRAINING_SIGNAL_LABELS = {
  push: 'More work added',
  pull_back: 'Volume pulled back',
  pull: 'Volume pulled back',
  hold: 'Held steady',
};

/**
 * Pure HTML builder — everything interpolated is escaped; no I/O, no Date.now.
 * Kept separate from the export wrapper so the variants are unit-testable
 * (same split as buildDiaryHtml / exportDiaryPdf).
 */
export function buildCoachReportHtml({ startMs, endMs, generatedAt, neutral, recap, trend, targets, weeks }) {
  const sections = [];

  // ── Training ──────────────────────────────────────────────────────────
  if (recap && recap.totalSessions > 0) {
    const lines = [
      `<tr><td>Sessions completed</td><td class="n">${fmtInt(recap.totalSessions)}</td></tr>`,
      `<tr><td>Average sessions per week</td><td class="n">${htmlEscape(recap.avgSessionsPerWeek ?? '')}</td></tr>`,
      `<tr><td>Working sets</td><td class="n">${fmtInt(recap.totalSets)}</td></tr>`,
      `<tr><td>Total tonnage</td><td class="n">${fmtInt(recap.tonnage)} kg</td></tr>`,
      `<tr><td>Different exercises trained</td><td class="n">${fmtInt(recap.uniqueExercises)}</td></tr>`,
    ].join('');
    const top = (recap.topExercises ?? [])
      .map((t) => `<li>${htmlEscape(t.name)} (${fmtInt(t.sets)} sets)</li>`)
      .join('');
    const prs = neutral ? '' : (recap.topPRs ?? [])
      .map((p) => `<li>${htmlEscape(p.exerciseName)}: ${htmlEscape(p.value)} kg × ${htmlEscape(p.reps)}</li>`)
      .join('');
    sections.push(
      `<h2>Training</h2><table>${lines}</table>`
      + (top ? `<h3>Most trained</h3><ul>${top}</ul>` : '')
      + (prs ? `<h3>Best lifts (estimated 1RM basis)</h3><ul>${prs}</ul>` : '')
    );
  } else {
    sections.push('<h2>Training</h2><p>No completed sessions in this period.</p>');
  }

  // ── Weight trend — full variant only ─────────────────────────────────
  if (!neutral && Array.isArray(trend) && trend.length >= 2) {
    const first = trend[0];
    const last = trend[trend.length - 1];
    const spanWeeks = Math.max(1, (last.loggedAt - first.loggedAt) / (7 * DAY_MS));
    const change = Math.round((last.ewmaKg - first.ewmaKg) * 10) / 10;
    const weekly = Math.round(((last.ewmaKg - first.ewmaKg) / spanWeeks) * 100) / 100;
    const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
    sections.push(
      '<h2>Weight trend</h2><table>'
      + `<tr><td>Trend weight at start (${htmlEscape(fmtDate(first.loggedAt))})</td><td class="n">${htmlEscape(first.ewmaKg)} kg</td></tr>`
      + `<tr><td>Trend weight latest (${htmlEscape(fmtDate(last.loggedAt))})</td><td class="n">${htmlEscape(last.ewmaKg)} kg</td></tr>`
      + `<tr><td>Change over the period</td><td class="n">${htmlEscape(sign(change))} kg</td></tr>`
      + `<tr><td>Average weekly change</td><td class="n">${htmlEscape(sign(weekly))} kg/week</td></tr>`
      + `<tr><td>Weigh-ins recorded</td><td class="n">${fmtInt(trend.length)}</td></tr>`
      + '</table><p class="note">Trend weight is a smoothed average of morning weigh-ins, so single days matter less.</p>'
    );
  }

  // ── Current targets ───────────────────────────────────────────────────
  if (targets && (targets.targetKcal || targets.proteinG)) {
    const rows = [
      targets.targetKcal ? `<tr><td>Daily energy target</td><td class="n">${fmtInt(targets.targetKcal)} kcal</td></tr>` : '',
      targets.proteinG ? `<tr><td>Protein</td><td class="n">${fmtInt(targets.proteinG)} g</td></tr>` : '',
      targets.carbsG ? `<tr><td>Carbohydrate</td><td class="n">${fmtInt(targets.carbsG)} g</td></tr>` : '',
      targets.fatG ? `<tr><td>Fat</td><td class="n">${fmtInt(targets.fatG)} g</td></tr>` : '',
      // The phase line frames the targets around weight movement, so the
      // neutral variant leaves it out.
      !neutral && targets.phase ? `<tr><td>Phase</td><td class="n">${htmlEscape(targets.phase)}</td></tr>` : '',
    ].join('');
    sections.push(`<h2>Current nutrition targets</h2><table>${rows}</table>`);
  }

  // ── Weekly coaching decisions ─────────────────────────────────────────
  const weekBlocks = (weeks ?? []).map((w) => {
    const adj = w.adjustments ?? {};
    const rows = [];

    const signalLabel = TRAINING_SIGNAL_LABELS[adj.training?.signal] ?? null;
    if (signalLabel) {
      rows.push(`<tr><td>Training volume</td><td>${htmlEscape(signalLabel)}${!neutral && adj.training?.note ? ` — ${htmlEscape(adj.training.note)}` : ''}</td></tr>`);
    }
    if (!neutral && Number.isFinite(adj.calories?.change) && adj.calories.change !== 0) {
      const amt = Math.abs(adj.calories.change);
      const dir = adj.calories.change > 0 ? `up +${fmtInt(amt)}` : `down ${fmtInt(amt)}`;
      rows.push(`<tr><td>Calories</td><td>${htmlEscape(`Adjusted ${dir} kcal/day`)}${adj.calories.note ? ` — ${htmlEscape(adj.calories.note)}` : ''}</td></tr>`);
    }
    if (Number.isFinite(adj.steps?.target) && adj.steps.target > 0) {
      rows.push(`<tr><td>Daily steps</td><td>Target ${fmtInt(adj.steps.target)}${!neutral && adj.steps.note ? ` — ${htmlEscape(adj.steps.note)}` : ''}</td></tr>`);
    }
    if (!neutral && w.deloadSuggested && w.deloadNote) {
      rows.push(`<tr><td>Deload</td><td>${htmlEscape(w.deloadNote)}</td></tr>`);
    }
    if (Number.isFinite(w.sessionsCompleted) && Number.isFinite(w.sessionsPlanned)) {
      rows.push(`<tr><td>Sessions</td><td>${fmtInt(w.sessionsCompleted)} of ${fmtInt(w.sessionsPlanned)} planned</td></tr>`);
    }
    const held = !neutral
      ? (w.heldDecisions ?? [])
        .filter((d) => d?.reason)
        .map((d) => `<li>${htmlEscape(d.reason)}</li>`)
        .join('')
      : '';
    const why = !neutral && w.whyThisWeek ? `<p class="why">${htmlEscape(w.whyThisWeek)}</p>` : '';
    if (!rows.length && !held && !why) return '';
    return (
      `<h3>Week commencing ${htmlEscape(fmtDate(w.weekStart))}${!neutral && w.goalPhase ? ` · ${htmlEscape(w.goalPhase)}` : ''}</h3>`
      + (rows.length ? `<table>${rows.join('')}</table>` : '')
      + why
      + (held ? `<p class="heldLabel">Held back this week (with the coach's reason):</p><ul>${held}</ul>` : '')
    );
  }).filter(Boolean).join('');
  if (weekBlocks) {
    sections.push(`<h2>Coaching decisions, week by week</h2>${weekBlocks}`);
  }

  const range = `${htmlEscape(fmtDate(startMs))} to ${htmlEscape(fmtDate(endMs))}`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>`
    + 'body{font-family:-apple-system,Roboto,sans-serif;color:#1a1a18;padding:24px;}'
    + 'h1{font-size:20px;margin:0 0 2px;} .range{color:#555;font-size:12px;margin-bottom:16px;}'
    + 'h2{font-size:15px;margin:20px 0 6px;border-bottom:1px solid #999;padding-bottom:3px;}'
    + 'h3{font-size:12px;margin:12px 0 4px;} table{width:100%;border-collapse:collapse;font-size:11px;}'
    + 'td{text-align:left;padding:3px 6px;border-bottom:1px solid #e4e4df;} td.n{text-align:right;}'
    + 'ul{margin:4px 0;padding-left:18px;font-size:11px;} li{margin-bottom:2px;}'
    + '.why{font-size:11px;color:#333;margin:4px 0;} .heldLabel{font-size:11px;margin:6px 0 0;}'
    + '.note{font-size:10px;color:#777;} .foot{margin-top:20px;color:#999;font-size:10px;}'
    + '</style></head><body><h1>Coach handover report</h1>'
    + `<div class="range">${range} · generated ${htmlEscape(fmtDate(generatedAt))}</div>`
    + sections.join('')
    + '<div class="foot">Prepared on this device by Volyume from the account holder\'s own data. '
    + 'Nothing was uploaded to produce it; it is shared only by the account holder.</div></body></html>';
}

/**
 * Gather everything the report needs (read-only). The neutral decision is
 * fail-closed: an open ED flag, calm mode, or a FAILED read of either makes
 * the report neutral — a transient read failure must never produce the
 * fuller variant. On the neutral path bodyweight rows are never read.
 */
export async function gatherCoachReportData(userId, { weeks = 12, nowMs = Date.now() } = {}) {
  const endMs = nowMs;
  const startMs = endMs - weeks * 7 * DAY_MS;

  const [edFlag, wellbeing] = await Promise.all([
    getOpenEdPatternFlag(userId).catch(() => 'read_failed'),
    getWellbeingMode().catch(() => 'read_failed'),
  ]);
  const neutral = !!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing);

  const [recap, history, weights, targets] = await Promise.all([
    getRecapData(userId, { startMs, endMs }).catch(() => null),
    getCoachOutputHistory(userId, weeks + 1).catch(() => []),
    neutral ? Promise.resolve([]) : getMorningWeights(userId, 120).catch(() => []),
    getNutritionTargets(userId).catch(() => null),
  ]);

  const weeksInRange = (history ?? [])
    .filter((w) => Number.isFinite(w.weekStart) && w.weekStart >= startMs && w.weekStart <= endMs)
    .sort((a, b) => b.weekStart - a.weekStart);
  const weightsInRange = (weights ?? []).filter(
    (w) => Number.isFinite(w?.loggedAt) && w.loggedAt >= startMs && w.loggedAt <= endMs
  );

  return {
    startMs,
    endMs,
    generatedAt: nowMs,
    neutral,
    recap,
    trend: robustEwma(weightsInRange),
    targets,
    weeks: weeksInRange,
  };
}

/**
 * One-shot: gather, build the HTML, render to PDF via expo-print and hand it
 * to the native share sheet. Returns { fileUri }, or { empty: true } when
 * there is nothing at all to report, or { unavailable: true } when
 * expo-print is not present in the build (same contract as exportDiaryPdf).
 */
export async function exportCoachReportPdf({ userId, weeks = 12 } = {}) {
  const data = await gatherCoachReportData(userId, { weeks });
  const nothing =
    (!data.recap || !data.recap.totalSessions) && !data.weeks.length && !data.targets;
  if (nothing) return { empty: true };

  const html = buildCoachReportHtml(data);
  // eslint-disable-next-line global-require
  let Print; try { Print = require('expo-print'); } catch (_) { Print = null; }
  if (!Print?.printToFileAsync) return { unavailable: true };
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Coach handover report',
      UTI: 'com.adobe.pdf',
    });
  }
  return { fileUri: uri };
}
