import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import useAppStore from '../store/useAppStore';
import { getAllWorkouts } from '../lib/database';

const NUTRITION_KEY = '@volyume_nutrition_targets';
const BODY_METRICS_KEY = '@volyume_body_metrics_';

export default function AthleteHubScreen({ navigation }) {
  const { user, userProfile } = useAppStore();
  const [nutritionTargets, setNutritionTargets] = useState(null);
  const [latestMetric, setLatestMetric] = useState(null);
  const [totalWorkouts, setTotalWorkouts] = useState(0);

  useFocusEffect(useCallback(() => {
    loadData();
  }, [user?.id]));

  async function loadData() {
    if (!user?.id) return;
    await Promise.all([loadNutrition(), loadBodyMetrics(), loadWorkoutCount()]);
  }

  async function loadNutrition() {
    try {
      const raw = await AsyncStorage.getItem(NUTRITION_KEY);
      if (raw) setNutritionTargets(JSON.parse(raw));
      else setNutritionTargets(null);
    } catch (_e) {}
  }

  async function loadBodyMetrics() {
    try {
      const raw = await AsyncStorage.getItem(BODY_METRICS_KEY + user.id);
      if (raw) {
        const entries = JSON.parse(raw);
        if (entries?.length > 0) {
          const sorted = [...entries].sort((a, b) => b.date - a.date);
          setLatestMetric(sorted[0]);
        }
      }
    } catch (_e) {}
  }

  async function loadWorkoutCount() {
    try {
      const all = await getAllWorkouts(user.id);
      setTotalWorkouts(all.filter(w => w.isCompleted).length);
    } catch (_e) {}
  }

  const displayName = userProfile?.first_name
    || user?.email?.split('@')[0]?.replace(/[^a-zA-Z]/g, ' ').trim()
    || 'Athlete';

  const trainingFocus = userProfile?.training_focus
    ? userProfile.training_focus.charAt(0).toUpperCase() + userProfile.training_focus.slice(1).replace(/_/g, ' ')
    : 'Bodybuilder';

  const trainingAge = userProfile?.training_age
    ? `${userProfile.training_age}+ yrs`
    : null;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>You</Text>
        <TouchableOpacity
          style={styles.settingsCog}
          onPress={() => navigation.navigate('Settings')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Athlete Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(displayName?.[0] || 'A').toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileMeta}>
              {trainingFocus}{trainingAge ? ` · ${trainingAge}` : ''}
            </Text>
            <Text style={styles.profileSessions}>
              {totalWorkouts} sessions completed
            </Text>
          </View>
        </View>

        {/* Nutrition Targets Card */}
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate('NutritionTargets')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="nutrition" size={20} color={colors.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Nutrition Targets</Text>
              {nutritionTargets ? (
                <Text style={styles.cardSubtitle}>
                  {nutritionTargets.phase
                    ? nutritionTargets.phase.charAt(0).toUpperCase() + nutritionTargets.phase.slice(1)
                    : 'Active'} · {nutritionTargets.calories} kcal
                </Text>
              ) : (
                <Text style={[styles.cardSubtitle, styles.cardSubtitleAlert]}>Not set — tap to configure</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
          {nutritionTargets && (
            <View style={styles.macroStrip}>
              <MacroPill label="Protein" value={`${nutritionTargets.protein}g`} color={colors.primary} />
              <MacroPill label="Carbs" value={`${nutritionTargets.carbs}g`} color={colors.success} />
              <MacroPill label="Fat" value={`${nutritionTargets.fat}g`} color={colors.warning} />
            </View>
          )}
          {!nutritionTargets && (
            <Text style={styles.cardEmptyText}>
              Calculate your daily calorie and macro targets based on your body stats and goal.
            </Text>
          )}
        </TouchableOpacity>

        {/* Body Metrics Card */}
        <TouchableOpacity
          style={styles.sectionCard}
          onPress={() => navigation.navigate('BodyMetrics')}
          activeOpacity={0.8}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="body" size={20} color={colors.success} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Body Metrics</Text>
              {latestMetric ? (
                <Text style={styles.cardSubtitle}>
                  {latestMetric.weight ? `${latestMetric.weight} kg` : 'Logged'}
                </Text>
              ) : (
                <Text style={[styles.cardSubtitle, styles.cardSubtitleAlert]}>No entries yet</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </View>
          {latestMetric ? (
            <View style={styles.metricRow}>
              {latestMetric.weight != null && (
                <MetricChip label="Weight" value={`${latestMetric.weight} kg`} />
              )}
              {latestMetric.bodyFat != null && (
                <MetricChip label="Body fat" value={`${latestMetric.bodyFat}%`} />
              )}
              {latestMetric.waist != null && (
                <MetricChip label="Waist" value={`${latestMetric.waist} cm`} />
              )}
            </View>
          ) : (
            <Text style={styles.cardEmptyText}>
              Track bodyweight, body fat, and measurements over time.
            </Text>
          )}
        </TouchableOpacity>

        {/* Training Intelligence Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Ionicons name="analytics" size={20} color={colors.warning} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>Training Intelligence</Text>
              <Text style={styles.cardSubtitle}>Volume landmarks & deload signals</Text>
            </View>
          </View>
          <View style={styles.intelligenceLinks}>
            <IntelligenceLink
              icon="grid-outline"
              label="Volume Heatmap"
              sub="Weekly MEV / MAV / MRV"
              onPress={() => navigation.navigate('ProgressTab', { screen: 'VolumeHeatmap' })}
            />
            <IntelligenceLink
              icon="calendar-outline"
              label="Training Blocks"
              sub="Mesocycle planning"
              onPress={() => navigation.navigate('MesocycleBuilder')}
            />
            <IntelligenceLink
              icon="trophy-outline"
              label="Personal Records"
              sub="All-time bests"
              onPress={() => navigation.navigate('ProgressTab', { screen: 'PRWall' })}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.about}>
          <Text style={styles.aboutName}>Volyume</Text>
          <Text style={styles.aboutVersion}>v1.0.0 · Intelligent Hypertrophy Logbook</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function MacroPill({ label, value, color }) {
  return (
    <View style={styles.macroPill}>
      <Text style={[styles.macroPillValue, { color }]}>{value}</Text>
      <Text style={styles.macroPillLabel}>{label}</Text>
    </View>
  );
}

function MetricChip({ label, value }) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipValue}>{value}</Text>
      <Text style={styles.metricChipLabel}>{label}</Text>
    </View>
  );
}

function IntelligenceLink({ icon, label, sub, onPress }) {
  return (
    <TouchableOpacity style={styles.intelligenceRow} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.primary} />
      <View style={styles.intelligenceText}>
        <Text style={styles.intelligenceLabel}>{label}</Text>
        <Text style={styles.intelligenceSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.black,
    color: colors.textPrimary,
  },
  settingsCog: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryBg,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  profileInfo: { flex: 1, gap: 3 },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textTransform: 'capitalize',
  },
  profileMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  profileSessions: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: { flex: 1 },
  cardTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardSubtitleAlert: {
    color: colors.warning,
  },
  cardEmptyText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    lineHeight: 20,
  },
  macroStrip: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  macroPill: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  macroPillValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
  macroPillLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricChip: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  metricChipValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  metricChipLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  intelligenceLinks: { gap: spacing.xs },
  intelligenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  intelligenceText: { flex: 1 },
  intelligenceLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  intelligenceSub: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
  privacyNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  privacyLink: {
    paddingTop: spacing.xs,
  },
  privacyLinkText: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  about: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  aboutName: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  aboutVersion: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
