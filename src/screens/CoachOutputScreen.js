import { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { runWeeklyCoach, mapCalsAdherence } from '../lib/weeklyCoach';
// Campaign 18: the week as one account, written from the engine's own context.
import { buildCoachStory } from '../lib/coachStory';
// Campaign 18 outcome follow-up: what changed, why, and what happened after.
import {
  buildInterventionRecord, INTERVENTION_KIND, interventionsFromHistory,
  classifyOutcome, observationWindowMet, outcomeCopy,
} from '../lib/coachIntervention';
import { reviewRecoveryLine } from '../lib/recoveryState';
// Campaign 18 job B: remembering that the user said no.
import { buildDeclineRecord, declinesFromHistory } from '../lib/coachDecline';
import { contextFacts } from '../lib/coachContext';
import { buildRampPositionLine } from '../lib/blockExplain';
import { buildHoldReceipt } from '../lib/coachLedger';
import { isCompletedCoachDecision } from '../lib/coachDecision';
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
  getCoachOutputWeekStartsSince,
  getOpenEdPatternFlag,
  raiseEdPatternFlag,
  clearEdPatternFlag,
  getCurrentMesocycleWeek,
  getNextMesocycleWeek,
  getPlannedMuscleVolume,
  upsertPlannedMuscleVolume,
  setMesocycleWeekDeload,
  getActivePeakWeekPlan,
} from '../lib/database';
import { getProgressScanCoachSummary } from '../lib/progressScanStore';
import {
  applyProgressScanCoachContext,
  resolveProgressScanCoachNote,
} from '../lib/progressScanCoachResolver';
import { getProgressScanHideExactPreference } from '../lib/progressScanPreferences';
// Integration wave (integration-plan.md §6): the v2 assessment receipt that
// extends the existing "Progress photo context" card. composeScanEvidencePacket
// is the shared v1-evidence-then-v2-packet composition (progressScanCheckInEvidence.js)
// also used by WeeklyCheckInScreen, so the two-step assembly lives in one place.
import { composeScanEvidencePacket, buildPhotoCorroborationBasis } from '../lib/progressScanCheckInEvidence';
import { confidenceChipLabel } from '../lib/progressScanResultsContract';
// Suppression unification (Wave 4): this screen already fails-closed on calm
// mode / an open ED-pattern flag with its own raw reads, reused across many
// features on this screen beyond the scan card (contest countdown, ED-lockout
// narrative, weekly-share suppression). Swapping the whole screen to the
// usePhotoSuppression() hook would mean restructuring this single large load
// effect and duplicating those reads against the hook's own async lifecycle,
// which is out of this wave's scope. Instead the scan-context suppression
// specifically is routed through the SAME pure OR the hook uses
// (isPhotoSuppressed), so a future change to that policy cannot silently
// drift between the hook and this screen.
import { isPhotoSuppressed } from '../hooks/usePhotoSuppression';
import { useToast } from '../components/Toast';
import { isCompetitionGoal } from '../lib/coachingGoals';
import { getCycleTracking } from '../lib/cyclePrefs';
import { contestCountdown, parseShowDate } from '../lib/contestCountdown';
import { getRecentIntakeSummary } from '../lib/food/db';
import { localWeekStartMs, localDayKey } from '../lib/dayKey';
import { track as trackEngineEvent } from '../lib/engineTelemetry';
// NAV-4 (founder decision): the differential paywall no longer renders here.
// Its only audience is the free tier, which withProGuard keeps out of this
// screen, so the render was dead. It now lives in HomeScreen's banner stack.
import { SkeletonCard } from '../components/Skeleton';
import {
  learnEffectiveMaintenanceForUser,
  resolveEffectiveMaintenanceForUser,
} from '../lib/effectiveMaintenanceService';
import { effectiveMaintenanceReceipt, resolveEffectiveMaintenance } from '../lib/effectiveMaintenance';
import { computeCalorieTargets, computeVolumeApply, computeDeloadVolume, deloadShare, computeDietBreakTargets, markApplied, isApplied, markDeclined, isDeclined } from '../lib/coachApply';
// A1 (NU-3/4/6): pure display classifiers + row strings for honest Apply rows.
// They only CALL coachApply's real policy functions; nothing is recomputed.
import {
  classifyCalorieApply,
  floorHoldLine,
  floorClampLine,
  preTapTargetLine,
  signedEnergyChange,
} from '../lib/coachApplyView';
// NU-6: every energy figure this screen renders honours the kJ display
// preference, as the food domain already does. Engine values stay kcal.
import { formatEnergy, energyUnitLabel } from '../lib/format';
import { applyCoachAdjustmentToActivePlan, planNextWeek } from '../lib/food/mealPlanService';
import { buildPlanEditNarration } from '../lib/food/planExplain';
import { buildRegisteredCoachResponse, resolveRegister, withScience } from '../lib/coachRegister';
import { isCalm, WELLBEING_KEY } from '../lib/wellbeing';
import {
  cancelMorningNotification,
  scheduleMorningWeightNotification,
  scheduleEveningWeightReminder,
} from '../lib/notifications';
import { logError } from '../lib/errorLog';
import CollapsibleSection from '../components/CollapsibleSection';
import Card from '../components/Card';
import BackHeader from '../components/BackHeader';
import EmptyState from '../components/EmptyState';
// L04-11: the jargon-translation layer (InfoTooltip + the single static,
// founder-signed-off glossary) already ships on 26 other files; this screen
// carries the coach's own vocabulary (deload, training volume, the smoothed
// weight trend) and had none of it wired in.
import InfoTooltip from '../components/InfoTooltip';
import { GLOSSARY } from '../lib/coachGlossary';
// M4 (audit 03b §3.3b): the Apply rows ride the Button primitive's
// idle → loading → success morph; the settle wrappers below animate the
// swap into the settled row state (Applied chip, or the NU-3 hold line).
import Button from '../components/Button';
import SectionLabel from '../components/SectionLabel';
import Reanimated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { selectCoachOutputZones } from '../lib/coachOutputZones';
import { isGreatWeek } from '../lib/shareCard/greatWeek';
import { colors, fontSize, fontWeight, spacing, radius, withAlpha, alpha, type, motion, letterSpacing } from '../styles/theme';
import useTheme from '../hooks/useTheme';
// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): NO haptics
// import here. coachOutputApplyMorph.guard.test.js pins this screen as
// haptics-free by construction (a hold path must never accidentally buzz);
// that pre-existing safety guard is stricter than the campaign brief's
// per-surface exclusions, so every touchable on this screen stays haptic-free
// -- flagged as a STOP item in the campaign report rather than silently
// worked around.
import {
  ED_PATTERN_LOCKOUT_COPY,
  ED_PATTERN_CLEARED_COPY,
  RAPID_LOSS_CORRECTED_COPY,
  getEdSupportLink,
} from '../lib/whyThisTemplates';
import {
  DAY_NAMES_FULL,
  CONFIDENCE_CAPTIONS,
  buildFocus,
  buildOffItems,
  weekRangeLabel,
  decisionAgeNote,
} from '../lib/coachOutput/viewCopy';
import {
  LedgerCard,
  RapidLossAlert,
  SectionHeader,
  StatChip,
  WhyBlock,
} from '../components/coachOutput/CoachOutputCards';

// D15 (founder ruling 2026-07-09, plan-G section 2.2/4, Q3 "both" placement):
// the adherence-why line's one-time seen-flag, same '@volyume_seen_*'
// once-ever convention as ActiveWorkoutScreen's info tip / DiaryScreen's
// hint captions. Shown once on the first real (non-baseline) weekly coach
// output, then never again. The other placement is ProSetupCompleteScreen.
const ADHERENCE_WHY_SEEN_KEY = '@volyume_seen_coach_adherence_why';

// ─── Sub-components ───────────────────────────────────────────────────────────

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
// Campaign 18 job B: "Keep it as it is" is a real answer, and giving it a
// control is what lets Volyume tell a decision from an unopened screen.
function AdjustmentRow({
  onDecline, declined = false,
  iconName, label, note, detail, holdNote, holdArrived, applied,
  onApply, applyState = 'idle', onApplySettled, emphasis, tooltip,
}) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const settling = applyState === 'success';
  const showApply = (!!onApply && !applied && !holdNote) || settling;
  return (
    <View style={styles.adjustmentRow}>
      <View style={[styles.adjustmentIconWrap, live.adjustmentIconWrap]}>
        <Ionicons name={iconName} size={18} color={t.colors.primary} />
      </View>
      <View style={styles.adjustmentContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Text style={emphasis ? [styles.adjustmentLabelHero, live.adjustmentLabelHero] : [styles.adjustmentLabel, live.adjustmentLabel]}>{label}</Text>
          {/* L04-11: the recovery-week (deload) row is the one jargon term
              named inline in an Apply row's label rather than a section
              header, so the gloss sits right next to it. */}
          {tooltip ? <InfoTooltip text={tooltip} size={13} /> : null}
          {applied && !settling && (
            <View style={[styles.appliedChip, live.appliedChip]}>
              <Ionicons name="checkmark" size={10} color={t.colors.success} />
              <Text style={[styles.appliedChipText, live.appliedChipText]}>Applied</Text>
            </View>
          )}
        </View>
        {note ? <Text style={[styles.adjustmentNote, live.adjustmentNote]}>{note}</Text> : null}
        {detail ? <Text style={[styles.adjustmentDetail, live.adjustmentDetail]}>{detail}</Text> : null}
        {holdNote && !applied ? (
          <HoldEnter live={holdArrived}>
            <Text style={[styles.adjustmentHold, live.adjustmentHold]}>{holdNote}</Text>
          </HoldEnter>
        ) : null}
      </View>
      {declined ? (
        <Text style={[styles.adjustmentDetail, live.adjustmentDetail]}>
          You chose to keep this as it is.
        </Text>
      ) : null}
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
          {onDecline ? (
            <Button
              title="Keep as is"
              variant="ghost"
              size="sm"
              fullWidth={false}
              onPress={onDecline}
              style={styles.applyPill}
              accessibilityLabel={`Keep as is, do not apply: ${label}`}
            />
          ) : null}
        </ApplyExit>
      )}
    </View>
  );
}

