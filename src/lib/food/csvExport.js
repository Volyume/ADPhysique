/**
 * Food diary CSV export.
 *
 * Pure formatter + a thin wrapper that writes to the cache dir and
 * opens the native share sheet. The pure half is tested directly.
 *
 * Voice: no marketing copy, raw data only.
 */
import * as FileSystem from 'expo-file-system';
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
