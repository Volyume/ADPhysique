/**
 * ReadinessCards
 *
 * The readiness half of the old Athlete Hub dashboard, now shown inline
 * on the Progress tab: training milestones, recovery signals, muscle
 * readiness and the recovery-capacity trend. Self-loading from local
 * SQLite given the signed-in user and tier. Coaching management (check-in,
 * nutrition, body metrics) lives in Coach and the Athlete Profile and is not duplicated here.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius, withAlpha, circle, type, alpha } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import AnimatedEntrance from './AnimatedEntrance';
import InfoTooltip from './InfoTooltip';
import SectionLabel from './SectionLabel';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import {
  getAllWorkouts, getCompletedWorkoutSets,
  getLastTrainedPerMuscle, getRecentCheckins,
  getCardioLogRange, activityDayKey,
} from '../lib/database';
import { cardioRecoveryLoad, cardioLoadLevel } from '../lib/cardio/cardioMath';

const MILESTONES = [
  { sessions: 1,    label: 'First session',  icon: 'star-outline' },
  { sessions: 10,   label: '10 sessions',    icon: 'fitness-outline' },
  { sessions: 25,   label: '25 sessions',    icon: 'flash-outline' },
  { sessions: 50,   label: '50 sessions',    icon: 'trophy-outline' },
  { sessions: 100,  label: '100 sessions',   icon: 'trophy' },
  { sessions: 250,  label: '250 sessions',   icon: 'medal-outline' },
  { sessions: 500,  label: '500 sessions',   icon: 'ribbon-outline' },
];

function nextMilestone(total) {
  return MILESTONES.find(m => m.sessions > total) ?? null;
}

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// variant of the frozen freshnessMeta(lastTrainedAt, now) this file used to
// define inline (module-scope, reading `colors.*` at call time), same
// "build" pattern as theme.js's buildVolumeStatusColor -- resolves the SAME
// thresholds/labels off a passed-in colour table (t.colors) instead of the
// frozen module `colors` singleton, so muscle-freshness colouring stays in
// step with a theme flip. No frozen twin kept: this helper was file-private
// and untested, so there is no unmigrated caller to preserve it for.
function buildFreshnessMeta(c) {
  return function freshnessMetaLive(lastTrainedAt, now) {
    if (!lastTrainedAt) return { label: 'Ready', color: c.success, dot: c.success };
    const hoursAgo = (now - lastTrainedAt) / (1000 * 60 * 60);
    if (hoursAgo < 24)  return { label: 'Just trained', color: c.warning, dot: c.warning };
    if (hoursAgo < 48)  return { label: 'Recovering',   color: c.warning, dot: c.warning };
    if (hoursAgo < 72)  return { label: 'Nearly ready',  color: c.success, dot: withAlpha(c.success, 0.6) };
    return { label: 'Ready', color: c.success, dot: c.success };
  };
}

// Checkins arrive newest-first. Surfaces a single plain-English read on
// recovery capacity over the recent run of check-ins, or null when there
// is not enough signal to say anything useful. Reads energy, soreness and
// sleep quality; sleep is collected on the weekly check-in but, before
// this, was never read back to the user.
export function computeRecoveryTrendInsight(checkins) {
  const energies = checkins.map(c => c.energyScore ?? null).filter(v => v !== null);
  const soreness = checkins.map(c => c.sorenessScore ?? null).filter(v => v !== null);
  const sleep = checkins.map(c => c.sleepQuality ?? null).filter(v => v !== null);
  if (energies.length < 3 && soreness.length < 3 && sleep.length < 3) return null;

  const recentEnergy = energies.slice(0, 4);
  const lowEnergyWeeks = recentEnergy.filter(e => e <= 2).length;
  const highEnergyWeeks = recentEnergy.filter(e => e >= 4).length;
  const recentSoreness = soreness.slice(0, 4);
  const highSorenessWeeks = recentSoreness.filter(s => s >= 4).length;
  // Sleep quality is 1 (Poor) to 5 (Excellent); 2 or below is a short night.
  const recentSleep = sleep.slice(0, 4);
  const lowSleepWeeks = recentSleep.filter(s => s <= 2).length;

  if (lowEnergyWeeks >= 3) {
    return { type: 'warning', text: `Energy has been low for ${lowEnergyWeeks} check-ins in a row, which is worth paying attention to.` };
  }
  if (highSorenessWeeks >= 3) {
    return { type: 'warning', text: `High soreness has been reported ${highSorenessWeeks} weeks running, so your recovery may need more attention.` };
  }
  // A run of poor nights is the clearest recovery signal there is. Surface
  // it in the same insight slot rather than on a card of its own, so the
  // leaned Consistency surface doesn't grow another chart.
  if (lowSleepWeeks >= 3) {
    return { type: 'warning', text: `Sleep has been rated low for ${lowSleepWeeks} check-ins in a row, which is worth paying attention to.` };
  }
  if (highEnergyWeeks >= 3) {
    return { type: 'good', text: `Energy has been consistently high across the last ${highEnergyWeeks} check-ins, which is a good sign.` };
  }
  if (energies.length >= 4) {
    const older = energies.slice(2, 4);
    const newer = energies.slice(0, 2);
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const newerAvg = newer.reduce((a, b) => a + b, 0) / newer.length;
    if (newerAvg - olderAvg >= 1) return { type: 'good', text: 'Energy is trending upward over the last few weeks.' };
    if (olderAvg - newerAvg >= 1) return { type: 'warning', text: 'Energy has been trending lower over the last few weeks.' };
  }
  return null;
}

export default function ReadinessCards({ userId, tier }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). See buildLiveStyles' header comment
  // (defined further down this file, after the frozen `styles` block).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [recovery, setRecovery] = useState({ soreness: null, fatigue: null, joint: null });
  const [muscleFreshness, setMuscleFreshness] = useState({});
  const [recoveryTrendInsight, setRecoveryTrendInsight] = useState(null);
  // Cardio adds fatigue on top of the lifting baseline (additive load, not an
  // average into the 1-5 EMA). 'low' | 'moderate' | 'high'.
  const [cardioLoad, setCardioLoad] = useState('low');

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [workouts, sets] = await Promise.all([
        getAllWorkouts(userId),
        getCompletedWorkoutSets(userId),
      ]);
      const setsPerWorkout = new Map();
      for (const s of sets ?? []) {
        const wid = s.workoutId ?? s.workout_id;
        if (!wid) continue;
        setsPerWorkout.set(wid, (setsPerWorkout.get(wid) ?? 0) + 1);
      }
      const completed = (workouts ?? []).filter(w => {
        const isComplete = !!(w.isCompleted ?? w.is_completed);
        if (!isComplete) return false;
        const cachedCount = w.setCount ?? w.set_count;
        const liveCount = setsPerWorkout.get(w.id) ?? 0;
        return (cachedCount != null && cachedCount > 0) || liveCount > 0;
      });
      setTotalWorkouts(completed.length);
      setRecovery(computeRecoveryEMAs(completed));
    } catch (_) {}

    // Cardio recovery load over the last week (self-hides at 'low' / no cardio).
    try {
      const to = activityDayKey();
      const from = activityDayKey(Date.now() - 6 * 24 * 60 * 60 * 1000);
      const sessions = await getCardioLogRange(userId, from, to);
      setCardioLoad(cardioLoadLevel(cardioRecoveryLoad(sessions)));
    } catch (_) { setCardioLoad('low'); }

    if (tier === 'pro') {
      try {
        const data = await getLastTrainedPerMuscle(userId);
        setMuscleFreshness(data || {});
      } catch (_) {}
      try {
        const checkins = await getRecentCheckins(userId, 6);
        if (checkins.length >= 3) setRecoveryTrendInsight(computeRecoveryTrendInsight(checkins));
      } catch (_) {}
    }
  }, [userId, tier]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const next = nextMilestone(totalWorkouts);
  const unlocked = MILESTONES.filter(m => m.sessions <= totalWorkouts);
  const lastUnlocked = unlocked[unlocked.length - 1] ?? null;
  const progressPct = next ? `${Math.round(Math.min(1, totalWorkouts / next.sessions) * 100)}%` : '100%';

  const resolveFreshnessMeta = buildFreshnessMeta(t.colors);
  const freshnessEntries = Object.entries(MUSCLE_DISPLAY_NAMES)
    .filter(([key]) => muscleFreshness[key] !== undefined)
    .map(([key, displayName]) => ({ key, displayName, ...resolveFreshnessMeta(muscleFreshness[key], Date.now()) }))
    .sort((a, b) => {
      const order = { 'Just trained': 0, Recovering: 1, 'Nearly ready': 2, Ready: 3 };
      return (order[a.label] ?? 4) - (order[b.label] ?? 4);
    });

  return (
    <AnimatedEntrance index={1} style={{ gap: spacing.md }}>
      {/* Milestone progress */}
      {(lastUnlocked || next) && (
        <View style={[styles.milestoneCard, live.milestoneCard]}>
          <View style={styles.milestoneTop}>
            {lastUnlocked && (
              <View style={styles.milestoneUnlocked}>
                <Ionicons name={lastUnlocked.icon} size={16} color={t.colors.gold} />
                <Text maxFontSizeMultiplier={1.3} style={[styles.milestoneUnlockedText, live.milestoneUnlockedText]}>{lastUnlocked.label}</Text>
              </View>
            )}
            {next && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.milestoneNext, live.milestoneNext]}>{next.sessions - totalWorkouts} to go: {next.label}</Text>
                <InfoTooltip size={11} text={"Consistency is the biggest predictor of long-term progress. The more sessions you log, the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly.\n\nBuilding the habit is the foundation everything else sits on."} />
              </View>
            )}
          </View>
          {next && (
            <View style={[styles.milestoneBarTrack, live.milestoneBarTrack]}>
              <View style={[styles.milestoneBarFill, live.milestoneBarFill, { width: progressPct }]} />
            </View>
          )}
        </View>
      )}

      {/* Recovery: the signals and muscle readiness folded into one block. */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <SectionLabel>Recovery</SectionLabel>
          <InfoTooltip text="Weighted 7-day average of your session check-ins. Scored 1-5 where lower is better for Soreness and Fatigue (1 = fresh, 5 = very sore/tired). Joint Comfort is also 1-5 where 1 = comfortable. If scores are consistently high, consider a lighter week." />
        </View>
        <View style={[styles.recoveryCard, live.recoveryCard]}>
          <View style={styles.recoveryGrid}>
            <RecoveryGauge label="Soreness" value={recovery.soreness} />
            <RecoveryGauge label="Fatigue" value={recovery.fatigue} />
            <RecoveryGauge label="Joint comfort" value={recovery.joint} invertGood />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={[styles.recoveryNote, live.recoveryNote]}>Scale 1-5 · Lower is better for soreness & fatigue</Text>
          {cardioLoad === 'high' && (
            <View style={[styles.cardioLoadNote, live.cardioLoadNote]}>
              <Ionicons name="heart-outline" size={13} color={t.colors.warning} />
              <Text maxFontSizeMultiplier={1.3} style={[styles.cardioLoadText, live.cardioLoadText]}>
                Your cardio is adding to your fatigue this week. Keep it low-impact, or trim a session.
              </Text>
            </View>
          )}

          {tier === 'pro' && freshnessEntries.length > 0 && (
            <>
              <View style={[styles.recoveryDivider, live.recoveryDivider]} />
              <View style={styles.mfHeaderRow}>
                <View style={[styles.mfIconWrap, { backgroundColor: t.colors.primaryBg }]}>
                  <Ionicons name="flash-outline" size={20} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.mfTitle, live.mfTitle]}>Muscle readiness</Text>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.mfSub, live.mfSub]}>How recovered your muscles are based on your recent training.</Text>
                </View>
              </View>
              <View style={styles.mfChipGrid}>
                {freshnessEntries.map(({ key, displayName, label, color, dot }) => (
                  <View key={key} style={[styles.mfChip, { borderColor: withAlpha(color, alpha.edge), backgroundColor: withAlpha(color, alpha.ghost) }]}>
                    <View style={[styles.mfDot, { backgroundColor: dot }]} />
                    <Text maxFontSizeMultiplier={1.3} style={[styles.mfChipName, live.mfChipName, { color: t.colors.textPrimary }]}>{displayName}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.mfChipLabel, live.mfChipLabel, { color }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {tier === 'pro' && recoveryTrendInsight && (
          <View style={[styles.trendInsightCard, recoveryTrendInsight.type === 'good' ? [styles.trendInsightGood, live.trendInsightGood] : [styles.trendInsightWarn, live.trendInsightWarn]]}>
            <Ionicons
              name={recoveryTrendInsight.type === 'good' ? 'trending-up-outline' : 'alert-circle-outline'}
              size={16}
              color={recoveryTrendInsight.type === 'good' ? t.colors.success : t.colors.warning}
            />
            <Text maxFontSizeMultiplier={1.3} style={[styles.trendInsightText, live.trendInsightText]}>{recoveryTrendInsight.text}</Text>
          </View>
        )}
      </View>
    </AnimatedEntrance>
  );
}

function RecoveryGauge({ label, value, invertGood = false }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). RecoveryGauge is a separate function
  // component from ReadinessCards above, so it calls useTheme() itself
  // (same pattern as WorkoutSummaryScreen.js's RatingRow).
  const t = useTheme();
  const live = buildLiveStyles(t);
  const hasValue = value != null && !isNaN(value);
  const display = hasValue ? value.toFixed(1) : 'N/A';

  let dotColor = t.colors.textMuted;
  let scaleNote = 'Nothing to show yet';
  if (hasValue) {
    const v = parseFloat(value);
    if (invertGood) {
      dotColor = v >= 3 ? t.colors.error : v >= 2 ? t.colors.warning : t.colors.success;
      scaleNote = v >= 3 ? 'High discomfort' : v >= 2 ? 'Moderate' : 'Comfortable';
    } else {
      dotColor = v >= 4 ? t.colors.error : v >= 3 ? t.colors.warning : t.colors.success;
      scaleNote = v >= 4 ? 'High' : v >= 3 ? 'Elevated' : v >= 2 ? 'Moderate' : 'Low / Fresh';
    }
  }

  return (
    <View style={styles.gaugeItem}>
      <View style={[styles.gaugeDot, { backgroundColor: dotColor }]} />
      <Text maxFontSizeMultiplier={1.3} style={[styles.gaugeValue, live.gaugeValue]}>{display}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.gaugeLabel, live.gaugeLabel]}>{label}</Text>
      <Text maxFontSizeMultiplier={1.3} style={[styles.gaugeScale, live.gaugeScale]}>{scaleNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  milestoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneUnlocked: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  milestoneUnlockedText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gold },
  milestoneNext: { ...type.caption, color: colors.textMuted },
  milestoneBarTrack: { height: 4, borderRadius: radius.full, backgroundColor: colors.surface2, overflow: 'hidden' },
  milestoneBarFill: { height: '100%', borderRadius: radius.full, backgroundColor: colors.primary },

  recoveryCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  recoveryGrid: {
    flexDirection: 'row', gap: spacing.sm,
  },
  recoveryDivider: {
    height: 1, backgroundColor: colors.border, marginVertical: spacing.xs,
  },
  gaugeItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  gaugeDot: { width: 12, height: 12, borderRadius: radius.sm },
  gaugeValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  gaugeLabel: { fontSize: fontSize.micro, color: colors.textMuted, textAlign: 'center' },
  gaugeScale: { fontSize: fontSize.micro, color: colors.textMuted, textAlign: 'center' },
  recoveryNote: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  cardioLoadNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs,
    marginTop: spacing.sm, paddingTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  cardioLoadText: { ...type.captionTight, flex: 1, color: colors.textSecondary },

  trendInsightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
  },
  trendInsightGood: { backgroundColor: colors.successBg ?? colors.primaryBg, borderColor: withAlpha(colors.success, alpha.edge) },
  trendInsightWarn: { backgroundColor: colors.warningBg, borderColor: withAlpha(colors.warning, alpha.edge) },
  trendInsightText: { ...type.bodySm, flex: 1, color: colors.textSecondary },

  mfCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  mfHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  mfIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mfTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  mfSub: { ...type.captionTight, color: colors.textMuted, marginTop: spacing.xxs },
  mfChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mfChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1 },
  mfDot: { width: 6, height: 6, borderRadius: circle(6), flexShrink: 0 },
  mfChipName: { ...type.captionStrong },
  mfChipLabel: { fontSize: fontSize.micro, fontWeight: fontWeight.semibold },
});

// CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
// override for the frozen `styles` block above, shared by BOTH function-
// component scopes in this file (ReadinessCards, RecoveryGauge) -- each
// calls `const t = useTheme(); const live = buildLiveStyles(t);` and appends
// `live.KEY` after `styles.KEY`, same pattern as WorkoutSummaryScreen.js's
// buildLiveStyles. Only mirrors the colour/fontSize/type-bearing
// sub-properties of the matching frozen style, at identical rest values;
// pure layout keys (section/milestoneTop/milestoneUnlocked/recoveryGrid/
// gaugeItem/gaugeDot/trendInsightCard/mfHeaderRow/mfIconWrap/mfChipGrid/
// mfChip/mfDot) have no colour tokens, so there is nothing to unfreeze for
// them. mfCard is unused in the current JSX (dead style, pre-existing, not
// this batch's concern) but is mirrored here too for completeness.
function buildLiveStyles(t) {
  return {
    milestoneCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    milestoneUnlockedText: { fontSize: t.fontSize.sm, color: t.colors.gold },
    milestoneNext: { ...t.type.caption, color: t.colors.textMuted },
    milestoneBarTrack: { backgroundColor: t.colors.surface2 },
    milestoneBarFill: { backgroundColor: t.colors.primary },
    recoveryCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    recoveryDivider: { backgroundColor: t.colors.border },
    gaugeValue: { fontSize: t.fontSize.lg, color: t.colors.textPrimary },
    gaugeLabel: { fontSize: t.fontSize.micro, color: t.colors.textMuted },
    gaugeScale: { fontSize: t.fontSize.micro, color: t.colors.textMuted },
    recoveryNote: { ...t.type.caption, color: t.colors.textMuted },
    cardioLoadNote: { borderTopColor: t.colors.border },
    cardioLoadText: { ...t.type.captionTight, color: t.colors.textSecondary },
    trendInsightGood: { backgroundColor: t.colors.successBg ?? t.colors.primaryBg, borderColor: withAlpha(t.colors.success, alpha.edge) },
    trendInsightWarn: { backgroundColor: t.colors.warningBg, borderColor: withAlpha(t.colors.warning, alpha.edge) },
    trendInsightText: { ...t.type.bodySm, color: t.colors.textSecondary },
    mfCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    mfTitle: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    mfSub: { ...t.type.captionTight, color: t.colors.textMuted },
    mfChipName: { ...t.type.captionStrong },
    mfChipLabel: { fontSize: t.fontSize.micro },
  };
}
