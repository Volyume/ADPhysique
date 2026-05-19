import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getCoachOutputHistory } from '../lib/database';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatWeekStart(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function CoachHeldHistoryScreen({ navigation }) {
  const { user } = useAppStore();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const history = await getCoachOutputHistory(user.id);
      const withHeld = history.filter(
        w => Array.isArray(w.heldDecisions) && w.heldDecisions.length > 0,
      );
      setWeeks(withHeld);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const isEmpty = !loading && weeks.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>What we held</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Every time the coach paused a decision instead of acting on it, the reason is recorded here. This is the full history.
        </Text>

        {loading && (
          <Text style={styles.emptyText}>Loading…</Text>
        )}

        {isEmpty && (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nothing held yet</Text>
            <Text style={styles.emptyBody}>
              When the coach decides to wait rather than change something, the reason will appear here.
            </Text>
          </View>
        )}

        {weeks.map((week, wi) => (
          <View key={week.weekStart ?? wi} style={styles.weekBlock}>
            <Text style={styles.weekLabel}>
              Week of {formatWeekStart(week.weekStart)}
            </Text>
            {week.heldDecisions.map((d, di) => (
              <View key={di} style={styles.heldRow}>
                <Ionicons
                  name="pause-circle-outline"
                  size={16}
                  color={colors.textMuted}
                  style={styles.heldIcon}
                />
                <Text style={styles.heldText}>{d.reason}</Text>
              </View>
            ))}
          </View>
        ))}

        {weeks.length > 0 && (
          <Text style={styles.footer}>
            {weeks.reduce((n, w) => n + w.heldDecisions.length, 0)} held decisions across {weeks.length} week{weeks.length !== 1 ? 's' : ''}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, textAlign: 'center',
    fontSize: fontSize.md, fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerSpacer: { width: 36 },

  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  intro: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },

  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xl,
  },

  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  emptyBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  weekBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },

  heldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  heldIcon: { marginTop: 2 },
  heldText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  footer: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
