/**
 * importHistoryFlow.js: the I/O half of "Import food history" (D230 R21, lane
 * 4C). Picks a file (expo-document-picker), reads it (expo-file-system, the
 * dataBackup.js precedent), plans it (importHistory.js, pure) and writes it
 * through the existing validated paths only: insertCustomFood for the foods,
 * logFoodEntries for the entries (one rollup per date is that function's
 * contract). Nothing is overwritten: days that already hold food are left out
 * of the plan. No telemetry: nothing read from the file leaves the phone, and
 * the event allow-list has no import event (so none is sent).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { insertCustomFood, logFoodEntries, getRecentLoggedDays } from './db';
import {
  detectFormat, parseMfpNutritionCsv, parseCronometerServingsCsv, planImport,
} from './importHistory';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const IMPORT_BATCH = 200;
export const NOT_A_FOOD_EXPORT = 'That file is not a MyFitnessPal or Cronometer export. Export the nutrition summary from MyFitnessPal, or the servings from Cronometer, and try again.';

/** Pick and read a file. { cancelled: true } or { text }. Throws a plain Error on a file that cannot be read. */
export async function pickHistoryFile() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/vnd.ms-excel', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked?.canceled || picked?.type === 'cancel') return { cancelled: true };
  const asset = picked?.assets?.[0];
  const uri = asset?.uri || picked?.uri;
  if (!uri) throw new Error('No file was selected.');
  const info = await FileSystem.getInfoAsync(uri, { size: true });
  if (Number.isFinite(Number(info?.size)) && Number(info.size) > MAX_IMPORT_BYTES) throw new Error('That file is too large.');
  const text = await FileSystem.readAsStringAsync(uri);
  return { text };
}

/** Text to a plan, or { error } when the file is neither format. */
export async function planFromText(userId, text) {
  const format = detectFormat(String(text ?? '').split(/\r?\n/, 1)[0]);
  if (!format) return { error: NOT_A_FOOD_EXPORT };
  const rows = format === 'mfp' ? parseMfpNutritionCsv(text) : parseCronometerServingsCsv(text);
  let mealsPerDay = 4;
  try {
    const n = parseInt(await AsyncStorage.getItem('@volyume_meals_per_day'), 10);
    if (Number.isFinite(n) && n >= 1) mealsPerDay = n;
  } catch (_) { /* the default of four meals stands */ }
  const days = await getRecentLoggedDays(userId, '9999-12-31', 1000000);
  const existingDays = new Set((days || []).map((d) => d.entry_date));
  return { format, plan: planImport(rows, { format, existingDays, mealsPerDay }) };
}

// Whole days per batch, so a day is never split across two writes: a failed
// run can then be repeated and every day already written is left alone.
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

/** Write a plan: the custom foods, then the entries in batches. Throws with `.written` (entries already in) on a failure. */
export async function writePlan(userId, plan) {
  let written = 0;
  try {
    const ids = new Map();
    for (const food of plan.customFoods) {
      // eslint-disable-next-line no-await-in-loop
      ids.set(food.name, await insertCustomFood(userId, food));
    }
    const entries = plan.entries.map((e) => (e.customName
      ? (({ customName, ...rest }) => ({ ...rest, foodRef: `custom:${ids.get(customName)}` }))(e)
      : e));
    for (const batch of batchByDay(entries)) {
      // eslint-disable-next-line no-await-in-loop
      await logFoodEntries(userId, batch);
      written += batch.length;
    }
    return { written };
  } catch (e) {
    e.written = written;
    throw e;
  }
}
