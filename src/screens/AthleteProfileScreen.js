import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import BackHeader from '../components/BackHeader';
import Card from '../components/Card';
import { ProBadge } from '../components/ProGate';
import { Skeleton } from '../components/Skeleton';
import { appAlert } from '../components/AppAlert';
import { useToast } from '../components/Toast';
import EmptyState from '../components/EmptyState';
import SectionLabel from '../components/SectionLabel';
import BottomSheet from '../components/BottomSheet';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
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
import { AVATAR_PRESETS, avatarPresetFor } from '../lib/profileAvatarPresets';
import { buildProfileFreshness, freshnessTone } from '../lib/profileFreshness';
import { buildAthleteProfileSummary } from '../lib/athleteProfileSummary';
import { buildProfileRowAccessibility, profileRowStatusLabel } from '../lib/athleteProfileAccessibility';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { logError } from '../lib/errorLog';

let ImagePicker;
try { ImagePicker = require('expo-image-picker'); } catch (_) { ImagePicker = null; }

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

function physiqueScoreTileValue(scan) {
  const score = Number(scan?.visualLeannessScore);
  const scoreLabel = Number.isFinite(score) ? `index ${Math.round(score)}` : null;
  return [
    scan?.leannessBandLabel || null,
    scoreLabel,
  ].filter(Boolean).join(' - ') || 'Scored';
}

