// Local backup safety valve.
//
// There is no cloud sync, so this is the only way a user can move their data
// to a new device or recover from a critical bug. exportBackup() writes the
// entire local database plus all Volyume preferences into one JSON file and
// hands it to the native share sheet (Files app, email, AirDrop, etc.).
// importBackup() reads such a file back and fully restores the app state.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { dumpAllTables, restoreAllTables } from './database';

const BACKUP_FORMAT = 'volyume-backup';
const BACKUP_FORMAT_VERSION = 1;

// Every Volyume preference key is namespaced "@volyume_". The crash log is
// transient diagnostics and is deliberately excluded from backups.
const PREF_PREFIX = '@volyume_';
const PREF_EXCLUDE = new Set(['@volyume_crash_log']);

async function dumpPrefs() {
  const allKeys = await AsyncStorage.getAllKeys();
  const keys = allKeys.filter(
    k => k.startsWith(PREF_PREFIX) && !PREF_EXCLUDE.has(k),
  );
  const pairs = await AsyncStorage.multiGet(keys);
  const prefs = {};
  for (const [k, v] of pairs) prefs[k] = v;
  return prefs;
}

async function restorePrefs(prefs) {
  if (!prefs || typeof prefs !== 'object') return;
  const entries = Object.entries(prefs)
    .filter(([k]) => k.startsWith(PREF_PREFIX) && !PREF_EXCLUDE.has(k))
    .map(([k, v]) => [k, v == null ? '' : String(v)]);
  if (entries.length) await AsyncStorage.multiSet(entries);
}

// Builds the backup object, writes it to a JSON file in the cache directory
// and opens the native share sheet. Returns { fileUri, bytes }.
export async function exportBackup() {
  const { schemaVersion, tables } = await dumpAllTables();
  const prefs = await dumpPrefs();

  const payload = {
    format: BACKUP_FORMAT,
    formatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion,
    exportedAt: new Date().toISOString(),
    app: 'Volyume',
    sqlite: tables,
    prefs,
  };

  const json = JSON.stringify(payload);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fileUri = `${FileSystem.cacheDirectory}volyume_backup_${stamp}.json`;

  await FileSystem.writeAsStringAsync(fileUri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Save Volyume backup',
      UTI: 'public.json',
    });
  }

  return { fileUri, bytes: json.length };
}

// Lets the user pick a .json backup, validates it, and restores everything.
// Returns { restored: true, counts } or { cancelled: true }.
export async function importBackup() {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
  });

  // expo-document-picker v12 returns { canceled, assets: [...] }
  if (picked?.canceled || picked?.type === 'cancel') {
    return { cancelled: true };
  }
  const asset = picked?.assets?.[0];
  const uri = asset?.uri || picked?.uri;
  if (!uri) throw new Error('No file was selected.');

  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (_) {
    throw new Error('That file is not a valid Volyume backup (not JSON).');
  }

  if (parsed?.format !== BACKUP_FORMAT || !parsed?.sqlite) {
    throw new Error('That file is not a Volyume backup.');
  }
  // formatVersion must be present AND in the supported range. Missing or
  // undefined fails the previous `>` check silently (undefined > 1 is
  // false), so v0 / pre-version backups would be applied to current tables
  // with potentially incompatible row shapes.
  const fv = parsed.formatVersion;
  if (typeof fv !== 'number' || fv < 1) {
    throw new Error(
      'This backup is missing a version marker. It may be from a pre-release build; export a fresh backup from this version of the app.',
    );
  }
  if (fv > BACKUP_FORMAT_VERSION) {
    throw new Error(
      'This backup was made by a newer version of Volyume. Update the app, then import again.',
    );
  }

  await restoreAllTables({ tables: parsed.sqlite });
  await restorePrefs(parsed.prefs);

  const counts = {};
  for (const [t, rows] of Object.entries(parsed.sqlite)) {
    counts[t] = Array.isArray(rows) ? rows.length : 0;
  }
  return { restored: true, counts, exportedAt: parsed.exportedAt };
}
