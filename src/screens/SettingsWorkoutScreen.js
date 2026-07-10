import { useCallback, useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import Ionicons from '@expo/vector-icons/Ionicons';
import useAppStore from '../store/useAppStore';
import { canScheduleExactAlarms, requestExactAlarmAccess } from '../lib/notifications/restForeground';
import { SettingsPage, SettingRow, settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
import NumericStepper from '../components/Stepper';
import { colors, withAlpha, spacing, radius, fontWeight, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import * as haptics from '../lib/haptics';

// Body-weight unit options. Gym weights stay kg-only by design (UK); this
// only controls how a user's own body weight is shown/entered.
const BODY_WEIGHT_UNIT_OPTIONS = [
  { value: 'st', label: 'Stone' },
  { value: 'kg', label: 'Kg' },
  { value: 'lbs', label: 'Lbs' },
];

function formatRestSeconds(seconds) {
  const s = Number(seconds) || 90;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${s}s`;
}

// CP-6 (2026-07-09 UX audit): this block used to render inline on the
// Settings root, breaking that screen's own "tap for a sub-page" contract.
// Moved wholesale into its own sub-page; the JSX, state and persistence keys
// are unchanged from the original inline block (Hevy teardown 2026-06-29,
// R1/R2): body-weight unit, barbell weight, global default rest timer, and
// auto-start rest. These wire over existing/new store setters so a user who
// picked the wrong unit in onboarding, or wants a non-90s default rest, is
// no longer stuck.
export default function SettingsWorkoutScreen() {
  const {
    bodyWeightUnits, setBodyWeightUnits,
    defaultRestSeconds, setDefaultRestSeconds,
    autoStartRestTimer, setAutoStartRestTimer,
    restEndAlertEnabled, setRestEndAlertEnabled,
    workoutPrefsLoaded, loadWorkoutPrefs,
  } = useAppStore(useShallow(s => ({
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

  const restSeconds = Number(defaultRestSeconds) || 90;
  // CP-10 stage 3: live theme (src/hooks/useTheme.js). `live` is the shared
  // settingsStyles override (SettingsPrimitives.js); `liveLocal` covers this
  // screen's own colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveLocal = {
    segment: { backgroundColor: t.colors.surface2 },
    segBtnActive: { backgroundColor: t.colors.primaryFill },
    segText: { ...t.type.label, color: t.colors.textSecondary },
    segTextActive: { color: t.colors.onPrimary, fontWeight: fontWeight.semibold },
  };

  return (
    <SettingsPage title="Workout & units">
      <View style={[styles.section, live.section]}>
        <View style={[styles.settingRow, live.settingRow]}>
          <View style={[styles.settingIcon, live.settingIcon]}>
            <Ionicons name="body-outline" size={18} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.settingLabel, live.settingLabel]}>Body-weight unit</Text>
            <Text maxFontSizeMultiplier={1.3} style={[styles.settingSub, live.settingSub]}>
              How your own body weight is shown. Gym weights stay in kg.
            </Text>
            <View style={[local.segment, liveLocal.segment]} accessibilityRole="radiogroup">
              {BODY_WEIGHT_UNIT_OPTIONS.map((opt) => {
                const active = (bodyWeightUnits ?? 'st') === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[local.segBtn, active && [local.segBtnActive, liveLocal.segBtnActive]]}
                    onPress={() => { if (!active) { haptics.selection(); setBodyWeightUnits(opt.value); } }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={opt.label}
                  >
                    <Text maxFontSizeMultiplier={1.3} style={[local.segText, liveLocal.segText, active && [local.segTextActive, liveLocal.segTextActive]]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        <SettingRow
          icon="timer-outline"
          label="Default rest timer"
          sub="Used for new exercises and any set with no per-exercise rest set."
          showArrow={false}
          rightElement={(
            <NumericStepper
              value={restSeconds}
              onChange={setDefaultRestSeconds}
              min={30}
              max={600}
              step={15}
              size="compact"
              label="default rest timer"
              decreaseLabel="Decrease Default rest timer"
              increaseLabel="Increase Default rest timer"
              valueLabel={`Default rest timer ${formatRestSeconds(restSeconds)}`}
              formatValue={formatRestSeconds}
            />
          )}
        />

        <SettingRow
          icon="play-outline"
          label="Auto-start rest timer"
          sub="Start the rest countdown automatically when you log a set."
          showArrow={false}
          rightElement={
            <Switch
              value={!!autoStartRestTimer}
              onValueChange={v => { haptics.selection(); setAutoStartRestTimer(v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={autoStartRestTimer ? t.colors.primary : t.colors.textMuted}
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
              onValueChange={v => { haptics.selection(); setRestEndAlertEnabled(v); }}
              trackColor={{ false: t.colors.surface3, true: withAlpha(t.colors.primary, 0.502) }}
              thumbColor={restEndAlertEnabled ? t.colors.primary : t.colors.textMuted}
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

const local = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xxs,
    gap: spacing.xxs,
    marginTop: spacing.sm,
  },
  segBtn: { flex: 1, minHeight: 44, paddingVertical: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segBtnActive: { backgroundColor: colors.primaryFill },
  segText: { ...type.label, color: colors.textSecondary },
  segTextActive: { color: colors.onPrimary, fontWeight: fontWeight.semibold },
});
