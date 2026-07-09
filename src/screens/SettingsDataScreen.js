import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, Switch } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import useAppStore from '../store/useAppStore';
import { useToast } from '../components/Toast';
import * as haptics from '../lib/haptics';
import { logError } from '../lib/errorLog';
import { getSupabaseClient } from '../lib/supabase';
import { clearWorkoutHistory, buildWorkoutCSV } from '../lib/database';
import { exportCoachReportPdf } from '../lib/coachReport';
import { exportBackup, importBackup } from '../lib/dataBackup';
import { getStatus as getSyncStatus, syncAll } from '../lib/sync';
import { formatLastSynced } from '../lib/syncStatusLabel';
import { colors, withAlpha } from '../styles/theme';
import { SettingsPage, SettingRow, SectionHeader, settingsStyles as styles } from '../components/SettingsPrimitives';

// L05-SL1 (design audit 2026-07-09): the global "skip the name step" flag
// ScanLabelScreen.js sets when a label scan's "Skip name" is tapped
// (SKIP_NAME_KEY there). Hardcoded here rather than importing that screen's
// module, matching the existing '@volyume_*' key convention (see the
// "Session readiness check" toggle in SettingsCoachingScreen.js) - keep this
// in sync with ScanLabelScreen.js's SKIP_NAME_KEY if it ever changes.
const SCAN_SKIP_NAME_KEY = '@volyume_scan_skip_name';

