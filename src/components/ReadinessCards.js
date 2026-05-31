/**
 * ReadinessCards
 *
 * The readiness half of the old Athlete Hub dashboard, now shown inline
 * on the Progress tab: training milestones, recovery signals, muscle
 * readiness and the recovery-capacity trend. Self-loading from local
 * SQLite given the signed-in user and tier. Coaching management (check-in,
 * nutrition, body metrics) lives on the You tab and is not duplicated here.
 *
 * Voice rules: CLAUDE.md. No em dashes.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import AnimatedEntrance from './AnimatedEntrance';
import InfoTooltip from './InfoTooltip';
import { computeRecoveryEMAs } from '../lib/recoveryEMA';
import { MUSCLE_DISPLAY_NAMES } from '../lib/algorithms';
import {
  getAllWorkouts, getCompletedWorkoutSets,
  getLastTrainedPerMuscle, getRecentCheckins,
} from '../lib/database';

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

function freshnessMeta(lastTrainedAt, now) {
  if (!lastTrainedAt) return { label: 'Ready', color: colors.success, dot: colors.success };
  const hoursAgo = (now - lastTrainedAt) / (1000 * 60 * 60);
  if (hoursAgo < 24)  return { label: 'Just trained', color: colors.warning, dot: colors.warning };
  if (hoursAgo < 48)  return { label: 'Recovering',   color: colors.warning, dot: colors.warning };
  if (hoursAgo < 72)  return { label: 'Nearly ready',  color: colors.success, dot: colors.success + '99' };
  return { label: 'Ready', color: colors.success, dot: colors.success };
}

// Checkins arrive newest-first. Surfaces a single plain-English read on
// recovery capacity over the recent run of check-ins, or null when there
// is not enough signal to say anything useful.
function computeRecoveryTrendInsight(checkins) {
  const energies = checkins.map(c => c.energyScore ?? null).filter(v => v !== null);
  const soreness = checkins.map(c => c.sorenessScore ?? null).filter(v => v !== null);
  if (energies.length < 3 && soreness.length < 3) return null;

  const recentEnergy = energies.slice(0, 4);
  const lowEnergyWeeks = recentEnergy.filter(e => e <= 2).length;
  const highEnergyWeeks = recentEnergy.filter(e => e >= 4).length;
  const recentSoreness = soreness.slice(0, 4);
  const highSorenessWeeks = recentSoreness.filter(s => s >= 4).length;

  if (lowEnergyWeeks >= 3) {
    return { type: 'warning', text: `Energy has been low for ${lowEnergyWeeks} check-ins in a row. That's worth paying attention to.` };
  }
  if (highSorenessWeeks >= 3) {
    return { type: 'warning', text: `High soreness has been reported ${highSorenessWeeks} weeks running. Recovery may need more attention.` };
  }
  if (highEnergyWeeks >= 3) {
    return { type: 'good', text: `Energy has been consistently high across the last ${highEnergyWeeks} check-ins. Good sign.` };
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
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [recovery, setRecovery] = useState({ soreness: null, fatigue: null, joint: null });
  const [muscleFreshness, setMuscleFreshness] = useState({});
  const [recoveryTrendInsight, setRecoveryTrendInsight] = useState(null);

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

  const freshnessEntries = Object.entries(MUSCLE_DISPLAY_NAMES)
    .filter(([key]) => muscleFreshness[key] !== undefined)
    .map(([key, displayName]) => ({ key, displayName, ...freshnessMeta(muscleFreshness[key], Date.now()) }))
    .sort((a, b) => {
      const order = { 'Just trained': 0, Recovering: 1, 'Nearly ready': 2, Ready: 3 };
      return (order[a.label] ?? 4) - (order[b.label] ?? 4);
    });

  return (
    <AnimatedEntrance index={1}>
      {/* Milestone progress */}
      {(lastUnlocked || next) && (
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneTop}>
            {lastUnlocked && (
              <View style={styles.milestoneUnlocked}>
                <Ionicons name={lastUnlocked.icon} size={16} color={colors.gold} />
                <Text style={styles.milestoneUnlockedText}>{lastUnlocked.label}</Text>
              </View>
            )}
            {next && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={styles.milestoneNext}>{next.sessions - totalWorkouts} to go: {next.label}</Text>
                <InfoTooltip size={11} text={"Consistency is the biggest predictor of long-term progress. Every session counts.\n\nThe more sessions you log, the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly.\n\nBuilding the habit is the foundation everything else sits on."} />
              </View>
            )}
          </View>
          {next && (
            <View style={styles.milestoneBarTrack}>
              <View style={[styles.milestoneBarFill, { width: progressPct }]} />
            </View>
          )}
        </View>
      )}

      {/* Recovery: the signals and muscle readiness folded into one block. */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text style={styles.sectionLabel}>Recovery</Text>
          <InfoTooltip text="Weighted 7-day average of your session check-ins. Scored 1-5 where lower is better for Soreness and Fatigue (1 = fresh, 5 = very sore/tired). Joint Comfort is also 1-5 where 1 = comfortable. If scores are consistently high, consider a lighter week." />
        </View>
        <View style={styles.recoveryCard}>
          <View style={styles.recoveryGrid}>
            <RecoveryGauge label="Soreness" value={recovery.soreness} />
            <RecoveryGauge label="Fatigue" value={recovery.fatigue} />
            <RecoveryGauge label="Joint comfort" value={recovery.joint} invertGood />
          </View>
          <Text style={styles.recoveryNote}>Scale 1-5 · Lower is better for soreness & fatigue</Text>

          {tier === 'pro' && freshnessEntries.length > 0 && (
            <>
              <View style={styles.recoveryDivider} />
              <View style={styles.mfHeaderRow}>
                <View style={[styles.mfIconWrap, { backgroundColor: colors.primaryBg }]}>
                  <Ionicons name="flash-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mfTitle}>Muscle readiness</Text>
                  <Text style={styles.mfSub}>How recovered your muscles are based on your recent training.</Text>
                </View>
              </View>
              <View style={styles.mfChipGrid}>
                {freshnessEntries.map(({ key, displayName, label, color, dot }) => (
                  <View key={key} style={[styles.mfChip, { borderColor: color + '44', backgroundColor: color + '12' }]}>
                    <View style={[styles.mfDot, { backgroundColor: dot }]} />
                    <Text style={[styles.mfChipName, { color: colors.textPrimary }]}>{displayName}</Text>
                    <Text style={[styles.mfChipLabel, { color }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {tier === 'pro' && recoveryTrendInsight && (
          <View style={[styles.trendInsightCard, recoveryTrendInsight.type === 'good' ? styles.trendInsightGood : styles.trendInsightWarn]}>
            <Ionicons
              name={recoveryTrendInsight.type === 'good' ? 'trending-up-outline' : 'alert-circle-outline'}
              size={16}
              color={recoveryTrendInsight.type === 'good' ? colors.success : colors.warning}
            />
            <Text style={styles.trendInsightText}>{recoveryTrendInsight.text}</Text>
          </View>
        )}
      </View>
    </AnimatedEntrance>
  );
}

function RecoveryGauge({ label, value, invertGood = false }) {
  const hasValue = value != null && !isNaN(value);
  const display = hasValue ? value.toFixed(1) : 'N/A';

  let dotColor = colors.textMuted;
  let scaleNote = 'No data yet';
  if (hasValue) {
    const v = parseFloat(value);
    if (invertGood) {
      dotColor = v >= 3 ? colors.error : v >= 2 ? colors.warning : colors.success;
      scaleNote = v >= 3 ? 'High discomfort' : v >= 2 ? 'Moderate' : 'Comfortable';
    } else {
      dotColor = v >= 4 ? colors.error : v >= 3 ? colors.warning : colors.success;
      scaleNote = v >= 4 ? 'High' : v >= 3 ? 'Elevated' : v >= 2 ? 'Moderate' : 'Low / Fresh';
    }
  }

  return (
    <View style={styles.gaugeItem}>
      <View style={[styles.gaugeDot, { backgroundColor: dotColor }]} />
      <Text style={styles.gaugeValue}>{display}</Text>
      <Text style={styles.gaugeLabel}>{label}</Text>
      <Text style={styles.gaugeScale}>{scaleNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionLabel: {
    fontSize: fontSize.sm, fontWeight: fontWeight.semibold,
    color: colors.textSecondary, letterSpacing: 0.2,
  },

  milestoneCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  milestoneTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  milestoneUnlocked: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  milestoneUnlockedText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.gold },
  milestoneNext: { fontSize: fontSize.xs, color: colors.textMuted },
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
  recoveryNote: { fontSize: fontSize.xs, color: colors.textMuted, textAlign: 'center' },

  trendInsightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    borderRadius: radius.lg, borderWidth: 1, padding: spacing.md,
  },
  trendInsightGood: { backgroundColor: colors.successBg ?? colors.primaryBg, borderColor: colors.success + '40' },
  trendInsightWarn: { backgroundColor: colors.warningBg, borderColor: colors.warning + '40' },
  trendInsightText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },

  mfCard: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md,
  },
  mfHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  mfIconWrap: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mfTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  mfSub: { fontSize: fontSize.xs, color: colors.textMuted, lineHeight: 16, marginTop: spacing.xxs },
  mfChipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mfChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1 },
  mfDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  mfChipName: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  mfChipLabel: { fontSize: fontSize.micro, fontWeight: fontWeight.semibold },
});
