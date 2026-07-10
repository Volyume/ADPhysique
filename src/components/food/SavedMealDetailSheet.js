import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import SectionLabel from '../SectionLabel';
import { toEnergy, energyUnitLabel } from '../../lib/format';

/**
 * SavedMealDetailSheet — L05-MM1 (design audit 2026-07-09, decision D6).
 *
 * A saved meal used to be a "black box": tap to log, or rename/delete, with
 * no way to see what is actually in it first. D6 approved a LIGHTWEIGHT
 * READ-ONLY inspect sheet, not a full edit flow, opened from an explicit
 * "View" affordance on the MyMealsScreen row. Tapping the row itself still
 * logs immediately (C6, unchanged); this sheet never writes anything, never
 * lets an item be added/removed/edited, and never changes how logging works.
 *
 * Values rendered here come straight off the already-loaded list item
 * (listSavedMeals already parses items + computeSavedMealTotals for the row
 * meta line), so opening this sheet needs no extra read.
 *
 * Adherence-neutral (CLAUDE.md ED-safety): plain numbers, no colour-coded
 * good/bad framing, no target comparison, matching CuratedMealSheet's
 * existing treatment of a meal's component items.
 *
 * Props:
 *   visible    show / hide
 *   meal       { name, items?: [{ foodRef, name, quantityG, kcal, proteinG, carbsG, fatG }], totals: { kcal, protein, carbs, fat }, itemCount }
 *   energyUnit 'kcal' | 'kj' display unit
 *   onClose    () => void
 */
export default function SavedMealDetailSheet({ visible, meal, energyUnit = 'kcal', onClose }) {
  // CP-10 theming batch (component sweep, 2026-07-10): live theme.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const items = Array.isArray(meal?.items) ? meal.items : [];
  const totals = meal?.totals;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={meal ? `${meal.name} details` : 'Meal details'}>
      {meal ? (
        <>
          <Text maxFontSizeMultiplier={1.3} style={[styles.title, live.title]} numberOfLines={2}>{meal.name}</Text>
          {totals ? (
            <Text maxFontSizeMultiplier={1.3} style={[styles.subtitle, live.subtitle]}>
              Total - {toEnergy(totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)} | {totals.protein}g protein | {totals.carbs}g carbs | {totals.fat}g fat
            </Text>
          ) : null}

          {items.length ? (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <SectionLabel>In this meal</SectionLabel>
                {items.map((it, i) => (
                  <View key={it.foodRef ? `${it.foodRef}-${i}` : i} style={styles.itemRow}>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.itemName, live.itemName]} numberOfLines={1}>{it.name ?? 'Food'}</Text>
                    <Text maxFontSizeMultiplier={1.3} style={[styles.itemMeta, live.itemMeta]}>
                      {Math.round(it.quantityG ?? 0)}g | {toEnergy(it.kcal ?? 0, energyUnit)} {energyUnitLabel(energyUnit)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text maxFontSizeMultiplier={1.3} style={[styles.emptyNote, live.emptyNote]}>No food-by-food detail is stored for this meal.</Text>
          )}

          <View style={styles.actions}>
            <Button title="Close" variant="secondary" onPress={onClose} fullWidth={false} />
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
  emptyNote: { fontSize: fontSize.sm, color: colors.textMuted, paddingTop: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
});

// CP-10 theming batch (component sweep, 2026-07-10): live override for the
// frozen `styles` block above, same "frozen base + live override" pattern as
// BillingPeriodSelector.js's buildLiveStyles. scroll/section/itemRow/actions
// have no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    itemName: { color: t.colors.textPrimary },
    itemMeta: { color: t.colors.textMuted },
    emptyNote: { color: t.colors.textMuted },
  };
}
