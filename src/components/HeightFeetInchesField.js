import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius, type } from '../styles/theme';
import TextField from './TextField';

// Shared feet+inches height input pair. Extracted from
// NutritionTargetsScreen.js (the only place height was editable before
// CP-8, 2026-07-09 UX audit, docs/design-usability-audit-2026-07-09/
// coverage-06-competitive-hps.md) so the Pro nutrition-targets form and the
// free-tier "Profile" personal-details fields in SettingsProfileScreen.js
// share the exact same field: same inputs, same placeholders, same
// validation feel. Neither surface duplicates the markup, so they can
// never silently drift apart.
//
// onBlurFeet/onBlurInches are optional: NutritionTargetsScreen doesn't use
// them (its Calculate button reads the values instead), SettingsProfileScreen
// passes a save-on-blur handler.
export default function HeightFeetInchesField({
  feet, onChangeFeet, onBlurFeet,
  inches, onChangeInches, onBlurInches,
}) {
  return (
    <View style={styles.heightRow}>
      <View style={styles.heightUnit}>
        <TextField
          surface={colors.inputBg}
          fieldStyle={styles.numInputField}
          inputStyle={styles.numInput}
          placeholderTextColor={colors.textMuted}
          value={feet}
          onChangeText={onChangeFeet}
          onBlur={onBlurFeet}
          placeholder="5"
          keyboardType="number-pad"
          maxLength={1}
          accessibilityLabel="Height, feet"
        />
        <Text style={styles.unitLabel}>ft</Text>
      </View>
      <View style={styles.heightUnit}>
        <TextField
          surface={colors.inputBg}
          fieldStyle={styles.numInputField}
          inputStyle={styles.numInput}
          placeholderTextColor={colors.textMuted}
          value={inches}
          onChangeText={onChangeInches}
          onBlur={onBlurInches}
          placeholder="10"
          keyboardType="decimal-pad"
          maxLength={4}
          accessibilityLabel="Height, inches"
        />
        <Text style={styles.unitLabel}>in</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heightRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  heightUnit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
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
  unitLabel: {
    ...type.bodyStrong,
    color: colors.textSecondary,
  },
});
