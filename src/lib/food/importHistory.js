/**
 * importHistory.js: bring a food history in from another app (D230 R21, food
 * level-up 2026-10-16, lane 4C). PURE: no I/O, no clock, no store. The file
 * picking, reading and writing live in importHistoryFlow.js.
 *
 * WHAT IS VERIFIED AND WHAT IS NOT (evidence before assertion). Searched on
 * 2026-10-16; neither vendor publishes the column list of these exports, so
 * NO HEADING BELOW IS VERIFIED VERBATIM. What the sources did establish:
 *   MyFitnessPal. Web: Reports, Export Data, Nutrition, a date range, a CSV
 *     download (https://foodzilla.helpscoutdocs.com/article/203-how-do-i-import-a-myfitnesspal-food-diary-into-foodzilla).
 *     The premium export splits meals into Breakfast, Lunch, Dinner and
 *     Snacks (https://pypi.org/project/myfitnesspal-converter). A third-party
 *     tool lists Calories, Carbs (g), Fat (g), Protein (g), Cholesterol (mg),
 *     Sodium (mg), Sugars (g), Fiber (g) (https://nowsci.com/archive01/myfitnesspal-export-tool).
 *     NOT established: the file name, the date format, the exact headings.
 *   Cronometer. Profile, gear, Export Data, a date range, Export Servings;
 *     Gold carries a serving timestamp (https://forums.cronometer.com/discussion/460/exporting-data
 *     and the thread on timestamps). The Amount can be a serving name rather
 *     than grams (https://forums.cronometer.com/discussion/6142/export-grams-next-to-serving-size-in-diary).
 *     The tool https://github.com/jrmycanady/cronometer-export passes the raw
 *     CSV through. NOT established: the exact headings, the date and time form.
 * Because of that the parsers find columns by a tolerant, case-insensitive
 * match on the words (never by position), and the believed headings (MFP:
 * Date, Meal, Calories, Fat (g), Carbohydrates (g), Fiber, Protein (g), Note;
 * Cronometer: Day, Time, Group, Food Name, Amount, Energy (kcal), Carbs (g),
 * Fiber (g), Fat (g), Protein (g)) are tolerant GUESSES. A file whose headings
 * do not match is refused whole ("not a MyFitnessPal or Cronometer export"),
 * never half-read. Dates read: YYYY-MM-DD, "3 March 2025", "March 3, 2025",
 * and D/M/Y or M/D/Y when the file proves which (some row has a part over
 * 12); a file that never proves it has those rows counted unreadable, never
 * guessed.
 *
 * LAWS. A row that cannot be read (no date, no calories, a figure outside
 * 0 to 100000) is counted and skipped. Days that already hold food are
 * skipped whole. Every row is an actual (never planned). No telemetry here:
 * nothing read from a file leaves the phone.
 */

import { checkFoodSanity } from './sanityChecks';
import { FOOD_NOTE_MAX_LENGTH } from './entryNote';

export const IMPORT_QUICK_REF = 'quick:import';
const MAX_METRIC = 100000;
const MAX_GRAMS = 5000;
const NAME_MAX = 100;

// ─── CSV reader ──────────────────────────────────────────────────────────

/** A small CSV reader: quoted fields, embedded commas, quotes ("") and newlines, CRLF, a BOM, a trailing newline. Blank lines are dropped. */
export function readCsv(text) {
  const src = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const endRow = () => {
    row.push(field);
    field = '';
    if (!(row.length === 1 && row[0].trim() === '')) rows.push(row);
    row = [];
  };
  while (i < src.length) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        quoted = false; i += 1; continue;
      }
      field += c; i += 1; continue;
    }
    if (c === '"') { quoted = true; i += 1; continue; }
    if (c === ',') { row.push(field); field = ''; i += 1; continue; }
    if (c === '\r') { endRow(); i += src[i + 1] === '\n' ? 2 : 1; continue; }
    if (c === '\n') { endRow(); i += 1; continue; }
    field += c; i += 1;
  }
  if (field !== '' || row.length) endRow();
  return rows;
}

// ─── cells ───────────────────────────────────────────────────────────────

