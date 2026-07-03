import { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { runWeeklyCoach, mapCalsAdherence } from '../lib/weeklyCoach';
import { buildHoldReceipt } from '../lib/coachLedger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getLatestCheckin,
  getRecentCheckins,
  getMorningWeights,
  getWeeklySessionStats,
  getWeeklyPRCount,
  getBestLiftThisWeek,
  getNutritionTargets,
  saveNutritionTargets,
  getUserBodyProfile,
  getBodyMetricLog,
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
  getDailyStepsRange,
  activityDayKey,
  getActivePeakWeekPlan,
} from '../lib/database';
import { isCompetitionGoal } from '../lib/coachingGoals';
import { contestCountdown, parseShowDate } from '../lib/contestCountdown';
import { summariseWeekCardio, cardioVerdictLabel } from '../lib/cardio/cardioEngine';
import { getRecentIntakeSummary } from '../lib/food/db';
import { localWeekStartMs, localDayKey } from '../lib/dayKey';
import { track as trackEngineEvent } from '../lib/engineTelemetry';
// NAV-4 (founder decision): the differential paywall no longer renders here.
// Its only audience is the free tier, which withProGuard keeps out of this
// screen, so the render was dead. It now lives in HomeScreen's banner stack.
import { SkeletonCard } from '../components/Skeleton';
import { computeEWMA, computeAdaptiveTDEEAdjustment } from '../lib/nutritionEngine';
import { computeCalorieTargets, computeVolumeApply, computeDeloadVolume, computeDietBreakTargets, computeMacroCycle, computeRefeedDay, markApplied, isApplied } from '../lib/coachApply';
// A1 (NU-3/4/6): pure display classifiers + row strings for honest Apply rows.
// They only CALL coachApply's real policy functions; nothing is recomputed.
import {
  classifyCalorieApply,
  classifyMacroCycleApply,
  floorHoldLine,
  floorClampLine,
  macroCycleHoldLine,
  preTapTargetLine,
  signedEnergyChange,
} from '../lib/coachApplyView';
// NU-6: every energy figure this screen renders honours the kJ display
// preference, as the food domain already does. Engine values stay kcal.
import { formatEnergy, energyUnitLabel } from '../lib/format';
import { applyCoachAdjustmentToActivePlan, planNextWeek } from '../lib/food/mealPlanService';
import { buildPlanEditNarration } from '../lib/food/planExplain';
import { buildRegisteredCoachResponse, resolveRegister } from '../lib/coachRegister';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import {
  cancelMorningNotification,
  scheduleMorningWeightNotification,
  scheduleEveningWeightReminder,
} from '../lib/notifications';
import { logError, logWarn } from '../lib/errorLog';
import CollapsibleSection from '../components/CollapsibleSection';
import Card from '../components/Card';
// M4 (audit 03b §3.3b): the Apply rows ride the Button primitive's
// idle → loading → success morph; the settle wrappers below animate the
// swap into the settled row state (Applied chip, or the NU-3 hold line).
import Button from '../components/Button';
import Reanimated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { selectCoachOutputZones } from '../lib/coachOutputZones';
import { isGreatWeek } from '../lib/shareCard/greatWeek';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, stateColors, type, motion } from '../styles/theme';
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

// For the five-part response's forward-pull anchor ("See you Sunday."),
// indexed by the stored check-in day (0 = Sunday, matching HomeScreen).
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
  const startMs = Number(weekStartMs);
  if (!Number.isFinite(startMs)) return 'Week dates unavailable';
  const start = new Date(startMs);
  const end = new Date(startMs + 6 * 24 * 60 * 60 * 1000);
  const startStr = formatDay(start);
  const endStr = formatDayFull(end);
  return `${startStr} to ${endStr}`;
}

// ─── Off-items / focus builders ───────────────────────────────────────────────
// (U-B-3 §4: the local buildHeadline duplicate was removed, the engine
// coachResponse acknowledgement/interpretation is the single narration lead.)

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
  } else if (checkin?.calsAdherence === 'no') {
    // Off target but no food-diary data to say which way (mapCalsAdherence
    // leaves a plain 'no' when it can't split under/over).
    items.push('You were off your calorie target.');
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
  if (checkin?.calsAdherence === 'over' || checkin?.calsAdherence === 'no') {
    return 'Stay inside the calorie target.';
  }
  // On track default
  return 'Keep doing what you did this week.';
}

