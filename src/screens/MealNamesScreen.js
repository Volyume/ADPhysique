import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, type } from '../styles/theme';
import useTheme from '../hooks/useTheme';
import BackHeader from '../components/BackHeader';
import TextField from '../components/TextField';
import { settingsStyles as styles, useSettingsStyles } from '../components/SettingsPrimitives';
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
  // CP-10 stage 3: live theme (src/hooks/useTheme.js). `live` is the shared
  // settingsStyles override (SettingsPrimitives.js); `liveText` covers this
  // screen's own colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    intro: { ...t.type.bodySm, color: t.colors.textMuted },
    default: { ...t.type.body, color: t.colors.textSecondary },
  };

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
    <SafeAreaView style={[styles.safe, live.safe]} edges={['top', 'bottom']}>
      <BackHeader title="Meal names" />
      {/* L03-C5 (2026-07-09 design audit): standardise on the app's
          KeyboardAvoidingView pattern for consistency, no fixed footer was
          found below this scroll. */}
      <KeyboardAvoidingView style={local.keyboardAvoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, live.section]}>
          <Text maxFontSizeMultiplier={1.3} style={[local.intro, liveText.intro]}>
            Rename your meals to whatever you call them. Leave a box blank to use the default. This changes the
            label only. Your logged food and plan stay the same.
          </Text>
          {slots.map((key) => (
            <View key={key} style={local.row}>
              <Text maxFontSizeMultiplier={1.3} style={[local.default, liveText.default]} numberOfLines={1}>{defaultMealSlotLabel(key)}</Text>
              <TextField
                containerStyle={local.input}
                value={values[key] ?? ''}
                onChangeText={(txt) => onChange(key, txt)}
                onBlur={() => onCommit(key)}
                onSubmitEditing={() => onCommit(key)}
                placeholder={defaultMealSlotLabel(key)}
                placeholderTextColor={t.colors.textMuted}
                maxLength={24}
                returnKeyType="done"
                accessibilityLabel={`Custom name for ${defaultMealSlotLabel(key)}`}
              />
            </View>
          ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  keyboardAvoid: { flex: 1 },
  intro: { ...type.bodySm, color: colors.textMuted, marginBottom: spacing.md },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: spacing.md, paddingVertical: spacing.xs,
  },
  default: { ...type.body, color: colors.textSecondary, width: 110 },
  input: { flex: 1 },
});
