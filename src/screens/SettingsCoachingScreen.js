import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius, type, withAlpha, alpha } from '../styles/theme';
import * as haptics from '../lib/haptics';
import { getUserBodyProfile } from '../lib/database';
import { getWellbeingMode, setWellbeingMode } from '../lib/wellbeing';
import { getCycleTracking, setCycleTracking } from '../lib/cyclePrefs';
import { SettingsPage, SettingRow, settingsStyles } from '../components/SettingsPrimitives';

// Coaching: the levers that shape what the coach asks for and adjusts.
// Cardio is Pro-only; cycle tracking shows for users whose body profile
// records a female sex.
export default function SettingsCoachingScreen() {
  const { user, userProfile, saveLocalProfile, tier } = useAppStore(
    useShallow(s => ({
      user: s.user,
      userProfile: s.userProfile,
      saveLocalProfile: s.saveLocalProfile,
      tier: s.tier,
    })),
  );

  const [calmEnabled, setCalmEnabled] = useState(false);
  const [cycleEnabled, setCycleEnabled] = useState(false);
  // Cardio available by default (undefined reads as on). Toggling off hides the
  // cardio surfaces; logged history is kept, just not shown.
  const [cardioEnabled, setCardioEnabled] = useState(userProfile?.cardioEnabled !== false);
  const [bioSex, setBioSex] = useState(null);
  // C1/C2 (founder decision #2): coaching tone register + the opt-in science
  // layer. Both are LOCAL-ONLY profile fields (no synced column; the pull
  // merge in sync/tables/profiles.js spreads local first, so they survive).
  const [coachTone, setCoachToneState] = useState(userProfile?.coachTone ?? 'automatic');
  const [showScience, setShowScience] = useState(userProfile?.showScience === true);

  async function setTone(next) {
    haptics.selection();
    setCoachToneState(next);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), coachTone: next });
    }
  }

  async function toggleScience(value) {
    haptics.selection();
    setShowScience(value);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), showScience: value });
    }
  }

  async function toggleCalmMode(value) {
    haptics.selection();
    const mode = value ? 'calm' : 'normal';
    await setWellbeingMode(mode);
    setCalmEnabled(value);
  }

  async function toggleCycleTracking(value) {
    haptics.selection();
    await setCycleTracking(value);
    setCycleEnabled(value);
  }

  // D2 (founder decision 2026-07-03, Option A): the readiness ask before each
  // session. ON asks; OFF starts sessions immediately with no readiness
  // signal, so session adjustments never fire (absent input is never filled
  // in). Stored inverted ('@volyume_intent_prompt_off') because asking is the
  // default.
  const [readinessAsk, setReadinessAsk] = useState(true);
  async function toggleReadinessAsk(value) {
    haptics.selection();
    setReadinessAsk(value);
    try {
      if (value) await AsyncStorage.removeItem('@volyume_intent_prompt_off');
      else await AsyncStorage.setItem('@volyume_intent_prompt_off', 'true');
    } catch (_) { /* the Home start path re-reads each session */ }
  }

  useFocusEffect(
    useCallback(() => {
      getWellbeingMode().then(m => setCalmEnabled(m === 'calm'));
      getCycleTracking().then(setCycleEnabled).catch(() => {});
      AsyncStorage.getItem('@volyume_intent_prompt_off')
        .then(v => setReadinessAsk(v !== 'true')).catch(() => {});
      if (user?.id) getUserBodyProfile(user.id).then(p => setBioSex(p?.sex ?? null)).catch(() => {});
    }, [user?.id]),
  );

  return (
    <SettingsPage title="Coaching">
      <View style={settingsStyles.section}>
        <SettingRow
          icon="heart-outline"
          label="Calmer coaching"
          sub="Uses safer calorie floors and quieter progress prompts."
          showArrow={false}
          rightElement={
            <Switch
              value={calmEnabled}
              onValueChange={toggleCalmMode}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={calmEnabled ? colors.primary : colors.textMuted}
            />
          }
        />
        <SettingRow
          icon="pulse-outline"
          label="Session readiness check"
          sub={readinessAsk
            ? 'Asks how you are feeling before each session, so sessions can adjust to it.'
            : 'Off. Sessions start straight away and are never adjusted to how you are feeling.'}
          showArrow={false}
          rightElement={
            <Switch
              value={readinessAsk}
              onValueChange={toggleReadinessAsk}
              trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
              thumbColor={readinessAsk ? colors.primary : colors.textMuted}
            />
          }
        />
        {tier === 'pro' && (
          <>
            <SettingRow
              icon="heart-outline"
              label="Cardio logging"
              sub={cardioEnabled
                ? 'On. Log any cardio you do, your choice of activity. The coach only suggests cardio if a cut stalls.'
                : 'Off. No cardio logging or library.'}
              showArrow={false}
              rightElement={
                <Switch
                  value={cardioEnabled}
                  onValueChange={async (next) => {
                    setCardioEnabled(next);
                    if (user?.id) await saveLocalProfile(user.id, { ...(userProfile || {}), cardioEnabled: next });
                  }}
                  trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                  thumbColor={cardioEnabled ? colors.primary : colors.textMuted}
                />
              }
            />
            {/* C1: coaching tone register. Same facts, same decisions, same
                honesty rules in every tone; only the prose shape changes.
                Safety copy is identical whatever is chosen. */}
            <View style={styles.toneBlock}>
              <Text style={styles.toneLabel}>Coaching tone</Text>
              <Text style={styles.toneSub}>
                {coachTone === 'supportive'
                  ? 'Plainer wording with a little more explanation.'
                  : coachTone === 'precise'
                    ? 'Terser. Numbers first, no padding.'
                    : 'The coach matches its wording to your training experience.'}
              </Text>
              <View style={styles.toneChips}>
                {[
                  { key: 'automatic', label: 'Automatic' },
                  { key: 'supportive', label: 'Supportive' },
                  { key: 'precise', label: 'Precise' },
                ].map(({ key, label }) => {
                  const sel = coachTone === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.toneChip, sel && styles.toneChipOn]}
                      onPress={() => setTone(key)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: sel }}
                      accessibilityLabel={`Coaching tone ${label}`}
                    >
                      <Text style={[styles.toneChipText, sel && styles.toneChipTextOn]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            {/* C2: the opt-in science layer. Off by default; everything stays
                plain English. On adds the technical term in brackets after the
                plain one on the coach's explanation surfaces. */}
            <SettingRow
              icon="flask-outline"
              label="Show the science"
              sub={showScience
                ? 'On. Technical terms appear in brackets after the plain ones on coaching explanations.'
                : 'Off. Everything stays in plain English.'}
              showArrow={false}
              rightElement={
                <Switch
                  value={showScience}
                  onValueChange={toggleScience}
                  trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                  thumbColor={showScience ? colors.primary : colors.textMuted}
                />
              }
            />
          </>
        )}
        {bioSex === 'female' && (
          <SettingRow
            icon="calendar-outline"
            label="Cycle tracking"
            sub="Adds an optional weekly check-in question so the coach can steady targets around your period."
            showArrow={false}
            rightElement={
              <Switch
                value={cycleEnabled}
                onValueChange={toggleCycleTracking}
                trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                thumbColor={cycleEnabled ? colors.primary : colors.textMuted}
              />
            }
          />
        )}
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  // C1 coaching tone selector
  toneBlock: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  toneLabel: { ...type.body, color: colors.textPrimary },
  toneSub: { ...type.caption, color: colors.textMuted },
  toneChips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  toneChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  toneChipOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, alpha.tint) },
  toneChipText: { ...type.caption, color: colors.textSecondary },
  toneChipTextOn: { color: colors.primary },
});
