import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
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
  getOpenEdPatternFlag,
  raiseEdPatternFlag,
  clearEdPatternFlag,
  getCurrentMesocycleWeek,
  getNextMesocycleWeek,
  getPlannedMuscleVolume,
  upsertPlannedMuscleVolume,
  setMesocycleWeekDeload,
  getCardioLogRange,
  activityDayKey,
} from '../lib/database';
import { summariseWeekCardio } from '../lib/cardio/cardioEngine';
import { track as trackEngineEvent } from '../lib/engineTelemetry';
import DifferentialBadge from '../components/DifferentialBadge';
import { SkeletonCard } from '../components/Skeleton';
import { computeEWMA, computeAdaptiveTDEEAdjustment } from '../lib/nutritionEngine';
import { computeCalorieTargets, computeVolumeApply, computeDeloadVolume, computeDietBreakTargets, computeMacroCycle, computeRefeedDay, markApplied, isApplied } from '../lib/coachApply';
import { logError } from '../lib/errorLog';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha } from '../styles/theme';
import {
  ED_PATTERN_LOCKOUT_COPY,
  ED_PATTERN_CLEARED_COPY,
  RAPID_LOSS_CORRECTED_COPY,
  getEdSupportLink,
} from '../lib/whyThisTemplates';

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

/** "19 May to 25 May 2026" */
function weekRangeLabel(weekStartMs) {
  const start = new Date(weekStartMs);
  const end = new Date(weekStartMs + 6 * 24 * 60 * 60 * 1000);
  const startStr = formatDay(start);
  const endStr = formatDayFull(end);
  return `${startStr} to ${endStr}`;
}

// ─── Headline / off-items / focus builders ────────────────────────────────────

function buildHeadline(output, _checkin) {
  if (!output) return '';
  const { trend, weekLabel, adjustments } = output;
  // Calories changed
  if (adjustments?.calories?.applied) {
    return `${weekLabel}. Your calorie target was ${adjustments.calories.change > 0 ? 'raised' : 'lowered'} to ${adjustments.calories.newKcal}.`;
  }
  // On target
  if (trend?.onTarget) {
    return `${weekLabel}. Your weight trend is on target.`;
  }
  // Trend off target but holding
  if (trend?.delta != null && !trend.onTarget) {
    return `${weekLabel}. Your weight trend is off target, so your targets hold for another week of data.`;
  }
  // Default
  return `${weekLabel}.`;
}

