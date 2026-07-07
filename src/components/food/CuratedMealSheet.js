import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius } from '../../styles/theme';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { CURATED_MEALS, mealItems } from '../../lib/food/curatedMeals';
import { getMealAdditions, ADDITIONS_INTRO, ADDITIONS_FOOTNOTE } from '../../lib/food/mealAdditions';

/**
 * CuratedMealSheet, "visit" a suggested curated meal before logging it
 * (founder 2026-06-30). Shows the meal's items + macros, then a few FREE flavour
 * additions with a short "why" so a novice learns the meal is a base they can
 * season and build on (a friend asked if he could add saffron to chicken & rice).
 * The additions are educational only, they are NOT logged, so the diary stays
 * honest; the single action logs the MEAL itself via onLog.
 *
 * Props:
 *   visible    show / hide
 *   meal       the suggested meal: { id, name, macros: { kcal, protein, carbs, fat } }
 *   logging    true while the meal is being written (disables the button)
 *   energyUnit 'kcal' | 'kj' display unit
 *   onLog      () => void   add the meal to the diary
 *   onClose    () => void
 */
export default function CuratedMealSheet({
  visible, meal, logging = false, energyUnit = 'kcal', onLog, onClose,
}) {
  // Resolve the meal's component items from its id (the ranked suggestion only
  // carries macros, not the item list). Additions fall back to a safe generic
  // set if the meal isn't explicitly authored.
  const def = meal ? CURATED_MEALS.find((x) => x.id === meal.id) : null;
  const items = def ? mealItems(def) : [];
  const additions = getMealAdditions(def || meal);
  const macros = meal?.macros || null;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Meal details">
      {meal ? (
        <>
          <Text style={styles.title}>{meal.name}</Text>
          {macros ? (
            <Text style={styles.subtitle}>
              {'Adds to your diary - '}
              {toEnergy(macros.kcal, energyUnit)} {energyUnitLabel(energyUnit)} - {Math.round(macros.protein)}g protein - {Math.round(macros.carbs)}g carbs - {Math.round(macros.fat)}g fat
            </Text>
          ) : null}

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {items.length ? (
              <View style={styles.section}>
                <SectionLabel>In this meal</SectionLabel>
                {items.map((it) => (
                  <View key={it.foodRef} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                    <Text style={styles.itemMeta}>
                      {Math.round(it.quantityG)}g | {toEnergy(it.kcal, energyUnit)} {energyUnitLabel(energyUnit)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.addHead}>
                <Ionicons name="leaf-outline" size={15} color={colors.primary} />
                <SectionLabel>Add to taste, all free</SectionLabel>
              </View>
              <Text style={styles.intro}>{ADDITIONS_INTRO}</Text>
              {additions.map((a) => (
                <View key={a.name} style={styles.addRow}>
                  <Text style={styles.addName}>{a.name}</Text>
                  <Text style={styles.addWhy}>{a.why}</Text>
                </View>
              ))}
              <Text style={styles.footnote}>{ADDITIONS_FOOTNOTE}</Text>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.cancelText}>Close</Text>
            </Pressable>
            <Pressable
              onPress={onLog}
              disabled={logging}
              style={({ pressed }) => [styles.logBtn, logging && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Add ${meal.name} to diary`}
            >
              {logging
                ? <ActivityIndicator color={colors.onPrimary} size="small" />
                : <Text style={styles.logText}>Add to diary</Text>}
            </Pressable>
          </View>
        </>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: -spacing.xs },
  scroll: { maxHeight: 360 },
  section: { gap: spacing.xs, paddingTop: spacing.sm },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  itemName: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
  itemMeta: { fontSize: fontSize.sm, color: colors.textMuted },
  addHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  intro: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: fontSize.sm + 5, marginBottom: spacing.xs },
  addRow: {
    paddingVertical: spacing.xs,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  addName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textPrimary },
  addWhy: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.hair },
  footnote: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm, lineHeight: fontSize.xs + 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  logBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  logText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
