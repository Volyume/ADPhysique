import { useEffect, useState, useCallback } from 'react';
import { appAlert } from '../components/AppAlert';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
  // CP-10 batch F (2026-07-11): live theme (src/hooks/useTheme.js). This
  // screen never renders a FlatList/FlashList/SectionList row (a plain
  // ScrollView over a .map), so an unmemoised call matches
  // AddCustomFoodScreen's own precedent (batch D).
  const t = useTheme();
  const live = buildLiveStyles(t);

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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader
        title="Debug logs"
        right={(
          <TouchableOpacity onPress={load} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Refresh logs">
            <Ionicons name="refresh" size={22} color={t.colors.textSecondary} />
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
              style={[styles.chip, live.chip, on && [styles.chipOn, live.chipOn]]}
              onPress={() => setFilter(level)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${level}, ${count}`}
            >
              <Text style={[styles.chipLabel, live.chipLabel, on && [styles.chipLabelOn, live.chipLabelOn]]}>
                {level} · {count}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, live.actionBtn]} onPress={handleShare} accessibilityRole="button" accessibilityLabel="Share logs">
          <Ionicons name="share-outline" size={16} color={t.colors.primary} />
          <Text style={[styles.actionLabel, live.actionLabel, { color: t.colors.primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, live.actionBtn]} onPress={handleDiagnose} accessibilityRole="button" accessibilityLabel="Run sync diagnostics">
          <Ionicons name="medkit-outline" size={16} color={t.colors.primary} />
          <Text style={[styles.actionLabel, live.actionLabel, { color: t.colors.primary }]}>Sync diag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, live.actionBtn, styles.actionBtnDanger, live.actionBtnDanger]} onPress={handleClear} accessibilityRole="button" accessibilityLabel="Clear logs">
          <Ionicons name="trash-outline" size={16} color={t.colors.error} />
          <Text style={[styles.actionLabel, live.actionLabel, { color: t.colors.error }]}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {crash && (
          <View style={[styles.crashCard, live.crashCard]}>
            <Text style={[styles.crashTitle, live.crashTitle]}>Most recent fatal crash</Text>
            <Text style={[styles.crashWhen, live.crashWhen]}>{new Date(crash.ts).toLocaleString()}</Text>
            <Text style={[styles.crashMsg, live.crashMsg]} selectable>{crash.message}</Text>
            {crash.stack ? (
              <Text style={[styles.crashStack, live.crashStack]} selectable>{crash.stack.slice(0, 1200)}</Text>
            ) : null}
          </View>
        )}

        {!loading && filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={36} color={t.colors.success} />
            <Text style={[styles.emptyText, live.emptyText]}>No {filter === 'all' ? '' : filter + ' '}entries.</Text>
            <Text style={[styles.emptyHint, live.emptyHint]}>Errors caught by handlers will appear here.</Text>
          </View>
        )}

        {filtered.map((e, i) => (
          <View key={`${e.ts}-${i}`} style={[styles.entry, live.entry, buildLevelStyle(t, e.level)]}>
            <View style={styles.entryHeader}>
              <Text style={[styles.entryLevel, live.entryLevel, buildLevelLabelStyle(t, e.level)]}>{e.level}</Text>
              <Text style={[styles.entryScope, live.entryScope]}>{e.scope}</Text>
              <Text style={[styles.entryWhen, live.entryWhen]}>{formatWhen(e.ts)}</Text>
            </View>
            <Text style={[styles.entryMessage, live.entryMessage]} selectable>{e.message}</Text>
            {e.context ? <Text style={[styles.entryContext, live.entryContext]} selectable>ctx: {e.context}</Text> : null}
            {e.stack ? (
              <Text style={[styles.entryStack, live.entryStack]} selectable numberOfLines={6}>{e.stack}</Text>
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

// CP-10 batch F (2026-07-11): converted to accept the live theme `t` on the
// buildConfidenceColors(t) precedent (NutritionTargetsScreen, batch E) --
// the error/warn/default severity mapping is byte-identical in meaning,
// only the token SOURCE moved from the frozen import to the live theme.
function buildLevelStyle(t, level) {
  if (level === 'error') return { borderLeftColor: t.colors.error };
  if (level === 'warn') return { borderLeftColor: t.colors.warning };
  return { borderLeftColor: t.colors.borderLight };
}
function buildLevelLabelStyle(t, level) {
  if (level === 'error') return { color: t.colors.error };
  if (level === 'warn') return { color: t.colors.warning };
  return { color: t.colors.textSecondary };
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

// CP-10 batch F (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/borderWidth/fontFamily, no token) are correctly
// omitted -- there is nothing to unfreeze for them. Same pattern as
// AddCustomFoodScreen.js's buildLiveStyles (batch D).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    chip: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    chipOn: { backgroundColor: t.colors.primaryBg, borderColor: t.colors.primary },
    chipLabel: { color: t.colors.textSecondary, fontSize: t.fontSize.xs },
    chipLabelOn: { color: t.colors.primary },
    actionBtn: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    actionBtnDanger: { borderColor: t.colors.error },
    actionLabel: { ...t.type.label, color: t.colors.textPrimary },
    crashCard: { backgroundColor: t.colors.errorBg, borderColor: t.colors.error },
    crashTitle: { color: t.colors.error, fontSize: t.fontSize.sm },
    crashWhen: { ...t.type.num('caption'), color: t.colors.textMuted },
    crashMsg: { ...t.type.label, color: t.colors.textPrimary },
    crashStack: { color: t.colors.textSecondary, fontSize: t.fontSize.xs },
    emptyText: { color: t.colors.textPrimary, fontSize: t.fontSize.md },
    emptyHint: { color: t.colors.textMuted, fontSize: t.fontSize.sm },
    entry: { backgroundColor: t.colors.surface },
    entryLevel: { fontSize: t.fontSize.xs },
    entryScope: { color: t.colors.textSecondary, fontSize: t.fontSize.xs },
    entryWhen: { ...t.type.num('caption'), color: t.colors.textMuted },
    entryMessage: { color: t.colors.textPrimary, fontSize: t.fontSize.sm },
    entryContext: { color: t.colors.textMuted, fontSize: t.fontSize.xs },
    entryStack: { color: t.colors.textMuted, fontSize: t.fontSize.xs },
  };
}
