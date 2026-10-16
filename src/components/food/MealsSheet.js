/**
 * MealsSheet: "Meals", opened from the Diary's Day tools sheet (D230 R11).
 * Meals are the person's: how many the diary shows, and what each is called.
 *
 *  - Meals per day is the existing synced pref `@volyume_meals_per_day`
 *    (sync.js generic pref list), the same key NutritionTargetsScreen writes
 *    and DiaryScreen and FoodSearchScreen read, on the house Stepper with
 *    NutritionTargetsScreen's own bounds (3 to 8) and its label, "Diary meals
 *    per day" (NutritionTargetsScreen.mealsPerDayLabel.guard.test.js).
 *  - A name per visible meal goes through the existing `setMealLabel`
 *    (src/lib/food/mealSlots.js; synced as `@volyume_meal_labels`), which
 *    trims and caps it at 24 characters; an empty name removes the override
 *    and the meal reads "Meal N" again. A name is saved when its field loses
 *    focus or is submitted, and any unsaved edit is saved when the sheet
 *    closes.
 *
 * The title and the "Meal names" section title are headings (D230 R16).
 * Nothing here explains itself in standing prose (D230 R3): the field's
 * placeholder shows the name an empty field gives back.
 */
import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Text from '../Text';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import Stepper from '../Stepper';
import TextField from '../TextField';
import Button from '../Button';
import { defaultMealSlotLabel, getMealLabelOverrides, setMealLabel } from '../../lib/food/mealSlots';
import { logError } from '../../lib/errorLog';
import { colors, spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';

// NutritionTargetsScreen's bounds for the same pref (its chip row offers 3..8).
export const MEALS_PER_DAY_MIN = 3;
export const MEALS_PER_DAY_MAX = 8;
export const MEAL_NAME_MAX_LENGTH = 24;

export default function MealsSheet({
  visible, onClose, mealsPerDay, onChangeMealsPerDay, slots = [], onLabelsChanged,
}) {
  const t = useTheme();
  const live = buildLiveStyles(t);
  const [drafts, setDrafts] = useState({});
  const wasVisibleRef = useRef(false);
  const keysSig = slots.map((s) => s.key).join('|');

  // Seed each field from the saved names: afresh every time the sheet opens,
  // and, while it is open, only for a meal that has just appeared (a higher
  // meals-per-day), so a name being typed is never overwritten.
  useEffect(() => {
    const justOpened = visible && !wasVisibleRef.current;
    wasVisibleRef.current = !!visible;
    if (!visible) return;
    const saved = getMealLabelOverrides();
    setDrafts((prev) => {
      const next = {};
      for (const key of keysSig ? keysSig.split('|') : []) {
        next[key] = (!justOpened && prev[key] !== undefined) ? prev[key] : (saved[key] ?? '');
      }
      return next;
    });
  }, [visible, keysSig]);

  const value = Math.max(MEALS_PER_DAY_MIN, Math.min(MEALS_PER_DAY_MAX, Number(mealsPerDay) || MEALS_PER_DAY_MIN));

  function changeMealsPerDay(n) {
    AsyncStorage.setItem('@volyume_meals_per_day', String(n)).catch(() => {}); // best effort, as NutritionTargetsScreen
    onChangeMealsPerDay?.(n);
  }

  async function commit(key) {
    const draft = String(drafts[key] ?? '').trim().slice(0, MEAL_NAME_MAX_LENGTH);
    const saved = getMealLabelOverrides()[key] ?? '';
    if (draft === saved) return false;
    try {
      await setMealLabel(key, draft);
      return true;
    } catch (e) {
      logError('MealsSheet.setMealLabel', e, { slotKey: key });
      return false;
    }
  }

  async function commitOne(key) {
    if (await commit(key)) onLabelsChanged?.();
  }

  async function close() {
    const results = await Promise.all(slots.map((s) => commit(s.key)));
    if (results.some(Boolean)) onLabelsChanged?.();
    onClose?.();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={close}
      scroll
      keyboardAvoiding
      accessibilityLabel="Meals"
    >
      <SectionLabel heading style={styles.title}>Meals</SectionLabel>
      <View style={styles.countRow}>
        <Text style={[styles.countLabel, live.countLabel]}>Diary meals per day</Text>
        <Stepper
          value={value}
          onChange={changeMealsPerDay}
          min={MEALS_PER_DAY_MIN}
          max={MEALS_PER_DAY_MAX}
          step={1}
          label="Diary meals per day"
          decreaseLabel="One fewer meal per day"
          increaseLabel="One more meal per day"
        />
      </View>
      <SectionLabel heading style={styles.title}>Meal names</SectionLabel>
      {slots.map((s) => {
        const fallback = defaultMealSlotLabel(s.key);
        return (
          <TextField
            key={s.key}
            label={fallback}
            value={drafts[s.key] ?? ''}
            onChangeText={(text) => setDrafts((prev) => ({ ...prev, [s.key]: text }))}
            onBlur={() => { commitOne(s.key); }}
            onSubmitEditing={() => { commitOne(s.key); }}
            placeholder={fallback}
            maxLength={MEAL_NAME_MAX_LENGTH}
            returnKeyType="done"
            size="sm"
            accessibilityLabel={`Name for ${fallback}`}
          />
        );
      })}
      <Button
        title="Done"
        variant="secondary"
        onPress={close}
        accessibilityLabel="Done, save the meal names"
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    paddingHorizontal: spacing.sm, paddingTop: spacing.xs, paddingBottom: spacing.xs,
  },
  countRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.sm,
  },
  countLabel: { ...type.bodyStrong, color: colors.textPrimary, flexShrink: 1 },
});

// The tree's frozen-plus-live pattern: colour- and type-bearing keys only.
function buildLiveStyles(t) {
  return {
    countLabel: { ...t.type.bodyStrong, color: t.colors.textPrimary },
  };
}
