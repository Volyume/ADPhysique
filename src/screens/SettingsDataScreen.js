import { useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Switch, StyleSheet } from 'react-native';
import Text from '../components/Text';
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
import { getStatus as getSyncStatus, syncAll, deleteUserPref, setUserPref } from '../lib/sync';
import { getQueueStats, retryFailedOps } from '../lib/syncQueue';
import { formatLastSynced } from '../lib/syncStatusLabel';
import { withAlpha, alpha, colors, radius, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { SettingsPage, SettingRow, SectionHeader, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import Chip from '../components/Chip';
import ImportHistorySheet from '../components/food/ImportHistorySheet';
import {
  getClipsStorage, getKeepDays, setKeepDays, sweepExpiredClips, deleteAllClipsForUser, countExpiredClips,
} from '../lib/clips/store';
import {
  CLIP_STRINGS, KEEP_OPTIONS, DEFAULT_KEEP_DAYS, keepLabel, storageLine, settingsKeepSub,
  removeNowTitle, removeNowBody,
} from '../lib/clips/rules';

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
  // CP-10 stage 3: live theme (src/hooks/useTheme.js), so the switch track/
  // thumb colours and the shared chrome follow a theme change.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    title: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    sub: { ...t.type.bodySm, color: t.colors.textMuted },
    segment: { backgroundColor: t.colors.surface2 },
  };

  // Cloud sync status line (A2-006). Quiet, read from the runner snapshot;
  // syncingNow tracks the manual "tap to sync" so the row shows progress.
  const [syncSnapshot, setSyncSnapshot] = useState(null);
  const [syncingNow, setSyncingNow] = useState(false);
  const [refreshingFood, setRefreshingFood] = useState(false);
  const [buildingReport, setBuildingReport] = useState(false);
  // Item 8 (D141): busy state for the "Retry now" action on ops that gave
  // up after MAX_RETRIES.
  const [retryingFailed, setRetryingFailed] = useState(false);
  // L05-SL1: mirrors the persisted flag so the row reflects the real state,
  // not just an intent. Defaults false (asks for a name) until read on focus.
  const [scanSkipName, setScanSkipName] = useState(false);
  // D229 addendum 15: the workout videos on this phone (count and size) and
  // how long they are kept. Read on focus; the sweep runs after a change so
  // a shorter window takes effect at once.
  const [videos, setVideos] = useState(null); // { count, bytes } | null
  const [keepDays, setKeepDaysState] = useState(null);
  const [deletingVideos, setDeletingVideos] = useState(false);
  // D230 R21: the food-history import. `importPlan` is the read-and-planned
  // file, shown in a summary sheet before anything is written.
  const [importing, setImporting] = useState(false);
  const [importPlan, setImportPlan] = useState(null);

  const refreshVideos = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [storage, days] = await Promise.all([getClipsStorage(user.id), getKeepDays()]);
      setVideos(storage);
      setKeepDaysState(days);
    } catch (e) {
      logError('SettingsData.videos', e);
    }
  }, [user?.id]);

  // Saves the window, then sweeps at once so it takes effect now. The chips
  // show the new choice only once it is saved.
  async function saveKeepDays(days) {
    try {
      await setKeepDays(days);
      setKeepDaysState(days);
      await sweepExpiredClips(user?.id, { force: true });
      await refreshVideos();
    } catch (e) {
      logError('SettingsData.keepDays', e);
      toast.show(CLIP_STRINGS.keepFailed, { variant: 'error' });
    }
  }

  // A shorter window removes older videos the moment it is saved, so the
  // person is told how many first and can say no. A longer window, or never,
  // removes nothing and needs no question.
  async function chooseKeepDays(days) {
    if (days === keepDays) return;
    haptics.selection();
    const shorter = days !== 0 && (keepDays == null || keepDays === 0 || days < keepDays);
    if (shorter) {
      const count = await countExpiredClips(user?.id, { keepDays: days });
      if (count > 0) {
        appAlert(removeNowTitle(count), removeNowBody(count, days), [
          { text: CLIP_STRINGS.removeNowCancel, style: 'cancel' },
          { text: CLIP_STRINGS.removeNowConfirm, style: 'destructive', onPress: () => { saveKeepDays(days); } },
        ]);
        return;
      }
    }
    await saveKeepDays(days);
  }

  function handleDeleteAllVideos() {
    if (deletingVideos || !videos?.count) return;
    appAlert(CLIP_STRINGS.deleteAllConfirmTitle, CLIP_STRINGS.deleteAllConfirmBody, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: CLIP_STRINGS.settingsDeleteAllLabel,
        style: 'destructive',
        onPress: async () => {
          if (!user?.id) return;
          setDeletingVideos(true);
          try {
            await deleteAllClipsForUser(user.id);
            toast.show(CLIP_STRINGS.deleteAllDone, { variant: 'success' });
          } catch (e) {
            logError('SettingsData.deleteAllVideos', e);
            toast.show(CLIP_STRINGS.deleteAllFailed, { variant: 'error' });
          } finally {
            setDeletingVideos(false);
            refreshVideos();
          }
        },
      },
    ]);
  }

  // Item 8 (D141): the runner's getStatus() snapshot only ever carried
  // queue_depth (the live retry queue). Extending this one path - rather
  // than adding a second fetch elsewhere - so the failed count (ops parked
  // at MAX_RETRIES, syncQueue.getQueueStats) rides the same snapshot object
  // formatLastSynced already reads.
  const refreshSyncSnapshot = useCallback(async () => {
    try {
      const [status, stats] = await Promise.all([
        getSyncStatus(),
        getQueueStats(user?.id),
      ]);
      // stats.ok === false means the failed count is UNKNOWN, not zero (see
      // getQueueStats) - keep whatever the row last showed rather than
      // flashing it back to zero on a transient read failure.
      setSyncSnapshot(prev => ({
        ...status,
        failed: stats?.ok !== false ? (stats?.failed ?? 0) : (prev?.failed ?? 0),
      }));
    } catch (_) {
      getSyncStatus().then(setSyncSnapshot).catch(() => {});
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      refreshSyncSnapshot();
      refreshVideos();
      AsyncStorage.getItem(SCAN_SKIP_NAME_KEY)
        .then(v => setScanSkipName(v === 'true')).catch(() => {});
    }, [refreshSyncSnapshot, refreshVideos]),
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
      // C14 job 2: off clears the key, and a local-only clear is undone by
      // the next pull (the cloud still holds 'true'), so the toggle turns
      // itself back on. deleteUserPref tombstones the cloud copy too.
      if (value) await setUserPref(user?.id, SCAN_SKIP_NAME_KEY, 'true');
      else await deleteUserPref(user?.id, SCAN_SKIP_NAME_KEY);
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
      await refreshSyncSnapshot();
      const stats = await getQueueStats(user?.id);
      toast.show(
        (stats?.pending ?? 0) > 0 ? 'Backing up a few recent changes.' : 'Everything\'s backed up and safe.',
        { variant: 'success' },
      );
    } catch (e) {
      logError('SettingsScreen.syncNow', e);
      refreshSyncSnapshot();
      toast.show("Couldn't sync. It retries automatically.", { variant: 'error' });
    } finally {
      setSyncingNow(false);
    }
  }

  // Item 8 (D141): un-park ops that hit MAX_RETRIES and flush them straight
  // away rather than waiting for the next foreground/periodic trigger.
  async function handleRetryFailedOps() {
    if (!user?.id || retryingFailed) return;
    haptics.selection();
    setRetryingFailed(true);
    try {
      const result = await retryFailedOps(user.id);
      if (!result?.ok) {
        toast.show("Couldn't retry those changes, try again", { variant: 'error' });
        return;
      }
      // The reset only makes the ops eligible for the drain again; push one
      // now (best-effort - offline just leaves them queued for the next
      // live trigger, which is already how every other queued op recovers).
      try {
        const sb = getSupabaseClient();
        const { data: { session: s } = {} } = await sb.auth.getSession();
        if (s?.user?.id) {
          await syncAll({ userId: s.user.id, localUserId: user.id, triggeredBy: 'manual' });
        }
      } catch (_) { /* offline: retried ops stay queued for the next live trigger */ }
      await refreshSyncSnapshot();
      toast.show(
        result.reset > 0 ? 'Retrying now.' : "Everything's already up to date.",
        { variant: 'success' },
      );
    } catch (e) {
      logError('SettingsDataScreen.retryFailedOps', e, { userId: user.id });
      toast.show("Couldn't retry those changes, try again", { variant: 'error' });
    } finally {
      setRetryingFailed(false);
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
      logError('SettingsScreen.exportData', e, { userId: user?.id });
      toast.show('Could not export your data, try again', { variant: 'error' });
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
      if (!user?.id) return;
      const { bytes } = await exportBackup(user.id);
      appAlert(
        'Backup created',
        `Your Volyume app-data backup (${(bytes / 1024).toFixed(0)} KB) was exported. It includes database records such as workouts, nutrition logs, body metrics, progress photo metadata and progress photo analysis metadata. Private photo image files are not bundled. Save it to Files, email it to yourself, or move it to your new device. Then use "Restore from backup" there.`,
      );
    } catch (e) {
      logError('SettingsScreen.handleFullBackup', e);
      appAlert('Backup failed', 'Could not create a backup. Please try again.');
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
              if (!user?.id) return;
              const res = await importBackup(user.id);
              if (res?.cancelled) return;
              const total = Object.values(res.counts || {}).reduce((a, b) => a + b, 0);
              appAlert(
                'Restore complete',
                `${total} records restored. Please fully close and reopen Volyume so every screen reloads from the restored data.`,
              );
            } catch (e) {
              logError('SettingsScreen.handleRestoreBackup', e);
              appAlert('Restore failed', 'Could not read that backup file.');
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
              appAlert('Couldn\'t clear history', 'Try again.');
            }
          },
        },
      ],
    );
  }

  // D230 R21: pick a MyFitnessPal or Cronometer file, read and plan it, then
  // show the summary sheet. Nothing is written here.
  async function handleImportFood() {
    if (importing || !user?.id) return;
    setImporting(true);
    try {
      // Lazy: the picker and the food database load only when this is used.
      const flow = require('../lib/food/importHistoryFlow');
      const picked = await flow.pickHistoryFile();
      if (picked.cancelled) return;
      const result = await flow.planFromText(user.id, picked.text);
      if (result.error) { appAlert('Import food history', result.error); return; }
      setImportPlan(result.plan);
    } catch (e) {
      logError('SettingsData.importFood', e);
      toast.show('That file could not be read. Try a different file.', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  }

  return (
    <SettingsPage title="Your data">
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="cloud-outline"
          label={syncingNow ? 'Syncing...' : 'Cloud sync'}
          sub={syncingNow ? 'Checking for changes.' : formatLastSynced(syncSnapshot)}
          onPress={syncingNow ? null : handleSyncNow}
          showArrow={!syncingNow}
        />
        {(syncSnapshot?.failed ?? 0) > 0 ? (
          <SettingRow
            icon="alert-circle-outline"
            label={retryingFailed ? 'Retrying...' : 'Retry now'}
            sub={`${syncSnapshot.failed} ${syncSnapshot.failed === 1 ? 'change' : 'changes'} couldn't sync`}
            onPress={retryingFailed ? null : handleRetryFailedOps}
            showArrow={!retryingFailed}
          />
        ) : null}
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
                trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, alpha.half) }}
                thumbColor={scanSkipName ? t.colors.primary : t.colors.textMuted}
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
          icon="nutrition-outline"
          label={importing ? 'Reading the file...' : 'Import food history'}
          sub="From a MyFitnessPal or Cronometer export file."
          onPress={importing ? null : handleImportFood}
          showArrow={!importing}
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

      {/* D229 addendum 15 (the founder: videos must not fill the phone):
          how many workout videos this phone holds and their size, how long
          they are kept (default 7 days; a kept video and a PR set's video
          stay), and one way to remove them all. */}
      <SectionHeader title="Workout videos" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="videocam-outline"
          label={CLIP_STRINGS.settingsVideosLabel}
          sub={videos ? storageLine(videos.count, videos.bytes) : CLIP_STRINGS.settingsWorkingOut}
          showArrow={false}
          accessibilityLabel={`${CLIP_STRINGS.settingsVideosLabel}, ${videos ? storageLine(videos.count, videos.bytes) : 'working it out'}`}
        />
        {/* The keep choices, in SettingsDisplayScreen's segment pattern: the
            words above, then one segment of chips. */}
        <View style={localStyles.block}>
          <Text style={[localStyles.title, liveText.title]}>{CLIP_STRINGS.settingsKeepLabel}</Text>
          <Text style={[localStyles.sub, liveText.sub]}>{settingsKeepSub(keepDays ?? DEFAULT_KEEP_DAYS)}</Text>
          <View
            style={[localStyles.segment, liveText.segment]}
            accessibilityRole="radiogroup"
            accessibilityLabel={CLIP_STRINGS.settingsKeepLabel}
          >
            {KEEP_OPTIONS.map((days) => (
              <Chip
                key={days}
                label={keepLabel(days)}
                selected={keepDays === days}
                onPress={() => chooseKeepDays(days)}
                accessibilityRole="radio"
                accessibilityLabel={keepLabel(days)}
                style={localStyles.segChip}
                labelStyle={localStyles.segLabel}
                testID={`settings-keep-${days}`}
              />
            ))}
          </View>
        </View>
        <SettingRow
          icon="trash-outline"
          label={deletingVideos ? CLIP_STRINGS.settingsDeletingLabel : CLIP_STRINGS.settingsDeleteAllLabel}
          sub={videos?.count === 0 ? CLIP_STRINGS.settingsDeleteAllNone : CLIP_STRINGS.settingsDeleteAllSub}
          destructive
          showArrow={!deletingVideos && !!videos?.count}
          onPress={deletingVideos || !videos?.count ? null : handleDeleteAllVideos}
        />
      </View>

      {/* L04-9 (design audit 2026-07-09): isolated below the routine sync/
          export/backup rows, matching SettingsAccountScreen's "Account
          access" pattern, so a destructive tap is never next to a routine
          action. */}
      <SectionHeader title="Clear history" />
      <View style={[styles.section, live.section]}>
        <SettingRow
          icon="trash-outline"
          label="Clear workout history"
          sub="Deletes logged sessions and the PRs calculated from them"
          destructive
          onPress={handleClearHistory}
        />
      </View>
      <Text style={[styles.dataPrivacyNote, live.dataPrivacyNote]}>
        Export workout sets, create a JSON database backup, or restore a safety snapshot any time. Photo image files stay on this device unless you share or export them yourself.
      </Text>
    </SettingsPage>
  );
}

// D229 addendum 15: the keep choices use SettingsDisplayScreen's segment
// pattern (a title and a sub above one segment of chips). Frozen styles here,
// live colour and type mirrors built in the component from the live theme.
const localStyles = StyleSheet.create({
  block: { padding: spacing.lg },
  title: { ...type.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  sub: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
  },
  segChip: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  segLabel: { textAlign: 'center' },
});