/** A number with a decimal point or a comma; blank or a dash is null; anything else NaN. */
export function parseNumber(cell) {
  if (cell == null) return null;
  let s = String(cell).trim().replace(/\s/g, '');
  if (s === '' || s === '-' || s === '--') return null;
  if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = /^\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  if (!/^-?\d*\.?\d+$/.test(s) && !/^-?\d+\.$/.test(s)) return NaN;
  return Number(s);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');
function validKey(y, m, d) {
  if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** A date cell to a local day key. `order` ('dmy' | 'mdy') settles a slash date; null when it cannot be known. */
export function parseDateCell(cell, order = null) {
  const s = String(cell ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return validKey(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s);
  if (m) {
    const a = +m[1]; const b = +m[2]; const y = +m[3];
    if (a > 12) return validKey(y, b, a);
    if (b > 12) return validKey(y, a, b);
    if (order === 'dmy') return validKey(y, b, a);
    if (order === 'mdy') return validKey(y, a, b);
    return null;
  }
  m = /^(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})$/.exec(s);
  if (m) { const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()); return mi < 0 ? null : validKey(+m[3], mi + 1, +m[1]); }
  m = /^([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) { const mi = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); return mi < 0 ? null : validKey(+m[3], mi + 1, +m[2]); }
  return null;
}

// Which order the file's slash dates are in, proved by any row with a part
// over 12; null when no row proves it.
function inferSlashOrder(cells) {
  for (const c of cells) {
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.]\d{4}$/.exec(String(c ?? '').trim());
    if (!m) continue;
    if (+m[1] > 12) return 'dmy';
    if (+m[2] > 12) return 'mdy';
  }
  return null;
}

