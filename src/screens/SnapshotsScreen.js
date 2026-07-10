// COMP-009: restore an automatic snapshot.
//
// Lists the rolling set of pre-migration / pre-account-switch DB snapshots and
// offers a two-tap, explicitly-destructive restore: confirm → close the DB
// handle → copy the snapshot back over the live file → ask the user to relaunch
// (writing over an open SQLite file risks corruption, hence the close + manual
// relaunch, mirroring the existing JSON restore). Same plain destructive tone as
// handleRestoreBackup: it replaces all current data and cannot be undone.

import { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { appAlert } from '../components/AppAlert';
import { SettingsPage, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import { listSnapshots, restoreSnapshot } from '../lib/dbSnapshot';
import { closeDatabase } from '../lib/database';
import { logError } from '../lib/errorLog';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function SnapshotsScreen() {
  const [snapshots, setSnapshots] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(false);
  const loadRequestRef = useRef(0);
  // CP-10 stage 3: live theme (src/hooks/useTheme.js). `live` is the shared
  // settingsStyles override (SettingsPrimitives.js); `liveText` covers this
  // screen's own colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    note: { ...t.type.bodySm, color: t.colors.textMuted },
    footer: { ...t.type.caption, color: t.colors.textMuted },
  };

  const load = useCallback(() => {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    const isCurrentRequest = () => loadRequestRef.current === requestId;

    setLoadError(false);
    setSnapshots(null);
    listSnapshots()
      .then((items) => {
        if (isCurrentRequest()) {
          setLoadError(false);
          setSnapshots(items);
        }
      })
      .catch((e) => {
        logError('SnapshotsScreen.load', e);
        if (isCurrentRequest()) {
          setLoadError(true);
          setSnapshots([]);
        }
      });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleRestore(snap) {
    appAlert(
      'Restore this snapshot?',
      `This replaces ALL current data (workouts, routines, plans, body metrics and settings) with the snapshot "${snap.label}". This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              // Close the live handle before overwriting the file, then ask for
              // a relaunch so every screen reloads from the restored database.
              await closeDatabase();
              await restoreSnapshot(snap.uri);
              appAlert(
                'Snapshot restored',
                'Please fully close and reopen Volyume so every screen reloads from the restored data.',
              );
            } catch (e) {
              logError('SnapshotsScreen.restore', e);
              appAlert('Restore failed', e?.message ?? 'Could not restore that snapshot.');
            }
          },
        },
      ],
    );
  }

  return (
    <SettingsPage title="Restore a snapshot">
      <View style={[styles.section, live.section]}>
        {snapshots === null ? (
          <Text maxFontSizeMultiplier={1.3} style={[localStyles.note, liveText.note]}>Loading…</Text>
        ) : loadError ? (
          <>
            <Text maxFontSizeMultiplier={1.3} style={[localStyles.note, liveText.note]}>
              Could not load snapshots from this device. Try again before restoring a backup.
            </Text>
            <SettingRow
              icon="refresh-outline"
              label="Try again"
              sub="Reload device snapshots"
              onPress={load}
            />
          </>
        ) : snapshots.length === 0 ? (
          <Text maxFontSizeMultiplier={1.3} style={[localStyles.note, liveText.note]}>
            No snapshots yet. Volyume saves an automatic safety copy before each
            app update, so one will appear here the next time the app updates.
          </Text>
        ) : (
          snapshots.map(snap => (
            <SettingRow
              key={snap.uri}
              icon="time-outline"
              label={snap.label}
              sub={formatSize(snap.sizeBytes)}
              destructive
              onPress={() => handleRestore(snap)}
            />
          ))
        )}
      </View>
      <Text maxFontSizeMultiplier={1.3} style={[localStyles.footer, liveText.footer]}>
        Snapshots are automatic safety copies of your database, kept on this
        device only. The most recent few are retained.
      </Text>
    </SettingsPage>
  );
}

const localStyles = StyleSheet.create({
  note: { ...type.bodySm, color: colors.textMuted, padding: spacing.lg },
  footer: { ...type.caption, color: colors.textMuted, paddingHorizontal: spacing.lg, paddingTop: spacing.md, lineHeight: 18 },
});