function physiqueScoreTileSub(scan) {
  const signal = scan?.progressSignalLabel || (scan?.progressSignal === 'baseline' ? 'Baseline scan' : null);
  return `${[signal, scanConfidenceLabel(scan?.confidence)].filter(Boolean).join(' - ')}. Private progress index, not body fat.`;
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
      label: 'Profile readiness',
      value: 'Needs updates',
      sub: `${attention} item${attention === 1 ? '' : 's'} need${attention === 1 ? 's' : ''} an update`,
    };
  }
  if (soon > 0) {
    return {
      label: 'Profile readiness',
      value: 'Update soon',
      sub: `${soon} item${soon === 1 ? '' : 's'} coming due`,
    };
  }
  return {
    label: 'Profile readiness',
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
    weightLoggedAt: null,
    bodyFat: null,
    bodyFatLoggedAt: null,
    latestMetric: null,
    latestWorkoutAt: null,
    scan: null,
    strength: null,
    keyLifts: [],
  });
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'Athlete';
  const isPro = tier === 'pro';
  const avatarUri = userProfile?.avatarUri || null;
  const avatarPreset = userProfile?.avatarPreset || null;

  useFocusEffect(useCallback(() => {
    let alive = true;
    async function load() {
      if (!user?.id) {
        setLoadError(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          getAllWorkouts(user.id),
          getCompletedWorkoutSets(user.id),
          getAllExercises(),
          getLatestBodyWeight(user.id),
          getLatestBodyComposition(user.id),
          getBodyMetricLog(user.id, 1),
          getProgressScanCoachSummary(user.id),
        ]);
        if (!alive) return;
        const failed = results.some((r) => r.status === 'rejected');
        if (failed) {
          logError('AthleteProfile.load', new Error('athlete_profile_partial_load_failed'), {
            userId: user?.id,
            reloadKey,
            sources: results.map((r) => r.status).join(','),
          });
        }
        const valueAt = (index, fallback) => (
          results[index].status === 'fulfilled' ? results[index].value : fallback
        );
        setSummary(buildAthleteProfileSummary({
          workouts: valueAt(0, []),
          sets: valueAt(1, []),
          exercises: valueAt(2, []),
          latestWeight: valueAt(3, null),
          bodyComp: valueAt(4, null),
          metrics: valueAt(5, []),
          scan: valueAt(6, null),
          userProfile,
          units,
        }));
        setLoadError(failed);
      } catch (e) {
        logError('AthleteProfile.load', e, { userId: user?.id, reloadKey });
        if (alive) setLoadError(true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, userProfile, units, reloadKey]));

  async function pickAvatar() {
    if (!ImagePicker || !user?.id) {
      toast.show('Profile pictures need a rebuild on this device.', { variant: 'warning' });
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
      setAvatarSheetOpen(false);
      toast.show('Profile picture updated', { variant: 'success' });
    } catch (e) {
      logError('AthleteProfile.pickAvatar', e, { userId: user?.id });
      toast.show("Couldn't update profile picture", { variant: 'error' });
    }
  }

  async function applyAvatarPreset(presetKey) {
    if (!user?.id) return;
    try {
      if (avatarUri) await deleteAvatarPhoto(avatarUri);
      await saveLocalProfile(user.id, { ...(userProfile || {}), avatarUri: null, avatarPreset: avatarPresetFor(presetKey).key });
      setAvatarSheetOpen(false);
      toast.show('Avatar updated', { variant: 'success' });
    } catch (e) {
      logError('AthleteProfile.applyAvatarPreset', e, { userId: user?.id });
      toast.show("Couldn't update avatar", { variant: 'error' });
    }
  }

  function removeAvatar() {
    if ((!avatarUri && !avatarPreset) || !user?.id) return;
    appAlert('Remove profile picture?', 'This clears the photo or Volyume avatar from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          if (avatarUri) await deleteAvatarPhoto(avatarUri);
          await saveLocalProfile(user.id, { ...(userProfile || {}), avatarUri: null, avatarPreset: null });
          setAvatarSheetOpen(false);
        },
      },
    ]);
  }

  function onAvatarPress() {
    setAvatarSheetOpen(true);
  }

  const weightText = summary.weight ? formatBodyWeightShort(summary.weight, bodyWeightUnits || 'st') : 'Not logged';
  const weightTileSub = summary.weight
    ? (summary.weightLoggedAt ? `${formatDate(summary.weightLoggedAt)} - latest logged` : 'Profile body weight')
    : 'Open Progress to add body weight';
  const bodyFatText = summary.bodyFat != null ? `${Number(summary.bodyFat).toFixed(1)}%` : 'Not logged';
  const showPhysiqueScore = shouldShowPhysiqueScore({
    scan: summary.scan,
    bodyFat: summary.bodyFat,
    bodyFatLoggedAt: summary.bodyFatLoggedAt,
  });
  const physiqueTile = showPhysiqueScore ? {
    label: 'Volyume Score',
    value: physiqueScoreTileValue(summary.scan),
    sub: physiqueScoreTileSub(summary.scan),
  } : summary.bodyFatLoggedAt ? {
    label: 'Body fat',
    value: bodyFatText,
    sub: `${formatDate(summary.bodyFatLoggedAt)} - manual entry`,
  } : {
    label: 'Progress photos',
    value: 'Not scored yet',
    sub: 'Add front and back photos to create your private Volyume Score.',
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
              ? 'Profile picture. Tap to update.'
              : avatarPresetConfig
                ? `${avatarPresetConfig.label} avatar. Tap to update.`
                : 'Add profile picture or Volyume avatar'}
            accessibilityHint="Opens photo and avatar choices"
          >
            <ProfileAvatarMark
              avatarUri={avatarUri}
              presetKey={avatarPreset}
              displayName={displayName}
              size={72}
              editable
            />
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
            <Text style={styles.heroFocus} numberOfLines={2}>Current focus: {focusTile.value}</Text>
          </View>
        </Card>

        {loadError ? (
          <Card
            style={styles.loadErrorCard}
            onPress={() => setReloadKey((n) => n + 1)}
            accessibilityLabel="Try loading profile data again"
          >
            <View style={styles.loadErrorIcon}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
            </View>
            <View style={styles.loadErrorCopy}>
              <Text style={styles.loadErrorTitle}>Couldn&apos;t refresh profile data</Text>
              <Text style={styles.loadErrorBody}>Some numbers may be out of date. Tap to try again.</Text>
            </View>
            <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
          </Card>
        ) : null}

        <View style={styles.grid}>
          <StatTile label="Body weight" value={weightText} sub={weightTileSub} />
          <StatTile label={physiqueTile.label} value={physiqueTile.value} sub={physiqueTile.sub} />
          <StatTile label="Strength" value={summary.strength?.overallLabel || 'No baseline yet'} sub={summary.strength ? `${summary.strength.count} tracked lifts` : 'Add body weight and main lifts'} />
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
              text="Log body weight and your main lifts to compare your strength against baseline standards."
              compact
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Keep profile current</SectionLabel>
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
          <SectionLabel>Details and data</SectionLabel>
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
      <BottomSheet
        visible={avatarSheetOpen}
        onClose={() => setAvatarSheetOpen(false)}
        accessibilityLabel="Select avatar"
      >
        <View style={styles.avatarSheetHeader}>
          <View style={styles.avatarSheetCopy}>
            <Text style={styles.avatarSheetTitle}>Profile picture</Text>
            <Text style={styles.avatarSheetIntro}>Choose a phone photo or a Volyume gym avatar.</Text>
          </View>
          {avatarUri || avatarPreset ? (
            <TouchableOpacity
              style={styles.avatarClearButton}
              onPress={removeAvatar}
              accessibilityRole="button"
              accessibilityLabel="Clear current avatar"
            >
              <Text style={styles.avatarClearText}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.photoOption}
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={avatarUri ? 'Change profile photo' : 'Choose profile photo'}
        >
          <View style={styles.photoOptionIcon}>
            <Ionicons name="image-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.photoOptionCopy}>
            <Text style={styles.photoOptionTitle}>Photo from phone</Text>
            <Text style={styles.photoOptionSub}>{avatarUri ? 'Replace your current photo.' : 'Use your own profile picture.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <Text style={styles.avatarGalleryLabel}>Volyume avatars</Text>
        <View style={styles.avatarPresetGrid}>
          {AVATAR_PRESETS.map((preset) => {
            const selected = avatarPreset === preset.key && !avatarUri;
            return (
              <TouchableOpacity
                key={preset.key}
                style={[styles.avatarPresetOption, selected && styles.avatarPresetOptionSelected]}
                onPress={() => applyAvatarPreset(preset.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${preset.label} avatar`}
              >
                <ProfileAvatarMark
                  presetKey={preset.key}
                  displayName={displayName}
                  size={62}
                  selected={selected}
                />
                <Text style={[styles.avatarPresetOptionText, selected && styles.avatarPresetOptionTextSelected]} numberOfLines={1}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: { width: 72, height: 72 },
  heroInfo: { flex: 1, gap: spacing.xs },
  nameLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...type.h3, color: colors.textPrimary, flexShrink: 1 },
  heroSub: { ...type.num('caption'), color: colors.textSecondary },
  heroFocus: { ...type.captionTight, color: colors.textMuted },
  loadErrorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderColor: colors.warning,
  },
  loadErrorIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadErrorCopy: { flex: 1, minWidth: 0 },
  loadErrorTitle: { ...type.bodyStrong, color: colors.textPrimary },
  loadErrorBody: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: {
    flexGrow: 1,
    flexBasis: '48%',
    minWidth: 150,
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
  avatarSheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  avatarSheetCopy: { flex: 1, minWidth: 0, gap: spacing.xxs },
  avatarSheetTitle: { ...type.h3, color: colors.textPrimary },
  avatarSheetIntro: { ...type.bodySm, color: colors.textSecondary },
  avatarClearButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  avatarClearText: { ...type.label, color: colors.textSecondary },
  avatarGalleryLabel: { ...type.caption, color: colors.textMuted, textTransform: 'uppercase', fontWeight: fontWeight.black },
  photoOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  photoOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryBg,
  },
  photoOptionCopy: { flex: 1, minWidth: 0 },
  photoOptionTitle: { ...type.bodyStrong, color: colors.textPrimary },
  photoOptionSub: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  avatarPresetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  avatarPresetOption: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 92,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  avatarPresetOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  avatarPresetOptionText: { ...type.captionTight, color: colors.textSecondary, fontWeight: fontWeight.semibold },
  avatarPresetOptionTextSelected: { color: colors.primary },
});