/** "08:30", "8:30 AM", "08:30:15" to minutes after midnight; null when not a time. */
export function parseTimeCell(cell) {
  const m = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?\s*$/.exec(String(cell ?? ''));
  if (!m) return null;
  let h = +m[1]; const min = +m[2];
  if (m[3]) { const pm = m[3].toLowerCase() === 'pm'; if (h < 1 || h > 12) return null; h = (h % 12) + (pm ? 12 : 0); }
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// ─── columns ─────────────────────────────────────────────────────────────

const norm = (h) => String(h ?? '').trim().toLowerCase();
const COLS = {
  date: (h) => /^(date|day)$/.test(h),
  meal: (h) => /^(meal|group|meal type)$/.test(h),
  time: (h) => /^(time|time eaten)$/.test(h),
  name: (h) => /^(food name|food|name|item)$/.test(h),
  amount: (h) => /^(amount|serving|quantity)$/.test(h),
  kcal: (h) => /^(calories|energy)(\s|\(|$)/.test(h),
  protein: (h) => /^protein(\s|\(|$)/.test(h),
  carbs: (h) => /^(total )?(carbs|carbohydrates?)(\s|\(|$)/.test(h),
  fat: (h) => /^(total )?fat(\s|\(|$)/.test(h),
  fibre: (h) => /^fib(er|re)(\s|\(|$)/.test(h),
  note: (h) => /^notes?$/.test(h),
};
function columnMap(header) {
  const heads = header.map(norm);
  const map = {};
  for (const [key, test] of Object.entries(COLS)) {
    const idx = heads.findIndex(test);
    map[key] = idx < 0 ? -1 : idx;
  }
  // Prefer a kcal column over a kJ one when both exist.
  const kcalIdx = heads.findIndex((h) => COLS.kcal(h) && !/kj/.test(h));
  if (kcalIdx >= 0) map.kcal = kcalIdx;
  map.kcalIsKj = map.kcal >= 0 && /kj/.test(heads[map.kcal]);
  return map;
}

/** 'mfp' | 'cronometer' | null from the first line of a file. */
export function detectFormat(headerLine) {
  const header = readCsv(String(headerLine ?? '').split(/\r?\n/)[0] || '')[0];
  if (!header || header.length < 3) return null;
  const c = columnMap(header);
  if (c.date < 0 || c.kcal < 0) return null;
  if (c.name >= 0 && c.amount >= 0) return 'cronometer';
  if (c.meal >= 0 && c.name < 0) return 'mfp';
  return null;
}

const cell = (row, i) => (i >= 0 && i < row.length ? row[i] : null);
// A figure: a number in range, null for blank, undefined for unreadable.
function figure(row, i, kj = false) {
  const n = parseNumber(cell(row, i));
  if (n === null) return null;
  if (!Number.isFinite(n) || n < 0) return undefined;
  const v = kj ? n / 4.184 : n;
  return v > MAX_METRIC ? undefined : v;
}

function parseRows(text, format) {
  const all = readCsv(text);
  const rows = [];
  rows.total = 0;
  rows.skipped = 0;
  if (all.length === 0) return rows;
  const c = columnMap(all[0]);
  const body = all.slice(1);
  const order = inferSlashOrder(body.map((r) => cell(r, c.date)));
  for (const r of body) {
    rows.total += 1;
    const date = parseDateCell(cell(r, c.date), order);
    const kcal = figure(r, c.kcal, c.kcalIsKj);
    const protein = figure(r, c.protein);
    const carbs = figure(r, c.carbs);
    const fat = figure(r, c.fat);
    const fibre = figure(r, c.fibre);
    if (!date || kcal == null || [protein, carbs, fat, fibre].includes(undefined)) { rows.skipped += 1; continue; }
    if (format === 'mfp') {
      rows.push({
        date, meal: String(cell(r, c.meal) ?? '').trim(), kcal, proteinG: protein, carbsG: carbs, fatG: fat, fibreG: fibre,
        note: String(cell(r, c.note) ?? '').trim() || null,
      });
    } else {
      const name = String(cell(r, c.name) ?? '').trim().slice(0, NAME_MAX);
      if (!name) { rows.skipped += 1; continue; }
      const amountText = String(cell(r, c.amount) ?? '').trim();
      const am = /^(\d*[.,]?\d+)\s*(.*)$/.exec(amountText);
      const amountValue = am ? parseNumber(am[1]) : null;
      rows.push({
        date, time: String(cell(r, c.time) ?? '').trim() || null, group: String(cell(r, c.meal) ?? '').trim(),
        name, amountText, amountValue: Number.isFinite(amountValue) ? amountValue : null,
        amountUnit: am ? am[2].trim().toLowerCase() : '',
        kcal, proteinG: protein, carbsG: carbs, fatG: fat, fibreG: fibre,
      });
    }
  }
  return rows;
}

/** MyFitnessPal nutrition rows. The array carries `total` (data rows) and `skipped` (unreadable rows). */
export function parseMfpNutritionCsv(text) { return parseRows(text, 'mfp'); }
/** Cronometer servings rows. The array carries `total` and `skipped`. */
export function parseCronometerServingsCsv(text) { return parseRows(text, 'cronometer'); }

// ─── plan ────────────────────────────────────────────────────────────────

const MFP = 'from MyFitnessPal';
const CRONO = 'from Cronometer';

// Breakfast, Lunch, Dinner, Snacks by order; anything else counts as Snacks.
function mealIndex(name) {
  const s = String(name ?? '').toLowerCase();
  if (/break/.test(s)) return 0;
  if (/lunch/.test(s)) return 1;
  if (/dinner|supper/.test(s)) return 2;
  return 3;
}
const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
function slotFor(idx, mealsPerDay) {
  const n = Math.max(1, (Number(mealsPerDay) | 0) || 4);
  return `meal_${Math.min(idx + 1, n)}`;
}
const r1 = (n) => Math.round((n ?? 0) * 10) / 10;
function boundedNote(head, tail) {
  const room = FOOD_NOTE_MAX_LENGTH - tail.length;
  return `${head.slice(0, Math.max(0, room)).trim()}${tail}`;
}
function eatenAtFor(dayKey, time) {
  const [y, m, d] = dayKey.split('-').map(Number);
  const mins = parseTimeCell(time);
  const at = new Date(y, m - 1, d, mins == null ? 12 : Math.floor(mins / 60), mins == null ? 0 : mins % 60, 0, 0);
  return at.getTime();
}

/**
 * Rows to a plan. Returned, not written:
 *   { entries, customFoods, skippedRows, skippedDays, from, to, rowsRead, addedRows }
 * An entry that references a custom food carries `customName` and a null
 * `foodRef`; the flow fills `custom:<id>` once the food is saved.
 */
export function planImport(rows, { format, existingDays = [], mealsPerDay = 4 } = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const existing = existingDays instanceof Set ? existingDays : new Set(existingDays || []);
  const skippedRows = Number(list.skipped) || 0;
  const rowsRead = (Number(list.total) || 0) || list.length + skippedRows;
  const dates = list.map((r) => r.date).sort();
  const from = dates[0] ?? null;
  const to = dates[dates.length - 1] ?? null;
  const skippedDaySet = new Set(list.filter((r) => existing.has(r.date)).map((r) => r.date));
  const fresh = list.filter((r) => !existing.has(r.date));
  const entries = [];
  const customFoods = [];

  if (format === 'mfp') {
    const groups = new Map();
    for (const r of fresh) {
      const idx = mealIndex(r.meal);
      const label = idx < 3 ? MEAL_LABELS[idx] : (/snack/i.test(r.meal) || !r.meal ? 'Snacks' : r.meal.slice(0, 40));
      const key = `${r.date}|${label}`;
      const g = groups.get(key) || { date: r.date, idx, label, kcal: 0, p: 0, c: 0, f: 0, fi: null };
      g.kcal += r.kcal; g.p += r.proteinG ?? 0; g.c += r.carbsG ?? 0; g.f += r.fatG ?? 0;
      if (r.fibreG != null) g.fi = (g.fi ?? 0) + r.fibreG;
      groups.set(key, g);
    }
    for (const g of groups.values()) {
      entries.push({
        entryDate: g.date, mealSlot: slotFor(g.idx, mealsPerDay), foodRef: IMPORT_QUICK_REF, quantityG: 0,
        kcal: Math.round(g.kcal), proteinG: r1(g.p), carbsG: r1(g.c), fatG: r1(g.f), fibreG: g.fi == null ? null : r1(g.fi),
        eatenAt: eatenAtFor(g.date, null), isPlanned: false, note: boundedNote(g.label, `, ${MFP}`),
      });
    }
  } else if (format === 'cronometer') {
    const verdict = new Map(); // name -> true (custom food made) | false (sanity failed)
    for (const r of fresh) {
      const common = {
        entryDate: r.date, mealSlot: slotFor(mealIndex(r.group), mealsPerDay), eatenAt: eatenAtFor(r.date, r.time), isPlanned: false,
        kcal: Math.round(r.kcal), proteinG: r1(r.proteinG), carbsG: r1(r.carbsG), fatG: r1(r.fatG), fibreG: r.fibreG == null ? null : r1(r.fibreG),
      };
      const grams = r.amountUnit === 'g' || r.amountUnit === 'gram' || r.amountUnit === 'grams' ? r.amountValue : null;
      const gramsOk = grams != null && Math.round(grams) >= 1 && Math.round(grams) <= MAX_GRAMS;
      let useCustom = false;
      if (gramsOk) {
        if (!verdict.has(r.name)) {
          const k = 100 / grams;
          const food = {
            name: r.name, servingG: r1(grams), servingLabel: null,
            kcal100g: r1(r.kcal * k), protein100g: r1((r.proteinG ?? 0) * k), carbs100g: r1((r.carbsG ?? 0) * k),
            fat100g: r1((r.fatG ?? 0) * k), fibre100g: r.fibreG == null ? null : r1(r.fibreG * k),
          };
          const ok = checkFoodSanity({ ...food, fibre100g: food.fibre100g ?? undefined }).valid;
          verdict.set(r.name, ok);
          if (ok) customFoods.push(food);
        }
        useCustom = verdict.get(r.name) === true;
      }
      if (useCustom) {
        entries.push({ ...common, foodRef: null, customName: r.name, quantityG: r1(grams), note: null });
      } else {
        const amount = r.amountText ? `, ${r.amountText}` : '';
        entries.push({ ...common, foodRef: IMPORT_QUICK_REF, quantityG: 0, note: boundedNote(r.name, `${amount}, ${CRONO}`) });
      }
    }
  }

  return {
    entries, customFoods, skippedRows, skippedDays: skippedDaySet.size, from, to, rowsRead, addedRows: entries.length,
  };
}

// ─── wording ─────────────────────────────────────────────────────────────

const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dayWords(key, withYear) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${LONG_MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** The summary shown before anything is written, as lines. */
export function summariseImport(plan) {
  const lines = [];
  const sameYear = plan.from && plan.to && plan.from.slice(0, 4) === plan.to.slice(0, 4);
  const range = plan.from ? ` from ${dayWords(plan.from, !sameYear)} to ${dayWords(plan.to, !sameYear)}` : '';
  const added = plan.addedRows;
  lines.push(`Read ${plural(plan.rowsRead, 'row', 'rows')}${range}.`);
  lines.push(added > 0 ? `${added} will be added as eaten.` : 'There is nothing new to add.');
  if (plan.skippedRows > 0) lines.push(`${plural(plan.skippedRows, 'row', 'rows')} could not be read.`);
  if (plan.skippedDays > 0) {
    lines.push(plan.skippedDays === 1
      ? '1 day already had food and will be left alone.'
      : `${plan.skippedDays} days already had food and will be left alone.`);
  }
  return lines;
}
