import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import EngineLog from '../components/EngineLog';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getCoachOutputHistory, getOpenEdPatternFlag } from '../lib/database';
import { getWellbeingMode, isCalm } from '../lib/wellbeing';
import { pairAppliedWithOutcome, buildScorecard } from '../lib/coachOutcome';
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

function buildDecisionRows(week, pairs = []) {
  const rows = [];

  const adj = week.adjustments ?? {};

  // S1 outcome loop: tag a 'changed' row with its domain and, when the outcome
  // pairing verdicted that applied call the following week, attach the Applied
  // chip + verdict. `pairs` is [] under ED/calm suppression, so no chip renders.
  const withOutcome = (row, domain) => {
    row.domain = domain;
    const p = pairs.find((x) => x.weekStart === week.weekStart && x.domain === domain);
    if (p) {
      row.applied = true;
      row.verdictText = p.onTarget ? 'On target the following week.' : 'Off target the following week.';
    }
    return row;
  };

  if (adj.calories?.change && adj.calories.note) {
    const amt = Math.abs(adj.calories.change);
    // When the ED calorie floor clamped the applied cut below the proposed one,
    // the proposed figure overstates what landed. Drop the number (the floor
    // only ever clamps cuts) so the chip never claims a cut bigger than it was.
    const label = adj.calories.clampedToFloor
      ? 'Calories reduced to your floor'
      : (adj.calories.change > 0 ? `Calories up +${amt} kcal/day` : `Calories down ${amt} kcal/day`);
    rows.push(withOutcome({
      type: 'changed',
      icon: 'checkmark-circle-outline',
      label,
      detail: adj.calories.note,
    }, 'calories'));
  }

  const trainingSignal = adj.training?.signal;
  if (trainingSignal && trainingSignal !== 'hold' && adj.training?.note) {
    rows.push(withOutcome({
      type: 'changed',
      icon: 'checkmark-circle-outline',
      label: trainingSignal === 'push' ? 'More work added this week' : 'Volume pulled back this week',
      detail: adj.training.note,
    }, 'training'));
  }

  if (adj.steps?.target && adj.steps.change && adj.steps.note) {
    rows.push(withOutcome({
      type: 'changed',
      icon: 'checkmark-circle-outline',
      label: `Daily steps raised to ${adj.steps.target.toLocaleString()}`,
      detail: adj.steps.note,
    }, 'steps'));
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

export default function CoachHeldHistoryScreen() {
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user } = useAppStore(useShallow(s => ({
    user: s.user,
  })));
  const [weeks, setWeeks] = useState([]);
  // S1: the FULL unfiltered history drives the outcome pairing/scorecard (the
  // displayed `weeks` is filtered for cards only). `suppress` hides the S1
  // additions under an open ED flag / calm mode.
  const [historyFull, setHistoryFull] = useState([]);
  const [suppress, setSuppress] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // ED-safety, fail CLOSED: the outcome loop + scorecard are trend-adjacent,
      // so a FAILED flag/wellbeing read suppresses them (never shows over a
      // possibly-open flag). A sentinel 'read_failed' reads as suppress.
      const [history, edFlag, wellbeing] = await Promise.all([
        getCoachOutputHistory(user.id),
        getOpenEdPatternFlag(user.id).catch(() => 'read_failed'),
        getWellbeingMode().catch(() => 'read_failed'),
      ]);
      setSuppress(!!edFlag || wellbeing === 'read_failed' || isCalm(wellbeing));
      setHistoryFull(history);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Suppressed -> [] / null, so the outcome chips + scorecard render nothing.
  const pairs = suppress ? [] : pairAppliedWithOutcome(historyFull);
  const scorecard = suppress ? null : buildScorecard(historyFull);

  const isEmpty = !loading && weeks.length === 0;
  const totalDecisions = weeks.reduce((n, w) => n + buildDecisionRows(w).length, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <BackHeader title="Coaching history" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Every call the coach has made, what changed, what didn't, and why.
        </Text>

        {/* S1 the coach's scorecard (the track record). Hidden under ED/calm
            suppression and below the minimum sample; counts only, no body data. */}
        {scorecard != null && (
          <Text style={styles.scorecard}>
            Weeks you applied the call and the next trend landed on target: {scorecard.onTarget} of {scorecard.of}.
          </Text>
        )}

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
          const rows = buildDecisionRows(week, pairs);
          return (
            <View key={week.weekStart ?? wi} style={styles.weekBlock}>
              <Text style={styles.weekLabel} accessibilityRole="header">
                Week of {formatWeekStart(week.weekStart)}
              </Text>
              {rows.map((row, ri) => (
                <View
                  key={ri}
                  style={styles.decisionRow}
                  accessible
                  accessibilityLabel={
                    (row.label ? `${row.label}. ${row.detail}` : `Held. ${row.detail}`)
                    + (row.applied ? ` Applied. ${row.verdictText}` : '')
                  }
                >
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
                    {row.applied && (
                      <View style={styles.appliedRow}>
                        <View style={styles.appliedPill}>
                          <Text style={styles.appliedPillText}>Applied</Text>
                        </View>
                        <Text style={styles.verdictText}>{row.verdictText}</Text>
                      </View>
                    )}
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
    ...type.bodySm,
    color: colors.textMuted,
  },

  scorecard: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
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
    ...type.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
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
    ...type.bodySm,
    color: colors.textSecondary,
  },

  // S1 outcome loop: the Applied chip + next-week verdict under a decision row.
  appliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  appliedPill: {
    backgroundColor: withAlpha(colors.success, 0.15),
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  appliedPillText: {
    ...type.label,
    color: colors.success,
    fontWeight: fontWeight.semibold,
  },
  verdictText: {
    ...type.bodySm,
    color: colors.textSecondary,
  },

  footer: {
    ...type.num('caption'),
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: spacing.xs,
  },
});
