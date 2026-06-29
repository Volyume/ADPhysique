/**
 * Food diary CSV export.
 *
 * Pure formatter + a thin wrapper that writes to the cache dir and
 * opens the native share sheet. The pure half is tested directly.
 *
 * Voice: no marketing copy, raw data only.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { resolveFoodRef } from './sources/localCache';

const CSV_HEADERS = [
  'date', 'meal', 'food', 'brand', 'quantity_g',
  'kcal', 'protein_g', 'carbs_g', 'fat_g', 'fibre_g',
];

function csvEscape(value) {
  if (value == null) return '';
  let s = String(value);
  // Neutralise spreadsheet formula injection: a cell that begins with =, +, -,
  // @, tab or carriage return can be run as a formula by Excel / Google Sheets
  // (a food name from an external database or a custom food could carry one).
  // Prefix it with a single quote so it is treated as plain text. (A2-060.)
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a CSV string from an array of food_entries rows and a
 * food-ref lookup map keyed by food_ref. Pure, no I/O.
 */
export function buildDiaryCsv(entries, foodLookup) {
  const lines = [CSV_HEADERS.join(',')];
  for (const e of entries) {
    const food = foodLookup.get(e.food_ref) ?? null;
    const row = [
      e.entry_date,
      e.meal_slot,
      food?.name ?? e.food_ref,
      food?.brand ?? '',
      e.quantity_g,
      e.kcal,
      e.protein_g,
      e.carbs_g,
      e.fat_g,
      e.fibre_g ?? '',
    ];
    lines.push(row.map(csvEscape).join(','));
  }
  return lines.join('\n');
}

/**
 * Resolve every distinct food_ref in the entry list to its food row.
 * Lookups are cached so a 7-day diary with 30 unique foods only does
 * 30 SQL reads.
 */
export async function buildFoodLookup(userId, entries) {
  const out = new Map();
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.food_ref)) continue;
    seen.add(e.food_ref);
    try {
      const f = await resolveFoodRef(userId, e.food_ref);
      if (f) out.set(e.food_ref, f);
    } catch (_) {}
  }
  return out;
}

// ─── PDF report (gap #6) ────────────────────────────────────────────────────
// A printable "share with your coach / GP" report. Like the CSV, energy stays in
// kcal (the canonical stored unit) so the export is unambiguous. Pure HTML
// builder, tested directly; the thin wrapper renders it via expo-print.

function htmlEscape(v) {
  if (v == null) return '';
  return String(v).replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ));
}

const r0 = (n) => Math.round(Number(n) || 0);

/**
 * Build a printable HTML report from food_entries rows + a food-ref lookup.
 * Groups by date, one table per day with a daily totals row. Pure, no I/O.
 */
export function buildDiaryHtml(entries, foodLookup, { startDate, endDate } = {}) {
  const byDate = new Map();
  for (const e of entries) {
    if (!byDate.has(e.entry_date)) byDate.set(e.entry_date, []);
    byDate.get(e.entry_date).push(e);
  }
  const dates = Array.from(byDate.keys()).sort();
  const dayBlocks = dates.map((date) => {
    const rows = byDate.get(date);
    const tot = { kcal: 0, p: 0, c: 0, f: 0 };
    const trs = rows.map((e) => {
      const food = foodLookup.get(e.food_ref) ?? null;
      tot.kcal += Number(e.kcal) || 0;
      tot.p += Number(e.protein_g) || 0;
      tot.c += Number(e.carbs_g) || 0;
      tot.f += Number(e.fat_g) || 0;
      const isQuick = String(e.food_ref || '').startsWith('quick:');
      return `<tr><td>${htmlEscape(e.meal_slot)}</td><td>${htmlEscape(food?.name ?? e.food_ref)}`
        + `${food?.brand ? ` <span class="brand">${htmlEscape(food.brand)}</span>` : ''}</td>`
        + `<td class="n">${isQuick ? '' : `${r0(e.quantity_g)} g`}</td>`
        + `<td class="n">${r0(e.kcal)}</td><td class="n">${r0(e.protein_g)}</td>`
        + `<td class="n">${r0(e.carbs_g)}</td><td class="n">${r0(e.fat_g)}</td></tr>`;
    }).join('');
    return `<h2>${htmlEscape(date)}</h2><table>`
      + '<thead><tr><th>Meal</th><th>Food</th><th class="n">Qty</th><th class="n">kcal</th>'
      + '<th class="n">P</th><th class="n">C</th><th class="n">F</th></tr></thead>'
      + `<tbody>${trs}`
      + `<tr class="tot"><td colspan="3">Day total</td><td class="n">${r0(tot.kcal)}</td>`
      + `<td class="n">${r0(tot.p)}</td><td class="n">${r0(tot.c)}</td><td class="n">${r0(tot.f)}</td></tr>`
      + '</tbody></table>';
  }).join('');
  const range = startDate && endDate ? `${htmlEscape(startDate)} to ${htmlEscape(endDate)}` : '';
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>`
    + 'body{font-family:-apple-system,Roboto,sans-serif;color:#1a1a18;padding:24px;}'
    + 'h1{font-size:20px;margin:0 0 2px;} .range{color:#555;font-size:12px;margin-bottom:16px;}'
    + 'h2{font-size:14px;margin:18px 0 6px;} table{width:100%;border-collapse:collapse;font-size:11px;}'
    + 'th,td{text-align:left;padding:4px 6px;border-bottom:1px solid #e4e4df;} td.n,th.n{text-align:right;}'
    + '.brand{color:#777;} tr.tot td{font-weight:600;border-top:1px solid #999;border-bottom:none;}'
    + '.foot{margin-top:20px;color:#999;font-size:10px;} thead th{border-bottom:1px solid #999;}'
    + `</style></head><body><h1>Food diary</h1><div class="range">${range}</div>${dayBlocks}`
    + '<div class="foot">Energy in kcal. Exported from Volyume.</div></body></html>';
}

/**
 * One-shot: build the diary report HTML, render it to a PDF via expo-print,
 * and hand it to the native share sheet. Returns { fileUri, rowCount }, or
 * { rowCount: 0 } when there is nothing to export, or { unavailable: true }
 * when expo-print is not present (e.g. a build without it).
 */
export async function exportDiaryPdf({ userId, entries, startDate, endDate }) {
  if (!entries?.length) return { rowCount: 0 };
  const lookup = await buildFoodLookup(userId, entries);
  const html = buildDiaryHtml(entries, lookup, { startDate, endDate });
  // eslint-disable-next-line global-require
  let Print; try { Print = require('expo-print'); } catch (_) { Print = null; }
  if (!Print?.printToFileAsync) return { rowCount: 0, unavailable: true };
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export diary',
      UTI: 'com.adobe.pdf',
    });
  }
  return { fileUri: uri, rowCount: entries.length };
}

/**
 * One-shot: build the CSV string from a range of entries, write to
 * the cache dir, hand to the native share sheet.
 *
 * Returns { fileUri, rowCount } or { rowCount: 0 } if nothing to export.
 */
export async function exportDiaryCsv({ userId, entries, startDate, endDate }) {
  if (!entries?.length) return { rowCount: 0 };
  const lookup = await buildFoodLookup(userId, entries);
  const csv = buildDiaryCsv(entries, lookup);
  const stamp = `${startDate}_${endDate}`.replace(/-/g, '');
  const fileUri = `${FileSystem.cacheDirectory}volyume_diary_${stamp}.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export diary',
      UTI: 'public.comma-separated-values-text',
    });
  }
  return { fileUri, rowCount: entries.length };
}