function buildOffItems(output, checkin) {
  const items = [];
  if (!output) return items;
  const { sessionsCompleted, sessionsPlanned } = output;
  if (sessionsPlanned > 0 && sessionsCompleted < sessionsPlanned * 0.75) {
    items.push(`You hit ${sessionsCompleted} of ${sessionsPlanned} sessions.`);
  }
  if (checkin?.sleepHours != null && checkin.sleepHours < 6.5) {
    items.push(`Your sleep averaged ${checkin.sleepHours.toFixed(1)} hours.`);
  }
  if (checkin?.jointPain) {
    items.push('You flagged joint pain.');
  }
  if (checkin?.energyScore != null && checkin.energyScore <= 2) {
    items.push('Energy was low this week.');
  }
  if (checkin?.sorenessScore != null && checkin.sorenessScore >= 4) {
    items.push('Soreness was high.');
  }
  if (checkin?.calsAdherence === 'untracked') {
    items.push('You did not log your calories.');
  } else if (checkin?.calsAdherence === 'under') {
    items.push('You came in under your calorie target.');
  } else if (checkin?.calsAdherence === 'over') {
    items.push('You went over your calorie target.');
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
    return 'Sleep is the priority this week. Aim for 7 hours or more. Nothing else moves until it does.';
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
    return 'Track your calories this week. Without that, the calorie target cannot be adjusted reliably.';
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

function AdjustmentRow({ iconName, label, note, applied, onApply, applying }) {
  const showApply = !!onApply && !applied;
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
      {showApply && (
        <TouchableOpacity
          style={[styles.applyBtn, applying && styles.applyBtnBusy]}
          onPress={onApply}
          disabled={applying}
          accessibilityRole="button"
          accessibilityLabel={`Apply: ${label}`}
        >
          <Text style={styles.applyBtnText}>{applying ? 'Applying' : 'Apply'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function NextWeekCard({ adjustments, onApplyCalories, onApplySteps, onApplyCardio, applyingKey }) {
  const { calories, steps, cardio } = adjustments;

  const calLabel =
    calories === null
      ? null
      : calories.change === 0
      ? 'Hold at current target'
      : `${calories.change > 0 ? '+' : ''}${calories.change} kcal`;

  const stepsLabel = steps !== null ? `${steps.target.toLocaleString('en-GB')}/day target` : null;
  // Only an actual change is applyable. "Hold at current target"
  // (change === 0) has nothing to write, so no button.
  const caloriesApplyable = calories !== null && calories.change !== 0 && !calories.applied;

  return (
    <View style={styles.card}>
      <SectionHeader title="Nutrition next week" />
      {calories !== null ? (
        <AdjustmentRow
          iconName="flame-outline"
          label={calories.applied && calories.newKcal ? `${calLabel} → ${calories.newKcal} kcal/day` : calLabel}
          note={calories.note}
          applied={!!calories.applied}
          onApply={caloriesApplyable ? onApplyCalories : undefined}
          applying={applyingKey === 'calories'}
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
          applied={!!steps.applied}
          onApply={steps.target && !steps.applied ? onApplySteps : undefined}
          applying={applyingKey === 'steps'}
        />
      )}
      {cardio !== null && (
        <AdjustmentRow
          iconName="bicycle-outline"
          label={cardio.type ?? 'Cardio'}
          note={cardio.note}
          applied={!!cardio.applied}
          onApply={!cardio.applied ? onApplyCardio : undefined}
          applying={applyingKey === 'cardio'}
        />
      )}
    </View>
  );
}

// Weekly training-volume signal as a confirm-then-apply card. Founder
// decision 2026-05-28: the coach owns weekly volume. Apply spreads the
// signal across every trained muscle in next week's planned volume.
// A zero signal is informational (no button); a non-zero signal with
// no upcoming week to write to (canApply false) shows the guidance but
// no button.
function TrainingNextWeekCard({
  output, onApply, applying, canApply,
  deloadSuggested, deloadNote, onApplyDeload, applyingDeload,
}) {
  const signal = output.volumeSignal ?? 0;
  const applied = isApplied(output, 'training');
  const note = output.adjustments?.training?.note;
  const mag = Math.abs(signal);
  const setWord = mag === 1 ? 'set' : 'sets';
  const label =
    signal > 0 ? `Add ${mag} ${setWord} to each muscle group`
    : signal < 0 ? `Pull back ${mag} ${setWord} per muscle group`
    : 'Hold your current volume';
  const applyable = canApply && signal !== 0 && !applied;

  // When the coach calls a deload, the recovery week IS the training
  // decision, so it replaces the incremental volume row. Applying brings
  // it forward to next week.
  const deloadApplied = isApplied(output, 'deload');

  return (
    <View style={styles.card}>
      <SectionHeader title="Training next week" />
      {deloadSuggested ? (
        <>
          <AdjustmentRow
            iconName="bed-outline"
            label={deloadApplied ? 'Recovery week set for next week' : 'Take a recovery week'}
            note={deloadNote}
            applied={deloadApplied}
            onApply={canApply && !deloadApplied ? onApplyDeload : undefined}
            applying={applyingDeload}
          />
          {!canApply && !deloadApplied && (
            <View style={styles.planNote}>
              <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
              <Text style={styles.planNoteText}>
                Start your next training week to bring the recovery week forward.
              </Text>
            </View>
          )}
        </>
      ) : (
        <>
          <AdjustmentRow
            iconName="barbell-outline"
            label={applied && output.appliedAdjustments?.training?.musclesChanged
              ? `${label} · ${output.appliedAdjustments.training.musclesChanged} updated`
              : label}
            note={note}
            applied={applied}
            onApply={applyable ? onApply : undefined}
            applying={applying}
          />
          <View style={styles.planNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.planNoteText}>
              This sets next week's starting volume. Your plan still fine-tunes each session as you train.
            </Text>
          </View>
        </>
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

function DietBreakCard({ weeksInDeficit, applied, onApply, applying }) {
  return (
    <View style={styles.dietBreakCard}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Text style={styles.dietBreakTitle}>Diet break worth considering</Text>
        {applied && (
          <View style={styles.appliedChip}>
            <Ionicons name="checkmark" size={10} color={colors.success} />
            <Text style={styles.appliedChipText}>Applied</Text>
          </View>
        )}
      </View>
      <Text style={styles.dietBreakBody}>
        {weeksInDeficit >= 8
          ? `You have been in a calorie deficit for ${weeksInDeficit} weeks. `
          : 'You have been in a calorie deficit for over eight weeks. '}
        {'A short diet break, returning to maintenance calories for one to two weeks, can help restore metabolic rate and improve long-term fat loss. Consider taking a break before your next phase.'}
      </Text>
      <Text style={styles.dietBreakFootnote}>
        Based on the MATADOR trial (2017). This is a suggestion, not a requirement.
      </Text>
      {!applied && onApply && (
        <TouchableOpacity
          style={[styles.applyBtn, styles.dietBreakApplyBtn, applying && styles.applyBtnBusy]}
          onPress={onApply}
          disabled={applying}
          accessibilityRole="button"
          accessibilityLabel="Set maintenance calories for a diet break"
        >
          <Text style={styles.applyBtnText}>{applying ? 'Applying' : 'Set maintenance week'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// High-day / low-day carb cycle as a confirm-then-apply card (GAP row
// 6). Shows the training-day and rest-day targets side by side; one
// Apply sets the whole split. Only rendered for advanced cuts and
// physique competitors (the coach gates it). Applying writes the split
// to userProfile.macroCycle, which the Diary reads to show the right
// target for the day.
function MacroCycleCard({ macroCycle, applied, onApply, applying }) {
  const { trainingDay, restDay } = macroCycle;
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <SectionHeader title="Carbs by day" />
        {applied && (
          <View style={[styles.appliedChip, { marginBottom: spacing.xs }]}>
            <Ionicons name="checkmark" size={10} color={colors.success} />
            <Text style={styles.appliedChipText}>Applied</Text>
          </View>
        )}
      </View>
      <View style={styles.macroCycleRow}>
        <View style={styles.macroCycleCol}>
          <Text style={styles.macroCycleColLabel}>Training days</Text>
          <Text style={styles.macroCycleColKcal}>{trainingDay.kcal} kcal</Text>
          <Text style={styles.macroCycleColCarbs}>{trainingDay.carbsG}g carbs</Text>
        </View>
        <View style={styles.macroCycleCol}>
          <Text style={styles.macroCycleColLabel}>Rest days</Text>
          <Text style={styles.macroCycleColKcal}>{restDay.kcal} kcal</Text>
          <Text style={styles.macroCycleColCarbs}>{restDay.carbsG}g carbs</Text>
        </View>
      </View>
      <Text style={styles.adjustmentNote}>{macroCycle.note}</Text>
      {!applied && onApply && (
        <TouchableOpacity
          style={[styles.applyBtn, styles.dietBreakApplyBtn, applying && styles.applyBtnBusy]}
          onPress={onApply}
          disabled={applying}
          accessibilityRole="button"
          accessibilityLabel="Use this training-day and rest-day carb split"
        >
          <Text style={styles.applyBtnText}>{applying ? 'Applying' : 'Use this split'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Refeed day as a confirm-then-apply card (GAP row 7). Shows the
// single-day maintenance target (carbs lifted, protein + fat held) with
// one Apply. Only rendered for aggressive cuts and physique competitors
// on the coach's cadence. Applying schedules it onto the next training
// day via userProfile.refeed, which the Diary reads.
function RefeedCard({ refeed, applied, onApply, applying }) {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <SectionHeader title="Refeed day" />
        {applied && (
          <View style={[styles.appliedChip, { marginBottom: spacing.xs }]}>
            <Ionicons name="checkmark" size={10} color={colors.success} />
            <Text style={styles.appliedChipText}>Applied</Text>
          </View>
        )}
      </View>
      <View style={styles.macroCycleRow}>
        <View style={styles.macroCycleCol}>
          <Text style={styles.macroCycleColLabel}>Refeed target</Text>
          <Text style={styles.macroCycleColKcal}>{refeed.kcal} kcal</Text>
          <Text style={styles.macroCycleColCarbs}>{refeed.carbsG}g carbs</Text>
        </View>
      </View>
      <Text style={styles.adjustmentNote}>{refeed.note}</Text>
      {!applied && onApply && (
        <TouchableOpacity
          style={[styles.applyBtn, styles.dietBreakApplyBtn, applying && styles.applyBtnBusy]}
          onPress={onApply}
          disabled={applying}
          accessibilityRole="button"
          accessibilityLabel="Schedule a refeed on the next training day"
        >
          <Text style={styles.applyBtnText}>{applying ? 'Applying' : 'Schedule refeed'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function HeldDecisionsCard({ decisions, history, onSeeAll }) {
  if (!decisions || decisions.length === 0) return null;
  const edLockout = decisions.find(d => d.type === 'ed_pattern_lockout');
  const edCleared = decisions.find(d => d.type === 'ed_pattern_cleared');
  const rapidLossCorrected = decisions.find(d => d.type === 'rapid_loss_corrected');
  // Filter history entries that have held decisions
  const historyWithHeld = (history ?? []).filter(
    h => h.heldDecisions && h.heldDecisions.length > 0
  );
  // Other decisions render in the standard plain-reason rows; the
  // structured variants (ED-pattern, rapid-loss compression) render
  // in their own rich blocks above.
  const standardDecisions = decisions.filter(
    d => d.type !== 'ed_pattern_lockout' &&
         d.type !== 'ed_pattern_cleared' &&
         d.type !== 'rapid_loss_corrected',
  );
  return (
    <View style={styles.heldCard}>
      {edLockout ? <EdPatternLockoutBlock decision={edLockout} /> : null}
      {edCleared ? <EdPatternClearedBlock /> : null}
      {rapidLossCorrected ? <RapidLossCorrectedBlock decision={rapidLossCorrected} /> : null}
      {standardDecisions.length > 0 ? (
        <>
          <SectionHeader title="What we held this week" />
          {standardDecisions.map((d, i) => (
            <View key={i} style={styles.heldRow}>
              <Ionicons name="pause-circle-outline" size={16} color={colors.textMuted} style={{ marginTop: spacing.xxs }} />
              <Text style={styles.heldText}>{d.reason}</Text>
            </View>
          ))}
        </>
      ) : null}
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
      {onSeeAll ? (
        <TouchableOpacity
          style={styles.heldSeeAll}
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel="See all coaching decisions"
        >
          <Text style={styles.heldSeeAllText}>See all weeks</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function EdPatternLockoutBlock({ decision }) {
  const [showReadMore, setShowReadMore] = useState(false);
  const supportLink = getEdSupportLink(
    // Best-effort locale: Intl.DateTimeFormat reports the device
    // locale. On a phone without an i18n setup we still get a sane
    // default from the helper's fallback chain.
    (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().locale; } catch (_) { return null; }
    })(),
  );
  async function openSupport() {
    try { await Linking.openURL(supportLink.url); } catch (_) {}
  }
  return (
    <View style={styles.edLockoutCard}>
      <Text style={styles.edLockoutHeader}>{ED_PATTERN_LOCKOUT_COPY.header}</Text>
      <Text style={styles.edLockoutTitle}>{ED_PATTERN_LOCKOUT_COPY.title}</Text>
      <Text style={styles.edLockoutBody}>{ED_PATTERN_LOCKOUT_COPY.body}</Text>
      {decision?.goalLockAdvanced ? (
        <Text style={styles.edLockoutBody}>{ED_PATTERN_LOCKOUT_COPY.bodyGoalLockExtension}</Text>
      ) : null}
      {showReadMore ? (
        <View style={styles.edLockoutReadMoreBox}>
          <Text style={styles.edLockoutReadMoreText}>{ED_PATTERN_LOCKOUT_COPY.readMoreBody}</Text>
        </View>
      ) : null}
      <View style={styles.edLockoutCtaRow}>
        <TouchableOpacity onPress={openSupport} style={styles.edLockoutCtaPrimary} accessibilityRole="button">
          <Text style={styles.edLockoutCtaPrimaryText}>
            {ED_PATTERN_LOCKOUT_COPY.ctaSupport} · {supportLink.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowReadMore(v => !v)} style={styles.edLockoutCtaGhost} accessibilityRole="button">
          <Text style={styles.edLockoutCtaGhostText}>
            {showReadMore ? 'Hide' : ED_PATTERN_LOCKOUT_COPY.ctaReadMore}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.edLockoutBottomNote}>{ED_PATTERN_LOCKOUT_COPY.bottomNote}</Text>
    </View>
  );
}

function EdPatternClearedBlock() {
  return (
    <View style={styles.edClearedCard}>
      <Text style={styles.edClearedHeader}>{ED_PATTERN_CLEARED_COPY.header}</Text>
      <Text style={styles.edClearedTitle}>{ED_PATTERN_CLEARED_COPY.title}</Text>
      <Text style={styles.edClearedBody}>{ED_PATTERN_CLEARED_COPY.body}</Text>
    </View>
  );
}

// Move #3: rapid-loss compression structured block. Reuses the
// ed-cleared card style (calm green, not alert red) because the
// engine has already acted: this is reporting the action, not asking
// the user to do anything. The kcal delta on the row makes the
// magnitude explicit so the user sees the size of the change, not
// just that "something happened".
function RapidLossCorrectedBlock({ decision }) {
  const delta = decision?.kcalDelta;
  return (
    <View style={styles.edClearedCard}>
      <Text style={styles.edClearedHeader}>{RAPID_LOSS_CORRECTED_COPY.header}</Text>
      <Text style={styles.edClearedTitle}>{RAPID_LOSS_CORRECTED_COPY.title}</Text>
      <Text style={styles.edClearedBody}>{RAPID_LOSS_CORRECTED_COPY.body}</Text>
      {typeof delta === 'number' && delta > 0 ? (
        <Text style={styles.edClearedBody}>{`Daily target raised by +${delta} kcal.`}</Text>
      ) : null}
    </View>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

function LoadingView() {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <SkeletonCard height={72} />
      <SkeletonCard height={140} />
      <SkeletonCard height={180} />
      <SkeletonCard height={120} />
    </ScrollView>
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
            'Precision Coaching reads your training and weight from day one. It holds calorie and volume changes until it has about two weeks of weigh-ins plus a check-in, so it moves on a real trend rather than one noisy week. Keep logging sessions, your morning weight, and your weekly check-in. The first adjustment lands once the trend is clear.'}
        </Text>
      </View>
      <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
        <Text style={styles.doneBtnText}>Got it</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachOutputScreen({ navigation, route }) {
  const { weekStart } = route.params ?? {};
  const { user, userProfile, units, saveLocalProfile } = useAppStore();

  const [output, setOutput] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [coachHistory, setCoachHistory] = useState([]);
  const [_adaptiveTDEE, setAdaptiveTDEE] = useState(null);
  const [applyingKey, setApplyingKey] = useState(null);
  // Next mesocycle week that a training-volume apply would write to.
  // Loaded once on mount; null when there's no active block or the
  // current week is the last one (nothing to push volume into).
  const [nextTrainingWeekId, setNextTrainingWeekId] = useState(null);

  // Confirm-then-apply: write the suggested calorie change to
  // nutrition_targets only when the user taps Apply, then record it on
  // the coach output so the row flips to "Applied" and can't be applied
  // twice. Current targets are re-read at tap time so we never scale
  // from a stale snapshot.
  async function handleApplyCalories() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'calories')) return;
    setApplyingKey('calories');
    try {
      const current = await getNutritionTargets(user.id);
      const change = output.adjustments?.calories?.change ?? 0;
      const computed = computeCalorieTargets(current, change);
      if (!computed) return;
      await saveNutritionTargets(user.id, computed.targets);
      await AsyncStorage.setItem(
        '@volyume_nutrition_targets', JSON.stringify(computed.targets),
      ).catch(() => {});
      const updated = markApplied(output, 'calories', { newKcal: computed.newKcal });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyCalories', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for the weekly training volume signal (founder
  // decision 2026-05-28: the coach owns weekly volume). Apply spreads
  // the signal across every trained muscle in next week's planned
  // volume, each clamped to its own [mev, mrv]. Source tagged 'coach'
  // so it's distinguishable from the template ramp and the per-session
  // adaptive writes.
  async function handleApplyTraining() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'training')) return;
    const delta = output.volumeSignal ?? 0;
    if (!delta || !nextTrainingWeekId) return;
    setApplyingKey('training');
    try {
      const rows = await getPlannedMuscleVolume(nextTrainingWeekId);
      const changes = computeVolumeApply(rows, delta);
      for (const c of changes) {
        await upsertPlannedMuscleVolume({
          mesocycleWeekId: nextTrainingWeekId,
          muscle: c.muscle,
          plannedSets: c.plannedSets,
          mev: c.mev, mav: c.mav, mrv: c.mrv,
          source: 'coach',
        });
      }
      const updated = markApplied(output, 'training', {
        volumeDelta: delta, musclesChanged: changes.length,
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyTraining', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for the steps target. Writes
  // userProfile.stepsTarget, which is the destination the weekly
  // check-in already consumes: once set, the check-in shows the
  // steps-adherence question (WeeklyCheckInScreen) and that adherence
  // feeds the next coach run. No new surface needed.
  async function handleApplySteps() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'steps')) return;
    const target = output.adjustments?.steps?.target;
    if (!target) return;
    setApplyingKey('steps');
    try {
      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsTarget: target });
      const updated = markApplied(output, 'steps', { target });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplySteps', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for the cardio prescription. Writes
  // userProfile.cardioPrescription (the prescription label), which
  // gates the cardio-adherence question on the weekly check-in
  // (WeeklyCheckInScreen), same pattern as steps. cardio_adherence
  // lands via migration 050.
  async function handleApplyCardio() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'cardio')) return;
    const cardio = output.adjustments?.cardio;
    if (!cardio) return;
    setApplyingKey('cardio');
    try {
      const prescription = cardio.type ?? cardio.note ?? 'prescribed';
      // Keep the string for back-compat (gates the check-in question) and
      // store the structured target so check-in compliance can read the
      // session goal. cardio.target is present from the cardio engine.
      await saveLocalProfile(user.id, {
        ...(userProfile || {}),
        cardioPrescription: prescription,
        ...(cardio.target ? { cardioTarget: cardio.target } : {}),
      });
      const updated = markApplied(output, 'cardio', {});
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyCardio', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for an early deload (founder decision 2026-05-28:
  // "what's done in real life"). Applying brings the recovery week
  // forward: next mesocycle week is flipped to a deload (is_deload, RIR
  // backed off) and its planned volume cut to the floor (source 'coach').
  // ActiveWorkoutScreen reads is_deload off that week to drive the
  // deload prescription (week-1 weight, easy effort) when the user gets
  // there. The block's scheduled final deload stays; the coach
  // re-evaluates each week. blockAdvisor only advises, it never writes,
  // so there is nothing to reconcile against on the write side.
  async function handleApplyDeload() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'deload')) return;
    if (!nextTrainingWeekId) return;
    setApplyingKey('deload');
    try {
      await setMesocycleWeekDeload(nextTrainingWeekId);
      const rows = await getPlannedMuscleVolume(nextTrainingWeekId);
      const changes = computeDeloadVolume(rows);
      for (const c of changes) {
        await upsertPlannedMuscleVolume({
          mesocycleWeekId: nextTrainingWeekId,
          muscle: c.muscle,
          plannedSets: c.plannedSets,
          mev: c.mev, mav: c.mav, mrv: c.mrv,
          source: 'coach',
        });
      }
      const updated = markApplied(output, 'deload', {
        weekId: nextTrainingWeekId, musclesChanged: changes.length,
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyDeload', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for a diet break (founder decision 2026-05-28:
  // maintenance week). Applying raises the deficit back to maintenance
  // (stored tdee) for the week, protein held, fat + carbs scaled. Same
  // destination as the calorie apply (nutrition_targets), so it flows to
  // every diary surface that reads the targets. Re-reads current targets
  // at tap time so it never scales from a stale snapshot.
  async function handleApplyDietBreak() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'dietBreak')) return;
    setApplyingKey('dietBreak');
    try {
      const current = await getNutritionTargets(user.id);
      const computed = computeDietBreakTargets(current);
      if (!computed) return;
      await saveNutritionTargets(user.id, computed.targets);
      await AsyncStorage.setItem(
        '@volyume_nutrition_targets', JSON.stringify(computed.targets),
      ).catch(() => {});
      const updated = markApplied(output, 'dietBreak', { newKcal: computed.newKcal });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyDietBreak', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for the high-day / low-day macro cycle (GAP row
  // 6). Applying stores the split on userProfile.macroCycle, the same
  // local-profile destination steps and cardio write to. The Diary
  // reads it and shows the training-day or rest-day target for the day
  // being viewed. Re-reads current targets at tap time and recomputes
  // so the persisted split never scales from a stale snapshot.
  async function handleApplyMacroCycle() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'macroCycle')) return;
    const trainingDays = output.macroCycle?.trainingDaysPerWeek;
    if (!trainingDays) return;
    setApplyingKey('macroCycle');
    try {
      const current = await getNutritionTargets(user.id);
      const split = computeMacroCycle(current, trainingDays);
      if (!split) return;
      await saveLocalProfile(user.id, {
        ...(userProfile || {}),
        macroCycle: { ...split, appliedAt: Date.now() },
      });
      const updated = markApplied(output, 'macroCycle', {
        trainingDayCarbs: split.trainingDay.carbsG,
        restDayCarbs: split.restDay.carbsG,
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyMacroCycle', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  // Confirm-then-apply for a refeed day (GAP row 7). Applying records
  // the refeed target on userProfile.refeed with the confirm timestamp;
  // the Diary resolves it onto the next training day on or after that
  // timestamp and shows the maintenance / high-carb target there. Same
  // local-profile destination pattern as the macro cycle. Re-reads
  // current targets at tap time so the refeed never scales from a stale
  // snapshot.
  async function handleApplyRefeed() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'refeed')) return;
    setApplyingKey('refeed');
    try {
      const current = await getNutritionTargets(user.id);
      const target = computeRefeedDay(current);
      if (!target) return;
      await saveLocalProfile(user.id, {
        ...(userProfile || {}),
        refeed: {
          ...target,
          frequencyWeeks: output.refeed?.frequencyWeeks ?? null,
          appliedAt: Date.now(),
        },
      });
      const updated = markApplied(output, 'refeed', { kcal: target.kcal, carbsG: target.carbsG });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyRefeed', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

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

      // ED-pattern detector context (Move #2). Build the rolling
      // weekly history from the recent check-ins we already loaded.
      // Each entry: { energy, adherence, hasCheckin, hasFoodData }.
      // Most-recent-first to match the detector's contract.
      const recentWeeklyHistory = recentCheckins.map(ci => ({
        energy: ci.energyScore ?? null,
        adherence: ci.calsAdherence ?? null,
        hasCheckin: true,
        // Food data presence is best-judged at the check-in row:
        // hasFoodData true when calsAdherence was tracked.
        hasFoodData: ci.calsAdherence != null && ci.calsAdherence !== 'untracked',
      }));
      const goalLockAdvanced = !!userProfile?.goalLockAdvanced;
      const openFlag = await getOpenEdPatternFlag(user.id).catch(() => null);
      const edPatternOpen = !!openFlag;

      // Cardio (QA P2/P3/D1): the week's logged sessions vs the applied target,
      // so the coach can escalate/hold from real compliance, flag high load,
      // and acknowledge cardio outside a cut.
      let cardioWeekSummary = null;
      let cardioSessionsLogged = 0;
      try {
        const cardioTo = activityDayKey();
        const cardioFrom = activityDayKey(Date.now() - 6 * 86400000);
        cardioWeekSummary = summariseWeekCardio(await getCardioLogRange(user.id, cardioFrom, cardioTo));
        cardioSessionsLogged = cardioWeekSummary.sessions;
      } catch (_) { /* cardio optional; coach runs without it */ }

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
        currentProteinG: nutrition?.proteinG ?? null,
        currentCarbsG: nutrition?.carbsG ?? null,
        currentFatG: nutrition?.fatG ?? null,
        currentMaintenanceKcal: nutrition?.tdee ?? null,
        lastRefeedAt: userProfile?.refeed?.appliedAt ?? null,
        currentStepsTarget: userProfile?.stepsTarget ?? 8000,
        // Undefined/null means the user never opted out, so default on.
        stepsEnabled: userProfile?.stepsEnabled !== false,
        bodyweightKg: userProfile?.weightKg ?? null,
        units,
        scoffPositive: (userProfile?.scoffScore ?? 0) >= 2,
        recentWeeklyHistory,
        goalLockAdvanced,
        edPatternOpen,
        // Move #4 differential paywall inputs. Tier comes from
        // proGate so paid users (or beta users) skip the trigger.
        // hasUsedTrial is inverted from cascade.canStillTrial; if
        // they still have entitlement, the CTA is "Try free for 7
        // days" (the Play intro offer it routes to) rather than the
        // buy-now variant.
        userTier: require('../lib/proGate').isPaidTier(userProfile),
        hasUsedTrial: !require('../lib/payments/cascade').canStillTrial(userProfile),
        currentCardioTarget: userProfile?.cardioTarget ?? null,
        cardioSessionsLogged,
        cardioWeekSummary,
        cardioEnabled: userProfile?.cardioEnabled !== false,
      });

      // Persist ED-pattern state machine transition + telemetry.
      // Raise on first fire, clear on confirmed clearance.
      try {
        if (result.edPatternFired && !edPatternOpen) {
          await raiseEdPatternFlag(user.id, {
            reason: 'multi-signal harm check',
            signals: result.edPatternSignals,
          });
          await trackEngineEvent(user.id, 'ed_pattern_flag_fired', {
            signals: result.edPatternSignals,
            goalLockAdvanced,
          });
        } else if (result.edPatternClearedThisWeek && edPatternOpen) {
          await clearEdPatternFlag(user.id);
          await trackEngineEvent(user.id, 'ed_pattern_flag_cleared', null);
        }
      } catch (e) {
        logError('CoachOutputScreen.edPatternPersist', e);
      }

      // Move #3 telemetry. Fire once when the rapid-loss compression
      // applies on this run. Idempotent at the row level (per
      // weekStart) because saveCoachOutput de-dupes the parent row,
      // but the engine event itself is allowed to repeat if a user
      // re-opens the weekly card -- the cohort dashboard counts
      // unique user-days, not raw event rows.
      try {
        if (result.rapidLossCorrectionApplied) {
          const heldRow = (result.heldDecisions ?? []).find(
            d => d.type === 'rapid_loss_corrected',
          );
          await trackEngineEvent(user.id, 'rapid_loss_compression_triggered', {
            weekly_loss_pct: heldRow?.weeklyLossPct ?? null,
            energy_score: heldRow?.energyScore ?? null,
            kcal_delta: heldRow?.kcalDelta ?? result.adjustments?.calories?.change ?? null,
            days_compressed: 7,
          });
        }
      } catch (e) {
        logError('CoachOutputScreen.rapidLossTelemetry', e);
      }

      // Per TELEMETRY_DASHBOARDS_LOCKED.md engine events catalogue.
      // weekly_coach_run powers the engine health panel; ffm_floor_hold_fired
      // powers the FFM-floor hold rate alert. Fire-and-forget.
      try {
        trackEngineEvent(user.id, 'weekly_coach_run', {
          held_decisions_count: (result.heldDecisions ?? []).length,
          flags_fired: result.edPatternFired ? ['ed_pattern'] : [],
          ffm_floor_held: !!result.ffmFloorHeld,
          rapid_loss_compression: !!result.rapidLossCorrectionApplied,
          adjustment_magnitude_kcal: result.adjustments?.calories?.change ?? 0,
        }).catch(() => {});
        if (result.ffmFloorHeld) {
          trackEngineEvent(user.id, 'ffm_floor_hold_fired', {
            ffm_floor_kcal: result.ffmFloorContext?.floorKcal ?? null,
            current_intake_avg_kcal: result.ffmFloorContext?.recentIntakeAvgKcal ?? null,
          }).catch(() => {});
        }
      } catch (e) {
        logError('CoachOutputScreen.engineTelemetry', e);
      }

      // Calorie changes are no longer auto-applied. Per founder
      // direction (GAP rows 3-7, 2026-05-28) every coach adjustment is
      // confirm-then-apply: the suggestion is surfaced with an Apply
      // button and only writes to nutrition_targets when the user taps.
      // See handleApplyCalories below.
      await saveCoachOutput(user.id, { weekStart, ...result });

      setOutput(result);

      // Resolve the week a training-volume apply would write to: the
      // week after the current one in the active mesocycle. Null when
      // there's no active block or the current week is the last (no
      // upcoming week to push volume into) -- the Apply button hides.
      try {
        const cur = await getCurrentMesocycleWeek(user.id);
        const next = cur?.id ? await getNextMesocycleWeek(cur.id) : null;
        setNextTrainingWeekId(next?.id ?? null);
      } catch (_e) {
        setNextTrainingWeekId(null);
      }

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
    // Re-run when user.id flips from null → real (post-auth bootstrap)
    // so the screen doesn't get stuck in "no data" if the auth race lost.
    if (!user?.id) {
      setLoading(false);
      return;
    }
    load().catch(e => {
      logError('CoachOutputScreen.load', e, { userId: user?.id });
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function handleClose() {
    // The user arrived here from the You tab via WeeklyCheckIn. Closing
    // the coach output should land them back on the You root, not on the
    // WeeklyCheckIn screen they just submitted. Both screens sit in the
    // same Profile stack, so popToTop is the right primitive: You
    // (YouScreen) is the stack root.
    navigation.popToTop();
  }

  // Replace the navigator-provided back chevron's default goBack with
  // the same Hub-bound handler so the back arrow and the in-screen
  // "Got it" button behave consistently.
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 16, right: 16 }} style={{ paddingHorizontal: spacing.md }} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  // ── Insufficient data state ────────────────────────────────────────────────
  if (!output || !output.hasEnoughData) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right']}>
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
    cardioFlag,
    cardioAcknowledgement,
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakWeeksInDeficit,
    macroCycle,
    refeed,
    heldDecisions,
    rapidWeightLossFlag,
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

  // Share the week as a single milestone card. Facts only (sessions, weight
  // trend, PRs); no bodyweight figure or private data leaves the device.
  function handleShareWeek() {
    const stats = [];
    if (prsThisWeek > 0) {
      stats.push({ value: String(prsThisWeek), label: prsThisWeek === 1 ? 'new PR' : 'new PRs' });
    }
    if (trend.delta !== null && weightChipValue && weightChipValue !== 'No weights logged') {
      stats.push({ value: weightChipValue, label: 'weight trend' });
    }
    navigation.navigate('ShareCard', {
      milestoneData: {
        eyebrow: 'This week',
        title: weekLabel || 'This week',
        heroValue: sessionsPlanned > 0 ? `${sessionsCompleted}/${sessionsPlanned}` : String(sessionsCompleted),
        heroUnit: 'sessions',
        caption: '',
        stats,
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Week header */}
        <View style={styles.weekHeader}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.weekRange}>{weekRangeLabel(weekStart)}</Text>
        </View>

        {/* 1. Headline, one sentence */}
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

        {/* Share the week as a milestone card */}
        <TouchableOpacity
          style={styles.shareWeekBtn}
          onPress={handleShareWeek}
          accessibilityRole="button"
          accessibilityLabel="Share this week"
        >
          <Ionicons name="share-outline" size={15} color={colors.textSecondary} />
          <Text style={styles.shareWeekText}>Share this week</Text>
        </TouchableOpacity>

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
        <TrainingNextWeekCard
          output={output}
          onApply={handleApplyTraining}
          applying={applyingKey === 'training'}
          canApply={!!nextTrainingWeekId}
          deloadSuggested={deloadSuggested}
          deloadNote={deloadNote}
          onApplyDeload={handleApplyDeload}
          applyingDeload={applyingKey === 'deload'}
        />
        <NextWeekCard
          adjustments={adjustments}
          onApplyCalories={handleApplyCalories}
          onApplySteps={handleApplySteps}
          onApplyCardio={handleApplyCardio}
          applyingKey={applyingKey}
        />

        {/* P3: cardio recovery caution (one line, advisory, no Apply). */}
        {cardioFlag ? (
          <View style={styles.cardioNoteRow}>
            <Ionicons name="heart-outline" size={14} color={colors.warning} />
            <Text style={styles.cardioNoteText}>{cardioFlag}</Text>
          </View>
        ) : null}
        {/* D1: light acknowledgement of cardio logged outside a cut. */}
        {cardioAcknowledgement ? (
          <View style={styles.cardioNoteRow}>
            <Ionicons name="heart-outline" size={14} color={colors.primary} />
            <Text style={styles.cardioNoteText}>{cardioAcknowledgement}</Text>
          </View>
        ) : null}

        {/* High-day / low-day carb cycle, advanced cuts + competitors only */}
        {macroCycle && (
          <MacroCycleCard
            macroCycle={macroCycle}
            applied={isApplied(output, 'macroCycle') || !!userProfile?.macroCycle}
            onApply={handleApplyMacroCycle}
            applying={applyingKey === 'macroCycle'}
          />
        )}

        {/* Refeed day, aggressive cuts + competitors only, on cadence */}
        {refeed && (
          <RefeedCard
            refeed={refeed}
            applied={isApplied(output, 'refeed')}
            onApply={handleApplyRefeed}
            applying={applyingKey === 'refeed'}
          />
        )}

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

        {/* Rapid weight loss safety flag, only if relevant */}
        {rapidWeightLossFlag && <RapidLossAlert />}

        {/* Diet break, only if relevant */}
        {dietBreakSuggested && (
          <DietBreakCard
            weeksInDeficit={dietBreakWeeksInDeficit}
            applied={isApplied(output, 'dietBreak')}
            onApply={handleApplyDietBreak}
            applying={applyingKey === 'dietBreak'}
          />
        )}

        {/* Recent decisions, quieter, at the bottom */}
        {heldDecisions && heldDecisions.length > 0 && (
          <HeldDecisionsCard
            decisions={heldDecisions}
            history={coachHistory}
            onSeeAll={() => navigation.navigate('CoachHeldHistory')}
          />
        )}

        {/* Move #4 differential paywall, only renders for free-tier
            users where 2-of-3 adherence is off-target AND one of the
            six locked triggers fires. Paid users never see it. */}
        {output?.differential_output?.shown && (
          <DifferentialBadge
            differential={output.differential_output}
            pricingWindow={userProfile?.lockedInPriceTier ?? 'open_beta'}
            pricingPriceText={null}
            onTapCta={(action) => {
              if (action === 'shown') {
                trackEngineEvent(user?.id, 'paywall_shown', {
                  surface: `differential_${output.differential_output.trigger}`,
                  trigger: output.differential_output.trigger,
                  user_pricing_window: userProfile?.lockedInPriceTier ?? 'open_beta',
                }).catch(() => {});
              } else if (action === 'pay') {
                navigation.navigate('Paywall', {
                  trigger: output.differential_output.trigger,
                  ctaMode: output.differential_output.paywall_cta,
                  pricingWindow: userProfile?.lockedInPriceTier ?? 'open_beta',
                });
              } else if (action === 'dismiss') {
                trackEngineEvent(user?.id, 'paywall_tapped_cta', {
                  surface: `differential_${output.differential_output.trigger}`,
                  cta: 'dismiss',
                }).catch(() => {});
              }
            }}
          />
        )}

        {/* Done button */}
        <TouchableOpacity style={styles.doneBtn} onPress={handleClose} activeOpacity={0.8} accessibilityRole="button">
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>

        <Text style={styles.credentialNote}>
          Precision Coaching™ is built on published training science: volume landmarks, autoregulation, and RED-S safety limits, configured to your data.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardioNoteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  cardioNoteText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Scroll content
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  // Insufficient data
  insufficientIconRow: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  shareWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
  },
  shareWeekText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
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
    borderColor: withAlpha(colors.success, 0.251),
    padding: spacing.lg,
    gap: spacing.sm,
  },
  whatsOffCard: {
    backgroundColor: colors.warningBg ?? colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.warning, 0.251),
    padding: spacing.lg,
    gap: spacing.sm,
  },
  focusCard: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, 0.251),
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
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: withAlpha(colors.success ?? colors.primary, 0.314),
  },
  appliedChipText: {
    fontSize: fontSize.micro, fontWeight: fontWeight.bold,
    color: colors.success ?? colors.primary, letterSpacing: 0.4,
  },
  adjustmentNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  applyBtn: {
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 84,
    alignItems: 'center',
  },
  applyBtnBusy: { opacity: 0.6 },
  applyBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  dietBreakApplyBtn: { alignSelf: 'flex-start', marginTop: spacing.md },

  // Carb cycle (row 6): training-day vs rest-day targets side by side
  macroCycleRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  macroCycleCol: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  macroCycleColLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  macroCycleColKcal: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  macroCycleColCarbs: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
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

  // Done button (secondary style, surface fill, border, no solid colour)
  doneBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  doneBtnText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.background,
  },
  credentialNote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 17,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },

  // Rapid weight loss safety flag
  rapidLossCard: {
    backgroundColor: colors.errorBg ?? colors.warningBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.error, 0.314),
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
  edLockoutCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  edLockoutHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.warning,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  edLockoutTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  edLockoutBody: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 21,
  },
  edLockoutReadMoreBox: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  edLockoutReadMoreText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  edLockoutCtaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  edLockoutCtaPrimary: {
    flex: 1,
    minWidth: 140,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  edLockoutCtaPrimaryText: {
    color: colors.background,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.sm,
  },
  edLockoutCtaGhost: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  edLockoutCtaGhostText: {
    color: colors.textSecondary,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
  },
  edLockoutBottomNote: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  edClearedCard: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.success,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  edClearedHeader: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  edClearedTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  edClearedBody: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 21,
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
  heldSeeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  heldSeeAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
