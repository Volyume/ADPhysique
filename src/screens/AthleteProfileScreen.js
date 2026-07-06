import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontSize, fontWeight, spacing, radius, type, circle, withAlpha, alpha } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import { ProBadge } from '../components/ProGate';
import { Skeleton } from '../components/Skeleton';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import useAppStore from '../store/useAppStore';
import {
  getAllExercises,
  getAllWorkouts,
  getBodyMetricLog,
  getCompletedWorkoutSets,
  getLatestBodyComposition,
  getLatestBodyWeight,
} from '../lib/database';
import { formatBodyWeightShort } from '../lib/units';
import { getProgressScanCoachSummary } from '../lib/progressScanStore';
import { saveAvatarPhoto, deleteAvatarPhoto } from '../lib/profileAvatar';
import { buildProfileFreshness, freshnessTone } from '../lib/profileFreshness';
import { buildAthleteProfileSummary } from '../lib/athleteProfileSummary';
import { buildProfileRowAccessibility, profileRowStatusLabel } from '../lib/athleteProfileAccessibility';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { logError } from '../lib/errorLog';

let ImagePicker;
try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }

const AVATAR_PRESETS = Object.freeze([
  Object.freeze({ key: 'volyume_lift', label: 'Strength avatar', icon: 'barbell-outline' }),
  Object.freeze({ key: 'volyume_physique', label: 'Physique avatar', icon: 'body-outline' }),
  Object.freeze({ key: 'volyume_consistency', label: 'Consistency avatar', icon: 'calendar-outline' }),
  Object.freeze({ key: 'volyume_progress', label: 'Progress avatar', icon: 'trending-up-outline' }),
]);

function avatarPresetFor(key) {
  return AVATAR_PRESETS.find((preset) => preset.key === key) || AVATAR_PRESETS[0];
}

