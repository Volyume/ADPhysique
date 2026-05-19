import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import useAppStore from '../store/useAppStore';
import {
  logMorningWeight,
  saveWeeklyCheckin,
  getMorningWeightsLast14Days,
  getWeeklySessionStats,
  getWeeklyPRCount,
  getNutritionTargets,
} from '../lib/database';
import { colors, fontSize, fontWeight, spacing, radius } from '../styles/theme';
import { requestNotificationPermissions, getNotificationPermissionStatus } from '../lib/notifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the Monday midnight UTC timestamp for the week that contains now. */
function getCurrentWeekStart() {
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - day);
  return d;
}

/** "Mon 19 May – Sun 25 May" style label */
function formatWeekRange(weekStart) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const sun = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d) =>
    `${days[d.getUTCDay()]} ${d.getUTCDate()} ${months[d.getUTCMonth()]}`;
  return `${fmt(weekStart)} – ${fmt(sun)}`;
}

/** Checks whether a weight entry was logged today (UTC date match). */
function hasLoggedToday(weights) {
  if (!weights || weights.length === 0) return false;
  const todayStr = new Date().toISOString().slice(0, 10);
  return weights.some((w) => {
    const ts = w.loggedAt ?? w.logged_at ?? w.createdAt ?? w.created_at;
    if (!ts) return false;
    return new Date(ts).toISOString().slice(0, 10) === todayStr;
  });
}

