/**
 * importHistory.js: bring a food history in from another app (D230 R21, food
 * level-up 2026-10-16, lane 4C). PURE: no I/O, no clock (the caller passes
 * `today`), no store. Picking, reading and writing live in
 * importHistoryFlow.js.
 *
 * R21 (docs/audit/food-levelup-2026-10-16/03-ASSESSMENT-AND-PLAN.md): "a CSV
 * from MyFitnessPal (its Nutrition-Summary export, one row per meal per day)
 * becomes one entry per meal per day with the note "Breakfast, from
 * MyFitnessPal"; a Cronometer servings export becomes entries by food with its
 * amounts, creating a custom food per unique name where the amount is in
 * grams. Rows are actuals on their own dates; nothing already logged is
 * overwritten; the import reports what it read and what it could not."
 *
 * THE FORMATS, AND WHAT IS VERIFIED (searched 2026-10-16; evidence before
 * assertion: verified and believed are kept apart).
 *
 * Cronometer, "Export Servings" (servings.csv). VERIFIED VERBATIM from the
 * header switch of an open-source parser of the raw export,
 * https://github.com/burke/gocronometer/blob/master/parse.go
 * (ParseServingsExport): "Day", "Time", "Group", "Food Name", "Amount" (a
 * value and a unit split by the first space, "100.00 g" or "1.00 large"),
 * "Energy (kcal)", "Carbs (g)", "Fiber (g)", "Fat (g)", "Protein (g)",
 * "Category", and some 60 further nutrient columns ("Net Carbs (g)",
 * "Saturated (g)", "Sodium (mg)", ...). Day and Time are read with the layout
 * "2006-01-02 15:04"; https://github.com/jrmycanady/gocronometer/blob/master/parse.go
 * reads them as "2006-01-02 15:04 PM", so a time may carry AM or PM. An empty
 * nutrient cell is no data, read as 0 there. Menu path and the Gold serving
 * timestamp: https://forums.cronometer.com/discussion/460/exporting-data . The
 * Amount can be a named serving rather than grams:
 * https://forums.cronometer.com/discussion/6142/export-grams-next-to-serving-size-in-diary
 * and https://forums.cronometer.com/discussion/6485/include-weight-of-food-in-export-entries .
 *
 * MyFitnessPal, the Premium export's nutrition file ("Nutrition-Summary-<from>
 * -to-<to>.csv"). The vendor does NOT publish its header row. Established: a
 * Premium export, emailed as a zip of three CSVs (nutrition, progress,
 * exercise), the nutrition one "summarized by meal" with the food notes
 * (https://takeoutday.org/services/myfitnesspal ;
 * https://support.myfitnesspal.com/hc/en-us/articles/360032273352-Export-your-nutrition-progress-and-exercise-data ;
 * https://community.myfitnesspal.com/en/discussion/10957736/exporting-per-food-data ,
 * "rolls up to the Meal level"); Breakfast, Lunch, Dinner and Snacks
 * (https://pypi.org/project/myfitnesspal-converter). BELIEVED, NOT VERIFIED
 * VERBATIM: Date, Meal, Calories, Fat (g), Saturated Fat, Polyunsaturated
 * Fat, Monounsaturated Fat, Trans Fat, Cholesterol, Sodium (mg), Potassium,
 * Carbohydrates (g), Fiber, Sugar, Protein (g), Vitamin A, Vitamin C,
 * Calcium, Iron, Note, with ISO dates. That is why every column below is
 * found by a tolerant name match, never by position, and why UK and US
 * dates are both read.
 *
 * WHAT A REAL FILE MAY HOLD, AND WHAT HAPPENS: a byte order mark (dropped);
 * CRLF or LF; quoted fields with commas, quotes and line breaks; a semicolon
 * or tab separator (a spreadsheet saved in a decimal-comma locale), where a
 * comma is the decimal point; a decimal comma inside quotes; a unit after a
 * figure ("250 kcal", "12 g"); columns in any order and unknown extra
 * columns (ignored); blank rows and a totals row (left out, not counted);
 * ISO, "3 March 2025", "March 3, 2025", "3-Mar-25", and D/M/Y or M/D/Y
 * slash dates, settled by any row with a part over 12 (a file that never
 * settles it has those rows reported, never guessed).
 *
 * LAWS. Every entry is an actual, never planned. A row that cannot be read
 * is reported with its reason, never half-read. A day that already holds
 * food is left whole, so nothing logged is overwritten or duplicated and a
 * second import of the same file adds nothing. A row dated after today is
 * left out. Nothing here sends anything anywhere.
 */

