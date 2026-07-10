import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useShallow } from 'zustand/react/shallow';
import useAppStore from '../../store/useAppStore';
import { colors, spacing, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import { settingsStyles, useSettingsStyles } from '../SettingsPrimitives';
import Chip from '../Chip';
import { DIETS } from '../../lib/food/curatedMeals';
import { ALLERGENS } from '../../lib/food/foodRoles';
import { CURATED_FOODS } from '../../lib/food/curatedFoods';
import * as haptics from '../../lib/haptics';

const DIET_LABELS = {
  omnivore: 'Omnivore',
  pescatarian: 'Pescatarian',
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
};

const DIET_OPTIONS = DIETS.map((value) => ({ value, label: DIET_LABELS[value] || value }));

// A longer avoid list narrows what the meal engine can suggest from; this is
// a quiet nudge, not a limit (founder decision 2026-07-09: tier-blind, no
// cap, never mentions weight or calories).
const AVOID_LIST_NUDGE_THRESHOLD = 15;

// Dietary needs: diet preference, the FSA-14 allergen excludes, and the list
// of individual foods a user has flagged from a meal plan.
//
// Extracted out of SettingsDietaryScreen (founder ask 2026-07-10: the meal
// builder's "meal preferences" must offer this SAME selection inline, not
// just a link to Settings) so there is exactly one implementation of the
// selection UI, reading and writing the exact same store fields/actions from
// both call sites (SettingsDietaryScreen and MealPlanScreen's inline
// dietary sheet) -- one source of truth, no duplicated state, no second
// store. This component owns only the selection content; the page chrome
// (BackHeader / sheet title) stays with whichever screen renders it.
export default function DietaryPreferencesEditor() {
  const {
    userProfile, setDietPreference, setAllergenExcludes, removeMealPlanExcludedFood,
  } = useAppStore(
    useShallow(s => ({
      userProfile: s.userProfile,
      setDietPreference: s.setDietPreference,
      setAllergenExcludes: s.setAllergenExcludes,
      removeMealPlanExcludedFood: s.removeMealPlanExcludedFood,
    })),
  );

  const [diet, setDiet] = useState(userProfile?.dietPreference ?? 'omnivore');
  // CP-10 stage 3: live theme (src/hooks/useTheme.js). `live` is the shared
  // settingsStyles override (SettingsPrimitives.js); `liveText` covers this
  // component's OWN colour/type-bearing style keys the same way.
  const t = useTheme();
  const live = useSettingsStyles();
  const liveText = {
    block: { borderBottomColor: t.colors.border },
    chipText: { ...t.type.label },
    caption: { ...t.type.caption, color: t.colors.textMuted },
    emptyRow: { ...t.type.body, color: t.colors.textMuted },
    foodName: { ...t.type.body, color: t.colors.textPrimary },
    removeChipText: { ...t.type.label, color: t.colors.error },
  };

  const excludedTags = Array.isArray(userProfile?.mealPlanExcludeTags)
    ? userProfile.mealPlanExcludeTags : [];
  const excludedFoods = Array.isArray(userProfile?.mealPlanExcludeFoods)
    ? userProfile.mealPlanExcludeFoods : [];

  function toggleAllergen(tag) {
    haptics.selection();
    const isSelected = excludedTags.includes(tag);
    const next = isSelected
      ? excludedTags.filter((tt) => tt !== tag)
      : [...excludedTags, tag];
    setAllergenExcludes(next);
  }

  function removeFood(foodKey) {
    haptics.commit();
    removeMealPlanExcludedFood(foodKey);
  }

  return (
    <View style={[settingsStyles.section, live.section]}>
      <View style={[styles.block, liveText.block]}>
        <View style={styles.blockHeader}>
          <View style={[settingsStyles.settingIcon, live.settingIcon]}>
            <Ionicons name="nutrition-outline" size={18} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={1.3} style={[settingsStyles.settingLabel, live.settingLabel]}>Diet</Text>
            <Text maxFontSizeMultiplier={1.3} style={[settingsStyles.settingSub, live.settingSub]}>Filters the meals Volyume suggests and the plans it builds.</Text>
          </View>
        </View>
        <View style={styles.chipGrid}>
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
                style={styles.gridChip}
                labelStyle={[styles.chipText, liveText.chipText]}
              />
            );
          })}
        </View>
      </View>

      <View style={[styles.block, liveText.block]}>
        <View style={styles.blockHeader}>
          <View style={[settingsStyles.settingIcon, live.settingIcon]}>
            <Ionicons name="warning-outline" size={18} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={1.3} style={[settingsStyles.settingLabel, live.settingLabel]}>Allergens to avoid</Text>
            <Text maxFontSizeMultiplier={1.3} style={[settingsStyles.settingSub, live.settingSub]}>Meals and plan suggestions leave these out.</Text>
          </View>
        </View>
        <View style={styles.chipGrid}>
          {ALLERGENS.map(({ tag, label }) => {
            const checked = excludedTags.includes(tag);
            return (
              <Chip
                key={tag}
                label={label}
                selected={checked}
                onPress={() => toggleAllergen(tag)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={label}
                style={styles.gridChip}
                labelStyle={[styles.chipText, liveText.chipText]}
              />
            );
          })}
        </View>
        <Text maxFontSizeMultiplier={1.3} style={[styles.caption, liveText.caption]}>
          Volyume filters the foods and meals it knows about. Packaged food data can be incomplete, so always check the label.
        </Text>
      </View>

      <View style={[styles.block, liveText.block, styles.lastBlock]}>
        <View style={styles.blockHeader}>
          <View style={[settingsStyles.settingIcon, live.settingIcon]}>
            <Ionicons name="close-circle-outline" size={18} color={t.colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text maxFontSizeMultiplier={1.3} style={[settingsStyles.settingLabel, live.settingLabel]}>Foods you avoid</Text>
            <Text maxFontSizeMultiplier={1.3} style={[settingsStyles.settingSub, live.settingSub]}>Individual foods you have flagged from a meal plan.</Text>
          </View>
        </View>
        {excludedFoods.length > AVOID_LIST_NUDGE_THRESHOLD ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.caption, liveText.caption]}>
            A longer avoid list narrows what Volyume can suggest. Keep it to foods you really won't eat.
          </Text>
        ) : null}
        {excludedFoods.length === 0 ? (
          <Text maxFontSizeMultiplier={1.3} style={[styles.emptyRow, liveText.emptyRow]}>Nothing on your avoid list. You can flag a food from any meal plan.</Text>
        ) : (
          excludedFoods.map((foodKey) => {
            const name = CURATED_FOODS[foodKey]?.name ?? foodKey;
            return (
              <View key={foodKey} style={styles.foodRow}>
                <Text maxFontSizeMultiplier={1.3} style={[styles.foodName, liveText.foodName]}>{name}</Text>
                <Chip
                  label="Remove"
                  onPress={() => removeFood(foodKey)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${name} from your avoid list`}
                  style={styles.removeChip}
                  labelStyle={[styles.removeChipText, liveText.removeChipText]}
                />
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lastBlock: {
    borderBottomWidth: 0,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridChip: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  chipText: {
    ...type.label,
    textAlign: 'center',
  },
  caption: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  emptyRow: {
    ...type.body,
    color: colors.textMuted,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 44,
  },
  foodName: {
    ...type.body,
    color: colors.textPrimary,
    flex: 1,
  },
  removeChip: {
    minHeight: 44,
    justifyContent: 'center',
  },
  removeChipText: {
    ...type.label,
    color: colors.error,
  },
});
