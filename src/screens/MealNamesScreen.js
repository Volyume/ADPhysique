import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, radius, fontSize, fontWeight, type } from '../styles/theme';
import { SettingsPage, settingsStyles as styles } from '../components/SettingsPrimitives';
import {
  DEFAULT_MEALS_PER_DAY, defaultMealSlotLabel, getMealLabelOverrides, setMealLabel,
} from '../lib/food/mealSlots';

// Custom meal names (gap #1). Rename the numbered meals + the peri-workout meals
// to whatever the user calls them ("Breakfast", "Pre-bed", "Intra"). Slot KEYS
// never change, so logged food and the coaching plan are untouched; only the
// label the user sees changes. Device-local + cosmetic. Leaving a field blank
// restores the default label.
const PERI_SLOTS = ['preworkout', 'postworkout'];

export default function MealNamesScreen() {
  const [slots, setSlots] = useState([]);
  const [values, setValues] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      let mealsPerDay = DEFAULT_MEALS_PER_DAY;
      try {
        const raw = await AsyncStorage.getItem('@volyume_meals_per_day');
        const n = parseInt(raw, 10);
        if (n >= 3 && n <= 8) mealsPerDay = n;
      } catch (_) { /* default */ }
      if (!active) return;
      const keys = [];
      for (let i = 1; i <= mealsPerDay; i += 1) keys.push(`meal_${i}`);
      keys.push(...PERI_SLOTS);
      setSlots(keys);
      setValues({ ...getMealLabelOverrides() });
    })();
    return () => { active = false; };
  }, []);

  function onChange(key, text) {
    setValues((v) => ({ ...v, [key]: text }));
  }
  function onCommit(key) {
    // Persist on blur so we are not writing on every keystroke. An empty value
    // clears the override (back to the default label).
    setMealLabel(key, (values[key] ?? '').trim());
  }

  return (
    <SettingsPage>
      <View style={styles.section}>
        <Text style={local.intro}>
          Rename your meals to whatever you call them. Leave a box blank to use the default. This changes the
          label only. Your logged food and plan stay the same.
        </Text>
        {slots.map((key) => (
          <View key={key} style={local.row}>
            <Text style={local.default} numberOfLines={1}>{defaultMealSlotLabel(key)}</Text>
            <TextInput
              style={local.input}
              value={values[key] ?? ''}
              onChangeText={(t) => onChange(key, t)}
              onBlur={() => onCommit(key)}
              onSubmitEditing={() => onCommit(key)}
              placeholder={defaultMealSlotLabel(key)}
              placeholderTextColor={colors.textMuted}
              maxLength={24}
              returnKeyType="done"
              accessibilityLabel={`Custom name for ${defaultMealSlotLabel(key)}`}
            />
          </View>
        ))}
      </View>
    </SettingsPage>
  );
}

const local = StyleSheet.create({
  intro: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md, paddingVertical: spacing.xs,
  },
  default: { ...type.body, color: colors.textSecondary, width: 110 },
  input: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    color: colors.textPrimary, fontSize: fontSize.md, fontWeight: fontWeight.medium,
  },
});