// Your data: cloud sync, import from other apps, backup/restore, CSV export,
// and clear-history. Backup/restore and clear-history are destructive, so
// each carries its own confirmation.
export default function SettingsDataScreen({ navigation }) {
  const toast = useToast();
  const { user, tier } = useAppStore(useShallow(s => ({ user: s.user, tier: s.tier })));

  // Cloud sync status line (A2-006). Quiet, read from the runner snapshot;
  // syncingNow tracks the manual "tap to sync" so the row shows progress.
  const [syncSnapshot, setSyncSnapshot] = useState(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [refreshingFood, setRefreshingFood] = useState(false);
  const [buildingReport, setBuildingReport] = useState(false);
  // L05-SL1: mirrors the persisted flag so the row reflects the real state,
  // not just an intent. Defaults false (asks for a name) until read on focus.
  const [scanSkipName, setScanSkipName] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSyncStatus().then(setSyncSnapshot).catch(() => {});
      AsyncStorage.getItem(SCAN_SKIP_NAME_KEY)
        .then(v => setScanSkipName(v === 'true')).catch(() => {});
    }, []),
  );

  // L05-SL1: the settings-side control for the flag ScanLabelScreen's "Skip
  // name" sets. Off clears it (removeItem, not setItem 'false' - the reader
  // there treats anything other than the literal 'true' as "not skipping"),
  // so the next label scan asks for a name again. On sets it the same way
  // "Skip name" does, so this is a genuine two-way toggle, not reset-only.
  async function toggleScanSkipName(value) {
    haptics.selection();
    setScanSkipName(value);
    try {
      if (value) await AsyncStorage.setItem(SCAN_SKIP_NAME_KEY, 'true');
      else await AsyncStorage.removeItem(SCAN_SKIP_NAME_KEY);
    } catch (_) { /* the scan screen re-reads the flag fresh each mount */ }
  }

  // Manual cloud resync. The production-readiness lock allows a
  // manual resync from Settings; this routes through the same syncAll runner
  // as the automatic triggers, so its in-memory lock dedupes against any
  // background round already in flight.
  async function handleSyncNow() {
    if (syncingNow) return;
    haptics.selection();
    setSyncingNow(true);
    try {
      let supabaseUserId = null;
      try {
        const sb = getSupabaseClient();
        const { data: { session: s } = {} } = await sb.auth.getSession();
        supabaseUserId = s?.user?.id ?? null;
      } catch (_) { /* offline / no session: push local, pull skips */ }
      await syncAll({ userId: supabaseUserId, localUserId: user?.id ?? null, triggeredBy: 'manual' });
      const snap = await getSyncStatus();
      setSyncSnapshot(snap);
      toast.show(
        (snap?.queue_depth ?? 0) > 0 ? 'Backing up a few recent changes.' : 'Everything\'s backed up and safe.',
        { variant: 'success' },
      );
    } catch (e) {
      logError('SettingsScreen.syncNow', e);
      getSyncStatus().then(setSyncSnapshot).catch(() => {});
      toast.show("Couldn't sync. It retries automatically.", { variant: 'error' });
    } finally {
      setSyncingNow(false);
    }
  }

  // Manual "refresh food library" (food audit D-4). The bundled snapshot + the
  // 6-hourly delta pull can leave data stale within the window; force a pull now.
  async function handleRefreshFoodLibrary() {
    if (refreshingFood) return;
    haptics.selection();
    setRefreshingFood(true);
    try {
      // eslint-disable-next-line global-require
      const { pullFoodLibraryDelta } = require('../lib/food/libraryDelta');
      const res = await pullFoodLibraryDelta({ force: true });
      if (res?.ok) {
        toast.show(
          (res.pulledRows ?? 0) > 0 ? `Food library updated (${res.pulledRows} items).` : 'Food library is up to date.',
          { variant: 'success' },
        );
      } else {
        toast.show("Couldn't refresh the food library. Try again later.", { variant: 'error' });
      }
    } catch (e) {
      logError('SettingsScreen.refreshFoodLibrary', e);
      toast.show("Couldn't refresh the food library. Try again later.", { variant: 'error' });
    } finally {
      setRefreshingFood(false);
    }
  }

  async function exportData() {
    if (!user?.id) return;
    try {
      const { csv, rowCount } = await buildWorkoutCSV(user.id);
      if (rowCount === 0) {
        appAlert('Nothing to export', 'Log some workouts first, then export your data here.');
        return;
      }
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const fileUri = `${FileSystem.cacheDirectory}volyume_export_${date}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Volyume data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        toast.show(`Exported ${rowCount} sets`, { variant: 'success' });
      }
    } catch (e) {
      toast.show(e?.message ?? 'Could not export your data', { variant: 'error' });
    }
  }

  // B5: the coach handover report. Everything sensitive about it (the
  // ED-neutral variant, fail-closed wellbeing reads, what each variant may
  // contain) lives and is tested in src/lib/coachReport.js; this handler is
  // only the busy state and the calm failure paths.
  async function exportCoachReport() {
    if (!user?.id || buildingReport) return;
    setBuildingReport(true);
    try {
      const res = await exportCoachReportPdf({ userId: user.id });
      if (res?.empty) {
        appAlert('Nothing to report yet', 'Log some training first, then export the report here.');
        return;
      }
      if (res?.unavailable) {
        toast.show('PDF export is not available on this device.', { variant: 'error', duration: 5000 });
        return;
      }
      if (!res?.shared) {
        // PDF built but the share sheet could not open (no share targets).
        toast.show('Report created, but sharing is not available on this device.', { variant: 'warning', duration: 5000 });
        return;
      }
      haptics.selection();
    } catch (e) {
      logError('SettingsScreen.exportCoachReport', e);
      toast.show('Could not build the report, try again', { variant: 'error' });
    } finally {
      setBuildingReport(false);
    }
  }

  async function handleFullBackup() {
    try {
      const { bytes } = await exportBackup();
      appAlert(
        'Backup created',
        `Your Volyume app-data backup (${(bytes / 1024).toFixed(0)} KB) was exported. It includes database records such as workouts, nutrition logs, body metrics, progress photo metadata and progress photo analysis metadata. Private photo image files are not bundled. Save it to Files, email it to yourself, or move it to your new device. Then use "Restore from backup" there.`,
      );
    } catch (e) {
      appAlert('Backup failed', e?.message ?? 'Could not create a backup. Please try again.');
    }
  }

  function handleRestoreBackup() {
    appAlert(
      'Restore from backup?',
      'This replaces ALL current app database records (workouts, routines, plans, nutrition logs, body metrics, progress metadata and settings) with the contents of the backup file you choose. Private photo image files are not restored from this JSON file. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose file',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await importBackup();
              if (res?.cancelled) return;
              const total = Object.values(res.counts || {}).reduce((a, b) => a + b, 0);
              appAlert(
                'Restore complete',
                `${total} records restored. Please fully close and reopen Volyume so every screen reloads from the restored data.`,
              );
            } catch (e) {
              appAlert('Restore failed', e?.message ?? 'Could not read that backup file.');
            }
          },
        },
      ],
    );
  }

  async function handleClearHistory() {
    appAlert(
      'Clear workout history?',
      'This permanently deletes all your logged sessions and sets. Your personal records will also be cleared as they are calculated from your history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear everything',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            try {
              await clearWorkoutHistory(user.id);
              toast.show('Workout history cleared', { variant: 'success' });
            } catch (e) {
              logError('SettingsScreen.handleClearHistory', e, { userId: user.id });
              appAlert('Couldn\'t clear history', e?.message ?? 'Try again.');
            }
          },
        },
      ],
    );
  }

  return (
    <SettingsPage title="Your data">
      <View style={styles.section}>
        <SettingRow
          icon="cloud-outline"
          label={syncingNow ? 'Syncing...' : 'Cloud sync'}
          sub={syncingNow ? 'Checking for changes.' : formatLastSynced(syncSnapshot)}
          onPress={syncingNow ? null : handleSyncNow}
          showArrow={!syncingNow}
        />
        <SettingRow
          icon="nutrition-outline"
          label={refreshingFood ? 'Refreshing...' : 'Refresh food library'}
          sub="Pull the latest food data now"
          onPress={refreshingFood ? null : handleRefreshFoodLibrary}
          showArrow={!refreshingFood}
        />
        {tier === 'pro' ? (
          <SettingRow
            icon="text-outline"
            label="Skip name on label scans"
            sub={scanSkipName
              ? 'On. Scanning a label goes straight to the nutrition panel, no name step. Turn off to be asked for a name again.'
              : 'Off. Scanning a label asks for a name first.'}
            showArrow={false}
            rightElement={
              <Switch
                value={scanSkipName}
                onValueChange={toggleScanSkipName}
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                thumbColor={scanSkipName ? colors.primary : colors.textMuted}
              />
            }
          />
        ) : null}
        <SettingRow
          icon="swap-horizontal-outline"
          label="Import from another app"
          sub="Bring sessions over from Hevy or Strong"
          onPress={() => navigation.navigate('Import')}
        />
        <SettingRow
          icon="save-outline"
          label="Back up app data (JSON)"
          sub="Database records; photo image files stay on this device"
          onPress={handleFullBackup}
        />
        <SettingRow
          icon="cloud-upload-outline"
          label="Restore from backup"
          sub="Choose a Volyume JSON backup and replace current app data"
          onPress={handleRestoreBackup}
        />
        <SettingRow
          icon="time-outline"
          label="Restore a snapshot"
          sub="Automatic safety copies from before each app update"
          onPress={() => navigation.navigate('Snapshots')}
        />
        <SettingRow
          icon="download-outline"
          label="Export workout log (CSV)"
          sub="Workout sets only"
          onPress={exportData}
        />
        <SettingRow
          icon="document-text-outline"
          label={buildingReport ? 'Preparing the report...' : 'Coach handover report (PDF)'}
          sub="Training, trend, targets and coaching decisions, for a coach or GP"
          onPress={buildingReport ? null : exportCoachReport}
          showArrow={!buildingReport}
        />
      </View>

      {/* L04-9 (design audit 2026-07-09): isolated below the routine sync/
          export/backup rows, matching SettingsAccountScreen's "Account
          access" pattern, so a destructive tap is never next to a routine
          action. */}
      <SectionHeader title="Clear history" />
      <View style={styles.section}>
        <SettingRow
          icon="trash-outline"
          label="Clear workout history"
          sub="Deletes logged sessions and the PRs calculated from them"
          destructive
          onPress={handleClearHistory}
        />
      </View>
      <Text style={styles.dataPrivacyNote}>
        Your data is always yours. Export workout sets, create a JSON database backup, or restore a safety snapshot any time. Photo image files stay on this device unless you share or export them yourself.
      </Text>
    </SettingsPage>
  );
}