/** Returns the most recent weight entry's value if logged today. */
function todayWeightValue(weights) {
  if (!weights || weights.length === 0) return null;
  const todayStr = new Date().toISOString().slice(0, 10);
  const entry = weights.find((w) => {
    const ts = w.loggedAt ?? w.logged_at ?? w.createdAt ?? w.created_at;
    return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
  });
  if (!entry) return null;
  return entry.weightKg ?? entry.weight_kg ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ChipRow({ options, selected, onSelect }) {
  return (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onSelect(isSelected ? null : opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipValue, isSelected && styles.chipValueSelected]}>
              {opt.value}
            </Text>
            <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function OptionRow({ options, selected, onSelect }) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const isSelected = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
            onPress={() => onSelect(isSelected ? null : opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.optionBtnText, isSelected && styles.optionBtnTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function WeeklyCheckInScreen({ navigation }) {
  const { user, userProfile, units } = useAppStore();
  const [nutritionTargets, setNutritionTargets] = useState(null);

  // If no goal phase is set, send to setup first
  useEffect(() => {
    if (!userProfile?.goalPhase) {
      navigation.replace('ProGoalSetup', { fromCheckin: true });
    }
  }, [userProfile?.goalPhase]);

  // Load nutrition targets from DB (not from userProfile — they live in SQLite)
  useEffect(() => {
    if (!user?.id) return;
    getNutritionTargets(user.id).then(t => setNutritionTargets(t ?? null)).catch(() => {});
  }, [user?.id]);

  // Derived constants
  const weekStart = getCurrentWeekStart();
  const weekLabel = formatWeekRange(weekStart);
  const unitLabel = units === 'lbs' ? 'lbs' : 'kg';

  // Loading & persistence state
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Today's weight tracking
  const [alreadyLoggedToday, setAlreadyLoggedToday] = useState(false);
  const [todayLoggedValue, setTodayLoggedValue] = useState(null);
  const [morningWeight, setMorningWeight] = useState('');

  // Form state
  const [energyScore, setEnergyScore] = useState(null);   // 1–5
  const [sorenessScore, setSorenessScore] = useState(null); // 1–5
  const [calsAdherence, setCalsAdherence] = useState(null); // 'yes' | 'no' | 'untracked'
  const [stepsAdherence, setStepsAdherence] = useState(null); // 'hit' | 'mostly' | 'missed'
  const [cycleOverride, setCycleOverride] = useState(false);
  const [sleepHours, setSleepHours] = useState('');
  const [notes, setNotes] = useState('');

  // Profile-derived flags
  const hasNutritionTarget = Boolean(nutritionTargets?.targetKcal);
  const hasStepsTarget = Boolean(userProfile?.stepsTarget ?? userProfile?.steps_target);
  const trackCycle = userProfile?.trackCycle === true || userProfile?.track_cycle === true;

  // Load morning weights for the week summary
  const [weekWeights, setWeekWeights] = useState([]);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!user?.id) return;
        const weights = await getMorningWeightsLast14Days(user.id);
        if (cancelled) return;
        const logged = hasLoggedToday(weights);
        setAlreadyLoggedToday(logged);
        if (logged) setTodayLoggedValue(todayWeightValue(weights));
        // Last 7 days only for the check-in summary
        const weekAgo = Date.now() - 7 * 86400000;
        setWeekWeights(weights.filter(w => (w.loggedAt ?? 0) >= weekAgo));
      } catch (e) {
        console.warn('[WeeklyCheckIn] failed to load morning weights', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // CTA enabled when minimum required fields are set
  const canSubmit = energyScore !== null && sorenessScore !== null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const userId = user?.id;
      if (!userId) return;

      // Save the weekly check-in record
      await saveWeeklyCheckin(userId, {
        weekStart: weekStart.getTime(),
        energyScore,
        sorenessScore,
        stressScore: null,
        sleepHours: sleepHours.trim() ? parseFloat(sleepHours) : null,
        calsAdherence: calsAdherence ?? null,
        stepsAdherence: stepsAdherence ?? null,
        cycleOverride: cycleOverride ? 1 : 0,
        notes: notes.trim() || null,
      });

      // 3. Offer notification permission if never asked
      const goCoach = () => navigation.navigate('CoachOutput', { weekStart: weekStart.getTime() });
      const permStatus = await getNotificationPermissionStatus();
      if (permStatus === 'undetermined') {
        Alert.alert(
          'Daily weight reminders',
          'A morning nudge to log your weight makes your weekly coaching more accurate. Enable it?',
          [
            { text: 'Not now', style: 'cancel', onPress: goCoach },
            {
              text: 'Yes please',
              onPress: async () => {
                await requestNotificationPermissions().catch(() => {});
                goCoach();
              },
            },
          ],
          { cancelable: false },
        );
      } else {
        goCoach();
      }
    } catch (e) {
      console.warn('[WeeklyCheckIn] submit failed', e);
    } finally {
      setBusy(false);
    }
  }, [
    canSubmit, busy, user?.id, morningWeight, alreadyLoggedToday,
    energyScore, sorenessScore, sleepHours, calsAdherence, stepsAdherence,
    cycleOverride, notes, weekStart, navigation,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weekly check-in</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Week intro */}
          <View style={styles.introBlock}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            <Text style={styles.introSubtitle}>
              Takes 2 minutes. Volyume will tell you what to adjust.
            </Text>
          </View>

          {/* ── 1. Morning weight summary (read-only — logged daily from Train tab) ── */}
          {!loading && (
            <View style={styles.section}>
              <SectionLabel>Morning weight this week</SectionLabel>
              {weekWeights.length > 0 ? (
                <View style={styles.weightSummaryRow}>
                  <View style={styles.weightSummaryLeft}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.weightSummaryText}>
                      {weekWeights.length} {weekWeights.length === 1 ? 'day' : 'days'} logged
                      {weekWeights.length >= 1 && (() => {
                        const avg = weekWeights.reduce((s, w) => s + (w.weightKg ?? 0), 0) / weekWeights.length;
                        return ` · avg ${avg.toFixed(1)} ${unitLabel}`;
                      })()}
                    </Text>
                  </View>
                  {!alreadyLoggedToday && (
                    <Text style={styles.weightSummaryMissed}>Not yet today</Text>
                  )}
                </View>
              ) : (
                <Text style={styles.skipNote}>
                  No morning weights logged this week. Log from the Train tab each morning.
                </Text>
              )}
            </View>
          )}

          {/* ── 2. Energy & motivation ────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>How was your energy and motivation?</SectionLabel>
            <ChipRow
              options={[
                { value: 1, label: 'Low' },
                { value: 2, label: 'Below normal' },
                { value: 3, label: 'Normal' },
                { value: 4, label: 'Good' },
                { value: 5, label: 'High' },
              ]}
              selected={energyScore}
              onSelect={setEnergyScore}
            />
          </View>

          {/* ── 3. Soreness ───────────────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>Overall muscle soreness?</SectionLabel>
            <ChipRow
              options={[
                { value: 1, label: 'None' },
                { value: 2, label: 'Mild' },
                { value: 3, label: 'Moderate' },
                { value: 4, label: 'High' },
                { value: 5, label: 'Very high' },
              ]}
              selected={sorenessScore}
              onSelect={setSorenessScore}
            />
          </View>

          {/* ── 4. Calorie adherence (only when target exists) ────────────── */}
          {hasNutritionTarget ? (
            <View style={styles.section}>
              <SectionLabel>Did you hit your calorie target?</SectionLabel>
              <OptionRow
                options={[
                  { value: 'yes', label: 'Yes, mostly' },
                  { value: 'no', label: 'No, missed it' },
                  { value: 'untracked', label: "Didn't track" },
                ]}
                selected={calsAdherence}
                onSelect={setCalsAdherence}
              />
            </View>
          ) : (
            <View style={styles.section}>
              <SectionLabel>Calorie target</SectionLabel>
              <TouchableOpacity
                onPress={() => navigation.navigate('NutritionTargets')}
                activeOpacity={0.75}
              >
                <Text style={styles.skipNoteTappable}>
                  Nutrition targets not set. Tap to set them up and unlock calorie coaching.
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 5. Steps adherence (only when steps target set) ──────────── */}
          {hasStepsTarget && (
            <View style={styles.section}>
              <SectionLabel>Steps target?</SectionLabel>
              <OptionRow
                options={[
                  { value: 'hit', label: 'Hit it' },
                  { value: 'mostly', label: 'Mostly' },
                  { value: 'missed', label: 'Missed it' },
                ]}
                selected={stepsAdherence}
                onSelect={setStepsAdherence}
              />
            </View>
          )}

          {/* ── 6. Cycle phase (optional) ─────────────────────────────────── */}
          {trackCycle && (
            <View style={styles.section}>
              <SectionLabel>
                Anything affecting your weight this week?{'\n'}(cycle phase, travel, illness)
              </SectionLabel>
              <TouchableOpacity
                style={[styles.toggleBtn, cycleOverride && styles.toggleBtnSelected]}
                onPress={() => setCycleOverride((v) => !v)}
                activeOpacity={0.75}
              >
                <View style={[styles.checkbox, cycleOverride && styles.checkboxSelected]}>
                  {cycleOverride && (
                    <Ionicons name="checkmark" size={13} color={colors.background} />
                  )}
                </View>
                <Text style={[styles.toggleBtnText, cycleOverride && styles.toggleBtnTextSelected]}>
                  Weight may be unreliable this week
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── 7. Sleep (optional) ───────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>Average sleep? (hours, optional)</SectionLabel>
            <TextInput
              style={styles.sleepInput}
              value={sleepHours}
              onChangeText={setSleepHours}
              keyboardType="decimal-pad"
              placeholder="7.5"
              placeholderTextColor={colors.textMuted}
              returnKeyType="done"
              maxLength={4}
            />
          </View>

          {/* ── 8. Notes (optional) ──────────────────────────────────────── */}
          <View style={styles.section}>
            <SectionLabel>Anything else? (optional)</SectionLabel>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Injuries, life stress, travel, anything Volyume should factor in…"
              placeholderTextColor={colors.textMuted}
              maxLength={280}
              textAlignVertical="top"
              returnKeyType="default"
            />
            <Text style={styles.charCount}>{notes.length}/280</Text>
          </View>

          {/* ── CTA ──────────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={[styles.ctaBtn, !canSubmit && styles.ctaBtnDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || busy}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.ctaBtnText, !canSubmit && styles.ctaBtnTextDisabled]}>
                See this week's plan
              </Text>
            )}
          </TouchableOpacity>

          {!canSubmit && (
            <Text style={styles.ctaHint}>
              Rate your energy and soreness to continue.
            </Text>
          )}

          <View style={styles.bottomPad} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },

  // ── Header bar
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  backBtn: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },

  // ── Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // ── Intro block
  introBlock: {
    marginBottom: spacing.xl,
  },
  weekLabel: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
    marginBottom: spacing.xs,
    letterSpacing: 0.2,
  },
  introSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // ── Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    letterSpacing: 0.2,
  },

  // ── Weight logged indicator
  loggedTodayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loggedTodayText: {
    fontSize: fontSize.md,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },

  // ── Weight input
  weightInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
    width: 140,
  },

  // ── Chips (1–5 score)
  chipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    flex: 1,
    minWidth: 52,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: 2,
  },
  chipSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  chipValue: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
  },
  chipValueSelected: {
    color: colors.primary,
  },
  chipLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
    textAlign: 'center',
  },
  chipLabelSelected: {
    color: colors.primary,
  },

  // ── Option buttons (3-way choices)
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  optionBtnSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  optionBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionBtnTextSelected: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },

  // ── Skip note (when no nutrition target)
  weightSummaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface2, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.border,
  },
  weightSummaryLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weightSummaryText: { fontSize: fontSize.sm, color: colors.textSecondary },
  weightSummaryMissed: { fontSize: fontSize.xs, color: colors.textMuted, fontStyle: 'italic' },
  skipNote: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  skipNoteTappable: {
    fontSize: fontSize.sm,
    color: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },

  // ── Cycle toggle
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtnSelected: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    flex: 1,
  },
  toggleBtnTextSelected: {
    color: colors.primary,
  },

  // ── Sleep input
  sleepInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
    width: 120,
  },

  // ── Notes input
  notesInput: {
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    minHeight: 96,
    lineHeight: 22,
  },
  charCount: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },

  // ── CTA
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaBtnDisabled: {
    backgroundColor: colors.surface3,
  },
  ctaBtnText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.background,
    letterSpacing: 0.3,
  },
  ctaBtnTextDisabled: {
    color: colors.textMuted,
  },
  ctaHint: {
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  bottomPad: {
    height: spacing.xxl,
  },
});