import { checkFoodSanity } from './sanityChecks';
import { FOOD_NOTE_MAX_LENGTH } from './entryNote';

export const IMPORT_QUICK_REF = 'quick:import';
const MAX_METRIC = 100000;
const MAX_GRAMS = 5000;
const NAME_MAX = 100;

// ─── CSV reader ──────────────────────────────────────────────────────────

// The separator of the header line: the most frequent of comma, semicolon
// and tab outside quotes. A comma when there is no clear answer.
export function detectDelimiter(text) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let i = 0; i < src.length; i += 1) {
    const c = src[i];
    if (c === '"') quoted = !quoted;
    else if (!quoted && (c === '\n' || c === '\r')) break;
    else if (!quoted && counts[c] !== undefined) counts[c] += 1;
  }
  if (counts[';'] > counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
  return ',';
}

/**
 * Records from CSV text: quoted fields with the separator, doubled quotes and
 * line breaks inside, CRLF or LF, a BOM, a trailing newline. Blank lines are
 * dropped. Each record carries `line`, its 1-based line in the file.
 */
export function readCsv(text, delimiter = ',') {
  const reader = _csvReader(text, delimiter);
  reader.step(Infinity);
  return reader.finish();
}

// The one CSV state machine behind readCsv and readCsvAsync. `step(limit)`
// reads up to character `limit` of the text and can be called again to
// carry on exactly where it stopped (every piece of state lives in the
// closure), so reading in slices gives the same records as reading at once.
function _csvReader(text, delimiter) {
  const src = String(text ?? '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let rowLine = 1;
  let i = 0;
  const endRow = () => {
    row.push(field);
    if (!(row.length === 1 && row[0].trim() === '')) { row.line = rowLine; rows.push(row); }
    field = '';
    row = [];
  };
  const step = (limit) => {
    const end = Math.min(limit, src.length);
    while (i < end) {
      const c = src[i];
      if (quoted) {
        if (c === '"') {
          if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
          quoted = false; i += 1; continue;
        }
        if (c === '\n') line += 1;
        field += c; i += 1; continue;
      }
      if (c === '"') { quoted = true; i += 1; continue; }
      if (c === delimiter) { row.push(field); field = ''; i += 1; continue; }
      if (c === '\r' || c === '\n') {
        endRow();
        i += c === '\r' && src[i + 1] === '\n' ? 2 : 1;
        line += 1;
        rowLine = line;
        continue;
      }
      field += c; i += 1;
    }
  };
  const finish = () => {
    if (field !== '' || row.length) endRow();
    return rows;
  };
  return { step, finish, done: () => i >= src.length, position: () => i };
}

// How many characters the async reader takes before handing the thread back
// (food data-layer audit 2026-10-16, item 13): a 10 MB export read in one go
// held the JavaScript thread for the whole parse.
export const CSV_YIELD_EVERY = 4000;

/**
 * readCsv in slices of `yieldEvery` characters, awaiting `yieldFn()` between
 * slices so a long file never holds the thread. Same records as readCsv for
 * the same text (pinned by importHistory.test.js). `yieldFn` is the caller's
 * (this module keeps no clock or timer); by default it awaits a resolved
 * promise.
 */
export async function readCsvAsync(text, delimiter = ',', { yieldEvery = CSV_YIELD_EVERY, yieldFn = () => Promise.resolve() } = {}) {
  const reader = _csvReader(text, delimiter);
  const size = Math.max(1, Math.trunc(Number(yieldEvery)) || CSV_YIELD_EVERY);
  while (!reader.done()) {
    reader.step(reader.position() + size);
    // eslint-disable-next-line no-await-in-loop
    if (!reader.done()) await yieldFn();
  }
  return reader.finish();
}

// ─── cells ───────────────────────────────────────────────────────────────

const UNIT_TAIL = /(kcal|cal|kj|mg|µg|ug|mcg|g)$/i;

/**
 * A figure cell to a number. Blank or a dash is null; anything that is not a
 * figure is NaN. Reads "1,234.5", "1.234,5", "12,5", "1 234", "250 kcal" and
 * "12 g". `decimalComma` (a semicolon or tab file) reads every comma as the
 * decimal point.
 */
export function parseNumber(cell, { decimalComma = false } = {}) {
  if (cell == null) return null;
  let s = String(cell).trim().replace(/[\s\u00A0\u202F]/g, '');
  s = s.replace(UNIT_TAIL, '');
  if (s === '' || s === '-' || s === '--') return null;
  if (decimalComma) {
    s = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  } else if (s.includes(',') && s.includes('.')) {
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n) => String(n).padStart(2, '0');
const fullYear = (y) => (y < 100 ? 2000 + y : y);
function validKey(y, m, d) {
  if (!(y >= 1990 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
const monthIndex = (word) => MONTHS.indexOf(String(word).slice(0, 3).toLowerCase());
const SLASH = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:[T\s].*)?$/;

/** A date cell to a local day key. `order` ('dmy' | 'mdy') settles a slash date; null when it cannot be known. */
export function parseDateCell(cell, order = null) {
  const s = String(cell ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return validKey(+m[1], +m[2], +m[3]);
  m = SLASH.exec(s);
  if (m) {
    const a = +m[1]; const b = +m[2]; const y = fullYear(+m[3]);
    if (a > 12) return validKey(y, b, a);
    if (b > 12) return validKey(y, a, b);
    if (a === b) return validKey(y, a, b);
    if (order === 'dmy') return validKey(y, b, a);
    if (order === 'mdy') return validKey(y, a, b);
    return null;
  }
  m = /^(?:[A-Za-z]{3,},?\s+)?(\d{1,2})[\s-]+([A-Za-z]{3,})\.?,?[\s-]+(\d{2}|\d{4})$/.exec(s);
  if (m) { const mi = monthIndex(m[2]); return mi < 0 ? null : validKey(fullYear(+m[3]), mi + 1, +m[1]); }
  m = /^(?:[A-Za-z]{3,},?\s+)?([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(s);
  if (m) { const mi = monthIndex(m[1]); return mi < 0 ? null : validKey(+m[3], mi + 1, +m[2]); }
  return null;
}

// The order of the file's slash dates, settled by any row with a part over
// 12; null when no row settles it.
export function inferSlashOrder(cells) {
  for (const c of cells) {
    const m = SLASH.exec(String(c ?? '').trim());
    if (!m) continue;
    if (+m[1] > 12) return 'dmy';
    if (+m[2] > 12) return 'mdy';
  }
  return null;
}

/** "08:30", "8:30 AM", "13:04 PM", "08:30:15" to minutes after midnight; null when not a time. */
export function parseTimeCell(cell) {
  const m = /^\s*(\d{1,2})[:.](\d{2})(?::\d{2})?\s*([AaPp]\.?[Mm]\.?)?\s*$/.exec(String(cell ?? ''));
  if (!m) return null;
  let h = +m[1]; const min = +m[2];
  if (m[3] && h <= 12) {
    if (h < 1) return null;
    const pm = /^p/i.test(m[3]);
    h = (h % 12) + (pm ? 12 : 0);
  }
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

// ─── columns ─────────────────────────────────────────────────────────────

const norm = (h) => String(h ?? '').replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' ').toLowerCase();
const UNIT = '(\\s*\\((g|kcal|cal|kj)\\))?';
const COLS = {
  date: (h) => /^(date|day)$/.test(h),
  meal: (h) => /^(meal|group|meal name|meal type)$/.test(h),
  time: (h) => /^(time|time eaten)$/.test(h),
  name: (h) => /^(food name|food|name|item|description)$/.test(h),
  amount: (h) => /^(amount|serving|serving size|quantity)$/.test(h),
  kcal: (h) => new RegExp(`^(calories|energy|kcal)${UNIT}$`).test(h),
  protein: (h) => new RegExp(`^protein${UNIT}$`).test(h),
  carbs: (h) => new RegExp(`^(total )?(carbs|carbohydrates?)${UNIT}$`).test(h),
  fat: (h) => new RegExp(`^(total )?fat${UNIT}$`).test(h),
  fibre: (h) => new RegExp(`^(dietary )?fib(er|re)${UNIT}$`).test(h),
};

/** The column index of each field we read, by name; -1 when absent. `kcalIsKj` when energy is only in kJ. */
export function columnMap(header) {
  const heads = (header || []).map(norm);
  const map = {};
  for (const [key, test] of Object.entries(COLS)) map[key] = heads.findIndex(test);
  // Prefer a kcal column; take a kJ one only when there is none.
  const kcal = heads.findIndex((h) => COLS.kcal(h) && !/\(kj\)/.test(h));
  map.kcalIsKj = kcal < 0 && map.kcal >= 0;
  if (kcal >= 0) map.kcal = kcal;
  return map;
}

function formatOf(map) {
  if (map.date < 0 || map.kcal < 0) return null;
  if (map.name >= 0 && map.amount >= 0) return 'cronometer';
  if (map.meal >= 0) return 'mfp';
  return null;
}

/** 'mfp' | 'cronometer' | null, from the file's text (its header line is enough). */
export function detectFormat(text) {
  const delimiter = detectDelimiter(text);
  const header = readCsv(String(text ?? '').split(/\r?\n/, 1)[0] || '', delimiter)[0];
  if (!header || header.length < 3) return null;
  return formatOf(columnMap(header));
}

// ─── rows ────────────────────────────────────────────────────────────────

/** Why a row could not be read; the words come from problemLines(). */
export const PROBLEM = Object.freeze({
  DATE: 'date',
  CALORIES: 'calories',
  FIGURE: 'figure',
  NAME: 'name',
  FUTURE: 'future',
});

const TOTALS = /^(daily )?totals?:?$/i;
const cellAt = (row, i) => (i >= 0 && i < row.length ? row[i] : null);
const text = (row, i) => String(cellAt(row, i) ?? '').trim();

/**
 * Read a file. Returns `{ format, rows, problems, rowsRead }`, or
 * `{ format: null }` when it is neither export. `rows` are the readable data
 * rows; `problems` are `{ row, reason }` (row is the file line); `rowsRead`
 * counts every data row (blank rows and a totals row are not data).
 */
export function parseHistoryCsv(input) {
  const delimiter = detectDelimiter(input);
  return _parseRecords(readCsv(input, delimiter), delimiter);
}

/**
 * parseHistoryCsv with the file read by readCsvAsync, so a long file hands
 * the thread back every `yieldEvery` characters. Same result as
 * parseHistoryCsv for the same text.
 */
export async function parseHistoryCsvAsync(input, options = {}) {
  const delimiter = detectDelimiter(input);
  return _parseRecords(await readCsvAsync(input, delimiter, options), delimiter);
}

function _parseRecords(all, delimiter) {
  const decimalComma = delimiter !== ',';
  if (all.length === 0) return { format: null };
  const c = columnMap(all[0]);
  const format = formatOf(c);
  if (!format) return { format: null };
  const body = all.slice(1).filter((r) => r.some((v) => String(v).trim() !== ''));
  const order = inferSlashOrder(body.map((r) => cellAt(r, c.date)));
  const rows = [];
  const problems = [];
  let rowsRead = 0;
  const figure = (r, i, kj = false) => {
    const n = parseNumber(cellAt(r, i), { decimalComma });
    if (n === null) return null;
    if (!Number.isFinite(n) || n < 0) return undefined;
    const v = kj ? n / 4.184 : n;
    return v > MAX_METRIC ? undefined : v;
  };
  for (const r of body) {
    const first = [text(r, 0), text(r, c.date), text(r, c.meal), text(r, c.name)];
    if (first.some((v) => TOTALS.test(v))) continue;
    rowsRead += 1;
    const line = r.line;
    const date = parseDateCell(cellAt(r, c.date), order);
    if (!date) { problems.push({ row: line, reason: PROBLEM.DATE }); continue; }
    const kcal = figure(r, c.kcal, c.kcalIsKj);
    if (kcal == null) { problems.push({ row: line, reason: PROBLEM.CALORIES }); continue; }
    const macros = [figure(r, c.protein), figure(r, c.carbs), figure(r, c.fat), figure(r, c.fibre)];
    if (macros.includes(undefined)) { problems.push({ row: line, reason: PROBLEM.FIGURE }); continue; }
    const [protein, carbs, fat, fibre] = macros;
    const base = {
      row: line, date, time: parseTimeCell(cellAt(r, c.time)),
      kcal, proteinG: protein ?? 0, carbsG: carbs ?? 0, fatG: fat ?? 0, fibreG: fibre,
    };
    if (format === 'mfp') {
      rows.push({ ...base, meal: text(r, c.meal) });
      continue;
    }
    const name = text(r, c.name).replace(/\s+/g, ' ').slice(0, NAME_MAX).trim();
    if (!name) { problems.push({ row: line, reason: PROBLEM.NAME }); continue; }
    const amountText = text(r, c.amount).replace(/\s+/g, ' ');
    const am = /^(\d[\d.,]*|[.,]\d+)\s*(.*)$/.exec(amountText);
    const amountValue = am ? parseNumber(am[1], { decimalComma }) : null;
    rows.push({
      ...base,
      group: text(r, c.meal),
      name,
      amountText,
      amountValue: Number.isFinite(amountValue) ? amountValue : null,
      amountUnit: am ? am[2].trim().toLowerCase() : '',
    });
  }
  return { format, rows, problems, rowsRead };
}

/** MyFitnessPal rows only (null format when the file is not one). */
export function parseMfpNutritionCsv(input) {
  const out = parseHistoryCsv(input);
  return out.format === 'mfp' ? out : { format: null };
}
/** Cronometer servings rows only (null format when the file is not one). */
export function parseCronometerServingsCsv(input) {
  const out = parseHistoryCsv(input);
  return out.format === 'cronometer' ? out : { format: null };
}

// ─── plan ────────────────────────────────────────────────────────────────

const MFP = 'from MyFitnessPal';
const CRONO = 'from Cronometer';
const MEAL_LABELS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];

// The meal's place in the day: Breakfast, Lunch, Dinner, then Snacks and
// anything else. "Meal 5" (a renamed MyFitnessPal meal) keeps its number.
function mealPlace(name) {
  const s = String(name ?? '').toLowerCase();
  const numbered = /^meal\s*(\d{1,2})$/.exec(s);
  if (numbered && +numbered[1] >= 1) return { idx: +numbered[1] - 1, label: `Meal ${+numbered[1]}` };
  if (/break/.test(s)) return { idx: 0, label: MEAL_LABELS[0] };
  if (/lunch/.test(s)) return { idx: 1, label: MEAL_LABELS[1] };
  if (/dinner|supper/.test(s)) return { idx: 2, label: MEAL_LABELS[2] };
  if (!s || /snack|uncategori[sz]ed/.test(s)) return { idx: 3, label: s ? MEAL_LABELS[3] : null };
  return { idx: 3, label: String(name).trim().slice(0, 40) };
}
// Meal N of the person's own day, never past their last meal.
function slotFor(idx, mealsPerDay) {
  const n = Math.max(1, Math.trunc(Number(mealsPerDay)) || 4);
  return `meal_${Math.min(idx + 1, n)}`;
}
const r1 = (n) => Math.round((n ?? 0) * 10) / 10;
function boundedNote(head, tail) {
  const room = FOOD_NOTE_MAX_LENGTH - tail.length;
  return `${String(head).slice(0, Math.max(0, room)).trim()}${tail}`;
}
// A row's clock time on its own day; null when the file has no time.
function eatenAtFor(dayKey, minutes) {
  if (minutes == null) return null;
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0).getTime();
}
const nameKey = (name) => String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const GRAM_UNITS = { g: 1, gram: 1, grams: 1, gr: 1, kg: 1000 };

/**
 * Parsed rows to a plan. Returned, not written:
 *   { format, entries, customFoods, problems, rowsRead, from, to, addedRows,
 *     existingDays, existingDayRows }
 * Options: `existingDays` (days that already hold food: left whole),
 * `plannedDays` (days that hold planned meals and no food: left whole too,
 * food data-layer audit 2026-10-16 item 13, so the weekly check-in's "I ate
 * as planned" can never count a day twice; reported apart as already
 * planned), `existingFoods` (the person's own foods, name to id: reused,
 * never made twice), `mealsPerDay`, `today` (a day key; later rows are left
 * out).
 * An entry for a food still to be saved carries `customName` and a null
 * `foodRef`; the flow fills `custom:<id>` once it is saved. `eatenAt` is the
 * file's own clock time on the row's day, or null when it has none.
 */
export function planImport(parsed, {
  existingDays = [], plannedDays = [], existingFoods = new Map(), mealsPerDay = 4, today = null,
} = {}) {
  const format = parsed?.format ?? null;
  const rows = Array.isArray(parsed?.rows) ? parsed.rows : [];
  const problems = Array.isArray(parsed?.problems) ? [...parsed.problems] : [];
  const existing = existingDays instanceof Set ? existingDays : new Set(existingDays || []);
  const planned = plannedDays instanceof Set ? plannedDays : new Set(plannedDays || []);
  const skippedPlannedDays = new Set();
  let plannedDayRows = 0;
  const ownFoods = new Map();
  for (const [k, v] of (existingFoods instanceof Map ? existingFoods : new Map())) ownFoods.set(nameKey(k), v);
  const entries = [];
  const customFoods = [];
  const skippedDays = new Set();
  let existingDayRows = 0;
  const dates = [];
  const verdict = new Map(); // name key -> { kind: 'own', id } | { kind: 'new', name } | { kind: 'no' }

  for (const r of rows) {
    dates.push(r.date);
    if (today && r.date > today) { problems.push({ row: r.row, reason: PROBLEM.FUTURE }); continue; }
    if (existing.has(r.date)) { skippedDays.add(r.date); existingDayRows += 1; continue; }
    if (planned.has(r.date)) { skippedPlannedDays.add(r.date); plannedDayRows += 1; continue; }
    const common = {
      row: r.row, entryDate: r.date, eatenAt: eatenAtFor(r.date, r.time), isPlanned: false,
      kcal: Math.round(r.kcal), proteinG: r1(r.proteinG), carbsG: r1(r.carbsG), fatG: r1(r.fatG),
      fibreG: r.fibreG == null ? null : r1(r.fibreG),
    };
    if (format === 'mfp') {
      const place = mealPlace(r.meal);
      entries.push({
        ...common, mealSlot: slotFor(place.idx, mealsPerDay), foodRef: IMPORT_QUICK_REF, quantityG: 0,
        note: place.label ? boundedNote(place.label, `, ${MFP}`) : 'From MyFitnessPal',
      });
      continue;
    }
    const mealSlot = slotFor(mealPlace(r.group).idx, mealsPerDay);
    const perGram = GRAM_UNITS[r.amountUnit];
    const grams = perGram && r.amountValue != null ? r.amountValue * perGram : null;
    const gramsOk = grams != null && Math.round(grams) >= 1 && Math.round(grams) <= MAX_GRAMS;
    const key = nameKey(r.name);
    if (gramsOk && !verdict.has(key)) {
      if (ownFoods.has(key)) {
        verdict.set(key, { kind: 'own', id: ownFoods.get(key) });
      } else {
        const k = 100 / grams;
        const food = {
          name: r.name, servingG: r1(grams), servingLabel: null,
          kcal100g: r1(r.kcal * k), protein100g: r1(r.proteinG * k), carbs100g: r1(r.carbsG * k),
          fat100g: r1(r.fatG * k), fibre100g: r.fibreG == null ? null : r1(r.fibreG * k),
        };
        const ok = checkFoodSanity({ ...food, fibre100g: food.fibre100g ?? undefined }).valid;
        verdict.set(key, ok ? { kind: 'new', name: food.name } : { kind: 'no' });
        if (ok) customFoods.push(food);
      }
    }
    const v = gramsOk ? verdict.get(key) : { kind: 'no' };
    if (v.kind === 'own') {
      entries.push({ ...common, mealSlot, foodRef: `custom:${v.id}`, quantityG: r1(grams), note: null });
    } else if (v.kind === 'new') {
      // The first spelling in the file names the food; later rows join it.
      entries.push({ ...common, mealSlot, foodRef: null, customName: v.name, quantityG: r1(grams), note: null });
    } else {
      const amount = r.amountText ? `, ${r.amountText.slice(0, 40).trim()}` : '';
      entries.push({
        ...common, mealSlot, foodRef: IMPORT_QUICK_REF, quantityG: 0,
        note: boundedNote(r.name, `${amount}, ${CRONO}`),
      });
    }
  }

  dates.sort();
  problems.sort((a, b) => a.row - b.row);
  return {
    format,
    entries,
    customFoods,
    problems,
    rowsRead: Number(parsed?.rowsRead) || rows.length + (parsed?.problems?.length || 0),
    from: dates[0] ?? null,
    to: dates[dates.length - 1] ?? null,
    addedRows: entries.length,
    existingDays: skippedDays.size,
    existingDayRows,
    plannedDays: skippedPlannedDays.size,
    plannedDayRows,
  };
}

// ─── wording ─────────────────────────────────────────────────────────────

const LONG_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dayWords(key, withYear) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${LONG_MONTHS[m - 1]}${withYear ? ` ${y}` : ''}`;
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function rangeWords(plan) {
  if (!plan.from) return '';
  const sameYear = plan.from.slice(0, 4) === plan.to.slice(0, 4);
  if (plan.from === plan.to) return ` from ${dayWords(plan.from, !sameYear)}`;
  return ` from ${dayWords(plan.from, !sameYear)} to ${dayWords(plan.to, !sameYear)}`;
}

/** The review, before anything is written, as lines. */
export function summariseImport(plan) {
  const lines = [`Read ${plural(plan.rowsRead, 'row', 'rows')}${rangeWords(plan)}.`];
  const unread = plan.problems?.length || 0;
  const plannedDays = plan.plannedDays || 0;
  const allExisting = plan.addedRows === 0 && plan.existingDays > 0 && plannedDays === 0
    && plan.existingDayRows + unread === plan.rowsRead;
  if (allExisting) {
    lines.push('Every day in this file already has food in your diary, so nothing new will be added.');
  } else {
    lines.push(plan.addedRows > 0 ? `${plan.addedRows} will be added.` : 'Nothing will be added.');
  }
  if (unread > 0) lines.push(`${unread} could not be read.`);
  if (plan.existingDays > 0 && !allExisting) {
    lines.push(`${plural(plan.existingDayRows, 'row falls', 'rows fall')} on ${plural(plan.existingDays, 'day', 'days')} that already ${plan.existingDays === 1 ? 'has' : 'have'} food in your diary, and ${plan.existingDays === 1 ? 'that day is' : 'those days are'} left as ${plan.existingDays === 1 ? 'it is' : 'they are'}.`);
  }
  if (plannedDays > 0) {
    const rows = plan.plannedDayRows || 0;
    lines.push(`${plural(rows, 'row falls', 'rows fall')} on ${plural(plannedDays, 'day', 'days')} that already ${plannedDays === 1 ? 'has' : 'have'} meals planned, and ${plannedDays === 1 ? 'that day is' : 'those days are'} left as ${plannedDays === 1 ? 'it is' : 'they are'}.`);
  }
  if (plan.addedRows > 0 && plan.customFoods?.length > 0) {
    lines.push(`${plural(plan.customFoods.length, 'food', 'foods')} weighed in grams will also be saved to your own foods.`);
  }
  return lines;
}

/** The summary after the write, as lines. */
export function summariseResult(plan, { added, foodsSaved = 0, daysLeft = 0, plannedLeft = 0 }) {
  const unread = plan.problems?.length || 0;
  const lines = [`${added} added.${unread > 0 ? ` ${unread} could not be read.` : ''}`];
  const left = (plan.existingDays || 0) + (daysLeft || 0);
  if (left > 0) {
    lines.push(`${plural(left, 'day', 'days')} that already had food ${left === 1 ? 'was' : 'were'} left as ${left === 1 ? 'it was' : 'they were'}.`);
  }
  const plannedLeftAll = (plan.plannedDays || 0) + (plannedLeft || 0);
  if (plannedLeftAll > 0) {
    lines.push(`${plural(plannedLeftAll, 'day', 'days')} that already had meals planned ${plannedLeftAll === 1 ? 'was' : 'were'} left as ${plannedLeftAll === 1 ? 'it was' : 'they were'}.`);
  }
  if (foodsSaved > 0) lines.push(`${plural(foodsSaved, 'food was', 'foods were')} saved to your own foods.`);
  return lines;
}

const REASON_WORDS = {
  [PROBLEM.DATE]: 'the date could not be read',
  [PROBLEM.CALORIES]: 'the calories could not be read',
  [PROBLEM.FIGURE]: 'a protein, carbohydrate, fat or fibre figure could not be read',
  [PROBLEM.NAME]: 'the food has no name',
  [PROBLEM.FUTURE]: 'the date is after today',
};
const LIST_MAX = 8;
function rowList(nums) {
  const shown = nums.slice(0, LIST_MAX);
  const more = nums.length - shown.length;
  if (more > 0) return `${shown.join(', ')} and ${more} more`;
  if (shown.length === 1) return String(shown[0]);
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/** What could not be read, one calm line per reason, with the file's row numbers. */
export function problemLines(problems) {
  const byReason = new Map();
  for (const p of problems || []) {
    if (!byReason.has(p.reason)) byReason.set(p.reason, []);
    byReason.get(p.reason).push(p.row);
  }
  const lines = [];
  for (const reason of Object.values(PROBLEM)) {
    const rows = byReason.get(reason);
    if (!rows) continue;
    lines.push(`${rows.length === 1 ? 'Row' : 'Rows'} ${rowList(rows)}: ${REASON_WORDS[reason]}.`);
  }
  return lines;
}
