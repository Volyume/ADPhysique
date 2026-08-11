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
export function computeRecoveryTrendInsight(checkins, nowMs = Date.now()) {
  // C6 RD6-7 (D97-25): every sentence below speaks in runs and the
  // present tense ("in a row", "weeks running", "is trending"), but the
  // input was six ROWS of any age with no adjacency test - the exact
  // class D97-5 ruled for the coach counters, unapplied to this
  // surface. Two bounds, both from the standing rulings: the latest
  // check-in must be current (14-day boundary, as blockAdvisor's
  // sibling), and a run only counts across ADJACENT calendar weeks -
  // the walk stops at the first gap, so a lapse can never chain an
  // ancient week onto today's. Thresholds and wording are unchanged.
  const rows = Array.isArray(checkins) ? checkins : [];
  const latestWs = Number(rows[0]?.weekStart ?? rows[0]?.week_start);
  if (!Number.isFinite(latestWs) || (nowMs - latestWs) > 14 * 86400000) return null;
  const adjacent = [];
  let expectedWs = latestWs;
  for (const c of rows) {
    const ws = Number(c?.weekStart ?? c?.week_start);
    if (!Number.isFinite(ws)) break;
    // 1.5-day tolerance on the 7-day step absorbs DST-length weeks.
    if (Math.abs(ws - expectedWs) > 1.5 * 86400000) break;
    adjacent.push(c);
    expectedWs = ws - 7 * 86400000;
  }
  const energies = adjacent.map(c => c.energyScore ?? null).filter(v => v !== null);
  const soreness = adjacent.map(c => c.sorenessScore ?? null).filter(v => v !== null);
  const sleep = adjacent.map(c => c.sleepQuality ?? null).filter(v => v !== null);
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
    return { type: 'warning', text: `Energy has been low for ${lowEnergyWeeks} weekly check-ins in a row, which is worth paying attention to.` };
  }
  if (highSorenessWeeks >= 3) {
    return { type: 'warning', text: `High soreness has been reported ${highSorenessWeeks} weeks running, so your recovery may need more attention.` };
  }
  // A run of poor nights is the clearest recovery signal there is. Surface
  // it in the same insight slot rather than on a card of its own, so the
  // leaned Consistency surface doesn't grow another chart.
  if (lowSleepWeeks >= 3) {
    return { type: 'warning', text: `Sleep has been rated low for ${lowSleepWeeks} weekly check-ins in a row, which is worth paying attention to.` };
  }
  if (highEnergyWeeks >= 3) {
    return { type: 'good', text: `Energy has been consistently high across the last ${highEnergyWeeks} weekly check-ins, which is a good sign.` };
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
  const [sampleCounts, setSampleCounts] = useState({ soreness: 0, fatigue: 0, joint: 0 });
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
      // C5-P18-02 (D96): soreness_24h_before is written on a 1-3 domain
      // (Fresh/Mild/Sore, the scale the adaptive engine and computeRecoveryEMAs
      // read), but this card draws it on a gauge captioned "Scale 1-5" with
      // 1-5 thresholds, so a user who tapped the MAXIMUM option saw a
      // mid-scale amber "Elevated". Normalised for DISPLAY with the exact
      // mapping WorkoutSummaryScreen already uses (1 -> 2, 2 -> 3, 3 -> 4);
      // no stored value changes and computeRecoveryEMAs is untouched.
      // C6 RD6-12 (D97-25): the tooltip promises older sessions "fade
      // out", but emaValue normalises by the weight sum, so the OUTPUT
      // is age-invariant and the gauges were fed every completed
      // workout ever - after months away, "Fatigue - High" rendered a
      // present-tense read of ancient sessions. The gauges now read
      // only sessions inside the standing 14-day boundary (the same
      // bound R-6/RB6-4 gave the sibling readiness surfaces); with
      // nothing recent they fall to their existing waiting state. The
      // pure EMA helper is untouched.
      const gaugeRecent = completed.filter((w) => {
        const at = Number(w.endedAt ?? w.startedAt ?? w.createdAt);
        return Number.isFinite(at) && (Date.now() - at) <= 14 * 86400000;
      });
      const displayWorkouts = gaugeRecent.map((w) => (
        w.soreness24hBefore == null
          ? w
          : { ...w, soreness24hBefore: [2, 3, 4][w.soreness24hBefore - 1] ?? w.soreness24hBefore }
      ));
      setRecovery(computeRecoveryEMAs(displayWorkouts));
      // C5-P18-01 (D96): how many RATED sessions each gauge actually
      // averaged. computeRecoveryEMAs returns a value from a single point, so
      // one rated session produced "4.0 / Fatigue / High" beside a red dot,
      // under a caption calling it a weighted running average and telling the
      // user that consistently high scores mean a lighter week. Nothing had
      // been averaged and nothing was consistent. Counted here rather than in
      // recoveryEMA.js so the pure engine helper and its pinned shape stay
      // exactly as they are.
      setSampleCounts({
        soreness: gaugeRecent.filter(w => w.soreness24hBefore != null).length,
        fatigue: gaugeRecent.filter(w => w.fatigueLevel != null).length,
        joint: gaugeRecent.filter(w => (w.maxJointDiscomfort ?? w.jointDiscomfort) != null).length,
      });
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
                <Text style={[styles.milestoneUnlockedText, live.milestoneUnlockedText]}>{lastUnlocked.label}</Text>
              </View>
            )}
            {next && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text style={[styles.milestoneNext, live.milestoneNext]}>{next.sessions - totalWorkouts} to go: {next.label}</Text>
                {/* C6 RD6-10 (D97-25): the learning promise forks on tier,
                    exactly as HomeWelcomeCard already does - the three
                    coaching capabilities (weights, rep-slip detection,
                    lighter-week timing) are Pro; free genuinely gets
                    history, records and progress stats. The consistency
                    message itself is true for both tiers and stays. */}
                <InfoTooltip size={11} text={tier === 'pro'
                  ? "Consistency is the biggest predictor of long-term progress. The more sessions you log, the better Volyume understands how your body responds, so it can suggest the right weights, spot when your reps are slipping, and time your lighter weeks correctly.\n\nBuilding the habit is the foundation everything else sits on."
                  : "Consistency is the biggest predictor of long-term progress. Every session you log builds your history, your records and your progress stats, and the plan you built stays exactly yours.\n\nBuilding the habit is the foundation everything else sits on."} />
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
          <InfoTooltip text="A running average of your session feedback after each workout, weighted so the last week counts most, and read only from your last two weeks of rated sessions. It waits for a couple of rated sessions before showing a figure, because one session is not an average. Scored 1-5 where lower is better for Soreness and Fatigue (1 = fresh, 5 = very sore/tired). Joint Comfort is also 1-5 where 1 = comfortable. If scores are consistently high, consider a lighter week." />
        </View>
        <View style={[styles.recoveryCard, live.recoveryCard]}>
          <View style={styles.recoveryGrid}>
            <RecoveryGauge label="Soreness" value={recovery.soreness} samples={sampleCounts.soreness} />
            <RecoveryGauge label="Fatigue" value={recovery.fatigue} samples={sampleCounts.fatigue} />
            <RecoveryGauge label="Joint comfort" value={recovery.joint} samples={sampleCounts.joint} invertGood />
          </View>
          <Text style={[styles.recoveryNote, live.recoveryNote]}>Scale 1-5 · Lower is better for soreness & fatigue</Text>

          {tier === 'pro' && freshnessEntries.length > 0 && (
            <>
              <View style={[styles.recoveryDivider, live.recoveryDivider]} />
              <View style={styles.mfHeaderRow}>
                <View style={[styles.mfIconWrap, { backgroundColor: t.colors.primaryBg }]}>
                  <Ionicons name="flash-outline" size={20} color={t.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mfTitle, live.mfTitle]}>Muscle recovery</Text>
                  {/* C6 RD6-11 (D97-25): the band is days-since-trained
                      against a typical window - it never reads this user's
                      soreness data - so the gloss says what it measures,
                      matching the heatmap sibling's honest wording. */}
                  <Text style={[styles.mfSub, live.mfSub]}>How recently each muscle was trained, against its typical recovery window.</Text>
                </View>
              </View>
              <View style={styles.mfChipGrid}>
                {freshnessEntries.map(({ key, displayName, label, color, dot }) => (
                  <View key={key} style={[styles.mfChip, { borderColor: withAlpha(color, alpha.edge), backgroundColor: withAlpha(color, alpha.ghost) }]}>
                    <View style={[styles.mfDot, { backgroundColor: dot }]} />
                    <Text style={[styles.mfChipName, live.mfChipName, { color: t.colors.textPrimary }]}>{displayName}</Text>
                    <Text style={[styles.mfChipLabel, live.mfChipLabel, { color }]}>{label}</Text>
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
            <Text style={[styles.trendInsightText, live.trendInsightText]}>{recoveryTrendInsight.text}</Text>
          </View>
        )}
      </View>
    </AnimatedEntrance>
  );
}

// MIN_RATED_SESSIONS: a "running average" needs at least two points to be one.
// Below that the gauge shows the existing no-value state with a one-line
// caption, and no colour verdict is rendered.
const MIN_RATED_SESSIONS = 2;

function RecoveryGauge({ label, value, samples = 0, invertGood = false }) {
  // CP-10 stage 4 tail (theming, remaining components, 2026-07-10): live
  // theme (src/hooks/useTheme.js). RecoveryGauge is a separate function
  // component from ReadinessCards above, so it calls useTheme() itself
  // (same pattern as WorkoutSummaryScreen.js's RatingRow).
  const t = useTheme();
  const live = buildLiveStyles(t);
  // C5-P18-01: a single rated session is not an average, so it gets no number
  // and no coloured verdict.
  const enoughSamples = samples >= MIN_RATED_SESSIONS;
  const hasValue = value != null && !isNaN(value) && enoughSamples;
  const display = hasValue ? value.toFixed(1) : 'N/A';

  let dotColor = t.colors.textMuted;
  let scaleNote = samples > 0 && !enoughSamples
    ? 'After a couple of sessions'
    : 'Nothing to show yet';
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
      <Text style={[styles.gaugeValue, live.gaugeValue]}>{display}</Text>
      <Text style={[styles.gaugeLabel, live.gaugeLabel]}>{label}</Text>
      <Text style={[styles.gaugeScale, live.gaugeScale]}>{scaleNote}</Text>
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
  gaugeLabel: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  gaugeScale: { ...type.caption, color: colors.textMuted, textAlign: 'center' },
  recoveryNote: { ...type.caption, color: colors.textMuted, textAlign: 'center' },

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
  mfChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs2, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1 },
  mfDot: { width: 6, height: 6, borderRadius: circle(6), flexShrink: 0 },
  mfChipName: { ...type.captionStrong },
  mfChipLabel: { ...type.captionStrong },
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
    gaugeLabel: { ...t.type.caption, color: t.colors.textMuted },
    gaugeScale: { ...t.type.caption, color: t.colors.textMuted },
    recoveryNote: { ...t.type.caption, color: t.colors.textMuted },
    trendInsightGood: { backgroundColor: t.colors.successBg ?? t.colors.primaryBg, borderColor: withAlpha(t.colors.success, alpha.edge) },
    trendInsightWarn: { backgroundColor: t.colors.warningBg, borderColor: withAlpha(t.colors.warning, alpha.edge) },
    trendInsightText: { ...t.type.bodySm, color: t.colors.textSecondary },
    mfCard: { backgroundColor: t.colors.surface, borderColor: t.colors.border },
    mfTitle: { fontSize: t.fontSize.md, color: t.colors.textPrimary },
    mfSub: { ...t.type.captionTight, color: t.colors.textMuted },
    mfChipName: { ...t.type.captionStrong },
    mfChipLabel: { ...t.type.captionStrong },
  };
}
