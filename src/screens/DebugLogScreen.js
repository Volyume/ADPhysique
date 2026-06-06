import { useEffect, useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import { getRecentErrors, clearErrors, exportErrorsAsText, getCrashLog, clearCrashLog, logInfo } from '../lib/errorLog';
import { diagnoseSyncConflicts } from '../lib/database';
import useAppStore from '../store/useAppStore';

// Errors auto-ship to Sentry (configured in App.js). This screen is the
// on-device viewer for the last 200 buffered events, useful when a
// tester wants to see what just happened locally or copy a session
// snippet to share. Cloud upload of the buffer is removed.

export default function DebugLogScreen() {
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
    appAlert(
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

  async function handleDiagnose() {
    const sessionUid = useAppStore.getState().session?.user?.id ?? null;
    const report = await diagnoseSyncConflicts(sessionUid);
    // Render the report into the debug log so the user can read it
    // in the same surface as the errors it explains. Per-table buckets
    // get one info entry each so filtering / scrolling stays useful.
    logInfo('diag.sync.summary',
      `${report.summary.totalRowsUnderForeignUids} rows under ${report.summary.distinctForeignUids.length} foreign uid(s)`,
      {
        currentSessionUid: sessionUid,
        foreignUids: report.summary.distinctForeignUids,
      },
    );
    for (const [table, buckets] of Object.entries(report.tables)) {
      const hasForeign = buckets.some(b => b.userId && !b.isCurrent && b.rowCount > 0);
      if (!hasForeign && buckets.length <= 1) continue;
      logInfo(`diag.sync.${table}`, JSON.stringify(buckets), { table });
    }
    await load();
    appAlert(
      'Diagnostic complete',
      `Scanned ${Object.keys(report.tables).length} tables. ` +
      `${report.summary.totalRowsUnderForeignUids} rows are under user_ids that aren't your current session (${report.summary.distinctForeignUids.length} distinct foreign uid${report.summary.distinctForeignUids.length === 1 ? '' : 's'}). ` +
      `Filter the log by "info" and look for diag.sync entries for the per-table breakdown.`,
    );
  }

  const filtered = filter === 'all' ? entries : entries.filter(e => e.level === filter);
  const counts = entries.reduce((acc, e) => { acc[e.level] = (acc[e.level] || 0) + 1; return acc; }, {});

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader
        title="Debug logs"
        right={(
          <TouchableOpacity onPress={load} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Refresh logs">
            <Ionicons name="refresh" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      />

      <View style={styles.toolbar}>
        {['all', 'error', 'warn', 'info'].map(level => {
          const on = filter === level;
          const count = level === 'all' ? entries.length : (counts[level] || 0);
          return (
            <TouchableOpacity
              key={level}
              style={[styles.chip, on && styles.chipOn]}
              onPress={() => setFilter(level)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${level}, ${count}`}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>
                {level} · {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share logs">
          <Ionicons name="share-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDiagnose} accessibilityRole="button" accessibilityLabel="Run sync diagnostics">
          <Ionicons name="medkit-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionLabel, { color: colors.primary }]}>Sync diag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleClear} accessibilityRole="button" accessibilityLabel="Clear logs">
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.actionLabel, { color: colors.error }]}>Clear</Text>
        </TouchableOpacity>
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
  toolbar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  chipLabel: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  chipLabelOn: { color: colors.primary },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionBtnDanger: { borderColor: colors.error },
  actionLabel: { ...type.label, color: colors.textPrimary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: 0, gap: spacing.sm, paddingBottom: spacing.xxl },
  crashCard: { backgroundColor: colors.errorBg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.error, padding: spacing.md, gap: spacing.xs, marginBottom: spacing.sm },
  crashTitle: { color: colors.error, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  crashWhen: { ...type.num('caption'), color: colors.textMuted },
  crashMsg: { ...type.label, color: colors.textPrimary },
  crashStack: { color: colors.textSecondary, fontSize: fontSize.xs, fontFamily: 'monospace' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyText: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  emptyHint: { color: colors.textMuted, fontSize: fontSize.sm },
  entry: { backgroundColor: colors.surface, borderRadius: radius.md, borderLeftWidth: 3, padding: spacing.md, gap: spacing.xs },
  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  entryLevel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', minWidth: 44 },
  entryScope: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: fontWeight.medium, flex: 1 },
  entryWhen: { ...type.num('caption'), color: colors.textMuted },
  entryMessage: { color: colors.textPrimary, fontSize: fontSize.sm },
  entryContext: { color: colors.textMuted, fontSize: fontSize.xs, fontFamily: 'monospace' },
  entryStack: { color: colors.textMuted, fontSize: fontSize.xs, fontFamily: 'monospace' },
});
