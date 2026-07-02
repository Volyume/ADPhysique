import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
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
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';

// Your data: cloud sync, import from other apps, backup/restore, CSV export,
// and clear-history. Backup/restore and clear-history are destructive, so
// each carries its own confirmation.
export default function SettingsDataScreen({ navigation }) {
  const toast = useToast();
  const user = useAppStore(useShallow(s => s.user));

  // Cloud sync status line (A2-006). Quiet, read from the runner snapshot;
  // syncingNow tracks the manual "tap to sync" so the row shows progress.
  const [syncSnapshot, setSyncSnapshot] = useState(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [refreshingFood, setRefreshingFood] = useState(false);
  const [buildingReport, setBuildingReport] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getSyncStatus().then(setSyncSnapshot).catch(() => {});
    }, []),
  );

  // Manual cloud resync. The lock (PRODUCTION_READINESS_LOCKED § 1) allows a
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
        toast.show('PDF export needs a rebuild with the print package', { variant: 'error', duration: 5000 });
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
        `Your entire Volyume database (${(bytes / 1024).toFixed(0)} KB) was exported. Save it to Files, email it to yourself, or move it to your new device. Then use "Restore from backup" there.`,
      );
    } catch (e) {
      appAlert('Backup failed', e?.message ?? 'Could not create a backup. Please try again.');
    }
  }

  function handleRestoreBackup() {
    appAlert(
      'Restore from backup?',
      'This replaces ALL current data (workouts, routines, plans, body metrics and settings) with the contents of the backup file you choose. This cannot be undone.',
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
          text: 'Clear Everything',
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
    <SettingsPage>
      <View style={styles.section}>
        <SettingRow
          icon="cloud-outline"
          label={syncingNow ? 'Syncing…' : 'Cloud sync'}
          sub={syncingNow ? 'Checking for changes.' : formatLastSynced(syncSnapshot)}
          onPress={syncingNow ? null : handleSyncNow}
          showArrow={!syncingNow}
        />
        <SettingRow
          icon="nutrition-outline"
          label={refreshingFood ? 'Refreshing…' : 'Refresh food library'}
          sub="Pull the latest food data now"
          onPress={refreshingFood ? null : handleRefreshFoodLibrary}
          showArrow={!refreshingFood}
        />
        <SettingRow
          icon="swap-horizontal-outline"
          label="Import from another app"
          sub="Bring sessions over from Hevy or Strong"
          onPress={() => navigation.navigate('Import')}
        />
        <SettingRow
          icon="save-outline"
          label="Back up everything (JSON)"
          onPress={handleFullBackup}
        />
        <SettingRow
          icon="cloud-upload-outline"
          label="Restore from backup"
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
          onPress={exportData}
        />
        <SettingRow
          icon="document-text-outline"
          label={buildingReport ? 'Preparing the report...' : 'Coach handover report (PDF)'}
          sub="Training, trend, targets and coaching decisions, for a coach or GP"
          onPress={buildingReport ? null : exportCoachReport}
          showArrow={!buildingReport}
        />
        <SettingRow
          icon="trash-outline"
          label="Clear workout history"
          destructive
          onPress={handleClearHistory}
        />
      </View>
      <Text style={styles.dataPrivacyNote}>
        Your data is always yours. Export or back up any time, no account required.
      </Text>
    </SettingsPage>
  );
}
