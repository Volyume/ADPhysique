import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, type } from '../styles/theme';
import { SettingsPage, settingsStyles } from '../components/SettingsPrimitives';
import TextField from '../components/TextField';
import Chip from '../components/Chip';
import { appAlert } from '../components/AppAlert';
import { getUserBodyProfile, saveUserBodyProfile } from '../lib/database';
import { logError } from '../lib/errorLog';
import * as haptics from '../lib/haptics';

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
];

const SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

// Profile: the handful of things the user types or picks about themselves.
export default function SettingsProfileScreen() {
  const { user, userProfile, saveLocalProfile, setDietPreference } = useAppStore(
    useShallow(s => ({
      user: s.user,
      userProfile: s.userProfile,
      saveLocalProfile: s.saveLocalProfile,
      setDietPreference: s.setDietPreference,
    })),
  );
  const [editName, setEditName] = useState(userProfile?.firstName ?? '');
  const [diet, setDiet] = useState(userProfile?.dietPreference ?? 'omnivore');
  const [sex, setSex] = useState(userProfile?.sex ?? null);

  // Changing sex moves the ED calorie floor + BMR. Persist to BOTH the profile
  // (for sync via users_profile) and the body profile (the engine's source),
  // merging into the existing body-profile row so height/DOB are preserved
  // (saveUserBodyProfile writes the whole row). Targets are not recomputed here:
  // per founder direction the next weekly check-in picks up the new sex.
  async function changeSex(value) {
    if (!user?.id || (value !== 'male' && value !== 'female')) return;
    haptics.selection();
    const previous = sex;
    setSex(value);
    try {
      await saveLocalProfile(user.id, { ...(userProfile || {}), sex: value });
      const existing = await getUserBodyProfile(user.id).catch(() => null);
      await saveUserBodyProfile(user.id, { ...(existing || {}), sex: value });
    } catch (e) {
      setSex(previous);
      logError('SettingsProfile.changeSex', e, {});
    }
  }

  function requestSexChange(value) {
    if (value === sex) return;
    const label = SEX_OPTIONS.find((opt) => opt.value === value)?.label || value;
    appAlert(
      'Change biological sex?',
      `Set biological sex to ${label}. This affects BMR, calorie floors and future nutrition targets. Your current targets are not recalculated until the next weekly check-in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Update', onPress: () => changeSex(value) },
      ],
    );
  }

  return (
    <SettingsPage title="Profile">
      <View style={settingsStyles.section}>
        <View style={styles.nameRow}>
          <TextField
            containerStyle={styles.nameField}
            leading={<Ionicons name="person-outline" size={18} color={colors.primary} />}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your first name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            accessibilityLabel="Your first name"
            onBlur={async () => {
              const name = editName.trim();
              if (user?.id) {
                await saveLocalProfile(user.id, { ...(userProfile || {}), firstName: name || undefined });
              }
            }}
          />
        </View>
        {/* Gym weight units, body weight units, and bar weight rows
            removed at user request. UK defaults: gym + bar = kg;
            body weight units come from onboarding (the morning-weight
            setup screen). The store still holds these values; they
            just aren't user-editable from Settings any more. */}
        <View style={styles.dietBlock}>
          <View style={styles.dietHeader}>
            <View style={settingsStyles.settingIcon}>
              <Ionicons name="male-female-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={settingsStyles.settingLabel}>Biological sex</Text>
              <Text style={settingsStyles.settingSub}>Used for calorie floors and nutrition targets. Changes apply on your next weekly check-in.</Text>
            </View>
          </View>
          <View style={styles.dietChips}>
            {SEX_OPTIONS.map(opt => {
              const active = sex === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={active}
                  onPress={() => requestSexChange(opt.value)}
                  accessibilityRole="radio"
                  accessibilityLabel={`Biological sex ${opt.label}`}
                  style={styles.dietChip}
                  labelStyle={styles.dietChipText}
                />
              );
            })}
          </View>
        </View>
        <View style={styles.dietBlock}>
          <View style={styles.dietHeader}>
            <View style={settingsStyles.settingIcon}>
              <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={settingsStyles.settingLabel}>Diet preference</Text>
              <Text style={settingsStyles.settingSub}>Filters the meals Volyume suggests.</Text>
            </View>
          </View>
          <View style={styles.dietChips}>
            {DIET_OPTIONS.map(opt => {
              const active = diet === opt.value;
              return (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={active}
                  onPress={() => { haptics.selection(); setDiet(opt.value); setDietPreference(opt.value); }}
                  accessibilityRole="radio"
                  accessibilityLabel={`Diet preference ${opt.label}`}
                  style={styles.dietChip}
                  labelStyle={styles.dietChipText}
                />
              );
            })}
          </View>
        </View>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  nameField: { flex: 1 },
  dietBlock: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dietHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  dietChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dietChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    minHeight: 44,
  },
  dietChipText: {
    ...type.label,
    textAlign: 'center',
  },
});
