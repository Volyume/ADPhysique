import { StyleSheet } from 'react-native';
import { colors, spacing, radius, type } from '../styles/theme';
import TextField from './TextField';

// Shared age-in-years input. Extracted from NutritionTargetsScreen.js so
// the Pro nutrition-targets form and SettingsProfileScreen's free-tier
// date-of-birth correction path (CP-8, 2026-07-09 UX audit) use the exact
// same field. Age is how date of birth is captured/edited everywhere in the
// app today, there is no separate date picker: lib/profileAge.js converts
// age <-> a stored date-of-birth string (dateOfBirthFromAgeYears /
// ageYearsFromDateOfBirth).
export default function AgeYearsField({ value, onChangeText, onBlur }) {
  return (
    <TextField
      surface={colors.inputBg}
      fieldStyle={styles.numInputField}
      inputStyle={styles.numInput}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChangeText}
      onBlur={onBlur}
      placeholder="e.g. 28"
      keyboardType="number-pad"
      maxLength={3}
      accessibilityLabel="Age"
    />
  );
}

const styles = StyleSheet.create({
  numInputField: {
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    minWidth: 120,
  },
  numInput: {
    ...type.body,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
