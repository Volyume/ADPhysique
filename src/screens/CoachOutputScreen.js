import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useAppStore from '../store/useAppStore';
import { runWeeklyCoach } from '../lib/weeklyCoach';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLatestCheckin,
  getRecentCheckins,
  getMorningWeightsLast14Days,
  getMorningWeights,
  getWeeklySessionStats,
  getWeeklyPRCount,
  getNutritionTargets,
  saveNutritionTargets,
  saveCoachOutput,
  getLatestCoachOutput,
  getCoachOutputHistory,
} from '../lib/database';
import { computeEWMA, computeAdaptiveTDEEAdjustment } from '../lib/nutritionEngine';
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

// ─── Headline / off-items / focus builders ────────────────────────────────────

function buildHeadline(output, checkin) {
  if (!output) return '';
  const { trend, weekLabel, adjustments } = output;
  // Calories changed
  if (adjustments?.calories?.applied) {
    return `${weekLabel}. Calories ${adjustments.calories.change > 0 ? 'raised' : 'lowered'} to ${adjustments.calories.newKcal}.`;
  }
  // On target
  if (trend?.onTarget) {
    return `${weekLabel}. On target.`;
  }
  // Trend off target but holding
  if (trend?.delta != null && !trend.onTarget) {
    return `${weekLabel}. Trend off target — holding for another read.`;
  }
  // Default
  return `${weekLabel}.`;
}

function buildOffItems(output, checkin) {
  const items = [];
  if (!output) return items;
  const { sessionsCompleted, sessionsPlanned } = output;
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned * 0.75) {
    items.push(`Sessions ${sessionsCompleted}/${sessionsPlanned}.`);
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    items.push(`Sleep averaged ${checkin.sleepHours.toFixed(1)}h.`);
  }
  if (checkin?.jointPain) {
    items.push('Joint pain flagged.');
  }
  if (checkin?.energyScore != null && checkin.energyScore <= 2) {
    items.push('Energy was low this week.');
  }
  if (checkin?.sorenessScore != null && checkin.sorenessScore >= 4) {
    items.push('Soreness was high.');
  }
  if (checkin?.calsAdherence === 'untracked') {
    items.push('Calories were not tracked.');
  } else if (checkin?.calsAdherence === 'under' || checkin?.calsAdherence === 'over') {
    items.push(`Calorie target ${checkin.calsAdherence}-shot.`);
  }
  return items;
}

function buildFocus(output, checkin) {
  if (!output) return null;
  const { sessionsCompleted, sessionsPlanned, trend } = output;
  // Priority: thin data → log
  if (!trend?.delta && trend?.deltaLabel === 'Log morning weight') {
    return 'Log morning weight every day. The trend gets sharper with each log.';
  }
  // Sleep is the biggest single lever
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    return 'Sleep. Aim for 7h+ this week — nothing else moves until this does.';
  }
  // Sessions
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned) {
    return `Hit all ${sessionsPlanned} sessions. Adherence beats everything else.`;
  }
  // Joint pain
  if (checkin?.jointPain) {
    return 'Reduce load on the painful joint. Substitute exercises if needed.';
  }
  // Adherence
  if (checkin?.calsAdherence === 'untracked') {
    return 'Track calories this week. Without it, no kcal adjustment is reliable.';
  }
  if (checkin?.calsAdherence === 'over') {
    return 'Stay inside the calorie target.';
  }
  // On track default
  return 'Keep doing what you did this week.';
}

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
      <SectionHeader title="What's working" />
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

