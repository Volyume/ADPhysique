import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../store/useAppStore';
import { runWeeklyCoach } from '../lib/weeklyCoach';
import {
  getLatestCheckin,
  getRecentCheckins,
  getMorningWeightsLast14Days,
  getWeeklySessionStats,
  getWeeklyPRCount,
  getNutritionTargets,
  saveCoachOutput,
  getLatestCoachOutput,
} from '../lib/database';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDay(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatDayFull(ms) {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/** "19 May – 25 May 2026" */
function weekRangeLabel(weekStartMs) {
  const start = new Date(weekStartMs);
  const end = new Date(weekStartMs + 6 * 24 * 60 * 60 * 1000);
  const startStr = formatDay(start);
  const endStr = formatDayFull(end);
  return `${startStr} – ${endStr}`;
}

const TRAINING_SIGNAL_LABEL = {
  push: 'Push harder',
  hold: 'Hold steady',
  reduce: 'Back it off',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function StatChip({ icon, iconColor, label, value, valueColor }) {
  return (
    <View style={styles.statChip}>
      {icon ? (
        <Ionicons name={icon} size={15} color={iconColor ?? colors.textSecondary} />
      ) : null}
      <Text style={[styles.statChipValue, valueColor ? { color: valueColor } : null]}>
        {value}
      </Text>
      {label ? <Text style={styles.statChipLabel}>{label}</Text> : null}
    </View>
  );
}

function AdherenceNote({ note }) {
  return (
    <View style={styles.adherenceCard}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
      <Text style={styles.adherenceText}>{note}</Text>
    </View>
  );
}

function WhatsWorkingCard({ bullets }) {
  if (!bullets || bullets.length === 0) return null;
  return (
    <View style={styles.whatsWorkingCard}>
      <SectionHeader title="WHAT'S WORKING" />
      <View style={styles.bulletList}>
        {bullets.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <Ionicons name="checkmark" size={15} color={colors.success} style={styles.bulletIcon} />
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function AdjustmentRow({ iconName, label, note }) {
  return (
    <View style={styles.adjustmentRow}>
      <View style={styles.adjustmentIconWrap}>
        <Ionicons name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={styles.adjustmentContent}>
        <Text style={styles.adjustmentLabel}>{label}</Text>
        {note ? <Text style={styles.adjustmentNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

function NextWeekCard({ adjustments }) {
  const { training, calories, steps, cardio } = adjustments;

  const calLabel =
    calories === null
      ? null
      : calories.change === 0
      ? 'Hold at current target'
      : `${calories.change > 0 ? '+' : ''}${calories.change} kcal`;

  const stepsLabel = steps !== null ? `${steps.target.toLocaleString('en-GB')}/day target` : null;

  return (
    <View style={styles.card}>
      <SectionHeader title="NEXT WEEK" />
      <AdjustmentRow
        iconName="barbell-outline"
        label={TRAINING_SIGNAL_LABEL[training.signal] ?? training.signal}
        note={training.note}
      />
      {calories !== null && (
        <AdjustmentRow
          iconName="flame-outline"
          label={calLabel}
          note={calories.note}
        />
      )}
      {steps !== null && (
        <AdjustmentRow
          iconName="footsteps-outline"
          label={stepsLabel}
          note={steps.note}
        />
      )}
      {cardio !== null && (
        <AdjustmentRow
          iconName="bicycle-outline"
          label={cardio.type ?? 'Cardio'}
          note={cardio.note}
        />
      )}
    </View>
  );
}

function WhyBlock({ text }) {
  return (
    <View style={styles.whyBlock}>
      <Text style={styles.whyLabel}>Why this week:</Text>
      <Text style={styles.whyText}>{text}</Text>
    </View>
  );
}

function AmberAlertCard({ title, body, footnote }) {
  return (
    <View style={styles.amberCard}>
      <View style={styles.amberCardHeader}>
        <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
        <Text style={styles.amberCardTitle}>{title}</Text>
      </View>
      <Text style={styles.amberCardBody}>{body}</Text>
      {footnote ? <Text style={styles.amberCardFootnote}>{footnote}</Text> : null}
    </View>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <View style={styles.centred}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Building your weekly prescription…</Text>
    </View>
  );
}

function InsufficientDataView({ dataNote, onClose }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.insufficientIconRow}>
          <Ionicons name="time-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.insufficientTitle}>Building your baseline.</Text>
        <Text style={styles.insufficientBody}>
          {dataNote ??
            'Volyume needs a couple more weeks of data before it can start coaching. Keep logging sessions and your morning weight and we\'ll be ready soon.'}
        </Text>
      </View>
      <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
        <Text style={styles.doneBtnText}>Got it</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachOutputScreen({ navigation, route }) {
  const { weekStart } = route.params ?? {};
  const { user, userProfile, units } = useAppStore();

  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const checkin = await getLatestCheckin(user.id, weekStart);
      const weights = await getMorningWeightsLast14Days(user.id);
      const sessionStats = await getWeeklySessionStats(user.id, weekStart);
      const prs = await getWeeklyPRCount(user.id, weekStart);
      const nutrition = await getNutritionTargets(user.id);

      // Compute weeksInPhase from stored start timestamp
      const phaseStartedAt = userProfile?.phaseStartedAt ?? null;
      const weeksInPhase = phaseStartedAt
        ? Math.max(1, Math.floor((Date.now() - phaseStartedAt) / (7 * 86400000)) + 1)
        : 1;

      // Compute consecutivePoorRecoveryWeeks from recent check-ins
      const recentCheckins = await getRecentCheckins(user.id, 4);
      const consecutivePoorRecoveryWeeks = (() => {
        let count = 0;
        for (const ci of recentCheckins) {
          if ((ci.energyScore ?? 3) <= 2 || (ci.sorenessScore ?? 3) >= 4) count++;
          else break;
        }
        return count;
      })();

      // Compute consecutiveOffTargetWeeks from recent coach outputs
      const lastOutput = await getLatestCoachOutput(user.id);
      const consecutiveOffTargetWeeks = lastOutput?.trend?.onTarget === false
        ? (lastOutput?.consecutiveOffTargetWeeks ?? 0) + 1
        : 0;

      // Last calorie adjustment direction (from previous output)
      const lastCalAdjustmentDirection = lastOutput?.adjustments?.calories?.change
        ? (lastOutput.adjustments.calories.change > 0 ? 'up' : 'down')
        : null;
      const lastCalAdjustmentWeeksAgo = lastCalAdjustmentDirection ? 1 : 99;

      const result = runWeeklyCoach({
        checkin,
        morningWeights: weights,
        sessionsCompleted: sessionStats.completed,
        sessionsPlanned: sessionStats.planned,
        prsThisWeek: prs,
        goalPhase: userProfile?.goalPhase ?? 'maint',
        weeksInPhase,
        consecutiveOffTargetWeeks,
        consecutivePoorRecoveryWeeks,
        lastCalAdjustmentDirection,
        lastCalAdjustmentWeeksAgo,
        currentCalTarget: nutrition?.targetKcal ?? null,
        currentStepsTarget: userProfile?.stepsTarget ?? 8000,
        bodyweightKg: userProfile?.bodyweightKg ?? null,
        units,
      });

      await saveCoachOutput(user.id, { weekStart, ...result });
      setOutput(result);
      setLoading(false);
    }
    load().catch(e => { console.warn(e); setLoading(false); });
  }, []);

  function handleClose() {
    navigation.goBack();
  }

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weekly coaching</Text>
          <View style={styles.headerSpacer} />
        </View>
        <LoadingView />
      </SafeAreaView>
    );
  }

  // ── Insufficient data state ────────────────────────────────────────────────
  if (!output || !output.hasEnoughData) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={handleClose} activeOpacity={0.7}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Weekly coaching</Text>
          <View style={styles.headerSpacer} />
        </View>
        <InsufficientDataView dataNote={output?.dataNote} onClose={handleClose} />
      </SafeAreaView>
    );
  }

  // ── Main card ──────────────────────────────────────────────────────────────
  const {
    weekLabel,
    trend,
    whatWorking,
    adjustments,
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakNote,
    adherenceNote,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
  } = output;

  // Trend chip: arrow icon + colour
  let trendIcon = 'remove-outline';
  let trendColor = colors.textMuted;
  if (trend.delta !== null) {
    if (trend.delta > 0.01) {
      trendIcon = 'arrow-up-outline';
      trendColor = trend.onTarget ? colors.success : colors.error;
    } else if (trend.delta < -0.01) {
      trendIcon = 'arrow-down-outline';
      trendColor = trend.onTarget ? colors.success : colors.error;
    }
  }

  const weightChipValue =
    trend.deltaLabel && trend.delta !== null ? trend.deltaLabel : 'No weights logged';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBack} onPress={handleClose} activeOpacity={0.7}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly coaching</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Week header */}
        <View style={styles.weekHeader}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.weekRange}>{weekRangeLabel(weekStart)}</Text>
        </View>

        {/* 2. Trend chips */}
        <View style={styles.chipsRow}>
          <StatChip
            icon={trendIcon}
            iconColor={trendColor}
            value={weightChipValue}
            valueColor={trend.delta !== null ? trendColor : colors.textMuted}
          />
          <StatChip
            icon="barbell-outline"
            iconColor={colors.primary}
            value={`${sessionsCompleted}/${sessionsPlanned}`}
            label="sessions"
            valueColor={colors.textPrimary}
          />
          {prsThisWeek > 0 && (
            <StatChip
              icon="flash-outline"
              iconColor={colors.warning}
              value={`${prsThisWeek} PR${prsThisWeek !== 1 ? 's' : ''}`}
              valueColor={colors.warning}
            />
          )}
        </View>

        {/* 3. Adherence note */}
        {adherenceNote ? <AdherenceNote note={adherenceNote} /> : null}

        {/* 4. What's working */}
        {whatWorking && whatWorking.length > 0 && (
          <WhatsWorkingCard bullets={whatWorking} />
        )}

        {/* 5. Next week adjustments */}
        <NextWeekCard adjustments={adjustments} />

        {/* 6. Why this week */}
        {whyThisWeek ? <WhyBlock text={whyThisWeek} /> : null}

        {/* 7. Recovery week suggestion */}
        {deloadSuggested && (
          <AmberAlertCard
            title="Recovery week flagged"
            body={deloadNote ?? 'Your body is showing signs that a lighter week would help.'}
            footnote="This is a suggestion. Your call."
          />
        )}

        {/* 8. Maintenance break suggestion */}
        {dietBreakSuggested && (
          <AmberAlertCard
            title="Maintenance break suggested"
            body={dietBreakNote ?? 'A short period at maintenance calories can help reset hunger hormones and improve adherence.'}
            footnote="This is a suggestion. Your call."
          />
        )}

        {/* 9. Done button */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerBack: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 36,
  },

  // Scroll content
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Loading / centred
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Insufficient data
  insufficientIconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  insufficientTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  insufficientBody: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },

  // Week header
  weekHeader: {
    gap: spacing.xs,
  },
  weekLabel: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  weekRange: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  // Stat chips row
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statChipValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  statChipLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },

  // Adherence warning
  adherenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '50',
    padding: spacing.lg,
  },
  adherenceText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.warning,
    lineHeight: 20,
  },

  // Generic card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },

  // Section header label
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },

  // What's working
  whatsWorkingCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success + '40',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  bulletList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  bulletIcon: {
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },

  // Next week adjustments
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  adjustmentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  adjustmentContent: {
    flex: 1,
    gap: 3,
  },
  adjustmentLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  adjustmentNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Why this week
  whyBlock: {
    flexDirection: 'column',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  whyLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  whyText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
    fontStyle: 'italic',
  },

  // Amber alert card (recovery week / maintenance break)
  amberCard: {
    backgroundColor: colors.warningBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '50',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  amberCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amberCardTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.warning,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  amberCardBody: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  amberCardFootnote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
  },

  // Done button (secondary style — surface fill, border, no solid colour)
  doneBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
});
