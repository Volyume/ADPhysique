/**
 * CardioHistoryScreen
 *
 * The cardio log over time (audit E3). A plain reverse-chronological list of
 * sessions grouped by day, each showing activity, duration, intensity and the
 * estimated calories (feedback, not a target). Swipe-free: a small delete on
 * each row (soft delete, so it syncs). Reached from the Plans cardio card.
 *
 * Voice rules: CLAUDE.md. No em dashes, no encouragement.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SectionList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, type } from '../styles/theme';
import EmptyState from '../components/EmptyState';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getRecentCardioLog, deleteCardioLog } from '../lib/database';
import { parseLocalDay } from '../lib/dayKey';

const INTENSITY_LABEL = { low: 'Easy', moderate: 'Moderate', high: 'Hard' };

function prettyDate(key) {
  try {
    const d = parseLocalDay(key);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch (_) {
    return key;
  }
}

export default function CardioHistoryScreen({ navigation }) {
  const { user } = useAppStore(useShallow((s) => ({ user: s.user })));
  const userId = user?.id;
  const [sections, setSections] = useState([]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const rows = await getRecentCardioLog(userId, 200);
      const byDay = new Map();
      for (const r of rows) {
        const key = r.entryDate;
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key).push(r);
      }
      const out = [...byDay.entries()].map(([key, data]) => ({ title: key, data }));
      setSections(out);
    } catch (_) { /* leave last */ }
  }, [userId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmDelete(row) {
    Alert.alert('Remove this session?', `${row.activityName}, ${row.durationMin} min.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => { await deleteCardioLog(userId, row.id); load(); },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cardio history</Text>
        <View style={{ width: 24 }} />
      </View>

      {sections.length === 0 ? (
        <EmptyState
          icon="heart-outline"
          title="No cardio yet"
          text="Sessions you log show up here."
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          renderSectionHeader={({ section }) => (
            <Text style={styles.dayHeader}>{prettyDate(section.title)}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.activity}>{item.activityName}</Text>
                <Text style={styles.meta}>
                  {item.durationMin} min · {INTENSITY_LABEL[item.intensity] || item.intensity}
                  {item.estKcal != null ? ` · ~${item.estKcal} kcal` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={10} accessibilityLabel="Remove session">
                <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { ...type.title, color: colors.textPrimary },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  dayHeader: {
    fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.textSecondary,
    letterSpacing: 1, textTransform: 'uppercase',
    marginTop: spacing.md, marginBottom: spacing.xs, backgroundColor: colors.background,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  activity: { ...type.body, color: colors.textPrimary },
  meta: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2, fontVariant: ['tabular-nums'] },
});
