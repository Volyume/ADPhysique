/**
 * Coach home.
 *
 * Historical file/route name kept as YouScreen/You for navigation stability,
 * but the visible tab is now Coach. This is a deterministic coaching hub, not
 * an AI chat surface: every destination is a rules-based Volyume flow.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, fontSize, fontWeight, spacing, radius, type, circle, withAlpha, alpha } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { ProBadge } from '../components/ProGate';
import { Skeleton } from '../components/Skeleton';
import SectionLabel from '../components/SectionLabel';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllWorkouts, getCoachOutputHistory, getLatestCoachOutput } from '../lib/database';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import usePartners from '../hooks/usePartners';
import { partnerRowLine } from '../lib/partners/signals';
import { trackPartnerSurfaceView } from '../lib/partners/telemetry';

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

export default function YouScreen({ navigation }) {
  const { user, userProfile, tier } = useAppStore(useShallow(s => ({
    user: s.user,
    userProfile: s.userProfile,
    tier: s.tier,
  })));
  const [sessions, setSessions] = useState(null);
  const [latestReview, setLatestReview] = useState(null);
  const [hasCoachHistory, setHasCoachHistory] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    async function load() {
      if (!user?.id) return;
      try {
        const [workouts, latest, history] = await Promise.all([
          getAllWorkouts(user.id).catch(() => []),
          getLatestCoachOutput(user.id).catch(() => null),
          tier !== 'pro' ? getCoachOutputHistory(user.id, 1).catch(() => []) : Promise.resolve([]),
        ]);
        if (!alive) return;
        const completed = (workouts || []).filter(w => !!(w.isCompleted ?? w.is_completed));
        setSessions(completed.length);
        setLatestReview(latest || null);
        setHasCoachHistory((history || []).length > 0);
      } catch (_) {
        if (alive) {
          setSessions(null);
          setLatestReview(null);
          setHasCoachHistory(false);
        }
      }
    }
    load();
    return () => { alive = false; };
  }, [user?.id, tier]));

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'Athlete';
  const isPro = tier === 'pro';
  const avatarUri = userProfile?.avatarUri || null;
  const reviewDate = latestReview ? formatDate(latestReview.weekStart) : null;

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
        <ScreenHeader title="Coach" subtitle="Rules-based decisions. No chat. No guesswork." />

        <Card
          style={styles.profileCard}
          onPress={() => navigation.navigate('AthleteProfile')}
          accessibilityLabel="Open athlete profile"
        >
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{(displayName?.[0] || 'A').toUpperCase()}</Text>
            )}
          </View>
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
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Card>

        <Card style={styles.statusCard} tone={isPro && latestReview ? 'primary' : undefined}>
          <View style={styles.statusTop}>
            <View style={styles.statusIcon}>
              <Ionicons name="git-branch-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statusEyebrow}>Deterministic coach</Text>
              <Text style={styles.statusTitle}>
                {isPro
                  ? latestReview
                    ? `Latest review${reviewDate ? `: ${reviewDate}` : ''}`
                    : 'Ready for your first weekly review'
                  : 'Precision Coaching is available on Pro'}
              </Text>
            </View>
          </View>
          <Text style={styles.statusBody}>
            {isPro
              ? latestReview
                ? 'Open the review to see what changed, what was held, and the exact signals behind the decision.'
                : 'Log training, morning weight, food where relevant, and a weekly check-in. Volyume waits for enough signal before changing targets.'
              : 'The coach is not a chatbot. It is a rules-based weekly system that reads your logs, applies safety limits, and explains every decision.'}
          </Text>
        </Card>

        {isPro ? (
          <View style={styles.section}>
            <SectionLabel>Coach actions</SectionLabel>
            <NavRow
              icon="clipboard-outline"
              label="Weekly check-in"
              sub="Answer the weekly questions that drive coaching changes."
              onPress={() => navigation.navigate('WeeklyCheckIn')}
            />
            <NavRow
              icon="pulse-outline"
              label="This week's review"
              sub="What changed, what held, why it happened, and what to do next."
              onPress={() => navigation.navigate('CoachOutput', latestReview?.weekStart ? { weekStart: latestReview.weekStart } : undefined)}
            />
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
        ) : (
          <View style={styles.section}>
            <SectionLabel>Coach actions</SectionLabel>
            <NavRow
              icon="sparkles-outline"
              label="Go Pro"
              sub="Weekly coaching, nutrition targets, body metrics and progress photos."
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
            <NavRow
              icon="book-outline"
              label="How Precision Coaching works"
              sub="The rules behind changes, holds, safety floors and data confidence."
              onPress={() => navigation.navigate('Methodology', { source: 'coach_tab' })}
            />
          </View>
        )}

        <View style={styles.section}>
          <SectionLabel>Safety and context</SectionLabel>
          {isPro ? (
            <>
              <NavRow
                icon="shield-checkmark-outline"
                label="Goal lock"
                sub="Set how conservative the safety check should be for aggressive cuts."
                onPress={() => navigation.navigate('GoalLockConsent', { editMode: true })}
              />
              <NavRow
                icon="heart-outline"
                label="Wellbeing check"
                sub="Update the screening answers that shape how coaching is applied."
                onPress={() => navigation.navigate('WellbeingCheck')}
              />
              <NavRow
                icon="book-outline"
                label="How decisions work"
                sub="Training volume, calorie, macro, cardio, deload and hold logic."
                onPress={() => navigation.navigate('Methodology', { source: 'coach_tab' })}
              />
            </>
          ) : null}
          <NavRow
            icon="people-outline"
            label="Partners"
            sub={partnersSub}
            pro={!isPro}
            onPress={openPartners}
          />
        </View>

        <View style={styles.section}>
          <SectionLabel>Profile and settings</SectionLabel>
          <NavRow
            icon="person-outline"
            label="Athlete profile"
            sub="Profile photo, physique snapshot, strength baselines and body data shortcuts."
            onPress={() => navigation.navigate('AthleteProfile')}
          />
          <NavRow
            icon="settings-outline"
            label="Settings"
            sub="Account, units, notifications, data, billing and privacy."
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        <View style={styles.about}>
          <Text style={styles.aboutName}>Volyume</Text>
          <Text style={styles.aboutVersion}>Less thinking. More lifting.</Text>
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
  avatar: {
    width: 56,
    height: 56,
    borderRadius: circle(56),
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  profileInfo: { flex: 1, gap: spacing.xxs },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  profileName: { ...type.title, color: colors.textPrimary, flexShrink: 1 },
  profileStat: { ...type.num('caption'), color: colors.textSecondary },
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
