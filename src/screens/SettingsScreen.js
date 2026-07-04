import { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { canScheduleExactAlarms, requestExactAlarmAccess } from '../lib/notifications/restForeground';
import { isHealthAvailable, getHealthProviderLabel } from '../lib/health';
import { appAlert } from '../components/AppAlert';
import { SettingsPage, SettingRow, settingsStyles as styles } from '../components/SettingsPrimitives';
import { colors, withAlpha, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';

// Body-weight unit options. Gym weights stay kg-only by design (UK); this
// only controls how a user's own body weight is shown/entered.
const BODY_WEIGHT_UNIT_OPTIONS = [
  { value: 'st', label: 'Stone' },
  { value: 'kg', label: 'Kg' },
  { value: 'lbs', label: 'Lbs' },
];

// Settings landing. A short list of categories, each opening its own
// focused sub-page. The old single 1,500-line screen put every toggle on
// one wall; this is the tidy entry point into them.
//
// The "Workout & units" block is rendered inline here (Hevy teardown
// 2026-06-29, R1/R2): body-weight unit, barbell weight, global default rest
// timer, and auto-start rest. These wire over existing/new store setters so a
// user who picked the wrong unit in onboarding, or wants a non-90s default
// rest, is no longer stuck.
export default function SettingsScreen({ navigation }) {
  const {
    user, tier,
    bodyWeightUnits, setBodyWeightUnits,
    defaultRestSeconds, setDefaultRestSeconds,
    autoStartRestTimer, setAutoStartRestTimer,
    restEndAlertEnabled, setRestEndAlertEnabled,
    workoutPrefsLoaded, loadWorkoutPrefs,
  } = useAppStore(useShallow(s => ({
    user: s.user,
    tier: s.tier,
    bodyWeightUnits: s.bodyWeightUnits,
    setBodyWeightUnits: s.setBodyWeightUnits,
    defaultRestSeconds: s.defaultRestSeconds,
    setDefaultRestSeconds: s.setDefaultRestSeconds,
    autoStartRestTimer: s.autoStartRestTimer,
    setAutoStartRestTimer: s.setAutoStartRestTimer,
    restEndAlertEnabled: s.restEndAlertEnabled,
    setRestEndAlertEnabled: s.setRestEndAlertEnabled,
    workoutPrefsLoaded: s.workoutPrefsLoaded,
    loadWorkoutPrefs: s.loadWorkoutPrefs,
  })));
  const healthOn = isHealthAvailable();

  // E6A exact alarms: Android 12+ batches alarms unless the user grants the
  // exact-alarm special access, so the rest-finished alert can land late.
  // Re-checked on focus because the grant happens on a SYSTEM screen and
  // there is no result callback. Defaults granted (row hidden) so iOS and
  // older Android never see it.
  const [exactAlarmsGranted, setExactAlarmsGranted] = useState(true);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (Platform.OS === 'android') {
      canScheduleExactAlarms()
        .then((v) => { if (active) setExactAlarmsGranted(!!v); })
        .catch(() => {});
    }
    return () => { active = false; };
  }, []));

  // Hydrate the device-local workout prefs once so the rest-timer rows reflect
  // the saved values rather than reading as the defaults until touched.
  useEffect(() => {
    if (!workoutPrefsLoaded) loadWorkoutPrefs();
  }, [workoutPrefsLoaded, loadWorkoutPrefs]);

  function adjustRest(delta) {
    setDefaultRestSeconds((Number(defaultRestSeconds) || 90) + delta);
  }
  const restLabel = (() => {
    const s = Number(defaultRestSeconds) || 90;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${s}s`;
  })();

  return (
    <SettingsPage title="Settings">
      <View style={styles.section}>
        <SettingRow
          icon="person-circle-outline"
          label="Account"
          sub={user?.email || (tier === 'pro' ? 'Volyume Pro' : 'Free plan')}
          onPress={() => navigation.navigate('SettingsAccount')}
        />
        <SettingRow
          icon="person-outline"
          label="Profile"
          sub="Name and diet preference"
          onPress={() => navigation.navigate('SettingsProfile')}
        />
        <SettingRow
          icon="barbell-outline"
          label="Coaching"
          sub="Calmer mode, steps, cardio"
          onPress={() => navigation.navigate('SettingsCoaching')}
        />
        {tier === 'pro' ? (
          <SettingRow
            icon="nutrition-outline"
            label="Nutrition targets"
            sub="Your calorie and macro goals"
            onPress={() => navigation.navigate('NutritionTargets')}
          />
        ) : null}
        {tier === 'pro' ? (
          <SettingRow
            icon="restaurant-outline"
            label="Meal names"
            sub="Rename your meals"
            onPress={() => navigation.navigate('MealNames')}
          />
        ) : null}
        {tier === 'pro' ? (
          <SettingRow
            icon="calendar-outline"
            label="Per-day targets"
            sub="Plan a different calorie target for each weekday"
            onPress={() => navigation.navigate('PerDayTargets')}
          />
        ) : null}
        <SettingRow
          icon="notifications-outline"
          label="Notifications"
          sub="Set when Volyume nudges you to train"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        {tier === 'pro' ? (
          <SettingRow
            icon="pulse-outline"
            label="Coaching reminders"
            sub="Morning weight log and weekly check-in"
            onPress={() => navigation.navigate('CoachingReminders')}
          />
        ) : null}
        <SettingRow
          icon="contrast-outline"
          label="Display and accessibility"
          sub="Text size, contrast, motion"
          onPress={() => navigation.navigate('SettingsDisplay')}
        />
        {Platform.OS === 'android' && (
          <SettingRow
            icon="apps-outline"
            label="Home screen widget"
            sub="Your next session, right on your home screen"
            onPress={() => appAlert(
              'Home screen widget',
              'Volyume has two home screen widgets: your next session, and this week\'s consistency. Long-press an empty spot on your home screen, choose Widgets, then find Volyume to add one.',
              [{ text: 'Got it' }],
            )}
          />
        )}
        {healthOn && (
          <SettingRow
            icon="heart-outline"
            label={getHealthProviderLabel()}
            sub="Weight, steps and workouts"
            onPress={() => navigation.navigate('SettingsHealth')}
          />
        )}
        <SettingRow
          icon="cloud-outline"
          label="Your data"
          sub="Sync, backup, import, export"
          onPress={() => navigation.navigate('SettingsData')}
        />
        <SettingRow
          icon="shield-checkmark-outline"
          label="Privacy and legal"
          sub="Consent, data sharing, policy"
          onPress={() => navigation.navigate('SettingsPrivacy')}
        />
        <SettingRow
          icon="information-circle-outline"
          label="Help and about"
          sub="Feedback, rating, version"
          onPress={() => navigation.navigate('SettingsAbout')}
        />
      </View>

      {/* Workout & units (Hevy teardown R1/R2). Inline editable rows over the
          store setters: body-weight unit, barbell weight, default rest, and
          auto-start rest. Gym weights remain kg-only by design. */}
      <Text style={styles.sectionHeader}>WORKOUT &amp; UNITS</Text>
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingIcon}>
            <Ionicons name="body-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>Body-weight unit</Text>
            <Text style={styles.settingSub}>
              How your own body weight is shown. Gym weights stay in kg.
            </Text>
            <View style={local.segment} accessibilityRole="radiogroup">
              {BODY_WEIGHT_UNIT_OPTIONS.map((opt) => {
                const active = (bodyWeightUnits ?? 'st') === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[local.segBtn, active && local.segBtnActive]}
                    onPress={() => { if (!active) setBodyWeightUnits(opt.value); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={opt.label}
                  >
                    <Text style={[local.segText, active && local.segTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <Stepper
          icon="timer-outline"
          label="Default rest timer"
          sub="Used for new exercises and any set with no per-exercise rest set."
          value={restLabel}
          onMinus={() => adjustRest(-15)}
          onPlus={() => adjustRest(15)}
        />

        <SettingRow
          icon="play-outline"
          label="Auto-start rest timer"
          sub="Start the rest countdown automatically when you log a set."
          showArrow={false}
          rightElement={
            <Switch
              value={!!autoStartRestTimer}
              onValueChange={v => setAutoStartRestTimer(v)}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={autoStartRestTimer ? colors.primary : colors.textMuted}
            />
          }
        />

        {/* A2 rest-end alert off switch (founder decision 2026-07-01): the
            lock-screen "Rest done" alert is loud by design, so it carries its
            own in-app disable rather than relying on OS channel settings. */}
        <SettingRow
          icon="notifications-outline"
          label="Rest finished alert"
          sub="Sound and vibrate when your rest ends, even with the phone locked. In-app cues are unaffected."
          showArrow={false}
          rightElement={
            <Switch
              value={!!restEndAlertEnabled}
              onValueChange={v => setRestEndAlertEnabled(v)}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={restEndAlertEnabled ? colors.primary : colors.textMuted}
            />
          }
        />

        {/* E6A: exact-alarm access (Android 12+ only, hidden once granted or
            when the rest alert itself is off). The grant lives on a system
            screen; declining simply keeps today's near-time alerts. */}
        {Platform.OS === 'android' && !!restEndAlertEnabled && !exactAlarmsGranted ? (
          <SettingRow
            icon="alarm-outline"
            label="Make rest alerts exact"
            sub="Android can delay alerts a little to save battery. Allow exact alarms and the rest alert fires to the second."
            onPress={() => { requestExactAlarmAccess().catch(() => {}); }}
          />
        ) : null}
      </View>
    </SettingsPage>
  );
}

// A label + sub row with a [- value +] stepper on the right. Mirrors the
// SettingRow chrome so the Workout block reads as one coherent section.
function Stepper({ icon, label, sub, value, onMinus, onPlus }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.settingLabel}>{label}</Text>
        {sub ? <Text style={styles.settingSub}>{sub}</Text> : null}
      </View>
      <View style={local.stepper}>
        <TouchableOpacity
          style={local.stepBtn}
          onPress={onMinus}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={local.stepValue}>{value}</Text>
        <TouchableOpacity
          style={local.stepBtn}
          onPress={onPlus}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  segBtn: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: radius.sm },
  segBtnActive: { backgroundColor: colors.primaryFill },
  segText: { ...type.label, color: colors.textSecondary },
  segTextActive: { color: colors.onPrimary, fontWeight: fontWeight.semibold },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    ...type.body,
    color: colors.textPrimary,
    minWidth: 52,
    textAlign: 'center',
    fontSize: fontSize.sm,
  },
});
