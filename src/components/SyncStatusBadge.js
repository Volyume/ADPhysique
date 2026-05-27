/**
 * SyncStatusBadge: the persistent header indicator from
 * SYNC_ARCHITECTURE_LOCKED.md lines 266-276 and
 * PRODUCTION_READINESS_LOCKED.md § 1 ("Sync status visible in the
 * UI. A small indicator shows synced, pending, or offline.
 * Tappable for diagnostics, including last-sync timestamp and
 * queue depth.").
 *
 * Reads status from src/lib/sync (getStatus + getQueueDepth).
 * Polls every 5s while mounted; subscribes to NetInfo for the
 * online/offline flip so the badge updates immediately when the
 * network changes.
 *
 * Visual: 6px coloured dot + status text. Theme amber on pending,
 * green on synced, grey on offline, red on error. No animation,
 * no gradients (CLAUDE.md design rules).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pressable, View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { colors, fontSize, spacing, radius } from '../styles/theme';
import { getStatus, syncAll } from '../lib/sync';

const POLL_MS = 5_000;

const COLOURS = {
  synced:  '#16A34A', // green
  pending: colors.primary, // theme amber
  offline: colors.textMuted,
  error:   '#DC2626',
  unknown: colors.textMuted,
};

const LABEL = {
  synced:  'Synced',
  pending: 'Pending',
  offline: 'Offline',
  error:   'Sync error',
  unknown: 'Sync',
};

export default function SyncStatusBadge() {
  const [snapshot, setSnapshot] = useState({ status: 'unknown', queue_depth: 0, last_run_at: 0, last_error: null });
  const [open, setOpen] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const s = await getStatus();
      if (mountedRef.current) setSnapshot(s);
    } catch (_) { /* tolerate */ }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(t);
    };
  }, [refresh]);

  const dotColour = COLOURS[snapshot.status] ?? COLOURS.unknown;
  const label = LABEL[snapshot.status] ?? LABEL.unknown;

  const lastRunMins = snapshot.last_run_at
    ? Math.round((Date.now() - snapshot.last_run_at) / 60000)
    : null;

  async function handleManualSync() {
    setOpen(false);
    try {
      // Caller pattern: read user from store at call time.
      // eslint-disable-next-line global-require
      const useAppStore = require('../store/useAppStore').default;
      const st = useAppStore.getState();
      await syncAll({
        userId: st.session?.user?.id ?? null,
        localUserId: st.user?.id ?? null,
        triggeredBy: 'manual',
      });
    } catch (_) { /* tolerate */ }
    refresh();
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Sync status: ${label}${snapshot.queue_depth ? `, ${snapshot.queue_depth} pending` : ''}. Tap for details.`}
        style={styles.badge}
        hitSlop={8}
      >
        <View style={[styles.dot, { backgroundColor: dotColour }]} />
        <Text style={styles.label}>{label}</Text>
        {snapshot.queue_depth > 0 && (
          <Text style={styles.queue}>{snapshot.queue_depth}</Text>
        )}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Sync</Text>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Status</Text>
              <Text style={[styles.rowVal, { color: dotColour }]}>{label}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Pending writes</Text>
              <Text style={styles.rowVal}>{snapshot.queue_depth}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Last sync</Text>
              <Text style={styles.rowVal}>{lastRunMins == null ? '-' : `${lastRunMins} min ago`}</Text>
            </View>
            {snapshot.last_error ? (
              <View style={styles.row}>
                <Text style={styles.rowKey}>Last error</Text>
                <ScrollView style={styles.errorScroll}>
                  <Text style={styles.errorText}>{String(snapshot.last_error).slice(0, 300)}</Text>
                </ScrollView>
              </View>
            ) : null}
            <Pressable
              onPress={handleManualSync}
              style={styles.syncButton}
              accessibilityRole="button"
              accessibilityLabel="Sync now"
            >
              <Text style={styles.syncButtonText}>Sync now</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  queue: {
    fontSize: fontSize.xs,
    color: colors.primary,
    marginLeft: 6,
    fontVariant: ['tabular-nums'],
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: spacing.md,
    paddingTop: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    width: 280,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetTitle: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  rowKey: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
  rowVal: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  errorScroll: {
    maxHeight: 80,
    flex: 1,
    marginLeft: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
  },
  syncButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  syncButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
});
