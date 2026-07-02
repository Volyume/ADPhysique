import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, Switch, TouchableOpacity } from 'react-native';
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
// Step target and cardio are Pro-only; cycle tracking shows for users
// whose body profile records a female sex.
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
  // Daily movement. stepsEnabled undefined means never opted out, so on.
  const [stepsEnabled, setStepsEnabled] = useState(userProfile?.stepsEnabled !== false);
  // Cardio available by default (undefined reads as on). Toggling off hides the
  // cardio surfaces; logged history is kept, just not shown.
  const [cardioEnabled, setCardioEnabled] = useState(userProfile?.cardioEnabled !== false);
  const [stepTargetInput, setStepTargetInput] = useState(String(userProfile?.stepsTarget ?? 8000));
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

  async function toggleStepTarget(value) {
    haptics.selection();
    setStepsEnabled(value);
    if (user?.id) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsEnabled: value });
    }
    // Turning steps on is the moment to ask for the health step permission, so
    // the foreground auto-read can populate daily_steps. Silent if declined:
    // the check-in then falls back to a manual average.
    if (value) {
      try {
        // eslint-disable-next-line global-require
        const { requestStepPermission } = require('../lib/activitySteps');
        requestStepPermission().catch(() => {});
      } catch (_) { /* activitySteps unavailable */ }
    }
  }

  // Save the typed target on blur. Clamp to a sane band and never let an
  // empty or junk value through; fall back to the current target or 8,000.
  async function saveStepTarget() {
    const parsed = Math.round(Number(stepTargetInput));
    const current = userProfile?.stepsTarget ?? 8000;
    const next = Number.isFinite(parsed) && parsed > 0
      ? Math.min(Math.max(parsed, 1000), 30000)
      : current;
    setStepTargetInput(String(next));
    if (user?.id && next !== current) {
      await saveLocalProfile(user.id, { ...(userProfile || {}), stepsTarget: next });
    }
  }

  useFocusEffect(
    useCallback(() => {
      getWellbeingMode().then(m => setCalmEnabled(m === 'calm'));
      getCycleTracking().then(setCycleEnabled).catch(() => {});
      if (user?.id) getUserBodyProfile(user.id).then(p => setBioSex(p?.sex ?? null)).catch(() => {});
    }, [user?.id]),
  );

  return (
    <SettingsPage>
      <View style={settingsStyles.section}>
        <SettingRow
          icon="heart-outline"
          label="Calmer experience"
          sub="This drops the aggressive calorie targets and quietens the progress prompts"
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
        {tier === 'pro' && (
          <>
            <SettingRow
              icon="footsteps-outline"
              label="Daily step target"
              sub={stepsEnabled
                ? "Steps are the coach's first lever when progress slows, before your food. Your phone fills the number in."
                : 'Off. The coach leans on your food, and later cardio, instead of steps.'}
              showArrow={false}
              rightElement={
                <Switch
                  value={stepsEnabled}
                  onValueChange={toggleStepTarget}
                  trackColor={{ false: colors.surface3, true: withAlpha(colors.primary, 0.502) }}
                  thumbColor={stepsEnabled ? colors.primary : colors.textMuted}
                />
              }
            />
            {stepsEnabled && (
              <View style={styles.stepTargetRow}>
                <Text style={styles.stepTargetLabel}>Steps a day</Text>
                <TextInput
                  style={styles.stepTargetInput}
                  value={stepTargetInput}
                  onChangeText={setStepTargetInput}
                  onBlur={saveStepTarget}
                  onSubmitEditing={saveStepTarget}
                  keyboardType="number-pad"
                  maxLength={5}
                  returnKeyType="done"
                  accessibilityLabel="Daily step target"
                />
              </View>
            )}
            <SettingRow
              icon="heart-outline"
              label="Cardio"
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
                      accessibilityRole="button"
                      accessibilityState={{ selected: sel }}
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
            sub="Adds an optional question to your weekly check-in so the coach can steady your targets around your period"
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
    minHeight: 40,
    justifyContent: 'center',
  },
  toneChipOn: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, alpha.tint) },
  toneChipText: { ...type.caption, color: colors.textSecondary },
  toneChipTextOn: { color: colors.primary },
  stepTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepTargetLabel: { ...type.body, color: colors.textSecondary },
  stepTargetInput: {
    minWidth: 88,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.textPrimary,
    ...type.body,
    textAlign: 'center',
  },
});
