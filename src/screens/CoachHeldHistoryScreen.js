import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import EngineLog from '../components/EngineLog';
import useAppStore from '../store/useAppStore';
import { getCoachOutputHistory } from '../lib/database';
import { SkeletonCard } from '../components/Skeleton';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatWeekStart(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function buildDecisionRows(week) {
  const rows = [];

  const adj = week.adjustments ?? {};

  if (adj.calories?.change && adj.calories.note) {
    const amt = Math.abs(adj.calories.change);
    rows.push({
      type: 'changed',
      icon: 'checkmark-circle-outline',
      label: adj.calories.change > 0 ? `Calories up +${amt} kcal/day` : `Calories down ${amt} kcal/day`,
      detail: adj.calories.note,
    });
  }

  const trainingSignal = adj.training?.signal;
  if (trainingSignal && trainingSignal !== 'hold' && adj.training?.note) {
    rows.push({
      type: 'changed',
      icon: 'checkmark-circle-outline',
      label: trainingSignal === 'push' ? 'More work added this week' : 'Volume pulled back this week',
      detail: adj.training.note,
    });
  }

  if (adj.steps?.target && adj.steps.change && adj.steps.note) {
    rows.push({
      type: 'changed',
      icon: 'checkmark-circle-outline',
      label: `Daily steps raised to ${adj.steps.target.toLocaleString()}`,
      detail: adj.steps.note,
    });
  }

  if (week.deloadSuggested && week.deloadNote) {
    rows.push({
      type: 'changed',
      icon: 'moon-outline',
      label: 'A lighter week this week',
      detail: week.deloadNote,
    });
  }

  for (const d of (week.heldDecisions ?? [])) {
    rows.push({
      type: 'held',
      icon: 'pause-circle-outline',
      label: null,
      detail: d.reason,
    });
  }

  return rows;
}

export default function CoachHeldHistoryScreen({ navigation }) {
  const { user } = useAppStore();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const history = await getCoachOutputHistory(user.id);
      const withData = history.filter(w => {
        const hasHeld = Array.isArray(w.heldDecisions) && w.heldDecisions.length > 0;
        const hasChanged = w.adjustments?.calories?.change ||
          (w.adjustments?.training?.signal && w.adjustments.training.signal !== 'hold') ||
          w.adjustments?.steps?.change ||
          w.deloadSuggested;
        return hasHeld || hasChanged;
      });
      setWeeks(withData);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  const isEmpty = !loading && weeks.length === 0;
  const totalDecisions = weeks.reduce((n, w) => n + buildDecisionRows(w).length, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <BackHeader title="Coaching history" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Every week the coach makes decisions. Some things change, some things stay the same. You can see all of it here, and why.
        </Text>

        {/* Recent engine adaptations and rep-regression warnings, moved
            from the retired Athlete Hub dashboard. */}
        <EngineLog userId={user?.id} />

        {loading && (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <SkeletonCard height={110} />
            <SkeletonCard height={110} />
            <SkeletonCard height={110} />
          </View>
        )}

        {isEmpty && (
          <View style={styles.emptyCard}>
            <Ionicons name="book-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyBody}>
              After your first weekly check-in, decisions and holds will appear here.
            </Text>
          </View>
        )}

        {weeks.map((week, wi) => {
          const rows = buildDecisionRows(week);
          return (
            <View key={week.weekStart ?? wi} style={styles.weekBlock}>
              <Text style={styles.weekLabel}>
                Week of {formatWeekStart(week.weekStart)}
              </Text>
              {rows.map((row, ri) => (
                <View key={ri} style={styles.decisionRow}>
                  <Ionicons
                    name={row.icon}
                    size={15}
                    color={row.type === 'changed' ? colors.success : colors.textMuted}
                    style={styles.decisionIcon}
                  />
                  <View style={{ flex: 1 }}>
                    {row.label && (
                      <Text style={[
                        styles.decisionLabel,
                        row.type === 'changed' && styles.decisionLabelChanged,
                      ]}>
                        {row.label}
                      </Text>
                    )}
                    <Text style={styles.decisionDetail}>{row.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        })}

        {totalDecisions > 0 && (
          <Text style={styles.footer}>
            {totalDecisions} decision{totalDecisions !== 1 ? 's' : ''} across {weeks.length} week{weeks.length !== 1 ? 's' : ''}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },


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
    ...type.bodyStrong,
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
    gap: spacing.md,
  },
  weekLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },

  decisionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  decisionIcon: { marginTop: spacing.xxs },
  decisionLabel: {
    ...type.label,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  decisionLabelChanged: { color: colors.success },
  decisionDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  footer: {
    ...type.num('caption'),
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