function AdjustmentRow({ iconName, label, note, applied }) {
  return (
    <View style={styles.adjustmentRow}>
      <View style={styles.adjustmentIconWrap}>
        <Ionicons name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={styles.adjustmentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Text style={styles.adjustmentLabel}>{label}</Text>
          {applied && (
            <View style={styles.appliedChip}>
              <Ionicons name="checkmark" size={10} color={colors.success} />
              <Text style={styles.appliedChipText}>Applied</Text>
            </View>
          )}
        </View>
        {note ? <Text style={styles.adjustmentNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

function NextWeekCard({ adjustments }) {
  const { calories, steps, cardio } = adjustments;

  const calLabel =
    calories === null
      ? null
      : calories.change === 0
      ? 'Hold at current target'
      : `${calories.change > 0 ? '+' : ''}${calories.change} kcal`;

  const stepsLabel = steps !== null ? `${steps.target.toLocaleString('en-GB')}/day target` : null;

  return (
    <View style={styles.card}>
      <SectionHeader title="Nutrition next week" />
      {calories !== null ? (
        <AdjustmentRow
          iconName="flame-outline"
          label={calories.applied && calories.newKcal ? `${calLabel} → ${calories.newKcal} kcal/day` : calLabel}
          note={calories.note}
          applied={!!calories.applied}
        />
      ) : (
        <AdjustmentRow
          iconName="flame-outline"
          label="Calories held"
          note="No change needed this week."
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
      <View style={styles.planNote}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
        <Text style={styles.planNoteText}>
          Training volume and recovery weeks are adjusted automatically by your plan after each session — your coach focuses on nutrition.
        </Text>
      </View>
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

function RapidLossAlert() {
  return (
    <View style={styles.rapidLossCard}>
      <View style={styles.rapidLossHeader}>
        <Ionicons name="warning-outline" size={18} color={colors.error} />
        <Text style={styles.rapidLossTitle}>Weight dropping quickly</Text>
      </View>
      <Text style={styles.rapidLossBody}>
        Your weight is falling more than 1.5% of your bodyweight per week and your energy is low. Losing at this rate risks losing muscle alongside fat and makes training harder. Consider eating a little more this week.
      </Text>
    </View>
  );
}

function DietBreakCard({ weeksInDeficit }) {
  return (
    <View style={styles.dietBreakCard}>
      <Text style={styles.dietBreakTitle}>Diet break worth considering</Text>
      <Text style={styles.dietBreakBody}>
        {weeksInDeficit >= 8
          ? `You have been in a calorie deficit for ${weeksInDeficit} weeks. `
          : 'You have been in a calorie deficit for over eight weeks. '}
        {'A short diet break — returning to maintenance calories for one to two weeks — can help restore metabolic rate and improve long-term fat loss. Consider taking a break before your next phase.'}
      </Text>
      <Text style={styles.dietBreakFootnote}>
        Based on the MATADOR trial (2017). This is a suggestion, not a requirement.
      </Text>
    </View>
  );
}

function ConfidencePill({ confidence }) {
  if (!confidence || confidence === 'high') return null;
  const label = confidence === 'data_hold'
    ? 'Not enough data yet, holding the plan'
    : 'Limited data this week, holding the plan';
  return (
    <View style={styles.confidencePill}>
      <Ionicons name="time-outline" size={13} color={colors.textMuted} />
      <Text style={styles.confidencePillText}>{label}</Text>
    </View>
  );
}

function HeldDecisionsCard({ decisions, history }) {
  if (!decisions || decisions.length === 0) return null;
  // Filter history entries that have held decisions
  const historyWithHeld = (history ?? []).filter(
    h => h.heldDecisions && h.heldDecisions.length > 0
  );
  return (
    <View style={styles.heldCard}>
      <SectionHeader title="What we held this week" />
      {decisions.map((d, i) => (
        <View key={i} style={styles.heldRow}>
          <Ionicons name="pause-circle-outline" size={16} color={colors.textMuted} style={{ marginTop: spacing.xxs }} />
          <Text style={styles.heldText}>{d.reason}</Text>
        </View>
      ))}
      {historyWithHeld.length > 0 ? (
        <View style={styles.heldHistoryShelf}>
          <Text style={styles.heldHistoryTitle}>PREVIOUS WEEKS</Text>
          {historyWithHeld.map((entry, i) => (
            <View
              key={i}
              style={[
                styles.heldHistoryEntry,
                i === historyWithHeld.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={styles.heldHistoryDate}>{weekRangeLabel(entry.weekStart)}</Text>
              {entry.heldDecisions.map((d, j) => (
                <Text key={j} style={styles.heldHistoryText}>{d.reason}</Text>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.heldHistoryShelf}>
          <Text style={styles.heldHistoryEmptyText}>
            Your held-decision history will appear here as weeks pass.
          </Text>
        </View>
      )}
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
      <Text style={styles.loadingText}>Pulling together your Precision Coaching…</Text>
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
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachHistory, setCoachHistory] = useState([]);
  const [adaptiveTDEE, setAdaptiveTDEE] = useState(null);

  useEffect(() => {
    async function load() {
      const checkin = await getLatestCheckin(user.id, weekStart);
      setCheckin(checkin);
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
        trainingGoal: userProfile?.trainingGoal ?? null,
        weeksInPhase,
        goalStartDate: userProfile?.goalStartDate ?? null,
        consecutiveOffTargetWeeks,
        consecutivePoorRecoveryWeeks,
        lastCalAdjustmentDirection,
        lastCalAdjustmentWeeksAgo,
        currentCalTarget: nutrition?.targetKcal ?? null,
        currentStepsTarget: userProfile?.stepsTarget ?? 8000,
        bodyweightKg: userProfile?.weightKg ?? null,
        units,
        scoffPositive: (userProfile?.scoffScore ?? 0) >= 2,
      });

      await saveCoachOutput(user.id, { weekStart, ...result });

      // Auto-apply calorie adjustment. Protein stays the same (priority macro);
      // fat and carbs scale with kcal change so the deficit/surplus math holds.
      try {
        const calChange = result.adjustments?.calories?.change ?? 0;
        if (calChange && nutrition?.targetKcal) {
          const newKcal = Math.max(1200, nutrition.targetKcal + calChange);
          const ratio = newKcal / nutrition.targetKcal;
          const newTargets = {
            targetKcal: newKcal,
            proteinG: nutrition.proteinG ?? null,
            fatG: nutrition.fatG ? Math.round(nutrition.fatG * ratio) : nutrition.fatG ?? null,
            carbsG: nutrition.carbsG ? Math.round(nutrition.carbsG * ratio) : nutrition.carbsG ?? null,
            maintenanceKcal: nutrition.maintenanceKcal ?? null,
          };
          await saveNutritionTargets(user.id, newTargets);
          await AsyncStorage.setItem('@volyume_nutrition_targets', JSON.stringify(newTargets)).catch(() => {});
          result.adjustments.calories.applied = true;
          result.adjustments.calories.newKcal = newKcal;
        }
      } catch (e) {
        console.warn('Auto-apply calories failed:', e);
      }

      setOutput(result);

      // Load the last 5 outputs; skip the first (current week) for the history shelf
      const history = await getCoachOutputHistory(user.id, 5);
      setCoachHistory(history.slice(1, 5));

      // Compute adaptive TDEE insight from long-term morning weight history
      try {
        const morningWeights = await getMorningWeights(user.id, 90);
        const weightPoints = morningWeights
          .filter(m => m.weightKg)
          .sort((a, b) => a.loggedAt - b.loggedAt)
          .map(m => ({ date: m.loggedAt, weightKg: m.weightKg }));
        if (weightPoints.length >= 14) {
          const ewma = computeEWMA(weightPoints);
          const prescribedKcal = userProfile?.targetCalories || userProfile?.targetKcal || 2500;
          const currentTDEE = userProfile?.tdeeEstimate || prescribedKcal;
          const tdeeResult = computeAdaptiveTDEEAdjustment({
            ewmaData: ewma,
            prescribedKcal,
            currentTDEEEstimate: currentTDEE,
            adherenceFactor: 1.0,
          });
          setAdaptiveTDEE(tdeeResult);
        }
      } catch (e) {
        console.warn('Adaptive TDEE computation skipped:', e);
      }

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
          <TouchableOpacity style={styles.headerBack} onPress={handleClose} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Precision Coaching</Text>
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
          <TouchableOpacity style={styles.headerBack} onPress={handleClose} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Precision Coaching</Text>
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
    dietBreakWeeksInDeficit,
    heldDecisions,
    rapidWeightLossFlag,
    adherenceNote,
    confidence,
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
        <TouchableOpacity style={styles.headerBack} onPress={handleClose} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Precision Coaching</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Week header */}
        <View style={styles.weekHeader}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.weekRange}>{weekRangeLabel(weekStart)}</Text>
        </View>

        {/* 1. Headline — one sentence */}
        <Text style={styles.headline}>{buildHeadline(output, checkin)}</Text>

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

        {/* 3. What went well */}
        {whatWorking && whatWorking.length > 0 && (
          <WhatsWorkingCard bullets={whatWorking} />
        )}

        {/* 4. What was off */}
        {(() => {
          const offItems = buildOffItems(output, checkin);
          if (offItems.length === 0) return null;
          return (
            <View style={styles.whatsOffCard}>
              <SectionHeader title="What was off" />
              <View style={styles.bulletList}>
                {offItems.map((item, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons name="remove" size={15} color={colors.warning} style={styles.bulletIcon} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* 5. The decision */}
        <NextWeekCard adjustments={adjustments} />

        {/* 6. Why */}
        {whyThisWeek ? <WhyBlock text={whyThisWeek} /> : null}

        {/* 7. One focus for next week */}
        {(() => {
          const focus = buildFocus(output, checkin);
          if (!focus) return null;
          return (
            <View style={styles.focusCard}>
              <Text style={styles.focusLabel}>Focus this week</Text>
              <Text style={styles.focusText}>{focus}</Text>
            </View>
          );
        })()}

        {/* Rapid weight loss safety flag — only if relevant */}
        {rapidWeightLossFlag && <RapidLossAlert />}

        {/* Diet break — only if relevant */}
        {dietBreakSuggested && (
          <DietBreakCard weeksInDeficit={dietBreakWeeksInDeficit} />
        )}

        {/* Recent decisions — quieter, at the bottom */}
        {heldDecisions && heldDecisions.length > 0 && (
          <HeldDecisionsCard decisions={heldDecisions} history={coachHistory} />
        )}

        {/* Done button */}
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
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 0.2,
    marginBottom: spacing.xs,
  },

  // What's working
  headline: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  whatsWorkingCard: {
    backgroundColor: colors.successBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.success + '40',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  whatsOffCard: {
    backgroundColor: colors.warningBg ?? colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  focusCard: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary + '40',
    padding: spacing.lg,
    gap: spacing.xs,
  },
  focusLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  focusText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    lineHeight: 22,
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
    marginTop: spacing.xxs,
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
    gap: spacing.xxs,
  },
  adjustmentLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  appliedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.successBg ?? colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 2,
    borderWidth: 1, borderColor: (colors.success ?? colors.primary) + '50',
  },
  appliedChipText: {
    fontSize: 10, fontWeight: fontWeight.bold,
    color: colors.success ?? colors.primary, letterSpacing: 0.4,
  },
  adjustmentNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Why this week
  planNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  planNoteText: {
    flex: 1, fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 17,
  },
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

  // Diet break card
  dietBreakCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  dietBreakTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  dietBreakBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  dietBreakFootnote: {
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

  // Rapid weight loss safety flag
  rapidLossCard: {
    backgroundColor: colors.errorBg ?? colors.warningBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.error + '50',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rapidLossHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rapidLossTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.error,
    letterSpacing: 0.3,
  },
  rapidLossBody: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 21,
  },

  // Held decisions transparency card
  heldCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  heldText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  heldHistoryShelf: { marginTop: spacing.md },
  heldHistoryTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
  },
  heldHistoryEntry: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  heldHistoryDate: { fontSize: fontSize.xs, color: colors.textMuted },
  heldHistoryText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  heldHistoryEmptyText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Confidence pill (medium/low/data_hold only — hidden at high)
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: colors.surface2 ?? colors.surface,
    borderRadius: radius.full ?? 99,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  confidencePillText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },

  // Adaptive TDEE insight card
  adaptiveTDEECard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  adaptiveTDEETitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  adaptiveTDEEBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  adaptiveTDEEAdjust: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  adaptiveTDEENote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
