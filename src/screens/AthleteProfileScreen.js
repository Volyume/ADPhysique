import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import { colors, fontWeight, spacing, radius, type, withAlpha, alpha, iconSize } from '../styles/theme';
import useTheme from '../hooks/useTheme';
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
import usePhotoSuppression from '../hooks/usePhotoSuppression';
import { saveAvatarPhoto, deleteAvatarPhoto } from '../lib/profileAvatar';
import { AVATAR_PRESETS, avatarPresetFor } from '../lib/profileAvatarPresets';
import { buildProfileFreshness, freshnessTone } from '../lib/profileFreshness';
import { buildAthleteProfileSummary } from '../lib/athleteProfileSummary';
import { buildProfileRowAccessibility, profileRowStatusLabel } from '../lib/athleteProfileAccessibility';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import { logError } from '../lib/errorLog';
import {
  formatVolyumeScore,
  progressScanAssessmentForDisplay,
  progressScanScoreForDisplay,
} from '../lib/progressScanDisplay';

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

// CP-10 batch G (2026-07-11): rendered directly by the parent (not a list
// row), but its own useTheme() call rather than a `live` prop, so the
// pinned `<StatTile label=... value=... sub=... />` call-site guard
// (AthleteProfileScreen.physiqueTile.guard.test.js) stays untouched -- same
// "sibling scope, own useTheme()" pattern as CardioHistoryScreen.js's
// CardioTrend.
function StatTile({ label, value, sub }) {
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);
  return (
    <Card style={styles.statTile}>
      <SectionLabel tone="muted">{label}</SectionLabel>
      <Text maxFontSizeMultiplier={1.3} style={[styles.statValue, live.statValue]} numberOfLines={2}>{value}</Text>
      {sub ? <Text maxFontSizeMultiplier={1.3} style={[styles.statSub, live.statSub]}>{sub}</Text> : null}
    </Card>
  );
}

function scanConfidenceLabel(confidence) {
  if (confidence === 'high') return 'High read quality';
  if (confidence === 'moderate') return 'Moderate read quality';
  if (confidence === 'low') return 'Low read quality';
  return 'Photo score saved';
}

// A timestamp is only trusted if it is a positive finite number that has not
// arrived from further in the future than a small clock-skew tolerance. Both
// scan.capturedAt and bodyFatLoggedAt are written with the device's own
// Date.now() at save time (see progressScanStore.js and
// database/bodyMetrics.js logBodyMetric), so a corrupted/clock-skewed write
// (bad device clock, or a torn sync merge landing a future-dated row) must
// not be able to "win" the physique-score-vs-body-fat-log ordering below
// forever by claiming a time that has not happened yet. Anything beyond the
// tolerance is treated the same as "not logged" for this comparison.
const CLOCK_SKEW_TOLERANCE_MS = 24 * 60 * 60 * 1000; // 24h
export function finiteMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > Date.now() + CLOCK_SKEW_TOLERANCE_MS) return null;
  return n;
}

// Race guard (Scout 5, ultimate audit item 8): scan.capturedAt and
// bodyFatLoggedAt are two independently-written timestamps (progress scan vs
// manual body-fat log), so they can arrive tied or in either order. This
// must resolve deterministically for every combination:
//   - no scored scan at all                       -> false (nothing to show)
//   - no body-fat log yet                         -> true  (scan is all we have)
//   - body-fat log present but its timestamp is
//     missing/untrusted (see finiteMs guard above) -> true  (can't prove it's newer)
//   - scan timestamp missing/untrusted but a
//     trustworthy body-fat log exists              -> false (can't prove scan is newer)
//   - both timestamps present, EXACT TIE           -> true  (scan wins ties: a photo
//     scan and a manual log recorded in the same instant favour the richer signal)
//   - otherwise                                    -> whichever is strictly newer
// This does NOT read or write anything coaching-related; it only decides
// which stat tile the profile screen shows (affectsTargets stays false,
// untouched here).
export function shouldShowPhysiqueScore({ scan, bodyFat, bodyFatLoggedAt }) {
  if (progressScanScoreForDisplay(scan) == null) return false;
  if (bodyFat == null) return true;
  const scanAt = finiteMs(scan?.capturedAt ?? scan?.captured_at);
  const bodyFatAt = finiteMs(bodyFatLoggedAt);
  if (!bodyFatAt) return true;
  if (!scanAt) return false;
  return scanAt >= bodyFatAt;
}

