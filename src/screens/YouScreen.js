/**
 * YouScreen
 *
 * Root of the You tab. Profile + account + the personal coaching and
 * preference shortcuts. The progress/recovery dashboard content now
 * lives inline on the Progress tab and the coaching decision history
 * now sits inside Precision Coaching; this screen is the place you
 * manage yourself, your plan and your settings.
 *
 * Voice rules: CLAUDE.md + COACHING_VOICE_SYNTHESIS_LOCKED. No em dashes.
 */
import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import * as Application from 'expo-application';
import { colors, fontSize, fontWeight, spacing, radius, type, circle } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import PressableCard from '../components/PressableCard';
import { ProBadge } from '../components/ProGate';
import { Skeleton } from '../components/Skeleton';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllWorkouts, getCoachOutputHistory } from '../lib/database';
import { navigateCrossTab } from '../navigation/navigateCrossTab';
import usePartners from '../hooks/usePartners';
import { partnerRowLine } from '../lib/partners/signals';
import { trackPartnerSurfaceView } from '../lib/partners/telemetry';

function NavRow({ icon, label, sub, onPress, pro }) {
  // `pro` marks a row whose destination is Pro-gated: free users see the row
  // undimmed with a PRO badge (the NavTile treatment, T6) and tapping opens
  // the gated destination, so the lock never reads as a dead end.
  return (
    <PressableCard
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
    </PressableCard>
  );
}

