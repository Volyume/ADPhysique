import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, Share, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import Constants from 'expo-constants';
import { getRecentErrors, clearErrors, exportErrorsAsText, getCrashLog, clearCrashLog, flushDebugLogs, shouldShipDebugLogs, setShipDebugLogs } from '../lib/errorLog';
import { getSupabaseClient } from '../lib/supabase';
import useAppStore from '../store/useAppStore';

export default function DebugLogScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [crash, setCrash] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'error' | 'warn' | 'info'
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, c] = await Promise.all([getRecentErrors(), getCrashLog()]);
    setEntries(list);
    setCrash(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClear() {
    Alert.alert(
      'Clear all logs?',
      'This deletes the in-app error history. Use this after copying anything you want to keep.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => { await clearErrors(); await clearCrashLog(); await load(); },
        },
      ],
    );
  }

  async function handleShare() {
    const text = await exportErrorsAsText();
    try { await Share.share({ message: text, title: 'Volyume error log' }); }
    catch (_) {}
  }

  async function handleSendToSupport() {
    const sb = getSupabaseClient();
    if (!sb) {
      Alert.alert('Not available', 'Cloud is not configured — logs can only be shared from this device.');
      return;
    }
    const store = useAppStore.getState();
    const session = store.session;
    const result = await flushDebugLogs(sb, {
      force: true, // explicit user action overrides the opt-out
      userId: session?.user?.id ?? null,
      deviceId: store.user?.id ?? null,
      appVersion: Constants?.expoConfig?.version ?? null,
      platform: Platform.OS,
    });
    if (result.error) {
      Alert.alert('Send failed', result.error);
    } else if (result.sent === 0) {
      Alert.alert('Already up to date', 'All logs have been sent to support already.');
    } else {
      Alert.alert('Sent', `${result.sent} log ${result.sent === 1 ? 'entry' : 'entries'} sent to support.`);
    }
  }

  const [autoShip, setAutoShip] = useState(true);
  useEffect(() => { shouldShipDebugLogs().then(setAutoShip); }, []);
  async function handleAutoShipToggle(value) {
    setAutoShip(value);
    await setShipDebugLogs(value);
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter);
  const counts = entries.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Debug logs</Text>
        <TouchableOpacity onPress={load} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.toolbar}>
        {['all', 'error', 'warn', 'info'].map(level => {
          const on = filter === level;
          const count = level === 'all' ? entries.length : (counts[level] || 0);
          return (
            <TouchableOpacity
              key={level}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setFilter(level)}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
                {level} · {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleSendToSupport}>
          <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Send to support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={16} color={colors.textPrimary} />
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleClear}>
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.actionLabel, { color: colors.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.autoShipRow}>
        <Text style={styles.autoShipLabel}>Auto-send new errors during beta</Text>
        <Switch
          value={autoShip}
          onValueChange={handleAutoShipToggle}
          trackColor={{ false: colors.surface3, true: colors.primary + '80' }}
          thumbColor={autoShip ? colors.primary : colors.textMuted}
        />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {crash && (
          <View style={styles.crashCard}>
            <Text style={styles.crashTitle}>Most recent fatal crash</Text>
            <Text style={styles.crashWhen}>{new Date(crash.ts).toLocaleString()}</Text>
            <Text style={styles.crashMsg} selectable>{crash.message}</Text>
            {crash.stack ? (
              <Text style={styles.crashStack} selectable>{crash.stack.slice(0, 1200)}</Text>
            ) : null}
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={36} color={colors.success} />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter + ' '}entries.</Text>
            <Text style={styles.emptyHint}>Errors caught by handlers will appear here.</Text>
          </View>
        )}

        {filtered.map((e, i) => (
          <View key={`${e.ts}-${i}`} style={[styles.entry, levelStyle(e.level)]}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryLevel, levelLabelStyle(e.level)]}>{e.level}</Text>
              <Text style={styles.entryScope}>{e.scope}</Text>
              <Text style={styles.entryWhen}>{formatWhen(e.ts)}</Text>
            </View>
            <Text style={styles.entryMessage} selectable>{e.message}</Text>
            {e.context ? <Text style={styles.entryContext} selectable>ctx: {e.context}</Text> : null}
            {e.stack ? (
              <Text style={styles.entryStack} selectable numberOfLines={6}>{e.stack}</Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatWhen(ts) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function levelStyle(level) {
  if (level === 'error') return { borderLeftColor: colors.error };
  if (level === 'warn') return { borderLeftColor: colors.warning };
  return { borderLeftColor: colors.borderLight };
}
function levelLabelStyle(level) {
  if (level === 'error') return { color: colors.error };
  if (level === 'warn') return { color: colors.warning };
  return { color: colors.textSecondary };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  chipLabelOn: { color: colors.primary },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  autoShipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  autoShipLabel: { color: colors.textSecondary, fontSize: fontSize.sm, flex: 1, marginRight: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionBtnDanger: { borderColor: colors.error },
  actionLabel: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xxl },
  crashCard: { backgroundColor: colors.errorBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.error, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  crashTitle: { color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  crashWhen: { color: colors.textMuted, fontSize: fontSize.xs },
  crashMsg: { color: colors.textPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  crashStack: { color: colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'monospace' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.sm },
  entry: { backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 3, padding: spacing.md, gap: spacing.xs },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entryLevel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', minWidth: 44 },
  entryScope: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium, flex: 1 },
  entryWhen: { color: colors.textMuted, fontSize: fontSize.xs },
  entryMessage: { color: colors.textPrimary, fontSize: fontSize.sm },
  entryContext: { color: colors.textMuted, fontSize: fontSize.xs, fontFamily: 'monospace' },
  entryStack: { color: colors.textMuted, fontSize: fontSize.xs, fontFamily: 'monospace' },
});
