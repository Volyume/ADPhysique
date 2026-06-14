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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Application from 'expo-application';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../styles/theme';
import ScreenHeader from '../components/ScreenHeader';
import PressableCard from '../components/PressableCard';
import { ProBadge } from '../components/ProGate';
import useAppStore from '../store/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { getAllWorkouts } from '../lib/database';

function NavRow({ icon, label, sub, onPress }) {
  return (
    <PressableCard style={styles.navRow} onPress={onPress} accessibilityLabel={label}>
      <View style={styles.navRowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.navRowText}>
        <Text style={styles.navRowLabel}>{label}</Text>
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
    }
    return () => { alive = false; };
  }, [user?.id]));

  const displayName = userProfile?.firstName
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'You';

  const trainingAge = userProfile?.trainingAgeYears
    ? `${Math.floor(userProfile.trainingAgeYears)} yr${Math.floor(userProfile.trainingAgeYears) !== 1 ? 's' : ''} training`
    : null;

  const isPro = tier === 'pro';

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
            {trainingAge ? <Text style={styles.profileMeta}>{trainingAge}</Text> : null}
            {sessions != null ? (
              <Text style={styles.profileStat}>{sessions} session{sessions !== 1 ? 's' : ''}</Text>
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
              sub="Change your goal, phase, schedule, equipment or experience. We rebuild the plan and your nutrition targets around the new answers."
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
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primaryBg, borderWidth: 2, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.primary },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { ...type.title, color: colors.textPrimary },
  profileMeta: { ...type.caption, color: colors.textMuted },
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
  navRowLabel: { ...type.bodyStrong, color: colors.textPrimary },
  navRowSub: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  about: { alignItems: 'center', paddingTop: spacing.md, gap: spacing.xs },
  aboutName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, color: colors.textMuted },
  aboutVersion: { ...type.caption, color: colors.textMuted },
  aboutBuild: { ...type.caption, color: colors.textDisabled, fontVariant: ['tabular-nums'] },
});