// NU-8: one-line captions for the engine's data-confidence grade
// ('data_hold' never reaches the main card; it renders InsufficientDataView).
const CONFIDENCE_CAPTIONS = {
  high: 'Confidence: high. A full week of data sits behind this decision.',
  medium: 'Confidence: medium. Some data was thin this week, so changes are sized cautiously.',
  low: 'Confidence: low. The trend is still building, so this week stays conservative.',
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

// A1 (03 gap #1): the working/off ledger. One object, two groups; the exact
// content the separate "What's working" card and "What was off" block carried.
function LedgerCard({ working, off }) {
  const hasWorking = working && working.length > 0;
  const hasOff = off && off.length > 0;
  if (!hasWorking && !hasOff) return null;
  return (
    <Card style={styles.card}>
      {hasWorking ? (
        <View>
          <SectionHeader title="What worked" />
          <View style={styles.bulletList}>
            {working.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="checkmark" size={15} color={colors.success} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
      {hasOff ? (
        <View>
          <SectionHeader title="What was off" />
          <View style={styles.bulletList}>
            {off.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Ionicons name="remove" size={15} color={colors.warning} style={styles.bulletIcon} />
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

// M4 settle wrappers (audit 03b §3.3b). ApplyExit fades the Apply button
// out when it unmounts (to the Applied chip, or to a hold line) and never
// animates on mount, so screen load stays still. HoldEnter fades the NU-3
// hold line in ONLY when it arrives from a tap (`live`); a pre-tap hold
// rendered at load is static. Both self-gate on reduce motion and fall back
// to a plain View if the builders are unavailable (AnimatedRow's defensive
// shape), so they can never break the screen.
function ApplyExit({ children, style }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  if (reduceMotion) return <View style={style}>{children}</View>;
  try {
    return (
      <Reanimated.View exiting={FadeOut.duration(motion.exit)} style={style}>
        {children}
      </Reanimated.View>
    );
  } catch (_) {
    return <View style={style}>{children}</View>;
  }
}

function HoldEnter({ live, children }) {
  const reduceMotion = useAppStore(s => s.accessibility?.reduceMotion);
  if (reduceMotion || !live) return <View>{children}</View>;
  try {
    return (
      <Reanimated.View entering={FadeIn.duration(motion.enter)}>
        {children}
      </Reanimated.View>
    );
  } catch (_) {
    return <View>{children}</View>;
  }
}

// A1 one-amber rule: `emphasis` marks the hero decision row (verdict-size
// label + the screen's ONE amber-filled Apply); every other row's Apply is
// the quiet outline variant. `detail` is the NU-4 pre-tap absolute/duration
// line; `holdNote` (NU-3) renders INSTEAD of the button when the computation
// would write nothing, so an Apply can never end in silence, `holdArrived`
// marks a tap-time hold so only that settle animates. `applyState` drives
// the Button morph; while it is 'success' the button stays mounted through
// its checkmark beat (the row is already applied underneath, so the chip
// waits for onApplySettled to avoid saying "Applied" twice at once).
function AdjustmentRow({
  iconName, label, note, detail, holdNote, holdArrived, applied,
  onApply, applyState = 'idle', onApplySettled, emphasis,
}) {
  const settling = applyState === 'success';
  const showApply = (!!onApply && !applied && !holdNote) || settling;
  return (
    <View style={styles.adjustmentRow}>
      <View style={styles.adjustmentIconWrap}>
        <Ionicons name={iconName} size={18} color={colors.primary} />
      </View>
      <View style={styles.adjustmentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Text style={emphasis ? styles.adjustmentLabelHero : styles.adjustmentLabel}>{label}</Text>
          {applied && !settling && (
            <View style={styles.appliedChip}>
              <Ionicons name="checkmark" size={10} color={colors.success} />
              <Text style={styles.appliedChipText}>Applied</Text>
            </View>
          )}
        </View>
        {note ? <Text style={styles.adjustmentNote}>{note}</Text> : null}
        {detail ? <Text style={styles.adjustmentDetail}>{detail}</Text> : null}
        {holdNote && !applied ? (
          <HoldEnter live={holdArrived}>
            <Text style={styles.adjustmentHold}>{holdNote}</Text>
          </HoldEnter>
        ) : null}
      </View>
      {showApply && (
        <ApplyExit style={styles.applySlot}>
          <Button
            title="Apply"
            variant={emphasis ? 'primary' : 'outline'}
            size="sm"
            fullWidth={false}
            state={applyState}
            onSettled={onApplySettled}
            onPress={onApply}
            style={styles.applyPill}
            accessibilityLabel={`Apply: ${label}`}
          />
        </ApplyExit>
      )}
    </View>
  );
}

// NU-4: the header drops the old "next week" claim (the write is indefinite);
// the calorie row states the post-tap absolute and honest duration BEFORE the
// tap. NU-3: a floor-held computation renders its reason instead of a button.
function NextWeekCard({
  adjustments, onApplyCalories, onApplySteps, onApplyCardio,
  applyStateFor, onApplySettled,
  energyUnit, caloriePreview, calorieNotice, hero, heroRow,
  cardioVerdict,
}) {
  const { calories, steps, cardio } = adjustments;

  const calLabel =
    calories === null
      ? null
      : calories.change === 0
      ? 'Hold at current target'
      : signedEnergyChange(calories.change, energyUnit);

  const stepsLabel = steps !== null ? `${steps.target.toLocaleString('en-GB')}/day target` : null;
  // NU-3: the floor hold (pre-tap classification) or a tap-time notice
  // replaces the button; the row explains itself instead of no-opping.
  const calorieHold = caloriePreview?.kind === 'floor_hold'
    ? floorHoldLine(caloriePreview.floorKcal, energyUnit)
    : (calorieNotice ?? null);
  // NU-4: the pre-tap absolute + duration; on a partial clamp the figure is
  // the clamped one, named as the safe minimum. After a clamped apply the
  // row keeps saying what actually landed (NU-3 partial-clamp wording).
  const calorieDetail = calories?.applied
    ? (calories.clampedToFloor && calories.newKcal ? floorClampLine(calories.newKcal, energyUnit) : null)
    : ((caloriePreview?.kind === 'ok' || caloriePreview?.kind === 'floor_clamp')
        ? preTapTargetLine(caloriePreview.newKcal, energyUnit, { clampedToFloor: caloriePreview.kind === 'floor_clamp' })
        : null);
  // Only an actual change is applyable. "Hold at current target"
  // (change === 0) has nothing to write, so no button.
  const caloriesApplyable = calories !== null && calories.change !== 0 && !calories.applied && !calorieHold;

  return (
    <Card style={styles.card} elevated={hero} tone={hero ? 'primary' : undefined}>
      <SectionHeader title="Nutrition" />
      {calories !== null ? (
        <AdjustmentRow
          iconName="flame-outline"
          label={calories.applied && calories.newKcal
            ? `${calLabel} → ${formatEnergy(calories.newKcal, energyUnit)} ${energyUnitLabel(energyUnit)}/day`
            : calLabel}
          note={calories.note}
          detail={calorieDetail}
          holdNote={calorieHold}
          holdArrived={!!calorieNotice}
          applied={!!calories.applied}
          onApply={caloriesApplyable ? onApplyCalories : undefined}
          applyState={applyStateFor('calories')}
          onApplySettled={() => onApplySettled('calories')}
          emphasis={hero && heroRow === 'calories'}
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
          applyState={applyStateFor('steps')}
          onApplySettled={() => onApplySettled('steps')}
          emphasis={hero && heroRow === 'steps'}
        />
      )}
      {cardio !== null && (
        <AdjustmentRow
          iconName="bicycle-outline"
          label={cardio.type ?? 'Cardio'}
          // Wave A B9: last week's compliance verdict (an existing pure
          // helper, previously computed and never rendered) leads the note,
          // so the dose visibly follows from what actually happened.
          note={cardioVerdict
            ? `Last week: ${cardioVerdictLabel(cardioVerdict)}. ${cardio.note ?? ''}`.trim()
            : cardio.note}
          applied={!!cardio.applied}
          onApply={!cardio.applied ? onApplyCardio : undefined}
          applyState={applyStateFor('cardio')}
          onApplySettled={() => onApplySettled('cardio')}
        />
      )}
    </Card>
  );
}

// Weekly training-volume signal as a confirm-then-apply card. Founder
// decision 2026-05-28: the coach owns weekly volume. Apply spreads the
// signal across every trained muscle in next week's planned volume.
// A zero signal is informational (no button); a non-zero signal with
// no upcoming week to write to (canApply false) shows the guidance but
// no button.
function TrainingNextWeekCard({
  output, onApply, canApply, applyStateFor, onApplySettled,
  deloadSuggested, deloadNote, onApplyDeload, hero,
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
    <Card style={styles.card} elevated={hero} tone={hero ? 'primary' : undefined}>
      <SectionHeader title="Training next week" />
      {deloadSuggested ? (
        <>
          <AdjustmentRow
            iconName="bed-outline"
            label={deloadApplied ? 'Recovery week set for next week' : 'Take a recovery week'}
            note={deloadNote}
            applied={deloadApplied}
            onApply={canApply && !deloadApplied ? onApplyDeload : undefined}
            applyState={applyStateFor('deload')}
            onApplySettled={() => onApplySettled('deload')}
            emphasis={hero}
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
            applyState={applyStateFor('training')}
            onApplySettled={() => onApplySettled('training')}
            emphasis={hero}
          />
          <View style={styles.planNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.planNoteText}>
              This sets next week's starting volume. Your plan still fine-tunes each session as you train.
            </Text>
          </View>
        </>
      )}
    </Card>
  );
}

function WhyBlock({ text, onLearnMore }) {
  return (
    <View style={styles.whyBlock}>
      <Text style={styles.whyLabel}>Why this week:</Text>
      <Text style={styles.whyText}>{text}</Text>
      {/* COMP-006: every why can be explained. A quiet link to the methodology
          page; always present, not conditional on the decision type. */}
      {onLearnMore ? (
        <TouchableOpacity
          style={styles.link44}
          onPress={onLearnMore}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Understand how this decision was made"
        >
          <Text style={styles.whyLearnMore}>Understand how this decision was made</Text>
        </TouchableOpacity>
      ) : null}
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

// NU-4: the button drops the old "week" claim (the write has no expiry) and
// the card states the post-tap absolute + honest duration before the tap.
// NU-3: a tap-time null renders its reason (notice) instead of silence.
function DietBreakCard({ weeksInDeficit, applied, onApply, applyState, onApplySettled, energyUnit, previewKcal, notice, hero }) {
  const settling = applyState === 'success';
  return (
    <Card style={styles.dietBreakCard} elevated={hero} tone={hero ? 'primary' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Text style={hero ? styles.dietBreakTitleHero : styles.dietBreakTitle}>Diet break worth considering</Text>
        {applied && !settling && (
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
      {!applied && previewKcal != null ? (
        <Text style={styles.adjustmentDetail}>{preTapTargetLine(previewKcal, energyUnit)}</Text>
      ) : null}
      {!applied && notice ? (
        <HoldEnter live>
          <Text style={styles.adjustmentHold}>{notice}</Text>
        </HoldEnter>
      ) : null}
      {((!applied && onApply && !notice) || settling) && (
        <ApplyExit style={styles.applySlotStart}>
          <Button
            title="Set maintenance calories"
            variant={hero ? 'primary' : 'outline'}
            size="sm"
            fullWidth={false}
            state={applyState}
            onSettled={onApplySettled}
            onPress={onApply}
            style={styles.applyPill}
            accessibilityLabel="Set maintenance calories for a diet break"
          />
        </ApplyExit>
      )}
    </Card>
  );
}

// High-day / low-day carb cycle as a confirm-then-apply card (GAP row
// 6). Shows the training-day and rest-day targets side by side; one
// Apply sets the whole split. Only rendered for advanced cuts and
// physique competitors (the coach gates it). Applying writes the split
// to userProfile.macroCycle, which the Diary reads to show the right
// target for the day.
function MacroCycleCard({ macroCycle, applied, onApply, applyState, onApplySettled, energyUnit, holdNote, holdArrived }) {
  const { trainingDay, restDay } = macroCycle;
  const unitLabel = energyUnitLabel(energyUnit);
  const settling = applyState === 'success';
  return (
    <Card style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <SectionHeader title="Carbs by day" />
        {applied && !settling && (
          <View style={[styles.appliedChip, { marginBottom: spacing.xs }]}>
            <Ionicons name="checkmark" size={10} color={colors.success} />
            <Text style={styles.appliedChipText}>Applied</Text>
          </View>
        )}
      </View>
      <View style={styles.macroCycleRow}>
        <View style={styles.macroCycleCol}>
          <Text style={styles.macroCycleColLabel}>Training days</Text>
          <Text style={styles.macroCycleColKcal}>{formatEnergy(trainingDay.kcal, energyUnit)} {unitLabel}</Text>
          <Text style={styles.macroCycleColCarbs}>{trainingDay.carbsG}g carbs</Text>
        </View>
        <View style={styles.macroCycleCol}>
          <Text style={styles.macroCycleColLabel}>Rest days</Text>
          <Text style={styles.macroCycleColKcal}>{formatEnergy(restDay.kcal, energyUnit)} {unitLabel}</Text>
          <Text style={styles.macroCycleColCarbs}>{restDay.carbsG}g carbs</Text>
        </View>
      </View>
      <Text style={styles.adjustmentNote}>{macroCycle.note}</Text>
      {!applied && holdNote ? (
        <HoldEnter live={holdArrived}>
          <Text style={styles.adjustmentHold}>{holdNote}</Text>
        </HoldEnter>
      ) : null}
      {((!applied && onApply && !holdNote) || settling) && (
        <ApplyExit style={styles.applySlotStart}>
          <Button
            title="Use this split"
            variant="outline"
            size="sm"
            fullWidth={false}
            state={applyState}
            onSettled={onApplySettled}
            onPress={onApply}
            style={styles.applyPill}
            accessibilityLabel="Use this training-day and rest-day carb split"
          />
        </ApplyExit>
      )}
    </Card>
  );
}

// Refeed day as a confirm-then-apply card (GAP row 7). Shows the
// single-day maintenance target (carbs lifted, protein + fat held) with
// one Apply. Only rendered for aggressive cuts and physique competitors
// on the coach's cadence. Applying schedules it onto the next training
// day via userProfile.refeed, which the Diary reads.
function RefeedCard({ refeed, applied, onApply, applyState, onApplySettled, energyUnit, holdNote }) {
  const settling = applyState === 'success';
  return (
    <Card style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <SectionHeader title="Refeed day" />
        {applied && !settling && (
          <View style={[styles.appliedChip, { marginBottom: spacing.xs }]}>
            <Ionicons name="checkmark" size={10} color={colors.success} />
            <Text style={styles.appliedChipText}>Applied</Text>
          </View>
        )}
      </View>
      <View style={styles.macroCycleRow}>
        <View style={styles.macroCycleCol}>
          <Text style={styles.macroCycleColLabel}>Refeed target</Text>
          <Text style={styles.macroCycleColKcal}>{formatEnergy(refeed.kcal, energyUnit)} {energyUnitLabel(energyUnit)}</Text>
          <Text style={styles.macroCycleColCarbs}>{refeed.carbsG}g carbs</Text>
        </View>
      </View>
      <Text style={styles.adjustmentNote}>{refeed.note}</Text>
      {/* NU-4: this write is genuinely one day (the Diary resolves it onto the
          single next training day), so the duration says exactly that. Gated
          on the absence of the failure notice (holdNote) so "Applies to your
          next training day only." never stacks under "nothing was applied". */}
      {!applied && !holdNote ? (
        <Text style={styles.adjustmentDetail}>Applies to your next training day only.</Text>
      ) : null}
      {!applied && holdNote ? (
        <HoldEnter live>
          <Text style={styles.adjustmentHold}>{holdNote}</Text>
        </HoldEnter>
      ) : null}
      {((!applied && onApply && !holdNote) || settling) && (
        <ApplyExit style={styles.applySlotStart}>
          <Button
            title="Schedule refeed"
            variant="outline"
            size="sm"
            fullWidth={false}
            state={applyState}
            onSettled={onApplySettled}
            onPress={onApply}
            style={styles.applyPill}
            accessibilityLabel="Schedule a refeed on the next training day"
          />
        </ApplyExit>
      )}
    </Card>
  );
}

function HeldDecisionsCard({ decisions, history, onSeeAll, onLearnMore, energyUnit }) {
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
    <Card style={styles.heldCard}>
      {edLockout ? <EdPatternLockoutBlock decision={edLockout} /> : null}
      {edCleared ? <EdPatternClearedBlock /> : null}
      {rapidLossCorrected ? <RapidLossCorrectedBlock decision={rapidLossCorrected} energyUnit={energyUnit} /> : null}
      {standardDecisions.length > 0 ? (
        <>
          <SectionHeader title="What we held this week" />
          {standardDecisions.map((d, i) => (
            <View key={i} style={styles.heldRow}>
              <Ionicons name="pause-circle-outline" size={16} color={colors.textMuted} style={{ marginTop: spacing.xxs }} />
              <Text style={styles.heldText}>{d.reason}</Text>
            </View>
          ))}
          {/* COMP-006: only on standard holds, never alongside the ED-pattern
              or rapid-loss blocks, whose own copy + CTAs must not be diluted. */}
          {onLearnMore ? (
            <TouchableOpacity
              style={styles.heldLearnMore}
              onPress={onLearnMore}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="See how Precision Coaching decides"
            >
              <Text style={styles.heldLearnMoreText}>See how Precision Coaching decides</Text>
            </TouchableOpacity>
          ) : null}
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
    </Card>
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
function RapidLossCorrectedBlock({ decision, energyUnit }) {
  const delta = decision?.kcalDelta;
  return (
    <View style={styles.edClearedCard}>
      <Text style={styles.edClearedHeader}>{RAPID_LOSS_CORRECTED_COPY.header}</Text>
      <Text style={styles.edClearedTitle}>{RAPID_LOSS_CORRECTED_COPY.title}</Text>
      <Text style={styles.edClearedBody}>{RAPID_LOSS_CORRECTED_COPY.body}</Text>
      {/* NU-6: the figure (not the locked copy) honours the kJ preference. */}
      {typeof delta === 'number' && delta > 0 ? (
        <Text style={styles.edClearedBody}>{`Daily target raised by ${signedEnergyChange(delta, energyUnit)}.`}</Text>
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

function InsufficientDataView({ dataNote, receipt, onClose }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.insufficientIconRow}>
          <Ionicons name="time-outline" size={32} color={colors.primary} />
        </View>
        <Text style={styles.insufficientTitle}>Building your baseline.</Text>
        {/* A3 (audit 04 §4): the hold is a decision, so it renders as a full
            receipt, what the coach read, the rule it applied, and the named
            unlock date, not a bare "come back later" panel. The neutral
            (ED-flag) receipt has no rows by construction. */}
        {receipt?.ledger?.rows?.length ? (
          <View style={styles.receiptRows}>
            <Text style={styles.receiptLabel}>{receipt.ledger.title}</Text>
            {receipt.ledger.rows.map((row) => (
              <View key={row.key} style={styles.receiptRow}>
                <Ionicons
                  name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={row.done ? colors.success : colors.textMuted}
                />
                <Text style={styles.receiptRowText}>{row.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={styles.insufficientBody}>
          {receipt?.rule ?? dataNote ??
            'Precision Coaching reads your training and weight from day one. It holds calorie and volume changes until it has about two weeks of weigh-ins plus a check-in, so it moves on a real trend rather than one noisy week. Keep logging sessions, your morning weight, and your weekly check-in. The first adjustment lands once the trend is clear.'}
        </Text>
        {receipt?.unlockLine ? (
          <Text style={styles.receiptUnlock}>{receipt.unlockLine}</Text>
        ) : null}
      </Card>
      <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
        <Text style={styles.doneBtnText}>Got it</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Shown when the coach load itself failed (network down, a cloud read threw).
// Distinct from InsufficientDataView so a transient error never masquerades as
// "you haven't logged enough", it offers a retry instead of a dead end.
function LoadErrorView({ onRetry, onClose }) {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.insufficientIconRow}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={styles.insufficientTitle}>Couldn&apos;t load your coach.</Text>
        <Text style={styles.insufficientBody}>
          Something went wrong fetching this week&apos;s data, usually a
          dropped connection. Your logs are safe. Try again in a moment.
        </Text>
      </Card>
      <TouchableOpacity style={styles.doneBtn} onPress={onRetry} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Try again">
        <Text style={styles.doneBtnText}>Try again</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryBtn} onPress={onClose} activeOpacity={0.8} accessibilityRole="button">
        <Text style={styles.secondaryBtnText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachOutputScreen({ navigation, route }) {
  // Default to the current local week when no week is passed. The weekly
  // "your plan is ready" notification routes here with no params; without this
  // weekStart was undefined, which made getWeeklySessionStats build a NaN
  // window (0 sessions), weekRangeLabel render an Invalid Date, and the screen
  // fall through to the baseline view, the "building baseline" screen the user
  // saw on tapping the notification.
  const weekStart = route.params?.weekStart ?? localWeekStartMs();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, units, saveLocalProfile, tier: storeTier, energyUnit, reduceMotion } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    units: s.units,
    saveLocalProfile: s.saveLocalProfile,
    tier: s.tier,
    // NU-6: kJ display preference, same read as the food domain screens.
    energyUnit: s.accessibility?.energyUnit ?? 'kcal',
    reduceMotion: !!s.accessibility?.reduceMotion,
  })));

  const [output, setOutput] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes a load failure (network/cloud threw) from a genuine
  // not-enough-data result, so a transient error shows a retry instead of the
  // misleading "building your baseline" screen. reloadKey re-runs the effect.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [coachHistory, setCoachHistory] = useState([]);
  const [_adaptiveTDEE, setAdaptiveTDEE] = useState(null);
  const [applyingKey, setApplyingKey] = useState(null);
  // Food-level receipt after a calorie apply edits an active meal plan
  // ({ headline, body, deepLink, floorNote } from planExplain, or null).
  const [planEditNote, setPlanEditNote] = useState(null);
  // Seamless next-week meal setup from the check-in (founder 2026-06-15).
  const [planningWeek, setPlanningWeek] = useState(false);
  // Next mesocycle week that a training-volume apply would write to.
  // Loaded once on mount; null when there's no active block or the
  // current week is the last one (nothing to push volume into).
  const [nextTrainingWeekId, setNextTrainingWeekId] = useState(null);
  // Five-part coach response inputs (Theme A): weigh-ins inside the
  // displayed week, the calm-mode preference, and the check-in day name
  // for the forward-pull anchor. All best-effort; the response renders
  // fewer parts when any are missing.
  const [weighInsThisWeek, setWeighInsThisWeek] = useState(null);
  // A3: the held-decision receipt for the insufficient-data view (null when
  // the coach has enough data).
  const [holdReceipt, setHoldReceipt] = useState(null);
  const [calmMode, setCalmMode] = useState(false);
  const [checkinDayName, setCheckinDayName] = useState(null);
  // U-B-1 §3: the "More adjustments" secondary zone is collapsed by default.
  const [moreOpen, setMoreOpen] = useState(false);
  // A1 (NU-3/NU-4): the current nutrition targets + sex, captured at load so
  // the Apply rows can say BEFORE the tap what the tap would write, and when
  // the ED floor holds or clamps it. Refreshed after any apply that writes
  // nutrition_targets so the other rows re-classify against reality. Display
  // classification only; the tap path still re-reads at tap time.
  const [currentTargets, setCurrentTargets] = useState(null);
  const [profileSex, setProfileSex] = useState(null);
  // NU-3: tap-time explanation when a compute nulls (a stale-suggestion
  // race); keyed by adjustment. An Apply must never end in silence.
  const [applyNotice, setApplyNotice] = useState({});
  // M4 (audit 03b §3.3b): presentational success-beat markers, keyed by
  // adjustment. The DATA truth (markApplied → setOutput) lands immediately,
  // the double-apply guards never wait on animation (fit rule 5); this only
  // keeps the Button mounted through its checkmark beat, after which
  // onSettled clears the key and the row swaps to its Applied chip. A floor
  // hold never sets a marker: holds settle into the NU-3 line, never a
  // success beat. The screen itself calls no haptic vocabulary; the amber
  // hero Apply fires the Button primitive's press-time selection tick (a
  // uniform press acknowledgement, not an outcome signal) and the commit
  // beat only on a real success, a hold reaches neither (03b §3.3f: a
  // safety hold is never a success or error buzz).
  const [applySettling, setApplySettling] = useState({});
  // Settling WINS over loading: once the write has landed and set the marker,
  // the row is 'success' even if the handler still holds applyingKey through a
  // secondary async tail (handleApplyCalories awaits the plan pull-through
  // AFTER markApplied). Without this precedence the row read 'loading' while
  // already applied, so the Button unmounted mid-beat and the Applied chip
  // flashed before the checkmark. The double-apply guard is unaffected: it
  // reads applyingKey/isApplied, not this presentational state.
  const applyStateFor = (key) => (
    applySettling[key] ? 'success' : (applyingKey === key ? 'loading' : 'idle')
  );
  const onApplySettled = (key) => {
    setApplySettling(s => {
      const next = { ...s };
      delete next[key];
      return next;
    });
  };
  // B4: contest countdown state. Visibility rules live in the pure lib
  // (docs/b4-contest-countdown-ed-review): any truthy wellbeing flag,
  // including a 'read_failed' sentinel from a failed read, hides it
  // entirely, so this surface fails CLOSED. Safety holds render above.
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!user?.id || !isCompetitionGoal(userProfile?.trainingGoal)) {
      setCountdown(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const plan = await getActivePeakWeekPlan(user.id).catch(() => null);
      const showDateMs = parseShowDate(plan?.showDate);
      if (showDateMs === null) {
        if (!cancelled) setCountdown(null);
        return;
      }
      const openFlag = await getOpenEdPatternFlag(user.id).catch(() => 'read_failed');
      // Fail closed: read wellbeing raw so a genuine failure is distinguishable
      // from 'unspecified'. getWellbeingMode swallows failures, which would fail
      // OPEN here (calm false -> the countdown shows over a possibly-calm state).
      const wb = await AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed');
      const calm = isCalm(wb) || wb === 'read_failed';
      const state = contestCountdown({
        showDateMs,
        nowMs: Date.now(),
        edPatternOpen: openFlag,
        calmMode: calm,
        scoffPositive: (userProfile?.scoffScore ?? 0) >= 2,
      });
      if (!cancelled) setCountdown(state);
    })();
    return () => { cancelled = true; };
  }, [user?.id, userProfile?.trainingGoal, userProfile?.scoffScore]);

  // Confirm-then-apply: write the suggested calorie change to
  // nutrition_targets only when the user taps Apply, then record it on
  // the coach output so the row flips to "Applied" and can't be applied
  // twice. Current targets are re-read at tap time so we never scale
  // from a stale snapshot.
  async function handleApplyCalories() {
    if (applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'calories')) return;
    setPlanEditNote(null); // clear any stale receipt before re-applying
    setApplyingKey('calories');
    try {
      const current = await getNutritionTargets(user.id);
      const change = output.adjustments?.calories?.change ?? 0;
      // Sex feeds the ED calorie floor (1500 male / 1200 female) in the Apply
      // path, mirroring nutritionEngine. Read the body profile (source of sex);
      // fall back to userProfile.
      const bodyProfile = await getUserBodyProfile(user.id).catch(() => null);
      const sex = bodyProfile?.sex ?? userProfile?.sex ?? null;
      // NU-3: classify against the just-read targets so a null can never end
      // the spinner silently. The floor hold is named as the floor; anything
      // else gets a plain reason. The clamp flag rides into the applied row
      // so a partial write says what actually landed.
      const check = classifyCalorieApply(current, change, sex);
      const computed = computeCalorieTargets(current, change, sex);
      if (!computed) {
        setApplyNotice(n => ({
          ...n,
          calories: check.kind === 'floor_hold'
            ? floorHoldLine(check.floorKcal, energyUnit)
            : 'Nothing to apply right now. Your targets have changed since this was suggested.',
        }));
        return;
      }
      await saveNutritionTargets(user.id, computed.targets);
      await AsyncStorage.setItem(
        '@volyume_nutrition_targets', JSON.stringify(computed.targets),
      ).catch(() => {});
      const updated = markApplied(output, 'calories', {
        newKcal: computed.newKcal,
        ...(check.kind === 'floor_clamp' ? { clampedToFloor: true } : {}),
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
      setCurrentTargets(computed.targets);
      setApplySettling(s => ({ ...s, calories: true }));

      // If the user is on a generated meal plan, pull the same calorie
      // change THROUGH the plan at the food level and show the coach
      // saying what moved (the transparent-coach moat, at the gram of
      // rice). Floor-clamped inside the service; silent when off-plan.
      try {
        // C1: the plan-edit narration follows the same register resolution as
        // the five-part response (tone preference wins, automatic falls back
        // to experience), so the coach never mixes tones on one screen.
        const register = resolveRegister({
          coachTone: userProfile?.coachTone ?? 'automatic',
          experienceLevel: userProfile?.experienceLevel ?? null,
          trainingAgeYears: userProfile?.trainingAgeYears ?? null,
        });
        const { change: planChange } = await applyCoachAdjustmentToActivePlan(user.id, { adjustmentKcal: change });
        const narration = buildPlanEditNarration(planChange, { register });
        setPlanEditNote(narration);
      } catch (e) {
        // Off-plan is the common, silent case; but a real persist failure
        // should be observable rather than vanish.
        logError('CoachOutputScreen.applyPlanEdit', e, { userId: user?.id });
      }
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
      setApplySettling(s => ({ ...s, training: true }));
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
      setApplySettling(s => ({ ...s, steps: true }));
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
      setApplySettling(s => ({ ...s, cardio: true }));
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
      setApplySettling(s => ({ ...s, deload: true }));
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
      const bodyProfile = await getUserBodyProfile(user.id).catch(() => null);
      const sex = bodyProfile?.sex ?? userProfile?.sex ?? null;
      const computed = computeDietBreakTargets(current, sex);
      if (!computed) {
        // NU-3: never a silent no-op. A diet-break null means there is no
        // deficit left to raise (the floor cannot block an increase).
        setApplyNotice(n => ({
          ...n,
          dietBreak: 'Nothing to raise. Your target already sits at or above maintenance.',
        }));
        return;
      }
      await saveNutritionTargets(user.id, computed.targets);
      await AsyncStorage.setItem(
        '@volyume_nutrition_targets', JSON.stringify(computed.targets),
      ).catch(() => {});
      const updated = markApplied(output, 'dietBreak', { newKcal: computed.newKcal });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
      setCurrentTargets(computed.targets);
      setApplySettling(s => ({ ...s, dietBreak: true }));
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
      // F3 (EN-2): sex drives the per-day floor inside computeMacroCycle, the
      // same read the calorie Apply uses (body profile first, profile fallback).
      const bodyProfile = await getUserBodyProfile(user.id).catch(() => null);
      const sex = bodyProfile?.sex ?? userProfile?.sex ?? null;
      const split = computeMacroCycle(current, trainingDays, { sex });
      if (!split) {
        // NU-3: name the floor when the floor is what refused the split.
        const check = classifyMacroCycleApply(current, trainingDays, sex);
        setApplyNotice(n => ({
          ...n,
          macroCycle: check.kind === 'floor_hold'
            ? macroCycleHoldLine(check.floorKcal, energyUnit)
            : 'This split no longer fits your current targets.',
        }));
        return;
      }
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
      setApplySettling(s => ({ ...s, macroCycle: true }));
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
      if (!target) {
        // NU-3: a refeed null means no deficit to refeed up to. Never silent.
        setApplyNotice(n => ({
          ...n,
          refeed: 'Nothing to schedule. Your target already sits at or above maintenance.',
        }));
        return;
      }
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
      setApplySettling(s => ({ ...s, refeed: true }));
    } catch (e) {
      logError('CoachOutputScreen.handleApplyRefeed', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
    }
  }

  useEffect(() => {
    async function load() {
      const checkin = await getLatestCheckin(user.id, weekStart);
      // COMP-026 (A): the adaptive-TDEE resize needs ~4+ weeks of weight to
      // reach 'high' confidence and size the calorie change from real energy
      // balance instead of the blunt fixed step. A 14-day window capped
      // confidence at 'low', leaving that path dead in production. Widen to a
      // 60-day window; confidence is distinct-calendar-day based
      // (ewmaCoverageWeeks) so the wider fetch can't be gamed by same-day logs.
      const weights = await getMorningWeights(user.id, 60);
      // Weigh-ins inside the displayed week feed the five-part response's
      // acknowledgement and cue. Counted here so the pure builder never
      // needs a DB read.
      try {
        const weekEnd = weekStart + 7 * 86400000;
        setWeighInsThisWeek(weights.filter(w => (w.loggedAt ?? 0) >= weekStart && (w.loggedAt ?? 0) < weekEnd).length);
      } catch (_) { setWeighInsThisWeek(null); }
      // Calm mode tightens the response the same way an open ED flag does
      // (no rate language, no weigh-in counts), per the COMP-004 rules.
      // Fail closed: an unreadable wellbeing read tightens the response (calm),
      // matching the open-ED-flag path; getWellbeingMode swallows failures.
      const wbMode = await AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed');
      setCalmMode(isCalm(wbMode) || wbMode === 'read_failed');
      // Check-in day for the forward-pull anchor; same preference read as
      // HomeScreen. Falls back to "the next check-in" when unset. The numeric
      // day also feeds the A3 hold receipt's unlock date below.
      let checkinDayNum = 0;
      try {
        const rawPrefs = await AsyncStorage.getItem('@volyume_notification_prefs');
        if (rawPrefs) {
          const prefs = JSON.parse(rawPrefs);
          if (Number.isFinite(prefs?.checkinDay)) {
            checkinDayNum = prefs.checkinDay;
            setCheckinDayName(DAY_NAMES_FULL[prefs.checkinDay] ?? null);
          }
        }
      } catch (_) { /* forward line falls back to "the next check-in" */ }
      const sessionStats = await getWeeklySessionStats(user.id, weekStart);
      const prs = await getWeeklyPRCount(user.id, weekStart);
      const nutrition = await getNutritionTargets(user.id);

      // Food intake (trailing 7 days) + body composition feed the calorie
      // safety floor and the adaptive-TDEE sizing. Without these the RED-S
      // FFM floor can never fire and the adherence correction stays neutral.
      const intake = await getRecentIntakeSummary(user.id).catch(() => ({ avgKcal: null, daysLogged: 0 }));
      const bodyProfile = await getUserBodyProfile(user.id).catch(() => null);
      const latestBf = (await getBodyMetricLog(user.id, 60).catch(() => []))
        .find(m => m.bodyFatPercent != null) ?? null;

      // A1 (NU-3/NU-4): keep the just-read targets + sex for the pre-tap
      // Apply-row classification, and clear any stale tap-time notices.
      setCurrentTargets(nutrition ?? null);
      setProfileSex(bodyProfile?.sex ?? userProfile?.sex ?? null);
      setApplyNotice({});

      // ALGO-004: map the check-in's stored calorie answer
      // ('yes'/'no'/'untracked') onto the engine vocabulary via the single
      // shared helper in weeklyCoach, so the persistence and runtime
      // vocabularies can't drift. 'no' splits to under/over from the logged
      // average vs target (so the adherence-sized correction and the
      // differential paywall gate, which only count under/over, actually fire);
      // with no in-app food data it stays a neutral off-target. Done here at the
      // boundary, not in the DB, so the stored value and the frozen build are
      // untouched.
      const mapCals = (raw, avgKcal) => mapCalsAdherence(raw, avgKcal, nutrition?.targetKcal);
      const engineCheckin = checkin
        ? { ...checkin, calsAdherence: mapCals(checkin.calsAdherence, intake.avgKcal) }
        : checkin;
      // NU-1: the narration layer (buildOffItems/buildFocus and the registered
      // coach response) speaks the same engine vocabulary
      // (hit/under/over/untracked), so the MAPPED check-in is what goes into
      // state. Storing the raw 'yes'/'no' row left every calorie branch of the
      // narration dead: "Off target" never appeared in "what was off".
      setCheckin(engineCheckin);

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
      // ALGO-005: real elapsed weeks since the last calorie change, not a binary
      // 1/99. Each saved output carries lastCalAdjustmentWeekStart (the week a
      // change was last applied, carried forward across holds), so the two-week
      // cooldown counts the actual elapsed weeks rather than treating "adjusted
      // last week" and "adjusted ten weeks ago" the same. 99 when no calorie
      // change has ever been recorded.
      const prevCalAdjustmentWeekStart = lastOutput?.lastCalAdjustmentWeekStart ?? null;
      const lastCalAdjustmentWeeksAgo = prevCalAdjustmentWeekStart != null
        ? Math.max(0, Math.round((weekStart - prevCalAdjustmentWeekStart) / (7 * 86400000)))
        : 99;

      // ED-pattern detector context (Move #2). Build the rolling
      // weekly history from the recent check-ins we already loaded.
      // Each entry: { energy, adherence, hasCheckin, hasFoodData }.
      // Most-recent-first to match the detector's contract.
      // PIPE-005: recover the direction (under/over) of each past week's
      // calorie adherence. For every recent check-in week, read that week's own
      // trailing-7-day intake average (anchored to the week-ending day-key) and
      // map a plain 'no' into under/over against the current target. Older weeks
      // are judged against the current target, which is an approximation when
      // the target has since changed, but it recovers the direction the
      // multi-week logic needs instead of dropping it.
      const recentWeeklyHistory = await Promise.all(recentCheckins.map(async (ci) => {
        let weekAvg = null;
        if (ci.weekStart) {
          try {
            const weekEndKey = localDayKey(ci.weekStart + 6 * 86400000);
            const weekIntake = await getRecentIntakeSummary(user.id, weekEndKey);
            weekAvg = weekIntake?.avgKcal ?? null;
          } catch (_) { /* leave null; mapCals keeps a neutral off-target */ }
        }
        return {
          energy: ci.energyScore ?? null,
          adherence: mapCals(ci.calsAdherence, weekAvg),
          hasCheckin: true,
          // Food data presence is best-judged at the check-in row:
          // hasFoodData true when calsAdherence was tracked.
          hasFoodData: ci.calsAdherence != null && ci.calsAdherence !== 'untracked',
        };
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

      // COMP-026 (B): the last ~42 days of daily steps feed the step-trend
      // confidence modifier. Optional; the coach runs unchanged without it.
      let dailyStepsSeries = null;
      const stepsTodayKey = activityDayKey();
      try {
        dailyStepsSeries = await getDailyStepsRange(user.id, activityDayKey(Date.now() - 41 * 86400000), stepsTodayKey);
      } catch (_) { /* steps optional; modifier stays inert (gain 0.50) */ }

      const result = runWeeklyCoach({
        checkin: engineCheckin,
        morningWeights: weights,
        sessionsCompleted: sessionStats.completed,
        sessionsPlanned: sessionStats.planned,
        prsThisWeek: prs,
        // Calorie safety + adherence sizing inputs (food log + body comp).
        recentIntakeAvgKcal: intake.avgKcal,
        recentIntakeDaysLogged: intake.daysLogged,
        bodyFatPercent: latestBf?.bodyFatPercent ?? null,
        bodyFatSource: latestBf?.bodyFatSource ?? null,
        sex: bodyProfile?.sex ?? null,
        // Cardio compliance from the check-in (pre-filled from the log,
        // user-overridable) so the coach acts on it, not just the raw count.
        cardioCompliance: checkin?.cardioAdherence ?? null,
        // COMP-026 (B) step-trend confidence modifier inputs.
        dailyStepsSeries,
        stepsTodayKey,
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
        // Founder decision 2026-07-02 (Wave-3 review): the food-diary
        // stand-in needs a completed check-in within 14 days. Most recent
        // first from getRecentCheckins; created_at is the completion time.
        lastCheckinAt: recentCheckins[0]?.createdAt ?? recentCheckins[0]?.weekStart ?? null,
        goalLockAdvanced,
        edPatternOpen,
        // Move #4 differential paywall inputs. Tier comes from
        // proGate so paid users (or beta users) skip the trigger.
        // hasUsedTrial is inverted from cascade.canStillTrial; if
        // they still have entitlement, the CTA is "Try free for 7
        // days" (the Play intro offer it routes to) rather than the
        // buy-now variant.
        // M-1 (audit): use store.tier (the value every feature gate reads) so
        // the differential-paywall trigger can't disagree with the gates;
        // isPaidTier is the fallback before the store tier has hydrated.
        userTier: storeTier ?? require('../lib/proGate').isPaidTier(userProfile),
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
          // Q1 ED-safety: the flag is raised here in the foreground, so cancel
          // the (now audible) weigh-in prompts immediately. Their weekly
          // triggers are otherwise laid days ahead and would fire in the
          // background, where no delivery handler runs, under the open flag.
          // The schedule gate keeps restoreNotifications from re-laying them.
          try { await cancelMorningNotification(); } catch (_) {}
          await trackEngineEvent(user.id, 'ed_pattern_flag_fired', {
            signals: result.edPatternSignals,
            goalLockAdvanced,
          });
        } else if (result.edPatternClearedThisWeek && edPatternOpen) {
          await clearEdPatternFlag(user.id);
          // Re-lay the weigh-in prompts now the flag has cleared (per the saved
          // morning toggle; both helpers self-guard and self-cancel).
          try {
            const rawPrefs = await AsyncStorage.getItem('@volyume_notification_prefs');
            const prefs = rawPrefs ? JSON.parse(rawPrefs) : null;
            if (prefs?.morningEnabled) {
              await scheduleMorningWeightNotification(prefs.morningHour ?? 7, prefs.morningMinute ?? 0);
              await scheduleEveningWeightReminder(prefs.eveningHour ?? 19, prefs.eveningMinute ?? 30);
            }
          } catch (_) { /* best-effort re-lay */ }
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
        // COMP-026 (B): emit when the step-trend modifier was actually evaluated
        // (steps supplied, not on the rapid-loss path). Flags + buckets only:
        // no step counts, no weight, no PII.
        if (result.stepModifier && result.stepModifier.reason !== 'not_evaluated') {
          trackEngineEvent(user.id, 'step_tdee_modifier_evaluated', {
            active: !!result.stepModifier.active,
            direction: result.stepModifier.direction ?? 0,
            gain: result.stepModifier.gain ?? 0.5,
            reason: result.stepModifier.reason ?? null,
            applied: !!result.stepTrendApplied,
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
      // ALGO-005: carry forward the week a calorie change was last applied, so
      // future runs compute real elapsed weeks. This week's weekStart when a
      // change is applied now; otherwise the value carried from the previous
      // output (or null if none has ever been made).
      const lastCalAdjustmentWeekStart = result.adjustments?.calories?.change
        ? weekStart
        : prevCalAdjustmentWeekStart;
      await saveCoachOutput(user.id, { weekStart, ...result, lastCalAdjustmentWeekStart });

      setOutput(result);

      // T2 (world-class-audit-2026-07-03/05-cohesion.md #4): viewing a real
      // review counts as "seen" even if the user never taps the Home banner's
      // own dismiss control. Reuses the SAME per-week flag the Home banner
      // writes (HomeScreen.js @volyume_coach_banner_dismissed_<weekStart>)
      // rather than a second scheme, so the You-tab badge (which mirrors that
      // same flag into the store) clears the moment this screen actually
      // shows the review. The insufficient-data ("building your baseline")
      // view is not a coach change, so it clears nothing.
      if (result.hasEnoughData) {
        AsyncStorage.setItem(`@volyume_coach_banner_dismissed_${weekStart}`, 'true').catch(() => {});
        useAppStore.getState().setHasUnseenCoachChange(false);
      }

      // A3 (audit 04 §4): when the coach holds for thin data, build the full
      // held-decision receipt, the live counts vs the published thresholds,
      // the rule (the engine's own hold message), and the named unlock date.
      // Neutral (no weigh-in counts) under an open ED flag.
      if (!result.hasEnoughData) {
        try {
          const weekAgoMs = Date.now() - 7 * 86400000;
          const weighIns7d = weights.filter(w => (w.loggedAt ?? 0) >= weekAgoMs).length;
          const earliest = weights.length ? Math.min(...weights.map(w => w.loggedAt ?? Infinity)) : null;
          setHoldReceipt(buildHoldReceipt({
            dataNote: result.dataNote ?? null,
            weighIns7d,
            completedSessions: sessionStats.completed ?? 0,
            firstWeightAt: Number.isFinite(earliest) ? earliest : null,
            checkinDay: checkinDayNum,
            edFlagOpen: edPatternOpen,
          }));
        } catch (_) { setHoldReceipt(null); }
      } else {
        setHoldReceipt(null);
      }

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
        logWarn('CoachOutputScreen.adaptiveTDEE', e?.message);
      }

      setLoading(false);
    }
    // Re-run when user.id flips from null → real (post-auth bootstrap)
    // so the screen doesn't get stuck in "no data" if the auth race lost.
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoadError(false);
    setLoading(true);
    load().catch(e => {
      logError('CoachOutputScreen.load', e, { userId: user?.id });
      // A thrown load is an error, not "no data yet": surface a retry.
      setLoadError(true);
      setLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, reloadKey]);

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
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadingView />
      </SafeAreaView>
    );
  }

  // ── Load error state (retryable) ───────────────────────────────────────────
  if (loadError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <LoadErrorView onRetry={() => setReloadKey(k => k + 1)} onClose={handleClose} />
      </SafeAreaView>
    );
  }

  // ── Insufficient data state ────────────────────────────────────────────────
  if (!output || !output.hasEnoughData) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <InsufficientDataView dataNote={output?.dataNote} receipt={holdReceipt} onClose={handleClose} />
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
    cyclePhaseNote,
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakWeeksInDeficit,
    macroCycle,
    refeed,
    heldDecisions,
    rapidWeightLossFlag,
    confidence,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
  } = output;

  // Trend chip: arrow icon + colour. Class B body-data surface (COMP-027):
  // a body-weight trend never wears red. On target reads onTrack; off target
  // caps at watch (worth a look, not a verdict); under an open ED-pattern
  // flag the chip drops to neutral entirely. The weight numeral itself is
  // always textPrimary (set on the value below), colour lives on the icon.
  const edPatternOpen = !!(heldDecisions?.some(d => d.type === 'ed_pattern_lockout'));
  let trendIcon = 'remove-outline';
  let trendColor = colors.textMuted;
  if (trend.delta !== null && !edPatternOpen) {
    const dirColor = trend.onTarget ? stateColors.onTrack : stateColors.watch;
    if (trend.delta > 0.01) {
      trendIcon = 'arrow-up-outline';
      trendColor = dirColor;
    } else if (trend.delta < -0.01) {
      trendIcon = 'arrow-down-outline';
      trendColor = dirColor;
    }
  } else if (trend.delta !== null) {
    // Flag open: keep the direction arrow, drop the valence colour.
    trendIcon = trend.delta > 0.01 ? 'arrow-up-outline'
      : trend.delta < -0.01 ? 'arrow-down-outline' : 'remove-outline';
  }

  // NU-5: the chip's caption names the number a "7-day trend" (the check-in's
  // vocabulary), so the old "this week" suffix comes off the value here.
  // Display-only; the engine label is untouched.
  const weightChipValue =
    trend.deltaLabel && trend.delta !== null
      ? trend.deltaLabel.replace(/ this week$/, '')
      : 'No weights logged';

  // Five-part coach response (Theme A, OPP-C01/C02/C06), rendered in the
  // user's register (C1, founder decision #2): tone preference wins, else
  // automatic keys off experience. Same facts, same decisions; suppression
  // (open ED flag or calm mode) renders the supportive base untouched.
  const coachResponse = buildRegisteredCoachResponse({
    output,
    checkin,
    history: coachHistory,
    weighInsThisWeek,
    units,
    edFlagOpen: edPatternOpen,
    calmMode,
    checkinDayName,
    weekStartMs: weekStart,
    coachTone: userProfile?.coachTone ?? 'automatic',
    experienceLevel: userProfile?.experienceLevel ?? null,
    trainingAgeYears: userProfile?.trainingAgeYears ?? null,
  });

  // A "great week" (blueprint docs/blueprint-great-week-share-card-2026-06-22.md
  // §5) is the only time we offer the celebratory recap share, and never while
  // any ED-safety signal is open. The CTA below is gated on this.
  const greatWeek = isGreatWeek(output).great;

  // Share the week as the Precision Coaching recap card. The card leads with the
  // real achievement, the weight lost/gained this week and the PRs, built in
  // ShareCardScreen via greatWeek.js. The card only fires on a safe, on-target
  // week, and under `suppress` (open ED flag or calm mode) every number is
  // stripped to the bare consistency wins. Only what the user chooses to share
  // leaves the device.
  async function handleShareWeek() {
    // The standout lift of the week (biggest e1RM gain, else heaviest set) is
    // the card hero. Fetched on demand; a failure just omits the hero.
    let bestLift = null;
    try {
      bestLift = await getBestLiftThisWeek(user.id, weekStart);
      // Gym weights are stored in the user's chosen unit (kg|lbs); carry the
      // label so the card shows the right one.
      if (bestLift) bestLift = { ...bestLift, units: units || 'kg' };
    } catch (e) {
      logError('CoachOutputScreen.handleShareWeek', e, { userId: user?.id });
    }
    navigation.navigate('ShareCard', {
      weeklyRecapData: output,
      bestLift,
      units: units || 'kg',
      suppress: edPatternOpen || calmMode,
    });
  }

  // U-B-1 §3: hero / secondary / safety zoning. The hero is the engine's top
  // applyable decision (output.primary); the rest collapse under "More
  // adjustments"; the safety blocks (rapid-loss, diet-break-as-safety, held)
  // are rendered in an always-visible group below and are NEVER collapsed.
  const zones = selectCoachOutputZones(output, {
    dietBreakSuggested,
    hasMacro: !!macroCycle,
    hasRefeed: !!refeed,
  });

  // A1 (NU-3/NU-4): pre-tap classification of each nutrition apply against
  // the CURRENT targets, so a row the floor would hold explains itself
  // instead of offering a dead button, and every applyable calorie row
  // states the post-tap absolute + duration before the tap. Display only;
  // every tap still re-reads and re-computes via coachApply.
  const caloriePreview = adjustments?.calories && !isApplied(output, 'calories')
    ? classifyCalorieApply(currentTargets, adjustments.calories.change ?? 0, profileSex)
    : null;
  const dietBreakPreviewKcal = dietBreakSuggested && !isApplied(output, 'dietBreak') && currentTargets
    ? (computeDietBreakTargets(currentTargets, profileSex)?.newKcal ?? null)
    : null;
  const macroCyclePreview = macroCycle && !isApplied(output, 'macroCycle')
    ? classifyMacroCycleApply(currentTargets, macroCycle.trainingDaysPerWeek, profileSex)
    : null;

  const trainingCardEl = (
    <TrainingNextWeekCard
      output={output}
      onApply={handleApplyTraining}
      canApply={!!nextTrainingWeekId}
      applyStateFor={applyStateFor}
      onApplySettled={onApplySettled}
      deloadSuggested={deloadSuggested}
      deloadNote={deloadNote}
      onApplyDeload={handleApplyDeload}
      hero={zones.heroKind === 'training'}
    />
  );
  const nutritionCardEl = (
    <NextWeekCard
      adjustments={adjustments}
      onApplyCalories={handleApplyCalories}
      onApplySteps={handleApplySteps}
      onApplyCardio={handleApplyCardio}
      applyStateFor={applyStateFor}
      onApplySettled={onApplySettled}
      cardioVerdict={checkin?.cardioAdherence ?? null}
      energyUnit={energyUnit}
      caloriePreview={caloriePreview}
      calorieNotice={applyNotice.calories ?? null}
      hero={zones.heroKind === 'nutrition'}
      heroRow={output.primary?.domain === 'steps' ? 'steps' : 'calories'}
    />
  );
  const macroCardEl = macroCycle ? (
    <MacroCycleCard
      macroCycle={macroCycle}
      applied={isApplied(output, 'macroCycle') || !!userProfile?.macroCycle}
      onApply={handleApplyMacroCycle}
      applyState={applyStateFor('macroCycle')}
      onApplySettled={() => onApplySettled('macroCycle')}
      energyUnit={energyUnit}
      holdNote={
        macroCyclePreview?.kind === 'floor_hold'
          ? macroCycleHoldLine(macroCyclePreview.floorKcal, energyUnit)
          : (applyNotice.macroCycle ?? null)
      }
      holdArrived={!!applyNotice.macroCycle}
    />
  ) : null;
  const refeedCardEl = refeed ? (
    <RefeedCard
      refeed={refeed}
      applied={isApplied(output, 'refeed')}
      onApply={handleApplyRefeed}
      applyState={applyStateFor('refeed')}
      onApplySettled={() => onApplySettled('refeed')}
      energyUnit={energyUnit}
      holdNote={applyNotice.refeed ?? null}
    />
  ) : null;
  const dietBreakCardEl = dietBreakSuggested ? (
    <DietBreakCard
      weeksInDeficit={dietBreakWeeksInDeficit}
      applied={isApplied(output, 'dietBreak')}
      onApply={handleApplyDietBreak}
      applyState={applyStateFor('dietBreak')}
      onApplySettled={() => onApplySettled('dietBreak')}
      energyUnit={energyUnit}
      previewKcal={dietBreakPreviewKcal}
      notice={applyNotice.dietBreak ?? null}
      hero={zones.heroKind === 'dietBreak'}
    />
  ) : null;
  const CARD_BY_KIND = {
    training: trainingCardEl,
    nutrition: nutritionCardEl,
    macro: macroCardEl,
    refeed: refeedCardEl,
  };
  const heroCardEl = zones.heroKind === 'dietBreak'
    ? dietBreakCardEl
    : (zones.heroKind ? CARD_BY_KIND[zones.heroKind] : null);
  const secondaryEls = zones.secondaryKinds.map(k => CARD_BY_KIND[k]).filter(Boolean);

  const handlePlanNextWeek = async (repeat) => {
    if (!user?.id || planningWeek) return;
    setPlanningWeek(true);
    try {
      const res = await planNextWeek(user.id, userProfile, { repeat });
      if (res?.error === 'no_target') {
        setPlanningWeek(false);
        navigation.navigate('NutritionTargets');
        return;
      }
      // Land on the week plan to swap, get the shopping list, and add the week.
      navigation.navigate('DiaryTab', { screen: 'MealPlan', initial: false });
    } catch (_) {
      setPlanningWeek(false);
    }
  };

  // E9: the weekly reveal is a staged disclosure. Four beats land in
  // sequence on the UI thread: header, the coach's read, the verdict (the
  // hero gets the long beat so the main move lands with weight), then the
  // evidence (chips + ledger). Everything below the ledger renders static;
  // the SAFETY zone and held decisions are deliberately NEVER animated.
  const stage = (i, duration = motion.enter) =>
    reduceMotion ? undefined : FadeInDown.duration(duration).delay(i * motion.micro);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Week header */}
        <Reanimated.View entering={stage(0)} style={styles.weekHeader}>
          <Text style={styles.weekLabel}>{weekLabel}</Text>
          <Text style={styles.weekRange}>{weekRangeLabel(weekStart)}</Text>
        </Reanimated.View>

        {/* U-B-3 §4: the local headline duplicate was dropped, the engine
            coachResponse lead below is the single narration source. */}

        {/* Coach response parts 1 and 2: the specific, data-referenced
            acknowledgement and the plain-language trend read lead the
            card before any decision detail. */}
        {(coachResponse.commitmentAnswer || coachResponse.acknowledgement || coachResponse.interpretation) ? (
          <Reanimated.View
            entering={stage(1)}
            style={styles.coachLeadCard}
            accessible
            accessibilityLabel={[coachResponse.commitmentAnswer, coachResponse.acknowledgement, coachResponse.interpretation].filter(Boolean).join(' ')}
          >
            {/* S1c: last week's pre-commitment, answered. Leads the card, it is
                the "did the coach get it right" payoff that pulls users back. */}
            {coachResponse.commitmentAnswer ? (
              <Text style={styles.coachLeadCommitment}>{coachResponse.commitmentAnswer}</Text>
            ) : null}
            {coachResponse.acknowledgement ? (
              <Text style={styles.coachLeadAck}>{coachResponse.acknowledgement}</Text>
            ) : null}
            {coachResponse.interpretation ? (
              <Text style={styles.coachLeadInterpretation}>{coachResponse.interpretation}</Text>
            ) : null}
          </Reanimated.View>
        ) : null}

        {/* 2. The VERDICT, hero zone (U-B-1 §3 / A1 03 gap #1): the engine's
            single top move (output.primary via the zones), promoted to the top
            of the screen directly after the coach lead. The card renders on
            surfaceElevated with the decision statement at verdict size and the
            screen's ONE amber-filled Apply. When primary.domain is null
            (on-target/holding), no hero shows. */}
        {heroCardEl ? (
          <Reanimated.View entering={stage(2, motion.hero)} style={styles.heroZone}>
            <Text style={styles.heroLabel}>This week&apos;s main move</Text>
            {heroCardEl}
            {/* Wave A B6: the WHY never sits a scroll away from the WHAT. One
                line here; the full WhyBlock further down keeps the detail. */}
            {whyThisWeek ? (
              <Text style={styles.heroWhy}>
                {'Because: '}
                {whyThisWeek.includes('. ') ? whyThisWeek.slice(0, whyThisWeek.indexOf('. ') + 1) : whyThisWeek}
              </Text>
            ) : null}
          </Reanimated.View>
        ) : (
          /* Wave A B6: "hold everything" is a decision too, on a good week
             the strongest one. Non-applyable, never amber (one-amber rule).
             When safety holds are active the copy defers to them rather than
             claiming the plan is simply working. */
          <Reanimated.View entering={stage(2, motion.hero)} style={styles.heroZone}>
            <Text style={styles.heroLabel}>This week&apos;s main move</Text>
            <View style={styles.holdHeroCard}>
              <Text style={styles.holdHeroText}>
                {heldDecisions && heldDecisions.length > 0
                  ? 'Hold steady. The reasons are below.'
                  : 'Change nothing. The plan is working.'}
              </Text>
              {whyThisWeek ? (
                <Text style={styles.heroWhy}>
                  {'Because: '}
                  {whyThisWeek.includes('. ') ? whyThisWeek.slice(0, whyThisWeek.indexOf('. ') + 1) : whyThisWeek}
                </Text>
              ) : null}
            </View>
          </Reanimated.View>
        )}

        {/* 3. Trend chips */}
        <Reanimated.View entering={stage(3)} style={styles.chipsRow}>
          <StatChip
            icon={trendIcon}
            iconColor={trendColor}
            value={weightChipValue}
            // NU-5: the number is a 7-day smoothed trend, the same vocabulary
            // the check-in uses. Never labelled as a plain weekly change.
            label={trend.delta !== null ? '7-day trend' : null}
            // Class B: no colour on a body-weight numeral, ever.
            valueColor={colors.textPrimary}
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
        </Reanimated.View>

        {/* Opt-in "share your week", only on a genuinely great, ED-safe week
            (blueprint §5/§7). Routes through the qualitative, ED-safe recap card. */}
        {greatWeek && (
          /* Wave A B6: a genuinely great, ED-safe week is the emotional peak
             of the loop; it no longer renders at footnote weight. Success
             tint, never amber (one-amber rule). */
          <TouchableOpacity
            style={styles.shareWeekBtn}
            onPress={handleShareWeek}
            accessibilityRole="button"
            accessibilityLabel="Great week. Share it?"
          >
            <Ionicons name="share-outline" size={15} color={colors.success} />
            <Text style={styles.shareWeekText}>Great week. Share it?</Text>
          </TouchableOpacity>
        )}

        {/* 4. The working/off ledger (A1 03 gap #1): the old What's-working
            card and What-was-off block merged into one two-group object.
            Same bullets, same builders, one card. */}
        <Reanimated.View entering={stage(4)}>
          <LedgerCard working={whatWorking} off={buildOffItems(output, checkin)} />
        </Reanimated.View>

        {/* SECONDARY zone (U-B-1 §3): the remaining adjustments, collapsed under
            a "More adjustments (N)" expander. Each card keeps its own Apply +
            "Applied" chip exactly. Hidden entirely when there is nothing here. */}
        {secondaryEls.length > 0 ? (
          <CollapsibleSection
            title={`More adjustments (${secondaryEls.length})`}
            open={moreOpen}
            onToggle={() => setMoreOpen(v => !v)}
          >
            {secondaryEls.map((el, i) => <View key={i}>{el}</View>)}
          </CollapsibleSection>
        ) : null}

        {/* Food-level receipt: when the calorie change edited an active
            meal plan, the coach says what moved, at the gram of rice. */}
        {planEditNote ? (
          <View style={styles.planEditCard} accessibilityRole="summary">
            <Text style={styles.planEditHead}>{planEditNote.headline}</Text>
            <Text style={styles.planEditBody}>{planEditNote.body}</Text>
            {planEditNote.deepLink ? (
              <TouchableOpacity
                style={styles.planEditLink}
                onPress={() => navigation.navigate('DiaryTab', { screen: 'MealPlan', initial: false })}
                accessibilityRole="button"
                accessibilityLabel={planEditNote.deepLink.label}
              >
                <Ionicons name="restaurant-outline" size={14} color={colors.primary} />
                <Text style={styles.planEditLinkText}>{planEditNote.deepLink.label}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Seamless next-week meal setup (founder 2026-06-15): build or repeat
            next week's meals straight from the check-in, then land on the plan
            to swap and get the shopping list. */}
        <View style={styles.planEditCard}>
          <Text style={styles.planEditHead}>Plan next week&apos;s meals</Text>
          <Text style={styles.planEditBody}>
            A full week built to next week&apos;s targets, with a shopping list.
            Swap anything, then add it to your diary.
          </Text>
          <View style={styles.nextWeekRow}>
            <TouchableOpacity
              style={styles.planEditLink}
              onPress={() => handlePlanNextWeek(false)}
              disabled={planningWeek}
              accessibilityRole="button"
              accessibilityLabel="Plan a fresh week of meals"
            >
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={styles.planEditLinkText}>{planningWeek ? 'Building' : 'Fresh week'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.planEditLink}
              onPress={() => handlePlanNextWeek(true)}
              disabled={planningWeek}
              accessibilityRole="button"
              accessibilityLabel="Repeat last week's meals"
            >
              <Ionicons name="repeat-outline" size={14} color={colors.primary} />
              <Text style={styles.planEditLinkText}>Repeat last week</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* P3: cardio recovery caution (one line, advisory, no Apply).
            Wave A B9: caution and acknowledgement no longer share an icon,
            distinguishable at a glance, same quiet register. */}
        {cardioFlag ? (
          <View style={styles.cardioNoteRow}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.warning} />
            <Text style={styles.cardioNoteText}>{cardioFlag}</Text>
          </View>
        ) : null}
        {/* D1: light acknowledgement of cardio logged outside a cut. */}
        {cardioAcknowledgement ? (
          <View style={styles.cardioNoteRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
            <Text style={styles.cardioNoteText}>{cardioAcknowledgement}</Text>
          </View>
        ) : null}
        {/* U4: cycle-phase reassurance for a small period-week water rise
            (advisory, no Apply; only present for a female user who flagged
            their period and shows a water-plausible rise). */}
        {cyclePhaseNote?.note ? (
          <View style={styles.cardioNoteRow}>
            <Ionicons name="water-outline" size={14} color={colors.primary} />
            <Text style={styles.cardioNoteText}>{cyclePhaseNote.note}</Text>
          </View>
        ) : null}

        {/* (Carb-cycle + refeed cards moved into the "More adjustments"
            secondary zone above, U-B-1 §3.) */}

        {/* 6. Why */}
        {whyThisWeek ? <WhyBlock text={whyThisWeek} onLearnMore={() => navigation.navigate('Methodology', { source: 'why_block' })} /> : null}
        {/* NU-8: the engine grades every weekly decision's data confidence
            (assessDataConfidence) and persists it, but it was never surfaced.
            One calm line so the user knows how solid this week's read was. */}
        {CONFIDENCE_CAPTIONS[confidence] ? (
          <Text style={styles.confidenceCaption}>
            {CONFIDENCE_CAPTIONS[confidence]}
            {/* Wave A B6: name WHICH data was thin when it was the weigh-ins.
                No threshold claim here, so this line can never disagree with
                the coachLedger's own gate numbers. */}
            {confidence !== 'high' && weighInsThisWeek != null && weighInsThisWeek < 4
              ? ` Only ${weighInsThisWeek} weigh-in${weighInsThisWeek === 1 ? '' : 's'} landed this week.`
              : ''}
          </Text>
        ) : null}

        {/* 7. One focus for next week. Coach response part 4 (the single
            tactical cue, deterministic priority, ED/calm aware) feeds this
            card; buildFocus stays as the fallback when no cue is built. */}
        {(() => {
          const focus = coachResponse.cue ?? buildFocus(output, checkin);
          if (!focus) return null;
          return (
            <View style={styles.focusCard}>
              <Text style={styles.focusLabel}>Focus this week</Text>
              <Text style={styles.focusText}>{focus}</Text>
            </View>
          );
        })()}

        {/* SAFETY zone (U-B-1 §3): always visible, NEVER collapsed. Rapid-loss
            alert, the diet break when it is a safety block (not the hero), and
            the held-decisions shelf (with its ED/rapid-loss sub-blocks). */}
        {rapidWeightLossFlag && <RapidLossAlert />}
        {zones.dietBreakInSafety ? dietBreakCardEl : null}
        {heldDecisions && heldDecisions.length > 0 && (
          <HeldDecisionsCard
            decisions={heldDecisions}
            history={coachHistory}
            energyUnit={energyUnit}
            onSeeAll={() => navigation.navigate('CoachHeldHistory')}
            onLearnMore={() => navigation.navigate('Methodology', { source: 'held_decisions' })}
          />
        )}

        {/* S1c pre-commitment: the specific, checkable thing next week's read
            will answer, named in advance. Sits with the forward-pull. */}
        {coachResponse.preCommitment ? (
          <Text style={styles.preCommitmentLine}>{coachResponse.preCommitment}</Text>
        ) : null}

        {/* Coach response part 5: the forward-pull anchor closes the response
            below the always-visible safety shelf. */}
        {coachResponse.forward ? (
          <Text style={styles.forwardLine}>{coachResponse.forward}</Text>
        ) : null}

        {/* B4: contest countdown. Deliberately BELOW the safety shelf (rule 1:
            holds outrank the countdown, unchanged) and null under any open
            wellbeing flag (rule 2/5, enforced in the pure lib). Neutral
            styling: never amber (the hero Apply keeps the one-amber rule).
            Process checkpoints only; peak week adds the standard medical
            line (docs/b4-contest-countdown-ed-review-2026-07-02.md). */}
        {countdown ? (
          <View style={styles.countdownCard} accessibilityRole="summary">
            <Text style={styles.countdownLine}>{countdown.line}</Text>
            {countdown.checkpoint ? (
              <>
                <Text style={styles.countdownCheckpointTitle}>{countdown.checkpoint.title}</Text>
                <Text style={styles.countdownCheckpointDetail}>{countdown.checkpoint.detail}</Text>
              </>
            ) : null}
            {countdown.isPeakWeek ? (
              <Text style={styles.countdownDisclaimer}>
                Volyume provides estimates and guidance, not medical advice. Consult a qualified professional before making significant changes to your diet or training.
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* NAV-4 (founder decision): the Move #4 differential paywall used to
            render here, unreachable by its free-tier audience behind
            withProGuard. It now lives in HomeScreen's banner stack. */}

        {/* Wave A B6: the coaching history was only reachable through the
            held-decisions card, so a consistently on-target user never saw a
            route to it. One permanent quiet link. */}
        <TouchableOpacity
          style={styles.historyQuietBtn}
          onPress={() => navigation.navigate('CoachHeldHistory')}
          activeOpacity={0.8}
          accessibilityRole="link"
          accessibilityLabel="Coaching history"
        >
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.historyQuietText}>Coaching history</Text>
        </TouchableOpacity>

        {/* Done: a quiet text action (A1 one-amber rule). The hero Apply is
            the screen's only amber fill. */}
        <TouchableOpacity style={styles.doneQuietBtn} onPress={handleClose} activeOpacity={0.8} accessibilityRole="button">
          <Text style={styles.doneQuietText}>Done</Text>
        </TouchableOpacity>

        <Text style={styles.credentialNote}>
          Precision Coaching™ is built on published training science: volume landmarks, autoregulation, and RED-S safety limits, configured to your data.
        </Text>

        <Text style={styles.credentialNote}>
          Volyume provides estimates and guidance, not medical advice. Consult a qualified professional before making significant changes to your diet or training.
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
  cardioNoteText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  // A1 one-amber rule (03 gap #1 named this card): a static utility card no
  // longer wears the hero's amber border; plain outline, links keep the tint.
  planEditCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.sm, gap: spacing.xs,
  },
  planEditHead: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  planEditBody: { ...type.bodySm, color: colors.textSecondary },
  planEditLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, marginTop: spacing.xs },
  planEditLinkText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.primary },
  nextWeekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
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
  // Wave A B6: success tint on a genuinely great week (never amber; the
  // hero Apply keeps the one-amber rule).
  shareWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 44, // U-B-1 §5: WCAG/iOS touch target
    marginBottom: spacing.md,
    borderRadius: radius.full,
    backgroundColor: withAlpha(colors.success, 0.125),
  },
  shareWeekText: {
    ...type.label,
    color: colors.textPrimary,
  },
  insufficientTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  insufficientBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // A3 held-decision receipt inside the insufficient-data card.
  receiptRows: {
    alignSelf: 'stretch',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  receiptLabel: {
    ...type.caption,
    color: colors.textMuted,
    marginBottom: spacing.xxs,
  },
  receiptRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  receiptRowText: {
    ...type.bodySm, color: colors.textSecondary,
  },
  receiptUnlock: {
    ...type.caption,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginTop: spacing.sm,
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

  // Generic card: box (surface, radius, border, padding) now comes from
  // the <Card> primitive; only the non-box gap remains as a local extra.
  card: {
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

  // A1 verdict (U-B-1 §3 / 03 gap #1): the hero zone is a plain wrapper; the
  // verdict card itself is the elevated object (Card elevated + primary
  // outline). The zone no longer carries an amber tint of its own, so the
  // hero Apply stays the screen's only amber fill.
  heroZone: {
    gap: spacing.xs,
  },
  heroLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.primary,
    paddingHorizontal: spacing.xs,
  },
  // Wave A B6: the one-line why beneath the hero decision.
  heroWhy: {
    ...type.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.xs,
  },
  // Wave A B6: the hold-week hero, a verdict card with no Apply and no
  // amber; the same elevated surface the applyable hero uses.
  holdHeroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  holdHeroText: {
    ...type.h3,
    color: colors.textPrimary,
  },
  // Five-part coach response: parts 1+2 lead card and the part 5
  // forward-pull line. Same tokens as the surrounding cards.
  coachLeadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  coachLeadAck: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  // S1c: the answered pre-commitment, leading the card. Emphasised but never
  // verdict-coloured (no green/red reward or shame; the one-amber rule holds).
  coachLeadCommitment: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  coachLeadInterpretation: {
    ...type.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  // S1c: the forward pre-commitment. A touch stronger than the sign-off below
  // it (textPrimary vs the forward line's textSecondary), never amber.
  preCommitmentLine: {
    ...type.bodySm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.xs,
  },
  forwardLine: {
    ...type.bodySm,
    color: colors.textSecondary,
    paddingHorizontal: spacing.xs,
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
    ...type.bodyStrong,
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
    ...type.body,
    flex: 1,
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
    marginTop: spacing.hair,
  },
  adjustmentContent: {
    flex: 1,
    gap: spacing.xxs,
  },
  adjustmentLabel: {
    ...type.bodyStrong,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  // A1 verdict: the hero decision statement reads at heading size with
  // tabular numerals (03 gap #1 elite description).
  adjustmentLabelHero: {
    ...type.h3,
    color: colors.textPrimary,
    flexShrink: 1,
    fontVariant: ['tabular-nums'],
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
    ...type.bodySm,
    color: colors.textSecondary,
  },
  // NU-4: the pre-tap absolute + duration line (and the applied clamp line).
  adjustmentDetail: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  // NU-3: the floor/hold explanation that renders instead of the button.
  adjustmentHold: {
    ...type.bodySm,
    color: colors.textPrimary,
    fontWeight: fontWeight.semibold,
  },
  // M4: the Apply buttons ride the Button primitive (primary = the A1
  // one-amber hero, outline = every quiet Apply); this override keeps the
  // shipped pill geometry on top of the primitive's chrome.
  applyPill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    minWidth: 84,
    minHeight: 44, // U-B-1 §5: WCAG/iOS touch target
  },
  applySlot: { alignSelf: 'center' },
  applySlotStart: { alignSelf: 'flex-start', marginTop: spacing.md },

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
    ...type.caption, flex: 1, color: colors.textMuted, lineHeight: 17,
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
  // NU-8: quiet data-confidence line under the Why block.
  confidenceCaption: {
    ...type.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  // COMP-006 methodology links (secondary, muted, no affordance beyond text)
  whyLearnMore: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    textDecorationLine: 'underline',
  },
  // U-B-1 §5: ≥44px tap target shared by the quiet why/held links.
  link44: { minHeight: 44, justifyContent: 'center' },
  heldLearnMore: { marginTop: spacing.sm, minHeight: 44, justifyContent: 'center' },
  heldLearnMoreText: {
    ...type.caption,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },


  // Diet break card (box from <Card>; only the gap is a local extra)
  dietBreakCard: {
    gap: spacing.sm,
  },
  dietBreakTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    letterSpacing: 0.2,
  },
  // A1 verdict: heading-size title when the diet break IS the decision.
  dietBreakTitleHero: {
    ...type.h3,
    color: colors.textPrimary,
  },
  dietBreakBody: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 21,
  },
  dietBreakFootnote: {
    ...type.caption,
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
    color: colors.onPrimary,
  },
  // A1 one-amber rule: Done on the main card is a quiet text action (03 gap
  // #1). The solid doneBtn above stays for the insufficient-data and error
  // views, where it is the only action on screen.
  doneQuietBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 44, // U-B-1 §5
  },
  doneQuietText: {
    ...type.bodyStrong,
    color: colors.textSecondary,
  },
  // Wave A B6: the permanent quiet route to the coaching history.
  historyQuietBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  historyQuietText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
  },
  secondaryBtn: {
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  secondaryBtnText: {
    ...type.bodyStrong,
    color: colors.textMuted,
  },
  // B4 countdown: deliberately neutral (surface + border, no amber).
  countdownCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  countdownLine: {
    ...type.h3,
    color: colors.textPrimary,
  },
  countdownCheckpointTitle: {
    ...type.bodyStrong,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  countdownCheckpointDetail: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  countdownDisclaimer: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  credentialNote: {
    ...type.caption,
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

  // Held decisions transparency card (box from <Card>; gap is the local extra)
  heldCard: {
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
    color: colors.onPrimary,
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
    ...type.bodySm,
    flex: 1,
    color: colors.textSecondary,
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
  heldHistoryDate: { ...type.caption, color: colors.textMuted },
  heldHistoryText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  heldHistoryEmptyText: {
    ...type.caption,
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
    minHeight: 44, // U-B-1 §5
  },
  heldSeeAllText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
});
