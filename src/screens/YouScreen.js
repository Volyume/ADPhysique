/**
 * Coach home.
 *
 * Historical file/route name kept as YouScreen/You for navigation stability,
 * but the visible tab is now Coach. This is a deterministic coaching hub:
 * every destination is a rules-based Volyume flow.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { ProBadge } from '../components/ProGate';
import { Skeleton } from '../components/Skeleton';
import SectionLabel from '../components/SectionLabel';
import ProfileAvatarMark from '../components/ProfileAvatarMark';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllWorkouts, getCoachOutputHistory, getLatestCheckin, getLatestCoachOutput } from '../lib/database';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import usePartners from '../hooks/usePartners';
import { partnerRowLine } from '../lib/partners/signals';
import { trackPartnerSurfaceView } from '../lib/partners/telemetry';
import { logError } from '../lib/errorLog';
import { GOAL_LABELS, PHASE_LABELS } from '../lib/coachingGoals';

function formatDate(ms) {
  if (!ms) return null;
  try {
    return new Date(Number(ms)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch (_) {
    return null;
  }
}

function NavRow({ icon, label, sub, onPress, pro }) {
  return (
    <Card
      style={styles.navRow}
      onPress={onPress}
      accessibilityLabel={pro ? `${label}. Part of Pro.` : label}
    >
      <View style={styles.navRowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.navRowText}>
        <View style={styles.navRowLabelRow}>
          <Text style={styles.navRowLabel}>{label}</Text>
          {pro ? <ProBadge size="sm" /> : null}
        </View>
        {sub ? <Text style={styles.navRowSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Card>
  );
}

function profileFocusLine(profile = {}) {
  const safeProfile = profile || {};
  const phase = PHASE_LABELS[safeProfile.trainingPhase] || null;
  const goal = GOAL_LABELS[safeProfile.trainingGoal] || null;
  const days = Number(safeProfile.daysPerWeek);
  return [
    phase,
    goal && goal !== 'Not competing' ? goal : null,
    Number.isFinite(days) && days > 0 ? `${days} days/week` : null,
  ].filter(Boolean).join(' - ');
}

function isCompletedCoachDecision(output, checkin) {
  if (!output?.weekStart || output.hasEnoughData === false) return false;
  return Number(checkin?.weekStart) === Number(output.weekStart) && checkin?.energyScore != null;
}

export default function YouScreen({ navigation }) {
  const { user, userProfile, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    tier: s.tier,
  })));
  const [sessions, setSessions] = useState(null);
  const [latestReview, setLatestReview] = useState(null);
  const [hasCoachHistory, setHasCoachHistory] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let alive = true;
    async function load() {
      if (!user?.id) {
        setLoadError(false);
        return;
      }
      try {
        const [workoutsResult, latestResult, checkinResult, historyResult] = await Promise.allSettled([
          getAllWorkouts(user.id),
          getLatestCoachOutput(user.id),
          getLatestCheckin(user.id),
          tier !== 'pro' ? getCoachOutputHistory(user.id, 1) : Promise.resolve([]),
        ]);
        if (!alive) return;
        const failed = [workoutsResult, latestResult, checkinResult, historyResult].some((r) => r.status === 'rejected');
        if (failed) {
          logError('YouScreen.load', new Error('coach_hub_partial_load_failed'), {
            reloadKey,
            workouts: workoutsResult.status,
            latest: latestResult.status,
            checkin: checkinResult.status,
            history: historyResult.status,
          });
        }
        const workouts = workoutsResult.status === 'fulfilled' ? workoutsResult.value : [];
        const latest = latestResult.status === 'fulfilled' ? latestResult.value : null;
        const checkin = checkinResult.status === 'fulfilled' ? checkinResult.value : null;
        const latestDecision = isCompletedCoachDecision(latest, checkin) ? latest : null;
        const history = historyResult.status === 'fulfilled' ? historyResult.value : [];
        const completed = (workouts || []).filter(w => !!(w.isCompleted ?? w.is_completed));
        if (workoutsResult.status === 'fulfilled') setSessions(completed.length);
        if (latestResult.status === 'fulfilled' && checkinResult.status === 'fulfilled') setLatestReview(latestDecision);
        if (historyResult.status === 'fulfilled') setHasCoachHistory((history || []).length > 0);
        setLoadError(failed);
      } catch (e) {
        if (alive) {
          logError('YouScreen.load', e, { userId: user?.id, reloadKey });
          setLoadError(true);
        }
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, tier, reloadKey]));

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'Athlete';
  const isPro = tier === 'pro';
  const avatarUri = userProfile?.avatarUri || null;
  const reviewDate = latestReview ? formatDate(latestReview.weekStart) : null;
  const profileFocus = profileFocusLine(userProfile);

  const partners = usePartners(isPro ? user?.id : null, tier);
  const partnersSub = isPro
    ? partnerRowLine({
        rowState: partners.rowState,
        partnerName: partners.partnership?.partnerFirstName,
        partnerWeek: partners.partnerWeek,
      })
    : 'Quiet accountability with someone you trust';
  const openPartners = useCallback(() => {
    trackPartnerSurfaceView('coach_row');
    navigateCrossTab(navigation, 'ProgressTab', 'Partner', { source: 'coach_row' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Coach" subtitle="Rules-based weekly coaching from your logs." />

        {loadError ? (
          <Card
            style={styles.loadErrorCard}
            onPress={() => setReloadKey((n) => n + 1)}
            accessibilityLabel="Try loading coach data again"
          >
            <View style={styles.loadErrorIcon}>
              <Ionicons name="warning-outline" size={18} color={colors.warning} />
            </View>
            <View style={styles.loadErrorCopy}>
              <Text style={styles.loadErrorTitle}>Couldn't refresh Coach</Text>
              <Text style={styles.loadErrorBody}>Your saved profile stays unchanged. Tap to try again.</Text>
            </View>
            <Ionicons name="refresh-outline" size={18} color={colors.textMuted} />
          </Card>
        ) : null}

        <Card
          style={styles.profileCard}
          onPress={() => navigation.navigate('AthleteProfile')}
          accessibilityLabel="Open athlete profile"
        >
          <ProfileAvatarMark
            avatarUri={avatarUri}
            presetKey={userProfile?.avatarPreset}
            displayName={displayName}
            size={56}
          />
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              {isPro ? <ProBadge size="sm" /> : null}
            </View>
            {sessions != null ? (
              <Text style={styles.profileStat}>{sessions} completed session{sessions === 1 ? '' : 's'}</Text>
            ) : user?.id ? (
              <Skeleton width={110} height={12} />
            ) : null}
            {profileFocus ? <Text style={styles.profileFocus} numberOfLines={2}>{profileFocus}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Card>

        <Card style={styles.statusCard} tone={isPro && latestReview ? 'primary' : undefined}>
          <View style={styles.statusTop}>
            <View style={styles.statusIcon}>
              <Ionicons name="git-branch-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusEyebrow}>Rules-based coach</Text>
              <Text style={styles.statusTitle}>
                {isPro
                  ? latestReview
                    ? `Latest coaching decision${reviewDate ? `: ${reviewDate}` : ''}`
                    : 'Ready for your first check-in'
                  : 'Coach is available on Pro'}
              </Text>
            </View>
          </View>
          <Text style={styles.statusBody}>
            {isPro
              ? latestReview
                ? 'Open the coaching decision to see what changed, what was held, and the exact signals behind it.'
                : 'Log training, morning weight and food where relevant. When the weekly check-in opens, Volyume combines your answers with those logs before changing targets.'
              : 'The Coach is a rules-based weekly system that reads your logs, applies safety limits, and explains every decision.'}
          </Text>
        </Card>

        {isPro ? (
          <View style={styles.section}>
            <SectionLabel>This week</SectionLabel>
            <NavRow
              icon="clipboard-outline"
              label="Weekly check-in"
              sub="Answer this week's questions so the coach has context."
              onPress={() => navigation.navigate('WeeklyCheckIn')}
            />
            <NavRow
              icon="pulse-outline"
              label="Coaching decision"
              sub="The output from your check-in: changes, holds, rationale and next steps."
              onPress={() => navigation.navigate('CoachOutput', latestReview?.weekStart ? { weekStart: latestReview.weekStart } : undefined)}
            />
          </View>
        ) : (
          <View style={styles.section}>
            <SectionLabel>Coach</SectionLabel>
            <NavRow
              icon="sparkles-outline"
              label="Upgrade to Pro"
              sub="Weekly coaching, nutrition targets, body metrics and progress photos."
              pro={!isPro}
              onPress={() => navigation.navigate('ProUpgrade')}
            />
            {hasCoachHistory ? (
              <NavRow
                icon="book-outline"
                label="Coaching history"
                sub="Past Pro decisions stay readable. View-only on the free plan."
                onPress={() => navigation.navigate('CoachHeldHistory')}
              />
            ) : null}
          </View>
        )}

        {isPro ? (
          <View style={styles.section}>
            <SectionLabel>Setup</SectionLabel>
            <NavRow
              icon="flag-outline"
              label="Update goal and phase"
              sub="Change goal, phase, schedule, equipment or experience."
              onPress={() => navigation.navigate('ProGoalSetup')}
            />
            <NavRow
              icon="nutrition-outline"
              label="Nutrition targets"
              sub="Calories, macros, protein level and target rationale."
              onPress={() => navigation.navigate('NutritionTargets')}
            />
            <NavRow
              icon="notifications-outline"
              label="Coaching reminders"
              sub="Check-in, weigh-in and adherence reminders that feed the weekly loop."
              onPress={() => navigation.navigate('CoachingReminders')}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>Support</SectionLabel>
          <NavRow
            icon="people-outline"
            label="Partners"
            sub={partnersSub}
            pro={!isPro}
            onPress={openPartners}
          />
        </View>

        {isPro ? (
          <View style={styles.section}>
            <SectionLabel>Safety checks</SectionLabel>
            <NavRow
              icon="shield-checkmark-outline"
              label="Goal lock"
              sub="Set the conservative limit for cutting goals."
              onPress={() => navigation.navigate('GoalLockConsent', { editMode: true })}
            />
            <NavRow
              icon="heart-outline"
              label="Wellbeing check"
              sub="Update the screening answers that shape how coaching is applied."
              onPress={() => navigation.navigate('WellbeingCheck')}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionLabel>App settings</SectionLabel>
          <NavRow
            icon="settings-outline"
            label="Settings"
            sub="Account, units, notifications, data, billing and privacy."
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        <View style={styles.about}>
          <Text style={styles.aboutName}>Volyume</Text>
          <Text style={styles.aboutVersion}>Rules-based coaching, private by design.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  profileInfo: { flex: 1, gap: spacing.xxs },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileName: { ...type.title, color: colors.textPrimary, flexShrink: 1 },
  profileStat: { ...type.num('caption'), color: colors.textSecondary },
  profileFocus: { ...type.captionTight, color: colors.textMuted },
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
  statusCard: { gap: spacing.md },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: withAlpha(colors.primary, alpha.edge),
  },
  statusEyebrow: { ...type.caption, color: colors.primary, fontWeight: fontWeight.black, textTransform: 'uppercase' },
  statusTitle: { ...type.bodyStrong, color: colors.textPrimary },
  statusBody: { ...type.bodySm, color: colors.textSecondary },
  section: { gap: spacing.md },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  navRowIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowText: { flex: 1 },
  navRowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navRowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  navRowSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },
  about: { alignItems: 'center', paddingTop: spacing.md, gap: spacing.xs },
  aboutName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
  aboutVersion: { ...type.caption, color: colors.textMuted },
});
