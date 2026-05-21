// Admin-only diagnostic view for the cloud log table.
//
// Gated server-side by the is_admin_email() RPC check baked into
// admin_get_recent_bugs + admin_get_bug_occurrences. The client also
// hides the entry point in Settings for non-admin sessions but that's
// only a cosmetic gate — the RPC is the authoritative guard.
//
// Two states:
//   1. List of unique bugs (deduped by level + scope + first 80 chars
//      of message) sorted by most recent occurrence. Each row shows
//      occurrence count, first/last seen, unique-user count, platforms.
//   2. Drill-in detail view showing the most recent 50 raw occurrences
//      for one bug. Long-press any occurrence to copy as plain text.

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { getSupabaseClient } from '../lib/supabase';

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function severityColor(level) {
  if (level === 'error') return colors.error;
  if (level === 'warn') return colors.warning;
  return colors.textSecondary;
}

export default function AdminLogsScreen({ navigation }) {
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [windowHours, setWindowHours] = useState(168); // 7 days default
  const [selected, setSelected] = useState(null); // dedup_key being drilled into
  const [occurrences, setOccurrences] = useState([]);
  const [occLoading, setOccLoading] = useState(false);

  const loadBugs = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    try {
      const { data, error } = await sb.rpc('admin_get_recent_bugs', { hours_back: windowHours });
      if (error) {
        Alert.alert('Could not load logs', error.message);
        setBugs([]);
      } else {
        setBugs(data || []);
      }
    } catch (e) {
      Alert.alert('Could not load logs', e?.message ?? 'unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [windowHours]);

  useEffect(() => { setLoading(true); loadBugs(); }, [loadBugs]);

  async function loadOccurrences(dedupKey) {
    setSelected(dedupKey);
    setOccLoading(true);
    setOccurrences([]);
    const sb = getSupabaseClient();
    if (!sb) { setOccLoading(false); return; }
    try {
      const { data, error } = await sb.rpc('admin_get_bug_occurrences', {
        dedup_key_in: dedupKey,
        limit_n: 50,
      });
      if (error) Alert.alert('Could not load detail', error.message);
      else setOccurrences(data || []);
    } catch (e) {
      Alert.alert('Could not load detail', e?.message ?? 'unknown error');
    } finally {
      setOccLoading(false);
    }
  }

  async function shareBug(bug) {
    // Build a Claude-ready export. Includes dedup key (so we can talk
    // about "the same bug" across messages), full summary, and every
    // raw occurrence with complete message / context / stack — no
    // truncation. Volume is OK because Share.share handles long
    // strings on both iOS and Android, and Claude needs the full
    // picture to spot patterns.
    const lines = [];
    lines.push('=== Volyume bug report ===');
    lines.push(`Dedup key: ${bug.dedup_key}`);
    lines.push(`Scope:     ${bug.scope || 'app'}`);
    lines.push(`Level:     ${bug.level.toUpperCase()}`);
    lines.push(`Message:   ${bug.sample_message || '(none)'}`);
    lines.push('');
    lines.push(`Occurrences:    ${bug.occurrence_count}`);
    lines.push(`Unique users:   ${bug.unique_users}`);
    lines.push(`First seen:     ${bug.first_seen}`);
    lines.push(`Last seen:      ${bug.last_seen}`);
    lines.push(`Platforms:      ${(bug.platforms || []).join(', ') || 'unknown'}`);
    lines.push(`App versions:   ${(bug.app_versions || []).join(', ') || 'unknown'}`);

    if (occurrences.length > 0 && selected === bug.dedup_key) {
      lines.push('');
      lines.push(`=== Raw occurrences (${occurrences.length}) ===`);
      occurrences.forEach((o, i) => {
        lines.push('');
        lines.push(`--- #${i + 1} · ${o.uploaded_at} ---`);
        lines.push(`user:     ${o.user_id ? String(o.user_id) : 'anon'}`);
        lines.push(`device:   ${o.device_id || '—'}`);
        lines.push(`platform: ${o.platform || '?'} · app v${o.app_version || '?'}`);
        if (o.message) {
          lines.push(`message:  ${o.message}`);
        }
        if (o.context) {
          lines.push(`context:  ${o.context}`);
        }
        if (o.stack) {
          lines.push(`stack:`);
          lines.push(String(o.stack));
        }
      });
    } else {
      lines.push('');
      lines.push('(Tap the bug to load raw occurrences before sharing for fuller detail.)');
    }

    const message = lines.join('\n');
    try { await Share.share({ message, title: 'Volyume bug report' }); }
    catch (_) {}
  }

  function onRefresh() {
    setRefreshing(true);
    if (selected) loadOccurrences(selected);
    loadBugs();
  }

  const WINDOWS = [
    { label: '24h',  hours: 24 },
    { label: '7d',   hours: 168 },
    { label: '30d',  hours: 720 },
  ];

  if (selected) {
    const bug = bugs.find(b => b.dedup_key === selected);
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelected(null); setOccurrences([]); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{bug?.scope || 'Bug detail'}</Text>
          <TouchableOpacity onPress={() => bug && shareBug(bug)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        {bug && (
          <View style={styles.detailSummary}>
            <View style={[styles.levelChip, { backgroundColor: severityColor(bug.level) + '20', borderColor: severityColor(bug.level) }]}>
              <Text style={[styles.levelChipText, { color: severityColor(bug.level) }]}>{bug.level.toUpperCase()}</Text>
            </View>
            <Text style={styles.detailMessage}>{bug.sample_message}</Text>
            <Text style={styles.detailMeta}>
              {bug.occurrence_count} occurrence{bug.occurrence_count === 1 ? '' : 's'} · {bug.unique_users} user{bug.unique_users === 1 ? '' : 's'} · {(bug.platforms || []).join(', ') || 'no platform info'}
            </Text>
          </View>
        )}
        <ScrollView contentContainerStyle={styles.detailScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
          {occLoading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />}
          {!occLoading && occurrences.map((o) => (
            <View key={o.id} style={styles.occCard}>
              <View style={styles.occHeader}>
                <Text style={styles.occWhen}>{new Date(o.uploaded_at).toLocaleString()}</Text>
                <Text style={styles.occMeta}>{o.platform || '?'} · {o.app_version || '?'}</Text>
              </View>
              {o.message && <Text style={styles.occMessage}>{o.message}</Text>}
              {o.context && <Text style={styles.occContext}>ctx: {o.context}</Text>}
              {o.stack && <Text style={styles.occStack}>{o.stack}</Text>}
              <Text style={styles.occUser}>user {o.user_id ? String(o.user_id).slice(0, 8) : 'anon'} · device {o.device_id ? String(o.device_id).slice(0, 8) : '—'}</Text>
            </View>
          ))}
          {!occLoading && occurrences.length === 0 && (
            <Text style={styles.empty}>No occurrences in the selected window.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cloud diagnostics</Text>
        <TouchableOpacity onPress={onRefresh} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.windowRow}>
        {WINDOWS.map(w => {
          const active = windowHours === w.hours;
          return (
            <TouchableOpacity
              key={w.label}
              style={[styles.windowChip, active && styles.windowChipActive]}
              onPress={() => setWindowHours(w.hours)}
            >
              <Text style={[styles.windowChipText, active && styles.windowChipTextActive]}>{w.label}</Text>
            </TouchableOpacity>
          );
        })}
        <Text style={styles.windowHint}>{bugs.length} unique bug{bugs.length === 1 ? '' : 's'}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.textMuted} />}>
        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.xl }} />}
        {!loading && bugs.length === 0 && (
          <Text style={styles.empty}>
            No warn/error entries in the last {windowHours} hours. Either everything's fine or testers haven't synced yet.
          </Text>
        )}
        {!loading && bugs.map((b) => (
          <TouchableOpacity
            key={b.dedup_key}
            style={styles.bugCard}
            onPress={() => loadOccurrences(b.dedup_key)}
            activeOpacity={0.75}
          >
            <View style={styles.bugCardHeader}>
              <View style={[styles.levelChip, { backgroundColor: severityColor(b.level) + '20', borderColor: severityColor(b.level) }]}>
                <Text style={[styles.levelChipText, { color: severityColor(b.level) }]}>{b.level.toUpperCase()}</Text>
              </View>
              <Text style={styles.bugScope} numberOfLines={1}>{b.scope || 'app'}</Text>
              <Text style={styles.bugCount}>×{b.occurrence_count}</Text>
            </View>
            <Text style={styles.bugMessage} numberOfLines={2}>{b.sample_message || '(no message)'}</Text>
            <View style={styles.bugFooter}>
              <Text style={styles.bugFooterText}>last {timeAgo(b.last_seen)}</Text>
              <Text style={styles.bugFooterText}>·</Text>
              <Text style={styles.bugFooterText}>{b.unique_users} user{b.unique_users === 1 ? '' : 's'}</Text>
              {(b.platforms || []).length > 0 && (
                <>
                  <Text style={styles.bugFooterText}>·</Text>
                  <Text style={styles.bugFooterText}>{(b.platforms || []).join(', ')}</Text>
                </>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: spacing.md },
  windowRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  windowChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  windowChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryBg },
  windowChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textSecondary },
  windowChipTextActive: { color: colors.primary },
  windowHint: { flex: 1, textAlign: 'right', fontSize: fontSize.xs, color: colors.textMuted },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  empty: { fontSize: fontSize.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 20 },
  bugCard: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  bugCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  levelChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderRadius: radius.sm, borderWidth: 1,
  },
  levelChipText: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.4 },
  bugScope: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  bugCount: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
  bugMessage: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  bugFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  bugFooterText: { fontSize: fontSize.xs, color: colors.textMuted },

  detailSummary: {
    padding: spacing.lg, gap: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailMessage: { fontSize: fontSize.md, color: colors.textPrimary, lineHeight: 21 },
  detailMeta: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17 },
  detailScroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  occCard: {
    backgroundColor: colors.surface2, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, gap: 4,
  },
  occHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  occWhen: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  occMeta: { fontSize: fontSize.xs, color: colors.textMuted },
  occMessage: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 4 },
  occContext: { fontSize: fontSize.xs, color: colors.textMuted, fontFamily: 'monospace', marginTop: 4 },
  occStack: { fontSize: 11, color: colors.textMuted, fontFamily: 'monospace', marginTop: 4, lineHeight: 15 },
  occUser: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
});
