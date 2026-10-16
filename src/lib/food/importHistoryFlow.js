/**
 * importHistoryFlow.js: the I/O half of "Import food history" (D230 R21, lane
 * 4C). Picks a file (expo-document-picker), reads it (expo-file-system, the
 * dataBackup.js precedent), plans it (importHistory.js, pure) and writes it
 * through the existing validated paths only: insertCustomFood for the foods,
 * logFoodEntries for the entries (one transaction and one rollup per day per
 * batch is that function's contract).
 *
 * THE RE-IMPORT RULE (pinned by importHistoryFlow.test.js): a day that already
 * holds food in the diary (any live actual, typed or imported) is left whole.
 * The plan leaves those days out, and the write reads the diary again just
 * before it starts and leaves out any day that gained food meanwhile. Batches
 * are whole days, so a run stopped part-way can be repeated: the days it
 * already wrote now hold food and are left alone, and a food it already
 * saved is found by name and reused, never saved twice.
 *
 * What it never does: change a target, raise or clear a flag, start a
 * coaching run, or send anything read from the file anywhere. The diary
 * write's own housekeeping (the usual cloud sync of the person's diary) is
 * logFoodEntries' own. The write is made with two of its options:
 * `keepUntimed`, so a row the file did not time is stored with no time
 * rather than the moment of the import, and `telemetry: false`, so a history
 * sends no per-row `food_logged` and never the once-per-person
 * `first_food_logged` (an import is not a meal logged in the app). No summary
 * event is sent: a new event name needs the server's allow-list first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import {
  insertCustomFood, logFoodEntries, getRecentLoggedDays, getAllCustomFoods, isLoggableFoodEntry,
} from './db';
import { parseHistoryCsv, planImport, PROBLEM } from './importHistory';
import { todayLocalKey } from '../dayKey';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const IMPORT_BATCH = 200;
// CSV and plain text only. Some Android file providers label a .csv as
// application/vnd.ms-excel, so that is listed too; anything else is hidden.
export const IMPORT_FILE_TYPES = [
  'text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel', 'text/plain',
];
export const NOT_A_FOOD_EXPORT = 'That file does not look like a MyFitnessPal or Cronometer export. Export the nutrition file from MyFitnessPal, or the servings from Cronometer, and try again.';
export const FILE_TOO_LARGE = 'That file is larger than 10 MB. Export a shorter date range and try again.';
export const FILE_NOT_READ = 'That file could not be read. Try exporting it again.';

/** A reading failure with a calm sentence the person can be shown. */
export class ImportReadError extends Error {
  constructor(code, sentence) {
    super(`import read failed: ${code}`);
    this.name = 'ImportReadError';
    this.code = code;
    this.sentence = sentence;
  }
}

/** Pick and read a file: { cancelled: true } or { text }. Throws ImportReadError. */
export async function pickHistoryFile() {
  const picked = await DocumentPicker.getDocumentAsync({ type: IMPORT_FILE_TYPES, copyToCacheDirectory: true });
  if (!picked || picked.canceled || picked.type === 'cancel') return { cancelled: true };
  const asset = picked.assets?.[0];
  const uri = asset?.uri || picked.uri;
  if (!uri) throw new ImportReadError('no_uri', FILE_NOT_READ);
  const declared = Number(asset?.size ?? picked.size);
  if (Number.isFinite(declared) && declared > MAX_IMPORT_BYTES) throw new ImportReadError('too_large', FILE_TOO_LARGE);
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (Number.isFinite(Number(info?.size)) && Number(info.size) > MAX_IMPORT_BYTES) {
    throw new ImportReadError('too_large', FILE_TOO_LARGE);
  }
  const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType?.UTF8 ?? 'utf8' });
  return { text };
}

async function readMealsPerDay() {
  try {
    const n = parseInt(await AsyncStorage.getItem('@volyume_meals_per_day'), 10);
    if (Number.isFinite(n) && n >= 1) return n;
  } catch (_) { /* the default of four meals stands */ }
  return 4;
}

async function readDaysWithFood(userId) {
  const days = await getRecentLoggedDays(userId, '9999-12-31', 1000000);
  return new Set((days || []).map((d) => d.entry_date));
}

