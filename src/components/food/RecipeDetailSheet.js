import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { colors, fontSize, fontWeight, spacing } from '../../styles/theme';
import useTheme from '../../hooks/useTheme';
import BottomSheet from '../BottomSheet';
import Button from '../Button';
import SectionLabel from '../SectionLabel';
import { toEnergy, energyUnitLabel } from '../../lib/format';
import { perServingTotals } from '../../lib/food/macros';

/**
 * RecipeDetailSheet — Campaign 24 Wave B (docs/whole-app-coherence-
 * campaign-24-2026-08-17/WAVE-B-FINDINGS.md, MyRecipesScreen.js IA_DEFECT
 * finding).
 *
 * The read-only "view contents" equivalent of SavedMealDetailSheet
 * (../food/SavedMealDetailSheet.js, L05-MM1 design audit 2026-07-09,
 * decision D6) for MyRecipesScreen, so the two "saved food collection"
 * screens DiaryScreen presents as parallel options (DiaryScreen.js:1673-1710,
 * "Use a saved meal from your diary, or a recipe you built") offer equal
 * inspect capability. Same contract as its sibling: a LIGHTWEIGHT READ-ONLY
 * peek, opened from an explicit info-circle "View" affordance on the row.
 * Tapping the row itself still opens the servings-picker log flow
 * unchanged; this sheet never lets an ingredient be added, removed, or
 * edited, never writes anything, and never changes how logging
 * (MyRecipesScreen's servings picker) or editing (RecipeBuilder) work.
 *
 * Unlike a saved meal, a recipe's ingredients only store food_ref +
 * quantity_g (no macro snapshot), and MyRecipesScreen's row list only
 * carries the resolved WHOLE-recipe total (listRecipesWithTotals), not a
 * per-ingredient breakdown — so opening this sheet needs one extra,
 * read-only fetch (getRecipeWithIngredients + resolveFoodRef per
 * ingredient, done by the caller), unlike SavedMealDetailSheet which reuses
 * the already-loaded row. `items` arrives pre-resolved; this component does
 * no I/O of its own.
 *
 * Adherence-neutral (CLAUDE.md ED-safety): plain numbers, no colour-coded
 * good/bad framing, no target comparison — matching SavedMealDetailSheet's
 * existing treatment.
 *
 * Props:
 *   visible    show / hide
 *   recipe     { name, totals: { kcal, protein, carbs, fat }, total_servings } | null
 *   items      [{ food_ref, name, quantityG, kcal }] | null while loading/unset
 *   loading    true while the ingredient read is in flight
 *   loadError  true if the ingredient read failed (totals above still show)
 *   energyUnit 'kcal' | 'kj' display unit
 *   onClose    () => void
 */
export default function RecipeDetailSheet({
  visible, recipe, items, loading, loadError, energyUnit = 'kcal', onClose,
}) {
  // CP-10 theming batch (component sweep, 2026-07-10) convention, matched.
  const t = useTheme();
  const live = buildLiveStyles(t);
  const rows = Array.isArray(items) ? items : [];
  const totals = recipe?.totals;
  const servings = Number(recipe?.total_servings) || 1;
  const perServing = totals ? perServingTotals(totals, servings) : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel={recipe ? `${recipe.name} details` : 'Recipe details'}>
      {recipe ? (
        <>
          <Text style={[styles.title, live.title]} numberOfLines={2}>{recipe.name}</Text>
          {perServing ? (
            <Text style={[styles.subtitle, live.subtitle]}>
              Per serving - {toEnergy(perServing.kcal, energyUnit)} {energyUnitLabel(energyUnit)} | {perServing.protein}g protein | {perServing.carbs}g carbs | {perServing.fat}g fat
            </Text>
          ) : null}
          {totals ? (
            <Text style={[styles.subtitleWhole, live.subtitle]}>
              Whole recipe ({servings} {servings === 1 ? 'serving' : 'servings'}) - {toEnergy(totals.kcal, energyUnit)} {energyUnitLabel(energyUnit)} | {totals.protein}g protein | {totals.carbs}g carbs | {totals.fat}g fat
            </Text>
          ) : null}

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={t.colors.primary} />
            </View>
          ) : loadError ? (
            <Text style={[styles.emptyNote, live.emptyNote]}>Couldn't load the ingredient list. The totals above are still correct.</Text>
          ) : rows.length ? (
            <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.section}>
                <SectionLabel>In this recipe</SectionLabel>
                {rows.map((it, i) => (
                  <View key={it.food_ref ? `${it.food_ref}-${i}` : i} style={styles.itemRow}>
                    <Text style={[styles.itemName, live.itemName]} numberOfLines={1}>{it.name ?? 'Food'}</Text>
                    <Text style={[styles.itemMeta, live.itemMeta]}>
                      {Math.round(it.quantityG ?? 0)}g | {toEnergy(it.kcal ?? 0, energyUnit)} {energyUnitLabel(energyUnit)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={[styles.emptyNote, live.emptyNote]}>No ingredients in this recipe yet.</Text>
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
  subtitleWhole: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xxs },
  loadingRow: { paddingVertical: spacing.md, alignItems: 'center' },
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
// SavedMealDetailSheet.js's buildLiveStyles. scroll/section/itemRow/actions/
// loadingRow have no colour tokens.
function buildLiveStyles(t) {
  return {
    title: { color: t.colors.textPrimary },
    subtitle: { color: t.colors.textMuted },
    itemName: { color: t.colors.textPrimary },
    itemMeta: { color: t.colors.textMuted },
    emptyNote: { color: t.colors.textMuted },
  };
}