function formatDate(ms) {
  if (!ms) return 'Not logged';
  try {
    return new Date(Number(ms)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) {
    return 'Not logged';
  }
}

function StatTile({ label, value, sub }) {
  return (
    <Card style={styles.statTile}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={2}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </Card>
  );
}

function scanConfidenceLabel(confidence) {
  if (confidence === 'high') return 'High confidence';
  if (confidence === 'moderate') return 'Moderate confidence';
  if (confidence === 'low') return 'Low confidence';
  return 'Visual scan';
}

function finiteMs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function shouldShowPhysiqueScore({ scan, bodyFat, bodyFatLoggedAt }) {
  if (scan?.visualLeannessScore == null) return false;
  if (bodyFat == null) return true;
  const scanAt = finiteMs(scan?.capturedAt ?? scan?.captured_at);
  const bodyFatAt = finiteMs(bodyFatLoggedAt);
  if (!bodyFatAt) return true;
  if (!scanAt) return false;
  return scanAt >= bodyFatAt;
}

const COACHING_PHASE_LABELS = {
  mild_cut: 'Lose fat (cut)',
  mild_bulk: 'Build muscle (lean gain)',
  bulk: 'Build muscle (bulk)',
  recomp: 'Recomp',
  maint: 'Maintain',
};

function currentFocusTile(profile = {}) {
  const safeProfile = profile || {};
  const phaseLabel = PHASE_LABELS[safeProfile.trainingPhase]
    || COACHING_PHASE_LABELS[safeProfile.goalPhase]
    || 'Not set';
  const divisionLabel = GOAL_LABELS[safeProfile.trainingGoal]
    || (safeProfile.trainingGoal ? String(safeProfile.trainingGoal).replace(/_/g, ' ') : null);
  const days = Number(safeProfile.daysPerWeek);
  const detail = [
    divisionLabel && divisionLabel !== 'Not competing' ? divisionLabel : null,
    Number.isFinite(days) && days > 0 ? `${days} days/week` : null,
  ].filter(Boolean).join(' - ');

  return {
    label: 'Current goal',
    value: phaseLabel,
    sub: detail || 'Set in profile details',
  };
}

function profileStatusTile(freshness) {
  const states = [
    freshness?.bodyMetrics?.state,
    freshness?.progressScan?.state,
    freshness?.lifts?.state,
  ];
  const attention = states.filter((state) => state === 'missing' || state === 'due').length;
  const soon = states.filter((state) => state === 'soon').length;
  if (attention > 0) {
    return {
      label: 'Profile status',
      value: 'Needs data',
      sub: `${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} an update`,
    };
  }
  if (soon > 0) {
    return {
      label: 'Profile status',
      value: 'Update soon',
      sub: `${soon} item${soon === 1 ? '' : 's'} coming due`,
    };
  }
  return {
    label: 'Profile status',
    value: 'Ready',
    sub: 'Weight, photos and lifts are current',
  };
}

function Row({ icon, label, sub, onPress, pro, status = null }) {
  const statusLabel = profileRowStatusLabel(status);
  const accessibility = buildProfileRowAccessibility({ label, sub, status, pro });
  return (
    <Card
      style={styles.row}
      onPress={onPress}
      accessibilityLabel={accessibility.accessibilityLabel}
      accessibilityHint={accessibility.accessibilityHint}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowLabelLine}>
          <Text style={styles.rowLabel}>{label}</Text>
          {pro ? <ProBadge size="sm" /> : null}
        </View>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
      {statusLabel ? (
        <View style={[styles.statusPill, styles[`statusPill_${status}`]]}>
          <Text style={[styles.statusPillText, styles[`statusPillText_${status}`]]}>{statusLabel}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Card>
  );
}

export default function AthleteProfileScreen({ navigation }) {
  const toast = useToast();
  const { user, userProfile, tier, units, bodyWeightUnits, saveLocalProfile } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    tier: s.tier,
    units: s.units,
    bodyWeightUnits: s.bodyWeightUnits,
    saveLocalProfile: s.saveLocalProfile,
  })));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    sessions: null,
    weight: null,
    bodyFat: null,
    bodyFatLoggedAt: null,
    latestMetric: null,
    latestWorkoutAt: null,
    scan: null,
    strength: null,
    keyLifts: [],
  });

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'Athlete';
  const isPro = tier === 'pro';
  const avatarUri = userProfile?.avatarUri || null;
  const avatarPreset = userProfile?.avatarPreset || null;

  useFocusEffect(useCallback(() => {
    let alive = true;
    async function load() {
      if (!user?.id) { setLoading(false); return; }
      setLoading(true);
      try {
        const [workouts, sets, exercises, latestWeight, bodyComp, metrics, scan] = await Promise.all([
          getAllWorkouts(user.id).catch(() => []),
          getCompletedWorkoutSets(user.id).catch(() => []),
          getAllExercises().catch(() => []),
          getLatestBodyWeight(user.id).catch(() => null),
          getLatestBodyComposition(user.id).catch(() => null),
          getBodyMetricLog(user.id, 1).catch(() => []),
          getProgressScanCoachSummary(user.id).catch(() => null),
        ]);
        if (!alive) return;
        setSummary(buildAthleteProfileSummary({
          workouts,
          sets,
          exercises,
          latestWeight,
          bodyComp,
          metrics,
          scan,
          userProfile,
          units,
        }));
      } catch (e) {
        logError('AthleteProfile.load', e, { userId: user?.id });
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, userProfile, units]));

  async function pickAvatar() {
    if (!ImagePicker || !user?.id) {
      toast.show('Profile photos need a rebuild on this device.', { variant: 'warning' });
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images ?? 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const uri = await saveAvatarPhoto(user.id, result.assets[0].uri, avatarUri);
      await saveLocalProfile(user.id, { ...(userProfile || {}), avatarUri: uri, avatarPreset: null });
      toast.show('Profile photo updated', { variant: 'success' });
    } catch (e) {
      logError('AthleteProfile.pickAvatar', e, { userId: user?.id });
      toast.show("Couldn't update profile photo", { variant: 'error' });
    }
  }

  async function applyAvatarPreset(presetKey) {
    if (!user?.id) return;
    try {
      if (avatarUri) await deleteAvatarPhoto(avatarUri);
      await saveLocalProfile(user.id, { ...(userProfile || {}), avatarUri: null, avatarPreset: avatarPresetFor(presetKey).key });
      toast.show('Profile avatar updated', { variant: 'success' });
    } catch (e) {
      logError('AthleteProfile.applyAvatarPreset', e, { userId: user?.id });
      toast.show("Couldn't update avatar", { variant: 'error' });
    }
  }

  function removeAvatar() {
    if ((!avatarUri && !avatarPreset) || !user?.id) return;
    appAlert('Remove profile photo?', 'This only removes the local profile photo on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (avatarUri) await deleteAvatarPhoto(avatarUri);
          await saveLocalProfile(user.id, { ...(userProfile || {}), avatarUri: null, avatarPreset: null });
        },
      },
    ]);
  }

  function onAvatarPress() {
    const actions = [
      { text: avatarUri ? 'Change photo' : 'Choose photo', onPress: pickAvatar },
      ...AVATAR_PRESETS.map((preset) => ({ text: preset.label, onPress: () => applyAvatarPreset(preset.key) })),
    ];
    if (avatarUri || avatarPreset) {
      actions.push({ text: 'Remove profile photo', style: 'destructive', onPress: removeAvatar });
    }
    actions.push(
      { text: 'Cancel', style: 'cancel' },
    );
    appAlert('Profile photo', 'Choose a photo or use a simple Volyume avatar.', actions);
  }

  const weightText = summary.weight ? formatBodyWeightShort(summary.weight, bodyWeightUnits || 'st') : 'Not logged';
  const bodyFatText = summary.bodyFat != null ? `${Number(summary.bodyFat).toFixed(1)}%` : 'Not logged';
  const showPhysiqueScore = shouldShowPhysiqueScore({
    scan: summary.scan,
    bodyFat: summary.bodyFat,
    bodyFatLoggedAt: summary.bodyFatLoggedAt,
  });
  const physiqueTile = showPhysiqueScore ? {
    label: 'Physique score',
    value: [
      summary.scan?.leannessBandLabel || null,
      `${Math.round(summary.scan.visualLeannessScore)}/100`,
    ].filter(Boolean).join(' - '),
    sub: `${scanConfidenceLabel(summary.scan?.confidence)} - not body fat`,
  } : {
    label: 'Body fat',
    value: bodyFatText,
    sub: summary.bodyFatLoggedAt ? `${formatDate(summary.bodyFatLoggedAt)} - manual entry` : 'Manual entry only',
  };
  const focusTile = currentFocusTile(userProfile);
  const avatarPresetConfig = avatarPreset ? avatarPresetFor(avatarPreset) : null;
  const freshness = buildProfileFreshness({
    latestMetricAt: summary.latestMetric?.loggedAt ?? summary.latestMetric?.logged_at ?? summary.bodyFatLoggedAt,
    latestScanAt: summary.scan?.capturedAt ?? summary.scan?.captured_at,
    latestWorkoutAt: summary.latestWorkoutAt,
    keyLiftCount: summary.keyLifts.length,
  });
  const statusTile = profileStatusTile(freshness);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <BackHeader title="Athlete profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.hero}>
          <TouchableOpacity
            style={styles.avatar}
            onPress={onAvatarPress}
            accessibilityRole="button"
            accessibilityLabel={avatarUri
              ? 'Profile photo. Tap to change or remove.'
              : avatarPresetConfig
                ? `${avatarPresetConfig.label}. Tap to change or remove.`
                : 'Add profile photo or avatar'}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : avatarPresetConfig ? (
              <>
                <Ionicons name={avatarPresetConfig.icon} size={24} color={colors.primary} />
                <Text style={styles.avatarPresetText}>{(displayName?.[0] || 'A').toUpperCase()}</Text>
              </>
            ) : (
              <>
                <Text style={styles.avatarText}>{(displayName?.[0] || 'A').toUpperCase()}</Text>
                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera-outline" size={13} color={colors.onPrimary} />
                </View>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.heroInfo}>
            <View style={styles.nameLine}>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              {isPro ? <ProBadge size="sm" /> : null}
            </View>
            {loading ? (
              <Skeleton width={120} height={12} />
            ) : (
            <Text style={styles.heroSub}>
                {summary.sessions ?? 0} session{summary.sessions === 1 ? '' : 's'} logged
              </Text>
            )}
            <Text style={styles.heroFocus} numberOfLines={1}>{focusTile.label}: {focusTile.value}</Text>
          </View>
        </Card>

        <View style={styles.grid}>
          <StatTile label="Body weight" value={weightText} sub={summary.weight ? 'Latest logged' : 'Add in Progress'} />
          <StatTile label={physiqueTile.label} value={physiqueTile.value} sub={physiqueTile.sub} />
          <StatTile label="Strength" value={summary.strength?.overallLabel || 'Building'} sub={summary.strength ? `${summary.strength.count} tracked lifts` : 'Add body weight and core lifts'} />
          <StatTile label={statusTile.label} value={statusTile.value} sub={statusTile.sub} />
        </View>

        <View style={styles.section}>
          <SectionLabel>Strength baselines</SectionLabel>
          {summary.keyLifts.length > 0 ? summary.keyLifts.map(({ row, level }) => (
            <Card
              key={row.exerciseId}
              style={styles.liftRow}
              onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'ExerciseDetail', { exerciseId: row.exerciseId })}
              accessibilityLabel={`Open ${row.name}`}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.liftName} numberOfLines={1}>{row.name}</Text>
                <Text style={styles.liftSub}>
                  {level.ratio >= 1 ? `${level.ratio.toFixed(2)}x bodyweight` : `${Math.round(level.ratio * 100)}% bodyweight`}
                  {level.nextLabel && level.nextTarget ? ` - ${Math.max(0, level.nextTarget - row.bestE1rm).toFixed(1)} ${units} to ${level.nextLabel}` : ''}
                </Text>
              </View>
              <View style={styles.levelPill}>
                <Text style={styles.levelPillText}>{level.label}</Text>
              </View>
            </Card>
          )) : (
            <EmptyState
              icon="barbell-outline"
              title="Strength standards unlock with data"
              text="Log body weight and your core compound lifts to compare estimated strength against baseline tiers."
              compact
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Keep profile data fresh</SectionLabel>
          <Row
            icon="scale-outline"
            label={freshness.bodyMetrics.label}
            sub={freshness.bodyMetrics.sub}
            status={freshnessTone(freshness.bodyMetrics.state)}
            pro={!isPro}
            onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'BodyMetrics')}
          />
          <Row
            icon="camera-outline"
            label={freshness.progressScan.label}
            sub={freshness.progressScan.sub}
            status={freshnessTone(freshness.progressScan.state)}
            pro={!isPro}
            onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'ProgressPhotos')}
          />
          <Row
            icon="analytics-outline"
            label={freshness.lifts.label}
            sub={freshness.lifts.sub}
            status={freshnessTone(freshness.lifts.state)}
            onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'LiftProgress')}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel>Profile and data</SectionLabel>
          <Row
            icon="person-outline"
            label="Edit profile details"
            sub="Name, biological sex and diet preference."
            onPress={() => navigation.navigate('SettingsProfile')}
          />
          <Row
            icon="cloud-download-outline"
            label="Your data"
            sub="Workout CSV export and app-data JSON backup."
            onPress={() => navigation.navigate('SettingsData')}
          />
          <Row
            icon="settings-outline"
            label="Account settings"
            sub="Account, subscription, privacy and app preferences."
            onPress={() => navigation.navigate('Settings')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: circle(72),
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.primary },
  avatarPresetText: {
    ...type.caption,
    color: colors.primary,
    fontWeight: fontWeight.black,
    marginTop: spacing.xxs,
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: circle(24),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  heroInfo: { flex: 1, gap: spacing.xs },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.h3, color: colors.textPrimary, flexShrink: 1 },
  heroSub: { ...type.num('caption'), color: colors.textSecondary },
  heroFocus: { ...type.captionTight, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: {
    width: '48%',
    minHeight: 112,
    gap: spacing.xs,
  },
  statLabel: { ...type.caption, color: colors.textMuted, textTransform: 'uppercase', fontWeight: fontWeight.black },
  statValue: { ...type.bodyStrong, color: colors.textPrimary },
  statSub: { ...type.captionTight, color: colors.textSecondary },
  section: { gap: spacing.md },
  liftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  liftName: { ...type.bodyStrong, color: colors.textPrimary },
  liftSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  levelPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
    backgroundColor: colors.primaryBg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  levelPillText: { ...type.caption, color: colors.primary, fontWeight: fontWeight.black },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabelLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  rowSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  statusPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
  },
  statusPill_fresh: { backgroundColor: colors.successBg, borderColor: withAlpha(colors.success, alpha.edge) },
  statusPill_soon: { backgroundColor: colors.warningBg, borderColor: withAlpha(colors.warning, alpha.edge) },
  statusPill_attention: { backgroundColor: colors.errorBg, borderColor: withAlpha(colors.error, alpha.edge) },
  statusPillText: { ...type.caption, fontWeight: fontWeight.black },
  statusPillText_fresh: { color: colors.success },
  statusPillText_soon: { color: colors.warning },
  statusPillText_attention: { color: colors.error },
});