async function readOwnFoods(userId) {
  const foods = await getAllCustomFoods(userId);
  const byName = new Map();
  for (const f of foods || []) {
    const key = String(f?.name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (key && !byName.has(key)) byName.set(key, f.id);
  }
  return byName;
}

/**
 * Text to a plan, or { error } when the file is neither export. Reads the
 * days that already hold food, the person's own foods and their meals per
 * day. An entry the diary's own validator would refuse is reported, never
 * sent to the all-or-nothing write.
 */
export async function planFromText(userId, text, { today = todayLocalKey() } = {}) {
  const parsed = parseHistoryCsv(text);
  if (!parsed.format) return { error: NOT_A_FOOD_EXPORT };
  const [mealsPerDay, existingDays, existingFoods] = await Promise.all([
    readMealsPerDay(), readDaysWithFood(userId), readOwnFoods(userId),
  ]);
  const plan = planImport(parsed, { existingDays, existingFoods, mealsPerDay, today });
  const entries = [];
  for (const e of plan.entries) {
    const probe = e.customName ? { ...e, foodRef: 'custom:probe' } : e;
    if (isLoggableFoodEntry(probe)) entries.push(e);
    else plan.problems.push({ row: e.row ?? 0, reason: PROBLEM.FIGURE });
  }
  plan.problems.sort((a, b) => a.row - b.row);
  plan.entries = entries;
  plan.addedRows = entries.length;
  const named = new Set(entries.filter((e) => e.customName).map((e) => e.customName));
  plan.customFoods = plan.customFoods.filter((f) => named.has(f.name));
  return { format: parsed.format, plan };
}

// Whole days per batch, so a day is never split across two writes.
export function batchByDay(entries, size = IMPORT_BATCH) {
  const byDay = new Map();
  for (const e of entries) {
    if (!byDay.has(e.entryDate)) byDay.set(e.entryDate, []);
    byDay.get(e.entryDate).push(e);
  }
  const batches = [];
  let cur = [];
  for (const day of [...byDay.keys()].sort()) {
    const rows = byDay.get(day);
    if (cur.length && cur.length + rows.length > size) { batches.push(cur); cur = []; }
    cur = cur.concat(rows);
  }
  if (cur.length) batches.push(cur);
  return batches;
}

// The diary write's options for an import (see the header).
const IMPORT_WRITE_OPTIONS = Object.freeze({ keepUntimed: true, telemetry: false });

// Hand the thread back between batches so the screen keeps answering.
const yieldToUi = () => new Promise((resolve) => setTimeout(resolve, 0));

const toDiaryEntry = (e, foodRef) => ({
  entryDate: e.entryDate, mealSlot: e.mealSlot, foodRef, quantityG: e.quantityG,
  kcal: e.kcal, proteinG: e.proteinG, carbsG: e.carbsG, fatG: e.fatG, fibreG: e.fibreG,
  eatenAt: e.eatenAt, isPlanned: false, note: e.note ?? null,
});

/**
 * Write a plan: the new foods, then the entries in whole-day batches.
 * Returns { added, foodsSaved, daysLeft }. On a failure it throws with
 * `.written` (entries already in) and `.stage` ('foods' | 'entries').
 * `onProgress(added, total)` after each batch.
 */
export async function writePlan(userId, plan, { onProgress } = {}) {
  let written = 0;
  let stage = 'foods';
  let foodsSaved = 0;
  try {
    // The diary and the foods as they are now, not as they were at review.
    const [daysNow, foodsNow] = await Promise.all([readDaysWithFood(userId), readOwnFoods(userId)]);
    const ids = new Map();
    for (const food of plan.customFoods || []) {
      const key = food.name.trim().replace(/\s+/g, ' ').toLowerCase();
      if (foodsNow.has(key)) { ids.set(food.name, foodsNow.get(key)); continue; }
      // eslint-disable-next-line no-await-in-loop
      const id = await insertCustomFood(userId, food);
      ids.set(food.name, id);
      foodsNow.set(key, id);
      foodsSaved += 1;
    }
    stage = 'entries';
    const fresh = (plan.entries || []).filter((e) => !daysNow.has(e.entryDate));
    const daysLeft = new Set((plan.entries || []).filter((e) => daysNow.has(e.entryDate)).map((e) => e.entryDate)).size;
    const entries = fresh.map((e) => toDiaryEntry(e, e.customName ? `custom:${ids.get(e.customName)}` : e.foodRef));
    for (const batch of batchByDay(entries)) {
      // eslint-disable-next-line no-await-in-loop
      await logFoodEntries(userId, batch, IMPORT_WRITE_OPTIONS);
      written += batch.length;
      onProgress?.(written, entries.length);
      // eslint-disable-next-line no-await-in-loop
      await yieldToUi();
    }
    return { added: written, foodsSaved, daysLeft };
  } catch (e) {
    e.written = written;
    e.stage = stage;
    throw e;
  }
}