export default function YouScreen({ navigation }) {
  const { user, userProfile, tier } = useAppStore(useShallow(s => ({
    user: s.user, userProfile: s.userProfile, tier: s.tier,
  })));
  const [sessions, setSessions] = useState(null);
  // E10 read-only lapse views (F2): whether this user has past coach decisions
  // to show. Free users with history get a "Coaching history" row into the
  // read-only CoachHeldHistory screen, so a lapsed user keeps sight of every
  // call the coach made while they were on Pro. Defaults false (no row) and a
  // failed read stays false, so never-Pro users see nothing new.
  const [hasCoachHistory, setHasCoachHistory] = useState(false);

  useFocusEffect(useCallback(() => {
    let alive = true;
    if (user?.id) {
      getAllWorkouts(user.id)
        .then(ws => {
          if (!alive) return;
          const completed = (ws || []).filter(w => !!(w.isCompleted ?? w.is_completed));
          setSessions(completed.length);
        })
        .catch(() => {});
      if (tier !== 'pro') {
        // Reset first so a failed read (or an account switch to a user with
        // no history) never leaves the previous account's true standing.
        setHasCoachHistory(false);
        getCoachOutputHistory(user.id, 1)
          .then(rows => { if (alive) setHasCoachHistory((rows ?? []).length > 0); })
          .catch(() => {});
      }
    }
    return () => { alive = false; };
  }, [user?.id, tier]));

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'You';

  const isPro = tier === 'pro';

  // Partners row (spec B8): live pair state for Pro, the Pro-lock affordance
  // for free. The hook is a no-op when passed a null userId, so it does no
  // work for free users; the null keeps the hook call unconditional.
  const partners = usePartners(isPro ? user?.id : null, tier);
  const partnersSub = isPro
    ? partnerRowLine({
        rowState: partners.rowState,
        partnerName: partners.partnership?.partnerFirstName,
        partnerWeek: partners.partnerWeek,
      })
    : 'Quiet accountability with someone you trust';
  const openPartners = useCallback(() => {
    trackPartnerSurfaceView('you_row');
    navigateCrossTab(navigation, 'ProgressTab', 'Partner', { source: 'you_row' });
  }, [navigation]);

  // App version for the About footer. Helps a user quote their build when they
  // report an issue. Reads expo-application (already a dependency); hidden if
  // the native value is unavailable (e.g. in some test/preview contexts).
  const appVersion = Application.nativeApplicationVersion
    ? `Version ${Application.nativeApplicationVersion}${Application.nativeBuildVersion ? ` (${Application.nativeBuildVersion})` : ''}`
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
        <ScreenHeader title="You" />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(displayName?.[0] || 'Y').toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={styles.profileName}>{displayName}</Text>
              {isPro && <ProBadge size="sm" />}
            </View>
            {sessions != null ? (
              <Text style={styles.profileStat}>{sessions} session{sessions !== 1 ? 's' : ''}</Text>
            ) : user?.id ? (
              // Cold-start skeleton in the same slot the session count fills,
              // so the stat fades in instead of popping the layout (Skeleton.js
              // doctrine). Sized to the caption line it replaces.
              <Skeleton width={88} height={12} />
            ) : null}
          </View>
        </View>

        {/* Go Pro (free only) */}
        {!isPro && (
          <View style={styles.section}>
            <NavRow
              icon="sparkles-outline"
              label="Go Pro"
              sub="Precision Coaching, nutrition targets and body metrics"
              onPress={() => navigation.navigate('ProUpgrade')}
            />
            {/* E10 read-only lapse views (F2): a lapsed user keeps a read-only
                view of the coach's past decisions. Only shown when there IS
                history, so never-Pro users see nothing extra. CoachHeldHistory
                is registered in this stack and renders display-only. */}
            {hasCoachHistory && (
              <NavRow
                icon="book-outline"
                label="Coaching history"
                sub="Every call the coach made while you were on Pro, what changed and why. View-only on the free plan."
                onPress={() => navigation.navigate('CoachHeldHistory')}
              />
            )}
          </View>
        )}

        {/* Coaching (Pro) */}
        {isPro && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Coaching</Text>
            <NavRow
              icon="pulse-outline"
              label="Weekly check-in"
              sub="Your weekly check-in. Answer four questions and the coach adjusts your plan from them."
              onPress={() => navigation.navigate('WeeklyCheckIn')}
            />
            <NavRow
              icon="sparkles-outline"
              label="Precision Coaching™"
              sub="Read what the coach changed, and why, after your check-in. Your full decision history sits here too. Built on published training science."
              onPress={() => navigation.navigate('CoachOutput')}
            />
            <NavRow
              icon="flag-outline"
              label="Update your plan"
              sub="Change your goal, phase, schedule, equipment or experience. Precision Coaching rebuilds the plan and your nutrition targets around the new answers."
              onPress={() => navigation.navigate('ProGoalSetup')}
            />
            <NavRow
              icon="nutrition-outline"
              label="Nutrition targets"
              sub="Your calories and macros"
              onPress={() => navigation.navigate('NutritionTargets')}
            />
            <NavRow
              icon="shield-checkmark-outline"
              label="Goal lock"
              sub="Tell Volyume whether you've run aggressive cuts before. It changes how soon the safety check steps in."
              onPress={() => navigation.navigate('GoalLockConsent', { editMode: true })}
            />
          </View>
        )}

        {/* COMP-006: how the coaching decides. FREE USERS ONLY (founder
            device-walk 2026-06-12): Pro users already reach this in-context on
            the Precision Coaching screen (the why-block's learn-more and the
            held-decisions card), so the You row was a redundant extra button
            for them. A free user has no coach screen yet, and this static
            trust copy is part of weighing up Pro, so their path stays. */}
        {!isPro && (
          <View style={styles.section}>
            <NavRow
              icon="book-outline"
              label="How Precision Coaching works"
              sub="The rules behind every change, and every hold. Every change has a reason. Every non-change has a reason too."
              onPress={() => navigation.navigate('Methodology', { source: 'you_tab' })}
            />
          </View>
        )}

        {/* Partners (spec B8): after the coaching rows, before settings. One
            calm entry to the shared-signal partner surface. Pro shows live
            pair state; free shows the standard Pro-lock affordance and taps
            through to the gated destination. */}
        <View style={styles.section}>
          <NavRow
            icon="people-outline"
            label="Partners"
            sub={partnersSub}
            pro={!isPro}
            onPress={openPartners}
          />
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>
          {isPro && (
            <NavRow
              icon="heart-outline"
              label="Wellbeing check"
              sub="Update your health screening answers. This shapes how your coaching is applied."
              onPress={() => navigation.navigate('WellbeingCheck')}
            />
          )}
          <NavRow
            icon="settings-outline"
            label="Settings"
            sub="Account, units, notifications, data and privacy"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.aboutName}>Volyume</Text>
          <Text style={styles.aboutVersion}>Less thinking. More lifting.</Text>
          {appVersion ? <Text style={styles.aboutBuild}>{appVersion}</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxxl },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.lg,
    backgroundColor: colors.surface, borderRadius: radius.lg,
    padding: spacing.lg, borderWidth: 1, borderColor: colors.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: circle(56),
    backgroundColor: colors.primaryBg, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...type.title, color: colors.textPrimary },
  profileStat: { ...type.num('caption'), color: colors.textSecondary },

  section: { gap: spacing.md },
  sectionLabel: {
    ...type.label,
    color: colors.textSecondary,
  },

  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  navRowIcon: {
    width: 36, height: 36, borderRadius: radius.md, backgroundColor: colors.primaryBg,
    alignItems: 'center', justifyContent: 'center',
  },
  navRowText: { flex: 1 },
  navRowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navRowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  navRowSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  about: { alignItems: 'center', paddingTop: spacing.md, gap: spacing.xs },
  aboutName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
  aboutVersion: { ...type.caption, color: colors.textMuted },
  aboutBuild: { ...type.caption, color: colors.textDisabled, fontVariant: ['tabular-nums'] },
});
