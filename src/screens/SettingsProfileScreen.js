import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../store/useAppStore';
import { colors, spacing, radius, type, fontWeight } from '../styles/theme';
import { SettingsPage, settingsStyles } from '../components/SettingsPrimitives';

const DIET_OPTIONS = [
  { value: 'omnivore', label: 'Omnivore' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
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

  return (
    <SettingsPage>
      <View style={settingsStyles.section}>
        <View style={styles.nameRow}>
          <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.nameIcon} />
          <TextInput
            style={styles.nameInput}
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
              <Ionicons name="nutrition-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={settingsStyles.settingLabel}>Diet preference</Text>
              <Text style={settingsStyles.settingSub}>This filters the meals we suggest</Text>
            </View>
          </View>
          <View style={styles.dietChips}>
            {DIET_OPTIONS.map(opt => {
              const active = diet === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.dietChip, active && styles.dietChipActive]}
                  onPress={() => { setDiet(opt.value); setDietPreference(opt.value); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.dietChipText, active && styles.dietChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
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
  nameIcon: { marginTop: 1 },
  nameInput: {
    ...type.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
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
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface2,
  },
  dietChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryBg,
  },
  dietChipText: {
    ...type.label,
    color: colors.textSecondary,
  },
  dietChipTextActive: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
});
