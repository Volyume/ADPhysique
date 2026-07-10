import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, fontSize, fontWeight, spacing, radius, type } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import SectionLabel from '../SectionLabel';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { CURATED_MEALS, mealItems } from '../../lib/food/curatedMeals';
import { getMealAdditions, filterAdditionsForProfile, ADDITIONS_INTRO, ADDITIONS_FOOTNOTE } from '../../lib/food/mealAdditions';
import useAppStore from '../../store/useAppStore';
import * as haptics from '../../lib/haptics';

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
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  // Resolve the meal's component items from its id (the ranked suggestion only
  // carries macros, not the item list). Additions fall back to a safe generic
  // set if the meal isn't explicitly authored.
  const def = meal ? CURATED_MEALS.find((x) => x.id === meal.id) : null;
  const items = def ? mealItems(def) : [];
  // R1 safety fix (2026-07-10): additions carrying an FSA allergen the user
  // excluded in Settings > Dietary needs are silently omitted. Read from the
  // store here (not a prop) so no caller of this sheet can forget to filter.
  const userProfile = useAppStore((s) => s.userProfile);
  const additions = filterAdditionsForProfile(getMealAdditions(def || meal), userProfile);
  const macros = meal?.macros || null;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Meal details">
      {meal ? (
        <>
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]}>{meal.name}</Text>
          {macros ? (
            <Text maxFontSizeMultiplier={1.3} style={[styles.subtitle, live.subtitle]}>
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
                    <Text maxFontSizeMultiplier={1.3} style={[styles.itemName, live.itemName]} numberOfLines={1}>{it.name}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.itemMeta, live.itemMeta]}>
                      {Math.round(it.quantityG)}g | {toEnergy(it.kcal, energyUnit)} {energyUnitLabel(energyUnit)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* When every addition is filtered out by the user's allergen
                excludes, the whole block renders nothing, no "hidden because"
                copy (the user asked never to see that allergen). */}
            {additions.length ? (
              <View style={styles.section}>
                <View style={styles.addHead}>
                  <Ionicons name="leaf-outline" size={15} color={t.colors.primary} />
                  <SectionLabel>Optional extras</SectionLabel>
                </View>
                <Text maxFontSizeMultiplier={1.3} style={[styles.intro, live.intro]}>{ADDITIONS_INTRO}</Text>
                {additions.map((a) => (
                  <View key={a.name} style={[styles.addRow, live.addRow]}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.addName, live.addName]}>{a.name}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.addWhy, live.addWhy]}>{a.why}</Text>
                  </View>
                ))}
                <Text maxFontSizeMultiplier={1.3} style={[styles.footnote, live.footnote]}>{ADDITIONS_FOOTNOTE}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              onPress={() => { haptics.selection(); onClose?.(); }}
              style={({ pressed }) => [styles.cancelBtn, live.cancelBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text maxFontSizeMultiplier={1.3} style={[styles.cancelText, live.cancelText]}>Close</Text>
            </Pressable>
            {/* Haptics completion pass (2026-07-10): "Add to diary" is a direct
                food-logging write, excluded per the campaign's diary-marking
                rule -- left without an added haptic. */}
            <Pressable
              onPress={onLog}
              disabled={logging}
              style={({ pressed }) => [styles.logBtn, live.logBtn, logging && { opacity: 0.5 }, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Add ${meal.name} to diary`}
            >
              {logging
                ? <ActivityIndicator color={t.colors.onPrimary} size="small" />
                : <Text maxFontSizeMultiplier={1.3} style={[styles.logText, live.logText]}>Add to diary</Text>}
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
  footnote: { ...type.caption, color: colors.textMuted, marginTop: spacing.sm },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  cancelText: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  logBtn: {
    flex: 1, paddingVertical: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.primaryFill, alignItems: 'center',
  },
  logText: { color: colors.onPrimary, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. scroll/section/itemRow/addHead/
// actions have no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    itemName: { color: t.colors.textPrimary },
    itemMeta: { color: t.colors.textMuted },
    intro: { color: t.colors.textSecondary },
    addRow: { borderTopColor: t.colors.border },
    addName: { color: t.colors.textPrimary },
    addWhy: { color: t.colors.textSecondary },
    footnote: { color: t.colors.textMuted },
    cancelBtn: { borderColor: t.colors.border },
    cancelText: { color: t.colors.textSecondary },
    logBtn: { backgroundColor: t.colors.primaryFill },
    logText: { color: t.colors.onPrimary },
  };
}
