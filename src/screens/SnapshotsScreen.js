// COMP-009: restore an automatic snapshot.
//
// Lists the rolling set of pre-migration / pre-account-switch DB snapshots and
// offers a two-tap, explicitly-destructive restore: confirm → close the DB
// handle → copy the snapshot back over the live file → ask the user to relaunch
// (writing over an open SQLite file risks corruption, hence the close + manual
// relaunch, mirroring the existing JSON restore). Same plain destructive tone as
// handleRestoreBackup: it replaces all current data and cannot be undone.

import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { appAlert } from '../components/AppAlert';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';
import { colors, spacing, type } from '../styles/theme';
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

  const load = useCallback(() => {
    listSnapshots().then(setSnapshots).catch(() => setSnapshots([]));
  }, []);
  useEffect(() => { load(); }, [load]);
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
      <View style={styles.section}>
        {snapshots === null ? (
          <Text style={localStyles.note}>Loading…</Text>
        ) : snapshots.length === 0 ? (
          <Text style={localStyles.note}>
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
      <Text style={localStyles.footer}>
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