function physiqueScoreTileValue(scan) {
  const assessment = progressScanAssessmentForDisplay(scan);
  const score = progressScanScoreForDisplay(scan);
  const scoreLabel = score != null ? formatVolyumeScore(score) : null;
  return [
    assessment?.leannessBandLabel || null,
    scoreLabel,
  ].filter(Boolean).join(' - ') || 'Scored';
}

function physiqueScoreTileSub(scan) {
  const assessment = progressScanAssessmentForDisplay(scan);
  const signal = assessment?.progressSignal === 'baseline'
    ? 'Baseline set'
    : (assessment?.progressSignalLabel || null);
  const confidence = scanConfidenceLabel(assessment?.scanConfidenceTier ?? scan?.confidence);
  return [signal, confidence].filter(Boolean).join(' - ') || 'Latest photo set saved';
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
    sub: detail || 'Add your goal details',
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

// CP-10 batch G (2026-07-11): rendered directly by the parent (not a list
// row), so `t`/`live` are passed as plain props from the one screen-level
// useTheme() call rather than a second useTheme() call here.
function Row({ icon, label, sub, onPress, pro, status = null, t, live }) {
  const statusLabel = profileRowStatusLabel(status);
  const accessibility = buildProfileRowAccessibility({ label, sub, status, pro });
  return (
    <Card
      style={styles.row}
      onPress={onPress}
      accessibilityLabel={accessibility.accessibilityLabel}
      accessibilityHint={accessibility.accessibilityHint}
    >
      <View style={[styles.rowIcon, live.rowIcon]}>
        <Ionicons name={icon} size={18} color={t.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowLabelLine}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.rowLabel, live.rowLabel]}>{label}</Text>
          {pro ? <ProBadge size="sm" /> : null}
        </View>
        {sub ? <Text maxFontSizeMultiplier={1.3} style={[styles.rowSub, live.rowSub]}>{sub}</Text> : null}
      </View>
      {statusLabel ? (
        <View style={[styles.statusPill, styles[`statusPill_${status}`], live[`statusPill_${status}`]]}>
          <Text maxFontSizeMultiplier={1.3} style={[styles.statusPillText, live.statusPillText, styles[`statusPillText_${status}`], live[`statusPillText_${status}`]]}>{statusLabel}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
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
  // Wave 4 (suppression unification): the Volyume Score tile is scan-derived
  // content, so it follows the same shared fail-closed gate as the Coach
  // screen's card and the other high-risk photo surfaces (calm mode or an
  // open ED-pattern flag). Before this the tile had no suppression at all.
  const photoSuppressed = usePhotoSuppression(user?.id);
  // CP-10 batch G (2026-07-11): live theme (src/hooks/useTheme.js).
  const t = useTheme();
  const live = useMemo(() => buildLiveStyles(t), [t]);

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
      // P-16: a missing native module reads as "this device can't do this",
      // never as "you're on an incomplete build".
      toast.show("Profile pictures aren't available on your device.", { variant: 'warning' });
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
    ? (summary.weightLoggedAt ? `Logged ${formatDate(summary.weightLoggedAt)}` : 'Current profile weight')
    : 'Open Progress to add body weight';
  const bodyFatText = summary.bodyFat != null ? `${Number(summary.bodyFat).toFixed(1)}%` : 'Not logged';
  // Suppressed (calm mode or an open ED-pattern flag) behaves exactly like no
  // scored scan at all: the tile falls through to the body-fat log, then the
  // unscored placeholder, same as `shouldShowPhysiqueScore` already does when
  // there is nothing to show.
  const showPhysiqueScore = !photoSuppressed && shouldShowPhysiqueScore({
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
    sub: `Logged ${formatDate(summary.bodyFatLoggedAt)}`,
  } : {
    label: 'Progress photos',
    value: 'Not scored yet',
    sub: 'Add front, back and side photos to create your Volyume Score.',
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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
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
              <Text maxFontSizeMultiplier={1.3} style={[styles.name, live.name]} numberOfLines={1}>{displayName}</Text>
              {isPro ? <ProBadge size="sm" /> : null}
            </View>
            {loading ? (
              <Skeleton width={120} height={12} />
            ) : (
            <Text maxFontSizeMultiplier={1.3} style={[styles.heroSub, live.heroSub]}>
                {summary.sessions ?? 0} session{summary.sessions === 1 ? '' : 's'} logged
              </Text>
            )}
            <Text maxFontSizeMultiplier={1.3} style={[styles.heroFocus, live.heroFocus]} numberOfLines={2}>{focusTile.value}</Text>
          </View>
        </Card>

        {loadError ? (
          <Card
            style={[styles.loadErrorCard, live.loadErrorCard]}
            onPress={() => setReloadKey((n) => n + 1)}
            accessibilityLabel="Try loading profile data again"
          >
            <View style={[styles.loadErrorIcon, live.loadErrorIcon]}>
              <Ionicons name="warning-outline" size={18} color={t.colors.warning} />
            </View>
            <View style={styles.loadErrorCopy}>
              <Text maxFontSizeMultiplier={1.3} style={[styles.loadErrorTitle, live.loadErrorTitle]}>Couldn't refresh profile data</Text>
              <Text maxFontSizeMultiplier={1.3} style={[styles.loadErrorBody, live.loadErrorBody]}>Some numbers may be out of date. Tap to try again.</Text>
            </View>
            <Ionicons name="refresh-outline" size={18} color={t.colors.textMuted} />
          </Card>
        ) : null}

        <View style={styles.grid}>
          <StatTile label="Body weight" value={weightText} sub={weightTileSub} />
          <StatTile label={physiqueTile.label} value={physiqueTile.value} sub={physiqueTile.sub} />
          <StatTile label="Strength" value={summary.strength?.overallLabel || 'No baseline yet'} sub={summary.strength ? `${summary.strength.count} tracked lifts` : 'Add your main lifts'} />
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
                <Text maxFontSizeMultiplier={1.3} style={[styles.liftName, live.liftName]} numberOfLines={1}>{row.name}</Text>
                <Text maxFontSizeMultiplier={1.3} style={[styles.liftSub, live.liftSub]}>
                  {level.ratio >= 1 ? `${level.ratio.toFixed(2)}x bodyweight` : `${Math.round(level.ratio * 100)}% bodyweight`}
                  {level.nextLabel && level.nextTarget ? ` - ${Math.max(0, level.nextTarget - row.bestE1rm).toFixed(1)} ${units} to ${level.nextLabel}` : ''}
                </Text>
              </View>
              <View style={[styles.levelPill, live.levelPill]}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.levelPillText, live.levelPillText]}>{level.label}</Text>
              </View>
            </Card>
          )) : (
            <EmptyState
              icon="barbell-outline"
              title="Add lifts for strength standards"
              text="Log body weight and your main lifts to compare against baseline standards."
              compact
            />
          )}
        </View>

        <View style={styles.section}>
          <SectionLabel>Keep profile current</SectionLabel>
          <Row
            t={t}
            live={live}
            icon="scale-outline"
            label={freshness.bodyMetrics.label}
            sub={freshness.bodyMetrics.sub}
            status={freshnessTone(freshness.bodyMetrics.state)}
            pro={!isPro}
            onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'BodyMetrics')}
          />
          <Row
            t={t}
            live={live}
            icon="camera-outline"
            label={freshness.progressScan.label}
            sub={freshness.progressScan.sub}
            status={freshnessTone(freshness.progressScan.state)}
            pro={!isPro}
            onPress={() => navigateCrossTab(navigation, 'ProgressTab', 'ProgressPhotos')}
          />
          <Row
            t={t}
            live={live}
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
            t={t}
            live={live}
            icon="person-outline"
            label="Edit profile details"
            sub="Name, sex, height, date of birth and diet preference."
            onPress={() => navigation.navigate('SettingsProfile')}
          />
          <Row
            t={t}
            live={live}
            icon="cloud-download-outline"
            label="Your data"
            sub="Workout CSV export and app-data JSON backup."
            onPress={() => navigation.navigate('SettingsData')}
          />
          <Row
            t={t}
            live={live}
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
            <Text maxFontSizeMultiplier={1.3} style={[styles.avatarSheetTitle, live.avatarSheetTitle]}>Profile picture</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.avatarSheetIntro, live.avatarSheetIntro]}>Choose a photo from your phone or pick a Volyume avatar.</Text>
          </View>
          {avatarUri || avatarPreset ? (
            <TouchableOpacity
              style={[styles.avatarClearButton, live.avatarClearButton]}
              onPress={removeAvatar}
              accessibilityRole="button"
              accessibilityLabel="Clear current avatar"
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.avatarClearText, live.avatarClearText]}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.photoOption, live.photoOption]}
          onPress={pickAvatar}
          accessibilityRole="button"
          accessibilityLabel={avatarUri ? 'Change profile photo' : 'Choose profile photo'}
        >
          <View style={[styles.photoOptionIcon, live.photoOptionIcon]}>
            <Ionicons name="image-outline" size={20} color={t.colors.primary} />
          </View>
          <View style={styles.photoOptionCopy}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.photoOptionTitle, live.photoOptionTitle]}>Photo from phone</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.photoOptionSub, live.photoOptionSub]}>{avatarUri ? 'Replace your current photo.' : 'Use your own profile picture.'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={iconSize.sm} color={t.colors.textMuted} />
        </TouchableOpacity>
        <Text maxFontSizeMultiplier={1.3} style={[styles.avatarGalleryLabel, live.avatarGalleryLabel]}>Choose an avatar</Text>
        <View style={styles.avatarPresetGrid}>
          {AVATAR_PRESETS.map((preset) => {
            const selected = avatarPreset === preset.key && !avatarUri;
            return (
              <TouchableOpacity
                key={preset.key}
                style={[styles.avatarPresetOption, live.avatarPresetOption, selected && [styles.avatarPresetOptionSelected, live.avatarPresetOptionSelected]]}
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
                <Text maxFontSizeMultiplier={1.3} style={[styles.avatarPresetOptionText, live.avatarPresetOptionText, selected && [styles.avatarPresetOptionTextSelected, live.avatarPresetOptionTextSelected]]} numberOfLines={1}>
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
  // B-5: statLabel's typography now comes from SectionLabel (tone="muted").
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
  // AY-2/D7: text-on-tint ink, not the flat success/error mark. Composited
  // on a real Card surface (default `surface`), the flat marks fail 4.5:1
  // (light "Fresh" 4.36:1, dark "Update" 4.09:1) — see theme.js onSuccessBg/
  // onErrorBg. `warning` is untouched: warningBg already clears 4.5:1 here.
  statusPillText_fresh: { color: colors.onSuccessBg },
  statusPillText_soon: { color: colors.warning },
  statusPillText_attention: { color: colors.onErrorBg },
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
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: withAlpha(colors.error, alpha.edge),
    backgroundColor: colors.errorBg,
  },
  avatarClearText: { ...type.label, color: colors.error },
  avatarGalleryLabel: { ...type.label, color: colors.textSecondary },
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
    justifyContent: 'space-between',
  },
  avatarPresetOption: {
    flexBasis: '30.5%',
    minWidth: 86,
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  avatarPresetOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  avatarPresetOptionText: { ...type.captionTight, color: colors.textSecondary },
  avatarPresetOptionTextSelected: { color: colors.textPrimary },
});

// CP-10 batch G (2026-07-11): the frozen `styles` block above stays byte-
// identical. This mirrors ONLY the colour/fontSize/type-bearing sub-
// properties of the matching frozen style, at identical rest values, so the
// screen carries no static island under a live theme toggle. Pure layout
// keys (flex/gap/padding/borderWidth/borderRadius, no token) and fontWeight
// (not part of the live theme table) are correctly omitted -- there is
// nothing to unfreeze for them. Same pattern as DebugLogScreen.js's
// buildLiveStyles (batch F).
function buildLiveStyles(t) {
  return {
    safe: { backgroundColor: t.colors.background },
    name: { ...t.type.h3, color: t.colors.textPrimary },
    heroSub: { ...t.type.num('caption'), color: t.colors.textSecondary },
    heroFocus: { ...t.type.captionTight, color: t.colors.textMuted },
    loadErrorCard: { borderColor: t.colors.warning },
    loadErrorIcon: { backgroundColor: t.colors.warningBg },
    loadErrorTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    loadErrorBody: { ...t.type.caption, color: t.colors.textSecondary },
    statValue: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    statSub: { ...t.type.captionTight, color: t.colors.textSecondary },
    liftName: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    liftSub: { ...t.type.caption, color: t.colors.textSecondary },
    levelPill: { borderColor: withAlpha(t.colors.primary, alpha.edge), backgroundColor: t.colors.primaryBg },
    levelPillText: { ...t.type.caption, color: t.colors.primary },
    rowIcon: { backgroundColor: t.colors.primaryBg },
    rowLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    rowSub: { ...t.type.caption, color: t.colors.textSecondary },
    statusPill_fresh: { backgroundColor: t.colors.successBg, borderColor: withAlpha(t.colors.success, alpha.edge) },
    statusPill_soon: { backgroundColor: t.colors.warningBg, borderColor: withAlpha(t.colors.warning, alpha.edge) },
    statusPill_attention: { backgroundColor: t.colors.errorBg, borderColor: withAlpha(t.colors.error, alpha.edge) },
    statusPillText: { ...t.type.caption },
    statusPillText_fresh: { color: t.colors.onSuccessBg },
    statusPillText_soon: { color: t.colors.warning },
    statusPillText_attention: { color: t.colors.onErrorBg },
    avatarSheetTitle: { ...t.type.h3, color: t.colors.textPrimary },
    avatarSheetIntro: { ...t.type.bodySm, color: t.colors.textSecondary },
    avatarClearButton: { borderColor: withAlpha(t.colors.error, alpha.edge), backgroundColor: t.colors.errorBg },
    avatarClearText: { ...t.type.label, color: t.colors.error },
    avatarGalleryLabel: { ...t.type.label, color: t.colors.textSecondary },
    photoOption: { borderColor: t.colors.border, backgroundColor: t.colors.surface2 },
    photoOptionIcon: { backgroundColor: t.colors.primaryBg },
    photoOptionTitle: { ...t.type.bodyStrong, color: t.colors.textPrimary },
    photoOptionSub: { ...t.type.caption, color: t.colors.textSecondary },
    avatarPresetOption: { borderColor: t.colors.borderSubtle, backgroundColor: t.colors.surface },
    avatarPresetOptionSelected: { borderColor: t.colors.primary, backgroundColor: t.colors.surfaceElevated },
    avatarPresetOptionText: { ...t.type.captionTight, color: t.colors.textSecondary },
    avatarPresetOptionTextSelected: { color: t.colors.textPrimary },
  };
}