// NU-4: the header drops the old "next week" claim (the write is indefinite);
// the calorie row states the post-tap absolute and honest duration BEFORE the
// tap. NU-3: a floor-held computation renders its reason instead of a button.
function NextWeekCard({
  adjustments, onApplyCalories,
  // Campaign 18 job B: declining is an action, so it gets a control.
  onDeclineCalories, declined = false,
  applyStateFor, onApplySettled,
  energyUnit, caloriePreview, calorieNotice, hero, heroRow,
}) {
  const { calories } = adjustments;

  const calLabel =
    calories === null
      ? null
      : calories.change === 0
      ? 'Hold at current target'
      : signedEnergyChange(calories.change, energyUnit);

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
          onApply={caloriesApplyable && !declined ? onApplyCalories : undefined}
          applyState={applyStateFor('calories')}
          onApplySettled={() => onApplySettled('calories')}
          emphasis={hero && heroRow === 'calories'}
          onDecline={caloriesApplyable && !declined ? onDeclineCalories : undefined}
          declined={declined}
        />
      ) : (
        <AdjustmentRow
          iconName="flame-outline"
          label="Calories held"
          note="No change needed this week."
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
  deloadSuggested, deloadNote, onApplyDeload, hero, navigation,
  blockFinished = false,
  nextWeekIsDeload = false,
  currentWeekIsDeload = false,
  // C18 recovery-visibility amendment: the block's RESOLVED recovery state,
  // so this card can tell a mid-block recovery adjustment apart from the
  // block's own recovery week instead of calling both "your recovery week".
  currentRecoveryState = null,
  rampLine = null,
}) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const signal = output.volumeSignal ?? 0;
  const applied = isApplied(output, 'training');
  const note = output.adjustments?.training?.note;
  const mag = Math.abs(signal);
  const setWord = mag === 1 ? 'set' : 'sets';
  // Stage 4: an upward apply never targets a recovery week's rows, and
  // the row must not read as an addable "+N sets" when it cannot be.
  const upwardBlocked = signal > 0 && nextWeekIsDeload;
  // FB-06 (D96): the same honesty inside the recovery week the user is
  // already in. Copy gate only -- applyable is already false here (there is
  // no next week in the block for canApply to resolve).
  const upwardInRecovery = signal > 0 && currentWeekIsDeload;
  // C18: the shared state sentence, or null when there is nothing to say.
  const recoveryReviewLine = reviewRecoveryLine(currentRecoveryState);
  const label =
    (upwardBlocked || upwardInRecovery) ? 'Hold through your recovery week'
    : signal > 0 ? `Add ${mag} ${setWord} to each muscle group`
    : signal < 0 ? `Pull back ${mag} ${setWord} per muscle group`
    : 'Hold your current volume';
  const applyable = canApply && signal !== 0 && !applied && !upwardBlocked;

  // When the coach calls a deload, the recovery week IS the training
  // decision, so it replaces the incremental volume row. Applying brings
  // it forward to next week.
  const deloadApplied = isApplied(output, 'deload');

  return (
    <Card style={styles.card} elevated={hero} tone={hero ? 'primary' : undefined}>
      <SectionHeader title="Training next week" tooltip={GLOSSARY.volume} />
      {deloadSuggested ? (
        <>
          <AdjustmentRow
            iconName="bed-outline"
            label={deloadApplied ? 'Recovery week set for next week' : 'Take a recovery week'}
            note={deloadApplied && output.appliedAdjustments?.deload?.sharePct
              // Review #4/#5 honesty: the target is the share of the
              // muscle's achieved peak CAPPED at its current row, so
              // "recent working volume" is the claim the maths supports,
              // not "heaviest completed week".
              ? `Recovery volume eased to about ${output.appliedAdjustments.deload.sharePct}% of each muscle's recent working volume.`
              : deloadNote}
            tooltip={GLOSSARY.deload}
            applied={deloadApplied}
            onApply={canApply && !deloadApplied ? onApplyDeload : undefined}
            applyState={applyStateFor('deload')}
            onApplySettled={() => onApplySettled('deload')}
            emphasis={hero}
          />
          {!canApply && !deloadApplied && (
            <View style={[styles.planNote, live.planNote]}>
              <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
              <Text style={[styles.planNoteText, live.planNoteText]}>
                {blockFinished
                  ? 'This block has finished, so there is no upcoming week to change. Choose your next block on the Train tab.'
                  : 'Start your next training week to bring the recovery week forward.'}
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
          <View style={[styles.planNote, live.planNote]}>
            <Ionicons name="information-circle-outline" size={14} color={t.colors.textMuted} />
            <Text style={[styles.planNoteText, live.planNoteText]}>
              {blockFinished
                ? 'This block has finished, so volume changes have nowhere to land yet. Choose your next block on the Train tab first.'
                // FB-06 (D96): the third honest branch, checked before the
                // next-week one so the copy names the week the user is
                // actually in. Inside the scheduled recovery week there is
                // no next week in this block at all, so the note used to
                // fall through to "This is next week's starting point"
                // beside a row reading "Add 2 sets to each muscle group".
                // Copy gate only: weeklyCoach's numbers are unchanged and
                // the Apply button was already absent (canApply is false).
                // C18 recovery-visibility amendment: the state SENTENCE comes
                // from the one shared authority (reviewRecoveryLine), so this
                // review cannot describe the athlete's state differently from
                // Home, the next-workout label or Train. Only the clause about
                // what this CARD does stays local to the card.
                : currentWeekIsDeload
                  ? `Nothing is added this week. ${recoveryReviewLine ?? 'Volume changes start again with your next block.'}`
                  : upwardBlocked
                    ? 'Next week is your recovery week, so the coach will not add sets to it. Recovery weeks stay light on purpose.'
                    : recoveryReviewLine
                      ? `${recoveryReviewLine} ${rampLine ? `${rampLine} ` : ''}This is next week's starting point; each session still fine-tunes as you train.`
                      : rampLine
                        ? `${rampLine} This is next week's starting point; each session still fine-tunes as you train.`
                        : "This is next week's starting point. Each session still fine-tunes as you train."}
            </Text>
          </View>
          {/* CO-2: this card said what changed ("N updated") but never linked
              to the plan it changed, unlike its nutrition-side sibling two
              lines away (the food-level receipt's "See your meal plan" link,
              same component/style/a11y). Same pattern here, once applied. */}
          {applied && output.appliedAdjustments?.training?.musclesChanged && navigation ? (
            // Founder device report 2026-08-06 ("random look and feel, text
            // only links"): every quiet action on this screen converges on
            // the shared Button outline variant. Amber stays reserved for
            // the hero Apply (A1 one-amber rule).
            <Button
              title="See your updated plan"
              variant="outline"
              size="sm"
              icon="barbell-outline"
              fullWidth={false}
              style={styles.quietActionSpace}
              onPress={() => navigation.navigate('PlansTab', { screen: 'Plans', initial: false })}
              accessibilityLabel="See your updated plan"
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

// NU-4: the button drops the old "week" claim (the write has no expiry) and
// the card states the post-tap absolute + honest duration before the tap.
// NU-3: a tap-time null renders its reason (notice) instead of silence.
function DietBreakCard({ weeksInDeficit, continuityEvidenced = true, applied, onApply, applyState, onApplySettled, energyUnit, previewKcal, notice, allowApplyWithNotice = false, hero }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const settling = applyState === 'success';
  return (
    <Card style={styles.dietBreakCard} elevated={hero} tone={hero ? 'primary' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
        <Text style={hero ? [styles.dietBreakTitleHero, live.dietBreakTitleHero] : [styles.dietBreakTitle, live.dietBreakTitle]}>Diet break worth considering</Text>
        <InfoTooltip text={GLOSSARY.maintenanceCalories} size={13} />
        {applied && !settling && (
          <View style={[styles.appliedChip, live.appliedChip]}>
            <Ionicons name="checkmark" size={10} color={t.colors.success} />
            <Text style={[styles.appliedChipText, live.appliedChipText]}>Applied</Text>
          </View>
        )}
      </View>
      <Text style={[styles.dietBreakBody, live.dietBreakBody]}>
        {!continuityEvidenced
          // C6 P-2 (D97-20): after a coaching gap, claim only the provable
          // set-age of the cut, never continuous deficit eating.
          ? `This cut has been set for ${weeksInDeficit} weeks. `
          : weeksInDeficit >= 8
            ? `You have been in a calorie deficit for ${weeksInDeficit} weeks. `
            : 'You have been in a calorie deficit for over eight weeks. '}
        {'A short diet break, returning to maintenance calories for one to two weeks, can help your body settle back to its normal calorie burn and improve long-term fat loss. Consider taking a break before your next phase.'}
      </Text>
      <Text style={[styles.dietBreakFootnote, live.dietBreakFootnote]}>
        Based on the MATADOR trial (2017). This is a suggestion, not a requirement.
      </Text>
      {!applied && previewKcal != null ? (
        <Text style={[styles.adjustmentDetail, live.adjustmentDetail]}>{preTapTargetLine(previewKcal, energyUnit)}</Text>
      ) : null}
      {!applied && notice ? (
        <HoldEnter live>
          <Text style={[styles.adjustmentHold, live.adjustmentHold]}>{notice}</Text>
        </HoldEnter>
      ) : null}
      {((!applied && onApply && (!notice || allowApplyWithNotice)) || settling) && (
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

// ONE DAILY TRUTH (Campaign 17A, founder law). `MacroCycleCard` (the
// training-day / rest-day carb split) and `RefeedCard` (a single day raised
// to maintenance) used to be rendered here as confirm-then-apply cards. Both
// are gone, along with the coach output that fed them: a Volyume athlete
// trains whenever life allows, so a target that depends on knowing which
// calendar day they train is a guess. There is ONE base daily target.

function HeldDecisionsCard({ decisions, history, onSeeAll, onLearnMore, energyUnit }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why. No haptics in this card: it is a held-decision surface
  // (hard exclusion, campaign item 1 authority doc).
  const t = useTheme();
  const live = buildLiveStyles(t);
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
              <Ionicons name="pause-circle-outline" size={16} color={t.colors.textMuted} style={{ marginTop: spacing.xxs }} />
              <Text style={[styles.heldText, live.heldText]}>{d.reason}</Text>
            </View>
          ))}
          {/* COMP-006: only on standard holds, never alongside the ED-pattern
              or rapid-loss blocks, whose own copy + CTAs must not be diluted. */}
          {onLearnMore ? (
            <Button
              title="See how Precision Coaching decides"
              variant="outline"
              size="sm"
              icon="information-circle-outline"
              fullWidth={false}
              style={styles.quietActionSpace}
              onPress={onLearnMore}
              accessibilityLabel="See how Precision Coaching decides"
            />
          ) : null}
        </>
      ) : null}
      {historyWithHeld.length > 0 ? (
        <View style={styles.heldHistoryShelf}>
          <Text style={[styles.heldHistoryTitle, live.heldHistoryTitle]}>PREVIOUS WEEKS</Text>
          {historyWithHeld.map((entry, i) => (
            <View
              key={i}
              style={[
                styles.heldHistoryEntry,
                live.heldHistoryEntry,
                i === historyWithHeld.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[styles.heldHistoryDate, live.heldHistoryDate]}>{weekRangeLabel(entry.weekStart)}</Text>
              {entry.heldDecisions.map((d, j) => (
                <Text key={j} style={[styles.heldHistoryText, live.heldHistoryText]}>{d.reason}</Text>
              ))}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.heldHistoryShelf}>
          <Text style={[styles.heldHistoryEmptyText, live.heldHistoryEmptyText]}>
            Your held-decision history will appear here as weeks pass.
          </Text>
        </View>
      )}
      {onSeeAll ? (
        <Button
          title="See all weeks"
          variant="outline"
          size="sm"
          trailingIcon="chevron-forward"
          fullWidth={false}
          style={styles.quietActionSpaceMd}
          onPress={onSeeAll}
          accessibilityLabel="See all coaching decisions"
        />
      ) : null}
    </Card>
  );
}

function EdPatternLockoutBlock({ decision }) {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why. No haptics here: explicit ED-pattern-lockout exclusion
  // (campaign item 1 authority doc).
  const live = buildLiveStyles(useTheme());
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
  useEffect(() => {
    // AY-7/D7: announce the card the moment it appears, so a TalkBack user
    // learns the hold happened without manually exploring the Coach tab
    // (precedent: PRCelebration.js's "must be ANNOUNCED, not just shown").
    // D7's hard constraint: read the already-approved on-screen copy
    // verbatim, no new or paraphrased ED-safety wording. This joins exactly
    // the same ED_PATTERN_LOCKOUT_COPY strings the Text nodes below render,
    // in the same order, one per line.
    try {
      AccessibilityInfo.announceForAccessibility(
        [
          ED_PATTERN_LOCKOUT_COPY.header,
          ED_PATTERN_LOCKOUT_COPY.title,
          ED_PATTERN_LOCKOUT_COPY.body,
          decision?.goalLockAdvanced ? ED_PATTERN_LOCKOUT_COPY.bodyGoalLockExtension : null,
          ED_PATTERN_LOCKOUT_COPY.bottomNote,
        ].filter(Boolean).join('\n'),
      );
    } catch (_) { /* best-effort, no-op without a screen reader */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={[styles.edLockoutCard, live.edLockoutCard]}>
      <Text style={[styles.edLockoutHeader, live.edLockoutHeader]}>{ED_PATTERN_LOCKOUT_COPY.header}</Text>
      <Text style={[styles.edLockoutTitle, live.edLockoutTitle]}>{ED_PATTERN_LOCKOUT_COPY.title}</Text>
      <Text style={[styles.edLockoutBody, live.edLockoutBody]}>{ED_PATTERN_LOCKOUT_COPY.body}</Text>
      {decision?.goalLockAdvanced ? (
        <Text style={[styles.edLockoutBody, live.edLockoutBody]}>{ED_PATTERN_LOCKOUT_COPY.bodyGoalLockExtension}</Text>
      ) : null}
      {showReadMore ? (
        <View style={[styles.edLockoutReadMoreBox, live.edLockoutReadMoreBox]}>
          <Text style={[styles.edLockoutReadMoreText, live.edLockoutReadMoreText]}>{ED_PATTERN_LOCKOUT_COPY.readMoreBody}</Text>
        </View>
      ) : null}
      <View style={styles.edLockoutCtaRow}>
        <TouchableOpacity onPress={openSupport} style={[styles.edLockoutCtaPrimary, live.edLockoutCtaPrimary]} accessibilityRole="button">
          <Text style={[styles.edLockoutCtaPrimaryText, live.edLockoutCtaPrimaryText]}>
            {ED_PATTERN_LOCKOUT_COPY.ctaSupport} · {supportLink.name}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowReadMore(v => !v)} style={[styles.edLockoutCtaGhost, live.edLockoutCtaGhost]} accessibilityRole="button">
          <Text style={[styles.edLockoutCtaGhostText, live.edLockoutCtaGhostText]}>
            {showReadMore ? 'Hide' : ED_PATTERN_LOCKOUT_COPY.ctaReadMore}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.edLockoutBottomNote, live.edLockoutBottomNote]}>{ED_PATTERN_LOCKOUT_COPY.bottomNote}</Text>
    </View>
  );
}

function EdPatternClearedBlock() {
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const live = buildLiveStyles(useTheme());
  useEffect(() => {
    // AY-7/D7: same announce-on-appearance treatment as the lockout block
    // above, reading ED_PATTERN_CLEARED_COPY verbatim (header, title, body,
    // in the order the Text nodes below render them). No new wording.
    try {
      AccessibilityInfo.announceForAccessibility(
        [
          ED_PATTERN_CLEARED_COPY.header,
          ED_PATTERN_CLEARED_COPY.title,
          ED_PATTERN_CLEARED_COPY.body,
        ].join('\n'),
      );
    } catch (_) { /* best-effort, no-op without a screen reader */ }
  }, []);
  return (
    <View style={[styles.edClearedCard, live.edClearedCard]}>
      <Text style={[styles.edClearedHeader, live.edClearedHeader]}>{ED_PATTERN_CLEARED_COPY.header}</Text>
      <Text style={[styles.edClearedTitle, live.edClearedTitle]}>{ED_PATTERN_CLEARED_COPY.title}</Text>
      <Text style={[styles.edClearedBody, live.edClearedBody]}>{ED_PATTERN_CLEARED_COPY.body}</Text>
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
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const live = buildLiveStyles(useTheme());
  const delta = decision?.kcalDelta;
  return (
    <View style={[styles.edClearedCard, live.edClearedCard]}>
      <Text style={[styles.edClearedHeader, live.edClearedHeader]}>{RAPID_LOSS_CORRECTED_COPY.header}</Text>
      <Text style={[styles.edClearedTitle, live.edClearedTitle]}>{RAPID_LOSS_CORRECTED_COPY.title}</Text>
      <Text style={[styles.edClearedBody, live.edClearedBody]}>{RAPID_LOSS_CORRECTED_COPY.body}</Text>
      {/* NU-6: the figure (not the locked copy) honours the kJ preference. */}
      {typeof delta === 'number' && delta > 0 ? (
        <Text style={[styles.edClearedBody, live.edClearedBody]}>{`Daily target raised by ${signedEnergyChange(delta, energyUnit)}.`}</Text>
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
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why.
  const t = useTheme();
  const live = buildLiveStyles(t);
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <View style={styles.insufficientIconRow}>
          <Ionicons name="time-outline" size={32} color={t.colors.primary} />
        </View>
        <Text style={[styles.insufficientTitle, live.insufficientTitle]}>Building your baseline.</Text>
        {/* A3 (audit 04 §4): the hold is a decision, so it renders as a full
            receipt, what the coach read, the rule it applied, and the named
            unlock date, not a bare "come back later" panel. The neutral
            (ED-flag) receipt has no rows by construction. */}
        {receipt?.ledger?.rows?.length ? (
          <View style={styles.receiptRows}>
            <Text style={[styles.receiptLabel, live.receiptLabel]}>{receipt.ledger.title}</Text>
            {receipt.ledger.rows.map((row) => (
              <View key={row.key} style={styles.receiptRow}>
                <Ionicons
                  name={row.done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={14}
                  color={row.done ? t.colors.success : t.colors.textMuted}
                />
                <Text style={[styles.receiptRowText, live.receiptRowText]}>{row.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Text style={[styles.insufficientBody, live.insufficientBody]}>
          {receipt?.rule ?? dataNote ??
            'Your coach reads your training and weight from day one. It holds calorie and volume changes until it has about two weeks of weigh-ins plus a check-in, so it moves on a real trend rather than one noisy week. Keep logging sessions, your morning weight, and your weekly check-in. The first adjustment lands once the trend is clear.'}
        </Text>
        {receipt?.unlockLine ? (
          <Text style={[styles.receiptUnlock, live.receiptUnlock]}>{receipt.unlockLine}</Text>
        ) : null}
      </Card>
      <Button
        title="Got it"
        onPress={onClose}
        size="lg"
        style={styles.doneBtn}
        textStyle={[styles.doneBtnText, live.doneBtnText]}
      />
    </ScrollView>
  );
}

// Shown when the coach load itself failed (network down, a cloud read threw).
// Distinct from InsufficientDataView so a transient error never masquerades as
// "you haven't logged enough", it offers a retry instead of a dead end.
function LoadErrorView({ onRetry, onClose }) {
  // D1 sweep (DD5): routed through the shared EmptyState primitive, the
  // same 'transient load failure, your data is safe' shape CoachReviewScreen.js
  // and BlockReflectionScreen.js already use, instead of a hand-built
  // Card/icon/title/body/Button/quiet-link layout.
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <EmptyState
        icon="cloud-offline-outline"
        title="Couldn't load your coach."
        text="Something went wrong fetching this week's data, usually a dropped connection. Your logs are safe. Try again in a moment."
        actionLabel="Try again"
        onAction={onRetry}
        secondaryLabel="Close"
        onSecondary={onClose}
      />
    </ScrollView>
  );
}

// Progress-scan assessment receipt helpers (integration-plan.md §6/§7).
// Pure, exported for direct unit test (the rest of this screen's scan-context
// behaviour is source-guarded, see progressScanCoachIsolation.guard.test.js;
// these two are plain string helpers with no store/engine/screen state, so a
// real test is cheaper and more precise than another regex guard).

// The resolver's card body (progressScanCoachResolver.js decisionLine(), the
// calorie branch) already carries the exact same literal sentence as the v2
// receipt's usedSentence (progressScanCheckInEvidence.js NON_AUTHORITY_SENTENCE)
// by design -- both exist so every scan-derived render path states the same
// non-authority fact. Render it once: only surface the receipt's usedSentence
// line when the card body does not already contain it verbatim.
export function dedupeUsedSentence(bodyText, usedSentence) {
  if (!usedSentence) return null;
  if (typeof bodyText === 'string' && bodyText.includes(usedSentence)) return null;
  return usedSentence;
}

// Accessibility label summarising the assessment block: the receipt headline,
// plus the confidence tier in plain words when the scan was actually valid
// (matching the block's own visible confidence chip).
export function scanAssessmentAccessibilityLabel(packet) {
  if (!packet?.receipt) return '';
  const confidence = packet.status === 'valid' ? `, ${confidenceChipLabel(packet.confidenceTier)}` : '';
  return `Progress scan assessment: ${packet.receipt.headline}${confidence}`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CoachOutputScreen({ navigation, route }) {
  const toast = useToast();
  // Default to the current local week when no week is passed. The weekly
  // "your plan is ready" notification routes here with no params; without this
  // weekStart was undefined, which made getWeeklySessionStats build a NaN
  // window (0 sessions), weekRangeLabel render an Invalid Date, and the screen
  // fall through to the baseline view, the "building baseline" screen the user
  // saw on tapping the notification.
  // PM-01(a) (D96): the week this screen is scoped to. `redirectWeekStart` is
  // set once, by the loader, when the resolved week has NO check-in but a
  // completed decision exists for an earlier week: the screen then opens that
  // decision instead of computing a fresh verdict for a week the user has not
  // lived yet. The screen already accepted a weekStart param, so this is a
  // redirect, not new machinery.
  const [redirectWeekStart, setRedirectWeekStart] = useState(null);
  const weekStart = redirectWeekStart ?? route.params?.weekStart ?? localWeekStartMs();
  // F7: subscribe to just these fields (a bare useAppStore() re-renders on every store mutation).
  const { user, userProfile, units, bodyWeightUnits, tier: storeTier, energyUnit, reduceMotion } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    units: s.units,
    bodyWeightUnits: s.bodyWeightUnits,
    tier: s.tier,
    // NU-6: kJ display preference, same read as the food domain screens.
    energyUnit: s.accessibility?.energyUnit ?? 'kcal',
    reduceMotion: !!s.accessibility?.reduceMotion,
  })));
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): live theme.
  // See buildLiveStyles' header comment (defined below the frozen `styles`
  // block) for why. Memoised on `t` (this screen is large and re-renders
  // often across the apply/settle state machine above).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

  // Ultimate-Audit item 11 (D16, founder ruling 2026-07-10): apply-control
  // mode, read the same local-only way coachTone is read for register
  // resolution (userProfile?.coachTone ?? 'automatic', line ~1088 below).
  // Orthogonal to coachTone: this governs WHO confirms an adjustment, never
  // what the engine decides. Manual removes every Apply control below;
  // Coached and Collaborative both keep the SAME handlers wired -- the
  // effect after the load effect races Coached ahead of the tap when no
  // safety hold is open (output.autoApplyHoldActive), otherwise it falls
  // back to the identical confirm-first behaviour Collaborative always has.
  const coachAutonomy = userProfile?.coachAutonomy ?? 'collaborative';
  const applyDisabled = coachAutonomy === 'manual';

  const [output, setOutput] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes a load failure (network/cloud threw) from a genuine
  // not-enough-data result, so a transient error shows a retry instead of the
  // misleading "building your baseline" screen. reloadKey re-runs the effect.
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [coachHistory, setCoachHistory] = useState([]);
  // Campaign 18: accepted interventions awaiting or carrying an outcome.
  const [priorInterventions, setPriorInterventions] = useState([]);
  const [applyingKey, setApplyingKey] = useState(null);
  // RB-10 (D96, Review B): applyingKey is state, so the guard in each Apply
  // handler is one render behind a same-frame double tap. Today both
  // invocations converge (every handler re-reads its base and writes
  // absolute values), but that is convergence by accident of shape; this
  // ref makes the entry guard synchronous, the same pattern the wizard and
  // the activation paths use.
  const applyingRef = useRef(false);
  // Food-level receipt after a calorie apply edits an active meal plan
  // ({ headline, body, deepLink, floorNote } from planExplain, or null).
  const [planEditNote, setPlanEditNote] = useState(null);
  // Seamless next-week meal setup from the check-in (founder 2026-06-15).
  const [planningWeek, setPlanningWeek] = useState(false);
  // Next mesocycle week that a training-volume apply would write to.
  // Loaded once on mount; null when there's no active block or the
  // current week is the last one (nothing to push volume into).
  const [nextTrainingWeekId, setNextTrainingWeekId] = useState(null);
  // Stage 1 (2026-08-09): when the active block is finished
  // (awaitingDecision) there is no upcoming week, so training applies
  // rightly disable; this flag lets the card SAY so instead of the apply
  // path dying silently (blueprint §3.5: the coach output carries the
  // block-finished state, not a mystery).
  const [blockAwaitingDecision, setBlockAwaitingDecision] = useState(false);
  // Stage 4 (2026-08-09): a positive volume apply must never land on a
  // recovery week's rows — a deload is light on purpose, and the peak-week
  // push would otherwise write extra sets straight into it.
  const [nextWeekIsDeload, setNextWeekIsDeload] = useState(false);
  // FB-06 (D96): whether the week the user is IN is the scheduled recovery
  // week. In week 6 of 6 there is no next row, so nextWeekIsDeload is false
  // and blockAwaitingDecision is false too (the block is in 'recovery', not
  // 'completed_awaiting_decision'), which left the card's note falling
  // through to the generic "This is next week's starting point" beside a
  // row reading "Add 2 sets to each muscle group". There is no next week.
  const [currentWeekIsDeload, setCurrentWeekIsDeload] = useState(false);
  const [currentRecoveryState, setCurrentRecoveryState] = useState(null);
  // Stage 8: the live block position for the training card's ramp line.
  const [blockWeekForRamp, setBlockWeekForRamp] = useState(null);
  // Five-part coach response inputs (Theme A): weigh-ins inside the
  // displayed week, the calm-mode preference, and the check-in day name
  // for the forward-pull anchor. All best-effort; the response renders
  // fewer parts when any are missing.
  const [weighInsThisWeek, setWeighInsThisWeek] = useState(null);
  // A3: the held-decision receipt for the insufficient-data view (null when
  // the coach has enough data).
  const [holdReceipt, setHoldReceipt] = useState(null);
  const [calmMode, setCalmMode] = useState(false);
  // D15: the adherence-why line, shown only on the user's first real weekly
  // coach output (see ADHERENCE_WHY_SEEN_KEY above).
  const [showAdherenceWhy, setShowAdherenceWhy] = useState(false);
  const [progressScanCoachContext, setProgressScanCoachContext] = useState(null);
  const [checkinDayName, setCheckinDayName] = useState(null);
  // U-B-1 §3: the "More adjustments" secondary zone is collapsed by default.
  const [moreOpen, setMoreOpen] = useState(false);
  // A1 (NU-3/NU-4): the current nutrition targets + sex, captured at load so
  // the Apply rows can say BEFORE the tap what the tap would write, and when
  // the ED floor holds or clamps it. Refreshed after any apply that writes
  // nutrition_targets so the other rows re-classify against reality. Display
  // classification only; the tap path still re-reads at tap time.
  const [currentTargets, setCurrentTargets] = useState(null);
  const [liveMaintenanceAuthority, setLiveMaintenanceAuthority] = useState(null);
  const [dietBreakPreviewChanged, setDietBreakPreviewChanged] = useState(false);
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
  // Campaign 1 P0-7 D12: derived outside the effect so the fail-closed
  // read (a missing profile is a positive screen) is also the effect's
  // dependency - it re-evaluates when the profile arrives.
  const countdownScoffPositive = userProfile == null || (userProfile.scoffScore ?? 0) >= 2;

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
        // Campaign 1 P0-7 D12: fail CLOSED when the profile itself is
        // unavailable - a missing profile must not read as a negative
        // wellbeing screen (the other two suppression reads on this
        // screen already fail closed; this one did not).
        scoffPositive: countdownScoffPositive,
      });
      if (!cancelled) setCountdown(state);
    })();
    return () => { cancelled = true; };
  }, [user?.id, userProfile?.trainingGoal, countdownScoffPositive]);

  // Confirm-then-apply: write the suggested calorie change to
  // nutrition_targets only when the user taps Apply, then record it on
  // the coach output so the row flips to "Applied" and can't be applied
  // twice. Current targets are re-read at tap time so we never scale
  // from a stale snapshot.
  async function handleApplyCalories() {
    if (applyingRef.current || applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'calories')) return;
    setPlanEditNote(null); // clear any stale receipt before re-applying
    applyingRef.current = true;
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
      // Release-gate fix (matches handleApplyDietBreak's existing contract
      // below): the visible absolute target is part of consent. This screen
      // can stay mounted (tab switch, not unmount) while the athlete's
      // targets change elsewhere - another screen recalculating them, or a
      // cross-device sync landing in the background - so the row's
      // pre-tap preview (caloriePreview, built from the currentTargets
      // state at last render) can go stale relative to what a fresh read
      // right now would actually produce. Applying the fresh value
      // unconditionally would persist and receipt a number the athlete was
      // never shown. Refresh and require a second tap instead, exactly as
      // the diet-break row already does.
      if (Number(caloriePreview?.newKcal) !== Number(computed.newKcal)) {
        setCurrentTargets(current);
        setApplyNotice(n => ({
          ...n,
          calories: 'Your targets changed. Review the updated amount, then tap again.',
        }));
        return;
      }
      await saveNutritionTargets(user.id, computed.targets);
      // ATOMICITY (P1, adversarial audit 2026-08-26). The authoritative write
      // has landed, so reflect it NOW, before the receipt. Previously
      // setCurrentTargets ran after saveCoachOutput, so a receipt failure left
      // the consent preview showing the pre-change base while the real target
      // had already moved: the row still offered Apply, and the coach's own
      // record said not-applied for a change the athlete had actually taken.
      setCurrentTargets(computed.targets);
      await AsyncStorage.setItem(
        '@volyume_nutrition_targets', JSON.stringify(computed.targets),
      ).catch(() => {});
      // The requested step and the step that actually landed can differ at
      // the calorie floor. Everything downstream must follow the latter or
      // the accepted-intervention record and meal plan will disagree with the
      // authoritative nutrition target.
      const appliedChange = computed.newKcal - Number(current.targetKcal);
      // CAMPAIGN 18 OUTCOME FOLLOW-UP. The structured truth this change
      // leaves behind, written only here - on the user's deliberate tap - so
      // Volyume can never score a change it proposed and they declined.
      const updated = markApplied(output, 'calories', {
        newKcal: computed.newKcal,
        ...(check.kind === 'floor_clamp' ? { clampedToFloor: true } : {}),
        intervention: buildInterventionRecord({
          kind: INTERVENTION_KIND.CALORIE_TARGET,
          appliedAtMs: Date.now(),
          direction: Math.sign(appliedChange),
          magnitude: Math.abs(appliedChange),
          appliedValue: computed.newKcal,
          because: output?.limiters?.nutrition?.because ?? null,
          // The facts that were GOOD when this was authorised, so a later
          // read can tell whether it was decided on real evidence.
          authorisedBy: contextFacts(output?.context)
            .filter((f) => f.signal === 'good')
            .map((f) => f.key),
          heldConstant: (output?.adjustments?.training?.signal === 'hold') ? ['training'] : [],
          baseline: output?.context?.weight?.trend
            ? { key: 'weight.trend', value: output.context.weight.trend.value }
            : null,
          goalPhase: output?.goalPhase ?? null,
          maintenanceAuthority: output?.effectiveMaintenance?.authority ?? null,
        }),
      });
      // The receipt is a SECOND write and can fail on its own. When it does,
      // the calorie change has still happened, so the screen must say so
      // rather than silently re-offering Apply, which would let a second tap
      // stack another step onto an already-moved target.
      let receiptOk = true;
      try {
        await saveCoachOutput(user.id, { weekStart, ...updated });
      } catch (e) {
        receiptOk = false;
        logError('CoachOutputScreen.applyCalories.receipt', e, { userId: user?.id });
      }
      setOutput(updated);
      setApplySettling(s => ({ ...s, calories: true }));
      if (!receiptOk) {
        setApplyNotice(n => ({
          ...n,
          calories: 'Applied. We could not save the record of it, so it may be offered again next time.',
        }));
      }

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
          // RC-2 (D96, Review C): the wizard writes `experience`;
          // `experienceLevel` has no producer anywhere, so Automatic
          // resolved to the beginner register for EVERY user, including
          // those who answered "Competitive - 5+ years". Read both keys.
          experienceLevel: userProfile?.experienceLevel ?? userProfile?.experience ?? null,
          trainingAgeYears: userProfile?.trainingAgeYears ?? null,
        });
        const { change: planChange } = await applyCoachAdjustmentToActivePlan(user.id, {
          adjustmentKcal: appliedChange,
          targetSnapshot: computed.targets,
          minimumKcal: check.floorKcal,
        });
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
      applyingRef.current = false;
    }
  }

  // CAMPAIGN 18 JOB B. Declining is a deliberate act, not the absence of a
  // tap. Without an explicit control Volyume could not tell "they said no"
  // from "they never opened the screen", and only the first of those is a
  // decision worth remembering.
  async function handleDeclineCalories() {
    if (applyingRef.current || applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'calories') || isDeclined(output, 'calories')) return;
    const change = output?.adjustments?.calories?.change;
    if (!change) return;
    try {
      const updated = markDeclined(output, 'calories', {
        decline: buildDeclineRecord({
          domain: 'nutrition',
          kind: 'calorie_target',
          direction: Math.sign(change),
          magnitude: Math.abs(change),
          // The CIRCUMSTANCES, so a later week can tell whether anything has
          // actually moved since they said no.
          signature: output?.evidenceSignature ?? null,
          declinedAtMs: Date.now(),
        }),
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
    } catch (e) {
      logError('CoachOutputScreen.handleDeclineCalories', e, { userId: user?.id });
    }
  }

  // Confirm-then-apply for the weekly training volume signal (founder
  // decision 2026-05-28: the coach owns weekly volume). Apply spreads
  // the signal across every trained muscle in next week's planned
  // volume, each clamped to its own [mev, mrv]. Source tagged 'coach'
  // so it's distinguishable from the template ramp and the per-session
  // adaptive writes.
  async function handleApplyTraining() {
    if (applyingRef.current || applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'training')) return;
    const delta = output.volumeSignal ?? 0;
    if (!delta || !nextTrainingWeekId) return;
    // Stage 4: never add sets to a recovery week (the card explains this
    // instead of offering the button; this guard is the backstop).
    if (delta > 0 && nextWeekIsDeload) return;
    applyingRef.current = true;
    setApplyingKey('training');
    try {
      const rows = await getPlannedMuscleVolume(nextTrainingWeekId);
      // CC31 (section 20): the per-muscle apply re-checks eligibility at
      // APPLY time, never from the stale proposal. An increase never
      // lands on a muscle under an active capability episode, nor on one
      // the user flagged sore at this week's check-in (PD-7: the
      // structured answer, consumed at its own grain). Reductions and
      // unaffected muscles are untouched. D112 R3 (closes audit T2-19):
      // a failed re-check WITHHOLDS the increase for this run - the
      // capability lane fails safe, never body-wide on a guess.
      let holdMuscles = new Set();
      if (delta > 0) {
        try {
          // eslint-disable-next-line global-require
          const { loadCapabilityResolveState, blockingConflicts } = require('../lib/capability/resolve');
          // eslint-disable-next-line global-require
          const { getAllExercises, getLatestCheckin } = require('../lib/database');
          const capState = await loadCapabilityResolveState(user.id, {});
          const episodeIds = new Set((capState.restrictions ?? [])
            .filter((r) => r.role === 'episode').map((r) => r.id));
          if (episodeIds.size) {
            const library = await getAllExercises();
            for (const ex of library) {
              if (!ex?.primaryMuscle) continue;
              // Decision layer (D112 R4): an exercise the user allowed no
              // longer holds its muscle - unless the rule is clinician-set.
              if (blockingConflicts(capState, ex).some((c) => !c.unknown && episodeIds.has(c.constraintId))) {
                holdMuscles.add(ex.primaryMuscle);
              }
            }
          }
          const checkin = await getLatestCheckin(user.id).catch(() => null);
          for (const m of String(checkin?.soreMuscles ?? '').split(',')) {
            if (m.trim()) holdMuscles.add(m.trim());
          }
        } catch (_e) { holdMuscles = null; }
      }
      if (delta > 0 && holdMuscles === null) {
        // D112 R3: the re-check did not happen, so nothing is known about
        // what this user is training around. Wait, say so calmly, retry.
        toast.show('Volyume could not check how you train just now, so this increase waits. Try again in a moment.', { variant: 'warning' });
        return;
      }
      const changes = computeVolumeApply(rows, delta, holdMuscles);
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
        // Campaign 18: same record, training side. Judged on recovery and
        // performance rather than on the scale, which is what the old
        // outcome pairing got wrong.
        intervention: buildInterventionRecord({
          kind: INTERVENTION_KIND.VOLUME_START,
          appliedAtMs: Date.now(),
          direction: Math.sign(delta),
          magnitude: Math.abs(delta),
          because: output?.limiters?.training?.because ?? null,
          authorisedBy: contextFacts(output?.context)
            .filter((f) => f.signal === 'good')
            .map((f) => f.key),
          heldConstant: (output?.adjustments?.calories == null) ? ['nutrition'] : [],
          baseline: output?.context?.recovery?.systemic
            ? { key: 'recovery.systemic', value: output.context.recovery.systemic.value }
            : null,
          // C18 adversarial closure job B2: BOTH readings the change will be
          // judged against, taken at the moment it is applied. Recovery alone
          // could not tell "the extra work bought progress at a fair cost"
          // apart from "the extra work bought nothing", which is the whole
          // question a volume change asks.
          baselines: {
            'training.progress': output?.context?.training?.progress?.value ?? null,
            'recovery.systemic': output?.context?.recovery?.systemic?.value ?? null,
          },
          goalPhase: output?.goalPhase ?? null,
        }),
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
      setApplySettling(s => ({ ...s, training: true }));
    } catch (e) {
      logError('CoachOutputScreen.handleApplyTraining', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
      applyingRef.current = false;
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
    if (applyingRef.current || applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'deload')) return;
    if (!nextTrainingWeekId) return;
    applyingRef.current = true;
    setApplyingKey('deload');
    try {
      await setMesocycleWeekDeload(nextTrainingWeekId);
      // Stage 4: the target week IS a deload row from this moment; keep
      // the upward-apply guard's premise fresh for the rest of the session.
      setNextWeekIsDeload(true);
      const rows = await getPlannedMuscleVolume(nextTrainingWeekId);
      // Stage 7 (§3.4): the deload lands at the strain-scaled share of
      // each muscle's ACHIEVED peak this block rather than a flat MEV
      // cut. Strain maps from the persisted weekly recovery read; a
      // failed peak load degrades to the legacy flat cut, never blocks.
      // eslint-disable-next-line global-require
      const { getAchievedWeeklyPeaks } = require('../lib/blockLedgerRunner');
      const peaks = await getAchievedWeeklyPeaks(user.id).catch(() => null);
      const strainScore = output.recoveryFlag === 'deload_suggested' ? 4
        : output.recoveryFlag === 'concerned' ? 2 : 0;
      const changes = computeDeloadVolume(rows, peaks ? { peaks, strainScore } : null);
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
        // Stage 8 (§3.6): the applied share, so the card can explain the
        // recovery dose from what actually happened — null when the
        // legacy flat cut ran (no peaks available).
        sharePct: peaks ? Math.round(deloadShare(strainScore) * 100) : null,
      });
      await saveCoachOutput(user.id, { weekStart, ...updated });
      setOutput(updated);
      setApplySettling(s => ({ ...s, deload: true }));
    } catch (e) {
      logError('CoachOutputScreen.handleApplyDeload', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
      applyingRef.current = false;
    }
  }

  // Confirm-then-apply for a diet break (founder decision 2026-05-28:
  // maintenance week). Applying raises the deficit back to maintenance
  // (stored tdee) for the week, protein held, fat + carbs scaled. Same
  // destination as the calorie apply (nutrition_targets), so it flows to
  // every diary surface that reads the targets. Re-reads current targets
  // at tap time so it never scales from a stale snapshot.
  async function handleApplyDietBreak() {
    if (applyingRef.current || applyingKey || !user?.id || !output) return;
    if (isApplied(output, 'dietBreak')) return;
    applyingRef.current = true;
    setApplyingKey('dietBreak');
    try {
      const current = await getNutritionTargets(user.id);
      const bodyProfile = await getUserBodyProfile(user.id).catch(() => null);
      const sex = bodyProfile?.sex ?? userProfile?.sex ?? null;
      const latestComposition = (await getBodyMetricLog(user.id, 60).catch(() => []))
        .find(row => row.bodyFatPercent != null) ?? null;
      const freshAuthority = await resolveEffectiveMaintenanceForUser(user.id, {
        sex,
        dateOfBirth: bodyProfile?.dateOfBirth ?? userProfile?.dateOfBirth ?? null,
        ageYears: userProfile?.ageYears ?? userProfile?.age ?? null,
        heightCm: bodyProfile?.heightCm ?? userProfile?.heightCm ?? null,
        weightKg: userProfile?.weightKg ?? null,
        bodyFatPercent: latestComposition?.bodyFatPercent ?? null,
        bodyFatSource: latestComposition?.bodyFatSource ?? null,
        activityLevel: current?.activityLevel ?? userProfile?.activityLevel ?? null,
        goalPhase: current?.goal ?? userProfile?.goalPhase ?? null,
      });
      const computed = computeDietBreakTargets(
        current,
        sex,
        freshAuthority.resolved.effectiveMaintenanceKcal,
      );
      if (!computed) {
        // NU-3: never a silent no-op. A diet-break null means there is no
        // deficit left to raise (the floor cannot block an increase).
        setApplyNotice(n => ({
          ...n,
          dietBreak: 'Nothing to raise. Your target already sits at or above maintenance.',
        }));
        setDietBreakPreviewChanged(false);
        return;
      }
      // The visible absolute target is part of consent. If live inputs moved
      // since the card loaded, refresh the preview and require a second tap
      // instead of applying a number the athlete was never shown.
      if (Number(dietBreakPreviewKcal) !== Number(computed.newKcal)) {
        setCurrentTargets(current);
        setLiveMaintenanceAuthority(freshAuthority.resolved);
        setDietBreakPreviewChanged(true);
        setApplyNotice(n => ({
          ...n,
          dietBreak: 'Your maintenance estimate changed. Review the updated target, then tap again.',
        }));
        return;
      }
      await saveNutritionTargets(user.id, computed.targets);
      // ATOMICITY (P1, adversarial audit 2026-08-26). The authoritative write
      // has landed, so reflect it NOW, before the receipt. Previously
      // setCurrentTargets ran after saveCoachOutput, so a receipt failure left
      // the consent preview showing the pre-change base while the real target
      // had already moved: the row still offered Apply, and the coach's own
      // record said not-applied for a change the athlete had actually taken.
      setCurrentTargets(computed.targets);
      await AsyncStorage.setItem(
        '@volyume_nutrition_targets', JSON.stringify(computed.targets),
      ).catch(() => {});
      const updated = markApplied(output, 'dietBreak', {
        newKcal: computed.newKcal,
        maintenanceAuthority: effectiveMaintenanceReceipt(freshAuthority.resolved),
      });
      // Same second-write reasoning as the calorie row above.
      let receiptOk = true;
      try {
        await saveCoachOutput(user.id, { weekStart, ...updated });
      } catch (e) {
        receiptOk = false;
        logError('CoachOutputScreen.applyDietBreak.receipt', e, { userId: user?.id });
      }
      setOutput(updated);
      setApplySettling(s => ({ ...s, dietBreak: true }));
      if (!receiptOk) {
        setApplyNotice(n => ({
          ...n,
          dietBreak: 'Applied. We could not save the record of it, so it may be offered again next time.',
        }));
      }
      setLiveMaintenanceAuthority(freshAuthority.resolved);
      setDietBreakPreviewChanged(false);
    } catch (e) {
      logError('CoachOutputScreen.handleApplyDietBreak', e, { userId: user?.id });
    } finally {
      setApplyingKey(null);
      applyingRef.current = false;
    }
  }

  useEffect(() => {
    async function load() {
      const checkin = await getLatestCheckin(user.id, weekStart);
      // PM-01(a) / PM-03 (D96): a week with no check-in is not a week the
      // coach has reviewed. Running the engine on it produced the
      // low-adherence verdict from an empty week ("get back to your full
      // plan", on a Monday morning), PERSISTED it, and Home then advertised
      // it as this week's decision -- while the Coach tab, using the
      // completed-decision predicate, correctly said nothing. It also
      // permanently retired the week-one trial ledger, the one surface built
      // to make the loop visible before the first review.
      //
      // A real weekly check-in always sets an energy score (step 0 is
      // required), so that is the "this week was reviewed" signal, exactly as
      // WeeklyCheckInScreen's own alreadyDone test uses it. With no check-in
      // for this week, open the latest COMPLETED decision instead; if there
      // is none, the screen still renders (the hold receipt / baseline view
      // below) but nothing is written. No engine change: weeklyCoach and
      // coachApply are untouched.
      const weekWasCheckedIn = checkin?.energyScore != null;
      if (!weekWasCheckedIn && redirectWeekStart == null) {
        const latestOutput = await getLatestCoachOutput(user.id).catch(() => null);
        const latestWeek = Number(latestOutput?.weekStart);
        if (Number.isFinite(latestWeek) && latestWeek < weekStart) {
          const latestCheckin = await getLatestCheckin(user.id, latestWeek).catch(() => null);
          if (isCompletedCoachDecision(latestOutput, latestCheckin)) {
            setRedirectWeekStart(latestWeek);
            return; // the effect re-runs against the reviewed week
          }
        }
      }
      // COMP-026 (A): the adaptive-TDEE resize needs ~4+ weeks of weight to
      // reach 'high' confidence and size the calorie change from real energy
      // balance instead of the blunt fixed step. A 14-day window capped
      // confidence at 'low', leaving that path dead in production. Widen to a
      // 60-day window; confidence is distinct-calendar-day based
      // (ewmaCoverageWeeks) so the wider fetch can't be gamed by same-day logs.
      const weights = await getMorningWeights(user.id, 60);
      // Weigh-ins inside the displayed week feed the five-part response's
      // acknowledgement and cue. Counted here so the pure builder never
      // needs a DB read. Counted as DISTINCT local days, never raw rows:
      // the engine's hold and confidence credit one weigh-in per morning
      // (weeklyCoach weighInDayCount), so a same-morning double log must
      // not show the user more credit than the engine gave.
      try {
        const weekEnd = weekStart + 7 * 86400000;
        setWeighInsThisWeek(new Set(
          weights
            .filter(w => Number.isFinite(Number(w.loggedAt)) && Number(w.loggedAt) >= weekStart && Number(w.loggedAt) < weekEnd)
            .map(w => localDayKey(Number(w.loggedAt)))
        ).size);
      } catch (_) { setWeighInsThisWeek(null); }
      // Calm mode tightens the response the same way an open ED flag does
      // (no rate language, no weigh-in counts), per the COMP-004 rules.
      // Fail closed: an unreadable wellbeing read tightens the response (calm),
      // matching the open-ED-flag path; getWellbeingMode swallows failures.
      const wbMode = await AsyncStorage.getItem(WELLBEING_KEY).then((v) => v || 'unspecified').catch(() => 'read_failed');
      const calmNow = isCalm(wbMode) || wbMode === 'read_failed';
      const hideExactScanRanges = await getProgressScanHideExactPreference();
      setCalmMode(calmNow);
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
      // Campaign 1 P0-7 D1: a FAILED intake read must be distinguishable
      // from a genuinely empty diary - the old catch returned the exact
      // "no food logged" shape, so a food-DB error silently disabled the
      // RED-S FFM floor gate and a calorie cut could proceed on a user
      // already at or below their floor. The engine holds any cut when
      // readFailed is set.
      const intake = await getRecentIntakeSummary(user.id).catch(() => ({ avgKcal: null, daysLogged: 0, readFailed: true }));
      const bodyProfile = await getUserBodyProfile(user.id).catch(() => null);
      const latestBf = (await getBodyMetricLog(user.id, 60).catch(() => []))
        .find(m => m.bodyFatPercent != null) ?? null;
      const latestWeight = weights
        .filter(row => Number(row?.weightKg) > 0)
        .slice().sort((a, b) => Number(a.loggedAt) - Number(b.loggedAt)).pop();
      const maintenanceAuthority = await resolveEffectiveMaintenanceForUser(user.id, {
        sex: bodyProfile?.sex ?? userProfile?.sex ?? null,
        dateOfBirth: bodyProfile?.dateOfBirth ?? userProfile?.dateOfBirth ?? null,
        ageYears: userProfile?.ageYears ?? userProfile?.age ?? null,
        heightCm: bodyProfile?.heightCm ?? userProfile?.heightCm ?? null,
        weightKg: latestWeight?.weightKg ?? userProfile?.weightKg ?? null,
        bodyFatPercent: latestBf?.bodyFatPercent ?? null,
        bodyFatSource: latestBf?.bodyFatSource ?? null,
        activityLevel: nutrition?.activityLevel ?? userProfile?.activityLevel ?? null,
        goalPhase: userProfile?.goalPhase ?? nutrition?.goal ?? 'maint',
      }, { weights, intake });

      // A1 (NU-3/NU-4): keep the just-read targets + sex for the pre-tap
      // Apply-row classification, and clear any stale tap-time notices.
      setCurrentTargets(nutrition ?? null);
      setProfileSex(bodyProfile?.sex ?? userProfile?.sex ?? null);
      setApplyNotice({});
      setDietBreakPreviewChanged(false);

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
      // C6 P-2 (D97-20): distinct phase weeks with a saved weekly run,
      // plus the week being run now. Bounds the engine's CLAIM copy (week
      // label, diet-break wording) so months away are never narrated as
      // continuously coached months; the phase clock above is untouched.
      const evidencedWeeksInPhase = phaseStartedAt
        ? new Set([...(await getCoachOutputWeekStartsSince(user.id, phaseStartedAt)), weekStart]).size
        : 1;

      // Compute consecutivePoorRecoveryWeeks from recent check-ins
      const recentCheckins = await getRecentCheckins(user.id, 4);
      // C6 Phase 26 (D97): "consecutive" means adjacent CALENDAR weeks.
      // These runs used to iterate ROWS, so a months-long gap chained an
      // ancient week onto today's and a returning user's first hard week
      // counted as the "second consecutive" - false certainty in both
      // directions (lapse-is-not-failure law). A row joins the run only
      // when it is the expected next-older week; a gap ends the run.
      // consecutiveGrade3RecoveryWeeks below is deliberately NOT
      // adjacency-gated: it certifies the ABSENCE of persistent fatigue,
      // and an unknown gap must keep withholding that certification.
      const WEEK_STEP_MS = 7 * 86400000;
      const isAdjacent = (expected, ws) =>
        expected == null || (ws != null && Math.abs(ws - expected) <= 86400000);
      const consecutivePoorRecoveryWeeks = (() => {
        // Campaign 1 P0-7 D2: a row with NO recorded scores is no evidence
        // and must not terminate the run - the old ?? 3 defaults made a
        // partial row (e.g. the sleep-only row the workout summary writes)
        // silently reset this counter to 0, and matrixDeload hard-gates on
        // it. Only recorded values count or end the run.
        let count = 0;
        let expected = null;
        for (const ci of recentCheckins) {
          const ws = ci.weekStart ?? null;
          if (!isAdjacent(expected, ws)) break; // a calendar gap ends the run
          expected = ws != null ? ws - WEEK_STEP_MS
            : (expected != null ? expected - WEEK_STEP_MS : null);
          const e = ci.energyScore;
          const s = ci.sorenessScore;
          if (e == null && s == null) continue; // no evidence: skip, never break
          if ((e != null && e <= 2) || (s != null && s >= 4)) count++;
          else break;
        }
        return count;
      })();

      // Stage 4 review remediation: consecutive PRIOR weeks already in
      // grade-3 soreness territory (the poor-recovery counter above only
      // sees energy <= 2 / soreness >= 4). Same unbroken-run derivation,
      // but the current week's own check-in is excluded — it is the week
      // being judged, not its history.
      const consecutiveGrade3RecoveryWeeks = (() => {
        // Campaign 1 P0-7 D3: this counter certifies the ABSENCE of
        // persistent fatigue so the peak-week softening may fire (an
        // upward-leaning move). Unknown history cannot certify absence:
        // a missing soreness score counts as grade-3 territory (the run
        // continues) rather than as the old ?? 2 "not sore" that broke
        // the run at 0 and unlocked the softening. This withholds an
        // upgrade on unknowns - it never proposes anything downward, so
        // no pain is manufactured.
        let count = 0;
        for (const ci of recentCheckins) {
          if ((ci.weekStart ?? 0) >= weekStart) continue; // this week's row
          if (ci.sorenessScore == null || ci.sorenessScore >= 3) count++;
          else break;
        }
        return count;
      })();

      // Compute consecutiveOffTargetWeeks from recent coach outputs.
      // C6 Phase 26 (D97): chain only when the last output is the
      // immediately previous week - getLatestCoachOutput has no age
      // bound, so a six-month-old off-target output used to increment on
      // the first run after a return, as though the absent months were
      // consecutive off-target weeks. (The sibling
      // lastCalAdjustmentWeeksAgo below already counts real elapsed
      // weeks; this brings the counter to the same standard.)
      const lastOutput = await getLatestCoachOutput(user.id);
      const lastOutputAdjacent = lastOutput?.weekStart != null
        && Math.abs(weekStart - lastOutput.weekStart - WEEK_STEP_MS) <= 86400000;
      const consecutiveOffTargetWeeks = lastOutputAdjacent && lastOutput?.trend?.onTarget === false
        ? (lastOutput?.consecutiveOffTargetWeeks ?? 0) + 1
        : 0;

      // D15 (founder ruling 2026-07-09, plan-G section 3): consecutiveExceededWeeks,
      // same derivation style as consecutivePoorRecoveryWeeks directly above
      // (iterate the same recentCheckins rows, most-recent-first, count the
      // unbroken run, break at the first non-match). "Exceeded" is the
      // check-in's own stored trainingPerformance verdict (checkinDerive.js's
      // over-performance case), not a newly invented metric.
      const consecutiveExceededWeeks = (() => {
        let count = 0;
        let expected = null;
        for (const ci of recentCheckins) {
          const ws = ci.weekStart ?? null;
          // C6 Phase 26 (D97): same adjacency rule - ancient "exceeded"
          // weeks chained across a gap fed the D15 faster-update path
          // with false upward evidence.
          if (!isAdjacent(expected, ws)) break;
          expected = ws != null ? ws - WEEK_STEP_MS
            : (expected != null ? expected - WEEK_STEP_MS : null);
          if (ci.trainingPerformance === 'exceeded') count++;
          else break;
        }
        return count;
      })();

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
      // ED-safety, fail CLOSED: a transient flag read maps to the truthy
      // 'read_failed' sentinel so the weekly-share suppress stays true at a
      // possibly-flagged user (matches the contest-countdown read above).
      const openFlag = await getOpenEdPatternFlag(user.id).catch(() => 'read_failed');
      const edPatternOpen = !!openFlag;
      const scanCoachSummary = await getProgressScanCoachSummary(user.id, {
        suppressed: isPhotoSuppressed(calmNow, edPatternOpen),
      }).catch(() => null);


      // Stage 4 (2026-08-09): week-in-block fatigue context. A finished
      // block awaiting the user's decision is NOT a live week, so it
      // passes null and the engine runs context-free.
      const mesoWkForCoach = await getCurrentMesocycleWeek(user.id).catch(() => null);
      const liveBlockWeek = mesoWkForCoach && !mesoWkForCoach.awaitingDecision ? mesoWkForCoach : null;
      // Stage 8 (§3.6): the ramp position for the training card's note.
      // Only for the CURRENT week (review #11: the block position is
      // always live, so attaching it to a past week's output mismatched
      // the two), and carrying the WRITTEN planned totals for this and
      // next week so the climb claim derives from the plan, not the
      // week index (review #7). Totals are best-effort: without them the
      // line simply makes no climb claim.
      const viewingCurrentWeek = weekStart === localWeekStartMs();
      let rampWeek = null;
      if (viewingCurrentWeek && liveBlockWeek) {
        rampWeek = { weekIndex: liveBlockWeek.weekIndex, plannedWeeks: liveBlockWeek.plannedWeeks };
        try {
          // eslint-disable-next-line global-require
          const { getPlannedMuscleVolumeForBlock } = require('../lib/database');
          const planRows = await getPlannedMuscleVolumeForBlock(liveBlockWeek.mesocycleId);
          const weekTotal = (wk) => planRows
            .filter(r => (r.week_index ?? r.weekIndex) === wk)
            .reduce((acc, r) => acc + (r.planned_sets ?? 0), 0);
          rampWeek.thisWeekSets = weekTotal(liveBlockWeek.weekIndex);
          rampWeek.nextWeekSets = weekTotal(liveBlockWeek.weekIndex + 1);
        } catch (_e) { /* climb claim simply stays silent */ }
      }
      setBlockWeekForRamp(rampWeek);

      // C10G F-6: the block-so-far strength slope, the alternative route to
      // the top performance grade (D91-9). Only for a LIVE block, and only
      // ever a real reading: a read failure or a block with no usable
      // strength series passes null, which leaves the engine's legacy
      // PR-only performance read exactly as it was.
      let blockSlopePct = null;
      if (liveBlockWeek) {
        // eslint-disable-next-line global-require
        const { computeLiveBlockSlopePct } = require('../lib/blockLedgerRunner');
        blockSlopePct = await computeLiveBlockSlopePct(user.id).catch(() => null);
      }

      // CAMPAIGN 18 outcome follow-up: the interventions the user has actually
      // ACCEPTED, read BEFORE the run so the anti-oscillation gate can see
      // them. Best-effort - a read failure yields no records, which leaves
      // the engine's pre-Campaign-18 behaviour exactly as it was.
      const coachOutputHistory = await getCoachOutputHistory(user.id, 8).catch(() => []);
      const priorInterventions = interventionsFromHistory(coachOutputHistory);
      setPriorInterventions(priorInterventions);
      // CAMPAIGN 18 job B: what the user has already said no to.
      const priorDeclines = declinesFromHistory(coachOutputHistory);
      // C18 adversarial closure job B4: the volume dials the athlete holds
      // themselves. A volume outcome read against a muscle they set by hand
      // is CONFOUNDED, not a verdict on our change. Best-effort: an empty
      // list on failure leaves the loop exactly as it was.
      // eslint-disable-next-line global-require
      const { getManualVolumeMuscles } = require('../lib/effectiveLandmarks');
      const manualVolumeMuscles = await getManualVolumeMuscles(user.id).catch(() => []);

      // Campaign 23 R2 (D99, superseding D18's render-time-only split): the
      // coarse corroboration basis — {eligible, scanDirection} only, never a
      // score/band/estimate/id — derived pre-run from the same bounded,
      // suppression-aware scan summary loaded above. The engine resolves the
      // 'supports' direction against its OWN emitted trend and applies its
      // one-step rule under its own senior blocked-set (ED hold, FFM floor,
      // rapid-loss, safety hold, SCOFF, calm), so the recorded, synced and
      // displayed confidence are one value.
      const photoCorroborationBasis = buildPhotoCorroborationBasis(scanCoachSummary, { nowMs: Date.now() });
      // CC31 (section 20): the physicalConstraint fact, assembled from the
      // capability lane's own reads. Best-effort: any failure passes null
      // and the engine behaves exactly as before the fact existed.
      let physicalConstraint = null;
      try {
        // eslint-disable-next-line global-require
        const { loadCapabilityResolveState, blockingConflicts } = require('../lib/capability/resolve');
        const capState = await loadCapabilityResolveState(user.id, {});
        const episodeIds = new Set((capState.restrictions ?? [])
          .filter((r) => r.role === 'episode').map((r) => r.id));
        if (episodeIds.size) {
          // eslint-disable-next-line global-require
          const { getAllExercises } = require('../lib/database');
          // eslint-disable-next-line global-require
          const { getCapabilityWeekNote } = require('../lib/capability/weekNote');
          const library = await getAllExercises();
          const affected = new Set();
          for (const ex of library) {
            if (!ex?.primaryMuscle) continue;
            // Decision layer (D112 R4): allowed exercises do not count a
            // muscle as constraint-affected - clinician rules excepted.
            if (blockingConflicts(capState, ex).some((c) => !c.unknown && episodeIds.has(c.constraintId))) {
              affected.add(ex.primaryMuscle);
            }
          }
          const note = await getCapabilityWeekNote(user.id, weekStart).catch(() => null);
          physicalConstraint = {
            active: true,
            affectedMuscles: [...affected],
            excusedThisWeek: sessionStats.constraintExcusedSessions ?? 0,
            weeklyAnswer: note?.answer ?? null,
          };
        }
      } catch (_e) { physicalConstraint = null; }
      const result = runWeeklyCoach({
        checkin: engineCheckin,
        physicalConstraint,
        priorInterventions,
        priorDeclines,
        manualVolumeMuscles,
        photoCorroborationBasis,
        morningWeights: weights,
        sessionsCompleted: sessionStats.completed,
        sessionsPlanned: sessionStats.planned,
        prsThisWeek: prs,
        blockWeekIndex: mesoWkForCoach?.awaitingDecision ? null : (mesoWkForCoach?.weekIndex ?? null),
        blockAccumWeeks: liveBlockWeek && Number.isFinite(liveBlockWeek.plannedWeeks) && liveBlockWeek.plannedWeeks > 1
          ? liveBlockWeek.plannedWeeks - 1
          : null,
        blockE1rmSlopePct: blockSlopePct,
        consecutiveGrade3RecoveryWeeks,
        // Calorie safety + adherence sizing inputs (food log + body comp).
        recentIntakeAvgKcal: intake.avgKcal,
        recentIntakeDaysLogged: intake.daysLogged,
        // Campaign 1 P0-7 D1: the read-failure sentinel reaches the engine
        // so a food-DB error holds calorie cuts instead of bypassing the
        // FFM floor gate.
        intakeReadFailed: !!intake.readFailed,
        bodyFatPercent: latestBf?.bodyFatPercent ?? null,
        bodyFatSource: latestBf?.bodyFatSource ?? null,
        // Campaign 1 P0-7 D4: a failed body-profile read must not null out
        // sex (which selects the calorie floor) - fall back to the main
        // profile's onboarding-enforced value, as the display path already
        // does.
        sex: bodyProfile?.sex ?? userProfile?.sex ?? null,
        // C10D: the extra cycle opt-in, read fresh. Without it the engine
        // defaults to OFF and performs no cycle-specific interpretation,
        // including on a menstrual flag parsed from the free-text note.
        cycleTrackingEnabled: await getCycleTracking().catch(() => false),
        // Step targets are not part of the shipped coaching product.
        dailyStepsSeries: null,
        stepsTodayKey: null,
        goalPhase: userProfile?.goalPhase ?? 'maint',
        trainingGoal: userProfile?.trainingGoal ?? null,
        weeksInPhase,
        evidencedWeeksInPhase,
        goalStartDate: userProfile?.goalStartDate ?? null,
        consecutiveOffTargetWeeks,
        consecutivePoorRecoveryWeeks,
        // D15: sustained over-performance escalation input + its calm-mode
        // gate. calmNow was already read above (the same wellbeing check
        // every other suppression on this screen uses).
        consecutiveExceededWeeks,
        calmMode: calmNow,
        lastCalAdjustmentDirection,
        lastCalAdjustmentWeeksAgo,
        currentCalTarget: nutrition?.targetKcal ?? null,
        currentProteinG: nutrition?.proteinG ?? null,
        currentCarbsG: nutrition?.carbsG ?? null,
        currentFatG: nutrition?.fatG ?? null,
        currentMaintenanceKcal: nutrition?.tdee ?? null,
        maintenanceAuthority: maintenanceAuthority.resolved,
        currentStepsTarget: 0,
        stepsEnabled: false,
        bodyweightKg: userProfile?.weightKg ?? null,
        units,
        // Campaign 1 P0-7 D12: fail CLOSED on a missing profile (see the
        // countdown read above for the rationale).
        scoffPositive: userProfile == null || (userProfile.scoffScore ?? 0) >= 2,
        recentWeeklyHistory,
        // Founder decision 2026-07-02 (Wave-3 review): the food-diary
        // stand-in needs a completed check-in within 14 days. Most recent
        // first from getRecentCheckins; created_at is the completion time.
        // C6 P-4 (D97-20): COMPLETED means a row with check-in answers -
        // the sleep-only row a workout summary writes is no evidence and
        // must not hold the recalibration gate open.
        lastCheckinAt: (() => {
          const completed = recentCheckins.find((ci) =>
            ci.energyScore != null || ci.sorenessScore != null || ci.calsAdherence != null);
          return completed?.createdAt ?? completed?.weekStart ?? null;
        })(),
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
      });
      // Learning is observational. An ED/FFM/manual-target intervention hold
      // cannot erase a valid energy-balance observation; only an evidence
      // confounder (cycle override or an unusual-event check-in) holds it.
      const learnedMaintenance = await learnEffectiveMaintenanceForUser(
        user.id,
        maintenanceAuthority,
        result.effectiveMaintenance?.adaptiveObservation,
        {
          confounded: !!engineCheckin?.cycleOverride || !!engineCheckin?.notes?.trim(),
        },
      );
      const receiptAuthority = learnedMaintenance.updated
        ? resolveEffectiveMaintenance({
          formulaPriorKcal: maintenanceAuthority.formula?.formulaPriorKcal,
          memo: learnedMaintenance.memo,
          context: maintenanceAuthority.context,
          evidenceSignature: maintenanceAuthority.evidenceSignature,
        })
        : maintenanceAuthority.resolved;
      result.effectiveMaintenance = {
        ...result.effectiveMaintenance,
        authority: effectiveMaintenanceReceipt(receiptAuthority),
        learningStatus: learnedMaintenance.updated ? 'persisted' : learnedMaintenance.reason,
      };
      setLiveMaintenanceAuthority(receiptAuthority);
      const resultEdPatternOpen = edPatternOpen
        || !!result.edPatternFired
        || !!(result.heldDecisions ?? []).some(d => d.type === 'ed_pattern_lockout');
      const scanNote = resolveProgressScanCoachNote({
        scan: scanCoachSummary,
        output: result,
        suppressed: isPhotoSuppressed(calmNow, resultEdPatternOpen),
        trendOnly: hideExactScanRanges,
      });
      // v2 assessment receipt (integration-plan.md §6): classified from the
      // engine's OWN outputs already in scope here (result.trend/goalPhase/
      // heldDecisions/loadSignal), never from a re-run or a scan-derived
      // value. Anchored to nowMs = this run's own moment: the screen re-runs
      // runWeeklyCoach fresh on every load (result above), so the decision
      // and this receipt always move together from the same live inputs.
      // Anchoring to weekStart (Monday) would wrongly exclude the primary
      // flow, a scan taken just before a mid-week check-in; and the evidence
      // layer rejects any capturedAt after nowMs, so a scan can never enter
      // a window that predates it. targetsChanged is derived from the
      // calorie adjustment the card already shows, never invented.
      const scanCalorieChange = result.adjustments?.calories?.change;
      const scanTargetsChanged = Number.isFinite(scanCalorieChange) && scanCalorieChange !== 0;
      const scanEvidencePacket = scanNote ? composeScanEvidencePacket({
        scan: scanCoachSummary,
        note: scanNote,
        weightTrend: result.trend,
        goalPhase: result.goalPhase,
        targetsChanged: scanTargetsChanged,
        heldDecisions: result.heldDecisions,
        loadSignal: result.loadSignal,
        nowMs: Date.now(),
      }) : null;
      setProgressScanCoachContext(scanNote ? { ...scanNote, packet: scanEvidencePacket } : null);

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
      // Coach-wiring audit finding 1 (2026-07-13): the off-target counter fed
      // to the engine was derived from lastOutput.consecutiveOffTargetWeeks
      // but NEVER persisted, so it could only ever be 0 or 1 and the standard
      // calorie-adjustment gate (needs 2-3 consecutive weeks) could never
      // fire. Persist the value that was passed in this week, and keep it in
      // the React state object too: the apply handlers re-save the whole
      // record from state, so a missing field there would wipe it on the
      // first tap of Apply.
      const persistedResult = { ...result, consecutiveOffTargetWeeks, lastCalAdjustmentWeekStart };
      // PM-01(a) / PM-03: persist only a week the user actually checked in
      // for. This save used to run on EVERY load, so merely opening the
      // screen (the Monday push, the volyume://coach deep link) manufactured
      // a stored "decision" for a week with no evidence in it. The apply
      // handlers still re-save from state, and they can only run on a real
      // review.
      if (weekWasCheckedIn) {
        await saveCoachOutput(user.id, { weekStart, ...persistedResult });
      }

      setOutput(persistedResult);

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

        // D15: adherence-why, said once, on the first REAL weekly output
        // (baseline/insufficient-data runs never reach this branch). The
        // other placement is ProSetupCompleteScreen, shown once at setup.
        try {
          const seenAdherenceWhy = await AsyncStorage.getItem(ADHERENCE_WHY_SEEN_KEY);
          if (seenAdherenceWhy !== 'true') {
            setShowAdherenceWhy(true);
            await AsyncStorage.setItem(ADHERENCE_WHY_SEEN_KEY, 'true');
          }
        } catch (_) { /* best-effort; a read/write failure just skips the one-off line */ }
      }

      // A3 (audit 04 §4): when the coach holds for thin data, build the full
      // held-decision receipt, the live counts vs the published thresholds,
      // the rule (the engine's own hold message), and the named unlock date.
      // Neutral (no weigh-in counts) under an open ED flag.
      if (!result.hasEnoughData) {
        try {
          // Mirror the engine's weighInDayCount exactly (weeklyCoach: a
          // 7-day window anchored at the LATEST weigh-in, distinct local
          // days, untimed rows counting one each) so the receipt can never
          // show more credit than the hold it explains was computed from.
          const timedRows = weights.filter(w => Number.isFinite(Number(w.loggedAt)));
          const untimedRows = weights.length - timedRows.length;
          let weighIns7d;
          if (!timedRows.length) {
            weighIns7d = untimedRows;
          } else {
            const latestMs = Math.max(...timedRows.map(w => Number(w.loggedAt)));
            const windowStartMs = latestMs - 7 * 86400000;
            weighIns7d = new Set(
              timedRows
                .filter(w => Number(w.loggedAt) >= windowStartMs)
                .map(w => localDayKey(Number(w.loggedAt)))
            ).size + untimedRows;
          }
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
        setBlockAwaitingDecision(!!cur?.awaitingDecision);
        // getNextMesocycleWeek returns the raw row (snake_case is_deload).
        setNextWeekIsDeload(next?.is_deload === 1);
        // FB-06: the signal was already loaded here, just never read.
        setCurrentWeekIsDeload(!!cur?.isDeload && !cur?.awaitingDecision);
        // C18: the GATED state, same as Home and Train.
        // eslint-disable-next-line global-require
        const { resolveProgrammePosition } = require('../lib/programmePosition');
        const pos = await resolveProgrammePosition(user.id).catch(() => null);
        setCurrentRecoveryState(pos?.recoveryState ?? cur?.recoveryState ?? null);
      } catch (_e) {
        setNextTrainingWeekId(null);
        setBlockAwaitingDecision(false);
        setNextWeekIsDeload(false);
        setCurrentWeekIsDeload(false);
        setCurrentRecoveryState(null);
      }

      // Load the last 5 outputs; skip the first (current week) for the history shelf
      const history = await getCoachOutputHistory(user.id, 5);
      setCoachHistory(history.slice(1, 5));

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
  // PM-01(a): redirectWeekStart is in the dependency list so the one-shot
  // redirect to the reviewed week re-runs the load against it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, reloadKey, redirectWeekStart]);

  // Ultimate-Audit item 11 (D16, founder ruling 2026-07-10,
  // pass3-v2-founder-decisions.md:166 + NA-coaching-10, pass4-blueprints-
  // coaching-progress.md:283-291): Coached mode invokes the SAME apply
  // handlers a Collaborative tap would, instead of waiting for the tap.
  // Every clamp and floor inside those handlers and inside coachApply.js
  // (kcalFloorForSex, the [mev, mrv] volume clamp) runs identically either
  // way -- only who confirms differs. D16 refinement: any open safety hold
  // (output.autoApplyHoldActive, the ONE place weeklyCoach.js computes
  // "is a hold open right now") forces confirm-first regardless of mode, so
  // Coached falls back to the standard tap-to-apply Collaborative already
  // has (the onApply props below stay wired in both modes; only Manual
  // strips them). One apply at a time: each handler's own applyingKey guard
  // stops two running together, and this effect re-fires as `output` (and
  // nextTrainingWeekId) settle after every apply, walking the list until
  // nothing un-applied remains -- never re-deriving order from anything but
  // the engine's own output.
  useEffect(() => {
    if (coachAutonomy !== 'coached') return;
    if (!output || !user?.id) return;
    if (applyingKey) return;
    if (output.autoApplyHoldActive) return; // D16: hold forces confirm-first
    // C6 Phases 16 + 26 (D97): auto-apply executes the CURRENT cycle's
    // decision only - this week's output, or the immediately reviewed
    // week the Monday redirect lands on. The redirect itself has no age
    // bound (it opens the latest completed decision), so a returning
    // Coached user's months-old reviewed-but-unapplied output would
    // otherwise be executed into TODAY's block the moment the tab
    // opened. An older output keeps its manual Apply buttons; resuming
    // is the user's tap, never a resurrection.
    {
      const liveWeek = localWeekStartMs();
      const outWeek = Number(output?.weekStart ?? weekStart);
      if (Number.isFinite(outWeek) && liveWeek - outWeek > 7 * 86400000) return;
    }

    // Deload supersedes the incremental training-volume push for the week
    // (TrainingNextWeekCard shows one or the other, never both); Coached
    // mode follows the same either/or so it can never apply a push the
    // Collaborative UI would never have offered this week.
    if (output.deloadSuggested) {
      if (!isApplied(output, 'deload') && nextTrainingWeekId) {
        handleApplyDeload();
      }
      return;
    }
    // Stage 4: mirror handleApplyTraining's deload-row guard, or the walk
    // would call a handler that returns without changing state and stall
    // here for ever — silently skipping every nutrition apply below.
    if (output.volumeSignal && !isApplied(output, 'training') && nextTrainingWeekId
      && !(output.volumeSignal > 0 && nextWeekIsDeload)) {
      handleApplyTraining();
      return;
    }
    if (output.adjustments?.calories && output.adjustments.calories.change !== 0 && !isApplied(output, 'calories')) {
      handleApplyCalories();
      return;
    }
    if (output.dietBreakSuggested && !isApplied(output, 'dietBreak')) {
      handleApplyDietBreak();
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachAutonomy, output, applyingKey, nextTrainingWeekId, user?.id]);

  function handleClose() {
    // The user arrived here from the Coach tab via WeeklyCheckIn. Closing
    // the coach output should land them back on the You root, not on the
    // WeeklyCheckIn screen they just submitted. Both screens sit in the
    // same Profile stack, so popToTop is the right primitive: You
    // (YouScreen) is the stack root.
    navigation.popToTop();
  }

  // Back affordance: BackHeader's chevron uses the same Hub-bound handler as
  // the in-screen "Got it" button (popToTop to the You root, not a literal
  // goBack onto the WeeklyCheckIn screen just submitted), so both read as
  // one consistent "back" across every state of this screen.

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Coaching decision" onBack={handleClose} />
        <LoadingView />
      </SafeAreaView>
    );
  }

  // ── Load error state (retryable) ───────────────────────────────────────────
  if (loadError) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Coaching decision" onBack={handleClose} />
        <LoadErrorView onRetry={() => setReloadKey(k => k + 1)} onClose={handleClose} />
      </SafeAreaView>
    );
  }

  // ── Insufficient data state ────────────────────────────────────────────────
  if (!output || !output.hasEnoughData) {
    return (
      <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
        <BackHeader title="Coaching decision" onBack={handleClose} />
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
    cyclePhaseNote,
    whyThisWeek,
    deloadSuggested,
    deloadNote,
    dietBreakSuggested,
    dietBreakWeeksInDeficit,
    heldDecisions,
    rapidWeightLossFlag,
    confidence,
    prsThisWeek,
    sessionsCompleted,
    sessionsPlanned,
    // Campaign 18: the very context and classification this run decided from.
    context: coachCtx,
    limiters: coachLimiters,
  } = output;

  // CAMPAIGN 18 JOBS 10 + 12. One week, one account, written from the SAME
  // context object the engine decided on rather than from a second reading of
  // the same week - so the story cannot describe a decision the engine did
  // not take. `changes` carries only what the engine actually produced.
  // Not memoised, deliberately: this destructure sits AFTER the screen's
  // early returns, so a hook here would be called conditionally. buildCoachStory
  // is a pure string assembly over an object the run already produced - the
  // same reasoning the file's own buildLiveStyles(t) call documents above.
  // CAMPAIGN 18 OUTCOME FOLLOW-UP, at the surface. The most recent accepted
  // change, classified against the context THIS run produced - so the line
  // the user reads and the memory a later decision uses are the same
  // judgement, not two.
  const lastIntervention = priorInterventions[0] ?? null;
  const lastOutcome = lastIntervention
    ? classifyOutcome(lastIntervention, {
      after: coachCtx,
      windowMet: observationWindowMet(lastIntervention, { nowMs: Date.now() }),
    })
    : null;
  const lastOutcomeLine = lastOutcome
    ? outcomeCopy(lastIntervention, lastOutcome.outcome)
    : null;

  const weeklyStory = buildCoachStory({
    context: coachCtx,
    limiters: coachLimiters,
    // CAMPAIGN 18. Three memory lines, in priority order: a recommendation
    // that has RETURNED says why it has (job B3); a change that worked and is
    // still working says so (job A3); otherwise the outcome of the last
    // change. Only one leads the account - three would be a lecture.
    outcome: output.returningAfterDecline
      ? { text: output.returningAfterDecline, state: 'returning' }
      : output.holdReinforcement
        ? { text: output.holdReinforcement.text, state: 'hold_reinforced' }
        : lastOutcomeLine ? { text: lastOutcomeLine, state: lastOutcome.outcome } : null,
    changes: {
      calorieKcal: adjustments?.calories?.change ?? 0,
      volumeNote: adjustments?.training?.signal === 'hold' ? 'Your training volume holds where it is.' : null,
    },
  });

  // Trend chip: arrow icon + colour. Class B body-data surface (COMP-027):
  // a body-weight trend never wears red. On target reads onTrack; off target
  // caps at watch (worth a look, not a verdict); under an open ED-pattern
  // flag the chip drops to neutral entirely. The weight numeral itself is
  // always textPrimary (set on the value below), colour lives on the icon.
  const edPatternOpen = !!(heldDecisions?.some(d => d.type === 'ed_pattern_lockout'));
  const canShowProgressScanCoachContext = !!progressScanCoachContext && !isPhotoSuppressed(calmMode, edPatternOpen);
  // v2 assessment receipt: dedupe the non-authority sentence against the
  // card body BEFORE render (see dedupeUsedSentence above), computed once
  // here rather than inline in JSX.
  const scanAssessmentPacket = canShowProgressScanCoachContext ? (progressScanCoachContext.packet ?? null) : null;
  // D86: the compact card renders headline + ONE muted line (the receipt's
  // detail, else the shared non-authority sentence), so dedupe runs against
  // the text that is actually rendered now.
  const scanAssessmentUsedSentence = scanAssessmentPacket
    ? dedupeUsedSentence([scanAssessmentPacket.receipt.headline, scanAssessmentPacket.receipt.detail].filter(Boolean).join(' '), scanAssessmentPacket.receipt.usedSentence)
    : null;
  // Campaign 23 R2 (D99, superseding the D18 render-time-only transform
  // that used to live here): the corroboration now happens INSIDE
  // runWeeklyCoach (fed the coarse basis at the call site above), so the
  // recorded `confidence` on this output already carries the bounded
  // one-step raise where it applied — recorded, synced and displayed are
  // one value, and older stored outputs simply display the confidence they
  // recorded. No render-time re-derivation, no photo-derived flags read.
  const displayConfidence = confidence;
  let trendIcon = 'remove-outline';
  // CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): stateColors
  // is a frozen alias onto colors.success/warning/error/textMuted (theme.js),
  // so its live equivalent is the same t.colors tokens it aliases -- no
  // separate "live stateColors" builder needed.
  let trendColor = t.colors.textMuted;
  if (trend.delta !== null && !edPatternOpen) {
    const dirColor = trend.onTarget ? t.colors.success : t.colors.warning;
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
  // C6 R-14 (D97-22): the engine's delta label is kg-only (its `units`
  // input is the immutable kg gym unit), so stone/lbs users read their
  // weekly change in kg on the one screen that decides from it while
  // every other body-weight surface honours bodyWeightUnits. Display-only
  // reformat here from the raw kg delta: stone users read weekly deltas
  // in lbs (the UK convention for changes); the maths and every stored
  // value stay kg.
  const weightChipValue = (() => {
    if (trend.delta == null || !trend.deltaLabel) return 'No weights logged';
    const bwu = bodyWeightUnits || 'st';
    if (bwu === 'kg') return trend.deltaLabel.replace(/ this week$/, '');
    const lbs = Math.round(Math.abs(trend.delta) * 2.2046226218 * 10) / 10;
    return `${trend.delta >= 0 ? '+' : '-'}${lbs} lb${lbs === 1 ? '' : 's'}`;
  })();

  // Five-part coach response (Theme A, OPP-C01/C02/C06), rendered in the
  // user's register (C1, founder decision #2): tone preference wins, else
  // automatic keys off experience. Same facts, same decisions; suppression
  // (open ED flag or calm mode) renders the supportive base untouched.
  const baseCoachResponse = buildRegisteredCoachResponse({
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
    // RC-2 (D96, Review C): same dual-key read as the plan-edit
    // narration above - `experience` is the key the profile actually has.
    experienceLevel: userProfile?.experienceLevel ?? userProfile?.experience ?? null,
    trainingAgeYears: userProfile?.trainingAgeYears ?? null,
    // T15 (comprehension-trust audit 2026-08-06): the "Show the science"
    // toggle finally reaches the copy it always claimed to change.
    showScience: !!userProfile?.showScience,
  });
  const coachResponse = applyProgressScanCoachContext(baseCoachResponse, canShowProgressScanCoachContext ? progressScanCoachContext : null);

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
  const zones = selectCoachOutputZones(output, { dietBreakSuggested });

  // A1 (NU-3/NU-4): pre-tap classification of each nutrition apply against
  // the CURRENT targets, so a row the floor would hold explains itself
  // instead of offering a dead button, and every applyable calorie row
  // states the post-tap absolute + duration before the tap. Display only;
  // every tap still re-reads and re-computes via coachApply.
  const caloriePreview = adjustments?.calories && !isApplied(output, 'calories')
    ? classifyCalorieApply(currentTargets, adjustments.calories.change ?? 0, profileSex)
    : null;
  const dietBreakPreviewKcal = dietBreakSuggested && !isApplied(output, 'dietBreak') && currentTargets
    ? (computeDietBreakTargets(
      currentTargets,
      profileSex,
      liveMaintenanceAuthority?.effectiveMaintenanceKcal ?? null,
    )?.newKcal ?? null)
    : null;
  const trainingCardEl = (
    <TrainingNextWeekCard
      output={output}
      onApply={applyDisabled ? undefined : handleApplyTraining}
      canApply={!!nextTrainingWeekId}
      blockFinished={blockAwaitingDecision}
      nextWeekIsDeload={nextWeekIsDeload}
      currentWeekIsDeload={currentWeekIsDeload}
      currentRecoveryState={currentRecoveryState}
      // Stage 8 (§3.6): ramp position; the coach clause appears only for
      // an APPLIED delta that actually changed rows (review #6), and the
      // climb claim only from the written weekly totals (review #7).
      rampLine={buildRampPositionLine({
        weekIndex: blockWeekForRamp?.weekIndex,
        plannedWeeks: blockWeekForRamp?.plannedWeeks,
        appliedDelta: output?.appliedAdjustments?.training?.volumeDelta ?? null,
        musclesChanged: output?.appliedAdjustments?.training?.musclesChanged ?? null,
        thisWeekSets: blockWeekForRamp?.thisWeekSets ?? null,
        nextWeekSets: blockWeekForRamp?.nextWeekSets ?? null,
      })}
      applyStateFor={applyStateFor}
      onApplySettled={onApplySettled}
      deloadSuggested={deloadSuggested}
      deloadNote={deloadNote}
      onApplyDeload={applyDisabled ? undefined : handleApplyDeload}
      hero={zones.heroKind === 'training'}
      navigation={navigation}
    />
  );
  const nutritionCardEl = (
    <NextWeekCard
      adjustments={adjustments}
      onApplyCalories={applyDisabled ? undefined : handleApplyCalories}
      onDeclineCalories={applyDisabled ? undefined : handleDeclineCalories}
      declined={isDeclined(output, 'calories')}
      applyStateFor={applyStateFor}
      onApplySettled={onApplySettled}
      energyUnit={energyUnit}
      caloriePreview={caloriePreview}
      calorieNotice={applyNotice.calories ?? null}
      hero={zones.heroKind === 'nutrition'}
      heroRow="calories"
    />
  );
  const dietBreakCardEl = dietBreakSuggested ? (
    <DietBreakCard
      weeksInDeficit={dietBreakWeeksInDeficit}
      continuityEvidenced={output?.dietBreakContinuityEvidenced !== false}
      applied={isApplied(output, 'dietBreak')}
      onApply={applyDisabled ? undefined : handleApplyDietBreak}
      applyState={applyStateFor('dietBreak')}
      onApplySettled={() => onApplySettled('dietBreak')}
      energyUnit={energyUnit}
      previewKcal={dietBreakPreviewKcal}
      notice={applyNotice.dietBreak ?? null}
      allowApplyWithNotice={dietBreakPreviewChanged}
      hero={zones.heroKind === 'dietBreak'}
    />
  ) : null;
  const CARD_BY_KIND = {
    training: trainingCardEl,
    nutrition: nutritionCardEl,
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Coaching decision" onBack={handleClose} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Week header */}
        <Reanimated.View entering={stage(0)} style={styles.weekHeader}>
          <Text style={[styles.weekLabel, live.weekLabel]}>{weekLabel}</Text>
          <Text style={[styles.weekRange, live.weekRange]}>{weekRangeLabel(weekStart)}</Text>
          {/* C6 RB6-9 (D97-25): a decision older than its own week says so.
              The Apply buttons stay live - resuming is the user's tap. */}
          {decisionAgeNote(weekStart, localWeekStartMs()) ? (
            <Text style={[styles.weekRange, live.weekRange]}>
              {decisionAgeNote(weekStart, localWeekStartMs())}
            </Text>
          ) : null}
        </Reanimated.View>

        {/* D15 (founder ruling 2026-07-09): the adherence-why line, said once
            ever, on the first real weekly output (showAdherenceWhy is set at
            load time from the '@volyume_seen_*' flag and never re-shown).
            The other placement is ProSetupCompleteScreen, at Pro setup. */}
        {showAdherenceWhy ? (
          <View style={styles.coachNoteRow}>
            <Ionicons name="bulb-outline" size={14} color={t.colors.primary} />
            <Text style={[styles.coachNoteText, live.coachNoteText]}>
              Consistency is what your coach reads best. The more sessions you log, the better it understands how your body responds, and the more precisely it can adjust your plan.
            </Text>
          </View>
        ) : null}

        {/* U-B-3 §4: the local headline duplicate was dropped, the engine
            coachResponse lead below is the single narration source. */}

        {/* Coach response parts 1 and 2: the specific, data-referenced
            acknowledgement and the plain-language trend read lead the
            card before any decision detail. */}
        {(coachResponse.commitmentAnswer || coachResponse.acknowledgement || baseCoachResponse.interpretation) ? (
          <Reanimated.View
            entering={stage(1)}
            style={[styles.coachLeadCard, live.coachLeadCard]}
            accessible
            accessibilityLabel={[coachResponse.commitmentAnswer, coachResponse.acknowledgement, baseCoachResponse.interpretation].filter(Boolean).join(' ')}
          >
            {/* S1c: last week's pre-commitment, answered. Leads the card, it is
                the "did the coach get it right" payoff that pulls users back. */}
            {coachResponse.commitmentAnswer ? (
              <Text style={[styles.coachLeadCommitment, live.coachLeadCommitment]}>{coachResponse.commitmentAnswer}</Text>
            ) : null}
            {coachResponse.acknowledgement ? (
              <Text style={[styles.coachLeadAck, live.coachLeadAck]}>{coachResponse.acknowledgement}</Text>
            ) : null}
            {/* D86: the lead paragraph is the WEEKLY decision only, so it
                renders the base interpretation. The photo sentence that
                applyProgressScanCoachContext folds in (wiring unchanged, see
                progressScanCoachIsolation.guard) now surfaces once, in the
                compact Progress photos card low on the page, instead of
                dominating the top of the screen. */}
            {baseCoachResponse.interpretation ? (
              <Text style={[styles.coachLeadInterpretation, live.coachLeadInterpretation]}>{baseCoachResponse.interpretation}</Text>
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
            <SectionLabel tone="primary" style={styles.heroLabel}>This week&apos;s main move</SectionLabel>
            {/* D93 (Campaign 2, Phase 12 / review A finding 5): Manual mode
                strips the Apply pills, which left a proposal row identical
                to an informational one. One line above the cards makes the
                ownership unmistakable without re-threading three cards. */}
            {applyDisabled ? (
              <Text style={[styles.manualModeNote, live.manualModeNote]}>
                Manual mode: these are recommendations. The coach applies nothing; any change is yours to make. Change modes in Settings, under Coaching.
              </Text>
            ) : null}
            {heroCardEl}
            {/* Wave A B6: the WHY never sits a scroll away from the WHAT. One
                line here; the full WhyBlock further down keeps the detail. */}
            {whyThisWeek ? (
              <Text style={[styles.heroWhy, live.heroWhy]}>
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
            <SectionLabel tone="primary" style={styles.heroLabel}>This week&apos;s main move</SectionLabel>
            <View style={[styles.holdHeroCard, live.holdHeroCard]}>
              <Text style={[styles.holdHeroText, live.holdHeroText]}>
                {heldDecisions && heldDecisions.length > 0
                  ? 'Hold steady this week.'
                  : 'Nothing to change. The plan is working.'}
              </Text>
              {whyThisWeek ? (
                <Text style={[styles.heroWhy, live.heroWhy]}>
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
            // T15: the science opt-in brackets the technical name after it.
            label={trend.delta !== null ? withScience('7-day trend', 'EWMA', !!userProfile?.showScience) : null}
            // Class B: no colour on a body-weight numeral, ever.
            valueColor={t.colors.textPrimary}
            // L04-11: the same EWMA gloss BodyMetricsScreen already ships,
            // reused here so the "7-day trend" number is explained the same
            // way everywhere it appears. Only shown once there is a trend to explain.
            // D93 (Campaign 2, Phase 10): ON THIS SURFACE ONLY, the gloss
            // carries the decision-trend disclosure - the weekly verdict
            // reads direction from robust tracking, not this exact number,
            // and beside the decision the bare gloss would imply otherwise.
            // The free-tier trend surfaces keep the plain gloss (no coach
            // claim belongs there), and no smoother is named.
            tooltip={trend.delta !== null
              ? `${GLOSSARY.ewma} This is the scale reading. The weekly decision is made from the coaching trend shown beside it, which ignores one-off spikes and accounts for how long ago you last logged.`
              : undefined}
          />
          {/* C10F: the rate the DECISION was actually made from. The chip
              above is the scale reading; this is the evidence behind the
              on-target verdict, so the number and the verdict a user reads
              together now come from the same place. Shown only when there
              is a decision rate to show. */}
          {trend.coachingRateLabel ? (
            <StatChip
              icon="analytics-outline"
              iconColor={trendColor}
              value={trend.coachingRateLabel}
              label="Coaching trend"
              valueColor={t.colors.textPrimary}
              tooltip={'The rate this week\'s decision was made from. It smooths out one-off spikes and measures across the time that actually passed since your last regular weigh-ins, so it can differ a little from the raw scale reading.'}
            />
          ) : null}
          <StatChip
            icon="barbell-outline"
            iconColor={t.colors.primary}
            value={`${sessionsCompleted}/${sessionsPlanned}`}
            label="sessions"
            valueColor={t.colors.textPrimary}
          />
          {prsThisWeek > 0 && (
            <StatChip
              icon="flash-outline"
              iconColor={t.colors.warning}
              value={`${prsThisWeek} PR${prsThisWeek !== 1 ? 's' : ''}`}
              valueColor={t.colors.warning}
            />
          )}
        </Reanimated.View>

        {/* (D86: the Progress photos card moved LOW on the page, beside the
            confidence caption, and compacted. Photos are an optional add-on
            to check-ins, never the story of the week.) */}

        {/* Opt-in "share your week", only on a genuinely great, ED-safe week
            (blueprint §5/§7). Routes through the qualitative, ED-safe recap card.
            No haptic here (campaign item 1 hard exclusion: wellbeing-adjacent
            surface -- this button routes to the weight/PR-bearing recap share). */}
        {greatWeek && (
          /* Wave A B6: a genuinely great, ED-safe week is the emotional peak
             of the loop; it no longer renders at footnote weight. Success
             tint, never amber (one-amber rule). */
          <TouchableOpacity
            style={[styles.shareWeekBtn, live.shareWeekBtn]}
            onPress={handleShareWeek}
            accessibilityRole="button"
            // R9/M9 (share-card audit 2026-07-27): entry points into the share
            // flow standardise on "Create share image" across the app; the
            // success-tint chrome + share-outline icon still carry the
            // "genuinely great week" framing (the button only renders under
            // the `greatWeek` gate above).
            accessibilityLabel="Create share image"
          >
            <Ionicons name="share-outline" size={15} color={t.colors.success} />
            <Text style={[styles.shareWeekText, live.shareWeekText]}>Create share image</Text>
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
          <View style={[styles.planEditCard, live.planEditCard]} accessibilityRole="summary">
            <Text style={[styles.planEditHead, live.planEditHead]}>{planEditNote.headline}</Text>
            <Text style={[styles.planEditBody, live.planEditBody]}>{planEditNote.body}</Text>
          </View>
        ) : null}

        {/* Seamless next-week meal setup (founder 2026-06-15): build or repeat
            next week's meals straight from the check-in, then land on the plan
            to swap and get the shopping list. */}
        <View style={[styles.planEditCard, live.planEditCard]}>
          <Text style={[styles.planEditHead, live.planEditHead]}>Plan next week&apos;s meals</Text>
          <Text style={[styles.planEditBody, live.planEditBody]}>
            A full week built to next week&apos;s targets, with a shopping list.
            Review it, swap meals if needed, then add it to your diary.
          </Text>
          <View style={styles.nextWeekRow}>
            <Button
              title={planningWeek ? 'Building' : 'Fresh week'}
              variant="outline"
              size="sm"
              icon="calendar-outline"
              fullWidth={false}
              onPress={() => handlePlanNextWeek(false)}
              disabled={planningWeek}
              accessibilityLabel="Plan a fresh week of meals"
            />
            <Button
              title="Repeat last week"
              variant="outline"
              size="sm"
              icon="repeat-outline"
              fullWidth={false}
              onPress={() => handlePlanNextWeek(true)}
              disabled={planningWeek}
              accessibilityLabel="Repeat last week's meals"
            />
          </View>
          {planEditNote?.deepLink ? (
            <Button
              title={planEditNote.deepLink.label}
              variant="outline"
              size="sm"
              icon="restaurant-outline"
              fullWidth={false}
              style={styles.quietActionSpace}
              onPress={() => navigation.navigate('DiaryTab', { screen: 'MealPlan', initial: false })}
              accessibilityLabel={planEditNote.deepLink.label}
            />
          ) : null}
        </View>

        {/* U4: cycle-phase reassurance for a small period-week water rise
            (advisory, no Apply; only present for a female user who flagged
            their period and shows a water-plausible rise). */}
        {cyclePhaseNote?.note ? (
          <View style={styles.coachNoteRow}>
            <Ionicons name="water-outline" size={14} color={t.colors.primary} />
            <Text style={[styles.coachNoteText, live.coachNoteText]}>{cyclePhaseNote.note}</Text>
          </View>
        ) : null}

        {/* CAMPAIGN 18 JOB 10: your week, as one account rather than as five
            engines each having a say. Every line is traceable to a fact in
            the context the decision was made from; a line with no evidence
            behind it is simply not written. */}
        {weeklyStory ? (
          <Card style={styles.storyCard}>
            <SectionLabel tone="primary">Your week</SectionLabel>
            {weeklyStory.outcome ? (
              <Text style={[styles.storyLine, live.storyLine]}>{weeklyStory.outcome.text}</Text>
            ) : null}
            {weeklyStory.happened.map((l) => (
              <Text key={l.text} style={[styles.storyLine, live.storyLine]}>{l.text}</Text>
            ))}
            {weeklyStory.means.map((l) => (
              <Text key={l.text} style={[styles.storyMeans, live.storyMeans]}>{l.text}</Text>
            ))}
            {weeklyStory.changing.length ? (
              <View style={styles.storyBlock}>
                <Text style={[styles.storyHeading, live.storyHeading]}>What is changing</Text>
                {weeklyStory.changing.map((c) => (
                  <View key={c.text} style={styles.storyChange}>
                    <Text style={[styles.storyLine, live.storyLine]}>{c.text}</Text>
                    <Text style={[styles.storyWhy, live.storyWhy]}>{c.why}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {weeklyStory.staying.length ? (
              <View style={styles.storyBlock}>
                <Text style={[styles.storyHeading, live.storyHeading]}>What stays the same</Text>
                {weeklyStory.staying.map((l) => (
                  <Text key={l.text} style={[styles.storyLine, live.storyLine]}>{l.text}</Text>
                ))}
              </View>
            ) : null}
            {weeklyStory.watching ? (
              <Text style={[styles.storyWatch, live.storyWatch]}>{weeklyStory.watching.text}</Text>
            ) : null}
          </Card>
        ) : null}

        {/* 6. Why */}
        {whyThisWeek ? <WhyBlock text={whyThisWeek} onLearnMore={() => navigation.navigate('Methodology', { source: 'why_block' })} /> : null}
        {/* NU-8: the engine grades every weekly decision's data confidence
            (assessDataConfidence) and persists it, but it was never surfaced.
            One calm line so the user knows how solid this week's read was. */}
        {CONFIDENCE_CAPTIONS[displayConfidence] ? (
          <Text style={[styles.confidenceCaption, live.confidenceCaption]}>
            {CONFIDENCE_CAPTIONS[displayConfidence]}
            {/* Wave A B6: name WHICH data was thin when it was the weigh-ins.
                No threshold claim here, so this line can never disagree with
                the coachLedger's own gate numbers. This stays keyed off the
                real logged-data `confidence` (never `displayConfidence`): a
                photo-corroborated caption word must never hide or reframe a
                genuine thin-weigh-in disclosure, per D18's "only the caption
                moves" bound. */}
            {/* Campaign 23 R2 (D99): keyed off the OBSERVABLE weigh-in count
                alone, not the confidence caption. Raw 'high' already requires
                5+ distinct weigh-in days (assessDataConfidence), so this is
                behaviour-identical for every un-corroborated output — and on
                a week where scan corroboration raised the emitted confidence,
                the thinness disclosure now correctly STAYS visible (the D18
                honesty rule "a raised caption must never hide genuine data
                thinness", preserved under the unified confidence field). */}
            {weighInsThisWeek != null && weighInsThisWeek < 4
              ? ` Only ${weighInsThisWeek} morning weigh-in${weighInsThisWeek === 1 ? '' : 's'} landed this week.`
              : ''}
          </Text>
        ) : null}

        {/* D86 (founder 2026-07-23): progress photos are an optional add-on to
            check-ins, so their note lives LOW on the page as one compact card:
            the receipt headline plus a single muted line. That muted line is
            the receipt's detail when present, else the shared non-authority
            sentence, and every branch of both states that targets come from
            logged data (progressScanCheckInEvidence.js), so the invariant
            "photos never set targets" stays visibly true on every path. The
            packet composition, ED/calm suppression and engine isolation are
            untouched (progressScanCoachIsolation.guard.test.js). */}
        {canShowProgressScanCoachContext ? (
          <View
            style={[styles.planEditCard, live.planEditCard]}
            accessibilityRole="summary"
            accessible
            accessibilityLabel={scanAssessmentPacket ? scanAssessmentAccessibilityLabel(scanAssessmentPacket) : progressScanCoachContext.body}
          >
            <Text style={[styles.planEditHead, live.planEditHead]}>{progressScanCoachContext.title}</Text>
            {scanAssessmentPacket ? (
              <>
                <Text style={[styles.planEditBody, live.planEditBody]}>{scanAssessmentPacket.receipt.headline}</Text>
                {(scanAssessmentPacket.receipt.detail || scanAssessmentUsedSentence) ? (
                  <Text style={[styles.scanAssessmentDetail, live.scanAssessmentDetail]}>
                    {scanAssessmentPacket.receipt.detail ?? scanAssessmentUsedSentence}
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={[styles.planEditBody, live.planEditBody]}>{progressScanCoachContext.body}</Text>
            )}
          </View>
        ) : null}

        {/* 7. One focus for next week. Coach response part 4 (the single
            tactical cue, deterministic priority, ED/calm aware) feeds this
            card; buildFocus stays as the fallback when no cue is built. */}
        {(() => {
          const focus = coachResponse.cue ?? buildFocus(output, checkin);
          if (!focus) return null;
          return (
            <View style={[styles.focusCard, live.focusCard]}>
              <Text style={[styles.focusLabel, live.focusLabel]}>Focus this week</Text>
              <Text style={[styles.focusText, live.focusText]}>{focus}</Text>
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

        {/* S1c pre-commitment + coach response part 5 (the forward-pull).
            Founder device report 2026-08-06: these rendered as two bare
            floating Text lines between the safety shelf and the footer
            links, reading as debris rather than the close of the coach's
            response. Same content, same deliberate below-the-safety-shelf
            position, now inside the screen's quiet card idiom with a label
            so it reads as designed. */}
        {(coachResponse.preCommitment || coachResponse.forward) ? (
          <View style={[styles.nextReadCard, live.nextReadCard]}>
            <SectionLabel tone="muted">Next check-in</SectionLabel>
            {coachResponse.preCommitment ? (
              <Text style={[styles.preCommitmentLine, live.preCommitmentLine]}>{coachResponse.preCommitment}</Text>
            ) : null}
            {coachResponse.forward ? (
              <Text style={[styles.forwardLine, live.forwardLine]}>{coachResponse.forward}</Text>
            ) : null}
          </View>
        ) : null}

        {/* B4: contest countdown. Deliberately BELOW the safety shelf (rule 1:
            holds outrank the countdown, unchanged) and null under any open
            wellbeing flag (rule 2/5, enforced in the pure lib). Neutral
            styling: never amber (the hero Apply keeps the one-amber rule).
            Process checkpoints only; peak week adds the standard medical
            line (docs/b4-contest-countdown-ed-review-2026-07-02.md). */}
        {countdown ? (
          <View style={[styles.countdownCard, live.countdownCard]} accessibilityRole="summary">
            <Text style={[styles.countdownLine, live.countdownLine]}>{countdown.line}</Text>
            {countdown.checkpoint ? (
              <>
                <Text style={[styles.countdownCheckpointTitle, live.countdownCheckpointTitle]}>{countdown.checkpoint.title}</Text>
                <Text style={[styles.countdownCheckpointDetail, live.countdownCheckpointDetail]}>{countdown.checkpoint.detail}</Text>
              </>
            ) : null}
            {countdown.isPeakWeek ? (
              <Text style={[styles.countdownDisclaimer, live.countdownDisclaimer]}>
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
        <Button
          title="Coaching history"
          variant="outline"
          size="sm"
          icon="time-outline"
          fullWidth={false}
          style={styles.quietActionCentred}
          onPress={() => navigation.navigate('CoachHeldHistory')}
          accessibilityLabel="Coaching history"
        />

        {/* Done: a quiet text action (A1 one-amber rule). The hero Apply is
            the screen's only amber fill. */}
        <Button
          title="Done"
          variant="outline"
          style={styles.quietActionSpace}
          onPress={handleClose}
          accessibilityLabel="Done"
        />

        {/* D86 (founder 2026-07-23): the credential jargon row (volume
            landmarks / autoregulation / RED-S with inline tooltips) is gone.
            It read as misaligned technical filler to end users; the science
            grounding lives on the Methodology screen, one tap from the Why
            block above. The medical-guidance line stays. */}
        <Text style={[styles.credentialNote, live.credentialNote]}>
          Volyume provides estimates and guidance, not medical advice. Consult a qualified professional before making significant changes to your diet or training.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  coachNoteRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  coachNoteText: { ...type.bodySm, flex: 1, color: colors.textSecondary },
  // A1 one-amber rule (03 gap #1 named this card): a static utility card no
  // longer wears the hero's amber border; plain outline, quiet contained actions.
  planEditCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginTop: spacing.sm, gap: spacing.xs,
  },
  planEditHead: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.textPrimary },
  planEditBody: { ...type.bodySm, color: colors.textSecondary },
  // D86: scanAssessmentBlock/scanAssessmentHeadline deleted with the receipt
  // sub-block; the compact card renders headline via planEditBody and one
  // muted line via scanAssessmentDetail.
  scanAssessmentDetail: { ...type.caption, color: colors.textSecondary },
  // Founder device report 2026-08-06: the screen's quiet actions (formerly a
  // mix of hand-rolled pills and bare text links) all render the shared
  // Button outline variant now; only these layout crumbs remain local.
  quietActionSpace: { marginTop: spacing.xs },
  quietActionSpaceMd: { marginTop: spacing.md },
  quietActionCentred: { marginTop: spacing.sm, alignSelf: 'center' },
  nextWeekRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
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
    backgroundColor: withAlpha(colors.success, alpha.tint),
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
  },
  weekRange: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },

  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Generic card: box (surface, radius, border, padding) now comes from
  // the <Card> primitive; only the non-box gap remains as a local extra.
  card: {
    gap: spacing.md,
  },

  // A1 verdict (U-B-1 §3 / 03 gap #1): the hero zone is a plain wrapper; the
  // verdict card itself is the elevated object (Card elevated + primary
  // outline). The zone no longer carries an amber tint of its own, so the
  // hero Apply stays the screen's only amber fill.
  heroZone: {
    gap: spacing.xs,
  },
  // B-5: typography now comes from SectionLabel (tone="primary"); only the
  // structural padding remains local.
  heroLabel: {
    paddingHorizontal: spacing.xs,
  },
  // Wave A B6: the one-line why beneath the hero decision.
  manualModeNote: { ...type.caption, color: colors.textMuted, marginBottom: spacing.sm },
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
  // 2026-08-06: the edge padding came off when these moved inside the
  // padded nextReadCard (it existed to keep the old floating lines off the
  // screen edge).
  nextReadCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  preCommitmentLine: {
    ...type.bodySm,
    color: colors.textPrimary,
  },
  forwardLine: {
    ...type.bodySm,
    color: colors.textSecondary,
  },
  focusCard: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
    padding: spacing.lg,
    gap: spacing.xs,
  },
  focusLabel: {
    ...type.overline,
    color: colors.primary,
  },
  focusText: {
    ...type.bodyStrong,
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
    // R2 (2026-07-11): icon-backing family -> radius.md (control/input/
    // icon-backing class, FOOD-DESIGN-STANDARD.md section 4). Was radius.sm.
    borderRadius: radius.md,
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs2,
    backgroundColor: colors.successBg ?? colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs,
    borderWidth: 1, borderColor: withAlpha(colors.success ?? colors.primary, alpha.mid),
  },
  appliedChipText: {
    ...type.captionStrong,
    color: colors.success ?? colors.primary,
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

  // Why this week
  planNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  planNoteText: {
    ...type.caption, flex: 1, color: colors.textMuted, lineHeight: 17,
  },
  // NU-8: quiet data-confidence line under the Why block.
  // Campaign 18 job 10: the weekly story. Quiet by design - it is an account,
  // not a banner.
  storyCard: { gap: spacing.xs },
  storyLine: { ...type.body, color: colors.textPrimary },
  storyMeans: { ...type.bodySm, color: colors.textSecondary },
  storyBlock: { marginTop: spacing.sm, gap: spacing.xxs },
  storyHeading: { ...type.caption, color: colors.textMuted, textTransform: 'uppercase' },
  storyChange: { marginBottom: spacing.xs },
  storyWhy: { ...type.bodySm, color: colors.textMuted },
  storyWatch: { ...type.bodySm, color: colors.textMuted, marginTop: spacing.sm },

  confidenceCaption: {
    ...type.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing.xs,
  },
  // U-B-1 §5: ≥44px tap target for the quiet held-decision link.


  // Diet break card (box from <Card>; only the gap is a local extra)
  dietBreakCard: {
    gap: spacing.sm,
  },
  dietBreakTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
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

  // Button adoption: fill/radius/padding now come from <Button size="lg">
  // (primary variant); only the local margin and the larger-than-default
  // label size survive as overrides.
  doneBtn: {
    marginTop: spacing.sm,
  },
  doneBtnText: {
    fontSize: fontSize.lg,
  },
  // A1 one-amber rule: Done on the main card is a quiet text action (03 gap
  // #1). The solid doneBtn above stays for the insufficient-data and error
  // views, where it is the only action on screen.
  // Wave A B6: the permanent quiet route to the coaching history.
  // B4 countdown: deliberately neutral (surface + border, no amber).
  countdownCard: {
    backgroundColor: colors.surface,
    // R2 (remediation 2026-07-11): a plain surface content card, so it takes
    // the app-wide card radius (radius.lg), matching its four sibling surface
    // cards in this file (planEditCard/holdHeroCard/coachLeadCard/focusCard).
    // It is NOT a tinted D69/D70 banner (those keep radius.md). Box only -- the
    // ED/calm suppression gate that hides this surface is untouched.
    borderRadius: radius.lg,
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
  // D86: credentialNoteRow/credentialNoteInline/credentialTermRow deleted
  // with the credential jargon row; credentialNote (the medical line) stays.

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
    letterSpacing: letterSpacing.overline,
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
    backgroundColor: colors.primaryFill,
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
    letterSpacing: letterSpacing.overline,
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
});

// CP-10 stage 3 (theming, item 1 coach-half polish, 2026-07-10): the shared
// "frozen base + live override" map for this screen's many function-component
// scopes (AdjustmentRow, TrainingNextWeekCard, DietBreakCard,
// HeldDecisionsCard, EdPatternLockoutBlock, EdPatternClearedBlock,
// RapidLossCorrectedBlock, InsufficientDataView, LoadErrorView, and the
// default-exported CoachOutputScreen) -- each calls
// `const t = useTheme(); const live = buildLiveStyles(t);` (the default
// export memoises this on `t` with useMemo, this screen is large and
// re-renders often across its apply/settle state machine) and appends
// `live.KEY` after `styles.KEY` in every style array, same pattern as
// WorkoutSummaryScreen.js's buildLiveStyles. Extracted to one function so
// every scope stays in step with the frozen `styles` block above and with
// each other -- every key here mirrors only the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values;
// pure layout keys (flex/gap/padding/width, no token) are correctly omitted,
// there is nothing to unfreeze for them. This is colour/type PLUMBING ONLY:
// it changes no logic, no copy, no render-condition ordering, including in
// the ED-safety-adjacent blocks (held decisions, ED lockout/cleared,
// rapid-loss-corrected), whose render logic stays byte-identical apart from
// these style-array appends.
function buildLiveStyles(t) {
  return {
    coachNoteText: { ...t.type.bodySm, color: t.colors.textSecondary },
    planEditCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    planEditHead: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    planEditBody: { ...t.type.bodySm, color: t.colors.textSecondary },
    scanAssessmentDetail: { ...t.type.caption, color: t.colors.textSecondary },
    safe: { backgroundColor: t.colors.background },
    shareWeekBtn: { backgroundColor: withAlpha(t.colors.success, alpha.tint) },
    shareWeekText: { ...t.type.label, color: t.colors.textPrimary },
    insufficientTitle: { fontSize: t.fontSize.xl, color: t.colors.textPrimary },
    insufficientBody: { ...t.type.body, color: t.colors.textSecondary },
    receiptLabel: { ...t.type.caption, color: t.colors.textMuted },
    receiptRowText: { ...t.type.bodySm, color: t.colors.textSecondary },
    receiptUnlock: { ...t.type.caption, color: t.colors.textPrimary },
    weekLabel: { fontSize: t.fontSize.xxl, color: t.colors.primary },
    weekRange: { fontSize: t.fontSize.sm, color: t.colors.textMuted },
    manualModeNote: { ...t.type.caption, color: t.colors.textMuted },
    heroWhy: { ...t.type.bodySm, color: t.colors.textSecondary },
    holdHeroCard: { backgroundColor: t.colors.surfaceElevated, borderColor: t.colors.border },
    holdHeroText: { ...t.type.h3, color: t.colors.textPrimary },
    coachLeadCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    coachLeadAck: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    coachLeadCommitment: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    coachLeadInterpretation: { ...t.type.body, color: t.colors.textSecondary },
    nextReadCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    preCommitmentLine: { ...t.type.bodySm, color: t.colors.textPrimary },
    forwardLine: { ...t.type.bodySm, color: t.colors.textSecondary },
    focusCard: { backgroundColor: t.colors.primaryBg, borderColor: withAlpha(t.colors.primary, alpha.edge) },
    focusLabel: { color: t.colors.primary },
    focusText: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    adjustmentIconWrap: { backgroundColor: t.colors.primaryBg },
    adjustmentLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    adjustmentLabelHero: { ...t.type.h3, color: t.colors.textPrimary },
    appliedChip: {
      backgroundColor: t.colors.successBg ?? t.colors.surface2,
      borderColor: withAlpha(t.colors.success ?? t.colors.primary, alpha.mid),
    },
    appliedChipText: { ...t.type.captionStrong, color: t.colors.success ?? t.colors.primary },
    adjustmentNote: { ...t.type.bodySm, color: t.colors.textSecondary },
    adjustmentDetail: { ...t.type.bodySm, color: t.colors.textPrimary },
    adjustmentHold: { ...t.type.bodySm, color: t.colors.textPrimary },
    planNote: { borderTopColor: t.colors.border },
    planNoteText: { ...t.type.caption, color: t.colors.textMuted },
    storyLine: { ...t.type.body, color: t.colors.textPrimary },
    storyMeans: { ...t.type.bodySm, color: t.colors.textSecondary },
    storyHeading: { ...t.type.caption, color: t.colors.textMuted },
    storyWhy: { ...t.type.bodySm, color: t.colors.textMuted },
    storyWatch: { ...t.type.bodySm, color: t.colors.textMuted },
    confidenceCaption: { ...t.type.caption, color: t.colors.textMuted },
    dietBreakTitle: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    dietBreakTitleHero: { ...t.type.h3, color: t.colors.textPrimary },
    dietBreakBody: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    dietBreakFootnote: { ...t.type.caption, color: t.colors.textMuted },
    doneBtnText: { fontSize: t.fontSize.lg },
    countdownCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    countdownLine: { ...t.type.h3, color: t.colors.textPrimary },
    countdownCheckpointTitle: { ...t.type.bodyStrong, color: t.colors.textSecondary },
    countdownCheckpointDetail: { ...t.type.body, color: t.colors.textSecondary },
    countdownDisclaimer: { ...t.type.caption, color: t.colors.textMuted },
    credentialNote: { ...t.type.caption, color: t.colors.textMuted },
    edLockoutCard: { backgroundColor: t.colors.surface2, borderColor: t.colors.warning },
    edLockoutHeader: { fontSize: t.fontSize.xs, color: t.colors.warning },
    edLockoutTitle: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    edLockoutBody: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    edLockoutReadMoreBox: { borderTopColor: t.colors.border },
    edLockoutReadMoreText: { fontSize: t.fontSize.sm, color: t.colors.textSecondary },
    edLockoutCtaPrimary: { backgroundColor: t.colors.primaryFill },
    edLockoutCtaPrimaryText: { color: t.colors.onPrimary, fontSize: t.fontSize.sm },
    edLockoutCtaGhost: { borderColor: t.colors.border },
    edLockoutCtaGhostText: { color: t.colors.textSecondary, fontSize: t.fontSize.sm },
    edLockoutBottomNote: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    edClearedCard: { backgroundColor: t.colors.surface2, borderColor: t.colors.success },
    edClearedHeader: { fontSize: t.fontSize.xs, color: t.colors.success },
    edClearedTitle: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    edClearedBody: { fontSize: t.fontSize.sm, color: t.colors.textPrimary },
    heldText: { ...t.type.bodySm, color: t.colors.textSecondary },
    heldHistoryTitle: { fontSize: t.fontSize.xs, color: t.colors.textMuted },
    heldHistoryEntry: { borderBottomColor: t.colors.border },
    heldHistoryDate: { ...t.type.caption, color: t.colors.textMuted },
    heldHistoryText: { ...t.type.bodySm, color: t.colors.textSecondary },
    heldHistoryEmptyText: { ...t.type.caption, color: t.colors.textMuted },
  };
}
